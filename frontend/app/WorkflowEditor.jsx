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
    <div className="custom-node">
      <NodeHeader title={data.label} type="START" typeClass="node-type-start" />
      <PromptInput
        data={data}
        onChange={(e) => data.onChange(data.id, 'prompt', e.target.value)}
      />
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
    <div className="custom-node">
      <Handle type="target" position={Position.Top} id="target-top" isConnectable={isConnectable} />
      <Handle type="target" position={Position.Left} id="target-left" isConnectable={isConnectable} />
      <NodeHeader title={data.label} type="END" typeClass="node-type-end" />
      <PromptInput
        data={data}
        onChange={(e) => data.onChange(data.id, 'prompt', e.target.value)}
      />
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
  const [menu, setMenu] = useState(null);
  const [propertyModalNode, setPropertyModalNode] = useState(null);
  const reactFlowWrapper = useRef(null);

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

  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    if (!reactFlowWrapper.current) return;
    
    // Calculate position relative to the wrapper
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

  const deleteNode = useCallback(() => {
    if (!menu) return;
    setNodes((nds) => nds.filter((n) => n.id !== menu.id));
    setEdges((eds) => eds.filter((e) => e.source !== menu.id && e.target !== menu.id));
    setMenu(null);
  }, [menu, setNodes, setEdges]);

  const openPropertyModal = useCallback(() => {
    if (!menu) return;
    const node = nodes.find(n => n.id === menu.id);
    if (node) {
      setPropertyModalNode(node);
    }
    setMenu(null);
  }, [menu, nodes]);

  const handleClear = () => {
    if (confirm('確定要清空畫布嗎？這將刪除所有未儲存的節點！')) {
      setNodes([]);
      setEdges([]);
    }
  };

  const addNode = (type, label) => {
    const newNodeId = `node_${Date.now()}`;
    const newNode = {
      id: newNodeId,
      type: type,
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: { label: label, prompt: '', onChange: handleNodeDataChange },
    };
    setNodes((nds) => nds.concat(newNode));
  };
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
    <div className="workflow-editor-container">
      <header className="workflow-header">
        {/* Row 1: Title & Selection */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Workflow 編輯器 (React Flow)</h2>
            <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>
              執行 API: GET http://localhost:39999/eiva/backend/api/ver-0.95/workflow/{workflowId}/run
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
            <button onClick={handleCreateNew} style={{ padding: '6px 12px', borderRadius: '4px', backgroundColor: '#333', color: '#fff', border: '1px solid #444', cursor: 'pointer', whiteSpace: 'nowrap' }}>✨ 新增流程</button>
            <button onClick={handleDeleteWorkflow} style={{ padding: '6px 12px', borderRadius: '4px', backgroundColor: '#aa3333', color: '#fff', border: '1px solid #772222', cursor: 'pointer', whiteSpace: 'nowrap' }}>❌ 刪除流程</button>
          </div>
        </div>

        {/* Row 2: Tools & Actions */}
        <div className="workflow-actions" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => addNode('startNode', '啟動 (Start)')}>🟢 Start</button>
            <button onClick={() => addNode('agentNode', '代理 (Agent)')}>🤖 Agent</button>
            <button onClick={() => addNode('toolNode', '工具 (Tool)')}>🔧 Tool</button>
            <button onClick={() => addNode('skillNode', '技能 (Skill)')}>🪄 Skill</button>
            <button onClick={() => addNode('mcpNode', 'MCP')}>🔌 MCP</button>
            <button onClick={() => addNode('variableNode', '變數 (Var)')}>🔤 Var</button>
            <button onClick={() => addNode('calculateNode', '計算 (Calc)')}>➕ Calc</button>
            <button onClick={() => addNode('conditionNode', '條件 (Cond)')}>❓ Cond</button>
            <button onClick={() => addNode('endNode', '結束 (End)')}>🛑 End</button>
            <button onClick={() => addNode('basicNode', '一般 (Basic)')}>📄 Basic</button>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handleClear}>🗑️ 清空</button>
            <button onClick={handleReload}>🔄 重新載入</button>
            <button onClick={handleSave}>💾 儲存</button>
            <button className="run-btn" onClick={handleRun}>▶️ 執行 (Run)</button>
          </div>
        </div>
      </header>
      
      <div className="workflow-canvas" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={onPaneClick}
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
            <div className="menu-item" onClick={openPropertyModal}>設定 Property</div>
            <div className="menu-item delete" onClick={deleteNode}>刪除節點</div>
          </div>
        )}

        {propertyModalNode && (
          <div className="workflow-property-modal-overlay">
            <div className="workflow-property-modal">
              <h3>設定節點屬性</h3>
              {renderModalFields()}
              <div className="modal-actions">
                <button onClick={() => {
                  Object.keys(propertyModalNode.data).forEach(key => {
                    handleNodeDataChange(propertyModalNode.id, key, propertyModalNode.data[key]);
                  });
                  setPropertyModalNode(null);
                }}>儲存</button>
                <button className="secondary" onClick={() => setPropertyModalNode(null)}>取消</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
