const fs = require('fs');
const path = 'src/nav-screen.ts';
let content = fs.readFileSync(path, 'utf8');

const old = `      const nextStep = route.steps[0];
      const minutesLeft = Math.round(
        (route.durationInTrafficSeconds ?? route.durationSeconds) / 60
      );`;
const replacement = `      const nextStep = route.steps[0];
      const minutesLeft = Math.round(
        (route.durationInTrafficSeconds ?? route.durationSeconds) / 60
      );
      const milesLeft = (route.distanceMeters / 1609.34).toFixed(1);`;

const old2 = `        <div class="nav-line nav-eta">\${minutesLeft} min to \${destination}</div>`;
const replacement2 = `        <div class="nav-line nav-eta">\${minutesLeft} min (\${milesLeft} mi) to \${destination}</div>`;

let ok = true;
if (!content.includes(old)) { console.log('OLD1_NOT_FOUND'); ok = false; }
if (!content.includes(old2)) { console.log('OLD2_NOT_FOUND'); ok = false; }
if (ok) {
  content = content.replace(old, replacement).replace(old2, replacement2);
  fs.writeFileSync(path, content);
  console.log('PATCHED_OK');
}
