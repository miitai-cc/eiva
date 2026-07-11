use salvo::prelude::*;
use salvo::cors::Cors;
use salvo::http::Method;
use eiva_core::tasks::TaskManager;
use std::sync::{Arc, OnceLock};
use salvo::websocket::{Message, WebSocketUpgrade};
use prost::Message as ProstMessage;

pub mod proto {
    include!(concat!(env!("OUT_DIR"), "/eiva.rs"));
}

static TASK_MGR: OnceLock<Arc<TaskManager>> = OnceLock::new();
static WORKFLOW_DB: OnceLock<crate::db::WorkflowDb> = OnceLock::new();

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

#[derive(serde::Deserialize)]
struct CreateTaskReq {
    requirement: String,
}

#[handler]
async fn create_task(req: &mut Request, res: &mut Response) {
    tracing::debug!("Step 1: Start create_task API");
    let body = req.parse_json::<CreateTaskReq>().await;
    match body {
        Ok(b) => {
            tracing::debug!(requirement = ?b.requirement, "Step 2: Parsed request body successfully");
            if b.requirement.is_empty() {
                tracing::debug!("Step 3: Requirement is empty, returning BAD_REQUEST");
                res.status_code(StatusCode::BAD_REQUEST);
                res.render(Json(serde_json::json!({"error": "requirement 不可為空"})));
                return;
            }
            
            // Generate mock task
            let task_id = uuid::Uuid::new_v4().to_string();
            tracing::debug!(task_id = ?task_id, "Step 3: Generated mock task_id");
            
            res.status_code(StatusCode::ACCEPTED);
            let result = serde_json::json!({
                "taskId": task_id,
                "status": "queued"
            });
            tracing::debug!(result = ?result, "Step 4: Returning successful result");
            res.render(Json(result));
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
    
    res.status_code(StatusCode::ACCEPTED);
    let result = serde_json::json!({
        "taskId": task_id,
        "status": "stopping"
    });
    tracing::debug!(result = ?result, "Step 2: Returning successful result");
    res.render(Json(result));
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
        while let Some(msg) = ws.recv().await {
            let msg = if let Ok(msg) = msg { msg } else { break; };
            if msg.is_binary() {
                let data = msg.into_bytes();
                if let Ok(client_msg) = proto::ClientMessage::decode(&*data) {
                    tracing::debug!(?client_msg, "Step 3: Received ClientMessage via WS");
                    if let Some(payload) = client_msg.payload {
                        match payload {
                            proto::client_message::Payload::CreateTask(req) => {
                                let task_id = uuid::Uuid::new_v4().to_string();
                                tracing::debug!(task_id = ?task_id, "Step 4: Creating task");
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
                                tracing::debug!(task_id = ?req.task_id, "Step 4: Stopping task");
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
            match db.save_mcp_server(id.clone(), body.to_string()).await {
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
            match db.save_skill(id.clone(), body.to_string()).await {
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
                        .push(
                            Router::with_path("<taskId>")
                                .get(get_task)
                                .push(Router::with_path("stop").post(stop_task))
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
