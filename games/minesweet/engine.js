// Minesweet: all the rules, no drawing. Works in the browser and in Node (scripts/check-minesweet.cjs tests it).
// Layers kept apart on purpose:
//   board   = mine layout, a pure function of (level, seed, start cell). Never changed by anything below.
//   game    = what the player has done to a board (opened, flagged, mistakes).
//   effects = temporary sabotage / card effects, planned here but applied by the UI. They never touch board or game.
(() => {
  // ---------- levels (add a row to support another size; `floor` = fastest time we accept for a ranked score) ----------
  const LEVELS = {
    beginner: { id: 'beginner', key: 'b', name: 'Beginner', w: 9, h: 9, m: 10, floor: 700, tries: 400 },
    intermediate: { id: 'intermediate', key: 'i', name: 'Intermediate', w: 16, h: 16, m: 40, floor: 2500, tries: 400 },
    expert: { id: 'expert', key: 'e', name: 'Expert', w: 30, h: 16, m: 99, floor: 20000, tries: 1500 },
  };
  const LEVEL_BY_KEY = Object.fromEntries(Object.values(LEVELS).map((l) => [l.key, l]));
  const SCORE_BASE = 1000000; // ranked score = SCORE_BASE - total milliseconds, so "higher is better" like every other board
  const toScore = (ms) => Math.max(0, SCORE_BASE - Math.round(ms));
  const fromScore = (s) => SCORE_BASE - s;

  // ---------- seeded randomness (never Math.random for anything that must be reproducible) ----------
  const hash = (s) => { // xmur3
    let h = 1779033703 ^ s.length;
    for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
  };
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rng = (str) => mulberry(hash(String(str))());
  const randSeed = (rnd = Math.random) => Array.from({ length: 8 }, () => 'abcdefghijkmnpqrstuvwxyz23456789'[Math.floor(rnd() * 32)]).join('');
  const SEED_RE = /^[a-z0-9]{6,12}$/;

  // ---------- geometry ----------
  const NBC = {};
  const nbs = (w, h) => NBC[w + 'x' + h] ||= Array.from({ length: w * h }, (_, i) => {
    const x = i % w, y = (i / w) | 0, o = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const X = x + dx, Y = y + dy;
      if ((dx || dy) && X >= 0 && X < w && Y >= 0 && Y < h) o.push(Y * w + X);
    }
    return o;
  });

  // ---------- board generation ----------
  // The start cell and its neighbours never hold a mine, so the start always opens an area.
  function generate(cfg, seed, start) {
    const { w, h, m } = cfg, N = w * h, nb = nbs(w, h);
    let safe = new Set([start, ...nb[start]]);
    if (N - safe.size < m) safe = new Set([start]);
    if (N - safe.size < m) throw new Error('too many mines for this board');
    const pool = []; for (let i = 0; i < N; i++) if (!safe.has(i)) pool.push(i);
    const r = rng(seed);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const mines = new Uint8Array(N), nums = new Uint8Array(N);
    for (let k = 0; k < m; k++) mines[pool[k]] = 1;
    for (let i = 0; i < N; i++) if (!mines[i]) { let c = 0; for (const j of nb[i]) c += mines[j]; nums[i] = c; }
    return { cfg, seed, start, mines, nums };
  }

  // A tiny logic solver: single-cell rules plus the subset rule. Returns the safe cells it could not reach (0 = no guessing),
  // and the order of its deductions so the preview bot can play the board like a person would.
  function solve(board) {
    const { cfg: { w, h }, mines, nums, start } = board, N = w * h, nb = nbs(w, h);
    const st = new Uint8Array(N), steps = []; // 0 unknown, 1 open, 2 known mine
    const open = (i, why) => {
      if (st[i]) return;
      if (why) steps.push({ t: 'o', i });
      const q = [i];
      while (q.length) { const j = q.pop(); if (st[j]) continue; st[j] = 1; if (!nums[j]) for (const k of nb[j]) if (!st[k]) q.push(k); }
    };
    const mark = (i) => { if (!st[i]) { st[i] = 2; steps.push({ t: 'f', i }); } };
    open(start, false); steps.push({ t: 'o', i: start });
    for (let progress = true; progress;) {
      progress = false;
      const cons = [];
      for (let i = 0; i < N; i++) {
        if (st[i] !== 1 || !nums[i]) continue;
        const unk = [], km = []; for (const j of nb[i]) { if (st[j] === 0) unk.push(j); else if (st[j] === 2) km.push(j); }
        if (!unk.length) continue;
        const rem = nums[i] - km.length;
        if (rem === 0) { unk.forEach((j) => open(j, true)); progress = true; }
        else if (rem === unk.length) { unk.forEach(mark); progress = true; }
        else cons.push({ unk, rem, set: new Set(unk) });
      }
      if (progress) continue;
      for (const a of cons) for (const b of cons) {
        if (a === b || a.unk.length >= b.unk.length || !a.unk.every((j) => b.set.has(j))) continue;
        const diff = b.unk.filter((j) => !a.set.has(j)), dr = b.rem - a.rem;
        if (dr === 0) { diff.forEach((j) => open(j, true)); progress = true; }
        else if (dr === diff.length) { diff.forEach(mark); progress = true; }
      }
    }
    let left = 0; for (let i = 0; i < N; i++) if (!mines[i] && st[i] !== 1) left++;
    return { left, steps };
  }

  const pickStart = (cfg, seed) => { // somewhere with room for a full 3x3 opening when the board is big enough
    const r = rng(seed + '/start'), { w, h } = cfg;
    const x = w > 2 ? 1 + Math.floor(r() * (w - 2)) : 0, y = h > 2 ? 1 + Math.floor(r() * (h - 2)) : 0;
    return y * w + x;
  };

  // A board you can finish by pure logic from the start (no coin-flip guesses), so a challenge is never unfair.
  // Tries seed#0, seed#1, ... a fixed number of times, so the same seed gives the same board on every device.
  // If none is guess-free (rare on Expert) we use the one with the fewest cells left, and `fair` is false.
  function fairBoard(cfg, seed, tries = cfg.tries || 300) {
    const start = pickStart(cfg, seed); let best = null;
    for (let t = 0; t < tries; t++) {
      const b = generate(cfg, seed + '#' + t, start), { left } = solve(b);
      b.attempt = t; b.left = left;
      if (!left) { b.fair = true; return b; }
      if (!best || left < best.left) best = b;
    }
    best.fair = false; return best;
  }

  // ---------- the game: what the player did to a board ----------
  // st: 0 hidden, 1 open, 2 flag. A game starts with `board` (challenge/daily: start area already open)
  // or without (classic: the board is made around the first click, so it can't be a mine).
  function newGame(cfg, { board = null, seed = null } = {}) {
    const N = cfg.w * cfg.h;
    const G = { cfg, N, seed: seed || (board && board.seed) || randSeed(), board, st: new Uint8Array(N), open: 0, flags: 0, mistakes: 0, wrong: new Set(), status: 'ready', hit: -1, moves: 0 };
    if (board) flood(G, board.start);
    return G;
  }
  function flood(G, i) { // opens i and, through zeros, its surroundings; breadth first so the UI can animate outwards. Flags stay.
    const nb = nbs(G.cfg.w, G.cfg.h), out = [], q = [i], seen = new Set([i]);
    for (let k = 0; k < q.length; k++) {
      const j = q[k]; if (G.st[j] !== 0) continue;
      G.st[j] = 1; G.open++; out.push(j);
      if (!G.board.nums[j]) for (const n of nb[j]) if (!seen.has(n)) { seen.add(n); q.push(n); }
    }
    return out;
  }
  const isOver = (G) => G.status === 'won' || G.status === 'lost';
  const finishIfWon = (G) => {
    if (G.status === 'lost' || G.open !== G.N - G.cfg.m) return;
    G.status = 'won';
    for (let i = 0; i < G.N; i++) if (G.board.mines[i] && G.st[i] === 0) { G.st[i] = 2; G.flags++; }
  };
  function reveal(G, i) {
    const res = { opened: [], hit: false };
    if (isOver(G) || G.st[i] !== 0) return res;
    if (!G.board) G.board = generate(G.cfg, G.seed, i);
    if (G.status === 'ready') G.status = 'play';
    G.moves++;
    if (G.board.mines[i]) { G.status = 'lost'; G.hit = i; res.hit = true; return res; }
    res.opened = flood(G, i); finishIfWon(G); return res;
  }
  function flag(G, i) {
    if (isOver(G) || !G.board || G.st[i] === 1) return false;
    if (G.status === 'ready') G.status = 'play';
    if (G.st[i] === 2) { G.st[i] = 0; G.flags--; return true; }
    G.st[i] = 2; G.flags++;
    if (!G.board.mines[i] && !G.wrong.has(i)) { G.wrong.add(i); G.mistakes++; } // a mistake = a flag on a safe tile, counted once per tile
    return true;
  }
  function chord(G, i) { // on an open number whose flags match it: open every other neighbour at once
    const res = { opened: [], hit: false };
    if (isOver(G) || G.st[i] !== 1 || !G.board.nums[i]) return res;
    const nb = nbs(G.cfg.w, G.cfg.h)[i];
    if (nb.filter((j) => G.st[j] === 2).length !== G.board.nums[i]) return res;
    for (const j of nb) if (G.st[j] === 0) {
      const r = reveal(G, j); res.opened.push(...r.opened);
      if (r.hit) { res.hit = true; break; }
    }
    return res;
  }
  // a safe hidden tile for the REVEAL card: next to what is already open if possible
  function safeTile(G, rnd = Math.random) {
    const nb = nbs(G.cfg.w, G.cfg.h), near = [], any = [];
    for (let i = 0; i < G.N; i++) if (G.st[i] === 0 && !G.board.mines[i]) { any.push(i); if (nb[i].some((j) => G.st[j] === 1)) near.push(i); }
    const pool = near.length ? near : any; return pool.length ? pool[Math.floor(rnd() * pool.length)] : -1;
  }
  const progress = (G) => G.open / (G.N - G.cfg.m);
  const minesLeft = (G) => G.cfg.m - G.flags;

  // ---------- results and scoring (transparent: time first, mistakes second, equal = tie) ----------
  const TIME_ATTACK_MS = 5000, REVEAL_MS = 3000;
  const total = (r) => r.ms + (r.penalty || 0);
  function compare(a, b) { // -1: a wins, 1: b wins, 0: tie
    if (total(a) !== total(b)) return total(a) < total(b) ? -1 : 1;
    if (a.mis !== b.mis) return a.mis < b.mis ? -1 : 1;
    return 0;
  }
  const fmtTime = (ms) => { const s = ms / 1000; return s < 60 ? s.toFixed(1) + 's' : Math.floor(s / 60) + ':' + String((s % 60).toFixed(1)).padStart(4, '0'); };

  // ---------- Daily Duel (the day comes from the configured time zone, and the app asks the server for "now") ----------
  const DAILY = { epoch: '2026-10-25', tzOffsetMin: 0, level: 'intermediate' }; // tzOffsetMin: minutes east of UTC; 0 = UTC
  const dayKey = (nowMs, off = DAILY.tzOffsetMin) => new Date(nowMs + off * 60000).toISOString().slice(0, 10);
  const dayNumber = (key) => Math.round((Date.parse(key + 'T00:00:00Z') - Date.parse(DAILY.epoch + 'T00:00:00Z')) / 864e5) + 1;
  const dailySeed = (key) => 'msweet-daily-' + key;
  const msToReset = (nowMs, off = DAILY.tzOffsetMin) => 864e5 - ((nowMs + off * 60000) % 864e5);
  const prevDay = (key) => new Date(Date.parse(key + 'T12:00:00Z') - 864e5).toISOString().slice(0, 10);
  function bumpStreak(s, key) { // s = { last, streak, best } -> new object
    if (s.last === key) return { ...s };
    const streak = s.last === prevDay(key) ? s.streak + 1 : 1;
    return { last: key, streak, best: Math.max(s.best || 0, streak) };
  }

  // ---------- Sabotage cards ----------
  // sabotage cards go on a challenge you make; shield and reveal are for the player who accepts one.
  // `at` = how far through the board (share of safe tiles opened) the effect starts. Nothing here edits the board.
  const CARDS = {
    blackout: { kind: 'sabotage', code: 'bo', name: 'Blackout', icon: '🌑', cd: 2, plan: [{ at: 0.3, ms: 4000 }, { at: 0.65, ms: 4000 }], text: 'Their board goes dark for 4 seconds at 30% cleared and again at 65%. They can still tap.' },
    confusion: { kind: 'sabotage', code: 'cf', name: 'Confusion', icon: '🌀', cd: 2, plan: [{ at: 0.4, ms: 5000 }], text: 'All numbers turn into question marks for 5 seconds at 40% cleared. Nothing is lost.' },
    timeattack: { kind: 'sabotage', code: 'ta', name: 'Time Attack', icon: '⏱', cd: 1, plan: [], penalty: TIME_ATTACK_MS, text: 'Adds 5 seconds to their final time. Shown to them before they start.' },
    trouble: { kind: 'sabotage', code: 'dt', name: 'Double Trouble', icon: '🎲', cd: 3, plan: [{ at: 0.5, mini: true }], text: 'At 50% cleared they solve a tiny 5x5 side board (3 mines) before continuing. Hit a mine there and it reshuffles.' },
    shield: { kind: 'defense', code: 'sh', name: 'Shield', icon: '🛡', cd: 0, text: 'When you accept a challenge, block its sabotage card completely.' },
    reveal: { kind: 'helper', code: 're', name: 'Reveal', icon: '🔎', cd: 0, penalty: REVEAL_MS, text: 'During a friend challenge, open one safe tile for you. Costs 3 seconds.' },
  };
  const CARD_BY_CODE = Object.fromEntries(Object.entries(CARDS).map(([id, c]) => [c.code, id]));
  const MAX_CARDS = 4, START_CARDS = ['timeattack', 'shield', 'reveal'];
  const cardsOf = (S) => S.cards || (S.cards = START_CARDS.slice());
  const cdOf = (S, id) => (S.cd && S.cd[id]) || 0;
  const canArm = (S, id) => CARDS[id]?.kind === 'sabotage' && cardsOf(S).includes(id) && !cdOf(S, id);
  function spendCard(S, id) { const c = cardsOf(S), i = c.indexOf(id); if (i < 0) return false; c.splice(i, 1); (S.cd ||= {})[id] = CARDS[id].cd; return true; }
  // a win earns one random card (never past the cap); cooldowns tick down once per win
  function earnCard(S, rnd = Math.random) {
    S.cd ||= {}; for (const k in S.cd) if (S.cd[k] > 0) S.cd[k]--;
    const c = cardsOf(S); if (c.length >= MAX_CARDS) return null;
    const ids = Object.keys(CARDS), id = ids[Math.floor(rnd() * ids.length)]; c.push(id); return id;
  }
  const penaltyFor = (cardId) => CARDS[cardId]?.penalty || 0;

  // ---------- Friend challenges: everything needed to replay the board travels in the link ----------
  // hash: c=<level>.<seed>.<ms>.<mistakes>.<card or ->.<round>.<check>&n=<name>&to=<name>
  const cleanName = (s) => String(s || '').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 14);
  const enc = (s) => encodeURIComponent(s).replace(/[!'()*~]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  const check = (s) => hash('msweet1' + s)().toString(36).slice(0, 4).padStart(4, '0');
  function encodeChallenge({ d, seed, ms, mis, card, round, name, to }) {
    const body = [d, seed, Math.round(ms), mis, card ? CARDS[card].code : '-', round || 1].join('.');
    const n = cleanName(name), t = cleanName(to);
    return `c=${body}.${check(body + n + t)}${n ? '&n=' + enc(n) : ''}${t ? '&to=' + enc(t) : ''}`;
  }
  function decodeChallenge(hashStr) { // -> challenge or null (a damaged or edited link)
    const p = new URLSearchParams(String(hashStr || '').replace(/^#/, '')), c = p.get('c');
    if (!c) return null;
    const a = c.split('.');
    if (a.length !== 7) return null;
    const [d, seed, ms, mis, code, round, chk] = a, n = cleanName(p.get('n')), t = cleanName(p.get('to'));
    if (!LEVEL_BY_KEY[d] || !SEED_RE.test(seed) || !/^\d{1,7}$/.test(ms) || !/^\d{1,3}$/.test(mis) || !/^\d{1,2}$/.test(round)) return null;
    if (code !== '-' && !CARD_BY_CODE[code]) return null;
    if (code !== '-' && CARDS[CARD_BY_CODE[code]].kind !== 'sabotage') return null;
    if (check(a.slice(0, 6).join('.') + n + t) !== chk) return null;
    if (+ms < LEVEL_BY_KEY[d].floor / 2) return null; // no human clears a board that fast
    return { level: LEVEL_BY_KEY[d], d, seed, ms: +ms, mis: +mis, card: code === '-' ? null : CARD_BY_CODE[code], round: +round, name: n, to: t };
  }

  // ---------- Achievements ----------
  const ACH = {
    first_blood: { icon: '🩸', name: 'First Blood', text: 'Clear your first board.' },
    speed_demon: { icon: '⚡', name: 'Speed Demon', text: 'Clear a Beginner board in under 25 seconds.' },
    perfect_clear: { icon: '💎', name: 'Perfect Clear', text: 'Clear a board with at least one flag and no wrong flags.' },
    mine_master: { icon: '👑', name: 'Mine Master', text: 'Clear an Expert board.' },
    revenge_taken: { icon: '🔥', name: 'Revenge Taken', text: "Beat a friend's challenge." },
    untouchable: { icon: '🥷', name: 'Untouchable', text: 'Win a friend challenge without using any card.' },
    daily_legend: { icon: '📅', name: 'Daily Legend', text: 'Clear the Daily Duel 7 days in a row.' },
  };
  const DAILY_LEGEND_DAYS = 7;
  // ctx: { won, level, ms (total), mis, flags, mode, beat, usedCards, streak } -> ids newly earned
  function earned(ctx, have = {}) {
    if (!ctx.won) return [];
    const out = [];
    if (ctx.level === 'beginner' && ctx.ms < 25000) out.push('speed_demon');
    if (ctx.mis === 0 && ctx.flags > 0) out.push('perfect_clear');
    if (ctx.level === 'expert') out.push('mine_master');
    if (ctx.beat) out.push('revenge_taken');
    if (ctx.mode === 'chal' && !ctx.usedCards) out.push('untouchable');
    if (ctx.mode === 'daily' && ctx.streak >= DAILY_LEGEND_DAYS) out.push('daily_legend');
    out.unshift('first_blood');
    return out.filter((id) => !have[id]);
  }

  globalThis.MS = {
    LEVELS, LEVEL_BY_KEY, SCORE_BASE, toScore, fromScore, hash, rng, randSeed, SEED_RE, nbs,
    generate, solve, pickStart, fairBoard, newGame, flood, reveal, flag, chord, safeTile, isOver, progress, minesLeft,
    total, compare, fmtTime, TIME_ATTACK_MS, REVEAL_MS,
    DAILY, dayKey, dayNumber, dailySeed, msToReset, prevDay, bumpStreak,
    CARDS, CARD_BY_CODE, MAX_CARDS, START_CARDS, cardsOf, cdOf, canArm, spendCard, earnCard, penaltyFor,
    cleanName, encodeChallenge, decodeChallenge, ACH, DAILY_LEGEND_DAYS, earned,
  };
})();
