import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  NodeResizer,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './workflow-style.css';

// --- Custom Nodes ---

const NodeHeader = ({ title, type, typeClass }) => (
  <div className="custom-node-header">
    <span>{title}</span>
    <span className={`custom-node-type ${typeClass}`}>{type}</span>
  </div>
);

const PromptInput = ({ data, onChange }) => (
  <div className="custom-node-body">
    <label>Prompt / 指令</label>
    <textarea
      value={data.prompt || ''}
      onChange={onChange}
      className="nodrag"
      placeholder="輸入提示詞..."
    />
  </div>
);

const StartNode = ({ data, isConnectable }) => {
  return (
    <div className="start-node circle-node">
      <div className="circle-content">{data.label || '啟動'}</div>
      <Handle type="source" position={Position.Right} id="source-right" isConnectable={isConnectable} />
      <Handle type="source" position={Position.Bottom} id="source-bottom" isConnectable={isConnectable} />
    </div>
  );
};

const AgentNode = ({ data, isConnectable }) => {
  return (
    <div className="custom-node">
      <Handle type="target" position={Position.Top} id="target-top" isConnectable={isConnectable} />
      <Handle type="target" position={Position.Left} id="target-left" isConnectable={isConnectable} />
      <NodeHeader title={data.label} type="AGENT" typeClass="node-type-agent" />
      <PromptInput
        data={data}
        onChange={(e) => data.onChange(data.id, 'prompt', e.target.value)}
      />
      <Handle type="source" position={Position.Right} id="source-right" isConnectable={isConnectable} />
      <Handle type="source" position={Position.Bottom} id="source-bottom" isConnectable={isConnectable} />
    </div>
  );
};

const ToolNode = ({ data, isConnectable }) => {
  return (
    <div className="custom-node">
      <Handle type="target" position={Position.Top} id="target-top" isConnectable={isConnectable} />
      <Handle type="target" position={Position.Left} id="target-left" isConnectable={isConnectable} />
      <NodeHeader title={data.label} type="TOOL" typeClass="node-type-tool" />
      <PromptInput
        data={data}
        onChange={(e) => data.onChange(data.id, 'prompt', e.target.value)}
      />
      <Handle type="source" position={Position.Right} id="source-right" isConnectable={isConnectable} />
      <Handle type="source" position={Position.Bottom} id="source-bottom" isConnectable={isConnectable} />
    </div>
  );
};

const EndNode = ({ data, isConnectable }) => {
  return (
    <div className="end-node circle-node">
      <Handle type="target" position={Position.Top} id="target-top" isConnectable={isConnectable} />
      <Handle type="target" position={Position.Left} id="target-left" isConnectable={isConnectable} />
      <div className="circle-content">{data.label || '結束'}</div>
    </div>
  );
};

const BasicNode = ({ data, isConnectable }) => {
  return (
    <div className="custom-node">
      <Handle type="target" position={Position.Top} id="target-top" isConnectable={isConnectable} />
      <Handle type="target" position={Position.Left} id="target-left" isConnectable={isConnectable} />
      <NodeHeader title={data.label} type="BASIC" typeClass="" />
      <PromptInput
        data={data}
        onChange={(e) => data.onChange(data.id, 'prompt', e.target.value)}
      />
      <Handle type="source" position={Position.Right} id="source-right" isConnectable={isConnectable} />
      <Handle type="source" position={Position.Bottom} id="source-bottom" isConnectable={isConnectable} />
    </div>
  );
};

const SkillNode = ({ data, isConnectable }) => {
  return (
    <div className="custom-node">
      <Handle type="target" position={Position.Top} id="target-top" isConnectable={isConnectable} />
      <Handle type="target" position={Position.Left} id="target-left" isConnectable={isConnectable} />
      <NodeHeader title={data.label} type="SKILL" typeClass="node-type-tool" />
      <div className="custom-node-body">
        <label>AI Skill</label>
        <div style={{fontSize: '12px', color: '#ccc', marginBottom: '8px', wordBreak: 'break-all'}}>{data.skillName || '(未設定)'}</div>
      </div>
      <PromptInput
        data={data}
        onChange={(e) => data.onChange(data.id, 'prompt', e.target.value)}
      />
      <Handle type="source" position={Position.Right} id="source-right" isConnectable={isConnectable} />
      <Handle type="source" position={Position.Bottom} id="source-bottom" isConnectable={isConnectable} />
    </div>
  );
};

const McpNode = ({ data, isConnectable }) => {
  return (
    <div className="custom-node">
      <Handle type="target" position={Position.Top} id="target-top" isConnectable={isConnectable} />
      <Handle type="target" position={Position.Left} id="target-left" isConnectable={isConnectable} />
      <NodeHeader title={data.label} type="MCP" typeClass="node-type-tool" />
      <div className="custom-node-body">
        <label>AI MCP</label>
        <div style={{fontSize: '12px', color: '#ccc', marginBottom: '8px', wordBreak: 'break-all'}}>{data.mcpName || '(未設定)'}</div>
      </div>
      <PromptInput
        data={data}
        onChange={(e) => data.onChange(data.id, 'prompt', e.target.value)}
      />
      <Handle type="source" position={Position.Right} id="source-right" isConnectable={isConnectable} />
      <Handle type="source" position={Position.Bottom} id="source-bottom" isConnectable={isConnectable} />
    </div>
  );
};

const VariableNode = ({ data, isConnectable }) => {
  return (
    <div className="custom-node">
      <Handle type="target" position={Position.Top} id="target-top" isConnectable={isConnectable} />
      <Handle type="target" position={Position.Left} id="target-left" isConnectable={isConnectable} />
      <NodeHeader title={data.label} type="VAR" typeClass="node-type-var" />
      <div className="custom-node-body" style={{marginBottom: '8px'}}>
        <div style={{fontSize: '12px', color: '#ccc'}}>{data.varName ? `${data.varName} = ${data.varValue || ''}` : '(未設定變數)'}</div>
      </div>
      <Handle type="source" position={Position.Right} id="source-right" isConnectable={isConnectable} />
      <Handle type="source" position={Position.Bottom} id="source-bottom" isConnectable={isConnectable} />
    </div>
  );
};

const CalculateNode = ({ data, isConnectable }) => {
  return (
    <div className="custom-node">
      <Handle type="target" position={Position.Top} id="target-top" isConnectable={isConnectable} />
      <Handle type="target" position={Position.Left} id="target-left" isConnectable={isConnectable} />
      <NodeHeader title={data.label} type="CALC" typeClass="node-type-calc" />
      <div className="custom-node-body" style={{marginBottom: '8px'}}>
        <div style={{fontSize: '12px', color: '#ccc'}}>{data.expression || '(未設定運算式)'}</div>
      </div>
      <Handle type="source" position={Position.Right} id="source-right" isConnectable={isConnectable} />
      <Handle type="source" position={Position.Bottom} id="source-bottom" isConnectable={isConnectable} />
    </div>
  );
};

const ConditionNode = ({ data, isConnectable }) => {
  return (
    <div className="condition-node custom-node">
      <Handle type="target" position={Position.Top} id="target-top" isConnectable={isConnectable} />
      <Handle type="target" position={Position.Left} id="target-left" isConnectable={isConnectable} />
      <div className="diamond-shape"></div>
      <div className="diamond-content">
        <NodeHeader title={data.label} type="COND" typeClass="node-type-cond" />
        <div style={{fontSize: '11px', color: '#ccc', marginTop: '4px'}}>{data.condition || '未設定'}</div>
      </div>
      <Handle type="source" position={Position.Right} id="source-right" isConnectable={isConnectable} />
      <Handle type="source" position={Position.Bottom} id="source-bottom" isConnectable={isConnectable} />
    </div>
  );
};

const NoteNode = ({ data, selected }) => {
  return (
    <div className="note-node" style={{ 
      width: data.autoSize ? 'auto' : '100%', 
      height: data.autoSize ? 'auto' : '100%', 
      minWidth: '100px',
      minHeight: '50px',
      backgroundColor: data.bgColor || '#ffeeb6',
      fontFamily: data.fontFamily || '"Comic Sans MS", cursive, sans-serif'
    }}>
      {!data.autoSize && <NodeResizer color="#ffcc00" isVisible={selected} minWidth={100} minHeight={50} />}
      <div className="note-content" style={{ 
        fontSize: data.fontSize || '14px', 
        textAlign: data.textAlign || 'left',
        fontWeight: data.fontWeight || 'normal',
        fontStyle: data.fontStyle || 'normal',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: data.verticalAlign || 'flex-start',
        padding: '10px',
        boxSizing: 'border-box',
        height: '100%',
        whiteSpace: data.autoSize ? 'pre-wrap' : 'normal',
        wordBreak: 'break-word'
      }}>
        {data.noteText || '請填寫備註...'}
      </div>
    </div>
  );
};

const SwimlaneNode = ({ data, selected }) => {
  const isVertical = data.orientation === 'vertical';
  const titlePos = data.titlePosition || (isVertical ? 'left' : 'top');
  return (
    <div className={`swimlane-node ${isVertical ? 'vertical' : 'horizontal'} ${titlePos}`} style={{ width: '100%', height: '100%' }}>
      <NodeResizer color="#0066cc" isVisible={selected} minWidth={100} minHeight={100} />
      <div className="swimlane-header">{data.label || '泳道 (Swim Lane)'}</div>
    </div>
  );
};

const nodeTypes = {
  startNode: StartNode,
  agentNode: AgentNode,
  toolNode: ToolNode,
  endNode: EndNode,
  basicNode: BasicNode,
  skillNode: SkillNode,
  mcpNode: McpNode,
  variableNode: VariableNode,
  calculateNode: CalculateNode,
  conditionNode: ConditionNode,
  noteNode: NoteNode,
  swimlaneNode: SwimlaneNode,
};

const LOCAL_STORAGE_KEY = 'eiva_workflow_data';

const initialNodes = [
  { id: '1', type: 'startNode', position: { x: 250, y: 50 }, data: { label: '啟動節點', prompt: '' } },
];
const initialEdges = [];

export default function WorkflowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [workflowId, setWorkflowId] = useState('default');
  const [workflowList, setWorkflowList] = useState([]);
  const [propertyModalNode, setPropertyModalNode] = useState(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [menu, setMenu] = useState(null);
  const reactFlowWrapper = useRef(null);
  const editorContainerRef = useRef(null);

  const fetchWorkflowList = useCallback(() => {
    fetch('http://localhost:39999/eiva/backend/api/ver-0.95/workflows')
      .then(res => res.json())
      .then(data => {
        if (data.workflows) {
          setWorkflowList(data.workflows);
        }
      })
      .catch(err => console.error('Failed to fetch workflow list', err));
  }, []);

  useEffect(() => {
    fetchWorkflowList();
  }, [fetchWorkflowList]);

  const handleNodeDataChange = useCallback((id, key, value) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              [key]: value,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const loadWorkflowData = useCallback(() => {
    fetch(`http://localhost:39999/eiva/backend/api/ver-0.95/workflow/${workflowId}`)
      .then(res => res.json())
      .then(saved => {
        if (saved && saved.nodes && saved.edges) {
          const loadedNodes = saved.nodes.map(n => ({
            ...n,
            data: { ...n.data, onChange: handleNodeDataChange }
          }));
          setNodes(loadedNodes);
          setEdges(saved.edges);
        } else {
          // fallback
          setNodes(initialNodes.map(n => ({
            ...n,
            data: { ...n.data, onChange: handleNodeDataChange }
          })));
          setEdges(initialEdges);
        }
      })
      .catch(err => {
        console.error('Failed to fetch saved workflow', err);
        setNodes(initialNodes.map(n => ({
          ...n,
          data: { ...n.data, onChange: handleNodeDataChange }
        })));
        setEdges(initialEdges);
      });
  }, [setNodes, setEdges, handleNodeDataChange, workflowId]);

  useEffect(() => {
    loadWorkflowData();
  }, [workflowId, loadWorkflowData]);

  const handleReload = () => {
    if (confirm('確定要重新載入嗎？這將覆蓋您目前尚未儲存的變更！')) {
      loadWorkflowData();
    }
  };



  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const handleSave = () => {
    // Remove onChange from data before saving to prevent circular reference errors
    const nodesToSave = nodes.map(n => {
      const { onChange, ...dataToSave } = n.data;
      return { ...n, data: dataToSave };
    });
    
    const workflowData = { nodes: nodesToSave, edges };
    
    fetch(`http://localhost:39999/eiva/backend/api/ver-0.95/workflow/${workflowId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workflowData)
    })
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        alert('Workflow 已成功儲存至後端資料庫！');
        fetchWorkflowList();
      } else {
        alert('儲存失敗：' + data.error);
      }
    })
    .catch(err => {
      console.error('Save error:', err);
      alert('儲存時發生錯誤');
    });
  };

  const handleRun = () => {
    fetch(`http://localhost:39999/eiva/backend/api/ver-0.95/workflow/${workflowId}/run`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          alert('執行成功：' + data.message);
        } else {
          alert('執行失敗：' + data.error);
        }
      })
      .catch(err => {
        console.error(err);
        alert('呼叫執行 API 時發生錯誤');
      });
  };

  const handleCreateNew = () => {
    const name = prompt("請輸入新工作流程名稱：");
    if (!name || name.trim() === '') return;
    
    const trimmedName = name.trim();
    setWorkflowId(trimmedName);
    
    // 3 node template
    const templateNodes = [
      { id: 'start_1', type: 'startNode', position: { x: 50, y: 100 }, data: { label: '啟動', prompt: '', triggerType: 'manual', onChange: handleNodeDataChange } },
      { id: 'agent_1', type: 'agentNode', position: { x: 286, y: 100 }, data: { label: '代理處理', prompt: '', modelName: 'gpt-4o', temperature: 0.7, onChange: handleNodeDataChange } },
      { id: 'end_1', type: 'endNode', position: { x: 522, y: 100 }, data: { label: '結束', prompt: '', outputFormat: 'text', onChange: handleNodeDataChange } }
    ];
    const templateEdges = [
      { id: 'e1', source: 'start_1', target: 'agent_1' },
      { id: 'e2', source: 'agent_1', target: 'end_1' }
    ];
    
    setNodes(templateNodes);
    setEdges(templateEdges);
  };

  const handleDeleteWorkflow = () => {
    if (workflowId === 'default') {
      alert('預設的工作流程無法刪除！');
      return;
    }
    if (confirm(`確定要刪除工作流程「${workflowId}」嗎？`)) {
      fetch(`http://localhost:39999/eiva/backend/api/ver-0.95/workflow/${workflowId}`, {
        method: 'DELETE'
      })
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          alert('刪除成功！');
          setWorkflowId('default');
          fetchWorkflowList();
        } else {
          alert('刪除失敗：' + data.error);
        }
      })
      .catch(err => {
        console.error('Delete error:', err);
        alert('刪除時發生錯誤');
      });
    }
  };

  const deleteSelectedNode = useCallback(() => {
    if (!propertyModalNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== propertyModalNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== propertyModalNode.id && e.target !== propertyModalNode.id));
    setPropertyModalNode(null);
  }, [propertyModalNode, setNodes, setEdges]);

  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    if (!reactFlowWrapper.current) return;
    
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    setMenu({
      id: node.id,
      top: event.clientY - bounds.top,
      left: event.clientX - bounds.left,
    });
  }, [setMenu]);

  const onPaneClick = useCallback(() => {
    setMenu(null);
  }, [setMenu]);

  const contextMenuDelete = useCallback(() => {
    if (!menu) return;
    setNodes((nds) => nds.filter((n) => n.id !== menu.id));
    setEdges((eds) => eds.filter((e) => e.source !== menu.id && e.target !== menu.id));
    if (propertyModalNode && propertyModalNode.id === menu.id) {
      setPropertyModalNode(null);
    }
    setMenu(null);
  }, [menu, propertyModalNode, setNodes, setEdges]);

  const changeNodeZIndex = useCallback((direction) => {
    if (!menu) return;
    setNodes((nds) => {
      const allZIndexes = nds.map(n => n.zIndex ?? (n.type === 'swimlaneNode' ? 0 : 1));
      const maxZ = Math.max(...allZIndexes, 0);
      const minZ = Math.min(...allZIndexes, 1);

      let nextNodes = nds.map(node => {
        let currentZ = node.zIndex ?? (node.type === 'swimlaneNode' ? 0 : 1);
        if (node.id === menu.id) {
          if (direction === 'up') currentZ += 1;
          else if (direction === 'down') currentZ -= 1;
          else if (direction === 'front') currentZ = maxZ + 1;
          else if (direction === 'back') currentZ = minZ - 1;
        }
        return { ...node, zIndex: currentZ };
      });

      const newMinZ = Math.min(...nextNodes.map(n => n.zIndex));
      if (newMinZ < 0) {
        const offset = Math.abs(newMinZ);
        nextNodes = nextNodes.map(n => ({ ...n, zIndex: n.zIndex + offset }));
      }
      return nextNodes;
    });
    setMenu(null);
  }, [menu, setNodes]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (editorContainerRef.current) {
        editorContainerRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen mode: ${err.message}`);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const onSelectionChange = useCallback(({ nodes }) => {
    if (nodes.length === 1) {
      setPropertyModalNode(nodes[0]);
    } else {
      setPropertyModalNode(null);
    }
  }, []);

  const handleClear = () => {
    if (confirm('確定要清空畫布嗎？這將刪除所有未儲存的節點！')) {
      setNodes([]);
      setEdges([]);
    }
  };

  const addNode = (type, label, position) => {
    const newNodeId = `node_${Date.now()}`;
    const newNode = {
      id: newNodeId,
      type: type,
      position: position || { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: { label: label, prompt: '', onChange: handleNodeDataChange },
    };
    
    // Default styles for resizable nodes
    if (type === 'swimlaneNode') {
      newNode.style = { width: 400, height: 300 };
      newNode.zIndex = 0;
    } else if (type === 'noteNode') {
      newNode.style = { width: 150, height: 150 };
      newNode.zIndex = 1;
    }

    setNodes((nds) => nds.concat(newNode));
  };

  const onDragStart = (event, nodeType, label) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow-label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('application/reactflow-label');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance ? reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      }) : { x: event.clientX - 200, y: event.clientY - 100 };

      addNode(type, label, position);
    },
    [reactFlowInstance, addNode]
  );
  const renderModalFields = () => {
    if (!propertyModalNode) return null;
    const type = propertyModalNode.type;
    const data = propertyModalNode.data;
    const updateField = (key, value) => {
      setPropertyModalNode({ ...propertyModalNode, data: { ...data, [key]: value } });
    };

    const commonLabel = (
      <div className="modal-field">
        <label>節點名稱 (Label)</label>
        <input type="text" value={data.label || ''} onChange={(e) => updateField('label', e.target.value)} />
      </div>
    );
    const commonPrompt = (
      <div className="modal-field">
        <label>Prompt 指令</label>
        <textarea value={data.prompt || ''} onChange={(e) => updateField('prompt', e.target.value)} placeholder="輸入提示詞... (可使用 ${變數} 語法)" />
      </div>
    );

    switch(type) {
      case 'startNode':
        return (
          <>
            {commonLabel}
            <div className="modal-field">
              <label>觸發方式 (Trigger Type)</label>
              <select value={data.triggerType || 'manual'} onChange={(e) => updateField('triggerType', e.target.value)} className="modal-select">
                <option value="manual">手動觸發 (Manual)</option>
                <option value="schedule">排程觸發 (Schedule)</option>
                <option value="webhook">Webhook</option>
              </select>
            </div>
          </>
        );
      case 'agentNode':
        return (
          <>
            {commonLabel}
            {commonPrompt}
            <div className="modal-field">
              <label>AI 模型 (Model)</label>
              <select value={data.modelName || 'gpt-4o'} onChange={(e) => updateField('modelName', e.target.value)} className="modal-select">
                <option value="gpt-4o">GPT-4o</option>
                <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              </select>
            </div>
            <div className="modal-field">
              <label>創造力 (Temperature)</label>
              <input type="number" step="0.1" min="0" max="2" value={data.temperature !== undefined ? data.temperature : 0.7} onChange={(e) => updateField('temperature', parseFloat(e.target.value))} />
            </div>
          </>
        );
      case 'toolNode':
        return (
          <>
            {commonLabel}
            <div className="modal-field">
              <label>工具類型 (Tool Type)</label>
              <select value={data.toolType || 'webSearch'} onChange={(e) => updateField('toolType', e.target.value)} className="modal-select">
                <option value="webSearch">網路搜尋 (Web Search)</option>
                <option value="fetchUrl">讀取網頁 (Fetch URL)</option>
                <option value="calculator">計算機 (Calculator)</option>
              </select>
            </div>
            <div className="modal-field">
              <label>工具參數 (Parameters)</label>
              <textarea value={data.parameters || ''} onChange={(e) => updateField('parameters', e.target.value)} placeholder="輸入自訂參數" />
            </div>
          </>
        );
      case 'skillNode':
        return (
          <>
            {commonLabel}
            <div className="modal-field">
              <label>AI Skill</label>
              <select value={data.skillName || ''} onChange={(e) => updateField('skillName', e.target.value)} className="modal-select">
                <option value="">-- 請選擇 --</option>
                <option value="research">資料研究 (research)</option>
                <option value="summarize">總結整理 (summarize)</option>
                <option value="translate">翻譯 (translate)</option>
              </select>
            </div>
            {commonPrompt}
          </>
        );
      case 'mcpNode':
        return (
          <>
            {commonLabel}
            <div className="modal-field">
              <label>AI MCP</label>
              <select value={data.mcpName || ''} onChange={(e) => updateField('mcpName', e.target.value)} className="modal-select">
                <option value="">-- 請選擇 --</option>
                <option value="fileSystem">檔案系統 (fileSystem)</option>
                <option value="database">資料庫存取 (database)</option>
                <option value="webSearch">網路搜尋 (webSearch)</option>
              </select>
            </div>
            {commonPrompt}
          </>
        );
      case 'variableNode':
        return (
          <>
            {commonLabel}
            <div className="modal-field">
              <label>變數名稱 (Variable Name)</label>
              <input type="text" value={data.varName || ''} onChange={(e) => updateField('varName', e.target.value)} placeholder="e.g. counter" />
            </div>
            <div className="modal-field">
              <label>變數值 (Value)</label>
              <input type="text" value={data.varValue || ''} onChange={(e) => updateField('varValue', e.target.value)} placeholder="e.g. 1 或 ${other_var}" />
            </div>
          </>
        );
      case 'calculateNode':
        return (
          <>
            {commonLabel}
            <div className="modal-field">
              <label>運算式 (Expression)</label>
              <input type="text" value={data.expression || ''} onChange={(e) => updateField('expression', e.target.value)} placeholder="e.g. ${counter} + 1" />
            </div>
          </>
        );
      case 'conditionNode':
        return (
          <>
            {commonLabel}
            <div className="modal-field">
              <label>判斷條件 (Condition)</label>
              <input type="text" value={data.condition || ''} onChange={(e) => updateField('condition', e.target.value)} placeholder="e.g. ${counter} > 10" />
            </div>
          </>
        );
      case 'endNode':
        return (
          <>
            {commonLabel}
            <div className="modal-field">
              <label>輸出格式 (Output Format)</label>
              <select value={data.outputFormat || 'text'} onChange={(e) => updateField('outputFormat', e.target.value)} className="modal-select">
                <option value="text">純文字 (Text)</option>
                <option value="json">JSON 格式</option>
                <option value="markdown">Markdown</option>
              </select>
            </div>
          </>
        );
      case 'swimlaneNode':
        const isVert = data.orientation === 'vertical';
        return (
          <>
            <div className="modal-field">
              <label>泳道標題 (Title)</label>
              <input type="text" value={data.label || ''} onChange={(e) => updateField('label', e.target.value)} placeholder="e.g. 泳道名稱" />
            </div>
            <div className="modal-field">
              <label>泳道方向 (Orientation)</label>
              <select value={data.orientation || 'horizontal'} onChange={(e) => updateField('orientation', e.target.value)} className="modal-select">
                <option value="horizontal">水平 (Horizontal)</option>
                <option value="vertical">垂直 (Vertical)</option>
              </select>
            </div>
            <div className="modal-field">
              <label>標題位置 (Title Position)</label>
              <select value={data.titlePosition || (isVert ? 'left' : 'top')} onChange={(e) => updateField('titlePosition', e.target.value)} className="modal-select">
                {!isVert ? (
                  <>
                    <option value="top">上方 (Top)</option>
                    <option value="bottom">下方 (Bottom)</option>
                  </>
                ) : (
                  <>
                    <option value="left">左側 (Left)</option>
                    <option value="right">右側 (Right)</option>
                  </>
                )}
              </select>
            </div>
          </>
        );
      case 'noteNode':
        return (
          <>
            <div className="modal-field">
              <label>備註內容 (Note)</label>
              <textarea value={data.noteText || ''} onChange={(e) => updateField('noteText', e.target.value)} placeholder="請填寫備註..." style={{ minHeight: '80px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="modal-field">
                <label>背景色</label>
                <input type="color" value={data.bgColor || '#ffeeb6'} onChange={(e) => updateField('bgColor', e.target.value)} style={{ padding: '0', height: '32px', width: '100%', cursor: 'pointer' }} />
              </div>
              <div className="modal-field">
                <label>字型</label>
                <select value={data.fontFamily || '"Comic Sans MS", cursive, sans-serif'} onChange={(e) => updateField('fontFamily', e.target.value)} className="modal-select">
                  <option value='"Comic Sans MS", cursive, sans-serif'>手寫風</option>
                  <option value='sans-serif'>無襯線</option>
                  <option value='serif'>襯線</option>
                  <option value='monospace'>等寬</option>
                </select>
              </div>
              <div className="modal-field">
                <label>字體大小</label>
                <select value={data.fontSize || '14px'} onChange={(e) => updateField('fontSize', e.target.value)} className="modal-select">
                  <option value="12px">小 (12px)</option>
                  <option value="14px">中 (14px)</option>
                  <option value="18px">大 (18px)</option>
                  <option value="24px">特大 (24px)</option>
                </select>
              </div>
              <div className="modal-field">
                <label>自動縮放 (Auto Size)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '32px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#fff', fontSize: '13px' }}>
                    <input type="checkbox" checked={!!data.autoSize} onChange={(e) => updateField('autoSize', e.target.checked)} />
                    根據內容自動調整大小
                  </label>
                </div>
              </div>
              <div className="modal-field">
                <label>樣式 (Style)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '32px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#fff', fontSize: '13px' }}>
                    <input type="checkbox" checked={data.fontWeight === 'bold'} onChange={(e) => updateField('fontWeight', e.target.checked ? 'bold' : 'normal')} />
                    粗體
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#fff', fontSize: '13px' }}>
                    <input type="checkbox" checked={data.fontStyle === 'italic'} onChange={(e) => updateField('fontStyle', e.target.checked ? 'italic' : 'normal')} />
                    斜體
                  </label>
                </div>
              </div>
              <div className="modal-field">
                <label>水平對齊</label>
                <select value={data.textAlign || 'left'} onChange={(e) => updateField('textAlign', e.target.value)} className="modal-select">
                  <option value="left">靠左</option>
                  <option value="center">置中</option>
                  <option value="right">靠右</option>
                </select>
              </div>
              <div className="modal-field">
                <label>垂直對齊</label>
                <select value={data.verticalAlign || 'flex-start'} onChange={(e) => updateField('verticalAlign', e.target.value)} className="modal-select">
                  <option value="flex-start">靠上</option>
                  <option value="center">置中</option>
                  <option value="flex-end">靠下</option>
                </select>
              </div>
            </div>
          </>
        );
      default:
        return (
          <>
            {commonLabel}
            {commonPrompt}
          </>
        );
    }
  };

  return (
    <div ref={editorContainerRef} className="workflow-editor-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: '#111' }}>
      <header className="workflow-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid #333' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Workflow 編輯器 (React Flow)</h2>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
              API: GET http://localhost:39999/eiva/backend/api/ver-0.95/workflow/&#123;workflow-name&#125;/run
            </div>
            <div style={{ fontSize: '11px', color: '#4caf50', marginTop: '2px', display: 'flex', gap: '4px' }}>
              <span>👉 實際: GET</span>
              <a 
                href={`http://localhost:39999/eiva/backend/api/ver-0.95/workflow/${workflowId}/run`} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ color: '#81c784', textDecoration: 'underline' }}
                title="點擊在新分頁執行此工作流程"
              >
                http://localhost:39999/eiva/backend/api/ver-0.95/workflow/{workflowId}/run
              </a>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select 
              value={workflowId} 
              onChange={(e) => setWorkflowId(e.target.value)}
              style={{ padding: '6px', borderRadius: '4px', backgroundColor: '#000', color: '#fff', border: '1px solid #444', outline: 'none' }}
            >
              {!workflowList.includes(workflowId) && <option value={workflowId}>{workflowId} (未儲存)</option>}
              {workflowList.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
            <button onClick={handleCreateNew} style={{ padding: '6px 12px', borderRadius: '4px', backgroundColor: '#333', color: '#fff', border: '1px solid #444', cursor: 'pointer', whiteSpace: 'nowrap' }}>✨ 新增</button>
            <button onClick={handleDeleteWorkflow} style={{ padding: '6px 12px', borderRadius: '4px', backgroundColor: '#aa3333', color: '#fff', border: '1px solid #772222', cursor: 'pointer', whiteSpace: 'nowrap' }}>❌ 刪除</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={handleClear} style={{ whiteSpace: 'nowrap', padding: '6px 12px', borderRadius: '4px', background: '#333', border: '1px solid #444', color: 'white', cursor: 'pointer' }}>🗑️ 清空</button>
          <button onClick={handleReload} style={{ whiteSpace: 'nowrap', padding: '6px 12px', borderRadius: '4px', background: '#333', border: '1px solid #444', color: 'white', cursor: 'pointer' }}>🔄 重新載入</button>
          <button onClick={handleSave} style={{ whiteSpace: 'nowrap', padding: '6px 12px', borderRadius: '4px', background: '#333', border: '1px solid #444', color: 'white', cursor: 'pointer' }}>💾 儲存</button>
          <button className="run-btn" onClick={handleRun} style={{ whiteSpace: 'nowrap', padding: '6px 16px', borderRadius: '4px', background: '#2e7d32', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>▶️ 執行 (Run)</button>
          <button onClick={toggleFullscreen} style={{ whiteSpace: 'nowrap', padding: '6px 12px', borderRadius: '4px', background: '#333', border: '1px solid #444', color: 'white', cursor: 'pointer' }}>⛶ 全螢幕縮放</button>
        </div>
      </header>

      <div className="workflow-main" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar: Node Palettes */}
        <div style={{ display: 'flex' }}>
          {leftSidebarOpen && (
            <aside className="workflow-sidebar left-sidebar" style={{ width: '200px', borderRight: '1px solid #333', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', backgroundColor: '#1a1a1a' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#ccc', borderBottom: '1px solid #333', paddingBottom: '8px' }}>新增節點 (點擊或拖曳)</h3>
              <button draggable onDragStart={(e) => onDragStart(e, 'startNode', '啟動 (Start)')} onClick={() => addNode('startNode', '啟動 (Start)')} title="工作流程的進入點。不需設定特殊屬性。" style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '4px', backgroundColor: '#333', color: '#fff', border: '1px solid #444', cursor: 'grab' }}>🟢 Start (啟動)</button>
              <button draggable onDragStart={(e) => onDragStart(e, 'agentNode', '代理 (Agent)')} onClick={() => addNode('agentNode', '代理 (Agent)')} title="呼叫 LLM 代理進行推理與對話。可設定 Prompt (提示詞) 來定義其角色與任務。" style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '4px', backgroundColor: '#333', color: '#fff', border: '1px solid #444', cursor: 'grab' }}>🤖 Agent (代理)</button>
              <button draggable onDragStart={(e) => onDragStart(e, 'toolNode', '工具 (Tool)')} onClick={() => addNode('toolNode', '工具 (Tool)')} title="執行特定的外部工具或 API。需設定工具名稱或參數。" style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '4px', backgroundColor: '#333', color: '#fff', border: '1px solid #444', cursor: 'grab' }}>🔧 Tool (工具)</button>
              <button draggable onDragStart={(e) => onDragStart(e, 'skillNode', '技能 (Skill)')} onClick={() => addNode('skillNode', '技能 (Skill)')} title="執行已定義的技能 (Skill)。通常用來重複使用固定的邏輯。" style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '4px', backgroundColor: '#333', color: '#fff', border: '1px solid #444', cursor: 'grab' }}>🪄 Skill (技能)</button>
              <button draggable onDragStart={(e) => onDragStart(e, 'mcpNode', 'MCP')} onClick={() => addNode('mcpNode', 'MCP')} title="連接 MCP 伺服器進行資源或工具的存取。" style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '4px', backgroundColor: '#333', color: '#fff', border: '1px solid #444', cursor: 'grab' }}>🔌 MCP</button>
              <button draggable onDragStart={(e) => onDragStart(e, 'variableNode', '變數 (Var)')} onClick={() => addNode('variableNode', '變數 (Var)')} title="宣告或賦值給變數。設定變數名稱與值，後續節點可使用 ${變數名} 讀取。" style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '4px', backgroundColor: '#333', color: '#fff', border: '1px solid #444', cursor: 'grab' }}>🔤 Var (變數)</button>
              <button draggable onDragStart={(e) => onDragStart(e, 'calculateNode', '計算 (Calc)')} onClick={() => addNode('calculateNode', '計算 (Calc)')} title="進行數學或邏輯運算。使用 ${變數} 來編寫運算式。" style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '4px', backgroundColor: '#333', color: '#fff', border: '1px solid #444', cursor: 'grab' }}>➕ Calc (計算)</button>
              <button draggable onDragStart={(e) => onDragStart(e, 'conditionNode', '條件 (Cond)')} onClick={() => addNode('conditionNode', '條件 (Cond)')} title="條件判斷分支。設定條件式 (如 ${var} > 10)，依據 True 或 False 走向不同路徑。" style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '4px', backgroundColor: '#333', color: '#fff', border: '1px solid #444', cursor: 'grab' }}>❓ Cond (條件)</button>
              <button draggable onDragStart={(e) => onDragStart(e, 'endNode', '結束 (End)')} onClick={() => addNode('endNode', '結束 (End)')} title="工作流程的結束點。可設定輸出格式 (純文字、JSON 或 Markdown)。" style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '4px', backgroundColor: '#333', color: '#fff', border: '1px solid #444', cursor: 'grab' }}>🛑 End (結束)</button>
              <button draggable onDragStart={(e) => onDragStart(e, 'swimlaneNode', '泳道 (Swim Lane)')} onClick={() => addNode('swimlaneNode', '泳道 (Swim Lane)')} title="泳道，用於將工作流程畫分區域。可調整水平或垂直方向，縮放大小將節點分類。" style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '4px', backgroundColor: '#333', color: '#fff', border: '1px solid #444', cursor: 'grab' }}>🏊 Swim Lane (泳道)</button>
              <button draggable onDragStart={(e) => onDragStart(e, 'noteNode', '備註 (Note)')} onClick={() => addNode('noteNode', '備註 (Note)')} title="備註，用於寫下說明文字或註解。可設定顏色、字型與自動縮放等樣式。" style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '4px', backgroundColor: '#333', color: '#fff', border: '1px solid #444', cursor: 'grab' }}>📝 Note (備註)</button>
              <button draggable onDragStart={(e) => onDragStart(e, 'basicNode', '一般 (Basic)')} onClick={() => addNode('basicNode', '一般 (Basic)')} title="一般通用節點。可自由設定名稱與參數。" style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '4px', backgroundColor: '#333', color: '#fff', border: '1px solid #444', cursor: 'grab' }}>📄 Basic (一般)</button>
            </aside>
          )}
          <div 
            style={{ width: '20px', backgroundColor: '#222', borderRight: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#888', fontSize: '10px' }} 
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            title={leftSidebarOpen ? '收合工具列' : '展開工具列'}
          >
            {leftSidebarOpen ? '◀' : '▶'}
          </div>
        </div>

        {/* Center Canvas */}
        <div className="workflow-canvas" ref={reactFlowWrapper} style={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            onNodeContextMenu={onNodeContextMenu}
            onPaneClick={onPaneClick}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            attributionPosition="bottom-right"
            proOptions={{ hideAttribution: true }}
            minZoom={0.2}
            maxZoom={4}
          >
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                switch (node.type) {
                  case 'startNode': return '#2e7d32';
                  case 'agentNode': return '#0277bd';
                  case 'toolNode': return '#f57c00';
                  case 'endNode': return '#c62828';
                  default: return '#1a1a1a';
                }
              }}
              maskColor="rgba(0,0,0,0.7)"
              style={{ backgroundColor: '#111' }}
            />
            <Background variant="dots" gap={12} size={1} color="#333" />
          </ReactFlow>

          {menu && (
            <div className="workflow-context-menu" style={{ top: menu.top, left: menu.left }}>
              <div className="menu-item" onClick={() => changeNodeZIndex('up')}>↑ 上移一層</div>
              <div className="menu-item" onClick={() => changeNodeZIndex('down')}>↓ 下移一層</div>
              <div className="menu-item" onClick={() => changeNodeZIndex('front')}>⏫ 移到最前</div>
              <div className="menu-item" onClick={() => changeNodeZIndex('back')}>⏬ 移到最後</div>
              <div style={{ height: '1px', backgroundColor: '#444', margin: '4px 0' }}></div>
              <div className="menu-item delete" onClick={contextMenuDelete}>🗑️ 刪除節點</div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Property Panel */}
        <div style={{ display: 'flex' }}>
          <div 
            style={{ width: '20px', backgroundColor: '#222', borderLeft: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#888', fontSize: '10px' }} 
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            title={rightSidebarOpen ? '收合屬性面板' : '展開屬性面板'}
          >
            {rightSidebarOpen ? '▶' : '◀'}
          </div>
          {rightSidebarOpen && (
            <aside className="workflow-sidebar right-sidebar" style={{ width: '320px', padding: '20px', display: 'flex', flexDirection: 'column', overflowY: 'auto', backgroundColor: '#111' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>屬性設定</h3>
              {propertyModalNode ? (
                <div className="property-panel-content">
                  {renderModalFields()}
                  <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button onClick={() => {
                      setNodes((nds) => nds.map(n => {
                        if (n.id === propertyModalNode.id) {
                          let newStyle = { ...(n.style || {}) };
                          if (propertyModalNode.type === 'noteNode') {
                            if (propertyModalNode.data.autoSize) {
                              delete newStyle.width;
                              delete newStyle.height;
                            } else {
                              if (!newStyle.width) newStyle.width = 150;
                              if (!newStyle.height) newStyle.height = 150;
                            }
                          }
                          return { ...n, data: propertyModalNode.data, style: newStyle };
                        }
                        return n;
                      }));
                    }} style={{ padding: '10px', borderRadius: '4px', backgroundColor: '#0066cc', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>💾 套用屬性至畫布</button>
                    <button onClick={deleteSelectedNode} style={{ padding: '8px', borderRadius: '4px', backgroundColor: 'transparent', color: '#ff4444', border: '1px solid #ff4444', cursor: 'pointer', fontSize: '12px' }}>🗑️ 刪除此節點</button>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#666', textAlign: 'center', marginTop: '60px', fontSize: '14px', lineHeight: '1.6' }}>
                  請在左側選擇新增節點<br/>或在中間畫布點選節點<br/>以編輯其專屬屬性
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
