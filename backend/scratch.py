import re

with open("/Volumes/workspace/ai/agent/eiva/backend/crates/eiva-gateway/src/api.rs", "r") as f:
    content = f.read()

# Define the regex to find the blocks to remove
to_remove = [
    r"fn authorize_openclaw_request[\s\S]*?^}\n",
    r"fn format_task_for_openclaw[\s\S]*?^}\n",
    r"pub struct InjectCodexContext[\s\S]*?^}\n", # wait, this was in lib.rs, not api.rs
    r"async fn create_openclaw_task[\s\S]*?^}\n",
    r"async fn get_openclaw_task[\s\S]*?^}\n",
    r"async fn stop_openclaw_task[\s\S]*?^}\n",
]

for pat in to_remove:
    # use re.MULTILINE
    content = re.sub(r"#\[handler\]\n" + pat, "", content, flags=re.MULTILINE)
    content = re.sub(pat, "", content, flags=re.MULTILINE)

# insert GatewayCodexContext before run_server
context_code = """
pub struct GatewayCodexContext;

#[async_trait::async_trait]
impl eiva_be_codex::CodexApiContext for GatewayCodexContext {
    async fn dispatch_prompt_task(&self, requirement: String) -> String {
        dispatch_prompt_task(requirement, None).await
    }
    async fn get_task(&self, task_id: &str) -> anyhow::Result<Option<String>> {
        if let Some(db) = WORKFLOW_DB.get() {
            let task = db.get_task(task_id.to_string()).await?;
            Ok(task)
        } else {
            anyhow::bail!("DB not initialized")
        }
    }
    async fn stop_task(&self, task_id: &str) -> anyhow::Result<()> {
        let client_opt = get_client_sessions().read().await.get(task_id).cloned();
        if let Some(client) = client_opt {
            client.send(eiva_core::gateway::GatewayCommand::Cancel).await?;
            Ok(())
        } else {
            anyhow::bail!("找不到任務或任務已結束")
        }
    }
}

"""
content = content.replace("pub async fn run_server(", context_code + "pub async fn run_server(")

# replace the router mounting
old_mount_1 = """        .push(
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
        )"""
new_mount_1 = """        .push(
            Router::with_path("api/openclaw")
                .push(eiva_be_codex::build_codex_router(Arc::new(GatewayCodexContext)))
        )"""
content = content.replace(old_mount_1, new_mount_1)

old_mount_2 = """                .push(
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
                )"""
new_mount_2 = """                .push(
                    Router::with_path("openclaw")
                        .push(eiva_be_codex::build_codex_router(Arc::new(GatewayCodexContext)))
                )"""
content = content.replace(old_mount_2, new_mount_2)

with open("/Volumes/workspace/ai/agent/eiva/backend/crates/eiva-gateway/src/api.rs", "w") as f:
    f.write(content)

