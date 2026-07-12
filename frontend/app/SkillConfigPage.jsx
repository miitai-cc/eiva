import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from './i18n/index.jsx';

const API_BASE = 'http://localhost:39999/eiva/backend/api/ver-0.95';

function createEmptyRow() {
  return {
    id: `skill_${Date.now()}`,
    name: '',
    description: '',
    instructions: '',
    enabled: true,
    linked_secrets: [],
    _isNew: true,
    _editing: true,
  };
}

function InstructionsPopup({ value, onChange, onClose, t }) {
  const [text, setText] = useState(value || '');

  const commit = () => { onChange(text); onClose(); };

  return (
    <div className="datagrid-popup-overlay" onClick={onClose}>
      <div className="datagrid-popup datagrid-popup-wide" onClick={(e) => e.stopPropagation()}>
        <div className="datagrid-popup-header">{t('skill.instructionsEditor')}</div>
        <textarea
          className="datagrid-popup-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck="false"
          placeholder={t('skill.instructionsPlaceholder')}
        />
        <div className="datagrid-popup-footer">
          <button className="config-save-btn" onClick={commit}>{t('skill.confirm')}</button>
          <button className="config-delete-btn" onClick={onClose}>{t('skill.cancel')}</button>
        </div>
      </div>
    </div>
  );
}

function SecretsPopup({ value, onChange, onClose, t }) {
  const [items, setItems] = useState(() => (Array.isArray(value) ? [...value] : []));
  const [draft, setDraft] = useState('');

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    setItems([...items, v]);
    setDraft('');
  };
  const remove = (i) => setItems(items.filter((_, idx) => idx !== i));
  const commit = () => { onChange(items); onClose(); };

  return (
    <div className="datagrid-popup-overlay" onClick={onClose}>
      <div className="datagrid-popup" onClick={(e) => e.stopPropagation()}>
        <div className="datagrid-popup-header">{t('skill.secretsEditor')}</div>
        <div className="datagrid-popup-list">
          {items.map((item, i) => (
            <div key={i} className="datagrid-popup-item">
              <span className="datagrid-popup-item-text">{item}</span>
              <button className="datagrid-popup-item-remove" onClick={() => remove(i)}>×</button>
            </div>
          ))}
          {items.length === 0 && <div className="datagrid-popup-empty">{t('skill.noData')}</div>}
        </div>
        <div className="datagrid-popup-add">
          <input
            className="datagrid-popup-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
            placeholder={t('skill.addSecret')}
          />
          <button className="datagrid-popup-add-btn" onClick={add}>+</button>
        </div>
        <div className="datagrid-popup-footer">
          <button className="config-save-btn" onClick={commit}>{t('skill.confirm')}</button>
          <button className="config-delete-btn" onClick={onClose}>{t('skill.cancel')}</button>
        </div>
      </div>
    </div>
  );
}

export default function SkillConfigPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState([]);
  const [popup, setPopup] = useState(null);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [testResults, setTestResults] = useState({});
  const [testingId, setTestingId] = useState(null);

  const fetchItems = useCallback(() => {
    fetch(`${API_BASE}/skills`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRows(data.map((d) => ({ ...d, _isNew: false, _editing: false })));
        }
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const sortedRows = React.useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      if (typeof av === 'boolean') return sortDir === 'asc' ? (av === bv ? 0 : av ? -1 : 1) : (av === bv ? 0 : av ? 1 : -1);
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [rows, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const updateRow = (index, field, value) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const handleAdd = () => {
    setRows((prev) => [createEmptyRow(), ...prev]);
  };

  const handleSave = async (index) => {
    const row = rows[index];
    const body = {
      name: row.name || '',
      description: row.description || '',
      instructions: row.instructions || '',
      enabled: !!row.enabled,
      linked_secrets: Array.isArray(row.linked_secrets) ? row.linked_secrets : [],
    };
    try {
      const res = await fetch(`${API_BASE}/skill/${row.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...body, _isNew: false, _editing: false } : r)));
      } else {
        alert(t('skill.saveFailed') + (data.error || ''));
      }
    } catch (err) {
      alert(t('skill.error') + err.message);
    }
  };

  const handleDelete = async (index) => {
    const row = rows[index];
    if (!window.confirm(t('skill.confirmDelete'))) return;
    if (row._isNew) {
      setRows((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/skill/${row.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') {
        setRows((prev) => prev.filter((_, i) => i !== index));
      } else {
        alert(t('skill.deleteFailed') + (data.error || ''));
      }
    } catch (err) {
      alert(t('skill.error') + err.message);
    }
  };

  const toggleEdit = (index) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, _editing: !r._editing } : r)));
  };

  const handleTest = async (index) => {
    const row = rows[index];
    if (row._isNew) return;
    setTestingId(row.id);
    setTestResults((prev) => ({ ...prev, [row.id]: null }));
    try {
      const res = await fetch(`${API_BASE}/skill/${row.id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResults((prev) => ({ ...prev, [row.id]: data }));
    } catch (err) {
      setTestResults((prev) => ({ ...prev, [row.id]: { status: 'error', error: err.message } }));
    } finally {
      setTestingId(null);
    }
  };

  const SortIndicator = ({ columnKey }) => {
    if (sortKey !== columnKey) return <span className="datagrid-sort-indicator">⇅</span>;
    return <span className="datagrid-sort-indicator active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="datagrid-container">
      <div className="datagrid-toolbar">
        <h2>{t('skill.title')}</h2>
        <button className="config-add-btn" onClick={handleAdd}>+ {t('skill.addRow')}</button>
      </div>

      <div className="datagrid-wrapper">
        <table className="datagrid">
          <thead>
            <tr>
              <th className="datagrid-th sortable" onClick={() => handleSort('name')}>
                {t('skill.colName')} <SortIndicator columnKey="name" />
              </th>
              <th className="datagrid-th sortable" onClick={() => handleSort('description')}>
                {t('skill.colDescription')} <SortIndicator columnKey="description" />
              </th>
              <th className="datagrid-th">{t('skill.colInstructions')}</th>
              <th className="datagrid-th sortable" onClick={() => handleSort('enabled')}>
                {t('skill.colEnabled')} <SortIndicator columnKey="enabled" />
              </th>
              <th className="datagrid-th">{t('skill.colSecrets')}</th>
              <th className="datagrid-th">{t('skill.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 && (
              <tr>
                <td colSpan={6} className="datagrid-empty">{t('skill.noData')}</td>
              </tr>
            )}
            {sortedRows.map((row, idx) => {
              const realIdx = rows.indexOf(row);
              const editing = row._editing;
              return (
                <tr key={row.id} className={`datagrid-row ${editing ? 'editing' : ''} ${row._isNew ? 'new' : ''}`}>
                  <td className="datagrid-cell">
                    {editing ? (
                      <input className="datagrid-input" value={row.name || ''}
                        onChange={(e) => updateRow(realIdx, 'name', e.target.value)} />
                    ) : (
                      <span className="datagrid-cell-text">{row.name || <span className="datagrid-cell-empty">—</span>}</span>
                    )}
                  </td>
                  <td className="datagrid-cell">
                    {editing ? (
                      <input className="datagrid-input" value={row.description || ''}
                        onChange={(e) => updateRow(realIdx, 'description', e.target.value)} />
                    ) : (
                      <span className="datagrid-cell-text">{row.description || <span className="datagrid-cell-empty">—</span>}</span>
                    )}
                  </td>
                  <td className="datagrid-cell">
                    <button className="datagrid-tag-btn" onClick={() => setPopup({ rowIndex: realIdx, type: 'instructions' })}>
                      {row.instructions ? `[${row.instructions.length} ${t('skill.chars')}]` : `[0]`}
                    </button>
                  </td>
                  <td className="datagrid-cell center">
                    <label className="datagrid-toggle">
                      <input type="checkbox" checked={!!row.enabled}
                        onChange={(e) => updateRow(realIdx, 'enabled', e.target.checked)} />
                      <span className="datagrid-toggle-slider"></span>
                    </label>
                  </td>
                  <td className="datagrid-cell">
                    <button className="datagrid-tag-btn" onClick={() => setPopup({ rowIndex: realIdx, type: 'secrets' })}>
                      {Array.isArray(row.linked_secrets) ? `[${row.linked_secrets.length} ${t('skill.secretsCount')}]` : '[0]'}
                    </button>
                  </td>
                  <td className="datagrid-cell actions">
                    {editing ? (
                      <>
                        <button className="datagrid-action-btn save" onClick={() => handleSave(realIdx)}>{t('skill.saveRow')}</button>
                        {!row._isNew && <button className="datagrid-action-btn" onClick={() => toggleEdit(realIdx)}>{t('skill.cancel')}</button>}
                        <button className="datagrid-action-btn danger" onClick={() => handleDelete(realIdx)}>{t('skill.deleteRow')}</button>
                      </>
                    ) : (
                      <>
                        <button className="datagrid-action-btn" onClick={() => toggleEdit(realIdx)}>{t('skill.edit')}</button>
                        {!row._isNew && (
                          <button
                            className={`datagrid-action-btn test ${testingId === row.id ? 'testing' : ''}`}
                            onClick={() => handleTest(realIdx)}
                            disabled={testingId === row.id}
                          >
                            {testingId === row.id ? t('skill.testing') : t('skill.test')}
                          </button>
                        )}
                        <button className="datagrid-action-btn danger" onClick={() => handleDelete(realIdx)}>{t('skill.deleteRow')}</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {Object.keys(testResults).length > 0 && (
        <div className="datagrid-test-results">
          <div className="datagrid-test-results-header">{t('skill.testResults')}</div>
          {Object.entries(testResults).map(([rowId, result]) => {
            if (!result) return null;
            const row = rows.find((r) => r.id === rowId);
            return (
              <div key={rowId} className={`datagrid-test-result ${result.status}`}>
                <div className="datagrid-test-result-title">
                  <span className="datagrid-test-result-name">{row?.name || rowId}</span>
                  <span className={`datagrid-test-result-badge ${result.status}`}>
                    {result.status === 'success' ? '✓' : '✗'}
                  </span>
                  <button className="datagrid-test-result-close" onClick={() => setTestResults((prev) => { const n = { ...prev }; delete n[rowId]; return n; })}>×</button>
                </div>
                {result.status === 'success' && (
                  <div className="datagrid-test-result-detail">
                    {t('skill.testPassed')}
                    {result.warnings && result.warnings.length > 0 && (
                      <div className="datagrid-test-warnings">
                        {result.warnings.map((w, i) => (
                          <div key={i} className="datagrid-test-warning">⚠ {w}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {result.status === 'error' && (
                  <div className="datagrid-test-result-detail error">
                    {result.errors && result.errors.map((e, i) => (
                      <div key={i}>✗ {e}</div>
                    ))}
                    {result.warnings && result.warnings.length > 0 && (
                      <div className="datagrid-test-warnings">
                        {result.warnings.map((w, i) => (
                          <div key={i} className="datagrid-test-warning">⚠ {w}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {popup && popup.type === 'instructions' && (
        <InstructionsPopup
          value={rows[popup.rowIndex]?.instructions}
          onChange={(v) => updateRow(popup.rowIndex, 'instructions', v)}
          onClose={() => setPopup(null)}
          t={t}
        />
      )}
      {popup && popup.type === 'secrets' && (
        <SecretsPopup
          value={rows[popup.rowIndex]?.linked_secrets}
          onChange={(v) => updateRow(popup.rowIndex, 'linked_secrets', v)}
          onClose={() => setPopup(null)}
          t={t}
        />
      )}
    </div>
  );
}
