use std::collections::HashMap;
use tokio::sync::RwLock;

static CLIENT_SESSIONS: std::sync::OnceLock<RwLock<HashMap<String, Arc<GatewayClient>>>> = std::sync::OnceLock::new();

fn get_client_sessions() -> &'static RwLock<HashMap<String, Arc<GatewayClient>>> {
    CLIENT_SESSIONS.get_or_init(|| RwLock::new(HashMap::new()))
}
