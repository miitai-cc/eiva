import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from './i18n/index.jsx';

export default function SkillConfigPage() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState('');

  const fetchItems = useCallback(() => {
    fetch('http://localhost:39999/eiva/backend/api/ver-0.95/skills')
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
    const newItem = { id: `skill_${Date.now()}`, name: 'New AI Skill', description: '', prompt: '' };
    setSelectedItem(newItem);
    setFormData(JSON.stringify(newItem, null, 2));
  };

  const handleSave = () => {
    try {
      const parsed = JSON.parse(formData);
      if (!parsed.id) {
        alert(t('skill.idRequired'));
        return;
      }
      fetch(`http://localhost:39999/eiva/backend/api/ver-0.95/skill/${parsed.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      })
      .then(res => res.json())
      .then(resData => {
        if (resData.status === 'success') {
          alert(t('skill.saveSuccess'));
          fetchItems();
          setSelectedItem(parsed);
        } else {
          alert(t('skill.saveFailed') + resData.error);
        }
      })
      .catch(err => alert(t('skill.error') + err.message));
    } catch (e) {
      alert(t('skill.jsonError') + e.message);
    }
  };

  const handleDelete = (id) => {
    if (!confirm(t('skill.confirmDelete'))) return;
    fetch(`http://localhost:39999/eiva/backend/api/ver-0.95/skill/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(resData => {
        if (resData.status === 'success') {
          setSelectedItem(null);
          setFormData('');
          fetchItems();
        } else {
          alert(t('skill.deleteFailed') + resData.error);
        }
      })
      .catch(err => alert(t('skill.error') + err.message));
  };

  return (
    <div className="config-page">
      <div className="config-sidebar">
        <div className="config-sidebar-header">
          <h2>{t('skill.title')}</h2>
          <button className="config-add-btn" onClick={handleAddNew}>+ {t('skill.add')}</button>
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
          {items.length === 0 && <div className="config-empty">{t('skill.noData')}</div>}
        </div>
      </div>

      <div className="config-editor">
        {selectedItem ? (
          <div className="config-editor-inner">
            <div className="config-editor-header">
              <h2>{t('skill.editTitle')}</h2>
              <div className="config-editor-actions">
                <button className="config-delete-btn" onClick={() => handleDelete(selectedItem.id)}>{t('skill.delete')}</button>
                <button className="config-save-btn" onClick={handleSave}>{t('skill.save')}</button>
              </div>
            </div>
            <div className="config-hint">
              {t('skill.hint')}
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
            {t('skill.emptyState')}
          </div>
        )}
      </div>
    </div>
  );
}
