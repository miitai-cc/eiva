use std::collections::HashMap;
use tracing::{debug, error, info};
use rust_langgraph::prelude::*;

use super::context::WorkflowContext;
use super::models::{WorkflowData, Node};
use super::nodes::{WorkflowNode, StartNode, EndNode, NoOpNode};

// A struct to implement the `rust_langgraph::Node` trait
struct NodeWrapper {
    node_data: Node,
}

#[async_trait::async_trait]
impl rust_langgraph::prelude::Node<WorkflowContext> for NodeWrapper {
    async fn invoke(&self, mut state: WorkflowContext, _config: &Config) -> Result<WorkflowContext> {
        let node_id = &self.node_data.id;
        debug!("Executing workflow node: {} (type: {})", node_id, self.node_data.node_type);
        
        let executor = WorkflowRunner::get_executor(&self.node_data.node_type);
        match executor.execute(&self.node_data, &mut state).await {
            Ok(_) => {
                debug!("Node {} execution finished successfully", node_id);
                Ok(state)
            }
            Err(e) => {
                error!("Error executing node {}: {:?}", node_id, e);
                // Log error to state and continue, as creating a specific rust_langgraph::Error variant is tricky without knowing it
                state.payload.insert(format!("{}_error", node_id), serde_json::Value::String(e.to_string()));
                Ok(state)
            }
        }
    }
}

pub struct WorkflowRunner {
    pub data: WorkflowData,
}

impl WorkflowRunner {
    pub fn new(data: WorkflowData) -> Self {
        Self { data }
    }

    pub async fn run(self, ctx: WorkflowContext) -> anyhow::Result<()> {
        info!("Starting workflow DAG configuration from settings");
        
        let mut graph = StateGraph::<WorkflowContext>::new();
        
        let mut start_node_id = None;
        let mut edges_by_source: HashMap<String, Vec<&super::models::Edge>> = HashMap::new();
        for edge in &self.data.edges {
            edges_by_source.entry(edge.source.clone()).or_default().push(edge);
        }

        // Add all nodes
        for node in &self.data.nodes {
            if node.node_type == "startNode" {
                start_node_id = Some(node.id.clone());
            }
            let wrapper = NodeWrapper { node_data: node.clone() };
            graph.add_node(&node.id, wrapper);
        }

        // Add edges
        for node in &self.data.nodes {
            if let Some(out_edges) = edges_by_source.get(&node.id) {
                if node.node_type == "conditionNode" {
                    // Conditional edge router
                    let edges_clone = out_edges.iter().map(|e| (*e).clone()).collect::<Vec<_>>();
                    let node_id = node.id.clone();
                    graph.add_conditional_edges(&node.id, move |state: &WorkflowContext| {
                        let condition_res = state.payload.get(&format!("{}_condition_result", node_id))
                            .and_then(|v| v.as_bool())
                            .unwrap_or(false);
                            
                        let target_handle = if condition_res { "source-right" } else { "source-bottom" };
                        
                        let target = edges_clone.iter()
                            .find(|e| e.source_handle.as_deref() == Some(target_handle))
                            .map(|e| e.target.as_str())
                            .unwrap_or("__end__")
                            .to_string();
                            
                        let branch_result = if target == "__end__" {
                            rust_langgraph::pregel::BranchResult::End
                        } else {
                            rust_langgraph::pregel::BranchResult::Single(target)
                        };
                            
                        async move { Ok(branch_result) }
                    });
                } else if out_edges.len() == 1 {
                    graph.add_edge(&node.id, &out_edges[0].target);
                } else if out_edges.len() > 1 {
                    tracing::warn!("Node {} has multiple outbound edges but is not a condition node. Using the first one.", node.id);
                    graph.add_edge(&node.id, &out_edges[0].target);
                }
            }
        }
        
        let start_id = match start_node_id {
            Some(id) => id,
            None => return Err(anyhow::anyhow!("No startNode found in workflow data")),
        };
        
        // Define entry point
        graph.add_edge("__start__", &start_id); 

        info!("Compiling workflow graph");
        let mut compiled = match graph.compile(None) {
            Ok(c) => c,
            Err(e) => return Err(anyhow::anyhow!("Failed to compile graph: {:?}", e)),
        };
        
        info!("Executing compiled workflow graph");
        let result = compiled.invoke(ctx, Config::default()).await;
        
        match result {
            Ok(_) => {
                info!("Workflow execution finished successfully");
                Ok(())
            }
            Err(e) => {
                error!("Workflow execution failed: {:?}", e);
                Err(anyhow::anyhow!("Workflow execution failed: {:?}", e))
            }
        }
    }

    fn get_executor(node_type: &str) -> Box<dyn WorkflowNode> {
        match node_type {
            "startNode" => Box::new(StartNode),
            "endNode" => Box::new(EndNode),
            "noteNode" | "swimlaneNode" => Box::new(NoOpNode),
            "variableNode" => Box::new(super::nodes::VariableNode),
            "agentNode" => Box::new(super::nodes::AgentNode),
            "calculateNode" => Box::new(super::nodes::CalculateNode),
            "conditionNode" => Box::new(super::nodes::ConditionNode),
            "toolNode" => Box::new(super::nodes::ToolNode),
            "mcpNode" => Box::new(super::nodes::McpNode),
            "skillNode" => Box::new(super::nodes::SkillNode),
            _ => {
                tracing::warn!("Unknown node type: {}, using NoOpNode", node_type);
                Box::new(NoOpNode)
            }
        }
    }
}
