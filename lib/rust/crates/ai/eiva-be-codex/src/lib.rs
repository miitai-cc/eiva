use async_trait::async_trait;

#[async_trait]
pub trait CodexApiContext: Send + Sync + 'static {
    async fn dispatch_prompt_task(&self, requirement: String) -> String;
    async fn get_task(&self, task_id: &str) -> anyhow::Result<Option<String>>;
    async fn stop_task(&self, task_id: &str) -> anyhow::Result<()>;
}
