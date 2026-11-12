import './style.css';
import {
  boardByCongruence, harvest, harvestable, length, solve, stones, type Board,
} from './tchoukaillon.ts';
import errorRun from '../runs/error.json';
import periodRun from '../runs/periods.json';
import verifyRun from '../runs/verify.json';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const fmt = (x: number) => x.toLocaleString('en');

// ------------------------------------------------------------------ play
let board: Board = boardByCongruence(24);
let history: Board[] = [];
let pocketed = 0;
let pocketedHist: number[] = [];

const sIn = $<HTMLInputElement>('sIn');
const hints = $<HTMLInputElement>('hints');
const edit = $<HTMLInputElement>('edit');
const boardEl = $('board');
const statusEl = $('status');

function load(b: Board) {
  board = b.slice();
  history = [];
  pocketedHist = [];
  pocketed = 0;
  render();
}

function parseCount(v: string, max: number): number | null {
  const x = Number(v.replace(/[,_\s]/g, ''));
  return Number.isInteger(x) && x >= 0 && x <= max ? x : null;
}

function render() {
  const L = Math.max(length(board), 1);
  const v = solve(board);
  const legal = new Set(harvestable(board));
  boardEl.innerHTML = '';
  const row = document.createElement('div');
  row.className = 'row';
  const store = document.createElement('div');
  store.className = 'pit store';
  store.innerHTML = `<div class="cnt">${pocketed}</div><div class="lab">store</div>`;
  row.appendChild(store);
  const showTo = edit.checked ? Math.max(L + 1, 4) : L;
  for (let i = 1; i <= showTo; i++) {
    const c = board[i] ?? 0;
    const el = document.createElement('button');
    el.className = 'pit';
    if (legal.has(i)) el.classList.add('legal');
    if (c > i) el.classList.add('over');
    let mark = '';
    if (hints.checked && legal.has(i) && !edit.checked) {
      if (v.winnable && v.move === i) { mark = '<span class="mk win-t">✓</span>'; el.classList.add('best'); }
      else mark = '<span class="mk lose-t">✗</span>';
    }
    const dots = c <= 12 ? '<span class="dots">' + '<i></i>'.repeat(c) + '</span>' : '';
    el.innerHTML = `${mark}<div class="cnt">${c}</div>${dots}<div class="lab">${i}</div>`;
    el.title = c > i ? `pit ${i} is overfull (${c} > ${i}): it can never be harvested` : `pit ${i}: ${c} stone${c === 1 ? '' : 's'}`;
    el.addEventListener('click', () => onPit(i));
    row.appendChild(el);
  }
  boardEl.appendChild(row);
  const left = stones(board);
  let msg: string;
  if (left === 0) msg = `<b class="win-t">Won.</b> All ${fmt(pocketed)} stones are in the store.`;
  else if (legal.size === 0) msg = `<b class="lose-t">Stuck.</b> No pit holds exactly its own number of stones; ${fmt(left)} left on the board.`;
  else if (v.winnable) msg = `${fmt(left)} stones on ${length(board)} pits — <b class="win-t">winnable</b>; the only winning move is pit ${v.move} (${v.line.length} harvests to go).`;
  else msg = `${fmt(left)} stones on ${length(board)} pits — <b class="lose-t">lost</b> whatever you do (playing the smallest harvestable pit fails, and nothing else does better).`;
  if (edit.checked) msg = 'Edit mode: click a pit to add a stone (pit i wraps back to 0 after i + 1). ' + msg;
  statusEl.innerHTML = msg;
}

function onPit(i: number) {
  if (edit.checked) {
    const b = board.slice();
    while (b.length <= i) b.push(0);
    b[i] = ((b[i] ?? 0) + 1) % (i + 2);
    board = b.slice(0, Math.max(length(b), 0) + 1);
    history = [];
    pocketedHist = [];
    render();
    return;
  }
  if ((board[i] ?? 0) !== i) return;
  history.push(board);
  pocketedHist.push(pocketed);
  board = harvest(board, i);
  board = board.slice(0, length(board) + 1);
  pocketed++;
  render();
}

$('load').addEventListener('click', () => {
  const s = parseCount(sIn.value, 5000);
  sIn.classList.toggle('bad', s === null);
  if (s !== null) load(boardByCongruence(s));
});
sIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('load').click(); });
$('random').addEventListener('click', () => {
  // random board with every pit at most full: usually lost, sometimes not
  const L = 5 + Math.floor(Math.random() * 6);
  const b = [0];
  for (let i = 1; i <= L; i++) b.push(Math.floor(Math.random() * (i + 1)));
  b[L] = Math.max(1, b[L]);
  load(b);
});
$('undo').addEventListener('click', () => {
  const b = history.pop();
  if (b) { board = b; pocketed = pocketedHist.pop() ?? 0; render(); }
});
$('auto').addEventListener('click', () => {
  const step = () => {
    const v = solve(board);
    if (!v.winnable || v.move === null) return;
    onPit(v.move);
    setTimeout(step, 120);
  };
  step();
});
hints.addEventListener('change', render);
edit.addEventListener('change', render);

// ------------------------------------------------------ big board (plow)
const bigIn = $<HTMLInputElement>('bigIn');
const bigSel = $<HTMLSelectElement>('bigSel');
function drawPlow() {
  const s = parseCount(bigIn.value, 1e15);
  bigIn.classList.toggle('bad', s === null);
  if (s === null) return;
  $('bigHead').textContent = fmt(s);
  const b = boardByCongruence(s);
  const L = length(b);
  const cv = $<HTMLCanvasElement>('plow');
  const ctx = cv.getContext('2d')!;
  const W = cv.width, H = cv.height, pad = 30;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#1d1f23';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#34373e';
  ctx.beginPath();
  ctx.moveTo(pad, H - pad); ctx.lineTo(W - 8, H - pad); ctx.moveTo(pad, H - pad); ctx.lineTo(pad, 8);
  ctx.stroke();
  // the diagonal p_i = i (a full pit)
  ctx.strokeStyle = '#4a4e57';
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(pad, H - pad); ctx.lineTo(W - 8, 8); ctx.stroke();
  ctx.setLineDash([]);
  const xs = (i: number) => pad + ((W - 8 - pad) * i) / L;
  const ys = (p: number) => H - pad - ((H - pad - 8) * p) / L;
  const r = L > 4000 ? 0.6 : L > 1000 ? 1 : 1.6;
  ctx.fillStyle = '#d9b45a';
  const stepI = Math.max(1, Math.floor(L / 60000));
  for (let i = 1; i <= L; i += stepI) {
    ctx.fillRect(xs(i) - r / 2, ys(b[i]) - r / 2, r, r);
  }
  ctx.fillStyle = '#9c9fa6';
  ctx.font = '11px ui-monospace, monospace';
  ctx.fillText(`pit 1 … ${fmt(L)}`, W - 120, H - 10);
  ctx.fillText('stones', 4, 16);
  const occ = (2 * s) / (L * (L + 1));
  $('plowNote').innerHTML =
    `Each dot is one pit (i, p<sub>i</sub>); the dashed line is a full pit p<sub>i</sub> = i. ${fmt(L)} pits, occupancy ${(occ * 100).toFixed(3)}% (→ 2/π = 63.662%). ` +
    `Pits harvested the same number of times M form arithmetic runs with step 2M (Broline–Loeb, proof of Theorem 9), which is the "plow" pattern. ` +
    `Computed directly from the congruences b<sub>i</sub> = (s − b<sub>1</sub> − … − b<sub>i−1</sub>) mod (i+1) (Jones–Taalman–Tongen), no unplaying.`;
}
bigIn.addEventListener('change', drawPlow);
bigIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') drawPlow(); });
bigSel.addEventListener('change', () => { bigIn.value = bigSel.value; drawPlow(); });

// ------------------------------------------------------- error-term plot
function drawErr() {
  const cv = $<HTMLCanvasElement>('err');
  const ctx = cv.getContext('2d')!;
  const W = cv.width, H = cv.height, pad = 34;
  ctx.fillStyle = '#1d1f23';
  ctx.fillRect(0, 0, W, H);
  const pts: [number, number][] = [];
  for (const [n, s] of errorRun.series as [number, number][]) pts.push([n, (s - (n * n) / Math.PI) / n]);
  for (const [n, s] of errorRun.sampled as [number, number][]) pts.push([n, (s - (n * n) / Math.PI) / n]);
  const lx0 = 0, lx1 = Math.log10(errorRun.NMAX);
  const y0 = -2, y1 = 2.5;
  const xs = (n: number) => pad + ((W - 10 - pad) * (Math.log10(n) - lx0)) / (lx1 - lx0);
  const ys = (v: number) => H - pad - ((H - pad - 10) * (v - y0)) / (y1 - y0);
  ctx.strokeStyle = '#34373e';
  ctx.fillStyle = '#9c9fa6';
  ctx.font = '11px ui-monospace, monospace';
  for (let d = 0; d <= lx1; d++) {
    const x = xs(10 ** d);
    ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, H - pad); ctx.stroke();
    ctx.fillText(`10${['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸'][d]}`, x - 8, H - pad + 16);
  }
  for (let v = -2; v <= 2; v++) {
    const y = ys(v);
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - 10, y); ctx.stroke();
    ctx.fillText(String(v), 8, y + 4);
  }
  for (const [n, e] of pts) {
    ctx.fillStyle = n <= errorRun.NALL ? 'rgba(217,180,90,0.55)' : '#7aa8ff';
    ctx.fillRect(xs(n) - 1, ys(e) - 1, 2, 2);
  }
  const a = errorRun.all, sm = errorRun.sampledStats;
  $('errNote').innerHTML =
    `Gold: every n ≤ ${fmt(errorRun.NALL)} (every 20th plotted), from one unplaying sweep. Blue: ${errorRun.sampled.length} log-spaced n up to 10⁸ by the rounding rule (start at n, round up to a multiple of n−1, n−2, …, 1). ` +
    `The ratio stays in [${a.min.toFixed(3)}, ${a.max.toFixed(3)}] for n ≤ ${fmt(errorRun.NALL)} and in [${sm.min.toFixed(3)}, ${sm.max.toFixed(3)}] on the samples: ` +
    `no sign of the n<sup>4/3</sup> growth that is all anyone has proved. Broline–Loeb's Theorem 9 claims O(n), but its proof has a gap (Knuth, OEIS A002491); this is evidence, not proof.`;
}

// ------------------------------------------------------------ periods
function drawPeriods() {
  const t = $<HTMLTableElement>('periods');
  const printed = [2, 6, 12, 60, 60, 420, 840, 2520, 2520, 27720, 27720];
  let html = '<tr><th>i</th><th>measured</th><th>paper table</th><th>lcm(1..i+2)</th></tr>';
  for (const r of periodRun.rows as { i: number; t: number; isPeriod: boolean; lcmI1: number; lcmI2: number }[]) {
    const p = printed[r.i - 1];
    html += `<tr><td>${r.i}</td><td class="num">${fmt(r.t)}${r.isPeriod ? '' : ' ?'}</td>` +
      `<td class="num ${p === undefined ? 'dim' : p === r.t ? 'win-t' : 'lose-t'}">${p === undefined ? '—' : fmt(p)}</td>` +
      `<td class="num ${r.lcmI2 === r.t ? 'dim' : 'lose-t'}">${fmt(r.lcmI2)}</td></tr>`;
  }
  t.innerHTML = html;
}

// ------------------------------------------------------------ checks
function drawChecks() {
  const res = verifyRun.results as { id: string; status: string; text: string }[];
  const diffs = res.filter((r) => r.status === 'diff').length;
  $('checkHead').textContent = `${res.length} items, ${diffs} differ`;
  $('checks').innerHTML = res.map((r) => {
    const icon = r.status === 'ok' ? '<span class="win-t">✓</span>' : r.status === 'diff' ? '<span class="lose-t">✗</span>' : '<span class="dim">·</span>';
    return `<div class="chk-row">${icon} <b>${r.id}</b><br><span class="small dim">${r.text}</span></div>`;
  }).join('');
}

render();
drawPlow();
drawErr();
drawPeriods();
drawChecks();
