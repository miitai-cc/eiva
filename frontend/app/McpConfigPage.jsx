import React, { useState, useEffect, useCallback } from 'react';

export default function McpConfigPage() {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState('');

  const fetchItems = useCallback(() => {
    fetch('http://localhost:39999/eiva/backend/api/ver-0.95/mcp-servers')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSelect = (item) => {
    setSelectedItem(item);
    setFormData(JSON.stringify(item, null, 2));
  };

  const handleAddNew = () => {
    const newItem = { id: `mcp_${Date.now()}`, name: 'New MCP Server', command: '', args: [] };
    setSelectedItem(newItem);
    setFormData(JSON.stringify(newItem, null, 2));
  };

  const handleSave = () => {
    try {
      const parsed = JSON.parse(formData);
      if (!parsed.id) {
        alert('ID 欄位不可為空！');
        return;
      }
      fetch(`http://localhost:39999/eiva/backend/api/ver-0.95/mcp-server/${parsed.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      })
      .then(res => res.json())
      .then(resData => {
        if (resData.status === 'success') {
          alert('儲存成功！');
          fetchItems();
          setSelectedItem(parsed);
        } else {
          alert('儲存失敗：' + resData.error);
        }
      })
      .catch(err => alert('發生錯誤：' + err.message));
    } catch (e) {
      alert('JSON 格式錯誤：' + e.message);
    }
  };

  const handleDelete = (id) => {
    if (!confirm('確定要刪除嗎？')) return;
    fetch(`http://localhost:39999/eiva/backend/api/ver-0.95/mcp-server/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(resData => {
        if (resData.status === 'success') {
          setSelectedItem(null);
          setFormData('');
          fetchItems();
        } else {
          alert('刪除失敗：' + resData.error);
        }
      })
      .catch(err => alert('發生錯誤：' + err.message));
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', backgroundColor: '#111', color: '#eee' }}>
      {/* Left Sidebar: List */}
      <div style={{ width: '300px', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '16px' }}>MCP 伺服器</h2>
          <button onClick={handleAddNew} style={{ padding: '4px 8px', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>➕ 新增</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {items.map(item => (
            <div 
              key={item.id} 
              onClick={() => handleSelect(item)}
              style={{ padding: '12px 16px', borderBottom: '1px solid #222', cursor: 'pointer', backgroundColor: selectedItem?.id === item.id ? '#2a2a2a' : 'transparent' }}
            >
              <div style={{ fontWeight: 'bold' }}>{item.name || item.id}</div>
              <div style={{ fontSize: '12px', color: '#888' }}>{item.id}</div>
            </div>
          ))}
          {items.length === 0 && <div style={{ padding: '16px', color: '#666', textAlign: 'center' }}>尚無資料</div>}
        </div>
      </div>

      {/* Right Content: Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' }}>
        {selectedItem ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>編輯 MCP 伺服器設定</h2>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => handleDelete(selectedItem.id)} style={{ padding: '8px 16px', backgroundColor: 'transparent', color: '#ff4444', border: '1px solid #ff4444', borderRadius: '4px', cursor: 'pointer' }}>🗑️ 刪除</button>
                <button onClick={handleSave} style={{ padding: '8px 16px', backgroundColor: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>💾 儲存</button>
              </div>
            </div>
            <div style={{ marginBottom: '8px', color: '#aaa', fontSize: '13px' }}>
              請使用 JSON 格式設定 MCP 伺服器（必須包含 "id" 欄位）。
            </div>
            <textarea 
              value={formData} 
              onChange={e => setFormData(e.target.value)}
              style={{ flex: 1, width: '100%', backgroundColor: '#1e1e1e', color: '#d4d4d4', border: '1px solid #333', borderRadius: '4px', padding: '16px', fontFamily: 'monospace', fontSize: '14px', resize: 'none', outline: 'none' }}
              spellCheck="false"
            />
          </div>
        ) : (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
            請從左側選擇或新增一個 MCP 伺服器
          </div>
        )}
      </div>
    </div>
  );
}
