const fs = require('fs');
const path = 'src/nav.ts';
let content = fs.readFileSync(path, 'utf8');

const old1 = `export interface RouteInfo {
  steps: RouteStep[];
  durationSeconds: number;
  durationInTrafficSeconds: number | null;
}`;
const new1 = `export interface RouteInfo {
  steps: RouteStep[];
  durationSeconds: number;
  durationInTrafficSeconds: number | null;
  distanceMeters: number;
}`;

const old2 = `    return {
      steps,
      durationSeconds: leg.duration?.value ?? 0,
      durationInTrafficSeconds: leg.duration_in_traffic?.value ?? null,
    };`;
const new2 = `    return {
      steps,
      durationSeconds: leg.duration?.value ?? 0,
      durationInTrafficSeconds: leg.duration_in_traffic?.value ?? null,
      distanceMeters: leg.distance?.value ?? 0,
    };`;

let ok = true;
if (!content.includes(old1)) { console.log('OLD1_NOT_FOUND'); ok = false; }
if (!content.includes(old2)) { console.log('OLD2_NOT_FOUND'); ok = false; }
if (ok) {
  content = content.replace(old1, new1).replace(old2, new2);
  fs.writeFileSync(path, content);
  console.log('PATCHED_OK');
}
