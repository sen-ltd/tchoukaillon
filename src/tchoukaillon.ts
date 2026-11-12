// Tchoukaillon: a one-row mancala solitaire.
//
// Pits are numbered 1, 2, 3, ... away from the store (the Roumba, pit 0).
// A move harvests pit i: its stones are sown one per pit toward the store,
// into pits i-1, ..., 1 and the last one into the store. The move is legal
// only when the last stone lands in the store, i.e. pit i holds exactly i
// stones. The game is won when every stone is in the store.
//
// Board arrays are indexed by pit number; index 0 is unused (the store is
// not part of the board). Trailing zeros carry no meaning.

export type Board = number[];

/** Total number of stones on the board (store excluded). */
export function stones(board: readonly number[]): number {
  let t = 0;
  for (let i = 1; i < board.length; i++) t += board[i];
  return t;
}

/** Highest non-empty pit, 0 for an empty board. */
export function length(board: readonly number[]): number {
  for (let i = board.length - 1; i >= 1; i--) if (board[i] !== 0) return i;
  return 0;
}

/** Pits that may be harvested now (pit i holds exactly i stones), ascending. */
export function harvestable(board: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < board.length; i++) if (board[i] === i) out.push(i);
  return out;
}

/** Harvest pit i. Throws if the move is illegal. Returns a new board. */
export function harvest(board: readonly number[], i: number): Board {
  if (!Number.isInteger(i) || i < 1 || i >= board.length || board[i] !== i) {
    throw new Error(`pit ${i} cannot be harvested`);
  }
  const b = board.slice();
  b[i] = 0;
  for (let j = 1; j < i; j++) b[j] += 1;
  return b;
}

export interface Verdict {
  /** True when every stone can be pocketed. */
  winnable: boolean;
  /** The unique winning move, or null if the board is lost or already empty. */
  move: number | null;
  /** The whole winning line (pits harvested in order) when winnable. */
  line: number[];
}

/**
 * Exact solver. If a win exists, the winning move is the smallest
 * harvestable pit (harvesting a larger pit j overfills every smaller
 * harvestable pit i, which then never empties). So greedy play from the
 * smallest harvestable pit is not a heuristic: it decides the position.
 */
export function solve(board: readonly number[]): Verdict {
  const b = board.slice();
  const line: number[] = [];
  let left = stones(b);
  while (left > 0) {
    let i = 1;
    while (i < b.length && b[i] !== i) i++;
    if (i >= b.length) return { winnable: false, move: null, line: [] };
    b[i] = 0;
    for (let j = 1; j < i; j++) b[j] += 1;
    left -= 1;
    line.push(i);
  }
  return { winnable: true, move: line.length > 0 ? line[0] : null, line };
}

/**
 * The backward step of Broline–Loeb: take the lowest empty pit h, put h
 * stones in it and take one stone from every pit below it. Applied to the
 * unique winning board with s stones it gives the one with s + 1 stones.
 * Mutates `b` (which must be long enough) and returns h.
 */
export function unplayInPlace(b: number[] | Int32Array, len: number): number {
  let h = 1;
  while (h <= len && b[h] !== 0) h++;
  for (let j = 1; j < h; j++) b[j] -= 1;
  b[h] = h;
  return h;
}

/** The unique winning board with s stones (O(s log s) by unplaying). */
export function winningBoard(s: number): Board {
  if (!Number.isInteger(s) || s < 0) throw new Error('s must be a non-negative integer');
  // Length of the board for s stones is about sqrt(pi s); leave room.
  const cap = Math.ceil(Math.sqrt(Math.PI * s) * 1.2) + 8;
  const b = new Array<number>(cap + 1).fill(0);
  let len = 0;
  for (let k = 0; k < s; k++) {
    const h = unplayInPlace(b, len);
    if (h > len) len = h;
  }
  return b.slice(0, len + 1);
}

/**
 * The harvest sequence h_1, h_2, ..., h_S: h_s is the pit that receives
 * stones when going from s - 1 to s stones (equivalently the first pit
 * harvested from the s-stone winning board).
 */
export function harvestSequence(S: number): Int32Array {
  const h = new Int32Array(S + 1);
  const cap = Math.ceil(Math.sqrt(Math.PI * S) * 1.2) + 8;
  const b = new Int32Array(cap + 1);
  let len = 0;
  for (let s = 1; s <= S; s++) {
    const x = unplayInPlace(b, len);
    if (x > len) len = x;
    h[s] = x;
  }
  return h;
}

/**
 * s(n): the smallest number of stones whose winning board uses pit n
 * (OEIS A002491). Computed by the rounding rule: start at n and round up
 * to the next multiple of n-1, n-2, ..., 1. Exact for s(n) < 2^53, i.e.
 * n up to about 1.68e8.
 */
export function sOf(n: number): number {
  if (!Number.isInteger(n) || n < 1) throw new Error('n must be a positive integer');
  let x = n;
  for (let k = n - 1; k >= 2; k--) {
    const r = x % k;
    if (r !== 0) x += k - r;
  }
  if (x > Number.MAX_SAFE_INTEGER) throw new Error('s(n) exceeds 2^53');
  return x;
}

/** s(1..N) by unplaying (records when each pit is first used). */
export function sTable(N: number): number[] {
  const out = [0];
  const b = new Int32Array(N + 2);
  let len = 0;
  let s = 0;
  while (len < N) {
    s++;
    const h = unplayInPlace(b, len);
    if (h > len) {
      len = h;
      out[h] = s;
    }
  }
  return out;
}

/**
 * The "sieve from Tchoukaillon" (Broline–Loeb, Figure 8, also David 1957):
 * from 1, 2, 3, ... repeatedly take the first unslashed number as the next
 * output, then slash out it and every (n+1)-st unslashed number after it.
 * Returns the first `count` outputs; works on the prefix 1..limit.
 */
export function tchoukaillonSieve(count: number, limit: number): number[] {
  let list: number[] = [];
  for (let x = 1; x <= limit; x++) list.push(x);
  const out: number[] = [];
  for (let n = 1; n <= count && list.length > 0; n++) {
    out.push(list[0]);
    const step = n + 1;
    list = list.filter((_, idx) => idx % step !== 0);
  }
  return out;
}

export function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

export function lcmUpTo(k: number): number {
  let l = 1;
  for (let i = 2; i <= k; i++) l = (l / gcd(l, i)) * i;
  return l;
}

/**
 * Smallest period of the sequence of i-tuples (p_1,s, ..., p_i,s), s >= 0,
 * measured directly: t = the first s > 0 with pits 1..i all empty (no
 * period can be smaller, since s = 0 is the all-empty tuple), then the
 * tuples at s and s + t are compared for every s in [0, t) with two
 * boards run in lockstep. Returns null if t is not a period.
 */
export function measurePeriod(i: number): { t: number; isPeriod: boolean } {
  const cap = 64 + i * 4;
  const grow = (b: Int32Array, need: number): Int32Array => {
    if (need < b.length) return b;
    const nb = new Int32Array(Math.max(need + 1, b.length * 2));
    nb.set(b);
    return nb;
  };
  let a: Int32Array = new Int32Array(cap);
  let lenA = 0;
  let t = 0;
  // Advance a until pits 1..i are empty again; count non-empty among 1..i.
  let busy = 0;
  do {
    t++;
    let h = 1;
    while (h <= lenA && a[h] !== 0) h++;
    a = grow(a, h + 1);
    for (let j = 1; j < h; j++) {
      a[j] -= 1;
      if (j <= i && a[j] === 0) busy--;
    }
    a[h] = h;
    if (h <= i) busy++;
    if (h > lenA) lenA = h;
  } while (busy !== 0);
  // Lockstep: b starts at 0, a at t. Compare pits 1..i after each step.
  let b: Int32Array = new Int32Array(cap);
  let lenB = 0;
  const step = (arr: Int32Array, len: number): [Int32Array, number, number] => {
    let h = 1;
    while (h <= len && arr[h] !== 0) h++;
    arr = grow(arr, h + 1);
    for (let j = 1; j < h; j++) arr[j] -= 1;
    arr[h] = h;
    return [arr, Math.max(len, h), h];
  };
  for (let s = 0; s < t; s++) {
    let ha: number, hb: number;
    [a, lenA, ha] = step(a, lenA);
    [b, lenB, hb] = step(b, lenB);
    const top = Math.min(i, Math.max(ha, hb));
    for (let j = 1; j <= top; j++) if (a[j] !== b[j]) return { t, isPeriod: false };
  }
  return { t, isPeriod: true };
}

/**
 * The winning board with s stones directly, without unplaying
 * (Jones–Taalman–Tongen 2013, Theorem 2.1): b_i = (s - b_1 - ... - b_{i-1})
 * mod (i + 1), taken in 0..i. O(length) per board, so even s = 10^12 is
 * instant. Exact while s < 2^53.
 */
export function boardByCongruence(s: number): Board {
  if (!Number.isInteger(s) || s < 0 || s > Number.MAX_SAFE_INTEGER) throw new Error('bad s');
  const b: number[] = [0];
  let rest = s;
  for (let i = 1; rest > 0; i++) {
    const v = rest % (i + 1);
    b.push(v);
    rest -= v;
  }
  return b.slice(0, length(b) + 1);
}

/** Times each pit is harvested along the winning line (m_i in Broline–Loeb). */
export function harvestCounts(board: readonly number[]): number[] {
  const v = solve(board);
  if (!v.winnable) throw new Error('board is not winnable');
  const m = new Array<number>(board.length).fill(0);
  for (const i of v.line) m[i]++;
  return m;
}
