// Midnight Stealth: Don't Wake Mom! First-person engine: movement, noise model, Mom's detectability, interactions and the five missions.
(() => {
const $ = (s) => document.querySelector(s), T = THREE, D = World.doors;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[Math.random() * a.length | 0];
const tm = (h, m, s = 0) => h * 3600 + m * 60 + s;
const fmtT = (s) => { s = (s % 86400 + 86400) % 86400; let h = s / 3600 | 0; const m = s / 60 % 60 | 0, ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s % 60 | 0).padStart(2, '0')} ${ap}`; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const bar = (v, n) => '█'.repeat(clamp(v, 0, n)) + '░'.repeat(n - clamp(v, 0, n));
const gain = (e) => (e <= 26 ? 0 : e <= 30 ? 1 : e <= 55 ? 6 + (e - 30) * .8 : 26 + (e - 55) * 1.4);

// ---------- renderer, hands, lens post-process ----------
const cv = $('#c'), R = new T.WebGLRenderer({ canvas: cv, antialias: true });
R.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
const cam = new T.PerspectiveCamera(80, 1, .05, 60); World.scene.add(cam);
const hands = new T.Group(); cam.add(hands);
const sleeveM = new T.MeshStandardMaterial({ color: 0x3a4678, roughness: .9, emissive: 0x0c0f22 }), skinM = new T.MeshStandardMaterial({ color: 0xe0b090, roughness: .8, emissive: 0x2a1c14 });
const mkArm = (side) => { const g = new T.Group(), fa = new T.Mesh(new T.BoxGeometry(.07, .07, .3), sleeveM), h = new T.Mesh(new T.BoxGeometry(.07, .045, .1), skinM);
  fa.position.set(0, 0, -.15); h.position.set(0, 0, -.35); g.add(fa, h); g.position.set(side * .2, -.27, -.32); g.rotation.set(.25, -side * .3, 0); hands.add(g); return g; };
const armL = mkArm(-1), armR = mkArm(1);
const phoneM = new T.Mesh(new T.BoxGeometry(.06, .012, .11), new T.MeshStandardMaterial({ color: 0x20242e })); const scr = new T.Mesh(new T.PlaneGeometry(.052, .1), new T.MeshBasicMaterial({ color: 0x1a2a4a }));
scr.rotation.x = -Math.PI / 2; scr.position.y = .007; phoneM.add(scr); phoneM.position.set(0, .045, -.38); phoneM.rotation.x = -.5; armL.add(phoneM);
const cupM = new T.Mesh(new T.CylinderGeometry(.045, .035, .11, 12), new T.MeshStandardMaterial({ color: 0xd04a3a, emissive: 0x301008 })); cupM.position.set(0, .06, -.36); armR.add(cupM);
const bagM = new T.Mesh(new T.BoxGeometry(.12, .15, .08), new T.MeshStandardMaterial({ color: 0xe8d9b8, emissive: 0x302810 })); bagM.position.set(0, .06, -.36); armR.add(bagM);
const beam = new T.SpotLight(0xdfeaff, 0, 14, .5, .5, 1.2); cam.add(beam, beam.target); beam.target.position.set(0, 0, -5);

let rt = null; const quad = new T.Scene(), qcam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const qmat = new T.ShaderMaterial({ uniforms: { t: { value: null }, time: { value: 0 }, al: { value: 0 }, res: { value: new T.Vector2(1, 1) } },
  vertexShader: 'varying vec2 v; void main(){ v=uv; gl_Position=vec4(position,1.); }',
  fragmentShader: `uniform sampler2D t; uniform float time, al; uniform vec2 res; varying vec2 v;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){ vec2 c=v-.5; c.x*=res.x/res.y; float r2=dot(c,c); vec2 u=c*(1.+.16*r2); u.x/=res.x/res.y; u+=.5;
      if(u.x<0.||u.x>1.||u.y<0.||u.y>1.){ gl_FragColor=vec4(0.,0.,0.,1.); return; }
      vec2 o=(u-.5)*.004; vec3 col=vec3(texture2D(t,u+o).r,texture2D(t,u).g,texture2D(t,u-o).b);
      col*=1.-smoothstep(.15,.75,r2)*.5; col+=vec3(1.,.62,.2)*al*smoothstep(.1,.6,r2)*.5; col+=(h(v*res+time)-.5)*.03; col=pow(col,vec3(.92));
      gl_FragColor=vec4(col,1.); }` });
quad.add(new T.Mesh(new T.PlaneGeometry(2, 2), qmat));
function resize() {
  const w = innerWidth, h = innerHeight, pr = R.getPixelRatio(); R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  try { if (rt) rt.dispose(); rt = new T.WebGLRenderTarget(w * pr, h * pr, { minFilter: T.LinearFilter, magFilter: T.LinearFilter }); qmat.uniforms.t.value = rt.texture; qmat.uniforms.res.value.set(w, h); } catch { rt = null; }
}
addEventListener('resize', resize); resize();

// ---------- state ----------
const P = { x: 0, z: 0, y: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, crouch: false, eye: 1.62, acc: 0, bob: 0, speed: 0 };
let G = { phase: 'menu', alert: 0, meter: 22, t: 0 }, best = {};
try { best = JSON.parse(localStorage.getItem('dwm-best') || '{}'); } catch {}
const keys = {}, hit = {}; // keys held · keys pressed this frame
const toasts = []; let toastT = 0;
const toast = (m, cls = '') => { $('#toast').innerHTML = `<span class="${cls}">${esc(m)}</span>`; toastT = 3.2; };

// ---------- input ----------
addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('.lb,input')) return;
  Snd.init(); if (!keys[e.code]) hit[e.code] = 1; keys[e.code] = 1;
  if (/^(Arrow|Space|Tab)/.test(e.code)) e.preventDefault();
  if (G.menu && /^Digit[1-9]$/.test(e.code)) chooseOpt(+e.code.slice(5) - 1);
  else if (G.phase === 'menu' && /^Digit[1-5]$/.test(e.code)) start(+e.code.slice(5) - 1);
});
addEventListener('keyup', (e) => { keys[e.code] = 0; });
addEventListener('blur', () => { for (const k in keys) keys[k] = 0; });
let drag = null;
cv.addEventListener('pointerdown', (e) => {
  Snd.init();
  if (e.pointerType === 'mouse') { if (G.phase === 'play' && !document.pointerLockElement) { try { const pl = cv.requestPointerLock(); if (pl && pl.catch) pl.catch(() => {}); } catch {} } drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; }
  else if (e.clientX < innerWidth / 2) tstick = { id: e.pointerId, x: e.clientX, y: e.clientY }; else drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  cv.setPointerCapture(e.pointerId);
});
let tstick = null;
cv.addEventListener('pointermove', (e) => {
  if (G.phase !== 'play') return;
  if (document.pointerLockElement) { look(e.movementX, e.movementY, .0022); return; }
  if (tstick && e.pointerId === tstick.id) { tmx = clamp((e.clientX - tstick.x) / 50, -1, 1); tmz = clamp((e.clientY - tstick.y) / 50, -1, 1); }
  else if (drag && e.pointerId === drag.id) { look(e.clientX - drag.x, e.clientY - drag.y, .004); drag.x = e.clientX; drag.y = e.clientY; }
});
const up = (e) => { if (tstick && e.pointerId === tstick.id) { tstick = null; tmx = tmz = 0; } if (drag && e.pointerId === drag.id) drag = null; };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
let tmx = 0, tmz = 0;
const look = (dx, dy, k) => { P.yaw -= dx * k; P.pitch = clamp(P.pitch - dy * k, -1.3, 1.3); };
document.querySelectorAll('#touch button').forEach((b) => {
  const c = b.dataset.k; b.addEventListener('pointerdown', (e) => { e.preventDefault(); Snd.init(); if (!keys[c]) hit[c] = 1; keys[c] = 1; });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => { keys[c] = 0; });
});
$('#mute').onclick = () => { $('#mute').textContent = Snd.toggle() ? '🔇' : '🔊'; };
$('#menuBtn').onclick = () => toMenu();

// ---------- noise & Mom ----------
const momPos = () => (G.sc.mom === 'couch' ? { x: 3.3, y: .5, z: 3.05 } : { x: 10.45, y: 3.55, z: 1.3 });
function reach(db, s) {
  const m = momPos(), dx = s.x - m.x, dz = s.z - m.z, dy = (s.y + 1) - m.y;
  let e = db - 1.1 * Math.max(0, Math.hypot(dx, dz, dy * 1.3) - 1);
  if (Math.abs((s.y > 1.5 ? 3 : 0) - (m.y > 1.5 ? 3 : 0)) > 1) e -= 5;
  const md = G.sc.momDoor && D[G.sc.momDoor];
  if (md && md.v < .1 && World.roomAt(s.x, s.z, s.y).name !== "Mom's Bedroom") e -= 8;
  return e;
}
function noise(db, label, src, o = {}) {
  if (G.phase !== 'play') return 0;
  src = src || P; const e = reach(db, src);
  G.lastNoise = G.t; G.meter = Math.max(G.meter, db); G.meterLabel = label; G.reach = e;
  if (db > G.worst.db) G.worst = { db: Math.round(db), t: label };
  if (e >= 81) { bust(`${label} (${Math.round(db)} dB)`); return e; }
  const g = gain(e) * (G.stir ? 1.5 : 1) * (o.mult || 1);
  if (g > 0) addAlert(g);
  return e;
}
function addAlert(g) { G.alert = Math.min(100, G.alert + g); G.maxAlert = Math.max(G.maxAlert, G.alert); G.lastGain = G.t; if (G.alert >= 100) bust('Mom woke up.'); }

const surfMode = (speed) => (speed < 1.1 ? 0 : speed < 2.4 ? 1 : 2);
function stepOnce(e, speed, isSam) {
  const sf = World.surfaceAt(e.x, e.z, e.y), mode = surfMode(speed);
  let db = sf.base + (mode === 0 ? -14 : mode === 2 ? 14 : 0) + (isSam ? 3 : 0) + rnd(-2, 3), label = sf.name;
  if (sf.creak && Math.random() < (mode === 0 ? .2 : mode === 1 ? .65 : 1)) { db = sf.base + (sf.creak > 1 ? 16 : 10) + (mode === 2 ? 8 : 0) + rnd(-2, 3); label = 'Floor creak!'; Snd.creak(db); toast(`Creak! ${Math.round(db)} dB`, 'warn'); }
  else if (!isSam || Math.random() < .6) Snd.step(db, sf.name.startsWith('Tile') ? 'tile' : sf.base < 25 ? 'carpet' : 'wood');
  if (G.thumpUntil > G.t) db -= 10; // Biscuit's tail thump masks the step
  if (!isSam && G.f.carry && mode === 2 && Math.random() < .35) { noise(58, 'Broth sloshes', e); Snd.bump(58); toast('The broth sloshes!', 'warn'); }
  noise(db, isSam ? 'Sam steps' : label, e);
}
function walk(e, speed, dt, isSam) {
  const stride = speed < 1.1 ? .6 : speed < 2.4 ? .8 : 1.1; e.acc += speed * dt;
  while (e.acc >= stride) { e.acc -= stride; stepOnce(e, speed, isSam); if (G.phase !== 'play') return; }
}
function collide(e, r) {
  const lv = e.y > 1.5 ? 1 : 0;
  for (const c of World.colliders) {
    if ((c.lv !== lv && c.lv !== 2) || (c.door && c.door.v >= c.door.pass)) continue;
    const nx = clamp(e.x, c.x1, c.x2), nz = clamp(e.z, c.z1, c.z2), dx = e.x - nx, dz = e.z - nz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-8) { const d = Math.sqrt(d2), p = r - d; e.x += dx / d * p; e.z += dz / d * p; }
    else { const l = e.x - c.x1, rr = c.x2 - e.x, t = e.z - c.z1, b = c.z2 - e.z, m = Math.min(l, rr, t, b); if (m === l) e.x = c.x1 - r; else if (m === rr) e.x = c.x2 + r; else if (m === t) e.z = c.z1 - r; else e.z = c.z2 + r; }
  }
  e.x = clamp(e.x, -4, 18); e.z = clamp(e.z, -.8, 29);
}

// ---------- choices (the micro-interactions) ----------
const roll = (o) => { const sp = o.spike; return sp && Math.random() < sp[0] ? rnd(sp[1], sp[2]) : rnd(o.db[0], o.db[1]); };
function risk(o) {
  let pN = 0, pB = 0; const K = 21, segs = [[o.db[0], o.db[1], 1 - (o.spike ? o.spike[0] : 0)]]; if (o.spike) segs.push([o.spike[1], o.spike[2], o.spike[0]]);
  for (const [lo, hi, w] of segs) for (let k = 0; k < K; k++) { const d = lo + (hi - lo) * k / (K - 1), e = reach(d, P); if (e > 30) pN += w / K; if (e >= 81 || G.alert + gain(e) * (o.bursts || 1) + (o.ex || 0) >= 100) pB += w / K; }
  const all = segs.map((s) => [s[0], s[1]]).flat();
  return { lo: Math.round(Math.min(...all)), hi: Math.round(Math.max(...all)), el: Math.round(reach(Math.min(...all), P)), eh: Math.round(reach(Math.max(...all), P)), pN: Math.round(pN * 100), pB: Math.round(pB * 100) };
}
function choice(title, opts) {
  G.menu = opts; keys.KeyE = 0;
  $('#choice').hidden = false;
  $('#choice').innerHTML = `<h3>${esc(title)}</h3>` + opts.map((o, i) => { const r = risk(o), c = r.pB >= 15 ? 'bad' : r.pN >= 50 || r.pB > 0 ? 'warn' : 'ok';
    return `<button data-i="${i}"><span class="k">${i + 1}</span>${esc(o.t)}<span class="m">🔊 ${r.lo}–${r.hi} dB at source · reaches Mom ${Math.max(0, r.el)}–${Math.max(0, r.eh)} dB · <b class="${c}">noise ${r.pN}% · bust ${r.pB}%</b>${o.ex ? ` · 💡 +${o.ex} detect` : ''}<br>🎁 ${esc(o.r || '')}</span></button>`; }).join('') + '<div class="m">Esc to step back</div>';
  $('#choice').querySelectorAll('button').forEach((b) => (b.onclick = () => chooseOpt(+b.dataset.i)));
}
function closeChoice() { G.menu = null; $('#choice').hidden = true; }
function chooseOpt(i) {
  const o = G.menu && G.menu[i]; if (!o) return; closeChoice();
  const n = o.bursts || 1, dur = o.dur || 1.6; G.busy = { t: dur, total: dur, label: o.t, fn: o.fn, say: o.say, bonus: o.bonus };
  for (let k = 0; k < n; k++) G.sched.push({ at: G.t + k * dur / n, f: () => { const d = roll(o); Snd[o.snd || 'rustle'](d); noise(d, o.label || o.t, P); } });
  if (o.ex) addAlert(o.ex);
}

// ---------- interactions ----------
const DP = { yours: [2.5, 6], mom: [9.5, 6], front: [2.0, 10], patio: [12, 3.5], cab: [7.8, .62], drawer: [8.7, 1.62] };
const DNAME = { yours: 'your bedroom door', mom: "Mom's door", front: 'front door', patio: 'patio door', cab: 'kitchen cabinet', drawer: 'nightstand drawer' };
const IN = () => G.inter || [];
function findTarget() {
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw); let best = null, bs = 1e9;
  const test = (x, z, y, r, o) => { const dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz); if (d > r || Math.abs(y - P.y) > 2.2) return; const dot = (dx * fx + dz * fz) / Math.max(d, .01); if (dot < .35 && d > .6) return; const s = d - dot; if (s < bs) { bs = s; best = o; } };
  for (const id in DP) { const d = D[id]; test(DP[id][0], DP[id][1], (d.y || 0) >= 2.5 ? 3 : 0, id === 'cab' || id === 'drawer' ? 1.5 : 1.7, { kind: 'door', id, d }); }
  for (const it of IN()) if (!it.when || it.when()) test(it.x, it.z, it.y || 0, it.r || 1.6, it);
  return best;
}

// ---------- missions ----------
const inRoom = (n) => World.roomAt(P.x, P.z, P.y).name === n;
const near = (x, z, r) => Math.hypot(P.x - x, P.z - z) < r;
const quiet = (t, db, r, x = {}) => ({ t, db, r, ...x });
const doorOpts = null;
const MISSIONS = [
  { id: 'ramen', emoji: '🍜', name: 'Midnight Ramen Ops', board: 'dont-wake-mom-ramen',
    obj: 'Leave bed, enter the kitchen, cook instant noodles and return to your bedroom safely.', hz: 'Plastic packet crunch · microwave beep · slurping spikes',
    t0: tm(2, 14, 32), base: 12, mom: 'bed', momDoor: 'mom', start: { x: 2.7, z: 4.2, y: 3, yaw: Math.PI }, gear: ['Socks On', 'Phone (Muted)'],
    bust: ['The hallway light snaps on. "Is that INSTANT RAMEN?! At 2 AM?!" Mom folds her arms. Busted.', 'Mom: "I can smell it from here. Hand over the cup."'],
    steps: [
      { obj: 'Open your bedroom door: hold E (slow is quiet, Shift is fast)', ok: () => D.yours.v >= D.yours.pass },
      { obj: 'Sneak down to the kitchen (C = crouch for quiet heel-to-toe)', ok: () => inRoom('Kitchen') },
      { obj: 'Open the upper cabinet (hold E) and take the noodles', ok: () => G.f.noodles },
      { obj: 'Open the packaging at the counter', ok: () => G.f.opened },
      { obj: 'Heat the water at the counter', ok: () => G.f.hot },
      { obj: 'Eat your noodles', ok: () => G.f.eaten || G.f.carry },
      { obj: 'Sneak back to bed and close your bedroom door (hold Q)', ok: () => inRoom('Your Bedroom') && D.yours.v < .07 },
    ],
    setup() {
      G.inter = [
        { x: 7.9, z: .7, r: 1.6, name: 'noodles', when: () => G.step === 2 && D.cab.v > .25, prompt: () => '[E] Take the Cup Noodles', use() { G.f.noodles = 1; G.held.R = 'Cup Noodles (Sealed)'; toast('Got the noodles.'); } },
        { x: 9.2, z: .7, r: 1.7, name: 'counter', when: () => G.step === 3, prompt: () => '[E] Open the packaging', use() { choice('How do you open the packet?', [
          quiet('Open it inside your hoodie pocket (muffled)', [20, 34], 'Muffled crunch', { dur: 2.2, say: 'Fabric swallows the crinkle.', fn() { G.f.opened = 1; G.held.R = 'Cup Noodles (Open)'; } }),
          quiet('Peel an inch at a time, palm over the wrap', [24, 40], 'Slow, safe-ish', { dur: 3.2, fn() { G.f.opened = 1; G.held.R = 'Cup Noodles (Open)'; } }),
          quiet('Rip it fast', [58, 76], 'Fastest · high-frequency alert', { dur: .8, snd: 'rustle', fn() { G.f.opened = 1; G.held.R = 'Cup Noodles (Open)'; } })]); } },
        { x: 9.7, z: .7, r: 1.7, name: 'microwave & kettle', when: () => G.step === 4 && !G.mw, prompt: () => '[E] Heat the water', use() { choice('Hot water: how?', [
          quiet('Microwave: stop the timer at 0:01 (press E)', [24, 32], 'Hot noodles · beeps at 0:00 if you are late', { dur: .5, snd: 'click', fn() { G.mw = { t: 8, hum: 0 }; toast('Press E when the timer shows 0:01!'); } }),
          quiet('Electric kettle: wait for it to boil', [34, 46], 'Reliable · boiling rumble', { dur: 4, bursts: 3, snd: 'buzz', fn() { G.f.hot = 1; G.held.R = 'Hot Cup Noodles'; } }),
          quiet('Pot on the stove, flame low', [28, 40], 'Quiet · slow', { dur: 5, bursts: 2, snd: 'click', say: 'The blue flame hisses softly.', fn() { G.f.hot = 1; G.held.R = 'Hot Cup Noodles'; } }),
          quiet('Skip heating: eat it crunchy and dry', [44, 60], 'Fastest · the crunch is loud', { dur: 1.5, snd: 'bump', fn() { G.f.hot = 1; G.held.R = 'Dry Noodles'; } })]); } },
        { x: 9.5, z: 1.9, r: 1.7, name: 'kitchen island', when: () => G.step === 5, prompt: () => '[E] Eat or carry the noodles', use() { choice('Time to eat', [
          quiet('Eat here in small bites, no slurping', [26, 40], 'No spill risk', { dur: 4, bursts: 2, fn() { G.f.eaten = 1; G.held.R = 'Empty cup'; } }),
          quiet('Carry it upstairs with both hands (do not run!)', [20, 34], 'Eat in bed · broth sloshes if you hurry', { dur: 1.2, fn() { G.f.carry = 1; G.held.R = 'Hot cup (careful!)'; } }),
          quiet('Slurp fast and leave', [52, 72], 'Fastest · slurp spike', { dur: 2.5, bursts: 2, fn() { G.f.eaten = 1; G.held.R = 'Empty cup'; } })]); } },
      ];
    } },

  { id: 'ranked', emoji: '🎮', name: '3 AM Secret Ranked Match', board: 'dont-wake-mom-ranked',
    obj: 'Sneak past Mom asleep on the couch, turn on the PC and win a clutch match.', hz: 'RGB light spill · keyboard chatter · surprise voice chat',
    t0: tm(3, 2, 10), base: 18, mom: 'couch', start: { x: 2.7, z: 4.2, y: 3, yaw: Math.PI }, gear: ['Socks On', 'Phone (Muted)', 'Headset (Wired)'],
    bust: ['The lamp clicks on. "ARE YOU PLAYING GAMES AT 3 AM?!" Mom already has the controller. Busted.', 'Mom, from the couch, eyes still closed: "Log off. NOW."'],
    steps: [
      { obj: 'Open your bedroom door (hold E)', ok: () => D.yours.v >= D.yours.pass },
      { obj: 'Sneak down to the living room', ok: () => inRoom('Living Room') },
      { obj: 'Creep behind the couch to the gaming desk', ok: () => near(1.4, 4.6, 1.5) },
      { obj: 'Boot the PC (watch the RGB light!)', ok: () => G.f.pcOn },
      { obj: 'Put the headset on', ok: () => G.f.headset },
      { obj: 'Play the clutch match', ok: () => G.f.match },
      { obj: 'Celebrate (quietly!)', ok: () => G.f.cele },
      { obj: 'Shut the PC down', ok: () => G.f.shut },
      { obj: 'Sneak back to bed and close your door (hold Q)', ok: () => inRoom('Your Bedroom') && D.yours.v < .07 },
    ],
    setup() {
      const pcFn = (rgb, ex) => () => { G.f.pcOn = 1; G.f.rgb = rgb; };
      const CFG = {
        3: ['Boot the PC', [quiet('Kill the RGB with the case switch, then boot', [20, 32], 'Dark boot', { dur: 2, snd: 'click', fn: pcFn(0) }),
          quiet('Hit power and hope', [28, 40], 'Fast · RGB spills across the room', { dur: 1, snd: 'click', ex: 8, fn: pcFn(1) }),
          quiet('Wake it from your phone (no clicks)', [20, 30], 'Silent · screen glow', { dur: 2.5, snd: 'click', ex: 4, fn: pcFn(0) })]],
        4: ['Headset time', [quiet('Mic muted, volume low, headset on both ears', [19, 28], 'Quiet · you will not hear Mom', { dur: 1.5, fn() { G.f.headset = 1; } }),
          quiet('One ear off to hear the room, mic muted', [20, 30], 'Awareness · teammates may leak', { dur: 1.5, spike: [.2, 58, 66], fn() { G.f.headset = 1; } }),
          quiet('Mic on so your squad hears callouts', [24, 36], 'Best callouts · chat can explode', { dur: 1.5, spike: [.35, 62, 78], fn() { G.f.headset = 1; } })]],
        5: ['The match: 1v3, last one alive', [quiet('Soft keys, slow flicks', [22, 32], 'Safe · slower clutch', { dur: 4, bursts: 2, bonus: 30, fn() { G.f.match = 1; } }),
          quiet('Hammer the mechanical keyboard and flick', [34, 48], 'Max reward · thock thock', { dur: 4, bursts: 3, bonus: 80, spike: [.2, 58, 68], fn() { G.f.match = 1; } }),
          quiet('Use the controller in your lap', [24, 38], 'Balanced · soft buttons', { dur: 4, bursts: 2, bonus: 50, fn() { G.f.match = 1; } })]],
        6: ['VICTORY! You want to scream...', [quiet('Silent fist pump, bite your sleeve', [20, 28], 'Perfect restraint', { dur: 1, fn() { G.f.cele = 1; } }),
          quiet('Whisper "LET\'S GOOO"', [34, 50], 'Satisfying · whispers carry', { dur: 1, fn() { G.f.cele = 1; } }),
          quiet('Slap the desk', [60, 76], 'Max joy · max noise', { dur: .6, snd: 'bump', fn() { G.f.cele = 1; } })]],
        7: ['Leave no trace', [quiet('Sleep the PC with the keyboard shortcut', [19, 29], 'Instant · silent', { dur: 1, snd: 'click', fn() { G.f.shut = 1; G.f.pcOn = 0; G.f.rgb = 0; } }),
          quiet('Shut down fully', [28, 40], 'Clean · fans whir', { dur: 2.5, snd: 'buzz', ex: 4, fn() { G.f.shut = 1; G.f.pcOn = 0; G.f.rgb = 0; } }),
          quiet('Leave it running and go', [20, 30], 'Fastest · RGB keeps glowing', { dur: .5, snd: 'click', ex: 12, fn() { G.f.shut = 1; } })]],
      };
      G.inter = [{ x: .9, z: 4.55, r: 1.9, name: 'gaming PC', when: () => G.step >= 3 && G.step <= 7, prompt: () => `[E] ${CFG[G.step][0]}`, use() { choice(CFG[G.step][0], CFG[G.step][1]); } }];
    } },

  { id: 'delivery', emoji: '🍔', name: 'Operation Midnight Delivery', board: 'dont-wake-mom-delivery',
    obj: 'Reach the front door, unlock the deadbolt and collect your food before the driver rings the bell.', hz: 'Porch motion light · deadbolt friction · food smell · the clock',
    t0: tm(1, 58, 20), base: 10, mom: 'bed', momDoor: 'mom', eta: 110, start: { x: 2.7, z: 4.2, y: 3, yaw: Math.PI }, gear: ['Socks On', 'Phone (Muted)', 'Cash ($23)'],
    bust: ['DING-DONG! The doorbell rings through the house. "WHO IS AT THE DOOR AT 2 AM?!" Busted.', 'The porch light flares and Mom is at the top of the stairs. "What did you order?!"'],
    steps: [
      { obj: 'Open your bedroom door (hold E)', ok: () => D.yours.v >= D.yours.pass },
      { obj: 'Get to the front foyer, fast but quietly!', ok: () => inRoom('Front Foyer') },
      { obj: 'Unlock the deadbolt: hold E slowly (Shift = fast and loud)', ok: () => G.f.unlocked },
      { obj: 'Open the front door (hold E) and step out', ok: () => inRoom('Front Porch') },
      { obj: 'Meet the driver and take the food', ok: () => G.f.bag },
      { obj: 'Close the front door behind you (hold Q)', ok: () => D.front.v < .08 && !inRoom('Front Porch') },
      { obj: 'Sneak upstairs and close your bedroom door', ok: () => inRoom('Your Bedroom') && D.yours.v < .07 },
    ],
    setup() {
      G.f.locked = 1; G.arr = G.sc.t0 + G.sc.eta - 22; G.sc.eta0 = G.sc.t0 + G.sc.eta; World.driver.visible = true;
      G.inter = [
        { x: 2.3, z: 9.75, y: 0, r: 1.5, name: 'deadbolt', hold: true, when: () => G.step === 2, prompt: () => '[E hold] Turn the deadbolt (Shift = fast)', use(dt) {
          G.f.bolt = (G.f.bolt || 0) + dt * (keys.ShiftLeft ? 4 : 1); if (G.f.bolt >= 1.8) { G.f.bolt = 0; G.f.unlocked = 1; D.front.locked = 0; const fast = !!keys.ShiftLeft; Snd.click(fast ? 52 : 28); noise(fast ? rnd(48, 58) : rnd(24, 34), fast ? 'CLACK, deadbolt' : 'Deadbolt turns', P); } else prog(G.f.bolt / 1.8, 'Turning deadbolt'); } },
        { x: 2, z: 11.2, y: 0, r: 2.2, name: 'driver', when: () => G.step === 4 && G.driverHere, prompt: () => '[E] Take the food from the driver', use() { choice('Handing it over', [
          quiet('Whisper thanks, take the bag, tip on the phone', [22, 34], 'Silent · the smell lingers', { dur: 2, ex: 6, fn() { G.f.bag = 1; G.held.R = 'Burger Bag'; } }),
          quiet('Pay cash and ask for change', [36, 52], 'Old school · coins jingle', { dur: 2.5, ex: 6, fn() { G.f.bag = 1; G.held.R = 'Burger Bag'; } }),
          quiet('Stuff the bag in your hoodie', [22, 36], 'Smell contained · crinkle', { dur: 2.2, ex: 2, fn() { G.f.bag = 1; G.f.hoodie = 1; G.held.R = 'Bag (in hoodie)'; } })]); } },
      ];
    } },

  { id: 'friend', emoji: '🤫', name: 'Sneaking a Friend In / Out', board: 'dont-wake-mom-friend',
    obj: 'Guide your friend through the back patio and upstairs past the dog and creaky floors. Then get them out again.', hz: 'Dog tail-thumping · double-person steps · squeaky stair step #4',
    t0: tm(1, 20, 5), base: 20, mom: 'bed', momDoor: 'mom', start: { x: 10.6, z: 3.5, y: 0, yaw: -Math.PI / 2 }, gear: ['Socks On', 'Phone (Muted)', 'Friend: Sam (Outside)'],
    bust: ['The hall light snaps on. "SAM?! What is Sam doing in my house at 1 AM?!" Busted.', 'The dog barks and Mom storms in. "Out! Both of you!"'],
    steps: [
      { obj: 'Slide the patio door open: hold E (gently)', ok: () => D.patio.v >= D.patio.pass },
      { obj: 'Calm Biscuit the dog and wave Sam in', ok: () => G.f.dog },
      { obj: "Lead Sam to your room. Hold V to tell him to WAIT. Mind step #4!", ok: () => inRoom('Your Bedroom') && samIn('Your Bedroom') },
      { obj: 'Close your bedroom door (hold Q)', ok: () => D.yours.v < .07 },
      { obj: "5:20 AM: lead Sam back down and out to the patio", ok: () => G.f.out },
      { obj: 'Close the patio door (hold Q)', ok: () => D.patio.v < .1 && inRoom('Kitchen') },
    ],
    setup() {
      const s = World.sam; s.visible = true; G.sam = { x: 15.4, z: 3.8, y: 0, acc: 0, trail: [], mode: 'wait', yaw: 0 }; s.position.set(15.4, 0, 3.8);
      G.inter = [{ x: 14, z: 2.8, y: 0, r: 3.6, name: 'Biscuit', when: () => G.step === 1, prompt: () => '[E] Calm Biscuit', use() { choice('Biscuit is thumping his tail...', [
        quiet('Step in on the beat of the thumps (cover)', [17, 26], 'Masks your steps · tricky timing', { dur: 2.5, bursts: 2, fn() { G.f.dog = 1; G.sam.mode = 'follow'; G.thumpUntil = G.t + 8; } }),
        quiet('Offer a treat from your pocket', [20, 32], 'Dog calmed · quiet crunch', { dur: 2, fn() { G.f.dog = 1; G.sam.mode = 'follow'; } }),
        quiet('Whisper "Sit"', [28, 44], 'Fast · he may whine', { dur: 1.5, spike: [.3, 52, 66], fn() { G.f.dog = 1; G.sam.mode = 'follow'; } })]); } }];
    } },

  { id: 'phone', emoji: '📱', name: 'Confiscated Phone Retrieval', board: 'dont-wake-mom-phone',
    obj: "Infiltrate Mom's bedroom, reach into the nightstand drawer and retrieve your phone while she sleeps a meter away.", hz: 'Creaky floor heatmap · drawer friction · blue screen flare · charging chime',
    t0: tm(3, 40, 12), base: 28, mom: 'bed', momDoor: 'mom', momStir: 16, start: { x: 9.5, z: 7.6, y: 3, yaw: 0 }, gear: ['Socks On', 'Phone (Confiscated)'], doorV: { mom: .06 },
    bust: ['The lamp snaps on. Mom is sitting up. "I KNEW IT. Phone. Hand it over. And go to bed." Busted.', 'Mom, arms folded: "Looking for something?"'],
    steps: [
      { obj: "Get into Mom's room: hold E to open her door (it is ajar) or squeeze through", ok: () => inRoom("Mom's Bedroom") },
      { obj: 'Reach the nightstand. Darker boards creak: the rug and the west wall are quiet', ok: () => near(8.0, 2.2, 1.4) },
      { obj: 'Slide the nightstand drawer open: hold E slowly', ok: () => D.drawer.v >= .7 },
      { obj: 'Take your phone', ok: () => G.f.phone },
      { obj: 'Silence the phone before the screen wakes Mom', ok: () => G.f.muted },
      { obj: "Leave and close Mom's door (hold Q)", ok: () => !inRoom("Mom's Bedroom") && D.mom.v < .15 },
      { obj: 'Back to your room: close your door (hold Q)', ok: () => inRoom('Your Bedroom') && D.yours.v < .07 },
    ],
    setup() {
      G.inter = [
        { x: 8.7, z: 2.2, y: 3, r: 1.7, name: 'phone', when: () => G.step === 3, prompt: () => '[E] Take your phone', use() { choice('The phone is plugged in and its screen is lit', [
          quiet('Lift phone AND charger together, palm over the screen', [21, 34], 'No chime · glow covered', { dur: 2, ex: 3, fn() { G.f.phone = 1; G.held.L = 'Phone (screen glowing)'; G.glow = 1; G.stir = G.t + 5; G.stirAt = G.t; } }),
          quiet('Unplug the cable first, then lift the phone', [30, 44], 'Clean · charging chime risk', { dur: 1.8, spike: [.45, 52, 64], snd: 'chime', ex: 5, fn() { G.f.phone = 1; G.held.L = 'Phone (screen glowing)'; G.glow = 1; G.stir = G.t + 5; G.stirAt = G.t; } }),
          quiet('Lean across the bed to grab it', [34, 56], 'Fastest · bed springs groan', { dur: 1.2, snd: 'bump', ex: 6, fn() { G.f.phone = 1; G.held.L = 'Phone (screen glowing)'; G.glow = 1; G.stir = G.t + 5; G.stirAt = G.t; } })]); } },
        { x: 8.7, z: 2.2, y: 3, r: 2, name: 'phone', when: () => G.step === 4, prompt: () => '[E] Silence the phone', use() { choice('Silence it!', [
          quiet('Flip the ringer switch, palm over the screen', [18, 28], 'Muted · tiny click', { dur: 1.5, snd: 'click', fn() { G.f.muted = 1; G.glow = 0; G.held.L = 'Phone (Muted)'; } }),
          quiet('Press power to blank the screen', [20, 32], 'Dark · ringer still on', { dur: 1.2, snd: 'click', ex: 3, fn() { G.f.muted = 1; G.glow = 0; G.held.L = 'Phone (Muted)'; } }),
          quiet('Ignore it and retreat first', [20, 30], 'Fastest · a notification can ring out', { dur: .6, spike: [.35, 60, 72], snd: 'buzz', ex: 8, fn() { G.f.muted = 1; G.glow = 0; G.held.L = 'Phone (Muted)'; } })]); } },
      ];
    } },
];
const samIn = (n) => { const s = G.sam; return s && World.roomAt(s.x, s.z, s.y).name === n; };

// ---------- helpers: progress, HUD ----------
function prog(f, label) { G.progT = .25; G.progF = f; G.progL = label; }

function start(i) {
  const sc = MISSIONS[i]; Snd.init(); closeChoice();
  G = { phase: 'play', sc, i, t: 0, clock: sc.t0, alert: sc.base, base: sc.base, maxAlert: sc.base, meter: 22, meterLabel: 'Ambient', reach: 0, lastNoise: -9, lastGain: -9, step: 0, f: {}, held: { L: 'Phone (Muted)', R: 'Empty' },
    worst: { db: 0, t: '' }, flash: false, battery: 100, sched: [], busy: null, menu: null, stir: 0, stirNext: rnd(10, 22), thumpUntil: 0, thumpAt: 0, mw: null, over: false, inter: [], sam: null, glow: 0, driverHere: false };
  for (const id in D) { D[id].v = (sc.doorV && sc.doorV[id]) || 0; D[id].apply(); D[id].locked = 0; D[id].acc = 0; }
  World.moms.bed.visible = sc.mom === 'bed'; World.moms.couch.visible = sc.mom === 'couch'; World.sam.visible = false; World.driver.visible = false;
  for (const k of ['pc', 'phone', 'porch', 'lamp']) World.lights[k].intensity = 0;
  World.monScreen.material.color.set(0x223355); World.rgb.material.color.set(0x222222);
  World.lights.lamp.intensity = 0; World.lights.mom.intensity = .7;
  Object.assign(P, sc.start, { vx: 0, vz: 0, pitch: -.05, crouch: false, acc: 0, eye: 1.62 });
  sc.setup(); G.flashLabel = ''; Snd.tv(sc.id === 'ranked');
  $('#menu').hidden = true; $('#end').hidden = true; $('#hud').hidden = false; $('#obj').hidden = false; $('#menuBtn').hidden = false;
  if (matchMedia('(pointer:fine)').matches) { try { const pl = cv.requestPointerLock(); if (pl && pl.catch) pl.catch(() => {}); } catch {} }
  toast('Tip: C = crouch (quiet), Shift = run (loud), F = flashlight', 'ok');
}
function toMenu() {
  Snd.tv(false); G.phase = 'menu'; closeChoice(); try { document.exitPointerLock(); } catch {}
  $('#hud').hidden = true; $('#obj').hidden = true; $('#end').hidden = true; $('#menuBtn').hidden = true; $('#prompt').textContent = ''; $('#stir').hidden = true; $('#big').hidden = true; $('#prog').hidden = true;
  $('#menu').hidden = false; World.lights.lamp.intensity = 0;
  $('#cards').innerHTML = MISSIONS.map((s, i) => `<button class="card" data-i="${i}"><span class="bst">${best[s.id] ? '★ ' + best[s.id] : ''}</span><b>${s.emoji} ${i + 1}. ${esc(s.name)}</b><div class="obj">${esc(s.obj)}</div><div class="hz">⚠️ ${esc(s.hz)}</div></button>`).join('');
  $('#cards').querySelectorAll('.card').forEach((c) => (c.onclick = () => start(+c.dataset.i)));
  P.x = 6; P.z = 4.6; P.y = 3; P.yaw = 0.6; P.pitch = -.1; G.sc = MISSIONS[0]; G.alert = 0; G.f = {}; G.sam = null;
}

// ---------- end screens ----------
function finish(html) {
  Snd.tv(false); G.phase = 'end'; G.over = true; closeChoice(); try { document.exitPointerLock(); } catch {}
  $('#hud').hidden = true; $('#obj').hidden = true; $('#prompt').textContent = ''; $('#stir').hidden = true; $('#big').hidden = true; $('#prog').hidden = true;
  $('#end').hidden = false; $('#end').innerHTML = `<div class="endbox">${html}<div id="lb"></div><div id="ad"></div></div>`; adBanner($('#ad'));
}
function bust(why) {
  if (G.phase !== 'play') return; G.phase = 'busted'; G.bustT = 0; G.why = why; Snd.bump(70); $('#stir').hidden = true; closeChoice(); G.busy = null;
}
function win() {
  const sc = G.sc, rise = G.maxAlert - G.base, el = G.t, score = Math.round(clamp(430 + (100 - rise) * 4.2 - Math.min(150, el / 6) + (G.bonus || 0), 100, 1000));
  const grade = score >= 850 ? ['S', 'GHOST'] : score >= 700 ? ['A', 'NINJA'] : score >= 550 ? ['B', 'SNEAKY'] : ['C', 'LUCKY'], isBest = score > (best[sc.id] || 0);
  if (isBest) { best[sc.id] = score; try { localStorage.setItem('dwm-best', JSON.stringify(best)); } catch {} }
  finish(`<h2 class="ok">MISSION COMPLETE</h2><p>${sc.emoji} ${esc(sc.name)}: <b>undetected.</b></p><div class="sc">${score}</div><div><b>Grade ${grade[0]} · ${grade[1]}</b>${isBest ? ' · <span class="warn">★ NEW BEST!</span>' : ''}</div>
    <p class="lbl">Loudest moment: ${G.worst.db} dB (${esc(G.worst.t)}) · Mom peaked at ${Math.round(G.maxAlert)}% · ${Math.round(el)} s</p>
    <div class="btns"><button class="btn" id="again">Play again</button><button class="btn alt" id="mn">Choose scenario</button><button class="btn alt" id="share">Share</button></div>`);
  leaderboard($('#lb'), sc.board).show(score);
  $('#again').onclick = () => start(G.i); $('#mn').onclick = toMenu;
  $('#share').onclick = async (e) => { const text = `I finished "${sc.name}" in Don't Wake Mom! with ${score} points (Grade ${grade[0]}). Can you beat me?`, url = 'https://rank-game.com/games/dont-wake-mom';
    try { if (navigator.share) await navigator.share({ title: "Midnight Stealth: Don't Wake Mom!", text, url }); else { await navigator.clipboard.writeText(`${text} ${url}`); e.target.textContent = 'Copied!'; } } catch {} };
}
function bustScreen() {
  finish(`<h2 class="bad">BUSTED</h2><p>${esc(pick(G.sc.bust))}</p><p class="lbl">${esc(G.why)}</p><p class="lbl">Loudest moment: ${G.worst.db} dB (${esc(G.worst.t)}) · Mom peaked at ${Math.round(G.maxAlert)}%</p>
    <div class="btns"><button class="btn" id="again">Try again</button><button class="btn alt" id="mn">Choose scenario</button></div>`);
  $('#again').onclick = () => start(G.i); $('#mn').onclick = toMenu;
}

// ---------- per-frame update ----------
const fv = () => [-Math.sin(P.yaw), -Math.cos(P.yaw)];
function update(dt) {
  const sc = G.sc, m = World.moms[sc.mom];
  if (G.phase === 'busted') { // Mom wakes up, the lamp clicks on
    G.bustT += dt; World.lights.lamp.intensity = Math.min(1.6, G.bustT * 2); m.up.position.y = Math.min(.45, G.bustT * .5); m.up.rotation.z = Math.min(.9, G.bustT * 1.1);
    if (G.bustT > 1.8) bustScreen(); return;
  }
  if (G.phase !== 'play') { m.body.scale.y = 1 + Math.sin(performance.now() / 900) * .03; return; }
  G.t += dt; G.clock = sc.t0 + G.t + (G.skip || 0);
  m.body.scale.y = 1 + Math.sin(performance.now() / 900) * .04 + (G.stir > G.t ? .15 : 0); m.body.rotation.x = G.stir > G.t ? Math.sin(G.t * 6) * .05 : 0;
  // scheduled noises and busy actions
  for (let i = G.sched.length - 1; i >= 0; i--) if (G.t >= G.sched[i].at) { const s = G.sched.splice(i, 1)[0]; s.f(); if (G.phase !== 'play') return; }
  if (G.busy) { G.busy.t -= dt; prog(1 - G.busy.t / G.busy.total, G.busy.label); if (G.busy.t <= 0) { const b = G.busy; G.busy = null; if (b.bonus) G.bonus = (G.bonus || 0) + b.bonus; b.fn && b.fn(); if (b.say) toast(b.say); } }
  const locked = G.busy || G.menu;
  // movement
  const f = fv(), mvz = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - tmz, mvx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + tmx;
  if (keys.ArrowLeft) P.yaw += 1.8 * dt; if (keys.ArrowRight) P.yaw -= 1.8 * dt;
  if (hit.KeyC) { P.crouch = !P.crouch; } hit.KeyC = 0;
  const runKey = (keys.ShiftLeft || keys.ShiftRight) && !P.crouch;
  const tgt = locked ? 0 : P.crouch ? .9 : runKey ? 3.6 : 1.7, len = Math.hypot(mvx, mvz) || 1, wx = (f[0] * mvz + Math.cos(P.yaw) * mvx) / len, wz = (f[1] * mvz - Math.sin(P.yaw) * mvx) / len;
  const k = Math.min(1, dt * 10), want = (mvx || mvz) ? tgt : 0;
  P.vx += (wx * want - P.vx) * k; P.vz += (wz * want - P.vz) * k; P.speed = Math.hypot(P.vx, P.vz);
  P.x += P.vx * dt; collide(P, .28); P.z += P.vz * dt; collide(P, .28);
  P.y += (World.floorY(P.x, P.z, P.y) - P.y) * Math.min(1, dt * 12);
  if (P.speed > .3) walk(P, P.speed, dt, false); if (G.phase !== 'play') return;
  // Mom stirs now and then: hold still!
  const nowStir = G.stir > G.t; if (!nowStir) { G.stirNext -= dt; if (G.stirNext <= 0) { G.stir = G.t + 4; G.stirAt = G.t; G.stirNext = rnd(sc.momStir || 22, (sc.momStir || 22) + 18); } }
  if (G.stir > G.t) { if (P.speed > .45 && G.t - (G.stirAt || 0) > .9) addAlert(9 * dt); if (G.phase !== 'play') return; }
  $('#stir').hidden = !(G.stir > G.t);
  if (sc.id === 'ranked') Snd.tv(true, .06 / (1 + Math.hypot(P.x - 3.3, P.z - .5) * .6) * (P.y > 1.5 ? .3 : 1));
  // alert decay, flashlight, glow, smell
  if (G.t - G.lastGain > 1.6) G.alert = Math.max(G.base, G.alert - 1.8 * dt);
  const dm = Math.hypot(P.x - momPos().x, P.z - momPos().z), sameFloor = Math.abs(P.y - (momPos().y > 1.5 ? 3 : 0)) < 1.6;
  if (G.flash) { G.battery = Math.max(0, G.battery - dt / 5); if (G.battery <= 0) G.flash = false; if (dm < 5.5 && sameFloor) { const d = [momPos().x - P.x, momPos().z - P.z], dl = Math.hypot(...d); addAlert((1.6 + ((d[0] * f[0] + d[1] * f[1]) / dl > .7 ? 3.5 : 0)) * dt); } }
  if (hit.KeyF) { G.flash = !G.flash && G.battery > 0; } hit.KeyF = 0; beam.intensity = G.flash ? 1.7 : 0;
  if (G.glow) { World.lights.phone.intensity = 1.1; World.lights.phone.position.set(P.x, P.y + 1.4, P.z); if (sameFloor && dm < 4) addAlert(2.2 * dt); } else World.lights.phone.intensity = 0;
  scr.material.color.set(G.glow || G.flash ? 0x88bbff : 0x1a2a4a);
  if (G.f.rgb && G.f.pcOn) { World.lights.pc.intensity = 1.3; World.lights.pc.color.setHSL((G.t * .3) % 1, 1, .55); World.rgb.material.color.setHSL((G.t * .3) % 1, 1, .5); addAlert(.9 * dt); }
  else { World.lights.pc.intensity = 0; World.rgb.material.color.set(0x222222); }
  World.monScreen.material.color.set(G.f.pcOn ? 0x77aaff : 0x223355);
  if (sc.id === 'ranked' && G.f.pcOn && G.t - (G.pingT || 0) > 18 && Math.random() < dt * .1) { G.pingT = G.t; Snd.ping(); noise(rnd(42, 62), 'Discord notification', { x: .9, z: 4.6, y: 0 }); toast('Ping! A Discord notification', 'warn'); }
  // microwave minigame
  if (G.mw) { G.mw.t -= dt; G.mw.hum -= dt; if (G.mw.hum <= 0) { G.mw.hum = 1.4; noise(rnd(32, 38), 'Microwave hum', { x: 9.5, z: .6, y: 0 }); }
    if (G.mw.t <= 0) { Snd.beep(); noise(rnd(84, 92), 'MICROWAVE BEEP', { x: 9.5, z: .6, y: 0 }); if (G.phase !== 'play') return; G.mw = null; G.f.hot = 1; G.held.R = 'Hot Cup Noodles'; toast('Too late: it beeped!', 'bad'); }
    else if (hit.KeyE && G.target && G.target.name === 'microwave & kettle') { /* handled below */ } }
  // doors / holds / taps
  const tg = locked ? null : findTarget(); G.target = tg; let pr = '';
  if (G.mw) { $('#big').hidden = false; const s = Math.max(0, G.mw.t); $('#big').textContent = `0:0${Math.ceil(s)}`; $('#big').classList.toggle('go', s <= 1.7); pr = '[E] stop the microwave at 0:01'; if (hit.KeyE) { if (G.mw.t <= 1.7) { Snd.click(26); G.mw = null; G.f.hot = 1; G.held.R = 'Hot Cup Noodles'; toast('Perfect: stopped at 0:01!', 'ok'); } else toast('Too early. Wait for 0:01!', 'warn'); } }
  else $('#big').hidden = true;
  if (tg && !G.mw) {
    if (tg.kind === 'door') {
      const d = tg.d, dirn = keys.KeyE ? 1 : keys.KeyQ ? -1 : 0, fast = keys.ShiftLeft || keys.ShiftRight;
      pr = d.locked || (tg.id === 'front' && G.f.locked && !G.f.unlocked) ? `Locked: use the deadbolt` : `[E] open · [Q] close (hold, Shift = fast)`;
      if (tg.id === 'front' && G.f.locked && !G.f.unlocked) { /* locked */ }
      else if (dirn) moveDoor(d, dirn, fast ? .7 : .18, dt);
      pr = `${tg.id === 'front' && G.f.locked && !G.f.unlocked ? 'Locked: turn the deadbolt first' : pr}  (${DNAME[tg.id]})`;
    } else {
      pr = tg.prompt();
      if (tg.hold) { if (keys.KeyE) tg.use(dt); else G.f.bolt = Math.max(0, (G.f.bolt || 0) - dt); }
      else if (hit.KeyE) tg.use();
    }
  }
  if (G.progT > 0) { G.progT -= dt; $('#prog').hidden = false; $('#prog i').style.width = (clamp(G.progF, 0, 1) * 100) + '%'; $('#prog span').textContent = G.progL; } else $('#prog').hidden = true;
  $('#prompt').textContent = pr; hit.KeyE = 0; hit.KeyQ = 0;
  // scenario systems
  if (sc.id === 'delivery') delivery(dt); if (sc.id === 'friend') friend(dt);
  if (G.phase !== 'play') return;
  if (G.f.bag && !inRoom('Your Bedroom')) { addAlert((G.f.hoodie ? .12 : .4) * dt); if (!G.smellT) { G.smellT = 1; toast('The smell of burgers is drifting upstairs...', 'warn'); } }
  // objectives
  const st = sc.steps[G.step]; if (st && st.ok()) { G.step++; if (G.step < sc.steps.length) toast('✔ Objective complete', 'ok'); }
  if (G.step >= sc.steps.length) return win();
  // meter easing
  G.meter = Math.max(22, G.meter - 40 * dt);
}
function moveDoor(d, dirn, rate, dt) {
  const v0 = d.v; d.v = clamp(d.v + dirn * rate * dt, 0, 1); d.apply(); const dv = Math.abs(d.v - v0); if (!dv) return;
  d.acc += dv; const fast = rate > .4;
  if (d.acc >= .08) { d.acc = 0; const inSq = d.sq && d.v >= d.sq[0] && d.v <= d.sq[1], db = d.base + (fast ? 14 : 0) + (inSq ? 10 : 0) + rnd(-2, 3); (inSq || fast ? Snd.hinge : Snd.click)(db); noise(db, inSq ? `${DNAME[d.id]} squeaks` : `${DNAME[d.id]} moving`, { x: DP[d.id][0], z: DP[d.id][1], y: P.y }); }
  if (v0 > 0 && d.v === 0 && dirn < 0) { const db = fast ? 46 : 22; Snd.click(db); noise(db, `${DNAME[d.id]} latch`, { x: DP[d.id][0], z: DP[d.id][1], y: P.y }); }
}
function delivery(dt) {
  const sc = G.sc, eta = sc.eta0, drv = World.driver;
  const z = 11.6 + Math.max(0, (G.arr - sc.t0 - G.t - 0)) * 1.3; // walks up the path; arrives at G.arr
  drv.position.set(2, 0, Math.min(z, 24)); drv.rotation.y = Math.PI; G.driverHere = z <= 11.7; if (G.f.bag) drv.visible = false;
  if (!G.f.bag && sc.t0 + G.t >= eta) { Snd.bell(); noise(95, 'DOORBELL', { x: 2, z: 10.5, y: 0 }); if (G.phase === 'play') bust(`DING-DONG! The driver rang the bell at ${fmtT(G.clock)}.`); return; }
  const px = P.x, pz = P.z, inZone = px > .4 && px < 4 && pz > 10.2 && pz < 13.5 && P.y < 1;
  if (inZone && P.speed > 1.2 && !G.f.lit) { G.f.lit = G.t; World.lights.porch.intensity = 1.8; addAlert(14); toast('Motion sensor! The porch light floods on.', 'warn'); }
  if (G.f.lit && G.t - G.f.lit > 9) { World.lights.porch.intensity = 0; G.f.lit = 0; }
}
function friend(dt) {
  const s = G.sam, sm = World.sam; if (!s) return;
  // Biscuit's tail thump
  if (G.t - G.thumpAt > .9) { G.thumpAt = G.t; G.thumpUntil = G.t + .18; Snd.thump(42); noise(38, 'Dog tail thump', { x: 14.5, z: 2.7, y: 0 }); World.biscuit.tail.rotation.y = .6; } else World.biscuit.tail.rotation.y *= .85;
  // step 3 -> morning
  if (G.step === 4 && !G.f.jumped) { G.f.jumped = 1; G.skip = tm(5, 20) - G.sc.t0 - G.t; toast('5:20 AM: Sam has to get home before Mom wakes!', 'ok'); }
  // follow trail
  const last = s.trail[s.trail.length - 1]; if (!last || Math.hypot(P.x - last.x, P.z - last.z) > .15) s.trail.push({ x: P.x, z: P.z }); if (s.trail.length > 400) s.trail.shift();
  let tx = P.x, tz = P.z;
  if (s.mode === 'follow') { let acc = 0; for (let i = s.trail.length - 1; i > 0; i--) { acc += Math.hypot(s.trail[i].x - s.trail[i - 1].x, s.trail[i].z - s.trail[i - 1].z); if (acc >= 1.5) { tx = s.trail[i - 1].x; tz = s.trail[i - 1].z; break; } } }
  const out = G.step >= 4 && near(12, 3.5, 3.2) && D.patio.v >= D.patio.pass; if (out && !G.f.out && Math.hypot(s.x - 12, s.z - 3.5) < 1.8) { s.mode = 'leave'; }
  if (s.mode === 'leave') { tx = 15.5; tz = 3.8; if (Math.hypot(s.x - tx, s.z - tz) < .5) { G.f.out = 1; sm.visible = false; s.mode = 'gone'; toast('Sam waves goodbye and slips away.', 'ok'); } }
  let sp = 0; const d = Math.hypot(tx - s.x, tz - s.z);
  if (s.mode !== 'wait' && s.mode !== 'gone' && !keys.KeyV && d > .25) { sp = clamp(P.speed * 1.05 + .15, .6, 3.6); if (s.mode === 'leave') sp = 1.4; if (d < .6) sp *= d / .6; const k = Math.min(sp * dt, d); s.x += (tx - s.x) / d * k; s.z += (tz - s.z) / d * k; sm.rotation.y = Math.atan2(-(tx - s.x), -(tz - s.z)) + Math.PI; collide(s, .25); }
  s.y += (World.floorY(s.x, s.z, s.y) - s.y) * Math.min(1, dt * 12); sm.position.set(s.x, s.y, s.z);
  if (sp > .3) walk(s, sp, dt, true);
  G.held.L = G.held.L; G.samNear = Math.hypot(P.x - s.x, P.z - s.z);
  if (G.samNear > 4 && s.mode === 'follow' && G.t - (G.f.lagT || 0) > 6) { G.f.lagT = G.t; toast('Sam is falling behind: wait for him!', 'warn'); }
}

// ---------- HUD ----------
const stateLabel = (a) => (a >= 100 ? ['BUSTED', 'bad'] : a >= 81 ? ['CRITICAL (Waking Up)', 'bad'] : a >= 61 ? ['SEMI-AWAKE', 'bad'] : a >= 41 ? ['RESTLESS', 'warn'] : a >= 21 ? ['LIGHT SLEEP', 'warn'] : ['STABLE (Deep Sleep)', 'ok']);
let hudT = 0;
function drawHud(dt) {
  hudT -= dt; if (hudT > 0 || G.phase !== 'play') return; hudT = .1;
  const sc = G.sc, r = World.roomAt(P.x, P.z, P.y), sf = World.surfaceAt(P.x, P.z, P.y), [lab, cls] = stateLabel(G.alert), mc = G.meter > 55 ? 'bad' : G.meter > 30 ? 'warn' : 'ok';
  const risk = sf.creak ? (sf.creak > 1 ? 'High creak risk underfoot!' : 'Creak risk underfoot') : sf.base < 25 ? 'Safe, soft surface' : 'Normal footstep noise', tg = G.target;
  const look = `${P.crouch ? 'Crouched, low view.' : 'Standing view.'} ${G.flash ? 'The phone flashlight cuts a pale cone ahead.' : 'Only the dim blue night-light.'}${tg ? ' In reach: ' + (tg.name || DNAME[tg.id]) + '.' : ''}`;
  const eta = sc.eta0 && !G.f.bag ? `<div class="r ${sc.eta0 - sc.t0 - G.t < 40 ? 'bad' : 'warn'}">🚗 DRIVER ETA ${fmtT(sc.eta0)} · T-${Math.max(0, Math.ceil(sc.eta0 - sc.t0 - G.t))}s</div>` : '';
  $('#hud').innerHTML = `<div class="r">📹 FPV VIEWPORT: ${esc(look)}</div><div class="r">🕒 TIME: ${fmtT(G.clock)} &nbsp;|&nbsp; 📍 POSITION: ${esc(r.name)} (${P.crouch ? 'Crouched' : 'Standing'})</div>${eta}
    <div class="r">🔊 DECIBEL METER <span class="${mc}">[${bar(Math.round((G.meter - 10) / 90 * 16), 16)}]</span> ${Math.round(G.meter)} dB <span class="lbl">(${esc(G.meterLabel || 'Ambient')}${G.meter > 30 ? ' · reaches Mom ' + Math.max(0, Math.round(G.reach)) + ' dB' : ''})</span></div>
    <div class="r">🚨 MOM DETECTABILITY <span class="${cls}">[${bar(Math.round(G.alert / 100 * 15), 15)}]</span> ${Math.round(G.alert)}% <span class="${cls}">(${lab})</span></div>
    <div class="r">🎒 HANDS / HELD: [Left: ${esc(G.held.L)}${G.flash ? ' · Flashlight ' + Math.round(G.battery) + '%' : ''} | Right: ${esc(G.held.R)}]</div>
    <div class="r">👣 SURFACE NOISE: ${esc(sf.name)} <span class="${sf.creak ? 'bad' : 'ok'}">(${risk})</span></div>`;
  $('#obj').innerHTML = `<b>${G.step + 1}/${sc.steps.length}</b> ${esc((sc.steps[Math.min(G.step, sc.steps.length - 1)] || {}).obj || '')}`;
  if (toastT > 0) { toastT -= .1; if (toastT <= 0) $('#toast').innerHTML = ''; }
  $('#fx').style.setProperty('--al', clamp((G.alert - 20) / 100, 0, .7));
}

// ---------- render loop ----------
let last = performance.now(), idle = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; update(dt);
  if (G.phase === 'menu') { idle += dt; P.yaw = .6 + Math.sin(idle * .15) * .5; }
  const eyeT = P.crouch ? 1.1 : 1.62; P.eye += (eyeT - P.eye) * Math.min(1, dt * 8); P.bob += P.speed * dt * 5.5;
  cam.position.set(P.x, P.y + P.eye + Math.sin(P.bob) * .014 * Math.min(P.speed, 2), P.z + 0); cam.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
  const busy = G.busy ? 1 : 0; hands.position.y = Math.sin(P.bob * .5) * .008 + (busy ? .06 : 0); hands.position.x = Math.cos(P.bob * .5) * .006;
  phoneM.visible = true; cupM.visible = /Noodles|cup|Cup/.test(G.held?.R || '') && !/Empty$/.test(G.held?.R || ''); bagM.visible = /Bag/.test(G.held?.R || '');
  drawHud(dt);
  qmat.uniforms.time.value = now / 1000; qmat.uniforms.al.value = G.phase === 'play' ? clamp((G.alert - 25) / 100, 0, .6) : 0;
  if (rt) { R.setRenderTarget(rt); R.render(World.scene, cam); R.setRenderTarget(null); R.render(quad, qcam); } else R.render(World.scene, cam);
  requestAnimationFrame(frame);
}
window.__dwm = { get G() { return G; }, P, D, MISSIONS, start, noise, win, keys, hit };
toMenu(); requestAnimationFrame(frame);
})();
