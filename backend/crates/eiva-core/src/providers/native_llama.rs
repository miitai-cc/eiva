use anyhow::{Result, Context};
use serde_json::json;

use crate::gateway::{ModelResponse, ProviderRequest};
use crate::gateway::transport::TransportWriter;

/// Resolve the chat/completions endpoint from the configured base URL.
///
/// For `native_llama`, `req.model` carries the *base* API URL (e.g.
/// `http://localhost:8080/v1`), not the chat endpoint.  OpenAI-compatible
/// servers expose the chat endpoint at `/v1/chat/completions` (llama.cpp,
/// LM Studio, Ollama, etc.).  Posting straight to the base URL returns the
/// model list / an error object, which previously produced the
/// "Invalid response format from API" error.
fn chat_completions_url(base: &str) -> String {
    let trimmed = base.trim_end_matches('/');
    if trimmed.ends_with("/chat/completions") {
        return trimmed.to_string();
    }
    if trimmed.ends_with("/v1") {
        format!("{}/chat/completions", trimmed)
    } else {
        format!("{}/v1/chat/completions", trimmed)
    }
}

pub async fn call_native_llama_with_tools(
    req: &ProviderRequest,
    _writer: Option<&mut dyn TransportWriter>,
) -> Result<ModelResponse> {
    let url = chat_completions_url(&req.model);
    tracing::info!("Calling native llama API at: {}", url);

    // Format messages for OpenAI-compatible endpoint
    let mut messages = Vec::new();
    for msg in &req.messages {
        messages.push(json!({
            "role": msg.role,
            "content": msg.content
        }));
    }

    let payload = json!({
        "model": if req.base_url == "local" { "local" } else { &req.model },
        "messages": messages,
        "max_tokens": 1024,
        "temperature": 0.7,
        "stream": false
    });

    let client = reqwest::Client::new();
    let mut builder = client.post(&url).json(&payload);
    if let Some(ref key) = req.api_key {
        if !key.is_empty() {
            builder = builder.header("Authorization", format!("Bearer {}", key));
        }
    }

    let res = builder
        .send()
        .await
        .with_context(|| format!("Failed to send request to native llama API: {}", url))?;

    let status = res.status();
    let res_json: serde_json::Value = res
        .json()
        .await
        .context("Failed to parse native llama API response as JSON")?;

    // Surface HTTP errors with the upstream body for easier debugging.
    if !status.is_success() {
        let detail = res_json
            .get("error")
            .and_then(|e| e.get("message"))
            .and_then(|m| m.as_str())
            .map(|s| s.to_string())
            .or_else(|| serde_json::to_string(&res_json).ok())
            .unwrap_or_else(|| "no body".to_string());
        anyhow::bail!("native llama API returned HTTP {}: {}", status, detail);
    }

    let mut response = ModelResponse::default();

    if let Some(err) = res_json.get("error") {
        let err_msg = err
            .get("message")
            .and_then(|m| m.as_str())
            .or_else(|| err.as_str())
            .unwrap_or("Unknown API error");
        tracing::error!("native llama API returned an error: {}", err_msg);
        response.text = format!("API Error: {}", err_msg);
        return Ok(response);
    }

    // OpenAI-compatible chat/completions shape.
    if let Some(message) = res_json.pointer("/choices/0/message") {
        if let Some(content) = message.get("content").and_then(|v| v.as_str()) {
            response.text = content.trim().to_string();
        }
        if let Some(calls) = message.get("tool_calls").and_then(|v| v.as_array()) {
            for call in calls {
                let function = call.get("function");
                let name = function
                    .and_then(|f| f.get("name"))
                    .and_then(|n| n.as_str())
                    .unwrap_or_default()
                    .to_string();
                let raw_args = function
                    .and_then(|f| f.get("arguments"))
                    .cloned()
                    .unwrap_or(serde_json::Value::Null);
                let arguments = match raw_args {
                    serde_json::Value::String(s) => {
                        serde_json::from_str(&s).unwrap_or(serde_json::Value::Null)
                    }
                    other => other,
                };
                let id = call
                    .get("id")
                    .and_then(|i| i.as_str())
                    .unwrap_or("call_0")
                    .to_string();
                response.tool_calls.push(crate::gateway::ParsedToolCall {
                    id,
                    name,
                    arguments,
                });
            }
        }
    } else if let Some(content) = res_json["content"].as_str() {
        response.text = content.trim().to_string();
    } else if let Some(content) = res_json["choices"][0]["text"].as_str() {
        // Fallback for some completion endpoints
        response.text = content.trim().to_string();
    } else {
        tracing::error!("Unexpected native llama API response format: {}", res_json);
        anyhow::bail!(
            "Invalid response format from native llama API: {}",
            res_json
        );
    }

    if let Some(finish) = res_json.pointer("/choices/0/finish_reason").and_then(|v| v.as_str()) {
        response.finish_reason = Some(finish.to_string());
    }
    if let Some(usage) = res_json.get("usage") {
        response.prompt_tokens = usage.get("prompt_tokens").and_then(|v| v.as_u64());
        response.completion_tokens = usage.get("completion_tokens").and_then(|v| v.as_u64());
    }

    Ok(response)
}
