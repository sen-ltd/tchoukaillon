// Heavy run: the error term E(n) = s(n) - n^2/pi.
//   (A) every n <= NALL from one unplaying sweep (sTable)
//   (B) log-spaced samples NALL < n <= NMAX with the rounding rule (sOf)
// Writes runs/error.json. Usage: node tools/error.mts [NALL] [NMAX] [SAMPLES]
import { writeFileSync } from 'node:fs';
import { sTable, sOf } from '../src/tchoukaillon.ts';

const NALL = Number(process.argv[2] ?? 40000);
const NMAX = Number(process.argv[3] ?? 1e8);
const SAMPLES = Number(process.argv[4] ?? 1200);
const t0 = Date.now();
const e = (n: number, s: number) => (s - (n * n) / Math.PI) / n;

const all = sTable(NALL);
const tA = (Date.now() - t0) / 1000;
// cross-check the two methods on a spread of n
let mismatch = 0;
for (let n = 1; n <= NALL; n += n < 2000 ? 1 : 97) if (sOf(n) !== all[n]) mismatch++;
let maxE = -Infinity, minE = Infinity, argMax = 0, argMin = 0;
const decades: { lo: number; hi: number; max: number; min: number; mean: number; argMax: number; argMin: number }[] = [];
for (let lo = 1; lo <= NALL; lo *= 10) {
  const hi = Math.min(NALL, lo * 10 - 1);
  let mx = -Infinity, mn = Infinity, am = 0, an = 0, sum = 0;
  for (let n = lo; n <= hi; n++) {
    const v = e(n, all[n]);
    sum += v;
    if (v > mx) { mx = v; am = n; }
    if (v < mn) { mn = v; an = n; }
  }
  decades.push({ lo, hi, max: mx, min: mn, mean: sum / (hi - lo + 1), argMax: am, argMin: an });
}
for (let n = 1; n <= NALL; n++) {
  const v = e(n, all[n]);
  if (v > maxE) { maxE = v; argMax = n; }
  if (v < minE) { minE = v; argMin = n; }
}
// thinned series for plotting
const series: [number, number][] = [];
for (let n = 1; n <= NALL; n++) if (n <= 200 || n % 20 === 0) series.push([n, all[n]]);
console.log(`(A) n<=${NALL} in ${tA}s, s(NALL)=${all[NALL]}, mismatches=${mismatch}, E/n in [${minE.toFixed(4)} @${argMin}, ${maxE.toFixed(4)} @${argMax}]`);

const ratio = Math.pow(NMAX / NALL, 1 / SAMPLES);
const ns = new Set<number>();
for (let k = 1; k <= SAMPLES; k++) ns.add(Math.round(NALL * Math.pow(ratio, k)));
for (const p of [1e5, 1e6, 1e7, 1e8]) if (p > NALL && p <= NMAX) ns.add(p);
const sampled: [number, number][] = [];
const sorted = [...ns].sort((a, b) => a - b);
let lastLog = Date.now();
for (const n of sorted) {
  sampled.push([n, sOf(n)]);
  if (Date.now() - lastLog > 30000) {
    lastLog = Date.now();
    console.log(`  ... n=${n} (${sampled.length}/${sorted.length}) ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    writeFileSync('runs/error.partial.json', JSON.stringify({ sampled }));
  }
}
let smax = -Infinity, smin = Infinity, sAmax = 0, sAmin = 0;
for (const [n, s] of sampled) {
  const v = e(n, s);
  if (v > smax) { smax = v; sAmax = n; }
  if (v < smin) { smin = v; sAmin = n; }
}
const secs = (Date.now() - t0) / 1000;
console.log(`(B) ${sampled.length} samples to ${NMAX}: E/n in [${smin.toFixed(4)} @${sAmin}, ${smax.toFixed(4)} @${sAmax}], total ${secs}s`);
writeFileSync('runs/error.json', JSON.stringify({
  NALL, NMAX, SAMPLES, seconds: secs, secondsA: tA, mismatch,
  all: { max: maxE, argMax, min: minE, argMin, decades },
  sampledStats: { max: smax, argMax: sAmax, min: smin, argMin: sAmin },
  series, sampled,
}));
