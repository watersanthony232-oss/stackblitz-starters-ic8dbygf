const fs = require('fs');
const path = 'src/poi.ts';
let content = fs.readFileSync(path, 'utf8');
const old = 'return data.results.slice(0, 5).map((r: any) => ({';
const replacement = 'return data.results.slice(0, 3).map((r: any) => ({';
if (!content.includes(old)) {
  console.log('OLD_NOT_FOUND');
} else {
  content = content.replace(old, replacement);
  fs.writeFileSync(path, content);
  console.log('PATCHED_OK');
}
