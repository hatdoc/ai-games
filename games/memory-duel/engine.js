// Memory Duel: rules, board movements, items and the CPU. No drawing here (also runs in Node for tests).
// Every pair is split: player 0 owns one card of each pair, player 1 the other. Each player places their own half.
(() => {
  const DIMS = { 12: [6, 2], 20: [5, 4], 28: [7, 4], 40: [10, 4], 60: [10, 6], 80: [10, 8], 100: [10, 10] };
  const ITEMS = {
    preview: { name: 'Preview', icon: '👁️', uses: 2, desc: 'Flash 3 random hidden cards for 1 second.' },
    double: { name: 'Double Points', icon: '✖️2', uses: 2, desc: 'Your next match this turn scores ×2. Miss and it is wasted.' },
    peek: { name: 'Peek', icon: '🔍', uses: 1, desc: 'Pick one hidden card and see it for a moment.', target: true },
    extra: { name: 'Extra Guess', icon: '🎯', uses: 1, desc: 'If your guess misses, guess once more (half points).' },
    freeze: { name: 'Freeze', icon: '🧊', uses: 1, desc: 'The board will not move after this turn.' },
    scanner: { name: 'Scanner', icon: '📡', uses: 1, desc: 'Pick a spot: flash the 3×3 area around it for 0.7 seconds.', target: true },
    steal: { name: 'Score Steal', icon: '🦹', uses: 1, desc: 'Match this turn and steal 10% of their score.' },
    rewind: { name: 'Rewind', icon: '⏪', uses: 1, desc: "Undo the board's last move: every card goes back where it was." },
  };
  const MODES = {
    normal: { name: 'Normal', reveal: 1400, board: false, sections: 0, events: false },
    hard: { name: 'Hard', reveal: 1300, board: true, sections: 0, events: false },
    extreme: { name: 'Extreme', reveal: 1200, board: false, sections: 1, events: true },
    hell: { name: 'Hell', reveal: 700, board: true, sections: 1, events: true, fog: true },
  };

  const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  function create(o) {
    const size = DIMS[o.size] ? o.size : 20, [C, R] = DIMS[size], pairs = size / 2, mode = MODES[o.mode] ? o.mode : 'normal';
    const s = {
      size, C, R, pairs, mode, M: { ...MODES[mode], ...(o.override || {}) }, seed: o.seed >>> 0 || 1, rng: mulberry(o.seed >>> 0 || 1),
      slots: Array(size).fill(-1), // slot -> card index
      cards: [], phase: 'place', turn: 0, pick: null, score: [0, 0], streak: [0, 0], bestStreak: [0, 0], hits: [0, 0], tries: [0, 0], notMine: [0, 0],
      items: [0, 1].map((p) => Object.fromEntries((o.items?.[p] || ['preview', 'double', 'peek']).map((k) => [k, ITEMS[k].uses]))),
      fx: {}, turnNo: 0, log: [], misses: [], desperation: [false, false], events: o.events ?? MODES[mode].events,
    };
    for (let pair = 0; pair < pairs; pair++) for (const owner of [0, 1]) s.cards.push({ id: s.cards.length, pair, owner, pos: -1, gone: false, by: -1 });
    s.toPlace = [0, 1].map((p) => s.cards.filter((c) => c.owner === p).map((c) => c.id));
    return s;
  }
  const rc = (s, pos) => [Math.floor(pos / s.C), pos % s.C];
  const at = (s, r, c) => r * s.C + c;
  const cardAt = (s, pos) => (s.slots[pos] >= 0 ? s.cards[s.slots[pos]] : null);
  const hidden = (s) => s.slots.map((ci, pos) => (ci >= 0 && !s.cards[ci].gone ? pos : -1)).filter((p) => p >= 0);

  // ---------- placement ----------
  const myHalf = (s, player, pos) => (player === 0 ? pos >= s.size / 2 : pos < s.size / 2);
  function place(s, player, pos) {
    if (s.phase !== 'place' || s.slots[pos] !== -1 || !s.toPlace[player].length || !myHalf(s, player, pos)) return false;
    const id = s.toPlace[player].shift();
    s.slots[pos] = id; s.cards[id].pos = pos;
    s.log.push({ t: 'place', player, pos, id });
    return true;
  }
  function autoPlace(s, player, rnd = Math.random) {
    while (s.toPlace[player].length) {
      const free = s.slots.map((v, i) => (v === -1 && myHalf(s, player, i) ? i : -1)).filter((i) => i >= 0);
      place(s, player, free[Math.floor(rnd() * free.length)]);
    }
  }
  const placed = (s) => !s.toPlace[0].length && !s.toPlace[1].length;
  function startBattle(s, first = 0) { s.phase = 'battle'; s.turn = first; s.turnNo = 1; s.fx = {}; }

  // ---------- a turn: flip one of yours, then guess where their twin is ----------
  // returns what happened so the UI can animate it
  function flip(s, pos) {
    const c = cardAt(s, pos);
    if (s.phase !== 'battle' || !c || c.gone) return { type: 'invalid' };
    const p = s.turn;
    if (s.pick == null) {
      if (c.owner !== p) { s.notMine[p]++; s.tries[p]++; s.streak[p] = 0; s.log.push({ t: 'notmine', p, pos, pair: c.pair }); return { type: 'notmine', pos, card: c }; }
      s.pick = pos; return { type: 'first', pos, card: c };
    }
    if (pos === s.pick) return { type: 'invalid' };
    const a = cardAt(s, s.pick);
    s.tries[p]++;
    if (c.pair === a.pair) {
      a.gone = c.gone = true; a.by = c.by = p;
      s.streak[p]++; s.bestStreak[p] = Math.max(s.bestStreak[p], s.streak[p]); s.hits[p]++;
      let pts = 100 * Math.min(4, s.streak[p]);
      if (s.fx.second) pts = Math.round(pts / 2);
      if (s.fx.double) pts *= 2;
      let stolen = 0;
      if (s.fx.steal) { stolen = Math.round(s.score[1 - p] * 0.1); s.score[1 - p] -= stolen; }
      s.score[p] += pts + stolen;
      const res = { type: 'match', pos, first: s.pick, card: c, pts, stolen, streak: s.streak[p], doubled: !!s.fx.double };
      s.log.push({ t: 'match', p, a: s.pick, b: pos, pair: c.pair, pts });
      s.pick = null; s.fx = { freeze: s.fx.freeze }; // item effects last one match; freeze lasts the turn
      if (s.cards.every((x) => x.gone)) s.phase = 'over';
      return res;
    }
    // miss: how far off were they?
    const twin = s.cards.find((x) => x.pair === a.pair && x.id !== a.id);
    const [r1, c1] = rc(s, pos), [r2, c2] = rc(s, twin.pos);
    s.misses.push({ p, guess: pos, actual: twin.pos, dist: Math.abs(r1 - r2) + Math.abs(c1 - c2), pair: a.pair });
    s.log.push({ t: 'miss', p, a: s.pick, b: pos, pair: a.pair, got: c.pair });
    const res = { type: 'miss', pos, first: s.pick, card: c, wanted: a, wasted: !!(s.fx.double || s.fx.steal) };
    if (s.fx.extra && !s.fx.second) { s.fx.second = true; s.fx.extra = false; res.type = 'retry'; return res; } // Extra Guess: same first card, guess again
    s.streak[p] = 0; s.pick = null;
    return res;
  }
  // after a miss / not-mine: next player's turn. Returns the board movement to show first (or null)
  function endTurn(s) {
    const frozen = s.fx.freeze;
    s.turn = 1 - s.turn; s.turnNo++; s.fx = {}; s.pick = null;
    // comeback: 3+ pairs behind gets one free Peek per match
    const p = s.turn, behind = s.hits[1 - p] - s.hits[p];
    let bonus = false;
    if (behind >= 3 && !s.desperation[p]) { s.desperation[p] = true; s.items[p].peek = (s.items[p].peek || 0) + 1; bonus = true; }
    s.lastMove = frozen ? null : planMove(s);
    return { move: s.lastMove, bonus };
  }

  // ---------- board movement (deterministic, from the match seed) ----------
  function planMove(s) {
    const M = s.M, ops = [], rnd = s.rng, R = s.R, C = s.C;
    if (M.board) ops.push(pickOne(rnd, R === C ? ['rot90', 'rot180', 'mirrorH', 'mirrorV'] : ['rot180', 'mirrorH', 'mirrorV']));
    for (let i = 0; i < (M.sections || 0); i++) {
      const k = pickOne(rnd, ['swapRows', 'swapCols', 'shiftRow', 'shiftCol', 'halves']);
      const a = Math.floor(rnd() * R), b = (a + 1 + Math.floor(rnd() * (R - 1))) % R, x = Math.floor(rnd() * C), y = (x + 1 + Math.floor(rnd() * (C - 1))) % C;
      ops.push(k === 'swapRows' ? { k, a, b } : k === 'swapCols' ? { k, a: x, b: y } : k === 'shiftRow' ? { k, a, d: rnd() < 0.5 ? 1 : -1 } : k === 'shiftCol' ? { k, a: x, d: rnd() < 0.5 ? 1 : -1 } : { k });
    }
    let event = null;
    if (s.events && s.turnNo > 2 && rnd() < 0.22) {
      event = pickOne(rnd, ['quake', 'switch', 'lucky', 'panic', 'confusion']);
      if (event === 'quake') ops.push({ k: 'swapRows', a: 0, b: R - 1 }, { k: 'shiftCol', a: Math.floor(rnd() * C), d: 1 });
      if (event === 'switch') { const a = Math.floor(rnd() * R); ops.push({ k: 'swapRows', a, b: (a + 1) % R }); }
    }
    if (!ops.length && !event) return null;
    return withMap(s, { ops: ops.map((o) => (typeof o === 'string' ? { k: o } : o)), event });
  }
  const pickOne = (rnd, a) => a[Math.floor(rnd() * a.length)];
  const withMap = (s, plan) => { plan.map = composeMap(s, plan.ops); plan.cells = [...new Set(plan.map.map((to, from) => (to !== from ? from : -1)).filter((x) => x >= 0))]; return plan; };
  // the exact opposite of a move: undo each step, last one first
  const INV = { rot90: 'rot270', rot270: 'rot90' };
  const invert = (s, plan) => withMap(s, { ops: plan.ops.slice().reverse().map((o) => ({ ...o, k: INV[o.k] || o.k, d: o.d != null ? -o.d : o.k === 'halves' ? -1 : undefined })), event: null, rewind: true });
  // where each slot goes (from -> to) after all ops
  function composeMap(s, ops) {
    const R = s.R, C = s.C;
    let map = Array.from({ length: s.size }, (_, i) => i);
    for (const o of ops) {
      const f = (pos) => {
        let [r, c] = [Math.floor(pos / C), pos % C];
        if (o.k === 'rot180') [r, c] = [R - 1 - r, C - 1 - c];
        if (o.k === 'rot90') [r, c] = [c, R - 1 - r]; // clockwise (square boards only)
        if (o.k === 'rot270') [r, c] = [C - 1 - c, r];
        if (o.k === 'mirrorH') c = C - 1 - c;
        if (o.k === 'mirrorV') r = R - 1 - r;
        if (o.k === 'swapRows') r = r === o.a ? o.b : r === o.b ? o.a : r;
        if (o.k === 'swapCols') c = c === o.a ? o.b : c === o.b ? o.a : c;
        if (o.k === 'shiftRow' && r === o.a) c = (c + o.d + C) % C;
        if (o.k === 'shiftCol' && c === o.a) r = (r + o.d + R) % R;
        if (o.k === 'halves') c = (c + (o.d || 1) * Math.floor(C / 2) + C) % C;
        return r * C + c;
      };
      map = map.map(f);
    }
    return map;
  }
  function applyMove(s, plan) {
    if (!plan) return;
    const next = Array(s.size).fill(-1);
    s.slots.forEach((ci, from) => { if (ci >= 0) { const to = plan.map[from]; next[to] = ci; s.cards[ci].pos = to; } });
    s.slots = next;
    s.log.push({ t: 'move', ops: plan.ops, event: plan.event });
  }
  const describe = (o, s) => ({
    rot180: 'The whole board turns upside down ↻', rot90: 'The whole board turns a quarter clockwise ↻', rot270: 'The whole board turns a quarter counter-clockwise ↺', mirrorH: 'The board flips left ↔ right', mirrorV: 'The board flips top ↕ bottom',
    swapRows: `Rows ${o.a + 1} & ${o.b + 1} swap`, swapCols: `Columns ${o.a + 1} & ${o.b + 1} swap`,
    shiftRow: `Row ${o.a + 1} slides ${o.d > 0 ? 'right' : 'left'}`, shiftCol: `Column ${o.a + 1} slides ${o.d > 0 ? 'down' : 'up'}`, halves: o.d < 0 ? 'Left and right halves swap back' : 'Left and right halves swap',
  }[o.k]);

  // ---------- items: one per turn, before your first flip ----------
  function canUse(s, kind) { const p = s.turn; return s.phase === 'battle' && s.pick == null && !s.fx.used && (s.items[p][kind] || 0) > 0 && (kind !== 'rewind' || !!s.lastMove); }
  function useItem(s, kind, pos) {
    if (!canUse(s, kind)) return null;
    const p = s.turn; s.items[p][kind]--; s.fx.used = kind;
    s.log.push({ t: 'item', p, kind, pos });
    if (kind === 'double') { s.fx.double = true; return { kind }; }
    if (kind === 'extra') { s.fx.extra = true; return { kind }; }
    if (kind === 'freeze') { s.fx.freeze = true; return { kind }; }
    if (kind === 'steal') { s.fx.steal = true; return { kind }; }
    if (kind === 'rewind') { const move = invert(s, s.lastMove); applyMove(s, move); s.lastMove = null; return { kind, move }; }
    if (kind === 'preview') { const h = hidden(s); const out = []; while (out.length < Math.min(3, h.length)) { const x = h[Math.floor(s.rng() * h.length)]; if (!out.includes(x)) out.push(x); } return { kind, reveal: out, ms: 1000 }; }
    if (kind === 'peek') return { kind, reveal: [pos], ms: 900 };
    if (kind === 'scanner') { const [r, c] = rc(s, pos), out = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < s.R && cc >= 0 && cc < s.C) { const q = at(s, rr, cc); if (cardAt(s, q) && !cardAt(s, q).gone) out.push(q); } } return { kind, reveal: out, ms: 700 }; }
    return null;
  }

  // ---------- CPU: remembers its own cards and what it has seen, and forgets ----------
  const LEVELS = [{ own: 0.7, seen: 0.45, keep: 0.8 }, { own: 0.85, seen: 0.7, keep: 0.9 }, { own: 0.97, seen: 0.88, keep: 0.96 }];
  function cpuInit(s, me, level) {
    const L = LEVELS[level] || LEVELS[1], mem = { me, L, known: {}, mine: new Set() }; // known: pos -> pair; mine: spots it remembers placing
    for (const c of s.cards) if (c.owner === me && Math.random() < L.own) { mem.known[c.pos] = c.pair; mem.mine.add(c.pos); }
    return mem;
  }
  // everyone saw a card face up
  function cpuSaw(s, mem, pos, pair) { if (Math.random() < mem.L.seen) mem.known[pos] = pair; }
  function cpuMoved(mem, plan) {
    if (!plan) return;
    const next = {};
    for (const [pos, pair] of Object.entries(mem.known)) if (Math.random() < mem.L.keep) next[plan.map[+pos]] = pair; // tracking a move sometimes fails
    mem.known = next;
    mem.mine = new Set([...mem.mine].filter(() => Math.random() < mem.L.keep).map((p) => plan.map[p]));
  }
  function cpuForget(mem, pos) { delete mem.known[pos]; mem.mine.delete(pos); }
  function cpuChoose(s, mem) { // { first, second } positions
    const me = mem.me, live = (pos) => cardAt(s, pos) && !cardAt(s, pos).gone;
    for (const k of Object.keys(mem.known)) if (!live(+k)) delete mem.known[k];
    for (const p of [...mem.mine]) if (!live(p)) mem.mine.delete(p);
    // a pair where we believe we know both spots: one we think is ours, one we think is theirs
    const byPair = {};
    for (const [pos, pair] of Object.entries(mem.known)) (byPair[pair] ||= []).push(+pos);
    const ownPos = (pos) => cardAt(s, pos)?.owner === me; // card backs show whose card it is
    for (const ps of Object.values(byPair)) if (ps.length >= 2) { const a = ps.find(ownPos), b = ps.find((x) => x !== a && !ownPos(x)); if (a != null && b != null) return { first: a, second: b }; }
    const myCards = hidden(s).filter(ownPos);
    const remembered = myCards.filter((p) => mem.known[p] != null);
    const pool1 = remembered.length ? remembered : myCards;
    const first = pool1[Math.floor(Math.random() * pool1.length)];
    const unknown = hidden(s).filter((p) => p !== first && !ownPos(p) && mem.known[p] == null);
    const pool = unknown.length ? unknown : hidden(s).filter((p) => p !== first);
    return { first, second: pool[Math.floor(Math.random() * pool.length)] };
  }

  globalThis.ME = { DIMS, ITEMS, MODES, create, myHalf, composeMap, place, autoPlace, placed, startBattle, flip, endTurn, applyMove, describe, canUse, useItem, hidden, cardAt, rc, cpuInit, cpuSaw, cpuMoved, cpuForget, cpuChoose };
})();
