use async_trait::async_trait;
use serde_json::Value;
use std::time::{SystemTime, UNIX_EPOCH};

use super::context::WorkflowContext;
use super::models::Node;

#[async_trait]
pub trait WorkflowNode: Send + Sync {
    async fn execute(&self, node: &Node, ctx: &mut WorkflowContext) -> anyhow::Result<()>;
}

pub struct StartNode;

#[async_trait]
impl WorkflowNode for StartNode {
    async fn execute(&self, _node: &Node, ctx: &mut WorkflowContext) -> anyhow::Result<()> {
        let start_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        ctx.payload.insert("start_time".to_string(), Value::Number(start_time.into()));
        Ok(())
    }
}

pub struct EndNode;

#[async_trait]
impl WorkflowNode for EndNode {
    async fn execute(&self, _node: &Node, _ctx: &mut WorkflowContext) -> anyhow::Result<()> {
        Ok(())
    }
}

pub struct NoOpNode;

#[async_trait]
impl WorkflowNode for NoOpNode {
    async fn execute(&self, _node: &Node, _ctx: &mut WorkflowContext) -> anyhow::Result<()> {
        Ok(())
    }
}

pub struct VariableNode;

#[async_trait]
impl WorkflowNode for VariableNode {
    async fn execute(&self, node: &Node, ctx: &mut WorkflowContext) -> anyhow::Result<()> {
        let var_name = node.data.get("varName").and_then(|v| v.as_str()).unwrap_or_default();
        let var_value = node.data.get("varValue").and_then(|v| v.as_str()).unwrap_or_default();
        
        let mut env = minijinja::Environment::new();
        env.add_global("payload", minijinja::Value::from_serialize(&ctx.payload));
        
        let resolved_value = match env.render_str(var_value, minijinja::context!()) {
            Ok(rendered) => rendered,
            Err(e) => {
                tracing::error!("Template render error in VariableNode: {}", e);
                var_value.to_string()
            }
        };

        // Try to parse as JSON if it looks like a number, bool, array or object
        let json_value = serde_json::from_str(&resolved_value)
            .unwrap_or_else(|_| Value::String(resolved_value));

        ctx.global_variables.insert(var_name.to_string(), json_value);
        
        Ok(())
    }
}

pub struct AgentNode;

#[async_trait]
impl WorkflowNode for AgentNode {
    async fn execute(&self, node: &Node, ctx: &mut WorkflowContext) -> anyhow::Result<()> {
        let prompt_template = node.data.get("prompt").and_then(|v| v.as_str()).unwrap_or_default();
        let model_name = node.data.get("modelName").and_then(|v| v.as_str()).unwrap_or("gpt-4o");
        let _temperature = node.data.get("temperature").and_then(|v| v.as_f64()).unwrap_or(0.7);

        let mut env = minijinja::Environment::new();
        env.add_global("payload", minijinja::Value::from_serialize(&ctx.payload));
        env.add_global("global", minijinja::Value::from_serialize(&ctx.global_variables));

        let mut rendered_prompt = env.render_str(prompt_template, minijinja::context!())
            .unwrap_or_else(|_| prompt_template.to_string());

        // If template didn't use payload, append it
        if !prompt_template.contains("payload") {
            if let Ok(payload_json) = serde_json::to_string_pretty(&ctx.payload) {
                rendered_prompt.push_str(&format!("\n\nContext Payload:\n{}", payload_json));
            }
        }

        let system_msg = eiva_claw_core::gateway::ChatMessage::text("system", "You are a helpful AI assistant in an automated workflow.");
        let user_msg = eiva_claw_core::gateway::ChatMessage::text("user", &rendered_prompt);
        
        let (default_provider, default_model, base_url) = eiva_claw_core::runtime_ctx::get_model_info()
            .unwrap_or_else(|| ("openai".to_string(), model_name.to_string(), "https://api.openai.com".to_string()));

        let req = eiva_claw_core::gateway::ProviderRequest {
            messages: vec![system_msg, user_msg],
            model: default_model,
            provider: default_provider,
            base_url,
            api_key: None, // Will be injected by genai_backend using secrets if needed
        };

        let http_client = reqwest::Client::new();
        let response = eiva_claw_core::providers::call_with_tools(&http_client, &req, None).await?;

        ctx.payload.insert(format!("{}_result", node.id), Value::String(response.text));

        Ok(())
    }
}

fn build_eval_context(ctx: &WorkflowContext) -> evalexpr::HashMapContext {
    let mut eval_ctx = evalexpr::HashMapContext::new();
    for (k, v) in &ctx.payload {
        if let Some(val) = json_to_evalexpr(v) {
            let _ = evalexpr::ContextWithMutableVariables::set_value(&mut eval_ctx, k.clone(), val);
        }
    }
    for (k, v) in &ctx.global_variables {
        if let Some(val) = json_to_evalexpr(v) {
            let _ = evalexpr::ContextWithMutableVariables::set_value(&mut eval_ctx, k.clone(), val);
        }
    }
    eval_ctx
}

fn json_to_evalexpr(v: &Value) -> Option<evalexpr::Value> {
    match v {
        Value::Bool(b) => Some(evalexpr::Value::Boolean(*b)),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Some(evalexpr::Value::Int(i))
            } else if let Some(f) = n.as_f64() {
                Some(evalexpr::Value::Float(f))
            } else {
                None
            }
        }
        Value::String(s) => Some(evalexpr::Value::String(s.clone())),
        _ => None, // Complex objects not supported directly as scalars in evalexpr
    }
}

pub struct CalculateNode;

#[async_trait]
impl WorkflowNode for CalculateNode {
    async fn execute(&self, node: &Node, ctx: &mut WorkflowContext) -> anyhow::Result<()> {
        let expression = node.data.get("expression").and_then(|v| v.as_str()).unwrap_or_default();
        
        let eval_ctx = build_eval_context(ctx);
        match evalexpr::eval_with_context(expression, &eval_ctx) {
            Ok(evalexpr::Value::Int(i)) => {
                ctx.payload.insert(format!("{}_calc_result", node.id), Value::Number(i.into()));
            }
            Ok(evalexpr::Value::Float(f)) => {
                if let Some(n) = serde_json::Number::from_f64(f) {
                    ctx.payload.insert(format!("{}_calc_result", node.id), Value::Number(n));
                }
            }
            Ok(evalexpr::Value::Boolean(b)) => {
                ctx.payload.insert(format!("{}_calc_result", node.id), Value::Bool(b));
            }
            Ok(evalexpr::Value::String(s)) => {
                ctx.payload.insert(format!("{}_calc_result", node.id), Value::String(s));
            }
            Ok(_) => {
                tracing::warn!("Unsupported evalexpr type result for calculation");
            }
            Err(e) => {
                tracing::error!("CalculateNode evaluation error: {}", e);
            }
        }
        
        Ok(())
    }
}

pub struct ConditionNode;

#[async_trait]
impl WorkflowNode for ConditionNode {
    async fn execute(&self, node: &Node, ctx: &mut WorkflowContext) -> anyhow::Result<()> {
        let condition = node.data.get("condition").and_then(|v| v.as_str()).unwrap_or_default();
        
        let eval_ctx = build_eval_context(ctx);
        let result = match evalexpr::eval_boolean_with_context(condition, &eval_ctx) {
            Ok(b) => b,
            Err(e) => {
                tracing::error!("ConditionNode evaluation error: {}", e);
                false
            }
        };
        
        // Store condition result in state for router
        ctx.payload.insert(format!("{}_condition_result", node.id), Value::Bool(result));
        Ok(())
    }
}

pub struct ToolNode;

#[async_trait]
impl WorkflowNode for ToolNode {
    async fn execute(&self, node: &Node, ctx: &mut WorkflowContext) -> anyhow::Result<()> {
        let tool_type = node.data.get("toolType").and_then(|v| v.as_str()).unwrap_or_default();
        let parameters = node.data.get("parameters").and_then(|v| v.as_str()).unwrap_or_default();
        
        let mut env = minijinja::Environment::new();
        env.add_global("payload", minijinja::Value::from_serialize(&ctx.payload));
        env.add_global("global", minijinja::Value::from_serialize(&ctx.global_variables));

        let rendered_params = env.render_str(parameters, minijinja::context!())
            .unwrap_or_else(|_| parameters.to_string());
            
        let tool_args: Value = serde_json::from_str(&rendered_params).unwrap_or_else(|_| Value::Null);
        
        // This is a simplified dispatch for common tools mentioned in SPEC
        let result = match tool_type {
            "webSearch" => {
                let query = tool_args.get("query").and_then(|v| v.as_str()).unwrap_or_default();
                // Mock web search
                Value::String(format!("Search results for: {}", query))
            }
            "fetchUrl" => {
                let url = tool_args.get("url").and_then(|v| v.as_str()).unwrap_or_default();
                // Mock fetch
                Value::String(format!("Content of {}", url))
            }
            "calculator" => {
                let expr = tool_args.get("expression").and_then(|v| v.as_str()).unwrap_or_default();
                match evalexpr::eval(expr) {
                    Ok(evalexpr::Value::Int(i)) => Value::Number(i.into()),
                    Ok(evalexpr::Value::Float(f)) => serde_json::Number::from_f64(f).map(Value::Number).unwrap_or(Value::Null),
                    _ => Value::Null,
                }
            }
            _ => Value::String(format!("Tool {} executed with args {}", tool_type, rendered_params)),
        };

        ctx.payload.insert(format!("{}_result", node.id), result);
        Ok(())
    }
}

pub struct McpNode;

#[async_trait]
impl WorkflowNode for McpNode {
    #[cfg(feature = "mcp")]
    async fn execute(&self, node: &Node, ctx: &mut WorkflowContext) -> anyhow::Result<()> {
        let mcp_name = node.data.get("mcpName").and_then(|v| v.as_str()).unwrap_or_default();
        let prompt_template = node.data.get("prompt").and_then(|v| v.as_str()).unwrap_or_default();
        
        let mut env = minijinja::Environment::new();
        env.add_global("payload", minijinja::Value::from_serialize(&ctx.payload));
        
        let rendered_prompt = env.render_str(prompt_template, minijinja::context!())
            .unwrap_or_else(|_| prompt_template.to_string());
            
        if let Some(mcp_mgr) = eiva_claw_core::runtime_ctx::get_mcp_manager() {
            let mgr = mcp_mgr.lock().await;
            // Here we would call the MCP server using mgr.call_tool(...)
            // Stubbing out actual MCP call for now since we don't have the explicit tool name
            ctx.payload.insert(format!("{}_mcp_response", node.id), Value::String(format!("Called MCP {} with prompt: {}", mcp_name, rendered_prompt)));
        } else {
            tracing::warn!("MCP manager not found for McpNode");
        }
        
        Ok(())
    }
    
    #[cfg(not(feature = "mcp"))]
    async fn execute(&self, _node: &Node, _ctx: &mut WorkflowContext) -> anyhow::Result<()> {
        tracing::warn!("McpNode execution skipped because MCP feature is not enabled");
        Ok(())
    }
}

pub struct SkillNode;

#[async_trait]
impl WorkflowNode for SkillNode {
    async fn execute(&self, node: &Node, ctx: &mut WorkflowContext) -> anyhow::Result<()> {
        let skill_name = node.data.get("skillName").and_then(|v| v.as_str()).unwrap_or_default();
        let prompt_template = node.data.get("prompt").and_then(|v| v.as_str()).unwrap_or_default();
        
        let mut env = minijinja::Environment::new();
        env.add_global("payload", minijinja::Value::from_serialize(&ctx.payload));
        
        let rendered_prompt = env.render_str(prompt_template, minijinja::context!())
            .unwrap_or_else(|_| prompt_template.to_string());

        // In a real implementation we would look up the skill in SkillRegistry.
        // For now, we mock the result.
        ctx.payload.insert(format!("{}_skill_result", node.id), Value::String(format!("Executed skill {} with prompt {}", skill_name, rendered_prompt)));
        
        Ok(())
    }
}


