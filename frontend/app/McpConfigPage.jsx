import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from './i18n/index.jsx';

export default function McpConfigPage() {
  const { t } = useI18n();
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
        alert(t('mcp.idRequired'));
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
          alert(t('mcp.saveSuccess'));
          fetchItems();
          setSelectedItem(parsed);
        } else {
          alert(t('mcp.saveFailed') + resData.error);
        }
      })
      .catch(err => alert(t('mcp.error') + err.message));
    } catch (e) {
      alert(t('mcp.jsonError') + e.message);
    }
  };

  const handleDelete = (id) => {
    if (!confirm(t('mcp.confirmDelete'))) return;
    fetch(`http://localhost:39999/eiva/backend/api/ver-0.95/mcp-server/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(resData => {
        if (resData.status === 'success') {
          setSelectedItem(null);
          setFormData('');
          fetchItems();
        } else {
          alert(t('mcp.deleteFailed') + resData.error);
        }
      })
      .catch(err => alert(t('mcp.error') + err.message));
  };

  return (
    <div className="config-page">
      <div className="config-sidebar">
        <div className="config-sidebar-header">
          <h2>{t('mcp.title')}</h2>
          <button className="config-add-btn" onClick={handleAddNew}>+ {t('mcp.add')}</button>
        </div>
        <div className="config-sidebar-list">
          {items.map(item => (
            <div
              key={item.id}
              className={`config-sidebar-item ${selectedItem?.id === item.id ? 'active' : ''}`}
              onClick={() => handleSelect(item)}
            >
              <div className="config-sidebar-item-name">{item.name || item.id}</div>
              <div className="config-sidebar-item-id">{item.id}</div>
            </div>
          ))}
          {items.length === 0 && <div className="config-empty">{t('mcp.noData')}</div>}
        </div>
      </div>

      <div className="config-editor">
        {selectedItem ? (
          <div className="config-editor-inner">
            <div className="config-editor-header">
              <h2>{t('mcp.editTitle')}</h2>
              <div className="config-editor-actions">
                <button className="config-delete-btn" onClick={() => handleDelete(selectedItem.id)}>{t('mcp.delete')}</button>
                <button className="config-save-btn" onClick={handleSave}>{t('mcp.save')}</button>
              </div>
            </div>
            <div className="config-hint">
              {t('mcp.hint')}
            </div>
            <textarea
              className="config-textarea"
              value={formData}
              onChange={e => setFormData(e.target.value)}
              spellCheck="false"
            />
          </div>
        ) : (
          <div className="config-empty-state">
            {t('mcp.emptyState')}
          </div>
        )}
      </div>
    </div>
  );
}
