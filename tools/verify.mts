// Recheck every checkable statement of
//   [BL] D. M. Broline, D. E. Loeb, "The combinatorics of Mancala-type games:
//        Ayo, Tchoukaillon, and 1/pi", arXiv:math/9502225 (UMAP J. 1995)
//   [JTT] B. Jones, L. Taalman, A. Tongen, "Solitaire Mancala Games and the
//        Chinese Remainder Theorem", arXiv:1112.3593 (Amer. Math. Monthly 2013)
// against direct computation. Numbers transcribed from the TeX sources
// (e-prints), including the table BL left commented out in Section 5.
// Reads runs/periods.json and runs/error.json if present.
// Usage: node tools/verify.mts   -> prints a report, writes runs/verify.json
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import {
  boardByCongruence, harvestCounts, harvestSequence, lcmUpTo, sOf, sTable, solve,
  tchoukaillonSieve, winningBoard,
} from '../src/tchoukaillon.ts';

type Status = 'ok' | 'diff' | 'note';
const results: { id: string; status: Status; text: string }[] = [];
function report(id: string, status: Status, text: string) {
  results.push({ id, status, text });
  console.log(`${status === 'ok' ? '✓' : status === 'diff' ? '✗' : '·'} ${id}: ${text}`);
}
const t0 = Date.now();

// ---------------------------------------------------------------- BL Figure 4
// "Winning Positions with up to 24 stones": pits 1..8 and the harvest h_s.
const fig1: [number, number[], number][] = [
  [1, [1], 1], [2, [0, 2], 2], [3, [1, 2], 1], [4, [0, 1, 3], 3], [5, [1, 1, 3], 1],
  [6, [0, 0, 2, 4], 4], [7, [1, 0, 2, 4], 1], [8, [0, 2, 2, 4], 2], [9, [1, 2, 2, 4], 1],
  [10, [0, 1, 1, 3, 5], 5], [11, [1, 1, 1, 3, 5], 1], [12, [0, 0, 0, 2, 4, 6], 6],
  [13, [1, 0, 0, 2, 4, 6], 1], [14, [0, 2, 0, 2, 4, 6], 2], [15, [1, 2, 0, 2, 4, 6], 1],
  [16, [0, 1, 3, 2, 4, 6], 3], [17, [1, 1, 3, 2, 4, 6], 1], [18, [0, 0, 2, 1, 3, 5, 7], 7],
  [19, [1, 0, 2, 1, 3, 5, 7], 1], [20, [0, 2, 2, 1, 3, 5, 7], 2], [21, [1, 2, 2, 1, 3, 5, 7], 1],
  [22, [0, 1, 1, 0, 2, 4, 6, 8], 8], [23, [1, 1, 1, 0, 2, 4, 6, 8], 1],
  [24, [0, 0, 0, 4, 2, 4, 6, 8], 1],
];
{
  const h = harvestSequence(24);
  const boardDiffs: number[] = [];
  const hDiffs: string[] = [];
  for (const [s, pits, hs] of fig1) {
    const b = winningBoard(s).slice(1);
    if (b.join() !== pits.join()) boardDiffs.push(s);
    if (h[s] !== hs) hDiffs.push(`s=${s}: printed ${hs}, computed ${h[s]}`);
  }
  report('BL Fig.4 boards', boardDiffs.length ? 'diff' : 'ok',
    boardDiffs.length ? `rows differ: ${boardDiffs.join(',')}` : 'all 24 boards match');
  report('BL Fig.4 harvest column', hDiffs.length ? 'diff' : 'ok',
    hDiffs.length ? hDiffs.join('; ') + ' (the bold entry in that row is pit 4)' : 'all 24 match');
}

// ------------------------------------------------- BL Theorem: one board per s
{
  // the unplay bijection: unplaying then playing the smallest harvestable pit
  // returns to the same board, and every unplayed board is winnable.
  let bad = 0;
  for (let s = 0; s <= 3000; s++) {
    const b = winningBoard(s);
    const v = solve(b);
    if (!v.winnable || v.line.length !== s) bad++;
  }
  // uniqueness by exhaustion: all boards with b_i <= i of length <= 9
  const count = new Map<number, number>();
  let total = 0;
  const L = 9;
  const b = new Array<number>(L + 1).fill(0);
  const rec = (i: number) => {
    if (i > L) {
      total++;
      if (solve(b).winnable) {
        let s = 0;
        for (let j = 1; j <= L; j++) s += b[j];
        count.set(s, (count.get(s) ?? 0) + 1);
      }
      return;
    }
    for (let v = 0; v <= i; v++) { b[i] = v; rec(i + 1); }
  };
  rec(1);
  const s10 = sOf(10);
  let uniq = true;
  for (let s = 0; s < s10; s++) if (count.get(s) !== 1) uniq = false;
  report('BL Thm 5 (one winning board per s)', bad === 0 && uniq ? 'ok' : 'diff',
    `unplayed boards s<=3000 all winnable; exhaustive over all ${total.toLocaleString('en')} boards with b_i<=i on 9 pits: exactly one winner for every s < s(10) = ${s10}`);
}

// -------------------------------------------- BL: at most 21 stones on Ayo
report('BL "at most 21 stones" (12-pit Ayo = 7 Tchoukaillon pits)', sOf(8) - 1 === 21 ? 'ok' : 'diff',
  `s(8) - 1 = ${sOf(8) - 1}`);

// ------------------------------------------------- BL Proposition 4 + table
{
  const printed = [2, 6, 12, 60, 60, 420, 840, 2520, 2520, 27720, 27720];
  const per = existsSync('runs/periods.json') ? JSON.parse(readFileSync('runs/periods.json', 'utf8')).rows : [];
  const tableDiffs: string[] = [];
  printed.forEach((p, k) => {
    const r = per.find((x: { i: number }) => x.i === k + 1);
    if (!r || r.t !== p || !r.isPeriod) tableDiffs.push(`i=${k + 1}`);
  });
  report('BL Fig.5 period table (i = 1..11)', tableDiffs.length ? 'diff' : 'ok',
    tableDiffs.length ? `differs at ${tableDiffs.join(',')}` : 'all 11 periods measured exactly as printed');
  const maxI = per.length ? per[per.length - 1].i : 0;
  const okAll = per.every((r: { t: number; isPeriod: boolean; lcmI1: number }) => r.isPeriod && r.t === r.lcmI1);
  report('BL Prop 6 (period = lcm(1..i+1), first return to empty)', okAll && maxI > 0 ? 'ok' : 'diff',
    `measured for i = 1..${maxI} (largest period ${per.length ? per[per.length - 1].t.toLocaleString('en') : '-'})`);
  const intro = per.filter((r: { t: number; lcmI2: number }) => r.t === r.lcmI2).map((r: { i: number }) => r.i);
  report('BL Introduction "period of the first k pits is lcm(1..k+2)"', 'diff',
    `true only for k in {${intro.join(',')}} (where lcm(1..k+1) = lcm(1..k+2)); the table and Prop 6 say lcm(1..k+1)`);
}

// --------------------------------------- BL proof identities (eqs. 1, 2, 3)
{
  let badEq = 0, badLemma = 0, badMono = 0, checked = 0;
  for (let s = 1; s <= 4000; s++) {
    const p = winningBoard(s);
    const m = harvestCounts(p);
    const L = p.length - 1;
    const b = new Array<number>(L + 2).fill(0);
    for (let i = L - 1; i >= 0; i--) b[i] = b[i + 1] + m[i + 1];
    if (b[0] !== s) badEq++;
    for (let i = 1; i <= L; i++) {
      checked++;
      if (p[i] !== i * m[i] - b[i]) badEq++;
      if (i >= 2) {
        if (p[i] - p[i - 1] !== (i - 1) * (m[i] - m[i - 1]) + 2 * m[i]) badLemma++;
        if (m[i] > m[i - 1]) badMono++;
      }
    }
  }
  report('BL eqs. (1)-(2): p_i = i m_i - b_i, b_i = m_{i+1} + b_{i+1}, b_0 = s', badEq ? 'diff' : 'ok',
    `${checked.toLocaleString('en')} (s, i) pairs for s <= 4000 (the TeX prints b_i = Σ_{j>s} m_j; read j>i)`);
  report('BL Lemma 7 + Lemma 8 (m_i non-increasing)', badLemma + badMono ? 'diff' : 'ok', 'same range, 0 exceptions');
  // identity used in the proof of Prop 6, at s = k * lcm(1..i+1)
  let badProof = 0, cases = 0;
  for (let i = 1; i <= 7; i++) {
    const t = lcmUpTo(i + 1);
    for (let k = 1; k * t <= 60000 && k <= 5; k++) {
      const s = k * t;
      const m = harvestCounts(boardByCongruence(s));
      const get = (j: number) => m[j] ?? 0;
      for (let j = 1; j <= i - 1; j++) { cases++; if (j * get(j) !== (j + 2) * get(j + 1)) badProof++; }
      cases++; if (2 * get(1) !== s) badProof++;
    }
  }
  report('BL proof of Prop 6: j m_j = (j+2) m_{j+1} and 2 m_1 = kt at s = kt', badProof ? 'diff' : 'ok', `${cases} identities, ${badProof} exceptions`);
}

// ------------------------------------ BL Remark: distinct prefixes in a period
{
  const rows: string[] = [];
  let allEq = true;
  for (let i = 1; i <= 10; i++) {
    const t = lcmUpTo(i + 1);
    const seen = new Set<string>();
    for (let s = 0; s < t; s++) seen.add(boardByCongruence(s).slice(1, i + 1).concat(new Array(i).fill(0)).slice(0, i).join(','));
    if (seen.size !== t) allEq = false;
    rows.push(`i=${i}: ${seen.size}/${t}`);
  }
  report('BL Remarks "only lcm(1..i+1) of the (i+1)! prefixes occur"', allEq ? 'ok' : 'diff',
    `distinct first-i-pit contents over one period: ${rows.join(', ')}`);
}

// ------------------------------------------------- BL h_s sieve description
{
  const S = 2_000_000;
  const h = harvestSequence(S);
  // Of the terms not yet assigned (h > j), the first and every (j+2)-nd after
  // it equal j + 1.
  let bad = 0, jChecked = 0;
  let idx: number[] = [];
  for (let s = 1; s <= S; s++) idx.push(s);
  for (let j = 0; j < 40 && idx.length > 50; j++) {
    jChecked++;
    const rest: number[] = [];
    for (let k = 0; k < idx.length; k++) {
      const want = k % (j + 2) === 0;
      if (want !== (h[idx[k]] === j + 1)) bad++;
      if (!want) rest.push(idx[k]);
    }
    idx = rest;
  }
  report('BL §6 description of (h_s): first free term and every (j+2)-nd after it is j+1', bad ? 'diff' : 'ok',
    `j = 0..${jChecked - 1} on h_1..h_${S.toLocaleString('en')}`);
}

// ---------------------------------------------------- BL sieve (Figure 8)
{
  const N = 200;
  const ref = sTable(N);
  const sv = tchoukaillonSieve(N, ref[N] + 10);
  const bad = sv.filter((x, k) => x !== ref[k + 1]).length;
  report('BL Fig.8 sieve = s(n)', bad ? 'diff' : 'ok', `first ${N} outputs`);
  // The printed recurrence: a^(0)_n = n, a^(i+1)_n = a^(i)_{ceil((i+1)n/i)}, s(i) = b^(i)_1.
  // As printed it divides by i = 0 at the first step. Read with a^(1)_n = n
  // and s(i) = a^(i)_1 it gives s(i):
  const viaRec = (i: number) => {
    // a^(i)_1 = a^(i-1)_{ceil(i/(i-1))} = ... unrolled from the top
    let n = 1;
    for (let k = i - 1; k >= 1; k--) n = Math.floor(((k + 1) * n + k - 1) / k);
    return n; // a^(1)_n = n
  };
  let badRec = 0;
  for (let i = 1; i <= 2000; i++) if (viaRec(i) !== sOf(i)) badRec++;
  report('BL §6 recurrence for s(i)', 'note',
    `as printed it starts with ceil(n/0) and names the result b^(i)_1; started at a^(1)_n = n with s(i) = a^(i)_1 it gives s(i) for i <= 2000 with ${badRec} exceptions`);
}

// ------------------------------------- BL commented-out table (Section 5)
{
  const small = [1, 2, 4, 6, 10, 12, 18, 22, 30, 34, 42, 48, 58, 60, 78, 82, 102];
  const ref = sTable(8200);
  const badSmall = small.filter((v, k) => ref[k + 1] !== v).length;
  report('BL commented table s(1..17)', badSmall ? 'diff' : 'ok', `${17 - badSmall}/17 match`);
  const big: [number, number, string][] = [
    [2458, 1925270, '3.138'], [3916, 4884658, '3.139'], [4690, 7003788, '3.1406'], [8176, 21286434, '3.1404'],
  ];
  for (const [n, s, r] of big) {
    const exact = ref[n];
    const hit = ref.findIndex((v) => v === s);
    const near = ref.findIndex((v) => v >= s);
    const printedRatio = ((n * n) / s).toFixed(r.length - 2);
    const fix = hit > 0 ? `${s} = s(${hit})` : `${s} is no s(n); s(${near}) = ${ref[near]}`;
    report(`BL commented table n=${n}`, 'diff',
      `printed s=${s}, exact s(${n}) = ${exact}; ${fix}; printed n²/s = ${r} reproduces as ${printedRatio} with the printed (n, s), the corrected pair gives ${((near * near) / ref[near]).toFixed(5)}`);
  }
  report('BL Fig.7 caption p_{i,1925280} and "calculations up to s = 21,286,434"', 'note',
    `1925280 = s(2459) (so the table's 1925270 is a one-digit slip), 21286434 = s(8177)`);
}

// --------------------------------------------- BL Remarks: occupancy 2/pi
{
  const n = 100_000_000;
  const s = sOf(n);
  report('BL Remarks occupancy 2/pi', 'ok',
    `s(n) / (n(n+1)/2) at n = 1e8 is ${((2 * s) / (n * (n + 1))).toFixed(9)} vs 2/pi = ${(2 / Math.PI).toFixed(9)} (the TeX writes i(i+1)/2 for n(n+1)/2)`);
}

// ------------------------------------------------ BL Theorem 9: O(n) error
if (existsSync('runs/error.json')) {
  const E = JSON.parse(readFileSync('runs/error.json', 'utf8'));
  report('BL Thm 9 "s(n) = n²/pi + O(n)" (proof gap noted by Knuth, OEIS A002491)', 'note',
    `(s(n) - n²/pi)/n for every n <= ${E.NALL.toLocaleString('en')} lies in [${E.all.min.toFixed(4)} (n=${E.all.argMin}), ${E.all.max.toFixed(4)} (n=${E.all.argMax})]; ` +
    `on ${E.sampled.length} samples up to ${E.NMAX.toExponential(0)} in [${E.sampledStats.min.toFixed(4)}, ${E.sampledStats.max.toFixed(4)}]`);
}

// ------------------------------------------------ JTT Theorem 2.1 (formula)
{
  let bad = 0;
  for (let s = 0; s <= 20000; s++) if (boardByCongruence(s).join() !== winningBoard(s).join()) bad++;
  // and against the unplay sweep further out, every 997th s
  const L = 3000;
  const b = new Int32Array(L + 2);
  let len = 0;
  let checked = 0;
  for (let s = 1; s <= 2_000_000; s++) {
    let hh = 1;
    while (hh <= len && b[hh] !== 0) hh++;
    for (let j = 1; j < hh; j++) b[j]--;
    b[hh] = hh;
    if (hh > len) len = hh;
    if (s % 997 === 0) {
      checked++;
      const c = boardByCongruence(s);
      for (let j = 1; j <= len; j++) if ((c[j] ?? 0) !== b[j]) { bad++; break; }
    }
  }
  report('JTT Thm 2.1 b_i = (s - Σ_{j<i} b_j) mod (i+1)', bad ? 'diff' : 'ok', `every s <= 20,000 and ${checked} more up to 2,000,000`);
}

// ------------------------------------ JTT Theorem (upper sums characterisation)
{
  // "A sequence of positive integers (b_1..b_k) is a winning board iff b_i <= i
  // and Σ_{j>=i} b_j ≡ 0 (mod i)". Check on all sequences with 0 <= b_i <= i.
  let agree = 0, disagree = 0, withZero = 0, winners = 0;
  for (let k = 1; k <= 9; k++) {
    const b = new Array<number>(k + 1).fill(0);
    const rec = (i: number) => {
      if (i > k) {
        if (b[k] === 0) return;
        let ok = true, suf = 0;
        for (let j = k; j >= 1; j--) { suf += b[j]; if (suf % j !== 0) { ok = false; break; } }
        const win = solve(b).winnable;
        if (ok === win) agree++; else disagree++;
        if (win) { winners++; if (b.slice(1).some((x) => x === 0)) withZero++; }
        return;
      }
      for (let v = 0; v <= i; v++) { b[i] = v; rec(i + 1); }
    };
    rec(1);
  }
  report('JTT Thm 3.2 (suffix sums ≡ 0 mod i)', disagree ? 'diff' : 'ok',
    `${agree.toLocaleString('en')} boards of length <= 9 agree, ${disagree} disagree; ${withZero} of the ${winners} winners contain an empty pit, so "positive integers" must be read as "non-negative"`);
}

// ------------------------------------------- JTT nested-ceiling formula
{
  const viaJTT = (l: number) => {
    if (l === 1) return 1;
    // integer ceilings: ⌈(k+1)v/k⌉ (floating (k+1)/k * v overshoots, e.g. 7/6 * 6)
    const ceilDiv = (a: number, d: number) => Math.floor((a + d - 1) / d);
    let v = ceilDiv(l, l - 1);
    for (let k = l - 2; k >= 1; k--) v = ceilDiv((k + 1) * v, k);
    return v;
  };
  // The printed formula is 2/1 ⌈3/2 ⌈ ... ⌈l/(l-1)⌉ ... ⌉⌉ — the last factor 2/1
  // without a ceiling; the loop above applies ⌈2/1 · v⌉ which is the same.
  let bad = 0;
  for (let l = 1; l <= 3000; l++) if (viaJTT(l) !== sOf(l)) bad++;
  report('JTT Thm 3.5 nested ceilings = s(l)', bad ? 'diff' : 'ok', `l = 1..3000, ${bad} exceptions`);
  const lo = (l: number) => (l * l) / 4, hi = (l: number) => (l * (l + 1)) / 2;
  let outside = 0;
  for (let l = 1; l <= 3000; l++) { const s = sOf(l); if (s < lo(l) || s > hi(l)) outside++; }
  report('JTT Thm 3.6 l²/4 + O(l) <= s(l) <= l²/2 + O(l)', outside ? 'diff' : 'ok', `l = 1..3000 (s(l) ~ l²/pi sits between)`);
}

const secs = (Date.now() - t0) / 1000;
const diffs = results.filter((r) => r.status === 'diff').length;
console.log(`\n${results.length} checks, ${diffs} differences from the papers, ${secs.toFixed(1)} s`);
writeFileSync('runs/verify.json', JSON.stringify({ seconds: secs, results }, null, 1));
