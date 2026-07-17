use std::collections::HashMap;
use serde_json::Value;

use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
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

impl rust_langgraph::prelude::State for WorkflowContext {
    fn merge(&mut self, other: Self) -> std::result::Result<(), rust_langgraph::prelude::Error> {
        self.payload.extend(other.payload);
        self.global_variables.extend(other.global_variables);
        Ok(())
    }
}
