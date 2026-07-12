import React, { useState, useEffect } from 'react';
import { useI18n } from './i18n';

const API_BASE = `${window.location.protocol}//${window.location.hostname}:39999/eiva/backend/api/ver-0.95`;

function createEmptyAiModelRow() {
  return {
    id: `aimodel_${Date.now()}`,
    provider: 'Claude',
    name: '',
    api_key: '',
    base_url: '',
    enabled: true,
    extra_params: {},
    _isNew: true,
    _editing: true,
  };
}

function SortIndicator({ columnKey }) {
  // Simple indicator placeholder
  return <span style={{ fontSize: '10px', marginLeft: '4px', opacity: 0.5 }}>↕</span>;
}

function AiModelConfigTab({ t }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/ai-model`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        throw new Error('Failed to fetch AI models');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = () => {
    setData([createEmptyAiModelRow(), ...data]);
  };

  const updateRow = (index, field, value) => {
    const newData = [...data];
    newData[index][field] = value;
    setData(newData);
  };

  const saveRow = async (index) => {
    const row = data[index];
    if (!row.name || !row.provider) {
      alert(t('aiModel.requiredFields') || 'Provider and Name are required');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/ai-model/${encodeURIComponent(row.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: row.id,
          provider: row.provider,
          name: row.name,
          api_key: row.api_key,
          base_url: row.base_url,
          enabled: row.enabled,
          extra_params: JSON.stringify(row.extra_params || {})
        })
      });
      if (res.ok) {
        const newData = [...data];
        newData[index]._isNew = false;
        newData[index]._editing = false;
        setData(newData);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save AI model');
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const deleteRow = async (index) => {
    const row = data[index];
    if (row._isNew) {
      setData(data.filter((_, i) => i !== index));
      return;
    }
    if (!window.confirm((t('aiModel.confirmDelete') || 'Are you sure you want to delete this model?'))) return;
    try {
      const res = await fetch(`${API_BASE}/ai-model/${encodeURIComponent(row.id)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setData(data.filter((_, i) => i !== index));
      } else {
        alert('Failed to delete');
      }
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="datagrid-container">
      <div className="datagrid-toolbar">
        <h2>{t('aiModel.title') || 'AI Model Settings'}</h2>
        <button className="config-add-btn" onClick={handleAdd}>+ {t('aiModel.addRow') || 'Add Model'}</button>
      </div>
      {error && <div style={{ color: 'red', padding: '10px' }}>{error}</div>}
      <div className="datagrid-wrapper">
        <table className="datagrid">
          <thead>
            <tr>
              <th className="datagrid-th">{t('aiModel.provider') || 'Provider'}</th>
              <th className="datagrid-th">{t('aiModel.name') || 'Name'}</th>
              <th className="datagrid-th">{t('aiModel.apiKey') || 'API Key / Token'}</th>
              <th className="datagrid-th">{t('aiModel.baseUrl') || 'Base URL'}</th>
              <th className="datagrid-th">{t('aiModel.enabled') || 'Enabled'}</th>
              <th className="datagrid-th" style={{ width: '140px', textAlign: 'center' }}>{t('mcp.actions') || 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="datagrid-cell-empty" style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="6" className="datagrid-cell-empty" style={{ textAlign: 'center', padding: '20px' }}>No models configured.</td></tr>
            ) : (
              data.map((row, idx) => {
                const editing = row._editing;
                return (
                  <tr key={row.id} className={`datagrid-row ${editing ? 'editing' : ''} ${row._isNew ? 'new' : ''}`}>
                    <td className="datagrid-cell">
                      {editing ? (
                        <select className="datagrid-input" value={row.provider} onChange={(e) => updateRow(idx, 'provider', e.target.value)}>
                          <option value="Claude">Claude</option>
                          <option value="OpenAPI">OpenAPI</option>
                          <option value="Gemini">Gemini</option>
                          <option value="LLAMA">LLAMA</option>
                          <option value="LLAMA.cpp">LLAMA.cpp</option>
                          <option value="Deepseek">Deepseek</option>
                          <option value="MiMO">MiMO</option>
                          <option value="Minimax">Minimax</option>
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        <span className="datagrid-cell-text">{row.provider}</span>
                      )}
                    </td>
                    <td className="datagrid-cell">
                      {editing ? (
                        <input className="datagrid-input" value={row.name} onChange={(e) => updateRow(idx, 'name', e.target.value)} placeholder="e.g. gpt-4" />
                      ) : (
                        <span className="datagrid-cell-text">{row.name}</span>
                      )}
                    </td>
                    <td className="datagrid-cell">
                      {editing ? (
                        <input className="datagrid-input" type="password" value={row.api_key} onChange={(e) => updateRow(idx, 'api_key', e.target.value)} placeholder="sk-..." />
                      ) : (
                        <span className="datagrid-cell-text">{row.api_key ? '••••••••' : <span className="datagrid-cell-empty">—</span>}</span>
                      )}
                    </td>
                    <td className="datagrid-cell">
                      {editing ? (
                        <input className="datagrid-input" value={row.base_url} onChange={(e) => updateRow(idx, 'base_url', e.target.value)} placeholder="https://..." />
                      ) : (
                        <span className="datagrid-cell-text">{row.base_url || <span className="datagrid-cell-empty">—</span>}</span>
                      )}
                    </td>
                    <td className="datagrid-cell" style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={row.enabled} onChange={(e) => {
                        if (editing) updateRow(idx, 'enabled', e.target.checked);
                        else {
                          const nd = [...data];
                          nd[idx].enabled = e.target.checked;
                          setData(nd);
                          saveRow(idx);
                        }
                      }} disabled={!editing} />
                    </td>
                    <td className="datagrid-cell" style={{ textAlign: 'center' }}>
                      {editing ? (
                        <div className="datagrid-actions">
                          <button className="datagrid-action-btn primary" onClick={() => saveRow(idx)}>{t('mcp.saveRow') || 'Save'}</button>
                          <button className="datagrid-action-btn" onClick={() => {
                            if (row._isNew) deleteRow(idx);
                            else {
                              const nd = [...data];
                              nd[idx]._editing = false;
                              setData(nd);
                              fetchData();
                            }
                          }}>{t('mcp.cancel') || 'Cancel'}</button>
                        </div>
                      ) : (
                        <div className="datagrid-actions">
                          <button className="datagrid-action-btn" onClick={() => updateRow(idx, '_editing', true)}>{t('mcp.edit') || 'Edit'}</button>
                          <button className="datagrid-action-btn danger" onClick={() => deleteRow(idx)}>{t('mcp.deleteRow') || 'Delete'}</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SystemConfigPage({
  systemSettings,
  updateSystemSetting,
  clearSystemSetting,
  systemSettingFields,
  t
}) {
  const [activeTab, setActiveTab] = useState('context'); // 'context' | 'aimodel'

  return (
    <article className="message assistant-message settings-message" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="settings-tabs">
        <button 
          className={`settings-tab-btn ${activeTab === 'context' ? 'active' : ''}`}
          onClick={() => setActiveTab('context')}
        >
          {t('systemSettings.contextTab') || '上下文'}
        </button>
        <button 
          className={`settings-tab-btn ${activeTab === 'aimodel' ? 'active' : ''}`}
          onClick={() => setActiveTab('aimodel')}
        >
          {t('systemSettings.aiModelTab') || 'AI Model'}
        </button>
      </div>

      <div className="settings-tab-content" style={{ flexGrow: 1, overflowY: 'auto' }}>
        {activeTab === 'context' && (
          <>
            <div className="message-title" style={{ padding: '0 20px', marginTop: '20px' }}>
              <span>{t('chat.systemSettingsTitle')}</span>
            </div>
            <div className="settings-form" style={{ padding: '0 20px 20px 20px' }}>
              {systemSettingFields.map((field) => (
                <div className="settings-field" key={field.key}>
                  <span className="settings-field-header">
                    <label className="settings-label" htmlFor={`system-setting-${field.key}`}>
                      {field.label}
                    </label>
                  </span>
                  <span className="settings-description">{field.description}</span>
                  <div className="settings-input-wrap">
                    <textarea
                      id={`system-setting-${field.key}`}
                      value={systemSettings[field.key]}
                      onChange={(event) => updateSystemSetting(field.key, event.target.value)}
                      placeholder={field.key === 'prefixPrompt' ? t('prompts.enterPrefix') :
                                   field.key === 'suffixPrompt' ? t('prompts.enterSuffix') :
                                   field.key === 'roleDefinition' ? t('prompts.enterRole') :
                                   field.key === 'shortDescription' ? t('prompts.enterShortDesc') :
                                   t('prompts.enterUsageTiming')}
                      rows={field.key === 'shortDescription' ? 2 : 4}
                    />
                    <button
                      className="settings-clear-button"
                      type="button"
                      onClick={() => clearSystemSetting(field.key)}
                    >
                      {t('prompts.clearContent')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'aimodel' && (
          <div style={{ padding: '20px', height: '100%', boxSizing: 'border-box' }}>
            <AiModelConfigTab t={t} />
          </div>
        )}
      </div>
    </article>
  );
}
