use anyhow::{Context, anyhow};
use serde_json::Value;
use std::path::{Path, PathBuf};
use tokio::io::AsyncWriteExt;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CronType {
    Inner,
    Openclaw,
    Hermess,
    Os,
}

#[derive(Debug, Clone)]
pub struct CronRuntime {
    pub cron_type: CronType,
    pub config_path: PathBuf,
    pub config: Value,
}

impl CronType {
    pub fn from_env_value(value: &str) -> anyhow::Result<Self> {
        match value.trim().to_ascii_lowercase().as_str() {
            "" | "inner" => Ok(Self::Inner),
            "openclaw" => Ok(Self::Openclaw),
            "hermess" => Ok(Self::Hermess),
            "os" => Ok(Self::Os),
            other => Err(anyhow!(
                "Invalid CRON_TYPE '{other}'. Valid values: Inner, Openclaw, hermess, OS"
            )),
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Inner => "Inner",
            Self::Openclaw => "Openclaw",
            Self::Hermess => "hermess",
            Self::Os => "OS",
        }
    }

    fn config_filename(self) -> &'static str {
        match self {
            Self::Inner => "inner.json",
            Self::Openclaw => "openclaw.json",
            Self::Hermess => "hermess.json",
            Self::Os => "os.json",
        }
    }
}

pub fn load_cron_runtime() -> anyhow::Result<CronRuntime> {
    let cron_type = CronType::from_env_value(
        &std::env::var("CRON_TYPE").unwrap_or_else(|_| "Inner".to_string()),
    )?;
    let config_path = resolve_config_path(cron_type)?;
    ensure_config_file(cron_type, &config_path)?;
    let config_text = std::fs::read_to_string(&config_path)
        .with_context(|| format!("Failed to read cron config: {}", config_path.display()))?;
    let config = serde_json::from_str::<Value>(&config_text).with_context(|| {
        format!(
            "Failed to parse cron config JSON: {}",
            config_path.display()
        )
    })?;

    Ok(CronRuntime {
        cron_type,
        config_path,
        config,
    })
}

pub fn inner_runtime() -> CronRuntime {
    CronRuntime {
        cron_type: CronType::Inner,
        config_path: PathBuf::from("config/cron/inner.json"),
        config: default_config(CronType::Inner),
    }
}

pub async fn dispatch_external(
    runtime: &CronRuntime,
    task_id: &str,
    requirement: &str,
    source_schedule_id: &str,
    created_at: &str,
) -> anyhow::Result<String> {
    if runtime.cron_type == CronType::Inner {
        return Err(anyhow!(
            "Inner cron runtime must be dispatched by the built-in runner"
        ));
    }

    let dispatch = runtime.config.get("dispatch").unwrap_or(&Value::Null);
    let method = dispatch
        .get("method")
        .and_then(Value::as_str)
        .unwrap_or("outbox")
        .trim()
        .to_ascii_lowercase();

    let payload = serde_json::json!({
        "taskId": task_id,
        "requirement": requirement,
        "sourceScheduleId": source_schedule_id,
        "cronType": runtime.cron_type.as_str(),
        "createdAt": created_at,
        "configPath": runtime.config_path.display().to_string(),
    });

    if method == "webhook" {
        if let Some(result) = dispatch_to_webhook(dispatch, &payload).await? {
            return Ok(result);
        }
    }

    let outbox_path = resolve_outbox_path(runtime, dispatch)?;
    append_outbox(&outbox_path, &payload).await?;
    Ok(format!(
        "排程已分派至 {} outbox：{}",
        runtime.cron_type.as_str(),
        outbox_path.display()
    ))
}

fn resolve_config_path(cron_type: CronType) -> anyhow::Result<PathBuf> {
    if let Ok(path) = std::env::var("CRON_CONFIG_PATH") {
        let trimmed = path.trim();
        if !trimmed.is_empty() {
            return Ok(PathBuf::from(trimmed));
        }
    }

    let base_dir = std::env::var("CRON_CONFIG_DIR")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            std::env::current_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join("config")
                .join("cron")
        });

    Ok(base_dir.join(cron_type.config_filename()))
}

fn ensure_config_file(cron_type: CronType, path: &Path) -> anyhow::Result<()> {
    if path.exists() {
        return Ok(());
    }

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .with_context(|| format!("Failed to create cron config dir: {}", parent.display()))?;
    }

    let body = serde_json::to_string_pretty(&default_config(cron_type))?;
    std::fs::write(path, format!("{body}\n"))
        .with_context(|| format!("Failed to write cron config: {}", path.display()))?;
    Ok(())
}

fn default_config(cron_type: CronType) -> Value {
    match cron_type {
        CronType::Inner => serde_json::json!({
            "type": "Inner",
            "description": "Use Eiva's built-in SQLite-backed scheduler.",
            "dispatch": {
                "method": "inner"
            }
        }),
        CronType::Openclaw => serde_json::json!({
            "type": "Openclaw",
            "description": "Delegate due schedules to an OpenClaw-compatible endpoint or outbox.",
            "dispatch": {
                "method": "outbox",
                "webhookUrl": "",
                "bearerTokenEnv": "OPENCLAW_WEB_CODEX_TOKEN",
                "outboxPath": "data/cron-outbox/openclaw.jsonl"
            }
        }),
        CronType::Hermess => serde_json::json!({
            "type": "hermess",
            "description": "Delegate due schedules to a hermess-compatible endpoint or outbox.",
            "dispatch": {
                "method": "outbox",
                "webhookUrl": "",
                "bearerTokenEnv": "HERMESS_CRON_TOKEN",
                "outboxPath": "data/cron-outbox/hermess.jsonl"
            }
        }),
        CronType::Os => serde_json::json!({
            "type": "OS",
            "description": "Prepare due schedules for OS-level scheduler integration.",
            "dispatch": {
                "method": "outbox",
                "osScheduler": "launchd",
                "outboxPath": "data/cron-outbox/os.jsonl"
            }
        }),
    }
}

async fn dispatch_to_webhook(dispatch: &Value, payload: &Value) -> anyhow::Result<Option<String>> {
    let webhook_url = dispatch
        .get("webhookUrl")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim();
    if webhook_url.is_empty() {
        return Ok(None);
    }

    let mut request = reqwest::Client::new().post(webhook_url).json(payload);
    if let Some(token_env) = dispatch.get("bearerTokenEnv").and_then(Value::as_str) {
        if let Ok(token) = std::env::var(token_env) {
            if !token.trim().is_empty() {
                request = request.bearer_auth(token);
            }
        }
    }

    let response = request
        .send()
        .await
        .with_context(|| format!("Failed to dispatch cron webhook: {webhook_url}"))?;
    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    if !status.is_success() {
        return Err(anyhow!(
            "Cron webhook dispatch failed: HTTP {}{}",
            status.as_u16(),
            if body.is_empty() {
                String::new()
            } else {
                format!(" - {body}")
            }
        ));
    }

    Ok(Some(format!(
        "排程已分派至 webhook：{}{}",
        webhook_url,
        if body.is_empty() {
            String::new()
        } else {
            format!("\n{body}")
        }
    )))
}

fn resolve_outbox_path(runtime: &CronRuntime, dispatch: &Value) -> anyhow::Result<PathBuf> {
    let configured = dispatch
        .get("outboxPath")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim();
    let path = if configured.is_empty() {
        PathBuf::from(format!(
            "data/cron-outbox/{}.jsonl",
            runtime.cron_type.as_str().to_ascii_lowercase()
        ))
    } else {
        PathBuf::from(configured)
    };

    if path.is_absolute() {
        Ok(path)
    } else {
        let base = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        Ok(base.join(path))
    }
}

async fn append_outbox(path: &Path, payload: &Value) -> anyhow::Result<()> {
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .with_context(|| format!("Failed to create cron outbox dir: {}", parent.display()))?;
    }

    let mut file = tokio::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .await
        .with_context(|| format!("Failed to open cron outbox: {}", path.display()))?;
    let line = serde_json::to_string(payload)?;
    file.write_all(line.as_bytes()).await?;
    file.write_all(b"\n").await?;
    Ok(())
}
