const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..');
const ARCHIVE_DIR = path.join(BASE_DIR, 'archive');

console.log('=== 开始归档历史冗余 HTML 文件 ===\n');

// 确保备份文件夹存在
if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
}

// 扫描所有 HTML 文件
const allFiles = fs.readdirSync(BASE_DIR).filter(file => {
    return file.endsWith('.html') && 
           file !== 'index.html' && 
           file !== 'quiz_engine.html' && 
           file !== 'egame.html'; // 排除核心页面
});

console.log(`共检测到 ${allFiles.length} 个历史专题 HTML 文件。`);

let movedCount = 0;

allFiles.forEach(file => {
    const srcPath = path.join(BASE_DIR, file);
    const destPath = path.join(ARCHIVE_DIR, file);
    
    try {
        fs.renameSync(srcPath, destPath);
        // console.log(`[已归档] ${file} -> archive/${file}`);
        movedCount++;
    } catch (e) {
        console.error(`[归档失败] 无法移动 ${file}:`, e.message);
    }
});

console.log(`\n🎉 归档工作顺利完成！成功移动 ${movedCount} 个冗余文件至 archive 目录。`);
console.log('现在项目根目录仅保留核心系统页面，极致清爽！');
