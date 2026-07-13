use std::collections::HashMap;
use tracing::{debug, error, info};

use super::context::WorkflowContext;
use super::models::{WorkflowData, Node};
use super::nodes::{NodeResult, WorkflowNode, StartNode, EndNode, NoOpNode};

pub struct WorkflowRunner {
    pub data: WorkflowData,
}

impl WorkflowRunner {
    pub fn new(data: WorkflowData) -> Self {
        Self { data }
    }

    pub async fn run(self, mut ctx: WorkflowContext) -> anyhow::Result<()> {
        info!("Starting workflow execution");
        
        // Build maps for quick lookup
        let nodes_map: HashMap<String, &Node> = self.data.nodes.iter().map(|n| (n.id.clone(), n)).collect();
        
        // Find start node
        let start_node = self.data.nodes.iter().find(|n| n.node_type == "startNode");
        if start_node.is_none() {
            error!("No startNode found in workflow");
            return Err(anyhow::anyhow!("No startNode found in workflow"));
        }
        
        let mut current_node_id = start_node.unwrap().id.clone();
        
        loop {
            let node = match nodes_map.get(&current_node_id) {
                Some(n) => *n,
                None => {
                    error!("Node {} not found", current_node_id);
                    break;
                }
            };

            debug!("Executing node: {} ({})", node.id, node.node_type);

            // Instantiate correct executor
            let executor = Self::get_executor(&node.node_type);
            
            // Execute node logic
            let result = executor.execute(node, &mut ctx).await;
            
            match result {
                Ok(NodeResult::Next) => {
                    // Find next node connected by an edge
                    let next_edge = self.data.edges.iter().find(|e| e.source == current_node_id);
                    if let Some(edge) = next_edge {
                        current_node_id = edge.target.clone();
                    } else {
                        debug!("No outgoing edges from {}, ending workflow.", current_node_id);
                        break;
                    }
                }
                Ok(NodeResult::Branch(condition_val)) => {
                    // For ConditionNode: if condition_val is true, follow source-right, else source-bottom
                    let target_handle = if condition_val { "source-right" } else { "source-bottom" };
                    let next_edge = self.data.edges.iter().find(|e| {
                        e.source == current_node_id && e.source_handle.as_deref() == Some(target_handle)
                    });
                    
                    if let Some(edge) = next_edge {
                        current_node_id = edge.target.clone();
                    } else {
                        debug!("No matching outgoing edge for branch {} from {}, ending.", condition_val, current_node_id);
                        break;
                    }
                }
                Ok(NodeResult::End) => {
                    debug!("End node reached, workflow completed normally.");
                    break;
                }
                Err(e) => {
                    error!("Error executing node {}: {}", current_node_id, e);
                    break;
                }
            }
        }
        
        info!("Workflow execution finished");
        Ok(())
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
