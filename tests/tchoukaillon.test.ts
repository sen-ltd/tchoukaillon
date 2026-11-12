import { describe, expect, it } from 'vitest';
import {
  boardByCongruence, harvest, harvestable, harvestCounts, harvestSequence, lcmUpTo, length,
  measurePeriod, sOf, sTable, solve, stones, tchoukaillonSieve, winningBoard,
} from '../src/tchoukaillon.ts';

/** exhaustive solver: try every legal move (no greedy shortcut) */
function bruteWinnable(b: number[]): boolean {
  if (stones(b) === 0) return true;
  return harvestable(b).some((i) => bruteWinnable(harvest(b, i)));
}

describe('moves', () => {
  it('harvests exactly i stones from pit i, one per lower pit, one to the store', () => {
    expect(harvest([0, 0, 1, 3], 3)).toEqual([0, 1, 2, 0]);
    expect(stones(harvest([0, 0, 1, 3], 3))).toBe(3);
    expect(() => harvest([0, 0, 1, 2], 3)).toThrow();
    expect(() => harvest([0, 1], 2)).toThrow();
    expect(harvestable([0, 1, 1, 3, 0, 5])).toEqual([1, 3, 5]);
  });

  it('length ignores trailing empty pits', () => {
    expect(length([0, 1, 0, 0])).toBe(1);
    expect(length([0, 0, 0])).toBe(0);
  });
});

describe('solver', () => {
  it('smallest-harvestable greedy agrees with exhaustive search on every board of length <= 7', () => {
    let boards = 0;
    const L = 7;
    const b = new Array<number>(L + 1).fill(0);
    const rec = (i: number): void => {
      if (i > L) {
        boards++;
        expect(solve(b).winnable).toBe(bruteWinnable(b));
        return;
      }
      // allow overfull pits too (up to i + 1): they make a board lost
      for (let v = 0; v <= i + 1; v++) { b[i] = v; rec(i + 1); }
    };
    rec(1);
    expect(boards).toBe(3 * 4 * 5 * 6 * 7 * 8 * 9);
  });

  it('the winning move is the smallest harvestable pit, and the line empties the board', () => {
    const b = [0, 1, 1, 3, 0, 5];
    const v = solve(b);
    expect(v.winnable).toBe(false);
    const w = winningBoard(24);
    const vw = solve(w);
    expect(vw.winnable).toBe(true);
    expect(vw.move).toBe(4);
    let cur = w;
    for (const i of vw.line) cur = harvest(cur, i);
    expect(stones(cur)).toBe(0);
    expect(vw.line.length).toBe(24);
  });
});

describe('winning boards', () => {
  it('match Broline–Loeb Figure 1', () => {
    expect(winningBoard(9).slice(1)).toEqual([1, 2, 2, 4]);
    expect(winningBoard(22).slice(1)).toEqual([0, 1, 1, 0, 2, 4, 6, 8]);
    expect(winningBoard(24).slice(1)).toEqual([0, 0, 0, 4, 2, 4, 6, 8]);
  });

  it('the congruence formula (Jones–Taalman–Tongen) equals unplaying', () => {
    for (let s = 0; s <= 5000; s++) expect(boardByCongruence(s)).toEqual(winningBoard(s));
  });

  it('every winning board is winnable and holds s stones', () => {
    for (const s of [0, 1, 2, 3, 100, 1234, 99999]) {
      const b = boardByCongruence(s);
      expect(stones(b)).toBe(s);
      expect(solve(b).winnable).toBe(true);
    }
  });

  it('harvest counts satisfy p_i = i m_i - b_i', () => {
    for (const s of [17, 360, 2521]) {
      const p = boardByCongruence(s);
      const m = harvestCounts(p);
      let b = 0;
      for (let i = p.length - 1; i >= 1; i--) {
        expect(p[i]).toBe(i * m[i] - b);
        b += m[i];
      }
      expect(b).toBe(s);
    }
  });
});

describe('s(n), OEIS A002491', () => {
  const oeis = [1, 2, 4, 6, 10, 12, 18, 22, 30, 34, 42, 48, 58, 60, 78, 82, 102, 108, 118, 132, 150, 154, 174, 192, 210, 214, 240, 258, 274, 282, 322, 330, 360, 372, 402, 418, 442, 454, 498, 510, 540, 570, 612, 622, 648, 672, 718, 732, 780, 802, 840, 870, 918];
  it('rounding rule, unplaying sweep, sieve and OEIS agree', () => {
    const t = sTable(oeis.length);
    const sv = tchoukaillonSieve(oeis.length, 1000);
    oeis.forEach((v, k) => {
      expect(sOf(k + 1)).toBe(v);
      expect(t[k + 1]).toBe(v);
      expect(sv[k]).toBe(v);
    });
  });

  it('the values Broline–Loeb printed for n = 3916, 4690, 8176 are s(n + 1)', () => {
    expect(sOf(3917)).toBe(4884658);
    expect(sOf(4691)).toBe(7003788);
    expect(sOf(8177)).toBe(21286434);
    expect(sOf(2459)).toBe(1925280);
    expect(sOf(2458)).toBe(1923622);
  });

  it('s(n) is the first s whose board has length n', () => {
    const h = harvestSequence(200);
    for (let n = 1; n <= 12; n++) {
      const s = sOf(n);
      expect(h[s]).toBe(n);
      for (let k = 1; k < s; k++) expect(h[k]).toBeLessThan(n);
      expect(length(boardByCongruence(s))).toBe(n);
      expect(length(boardByCongruence(s - 1))).toBe(n - 1);
    }
  });
});

describe('periodicity', () => {
  it('the first i pits repeat with period lcm(1..i+1), not lcm(1..i+2)', () => {
    for (let i = 1; i <= 11; i++) {
      const { t, isPeriod } = measurePeriod(i);
      expect(isPeriod).toBe(true);
      expect(t).toBe(lcmUpTo(i + 1));
    }
    expect(lcmUpTo(3)).not.toBe(lcmUpTo(2)); // i = 1: 6 vs 2
  });
});
