pub fn generate_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

pub fn current_timestamp() -> i64 {
    chrono::Utc::now().timestamp()
}
