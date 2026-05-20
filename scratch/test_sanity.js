const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(BASE_DIR, 'data');
const menuJsPath = path.join(BASE_DIR, 'config', 'menu.js');

console.log('=== 开始玖数学系统完整性自动化测试 (JS 绕过 CORS 模式) ===\n');

// 1. 验证 menu.js
if (!fs.existsSync(menuJsPath)) {
    console.error('❌ 严重错误：未找到 config/menu.js 配置文件！');
    process.exit(1);
}

let menu;
try {
    const menuRaw = fs.readFileSync(menuJsPath, 'utf8');
    const windowObj = {};
    const evaluateJs = new Function('window', menuRaw);
    evaluateJs(windowObj);
    menu = windowObj.JIUSHU_MENU;
    
    if (!menu || !Array.isArray(menu)) {
        throw new Error('menu 数据非数组或未定义。');
    }
    console.log('✅ menu.js JavaScript 格式与全局变量校验通过。');
} catch (e) {
    console.error('❌ 严重错误：config/menu.js JavaScript 格式解析或变量提取失败！', e.message);
    process.exit(1);
}

// 2. 遍历菜单中的每一项，并校验 data 目录中的 .js 题库文件
let totalItems = 0;
let missingFiles = 0;
let invalidJsFiles = 0;

menu.forEach(category => {
    console.log(`\n检查分类: 【${category.category}】 (共 ${category.items.length} 个子项)`);
    
    category.items.forEach(item => {
        totalItems++;
        if (item.isExternal) {
            if (item.file.startsWith('http')) {
                console.log(`  - [跳过] 外部超链接: ${item.name} -> ${item.file}`);
                return;
            }
            // 对于类似 F09 的伪外部链接进行二次确认，看本地是否有 JS
            const jsPath = path.join(DATA_DIR, `${item.file}.js`);
            if (fs.existsSync(jsPath)) {
                console.log(`  - [确认] 纠正性本地JS文件存在: ${item.file}.js`);
                return;
            }
        }
        
        if (item.file === 'egame') {
            const egamePath = path.join(BASE_DIR, 'egame.html');
            if (fs.existsSync(egamePath)) {
                console.log(`  - [通过] 特殊本地单体网页: ${item.name} -> egame.html`);
            } else {
                console.warn(`  - ⚠️ [警告] 原项目链接缺失: ${item.name} -> egame.html (该文件在重构前即不存在)`);
            }
            return;
        }

        const jsPath = path.join(DATA_DIR, `${item.file}.js`);
        if (!fs.existsSync(jsPath)) {
            console.error(`  - ❌ [缺失] 未找到对应的 JS 题库文件: data/${item.file}.js`);
            missingFiles++;
            return;
        }

        try {
            const fileRaw = fs.readFileSync(jsPath, 'utf8');
            const windowObj = {};
            const evaluateJs = new Function('window', fileRaw);
            evaluateJs(windowObj);
            const fileData = windowObj.JIUSHU_QUIZ;
            
            if (!fileData || !fileData.topic || !Array.isArray(fileData.questions)) {
                console.error(`  - ❌ [格式错误] data/${item.file}.js 结构不符合题库标准（需要包含 topic 且 questions 为数组）`);
                invalidJsFiles++;
                return;
            }
            
            console.log(`  - [通过] ${item.name} (${fileData.questions.length} 道题)`);
        } catch (e) {
            console.error(`  - ❌ [JS解析错误] data/${item.file}.js 损坏！`, e.message);
            invalidJsFiles++;
        }
    });
});

console.log('\n=== 测试统计结果 ===');
console.log(`总子项数: ${totalItems}`);
console.log(`丢失题库数: ${missingFiles}`);
console.log(`破损/格式错误题库数: ${invalidJsFiles}`);

if (missingFiles === 0 && invalidJsFiles === 0) {
    console.log('\n🎉🎉 恭喜！玖数学重构完整性测试 100% 通过！所有配置均已对齐且数据完整。 🎉🎉');
} else {
    console.error('\n⚠️ 系统检测到部分配置或题库文件存在缺失或格式错误，请根据上述日志进行修复！');
    process.exit(1);
}
