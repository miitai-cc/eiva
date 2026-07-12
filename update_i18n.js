const fs = require('fs');
const path = require('path');

const locales = ['zh-TW', 'en', 'ja'];

locales.forEach(loc => {
    const filePath = path.join(__dirname, `frontend/app/i18n/${loc}.js`);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    let additions = '';
    if (loc === 'zh-TW') {
        additions = `
    systemSettings: {
      contextTab: '上下文',
      aiModelTab: 'AI Model',
    },
    aiModel: {
      title: 'AI 模組設定管理',
      addRow: '新增模組',
      provider: 'AI 類別',
      name: '名稱',
      apiKey: 'API Key / Token',
      baseUrl: 'Base URL',
      enabled: '啟用',
      requiredFields: '請填寫 AI 類別與名稱',
      confirmDelete: '確定要刪除此 AI 模組設定嗎？'
    },`;
    } else if (loc === 'en') {
        additions = `
    systemSettings: {
      contextTab: 'Context',
      aiModelTab: 'AI Model',
    },
    aiModel: {
      title: 'AI Model Settings Management',
      addRow: 'Add Model',
      provider: 'Provider',
      name: 'Name',
      apiKey: 'API Key / Token',
      baseUrl: 'Base URL',
      enabled: 'Enabled',
      requiredFields: 'Provider and Name are required',
      confirmDelete: 'Are you sure you want to delete this AI model setting?'
    },`;
    } else if (loc === 'ja') {
        additions = `
    systemSettings: {
      contextTab: 'コンテキスト',
      aiModelTab: 'AIモデル',
    },
    aiModel: {
      title: 'AIモデル設定管理',
      addRow: 'モデルを追加',
      provider: 'プロバイダー',
      name: '名前',
      apiKey: 'APIキー / トークン',
      baseUrl: 'Base URL',
      enabled: '有効',
      requiredFields: 'プロバイダーと名前は必須です',
      confirmDelete: 'このAIモデル設定を削除してもよろしいですか？'
    },`;
    }
    
    // Insert additions before the last '};'
    content = content.replace(/(};\s*)$/, additions + '\n$1');
    fs.writeFileSync(filePath, content);
});
