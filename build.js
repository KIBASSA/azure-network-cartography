const fs = require('fs');
const path = require('path');

// Collect all JS files in src/components and src/scripts
const componentDir = path.join(__dirname, 'src', 'components');
const scriptDir = path.join(__dirname, 'src', 'scripts');

const files = [
  ...fs.readdirSync(componentDir).map(f => path.join(componentDir, f)),
  ...fs.readdirSync(scriptDir).map(f => path.join(scriptDir, f))
];

let output = '(function(){\n';
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  // Remove import lines
  code = code.replace(/^import.*\n/gm, '');
  // Replace "export function" with "function"
  code = code.replace(/export\s+function/g, 'function');
  output += '\n// --- ' + path.basename(file) + ' ---\n';
  output += code.trim() + '\n';
}
output += '})();\n';

fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'app.js'), output);
console.log('Built dist/app.js');

