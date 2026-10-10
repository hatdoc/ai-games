// Gridwit: rules (no drawing). Works in the browser and in Node for tests.
(() => {
  // length, tries, score multiplier, rules level (0 free, 1 hard, 2 expert), seconds per guess (0 = none), free hints
  const TIERS = {
    easy: { name: 'Easy', len: 4, tries: 7, mult: 1, rules: 0, perGuess: 0, hints: 2, freeHint: 1 },
    normal: { name: 'Normal', len: 5, tries: 6, mult: 1.5, rules: 0, perGuess: 0, hints: 2, freeHint: 0 },
    hard: { name: 'Hard', len: 6, tries: 6, mult: 2.2, rules: 1, perGuess: 0, hints: 2, freeHint: 0 },
    expert: { name: 'Expert', len: 7, tries: 6, mult: 3, rules: 2, perGuess: 0, hints: 2, freeHint: 0 },
    brutal: { name: 'Brutal', len: 8, tries: 6, mult: 4, rules: 2, perGuess: 60, hints: 0, freeHint: 0 },
  };
  const TIER_IDS = Object.keys(TIERS);
  const LAUNCH = Date.UTC(2026, 9, 10); // day 0 of the daily puzzles

  // ---------- words ----------
  let W = null;
  function load(words) {
    W = { answers: words.answers, block: new Set(words.block), valid: {} };
    for (const [L, packed] of Object.entries(words.valid)) { const set = new Set(); for (let i = 0; i < packed.length; i += +L) set.add(packed.slice(i, i + +L)); W.valid[L] = set; }
    for (const t of TIER_IDS) for (const a of W.answers[t]) W.valid[a.length]?.add(a);
  }
  const isWord = (w) => !!W.valid[w.length]?.has(w);
  const isBlocked = (w) => W.block.has(w);

  // ---------- seeded randomness ----------
  const hash = (str) => { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0; return h; };
  const mulberry = (a) => () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  function shuffled(list, seed) { const a = list.slice(), r = mulberry(hash(seed)); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const dayIndex = (dateStr) => Math.round((Date.parse(dateStr + 'T00:00:00Z') - LAUNCH) / 864e5);
  // same word for everyone on a day; no repeats until the list runs out
  function dailyWord(tier, dateStr, kind = '') { const list = shuffled(W.answers[tier], `gridwit-${kind}${tier}`); const i = dayIndex(dateStr); return list[((i % list.length) + list.length) % list.length]; }
  const randomWord = (tier, rnd = Math.random) => { const l = W.answers[tier]; return l[Math.floor(rnd() * l.length)]; };

  // ---------- scoring a guess ----------
  // greens first, then yellows up to the letter's real count, the rest grey
  function evaluate(guess, answer) {
    const res = Array(guess.length).fill('miss'), left = {};
    for (let i = 0; i < answer.length; i++) if (guess[i] === answer[i]) res[i] = 'hit'; else left[answer[i]] = (left[answer[i]] || 0) + 1;
    for (let i = 0; i < guess.length; i++) if (res[i] !== 'hit' && left[guess[i]] > 0) { res[i] = 'near'; left[guess[i]]--; }
    return res;
  }
  // hard (1): greens stay, yellows must be used. expert (2): also a yellow can't go back where it was ruled out
  function rulesError(guess, rows, level) {
    if (!level) return null;
    const ord = (i) => ['1st', '2nd', '3rd'][i] || `${i + 1}th`;
    for (const r of rows) {
      const need = {};
      r.res.forEach((s, i) => {
        if (s === 'hit' && guess[i] !== r.guess[i]) need.hit ??= `${ord(i)} letter must be ${r.guess[i].toUpperCase()}`;
        if (s === 'hit' || s === 'near') need[r.guess[i]] = (need[r.guess[i]] || 0) + 1;
        if (level >= 2 && s === 'near' && guess[i] === r.guess[i]) need.spot ??= `${r.guess[i].toUpperCase()} can't be ${ord(i)} (it's somewhere else)`;
      });
      if (need.hit) return need.hit;
      for (const [ch, n] of Object.entries(need)) if (ch.length === 1 && [...guess].filter((x) => x === ch).length < n) return `Guess must contain ${ch.toUpperCase()}${n > 1 ? ` ×${n}` : ''}`;
      if (need.spot) return need.spot;
    }
    return null;
  }
  // keyboard: each key shows its best known state
  const RANK = { miss: 1, near: 2, hit: 3 };
  function keyStates(rows) { const k = {}; for (const r of rows) r.shown.forEach((s, i) => { const ch = r.guess[i]; if (!k[ch] || RANK[s] > RANK[k[ch]]) k[ch] = s; }); return k; }
  // Fib mode: in every row (except a win) exactly one tile shows a wrong colour
  function fib(res, seed, row) {
    if (res.every((s) => s === 'hit')) return { shown: res.slice(), lie: -1 };
    const r = mulberry(hash(`${seed}-${row}`)), i = Math.floor(r() * res.length), others = ['hit', 'near', 'miss'].filter((s) => s !== res[i]);
    const shown = res.slice(); shown[i] = others[Math.floor(r() * 2)];
    if (shown.every((s) => s === 'hit')) shown[i] = res[i] === 'near' ? 'miss' : 'near'; // never fake a win
    return { shown, lie: i };
  }

  // ---------- points ----------
  function dailyScore(tier, used, seconds, hintsCost) {
    const T = TIERS[tier]; if (!used) return 0;
    return Math.max(0, Math.round(T.mult * (100 * (T.tries - used + 1) + Math.max(0, 300 - Math.round(seconds)) - 150 * hintsCost)));
  }
  const solveScore = (tier, used, hintsCost, tries) => Math.max(0, Math.round(TIERS[tier].mult * (100 * ((tries || TIERS[tier].tries) - used + 1) - 150 * hintsCost)));
  const gauntletTier = (solved) => TIER_IDS[Math.min(TIER_IDS.length - 1, Math.floor(solved / 3))];
  // the leftmost letter not yet shown green
  function pin(answer, rows, pinned) { const known = new Set(pinned); for (const r of rows) r.res.forEach((s, i) => { if (s === 'hit') known.add(i); }); for (let i = 0; i < answer.length; i++) if (!known.has(i)) return i; return -1; }
  // up to n keyboard letters that aren't in the word and aren't marked yet
  function sweep(answer, rows, n = 3, rnd = Math.random) {
    const marked = keyStates(rows), pool = [...'abcdefghijklmnopqrstuvwxyz'].filter((c) => !answer.includes(c) && !marked[c]);
    const out = []; while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]); return out;
  }
  // friend challenge links: lightly scrambled so the word isn't readable at a glance
  const KEY = 'gridwit';
  const encode = (w) => btoa([...w].map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ KEY.charCodeAt(i % KEY.length))).join('')).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const decode = (s) => { try { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/')); return [...b].map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ KEY.charCodeAt(i % KEY.length))).join(''); } catch { return ''; } };

  globalThis.GW = { TIERS, TIER_IDS, load, isWord, isBlocked, dailyWord, randomWord, dayIndex, evaluate, rulesError, keyStates, fib, dailyScore, solveScore, gauntletTier, pin, sweep, encode, decode, shuffled, hash, mulberry };
})();
