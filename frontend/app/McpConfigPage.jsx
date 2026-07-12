import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from './i18n/index.jsx';

const API_BASE = 'http://localhost:39999/eiva/backend/api/ver-0.95';

function createEmptyRow() {
  return {
    id: `mcp_${Date.now()}`,
    name: '',
    command: '',
    args: [],
    env: {},
    cwd: '',
    enabled: true,
    timeout_secs: 30,
    _isNew: true,
    _editing: true,
  };
}

function ArgsPopup({ value, onChange, onClose, t }) {
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
        <div className="datagrid-popup-header">{t('mcp.argsEditor')}</div>
        <div className="datagrid-popup-list">
          {items.map((item, i) => (
            <div key={i} className="datagrid-popup-item">
              <span className="datagrid-popup-item-text">{item}</span>
              <button className="datagrid-popup-item-remove" onClick={() => remove(i)}>×</button>
            </div>
          ))}
          {items.length === 0 && <div className="datagrid-popup-empty">{t('mcp.noData')}</div>}
        </div>
        <div className="datagrid-popup-add">
          <input
            className="datagrid-popup-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
            placeholder={t('mcp.addArg')}
          />
          <button className="datagrid-popup-add-btn" onClick={add}>+</button>
        </div>
        <div className="datagrid-popup-footer">
          <button className="config-save-btn" onClick={commit}>{t('mcp.confirm')}</button>
          <button className="config-delete-btn" onClick={onClose}>{t('mcp.cancel')}</button>
        </div>
      </div>
    </div>
  );
}

function EnvPopup({ value, onChange, onClose, t }) {
  const [pairs, setPairs] = useState(() => {
    if (value && typeof value === 'object') return Object.entries(value).map(([k, v]) => ({ key: k, val: String(v) }));
    return [];
  });
  const [draftKey, setDraftKey] = useState('');
  const [draftVal, setDraftVal] = useState('');

  const add = () => {
    const k = draftKey.trim();
    if (!k) return;
    setPairs([...pairs, { key: k, val: draftVal }]);
    setDraftKey('');
    setDraftVal('');
  };
  const remove = (i) => setPairs(pairs.filter((_, idx) => idx !== i));
  const commit = () => {
    const obj = {};
    pairs.forEach((p) => { obj[p.key] = p.val; });
    onChange(obj);
    onClose();
  };

  return (
    <div className="datagrid-popup-overlay" onClick={onClose}>
      <div className="datagrid-popup" onClick={(e) => e.stopPropagation()}>
        <div className="datagrid-popup-header">{t('mcp.envEditor')}</div>
        <div className="datagrid-popup-table">
          <div className="datagrid-popup-table-header">
            <span>{t('mcp.key')}</span>
            <span>{t('mcp.value')}</span>
            <span></span>
          </div>
          {pairs.map((p, i) => (
            <div key={i} className="datagrid-popup-table-row">
              <span className="datagrid-popup-table-cell mono">{p.key}</span>
              <span className="datagrid-popup-table-cell mono">{p.val}</span>
              <button className="datagrid-popup-item-remove" onClick={() => remove(i)}>×</button>
            </div>
          ))}
          {pairs.length === 0 && <div className="datagrid-popup-empty">{t('mcp.noData')}</div>}
        </div>
        <div className="datagrid-popup-add-env">
          <input
            className="datagrid-popup-input"
            value={draftKey}
            onChange={(e) => setDraftKey(e.target.value)}
            placeholder={t('mcp.key')}
          />
          <input
            className="datagrid-popup-input"
            value={draftVal}
            onChange={(e) => setDraftVal(e.target.value)}
            placeholder={t('mcp.value')}
          />
          <button className="datagrid-popup-add-btn" onClick={add}>+</button>
        </div>
        <div className="datagrid-popup-footer">
          <button className="config-save-btn" onClick={commit}>{t('mcp.confirm')}</button>
          <button className="config-delete-btn" onClick={onClose}>{t('mcp.cancel')}</button>
        </div>
      </div>
    </div>
  );
}

export default function McpConfigPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState([]);
  const [popup, setPopup] = useState(null); // { rowIndex, type: 'args'|'env' }
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [testResults, setTestResults] = useState({}); // { [rowId]: { status, tools, error } }
  const [testingId, setTestingId] = useState(null);

  const fetchItems = useCallback(() => {
    fetch(`${API_BASE}/mcp-servers`)
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
    const sorted = [...rows].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      if (typeof av === 'boolean') return sortDir === 'asc' ? (av === bv ? 0 : av ? -1 : 1) : (av === bv ? 0 : av ? 1 : -1);
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return sorted;
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
      command: row.command || '',
      args: Array.isArray(row.args) ? row.args : [],
      env: row.env && typeof row.env === 'object' ? row.env : {},
      cwd: row.cwd || null,
      enabled: !!row.enabled,
      timeout_secs: Number(row.timeout_secs) || 30,
    };
    try {
      const res = await fetch(`${API_BASE}/mcp-server/${row.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...body, _isNew: false, _editing: false } : r)));
      } else {
        alert(t('mcp.saveFailed') + (data.error || ''));
      }
    } catch (err) {
      alert(t('mcp.error') + err.message);
    }
  };

  const handleDelete = async (index) => {
    const row = rows[index];
    if (!window.confirm(t('mcp.confirmDelete'))) return;
    if (row._isNew) {
      setRows((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/mcp-server/${row.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') {
        setRows((prev) => prev.filter((_, i) => i !== index));
      } else {
        alert(t('mcp.deleteFailed') + (data.error || ''));
      }
    } catch (err) {
      alert(t('mcp.error') + err.message);
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
      const res = await fetch(`${API_BASE}/mcp-server/${row.id}/test`, { method: 'POST' });
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
        <h2>{t('mcp.title')}</h2>
        <button className="config-add-btn" onClick={handleAdd}>+ {t('mcp.addRow')}</button>
      </div>

      <div className="datagrid-wrapper">
        <table className="datagrid">
          <thead>
            <tr>
              <th className="datagrid-th sortable" onClick={() => handleSort('name')}>
                {t('mcp.colName')} <SortIndicator columnKey="name" />
              </th>
              <th className="datagrid-th sortable" onClick={() => handleSort('command')}>
                {t('mcp.colCommand')} <SortIndicator columnKey="command" />
              </th>
              <th className="datagrid-th">{t('mcp.colArgs')}</th>
              <th className="datagrid-th">{t('mcp.colEnv')}</th>
              <th className="datagrid-th sortable" onClick={() => handleSort('cwd')}>
                {t('mcp.colCwd')} <SortIndicator columnKey="cwd" />
              </th>
              <th className="datagrid-th sortable" onClick={() => handleSort('enabled')}>
                {t('mcp.colEnabled')} <SortIndicator columnKey="enabled" />
              </th>
              <th className="datagrid-th sortable" onClick={() => handleSort('timeout_secs')}>
                {t('mcp.colTimeout')} <SortIndicator columnKey="timeout_secs" />
              </th>
              <th className="datagrid-th">{t('mcp.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 && (
              <tr>
                <td colSpan={8} className="datagrid-empty">{t('mcp.noData')}</td>
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
                      <input className="datagrid-input mono" value={row.command || ''}
                        onChange={(e) => updateRow(realIdx, 'command', e.target.value)} />
                    ) : (
                      <span className="datagrid-cell-text mono">{row.command || <span className="datagrid-cell-empty">—</span>}</span>
                    )}
                  </td>
                  <td className="datagrid-cell">
                    <button className="datagrid-tag-btn" onClick={() => setPopup({ rowIndex: realIdx, type: 'args' })}>
                      {Array.isArray(row.args) ? `[${row.args.length} ${t('mcp.argsCount')}]` : '[0]'}
                    </button>
                  </td>
                  <td className="datagrid-cell">
                    <button className="datagrid-tag-btn" onClick={() => setPopup({ rowIndex: realIdx, type: 'env' })}>
                      {row.env && typeof row.env === 'object' ? `[${Object.keys(row.env).length} ${t('mcp.envCount')}]` : '[0]'}
                    </button>
                  </td>
                  <td className="datagrid-cell">
                    {editing ? (
                      <input className="datagrid-input mono" value={row.cwd || ''}
                        onChange={(e) => updateRow(realIdx, 'cwd', e.target.value)} />
                    ) : (
                      <span className="datagrid-cell-text mono">{row.cwd || <span className="datagrid-cell-empty">—</span>}</span>
                    )}
                  </td>
                  <td className="datagrid-cell center">
                    <label className="datagrid-toggle">
                      <input type="checkbox" checked={!!row.enabled}
                        onChange={(e) => updateRow(realIdx, 'enabled', e.target.checked)} />
                      <span className="datagrid-toggle-slider"></span>
                    </label>
                  </td>
                  <td className="datagrid-cell">
                    {editing ? (
                      <input className="datagrid-input num" type="number" min={1} value={row.timeout_secs || 30}
                        onChange={(e) => updateRow(realIdx, 'timeout_secs', parseInt(e.target.value, 10) || 30)} />
                    ) : (
                      <span className="datagrid-cell-text">{row.timeout_secs ?? 30}s</span>
                    )}
                  </td>
                  <td className="datagrid-cell actions">
                    {editing ? (
                      <>
                        <button className="datagrid-action-btn save" onClick={() => handleSave(realIdx)}>{t('mcp.saveRow')}</button>
                        {!row._isNew && <button className="datagrid-action-btn" onClick={() => toggleEdit(realIdx)}>{t('mcp.cancel')}</button>}
                        <button className="datagrid-action-btn danger" onClick={() => handleDelete(realIdx)}>{t('mcp.deleteRow')}</button>
                      </>
                    ) : (
                      <>
                        <button className="datagrid-action-btn" onClick={() => toggleEdit(realIdx)}>{t('mcp.edit')}</button>
                        {!row._isNew && (
                          <button
                            className={`datagrid-action-btn test ${testingId === row.id ? 'testing' : ''}`}
                            onClick={() => handleTest(realIdx)}
                            disabled={testingId === row.id}
                          >
                            {testingId === row.id ? t('mcp.testing') : t('mcp.test')}
                          </button>
                        )}
                        <button className="datagrid-action-btn danger" onClick={() => handleDelete(realIdx)}>{t('mcp.deleteRow')}</button>
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
          <div className="datagrid-test-results-header">{t('mcp.testResults')}</div>
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
                    {t('mcp.testConnected')} — {result.tool_count} {t('mcp.testToolsFound')}
                    {result.tools && result.tools.length > 0 && (
                      <div className="datagrid-test-result-tools">
                        {result.tools.map((tool, i) => (
                          <span key={i} className="datagrid-test-tool-tag">{tool}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {result.status === 'error' && (
                  <div className="datagrid-test-result-detail error">{result.error}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {popup && popup.type === 'args' && (
        <ArgsPopup
          value={rows[popup.rowIndex]?.args}
          onChange={(v) => updateRow(popup.rowIndex, 'args', v)}
          onClose={() => setPopup(null)}
          t={t}
        />
      )}
      {popup && popup.type === 'env' && (
        <EnvPopup
          value={rows[popup.rowIndex]?.env}
          onChange={(v) => updateRow(popup.rowIndex, 'env', v)}
          onClose={() => setPopup(null)}
          t={t}
        />
      )}
    </div>
  );
}
