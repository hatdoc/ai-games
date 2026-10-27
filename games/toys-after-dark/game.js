// Toys After Dark: simulation. Detection, suspicion, humans, missions, chaos events, bots, camera.
const $ = (s) => document.querySelector(s);
const { T, scene, camera, renderer } = TAD;
const A = TADAudio;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[Math.random() * a.length | 0];
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

// ---------------- save ----------------
const SAVE_KEY = 'tad-save-1';
const defSave = () => ({ xp: 0, coins: 0, kind: 'robot', tint: null, tintId: 'def', acc: '', emote: 'wave', own: { tint: ['def'], acc: [''], emote: ['wave'], kind: ['robot', 'teddy'] }, ach: {}, done: {}, rec: { rounds: 0, wins: 0, bestScore: 0, bestTime: 0, catches: 0 }, daily: { day: '', done: false }, set: { master: 1, music: 0.6, sfx: 0.8, amb: 0.5, sens: 1, quality: 'high', cam: 1, calm: false, assist: false }, seen: false });
let S = defSave();
try { const o = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); S = Object.assign(S, o); const d = defSave(); S.set = Object.assign(d.set, o.set); S.own = Object.assign(d.own, o.own); S.rec = Object.assign(d.rec, o.rec); S.daily = Object.assign(d.daily, o.daily); } catch (e) { /* private mode */ }
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };
const levelNeed = (l) => 100 + 60 * (l - 1);
const level = () => { let x = S.xp, l = 1; while (x >= levelNeed(l)) { x -= levelNeed(l); l++; } return { l, x, need: levelNeed(l) }; };
const KIND_LVL = { robot: 1, teddy: 1, ninja: 2, windup: 2, clown: 3, explorer: 4 };

// ---------------- missions ----------------
// step: get (pick an item up), drop (carry it to a spot), use (hold E in a zone; coop needs a teammate beside you)
const POOL = [[-4, -14], [11, -5], [4, -17], [-5, 6], [10, 15], [-1, 17], [15, -2], [-17, 8], [1, -8], [-6, -12], [-3, 12], [8, 3]];
const HQ = ['hq'];
const MISSIONS = [
  { id: 'cookie', name: 'COOKIE HEIST', emoji: '🍪', time: 200, blurb: 'A cookie fell behind the desk. Get it to Toy HQ before it is discovered.', steps: [{ t: 'get', item: '🍪', name: 'the cookie', spot: [[15.5, -9.8], [10.8, -9.5], [20, -10]] }, { t: 'drop', at: HQ }] },
  { id: 'rescue', name: 'OPERATION RESCUE', emoji: '🦸', time: 230, blurb: 'A friend is trapped in the toy box. Pry it open together, then carry them home.', steps: [{ t: 'use', at: [-9, 11.5, 'the toy box lid'], time: 3, coop: 1, text: 'Pry open the lid' }, { t: 'get', item: '🪆', name: 'the trapped toy', spot: [[-6, 12.5]] }, { t: 'drop', at: HQ }] },
  { id: 'swap', name: 'THE GREAT TOY SWAP', emoji: '🔀', time: 230, blurb: 'Swap the duck and the dino. Leave nothing out of place.', steps: [{ t: 'get', item: '🦆', name: 'the duck', spot: [[-4, -12]] }, { t: 'drop', at: [9, 10, "the dino's spot"] }, { t: 'get', item: '🦖', name: 'the dino', spot: [[9, 13]] }, { t: 'drop', at: [-4, -12, "the duck's spot"] }] },
  { id: 'fort', name: 'PILLOW FORT', emoji: '🏰', time: 260, blurb: 'Gather a pillow and a blanket, then build the fort together.', steps: [{ t: 'get', item: '🛏️', name: 'the pillow', heavy: 1 }, { t: 'drop', at: [-4, 18, 'the fort site'] }, { t: 'get', item: '🧣', name: 'the blanket' }, { t: 'drop', at: [-4, 18, 'the fort site'] }, { t: 'use', at: [-4, 18, 'the fort site'], time: 3, coop: 1, text: 'Build the fort' }] },
  { id: 'remote', name: 'THE MISSING REMOTE', emoji: '📺', time: 200, blurb: 'The remote slid right in front of the door. Dangerous. Be quick.', steps: [{ t: 'get', item: '📺', name: 'the remote', spot: [[2.5, -18.5], [-2.5, -18]] }, { t: 'drop', at: HQ }] },
  { id: 'love', name: 'LOVE LETTER', emoji: '💌', time: 210, blurb: 'Deliver a secret letter from under the bed to Dolly at the desk.', steps: [{ t: 'get', item: '💌', name: 'the letter', spot: [[-6.5, -12], [-6.5, -5]] }, { t: 'drop', at: [18, -9.5, 'Dolly, at the desk'] }] },
  { id: 'escape', name: 'THE GREAT ESCAPE', emoji: '🗝️', time: 260, blurb: 'Find the key, unlock the wardrobe and bring back the treasure.', steps: [{ t: 'get', item: '🔑', name: 'the key' }, { t: 'use', at: [17, 4, 'the wardrobe lock'], time: 2.5, text: 'Unlock the wardrobe' }, { t: 'get', item: '🏆', name: 'the treasure', spot: [[17, 6]] }, { t: 'drop', at: HQ }] },
  { id: 'birthday', name: 'BIRTHDAY SABOTAGE', emoji: '🎈', time: 280, blurb: 'Rearrange the balloons into a secret arrow on the play mat.', steps: [{ t: 'get', item: '🎈', name: 'a balloon' }, { t: 'drop', at: [0, 8, 'balloon spot 1'] }, { t: 'get', item: '🎈', name: 'a balloon' }, { t: 'drop', at: [-3, 5, 'balloon spot 2'] }, { t: 'get', item: '🎈', name: 'a balloon' }, { t: 'drop', at: [3, 5, 'balloon spot 3'] }] },
  { id: 'battery', name: 'MISSING BATTERIES', emoji: '🔋', time: 210, blurb: 'The toy car is dead. Find a battery and bring it back to life.', steps: [{ t: 'get', item: '🔋', name: 'a battery' }, { t: 'use', at: [-3, -0.5, 'the toy car'], time: 2, text: 'Insert the battery' }] },
  { id: 'feast', name: 'MIDNIGHT FEAST', emoji: '🍰', time: 240, blurb: 'Collect snacks and lay out a feast on the play mat.', steps: [{ t: 'get', item: '🍬', name: 'a sweet' }, { t: 'drop', at: [0, 3, 'the play mat'] }, { t: 'get', item: '🍪', name: 'a cookie' }, { t: 'drop', at: [0, 3, 'the play mat'] }, { t: 'get', item: '🧃', name: 'a juice box' }, { t: 'drop', at: [0, 3, 'the play mat'] }] },
  { id: 'treasure', name: 'TREASURE HUNT', emoji: '🗺️', time: 250, blurb: 'Follow the map to the shelf, grab the gem and hide it at HQ.', steps: [{ t: 'get', item: '🗺️', name: 'the map' }, { t: 'drop', at: [17, 17, 'the bookshelf'] }, { t: 'get', item: '💎', name: 'the gem', spot: [[17, 14.5]] }, { t: 'drop', at: HQ }] },
];
const missionById = (id) => MISSIONS.find((m) => m.id === id) || MISSIONS[0];

// ---------------- world geometry helpers ----------------
const OBST = TAD.OBST;
const inObst = (x, z, m = 1.2) => OBST.some((o) => x > o.x0 - m && x < o.x1 + m && z > o.z0 - m && z < o.z1 + m);
const walkable = (x, z) => Math.abs(x) < 22.4 && z > -22 && z < 22.4 && !inObst(x, z);
const WALLS = [{ x0: -25, z0: -26, x1: -4, z1: -24.2, tall: 1 }, { x0: 4, z0: -26, x1: 25, z1: -24.2, tall: 1 }];
const SIGHT = OBST.filter((o) => o.tall).concat(WALLS);
function segRect(ax, az, bx, bz, r) { // slab test: does segment a-b cross rect r?
  let t0 = 0, t1 = 1; const dx = bx - ax, dz = bz - az;
  for (const [p, q] of [[-dx, ax - r.x0], [dx, r.x1 - ax], [-dz, az - r.z0], [dz, r.z1 - az]]) {
    if (Math.abs(p) < 1e-9) { if (q < 0) return false; } else { const t = q / p; if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } }
  }
  return true;
}
const los = (ax, az, bx, bz) => !SIGHT.some((r) => segRect(ax, az, bx, bz, r));
function pushOut(e, rad) {
  for (const o of OBST) {
    if (e.x > o.x0 - rad && e.x < o.x1 + rad && e.z > o.z0 - rad && e.z < o.z1 + rad) {
      const l = e.x - (o.x0 - rad), r = o.x1 + rad - e.x, f = e.z - (o.z0 - rad), b = o.z1 + rad - e.z, m = Math.min(l, r, f, b);
      if (m === l) e.x = o.x0 - rad; else if (m === r) e.x = o.x1 + rad; else if (m === f) e.z = o.z0 - rad; else e.z = o.z1 + rad;
    }
  }
  e.x = clamp(e.x, -22.8, 22.8); e.z = clamp(e.z, -22.8, 22.8);
}

// ---------------- state ----------------
const G = { mode: 'menu', t: 0, timeScale: 1, shake: 0 };
let P = null, bots = [], H = null, items = [], evid = [], movers = [], markers = null, labels = [];
const input = { ix: 0, iy: 0, freeze: false, act: false, actEdge: false, ability: false, drop: false };
let cy = 0, camPos = new T.Vector3(0, 14, 30), menuT = 0, demo = false, hero = null, heroKey = '';
const UI = window.UI = window.UI || {};

function makeEnt(kind, tint, acc, name, isBot) {
  const toy = TAD.makeToy(kind, tint, acc); scene.add(toy.group);
  return { toy, kind, name, isBot, x: 0, z: 0, vx: 0, vz: 0, face: 0, fz: 0, frozen: false, susp: 0, hidden: null, carry: null, cd: { ab: 0 }, boost: 0, speedNow: 0, stun: 0, ai: { wait: 0, goal: null, freezeAt: 0, clumsy: false, follow: 0 }, emote: '', out: 0, obsT: 0, seenBy: 0 };
}
const BOT_NAMES = ['Biscuit', 'Tick-Tock', 'Giggles', 'Kage', 'Bolt', 'Pip'];

// ---------------- round lifecycle ----------------
function clearRound() {
  [P, ...bots].forEach((e) => e && scene.remove(e.toy.group));
  items.forEach((i) => scene.remove(i.g)); evid = []; items = [];
  movers.forEach((m) => scene.remove(m.mesh)); movers = [];
  if (H) { scene.remove(H.m.group); H = null; }
  if (markers) { scene.remove(markers); markers = null; }
  TAD.door.rotation.y = 0; TAD.hallLight.intensity = 0; TAD.shaft.material.opacity = 0; TAD.strip.material.opacity = 0; TAD.underShadow.material.opacity = 0;
  TAD.tower.forEach((b) => { b.position.copy(b.userData.home); b.rotation.set(0, 0, 0); b.userData.vel.set(0, 0, 0); b.userData.fall = false; });
  P = null; bots = [];
}
function startRound(id) {
  clearRound(); A.resume(); if (hero) { scene.remove(hero.toy.group); hero = null; heroKey = ''; }
  const def = missionById(id), kinds = Object.keys(TAD.KINDS).filter((k) => k !== S.kind);
  P = makeEnt(S.kind, S.tint, S.acc, 'You', false); const ring = new T.Mesh(new T.RingGeometry(1.7, 2.1, 32), new T.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.9, side: T.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.09; P.toy.group.add(ring); P.x = -4; P.z = 7; P.face = 0.5;
  for (let i = 0; i < 3; i++) { const k = kinds.splice(Math.random() * kinds.length | 0, 1)[0]; const b = makeEnt(k, null, pick(['', 'bow', 'shades', 'party']), TAD.KINDS[k].name.split(' ')[0], true); b.x = -8 + i * 3.2; b.z = 10 + i * 0.8; b.ai.clumsy = i === 2; bots.push(b); }
  Object.assign(G, { mode: 'play', def, t: 0, step: 0, timeLeft: def.time, strikes: 0, won: false, over: 0, timeScale: 1, shake: 0, paused: false, prog: 0, spawnT: 0, evT: rnd(14, 20), fakeT: rnd(30, 45), chatT: 0, tipT: 0,
    stats: { peak: 0, visits: 0, visitsClean: 0, catches: 0, frozenObs: 0, hides: 0, evidSeen: 0, relocated: 0, noiseT: -99, botCaught: 0, whoT: -99, snitch: 0, worstTm: 0, allBotsDown: 0, falseAlarms: 0, steps: 0, incidents: [], side: { cool: true, statue: false, fast: false }, visitPeak: 0 }, log: [] });
  H = { m: TAD.makeHuman('mom'), type: 'mom', x: 0, z: -40, f: 0, phase: 'away', timer: rnd(9, 13), wps: [], wi: 0, pause: 0, speed: 6, inv: null, fake: false, warnT: 0, warnLen: 0, step: 0, visit: 0, ret: false, hold: 0, scan: 0, fav: null, carry: null };
  H.m.group.visible = false; scene.add(H.m.group);
  rec.length = 0; A.music('safe'); activateStep();
  UI.startRound && UI.startRound();
}
function activateStep() {
  if (markers) { scene.remove(markers); markers = null; }
  const st = G.def.steps[G.step]; if (!st) return;
  markers = new T.Group(); scene.add(markers); G.prog = 0; G.cur = st;
  const ring = (x, z, col) => { const r = new T.Mesh(new T.RingGeometry(2.2, 2.7, 40), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false })); r.rotation.x = -Math.PI / 2; r.position.set(x, 0.12, z); markers.add(r); const beam = new T.Mesh(new T.CylinderGeometry(2.4, 2.4, 14, 24, 1, true), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.1, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending })); beam.position.set(x, 7, z); markers.add(beam); return r; };
  if (st.t === 'get') {
    let spots = (st.spot || POOL.filter((p) => dist(p[0], p[1], P.x, P.z) > 8)).filter((p) => walkable(p[0], p[1]));
    if (!spots.length) spots = [[0, 8]];
    const s = pick(spots), g = new T.Group(), sp = TAD.sprite(st.item, 3.4); sp.position.y = 3; g.add(sp); g.position.set(s[0], 0, s[1]); scene.add(g);
    const it = { kind: 'step', g, sp, x: s[0], z: s[1], hx: s[0], hz: s[1], emoji: st.item, st, held: false, evidence: false }; items.push(it); ring(s[0], s[1], 0xffd34a); G.target = it;
  } else {
    const at = st.at[0] === 'hq' ? TAD.PLACES.hq : st.at; G.target = { x: at[0], z: at[1], r: st.t === 'drop' ? 3.6 : 3.2, label: at[2] }; ring(at[0], at[1], st.t === 'use' ? 0x6ef0ff : 0x7ef0b0);
    const arrow = TAD.sprite(st.t === 'use' ? '🛠️' : '📦', 3); arrow.position.set(at[0], 7, at[1]); markers.add(arrow); markers.userData.bob = arrow;
  }
  UI.step && UI.step();
}
function stepDone() {
  if (G.won || G.over) return;
  if (G.cur && G.cur.t === 'use' && P.carry) { const it = P.carry; P.carry = null; scene.remove(it.g); items = items.filter((i) => i !== it); } // the key / battery is used up
  A.complete(); G.stats.steps++; G.step++; UI.toast && UI.toast('✔ ' + stepText(G.cur));
  if (G.step >= G.def.steps.length) { missionComplete(); return; }
  activateStep();
}
function stepText(st) {
  if (!st) return '';
  if (st.t === 'get') return 'Grab ' + st.name;
  if (st.t === 'drop') return 'Take it to ' + (st.at[0] === 'hq' ? 'Toy HQ' : st.at[2]);
  return (st.text || 'Do the thing') + (st.coop ? ' (needs a teammate)' : '');
}
function missionComplete() {
  G.won = true; G.over = 2.4; G.stats.completeT = G.def.time - G.timeLeft; P.emote = S.emote; bots.forEach((b) => (b.emote = 'dance'));
  A.music('victory'); A.complete(); UI.alert && UI.alert('MISSION COMPLETE!', 'good', 2400);
}
function endRound(why) { G.mode = 'results'; G.why = why; if (H) H.m.group.visible = false; UI.results && UI.results(); }

// ---------------- noise ----------------
function noise(x, z, loud, src) {
  if (src === 'player') G.stats.noiseT = G.t;
  if (!H || (H.phase !== 'in' && H.phase !== 'leave') || H.fake) return;
  const rad = (10 + loud * 30) * (H.type === 'mom' ? 1 : 0.85), d = dist(x, z, H.x, H.z);
  if (d < rad) {
    H.inv = { x, z, t: 2.6 }; H.hold = 0;
    if (src === 'player' && !P.hidden) P.susp += loud * 40 * (1 - d / rad * 0.5), flagReason('noise');
    if (src === 'bot') { const b = bots.find((q) => dist(q.x, q.z, x, z) < 1) || null; if (b) b.susp += loud * 40; }
  }
}
let lastReason = '';
const flagReason = (r) => { lastReason = r; };

// ---------------- humans ----------------
const rec = []; let recT = 0;
function hSees(e, extra = 0) {
  if (!H || H.fake || (H.phase !== 'in' && H.phase !== 'leave') || e.hidden || e.out > 0) return false;
  const dx = e.x - H.x, dz = e.z - H.z, d = Math.hypot(dx, dz), rng = (H.type === 'mom' ? 40 : 34) + extra;
  if (d > rng) return false;
  const half = H.type === 'mom' ? 0.98 : 0.9, a = Math.abs(angDiff(Math.atan2(dx, dz), H.f));
  if (a > half && !(d < 4.5 && a < 2.3)) return false;
  return los(H.x, H.z + 0, e.x, e.z);
}
function startVisit(fake) {
  H.visit++; H.fake = fake; H.phase = 'warn'; H.ret = false; H.type = H.visit === 1 ? 'mom' : Math.random() < 0.42 ? 'kid' : 'mom';
  scene.remove(H.m.group); H.m = TAD.makeHuman(H.type); H.m.group.visible = false; scene.add(H.m.group);
  H.warnLen = H.warnT = fake ? rnd(3, 4) : H.type === 'kid' ? rnd(3.6, 4.6) : rnd(5, 6.5); H.step = 0; H.speed = H.type === 'mom' ? 6.2 : 11.5; H.stepAcc = 0;
  H.visitPeak = 0; G.stats.visitPeak = 0;
}
function planRoute() {
  const wps = [], mom = H.type === 'mom';
  if (mom) {
    wps.push({ x: 0, z: -14, p: 0.8 }); wps.push({ x: rnd(-4, 4), z: 2, p: 1.6 });
    const spots = [[8, -9], [-6, -3], [-3, 14], [11, 6], [-8, 9]]; const s1 = pick(spots); wps.push({ x: s1[0], z: s1[1], p: 1.6 });
    const hd = pick(TAD.HIDES.filter((h) => !h.small).concat(TAD.HIDES.filter((h) => h.small).slice(0, Math.random() < 0.25 ? 2 : 0)));
    wps.push({ x: hd.x, z: hd.z, p: 1.7, peek: hd });
    evid.forEach((ev) => wps.push({ x: ev.x, z: ev.z - 5, p: 0.4 }));
    wps.push({ x: 0, z: -14, p: 0.3 });
  } else {
    wps.push({ x: 0, z: -8, p: 0.2 });
    const pool = [P, ...bots].filter((e) => !e.hidden); H.fav = pick(pool) || P;
    wps.push({ fav: true, p: 0.2 }); wps.push({ x: -4, z: -14, p: 0 });
  }
  H.wps = wps; H.wi = 0; H.pause = 0;
}
function updateHuman(dt) {
  const h = H, S0 = G.stats;
  if (h.phase === 'away') {
    h.timer -= dt; if (G.over || G.won) return;
    G.fakeT -= dt; if (G.fakeT < 0 && h.timer > 5) { G.fakeT = rnd(28, 40); A.step(rnd(-1, 1), 0.2); A.creak(); }
    if (h.timer <= 0) startVisit(Math.random() < 0.2 && h.visit > 0);
    return;
  }
  const mom = h.type === 'mom';
  if (h.phase === 'warn') {
    h.warnT -= dt; const prog = 1 - h.warnT / h.warnLen; h.stepAcc -= dt;
    const dd = [0 - P.x, -24 - P.z], len = Math.hypot(dd[0], dd[1]) || 1, rx = Math.cos(cy), rz = -Math.sin(cy);
    const pan = clamp((dd[0] / len) * rx + (dd[1] / len) * rz, -1, 1) * 0.9;
    if (h.stepAcc <= 0) { A.step(pan, 0.12 + 0.88 * prog, mom); h.stepAcc = (mom ? 0.62 : 0.4) - 0.2 * prog; if (prog > 0.5 && Math.random() < 0.3) A.creak(pan); }
    TAD.underShadow.material.opacity = prog > 0.55 ? 0.65 * Math.abs(Math.sin(G.t * (mom ? 5 : 9))) : 0;
    TAD.strip.material.opacity = prog > 0.35 ? 0.25 + 0.12 * Math.sin(G.t * 6) : 0;
    if (!h.handled && h.warnT < 1.3 && !h.fake) { h.handled = true; A.handle(); }
    if (h.warnT < 0.9 && !h.fake) { TAD.door.rotation.y = clamp((0.9 - h.warnT) / 0.7, 0, 1) * 1.45; TAD.hallLight.intensity = 2.4 * clamp((0.9 - h.warnT) / 0.7, 0, 1); TAD.shaft.material.opacity = 0.16 * clamp((0.9 - h.warnT) / 0.7, 0, 1); if (!h.opened) { h.opened = true; A.doorOpen(); } }
    if (prog > 0.05 && !h.warned) { h.warned = true; A.music('approach'); UI.alert(h.fake ? 'FOOTSTEPS…' : (mom ? 'MOM IS COMING!' : 'THE KID IS COMING!'), 'warn', 2200); UI.hint(`Hold ${UI.isTouch ? 'FREEZE' : 'F'} when the door opens!`); }
    if (h.warnT <= 0) {
      h.warned = false; h.handled = false; h.opened = false; TAD.underShadow.material.opacity = 0; TAD.strip.material.opacity = 0;
      if (h.fake) { h.phase = 'away'; h.timer = rnd(7, 11); TAD.hallLight.intensity = 0; A.music('safe'); UI.alert('FALSE ALARM…', 'good', 1400); if (P.susp < 90) G.stats.falseAlarm = (G.stats.falseAlarm || 0) + 1; return; }
      h.phase = 'in'; h.x = 0; h.z = -25.5; h.f = 0; h.m.group.visible = true; h.t0 = G.t; h.visitT = 0; h.grace = 1.0; planRoute(); S0.visits++; A.music('entry'); A.thud(0.6); G.shake = S.set.calm ? 0 : 0.5;
      UI.alert(mom ? 'FREEZE!' : 'ACT NATURAL!', 'bad', 1800); h.limit = mom ? rnd(15, 20) : rnd(10, 13); G.stats.visitPeak = 0;
    }
    return;
  }
  // inside the room
  h.visitT += dt; h.grace = Math.max(0, h.grace - dt);
  if (h.visitT > 1.6 && A.state === 'entry') A.music('inspect');
  const inv = h.inv;
  let tx = null, tz = null, spd = h.speed;
  if (h.phase === 'leave') { tx = 0; tz = -27; spd = h.speed * 1.1; if (h.z < -25.2) { h.m.group.visible = false; h.phase = 'away'; TAD.door.rotation.y = 0; TAD.hallLight.intensity = 0; TAD.shaft.material.opacity = 0; h.timer = rnd(16, 26) * (S.set.freq || 1); if (G.stats.visitPeak < 50) G.stats.visitsClean++; if (Math.random() < 0.2 && !G.won) { h.timer = 3; h.ret = true; } A.music(P.susp > 25 ? 'suspicion' : 'safe'); UI.hint(''); if (h.ret) h.timer = 2.8; } }
  else if (inv && inv.t > 0) { inv.t -= dt; if (dist(h.x, h.z, inv.x, inv.z) > 4) { tx = inv.x; tz = inv.z; spd *= 1.2; } else { h.scan += dt; h.f += Math.sin(G.t * 3) * dt * 1.2; } if (inv.t <= 0) h.inv = null; }
  else if (h.pause > 0) { h.pause -= dt; h.scan += dt; if (mom) h.f += Math.sin(h.scan * 2.4) * dt * 1.1; else h.f += dt * 2; if (h.peek && h.pause < 0.7 && !h.peeked) { h.peeked = true; peek(h.peek); } }
  else {
    const w = h.wps[h.wi];
    if (w) {
      if (w.fav) { const f = h.fav; if (f && !f.hidden) { tx = f.x; tz = f.z; } else if (!f.hidden) { h.wi++; } else { h.wi++; } if (f && dist(h.x, h.z, f.x, f.z) < 3.2 && !f.hidden) { grab(f); h.wi++; h.pause = 0.5; } }
      else { tx = w.x; tz = w.z; if (dist(h.x, h.z, w.x, w.z) < 1.4) { h.pause = w.p; h.peek = w.peek; h.peeked = false; h.wi++; tx = null; } }
    } else { h.phase = 'leave'; UI.hint(''); }
    if (h.visitT > h.limit && h.phase === 'in') h.phase = 'leave';
  }
  if (h.carry) { /* carrying a toy to the bed */ tx = -13; tz = -4; if (dist(h.x, h.z, -13, -4) < 3) { drop(); } }
  let walking = false;
  if (tx !== null) {
    const dx = tx - h.x, dz = tz - h.z, d = Math.hypot(dx, dz) || 1; walking = true;
    const want = Math.atan2(dx, dz), da = angDiff(want, h.f); h.f += clamp(da, -dt * 3.5, dt * 3.5);
    if (Math.abs(da) < 1.2) { h.x += Math.sin(h.f) * spd * dt; h.z += Math.cos(h.f) * spd * dt; }
    h.stepAcc -= dt; if (h.stepAcc <= 0) { const dd = dist(h.x, h.z, P.x, P.z), rx = Math.cos(cy), rz = -Math.sin(cy), pan = clamp(((h.x - P.x) * rx + (h.z - P.z) * rz) / 20, -1, 1); A.step(pan, clamp(1 - dd / 45, 0.15, 1), true); h.stepAcc = mom ? 0.5 : 0.3; if (dd < 14 && !S.set.calm) G.shake = Math.max(G.shake, 0.12); }
  }
  h.m.group.position.set(h.x, 0, h.z); h.m.group.rotation.y = h.f; TAD.animateHuman(h.m, G.t, walking);
  function peek(hd) {
    UI.alert(`SHE'S CHECKING ${hd.n.toUpperCase()}!`, 'warn', 1500);
    [P, ...bots].forEach((e) => { if (e.hidden === hd) { if (e === P) { P.susp += 60; flagReason('found'); } else { e.susp += 60; } } });
  }
  function grab(f) {
    if (f === P && (P.frozen || P.fz > 0.5) && P.susp < 100) { relocate(P); } else if (f !== P) { relocate(f); } else if (f === P) { relocate(P); }
    h.fav = null;
  }
  function drop() { h.carry = null; }
}
function relocate(e) { // the kid carries a toy to the bed: funny, recoverable
  e.hidden = null; e.carry && dropItem(e, true);
  e.x = -13 + rnd(-2, 2); e.z = -2 + rnd(-2, 2); e.stun = 1.6; e.susp = Math.max(e.susp, 40);
  if (e === P) { G.stats.relocated++; UI.alert('THE KID PICKED YOU UP!', 'bad', 1800); addIncident('relocated', 'THE KID YEETED ME ONTO THE BED', P); if (H) H.phase = 'in'; } else addIncident('bot', e.name.toUpperCase() + ' GOT YEETED', e);
  noise(e.x, e.z, 0.3, 'none'); A.thud(0.5);
}

// ---------------- items ----------------
function dropItem(e, forced) { // leave carried item on the floor: evidence until someone puts it back
  const it = e.carry; if (!it) return; e.carry = null; it.held = false; it.x = e.x + Math.sin(e.face) * 1.8; it.z = e.z + Math.cos(e.face) * 1.8; it.g.position.set(it.x, 0, it.z); it.g.visible = true; it.sp.position.y = 2.2;
  if (e === P) { it.evidence = !forced; it.seenT = 0; if (it.evidence) { evid.push(it); } } else { it.x = it.hx; it.z = it.hz; it.g.position.set(it.x, 0, it.z); }
  A.drop();
}
function respawnItem(it) { it.x = it.hx; it.z = it.hz; it.g.position.set(it.x, 0, it.z); it.evidence = false; it.sp.position.y = 3; evid = evid.filter((e) => e !== it); }
function interact() { // E pressed
  if (P.stun > 0 || P.out > 0) return;
  if (P.hidden) { leaveHide(); return; }
  const st = G.cur;
  if (st && st.t === 'get' && !P.carry) { const it = G.target; if (it && !it.held && dist(P.x, P.z, it.x, it.z) < 3.4) { P.carry = it; it.held = true; it.g.visible = false; evid = evid.filter((e) => e !== it); A.pickup(); noise(P.x, P.z, 0.12, 'player'); UI.carry(); stepDone(); return; } }
  if (P.carry && P.carry.carried) {/* carried mission item awaiting drop handled below */}
  if (st && st.t === 'drop' && P.carry && dist(P.x, P.z, G.target.x, G.target.z) < G.target.r) {
    const it = P.carry; P.carry = null; scene.remove(it.g); items = items.filter((i) => i !== it); A.pickup(); UI.carry(); stepDone(); return;
  }
  // hiding spots
  const hd = TAD.HIDES.filter((h) => !h.small || P.kind === 'explorer').map((h) => ({ h, d: dist(P.x, P.z, h.x, h.z) })).sort((a, b) => a.d - b.d)[0];
  if (hd && hd.d < 3.2) { P.hidden = hd.h; P.x = hd.h.hx; P.z = hd.h.hz; P.toy.group.visible = false; G.stats.hides += (H && H.phase !== 'away' && H.phase !== 'warn') ? 1 : 0; UI.hint('Hidden. Press E to come out.'); A.freeze(); return; }
  // sloppy pickup of a dropped item
  const lost = items.find((i) => i.kind === 'step' && !i.held && dist(P.x, P.z, i.x, i.z) < 3.4);
  if (lost && !P.carry) { P.carry = lost; lost.held = true; lost.g.visible = false; evid = evid.filter((e) => e !== lost); A.pickup(); UI.carry(); }
}
function leaveHide() { const h = P.hidden; P.hidden = null; P.x = h.x; P.z = h.z; P.toy.group.visible = true; A.freeze(); UI.hint(''); }

// ---------------- chaos events ----------------
const EVENTS = ['cat', 'vacuum', 'tower', 'ball', 'car', 'books', 'noisy'];
function spawnEvent(kind) {
  const m = { kind, t: 0, mesh: new T.Group(), life: 8, warn: 1.8, r: 2.6 }; scene.add(m.mesh);
  const z = rnd(-14, 16);
  if (kind === 'cat') {
    m.mesh.add(TAD.sprite('🐈', 9)); m.mesh.children[0].position.y = 4.5; const body = new T.Mesh(new T.BoxGeometry(7, 3, 3), new T.MeshStandardMaterial({ color: 0x3a3a46, roughness: 1 })); body.position.y = 2.2; body.castShadow = true; m.mesh.add(body);
    const head = new T.Mesh(new T.SphereGeometry(1.7, 14, 10), new T.MeshStandardMaterial({ color: 0x3a3a46, roughness: 1 })); head.position.set(4, 3.2, 0); m.mesh.add(head); m.mesh.remove(m.mesh.children[0]);
    const dir = Math.random() < 0.5 ? 1 : -1; m.x = -dir * 34; m.z = z; m.vx = dir * 32; m.vz = 0; m.mesh.rotation.y = dir > 0 ? 0 : Math.PI; m.r = 4; m.life = 3; m.warn = 2; m.say = 'A CAT IS COMING!'; m.loud = 0.5; A.meow();
  } else if (kind === 'vacuum') {
    const d = new T.Mesh(new T.CylinderGeometry(5, 5, 1.6, 28), new T.MeshStandardMaterial({ color: 0x2c2f3a, roughness: 0.4, metalness: 0.3 })); d.position.y = 0.9; d.castShadow = true; m.mesh.add(d);
    const led = new T.Mesh(new T.CylinderGeometry(0.7, 0.7, 0.2, 12), new T.MeshBasicMaterial({ color: 0x4fff9a })); led.position.y = 1.8; m.mesh.add(led);
    m.x = Math.random() < 0.5 ? -22 : 22; m.z = rnd(-12, 14); const a = rnd(-0.5, 0.5); m.vx = (m.x < 0 ? 1 : -1) * 5; m.vz = a * 5; m.r = 5.4; m.life = 16; m.warn = 2.5; m.say = 'ROBOT VACUUM ACTIVATED'; m.loud = 0.3; m.hum = true;
  } else if (kind === 'ball') {
    const b = new T.Mesh(new T.SphereGeometry(2.2, 20, 14), new T.MeshStandardMaterial({ color: 0xe8453f, roughness: 0.3 })); b.castShadow = true; m.mesh.add(b);
    const dir = Math.random() < 0.5 ? 1 : -1; m.x = -dir * 24; m.z = rnd(-10, 14); m.vx = dir * 15; m.vz = rnd(-3, 3); m.y = 2; m.vy = 8; m.r = 2.8; m.life = 5; m.warn = 1.6; m.say = 'A BALL IS BOUNCING IN!'; m.loud = 0.55; m.bounce = true;
  } else if (kind === 'car') {
    const c = TAD.car; m.mesh.add(c.clone()); m.x = -3; m.z = -3; m.vx = 0; m.vz = 16; m.r = 2.8; m.life = 3.2; m.warn = 1.6; m.say = 'THE TOY CAR IS ROLLING!'; m.loud = 0.3; m.mesh.rotation.y = 0;
    m.mesh.children[0].position.set(0, 0, 0); m.mesh.children[0].rotation.y = Math.PI / 2;
  } else if (kind === 'tower') {
    m.say = 'THE BLOCK TOWER IS WOBBLING!'; m.warn = 2.2; m.life = 1; m.noMesh = 1; m.loud = 0.8; m.x = 6; m.z = 11;
  } else if (kind === 'books') {
    m.say = 'BOOKS ARE SLIDING OFF THE SHELF!'; m.warn = 2; m.life = 1; m.noMesh = 1; m.loud = 0.75; m.x = 19; m.z = 17;
  } else { // noisy toy
    const s = pick([[-5, -8], [10, 8], [-10, 12]]); m.mesh.add(TAD.sprite('🐒', 4)); m.mesh.children[0].position.y = 3; m.x = s[0]; m.z = s[1]; m.say = 'A NOISY TOY TURNED ON!'; m.warn = 0.8; m.life = 5; m.loud = 0.6; m.noisy = true; m.r = 1.5;
  }
  if (!m.noMesh) { m.mesh.position.set(m.x, m.y || 0, m.z); }
  UI.alert(m.say, 'warn', 1800); movers.push(m); return m;
}
function updateEvents(dt) {
  G.evT -= dt; if (G.evT <= 0 && !G.over) { G.evT = rnd(20, 32); if (!H || H.phase === 'away') spawnEvent(pick(EVENTS)); else G.evT = 6; }
  movers.forEach((m) => {
    m.t += dt; if (m.t < m.warn) { if (m.kind === 'tower' && Math.random() < 0.2) TAD.tower.forEach((b, i) => { b.position.x = b.userData.home.x + Math.sin(G.t * 30 + i) * 0.1 * (i + 1); }); if (m.kind === 'vacuum' && !m.beeped) { m.beeped = true; A.vacuum(); } return; }
    if (!m.started) { m.started = true; if (m.kind === 'tower') { TAD.tower.forEach((b) => { b.userData.fall = true; b.userData.vel.set(rnd(-4, 4), rnd(2, 6), rnd(2, 8)); }); A.thud(1); noise(m.x, m.z, m.loud, 'event'); } if (m.kind === 'books') { A.thud(1); noise(m.x, m.z, m.loud, 'event'); m.life = 0.5; } if (m.kind === 'noisy') { A.honk(); } }
    const tt = m.t - m.warn;
    if (!m.noMesh) {
      m.x += m.vx * dt; m.z += m.vz * dt;
      if (m.hum) { if (m.x < -23 || m.x > 23) m.vx *= -1; if (m.z < -21 || m.z > 21) m.vz *= -1; if (Math.random() < 0.01) m.vz = rnd(-5, 5); m.mesh.rotation.y += dt; }
      if (m.bounce) { m.vy -= 40 * dt; m.y += m.vy * dt; if (m.y < 2.2) { m.y = 2.2; m.vy = 8.5; A.thud(0.4); noise(m.x, m.z, m.loud, 'event'); } m.mesh.children[0].rotation.z -= dt * 6; }
      m.mesh.position.set(m.x, m.y || 0, m.z);
      if (m.noisy && Math.floor(tt * 3) !== Math.floor((tt - dt) * 3)) { A.honk(); noise(m.x, m.z, m.loud, 'event'); m.mesh.rotation.z = Math.sin(tt * 30) * 0.2; }
      if (m.loud && !m.noisy && !m.hum && Math.floor(tt * 4) !== Math.floor((tt - dt) * 4)) noise(m.x, m.z, m.loud * 0.6, 'event');
      if (m.hum && Math.floor(tt * 2) !== Math.floor((tt - dt) * 2)) { A.vacuum(); noise(m.x, m.z, m.loud, 'event'); }
      [P, ...bots].forEach((e) => { if (!e.hidden && e.out <= 0 && !m.noisy && dist(e.x, e.z, m.x, m.z) < m.r + 1) hit(e, m); });
    }
    if (m.kind === 'tower') { TAD.tower.forEach((b) => { const u = b.userData; if (!u.fall) return; u.vel.y -= 40 * dt; b.position.addScaledVector(u.vel, dt); if (b.position.y < 1.3) { b.position.y = 1.3; if (Math.abs(u.vel.y) > 3) { A.thud(0.3); } u.vel.y *= -0.3; u.vel.x *= 0.6; u.vel.z *= 0.6; } b.rotation.x += u.vel.z * dt * 0.3; b.rotation.z -= u.vel.x * dt * 0.3; }); if (tt > 6) { TAD.tower.forEach((b) => { b.position.copy(b.userData.home); b.rotation.set(0, 0, 0); b.userData.fall = false; }); m.life = 0; } }
    if (tt > m.life) { scene.remove(m.mesh); m.done = true; }
  });
  movers = movers.filter((m) => !m.done);
}
function hit(e, m) {
  if (e.hitCd > 0) return; e.hitCd = 1.2; e.stun = 0.9; const a = Math.atan2(e.x - m.x, e.z - m.z); e.vx = Math.sin(a) * 18; e.vz = Math.cos(a) * 18;
  if (e.carry) dropItem(e, true); A.thud(0.6);
  if (e === P) { P.susp += 12; G.stats.side.cool = G.stats.side.cool; UI.alert('BONK!', 'warn', 900); } else e.susp += 12;
}

// ---------------- suspicion ----------------
const SUSP_STATES = [[25, 'safe', 'SAFE'], [50, 'alert', 'ALERT'], [75, 'danger', 'DANGER'], [100, 'critical', 'CRITICAL'], [Infinity, 'caught', 'CAUGHT']];
const suspState = (v) => SUSP_STATES.find((s) => v < s[0]);
function updateSuspicion(e, dt) {
  const vis = hSees(e), mom = H && H.type === 'mom';
  e.seenBy = vis ? 1 : 0;
  const speed = e.speedNow, moving = speed > 0.9 || (e === P && (input.act && G.cur && G.cur.t === 'use' && G.prog > 0));
  const still = !moving && (e.frozen || e.fz > 0.85);
  let gain = 0;
  if (vis) {
    e.obsT += dt;
    if (moving) gain = (mom ? 42 : 58) * (dist(e.x, e.z, H.x, H.z) < 10 ? 1.35 : 1) * (e.obsT < 0.45 || (H.grace > 0) ? 0.3 : 1);
    else if (!still) gain = 14; // idle wiggle gives you away slowly
    else { e.susp = Math.max(0, e.susp - 2 * dt); if (e === P) G.stats.frozenObs += dt; }
    if (e.kind === 'robot' && gain) gain *= 0.7;
    if (gain && e === P) flagReason(moving ? (speed < 3 ? 'twitch' : speed > 10 ? 'sprint' : 'moved') : 'wiggle');
  } else { e.obsT = 0; e.susp = Math.max(0, e.susp - (e.hidden ? 18 : 8) * dt); }
  e.susp += gain * dt;
  if (e === P && H && H.phase !== 'away' && H.phase !== 'warn') { // evidence in sight
    for (const ev of evid.slice()) if (!ev.held && hSeesPoint(ev.x, ev.z)) { ev.seenT = (ev.seenT || 0) + dt; if (ev.seenT > 0.9) { P.susp += 22; G.stats.evidSeen++; UI.alert('"WHY IS THIS ON THE FLOOR?"', 'warn', 1500); respawnItem(ev); H.inv = { x: ev.x, z: ev.z, t: 1.8 }; } }
  }
  e.susp = clamp(e.susp, 0, 100);
}
function hSeesPoint(x, z) { const dx = x - H.x, dz = z - H.z, d = Math.hypot(dx, dz); return d < 30 && Math.abs(angDiff(Math.atan2(dx, dz), H.f)) < 0.95 && los(H.x, H.z, x, z); }

function addIncident(type, caption, e, extra) {
  const inc = Object.assign({ type, caption, kind: e.kind, name: e.name, t: Math.round(G.t), susp: Math.round(e.susp) }, extra);
  G.stats.incidents.push(inc); UI.incident && UI.incident(inc); return inc;
}
function caughtCaption(speed, why) {
  if (why === 'found') return pick(['HE REALLY THOUGHT SHE WOULDN\'T LOOK UNDER THERE.', 'CAUGHT HIDING LIKE A LEGEND.']);
  if (why === 'noise') return pick(['HE REALLY THOUGHT SHE WOULDN\'T HEAR.', 'SUBTLE AS A MARCHING BAND.']);
  if (why === 'twitch') return 'BRO MOVED HIS EYEBALL.';
  if (why === 'sprint') return 'CAUGHT IN 4K.';
  if (why === 'wiggle') return 'THE WORST STATUE IN HISTORY.';
  return pick(['CAUGHT IN 4K.', 'THE WORST STATUE IN HISTORY.', 'HE REALLY THOUGHT SHE WOULDN\'T NOTICE.']);
}
function caught(e) {
  if (e === P) {
    G.stats.catches++; G.strikes++; const cap = caughtCaption(e.speedNow, lastReason); const inc = addIncident('caught', cap, e, { reason: lastReason, snap: rec.slice(-80), type2: H ? H.type : 'mom' });
    P.out = 5.5; P.susp = 0; if (P.carry) dropItem(P, true); if (P.hidden) leaveHide(); P.frozen = false;
    G.slow = 1.5; G.timeScale = 0.25; G.cine = 1.5; G.cap = cap; A.sting(); A.music('entry'); UI.catchCard(cap);
    G.lastCatch = inc;
    if (G.strikes >= 3) { G.over = 2.6; G.failed = true; }
    G.stats.lastCatchT = G.t;
  } else {
    G.stats.botCaught++; e.out = 6; e.susp = 0; e.toy.group.visible = false; if (e.carry) dropItem(e, true);
    const mine = G.t - G.stats.noiseT < 4; if (mine) { G.stats.worstTm++; } e.blameT = G.t;
    addIncident('bot', (mine ? 'SOMEONE MADE A NOISE AND ' : '') + e.name.toUpperCase() + ' PAID FOR IT', e); UI.alert(`${e.name.toUpperCase()} GOT CAUGHT!`, 'warn', 1500);
    if (bots.every((b) => b.out > 0) && !P.out) G.stats.allBotsDown = 1;
  }
}

// ---------------- entities ----------------
function moveEnt(e, dt, dx, dz, spd) {
  const len = Math.hypot(dx, dz);
  let tvx = 0, tvz = 0; if (len > 0.01) { tvx = dx / len * spd; tvz = dz / len * spd; e.face += clamp(angDiff(Math.atan2(dx, dz), e.face), -dt * 12, dt * 12); }
  const k = e.stun > 0 ? 0 : 1 - Math.exp(-dt * 16); // residual velocity decays quickly
  e.vx += (tvx - e.vx) * (e.stun > 0 ? 0.04 : k); e.vz += (tvz - e.vz) * (e.stun > 0 ? 0.04 : k);
  e.x += e.vx * dt; e.z += e.vz * dt; pushOut(e, 1);
  e.speedNow = Math.hypot(e.vx, e.vz);
}
function stopNow(e) { e.vx = e.vz = 0; e.speedNow = 0; } // freeze is immediate
function toyAnim(e, dt) {
  const target = (e.frozen || e.out > 0) ? 1 : 0; e.fz += clamp(target - e.fz, -dt * 7, dt * 7);
  TAD.animateToy(e.toy, dt, e.speedNow, e.out > 0 ? 0 : e.fz, G.t + menuT, e.emote);
  const g = e.toy.group; g.position.set(e.x, 0, e.z); g.rotation.y = e.face; g.visible = !e.hidden && !(e.isBot && e.out > 0);
  e.toy.blob.visible = true;
  if (e.out > 0 && !e.isBot) { g.visible = G.cine > 0; }
}
function abilitySpeed(e) { const K = TAD.KINDS[e.kind]; let s = 9.5 * K.speed; if (e.boost > 0) s *= e.kind === 'ninja' ? 2.8 : 2; if (e.carry && e.carry.st && e.carry.st.heavy && e.kind !== 'teddy') s *= 0.55; return s; }
function useAbility(e) {
  if (e.cd.ab > 0 || e.out > 0 || e.hidden) return; const k = e.kind;
  if (k === 'ninja') { e.boost = 0.35; e.cd.ab = 5; e.landing = true; } else if (k === 'windup') { e.boost = 2; e.cd.ab = 9; } else if (k === 'clown') { e.cd.ab = 10; A.honk(); const hp = { x: e.x, z: e.z }; if (H && H.phase === 'in') { H.inv = { x: hp.x + rnd(-14, 14), z: hp.z + rnd(-14, 14), t: 3 }; if (hSees(e)) e.susp += 25; UI.alert('HONK!', 'warn', 900); } UI.say(e, 'HONK!'); noise(e.x + rnd(-12, 12), e.z + rnd(-12, 12), 0.3, 'none'); }
  else if (k === 'robot') { e.cd.ab = 6; A.beep(); UI.say(e, 'BEEP BOOP'); } else if (k === 'teddy') { e.cd.ab = 4; UI.say(e, '*hug*'); } else { e.cd.ab = 3; UI.say(e, 'sneaky...'); }
}

function playerControl(dt) {
  const e = P; e.cd.ab = Math.max(0, e.cd.ab - dt); e.boost = Math.max(0, e.boost - dt); e.stun = Math.max(0, e.stun - dt); e.hitCd = Math.max(0, (e.hitCd || 0) - dt);
  if (e.out > 0) { e.out -= dt; if (e.out <= 0) { e.x = -4; e.z = 7; e.susp = 20; e.toy.group.visible = true; UI.alert('BACK IN THE GAME', 'good', 1200); e.stun = 0.5; } stopNow(e); return; }
  let ix = input.ix, iy = input.iy; const d0 = demo ? demoInput() : null; if (d0) ({ ix, iy } = d0);
  const wantFreeze = d0 ? d0.freeze : input.freeze;
  const seen = H && hSees(e);
  e.frozen = (wantFreeze || (S.set.assist && seen && e.obsT > 0.2 && !input.act)) && !e.hidden;
  if (e.frozen && !e.wasFrozen) { stopNow(e); A.freeze(); if (seen) UI.hint(''); }
  e.wasFrozen = e.frozen;
  const rx = Math.cos(cy), rz = -Math.sin(cy), fx = -Math.sin(cy), fz = -Math.cos(cy);
  let dx = rx * ix + fx * iy, dz = rz * ix + fz * iy;
  if (e.hidden || e.frozen) { dx = dz = 0; stopNow(e); }
  const holding = (d0 ? d0.act : input.act);
  if (G.cur && G.cur.t === 'use' && holding && G.target && dist(e.x, e.z, G.target.x, G.target.z) < G.target.r && !e.hidden) { dx = dz = 0; stopNow(e); useStep(dt); } else if (G.prog > 0 && !(G.cur && G.cur.t === 'use' && holding)) G.prog = Math.max(0, G.prog - dt * 2);
  const wasBoost = e.boost > 0; const spd = abilitySpeed(e);
  moveEnt(e, dt, dx, dz, spd);
  if (wasBoost && e.boost <= 0 && e.kind === 'ninja') { A.thud(0.7); noise(e.x, e.z, 0.6, 'player'); }
  if (e.speedNow > 12 && Math.random() < dt * 2.2) noise(e.x, e.z, 0.25, 'player');
  if (e.kind === 'robot' && Math.random() < dt * 0.06 && !e.frozen) { A.beep(); noise(e.x, e.z, 0.3, 'player'); UI.say(e, 'beep'); }
  if (input.actEdge) { interact(); } input.actEdge = false;
  if (input.drop) { input.drop = false; if (e.carry && !e.hidden) { const it = e.carry; dropItem(e); UI.carry(); noise(e.x, e.z, 0.1, 'player'); if (it) UI.hint('You left it on the floor. A human might notice!'); } }
  if (input.ability) { input.ability = false; useAbility(e); }
  if (e.carry) { e.carry.g.visible = false; }
  const g = e.toy.group; // carried item floats overhead
  if (e.carry) { if (!e.carrySp) { e.carrySp = TAD.sprite(e.carry.emoji, 2.4); e.carrySp.position.y = 5.6; g.add(e.carrySp); e.carryEmoji = e.carry.emoji; } else if (e.carryEmoji !== e.carry.emoji) { g.remove(e.carrySp); e.carrySp = null; } } else if (e.carrySp) { g.remove(e.carrySp); e.carrySp = null; }
}
function useStep(dt) {
  const st = G.cur; let ok = true;
  if (G.won || G.over) return;
  if (st.coop) { const b = bots.find((q) => q.out <= 0 && !q.hidden && dist(q.x, q.z, G.target.x, G.target.z) < 6); ok = !!b; if (!b) UI.hint('Wait for a teammate to join you!'); else UI.hint(''); }
  if (ok) { G.prog += dt; if (G.prog >= st.time) { G.prog = 0; stepDone(); } }
}
function botControl(b, dt) {
  b.cd.ab = Math.max(0, b.cd.ab - dt); b.stun = Math.max(0, b.stun - dt); b.hitCd = Math.max(0, (b.hitCd || 0) - dt);
  if (b.out > 0) { b.out -= dt; if (b.out <= 0) { b.x = -8; b.z = 10; b.susp = 0; b.toy.group.visible = true; } stopNow(b); return; }
  const a = b.ai, humanThere = H && (H.phase === 'warn' || H.phase === 'in' || H.phase === 'leave') && !H.fake;
  if (humanThere && !a.alerted) { a.alerted = true; a.freezeAt = G.t + rnd(0.15, b.ai.clumsy ? 1.9 : 0.8); }
  if (!humanThere) { a.alerted = false; a.frozenFor = 0; }
  const chatFreeze = G.chatFreeze > G.t;
  const wantFreeze = (a.alerted && G.t > a.freezeAt && !(a.clumsy && Math.random() < dt * 0.55 && G.t - a.freezeAt < 3)) || chatFreeze;
  b.frozen = wantFreeze; if (b.frozen) { stopNow(b); if (!b.wasFrozen) b.wasFrozen = true; } else b.wasFrozen = false;
  let dx = 0, dz = 0;
  if (!b.frozen) {
    a.wait -= dt;
    const coopStep = G.cur && G.cur.coop && G.target && !G.over;
    if (a.follow > G.t) { if (dist(b.x, b.z, P.x, P.z) > 5) { dx = P.x - b.x; dz = P.z - b.z; } }
    else if (coopStep && b === coopHelper()) { if (dist(b.x, b.z, G.target.x + 2, G.target.z) > 2.2) { dx = G.target.x + 2 - b.x; dz = G.target.z - b.z; } }
    else if (a.goal) { dx = a.goal[0] - b.x; dz = a.goal[1] - b.z; if (Math.hypot(dx, dz) < 1.5) { a.goal = null; a.wait = rnd(0.5, 3); } }
    else if (a.wait <= 0) { const p = pick(POOL.concat([[0, 4], [-8, 4], [8, 8]])); a.goal = walkable(p[0], p[1]) ? p : null; if (!a.goal) a.wait = 0.3; }
    if (humanThere && H.phase === 'in' && Math.random() < dt * 0.12 && !b.hidden) { /* panic wander */ }
  }
  moveEnt(b, dt, dx, dz, 7 * TAD.KINDS[b.kind].speed);
}
const coopHelper = () => bots.filter((b) => b.out <= 0).sort((a, c) => dist(a.x, a.z, G.target.x, G.target.z) - dist(c.x, c.z, G.target.x, G.target.z))[0];

// ---------------- demo autopilot (preview clip and tests) ----------------
function demoInput() {
  const e = P, st = G.cur; let tx, tz, act = false, freeze = false;
  const watch = H && hSees(e, 4) || (H && (H.phase === 'warn' && H.warnT < 2));
  if (!st) return { ix: 0, iy: 0, freeze: false, act: false };
  if (st.t === 'get') { tx = G.target.x; tz = G.target.z; if (dist(e.x, e.z, tx, tz) < 2.6 && !e.carry) G.demoAct = true; }
  else { tx = G.target.x; tz = G.target.z; const near = dist(e.x, e.z, tx, tz) < (G.target.r || 3) - 0.6; if (near) { if (st.t === 'use') act = true; else G.demoAct = true; } }
  if (watch) freeze = true; if (G.demoAct) { input.actEdge = true; G.demoAct = false; }
  const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz) || 1; let wx = dx / d, wz = dz / d; if (d < 1.4) { wx = wz = 0; }
  // convert world dir to camera-relative input
  const rx = Math.cos(cy), rz = -Math.sin(cy), fx = -Math.sin(cy), fz = -Math.cos(cy);
  return { ix: wx * rx + wz * rz, iy: wx * fx + wz * fz, freeze, act };
}

// ---------------- main update ----------------
function update(dt0) {
  menuT += dt0;
  if (G.mode === 'menu') return menuUpdate(dt0);
  if (G.mode === 'replay') return replayUpdate(dt0);
  if (G.paused) return;
  let dt = dt0 * G.timeScale; G.t += dt;
  if (G.slow > 0) { G.slow -= dt0; if (G.slow <= 0) { G.timeScale = 1; G.cine = 0; } }
  if (G.mode === 'results') { cameraFollow(dt0); renderBits(dt); return; }
  if (!G.over) G.timeLeft -= dt;
  if (G.timeLeft <= 0 && !G.over) { G.timeLeft = 0; G.over = 1.2; G.failed = true; UI.alert("TIME'S UP!", 'bad', 1600); }
  if (G.over > 0) { G.over -= dt; if (G.over <= 0) { endRound(G.won ? 'won' : G.strikes >= 3 ? 'caught' : 'time'); return; } }
  playerControl(dt); bots.forEach((b) => botControl(b, dt)); if (H) updateHuman(dt); updateEvents(dt);
  [P, ...bots].forEach((e) => { if (e.out > 0 && !e.isBot) return; if (e.out > 0) return; updateSuspicion(e, dt); });
  // suspicion consequences
  if (P.out <= 0 && P.susp >= 100) caught(P);
  bots.forEach((b) => { if (b.out <= 0 && b.susp >= 70) caught(b); });
  const ps = P.susp; G.stats.peak = Math.max(G.stats.peak, ps); if (H && H.phase !== 'away') G.stats.visitPeak = Math.max(G.stats.visitPeak, ps); if (ps >= 80) G.stats.side.cool = false;
  if (G.stats.frozenObs >= 8) G.stats.side.statue = true;
  // music
  const human = H && (H.phase === 'in' || H.phase === 'leave') && !H.fake;
  if (!G.over || !G.won) { if (!G.won) { if (ps >= 75 && H && H.phase !== 'away') A.music('critical'); else if (H && H.phase === 'warn' && !H.fake) A.music('approach'); else if (human && H.visitT > 1.6) A.music('inspect'); else if (H && H.phase === 'away' && A.state !== 'safe' && A.state !== 'suspicion' && A.state !== 'escape') A.music(ps > 25 ? 'suspicion' : 'safe'); else if (H && H.phase === 'away' && ps > 25) A.music('suspicion'); else if (H && H.phase === 'away' && ps <= 25 && A.state === 'suspicion') A.music('safe'); } }
  if (H && H.phase === 'away' && H.visit > 0 && A.state === 'inspect') A.music('escape');
  recT += dt; if (recT > 0.05) { recT = 0; rec.push({ px: P.x, pz: P.z, pf: P.face, pz2: P.fz, hx: H ? H.x : 0, hz: H ? H.z : 0, hf: H ? H.f : 0, hv: H && H.m.group.visible ? 1 : 0, ht: H ? H.type : 'mom', wk: P.speedNow }); if (rec.length > 100) rec.shift(); }
  cameraFollow(dt0); renderBits(dt); UI.hud && UI.hud();
}
function renderBits(dt) {
  [P, ...bots].forEach((e) => e && toyAnim(e, dt, G.t));
  if (P && P.hidden) { /* eyes */ }
  items.forEach((i) => { if (i.sp) i.sp.position.y = 3 + Math.sin(G.t * 3 + i.x) * 0.35; });
  if (markers && markers.userData.bob) markers.userData.bob.position.y = 7 + Math.sin(G.t * 3) * 0.5;
  if (G.target && markers) markers.children.forEach((c) => { if (c.geometry && c.geometry.type === 'RingGeometry') c.scale.setScalar(1 + Math.sin(G.t * 4) * 0.06); });
  TAD.dust.rotation.y += dt * 0.02;
}
// ---------------- camera ----------------
function cameraFollow(dt) {
  const f = P || { x: 0, z: 0 }; let tx = f.x, tz = f.z;
  if (G.mode === 'play' && P && P.out > 0) { const b = bots.find((q) => q.out <= 0); if (b) { tx = b.x; tz = b.z; } }
  let D = 16 * S.set.cam, Hh = 19 * S.set.cam, look = 2;
  if (G.mode === 'play' && H && P && P.out <= 0 && (H.phase === 'warn' && !H.fake || H.phase === 'in' || H.phase === 'leave')) { // frame the door and the human too
    const hx = H.phase === 'warn' ? 0 : H.x, hz = H.phase === 'warn' ? -24 : H.z; tx = f.x + (hx - f.x) * 0.4; tz = f.z + (hz - f.z) * 0.4; D *= 1.6; Hh *= 0.8; look = H.type === 'mom' ? 11 : 6;
  }
  let px = tx + Math.sin(cy) * D, pz = tz + Math.cos(cy) * D, py = Hh;
  if (G.cine > 0 && P) { px = P.x + Math.sin(P.face) * 7; pz = P.z + Math.cos(P.face) * 7; py = 4.2; tx = P.x; tz = P.z; }
  px = clamp(px, -23.2, 23.2); pz = clamp(pz, -23.2, 44);
  camPos.lerp(new T.Vector3(px, py, pz), 1 - Math.exp(-dt * (G.cine > 0 ? 10 : 5)));
  const sh = G.shake > 0 ? (G.shake -= dt * 1.5, Math.random() - 0.5) * G.shake * 0.8 : 0;
  camera.position.set(camPos.x + sh, camPos.y + sh * 0.5, camPos.z); camera.lookAt(tx, G.cine > 0 ? 2.8 : look, tz);
  const f2 = G.cine > 0 ? 38 : innerWidth / innerHeight < 0.8 ? 66 : 52; if (Math.abs(camera.fov - f2) > 0.1) { camera.fov += (f2 - camera.fov) * 0.15; camera.updateProjectionMatrix(); }
}
// ---------------- menu & replay ----------------
function menuUpdate(dt) {
  const key = S.kind + S.tint + S.acc; if (key !== heroKey) { if (hero) scene.remove(hero.toy.group); hero = makeEnt(S.kind, S.tint, S.acc, 'hero', false); heroKey = key; hero.x = 4.5; hero.z = 14; }
  hero.frozen = Math.sin(menuT * 0.5) > 0.7; hero.emote = hero.frozen ? '' : (Math.sin(menuT * 0.5) < -0.8 ? 'wave' : ''); hero.speedNow = 0; hero.face = -0.5 + Math.sin(menuT * 0.4) * 0.3;
  toyAnim(hero, dt, 0); hero.toy.group.position.y = 0; hero.toy.group.scale.setScalar(1.35);
  const a = menuT * 0.07; const port = innerWidth / innerHeight < 0.8; camera.position.set(-3 + Math.sin(a) * 6, 6.5, 40); camera.lookAt(port ? 3 : 5 + Math.sin(a) * 2, port ? -2 : 5.5, port ? 12 : 8); TAD.dust.rotation.y += dt * 0.02;
  TAD.hallLight.intensity = 0.6 + Math.sin(menuT * 0.7) * 0.0;
}
let rp = null;
function startReplay(inc) {
  if (!inc || !inc.snap || !inc.snap.length) return; rp = { i: 0, f: inc.snap, acc: 0, cap: inc.caption, kind: inc.kind }; G.mode = 'replay'; UI.replay(true, inc.caption);
  if (hero) hero.toy.group.visible = false; P.toy.group.visible = true; bots.forEach((b) => (b.toy.group.visible = false)); if (H) H.m.group.visible = true; G.cine = 1;
}
function replayUpdate(dt) {
  rp.acc += dt * 0.5; const idx = Math.min(rp.f.length - 1, Math.floor(rp.acc / 0.05)); const f = rp.f[idx];
  P.x = f.px; P.z = f.pz; P.face = f.pf; P.speedNow = f.wk; P.frozen = f.wk < 0.9; P.hidden = null; P.out = 0; P.emote = ''; toyAnim(P, dt, G.t); P.toy.group.visible = true;
  if (H) { H.x = f.hx; H.z = f.hz; H.f = f.hf; H.m.group.visible = !!f.hv; H.m.group.position.set(H.x, 0, H.z); H.m.group.rotation.y = H.f; }
  G.cine = 1; cameraFollow(dt); if (idx >= rp.f.length - 1 && rp.acc > rp.f.length * 0.05 + 1.2) stopReplay();
}
function stopReplay() { G.mode = 'results'; G.cine = 0; UI.replay(false); bots.forEach((b) => (b.toy.group.visible = b.out <= 0)); P.out = 0; }
function toMenu() { clearRound(); G.mode = 'menu'; G.cine = 0; G.timeScale = 1; heroKey = ''; A.music('safe'); UI.menu && UI.menu(); }

// ---------------- chat ----------------
const CHATS = ['FREEZE!', 'MOM IS HERE!', 'FOLLOW ME!', 'WHO DID THAT?', "DON'T MOVE!", "IT WASN'T ME!"];
function chat(i) {
  if (G.mode !== 'play' || P.out > 0) return; const msg = CHATS[i]; UI.say(P, msg, 2200); A.click();
  if (i === 0 || i === 4) G.chatFreeze = G.t + 4; if (i === 1) { G.chatFreeze = G.t + 3; if (!H || H.phase === 'away') G.stats.falseAlarms++; }
  if (i === 2) bots.forEach((b) => (b.ai.follow = G.t + 9)); if (i === 3 && G.t - (bots.reduce((m, b) => Math.max(m, b.blameT || -99), -99)) < 8) G.stats.snitch++;
  setTimeout(() => bots.filter((b) => b.out <= 0).slice(0, 1).forEach((b) => UI.say(b, pick(['ok ok!', '...', 'wasn\'t me', 'on it', '*gulp*'])), 700));
}

// ---------------- input ----------------
const down = {};
addEventListener('keydown', (e) => {
  if (e.repeat && !['KeyQ', 'KeyE'].includes(e.code)) { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault(); return; }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  down[e.code] = true; recompute();
  if (e.code === 'KeyE') { input.act = true; input.actEdge = true; } if (e.code === 'KeyQ') input.drop = true; if (e.code === 'Space') input.ability = true;
  if (e.code === 'KeyF' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.freeze = true;
  if (e.code === 'KeyT' && P) { P.emote = P.emote ? '' : S.emote; } if (/^Digit[1-6]$/.test(e.code)) chat(+e.code[5] - 1);
  if (e.code === 'KeyP' || e.code === 'Escape') UI.pause && UI.pause();
  if (e.code === 'KeyR' && G.mode === 'play') { /* reserved */ }
});
addEventListener('keyup', (e) => { down[e.code] = false; recompute(); if (e.code === 'KeyE') input.act = false; if (e.code === 'KeyF' || e.code.startsWith('Shift')) input.freeze = false; });
addEventListener('blur', () => { Object.keys(down).forEach((k) => (down[k] = false)); recompute(); input.freeze = input.act = false; });
function recompute() { const k = (c) => (down[c] ? 1 : 0); input.ix = k('KeyD') + k('ArrowRight') - k('KeyA') - k('ArrowLeft'); input.iy = k('KeyW') + k('ArrowUp') - k('KeyS') - k('ArrowDown'); if (joy.on) { input.ix = joy.x; input.iy = joy.y; } else { const l = Math.hypot(input.ix, input.iy); if (l > 1) { input.ix /= l; input.iy /= l; } } }
const joy = { on: false, x: 0, y: 0 };
// camera drag (mouse or touch on the right side)
let drag = null;
const cv = $('#c');
cv.addEventListener('pointerdown', (e) => { if (G.mode !== 'play' && G.mode !== 'menu') return; if (e.pointerType === 'touch' && e.clientX < innerWidth * 0.4) return; drag = { x: e.clientX, id: e.pointerId }; });
addEventListener('pointermove', (e) => { if (drag && e.pointerId === drag.id && G.mode === 'play') { cy -= (e.clientX - drag.x) * 0.006 * S.set.sens; drag.x = e.clientX; } });
addEventListener('pointerup', (e) => { if (drag && e.pointerId === drag.id) drag = null; });
addEventListener('wheel', (e) => { S.set.cam = clamp(S.set.cam + e.deltaY * 0.0006, 0.6, 1.5); }, { passive: true });
Object.assign(window, { joy, recompute });

// ---------------- loop ----------------
let last = performance.now();
function frame(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); renderer.render(scene, camera); requestAnimationFrame(frame); }
const api = window.tad = { G, S, MISSIONS, update, startRound, toMenu, startReplay, stopReplay, chat, save, level, levelNeed, KIND_LVL, input, missionById, hSees, los, endRound, spawnEvent, stepText, noise, interact, relocate, setDemo(v) { demo = v; }, get P() { return P; }, get bots() { return bots; }, get H() { return H; }, get items() { return items; }, get movers() { return movers; }, get cy() { return cy; }, set cy(v) { cy = v; }, get evid() { return evid; }, caught, startVisit, SUSP_STATES, suspState, CHATS, walkable, rec, get demo() { return demo; }, A, dist };
requestAnimationFrame(frame);
