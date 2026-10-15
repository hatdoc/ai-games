// Astrology Wars engine: Saju (Four Pillars) + Western chart -> 5 battle stats, battles, compatibility, QR codes.
// Runs in the browser (window.AW) and in node (`node engine.js` runs the self-check at the bottom).
(function (root) {
'use strict';
const STEMS = ['Jia', 'Yi', 'Bing', 'Ding', 'Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui'];
const BRANCHES = ['Zi', 'Chou', 'Yin', 'Mao', 'Chen', 'Si', 'Wu', 'Wei', 'Shen', 'You', 'Xu', 'Hai'];
const ANIMALS = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
const EL = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
const EL_COLOR = ['#3ddc84', '#ff5a3c', '#e0b341', '#d6dde8', '#4db8ff'];
const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const GLYPH = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const WEL = ['Fire', 'Earth', 'Air', 'Water']; // sign i has western element i % 4
const STATS = ['charm', 'wealth', 'mind', 'grit', 'infl'];
const STAT_NAME = { charm: 'Charm', wealth: 'Wealth', mind: 'Intellect', grit: 'Grit', infl: 'Influence' };
const SECTORS = {
  love: { name: 'Love & Attraction', icon: '❤️', w: { charm: .55, infl: .15, grit: .15, mind: .15 }, els: [4, 1] },
  biz: { name: 'Empire & Business', icon: '💼', w: { wealth: .5, infl: .25, grit: .15, mind: .1 }, els: [2, 3] },
  mind: { name: 'Mind Games & Strategy', icon: '🧠', w: { mind: .55, grit: .15, infl: .15, wealth: .15 }, els: [0] },
  total: { name: 'Total Destiny War', icon: '⚡', w: { charm: .2, wealth: .2, mind: .2, grit: .2, infl: .2 }, els: [] },
};
const BRANCH_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
const mod = (a, n) => ((a % n) + n) % n;
const D2R = Math.PI / 180;

// --- time -----------------------------------------------------------------
const julday = (y, m, d, h = 0) => { // Gregorian date + UT hours -> Julian Day
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5 + h / 24;
};
const jdn = (y, m, d) => Math.round(julday(y, m, d) + 0.5);

// UTC offset (hours) of an IANA zone at a local wall time; numbers (historic LMT etc.) pass straight through
function tzOffset(tz, y, m, d, h, mi) {
  if (typeof tz === 'number') return tz;
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
  const want = Date.UTC(y, m - 1, d, h, mi);
  let off = 0;
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(f.formatToParts(new Date(want - off * 36e5)).map((x) => [x.type, +x.value]));
    off = (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - (want - off * 36e5)) / 36e5;
  }
  return off;
}

// --- astronomy (low precision: Sun ~0.01°, Moon ~0.03°, enough for signs) --------
const sunLon = (jd) => {
  const n = jd - 2451545, L = 280.460 + 0.9856474 * n, g = (357.528 + 0.9856003 * n) * D2R;
  return mod(L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g), 360);
};
const moonLon = (jd) => { // Meeus ch. 47, 13 largest terms (~0.03°)
  const T = (jd - 2451545) / 36525, r = (x) => x * D2R;
  const Lp = 218.3164477 + 481267.88123421 * T, D = r(297.8501921 + 445267.1114034 * T), M = r(357.5291092 + 35999.0502909 * T), Mp = r(134.9633964 + 477198.8675055 * T), F = r(93.272095 + 483202.0175233 * T);
  return mod(Lp + 6.288774 * Math.sin(Mp) + 1.274027 * Math.sin(2 * D - Mp) + .658314 * Math.sin(2 * D) + .213618 * Math.sin(2 * Mp) - .185116 * Math.sin(M) - .114332 * Math.sin(2 * F)
    + .058793 * Math.sin(2 * D - 2 * Mp) + .057066 * Math.sin(2 * D - M - Mp) + .053322 * Math.sin(2 * D + Mp) + .045758 * Math.sin(2 * D - M) - .040923 * Math.sin(M - Mp) - .03472 * Math.sin(D) - .030383 * Math.sin(M + Mp), 360);
};
const ascLon = (jd, lat, lon) => {
  const T = (jd - 2451545) / 36525, eps = (23.4393 - 0.013 * T) * D2R;
  const ramc = mod(280.46061837 + 360.98564736629 * (jd - 2451545) + lon, 360) * D2R, phi = lat * D2R;
  return mod(Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) / D2R, 360);
};

// --- Saju -------------------------------------------------------------------
// Pillar = [stem 0-9, branch 0-11]. Year and month turn at the exact moment the Sun reaches 315° (Lichun) and every 30° after,
// so `sun` is the Sun's ecliptic longitude at birth. The hour stem for 23:00-24:00 (late Zi) follows the next day's stem.
function pillars(y, m, d, h, sun) {
  const sy = m <= 2 && sun < 315 ? y - 1 : y;
  const year = [mod(sy - 4, 10), mod(sy - 4, 12)];
  const k = Math.floor(mod(sun - 315, 360) / 30), mb = mod(k + 2, 12); // k 0 = Yin month
  const month = [mod(mod(year[0], 5) * 2 + 2 + k, 10), mb];
  const di = mod(jdn(y, m, d) + 49, 60), day = [di % 10, di % 12];
  let hour = null;
  if (h !== null) { const hb = Math.floor(((h + 1) % 24) / 2); hour = [mod(mod(day[0] + (h >= 23 ? 1 : 0), 5) * 2 + hb, 10), hb]; }
  return { year, month, day, hour };
}

// 12 branches -> peach blossom (Do-hwa) branch, keyed off the year or day branch
const PEACH = { 2: 3, 6: 3, 10: 3, 8: 9, 0: 9, 4: 9, 11: 0, 3: 0, 7: 0, 5: 6, 9: 6, 1: 6 };

// --- chart ------------------------------------------------------------------
// b: { y, m, d, h (null = unknown), mi, tz (IANA or hours), lat, lon (null = unknown), g }
function chart(b) {
  const known = b.h !== null && b.h !== undefined;
  const h = known ? b.h : 12, mi = known ? b.mi || 0 : 0;
  const off = tzOffset(b.tz, b.y, b.m, b.d, h, mi);
  const jd = julday(b.y, b.m, b.d, h + mi / 60 - off);
  // hour pillar uses local mean time when the birthplace longitude is known (daylight saving and zone width shift civil clocks)
  const lmt = known ? mod(h + mi / 60 - off + (b.lon !== null && b.lon !== undefined ? b.lon / 15 : off), 24) : null;
  const P = pillars(b.y, b.m, b.d, lmt, sunLon(jd));
  const sun = Math.floor(sunLon(jd) / 30), moon = Math.floor(moonLon(jd) / 30);
  const asc = known && b.lat !== null && b.lat !== undefined ? Math.floor(ascLon(jd, b.lat, b.lon) / 30) : null;
  const chars = []; // [element, weight, isYang]
  const add = (p, wS, wB) => { if (!p) return; chars.push([Math.floor(p[0] / 2), wS, p[0] % 2 === 0], [BRANCH_EL[p[1]], wB, p[1] % 2 === 0]); };
  add(P.year, 1, 1); add(P.month, 1, 3); add(P.hour, 1, 1);
  chars.push([BRANCH_EL[P.day[1]], 2, P.day[1] % 2 === 0]); // day stem is the Day Master itself, so only its branch counts
  const dm = Math.floor(P.day[0] / 2), total = chars.reduce((s, c) => s + c[1], 0);
  const counts = [0, 0, 0, 0, 0];
  [P.year, P.month, P.day, P.hour].forEach((p) => p && (counts[Math.floor(p[0] / 2)]++, counts[BRANCH_EL[p[1]]]++));
  const rel = [0, 0, 0, 0, 0]; // by relation to the Day Master: same, I make, I control, controls me, makes me
  chars.forEach(([e, w]) => (rel[mod(e - dm, 5)] += w / total));
  const branches = [P.year, P.month, P.day, P.hour].filter(Boolean).map((p) => p[1]);
  const peach = [P.year[1], P.day[1]].some((bb) => branches.includes(PEACH[bb]));
  const f = (x) => 40 + x * 140;
  const s = { charm: 38 + (counts[1] + counts[4]) * 2.5 + (peach ? 12 : 0) + rel[1] * 30, wealth: f(rel[2]), mind: f((rel[1] + rel[4]) / 2 + .1), grit: f(rel[0]), infl: f(rel[3]) };
  const weStat = ['grit', 'wealth', 'mind', 'charm']; // Fire, Earth, Air, Water signs
  s[weStat[sun % 4]] += 6; s[weStat[moon % 4]] += 4; if (asc !== null) s[weStat[asc % 4]] += 3;
  if (sun % 3 === 0) s.infl += 6; // cardinal sun
  for (const k of STATS) s[k] = Math.round(Math.max(30, Math.min(99, s[k])));
  const yang = chars.filter((c) => c[2]).length + (P.day[0] % 2 === 0 ? 1 : 0);
  return { b, name: b.n || 'Fighter', pillars: P, dm, dmStem: P.day[0], counts, sun, moon, asc, peach, stats: s, yang, yinTotal: chars.length + 1, moonApprox: !known };
}

// --- battle -----------------------------------------------------------------
const CTRL = (a, b) => mod(b - a, 5) === 2; // element a controls element b
const GEN = (a, b) => mod(b - a, 5) === 1;
const GRADES = [[92, 'S+'], [85, 'S'], [78, 'A'], [70, 'B'], [62, 'C'], [0, 'F']];
const gradeOf = (p) => GRADES.find((g) => p >= g[0])[1];

function power(c, o, sec) {
  const S = SECTORS[sec];
  let p = STATS.reduce((t, k) => t + (S.w[k] || 0) * c.stats[k], 0);
  p += Math.min(12, S.els.reduce((t, e) => t + c.counts[e], 0) * 3);
  if (sec === 'total') p += c.counts.filter((n) => n > 0).length * 1.5;
  const clash = CTRL(c.dm, o.dm) ? 1.06 : CTRL(o.dm, c.dm) ? .94 : 1;
  return { p: Math.min(100, Math.round(p * clash * 10) / 10), clash };
}
function battle(A, B, sec) {
  const a = power(A, B, sec), b = power(B, A, sec);
  const diff = a.p - b.p;
  return { sec, a: a.p, b: b.p, winner: Math.abs(diff) < 0.5 ? null : diff > 0 ? 'a' : 'b', ga: gradeOf(a.p), gb: gradeOf(b.p), clash: a.clash > 1 ? 'a' : b.clash > 1 ? 'b' : null };
}

// --- compatibility ("Destiny Match" / "Toxicity Index") ---------------------
const SIX = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]], CLASH = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]];
const has = (tbl, x, y) => tbl.some(([p, q]) => (p === x && q === y) || (p === y && q === x));
const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
function compat(A, B) {
  let s = 50;
  if (GEN(A.dm, B.dm) || GEN(B.dm, A.dm)) s += 14; else if (A.dm === B.dm) s += 6; else s -= 12;
  const ba = [A.pillars.year, A.pillars.month, A.pillars.day, A.pillars.hour].filter(Boolean).map((p) => p[1]);
  const bb = [B.pillars.year, B.pillars.month, B.pillars.day, B.pillars.hour].filter(Boolean).map((p) => p[1]);
  let pairs = 0;
  ba.forEach((x) => bb.forEach((y) => { if (has(SIX, x, y)) pairs += 6; else if (has(CLASH, x, y)) pairs -= 6; }));
  s += Math.max(-18, Math.min(18, pairs));
  const we = (x, y) => { const p = x % 4, q = y % 4; return p === q ? 6 : (p + q) % 2 === 0 ? 8 : -6; }; // Fire+Air, Earth+Water compatible
  s += we(A.sun, B.sun) + we(A.moon, B.moon);
  const x = [hash(A.name + A.b.y + A.b.m + A.b.d), hash(B.name + B.b.y + B.b.m + B.b.d)].sort().join(); // symmetric jitter
  s += (hash(x) % 100) / 100 * 6 - 3;
  const pct = Math.round(Math.max(.5, Math.min(99.5, s)) * 10) / 10;
  return { pct, ...compatTitle(pct) };
}
function compatTitle(p) {
  if (p >= 90) return { title: 'Destiny Match', line: `${p}% Destiny Match: You will make billions together.` };
  if (p >= 75) return { title: 'Power Couple', line: `${p}% Aligned: Start the company. Split the equity honestly.` };
  if (p >= 60) return { title: 'Friendly Fire', line: `${p}% Compatible: Great friends. Mild chaos in group projects.` };
  if (p >= 45) return { title: 'Plot Twist', line: `${p}% Match: Fun, loud, and slightly unwise to co-sign anything.` };
  if (p >= 25) return { title: 'Mild Hazard', line: `${p}% Toxic Hazard: Keep shared Wi-Fi passwords separate.` };
  return { title: 'Toxic Hazard', line: `${p}% Toxic Hazard: Do not open a business together under any circumstances.` };
}

// --- reading ----------------------------------------------------------------
const VERBS = { 0: 'roots through', 1: 'melts', 2: 'dams', 3: 'chops down', 4: 'douses' };
const LINES = {
  charm: ['{w} walks in and the room rearranges itself. {l} has charm; {w} has gravity.', '{w}\'s charm stat ({x}) is a hostile takeover of the room. {l} ({y}) is still looking for the entrance.', '{w} flirts in Mandarin, Morse and eye contact. {l} just waves.'],
  wealth: ['{w}\'s chart has money magnetism ({x} vs {y}). {l} will be told "it\'s not in the budget".', 'Where {w} sees compound interest, {l} sees a fun purchase. Wealth {x} to {y}.', '{w} was clearly born holding a spreadsheet. {l}\'s Wealth ({y}) is mostly vibes.'],
  mind: ['{w} out-thinks {l} by {d} points of pure strategy. This was a chess game and {l} brought checkers.', 'The stars gave {w} a plan and {l} a snack ({x} vs {y} Intellect).', '{w} saw this fight coming three moves ago. {l} is still reading the rules.'],
  grit: ['{w} simply refuses to lose ({x} Grit). {l} ({y}) negotiates with the snooze button.', 'Neither storm nor rival moves {w}. {l} has a lovely personality and a flexible spine.', '{w}\'s Grit is a stubborn mule with a mission. {l} ({y}) blinked first.'],
  infl: ['{w} speaks and people reorganize their calendars. {l}\'s Influence ({y}) is a polite suggestion.', 'Command presence: {w} {x}, {l} {y}. One of them is the main character.', '{w}\'s chart reads "boss". {l}\'s reads "please see HR".'],
};
function reading(A, B, r) {
  const S = SECTORS[r.sec], rnd = (arr, k) => arr[hash(A.name + B.name + r.sec + k) % arr.length];
  if (!r.winner) return { head: 'Cosmic Stalemate', body: [`${A.name} and ${B.name} are dead even in ${S.name}. The universe flipped a coin, caught it, and left. Try another arena.`] };
  const W = r.winner === 'a' ? A : B, L = r.winner === 'a' ? B : A;
  const top = STATS.filter((k) => S.w[k]).sort((p, q) => S.w[q] * (W.stats[q] - L.stats[q]) - S.w[p] * (W.stats[p] - L.stats[p]))[0];
  const fill = (t, k) => t.replace(/\{w\}/g, W.name).replace(/\{l\}/g, L.name).replace(/\{x\}/g, W.stats[k]).replace(/\{y\}/g, L.stats[k]).replace(/\{d\}/g, Math.abs(W.stats[k] - L.stats[k]));
  const body = [fill(rnd(LINES[top], 'a'), top)];
  const we = EL[W.dm], le = EL[L.dm];
  if (CTRL(W.dm, L.dm)) body.push(`Elemental clash: ${W.name}'s ${we} Day Master ${VERBS[W.dm]} ${L.name}'s ${le}. That is a built-in +6% damage.`);
  else if (CTRL(L.dm, W.dm)) body.push(`${L.name}'s ${le} ${VERBS[L.dm]} ${W.name}'s ${we}, a -6% handicap, and ${W.name} still won. That is just rude.`);
  else if (GEN(W.dm, L.dm) || GEN(L.dm, W.dm)) body.push(`${we} and ${le} feed each other. The fight was nearly a hug, and the numbers still picked a side.`);
  else body.push(`${we} meets ${le} on equal footing, so this one came down to raw stats.`);
  if (r.sec === 'love' && (W.peach || L.peach)) body.push(`${W.peach ? W.name : L.name} carries the Peach Blossom star (Do-hwa), the Saju mark of magnetic attraction. Dangerous in dating apps.`);
  const second = STATS.filter((k) => S.w[k] && k !== top).sort((p, q) => (W.stats[q] - L.stats[q]) - (W.stats[p] - L.stats[p]))[0];
  if (second && W.stats[second] > L.stats[second]) body.push(`Bonus damage came from ${STAT_NAME[second]}: ${W.stats[second]} vs ${L.stats[second]}.`);
  return { head: `${W.name} wins ${S.name}`, body };
}

// --- bosses -----------------------------------------------------------------
const mulberry = (a) => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const BOSS_NAMES = ['Mercury Retrograde', 'Eclipse Tyrant', 'Saturn Return Colossus', 'Void Moon Wraith', 'Mars Square Warlord', 'Venus Cazimi Siren', 'Pluto Transit Behemoth', 'Full Moon Berserker', 'Jupiter Station Giant', 'Node Shifter'];
function dailyBoss(dateKey) { // dateKey 'YYYYMMDD'; same boss for everyone that day
  const r = mulberry(hash('boss' + dateKey));
  const b = { n: BOSS_NAMES[Math.floor(r() * BOSS_NAMES.length)] + ' Boss', y: 1950 + Math.floor(r() * 56), m: 1 + Math.floor(r() * 12), d: 1 + Math.floor(r() * 28), h: Math.floor(r() * 24), mi: 0, tz: 0, lat: 40, lon: 0, g: 'x' };
  const c = chart(b);
  STATS.forEach((k) => (c.stats[k] = Math.min(99, Math.round(c.stats[k] * 1.08)))); // boss aura
  c.boss = true;
  return c;
}
function rivalChart(seed) { // "Random Rival": invented fighter
  const r = mulberry(seed), first = ['Nova', 'Orion', 'Lyra', 'Zephyr', 'Vega', 'Atlas', 'Selene', 'Rigel', 'Ember', 'Kai', 'Mira', 'Soren'], last = ['Voss', 'Hale', 'Quill', 'Ashford', 'Lark', 'Ward', 'Stone', 'Vale'];
  return chart({ n: first[Math.floor(r() * 12)] + ' ' + last[Math.floor(r() * 8)], y: 1960 + Math.floor(r() * 50), m: 1 + Math.floor(r() * 12), d: 1 + Math.floor(r() * 28), h: Math.floor(r() * 24), mi: 0, tz: 0, lat: 40, lon: 0, g: 'x' });
}

// --- share links: tiny JSON -> base64url -------------------------------------
const pack = (b, cityIdx) => { const s = JSON.stringify([b.n, b.y, b.m, b.d, b.h === null ? -1 : b.h, b.mi || 0, cityIdx, b.g]); return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unpack = (t) => { try { const a = JSON.parse(decodeURIComponent(escape(atob(t.replace(/-/g, '+').replace(/_/g, '/'))))); return a.length === 8 && a.slice(1, 7).every(Number.isFinite) ? { n: String(a[0]).slice(0, 14), y: a[1], m: a[2], d: a[3], h: a[4] < 0 ? null : a[4], mi: a[5], city: a[6], g: String(a[7]).slice(0, 1) } : null; } catch { return null; } };

// --- QR code (byte mode, ECC L, versions 1-9) -----------------------------------
const QR_EC = [[7, 1, 19, 0, 0], [10, 1, 34, 0, 0], [15, 1, 55, 0, 0], [20, 1, 80, 0, 0], [26, 1, 108, 0, 0], [18, 2, 68, 0, 0], [20, 2, 78, 0, 0], [24, 2, 97, 0, 0], [30, 2, 116, 0, 0]]; // v10+ has uneven blocks; links never need it
const QR_AL = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
const GFE = [], GFL = []; for (let i = 0, x = 1; i < 255; i++) { GFE[i] = x; GFL[x] = i; x <<= 1; if (x & 256) x ^= 0x11D; }
const gmul = (a, b) => (a && b ? GFE[(GFL[a] + GFL[b]) % 255] : 0);
function rs(data, n) {
  let g = [1]; for (let i = 0; i < n; i++) { const ng = new Array(g.length + 1).fill(0); g.forEach((c, j) => { ng[j] ^= c; ng[j + 1] ^= gmul(c, GFE[i]); }); g = ng; }
  const r = new Array(n).fill(0);
  for (const d of data) { const f = d ^ r.shift(); r.push(0); if (f) g.slice(1).forEach((c, j) => (r[j] ^= gmul(c, f))); }
  return r;
}
function qr(text) {
  const bytes = [...unescape(encodeURIComponent(text))].map((c) => c.charCodeAt(0));
  let v = QR_EC.findIndex(([, b1, c1, b2, c2]) => b1 * c1 + b2 * c2 - 2 >= bytes.length);
  if (v < 0) return null;
  const [ecn, b1, c1, b2, c2] = QR_EC[v], cap = b1 * c1 + b2 * c2, ver = v + 1, N = 17 + ver * 4;
  const bits = []; const put = (x, n) => { for (let i = n - 1; i >= 0; i--) bits.push((x >> i) & 1); };
  put(4, 4); put(bytes.length, 8); bytes.forEach((x) => put(x, 8)); put(0, Math.min(4, cap * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const cw = []; for (let i = 0; i < bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let pad = 0xEC; cw.length < cap; pad ^= 0xEC ^ 0x11) cw.push(pad);
  const blocks = []; let o = 0;
  for (let i = 0; i < b1 + b2; i++) { const len = i < b1 ? c1 : c2; blocks.push(cw.slice(o, o + len)); o += len; }
  const ecs = blocks.map((b) => rs(b, ecn)), out = [];
  for (let i = 0; i < Math.max(c1, c2); i++) blocks.forEach((b) => i < b.length && out.push(b[i]));
  for (let i = 0; i < ecn; i++) ecs.forEach((e) => out.push(e[i]));
  const seq = []; out.forEach((x) => put2(seq, x)); if (ver >= 2 && ver <= 6) seq.push(0, 0, 0, 0, 0, 0, 0);
  function put2(a, x) { for (let i = 7; i >= 0; i--) a.push((x >> i) & 1); }
  const M = Array.from({ length: N }, () => new Array(N).fill(0)), F = Array.from({ length: N }, () => new Array(N).fill(false));
  const set = (x, y, d) => { if (x >= 0 && y >= 0 && x < N && y < N) { M[y][x] = d ? 1 : 0; F[y][x] = true; } };
  const finder = (cx, cy) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const m = Math.max(Math.abs(dx), Math.abs(dy)); set(cx + dx, cy + dy, m !== 4 && m !== 2); } };
  finder(3, 3); finder(N - 4, 3); finder(3, N - 4);
  for (let i = 8; i < N - 8; i++) { set(i, 6, i % 2 === 0); set(6, i, i % 2 === 0); }
  const al = QR_AL[v];
  al.forEach((cx) => al.forEach((cy) => { if ((cx === 6 && cy === 6) || (cx === 6 && cy === al[al.length - 1]) || (cy === 6 && cx === al[al.length - 1])) return; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }));
  set(8, N - 8, true);
  const fmtCells = []; for (let i = 0; i < 15; i++) { // [x,y] copies of format bit i
    const a = i < 6 ? [8, i] : i < 8 ? [8, i + 1] : i === 8 ? [7, 8] : [14 - i, 8];
    const b = i < 8 ? [N - 1 - i, 8] : [8, N - 15 + i]; fmtCells.push([a, b]);
  }
  fmtCells.forEach(([a, b]) => { F[a[1]][a[0]] = true; F[b[1]][b[0]] = true; });
  if (ver >= 7) { let r = ver; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >> 11) * 0x1F25); const vb = (ver << 12) | r;
    for (let i = 0; i < 18; i++) { const bit = (vb >> i) & 1, a = N - 11 + (i % 3), b = Math.floor(i / 3); set(a, b, bit); set(b, a, bit); } }
  // place data bits in the zigzag
  let k = 0, up = true;
  for (let x = N - 1; x > 0; x -= 2) { if (x === 6) x--;
    for (let i = 0; i < N; i++) { const y = up ? N - 1 - i : i; for (const xx of [x, x - 1]) if (!F[y][xx]) M[y][xx] = k < seq.length ? seq[k++] : 0; }
    up = !up; }
  const maskFn = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0, (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0, (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0];
  const build = (mk) => M.map((row, y) => row.map((c, x) => (F[y][x] ? c : c ^ (maskFn[mk](x, y) ? 1 : 0))));
  const fmtBits = (mk) => { let d = (1 << 3 | mk), r = d << 10; for (let i = 14; i >= 10; i--) if ((r >> i) & 1) r ^= 0x537 << (i - 10); return ((d << 10) | r) ^ 0x5412; }; // ECC level L = 01
  const penalty = (R) => {
    let p = 0;
    for (let t = 0; t < 2; t++) for (let i = 0; i < N; i++) { let run = 1; for (let j = 1; j < N; j++) { const a = t ? R[j][i] : R[i][j], b = t ? R[j - 1][i] : R[i][j - 1]; if (a === b) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } }
    for (let y = 0; y < N - 1; y++) for (let x = 0; x < N - 1; x++) if (R[y][x] === R[y][x + 1] && R[y][x] === R[y + 1][x] && R[y][x] === R[y + 1][x + 1]) p += 3;
    const dark = R.flat().reduce((s, c) => s + c, 0); p += Math.floor(Math.abs(dark * 20 - N * N * 10) / (N * N)) * 10;
    return p;
  };
  let best = null;
  for (let mk = 0; mk < 8; mk++) {
    const R = build(mk), fb = fmtBits(mk);
    fmtCells.forEach(([a, b], i) => { const bit = (fb >> i) & 1; R[a[1]][a[0]] = bit; R[b[1]][b[0]] = bit; });
    const pen = penalty(R); if (!best || pen < best.pen) best = { pen, R };
  }
  return best.R;
}

const AW = { STEMS, BRANCHES, ANIMALS, EL, EL_COLOR, SIGNS, GLYPH, WEL, STATS, STAT_NAME, SECTORS, chart, battle, compat, reading, dailyBoss, rivalChart, pack, unpack, qr, tzOffset, pillars, julday, sunLon, moonLon, ascLon, hash, mulberry, gradeOf, CTRL, GEN, VERBS };
if (typeof module !== 'undefined') module.exports = AW; else root.AW = AW;
})(typeof window !== 'undefined' ? window : globalThis);
