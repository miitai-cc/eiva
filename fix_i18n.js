const fs = require('fs');
const path = require('path');

const locales = ['zh-TW', 'en', 'ja'];

locales.forEach(loc => {
    const filePath = path.join(__dirname, `frontend/app/i18n/${loc}.js`);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Find "}\n\n    systemSettings:" and replace with "},\n    systemSettings:"
    content = content.replace(/}\s*systemSettings:/, '},\n    systemSettings:');
    fs.writeFileSync(filePath, content);
});
