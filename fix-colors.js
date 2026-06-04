const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('text-slate-550')) {
        content = content.replace(/text-slate-550/g, 'text-slate-500');
        fs.writeFileSync(fullPath, content);
        console.log(`Fixed colors in ${fullPath}`);
      }
    }
  }
}

replaceInDir('./src');
console.log("Global color fix complete.");
