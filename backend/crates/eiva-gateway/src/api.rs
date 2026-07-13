use crate::cron_dispatch::{CronRuntime, CronType};
use chrono::Datelike;
use eiva_core::gateway::GatewayCommand;
use eiva_core::gateway::client::GatewayClient;
use eiva_core::tasks::TaskManager;
use prost::Message as ProstMessage;
use salvo::cors::Cors;
use salvo::http::Method;
use salvo::prelude::*;
use salvo::websocket::{Message, WebSocketUpgrade};
use std::collections::HashMap;
use std::sync::{Arc, OnceLock};
use tokio::sync::{RwLock, broadcast};
use tokio::time::{Duration, sleep};

#[derive(Debug, Clone)]
struct ParsedScheduleRequest {
    requirement: String,
    fixed_frequency: String,
    fixed_time: String,
}

static WS_BROADCASTER: OnceLock<broadcast::Sender<proto::ServerMessage>> = OnceLock::new();

fn get_broadcaster() -> broadcast::Sender<proto::ServerMessage> {
    WS_BROADCASTER
        .get_or_init(|| {
            let (tx, _) = broadcast::channel(100);
            tx
        })
        .clone()
}

pub mod proto {
    include!(concat!(env!("OUT_DIR"), "/eiva.rs"));
}

static TASK_MGR: OnceLock<Arc<TaskManager>> = OnceLock::new();
pub static WORKFLOW_DB: OnceLock<crate::db::WorkflowDb> = OnceLock::new();

static CLIENT_SESSIONS: OnceLock<RwLock<HashMap<String, Arc<GatewayClient>>>> = OnceLock::new();
static CRON_RUNTIME: OnceLock<Arc<CronRuntime>> = OnceLock::new();

fn get_client_sessions() -> &'static RwLock<HashMap<String, Arc<GatewayClient>>> {
    CLIENT_SESSIONS.get_or_init(|| RwLock::new(HashMap::new()))
}

fn normalize_digits(input: &str) -> String {
    input
        .chars()
        .map(|ch| match ch {
            '０' => '0',
            '１' => '1',
            '２' => '2',
            '３' => '3',
            '４' => '4',
            '５' => '5',
            '６' => '6',
            '７' => '7',
            '８' => '8',
            '９' => '9',
            _ => ch,
        })
        .collect()
}

fn parse_schedule_request(requirement: &str) -> Option<ParsedScheduleRequest> {
    let normalized = normalize_digits(requirement);
    let text = normalized.trim();
    let schedule_intent = ["增加", "新增", "建立", "加入", "設定"]
        .iter()
        .any(|word| text.contains(word))
        && text.contains("排程");
    if !schedule_intent || !(text.contains("每天") || text.contains("每日")) {
        return None;
    }

    let time_marker = if let Some(index) = text.find("上午") {
        ("上午", index)
    } else if let Some(index) = text.find("下午") {
        ("下午", index)
    } else {
        return None;
    };

    let after_marker = &text[time_marker.1 + time_marker.0.len()..];
    let hour_end = after_marker.find('點')?;
    let hour_text = &after_marker[..hour_end];
    let mut hour = hour_text
        .chars()
        .filter(|ch| ch.is_ascii_digit())
        .collect::<String>()
        .parse::<u32>()
        .ok()?;
    if hour > 12 {
        return None;
    }
    if time_marker.0 == "下午" && hour < 12 {
        hour += 12;
    }
    if time_marker.0 == "上午" && hour == 12 {
        hour = 0;
    }

    let after_hour = &after_marker[hour_end + '點'.len_utf8()..];
    let mut minute = 0;
    let mut prompt_start = 0;
    if let Some(minute_end) = after_hour.find('分') {
        let minute_candidate = after_hour[..minute_end]
            .chars()
            .filter(|ch| ch.is_ascii_digit())
            .collect::<String>();
        if !minute_candidate.is_empty() {
            minute = minute_candidate.parse::<u32>().ok()?;
            prompt_start = minute_end + '分'.len_utf8();
        }
    }
    if minute > 59 {
        return None;
    }

    let prompt = after_hour[prompt_start..]
        .trim_matches(|ch: char| ch.is_whitespace() || matches!(ch, ',' | '，' | '。' | ':' | '：'))
        .trim_start_matches("幫我")
        .trim_start_matches("請")
        .trim();
    if prompt.is_empty() {
        return None;
    }

    Some(ParsedScheduleRequest {
        requirement: prompt.to_string(),
        fixed_frequency: "daily".to_string(),
        fixed_time: format!("{hour:02}:{minute:02}"),
    })
}

fn schedule_payload_from_json(mut payload: serde_json::Value, id: String) -> serde_json::Value {
    let now = chrono::Utc::now().to_rfc3339();
    let requirement = payload
        .get("requirement")
        .and_then(|value| value.as_str())
        .unwrap_or_default()
        .trim()
        .to_string();
    let name = payload
        .get("name")
        .and_then(|value| value.as_str())
        .filter(|value| !value.trim().is_empty())
        .map(|value| value.trim().to_string())
        .unwrap_or_else(|| requirement.chars().take(40).collect());

    payload["id"] = serde_json::Value::String(id);
    payload["name"] = serde_json::Value::String(name);
    payload["requirement"] = serde_json::Value::String(requirement);
    if payload.get("enabled").is_none() {
        payload["enabled"] = serde_json::Value::Bool(false);
    }
    if payload.get("scheduleKind").is_none() {
        payload["scheduleKind"] = serde_json::Value::String("one_time".to_string());
    }
    if payload.get("fixedFrequency").is_none() {
        payload["fixedFrequency"] = serde_json::Value::String("daily".to_string());
    }
    if payload.get("fixedTime").is_none() {
        payload["fixedTime"] = serde_json::Value::String("15:00".to_string());
    }
    if payload.get("fixedDayOfWeek").is_none() {
        payload["fixedDayOfWeek"] = serde_json::Value::Number(1.into());
    }
    if payload.get("fixedDayOfMonth").is_none() {
        payload["fixedDayOfMonth"] = serde_json::Value::Number(1.into());
    }
    if payload.get("sendAt").is_none() {
        payload["sendAt"] = serde_json::Value::String(String::new());
    }
    if payload.get("continuous").is_none() {
        payload["continuous"] = serde_json::Value::Bool(false);
    }
    if payload.get("intervalValue").is_none() {
        payload["intervalValue"] = serde_json::Value::Number(1.into());
    }
    if payload.get("intervalUnit").is_none() {
        payload["intervalUnit"] = serde_json::Value::String("minutes".to_string());
    }
    if payload.get("repeatCount").is_none() {
        payload["repeatCount"] = serde_json::Value::Number(2.into());
    }
    payload["updatedAt"] = serde_json::Value::String(now);
    payload
}

async fn save_schedule_payload(
    schedule_id: String,
    payload: serde_json::Value,
) -> anyhow::Result<serde_json::Value> {
    let schedule = schedule_payload_from_json(payload, schedule_id.clone());
    let db = WORKFLOW_DB
        .get()
        .ok_or_else(|| anyhow::anyhow!("DB not initialized"))?;
    db.save_schedule(schedule_id, serde_json::to_string(&schedule)?)
        .await?;
    Ok(schedule)
}

fn bool_value(value: Option<&serde_json::Value>) -> bool {
    match value {
        Some(serde_json::Value::Bool(value)) => *value,
        Some(serde_json::Value::Number(value)) => value.as_i64().unwrap_or(0) != 0,
        Some(serde_json::Value::String(value)) => value == "true" || value == "1",
        _ => false,
    }
}

fn string_value<'a>(value: Option<&'a serde_json::Value>) -> &'a str {
    value.and_then(|value| value.as_str()).unwrap_or_default()
}

fn number_value(value: Option<&serde_json::Value>, default: i64) -> i64 {
    value.and_then(|value| value.as_i64()).unwrap_or(default)
}

fn today_key() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

fn current_local_time() -> String {
    chrono::Local::now().format("%H:%M").to_string()
}

fn schedule_is_due(schedule: &serde_json::Value) -> bool {
    if !bool_value(schedule.get("enabled"))
        || string_value(schedule.get("requirement")).trim().is_empty()
    {
        return false;
    }

    let now = chrono::Local::now();
    let today = now.format("%Y-%m-%d").to_string();
    let current_time = current_local_time();
    let last_run_date = string_value(schedule.get("lastRunDate"));

    if string_value(schedule.get("scheduleKind")) == "fixed" {
        if string_value(schedule.get("fixedTime")) > current_time.as_str() || last_run_date == today
        {
            return false;
        }

        return match string_value(schedule.get("fixedFrequency")) {
            "weekly" => {
                let configured = number_value(schedule.get("fixedDayOfWeek"), 1);
                configured == now.weekday().num_days_from_sunday() as i64
            }
            "monthly" => {
                let configured = number_value(schedule.get("fixedDayOfMonth"), 1);
                configured == now.day() as i64
            }
            _ => true,
        };
    }

    let send_at = string_value(schedule.get("sendAt"));
    if send_at.is_empty() {
        return false;
    }
    let Ok(send_at) = chrono::NaiveDateTime::parse_from_str(send_at, "%Y-%m-%dT%H:%M") else {
        return false;
    };
    if send_at > now.naive_local() {
        return false;
    }

    if bool_value(schedule.get("continuous")) {
        let repeat_count = number_value(schedule.get("repeatCount"), 2).max(1);
        let completed_runs = number_value(schedule.get("completedRuns"), 0);
        if completed_runs >= repeat_count {
            return false;
        }
        if completed_runs == 0 {
            return true;
        }

        let last_run_at = string_value(schedule.get("lastRunAt"));
        let Ok(last_run_at) = chrono::DateTime::parse_from_rfc3339(last_run_at) else {
            return true;
        };
        let interval_value = number_value(schedule.get("intervalValue"), 1).max(1);
        let seconds = if string_value(schedule.get("intervalUnit")) == "hours" {
            interval_value * 3600
        } else {
            interval_value * 60
        };
        return chrono::Utc::now()
            .signed_duration_since(last_run_at.with_timezone(&chrono::Utc))
            .num_seconds()
            >= seconds;
    }

    !bool_value(schedule.get("completed"))
}

async fn save_task_record(
    task_id: &str,
    requirement: &str,
    status: &str,
    result: Option<String>,
    error: Option<String>,
    source_schedule_id: Option<&str>,
    created_at: &str,
) {
    let Some(db) = WORKFLOW_DB.get() else {
        return;
    };
    let task = serde_json::json!({
        "id": task_id,
        "taskId": task_id,
        "requirement": requirement,
        "status": status,
        "result": result,
        "error": error,
        "createdAt": created_at,
        "completedAt": if status == "completed" || status == "failed" { Some(chrono::Utc::now().to_rfc3339()) } else { None::<String> },
        "sourceScheduleId": source_schedule_id,
        "processLogs": []
    });
    let _ = db
        .save_task(
            task_id.to_string(),
            task.to_string(),
            created_at.to_string(),
        )
        .await;
}

async fn dispatch_prompt_task(requirement: String, source_schedule_id: Option<String>) -> String {
    let task_id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono::Utc::now().to_rfc3339();
    save_task_record(
        &task_id,
        &requirement,
        "queued",
        None,
        None,
        source_schedule_id.as_deref(),
        &created_at,
    )
    .await;

    match GatewayClient::connect("ssh://127.0.0.1:3000").await {
        Ok(client) => {
            if let Err(e) = client.chat(requirement.clone()).await {
                save_task_record(
                    &task_id,
                    &requirement,
                    "failed",
                    None,
                    Some(e.to_string()),
                    source_schedule_id.as_deref(),
                    &created_at,
                )
                .await;
                return task_id;
            }

            let client_arc = Arc::new(client);
            get_client_sessions()
                .write()
                .await
                .insert(task_id.clone(), client_arc.clone());
            let task_id_clone = task_id.clone();
            tokio::spawn(async move {
                let tx = get_broadcaster();
                let _ = tx.send(proto::ServerMessage {
                    payload: Some(proto::server_message::Payload::TaskCreated(
                        proto::TaskCreatedEvent {
                            task_id: task_id_clone.clone(),
                            status: "queued".to_string(),
                        },
                    )),
                });
                let _ = tx.send(proto::ServerMessage {
                    payload: Some(proto::server_message::Payload::TaskStatus(
                        proto::TaskStatusEvent {
                            task_id: task_id_clone.clone(),
                            status: "running".to_string(),
                        },
                    )),
                });

                let mut full_result = String::new();
                while let Some(event) = client_arc.recv().await {
                    match event {
                        eiva_core::gateway::GatewayEvent::Chunk { delta } => {
                            full_result.push_str(&delta);
                        }
                        eiva_core::gateway::GatewayEvent::ResponseDone => {
                            save_task_record(
                                &task_id_clone,
                                &requirement,
                                "completed",
                                Some(full_result.clone()),
                                None,
                                source_schedule_id.as_deref(),
                                &created_at,
                            )
                            .await;
                            let _ = tx.send(proto::ServerMessage {
                                payload: Some(proto::server_message::Payload::TaskCompleted(
                                    proto::TaskCompletedEvent {
                                        task_id: task_id_clone.clone(),
                                        result: full_result.clone(),
                                        at: chrono::Utc::now().to_rfc3339(),
                                    },
                                )),
                            });
                            break;
                        }
                        eiva_core::gateway::GatewayEvent::AuthFailed { message, .. }
                        | eiva_core::gateway::GatewayEvent::ModelError { message }
                        | eiva_core::gateway::GatewayEvent::Error { message } => {
                            save_task_record(
                                &task_id_clone,
                                &requirement,
                                "failed",
                                None,
                                Some(message.clone()),
                                source_schedule_id.as_deref(),
                                &created_at,
                            )
                            .await;
                            let _ = tx.send(proto::ServerMessage {
                                payload: Some(proto::server_message::Payload::TaskFailed(
                                    proto::TaskFailedEvent {
                                        task_id: task_id_clone.clone(),
                                        error: message,
                                        at: chrono::Utc::now().to_rfc3339(),
                                    },
                                )),
                            });
                            break;
                        }
                        _ => {}
                    }
                }
                get_client_sessions().write().await.remove(&task_id_clone);
            });
        }
        Err(e) => {
            save_task_record(
                &task_id,
                &requirement,
                "failed",
                None,
                Some(e.to_string()),
                source_schedule_id.as_deref(),
                &created_at,
            )
            .await;
        }
    }

    task_id
}

async fn dispatch_schedule_task(
    runtime: Arc<CronRuntime>,
    requirement: String,
    source_schedule_id: String,
) -> String {
    if runtime.cron_type == CronType::Inner {
        return dispatch_prompt_task(requirement, Some(source_schedule_id)).await;
    }

    let task_id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono::Utc::now().to_rfc3339();
    save_task_record(
        &task_id,
        &requirement,
        "queued",
        None,
        None,
        Some(&source_schedule_id),
        &created_at,
    )
    .await;

    let tx = get_broadcaster();
    let _ = tx.send(proto::ServerMessage {
        payload: Some(proto::server_message::Payload::TaskCreated(
            proto::TaskCreatedEvent {
                task_id: task_id.clone(),
                status: "queued".to_string(),
            },
        )),
    });

    match crate::cron_dispatch::dispatch_external(
        &runtime,
        &task_id,
        &requirement,
        &source_schedule_id,
        &created_at,
    )
    .await
    {
        Ok(result) => {
            save_task_record(
                &task_id,
                &requirement,
                "completed",
                Some(result.clone()),
                None,
                Some(&source_schedule_id),
                &created_at,
            )
            .await;
            let _ = tx.send(proto::ServerMessage {
                payload: Some(proto::server_message::Payload::TaskCompleted(
                    proto::TaskCompletedEvent {
                        task_id: task_id.clone(),
                        result,
                        at: chrono::Utc::now().to_rfc3339(),
                    },
                )),
            });
        }
        Err(e) => {
            let error = e.to_string();
            save_task_record(
                &task_id,
                &requirement,
                "failed",
                None,
                Some(error.clone()),
                Some(&source_schedule_id),
                &created_at,
            )
            .await;
            let _ = tx.send(proto::ServerMessage {
                payload: Some(proto::server_message::Payload::TaskFailed(
                    proto::TaskFailedEvent {
                        task_id: task_id.clone(),
                        error,
                        at: chrono::Utc::now().to_rfc3339(),
                    },
                )),
            });
        }
    }

    task_id
}

async fn mark_schedule_ran(mut schedule: serde_json::Value) -> anyhow::Result<()> {
    let schedule_id = string_value(schedule.get("id")).to_string();
    let now = chrono::Utc::now().to_rfc3339();
    schedule["lastRunAt"] = serde_json::Value::String(now);
    schedule["lastRunDate"] = serde_json::Value::String(today_key());

    if string_value(schedule.get("scheduleKind")) != "fixed" {
        if bool_value(schedule.get("continuous")) {
            let completed_runs = number_value(schedule.get("completedRuns"), 0) + 1;
            let repeat_count = number_value(schedule.get("repeatCount"), 2).max(1);
            schedule["completedRuns"] = serde_json::Value::Number(completed_runs.into());
            if completed_runs >= repeat_count {
                schedule["enabled"] = serde_json::Value::Bool(false);
                schedule["completed"] = serde_json::Value::Bool(true);
            }
        } else {
            schedule["enabled"] = serde_json::Value::Bool(false);
            schedule["completed"] = serde_json::Value::Bool(true);
        }
    }

    save_schedule_payload(schedule_id, schedule).await?;
    Ok(())
}

async fn run_schedule_tick(runtime: Arc<CronRuntime>) {
    let Some(db) = WORKFLOW_DB.get() else {
        return;
    };
    let Ok(rows) = db.list_schedules().await else {
        return;
    };

    for row in rows {
        let Ok(schedule) = serde_json::from_str::<serde_json::Value>(&row) else {
            continue;
        };
        if !schedule_is_due(&schedule) {
            continue;
        }

        let requirement = string_value(schedule.get("requirement")).trim().to_string();
        let schedule_id = string_value(schedule.get("id")).to_string();
        if requirement.is_empty() || schedule_id.is_empty() {
            continue;
        }

        if mark_schedule_ran(schedule).await.is_ok() {
            dispatch_schedule_task(runtime.clone(), requirement, schedule_id).await;
        }
    }
}

fn start_schedule_runner() {
    let runtime = match crate::cron_dispatch::load_cron_runtime() {
        Ok(runtime) => runtime,
        Err(e) => {
            tracing::warn!(error = %e, "Failed to load CRON_TYPE config; falling back to Inner scheduler");
            crate::cron_dispatch::inner_runtime()
        }
    };
    tracing::info!(
        cron_type = runtime.cron_type.as_str(),
        config_path = %runtime.config_path.display(),
        "Loaded cron scheduler runtime"
    );
    let runtime = Arc::new(runtime);
    let _ = CRON_RUNTIME.set(runtime.clone());

    tokio::spawn(async move {
        loop {
            run_schedule_tick(runtime.clone()).await;
            sleep(Duration::from_secs(30)).await;
        }
    });
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
    let Some(db) = WORKFLOW_DB.get() else {
        res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
        res.render(Json(serde_json::json!({"error": "DB not initialized"})));
        return;
    };

    match db.list_tasks(30).await {
        Ok(rows) => {
            let tasks = rows
                .into_iter()
                .filter_map(|row| serde_json::from_str::<serde_json::Value>(&row).ok())
                .collect::<Vec<_>>();
            res.render(Json(serde_json::json!({ "tasks": tasks })));
        }
        Err(e) => {
            res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
            res.render(Json(serde_json::json!({"error": e.to_string()})));
        }
    }
}

#[handler]
async fn create_task(req: &mut Request, res: &mut Response) {
    tracing::debug!("Step 1: Start create_task API");
    let body = req.parse_json::<serde_json::Value>().await;
    match body {
        Ok(b) => {
            let mut requirement = b
                .get("requirement")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string();
            tracing::debug!(requirement = ?requirement, "Step 2: Parsed request body successfully");

            if let Some(files) = b.get("files").and_then(|v| v.as_array()) {
                for file in files {
                    let name = file
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown_file");
                    let content = file.get("content").and_then(|v| v.as_str()).unwrap_or("");

                    if !content.is_empty() {
                        requirement
                            .push_str(&format!("\n\n[Attached File: {}]\n{}", name, content));
                    }
                }
            }

            if requirement.is_empty() {
                tracing::debug!("Step 3: Requirement is empty, returning BAD_REQUEST");
                res.status_code(StatusCode::BAD_REQUEST);
                res.render(Json(serde_json::json!({"error": "requirement 不可為空"})));
                return;
            }

            let has_attached_files = b
                .get("files")
                .and_then(|value| value.as_array())
                .map(|files| {
                    files.iter().any(|file| {
                        file.get("content")
                            .and_then(|value| value.as_str())
                            .map(|content| !content.trim().is_empty())
                            .unwrap_or(false)
                    })
                })
                .unwrap_or(false);

            if !has_attached_files {
                if let Some(parsed_schedule) = parse_schedule_request(&requirement) {
                    let task_id = uuid::Uuid::new_v4().to_string();
                    let schedule_id = uuid::Uuid::new_v4().to_string();
                    let schedule_payload = serde_json::json!({
                        "name": parsed_schedule.requirement.chars().take(40).collect::<String>(),
                        "requirement": parsed_schedule.requirement,
                        "enabled": true,
                        "scheduleKind": "fixed",
                        "fixedFrequency": parsed_schedule.fixed_frequency,
                        "fixedTime": parsed_schedule.fixed_time,
                        "fixedDayOfWeek": 1,
                        "fixedDayOfMonth": 1,
                        "sendAt": "",
                        "continuous": false,
                        "intervalValue": 1,
                        "intervalUnit": "minutes",
                        "repeatCount": 2,
                        "cronExpression": ""
                    });

                    match save_schedule_payload(schedule_id.clone(), schedule_payload).await {
                        Ok(saved_schedule) => {
                            let tx = get_broadcaster();
                            let now = chrono::Utc::now().to_rfc3339();
                            let result = format!(
                                "已新增固定排程：每日 {} 執行「{}」。排程已寫入「排程設定」。",
                                saved_schedule["fixedTime"].as_str().unwrap_or("10:00"),
                                saved_schedule["requirement"].as_str().unwrap_or("")
                            );

                            let _ = tx.send(proto::ServerMessage {
                                payload: Some(proto::server_message::Payload::TaskCreated(
                                    proto::TaskCreatedEvent {
                                        task_id: task_id.clone(),
                                        status: "queued".to_string(),
                                    },
                                )),
                            });
                            let _ = tx.send(proto::ServerMessage {
                                payload: Some(proto::server_message::Payload::TaskStatus(
                                    proto::TaskStatusEvent {
                                        task_id: task_id.clone(),
                                        status: "running".to_string(),
                                    },
                                )),
                            });
                            let _ = tx.send(proto::ServerMessage {
                                payload: Some(proto::server_message::Payload::TaskLog(
                                    proto::TaskLogEvent {
                                        task_id: task_id.clone(),
                                        message: "已辨識為 EIVA 固定排程需求，略過 Codex CLI。"
                                            .to_string(),
                                        at: now.clone(),
                                    },
                                )),
                            });
                            let _ = tx.send(proto::ServerMessage {
                                payload: Some(proto::server_message::Payload::TaskCompleted(
                                    proto::TaskCompletedEvent {
                                        task_id: task_id.clone(),
                                        result,
                                        at: now,
                                    },
                                )),
                            });

                            res.status_code(StatusCode::ACCEPTED);
                            res.render(Json(serde_json::json!({
                                "taskId": task_id,
                                "status": "queued",
                                "schedule": saved_schedule
                            })));
                            return;
                        }
                        Err(e) => {
                            tracing::error!("Failed to save natural language schedule: {}", e);
                            res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                            res.render(Json(serde_json::json!({"error": e.to_string()})));
                            return;
                        }
                    }
                }
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
                        get_client_sessions()
                            .write()
                            .await
                            .insert(task_id.clone(), client_arc.clone());

                        let task_id_clone = task_id.clone();
                        tokio::spawn(async move {
                            let tx = get_broadcaster();
                            let _ = tx.send(proto::ServerMessage {
                                payload: Some(proto::server_message::Payload::TaskCreated(
                                    proto::TaskCreatedEvent {
                                        task_id: task_id_clone.clone(),
                                        status: "queued".to_string(),
                                    },
                                )),
                            });
                            let _ = tx.send(proto::ServerMessage {
                                payload: Some(proto::server_message::Payload::TaskStatus(
                                    proto::TaskStatusEvent {
                                        task_id: task_id_clone.clone(),
                                        status: "running".to_string(),
                                    },
                                )),
                            });

                            let mut full_result = String::new();
                            while let Some(event) = client_arc.recv().await {
                                match event {
                                    eiva_core::gateway::GatewayEvent::Chunk { delta } => {
                                        full_result.push_str(&delta);
                                        if !delta.trim().is_empty() {
                                            let _ = tx.send(proto::ServerMessage {
                                                payload: Some(
                                                    proto::server_message::Payload::TaskLog(
                                                        proto::TaskLogEvent {
                                                            task_id: task_id_clone.clone(),
                                                            message: delta,
                                                            at: chrono::Utc::now().to_rfc3339(),
                                                        },
                                                    ),
                                                ),
                                            });
                                        }
                                    }
                                    eiva_core::gateway::GatewayEvent::ResponseDone => {
                                        let _ = tx.send(proto::ServerMessage {
                                            payload: Some(
                                                proto::server_message::Payload::TaskCompleted(
                                                    proto::TaskCompletedEvent {
                                                        task_id: task_id_clone.clone(),
                                                        result: full_result.clone(),
                                                        at: chrono::Utc::now().to_rfc3339(),
                                                    },
                                                ),
                                            ),
                                        });
                                        break;
                                    }
                                    eiva_core::gateway::GatewayEvent::ToolOutput {
                                        chunk, ..
                                    } => {
                                        let _ = tx.send(proto::ServerMessage {
                                            payload: Some(proto::server_message::Payload::TaskLog(
                                                proto::TaskLogEvent {
                                                    task_id: task_id_clone.clone(),
                                                    message: chunk,
                                                    at: chrono::Utc::now().to_rfc3339(),
                                                },
                                            )),
                                        });
                                    }
                                    eiva_core::gateway::GatewayEvent::AuthFailed {
                                        message,
                                        ..
                                    }
                                    | eiva_core::gateway::GatewayEvent::ModelError { message }
                                    | eiva_core::gateway::GatewayEvent::Error { message } => {
                                        let _ = tx.send(proto::ServerMessage {
                                            payload: Some(
                                                proto::server_message::Payload::TaskFailed(
                                                    proto::TaskFailedEvent {
                                                        task_id: task_id_clone.clone(),
                                                        error: message,
                                                        at: chrono::Utc::now().to_rfc3339(),
                                                    },
                                                ),
                                            ),
                                        });
                                        break; // End the task loop on error
                                    }
                                    eiva_core::gateway::GatewayEvent::StreamStart
                                    | eiva_core::gateway::GatewayEvent::ThinkingStart => {
                                        let _ = tx.send(proto::ServerMessage {
                                            payload: Some(
                                                proto::server_message::Payload::TaskStatus(
                                                    proto::TaskStatusEvent {
                                                        task_id: task_id_clone.clone(),
                                                        status: "running".to_string(),
                                                    },
                                                ),
                                            ),
                                        });
                                    }
                                    eiva_core::gateway::GatewayEvent::ToolCall { name, .. } => {
                                        let _ = tx.send(proto::ServerMessage {
                                            payload: Some(proto::server_message::Payload::TaskLog(
                                                proto::TaskLogEvent {
                                                    task_id: task_id_clone.clone(),
                                                    message: format!("Tool call: {}", name),
                                                    at: chrono::Utc::now().to_rfc3339(),
                                                },
                                            )),
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
        "message": message.unwrap_or_else(|| match status {
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
async fn create_openclaw_task(req: &mut Request, res: &mut Response) {
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

    let task_id = dispatch_prompt_task(requirement, None).await;
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
async fn get_openclaw_task(req: &mut Request, res: &mut Response) {
    if !authorize_openclaw_request(req, res) {
        return;
    }

    let task_id = req.param::<String>("taskId").unwrap_or_default();
    let Some(db) = WORKFLOW_DB.get() else {
        res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
        res.render(Json(serde_json::json!({"error": "DB not initialized"})));
        return;
    };

    match db.get_task(task_id).await {
        Ok(Some(task)) => match serde_json::from_str::<serde_json::Value>(&task) {
            Ok(task) => res.render(Json(format_task_for_openclaw(&task, None))),
            Err(e) => {
                res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                res.render(Json(serde_json::json!({"error": e.to_string()})));
            }
        },
        Ok(None) => {
            res.status_code(StatusCode::NOT_FOUND);
            res.render(Json(serde_json::json!({"error": "找不到任務"})));
        }
        Err(e) => {
            res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
            res.render(Json(serde_json::json!({"error": e.to_string()})));
        }
    }
}

#[handler]
async fn stop_openclaw_task(req: &mut Request, res: &mut Response) {
    if !authorize_openclaw_request(req, res) {
        return;
    }

    let task_id = req.param::<String>("taskId").unwrap_or_default();
    let client_opt = get_client_sessions().read().await.get(&task_id).cloned();
    match client_opt {
        Some(client) => {
            if let Err(e) = client.send(GatewayCommand::Cancel).await {
                res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                res.render(Json(serde_json::json!({"error": e.to_string()})));
                return;
            }
            res.status_code(StatusCode::ACCEPTED);
            res.render(Json(serde_json::json!({
                "taskId": task_id,
                "status": "stopping",
                "message": format!("已要求停止任務：{}", task_id),
                "logs": [],
                "result": "",
                "error": "",
                "createdAt": "",
                "startedAt": "",
                "completedAt": ""
            })));
        }
        None => {
            res.status_code(StatusCode::NOT_FOUND);
            res.render(Json(serde_json::json!({"error": "找不到任務或任務已結束"})));
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
            res.render(Json(
                serde_json::json!({"error": "Task not found or already finished"}),
            ));
        }
    }
}

#[handler]
async fn get_task(req: &mut Request, res: &mut Response) {
    let task_id = req.param::<String>("taskId").unwrap_or_default();
    tracing::debug!(task_id = ?task_id, "Step 1: Start get_task API");
    let Some(db) = WORKFLOW_DB.get() else {
        res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
        res.render(Json(serde_json::json!({"error": "DB not initialized"})));
        return;
    };

    match db.get_task(task_id).await {
        Ok(Some(task)) => match serde_json::from_str::<serde_json::Value>(&task) {
            Ok(task) => res.render(Json(task)),
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
async fn list_schedules(res: &mut Response) {
    tracing::debug!("Step 1: Start list_schedules API");
    let Some(db) = WORKFLOW_DB.get() else {
        res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
        res.render(Json(serde_json::json!({"error": "DB not initialized"})));
        return;
    };

    match db.list_schedules().await {
        Ok(rows) => {
            let schedules = rows
                .into_iter()
                .filter_map(|row| serde_json::from_str::<serde_json::Value>(&row).ok())
                .collect::<Vec<_>>();
            res.render(Json(serde_json::json!({ "schedules": schedules })));
        }
        Err(e) => {
            res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
            res.render(Json(serde_json::json!({"error": e.to_string()})));
        }
    }
}

#[handler]
async fn create_schedule(req: &mut Request, res: &mut Response) {
    tracing::debug!("Step 1: Start create_schedule API");
    let body = match req.parse_json::<serde_json::Value>().await {
        Ok(body) => body,
        Err(e) => {
            res.status_code(StatusCode::BAD_REQUEST);
            res.render(Json(serde_json::json!({"error": e.to_string()})));
            return;
        }
    };

    if body
        .get("requirement")
        .and_then(|value| value.as_str())
        .unwrap_or_default()
        .trim()
        .is_empty()
    {
        res.status_code(StatusCode::BAD_REQUEST);
        res.render(Json(serde_json::json!({"error": "requirement 不可為空"})));
        return;
    }

    match save_schedule_payload(uuid::Uuid::new_v4().to_string(), body).await {
        Ok(schedule) => {
            res.status_code(StatusCode::CREATED);
            res.render(Json(schedule));
        }
        Err(e) => {
            res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
            res.render(Json(serde_json::json!({"error": e.to_string()})));
        }
    }
}

#[handler]
async fn update_schedule(req: &mut Request, res: &mut Response) {
    let id = req.param::<String>("id").unwrap_or_default();
    tracing::debug!(id = ?id, "Step 1: Start update_schedule API");
    let body = match req.parse_json::<serde_json::Value>().await {
        Ok(body) => body,
        Err(e) => {
            res.status_code(StatusCode::BAD_REQUEST);
            res.render(Json(serde_json::json!({"error": e.to_string()})));
            return;
        }
    };
    match save_schedule_payload(id, body).await {
        Ok(schedule) => res.render(Json(schedule)),
        Err(e) => {
            res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
            res.render(Json(serde_json::json!({"error": e.to_string()})));
        }
    }
}

#[handler]
async fn delete_schedule(req: &mut Request, res: &mut Response) {
    let id = req.param::<String>("id").unwrap_or_default();
    tracing::debug!(id = ?id, "Step 1: Start delete_schedule API");
    let Some(db) = WORKFLOW_DB.get() else {
        res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
        res.render(Json(serde_json::json!({"error": "DB not initialized"})));
        return;
    };

    match db.delete_schedule(id).await {
        Ok(()) => {
            res.status_code(StatusCode::NO_CONTENT);
            tracing::debug!("Step 2: Deleted schedule, returning NO_CONTENT");
        }
        Err(e) => {
            res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
            res.render(Json(serde_json::json!({"error": e.to_string()})));
        }
    }
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
            Ok(Some(data)) => {
                let parsed_data: Result<eiva_core::workflow::models::WorkflowData, _> =
                    serde_json::from_str(&data);
                match parsed_data {
                    Ok(workflow_data) => {
                        let runner =
                            eiva_core::workflow::runner::WorkflowRunner::new(workflow_data);
                        let ctx = eiva_core::workflow::context::WorkflowContext::new();
                        let task_id = uuid::Uuid::new_v4().to_string();

                        // Broadcast TaskCreated
                        let tx = get_broadcaster();
                        let _ = tx.send(proto::ServerMessage {
                            payload: Some(proto::server_message::Payload::TaskCreated(
                                proto::TaskCreatedEvent {
                                    task_id: task_id.clone(),
                                    status: "queued".to_string(),
                                },
                            )),
                        });

                        let task_id_for_spawn = task_id.clone();
                        tokio::spawn(async move {
                            match runner.run(ctx).await {
                                Ok(_) => {
                                    let _ = tx.send(proto::ServerMessage {
                                        payload: Some(
                                            proto::server_message::Payload::TaskCompleted(
                                                proto::TaskCompletedEvent {
                                                    task_id: task_id_for_spawn.clone(),
                                                    result: "Workflow finished successfully"
                                                        .to_string(),
                                                    at: chrono::Utc::now().to_rfc3339(),
                                                },
                                            ),
                                        ),
                                    });
                                }
                                Err(e) => {
                                    let _ = tx.send(proto::ServerMessage {
                                        payload: Some(proto::server_message::Payload::TaskFailed(
                                            proto::TaskFailedEvent {
                                                task_id: task_id_for_spawn.clone(),
                                                error: format!("Workflow failed: {}", e),
                                                at: chrono::Utc::now().to_rfc3339(),
                                            },
                                        )),
                                    });
                                }
                            }
                        });

                        res.render(Json(serde_json::json!({
                            "ok": true,
                            "taskId": task_id,
                            "message": format!("Workflow {} is now running in background.", id)
                        })));
                    }
                    Err(e) => {
                        res.status_code(StatusCode::BAD_REQUEST);
                        res.render(Json(
                            serde_json::json!({"error": format!("Invalid workflow data: {}", e)}),
                        ));
                    }
                }
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
                let parsed: Vec<serde_json::Value> = list
                    .into_iter()
                    .filter_map(|s| serde_json::from_str(&s).ok())
                    .collect();
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
                res.render(Json(
                    serde_json::json!({"status": "error", "error": "Server not found"}),
                ));
                return;
            }
            Err(e) => {
                res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                res.render(Json(
                    serde_json::json!({"status": "error", "error": e.to_string()}),
                ));
                return;
            }
        }
    } else {
        res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
        res.render(Json(
            serde_json::json!({"status": "error", "error": "Database not initialized"}),
        ));
        return;
    };
    // Parse server config from JSON
    let v: serde_json::Value = match serde_json::from_str(&server_json) {
        Ok(v) => v,
        Err(e) => {
            res.render(Json(
                serde_json::json!({"status": "error", "error": format!("JSON parse error: {}", e)}),
            ));
            return;
        }
    };
    let command = v["command"].as_str().unwrap_or("").to_string();
    if command.is_empty() {
        res.render(Json(
            serde_json::json!({"status": "error", "error": "Command is empty"}),
        ));
        return;
    }
    // Attempt connection via McpManager
    #[cfg(feature = "mcp")]
    {
        let server_name = v["name"].as_str().unwrap_or(&id).to_string();
        let args: Vec<String> = v["args"]
            .as_array()
            .map(|a| {
                a.iter()
                    .filter_map(|x| x.as_str().map(String::from))
                    .collect()
            })
            .unwrap_or_default();
        let env: std::collections::HashMap<String, String> = v["env"]
            .as_object()
            .map(|o| {
                o.iter()
                    .filter_map(|(k, val)| val.as_str().map(|v| (k.clone(), v.to_string())))
                    .collect()
            })
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
                    let tools = mgr
                        .list_tools(&server_name)
                        .await
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
            res.render(Json(
                serde_json::json!({"status": "error", "error": "MCP manager not initialized"}),
            ));
        }
    }
    #[cfg(not(feature = "mcp"))]
    {
        res.render(Json(
            serde_json::json!({"status": "error", "error": "MCP feature not enabled"}),
        ));
    }
}

// --- AI Skill Handlers ---
#[handler]
async fn list_skills(res: &mut Response) {
    if let Some(db) = WORKFLOW_DB.get() {
        match db.list_skills().await {
            Ok(list) => {
                let parsed: Vec<serde_json::Value> = list
                    .into_iter()
                    .filter_map(|s| serde_json::from_str(&s).ok())
                    .collect();
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
                .save_skill(
                    id.clone(),
                    name,
                    description,
                    instructions,
                    enabled,
                    linked_secrets,
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
                res.render(Json(
                    serde_json::json!({"status": "error", "error": "Skill not found"}),
                ));
                return;
            }
            Err(e) => {
                res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
                res.render(Json(
                    serde_json::json!({"status": "error", "error": e.to_string()}),
                ));
                return;
            }
        }
    } else {
        res.status_code(StatusCode::INTERNAL_SERVER_ERROR);
        res.render(Json(
            serde_json::json!({"status": "error", "error": "Database not initialized"}),
        ));
        return;
    };
    let v: serde_json::Value = match serde_json::from_str(&skill_json) {
        Ok(v) => v,
        Err(e) => {
            res.render(Json(
                serde_json::json!({"status": "error", "error": format!("JSON parse error: {}", e)}),
            ));
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
    } else if !name
        .chars()
        .all(|c| c.is_alphanumeric() || c == '-' || c == '_')
    {
        warnings.push(
            "Skill name contains non-alphanumeric characters (kebab-case recommended)".into(),
        );
    }
    if instructions.is_empty() {
        errors.push("Instructions (prompt) are empty".into());
    } else {
        let line_count = instructions.lines().count();
        if line_count < 3 {
            warnings.push(format!(
                "Instructions are very short ({} lines) — consider adding more detail",
                line_count
            ));
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

pub async fn run_server(
    task_mgr: Arc<TaskManager>,
    workflow_db: crate::db::WorkflowDb,
    port: u16,
) -> anyhow::Result<()> {
    // Initialize global state
    let _ = TASK_MGR.set(task_mgr);
    let _ = WORKFLOW_DB.set(workflow_db);
    start_schedule_runner();

    let cors = Cors::new()
        .allow_origin("*")
        .allow_methods(vec![
            Method::GET,
            Method::POST,
            Method::DELETE,
            Method::PUT,
            Method::PATCH,
            Method::OPTIONS,
        ])
        .allow_headers(vec!["content-type", "authorization", "*"])
        .into_handler();

    let router = Router::new()
        .hoop(salvo::logging::Logger::new())
        .hoop(cors)
        .push(Router::with_path("").get(redirect_home))
        .push(Router::with_path("index").get(redirect_home))
        .push(Router::with_path("index.html").get(redirect_home))
        .push(
            Router::with_path("api/openclaw/tasks")
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
        .push(
            Router::with_path("eiva/backend/api/ver-0.95")
                .push(Router::with_path("health").get(health))
                .push(
                    Router::with_path("tasks")
                        .get(list_tasks)
                        .post(create_task)
                        .options(handle_options)
                        .push(
                            Router::with_path("<taskId>").get(get_task).push(
                                Router::with_path("stop")
                                    .post(stop_task)
                                    .options(handle_options),
                            ),
                        ),
                )
                .push(
                    Router::with_path("schedules")
                        .get(list_schedules)
                        .post(create_schedule)
                        .options(handle_options)
                        .push(
                            Router::with_path("<id>")
                                .patch(update_schedule)
                                .delete(delete_schedule)
                                .options(handle_options),
                        ),
                )
                .push(
                    Router::with_path("openclaw/tasks")
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
                .push(Router::with_path("workflows").get(list_workflows_handler))
                .push(Router::with_path("ws").get(ws_handler))
                .push(
                    Router::with_path("workflow/<id>")
                        .get(get_workflow)
                        .post(save_workflow)
                        .delete(delete_workflow)
                        .options(handle_options)
                        .push(Router::with_path("run").get(run_workflow)),
                )
                .push(Router::with_path("mcp-servers").get(list_mcp_servers))
                .push(
                    Router::with_path("mcp-server/<id>")
                        .get(get_mcp_server)
                        .post(save_mcp_server)
                        .delete(delete_mcp_server)
                        .options(handle_options),
                )
                .push(
                    Router::with_path("mcp-server/<id>/test")
                        .post(test_mcp_server)
                        .options(handle_options),
                )
                .push(Router::with_path("skills").get(list_skills))
                .push(
                    Router::with_path("skill/<id>")
                        .get(get_skill)
                        .post(save_skill)
                        .delete(delete_skill)
                        .options(handle_options),
                )
                .push(
                    Router::with_path("skill/<id>/test")
                        .post(test_skill)
                        .options(handle_options),
                )
                .push(
                    Router::with_path("ai-model")
                        .get(list_ai_models)
                        .options(handle_options),
                )
                .push(
                    Router::with_path("ai-model/<id>")
                        .get(list_ai_models) // GET single ai model (reuse list or we didn't implement GET single)
                        .post(save_ai_model)
                        .delete(delete_ai_model)
                        .options(handle_options),
                )
                .push(
                    Router::with_path("workspace")
                        .push(Router::with_path("tree").get(crate::workspace::get_workspace_tree))
                        .push(Router::with_path("list").get(crate::workspace::list_workspace))
                        .push(
                            Router::with_path("file")
                                .get(crate::workspace::download_workspace_file)
                                .post(crate::workspace::upload_workspace_file)
                                .options(handle_options),
                        )
                        .push(
                            Router::with_path("dir")
                                .post(crate::workspace::create_workspace_dir)
                                .options(handle_options),
                        )
                        .push(
                            Router::with_path("delete")
                                .post(crate::workspace::delete_workspace_entry)
                                .options(handle_options),
                        )
                        .push(
                            Router::with_path("rename")
                                .post(crate::workspace::rename_workspace_entry)
                                .options(handle_options),
                        ),
                ),
        )
        .push(
            Router::with_path("eiva/frontend/view/<**path>").get(
                salvo::serve_static::StaticDir::new(vec!["assets/web", "../assets/web"])
                    .defaults("index.html"),
            ),
        )
        .push(Router::with_path("eiva/frontend/static/<**path>").get(
            salvo::serve_static::StaticDir::new(vec!["assets/static", "../assets/static"]),
        ));

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
        let id = body
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let provider = body
            .get("provider")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let name = body
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let api_key = body
            .get("api_key")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let base_url = body
            .get("base_url")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let enabled = body
            .get("enabled")
            .and_then(|v| v.as_bool())
            .unwrap_or(true);
        let extra_params = body
            .get("extra_params")
            .map(|v| v.to_string())
            .unwrap_or_else(|| "{}".to_string());

        if id.is_empty() {
            res.status_code(StatusCode::BAD_REQUEST);
            res.render(Json(serde_json::json!({"error": "Missing id"})));
            return;
        }

        if let Some(db) = WORKFLOW_DB.get() {
            match db
                .save_ai_model(
                    id.clone(),
                    provider,
                    name,
                    api_key,
                    base_url,
                    enabled,
                    extra_params,
                )
                .await
            {
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
