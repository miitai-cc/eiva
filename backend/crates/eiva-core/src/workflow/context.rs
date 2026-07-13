use std::collections::HashMap;
use serde_json::Value;

#[derive(Debug, Clone, Default)]
pub struct WorkflowContext {
    pub payload: HashMap<String, Value>,
    pub global_variables: HashMap<String, Value>,
}

impl WorkflowContext {
    pub fn new() -> Self {
        Self {
            payload: HashMap::new(),
            global_variables: HashMap::new(),
        }
    }
}
