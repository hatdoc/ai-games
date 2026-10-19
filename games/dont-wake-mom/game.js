// Midnight Stealth: Don't Wake Mom! First-person engine: movement, noise model, Mom's detectability, interactions and the five missions.
(() => {
const $ = (s) => document.querySelector(s), T = THREE, D = World.doors;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[Math.random() * a.length | 0];
const tm = (h, m, s = 0) => h * 3600 + m * 60 + s;
const fmtT = (s) => { s = (s % 86400 + 86400) % 86400; let h = s / 3600 | 0; const m = s / 60 % 60 | 0, ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s % 60 | 0).padStart(2, '0')} ${ap}`; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const bar = (v, n) => '█'.repeat(clamp(v, 0, n)) + '░'.repeat(n - clamp(v, 0, n));
const gain = (e) => (e <= 26 ? 0 : e <= 30 ? 1.2 : e <= 55 ? 7.5 + (e - 30) * 1 : 32 + (e - 55) * 1.75);

// ---------- renderer: shadows, HDR bloom, filmic tone mapping, bodycam lens ----------
const lc = (h) => new T.Color(h).convertSRGBToLinear(), emis = (m, hex, k = 1) => m.color.copy(lc(hex)).multiplyScalar(k);
const cv = $('#c'), R = new T.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance' }), LOW = World.LOW;
R.setPixelRatio(LOW ? 1 : Math.min(devicePixelRatio || 1, 1.5)); R.shadowMap.enabled = !LOW; R.shadowMap.type = T.PCFSoftShadowMap;
const cam = new T.PerspectiveCamera(78, 1, .05, 300); World.scene.add(cam);
const hands = new T.Group(); cam.add(hands);
const sleeveM = new T.MeshStandardMaterial({ color: lc(0x2c313f), roughness: .95, emissive: lc(0x07080e) }), skinM = new T.MeshStandardMaterial({ color: lc(0xe0b090), roughness: .55, emissive: lc(0x2a1a12) });
const mkArm = (side) => {
  const g = new T.Group(), fa = new T.Mesh(new T.CylinderGeometry(.032, .042, .36, 16), sleeveM); fa.rotation.x = Math.PI / 2; fa.position.set(0, 0, -.18); g.add(fa);
  const cuff = new T.Mesh(new T.CylinderGeometry(.044, .044, .035, 16), new T.MeshStandardMaterial({ color: lc(0x20242f), roughness: 1 })); cuff.rotation.x = Math.PI / 2; cuff.position.set(0, 0, -.37); g.add(cuff);
  const palm = new T.Mesh(new T.BoxGeometry(.075, .03, .085), skinM); palm.position.set(0, 0, -.42); g.add(palm);
  for (let i = 0; i < 4; i++) { const f = new T.Mesh(new T.CylinderGeometry(.011, .01, .075, 8), skinM); f.rotation.x = Math.PI / 2 - .25; f.position.set(-.028 + i * .019, -.005, -.49 + (i === 1 || i === 2 ? -.008 : 0)); g.add(f); }
  const th = new T.Mesh(new T.BoxGeometry(.022, .022, .055), skinM); th.position.set(side * -.05, .005, -.43); th.rotation.y = side * .6; g.add(th);
  g.position.set(side * .17, -.3, -.28); g.rotation.set(.32, -side * .32, 0); hands.add(g); return g;
};
const armL = mkArm(-1), armR = mkArm(1);
const phoneM = new T.Mesh(new T.BoxGeometry(.07, .01, .14), new T.MeshStandardMaterial({ color: lc(0x15171c), roughness: .3, metalness: .6 })); const scr = new T.Mesh(new T.PlaneGeometry(.062, .125), new T.MeshBasicMaterial({ color: lc(0x1a2a4a) }));
scr.rotation.x = -Math.PI / 2; scr.position.y = .0055; phoneM.add(scr); phoneM.position.set(0, .04, -.45); phoneM.rotation.x = -.55; armL.add(phoneM);
const cupM = new T.Mesh(new T.CylinderGeometry(.045, .035, .11, 16), new T.MeshStandardMaterial({ color: lc(0xd04a3a), roughness: .5, emissive: lc(0x301008) })); cupM.position.set(0, .06, -.45); armR.add(cupM);
const bagM = new T.Mesh(new T.BoxGeometry(.12, .16, .08), new T.MeshStandardMaterial({ color: lc(0xe8d9b8), roughness: .9, emissive: lc(0x302810) })); bagM.position.set(0, .07, -.45); armR.add(bagM);
const stM = new T.MeshStandardMaterial({ color: lc(0xc6ccd6), roughness: .4, metalness: .2, emissive: lc(0x14161a) }), foilM = new T.MeshStandardMaterial({ color: lc(0xd7dbe2), roughness: .3, metalness: .3, emissive: lc(0x222428) });
const cupL = new T.Mesh(cupM.geometry, cupM.material); cupL.position.set(0, .06, -.43); cupL.visible = false; armL.add(cupL); cupM.visible = false;
const steamC = []; for (let i = 0; i < 3; i++) { const s = new T.Mesh(new T.SphereGeometry(.02, 8, 6), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .3, depthWrite: false })); cupL.add(s); steamC.push(s); }
const grp = (parent, pos, rot) => { const g = new T.Group(); g.position.set(...pos); if (rot) g.rotation.set(...rot); g.visible = false; parent.add(g); return g; };
const kettleP = grp(armR, [0, .07, -.45]); kettleP.add(new T.Mesh(new T.CylinderGeometry(.045, .055, .12, 14), stM)); { const h = new T.Mesh(new T.BoxGeometry(.012, .09, .05), new T.MeshStandardMaterial({ color: lc(0x15171c) })); h.position.set(.06, .01, 0); kettleP.add(h); const sp = new T.Mesh(new T.CylinderGeometry(.008, .014, .05, 6), stM); sp.rotation.z = Math.PI / 2.6; sp.position.set(-.06, .05, 0); kettleP.add(sp); }
const potP = grp(armR, [0, .05, -.45]); potP.add(new T.Mesh(new T.CylinderGeometry(.075, .07, .075, 16), stM)); { const h = new T.Mesh(new T.BoxGeometry(.1, .012, .02), new T.MeshStandardMaterial({ color: lc(0x15171c) })); h.position.set(.11, .02, 0); potP.add(h); }
const forkP = grp(armR, [0, .045, -.5], [-.45, 0, 0]); forkP.add(new T.Mesh(new T.BoxGeometry(.008, .006, .11), stM)); for (let i = -1; i <= 1; i++) { const t = new T.Mesh(new T.BoxGeometry(.003, .003, .03), stM); t.position.set(i * .006, 0, -.07); forkP.add(t); }
const packetP = grp(armR, [0, .05, -.44]); packetP.add(new T.Mesh(new T.BoxGeometry(.09, .005, .09), foilM));
const waterM = new T.Mesh(new T.CylinderGeometry(.006, .006, .13, 6), new T.MeshBasicMaterial({ color: lc(0x9fd0ff).multiplyScalar(1.4), transparent: true, opacity: .6 })); waterM.position.set(0, -.1, -.5); waterM.visible = false; hands.add(waterM);
const beam = new T.SpotLight(lc(0xe6eeff), 0, 18, .5, .55, 1.4); cam.add(beam, beam.target); beam.target.position.set(0, 0, -5);
if (!LOW) { beam.castShadow = true; beam.shadow.mapSize.set(1024, 1024); beam.shadow.bias = -.0004; beam.shadow.camera.near = .1; beam.shadow.camera.far = 20; }

let rt = null, bA = null, bB = null;
const quad = new T.Scene(), qcam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), qmesh = new T.Mesh(new T.PlaneGeometry(2, 2)); quad.add(qmesh);
const VS = 'varying vec2 v; void main(){ v=uv; gl_Position=vec4(position,1.); }';
const pass = (fs, u) => new T.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: fs, depthTest: false, depthWrite: false });
const brightM = pass('uniform sampler2D t; varying vec2 v; void main(){ vec3 c=texture2D(t,v).rgb; float l=max(c.r,max(c.g,c.b)); gl_FragColor=vec4(c*smoothstep(.3,1.0,l),1.); }', { t: { value: null } });
const blurM = pass('uniform sampler2D t; uniform vec2 d; varying vec2 v; void main(){ vec3 s=texture2D(t,v).rgb*.227; s+=(texture2D(t,v+d*1.38).rgb+texture2D(t,v-d*1.38).rgb)*.316; s+=(texture2D(t,v+d*3.23).rgb+texture2D(t,v-d*3.23).rgb)*.07; gl_FragColor=vec4(s,1.); }', { t: { value: null }, d: { value: new T.Vector2() } });
const finalM = pass(`uniform sampler2D t, b; uniform float time, al, ex; uniform vec2 res; varying vec2 v;
  float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
  vec3 aces(vec3 x){ x*=ex; return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
  void main(){ vec2 c=v-.5; float asp=res.x/res.y; c.x*=asp; c*=.9; float r2=dot(c,c); vec2 u=c*(1.+.13*r2); u.x/=asp; u+=.5;
    if(u.x<0.||u.x>1.||u.y<0.||u.y>1.){ gl_FragColor=vec4(0.,0.,0.,1.); return; }
    vec2 o=(u-.5)*.003; vec3 col=vec3(texture2D(t,u+o).r,texture2D(t,u).g,texture2D(t,u-o).b); col+=texture2D(b,u).rgb*.7;
    col=pow(aces(col),vec3(.4545)); col*=1.-smoothstep(.18,.8,r2)*.55; col+=vec3(1.,.55,.15)*al*smoothstep(.12,.6,r2)*.4; col+=(h(v*res+time)-.5)*.035;
    gl_FragColor=vec4(col,1.); }`, { t: { value: null }, b: { value: null }, time: { value: 0 }, al: { value: 0 }, ex: { value: .95 }, res: { value: new T.Vector2(1, 1) } });
function resize() {
  const w = innerWidth, h = innerHeight, pr = R.getPixelRatio(); R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); finalM.uniforms.res.value.set(w, h);
  for (const r of [rt, bA, bB]) r && r.dispose(); rt = bA = bB = null;
  try {
    const o = { minFilter: T.LinearFilter, magFilter: T.LinearFilter, type: T.HalfFloatType, format: T.RGBAFormat };
    try { rt = LOW ? new T.WebGLRenderTarget(w * pr, h * pr, o) : new T.WebGLMultisampleRenderTarget(w * pr, h * pr, o); } catch { rt = new T.WebGLRenderTarget(w * pr, h * pr, o); }
    bA = new T.WebGLRenderTarget(w * pr / 4 | 0, h * pr / 4 | 0, o); bB = new T.WebGLRenderTarget(w * pr / 4 | 0, h * pr / 4 | 0, o);
  } catch { rt = bA = bB = null; }
}
function renderFrame(now) {
  if (!rt) { R.render(World.scene, cam); return; }
  R.setRenderTarget(rt); R.render(World.scene, cam);
  qmesh.material = brightM; brightM.uniforms.t.value = rt.texture; R.setRenderTarget(bA); R.render(quad, qcam);
  for (let i = 0; i < 2; i++) {
    qmesh.material = blurM; blurM.uniforms.t.value = bA.texture; blurM.uniforms.d.value.set(1 / bA.width, 0); R.setRenderTarget(bB); R.render(quad, qcam);
    blurM.uniforms.t.value = bB.texture; blurM.uniforms.d.value.set(0, 1 / bA.height); R.setRenderTarget(bA); R.render(quad, qcam);
  }
  qmesh.material = finalM; finalM.uniforms.t.value = rt.texture; finalM.uniforms.b.value = bA.texture; finalM.uniforms.time.value = now / 1000;
  finalM.uniforms.al.value = G.phase === 'play' ? clamp((G.alert - 25) / 100, 0, .6) : 0; R.setRenderTarget(null); R.render(quad, qcam);
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
  if (e.code === 'Escape' && G.mg) endMG(false);
  else if (G.phase === 'play' && !G.mg && !G.busy && /^Digit[1-5]$/.test(e.code)) useSlot(+e.code.slice(5) - 1);
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
  if (sf.creak && Math.random() < (mode === 0 ? .35 : mode === 1 ? .85 : 1)) { db = sf.base + (sf.creak > 1 ? 16 : 10) + (mode === 2 ? 8 : 0) + rnd(-2, 3); label = 'Floor creak!'; Snd.creak(db); toast(`Creak! ${Math.round(db)} dB`, 'warn'); }
  else if (!isSam || Math.random() < .6) Snd.step(db, sf.name.startsWith('Tile') ? 'tile' : sf.name.startsWith('Concrete') ? 'conc' : sf.base < 25 ? 'carpet' : 'wood');
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

// ---------- actions: every physical thing you do has a noise level and a visible hand animation ----------
const roll = (o) => { const sp = o.spike; return sp && Math.random() < sp[0] ? rnd(sp[1], sp[2]) : rnd(o.db[0], o.db[1]); };
function risk(o) {
  let pN = 0, pB = 0; const K = 21, segs = [[o.db[0], o.db[1], 1 - (o.spike ? o.spike[0] : 0)]]; if (o.spike) segs.push([o.spike[1], o.spike[2], o.spike[0]]);
  for (const [lo, hi, w] of segs) for (let k = 0; k < K; k++) { const d = lo + (hi - lo) * k / (K - 1), e = reach(d, P); if (e > 30) pN += w / K; if (e >= 81 || G.alert + gain(e) * (o.bursts || 1) + (o.ex || 0) >= 100) pB += w / K; }
  const all = segs.map((s) => [s[0], s[1]]).flat();
  return { lo: Math.round(Math.min(...all)), hi: Math.round(Math.max(...all)), pN: Math.round(pN * 100), pB: Math.round(pB * 100) };
}
const AKEYS = ['KeyE', 'KeyR', 'KeyT'], AKEY = ['E', 'R', 'T'];
const actsOf = (it) => (it.acts || []).filter((a) => !a.when || a.when());
function doAct(a) {
  if (G.busy || G.phase !== 'play') return;
  const dur = a.dur || 1.5, n = a.bursts || 1; G.busy = { a, t: dur, total: dur, label: a.t, anim: a.anim || 'reach' }; if (a.fx) G.fx = a.fx;
  for (let k = 0; k < n; k++) G.sched.push({ at: G.t + dur * (n === 1 ? .35 : (k + .5) / n * .9), f: () => { const d = roll(a); Snd[a.snd || 'rustle'](d); noise(d, a.t, P); } });
  if (a.ex) G.sched.push({ at: G.t + dur * .5, f: () => addAlert(a.ex) });
}
function closeChoice() {}

// ---------- item box (hotbar): things you pick up go into numbered slots ----------
const ITEMS = { noodles: '🍜', pot: '🥘', bag: '🍔', phone: '📱' };
const possess = (id) => { const F = G.f || {}; return id === 'noodles' ? !!F.noodles && !F.eaten : id === 'pot' ? !!F.pot : id === 'bag' ? !!F.bag : id === 'phone' ? !!F.phone : false; };
const give = (id) => { if (!G.invOrder.includes(id)) G.invOrder.push(id); };
const invList = () => (G.invOrder || []).filter(possess);
function itemName(id) {
  const F = G.f;
  if (id === 'noodles') return !F.opened ? 'Instant noodles (lid on)' : F.ready ? 'Instant noodles (ready!)' : F.cupWater === 2 ? 'Instant noodles (steeping)' : F.cupWater === 1 ? 'Instant noodles (cold water)' : 'Instant noodles (no lid)';
  return id === 'pot' ? (F.potWater ? 'Small pot (water)' : 'Small pot (empty)') : id === 'bag' ? 'Burger bag' : 'Your phone';
}
function held() {
  const gh = G.held || { L: '', R: '' }; let L = gh.L, R = gh.R; if (G.sc && G.sc.id === 'ramen') { L = 'Phone (Muted)'; R = 'Empty'; }
  const s = G.sel; if (s && possess(s)) { if (s === 'pot' || s === 'bag') R = itemName(s); else L = itemName(s); }
  return { L, R };
}
function useSlot(i) {
  const id = invList()[i]; if (!id) return;
  if (G.sel === id && !(id === 'noodles' && !G.f.opened)) { G.sel = null; return; }
  G.sel = id;
  if (id === 'noodles' && !G.f.opened) startMG({ type: 'tension', title: 'Peel the lid', art: 'lid', speed: 1, sticky: [.3, .62], snd: 'crinkle', fail: 'The foil crackles loudly',
    hint: 'HOLD E to pull the lid slowly. Keep the needle inside the green zone. Too gentle and it will not budge, too hard and the foil crackles (noise!).',
    onDone() { G.f.opened = 1; G.sel = 'noodles'; toast('Lid off! Now take it to the kettle, stove or microwave.', 'ok'); } });
}

// ---------- mini games: tension (peel / unplug), timing (stove / eating / clutch shots), pour ----------
const mgEl = $('#mg'), mgC = $('#mgC'), mgX = mgC.getContext('2d'); let mgHold = false;
mgC.addEventListener('pointerdown', (e) => { mgHold = true; if (!keys.KeyE) hit.KeyE = 1; try { mgC.setPointerCapture(e.pointerId); } catch {} });
for (const ev of ['pointerup', 'pointercancel']) mgC.addEventListener(ev, () => { mgHold = false; });
const mgHeld = () => !!(keys.KeyE || keys.Space || mgHold);
function startMG(cfg) {
  G.mg = { t: 0, holdT: 0, loud: 0, p: 0, ten: 0, pos: 0, dir: 1, n: 0, level: 0, flow: 0, target: .78, zc: rnd(.3, .7), ...cfg };
  $('#mgT').textContent = cfg.title; $('#mgH').textContent = cfg.hint || ''; mgEl.hidden = false; keys.KeyE = 0; hit.KeyE = 0; $('#prompt').innerHTML = '';
}
function endMG(ok) { const m = G.mg; if (!m) return; G.mg = null; mgEl.hidden = true; mgHold = false; if (ok && m.onDone) m.onDone(); }
const MGS = {
  tension(m, dt) {
    const held = mgHeld(), stir = G.stir > G.t; m.t += dt; m.holdT = held ? m.holdT + dt : 0;
    m.ten += (held ? (.9 + Math.min(1.1, m.holdT * .5)) * .55 * (m.speed || 1) : -1.3) * dt + (Math.sin(m.t * 9.3) + Math.sin(m.t * 5.1 + 1)) * (stir ? .03 : .012) * dt * 18;
    m.ten = clamp(m.ten, 0, 1);
    const stick = (m.sticky || []).some((s) => m.p > s && m.p < s + .07);
    m.zc = stick ? .22 : .5 + Math.sin(m.t * .9 + m.p * 5) * .16; m.w = Math.max(.1, (stick ? .16 : .26) - m.p * .1 - (stir ? .05 : 0));
    const inZone = Math.abs(m.ten - m.zc) < m.w / 2, over = m.ten > m.zc + m.w / 2; m.state = inZone ? 'ok' : over ? 'over' : 'under';
    if (inZone) { m.p += dt * .15; m.quietT = (m.quietT || 0) + dt; if (m.quietT > .5) { m.quietT = 0; (m.snd === 'chime' ? Snd.click : Snd.crinkle)(22); } }
    else if (over) {
      m.tearT = (m.tearT || 0) + dt; m.p = Math.max(0, m.p - dt * .03);
      if (m.tearT > .28) { m.tearT = 0; const d = rnd(40, 56) + m.loud * 12; Snd[m.snd || 'crinkle'](d); noise(d, m.fail || 'Crackles loudly', P); m.loud = Math.min(1, m.loud + .12); }
    }
    if (G.phase !== 'play') return;
    if (m.ten > .97 && !(m.ripCool > 0)) { const d = rnd(58, 70) + m.loud * 6; Snd[m.snd || 'crinkle'](d); Snd.bump(d - 8); noise(d, 'RIPPED! ' + (m.fail || ''), P); m.ten = .5; m.p = Math.max(0, m.p - .06); m.loud = Math.min(1, m.loud + .3); m.ripCool = .8; m.flash = .3; }
    m.ripCool = (m.ripCool || 0) - dt; m.flash = Math.max(0, (m.flash || 0) - dt); m.loud = Math.max(0, m.loud - dt * .03);
    if (G.phase === 'play' && m.p >= 1) endMG(true);
  },
  timing(m, dt) {
    m.t += dt; m.pos += m.dir * (m.speed || 1) * dt; if (m.pos > 1) { m.pos = 1; m.dir = -1; } if (m.pos < 0) { m.pos = 0; m.dir = 1; } m.flash = Math.max(0, (m.flash || 0) - dt);
    if (!hit.KeyE) return; hit.KeyE = 0;
    if (Math.abs(m.pos - m.zc) < m.zoneW / 2) {
      m.n++; m.flash = .25; m.flashOk = true; const d = rnd(...m.goodNoise); Snd[m.snd || 'click'](d); noise(d, m.goodLabel || 'Quiet', P); m.zc = rnd(.2, .8); m.speed *= 1.06;
      if (G.phase === 'play' && m.n >= m.hits) endMG(true);
    } else { m.miss = (m.miss || 0) + 1; m.flash = .3; m.flashOk = false; const d = rnd(...m.missNoise); Snd[m.missSnd || m.snd || 'bump'](d); noise(d, m.missLabel || 'Oops', P); }
  },
  pour(m, dt) {
    const held = mgHeld(); m.t += dt; m.flow = held ? Math.min(1, m.flow + dt * 1.2) : Math.max(0, m.flow - dt * 2.4); m.level += m.flow * dt * .15; m.splT = (m.splT || 0) + dt; m.flash = Math.max(0, (m.flash || 0) - dt);
    if (m.flow > .05 && m.splT > .45) { m.splT = 0; const d = 24 + m.flow * 16 + rnd(-2, 2); Snd.pour(d); noise(d, 'Water pouring', P); }
    if (G.phase !== 'play') return;
    if (m.level > m.target + .1) { const d = rnd(56, 66); Snd.bump(d); Snd.pour(d); noise(d, 'Hot water SPILLS!', P); m.level = m.target - .3; m.flow = 0; m.flash = .4; m.spills = (m.spills || 0) + 1; }
    if (G.phase !== 'play') return;
    m.okT = Math.abs(m.level - m.target) < .05 && m.flow < .08 ? (m.okT || 0) + dt : 0; if (m.okT > .7) endMG(true);
  },
};
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function gauge(c, x, y, w, h, m) { // vertical tension gauge
  c.fillStyle = 'rgba(255,255,255,.08)'; rr(c, x, y, w, h, 8); c.fill();
  const zt = y + h - (m.zc + m.w / 2) * h, zh = m.w * h; c.fillStyle = 'rgba(63,214,138,.55)'; c.fillRect(x, zt, w, zh); c.strokeStyle = '#7ef0b0'; c.strokeRect(x, zt, w, zh);
  c.fillStyle = m.state === 'over' ? '#ff5a4a' : m.state === 'ok' ? '#7ef0b0' : '#ffd36b'; const ny = y + h - m.ten * h; c.fillRect(x - 8, ny - 3, w + 16, 6);
  c.fillStyle = '#98a3cc'; c.font = '700 11px system-ui'; c.textAlign = 'center'; c.fillText('TENSION', x + w / 2, y - 8);
}
function noiseBar(c, x, y, w, v, label) { c.fillStyle = 'rgba(255,255,255,.08)'; rr(c, x, y, w, 12, 6); c.fill(); c.fillStyle = v > .6 ? '#ff5a4a' : v > .3 ? '#ffc94a' : '#3fd68a'; rr(c, x, y, Math.max(8, w * v), 12, 6); c.fill(); c.fillStyle = '#98a3cc'; c.font = '700 11px system-ui'; c.textAlign = 'left'; c.fillText(label, x, y - 6); }
function drawMG(m) {
  const c = mgX, W = 560, H = 300; c.clearRect(0, 0, W, H);
  if (m.type === 'tension') {
    const cx = 165, cy = 140, R = 98, a0 = -Math.PI / 2, a1 = a0 + m.p * Math.PI * 2;
    if (m.art === 'cable') {
      c.fillStyle = '#1c2338'; rr(c, 60, 70, 150, 150, 18); c.fill(); c.fillStyle = '#2a3558'; rr(c, 70, 80, 130, 120, 12); c.fill(); c.fillStyle = '#8fb0ff'; c.font = '700 13px system-ui'; c.textAlign = 'center'; c.fillText('PHONE', 135, 145);
      const px = 210 + m.p * 90; c.strokeStyle = '#d8dde8'; c.lineWidth = 6; c.beginPath(); c.moveTo(210, 150); c.bezierCurveTo(px - 30, 150 + Math.sin(m.t * 6) * 6, px - 10, 190, px, 150); c.stroke(); c.fillStyle = '#d8dde8'; rr(c, px, 138, 26, 24, 4); c.fill();
    } else {
      c.fillStyle = '#b8322c'; c.beginPath(); c.arc(cx, cy, R + 14, 0, 7); c.fill(); c.fillStyle = '#e8584a'; c.beginPath(); c.arc(cx, cy, R + 8, 0, 7); c.fill();
      c.fillStyle = '#f2d78d'; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill(); c.strokeStyle = 'rgba(180,120,40,.55)'; c.lineWidth = 3; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(cx + Math.cos(i * 2.1) * 40, cy + Math.sin(i * 2.1) * 40, 18 + (i % 3) * 8, 0, 4.5); c.stroke(); }
      const gr = c.createRadialGradient(cx - 30, cy - 30, 10, cx, cy, R); gr.addColorStop(0, '#f4f6fa'); gr.addColorStop(1, '#a9b2c2'); c.fillStyle = gr; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, a1, a0 + Math.PI * 2); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 2; c.stroke();
      const px = cx + Math.cos(a1) * R, py = cy + Math.sin(a1) * R; c.fillStyle = '#e6eaf2'; c.beginPath(); c.moveTo(cx, cy); c.lineTo(px, py); c.lineTo(px + Math.cos(a1 + 1.1) * 40, py + Math.sin(a1 + 1.1) * 40); c.closePath(); c.fill();
      c.fillStyle = '#cfd5e0'; rr(c, cx - 14, cy - R - 20, 28, 24, 6); c.fill();
    }
    gauge(c, 400, 36, 46, 220, m); noiseBar(c, 60, 270, 250, m.loud, 'NOISE'); if (m.flash > 0) { c.fillStyle = `rgba(255,70,60,${m.flash})`; c.fillRect(0, 0, W, H); }
    c.fillStyle = '#eef2ff'; c.font = '700 13px system-ui'; c.textAlign = 'center'; c.textAlign = 'left'; c.fillText(Math.round(m.p * 100) + '%', 330, 281);
  } else if (m.type === 'timing') {
    const x0 = 50, w = 460, y = 120;
    c.fillStyle = 'rgba(255,255,255,.08)'; rr(c, x0, y, w, 44, 10); c.fill();
    c.fillStyle = 'rgba(63,214,138,.55)'; c.fillRect(x0 + (m.zc - m.zoneW / 2) * w, y, m.zoneW * w, 44); c.strokeStyle = '#7ef0b0'; c.strokeRect(x0 + (m.zc - m.zoneW / 2) * w, y, m.zoneW * w, 44);
    c.fillStyle = m.flash > 0 ? (m.flashOk ? '#7ef0b0' : '#ff5a4a') : '#fff'; c.fillRect(x0 + m.pos * w - 3, y - 12, 6, 68);
    for (let i = 0; i < m.hits; i++) { c.fillStyle = i < m.n ? '#7ef0b0' : 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(W / 2 - (m.hits - 1) * 14 + i * 28, 70, 8, 0, 7); c.fill(); }
    c.fillStyle = '#98a3cc'; c.font = '700 12px system-ui'; c.textAlign = 'center'; c.fillText(`Misses: ${m.miss || 0}`, W / 2, 230);
  } else if (m.type === 'pour') {
    const lx = 150, top = 50, bot = 260, tw = 120, bw = 90; c.fillStyle = 'rgba(255,255,255,.07)'; c.beginPath(); c.moveTo(lx - tw / 2, top); c.lineTo(lx + tw / 2, top); c.lineTo(lx + bw / 2, bot); c.lineTo(lx - bw / 2, bot); c.closePath(); c.fill();
    const wy = bot - m.level * (bot - top), wl = (bot - wy) / (bot - top), hw = bw / 2 + (tw / 2 - bw / 2) * wl; c.fillStyle = 'rgba(120,190,255,.75)'; c.beginPath(); c.moveTo(lx - hw, wy); c.lineTo(lx + hw, wy); c.lineTo(lx + bw / 2, bot); c.lineTo(lx - bw / 2, bot); c.closePath(); c.fill();
    const ty = bot - m.target * (bot - top); c.strokeStyle = '#7ef0b0'; c.lineWidth = 2; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(lx - 80, ty); c.lineTo(lx + 80, ty); c.stroke(); c.setLineDash([]);
    c.fillStyle = 'rgba(63,214,138,.22)'; c.fillRect(lx - 70, ty - .05 * (bot - top), 140, .1 * (bot - top));
    if (m.flow > .03) { c.fillStyle = `rgba(160,210,255,${.4 + m.flow * .5})`; c.fillRect(lx - 2 - m.flow * 3, 8, 4 + m.flow * 6, wy - 8); }
    c.fillStyle = '#c6ccd6'; rr(c, lx - 30, 0, 60, 14, 6); c.fill();
    gauge(c, 400, 36, 46, 220, { zc: .3, w: .0, ten: m.flow, state: m.flow > .75 ? 'over' : 'ok' }); c.fillStyle = '#98a3cc'; c.font = '700 11px system-ui'; c.textAlign = 'center'; c.fillText('FLOW', 423, 28);
    if (m.flash > 0) { c.fillStyle = `rgba(255,70,60,${m.flash})`; c.fillRect(0, 0, W, H); }
  }
}


// ---------- interactions ----------
const DP = { yours: [2.5, 6], mom: [9.5, 6], front: [2.0, 10], patio: [12, 3.5], cab: [7.8, .62], drawer: [8.7, 1.62] };
const DNAME = { yours: 'your bedroom door', mom: "Mom's door", front: 'front door', patio: 'patio door', cab: 'kitchen cabinet', drawer: 'nightstand drawer' };
const IN = () => G.inter || [];
function findTarget() {
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw); let best = null, bs = 1e9;
  const test = (x, z, y, r, o) => { const dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz); if (d > r || Math.abs(y - P.y) > 2.2) return; const dot = (dx * fx + dz * fz) / Math.max(d, .01); if (dot < .35 && d > .6) return; const s = d - dot; if (s < bs) { bs = s; best = o; } };
  for (const id in DP) { const d = D[id]; test(DP[id][0], DP[id][1], (d.y || 0) >= 2.5 ? 3 : 0, id === 'cab' || id === 'drawer' ? 1.5 : 1.7, { kind: 'door', id, d }); }
  for (const it of IN()) { if (it.acts ? !actsOf(it).length : (it.when && !it.when())) continue; test(it.x, it.z, it.y || 0, it.r || 1.6, it); }
  return best;
}

// ---------- missions ----------
const A = (t, db, anim, dur, x = {}) => ({ t, db, anim, dur, ...x }); // one physical action: label, dB range, hand animation, seconds
const inRoom = (n) => World.roomAt(P.x, P.z, P.y).name === n;
const near = (x, z, r) => Math.hypot(P.x - x, P.z - z) < r;
const MISSIONS = [
  { id: 'ramen', emoji: '🍜', name: 'Midnight Ramen Ops', board: 'dont-wake-mom-ramen',
    obj: 'Sneak down, peel and cook instant noodles (kettle, stove or microwave) and get back to bed.', hz: 'Lid peeling · kettle rumble · gas flame · microwave beep · slurping',
    t0: tm(2, 14, 32), base: 12, mom: 'bed', momDoor: 'mom', start: { x: 2.7, z: 4.2, y: 3, yaw: Math.PI }, gear: ['Socks On', 'Phone (Muted)'],
    bust: ['The hallway light snaps on. "Is that INSTANT RAMEN?! At 2 AM?!" Mom folds her arms. Busted.', 'Mom: "I can smell it from here. Hand over the cup."'],
    steps: [
      { obj: 'Open your bedroom door: hold E (slow is quiet, Shift is fast)', ok: () => D.yours.v >= D.yours.pass },
      { obj: 'Sneak down to the kitchen (C = crouch for quiet heel-to-toe)', ok: () => inRoom('Kitchen') },
      { obj: 'Open the upper cabinet (hold E) and take a Cup Noodles. It goes into your item box', ok: () => G.f.noodles },
      { obj: 'Press 1 to take the noodles out and peel the lid slowly and carefully', ok: () => G.f.opened },
      { obj: 'Make hot water: fill the kettle and switch it on (switch it off if it gets too loud), light the stove, or microwave the cup', ok: () => G.f.cupWater === 2 },
      { obj: 'Wait for the noodles to soften...', ok: () => G.f.ready },
      { obj: 'Eat them at the island without slurping (or carry the cup upstairs)', ok: () => G.f.eaten || G.f.carry },
      { obj: 'Sneak back to bed and close your bedroom door (hold Q)', ok: () => inRoom('Your Bedroom') && D.yours.v < .07 },
    ],
    setup() {
      const F = G.f, K = World.K; G.kettle = { heat: 0, on: false, tick: 0 }; G.invOrder = []; G.sel = null;
      K.cups.forEach((c) => (c.visible = true)); K.pot.visible = true; for (const k of ['potStove', 'flame', 'led', 'steam', 'sinkWater', 'mwGlow']) K[k].visible = false;
      const hotReady = () => F.opened && F.noodles && F.cupWater !== 2;
      const doneHot = (src) => () => { F.cupWater = 2; G.steep = { t: 12 }; if (src === 'k') { F.kHot = 0; F.kWater = 0; } if (src === 'p') { F.potHot = 0; F.potWater = 0; F.burner = 0; G.heat = null; Snd.click(28); } toast('Hot water in! The noodles need a few seconds to soften.', 'ok'); };
      const pourMG = (src) => () => startMG({ type: 'pour', title: 'Pour the hot water', hint: 'HOLD E to tilt and pour, release to stop. Fill to the line, no spills, and keep the splashing quiet.', onDone: doneHot(src) });
      G.inter = [
        { x: 7.95, z: .8, r: 1.8, name: 'cabinet shelf', acts: [
          A('Take a Cup Noodles', [20, 30], 'open', 1.6, { snd: 'cab', when: () => D.cab.v > .25 && !F.noodles && !F.eaten, fn() { F.noodles = 1; give('noodles'); toast(`Cup Noodles stored in slot ${invList().indexOf('noodles') + 1}. Press ${invList().indexOf('noodles') + 1} to peel the lid.`, 'ok'); } }),
          A('Take the small pot', [30, 46], 'open', 1.6, { snd: 'clang', when: () => D.cab.v > .25 && !F.pot && !F.potPlaced && !F.potTaken, fn() { F.pot = 1; F.potTaken = 1; give('pot'); toast(`Small pot stored in slot ${invList().indexOf('pot') + 1}.`, 'ok'); } })] },
        { x: 10.7, z: .85, r: 1.8, name: 'kitchen sink', acts: [
          A('Fill the kettle', [36, 48], 'fill', 3.2, { prop: 'kettle', snd: 'pour', bursts: 3, fx: 'sink', when: () => !F.kWater, fn() { F.kWater = 1; } }),
          A('Fill the pot with water', [36, 48], 'fill', 3.2, { prop: 'pot', snd: 'pour', bursts: 3, fx: 'sink', when: () => F.pot && !F.potWater, fn() { F.potWater = 1; } }),
          A('Fill the cup with tap water', [34, 46], 'fillcup', 3, { snd: 'pour', bursts: 3, fx: 'sink', when: () => F.opened && F.noodles && !F.cupWater, fn() { F.cupWater = 1; } })] },
        { x: 10.3, z: .85, r: 1.6, name: 'electric kettle', acts: [
          A('Switch the kettle on', [28, 36], 'press', .8, { snd: 'click', when: () => F.kWater && !F.kHot && !G.kettle.on, fn() { G.kettle.on = true; toast('Heating... it gets louder as it nears boiling. Switch it off if it is too loud.'); } }),
          A('Switch the kettle off', [22, 28], 'press', .8, { snd: 'click', when: () => G.kettle.on, fn() { G.kettle.on = false; toast('Kettle off. The noise fades and the water cools slowly.'); } }),
          A('Pour the hot water into the cup', [26, 34], 'reach', .6, { snd: 'click', when: () => F.kHot && hotReady(), fn: pourMG('k') })] },
        { x: 8.25, z: .85, r: 1.6, name: 'stove', acts: [
          A('Put the pot on the stove', [32, 44], 'reach', 1.4, { snd: 'clang', when: () => F.pot && F.potWater && !F.potPlaced, fn() { F.potPlaced = 1; F.pot = 0; } }),
          A('Light the burner', [24, 30], 'twist', .6, { snd: 'click', when: () => F.potPlaced && !F.burner, fn: () => startMG({ type: 'timing', title: 'Light the burner', hint: 'Press E when the knob is in the green zone. Too early or late and the gas ignites with a WHUMP.', hits: 1, speed: 1.15, zoneW: .2, missNoise: [44, 58], missLabel: 'Gas ignites with a WHUMP', goodNoise: [24, 30], goodLabel: 'Burner clicks on', snd: 'click', onDone() { F.burner = 1; G.heat = { t: 9, tick: 0 }; toast('Blue flame. Wait for the water to boil...'); } }) }),
          A('Pour the boiling water into the cup', [26, 34], 'reach', .6, { snd: 'click', when: () => F.potHot && hotReady(), fn: pourMG('p') }),
          A('Turn the burner off', [22, 28], 'twist', 1.1, { snd: 'click', when: () => F.burner && !(F.potHot && hotReady()), fn() { F.burner = 0; G.heat = null; } })] },
        { x: 9.55, z: .85, r: 1.6, name: 'microwave', acts: [
          A('Microwave the cup (stop it at 0:01)', [24, 32], 'press', 1, { snd: 'click', when: () => F.cupWater === 1 && F.noodles && !G.mw, fn() { G.mw = { t: 8, hum: 0 }; K.mwGlow.visible = true; toast('Press E when the timer shows 0:01!'); } })] },
        { x: 9.5, z: 1.95, r: 1.8, name: 'kitchen island', acts: [
          A('Eat the noodles', [20, 24], 'reach', .6, { snd: 'click', when: () => F.ready && !F.eaten && !F.carry, fn: () => startMG({ type: 'timing', title: 'Eat quietly', hint: 'Press E when the marker is in the green zone to chew softly. Mistime it and you slurp!', hits: 4, speed: .95, zoneW: .26, missNoise: [52, 70], missLabel: 'SLURP!', goodNoise: [24, 36], goodLabel: 'Quiet chewing', snd: 'chew', missSnd: 'slurp', onDone() { F.eaten = 1; toast('All gone. Now back to bed...', 'ok'); } }) }),
          A('Carry the cup upstairs', [20, 34], 'carry', 1.2, { snd: 'handle', when: () => F.ready && !F.eaten && !F.carry, fn() { F.carry = 1; } })] },
      ];
    } },

  { id: 'ranked', emoji: '🎮', name: '3 AM Secret Ranked Match', board: 'dont-wake-mom-ranked',
    obj: 'Sneak past Mom asleep on the couch, boot the gaming PC and win a clutch match.', hz: 'RGB light spill · keyboard chatter · voice chat',
    t0: tm(3, 2, 10), base: 18, mom: 'couch', start: { x: 2.7, z: 4.2, y: 3, yaw: Math.PI }, gear: ['Socks On', 'Phone (Muted)', 'Headset (Wired)'],
    bust: ['The lamp clicks on. "ARE YOU PLAYING GAMES AT 3 AM?!" Mom already has the controller. Busted.', 'Mom, from the couch, eyes still closed: "Log off. NOW."'],
    steps: [
      { obj: 'Open your bedroom door (hold E)', ok: () => D.yours.v >= D.yours.pass },
      { obj: 'Sneak down to the living room', ok: () => inRoom('Living Room') },
      { obj: 'Creep behind the couch to the gaming desk', ok: () => near(1.4, 4.6, 1.5) },
      { obj: 'Boot the PC (the RGB lights spill if you are careless)', ok: () => G.f.pcOn },
      { obj: 'Put the headset on', ok: () => G.f.headset },
      { obj: 'Play the clutch match at the keyboard', ok: () => G.f.match },
      { obj: 'Celebrate (quietly!)', ok: () => G.f.cele },
      { obj: 'Shut the PC down', ok: () => G.f.shut },
      { obj: 'Sneak back to bed and close your door (hold Q)', ok: () => inRoom('Your Bedroom') && D.yours.v < .07 },
    ],
    setup() {
      const F = G.f, playMG = (title, c, bonus) => startMG({ type: 'timing', title, hint: 'Press E when the marker is in the green zone to land each shot. Misses make the keyboard clatter!', missLabel: 'Keys clatter', goodLabel: 'Key taps', snd: 'keys', onDone() { F.match = 1; G.bonus = (G.bonus || 0) + bonus; }, ...c }), boot = () => { F.pcOn = 1; F.rgb = F.rgbOff ? 0 : 1; Snd.fan(26); };
      G.inter = [
        { x: .6, z: 5.15, r: 1.9, name: 'PC tower', acts: [
          A('Flip the RGB switch off', [20, 28], 'press', 1.2, { snd: 'click', when: () => !F.rgbOff && !F.shut, fn() { F.rgbOff = 1; F.rgb = 0; } }),
          A('Press the power button', [28, 40], 'press', 1.2, { snd: 'click', when: () => !F.pcOn, fn() { boot(); if (F.rgb) addAlert(8); } }),
          A('Wake it from your phone (silent)', [20, 30], 'phone', 2, { snd: 'buzz', ex: 3, when: () => !F.pcOn, fn() { boot(); } }),
          A('Sleep the PC with the keyboard shortcut', [19, 29], 'press', 1, { snd: 'click', when: () => F.cele && !F.shut, fn() { F.shut = 1; F.pcOn = 0; F.rgb = 0; } }),
          A('Hold the power button: full shutdown', [28, 40], 'press', 2.5, { snd: 'fan', ex: 4, when: () => F.cele && !F.shut, fn() { F.shut = 1; F.pcOn = 0; F.rgb = 0; } }),
          A('Leave it running and go', [20, 30], 'reach', .6, { snd: 'click', ex: 12, when: () => F.cele && !F.shut, fn() { F.shut = 1; } })] },
        { x: .4, z: 4.05, r: 1.8, name: 'headset', acts: [
          A('Headset on, mic muted, volume low', [19, 28], 'reach', 1.5, { snd: 'rustle', when: () => F.pcOn && !F.headset, fn() { F.headset = 1; } }),
          A('One ear off to hear the room', [20, 30], 'reach', 1.5, { snd: 'rustle', spike: [.2, 58, 66], when: () => F.pcOn && !F.headset, fn() { F.headset = 1; } }),
          A('Mic on so your squad hears callouts', [24, 36], 'reach', 1.5, { snd: 'rustle', spike: [.35, 62, 78], when: () => F.pcOn && !F.headset, fn() { F.headset = 1; } })] },
        { x: .45, z: 4.55, r: 1.8, name: 'keyboard', acts: [
          A('Play: soft keys, slow flicks', [18, 22], 'type', .5, { snd: 'click', when: () => F.headset && !F.match, fn: () => playMG('Clutch 1v3: soft keys', { hits: 5, speed: .85, zoneW: .3, goodNoise: [20, 28], missNoise: [30, 40] }, 30) }),
          A('Play: hammer the mechanical keyboard', [18, 22], 'type', .5, { snd: 'click', when: () => F.headset && !F.match, fn: () => playMG('Clutch 1v3: mechanical flicks', { hits: 6, speed: 1.4, zoneW: .17, goodNoise: [34, 46], missNoise: [50, 64] }, 80) }),
          A('Play: controller in your lap', [18, 22], 'type', .5, { snd: 'click', when: () => F.headset && !F.match, fn: () => playMG('Clutch 1v3: controller', { hits: 5, speed: 1.05, zoneW: .24, goodNoise: [24, 36], missNoise: [38, 50] }, 50) }),
          A('Silent fist pump, bite your sleeve', [20, 28], 'fist', 1.6, { snd: 'rustle', when: () => F.match && !F.cele, fn() { F.cele = 1; } }),
          A('Whisper "LET\'S GOOO"', [34, 50], 'fist', 1.6, { snd: 'whisper', when: () => F.match && !F.cele, fn() { F.cele = 1; } }),
          A('Slap the desk in victory', [60, 76], 'fist', 1, { snd: 'bump', when: () => F.match && !F.cele, fn() { F.cele = 1; } })] },
      ];
    } },

  { id: 'delivery', emoji: '🍔', name: 'Operation Midnight Delivery', board: 'dont-wake-mom-delivery',
    obj: 'Reach the front door, unlock the deadbolt and collect your food before the driver rings the bell.', hz: 'Porch motion light · deadbolt · food smell · the clock',
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
      const F = G.f; F.locked = 1; G.arr = G.sc.t0 + G.sc.eta - 22; G.sc.eta0 = G.sc.t0 + G.sc.eta; World.driver.visible = true;
      G.inter = [
        { x: 2.3, z: 9.75, y: 0, r: 1.5, name: 'deadbolt', hold: true, when: () => G.step === 2, prompt: () => '[E hold] Turn the deadbolt (Shift = fast)', use(dt) {
          F.bolt = (F.bolt || 0) + dt * (keys.ShiftLeft ? 4 : 1); if (F.bolt >= 1.8) { F.bolt = 0; F.unlocked = 1; D.front.locked = 0; const fast = !!keys.ShiftLeft; Snd.bolt(fast ? 52 : 28); noise(fast ? rnd(48, 58) : rnd(24, 34), fast ? 'CLACK, deadbolt' : 'Deadbolt turns', P); } else prog(F.bolt / 1.8, 'Turning the deadbolt', true); } },
        { x: 2, z: 11.2, y: 0, r: 2.4, name: 'delivery driver', acts: [
          A('Whisper thanks, take the bag, tip on the phone', [22, 34], 'reach', 2, { snd: 'crinkle', ex: 6, when: () => G.driverHere && !F.bag, fn() { F.bag = 1; give('bag'); G.held.R = 'Burger Bag'; } }),
          A('Pay cash and ask for change', [36, 52], 'reach', 2.5, { snd: 'coins', ex: 6, when: () => G.driverHere && !F.bag, fn() { F.bag = 1; give('bag'); G.held.R = 'Burger Bag'; } }),
          A('Stuff the bag in your hoodie', [22, 36], 'carry', 2.2, { snd: 'crinkle', ex: 2, when: () => G.driverHere && !F.bag, fn() { F.bag = 1; F.hoodie = 1; give('bag'); G.held.R = 'Bag (in hoodie)'; } })] },
      ];
    } },

  { id: 'friend', emoji: '🤫', name: 'Sneaking a Friend In / Out', board: 'dont-wake-mom-friend',
    obj: 'Guide your friend through the back patio and upstairs past the dog and creaky floors. Then get them out again.', hz: 'Dog tail-thumping · double-person steps · squeaky step #4',
    t0: tm(1, 20, 5), base: 20, mom: 'bed', momDoor: 'mom', start: { x: 10.6, z: 3.5, y: 0, yaw: -Math.PI / 2 }, gear: ['Socks On', 'Phone (Muted)', 'Friend: Sam (Outside)'],
    bust: ['The hall light snaps on. "SAM?! What is Sam doing in my house at 1 AM?!" Busted.', 'The dog barks and Mom storms in. "Out! Both of you!"'],
    steps: [
      { obj: 'Slide the patio door open: hold E (gently)', ok: () => D.patio.v >= D.patio.pass },
      { obj: 'Calm Biscuit the dog so Sam can come in', ok: () => G.f.dog },
      { obj: "Lead Sam to your room. Hold V to tell him to WAIT. Mind step #4!", ok: () => inRoom('Your Bedroom') && samIn('Your Bedroom') },
      { obj: 'Close your bedroom door (hold Q)', ok: () => D.yours.v < .07 },
      { obj: "5:20 AM: lead Sam back down and out to the patio", ok: () => G.f.out },
      { obj: 'Close the patio door (hold Q)', ok: () => D.patio.v < .1 && inRoom('Kitchen') },
    ],
    setup() {
      const F = G.f, s = World.sam; s.visible = true; G.sam = { x: 15.4, z: 3.8, y: 0, acc: 0, trail: [], mode: 'wait', yaw: 0 }; s.position.set(15.4, 0, 3.8);
      const calm = (extra) => () => { F.dog = 1; G.sam.mode = 'follow'; if (extra) extra(); };
      G.inter = [{ x: 14, z: 2.8, y: 0, r: 3.6, name: 'Biscuit the dog', acts: [
        A('Offer a treat from your pocket', [20, 32], 'reach', 2, { snd: 'crunch', when: () => !F.dog, fn: calm() }),
        A('Pet him gently and whisper "sit"', [26, 44], 'reach', 2, { snd: 'whisper', spike: [.3, 52, 66], when: () => !F.dog, fn: calm() }),
        A('Step in on the beat of his tail thumps', [17, 26], 'reach', 2.5, { snd: 'thump', bursts: 2, when: () => !F.dog, fn: calm(() => { G.thumpUntil = G.t + 8; }) })] }];
    } },

  { id: 'phone', emoji: '📱', name: 'Confiscated Phone Retrieval', board: 'dont-wake-mom-phone',
    obj: "Infiltrate Mom's bedroom, reach into the nightstand drawer and retrieve your phone while she sleeps a meter away.", hz: 'Creaky floors · drawer friction · screen flare · charging chime',
    t0: tm(3, 40, 12), base: 28, mom: 'bed', momDoor: 'mom', momStir: 11, start: { x: 9.5, z: 7.6, y: 3, yaw: 0 }, gear: ['Socks On', 'Phone (Confiscated)'], doorV: { mom: .06 },
    bust: ['The lamp snaps on. Mom is sitting up. "I KNEW IT. Phone. Hand it over. And go to bed." Busted.', 'Mom, arms folded: "Looking for something?"'],
    steps: [
      { obj: "Get into Mom's room: hold E to open her door (it is ajar) or squeeze through", ok: () => inRoom("Mom's Bedroom") },
      { obj: 'Reach the nightstand. Darker boards creak: the rug and the west wall are quiet', ok: () => near(8.0, 2.2, 1.4) },
      { obj: 'Slide the nightstand drawer open: hold E slowly', ok: () => D.drawer.v >= .7 },
      { obj: 'Take your phone out of the drawer', ok: () => G.f.phone },
      { obj: 'Silence the phone before the screen wakes Mom', ok: () => G.f.muted },
      { obj: "Leave and close Mom's door (hold Q)", ok: () => !inRoom("Mom's Bedroom") && D.mom.v < .15 },
      { obj: 'Back to your room: close your door (hold Q)', ok: () => inRoom('Your Bedroom') && D.yours.v < .07 },
    ],
    setup() {
      const F = G.f, got = () => { F.phone = 1; give('phone'); G.held.L = 'Phone (screen glowing)'; G.glow = 1; G.stir = G.t + 5; G.stirAt = G.t; }, muted = () => { F.muted = 1; G.glow = 0; G.held.L = 'Phone (Muted)'; };
      G.inter = [{ x: 8.7, z: 2.2, y: 3, r: 1.9, name: 'nightstand', acts: [
        A('Lift phone AND charger together, palm over the screen', [21, 34], 'reach', 2, { snd: 'handle', ex: 3, when: () => D.drawer.v >= .6 && !F.phone, fn: got }),
        A('Unplug the cable first, then lift the phone', [18, 22], 'reach', .5, { snd: 'click', when: () => D.drawer.v >= .6 && !F.phone, fn: () => startMG({ type: 'tension', title: 'Unplug the charger slowly', hint: 'HOLD E to pull the cable out. Keep the needle in the green zone. Pull too hard and the plug scrapes (and the charging chime rings!).', snd: 'chime', fail: 'The plug scrapes and chimes', art: 'cable', speed: .8, onDone: got }) }),
        A('Lean across the bed to grab it', [34, 56], 'reach', 1.2, { snd: 'bump', ex: 6, when: () => D.drawer.v >= .6 && !F.phone, fn: got }),
        A('Flip the ringer switch, palm over the screen', [18, 28], 'phone', 1.5, { snd: 'click', when: () => F.phone && !F.muted, fn: muted }),
        A('Press power to blank the screen', [20, 32], 'phone', 1.2, { snd: 'click', ex: 3, when: () => F.phone && !F.muted, fn: muted }),
        A('Ignore it and retreat first', [20, 30], 'reach', .6, { snd: 'buzz', spike: [.35, 60, 72], ex: 8, when: () => F.phone && !F.muted, fn: muted })] }];
    } },
];
const samIn = (n) => { const s = G.sam; return s && World.roomAt(s.x, s.z, s.y).name === n; };

// ---------- helpers: progress, HUD ----------
function prog(f, label, bar) { G.progT = .25; G.progF = f; G.progL = label; G.progBar = !!bar; }

function start(i) {
  const sc = MISSIONS[i]; Snd.init(); closeChoice();
  G = { phase: 'play', sc, i, t: 0, clock: sc.t0, alert: sc.base, base: sc.base, maxAlert: sc.base, meter: 22, meterLabel: 'Ambient', reach: 0, lastNoise: -9, lastGain: -9, step: 0, f: {}, held: { L: 'Phone (Muted)', R: 'Empty' },
    worst: { db: 0, t: '' }, flash: false, battery: 100, sched: [], busy: null, menu: null, fx: null, kettle: null, invOrder: [], sel: null, mg: null, boil: null, heat: null, steep: null, progBar: false, hotT: 0, stir: 0, stirNext: rnd(6, 12), thumpUntil: 0, thumpAt: 0, mw: null, over: false, inter: [], sam: null, glow: 0, driverHere: false };
  for (const id in D) { D[id].v = (sc.doorV && sc.doorV[id]) || 0; D[id].apply(); D[id].locked = 0; D[id].acc = 0; }
  World.moms.bed.visible = sc.mom === 'bed'; World.moms.couch.visible = sc.mom === 'couch'; World.sam.visible = false; World.driver.visible = false;
  for (const k of ['pc', 'phone', 'porch', 'lamp']) World.lights[k].intensity = 0;
  emis(World.monScreen.material, 0x223355, .7); emis(World.rgb.material, 0x222222);
  World.lights.lamp.intensity = 0; World.lights.mom.intensity = 1.4;
  Object.assign(P, sc.start, { vx: 0, vz: 0, pitch: -.05, crouch: false, acc: 0, eye: 1.62 });
  sc.setup(); G.flashLabel = ''; Snd.tv(sc.id === 'ranked');
  $('#menu').hidden = true; $('#end').hidden = true; $('#hud').hidden = false; $('#obj').hidden = false; $('#menuBtn').hidden = false;
  if (matchMedia('(pointer:fine)').matches) { try { const pl = cv.requestPointerLock(); if (pl && pl.catch) pl.catch(() => {}); } catch {} }
  toast('Tip: C = crouch (quiet), Shift = run (loud), F = flashlight', 'ok');
}
function toMenu() {
  if (G.mg) { G.mg = null; mgEl.hidden = true; } $('#hotbar').innerHTML = ''; $('#chip').hidden = true; Snd.tv(false); G.phase = 'menu'; closeChoice(); try { document.exitPointerLock(); } catch {}
  $('#hud').hidden = true; $('#obj').hidden = true; $('#end').hidden = true; $('#menuBtn').hidden = true; $('#prompt').innerHTML = ''; $('#stir').hidden = true; $('#big').hidden = true; $('#prog').hidden = true;
  $('#menu').hidden = false; World.lights.lamp.intensity = 0;
  $('#cards').innerHTML = MISSIONS.map((s, i) => `<button class="card" data-i="${i}"><span class="num">${i + 1}</span><span class="em">${s.emoji}</span><b class="nm">${esc(s.name)}</b><div class="obj">${esc(s.obj)}</div><div class="hz">${s.hz.split(' · ').map((h) => `<span>${esc(h)}</span>`).join('')}</div>${best[s.id] ? `<span class="bst">★ ${best[s.id]}</span>` : ''}</button>`).join('');
  $('#cards').querySelectorAll('.card').forEach((c) => (c.onclick = () => start(+c.dataset.i)));
  P.x = 6; P.z = 4.6; P.y = 3; P.yaw = 0.6; P.pitch = -.1; G.sc = MISSIONS[0]; G.alert = 0; G.f = {}; G.sam = null;
}

// ---------- end screens ----------
function finish(html) {
  if (G.mg) { G.mg = null; mgEl.hidden = true; } Snd.tv(false); G.phase = 'end'; G.over = true; closeChoice(); try { document.exitPointerLock(); } catch {}
  $('#hud').hidden = true; $('#obj').hidden = true; $('#prompt').innerHTML = ''; $('#stir').hidden = true; $('#big').hidden = true; $('#prog').hidden = true;
  $('#end').hidden = false; $('#end').innerHTML = `<div class="endbox">${html}<div id="lb"></div><div id="ad"></div></div>`; adBanner($('#ad'));
}
function bust(why) {
  if (G.phase !== 'play') return; if (G.mg) { G.mg = null; mgEl.hidden = true; } G.phase = 'busted'; G.bustT = 0; G.why = why; Snd.bump(70); $('#stir').hidden = true; closeChoice(); G.busy = null;
}
function win() {
  const sc = G.sc, rise = G.maxAlert - sc.base, el = G.t, score = Math.round(clamp(430 + (100 - rise) * 4.2 - Math.min(150, el / 6) + (G.bonus || 0), 100, 1000));
  const grade = score >= 850 ? ['S', 'GHOST'] : score >= 700 ? ['A', 'NINJA'] : score >= 550 ? ['B', 'SNEAKY'] : ['C', 'LUCKY'], isBest = score > (best[sc.id] || 0);
  if (isBest) { best[sc.id] = score; try { localStorage.setItem('dwm-best', JSON.stringify(best)); } catch {} }
  finish(`<h2 class="ok">MISSION COMPLETE</h2><p>${sc.emoji} ${esc(sc.name)}: <b>undetected.</b></p><div class="final">${score}</div><div><b>Grade ${grade[0]} · ${grade[1]}</b>${isBest ? ' · <span class="warn">★ NEW BEST!</span>' : ''}</div>
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
    G.bustT += dt; World.lights.lamp.intensity = Math.min(5, G.bustT * 6); m.up.position.y = Math.min(.45, G.bustT * .5); m.up.rotation.z = Math.min(.9, G.bustT * 1.1);
    if (G.bustT > 1.8) bustScreen(); return;
  }
  if (G.phase !== 'play') { m.body.scale.y = 1 + Math.sin(performance.now() / 900) * .03; return; }
  G.t += dt; G.clock = sc.t0 + G.t + (G.skip || 0);
  m.body.scale.y = 1 + Math.sin(performance.now() / 900) * .04 + (G.stir > G.t ? .15 : 0); m.body.rotation.x = G.stir > G.t ? Math.sin(G.t * 6) * .05 : 0;
  // scheduled noises and busy actions
  for (let i = G.sched.length - 1; i >= 0; i--) if (G.t >= G.sched[i].at) { const s = G.sched.splice(i, 1)[0]; s.f(); if (G.phase !== 'play') return; }
  if (G.busy) { G.busy.t -= dt; prog(0, G.busy.label, false); if (G.busy.t <= 0) { const a = G.busy.a; G.busy = null; G.fx = null; if (a.bonus) G.bonus = (G.bonus || 0) + a.bonus; a.fn && a.fn(); if (a.say) toast(a.say); } }
  if (G.mg) { MGS[G.mg.type](G.mg, dt); if (G.phase !== 'play') return; if (G.mg) drawMG(G.mg); }
  const locked = G.busy || G.menu || G.mg;
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
  const nowStir = G.stir > G.t; if (nowStir && !G.stirSnd) { G.stirSnd = 1; Snd.sigh(); } if (!nowStir) G.stirSnd = 0; if (!nowStir) { G.stirNext -= dt; if (G.stirNext <= 0) { G.stir = G.t + 3.6; G.stirAt = G.t; G.stirNext = rnd(sc.momStir || 12, (sc.momStir || 12) + 9); } }
  if (G.stir > G.t) { if (P.speed > .45 && G.t - (G.stirAt || 0) > .6) addAlert(11 * dt); if (G.phase !== 'play') return; }
  $('#stir').hidden = !(G.stir > G.t);
  if (sc.id === 'ranked') Snd.tv(true, .06 / (1 + Math.hypot(P.x - 3.3, P.z - .5) * .6) * (P.y > 1.5 ? .3 : 1));
  // alert decay, flashlight, glow, smell
  G.base = Math.min(sc.base + 30, G.base + dt * .1); // Mom sleeps lighter as the night goes on
  if (G.t - G.lastGain > 2.2) G.alert = Math.max(G.base, G.alert - 1.0 * dt);
  if (G.alert >= 70) { G.hotT = (G.hotT || 0) + dt; if (G.hotT > 8) return bust('Mom got up to see what the noise was.'); } else G.hotT = 0;
  const dm = Math.hypot(P.x - momPos().x, P.z - momPos().z), sameFloor = Math.abs(P.y - (momPos().y > 1.5 ? 3 : 0)) < 1.6;
  if (G.flash) { G.battery = Math.max(0, G.battery - dt / 5); if (G.battery <= 0) G.flash = false; if (dm < 5.5 && sameFloor) { const d = [momPos().x - P.x, momPos().z - P.z], dl = Math.hypot(...d); addAlert((1.6 + ((d[0] * f[0] + d[1] * f[1]) / dl > .7 ? 3.5 : 0)) * dt); } }
  if (hit.KeyF) { G.flash = !G.flash && G.battery > 0; } hit.KeyF = 0; beam.intensity = G.flash ? 9 : 0;
  if (G.glow) { World.lights.phone.intensity = 2.4; World.lights.phone.position.set(P.x, P.y + 1.4, P.z); if (sameFloor && dm < 4) addAlert(2.2 * dt); } else World.lights.phone.intensity = 0;
  scr.material.color.copy(lc(G.glow || G.flash ? 0x88bbff : 0x1a2a4a)).multiplyScalar(G.glow ? 3 : 1);
  if (G.f.rgb && G.f.pcOn) { World.lights.pc.intensity = 3.5; World.lights.pc.color.setHSL((G.t * .3) % 1, 1, .55); World.rgb.material.color.setHSL((G.t * .3) % 1, 1, .5).multiplyScalar(2.5); addAlert(.9 * dt); }
  else { World.lights.pc.intensity = 0; emis(World.rgb.material, 0x222222); }
  if (G.f.pcOn) emis(World.monScreen.material, 0x77aaff, 2.2); else emis(World.monScreen.material, 0x223355, .7);
  if (sc.id === 'ranked' && G.f.pcOn && G.t - (G.pingT || 0) > 18 && Math.random() < dt * .1) { G.pingT = G.t; Snd.ping(); noise(rnd(42, 62), 'Discord notification', { x: .9, z: 4.6, y: 0 }); toast('Ping! A Discord notification', 'warn'); }
  // microwave minigame
  if (G.mw) { G.mw.t -= dt; G.mw.hum -= dt; if (G.mw.hum <= 0) { G.mw.hum = 1.4; Snd.hum(34); noise(rnd(32, 38), 'Microwave hum', { x: 9.5, z: .6, y: 0 }); }
    if (G.mw.t <= 0) { Snd.beep(); noise(rnd(84, 92), 'MICROWAVE BEEP', { x: 9.5, z: .6, y: 0 }); if (G.phase !== 'play') return; G.mw = null; G.f.cupWater = 2; G.steep = { t: 12 }; G.held.L = 'Cup Noodles (hot, steeping)'; toast('Too late: it beeped!', 'bad'); }
    else if (hit.KeyE && G.target && G.target.name === 'microwave & kettle') { /* handled below */ } }
  // kitchen systems: kettle boiling, pot heating, noodles steeping, and the props that show them
  { const K = World.K, F = G.f;
    if (G.kettle) { const k = G.kettle; if (k.on) { k.heat = Math.min(1, k.heat + dt / 9); k.tick -= dt; if (k.tick <= 0) { k.tick = .9; const db = 30 + k.heat * 24 + rnd(-2, 3); Snd.boil(db); noise(db, 'Kettle rumbling', { x: 10.3, z: .55, y: 0 }); } if (k.heat >= 1) { k.on = false; F.kHot = 1; Snd.click(34); Snd.ding(); toast('The kettle clicks off: the water is boiling.', 'ok'); } } else k.heat = Math.max(0, k.heat - dt * .03); }
    if (G.heat) { G.heat.t -= dt; G.heat.tick -= dt; if (G.heat.tick <= 0) { G.heat.tick = 1.4; Snd.hiss(30); noise(rnd(26, 34), 'Gas burner hiss', { x: 8, z: .45, y: 0 }); } if (G.heat.t <= 0 && !F.potHot) { F.potHot = 1; G.heat = { t: 99999, tick: .2 }; Snd.boil(36); toast('The water in the pot is boiling!', 'ok'); } }
    if (G.steep) { G.steep.t -= dt; if (G.steep.t <= 0) { G.steep = null; F.ready = 1; G.held.L = 'Cup Noodles (ready!)'; toast('The noodles are ready to eat!', 'ok'); } }
    K.cups[0].visible = !F.noodles; K.pot.visible = !F.pot && !F.potPlaced && !F.potTaken; K.potStove.visible = !!F.potPlaced; K.flame.visible = !!F.burner; K.flame.scale.setScalar(1 + Math.sin(G.t * 22) * .15);
    K.led.visible = !!(G.kettle && G.kettle.on) || !!F.kHot; K.steam.visible = !!(G.kettle && G.kettle.on) || !!F.kHot; K.sinkWater.visible = G.fx === 'sink' && !!G.busy; K.mwGlow.visible = !!G.mw;
    K.steam.children.forEach((s, i) => { const f = (G.t * .45 + i * .2) % 1; s.position.set(Math.sin(G.t * 2 + i) * .02, f * .28, 0); s.material.opacity = .26 * (1 - f); s.scale.setScalar(.7 + f); }); }
  // doors / holds / taps
  const tg = locked ? null : findTarget(); G.target = tg; let pr = '', prHtml = '';
  if (G.mw) { $('#big').hidden = false; const s = Math.max(0, G.mw.t); $('#big').textContent = `0:0${Math.ceil(s)}`; $('#big').classList.toggle('go', s <= 1.7); pr = '[E] stop the microwave at 0:01'; if (hit.KeyE) { if (G.mw.t <= 1.7) { Snd.click(26); Snd.ding(); G.mw = null; G.f.cupWater = 2; G.steep = { t: 12 }; G.held.L = 'Cup Noodles (hot, steeping)'; toast('Perfect: stopped at 0:01!', 'ok'); } else toast('Too early. Wait for 0:01!', 'warn'); } }
  else $('#big').hidden = true;
  if (tg && !G.mw) {
    if (tg.kind === 'door') {
      const d = tg.d, dirn = keys.KeyE ? 1 : keys.KeyQ ? -1 : 0, fast = keys.ShiftLeft || keys.ShiftRight;
      pr = d.locked || (tg.id === 'front' && G.f.locked && !G.f.unlocked) ? `Locked: use the deadbolt` : `[E] open · [Q] close (hold, Shift = fast)`;
      if (tg.id === 'front' && G.f.locked && !G.f.unlocked) { /* locked */ }
      else if (dirn) moveDoor(d, dirn, fast ? .7 : .18, dt);
      pr = `${tg.id === 'front' && G.f.locked && !G.f.unlocked ? 'Locked: turn the deadbolt first' : pr}  (${DNAME[tg.id]})`;
    } else if (tg.acts) {
      const list = actsOf(tg); prHtml = `<div class="pn">${esc(tg.name)}</div>` + list.map((a, i) => { const r = risk(a), c = r.pB >= 15 ? 'bad' : r.pN >= 50 || r.pB > 0 ? 'warn' : 'ok'; return `<div class="pa"><kbd>${AKEY[i]}</kbd><span>${esc(a.t)}</span><em class="${c}">🔊 ${r.lo}–${r.hi} dB</em></div>`; }).join('');
      list.forEach((a, i) => { if (i < 3 && hit[AKEYS[i]]) doAct(a); });
    } else {
      pr = tg.prompt();
      if (tg.hold) { if (keys.KeyE) tg.use(dt); else G.f.bolt = Math.max(0, (G.f.bolt || 0) - dt); }
      else if (hit.KeyE) tg.use();
    }
  }
  if (G.progT > 0) { G.progT -= dt; $('#prog').hidden = false; $('#prog i').style.width = (clamp(G.progF, 0, 1) * 100) + '%'; $('#prog b').hidden = !G.progBar; $('#prog span').textContent = G.progL; } else $('#prog').hidden = true;
  $('#prompt').innerHTML = prHtml || kbdify(pr); hit.KeyE = 0; hit.KeyQ = 0; hit.KeyR = 0; hit.KeyT = 0;
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
  const v0 = d.v; if (v0 === 0 && dirn > 0) Snd.handle(22); d.v = clamp(d.v + dirn * rate * dt, 0, 1); d.apply(); const dv = Math.abs(d.v - v0); if (!dv) return;
  d.acc += dv; const fast = rate > .4;
  if (d.acc >= .08) { d.acc = 0; const inSq = d.sq && d.v >= d.sq[0] && d.v <= d.sq[1], db = d.base + (fast ? 14 : 0) + (inSq ? 10 : 0) + rnd(-2, 3); (d.id === 'drawer' || d.id === 'patio' ? Snd.slide : Snd.hinge)(db); noise(db, inSq ? `${DNAME[d.id]} squeaks` : `${DNAME[d.id]} moving`, { x: DP[d.id][0], z: DP[d.id][1], y: P.y }); }
  if (v0 > 0 && d.v === 0 && dirn < 0) { const db = fast ? 46 : 22; (d.id === 'cab' || d.id === 'drawer' ? Snd.cab : Snd.click)(db); noise(db, `${DNAME[d.id]} latch`, { x: DP[d.id][0], z: DP[d.id][1], y: P.y }); }
}
function delivery(dt) {
  const sc = G.sc, eta = sc.eta0, drv = World.driver;
  const z = 11.6 + Math.max(0, (G.arr - sc.t0 - G.t - 0)) * 1.3; // walks up the path; arrives at G.arr
  drv.position.set(2, 0, Math.min(z, 24)); drv.rotation.y = Math.PI; const was = G.driverHere; G.driverHere = z <= 11.7; if (G.driverHere && !was) { Snd.car(); toast('A car pulls up outside...', 'warn'); } if (G.f.bag) drv.visible = false;
  if (!G.f.bag && sc.t0 + G.t >= eta) { Snd.bell(); noise(95, 'DOORBELL', { x: 2, z: 10.5, y: 0 }); if (G.phase === 'play') bust(`DING-DONG! The driver rang the bell at ${fmtT(G.clock)}.`); return; }
  const px = P.x, pz = P.z, inZone = px > .4 && px < 4 && pz > 10.2 && pz < 13.5 && P.y < 1;
  if (inZone && P.speed > 1.2 && !G.f.lit) { G.f.lit = G.t; World.lights.porch.intensity = 9; Snd.click(40); addAlert(14); toast('Motion sensor! The porch light floods on.', 'warn'); }
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
const stateLabel = (a) => (a >= 100 ? ['BUSTED', 'bad'] : a >= 81 ? ['CRITICAL · waking up', 'bad'] : a >= 61 ? ['SEMI-AWAKE', 'bad'] : a >= 41 ? ['RESTLESS', 'warn'] : a >= 21 ? ['LIGHT SLEEP', 'warn'] : ['DEEP SLEEP · STABLE', 'ok']);
const SEG = 28; for (const id of ['dbSeg', 'alSeg']) $('#' + id).innerHTML = '<i></i>'.repeat(SEG);
const segCache = {};
function setSeg(id, f) { const n = Math.round(clamp(f, 0, 1) * SEG); if (segCache[id] === n) return; segCache[id] = n; const el = $('#' + id).children; for (let i = 0; i < SEG; i++) el[i].className = i < n ? (i < SEG * .4 ? 'g' : i < SEG * .72 ? 'y' : 'r') : ''; }
const kbdify = (s) => esc(s).replace(/\[(E hold|E|Q|Shift)\]/g, (m, k) => `<kbd>${k.replace(' hold', '')}</kbd>${k === 'E hold' ? 'hold ' : ''}`);
let hudT = 0; const hudCache = {};
function drawHud(dt) {
  hudT -= dt; if (hudT > 0 || G.phase !== 'play') return; hudT = .08;
  const sc = G.sc, r = World.roomAt(P.x, P.z, P.y), sf = World.surfaceAt(P.x, P.z, P.y), [lab, cls] = stateLabel(G.alert), tg = G.target;
  const sfc = sf.creak ? (sf.creak > 1 ? 'bad' : 'warn') : 'ok', sfT = sf.creak ? (sf.creak > 1 ? 'HIGH CREAK RISK' : 'CREAK RISK') : sf.base < 25 ? 'SOFT · SAFE' : 'NORMAL NOISE';
  $('#tc').textContent = fmtT(G.clock);
  $('#cap').textContent = `${P.crouch ? 'Crouched, low view.' : 'Standing view.'} ${G.flash ? 'The phone flashlight cuts a pale cone ahead.' : 'Only the dim blue night-light.'}${tg ? ' In reach: ' + (tg.name || DNAME[tg.id]) + '.' : ''}`;
  $('#locT').textContent = r.name; $('#posT').textContent = P.crouch ? '· Crouched' : '· Standing';
  $('#batT').textContent = `BAT ${G.flash ? Math.round(G.battery) : 78}%`;
  setSeg('dbSeg', (G.meter - 10) / 90); $('#dbV').innerHTML = `${Math.round(G.meter)}<small>dB</small>`; $('#dbV').className = G.meter > 55 ? 'bad' : G.meter > 30 ? 'warn' : '';
  $('#dbL').textContent = `${G.meterLabel || 'Ambient'}${G.meter > 30 ? ' · reaches Mom ' + Math.max(0, Math.round(G.reach)) + ' dB' : ''}`;
  setSeg('alSeg', G.alert / 100); $('#alV').textContent = Math.round(G.alert) + '%'; $('#alV').className = cls === 'ok' ? '' : cls; $('#alL').innerHTML = `<span class="${cls}">${lab}</span>`;
  $('#surf').innerHTML = `<span>👣 ${esc(sf.name)}</span><em class="${sfc}">${sfT}</em>`;
  const hd = held(); $('#hL').textContent = hd.L + (G.flash ? ' · light on' : ''); $('#hR').textContent = hd.R;
  { const inv = invList(), html = inv.map((id, i) => `<div class="slot${G.sel === id ? ' on' : ''}"><kbd>${i + 1}</kbd><span class="ic">${ITEMS[id]}</span><small>${esc(itemName(id))}</small></div>`).join(''); if (html !== hudCache.inv) { hudCache.inv = html; $('#hotbar').innerHTML = html; } }
  { const parts = []; const k = G.kettle; if (k && (k.on || k.heat > 0) && !G.f.kHot) parts.push(`🫖 Kettle ${Math.round(k.heat * 100)}% · ${k.on ? 'heating, ' + Math.round(30 + k.heat * 24) + ' dB (switch it off if too loud)' : 'cooling'}`); if (G.steep) parts.push(`🍜 Steeping ${Math.ceil(G.steep.t)}s`); if (G.heat && !G.f.potHot) parts.push('🥘 Water heating...'); $('#chip').hidden = !parts.length; if (parts.length) $('#chip').innerHTML = parts.join(' &nbsp;·&nbsp; '); }
  const left = sc.eta0 && !G.f.bag ? Math.max(0, Math.ceil(sc.eta0 - sc.t0 - G.t)) : -1, eta = $('#eta');
  eta.hidden = left < 0; if (left >= 0) { eta.innerHTML = `🚗 DRIVER ETA ${fmtT(sc.eta0)} · T-${left}s`; eta.className = 'glass ' + (left < 40 ? 'bad' : 'warn'); }
  const st = Math.min(G.step, sc.steps.length - 1);
  $('#obj').innerHTML = `<div><span class="n">${G.step + 1}/${sc.steps.length}</span><span class="t">${esc(sc.steps[st].obj)}</span></div><div class="dots">${sc.steps.map((_, i) => `<i class="${i < G.step ? 'd' : i === G.step ? 'c' : ''}"></i>`).join('')}</div>`;
  if (toastT > 0) { toastT -= .08; if (toastT <= 0) $('#toast').innerHTML = ''; }
  $('#cross').classList.toggle('act', !!tg && !G.mw);
}

// ---------- hand animations: what your hands visibly do during each action ----------
const baseR = [.17, -.3, -.28, .32, -.32, 0], baseL = [-.17, -.3, -.28, .32, .32, 0], curR = [0, 0, 0, 0, 0, 0], curL = [0, 0, 0, 0, 0, 0], Z6 = [0, 0, 0, 0, 0, 0];
const PI = Math.PI, pu = (p) => Math.sin(PI * clamp(p, 0, 1)), ez = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const ANIM = {
  reach: (p) => { const u = pu(p); return { R: [-.05 * u, .09 * u, -.25 * u, -.4 * u, 0, 0] }; },
  open: (p) => { const u = pu(p); return { R: [-.06 * u, .08 * u, -.26 * u, -.3 * u, 0, .45 * Math.sin(p * 2 * PI)] }; },
  twist: (p) => { const u = pu(p); return { R: [-.05 * u, .06 * u, -.22 * u, -.3 * u, 0, .8 * Math.sin(p * 4 * PI) * u] }; },
  press: (p) => { const u = pu(p); return { R: [-.04 * u, .05 * u, -.2 * u - .035 * Math.sin(p * 5 * PI) * u, -.3 * u, 0, 0] }; },
  fill: () => ({ R: [-.09, .06, -.14, -.15, .25, -.25], props: ['pourItem'] }),
  fillcup: () => ({ L: [.12, .05, -.16, -.1, -.25, 0], props: ['cupL'] }),
  pour: (p) => { const t = Math.sin(clamp(p * 1.1, 0, 1) * PI) * 1.2; return { R: [-.1, .09, -.08, -.15, .3, -t], L: [.1, .12, -.06, -.15, -.3, 0], props: ['pourItem', 'cupL', 'water'] }; },
  rip: (p) => { const e = ez((p - .2) / .6); return { R: [-.05 + .1 * e, .1 + .06 * e, -.17 + .03 * e, -.3, .25, -.4 * e], L: [.06, .1, -.15, -.3, -.25, 0], props: ['packet', 'cupL'] }; },
  peel: (p) => { const e = ez((p - .15) / .7); return { R: [-.05 + .05 * e, .1 + .03 * e, -.17, -.3, .25, -.25 * e + .05 * Math.sin(p * 20)], L: [.06, .1, -.15, -.3, -.25, 0], props: ['packet', 'cupL'] }; },
  eat: (p) => { const f = Math.max(0, Math.sin(p * PI * 5)); return { R: [-.07, .02 + .14 * f, -.17 + .1 * f, -.2 - .6 * f, .2, 0], L: [.1, .1, -.08, -.3, -.3, 0], props: ['cupL', 'fork'] }; },
  type: (p) => { const j = Math.sin(p * 60) * .012; return { R: [-.03, -.05 + j, -.15, -.2, 0, 0], L: [.03, -.05 - j, -.15, -.2, 0, 0] }; },
  fist: (p) => { const u = pu(p); return { R: [-.06, .3 * u, -.12, -.9 * u, 0, 0] }; },
  phone: (p) => { const u = pu(p); return { L: [.12, .22 * u, -.08 * u, -.6 * u, 0, 0], props: ['phone'] }; },
  carry: () => ({ L: [.1, .15, -.1, -.4, -.25, 0], props: ['cupL'] }),
};
function poseArms(dt) {
  const b = G.busy, held = window.__held(); let o = {}, p = 0;
  if (b && ANIM[b.anim]) { p = 1 - b.t / b.total; o = ANIM[b.anim](p, b) || {}; }
  const R = o.R || Z6, L = o.L || Z6, k = Math.min(1, dt * 12);
  for (let i = 0; i < 6; i++) { curR[i] += (R[i] - curR[i]) * k; curL[i] += (L[i] - curL[i]) * k; }
  armR.position.set(baseR[0] + curR[0], baseR[1] + curR[1], baseR[2] + curR[2]); armR.rotation.set(baseR[3] + curR[3], baseR[4] + curR[4], baseR[5] + curR[5]);
  armL.position.set(baseL[0] + curL[0], baseL[1] + curL[1], baseL[2] + curL[2]); armL.rotation.set(baseL[3] + curL[3], baseL[4] + curL[4], baseL[5] + curL[5]);
  const ex = !!o.props, pr = o.props || [], has = (x) => pr.includes(x), cupHeld = /noodle|cup/i.test(held.L || '') && !/empty/i.test(held.L || ''), item = b && b.a && b.a.prop;
  cupL.visible = ex ? has('cupL') : cupHeld; phoneM.visible = ex ? has('phone') : !cupHeld;
  potP.visible = ex ? has('pourItem') && item === 'pot' : /pot/i.test(held.R || ''); kettleP.visible = ex && has('pourItem') && item === 'kettle';
  forkP.visible = has('fork'); packetP.visible = has('packet'); bagM.visible = !ex && /bag/i.test(held.R || '');
  waterM.visible = has('water') && p > .2 && p < .9; if (waterM.visible) waterM.scale.y = .8 + Math.random() * .4;
  const steam = cupL.visible && G.f && G.f.cupWater === 2 && !G.f.eaten; steamC.forEach((s, i) => { s.visible = !!steam; const f = (performance.now() / 1400 + i / 3) % 1; s.position.set(Math.sin(f * 6 + i) * .01, .08 + f * .12, 0); s.material.opacity = .3 * (1 - f); });
}
// ---------- render loop ----------
let last = performance.now(), idle = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; update(dt);
  if (G.phase === 'menu') { idle += dt; P.yaw = .6 + Math.sin(idle * .15) * .5; }
  const eyeT = P.crouch ? 1.1 : 1.62; P.eye += (eyeT - P.eye) * Math.min(1, dt * 8); P.bob += P.speed * dt * 5.5;
  cam.position.set(P.x, P.y + P.eye + Math.sin(P.bob) * .014 * Math.min(P.speed, 2), P.z + 0); cam.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
  hands.position.y = Math.sin(P.bob * .5) * .008; hands.position.x = Math.cos(P.bob * .5) * .006; poseArms(dt);
  drawHud(dt);
  { const fl = 1.7 + Math.sin(now / 230) * .25 + Math.sin(now / 71) * .12; emis(World.tv.material, 0x4a7ac8, fl); World.lights.living.intensity = 1.6 + fl * .4; }
  renderFrame(now);
  requestAnimationFrame(frame);
}
window.__held = held;
window.__dwm = { get G() { return G; }, P, D, MISSIONS, start, noise, win, keys, hit };
toMenu(); requestAnimationFrame(frame);
})();
