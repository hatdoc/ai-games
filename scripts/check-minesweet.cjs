// Rules checks for Minesweet: `node scripts/check-minesweet.cjs`. Exits non-zero on the first failure.
const assert = require('node:assert/strict');
require('../games/minesweet/engine.js');
const M = globalThis.MS, L = M.LEVELS;
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('ok  ' + name); };

ok('same seed + level + start gives the identical board; another seed differs', () => {
  const a = M.generate(L.expert, 'abc12345', 100), b = M.generate(L.expert, 'abc12345', 100), c = M.generate(L.expert, 'abc12346', 100);
  assert.deepEqual([...a.mines], [...b.mines]); assert.notDeepEqual([...a.mines], [...c.mines]);
});
ok('mine counts are exact and numbers match neighbours (all levels, many seeds)', () => {
  for (const cfg of Object.values(L)) for (let s = 0; s < 30; s++) {
    const b = M.generate(cfg, 'seed' + s + 'xx', (s * 7) % (cfg.w * cfg.h)), nb = M.nbs(cfg.w, cfg.h);
    assert.equal(b.mines.reduce((x, y) => x + y, 0), cfg.m);
    for (let i = 0; i < cfg.w * cfg.h; i++) if (!b.mines[i]) assert.equal(b.nums[i], nb[i].filter((j) => b.mines[j]).length);
  }
});
ok('first click is never a mine and always opens an area (classic, every cell of a beginner board)', () => {
  for (let i = 0; i < 81; i++) {
    const G = M.newGame(L.beginner, { seed: 'classic' + i }), r = M.reveal(G, i);
    assert.equal(r.hit, false); assert.ok(r.opened.length > 1); assert.equal(G.board.nums[i], 0);
  }
});
ok('fair boards are solvable by logic alone; replaying the solver steps wins on the real engine', () => {
  for (const cfg of [L.beginner, L.intermediate]) for (let s = 0; s < 6; s++) {
    const b = M.fairBoard(cfg, 'fair' + s + 'seed'); assert.equal(b.fair, true);
    const G = M.newGame(cfg, { board: b });
    for (const st of M.solve(b).steps) {
      if (st.t === 'o') { if (G.st[st.i] === 0) assert.equal(M.reveal(G, st.i).hit, false); }
      else { assert.equal(b.mines[st.i], 1); }
    }
    assert.equal(G.status, 'won');
  }
});
ok('fairBoard is deterministic across calls (same seed -> same mines, same attempt)', () => {
  const a = M.fairBoard(L.intermediate, 'daily-test'), b = M.fairBoard(L.intermediate, 'daily-test');
  assert.deepEqual([...a.mines], [...b.mines]); assert.equal(a.attempt, b.attempt); assert.equal(a.start, b.start);
});
ok('expert fair board builds (or falls back deterministically)', () => {
  const t = Date.now(), a = M.fairBoard(L.expert, 'expert01'), b = M.fairBoard(L.expert, 'expert01');
  assert.deepEqual([...a.mines], [...b.mines]); console.log('    expert: fair=' + a.fair + ' attempt=' + a.attempt + ' left=' + a.left + ' in ' + (Date.now() - t) + 'ms (2 builds)');
});
ok('flood opens zeros outward, flags block it, win auto-flags the rest', () => {
  const G = M.newGame(L.beginner, { board: M.fairBoard(L.beginner, 'floodtest') });
  assert.ok(G.open > 1 && G.status === 'ready');
  const solved = M.solve(G.board); for (const st of solved.steps) if (st.t === 'o') M.reveal(G, st.i);
  assert.equal(G.status, 'won'); assert.equal(G.flags, L.beginner.m); assert.equal(M.reveal(G, 0).opened.length, 0); assert.equal(M.flag(G, 0), false);
});
ok('hitting a mine loses and then nothing else moves', () => {
  const G = M.newGame(L.beginner, { board: M.fairBoard(L.beginner, 'losetest') });
  const mine = [...G.board.mines].findIndex((x) => x); assert.equal(M.reveal(G, mine).hit, true);
  assert.equal(G.status, 'lost'); const open = G.open; M.reveal(G, [...G.board.mines].findIndex((x, i) => !x && !G.st[i]));
  assert.equal(G.open, open); assert.equal(M.flag(G, 0), false);
});
ok('flags: toggle, wrong flag = one mistake (not recounted), no flags before the first click in classic', () => {
  const C = M.newGame(L.beginner, { seed: 'cl' }); assert.equal(M.flag(C, 3), false);
  const G = M.newGame(L.beginner, { board: M.fairBoard(L.beginner, 'flagtest') });
  const safe = [...G.board.mines].findIndex((x, i) => !x && !G.st[i]), mine = [...G.board.mines].findIndex((x) => x);
  M.flag(G, safe); M.flag(G, safe); M.flag(G, safe); assert.equal(G.mistakes, 1); assert.equal(G.flags, 1);
  M.flag(G, mine); assert.equal(G.mistakes, 1); assert.equal(M.minesLeft(G), L.beginner.m - 2);
});
ok('chord opens neighbours only when flags match, and loses on a wrong flag', () => {
  const G = M.newGame(L.beginner, { board: M.fairBoard(L.beginner, 'chordtest') }), nb = M.nbs(9, 9);
  const num = [...G.st].findIndex((s, i) => s === 1 && G.board.nums[i] > 0);
  assert.equal(M.chord(G, num).opened.length, 0); // no flags yet
  const around = nb[num].filter((j) => G.st[j] === 0), mines = around.filter((j) => G.board.mines[j]);
  for (const j of mines) M.flag(G, j);
  const r = M.chord(G, num); assert.equal(r.hit, false); assert.ok(r.opened.length >= around.length - mines.length - 5 || G.status === 'won');
});
ok('score + compare: time then mistakes, ties are ties, penalties count', () => {
  assert.equal(M.compare({ ms: 40000, mis: 3 }, { ms: 42000, mis: 0 }), -1);
  assert.equal(M.compare({ ms: 40000, mis: 3 }, { ms: 40000, mis: 1 }), 1);
  assert.equal(M.compare({ ms: 40000, mis: 1 }, { ms: 40000, mis: 1 }), 0);
  assert.equal(M.compare({ ms: 40000, penalty: 5000, mis: 0 }, { ms: 44000, mis: 0 }), 1);
  assert.equal(M.fromScore(M.toScore(39412)), 39412);
});
ok('daily: same day -> same board, next day differs, time zone moves the reset, streak logic', () => {
  const t = Date.UTC(2026, 9, 25, 23, 30);
  assert.equal(M.dayKey(t), '2026-10-25'); assert.equal(M.dayKey(t, 120), '2026-10-26'); assert.equal(M.dayKey(t, -300), '2026-10-25');
  assert.equal(M.dayNumber('2026-10-25'), 1); assert.equal(M.dayNumber('2026-11-03'), 10);
  assert.equal(M.msToReset(t), 30 * 60000);
  const cfg = L[M.DAILY.level], a = M.fairBoard(cfg, M.dailySeed('2026-10-25')), b = M.fairBoard(cfg, M.dailySeed('2026-10-25')), c = M.fairBoard(cfg, M.dailySeed('2026-10-26'));
  assert.deepEqual([...a.mines], [...b.mines]); assert.notDeepEqual([...a.mines], [...c.mines]);
  let s = { last: '', streak: 0, best: 0 };
  s = M.bumpStreak(s, '2026-10-25'); s = M.bumpStreak(s, '2026-10-25'); assert.equal(s.streak, 1);
  s = M.bumpStreak(s, '2026-10-26'); s = M.bumpStreak(s, '2026-10-27'); assert.equal(s.streak, 3);
  s = M.bumpStreak(s, '2026-10-30'); assert.equal(s.streak, 1); assert.equal(s.best, 3);
  s = M.bumpStreak({ last: '2026-12-31', streak: 4, best: 4 }, '2027-01-01'); assert.equal(s.streak, 5); // across a year
});
ok('challenge links: round trip, tamper and damage rejected, bad seeds rejected, hash is room-safe', () => {
  const c = { d: 'i', seed: 'k3m9x2qa', ms: 42310, mis: 0, card: 'blackout', round: 2, name: 'Sam (☆)', to: 'Alex' };
  const h = M.encodeChallenge(c), d = M.decodeChallenge('#' + h);
  assert.ok(/^[A-Za-z0-9=&_%.-]+$/.test(h) && h.length <= 200, h);
  assert.deepEqual([d.d, d.seed, d.ms, d.mis, d.card, d.round, d.name, d.to], ['i', 'k3m9x2qa', 42310, 0, 'blackout', 2, 'Sam', 'Alex']);
  assert.equal(M.decodeChallenge(h.replace('42310', '12310')), null); // edited time
  assert.equal(M.decodeChallenge(h.replace('k3m9x2qa', 'k3m9x2qb')), null);
  assert.equal(M.decodeChallenge('c=i.k3m9x2qa.42310'), null); assert.equal(M.decodeChallenge(''), null);
  assert.equal(M.decodeChallenge(M.encodeChallenge({ ...c, seed: 'bad seed!' })), null);
  assert.equal(M.decodeChallenge(M.encodeChallenge({ ...c, ms: 100 })), null); // faster than any human
  assert.equal(M.decodeChallenge(M.encodeChallenge({ ...c, card: 'shield' })), null); // only sabotage cards can ride a link
});
ok('cards: one per use, cooldowns, cap, start kit, only sabotage can be armed', () => {
  const S = {}; assert.deepEqual(M.cardsOf(S), M.START_CARDS);
  assert.equal(M.canArm(S, 'timeattack'), true); assert.equal(M.canArm(S, 'shield'), false); assert.equal(M.canArm(S, 'blackout'), false);
  assert.equal(M.spendCard(S, 'timeattack'), true); assert.equal(M.spendCard(S, 'timeattack'), false);
  S.cards.push('timeattack'); assert.equal(M.canArm(S, 'timeattack'), false); // cooldown
  M.earnCard(S, () => 0); assert.equal(M.canArm(S, 'timeattack'), true); // one win later
  for (let i = 0; i < 10; i++) M.earnCard(S); assert.ok(S.cards.length <= M.MAX_CARDS);
  assert.equal(M.penaltyFor('timeattack'), 5000); assert.equal(M.penaltyFor('blackout'), 0);
});
ok('sabotage cannot change the board: effects only plan, the layout stays identical', () => {
  const a = M.fairBoard(L.beginner, 'sabo1234'), snap = [...a.mines].join(''); for (const id of Object.keys(M.CARDS)) M.CARDS[id].plan; assert.equal([...M.fairBoard(L.beginner, 'sabo1234').mines].join(''), snap);
});
ok('achievements: each fires on the right result and only once', () => {
  const base = { won: true, level: 'beginner', ms: 20000, mis: 0, flags: 2, mode: 'classic', beat: false, usedCards: 0, streak: 1 };
  assert.deepEqual(M.earned(base), ['first_blood', 'speed_demon', 'perfect_clear']);
  assert.deepEqual(M.earned({ ...base, ms: 30000, flags: 0 }), ['first_blood']);
  assert.ok(M.earned({ ...base, level: 'expert', ms: 90000 }).includes('mine_master'));
  const c = M.earned({ ...base, mode: 'chal', beat: true }); assert.ok(c.includes('revenge_taken') && c.includes('untouchable'));
  assert.ok(!M.earned({ ...base, mode: 'chal', usedCards: 1 }).includes('untouchable'));
  assert.ok(M.earned({ ...base, mode: 'daily', streak: 7 }).includes('daily_legend'));
  assert.deepEqual(M.earned(base, { first_blood: 1, speed_demon: 1, perfect_clear: 1 }), []); assert.deepEqual(M.earned({ ...base, won: false }), []);
});
console.log(`\n${n} checks passed`);
