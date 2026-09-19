const fs = require('fs');
const path = 'src/style.css';
let content = fs.readFileSync(path, 'utf8');
const old = `@keyframes speed-flash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}
.speed-over-limit {
  color: #ff3b3b;
  animation: speed-flash 1s steps(1, end) infinite;
}
`;
const replacement = `@keyframes speed-flash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
.speed-over-limit {
  animation: speed-flash 0.6s steps(1, end) infinite;
}
`;
if (!content.includes(old)) {
  console.log('OLD_NOT_FOUND');
} else {
  content = content.replace(old, replacement);
  fs.writeFileSync(path, content);
  console.log('PATCHED_OK');
}
