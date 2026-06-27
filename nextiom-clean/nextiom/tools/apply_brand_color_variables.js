import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '../src');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const hexPattern = /#e87b35/gi;
const rgbaPattern15 = /rgba\(\s*232\s*,\s*123\s*,\s*53\s*,\s*0\.15\s*\)/gi;
const rgbaPattern10 = /rgba\(\s*232\s*,\s*123\s*,\s*53\s*,\s*0\.10?\s*\)/gi;
const rgbaPattern13 = /rgba\(\s*232\s*,\s*123\s*,\s*53\s*,\s*0\.13\s*\)/gi;

let processedFiles = 0;
let modifiedFiles = 0;

walkDir(srcDir, (filePath) => {
  const ext = path.extname(filePath);
  if (!['.js', '.jsx', '.ts', '.tsx', '.css'].includes(ext)) {
    return;
  }
  
  processedFiles++;
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // Replace hex codes
  content = content.replace(hexPattern, 'var(--brand-color)');
  
  // Replace RGBA variations
  content = content.replace(rgbaPattern15, 'var(--brand-color-light)');
  content = content.replace(rgbaPattern10, 'var(--brand-color-light)');
  content = content.replace(rgbaPattern13, 'var(--brand-color-light)');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles++;
    console.log(`Updated: ${path.relative(srcDir, filePath)}`);
  }
});

console.log(`Done! Processed ${processedFiles} files, modified ${modifiedFiles} files.`);
