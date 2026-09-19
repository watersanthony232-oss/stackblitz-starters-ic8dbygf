const fs = require('fs');
const path = 'src/style.css';
let content = fs.readFileSync(path, 'utf8');

const old1 = `.nav-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: black;
  padding: 10px;
  font-size: 16px;
  z-index: 15;
}`;
const new1 = `.nav-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: black;
  padding: 10px;
  font-size: 12px;
  z-index: 15;
}`;

const old2 = `.nav-next {
  font-size: 18px;
  font-weight: bold;
}`;
const new2 = `.nav-next {
  font-size: 14px;
  font-weight: bold;
}`;

let ok = true;
if (!content.includes(old1)) { console.log('OLD1_NOT_FOUND'); ok = false; }
if (!content.includes(old2)) { console.log('OLD2_NOT_FOUND'); ok = false; }
if (ok) {
  content = content.replace(old1, new1).replace(old2, new2);
  fs.writeFileSync(path, content);
  console.log('PATCHED_OK');
}
