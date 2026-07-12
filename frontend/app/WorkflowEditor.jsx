import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
import { useI18n } from './i18n/index.jsx';

const initialEdges = [];

export default function WorkflowEditor() {
  const { t } = useI18n();

  // --- Custom Nodes ---

  const NodeHeader = ({ title, type, typeClass }) => (
    <div className="custom-node-header">
      <span>{title}</span>
      <span className={`custom-node-type ${typeClass}`}>{type}</span>
    </div>
  );

  const PromptInput = ({ data, onChange }) => (
    <div className="custom-node-body">
      <label>{t('workflow.nodes.promptLabel')}</label>
      <textarea
        value={data.prompt || ''}
        onChange={onChange}
        className="nodrag"
        placeholder={t('workflow.nodes.promptPlaceholder')}
      />
    </div>
  );

  const StartNode = ({ data, isConnectable }) => {
    return (
      <div className="start-node circle-node">
        <div className="circle-content">{data.label || t('workflow.nodes.start')}</div>
        <Handle type="source" position={Position.Right} id="source-right" isConnectable={isConnectable} />
        <Handle type="source" position={Position.Bottom} id="source-bottom" isConnectable={isConnectable} />
      </div>
    );
  };

  const AgentNode = ({ id, data, isConnectable }) => {
    return (
      <div className="custom-node">
        <Handle type="target" position={Position.Top} id="target-top" isConnectable={isConnectable} />
        <Handle type="target" position={Position.Left} id="target-left" isConnectable={isConnectable} />
        <NodeHeader title={data.label} type="AGENT" typeClass="node-type-agent" />
        <PromptInput
          data={data}
          onChange={(e) => data.onChange(id, 'prompt', e.target.value)}
        />
        <Handle type="source" position={Position.Right} id="source-right" isConnectable={isConnectable} />
        <Handle type="source" position={Position.Bottom} id="source-bottom" isConnectable={isConnectable} />
      </div>
    );
  };

  const ToolNode = ({ id, data, isConnectable }) => {
    return (
      <div className="custom-node">
        <Handle type="target" position={Position.Top} id="target-top" isConnectable={isConnectable} />
        <Handle type="target" position={Position.Left} id="target-left" isConnectable={isConnectable} />
        <NodeHeader title={data.label} type="TOOL" typeClass="node-type-tool" />
        <PromptInput
          data={data}
          onChange={(e) => data.onChange(id, 'prompt', e.target.value)}
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
        <div className="circle-content">{data.label || t('workflow.nodes.end')}</div>
      </div>
    );
  };

  const BasicNode = ({ id, data, isConnectable }) => {
    return (
      <div className="custom-node">
        <Handle type="target" position={Position.Top} id="target-top" isConnectable={isConnectable} />
        <Handle type="target" position={Position.Left} id="target-left" isConnectable={isConnectable} />
        <NodeHeader title={data.label} type="BASIC" typeClass="" />
        <PromptInput
          data={data}
          onChange={(e) => data.onChange(id, 'prompt', e.target.value)}
        />
        <Handle type="source" position={Position.Right} id="source-right" isConnectable={isConnectable} />
        <Handle type="source" position={Position.Bottom} id="source-bottom" isConnectable={isConnectable} />
      </div>
    );
  };

  const SkillNode = ({ id, data, isConnectable }) => {
    return (
      <div className="custom-node">
        <Handle type="target" position={Position.Top} id="target-top" isConnectable={isConnectable} />
        <Handle type="target" position={Position.Left} id="target-left" isConnectable={isConnectable} />
        <NodeHeader title={data.label} type="SKILL" typeClass="node-type-tool" />
        <div className="custom-node-body">
          <label>{t('workflow.properties.skill')}</label>
          <div style={{ fontSize: '12px', color: 'var(--c-text-muted)', marginBottom: '8px', wordBreak: 'break-all' }}>{data.skillName || t('workflow.nodes.notSet')}</div>
        </div>
        <PromptInput
          data={data}
          onChange={(e) => data.onChange(id, 'prompt', e.target.value)}
        />
        <Handle type="source" position={Position.Right} id="source-right" isConnectable={isConnectable} />
        <Handle type="source" position={Position.Bottom} id="source-bottom" isConnectable={isConnectable} />
      </div>
    );
  };

  const McpNode = ({ id, data, isConnectable }) => {
    return (
      <div className="custom-node">
        <Handle type="target" position={Position.Top} id="target-top" isConnectable={isConnectable} />
        <Handle type="target" position={Position.Left} id="target-left" isConnectable={isConnectable} />
        <NodeHeader title={data.label} type="MCP" typeClass="node-type-tool" />
        <div className="custom-node-body">
          <label>{t('workflow.properties.mcp')}</label>
          <div style={{ fontSize: '12px', color: 'var(--c-text-muted)', marginBottom: '8px', wordBreak: 'break-all' }}>{data.mcpName || t('workflow.nodes.notSet')}</div>
        </div>
        <PromptInput
          data={data}
          onChange={(e) => data.onChange(id, 'prompt', e.target.value)}
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
        <div className="custom-node-body" style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--c-text-muted)' }}>{data.varName ? `${data.varName} = ${data.varValue || ''}` : t('workflow.nodes.notSetVar')}</div>
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
        <div className="custom-node-body" style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '12px', color: '#ccc' }}>{data.expression || t('workflow.nodes.notSetExpr')}</div>
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
          <div style={{ fontSize: '11px', color: '#ccc', marginTop: '4px' }}>{data.condition || t('workflow.nodes.notSet')}</div>
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
          {data.noteText || t('workflow.nodes.noteHint')}
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
        <div className="swimlane-header">{data.label || t('workflow.nodes.swimLane')}</div>
      </div>
    );
  };

  const nodeTypes = useMemo(() => ({
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
  }), [t]);

  const initialNodes = useMemo(() => [
    { id: '1', type: 'startNode', position: { x: 250, y: 50 }, data: { label: t('workflow.nodes.startNode'), prompt: '' } },
  ], [t]);

  const LOCAL_STORAGE_KEY = 'eiva_workflow_data';

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [workflowId, setWorkflowId] = useState('default');
  const [workflowList, setWorkflowList] = useState([]);
  const [propertyModalNodeId, setPropertyModalNodeId] = useState(null);
  const propertyModalNode = useMemo(() => nodes.find(n => n.id === propertyModalNodeId) || null, [nodes, propertyModalNodeId]);
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
  }, [setNodes, setEdges, handleNodeDataChange, workflowId, initialNodes]);

  useEffect(() => {
    loadWorkflowData();
  }, [workflowId, loadWorkflowData]);

  const handleReload = () => {
    if (confirm(t('workflow.confirmReload'))) {
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
          alert(t('workflow.saveSuccess'));
          fetchWorkflowList();
        } else {
          alert(t('workflow.saveFailed') + data.error);
        }
      })
      .catch(err => {
        console.error('Save error:', err);
        alert(t('workflow.saveError'));
      });
  };

  const handleRun = () => {
    fetch(`http://localhost:39999/eiva/backend/api/ver-0.95/workflow/${workflowId}/run`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          alert(t('workflow.executeSuccess') + data.message);
        } else {
          alert(t('workflow.executeFailed') + data.error);
        }
      })
      .catch(err => {
        console.error(err);
        alert(t('workflow.executeError'));
      });
  };

  const handleCreateNew = () => {
    const name = prompt(t('workflow.newNodeTitle'));
    if (!name || name.trim() === '') return;

    const trimmedName = name.trim();
    setWorkflowId(trimmedName);

    // 3 node template
    const templateNodes = [
      { id: 'start_1', type: 'startNode', position: { x: 50, y: 100 }, data: { label: t('workflow.nodes.start'), prompt: '', triggerType: 'manual', onChange: handleNodeDataChange } },
      { id: 'agent_1', type: 'agentNode', position: { x: 286, y: 100 }, data: { label: t('workflow.nodes.agentPrompt'), prompt: '', modelName: 'gpt-4o', temperature: 0.7, onChange: handleNodeDataChange } },
      { id: 'end_1', type: 'endNode', position: { x: 522, y: 100 }, data: { label: t('workflow.nodes.end'), prompt: '', outputFormat: 'text', onChange: handleNodeDataChange } }
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
      alert(t('workflow.cannotDeleteDefault'));
      return;
    }
    if (confirm(t('workflow.confirmDeleteWorkflow', { name: workflowId }))) {
      fetch(`http://localhost:39999/eiva/backend/api/ver-0.95/workflow/${workflowId}`, {
        method: 'DELETE'
      })
        .then(res => res.json())
        .then(data => {
          if (data.ok) {
            alert(t('workflow.deleteSuccess'));
            setWorkflowId('default');
            fetchWorkflowList();
          } else {
            alert(t('workflow.deleteFailed') + data.error);
          }
        })
        .catch(err => {
          console.error('Delete error:', err);
          alert(t('workflow.deleteError'));
        });
    }
  };

  const deleteSelectedNode = useCallback(() => {
    if (!propertyModalNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== propertyModalNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== propertyModalNodeId && e.target !== propertyModalNodeId));
    setPropertyModalNodeId(null);
  }, [propertyModalNodeId, setNodes, setEdges]);

  const skipPaneClickRef = useRef(false);

  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({
      id: node.id,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }, [setMenu]);

  const onNodeClick = useCallback((event, node) => {
    skipPaneClickRef.current = true;
    setPropertyModalNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    if (skipPaneClickRef.current) {
      skipPaneClickRef.current = false;
      return;
    }
    setMenu(null);
    setPropertyModalNodeId(null);
  }, [setMenu]);

  const onPaneContextMenu = useCallback((event) => {
    event.preventDefault();
    setMenu(null);
  }, [setMenu]);

  const contextMenuDelete = useCallback(() => {
    if (!menu) return;
    setNodes((nds) => nds.filter((n) => n.id !== menu.id));
    setEdges((eds) => eds.filter((e) => e.source !== menu.id && e.target !== menu.id));
    if (propertyModalNodeId && propertyModalNodeId === menu.id) {
      setPropertyModalNodeId(null);
    }
    setMenu(null);
  }, [menu, propertyModalNodeId, setNodes, setEdges]);

  const changeNodeZIndex = useCallback((direction) => {
    if (!menu) return;
    setNodes((nds) => {
      const nodeIndex = nds.findIndex(n => n.id === menu.id);
      if (nodeIndex === -1) return nds;

      const nextNodes = [...nds];
      const [nodeToMove] = nextNodes.splice(nodeIndex, 1);

      if (direction === 'back') {
        nextNodes.unshift(nodeToMove);
      } else if (direction === 'front') {
        nextNodes.push(nodeToMove);
      } else if (direction === 'up') {
        const newIndex = Math.min(nextNodes.length, nodeIndex + 1);
        nextNodes.splice(newIndex, 0, nodeToMove);
      } else if (direction === 'down') {
        const newIndex = Math.max(0, nodeIndex - 1);
        nextNodes.splice(newIndex, 0, nodeToMove);
      }

      return nextNodes.map((node, index) => ({ ...node, zIndex: index }));
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

  const handleClear = () => {
    if (confirm(t('workflow.confirmClear'))) {
      setNodes([]);
      setEdges([]);
    }
  };

  const addNode = useCallback((type, label, position) => {
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
  }, [handleNodeDataChange, setNodes]);

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
      handleNodeDataChange(propertyModalNode.id, key, value);

      // Auto-update styles if noteNode autoSize is changed
      if (type === 'noteNode' && key === 'autoSize') {
        setNodes(nds => nds.map(n => {
          if (n.id === propertyModalNode.id) {
            let newStyle = { ...(n.style || {}) };
            if (value) {
              delete newStyle.width;
              delete newStyle.height;
            } else {
              if (!newStyle.width) newStyle.width = 150;
              if (!newStyle.height) newStyle.height = 150;
            }
            return { ...n, style: newStyle };
          }
          return n;
        }));
      }
    };

    const commonLabel = (
      <div className="modal-field">
        <label>{t('workflow.properties.label')}</label>
        <input type="text" value={data.label || ''} onChange={(e) => updateField('label', e.target.value)} />
      </div>
    );
    const commonPrompt = (
      <div className="modal-field">
        <label>{t('workflow.properties.prompt')}</label>
        <textarea value={data.prompt || ''} onChange={(e) => updateField('prompt', e.target.value)} placeholder={t('workflow.properties.promptPlaceholder')} />
      </div>
    );

    switch (type) {
      case 'startNode':
        return (
          <>
            {commonLabel}
            <div className="modal-field">
              <label>{t('workflow.properties.triggerType')}</label>
              <select value={data.triggerType || 'manual'} onChange={(e) => updateField('triggerType', e.target.value)} className="modal-select">
                <option value="manual">{t('workflow.properties.manual')}</option>
                <option value="schedule">{t('workflow.properties.schedule')}</option>
                <option value="webhook">{t('workflow.properties.webhook')}</option>
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
              <label>{t('workflow.properties.model')}</label>
              <select value={data.modelName || 'gpt-4o'} onChange={(e) => updateField('modelName', e.target.value)} className="modal-select">
                <option value="gpt-4o">GPT-4o</option>
                <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              </select>
            </div>
            <div className="modal-field">
              <label>{t('workflow.properties.temperature')}</label>
              <input type="number" step="0.1" min="0" max="2" value={data.temperature !== undefined ? data.temperature : 0.7} onChange={(e) => updateField('temperature', parseFloat(e.target.value))} />
            </div>
          </>
        );
      case 'toolNode':
        return (
          <>
            {commonLabel}
            <div className="modal-field">
              <label>{t('workflow.properties.toolType')}</label>
              <select value={data.toolType || 'webSearch'} onChange={(e) => updateField('toolType', e.target.value)} className="modal-select">
                <option value="webSearch">{t('workflow.properties.webSearch')}</option>
                <option value="fetchUrl">{t('workflow.properties.fetchUrl')}</option>
                <option value="calculator">{t('workflow.properties.calculator')}</option>
              </select>
            </div>
            <div className="modal-field">
              <label>{t('workflow.properties.toolParams')}</label>
              <textarea value={data.parameters || ''} onChange={(e) => updateField('parameters', e.target.value)} placeholder={t('workflow.properties.toolParamsPlaceholder')} />
            </div>
          </>
        );
      case 'skillNode':
        return (
          <>
            {commonLabel}
            <div className="modal-field">
              <label>{t('workflow.properties.skill')}</label>
              <select value={data.skillName || ''} onChange={(e) => updateField('skillName', e.target.value)} className="modal-select">
                <option value="">{t('workflow.nodes.selectPlaceholder')}</option>
                <option value="research">{t('workflow.properties.research')}</option>
                <option value="summarize">{t('workflow.properties.summarize')}</option>
                <option value="translate">{t('workflow.properties.translate')}</option>
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
              <label>{t('workflow.properties.mcp')}</label>
              <select value={data.mcpName || ''} onChange={(e) => updateField('mcpName', e.target.value)} className="modal-select">
                <option value="">{t('workflow.nodes.selectPlaceholder')}</option>
                <option value="fileSystem">{t('workflow.properties.fileSystem')}</option>
                <option value="database">{t('workflow.properties.database')}</option>
                <option value="webSearch">{t('workflow.properties.mcpWebSearch')}</option>
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
              <label>{t('workflow.properties.varName')}</label>
              <input type="text" value={data.varName || ''} onChange={(e) => updateField('varName', e.target.value)} placeholder={t('workflow.properties.varNamePlaceholder')} />
            </div>
            <div className="modal-field">
              <label>{t('workflow.properties.varValue')}</label>
              <input type="text" value={data.varValue || ''} onChange={(e) => updateField('varValue', e.target.value)} placeholder={t('workflow.properties.varValuePlaceholder')} />
            </div>
          </>
        );
      case 'calculateNode':
        return (
          <>
            {commonLabel}
            <div className="modal-field">
              <label>{t('workflow.properties.expression')}</label>
              <input type="text" value={data.expression || ''} onChange={(e) => updateField('expression', e.target.value)} placeholder={t('workflow.properties.expressionPlaceholder')} />
            </div>
          </>
        );
      case 'conditionNode':
        return (
          <>
            {commonLabel}
            <div className="modal-field">
              <label>{t('workflow.properties.condition')}</label>
              <input type="text" value={data.condition || ''} onChange={(e) => updateField('condition', e.target.value)} placeholder={t('workflow.properties.conditionPlaceholder')} />
            </div>
          </>
        );
      case 'endNode':
        return (
          <>
            {commonLabel}
            <div className="modal-field">
              <label>{t('workflow.properties.outputFormat')}</label>
              <select value={data.outputFormat || 'text'} onChange={(e) => updateField('outputFormat', e.target.value)} className="modal-select">
                <option value="text">{t('workflow.properties.text')}</option>
                <option value="json">{t('workflow.properties.json')}</option>
                <option value="markdown">{t('workflow.properties.markdown')}</option>
              </select>
            </div>
          </>
        );
      case 'swimlaneNode':
        const isVert = data.orientation === 'vertical';
        return (
          <>
            <div className="modal-field">
              <label>{t('workflow.properties.swimLaneTitle')}</label>
              <input type="text" value={data.label || ''} onChange={(e) => updateField('label', e.target.value)} placeholder={t('workflow.properties.swimLaneTitlePlaceholder')} />
            </div>
            <div className="modal-field">
              <label>{t('workflow.properties.orientation')}</label>
              <select value={data.orientation || 'horizontal'} onChange={(e) => updateField('orientation', e.target.value)} className="modal-select">
                <option value="horizontal">{t('workflow.properties.horizontal')}</option>
                <option value="vertical">{t('workflow.properties.vertical')}</option>
              </select>
            </div>
            <div className="modal-field">
              <label>{t('workflow.properties.titlePosition')}</label>
              <select value={data.titlePosition || (isVert ? 'left' : 'top')} onChange={(e) => updateField('titlePosition', e.target.value)} className="modal-select">
                {!isVert ? (
                  <>
                    <option value="top">{t('workflow.properties.top')}</option>
                    <option value="bottom">{t('workflow.properties.bottom')}</option>
                  </>
                ) : (
                  <>
                    <option value="left">{t('workflow.properties.left')}</option>
                    <option value="right">{t('workflow.properties.right')}</option>
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
              <label>{t('workflow.properties.noteContent')}</label>
              <textarea value={data.noteText || ''} onChange={(e) => updateField('noteText', e.target.value)} placeholder={t('workflow.nodes.noteHint')} style={{ minHeight: '80px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="modal-field">
                <label>{t('workflow.properties.bgColor')}</label>
                <input type="color" value={data.bgColor || '#ffeeb6'} onChange={(e) => updateField('bgColor', e.target.value)} style={{ padding: '0', height: '32px', width: '100%', cursor: 'pointer' }} />
              </div>
              <div className="modal-field">
                <label>{t('workflow.properties.fontFamily')}</label>
                <select value={data.fontFamily || '"Comic Sans MS", cursive, sans-serif'} onChange={(e) => updateField('fontFamily', e.target.value)} className="modal-select">
                  <option value='"Comic Sans MS", cursive, sans-serif'>{t('workflow.properties.handwriting')}</option>
                  <option value='sans-serif'>{t('workflow.properties.sansSerif')}</option>
                  <option value='serif'>{t('workflow.properties.serif')}</option>
                  <option value='monospace'>{t('workflow.properties.monospace')}</option>
                </select>
              </div>
              <div className="modal-field">
                <label>{t('workflow.properties.fontSize')}</label>
                <select value={data.fontSize || '14px'} onChange={(e) => updateField('fontSize', e.target.value)} className="modal-select">
                  <option value="12px">{t('workflow.properties.small')}</option>
                  <option value="14px">{t('workflow.properties.medium')}</option>
                  <option value="18px">{t('workflow.properties.large')}</option>
                  <option value="24px">{t('workflow.properties.xlarge')}</option>
                </select>
              </div>
              <div className="modal-field">
                <label>{t('workflow.properties.autoSize')}</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '32px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#fff', fontSize: '13px' }}>
                    <input type="checkbox" checked={!!data.autoSize} onChange={(e) => updateField('autoSize', e.target.checked)} />
                    {t('workflow.properties.autoSizeDesc')}
                  </label>
                </div>
              </div>
              <div className="modal-field">
                <label>{t('workflow.properties.style')}</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '32px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#fff', fontSize: '13px' }}>
                    <input type="checkbox" checked={data.fontWeight === 'bold'} onChange={(e) => updateField('fontWeight', e.target.checked ? 'bold' : 'normal')} />
                    {t('workflow.properties.bold')}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#fff', fontSize: '13px' }}>
                    <input type="checkbox" checked={data.fontStyle === 'italic'} onChange={(e) => updateField('fontStyle', e.target.checked ? 'italic' : 'normal')} />
                    {t('workflow.properties.italic')}
                  </label>
                </div>
              </div>
              <div className="modal-field">
                <label>{t('workflow.properties.textAlign')}</label>
                <select value={data.textAlign || 'left'} onChange={(e) => updateField('textAlign', e.target.value)} className="modal-select">
                  <option value="left">{t('workflow.properties.alignLeft')}</option>
                  <option value="center">{t('workflow.properties.alignCenter')}</option>
                  <option value="right">{t('workflow.properties.alignRight')}</option>
                </select>
              </div>
              <div className="modal-field">
                <label>{t('workflow.properties.verticalAlign')}</label>
                <select value={data.verticalAlign || 'flex-start'} onChange={(e) => updateField('verticalAlign', e.target.value)} className="modal-select">
                  <option value="flex-start">{t('workflow.properties.alignTop')}</option>
                  <option value="center">{t('workflow.properties.alignCenter')}</option>
                  <option value="flex-end">{t('workflow.properties.alignBottom')}</option>
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
    <div ref={editorContainerRef} className="workflow-editor-container">
      <header className="workflow-header">
        <div className="wf-header-row">
          <div className="wf-header-left">
            <div>
              <div className="wf-api-info">
                API: GET http://localhost:39999/eiva/backend/api/ver-0.95/workflow/&#123;workflow-name&#125;/run
              </div>
              <div className="wf-api-link">
                <span>👉 實際: GET</span>
                <a
                  href={`http://localhost:39999/eiva/backend/api/ver-0.95/workflow/${workflowId}/run`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t('workflow.clickToRun')}
                >
                  http://localhost:39999/eiva/backend/api/ver-0.95/workflow/{workflowId}/run
                </a>
              </div>
            </div>
            <div className="wf-header-right">
              <select
                className="wf-select"
                value={workflowId}
                onChange={(e) => setWorkflowId(e.target.value)}
              >
                {!workflowList.includes(workflowId) && <option value={workflowId}>{workflowId} ({t('workflow.unsaved')})</option>}
                {workflowList.map(id => <option key={id} value={id}>{id}</option>)}
              </select>
              <button className="wf-action-btn" onClick={handleCreateNew}>{'✨ ' + t('workflow.new')}</button>
              <button className="wf-action-btn danger" onClick={handleDeleteWorkflow}>{'❌ ' + t('workflow.delete')}</button>
            </div>
          </div>

          <div className="wf-actions">
            <button className="wf-action-btn" onClick={handleClear}>{'🗑️ ' + t('workflow.clear')}</button>
            <button className="wf-action-btn" onClick={handleReload}>{'🔄 ' + t('workflow.reload')}</button>
            <button className="wf-action-btn" onClick={handleSave}>{'💾 ' + t('workflow.save')}</button>
            <button className="wf-action-btn primary" onClick={handleRun}>{'▶️ ' + t('workflow.execute') + ' (Run)'}</button>
            <button className="wf-action-btn" onClick={toggleFullscreen}>{'⛶ ' + t('workflow.fullscreen')}</button>
          </div>
        </div>
      </header>

      <div className="workflow-main" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar: Node Palettes */}
        <div style={{ display: 'flex' }}>
          {leftSidebarOpen && (
            <aside className="workflow-sidebar left-sidebar">
              <h3>{t('workflow.newNodeTitle')}</h3>
              <button className="wf-toolbar-btn" draggable onDragStart={(e) => onDragStart(e, 'startNode', t('workflow.toolbar.start'))} onClick={() => addNode('startNode', t('workflow.toolbar.start'))} title={t('workflow.toolbar.startTitle')}>{t('workflow.toolbar.start')}</button>
              <button className="wf-toolbar-btn" draggable onDragStart={(e) => onDragStart(e, 'agentNode', t('workflow.toolbar.agent'))} onClick={() => addNode('agentNode', t('workflow.toolbar.agent'))} title={t('workflow.toolbar.agentTitle')}>{t('workflow.toolbar.agent')}</button>
              <button className="wf-toolbar-btn" draggable onDragStart={(e) => onDragStart(e, 'toolNode', t('workflow.toolbar.tool'))} onClick={() => addNode('toolNode', t('workflow.toolbar.tool'))} title={t('workflow.toolbar.toolTitle')}>{t('workflow.toolbar.tool')}</button>
              <button className="wf-toolbar-btn" draggable onDragStart={(e) => onDragStart(e, 'skillNode', t('workflow.toolbar.skill'))} onClick={() => addNode('skillNode', t('workflow.toolbar.skill'))} title={t('workflow.toolbar.skillTitle')}>{t('workflow.toolbar.skill')}</button>
              <button className="wf-toolbar-btn" draggable onDragStart={(e) => onDragStart(e, 'mcpNode', t('workflow.toolbar.mcp'))} onClick={() => addNode('mcpNode', t('workflow.toolbar.mcp'))} title={t('workflow.toolbar.mcpTitle')}>{t('workflow.toolbar.mcp')}</button>
              <button className="wf-toolbar-btn" draggable onDragStart={(e) => onDragStart(e, 'variableNode', t('workflow.toolbar.variable'))} onClick={() => addNode('variableNode', t('workflow.toolbar.variable'))} title={t('workflow.toolbar.variableTitle')}>{t('workflow.toolbar.variable')}</button>
              <button className="wf-toolbar-btn" draggable onDragStart={(e) => onDragStart(e, 'calculateNode', t('workflow.toolbar.calc'))} onClick={() => addNode('calculateNode', t('workflow.toolbar.calc'))} title={t('workflow.toolbar.calcTitle')}>{t('workflow.toolbar.calc')}</button>
              <button className="wf-toolbar-btn" draggable onDragStart={(e) => onDragStart(e, 'conditionNode', t('workflow.toolbar.cond'))} onClick={() => addNode('conditionNode', t('workflow.toolbar.cond'))} title={t('workflow.toolbar.condTitle')}>{t('workflow.toolbar.cond')}</button>
              <button className="wf-toolbar-btn" draggable onDragStart={(e) => onDragStart(e, 'endNode', t('workflow.toolbar.end'))} onClick={() => addNode('endNode', t('workflow.toolbar.end'))} title={t('workflow.toolbar.endTitle')}>{t('workflow.toolbar.end')}</button>
              <button className="wf-toolbar-btn" draggable onDragStart={(e) => onDragStart(e, 'swimlaneNode', t('workflow.toolbar.swimLane'))} onClick={() => addNode('swimlaneNode', t('workflow.toolbar.swimLane'))} title={t('workflow.toolbar.swimLaneTitle')}>{t('workflow.toolbar.swimLane')}</button>
              <button className="wf-toolbar-btn" draggable onDragStart={(e) => onDragStart(e, 'noteNode', t('workflow.toolbar.note'))} onClick={() => addNode('noteNode', t('workflow.toolbar.note'))} title={t('workflow.toolbar.noteTitle')}>{t('workflow.toolbar.note')}</button>
              <button className="wf-toolbar-btn" draggable onDragStart={(e) => onDragStart(e, 'basicNode', t('workflow.toolbar.basic'))} onClick={() => addNode('basicNode', t('workflow.toolbar.basic'))} title={t('workflow.toolbar.basicTitle')}>{t('workflow.toolbar.basic')}</button>
            </aside>
          )}
          <div
            className="wf-toggle"
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            title={leftSidebarOpen ? t('workflow.collapseToolbar') : t('workflow.expandToolbar')}
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
            onNodeClick={onNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            onPaneClick={onPaneClick}
            onPaneContextMenu={onPaneContextMenu}
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
                  default: return 'var(--c-surface-alt)';
                }
              }}
              maskColor="rgba(0,0,0,0.08)"
            />
            <Background variant="dots" gap={12} size={1} color="var(--c-border)" />
          </ReactFlow>

          {menu && createPortal(
            <div className="workflow-context-menu" style={{ position: 'fixed', top: menu.clientY, left: menu.clientX, zIndex: 9999 }}>
              <div className="menu-item" onClick={() => changeNodeZIndex('up')}>{t('workflow.contextMenu.moveUp')}</div>
              <div className="menu-item" onClick={() => changeNodeZIndex('down')}>{t('workflow.contextMenu.moveDown')}</div>
              <div className="menu-item" onClick={() => changeNodeZIndex('front')}>{t('workflow.contextMenu.moveFront')}</div>
              <div className="menu-item" onClick={() => changeNodeZIndex('back')}>{t('workflow.contextMenu.moveBack')}</div>
              <div className="workflow-context-menu-separator"></div>
              <div className="menu-item delete" onClick={contextMenuDelete}>{t('workflow.contextMenu.delete')}</div>
            </div>,
            document.body
          )}
        </div>

        {/* Right Sidebar: Property Panel */}
        <div style={{ display: 'flex' }}>
          <div
            className="wf-toggle right-sidebar-toggle"
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            title={rightSidebarOpen ? t('workflow.collapsePanel') : t('workflow.expandPanel')}
          >
            {rightSidebarOpen ? '▶' : '◀'}
          </div>
          {rightSidebarOpen && (
            <aside className="workflow-sidebar right-sidebar">
              <h3>{t('workflow.propertyTitle')}</h3>
              {propertyModalNode ? (
                <div className="property-panel-content">
                  {renderModalFields()}
                  <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    <button className="wf-delete-node-btn" onClick={deleteSelectedNode}>{'🗑️ ' + t('workflow.deleteNode')}</button>
                  </div>
                </div>
              ) : (
                <div className="wf-empty-hint">
                  {t('workflow.selectNodeHint')}
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
