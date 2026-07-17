use async_trait::async_trait;
use salvo::prelude::*;
use salvo::http::StatusCode;
use std::sync::Arc;
use eiva_be_codex::CodexApiContext;

fn string_value(v: Option<&serde_json::Value>) -> String {
    v.and_then(|val| val.as_str())
        .unwrap_or_default()
        .to_string()
}

fn authorize_openclaw_request(req: &Request, res: &mut Response) -> bool {
    let token = std::env::var("OPENCLAW_WEB_CODEX_TOKEN").unwrap_or_default();
    if token.trim().is_empty() {
        res.status_code(StatusCode::SERVICE_UNAVAILABLE);
        res.render(Json(
            serde_json::json!({"error": "OPENCLAW_WEB_CODEX_TOKEN 尚未設定"}),
        ));
        return false;
    }

    let expected = format!("Bearer {}", token.trim());
    let authorization = req
        .headers()
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();
    if authorization != expected {
        res.status_code(StatusCode::UNAUTHORIZED);
        res.render(Json(
            serde_json::json!({"error": "OpenClaw token 驗證失敗"}),
        ));
        return false;
    }

    true
}

fn format_task_for_openclaw(
    task: &serde_json::Value,
    message: Option<String>,
) -> serde_json::Value {
    let status = string_value(task.get("status"));
    let logs = task
        .get("logs")
        .or_else(|| task.get("processLogs"))
        .and_then(|value| value.as_array())
        .map(|items| {
            items
                .iter()
                .filter(|item| {
                    !item
                        .get("message")
                        .and_then(|value| value.as_str())
                        .unwrap_or_default()
                        .starts_with("[stderr]")
                })
                .rev()
                .take(12)
                .cloned()
                .collect::<Vec<_>>()
                .into_iter()
                .rev()
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    serde_json::json!({
        "taskId": string_value(task.get("taskId")),
        "status": status,
        "message": message.unwrap_or_else(|| match status.as_str() {
            "completed" => format!("任務完成：{}", string_value(task.get("taskId"))),
            "failed" => format!("任務失敗：{}", string_value(task.get("error"))),
            "interrupted" => format!("任務已停止：{}", string_value(task.get("taskId"))),
            "running" => format!("任務執行中：{}", string_value(task.get("taskId"))),
            "queued" => format!("任務排隊中：{}", string_value(task.get("taskId"))),
            _ => format!("任務狀態 {}：{}", status, string_value(task.get("taskId"))),
        }),
        "logs": logs,
        "result": string_value(task.get("result")),
        "error": string_value(task.get("error")),
        "createdAt": string_value(task.get("createdAt")),
        "startedAt": string_value(task.get("startedAt")),
        "completedAt": string_value(task.get("completedAt")),
    })
}

#[handler]
async fn create_openclaw_task(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    if !authorize_openclaw_request(req, res) {
        return;
    }

    let body = match req.parse_json::<serde_json::Value>().await {
        Ok(body) => body,
        Err(e) => {
            res.status_code(StatusCode::BAD_REQUEST);
            res.render(Json(serde_json::json!({"error": e.to_string()})));
            return;
        }
    };
    let requirement = body
        .get("requirement")
        .and_then(|value| value.as_str())
        .unwrap_or_default()
        .trim()
        .to_string();

    if requirement.is_empty() {
        res.status_code(StatusCode::BAD_REQUEST);
        res.render(Json(serde_json::json!({"error": "requirement 不可為空"})));
        return;
    }
    if requirement.chars().count() > 8000 {
        res.status_code(StatusCode::PAYLOAD_TOO_LARGE);
        res.render(Json(
            serde_json::json!({"error": "requirement 最多 8000 字"}),
        ));
        return;
    }

    let ctx = depot.get::<Arc<dyn CodexApiContext>>("codex_ctx").unwrap().clone();
    let task_id = ctx.dispatch_prompt_task(requirement).await;

    res.status_code(StatusCode::ACCEPTED);
    res.render(Json(serde_json::json!({
        "taskId": task_id,
        "status": "queued",
        "message": format!("任務已建立：{}", task_id),
        "logs": [],
        "result": "",
        "error": "",
        "createdAt": chrono::Utc::now().to_rfc3339(),
        "startedAt": "",
        "completedAt": ""
    })));
}

#[handler]
async fn get_openclaw_task(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    if !authorize_openclaw_request(req, res) {
        return;
    }

    let task_id = req.param::<String>("taskId").unwrap_or_default();
    let ctx = depot.get::<Arc<dyn CodexApiContext>>("codex_ctx").unwrap().clone();

    match ctx.get_task(&task_id).await {
        Ok(Some(task)) => match serde_json::from_str::<serde_json::Value>(&task) {
            Ok(task) => res.render(Json(format_task_for_openclaw(&task, None))),
            Err(e) => {
                res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                res.render(Json(serde_json::json!({"error": e.to_string()})));
            }
        },
        Ok(None) => {
            res.status_code(StatusCode::NOT_FOUND);
            res.render(Json(serde_json::json!({"error": "Task not found"})));
        }
        Err(e) => {
            res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
            res.render(Json(serde_json::json!({"error": e.to_string()})));
        }
    }
}

#[handler]
async fn stop_openclaw_task(req: &mut Request, depot: &mut Depot, res: &mut Response) {
    if !authorize_openclaw_request(req, res) {
        return;
    }

    let task_id = req.param::<String>("taskId").unwrap_or_default();
    let ctx = depot.get::<Arc<dyn CodexApiContext>>("codex_ctx").unwrap().clone();

    match ctx.stop_task(&task_id).await {
        Ok(_) => {
            res.render(Json(serde_json::json!({"status": "ok"})));
        }
        Err(e) => {
            res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
            res.render(Json(serde_json::json!({"error": e.to_string()})));
        }
    }
}

#[handler]
async fn handle_options(res: &mut Response) {
    res.status_code(StatusCode::OK);
}

pub struct InjectOpenclawContext {
    pub ctx: Arc<dyn CodexApiContext>,
}

#[async_trait]
impl Handler for InjectOpenclawContext {
    async fn handle(&self, _req: &mut Request, depot: &mut Depot, res: &mut Response, ctrl: &mut FlowCtrl) {
        depot.insert("codex_ctx", self.ctx.clone());
        ctrl.call_next(_req, depot, res).await;
    }
}

pub fn build_openclaw_router(ctx: Arc<dyn CodexApiContext>) -> Router {
    Router::new()
        .hoop(InjectOpenclawContext { ctx })
        .push(
            Router::with_path("tasks")
                .post(create_openclaw_task)
                .options(handle_options)
                .push(
                    Router::with_path("<taskId>").get(get_openclaw_task).push(
                        Router::with_path("stop")
                            .post(stop_openclaw_task)
                            .options(handle_options),
                    ),
                ),
        )
}
