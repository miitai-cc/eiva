import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from './i18n';

function FolderIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
      <path d="M216,72H130.67L102.93,51.2a16.12,16.12,0,0,0-9.6-3.2H40A16,16,0,0,0,24,64V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72Zm0,128H40V64H93.33l27.74,20.8a16.12,16.12,0,0,0,9.6,3.2H216Z"></path>
    </svg>
  );
}

function FileIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
      <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"></path>
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
      <path d="M216,152a8,8,0,0,1-8,8H48a8,8,0,0,1,0-16H208A8,8,0,0,1,216,152Zm-88,48v-8h16v8a8,8,0,0,0,16,0v-8h16a8,8,0,0,0,0-16H80a8,8,0,0,0,0,16h16v8a8,8,0,0,0,16,0ZM128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z"></path>
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
      <path d="M224,152a8,8,0,0,0-8,8v40H40V160a8,8,0,0,0-16,0v40a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V160A8,8,0,0,0,224,152Zm-90.34,13.66a8,8,0,0,0,11.32,0l48-48a8,8,0,0,0-11.32-11.32L136,151.7V40a8,8,0,0,0-16,0V151.7L74.34,106.34A8,8,0,0,0,63.06,117.66Z"></path>
    </svg>
  );
}

function CreateFolderIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
      <path d="M216,72H130.67L102.93,51.2a16.12,16.12,0,0,0-9.6-3.2H40A16,16,0,0,0,24,64V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72Zm0,128H40V64H93.33l27.74,20.8a16.12,16.12,0,0,0,9.6,3.2H216ZM168,144a8,8,0,0,1-8,8H136v24a8,8,0,0,1-16,0V152H96a8,8,0,0,1,0-16h24V112a8,8,0,0,1,16,0v24h24A8,8,0,0,1,168,144Z"></path>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
      <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path>
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256">
      <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path>
    </svg>
  );
}

function RenameIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256">
      <path d="M227.32,28.68a16,16,0,0,0-22.63,0l-24,24A8,8,0,0,0,176,56V80H136a8,8,0,0,0,0,16h56v96a8,8,0,0,0,16,0V96a8,8,0,0,0,8-8V56A16,16,0,0,0,227.32,28.68ZM192,56l8,8V72H184V56ZM184,152V112a8,8,0,0,0-8-8H40a8,8,0,0,0-8,8V208a8,8,0,0,0,8,8H176a8,8,0,0,0,8-8V160A8,8,0,0,0,184,152ZM32,112H168v96H32Z"></path>
    </svg>
  );
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function TreeFolder({ node, currentPath, onSelect }) {
  // Always expanded by default if it contains the current path, or if it's root
  const [expanded, setExpanded] = useState(node.path === '' || currentPath.startsWith(node.path));
  const isSelected = currentPath === node.path;
  
  useEffect(() => {
    if (currentPath.startsWith(node.path)) setExpanded(true);
  }, [currentPath, node.path]);

  const toggle = (e) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const selectNode = (e) => {
    e.stopPropagation();
    onSelect(node.path);
    if (!expanded) setExpanded(true);
  };

  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="workspace-tree-node">
      <div className={`workspace-tree-item ${isSelected ? 'active' : ''}`} onClick={selectNode}>
        <span className="workspace-tree-toggle" onClick={toggle}>
          {hasChildren ? (expanded ? '▼' : '▶') : ' '}
        </span>
        <span className="workspace-tree-icon" style={{ fontSize: '14px', marginRight: '6px' }}>📁</span>
        <span className="workspace-tree-name">{node.name}</span>
      </div>
      {expanded && hasChildren && (
        <div className="workspace-tree-children">
          {node.children.map((child, i) => (
            <TreeFolder key={i} node={child} currentPath={currentPath} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorkspacePage() {
  const { t } = useI18n();
  const [currentPath, setCurrentPath] = useState('');
  const [entries, setEntries] = useState([]);
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewContent, setPreviewContent] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [renamingEntry, setRenamingEntry] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const apiBase = `${window.location.protocol}//${window.location.hostname}:39999/eiva/backend/api/ver-0.95/workspace`;

  const fetchTree = async () => {
    try {
      const response = await fetch(`${apiBase}/tree`);
      if (response.ok) {
        const data = await response.json();
        setTreeData(data);
      }
    } catch (err) {
      console.error('Failed to fetch tree', err);
    }
  };

  const fetchList = async (path = '') => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${apiBase}/list?path=${encodeURIComponent(path)}`);
      if (!response.ok) {
        throw new Error('Failed to load directory');
      }
      const data = await response.json();
      setEntries(data.entries || []);
      setCurrentPath(path);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
    fetchList(currentPath);
  }, []);

  const handleCreateFolder = async () => {
    const name = prompt(t('workspace.enterFolderName') || 'Enter folder name:');
    if (!name) return;
    const path = currentPath ? `${currentPath}/${name}` : name;
    try {
      const response = await fetch(`${apiBase}/dir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      if (response.ok) {
        fetchTree();
        fetchList(currentPath);
      } else {
        alert(t('workspace.createFailed') || 'Failed to create folder');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleFileUpload = async (eventOrFiles) => {
    const files = eventOrFiles.target ? eventOrFiles.target.files : eventOrFiles;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    for (const file of files) {
      const formData = new FormData();
      formData.append('path', currentPath);
      formData.append('file', file);
      try {
        await fetch(`${apiBase}/file`, {
          method: 'POST',
          body: formData
        });
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    fetchList(currentPath);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleDelete = async (entry) => {
    if (!confirm(t('workspace.confirmDelete') || `Delete "${entry.name}"? This cannot be undone.`)) return;
    const path = currentPath ? `${currentPath}/${entry.name}` : entry.name;
    try {
      const response = await fetch(`${apiBase}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      if (response.ok) {
        fetchTree();
        fetchList(currentPath);
      } else {
        const data = await response.json();
        alert(data.error || 'Delete failed');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRename = async (entry) => {
    const currentName = entry.name;
    setRenamingEntry(entry);
    setRenameValue(currentName);
  };

  const submitRename = async () => {
    if (!renamingEntry || !renameValue.trim() || renameValue === renamingEntry.name) {
      setRenamingEntry(null);
      return;
    }
    const path = currentPath ? `${currentPath}/${renamingEntry.name}` : renamingEntry.name;
    try {
      const response = await fetch(`${apiBase}/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, newName: renameValue.trim() })
      });
      if (response.ok) {
        fetchTree();
        fetchList(currentPath);
      } else {
        const data = await response.json();
        alert(data.error || 'Rename failed');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setRenamingEntry(null);
    }
  };

  const cancelRename = () => {
    setRenamingEntry(null);
  };

  const navigateTo = (folderName) => {
    const nextPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    fetchList(nextPath);
  };

  const navigateUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    fetchList(parts.join('/'));
  };

  const navigateBreadcrumb = (index) => {
    const parts = currentPath.split('/');
    const nextPath = parts.slice(0, index + 1).join('/');
    fetchList(nextPath);
  };

  const openPreview = async (file) => {
    const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
    const fileUrl = `${apiBase}/file?path=${encodeURIComponent(filePath)}`;
    
    const ext = file.name.split('.').pop().toLowerCase();
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext);
    const isText = ['txt', 'json', 'md', 'js', 'jsx', 'html', 'css', 'rs', 'py'].includes(ext);
    
    if (isImage) {
      setPreviewFile({ ...file, type: 'image', url: fileUrl, path: filePath });
    } else if (isText) {
      setPreviewFile({ ...file, type: 'text', path: filePath });
      setPreviewLoading(true);
      try {
        const res = await fetch(fileUrl);
        const text = await res.text();
        setPreviewContent(text);
      } catch (err) {
        setPreviewContent('Failed to load text.');
      } finally {
        setPreviewLoading(false);
      }
    } else {
      // Direct download for others
      window.open(fileUrl, '_blank');
    }
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewContent('');
  };

  const downloadFile = (filePath) => {
    const fileUrl = `${apiBase}/file?path=${encodeURIComponent(filePath)}`;
    window.open(fileUrl, '_blank');
  };

  const breadcrumbs = currentPath ? currentPath.split('/') : [];

  return (
    <div className="datagrid-container workspace-container">
      <div className="datagrid-toolbar workspace-header" style={{ marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
        <h2 className="workspace-title">{t('workspace.title') || 'Workspace'}</h2>
        <div className="workspace-actions">
          <button className="config-add-btn" onClick={handleCreateFolder}>
            <CreateFolderIcon />
            <span>{t('workspace.createFolder') || 'New Folder'}</span>
          </button>
          <button className="config-add-btn" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            <UploadIcon />
            <span>{isUploading ? (t('workspace.uploading') || 'Uploading...') : (t('workspace.upload') || 'Upload')}</span>
          </button>
          <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileUpload} />
        </div>
      </div>

      <div className="workspace-split-layout">
        {/* Left Sidebar Tree */}
        <div className="workspace-sidebar">
          {treeData ? (
            <TreeFolder node={treeData} currentPath={currentPath} onSelect={fetchList} />
          ) : (
            <div style={{ padding: '10px', color: 'var(--text-secondary)' }}>Loading tree...</div>
          )}
        </div>

        {/* Right Main Area */}
        <div 
          className="workspace-main datagrid-wrapper" 
          style={{ border: 'none', borderRadius: 0, borderLeft: '1px solid var(--border)' }}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {dragOver && (
            <div className="workspace-drop-zone">
              {t('workspace.upload') || 'Drop files here to upload'}
            </div>
          )}

          <div className="workspace-breadcrumbs" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-0)' }}>
            <span className="breadcrumb-item" onClick={() => fetchList('')}>root</span>
            {breadcrumbs.map((part, idx) => (
              <React.Fragment key={idx}>
                <span className="breadcrumb-separator">/</span>
                <span className="breadcrumb-item" onClick={() => navigateBreadcrumb(idx)}>{part}</span>
              </React.Fragment>
            ))}
          </div>

          {error && <div className="workspace-error" style={{ padding: '16px', color: 'var(--error)' }}>{error}</div>}

          <table className="datagrid" style={{ borderTop: 'none' }}>
            <thead>
              <tr>
                <th className="datagrid-th" style={{ width: '50px' }}></th>
                <th className="datagrid-th">{t('workspace.name') || 'Name'}</th>
                <th className="datagrid-th">{t('workspace.size') || 'Size'}</th>
                <th className="datagrid-th" style={{ width: '80px' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="datagrid-cell-empty" style={{ textAlign: 'center', padding: '20px' }}>{t('workspace.loading') || 'Loading...'}</td></tr>
              ) : (
                <>
                  {currentPath && (
                    <tr className="datagrid-row" style={{ cursor: 'pointer' }} onClick={navigateUp}>
                      <td className="datagrid-cell" style={{ textAlign: 'center' }}><FolderIcon /></td>
                      <td className="datagrid-cell"><span className="datagrid-cell-text">..</span></td>
                      <td className="datagrid-cell"></td>
                      <td className="datagrid-cell"></td>
                    </tr>
                  )}
                  {entries.length === 0 && !currentPath && (
                    <tr><td colSpan="4" className="datagrid-cell-empty" style={{ textAlign: 'center', padding: '20px' }}>{t('workspace.empty') || 'No files found.'}</td></tr>
                  )}
                  {entries.map((entry, i) => (
                    <tr className="datagrid-row" key={i}>
                      <td className="datagrid-cell" style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => entry.isDir ? navigateTo(entry.name) : openPreview(entry)}>
                        {entry.isDir ? <FolderIcon /> : <FileIcon />}
                      </td>
                      <td className="datagrid-cell" style={{ cursor: 'pointer' }} onClick={() => entry.isDir ? navigateTo(entry.name) : openPreview(entry)}>
                        {renamingEntry === entry ? (
                          <input
                            type="text"
                            className="datagrid-input"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') submitRename();
                              if (e.key === 'Escape') cancelRename();
                            }}
                            onBlur={submitRename}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="datagrid-cell-text">{entry.name}</span>
                        )}
                      </td>
                      <td className="datagrid-cell"><span className="datagrid-cell-text">{!entry.isDir ? formatSize(entry.size) : ''}</span></td>
                      <td className="datagrid-cell" style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button
                            className="icon-button datagrid-icon-btn"
                            title={t('workspace.rename') || 'Rename'}
                            onClick={(e) => { e.stopPropagation(); handleRename(entry); }}
                          >
                            <RenameIcon />
                          </button>
                          <button
                            className="icon-button datagrid-icon-btn datagrid-icon-btn-danger"
                            title={t('workspace.delete') || 'Delete'}
                            onClick={(e) => { e.stopPropagation(); handleDelete(entry); }}
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {previewFile && (
        <div className="datagrid-popup-overlay" onClick={closePreview}>
          <div className="datagrid-popup datagrid-popup-wide" onClick={e => e.stopPropagation()}>
            <div className="datagrid-popup-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{previewFile.name}</span>
              <div className="workspace-preview-actions">
                <button className="icon-button" onClick={() => downloadFile(previewFile.path)} title={t('workspace.download') || 'Download'}>
                  <DownloadIcon />
                </button>
                <button className="icon-button" onClick={closePreview}>
                  <CloseIcon />
                </button>
              </div>
            </div>
            <div className="workspace-preview-body" style={{ flexGrow: 1, overflow: 'auto', background: 'var(--surface-0)', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {previewFile.type === 'image' ? (
                <img src={previewFile.url} alt={previewFile.name} style={{ maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain' }} />
              ) : previewLoading ? (
                <div>{t('workspace.loading') || 'Loading...'}</div>
              ) : (
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', width: '100%', height: '100%' }}>{previewContent}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
