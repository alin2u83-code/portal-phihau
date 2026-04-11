import fs from 'fs';
import path from 'path';

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Replace console.error('DEBUG:', var) -> console.error('DETALII EROARE:', JSON.stringify(var, null, 2))
    const regex = /console\.error\(\s*['"]DEBUG:['"]\s*,\s*([a-zA-Z0-9_]+)\s*\)/g;
    if (regex.test(content)) {
        content = content.replace(regex, "console.error('DETALII EROARE:', JSON.stringify($1, null, 2))");
        modified = true;
    }

    // Also handle console.log('DEBUG:', var)
    const regexLog = /console\.log\(\s*['"]DEBUG:['"]\s*,\s*([a-zA-Z0-9_]+)\s*\)/g;
    if (regexLog.test(content)) {
        content = content.replace(regexLog, "console.error('DETALII EROARE:', JSON.stringify($1, null, 2))");
        modified = true;
    }

    // Handle console.log("DEBUG: ...")
    const regexLogStr = /console\.log\(\s*["']DEBUG:\s*(.*?)["']\s*\)/g;
    if (regexLogStr.test(content)) {
        content = content.replace(regexLogStr, "console.error('DETALII EROARE:', \"$1\")");
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
                walkDir(fullPath);
            }
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            replaceInFile(fullPath);
        }
    }
}

walkDir('./components');
walkDir('./hooks');
walkDir('./utils');
