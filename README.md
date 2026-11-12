# Tchoukaillon

A browser implementation of **Tchoukaillon**, a one-row mancala solitaire, with an exact solver. It also recomputes every checkable claim of the two papers on the game.

Pits are numbered 1, 2, 3, … away from the store. Harvesting pit *i* sows its stones one per pit toward the store, so a move is legal only when pit *i* holds **exactly *i*** stones and the last stone lands in the store. You win by pocketing every stone.

- **Exact solver.** If a win exists, the winning move is the *smallest* harvestable pit. Harvesting a larger pit overfills every smaller harvestable pit, and an overfilled pit never empties. So greedy play decides any position. The tests check this against exhaustive search on all 181,440 boards of length ≤ 7, overfull pits included.
- **One winning board per number of stones.** The board for *s* stones comes straight from the congruences b<sub>i</sub> = (s − b<sub>1</sub> − … − b<sub>i−1</sub>) mod (i+1), with no unplaying. This makes s = 10¹² instant, so the demo can draw the board for any *s* (Broline–Loeb's Figure 7, whose image is missing from the e-print).
- **The n²/π law, measured.** s(n) is the smallest number of stones whose winning board uses pit *n* (OEIS A002491). It was computed for every n ≤ 40,000 and at 503 log-spaced n up to 10⁸, and the demo plots (s(n) − n²/π)/n.
- **Paper check.** `npm run verify` recomputes 26 statements, listed below.

## What the check finds

The sources are D. M. Broline and D. E. Loeb, *The combinatorics of Mancala-type games: Ayo, Tchoukaillon, and 1/π* ([arXiv:math/9502225](https://arxiv.org/abs/math/9502225), UMAP J. 1995), and B. Jones, L. Taalman and A. Tongen, *Solitaire Mancala Games and the Chinese Remainder Theorem* ([arXiv:1112.3593](https://arxiv.org/abs/1112.3593), Amer. Math. Monthly 2013). All numbers were transcribed from the TeX sources.

| claim | result |
|---|---|
| BL Figure 4, winning boards for s ≤ 24 | all 24 boards match; the harvest column for s = 24 says 1, but it should be 4 (the bold pit in that row is 4) |
| BL Figure 5, periods of the first i pits (i ≤ 11) | all match, and the measurements extend to i = 21: the period is lcm(1..i+1) |
| BL introduction: "periodicity … of lcm(1, 2, …, k+2)" | holds only where lcm(1..k+1) = lcm(1..k+2); the table and Proposition 6 say lcm(1..k+1) |
| BL Proposition 6 proof identities, Lemmas 7–8, eqs. (1)–(2) | 0 exceptions (the TeX has Σ<sub>j>s</sub> where Σ<sub>j>i</sub> is meant) |
| BL remark: only lcm(1..i+1) of the (i+1)! prefixes occur | exactly lcm(1..i+1) distinct prefixes for i ≤ 10 |
| BL §6 description of (h<sub>s</sub>), Figure 8 sieve | 0 exceptions; the printed recurrence divides by 0 at its first step and works when started at a<sup>(1)</sup><sub>n</sub> = n |
| BL table of s(n), commented out in the TeX of §5 | s(1..17) match; three of the four large entries are s(n+1), not s(n), and 1,925,270 is no s(n) at all (s(2459) = 1,925,280, the number in Figure 7's caption) |
| BL Theorem 9, s(n) = n²/π + O(n) | the proof has a gap (Knuth, OEIS A002491); measured, (s(n) − n²/π)/n stays between about −1.4 and 2.0 |
| JTT Theorems 2.1, 3.2, 3.5, 3.6 | 0 exceptions; Theorem 3.2 says "positive integers", but 24 of the 33 winning boards of length ≤ 9 have an empty pit |

`runs/verify.json` holds the full report.

## Run

```sh
npm install
npm run dev        # demo at http://localhost:5173/portfolio/tchoukaillon/
npm test           # 12 tests
npm run verify     # paper check (about 30 s), writes runs/verify.json
npm run periods    # periods for i = 1..21 (about 4 min), writes runs/periods.json
npm run error      # s(n) to 10^8 (about 13 min), writes runs/error.json
npm run build
```

`src/tchoukaillon.ts` contains the whole game and solver with no dependencies: moves, solver, winning boards (by unplaying and by congruences), s(n) by the rounding rule, the sieve, and period measurement.

## License

MIT © 2026 SEN LLC
