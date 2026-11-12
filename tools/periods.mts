// Period of the first i pits of the winning boards, measured directly
// (first return to all-empty, then a lockstep comparison over one period).
// Usage: node tools/periods.mts [IMAX]   -> runs/periods.json
import { writeFileSync } from 'node:fs';
import { measurePeriod, lcmUpTo } from '../src/tchoukaillon.ts';

const IMAX = Number(process.argv[2] ?? 18);
const rows: { i: number; t: number; isPeriod: boolean; lcmI1: number; lcmI2: number; seconds: number }[] = [];
for (let i = 1; i <= IMAX; i++) {
  const t0 = Date.now();
  const { t, isPeriod } = measurePeriod(i);
  const r = { i, t, isPeriod, lcmI1: lcmUpTo(i + 1), lcmI2: lcmUpTo(i + 2), seconds: (Date.now() - t0) / 1000 };
  rows.push(r);
  console.log(JSON.stringify(r));
  writeFileSync('runs/periods.json', JSON.stringify({ IMAX, rows }, null, 1));
}
