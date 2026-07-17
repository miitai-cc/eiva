//! Chat-frame handling: thread bookkeeping and context assembly.
//!
//! [`handle_chat_frame`] is the per-frame entry point for a client `Chat`
//! payload. It auto-switches threads, records the user message, assembles the
//! full prompt (system prompt, prior history, background-task context, and
//! relevant memories), then hands off to
//! [`dispatch_text_message`](crate::dispatch::dispatch_text_message) for the
//! model/tool loop.

use std::sync::Arc;

use anyhow::{Context, Result};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::Mutex;
use tracing::warn;

use eiva_claw_core::config::Config;
use eiva_claw_core::gateway::{
    ChatMessage, ChatRequest, ScopedTransportWriter, ServerFrame, ServerFrameType, ServerPayload,
    transport,
};

use crate::dispatch::dispatch_text_message;
use crate::thread_updates::{send_thread_messages_update, send_threads_update};
use crate::{
    SharedConfig, SharedCopilotSession, SharedModelCtx, SharedObserver, SharedSkillManager,
    SharedTaskManager, SharedVault, ToolCancelFlag, providers, system_prompt,
};
use eiva_claw_core::gateway::protocol;
use protocol::server::send_frame;

/// Handle a client `Chat` frame: bookkeeping, context assembly, dispatch.
#[allow(clippy::too_many_arguments)]
pub(crate) async fn handle_chat_frame(
    http: &reqwest::Client,
    messages: Vec<ChatMessage>,
    stream_id: u64,
    writer: &mut dyn transport::TransportWriter,
    config: &Config,
    vault: &SharedVault,
    skill_mgr: &SharedSkillManager,
    task_mgr: &SharedTaskManager,
    observer: Option<&SharedObserver>,
    tool_cancel: &ToolCancelFlag,
    shared_config: &SharedConfig,
    shared_model_ctx: &SharedModelCtx,
    shared_copilot_session: &SharedCopilotSession,
    approval_rx: &Arc<Mutex<tokio::sync::mpsc::Receiver<(String, bool)>>>,
    user_prompt_rx: &Arc<
        Mutex<
            tokio::sync::mpsc::Receiver<(
                String,
                bool,
                eiva_claw_core::user_prompt_types::PromptResponseValue,
            )>,
        >,
    >,
    credential_rx: &Arc<Mutex<tokio::sync::mpsc::Receiver<(String, bool, Option<String>)>>>,
    dom_query_rx: &Arc<Mutex<tokio::sync::mpsc::Receiver<(String, String, bool)>>>,
    thread_mgr: &mut eiva_claw_core::threads::ThreadManager,
    threads_path: &std::path::Path,
) -> Result<()> {
    // Check for auto-switch: find better matching thread
    if let Some(last_user) = messages.iter().rev().find(|m| m.role == "user") {
        if let Some(better_thread_id) = thread_mgr.find_best_match(&last_user.content) {
            // Found a better match — switch threads
            if thread_mgr.switch_foreground(better_thread_id) {
                // Get the context summary from the new foreground thread
                let context_summary = thread_mgr
                    .foreground()
                    .and_then(|t| t.compact_summary.clone());
                // Send ThreadSwitched notification
                let frame = ServerFrame {
                    frame_type: ServerFrameType::ThreadSwitched,
                    payload: ServerPayload::ThreadSwitched {
                        thread_id: better_thread_id.0,
                        context_summary,
                    },
                };
                send_frame(writer, &frame).await?;
                // Update thread list
                send_threads_update(writer, thread_mgr, task_mgr, None).await?;
                send_thread_messages_update(writer, better_thread_id, thread_mgr).await?;
            }
        }
    }

    // Add user message to current thread's history
    let mut did_auto_label = false;
    let mut needs_caption = false;
    let mut did_append_user_message = false;
    let mut active_thread_id = None;
    if let Some(thread) = thread_mgr.foreground_mut() {
        active_thread_id = Some(thread.id);
        // Find the last user message (typically the new one)
        if let Some(last_user) = messages.iter().rev().find(|m| m.role == "user") {
            // Check if this is the first message in a new thread
            let is_first_message = thread.message_count() == 0
                && (thread.label.is_empty()
                    || thread.label.starts_with("Session #")
                    || thread.label == "Main");
            thread.add_message(eiva_claw_core::threads::MessageRole::User, &last_user.content);
            did_append_user_message = true;
            if is_first_message {
                // Set a temporary auto-label as fallback
                let label = auto_thread_label(&last_user.content);
                thread.label = label;
                did_auto_label = true;
                // Flag for agent captioning
                needs_caption = true;
            }
        }
    }
    if did_append_user_message && let Err(e) = thread_mgr.save_to_file(threads_path) {
        warn!(error = %e, path = ?threads_path, "Failed to persist user message to thread history");
    }
    if did_auto_label {
        send_threads_update(writer, thread_mgr, task_mgr, None).await?;
    }

    // Auto-ingest user message into Steel Memory
    #[cfg(feature = "semantic-memory")]
    if let Some(last_user) = messages.iter().rev().find(|m| m.role == "user") {
        let ws = config.workspace_dir().to_path_buf();
        let text = last_user.content.clone();
        tokio::spawn(async move {
            if let Ok(mem) = eiva_claw_core::steel_memory::SteelMemory::new(&ws) {
                let _ = mem.add_memory(&text, "conversations", "user", None).await;
            }
        });
    }
    if let Some(thread_id) = active_thread_id {
        send_thread_messages_update(writer, thread_id, thread_mgr).await?;
    }

    // Re-read model_ctx from shared state for each dispatch
    let current_model_ctx = shared_model_ctx.read().await.clone();

    // Collect all available models into a fallback queue
    let mut model_queue = Vec::new();

    // 1. If DB has models, put them in queue
    let mut db_enabled_models = Vec::new();
    let mut db_disabled_models = Vec::new();
    if let Some(db) = crate::api::WORKFLOW_DB.get() {
        if let Ok(models_json_str) = db.list_ai_models().await {
            for json_str in models_json_str {
                if let Ok(model_val) = serde_json::from_str::<serde_json::Value>(&json_str) {
                    let provider = model_val
                        .get("provider")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    let name = model_val
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    let api_key = model_val
                        .get("api_key")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    let base_url = model_val
                        .get("base_url")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    let enabled = model_val
                        .get("enabled")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false);

                    let ctx = std::sync::Arc::new(eiva_claw_core::gateway::ModelContext {
                        provider,
                        model: name,
                        api_key,
                        base_url,
                    });

                    if enabled {
                        db_enabled_models.push(ctx);
                    } else {
                        db_disabled_models.push(ctx);
                    }
                }
            }
        }
    }

    model_queue.extend(db_enabled_models);

    // 2. OPENCODE Env vars
    if let Ok(api_key) = std::env::var("OPENCODE_API_KEY") {
        let base_url = std::env::var("OPENCODE_BASE_URL")
            .unwrap_or_else(|_| "https://opencode.ai/zen/go/v1/".to_string());
        let model =
            std::env::var("OPENCODE_MODEL").unwrap_or_else(|_| "deepseek-v4-flash".to_string());
        model_queue.push(std::sync::Arc::new(eiva_claw_core::gateway::ModelContext {
            provider: "opencode_go".to_string(), // Use 'opencode_go' adapter for OpenCode platform
            model,
            api_key: Some(api_key),
            base_url,
        }));
    }

    // 3. Shared state
    if let Some(ctx) = shared_model_ctx.read().await.clone() {
        model_queue.push(ctx);
    }

    // 4. DB disabled models as last resort
    model_queue.extend(db_disabled_models);

    // Apply AGENT_MODE == inner constraint for native llama
    let config = shared_config.read().await;
    let original_agent_mode = config.agent_mode.clone();
    if config.agent_mode == "inner" {
        if let Some(ref api_url) = config.native_llama_api_url {
            model_queue.clear();
            model_queue.push(std::sync::Arc::new(eiva_claw_core::gateway::ModelContext {
                provider: "native_llama".to_string(),
                model: api_url.clone(),
                api_key: None,
                base_url: "local".to_string(),
            }));
            tracing::info!(
                "Agent mode 'inner' enabled with native llama API URL. Overriding model queue."
            );
        }
    }

    if model_queue.is_empty() {
        tracing::warn!("No AI Model Context resolved in queue!");
    }

    if let Some(ctx) = &current_model_ctx {
        let masked_key = ctx
            .api_key
            .as_ref()
            .map(|k| {
                if k.len() > 8 {
                    format!("{}...{}", &k[..4], &k[k.len() - 4..])
                } else {
                    "***".to_string()
                }
            })
            .unwrap_or_else(|| "None".to_string());

        tracing::info!(
            provider = %ctx.provider,
            model = %ctx.model,
            base_url = %ctx.base_url,
            api_key = %masked_key,
            "🚀 [API Call Prepare] Resolved AI Model Context"
        );
    } else {
        tracing::warn!("No AI Model Context resolved!");
    }
    // Re-read copilot session from shared state
    let copilot_session = shared_copilot_session.read().await.clone();
    let workspace_dir = config.workspace_dir();

    // Ensure a system prompt is present. The TUI
    // sends the full conversation (including a
    // system message), but the desktop client
    // only sends the user message. When missing,
    // build one from the workspace context so
    // that SOUL.md, IDENTITY.md, etc. are
    // included.
    let mut messages = messages;
    let client_sent_history = !messages.is_empty() && messages[0].role == "system";
    if !client_sent_history {
        let sys = system_prompt::build_system_prompt(&config, task_mgr, skill_mgr).await;
        messages.insert(0, ChatMessage::text("system", &sys));

        // Inject conversation history from the
        // thread. The desktop client only sends
        // the current user message; we need to
        // include prior turns so the model has
        // context of the conversation.
        if let Some(thread) = thread_mgr.foreground() {
            let history = &thread.messages;
            // history includes the message we just
            // added — skip it (last element) to
            // avoid duplication with the client's
            // user message already in `messages`.
            let prior_count = history.len().saturating_sub(1);
            if prior_count > 0 {
                // Optionally include compact summary as context
                if let Some(summary) = &thread.compact_summary {
                    messages.insert(
                        1,
                        ChatMessage::text(
                            "system",
                            &format!("# Previous conversation summary\n\n{}", summary),
                        ),
                    );
                }
                let insert_pos = if thread.compact_summary.is_some() {
                    2
                } else {
                    1
                };
                // Reconstruct the history with structured
                // tool_call / tool_result payloads so that
                // assistant messages keep their `tool_calls`
                // and following tool results stay anchored
                // to them. Flattening to plain text would
                // produce orphan `tool` messages that the
                // provider rejects.
                let provider_name = current_model_ctx
                    .as_deref()
                    .map(|c| c.provider.as_str())
                    .unwrap_or("openai");
                let history_slice: Vec<eiva_claw_core::threads::ThreadMessage> =
                    history.iter().take(prior_count).cloned().collect();
                let history_msgs: Vec<ChatMessage> =
                    providers::thread_history_to_chat_messages(provider_name, &history_slice);
                // Insert history between system prompt and current user message
                let tail = messages.split_off(insert_pos);
                messages.extend(history_msgs);
                messages.extend(tail);
            }
        }
    }

    // Inject thread context into system prompt if available
    let mut messages_with_context = {
        let global_ctx = thread_mgr.build_global_context();
        let provider_name = current_model_ctx
            .as_deref()
            .map(|c| c.provider.as_str())
            .unwrap_or("openai");
        let thread_context = active_thread_id.and_then(|thread_id| {
            thread_mgr.get(thread_id).map(|thread| {
                let history: Vec<eiva_claw_core::threads::ThreadMessage> =
                    thread.messages.iter().cloned().collect();
                (
                    providers::thread_history_to_chat_messages(provider_name, &history),
                    thread.compact_summary.clone(),
                )
            })
        });
        let (mut msgs, compact_summary) =
            thread_context.unwrap_or_else(|| (messages.clone(), None));
        if let Some(system_message) = messages.first().filter(|m| m.role == "system") {
            if msgs.first().map(|m| m.role.as_str()) != Some("system") {
                msgs.insert(0, system_message.clone());
            }
        }
        // Re-inject the stored compaction summary so context from compacted
        // turns survives across prompts (the thread history above only holds
        // the messages kept after compaction).
        if let Some(summary) = compact_summary {
            let insert_pos = if msgs.first().map(|m| m.role.as_str()) == Some("system") {
                1
            } else {
                0
            };
            msgs.insert(
                insert_pos,
                ChatMessage::text(
                    "system",
                    &format!("# Previous conversation summary\n\n{}", summary),
                ),
            );
        }
        if !global_ctx.is_empty() && !msgs.is_empty() && msgs[0].role == "system" {
            msgs[0].content = format!(
                "{}\n\n# Background Tasks\n\n{}",
                msgs[0].content, global_ctx
            );
            msgs
        } else {
            msgs
        }
    };

    // Inject captioning instruction for new threads
    if needs_caption
        && !messages_with_context.is_empty()
        && messages_with_context[0].role == "system"
    {
        messages_with_context[0].content = format!(
            "{}\n\n## Thread Captioning\n\
            This is the first message in a new conversation thread. \
            After responding, call `set_thread_caption` with a short \
            2-6 word caption that summarises the topic of this conversation.",
            messages_with_context[0].content
        );
    }

    // Inject relevant memory context from Steel Memory
    #[cfg(feature = "semantic-memory")]
    if !messages_with_context.is_empty() && messages_with_context[0].role == "system" {
        if let Some(last_user) = messages_with_context
            .iter()
            .rev()
            .find(|m| m.role == "user")
        {
            let query = last_user.content.clone();
            let ws = config.workspace_dir().to_path_buf();
            if let Ok(mem) = eiva_claw_core::steel_memory::SteelMemory::new(&ws) {
                if let Ok(results) = mem.search(&query, 3, Some(0.4)).await {
                    if !results.is_empty() {
                        let mut ctx = String::from("\n\n## Relevant Memories\n");
                        for r in &results {
                            let snippet = if r.content.len() > 300 {
                                format!("{}…", &r.content[..300])
                            } else {
                                r.content.clone()
                            };
                            ctx.push_str(&format!(
                                "- (similarity {:.2}) {}\n",
                                r.similarity, snippet
                            ));
                        }
                        messages_with_context[0].content.push_str(&ctx);
                    }
                }
            }
        }
    }

    // ── External CLI agent mode (codex / gemini / opencode) ────────
    // When agent_mode is set to an external CLI, bypass the built-in
    // LLM provider loop and forward the prompt directly to the CLI.
    if config.agent_mode == "codex"
        || config.agent_mode == "gemini"
        || config.agent_mode == "opencode"
    {
        tracing::info!(mode = %config.agent_mode, "Dispatching to external CLI agent");

        let mut stream_writer = ScopedTransportWriter::new(writer, stream_id);
        let result = dispatch_to_external_cli(
            &mut stream_writer,
            &messages_with_context,
            &workspace_dir,
            &original_agent_mode,
        )
        .await;

        if let Err(err) = result {
            warn!(error = %err, "External CLI agent dispatch failed");
            let error_frame = ServerFrame {
                frame_type: ServerFrameType::Error,
                payload: ServerPayload::Error {
                    ok: false,
                    message: format!("{err:#}"),
                },
            };
            send_frame(&mut stream_writer, &error_frame).await?;
        }
        return Ok(());
    }

    // Build a ChatRequest from the messages
    let chat_request = ChatRequest {
        msg_type: "chat".to_string(),
        messages: messages_with_context,
        model: None,
        provider: None,
        base_url: None,
        api_key: None,
    };

    tracing::debug!("Step 4: LLM context fully prepared, dispatching request to provider...");

    let mut last_error = None;

    for current_model_ctx in model_queue {
        let masked_key = current_model_ctx.api_key.as_ref().map(|k| {
            if k.len() > 8 {
                format!("{}...{}", &k[..4], &k[k.len() - 4..])
            } else {
                "***".to_string()
            }
        });
        tracing::info!(
            provider = %current_model_ctx.provider,
            model = %current_model_ctx.model,
            base_url = %current_model_ctx.base_url,
            api_key = %masked_key.unwrap_or_default(),
            "🚀 [API Call Prepare] Trying AI Model Context"
        );

        // --- Auto-start / Auto-load local engines ---
        let registry = eiva_claw_core::engines::EngineRegistry::new();
        if let Some(engine) = registry.get(&current_model_ctx.provider) {
            let config = shared_config.read().await;
            let default_cfg = eiva_claw_core::engines::EngineConfig {
                enabled: true,
                auto_start: true,
                ..Default::default()
            };
            let engine_cfg = config
                .engines
                .get(&current_model_ctx.provider)
                .unwrap_or(&default_cfg);

            tracing::debug!(
                "Checking local engine '{}' availability for model '{}'...",
                engine.id(),
                current_model_ctx.model
            );
            let status = engine.status(engine_cfg).await;

            let needs_load = match status.run_status {
                eiva_claw_core::engines::EngineRunStatus::Running { .. } => {
                    if let Ok(models) = engine.list_models(engine_cfg).await {
                        if !models
                            .iter()
                            .any(|m| m.name == current_model_ctx.model && m.loaded)
                        {
                            tracing::debug!(
                                "Engine '{}' is running, but model '{}' is not loaded.",
                                engine.id(),
                                current_model_ctx.model
                            );
                            true
                        } else {
                            false
                        }
                    } else {
                        true
                    }
                }
                _ => {
                    tracing::debug!(
                        "Engine '{}' is NOT running. Will attempt to start and load...",
                        engine.id()
                    );
                    true
                }
            };

            if needs_load {
                tracing::debug!(
                    "Loading local model '{}' via engine '{}'...",
                    current_model_ctx.model,
                    engine.id()
                );
                if let Err(e) = engine.load(&current_model_ctx.model, engine_cfg).await {
                    tracing::warn!(
                        "Failed to load local model '{}' on engine '{}': {}",
                        current_model_ctx.model,
                        engine.id(),
                        e
                    );
                } else {
                    tracing::debug!(
                        "Successfully loaded local model '{}'.",
                        current_model_ctx.model
                    );
                    // Give it a tiny bit of time to bind the port fully
                    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                }
            } else {
                tracing::debug!(
                    "Local engine '{}' is already running with model '{}'.",
                    engine.id(),
                    current_model_ctx.model
                );
            }
        }
        // --- End Auto-start ---

        let mut stream_writer = ScopedTransportWriter::new(writer, stream_id);

        let res = dispatch_text_message(
            http,
            &chat_request,
            Some(current_model_ctx.as_ref()),
            copilot_session.as_deref(),
            &mut stream_writer,
            &workspace_dir,
            vault,
            skill_mgr,
            task_mgr,
            observer,
            tool_cancel,
            shared_config,
            shared_copilot_session,
            approval_rx,
            user_prompt_rx,
            credential_rx,
            dom_query_rx,
            thread_mgr,
            threads_path,
        )
        .await;

        match res {
            Ok(_) => {
                last_error = None;
                break; // Success
            }
            Err(err) => {
                let err_str = err.to_string();
                if err_str.contains("401")
                    || err_str.contains("AuthError")
                    || err_str.contains("ModelError")
                    || err_str.contains("not supported")
                {
                    tracing::warn!(
                        "Model failed with Auth/Model Error: {}, retrying with next available model...",
                        err_str
                    );
                    last_error = Some(err);
                    continue; // Try next model
                } else {
                    last_error = Some(err);
                    break; // Hard fail
                }
            }
        }
    }

    if let Some(err) = last_error {
        let mut stream_writer = ScopedTransportWriter::new(writer, stream_id);
        warn!(error = %err, error_debug = ?err, "Chat dispatch failed completely");
        let error_frame = ServerFrame {
            frame_type: ServerFrameType::Error,
            payload: ServerPayload::Error {
                ok: false,
                message: format!("{err:#}"),
            },
        };

        send_frame(&mut stream_writer, &error_frame).await?;
    }

    Ok(())
}

/// Derive a short thread label from the first user message.
fn auto_thread_label(content: &str) -> String {
    let trimmed = content.trim();
    // Use the first line, capped at 50 chars on a word boundary.
    let first_line = trimmed.lines().next().unwrap_or(trimmed);
    if first_line.len() <= 50 {
        first_line.to_string()
    } else {
        match first_line[..50].rfind(' ') {
            Some(pos) if pos > 20 => format!("{}…", &first_line[..pos]),
            _ => format!("{}…", &first_line[..50]),
        }
    }
}

/// Dispatch a user prompt to an external CLI agent (codex, gemini, opencode).
///
/// Spawns the CLI in non-interactive `exec` mode, streams stdout line-by-line
/// back to the client as `Chunk` frames, and returns when the process exits.
async fn dispatch_to_external_cli(
    writer: &mut dyn transport::TransportWriter,
    messages: &[ChatMessage],
    workspace_dir: &std::path::Path,
    agent_mode: &str,
) -> Result<()> {
    let prompt = messages
        .iter()
        .rev()
        .find(|m| m.role == "user")
        .map(|m| m.content.as_str())
        .unwrap_or("");

    if prompt.is_empty() {
        tracing::debug!(
            mode = agent_mode,
            "No user prompt to forward to CLI agent, returning early"
        );
        protocol::server::send_info(writer, "No user prompt to forward to CLI agent.").await?;
        protocol::server::send_response_done(writer, true).await?;
        return Ok(());
    }

    tracing::debug!(
        mode = agent_mode,
        prompt_len = prompt.len(),
        "Extracted user prompt for CLI agent"
    );

    let (command, args) = match agent_mode {
        "codex" => {
            let codex_cmd =
                std::env::var("CODEX_CLI_COMMAND").unwrap_or_else(|_| "codex".to_string());
            let sandbox =
                std::env::var("CODEX_SANDBOX").unwrap_or_else(|_| "workspace-write".to_string());
            tracing::debug!(
                codex_cmd = %codex_cmd,
                sandbox = %sandbox,
                "Building codex exec arguments"
            );
            (
                codex_cmd,
                vec![
                    "exec".to_string(),
                    "-C".to_string(),
                    workspace_dir.display().to_string(),
                    "-c".to_string(),
                    "approval_policy=\"never\"".to_string(),
                    "--sandbox".to_string(),
                    sandbox,
                    "--skip-git-repo-check".to_string(),
                    prompt.to_string(),
                ],
            )
        }
        "gemini" => {
            let gemini_cmd =
                std::env::var("GEMINI_CLI_COMMAND").unwrap_or_else(|_| "gemini".to_string());
            tracing::debug!(gemini_cmd = %gemini_cmd, "Building gemini arguments");
            (gemini_cmd, vec!["-p".to_string(), prompt.to_string()])
        }
        "opencode" => {
            let opencode_cmd =
                std::env::var("OPENCODE_CLI_COMMAND").unwrap_or_else(|_| "opencode".to_string());
            tracing::debug!(opencode_cmd = %opencode_cmd, "Building opencode arguments");
            (opencode_cmd, vec!["-p".to_string(), prompt.to_string()])
        }
        other => {
            anyhow::bail!("Unsupported external CLI agent mode: {other}");
        }
    };

    tracing::debug!(
        mode = agent_mode,
        command = %command,
        args = ?args,
        workspace = %workspace_dir.display(),
        "Spawning external CLI agent process"
    );

    if command.contains(std::path::MAIN_SEPARATOR) {
        let command_path = std::path::Path::new(&command);
        std::fs::metadata(command_path).with_context(|| {
            format!(
                "CLI agent path '{}' is not accessible from the gateway process",
                command_path.display()
            )
        })?;
    }

    std::fs::create_dir_all(workspace_dir).with_context(|| {
        format!(
            "CLI agent workspace '{}' could not be created or accessed",
            workspace_dir.display()
        )
    })?;

    let mut child = Command::new(&command)
        .args(&args)
        .current_dir(workspace_dir)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .with_context(|| {
            format!("Failed to spawn CLI agent '{command}'. Is it installed and in PATH?")
        })?;

    tracing::debug!(
        mode = agent_mode,
        pid = child.id(),
        "CLI agent process spawned successfully"
    );

    let stdout = child
        .stdout
        .take()
        .context("CLI agent process has no stdout handle")?;
    let stderr = child.stderr.take();

    // Drain stderr in a background task so it doesn't block.
    let stderr_agent_mode = agent_mode.to_string();
    let stderr_handle = tokio::spawn(async move {
        if let Some(stderr) = stderr {
            let mut reader = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                tracing::debug!(mode = %stderr_agent_mode, "CLI agent stderr: {}", line);
            }
        }
    });

    let mut reader = BufReader::new(stdout).lines();

    let mut line_count: u64 = 0;
    while let Some(line_result) = reader.next_line().await? {
        line_count += 1;
        tracing::trace!(
            mode = agent_mode,
            line = line_count,
            "CLI agent stdout line"
        );
        let _ = protocol::server::send_chunk(writer, &line_result).await;
    }

    tracing::debug!(
        mode = agent_mode,
        total_lines = line_count,
        "CLI agent stdout stream finished"
    );

    let status = child
        .wait()
        .await
        .context("Failed to wait for CLI agent process")?;

    tracing::debug!(
        mode = agent_mode,
        success = status.success(),
        exit_code = status.code().unwrap_or(-1),
        "CLI agent process exited"
    );

    let _ = stderr_handle.await;

    let ok = status.success();
    if !ok {
        let code = status.code().unwrap_or(-1);
        tracing::error!(
            mode = agent_mode,
            exit_code = code,
            "CLI agent exited with error"
        );
        let _ =
            protocol::server::send_chunk(writer, &format!("\n[CLI agent exited with code {code}]"))
                .await;
    }

    protocol::server::send_response_done(writer, ok).await?;
    Ok(())
}
