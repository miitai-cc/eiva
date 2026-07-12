use salvo::prelude::*;
use salvo::cors::Cors;
use salvo::http::Method;
use eiva_core::tasks::TaskManager;
use std::sync::{Arc, OnceLock};
use salvo::websocket::{Message, WebSocketUpgrade};
use prost::Message as ProstMessage;
use eiva_core::gateway::client::GatewayClient;
use eiva_core::gateway::GatewayCommand;
use std::collections::HashMap;
use tokio::sync::{RwLock, broadcast};

static WS_BROADCASTER: OnceLock<broadcast::Sender<proto::ServerMessage>> = OnceLock::new();

fn get_broadcaster() -> broadcast::Sender<proto::ServerMessage> {
    WS_BROADCASTER.get_or_init(|| {
        let (tx, _) = broadcast::channel(100);
        tx
    }).clone()
}

pub mod proto {
    include!(concat!(env!("OUT_DIR"), "/eiva.rs"));
}

static TASK_MGR: OnceLock<Arc<TaskManager>> = OnceLock::new();
static WORKFLOW_DB: OnceLock<crate::db::WorkflowDb> = OnceLock::new();

static CLIENT_SESSIONS: OnceLock<RwLock<HashMap<String, Arc<GatewayClient>>>> = OnceLock::new();

fn get_client_sessions() -> &'static RwLock<HashMap<String, Arc<GatewayClient>>> {
    CLIENT_SESSIONS.get_or_init(|| RwLock::new(HashMap::new()))
}

#[handler]
async fn health() -> &'static str {
    tracing::debug!("Step: Call health API");
    tracing::debug!("Result: {{\"ok\":true}}");
    "{\"ok\":true}"
}

#[handler]
async fn redirect_home(res: &mut Response) {
    tracing::debug!("Step: Call redirect_home API");
    tracing::debug!("Result: Redirecting to /eiva/frontend/view/index.html");
    res.render(Redirect::found("/eiva/frontend/view/index.html"));
}

#[handler]
async fn list_tasks(res: &mut Response) {
    tracing::debug!("Step 1: Start list_tasks API");
    if let Some(_mgr) = TASK_MGR.get() {
        tracing::debug!("Step 2: Iterating tasks from TASK_MGR");
        // In a real implementation, we iterate mgr tasks.
    }
    let tasks: Vec<String> = vec![]; 
    let result = serde_json::json!({ "tasks": tasks });
    tracing::debug!(result = ?result, "Step 3: Returning tasks list");
    res.render(Json(result));
}

#[handler]
async fn create_task(req: &mut Request, res: &mut Response) {
    tracing::debug!("Step 1: Start create_task API");
    let body = req.parse_json::<serde_json::Value>().await;
    match body {
        Ok(b) => {
            let mut requirement = b.get("requirement").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            tracing::debug!(requirement = ?requirement, "Step 2: Parsed request body successfully");
            
            if let Some(files) = b.get("files").and_then(|v| v.as_array()) {
                for file in files {
                    let name = file.get("name").and_then(|v| v.as_str()).unwrap_or("unknown_file");
                    let content = file.get("content").and_then(|v| v.as_str()).unwrap_or("");
                    
                    if !content.is_empty() {
                        requirement.push_str(&format!("\n\n[Attached File: {}]\n{}", name, content));
                    }
                }
            }

            if requirement.is_empty() {
                tracing::debug!("Step 3: Requirement is empty, returning BAD_REQUEST");
                res.status_code(StatusCode::BAD_REQUEST);
                res.render(Json(serde_json::json!({"error": "requirement 不可為空"})));
                return;
            }
            
            match GatewayClient::connect("ssh://127.0.0.1:3000").await {
                Ok(client) => {
                    tracing::debug!("Step 3: Connected to GatewayClient on port 3000");
                    if let Err(e) = client.chat(requirement).await {
                        tracing::error!("Step 4: Failed to send chat command: {}", e);
                        res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                        res.render(Json(serde_json::json!({"error": e.to_string()})));
                    } else {
                        tracing::debug!("Step 4: Chat command sent via GatewayClient");
                        let task_id = uuid::Uuid::new_v4().to_string();
                        
                        let client_arc = Arc::new(client);
                        get_client_sessions().write().await.insert(task_id.clone(), client_arc.clone());
                        
                        let task_id_clone = task_id.clone();
                        tokio::spawn(async move {
                            let tx = get_broadcaster();
                            // Broadcast TaskCreated
                            let _ = tx.send(proto::ServerMessage {
                                payload: Some(proto::server_message::Payload::TaskCreated(
                                    proto::TaskCreatedEvent {
                                        task_id: task_id_clone.clone(),
                                        status: "queued".to_string(),
                                    }
                                ))
                            });
                            
                            let mut full_result = String::new();
                            while let Some(event) = client_arc.recv().await {
                                match event {
                                    eiva_core::gateway::GatewayEvent::Chunk { delta } => {
                                        full_result.push_str(&delta);
                                    }
                                    eiva_core::gateway::GatewayEvent::ResponseDone => {
                                        let _ = tx.send(proto::ServerMessage {
                                            payload: Some(proto::server_message::Payload::TaskCompleted(
                                                proto::TaskCompletedEvent {
                                                    task_id: task_id_clone.clone(),
                                                    result: full_result.clone(),
                                                    at: chrono::Utc::now().to_rfc3339(),
                                                }
                                            ))
                                        });
                                    }
                                    eiva_core::gateway::GatewayEvent::ToolOutput { chunk, .. } => {
                                        let _ = tx.send(proto::ServerMessage {
                                            payload: Some(proto::server_message::Payload::TaskLog(
                                                proto::TaskLogEvent {
                                                    task_id: task_id_clone.clone(),
                                                    message: chunk,
                                                    at: chrono::Utc::now().to_rfc3339(),
                                                }
                                            ))
                                        });
                                    }
                                    eiva_core::gateway::GatewayEvent::AuthFailed { message, .. } |
                                    eiva_core::gateway::GatewayEvent::ModelError { message } => {
                                        let _ = tx.send(proto::ServerMessage {
                                            payload: Some(proto::server_message::Payload::TaskFailed(
                                                proto::TaskFailedEvent {
                                                    task_id: task_id_clone.clone(),
                                                    error: message,
                                                    at: chrono::Utc::now().to_rfc3339(),
                                                }
                                            ))
                                        });
                                    }
                                    eiva_core::gateway::GatewayEvent::ToolCall { name, .. } => {
                                        let _ = tx.send(proto::ServerMessage {
                                            payload: Some(proto::server_message::Payload::TaskLog(
                                                proto::TaskLogEvent {
                                                    task_id: task_id_clone.clone(),
                                                    message: format!("Tool call: {}", name),
                                                    at: chrono::Utc::now().to_rfc3339(),
                                                }
                                            ))
                                        });
                                    }
                                    _ => {}
                                }
                            }
                            // Clean up when the connection drops or task finishes
                            get_client_sessions().write().await.remove(&task_id_clone);
                        });

                        res.status_code(StatusCode::ACCEPTED);
                        res.render(Json(serde_json::json!({
                            "taskId": task_id,
                            "status": "queued"
                        })));
                    }
                }
                Err(e) => {
                    tracing::error!("Step 3: Failed to connect to GatewayClient: {}", e);
                    res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                    res.render(Json(serde_json::json!({"error": e.to_string()})));
                }
            }
        }
        Err(e) => {
            tracing::debug!(error = ?e, "Step 2: Failed to parse request body, returning BAD_REQUEST");
            res.status_code(StatusCode::BAD_REQUEST);
        }
    }
}

#[handler]
async fn stop_task(req: &mut Request, res: &mut Response) {
    let task_id = req.param::<String>("taskId").unwrap_or_default();
    tracing::debug!(task_id = ?task_id, "Step 1: Start stop_task API");
    
    let client_opt = get_client_sessions().read().await.get(&task_id).cloned();
    match client_opt {
        Some(client) => {
            tracing::debug!("Step 2: Found active GatewayClient for task");
            if let Err(e) = client.send(GatewayCommand::Cancel).await {
                tracing::error!("Step 3: Failed to send Cancel command: {}", e);
                res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                res.render(Json(serde_json::json!({"error": e.to_string()})));
            } else {
                tracing::debug!("Step 3: Cancel command sent successfully");
                res.status_code(StatusCode::ACCEPTED);
                res.render(Json(serde_json::json!({
                    "taskId": task_id,
                    "status": "stopping"
                })));
            }
        }
        None => {
            tracing::error!("Step 2: No active GatewayClient found for task_id");
            res.status_code(StatusCode::NOT_FOUND);
            res.render(Json(serde_json::json!({"error": "Task not found or already finished"})));
        }
    }
}

#[handler]
async fn get_task(req: &mut Request, res: &mut Response) {
    let task_id = req.param::<String>("taskId").unwrap_or_default();
    tracing::debug!(task_id = ?task_id, "Step 1: Start get_task API");
    
    let result = serde_json::json!({
        "taskId": task_id,
        "status": "idle"
    });
    tracing::debug!(result = ?result, "Step 2: Returning task status");
    res.render(Json(result));
}

#[handler]
async fn list_schedules(res: &mut Response) {
    tracing::debug!("Step 1: Start list_schedules API");
    let result = serde_json::json!({ "schedules": [] });
    tracing::debug!(result = ?result, "Step 2: Returning schedules list");
    res.render(Json(result));
}

#[handler]
async fn create_schedule(res: &mut Response) {
    tracing::debug!("Step 1: Start create_schedule API");
    res.status_code(StatusCode::CREATED);
    let result = serde_json::json!({
        "id": uuid::Uuid::new_v4().to_string(),
        "status": "created"
    });
    tracing::debug!(result = ?result, "Step 2: Returning created schedule result");
    res.render(Json(result));
}

#[handler]
async fn update_schedule(req: &mut Request, res: &mut Response) {
    let id = req.param::<String>("id").unwrap_or_default();
    tracing::debug!(id = ?id, "Step 1: Start update_schedule API");
    let result = serde_json::json!({
        "id": id,
        "status": "updated"
    });
    tracing::debug!(result = ?result, "Step 2: Returning updated schedule result");
    res.render(Json(result));
}

#[handler]
async fn delete_schedule(req: &mut Request, res: &mut Response) {
    let id = req.param::<String>("id").unwrap_or_default();
    tracing::debug!(id = ?id, "Step 1: Start delete_schedule API");
    res.status_code(StatusCode::NO_CONTENT);
    tracing::debug!("Step 2: Deleted schedule, returning NO_CONTENT");
}

#[handler]
async fn ws_handler(req: &mut Request, res: &mut Response) -> Result<(), StatusError> {
    tracing::debug!("Step 1: Start ws_handler API");
    WebSocketUpgrade::new().upgrade(req, res, |mut ws| async move {
        tracing::debug!("Step 2: WebSocket connected");
        
        let mut rx = get_broadcaster().subscribe();
        
        loop {
            tokio::select! {
                // Receive messages from the client
                msg = ws.recv() => {
                    if let Some(Ok(msg)) = msg {
                        if msg.is_binary() {
                            let data = msg.into_bytes();
                            if let Ok(client_msg) = proto::ClientMessage::decode(&*data) {
                                tracing::debug!(?client_msg, "Step 3: Received ClientMessage via WS");
                                if let Some(payload) = client_msg.payload {
                                    match payload {
                                        proto::client_message::Payload::CreateTask(_req) => {
                                            // Handle CreateTask via WS if needed, or leave stub
                                            let task_id = uuid::Uuid::new_v4().to_string();
                                            let response = proto::ServerMessage {
                                                payload: Some(proto::server_message::Payload::TaskCreated(
                                                    proto::TaskCreatedEvent {
                                                        task_id,
                                                        status: "queued".to_string(),
                                                    }
                                                ))
                                            };
                                            let mut buf = Vec::new();
                                            response.encode(&mut buf).unwrap();
                                            let _ = ws.send(Message::binary(buf)).await;
                                        }
                                        proto::client_message::Payload::StopTask(req) => {
                                            tracing::debug!(task_id = ?req.task_id, "Step 4: Stopping task via WS");
                                            let response = proto::ServerMessage {
                                                payload: Some(proto::server_message::Payload::TaskStatus(
                                                    proto::TaskStatusEvent {
                                                        task_id: req.task_id,
                                                        status: "stopping".to_string(),
                                                    }
                                                ))
                                            };
                                            let mut buf = Vec::new();
                                            response.encode(&mut buf).unwrap();
                                            let _ = ws.send(Message::binary(buf)).await;
                                        }
                                        proto::client_message::Payload::Ping(_) => {
                                            tracing::debug!("Step 4: Ping received, sending Pong");
                                            let response = proto::ServerMessage {
                                                payload: Some(proto::server_message::Payload::Pong(
                                                    proto::Pong {}
                                                ))
                                            };
                                            let mut buf = Vec::new();
                                            response.encode(&mut buf).unwrap();
                                            let _ = ws.send(Message::binary(buf)).await;
                                        }
                                        _ => {}
                                    }
                                }
                            }
                        }
                    } else {
                        break; // Connection closed
                    }
                }
                
                // Receive broadcast messages from the backend
                broadcast_msg = rx.recv() => {
                    if let Ok(server_msg) = broadcast_msg {
                        let mut buf = Vec::new();
                        server_msg.encode(&mut buf).unwrap();
                        if ws.send(Message::binary(buf)).await.is_err() {
                            break; // Connection closed
                        }
                    }
                }
            }
        }
        tracing::debug!("Step 5: WebSocket disconnected");
    }).await
}


#[handler]
async fn get_workflow(req: &mut Request, res: &mut Response) {
    let id = req.param::<String>("id").unwrap_or_default();
    if let Some(db) = WORKFLOW_DB.get() {
        match db.get_workflow(id.clone()).await {
            Ok(Some(data)) => {
                res.render(Text::Json(data));
            }
            Ok(None) => {
                let default_wf = serde_json::json!({
                    "nodes": [
                        {"id": "start", "type": "startNode", "position": {"x": 50, "y": 150}, "data": {"label": "開始", "prompt": ""}},
                        {"id": "agent1", "type": "agentNode", "position": {"x": 260, "y": 150}, "data": {"label": "分析 Agent", "prompt": "您好，我是負責分析需求的 Agent"}},
                        {"id": "tool1", "type": "toolNode", "position": {"x": 470, "y": 150}, "data": {"label": "搜尋工具", "prompt": "執行資料搜尋"}},
                        {"id": "agent2", "type": "agentNode", "position": {"x": 680, "y": 150}, "data": {"label": "總結 Agent", "prompt": "負責將搜尋結果進行總結"}},
                        {"id": "end", "type": "endNode", "position": {"x": 890, "y": 150}, "data": {"label": "結束", "prompt": ""}}
                    ],
                    "edges": [
                        {"id": "e1", "source": "start", "sourceHandle": "source-right", "target": "agent1", "targetHandle": "target-left"},
                        {"id": "e2", "source": "agent1", "sourceHandle": "source-right", "target": "tool1", "targetHandle": "target-left"},
                        {"id": "e3", "source": "tool1", "sourceHandle": "source-right", "target": "agent2", "targetHandle": "target-left"},
                        {"id": "e4", "source": "agent2", "sourceHandle": "source-right", "target": "end", "targetHandle": "target-left"}
                    ]
                });
                let default_str = default_wf.to_string();
                let _ = db.save_workflow(id, default_str.clone()).await;
                res.render(Text::Json(default_str));
            }
            Err(e) => {
                res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                res.render(Json(serde_json::json!({"error": e.to_string()})));
            }
        }
    } else {
        res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
    }
}

#[handler]
async fn save_workflow(req: &mut Request, res: &mut Response) {
    let id = req.param::<String>("id").unwrap_or_default();
    let data_str = match req.payload().await {
        Ok(bytes) => String::from_utf8_lossy(bytes).to_string(),
        Err(_) => "".to_string(),
    };

    if let Some(db) = WORKFLOW_DB.get() {
        match db.save_workflow(id, data_str).await {
            Ok(_) => {
                res.render(Json(serde_json::json!({"ok": true})));
            }
            Err(e) => {
                res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                res.render(Json(serde_json::json!({"error": e.to_string()})));
            }
        }
    } else {
        res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
    }
}

#[handler]
async fn handle_options(res: &mut Response) {
    res.status_code(StatusCode::OK);
}

#[handler]
async fn delete_workflow(req: &mut Request, res: &mut Response) {
    let id = req.param::<String>("id").unwrap_or_default();
    if let Some(db) = WORKFLOW_DB.get() {
        match db.delete_workflow(id).await {
            Ok(_) => res.render(Json(serde_json::json!({"ok": true}))),
            Err(e) => {
                res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                res.render(Json(serde_json::json!({"error": e.to_string()})));
            }
        }
    } else {
        res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
    }
}

#[handler]
async fn list_workflows_handler(res: &mut Response) {
    if let Some(db) = WORKFLOW_DB.get() {
        match db.list_workflows().await {
            Ok(ids) => {
                res.render(Json(serde_json::json!({ "workflows": ids })));
            }
            Err(e) => {
                res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                res.render(Json(serde_json::json!({"error": e.to_string()})));
            }
        }
    } else {
        res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
    }
}

#[handler]
async fn run_workflow(req: &mut Request, res: &mut Response) {
    let id = req.param::<String>("id").unwrap_or_default();
    
    if let Some(db) = WORKFLOW_DB.get() {
        match db.get_workflow(id.clone()).await {
            Ok(Some(_data)) => {
                res.render(Json(serde_json::json!({
                    "ok": true,
                    "message": format!("Workflow {} is now running.", id)
                })));
            }
            Ok(None) => {
                res.status_code(StatusCode::NOT_FOUND);
                res.render(Json(serde_json::json!({"error": "Workflow not found"})));
            }
            Err(e) => {
                res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                res.render(Json(serde_json::json!({"error": e.to_string()})));
            }
        }
    } else {
        res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
    }
}

// --- MCP Server Handlers ---
#[handler]
async fn list_mcp_servers(res: &mut Response) {
    if let Some(db) = WORKFLOW_DB.get() {
        match db.list_mcp_servers().await {
            Ok(list) => {
                let parsed: Vec<serde_json::Value> = list.into_iter().filter_map(|s| serde_json::from_str(&s).ok()).collect();
                res.render(Json(parsed));
            }
            Err(e) => {
                res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                res.render(Json(serde_json::json!({"error": e.to_string()})));
            }
        }
    }
}

#[handler]
async fn get_mcp_server(req: &mut Request, res: &mut Response) {
    let id = req.param::<String>("id").unwrap_or_default();
    if let Some(db) = WORKFLOW_DB.get() {
        match db.get_mcp_server(id).await {
            Ok(Some(data)) => res.render(Text::Json(data)),
            Ok(None) => {
                res.status_code(StatusCode::NOT_FOUND);
                res.render(Json(serde_json::json!({"error": "Not found"})));
            }
            Err(e) => {
                res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                res.render(Json(serde_json::json!({"error": e.to_string()})));
            }
        }
    }
}

#[handler]
async fn save_mcp_server(req: &mut Request, res: &mut Response) {
    let id = req.param::<String>("id").unwrap_or_default();
    if let Ok(body) = req.parse_json::<serde_json::Value>().await {
        if let Some(db) = WORKFLOW_DB.get() {
            let name = body["name"].as_str().unwrap_or("").to_string();
            let command = body["command"].as_str().unwrap_or("").to_string();
            let args = body["args"].to_string();
            let env = body["env"].to_string();
            let cwd = body["cwd"].as_str().map(String::from);
            let enabled = body["enabled"].as_bool().unwrap_or(true);
            let timeout_secs = body["timeout_secs"].as_u64().unwrap_or(30);
            match db
                .save_mcp_server(
                    id.clone(),
                    name,
                    command,
                    args,
                    env,
                    cwd,
                    enabled,
                    timeout_secs,
                )
                .await
            {
                Ok(_) => res.render(Json(serde_json::json!({"status": "success", "id": id}))),
                Err(e) => {
                    res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                    res.render(Json(serde_json::json!({"error": e.to_string()})));
                }
            }
        }
    } else {
        res.status_code(StatusCode::BAD_REQUEST);
        res.render(Json(serde_json::json!({"error": "Invalid JSON"})));
    }
}

#[handler]
async fn delete_mcp_server(req: &mut Request, res: &mut Response) {
    let id = req.param::<String>("id").unwrap_or_default();
    if let Some(db) = WORKFLOW_DB.get() {
        match db.delete_mcp_server(id).await {
            Ok(_) => res.render(Json(serde_json::json!({"status": "success"}))),
            Err(e) => {
                res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                res.render(Json(serde_json::json!({"error": e.to_string()})));
            }
        }
    }
}

#[handler]
async fn test_mcp_server(req: &mut Request, res: &mut Response) {
    let id = req.param::<String>("id").unwrap_or_default();
    // Read server config from DB
    let server_json = if let Some(db) = WORKFLOW_DB.get() {
        match db.get_mcp_server(id.clone()).await {
            Ok(Some(data)) => data,
            Ok(None) => {
                res.status_code(StatusCode::NOT_FOUND);
                res.render(Json(serde_json::json!({"status": "error", "error": "Server not found"})));
                return;
            }
            Err(e) => {
                res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                res.render(Json(serde_json::json!({"status": "error", "error": e.to_string()})));
                return;
            }
        }
    } else {
        res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
        res.render(Json(serde_json::json!({"status": "error", "error": "Database not initialized"})));
        return;
    };
    // Parse server config from JSON
    let v: serde_json::Value = match serde_json::from_str(&server_json) {
        Ok(v) => v,
        Err(e) => {
            res.render(Json(serde_json::json!({"status": "error", "error": format!("JSON parse error: {}", e)})));
            return;
        }
    };
    let command = v["command"].as_str().unwrap_or("").to_string();
    if command.is_empty() {
        res.render(Json(serde_json::json!({"status": "error", "error": "Command is empty"})));
        return;
    }
    // Attempt connection via McpManager
    #[cfg(feature = "mcp")]
    {
        let server_name = v["name"].as_str().unwrap_or(&id).to_string();
        let args: Vec<String> = v["args"]
            .as_array()
            .map(|a| a.iter().filter_map(|x| x.as_str().map(String::from)).collect())
            .unwrap_or_default();
        let env: std::collections::HashMap<String, String> = v["env"]
            .as_object()
            .map(|o| o.iter().filter_map(|(k, val)| val.as_str().map(|v| (k.clone(), v.to_string()))).collect())
            .unwrap_or_default();
        let cwd = v["cwd"].as_str().map(String::from);
        let timeout_secs = v["timeout_secs"].as_u64().unwrap_or(30);
        let server_cfg = eiva_core::mcp::McpServerConfig {
            command,
            args,
            env,
            cwd,
            enabled: true,
            timeout_secs,
        };
        if let Some(mgr) = eiva_core::runtime_ctx::get_mcp_manager() {
            let mgr = mgr.lock().await;
            // Disconnect first if already connected
            let _ = mgr.disconnect(&server_name).await;
            match mgr.connect(&server_name, &server_cfg).await {
                Ok(()) => {
                    let tools = mgr.list_tools(&server_name).await
                        .map(|ts| ts.iter().map(|t| t.prefixed_name()).collect::<Vec<_>>())
                        .unwrap_or_default();
                    let _ = mgr.disconnect(&server_name).await;
                    res.render(Json(serde_json::json!({
                        "status": "success",
                        "server": server_name,
                        "tools": tools,
                        "tool_count": tools.len(),
                    })));
                }
                Err(e) => {
                    res.render(Json(serde_json::json!({
                        "status": "error",
                        "server": server_name,
                        "error": e.to_string(),
                    })));
                }
            }
        } else {
            res.render(Json(serde_json::json!({"status": "error", "error": "MCP manager not initialized"})));
        }
    }
    #[cfg(not(feature = "mcp"))]
    {
        res.render(Json(serde_json::json!({"status": "error", "error": "MCP feature not enabled"})));
    }
}

// --- AI Skill Handlers ---
#[handler]
async fn list_skills(res: &mut Response) {
    if let Some(db) = WORKFLOW_DB.get() {
        match db.list_skills().await {
            Ok(list) => {
                let parsed: Vec<serde_json::Value> = list.into_iter().filter_map(|s| serde_json::from_str(&s).ok()).collect();
                res.render(Json(parsed));
            }
            Err(e) => {
                res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                res.render(Json(serde_json::json!({"error": e.to_string()})));
            }
        }
    }
}

#[handler]
async fn get_skill(req: &mut Request, res: &mut Response) {
    let id = req.param::<String>("id").unwrap_or_default();
    if let Some(db) = WORKFLOW_DB.get() {
        match db.get_skill(id).await {
            Ok(Some(data)) => res.render(Text::Json(data)),
            Ok(None) => {
                res.status_code(StatusCode::NOT_FOUND);
                res.render(Json(serde_json::json!({"error": "Not found"})));
            }
            Err(e) => {
                res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                res.render(Json(serde_json::json!({"error": e.to_string()})));
            }
        }
    }
}

#[handler]
async fn save_skill(req: &mut Request, res: &mut Response) {
    let id = req.param::<String>("id").unwrap_or_default();
    if let Ok(body) = req.parse_json::<serde_json::Value>().await {
        if let Some(db) = WORKFLOW_DB.get() {
            let name = body["name"].as_str().unwrap_or("").to_string();
            let description = body["description"].as_str().unwrap_or("").to_string();
            let instructions = body["instructions"].as_str().unwrap_or("").to_string();
            let enabled = body["enabled"].as_bool().unwrap_or(true);
            let linked_secrets = body["linked_secrets"].to_string();
            match db
                .save_skill(id.clone(), name, description, instructions, enabled, linked_secrets)
                .await
            {
                Ok(_) => res.render(Json(serde_json::json!({"status": "success", "id": id}))),
                Err(e) => {
                    res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                    res.render(Json(serde_json::json!({"error": e.to_string()})));
                }
            }
        }
    } else {
        res.status_code(StatusCode::BAD_REQUEST);
        res.render(Json(serde_json::json!({"error": "Invalid JSON"})));
    }
}

#[handler]
async fn delete_skill(req: &mut Request, res: &mut Response) {
    let id = req.param::<String>("id").unwrap_or_default();
    if let Some(db) = WORKFLOW_DB.get() {
        match db.delete_skill(id).await {
            Ok(_) => res.render(Json(serde_json::json!({"status": "success"}))),
            Err(e) => {
                res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                res.render(Json(serde_json::json!({"error": e.to_string()})));
            }
        }
    }
}

#[handler]
async fn test_skill(req: &mut Request, res: &mut Response) {
    let id = req.param::<String>("id").unwrap_or_default();
    let skill_json = if let Some(db) = WORKFLOW_DB.get() {
        match db.get_skill(id.clone()).await {
            Ok(Some(data)) => data,
            Ok(None) => {
                res.status_code(StatusCode::NOT_FOUND);
                res.render(Json(serde_json::json!({"status": "error", "error": "Skill not found"})));
                return;
            }
            Err(e) => {
                res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                res.render(Json(serde_json::json!({"status": "error", "error": e.to_string()})));
                return;
            }
        }
    } else {
        res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
        res.render(Json(serde_json::json!({"status": "error", "error": "Database not initialized"})));
        return;
    };
    let v: serde_json::Value = match serde_json::from_str(&skill_json) {
        Ok(v) => v,
        Err(e) => {
            res.render(Json(serde_json::json!({"status": "error", "error": format!("JSON parse error: {}", e)})));
            return;
        }
    };
    let name = v["name"].as_str().unwrap_or("").to_string();
    let instructions = v["instructions"].as_str().unwrap_or("").to_string();
    let mut errors: Vec<String> = Vec::new();
    let mut warnings: Vec<String> = Vec::new();
    // Validation checks
    if name.is_empty() {
        errors.push("Skill name is empty".into());
    } else if !name.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_') {
        warnings.push("Skill name contains non-alphanumeric characters (kebab-case recommended)".into());
    }
    if instructions.is_empty() {
        errors.push("Instructions (prompt) are empty".into());
    } else {
        let line_count = instructions.lines().count();
        if line_count < 3 {
            warnings.push(format!("Instructions are very short ({} lines) — consider adding more detail", line_count));
        }
    }
    // Check linked secrets format
    if let Some(secrets) = v["linked_secrets"].as_array() {
        for s in secrets {
            if let Some(val) = s.as_str() {
                if val.is_empty() {
                    warnings.push("Empty linked secret name found".into());
                }
            }
        }
    }
    if errors.is_empty() {
        res.render(Json(serde_json::json!({
            "status": "success",
            "skill": name,
            "warnings": warnings,
            "manager_validated": false,
        })));
    } else {
        res.render(Json(serde_json::json!({
            "status": "error",
            "skill": name,
            "errors": errors,
            "warnings": warnings,
        })));
    }
}

pub async fn run_server(task_mgr: Arc<TaskManager>, workflow_db: crate::db::WorkflowDb, port: u16) -> anyhow::Result<()> {
    // Initialize global state
    let _ = TASK_MGR.set(task_mgr);
    let _ = WORKFLOW_DB.set(workflow_db);

    let cors = Cors::new()
        .allow_origin("*")
        .allow_methods(vec![Method::GET, Method::POST, Method::DELETE, Method::PUT, Method::PATCH, Method::OPTIONS])
        .allow_headers(vec!["content-type", "authorization", "*"])
        .into_handler();

    let router = Router::new()
        .hoop(salvo::logging::Logger::new())
        .hoop(cors)
        .push(Router::with_path("").get(redirect_home))
        .push(Router::with_path("index").get(redirect_home))
        .push(Router::with_path("index.html").get(redirect_home))
        .push(
            Router::with_path("eiva/backend/api/ver-0.95")
                .push(Router::with_path("health").get(health))
                .push(
                    Router::with_path("tasks")
                        .get(list_tasks)
                        .post(create_task)
                        .options(handle_options)
                        .push(
                            Router::with_path("<taskId>")
                                .get(get_task)
                                .push(
                                    Router::with_path("stop")
                                        .post(stop_task)
                                        .options(handle_options)
                                )
                        )
                )
                .push(
                    Router::with_path("schedules")
                        .get(list_schedules)
                        .post(create_schedule)
                        .push(
                            Router::with_path("<id>")
                                .patch(update_schedule)
                                .delete(delete_schedule)
                        )
                )
                .push(
                    Router::with_path("workflows")
                        .get(list_workflows_handler)
                )
                .push(
                    Router::with_path("ws").get(ws_handler)
                )
                .push(
                    Router::with_path("workflow/<id>")
                        .get(get_workflow)
                        .post(save_workflow)
                        .delete(delete_workflow)
                        .options(handle_options)
                        .push(Router::with_path("run").get(run_workflow))
                )
                .push(
                    Router::with_path("mcp-servers")
                        .get(list_mcp_servers)
                )
                .push(
                    Router::with_path("mcp-server/<id>")
                        .get(get_mcp_server)
                        .post(save_mcp_server)
                        .delete(delete_mcp_server)
                        .options(handle_options)
                )
                .push(
                    Router::with_path("mcp-server/<id>/test")
                        .post(test_mcp_server)
                        .options(handle_options)
                )
                .push(
                    Router::with_path("skills")
                        .get(list_skills)
                )
                .push(
                    Router::with_path("skill/<id>")
                        .get(get_skill)
                        .post(save_skill)
                        .delete(delete_skill)
                        .options(handle_options)
                )
                .push(
                    Router::with_path("skill/<id>/test")
                        .post(test_skill)
                        .options(handle_options)
                )
                .push(
                    Router::with_path("ai-model")
                        .get(list_ai_models)
                        .options(handle_options)
                )
                .push(
                    Router::with_path("ai-model/<id>")
                        .get(list_ai_models) // GET single ai model (reuse list or we didn't implement GET single)
                        .post(save_ai_model)
                        .delete(delete_ai_model)
                        .options(handle_options)
                )
                .push(
                    Router::with_path("workspace")
                        .push(Router::with_path("tree").get(crate::workspace::get_workspace_tree))
                        .push(Router::with_path("list").get(crate::workspace::list_workspace))
                        .push(Router::with_path("file")
                            .get(crate::workspace::download_workspace_file)
                            .post(crate::workspace::upload_workspace_file)
                            .options(handle_options)
                        )
                        .push(Router::with_path("dir")
                            .post(crate::workspace::create_workspace_dir)
                            .options(handle_options)
                        )
                        .push(Router::with_path("delete")
                            .post(crate::workspace::delete_workspace_entry)
                            .options(handle_options)
                        )
                        .push(Router::with_path("rename")
                            .post(crate::workspace::rename_workspace_entry)
                            .options(handle_options)
                        )
                )
        )
        .push(
            Router::with_path("eiva/frontend/view/<**path>")
                .get(salvo::serve_static::StaticDir::new(vec!["assets/web", "../assets/web"]).defaults("index.html"))
        )
        .push(
            Router::with_path("eiva/frontend/static/<**path>")
                .get(salvo::serve_static::StaticDir::new(vec!["assets/static", "../assets/static"]))
        );

    let acceptor = TcpListener::new(format!("0.0.0.0:{}", port)).bind().await;
    tracing::info!("Salvo API Server listening on 0.0.0.0:{}", port);
    Server::new(acceptor).serve(router).await;
    Ok(())
}

// --- AI Model Handlers ---

#[handler]
async fn list_ai_models(res: &mut Response) {
    if let Some(db) = WORKFLOW_DB.get() {
        match db.list_ai_models().await {
            Ok(models) => {
                let models: Vec<serde_json::Value> = models
                    .into_iter()
                    .filter_map(|s| serde_json::from_str(&s).ok())
                    .collect();
                res.render(Json(models));
            }
            Err(e) => {
                res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                res.render(Json(serde_json::json!({"error": e.to_string()})));
            }
        }
    } else {
        res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
        res.render(Json(serde_json::json!({"error": "DB not initialized"})));
    }
}

#[handler]
async fn save_ai_model(req: &mut Request, res: &mut Response) {
    if let Ok(body) = req.parse_json::<serde_json::Value>().await {
        let id = body.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let provider = body.get("provider").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let name = body.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let api_key = body.get("api_key").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let base_url = body.get("base_url").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let enabled = body.get("enabled").and_then(|v| v.as_bool()).unwrap_or(true);
        let extra_params = body.get("extra_params").map(|v| v.to_string()).unwrap_or_else(|| "{}".to_string());

        if id.is_empty() {
            res.status_code(StatusCode::BAD_REQUEST);
            res.render(Json(serde_json::json!({"error": "Missing id"})));
            return;
        }

        if let Some(db) = WORKFLOW_DB.get() {
            match db.save_ai_model(id.clone(), provider, name, api_key, base_url, enabled, extra_params).await {
                Ok(_) => {
                    res.render(Json(serde_json::json!({"status": "ok", "id": id})));
                }
                Err(e) => {
                    res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                    res.render(Json(serde_json::json!({"error": e.to_string()})));
                }
            }
        } else {
            res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
            res.render(Json(serde_json::json!({"error": "DB not initialized"})));
        }
    } else {
        res.status_code(StatusCode::BAD_REQUEST);
        res.render(Json(serde_json::json!({"error": "Invalid JSON"})));
    }
}

#[handler]
async fn delete_ai_model(req: &mut Request, res: &mut Response) {
    let id = req.param::<String>("id").unwrap_or_default();
    if id.is_empty() {
        res.status_code(StatusCode::BAD_REQUEST);
        res.render(Json(serde_json::json!({"error": "Missing id"})));
        return;
    }

    if let Some(db) = WORKFLOW_DB.get() {
        match db.delete_ai_model(id).await {
            Ok(_) => {
                res.render(Json(serde_json::json!({"status": "ok"})));
            }
            Err(e) => {
                res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                res.render(Json(serde_json::json!({"error": e.to_string()})));
            }
        }
    } else {
        res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
        res.render(Json(serde_json::json!({"error": "DB not initialized"})));
    }
}
