const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(BASE_DIR, 'data');
const CONFIG_DIR = path.join(BASE_DIR, 'config');

console.log('--- 启动 JSON 到 JS 格式转换 ---');

// 1. 转换 menu.json
const menuJsonPath = path.join(CONFIG_DIR, 'menu.json');
const menuJsPath = path.join(CONFIG_DIR, 'menu.js');

if (fs.existsSync(menuJsonPath)) {
    try {
        const menuData = JSON.parse(fs.readFileSync(menuJsonPath, 'utf8'));
        const menuJsContent = `window.JIUSHU_MENU = ${JSON.stringify(menuData, null, 2)};`;
        fs.writeFileSync(menuJsPath, menuJsContent, 'utf8');
        console.log(`[成功] 转换菜单: config/menu.json -> config/menu.js`);
    } catch (err) {
        console.error(`[错误] 转换菜单失败:`, err.message);
    }
} else {
    console.warn(`[警告] 未找到 config/menu.json`);
}

// 2. 转换 data/ 目录下的所有 .json 题库文件
if (fs.existsSync(DATA_DIR)) {
    const files = fs.readdirSync(DATA_DIR).filter(file => file.endsWith('.json'));
    console.log(`开始转换 data/ 下的 ${files.length} 个题库文件...`);

    let successCount = 0;
    files.forEach(file => {
        const jsonPath = path.join(DATA_DIR, file);
        const jsName = file.replace(/\.json$/, '.js');
        const jsPath = path.join(DATA_DIR, jsName);

        try {
            const rawContent = fs.readFileSync(jsonPath, 'utf8');
            const parsedData = JSON.parse(rawContent);
            const topicName = parsedData.topic || file.replace(/\.json$/, '');
            
            const jsContent = `window.JIUSHU_QUIZ = {\n  topic: ${JSON.stringify(topicName)},\n  questions: ${JSON.stringify(parsedData.questions || parsedData, null, 2)}\n};`;
            
            fs.writeFileSync(jsPath, jsContent, 'utf8');
            successCount++;
        } catch (err) {
            console.error(`[错误] 转换文件失败 ${file}:`, err.message);
        }
    });

    console.log(`[成功] 共成功转换 ${successCount} / ${files.length} 个题库文件为 .js 格式`);
} else {
    console.error(`[错误] 未找到 data/ 目录`);
}

console.log('--- 转换结束 ---');
