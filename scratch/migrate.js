const fs = require('fs');
const path = require('path');

// 根目录与目标目录路径
const BASE_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(BASE_DIR, 'data');
const CONFIG_DIR = path.join(BASE_DIR, 'config');

// 确保目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// ----------------- 1. 解析 index.html 菜单生成 config/menu.json -----------------
console.log('--- 正在解析主控 index.html 菜单目录 ---');
const indexHtmlPath = path.join(BASE_DIR, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
    console.error('错误：未找到 index.html，请确保在正确的目录下运行！');
    process.exit(1);
}

const indexContent = fs.readFileSync(indexHtmlPath, 'utf8');
const menu = [];

// 使用正则表达式匹配 collapsible 按钮和 content 的 div
const sectionRegex = /<button class="collapsible">([^<]+)<\/button>\s*<div class="content">([\s\S]*?)<\/div>/g;
let sectionMatch;

while ((sectionMatch = sectionRegex.exec(indexContent)) !== null) {
    const category = sectionMatch[1].trim();
    const contentHtml = sectionMatch[2];
    const items = [];

    // 在 content 中匹配 a 标签 menu-item
    const itemRegex = /<a href="javascript:void\(0\);" class="menu-item" onclick="showContent\('([^']+)'\)">([^<]+)<\/a>/g;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(contentHtml)) !== null) {
        let fileUrl = itemMatch[1].trim();
        const displayName = itemMatch[2].trim();

        // 排除非本项目的外部链接（如外部 https 页面）
        if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || !fileUrl.endsWith('.html')) {
            console.log(`[菜单跳过] 外部链接: ${displayName} -> ${fileUrl}`);
            // 我们依然可以保留在菜单中，但标记为外部类型
            items.push({
                name: displayName,
                file: fileUrl,
                isExternal: true
            });
            continue;
        }

        // 去掉 .html 后缀作为文件标识
        const topicName = fileUrl.replace(/\.html$/, '');
        items.push({
            name: displayName,
            file: topicName,
            isExternal: false
        });
    }

    if (items.length > 0) {
        menu.push({
            category: category,
            items: items
        });
    }
}

const menuJsPath = path.join(CONFIG_DIR, 'menu.js');
const menuJsContent = `window.JIUSHU_MENU = ${JSON.stringify(menu, null, 2)};`;
fs.writeFileSync(menuJsPath, menuJsContent, 'utf8');
console.log(`成功生成菜单配置：${menuJsPath} (共计 ${menu.length} 个分类)`);


// ----------------- 2. 扫描并解析各个 HTML 文件的题库变量 -----------------
console.log('\n--- 正在启动专题题库解析与转换 ---');

// 辅助函数：查找括号配对，安全截取数组内容
function findBalancedArray(text, startIndex) {
    let bracketCount = 1;
    let i = startIndex;
    while (i < text.length && bracketCount > 0) {
        let char = text[i];
        if (char === '[') bracketCount++;
        else if (char === ']') bracketCount--;
        i++;
    }
    return text.substring(startIndex, i - 1);
}

// 收集所有要转换的本地 HTML 文件
const allFiles = fs.readdirSync(BASE_DIR).filter(file => {
    return file.endsWith('.html') && 
           file !== 'index.html' && 
           file !== 'quiz_engine.html' && 
           file !== 'egame.html';
});

let successCount = 0;
let failCount = 0;

allFiles.forEach(file => {
    const filePath = path.join(BASE_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // 搜索 JS 数组定义，匹配 const/let/var 变量 = [ 
    // 正则支持中英文字符作为变量名，并支持带下划线或数字
    const arrayStartRegex = /(?:const|let|var)\s+([A-Za-z0-9_\u4e00-\u9fa5]+)\s*=\s*\[/g;
    let match;
    let foundBank = false;

    while ((match = arrayStartRegex.exec(content)) !== null) {
        const varName = match[1];
        const arrayStartIndex = match.index + match[0].length;

        // 获取配对的数组字符串内容
        const innerArrayString = findBalancedArray(content, arrayStartIndex);
        
        try {
            // 通过 new Function 在隔离沙箱中安全解析 JS 数组字面量为真实的 JS 数组
            const parsedArray = new Function(`return [${innerArrayString}];`)();
            
            if (Array.isArray(parsedArray) && parsedArray.length > 0) {
                // 校验这是否是一个题库数组（题库数组通常元素为对象，且包含 equation）
                const looksLikeQuestionBank = parsedArray.some(item => item && (item.equation || item.correctOption));
                
                if (looksLikeQuestionBank) {
                    const topicName = file.replace(/\.html$/, '');
                    const jsContent = `window.JIUSHU_QUIZ = {\n  topic: ${JSON.stringify(topicName)},\n  questions: ${JSON.stringify(parsedArray, null, 2)}\n};`;

                    const outputPath = path.join(DATA_DIR, `${topicName}.js`);
                    fs.writeFileSync(outputPath, jsContent, 'utf8');
                    console.log(`[成功转换] ${file} -> data/${topicName}.js (共 ${parsedArray.length} 道题)`);
                    successCount++;
                    foundBank = true;
                    break; // 找到主题库数组即可停止本文件扫描
                }
            }
        } catch (e) {
            // 某些特殊的非常规格式，或者有外部依赖，打印警告并继续尝试
            // console.warn(`解析警告: ${file} 中变量 ${varName} 解析失败，继续扫描...`, e.message);
        }
    }

    if (!foundBank) {
        console.error(`[转换失败] 未能在 ${file} 中成功提取结构化题库数组。`);
        failCount++;
    }
});

console.log(`\n--- 转换任务结束 ---`);
console.log(`转换成功数: ${successCount} 个`);
console.log(`转换失败数: ${failCount} 个`);
