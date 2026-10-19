// The house: two floors, procedural textures, hinged/sliding doors, creak zones, Mom, Sam, the driver and the dog.
// Units are meters. x = east, z = south, y = up. Upper floor is at y = 3. Stairs climb along +x at z 8.4–9.8.
const World = (() => {
  const T = THREE, scene = new T.Scene();
  scene.background = new T.Color(0x0b1128); scene.fog = new T.Fog(0x0b1128, 10, 40);
  const colliders = [], doors = {}, creaks = [], rugs = [], rooms = [], lights = {};
  const STAIR = { x1: 5, x2: 11, z1: 8.4, z2: 9.8 };

  // ---------- textures & materials ----------
  const cvs = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };
  const rn = Math.random;
  const C = {
    wood: cvs(256, 256, (g, w, h) => { for (let i = 0; i < 6; i++) { const y = i * h / 6; g.fillStyle = `hsl(26,38%,${30 + rn() * 10}%)`; g.fillRect(0, y, w, h / 6);
      for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(0,0,0,${rn() * .1})`; g.fillRect(rn() * w, y + rn() * h / 6, 20 + rn() * 50, 1); }
      g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, y, w, 2); g.fillRect(rn() * w, y, 2, h / 6); } }),
    carpet: cvs(128, 128, (g, w, h) => { g.fillStyle = '#9a9cb2'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${rn() < .5 ? '255,255,255' : '0,0,0'},${rn() * .08})`; g.fillRect(rn() * w, rn() * h, 2, 2); } }),
    tile: cvs(128, 128, (g, w, h) => { g.fillStyle = '#b9bcc4'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${rn() * .05})`; g.fillRect(rn() * w, rn() * h, 3, 3); } }),
    grass: cvs(128, 128, (g, w, h) => { g.fillStyle = '#2b4a33'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${rn() < .5 ? '120,200,120' : '0,20,0'},${rn() * .12})`; g.fillRect(rn() * w, rn() * h, 2, 4); } }),
    conc: cvs(128, 128, (g, w, h) => { g.fillStyle = '#7b7f8c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(0,0,0,${rn() * .08})`; g.fillRect(rn() * w, rn() * h, 3, 3); } g.strokeStyle = 'rgba(0,0,0,.3)'; g.strokeRect(0, 0, w, h); }),
  };
  const tmat = (key, rx, ry, tint = 0xffffff) => { const t = new T.CanvasTexture(C[key]); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; return new T.MeshStandardMaterial({ map: t, color: tint, roughness: .85 }); };
  const M = (c, o = {}) => new T.MeshStandardMaterial({ color: c, roughness: .9, ...o });
  const wallM = M(0xc4b49c), ceilM = M(0xc8c2b8), blackM = M(0x15171f), skinM = M(0xe0b090);
  const glow = (c) => new T.MeshBasicMaterial({ color: c });

  function box(x1, y1, z1, x2, y2, z2, m, add = true) {
    const g = new T.Mesh(new T.BoxGeometry(x2 - x1, y2 - y1, z2 - z1), m);
    g.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2); if (add) scene.add(g); return g;
  }
  const col = (x1, x2, z1, z2, lv = 0, extra = {}) => { const c = { x1, x2, z1, z2, lv, ...extra }; colliders.push(c); return c; };
  // furniture: visible box + collider (lv 0 or 1)
  const furn = (x1, y1, z1, x2, y2, z2, color, lv = 0, solid = true) => { const y0 = lv * 3; const m = box(x1, y0 + y1, z1, x2, y0 + y2, z2, M(color)); if (solid) col(x1, x2, z1, z2, lv); return m; };
  function floor(x1, z1, x2, z2, y, key, tint) { box(x1, y - .12, z1, x2, y, z2, tmat(key, (x2 - x1) / 1.5, (z2 - z1) / 1.5, tint)); }
  function ceil(x1, z1, x2, z2, y) { box(x1, y - .04, z1, x2, y, z2, ceilM); }
  function rug(x1, z1, x2, z2, lv, tint) { box(x1, lv * 3, z1, x2, lv * 3 + .02, z2, tmat('carpet', (x2 - x1) / 1.2, (z2 - z1) / 1.2, tint)); rugs.push({ x1, x2, z1, z2, lv }); }
  const creak = (x1, x2, z1, z2, lv, sev) => { // slightly darker worn boards
    creaks.push({ x1, x2, z1, z2, lv, sev }); box(x1, lv * 3 + .005, z1, x2, lv * 3 + .012, z2, new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: sev > 1 ? .26 : .14 }));
  };
  const room = (name, x1, x2, z1, z2, lv, surf) => rooms.push({ name, x1, x2, z1, z2, lv, ...surf });
  function light(key, color, int, x, y, z, range = 9) { const l = new T.PointLight(color, int, range, 1.6); l.position.set(x, y, z); scene.add(l); lights[key] = l; return l; }

  // walls along x (z1 === z2) or z, with door gaps [{at,w}]
  function wall(x1, z1, x2, z2, lv, gaps = []) {
    const ax = z1 === z2, a = ax ? Math.min(x1, x2) : Math.min(z1, z2), b = ax ? Math.max(x1, x2) : Math.max(z1, z2), c = ax ? z1 : x1, y0 = lv * 3, t = .14;
    const gs = gaps.map((g) => [g.at - g.w / 2, g.at + g.w / 2]).sort((p, q) => p[0] - q[0]); const segs = []; let cur = a;
    for (const [g0, g1] of gs) { if (g0 > cur) segs.push([cur, g0]); cur = g1; } if (cur < b) segs.push([cur, b]);
    const put = (s0, s1, ya, yb, hit) => {
      if (ax) { box(s0, y0 + ya, c - t / 2, s1, y0 + yb, c + t / 2, wallM); if (hit) col(s0, s1, c - t / 2 - .02, c + t / 2 + .02, lv); }
      else { box(c - t / 2, y0 + ya, s0, c + t / 2, y0 + yb, s1, wallM); if (hit) col(c - t / 2 - .02, c + t / 2 + .02, s0, s1, lv); }
    };
    for (const [s0, s1] of segs) put(s0, s1, 0, 3, true);
    for (const [g0, g1] of gs) put(g0, g1, 2.15, 3, false); // lintel
  }

  // ---------- doors, cabinet doors, sliders ----------
  // hinge: leaf pivots around (x,z); slide: panel moves along axis. v is openness 0..1.
  // pass = openness at which the player fits through; sq = [v0,v1] hinge squeak zone.
  function mover(o) {
    const g = new T.Group(); g.position.set(o.x, o.y || 0, o.z); scene.add(g);
    const th = o.hinge ? Math.atan2(-o.dir[1], o.dir[0]) : 0, t = o.t || .05, d = { ...o, g, th, v: o.v0 || 0, last: o.v0 || 0, acc: 0 };
    const leaf = box(0, 0, -t / 2, o.len, o.h, t / 2, o.mat || M(0xa88b66), false); g.add(leaf);
    if (o.knob !== false) { const k = box(o.len - .1, o.h * .45, t / 2, o.len - .04, o.h * .45 + .04, t / 2 + .07, M(0xc9c3b0), false); g.add(k); const k2 = k.clone(); k2.position.z = -k.position.z; g.add(k2); }
    d.apply = () => {
      if (o.hinge) g.rotation.y = th + o.s * d.v * o.amax;
      else { g.rotation.y = o.rot || 0; g.position.set(o.x + o.axis[0] * d.v * o.dist, o.y || 0, o.z + o.axis[1] * d.v * o.dist); }
    };
    d.apply(); doors[o.id] = d; return d;
  }
  const hingeDoor = (id, name, x, z, dir, s, lv, len = .95, extra = {}) => mover({ id, name, hinge: true, x, z, y: lv * 3, dir, s, len, h: 2.1, amax: 1.9, pass: .45 / 1.9, sq: [.47, .68], base: 24, ...extra });

  // ---------- people & props ----------
  const person = (col, o = {}) => {
    const g = new T.Group(), cm = M(col), lg = M(0x2a3050);
    g.add(box(-.22, .8, -.12, .22, 1.4, .12, cm, false), box(-.2, 0, -.1, -.02, .82, .1, lg, false), box(.02, 0, -.1, .2, .82, .1, lg, false),
      box(-.32, .85, -.07, -.22, 1.35, .07, cm, false), box(.22, .85, -.07, .32, 1.35, .07, cm, false));
    const head = new T.Mesh(new T.SphereGeometry(.13, 12, 10), skinM); head.position.y = 1.55; g.add(head);
    g.add(box(-.14, 1.6, -.14, .14, 1.7, .14, M(o.hair ?? 0x3a2a20), false));
    if (o.cap) g.add(box(-.15, 1.66, -.15, .15, 1.72, .22, M(o.cap), false));
    if (o.bag) { const b = box(.3, .55, -.1, .52, .85, .1, M(0xe8d9b8), false); b.name = 'bag'; g.add(b); }
    return g;
  };
  const sleeper = (blanket) => { // Mom, asleep and cozy under a blanket (lying along x)
    const g = new T.Group(); const up = new T.Group(); g.add(up);
    up.add(box(-.9, 0, -.3, -.5, .12, .3, M(0xf2efe6), false));
    const head = new T.Mesh(new T.SphereGeometry(.12, 12, 10), skinM); head.position.set(-.7, .2, 0); up.add(head);
    up.add(box(-.83, .22, -.15, -.6, .3, .15, M(0x4a3426), false));
    const body = box(-.55, .04, -.35, .85, .24, .35, M(blanket), false); g.add(body); g.body = body; g.up = up;
    return g;
  };
  const dog = () => {
    const g = new T.Group(), m = M(0xb8844e);
    g.add(box(-.3, .1, -.14, .3, .4, .14, m, false)); const hd = box(.28, .25, -.12, .5, .5, .12, m, false); g.add(hd);
    g.add(box(.42, .28, -.06, .56, .38, .06, M(0x3a2a20), false), box(.3, .5, -.1, .36, .6, -.02, M(0x6a4a2a), false), box(.3, .5, .02, .36, .6, .1, M(0x6a4a2a), false));
    const tail = new T.Group(); tail.position.set(-.3, .35, 0); tail.add(box(-.3, -.02, -.02, 0, .02, .02, m, false)); g.add(tail); g.tail = tail; return g;
  };

  // ---------- build the house ----------
  // floors & ceilings
  floor(0, 0, 7, 6, 0, 'wood'); floor(7, 0, 12, 6, 0, 'tile'); floor(0, 6, 12, 10, 0, 'wood', 0xe0d0c0);
  floor(0, 0, 5.5, 6, 3, 'carpet', 0x8a93c0); floor(5.5, 0, 7, 6, 3, 'tile'); floor(7, 0, 12, 6, 3, 'wood');
  floor(0, 6, 5, 10, 3, 'wood', 0xe0d0c0); floor(5, 6, 12, 8.4, 3, 'wood', 0xe0d0c0); floor(11, 8.4, 12, 10, 3, 'wood', 0xe0d0c0);
  ceil(0, 0, 7, 6, 2.88); ceil(7, 0, 12, 6, 2.88); ceil(0, 6, 5, 10, 2.88); ceil(5, 6, 12, 8.4, 2.88); ceil(11, 8.4, 12, 10, 2.88);
  ceil(0, 0, 12, 10, 6); box(-.3, 6, -.3, 12.3, 6.2, 10.3, M(0x3a3f55));
  // outside
  box(-30, -.3, -30, 40, -.02, 40, tmat('grass', 40, 35)); floor(0, 10, 4, 13, 0, 'conc'); floor(12, 1, 16, 6, 0, 'conc'); floor(1, 13, 3, 24, 0, 'conc');
  box(-30, -.02, 24, 40, 0, 27, M(0x2a2c36)); // street
  // exterior + interior walls
  for (const lv of [0, 1]) {
    wall(0, 0, 12, 0, lv); wall(0, 0, 0, 10, lv);
    wall(12, 0, 12, 10, lv, lv === 0 ? [{ at: 3.5, w: 1.7 }] : []); wall(0, 10, 12, 10, lv, lv === 0 ? [{ at: 2, w: 1.05 }] : []);
    wall(5, 8.4, 11, 8.4, lv);
  }
  wall(7, 0, 7, 6, 0, [{ at: 3, w: 3.2 }]); wall(0, 6, 7, 6, 0, [{ at: 3.5, w: 2.6 }]); wall(7, 6, 12, 6, 0, [{ at: 9.5, w: 2.4 }]);
  wall(0, 6, 12, 6, 1, [{ at: 2.5, w: 1.05 }, { at: 9.5, w: 1.05 }]); wall(5.5, 0, 5.5, 6, 1); wall(7, 0, 7, 6, 1);
  wall(5, 8.4, 5, 10, 1);
  // doors: your room, Mom's, front, patio, kitchen cabinet, nightstand drawer
  const dY = hingeDoor('yours', 'your bedroom door', 2.0, 6, [1, 0], 1, 1), dM = hingeDoor('mom', "Mom's door", 9.0, 6, [1, 0], 1, 1);
  const dF = hingeDoor('front', 'front door', 1.5, 10, [1, 0], 1, 0, 1.05, { mat: M(0x6b4a3a), base: 28 });
  const dP = mover({ id: 'patio', name: 'patio door', x: 11.88, z: 2.65, y: 0, len: 1.7, h: 2.1, rot: -Math.PI / 2, axis: [0, -1], dist: 1.5, pass: .5, base: 28, mat: M(0x5a6a80, { transparent: true, opacity: .55 }), knob: false });
  const dC = hingeDoor('cab', 'cabinet', 7.55, .62, [1, 0], -1, 0, .5, { y: 1.5, h: .7, amax: 1.7, pass: .3, base: 22, sq: [.8, .9], mat: M(0xc9b698), knob: false });
  const dD = mover({ id: 'drawer', name: 'nightstand drawer', x: 8.45, y: 3 + .45, z: 1.62, len: .5, h: .2, rot: 0, axis: [0, 1], dist: .34, pass: .8, base: 22, mat: M(0x8a6a4a), knob: false });
  dD.apply();
  // door colliders: block the gap until it is open enough
  col(1.5, 2.55, 5.85, 6.15, 1, { door: dY }); col(9.0, 10.05, 5.85, 6.15, 1, { door: dM }); col(1.5, 2.55, 9.85, 10.15, 0, { door: dF }); col(11.85, 12.15, 2.65, 4.35, 0, { door: dP });
  col(10.98, 12.1, 8.4, 10.1, 0); // the dead space under the top landing
  // stairs (15 steps, 0.4 run x 0.2 rise)
  for (let i = 1; i <= 15; i++) box(5 + (i - 1) * .4, 0, 8.4, 5 + i * .4, i * .2, 9.8, M(i % 2 ? 0x8a6a4a : 0x7d5f42));
  // rooms (first match wins)
  room('Staircase', 5, 11, 8.4, 9.8, 2, { surf: 'stairs' });
  room('Your Bedroom', 0, 5.5, 0, 6, 1, { surf: 'carpet' }); room('Bathroom', 5.5, 7, 0, 6, 1, { surf: 'tile' }); room("Mom's Bedroom", 7, 12, 0, 6, 1, { surf: 'wood' });
  room('Master Hallway (2nd Floor)', 0, 12, 6, 10, 1, { surf: 'wood' });
  room('Living Room', 0, 7, 0, 6, 0, { surf: 'wood' }); room('Kitchen', 7, 12, 0, 6, 0, { surf: 'tile' }); room('Front Foyer', 0, 12, 6, 10, 0, { surf: 'wood' });
  room('Back Patio', 12, 17, 0, 7, 0, { surf: 'conc' }); room('Front Porch', 0, 4, 10, 14, 0, { surf: 'conc' }); room('Front Path', -5, 8, 14, 30, 0, { surf: 'conc' });
  // rugs & creak zones
  rug(.5, .5, 4.5, 2.7, 1, 0x7d6fa8); rug(8.2, 3.4, 10.6, 5.6, 1, 0xa86f6f); rug(1.6, .8, 5.4, 2.5, 0, 0x6f8fa8); rug(.6, 7.4, 3.2, 9.4, 0, 0x8a6f4a);
  creak(2.2, 3.2, 3.7, 4.8, 0, 1); creak(1.0, 2.0, 5.0, 6.0, 0, 2); creak(3.6, 4.6, 6.4, 8.4, 0, 1); creak(5.4, 6.6, 6.5, 8, 0, 1);
  creak(3.4, 4.6, 6.2, 8.0, 1, 1); creak(6.4, 7.8, 6.2, 8.2, 1, 2); creak(9.0, 10.4, 6.2, 7.0, 1, 1); creak(11, 11.9, 7.2, 8.3, 1, 1);
  creak(8.2, 9.6, 2.4, 3.4, 1, 2); creak(8.9, 9.8, 1.7, 2.5, 1, 1); creak(10.4, 11.6, 3.4, 5.4, 1, 1); creak(7.3, 8.1, 5.6, 5.95, 1, 1);

  // furniture: your room
  furn(.3, 0, .3, 2.3, .5, 2.4, 0x3a5a8a, 1); furn(.3, .5, .3, 2.3, .65, 1.0, 0xe8e8f0, 1, false); furn(3.4, 0, .3, 5.2, .75, 1.0, 0x6a4a30, 1); furn(4.6, 0, 3.8, 5.3, 2, 5.8, 0x5a4a3a, 1);
  // Mom's room
  furn(9.1, 0, .2, 11.8, .5, 2.4, 0x6a4a8a, 1); furn(8.4, 0, 1.0, 9.0, .6, 1.62, 0x8a6a4a, 1); furn(11, 0, 4.3, 11.8, 1.9, 5.8, 0x4a3a30, 1);
  // living room, couch faces the TV on the north wall
  furn(1.8, 0, 2.6, 4.8, .45, 3.5, 0x6a5a7a); furn(1.8, .45, 3.3, 4.8, .95, 3.5, 0x6a5a7a, 0, false); furn(2.4, 0, .15, 4.2, .6, .6, 0x2a2a30);
  const tv = box(2.5, .6, .2, 4.1, 1.35, .28, blackM); const tvScreen = box(2.55, .65, .29, 4.05, 1.3, .3, glow(0x335a99));
  furn(.2, 0, 3.7, .9, .75, 5.3, 0x4a3a2a); furn(.15, 1.5, .15, .5, 2.2, 3, 0x3a2e24); // desk, bookshelf
  const monitor = box(.25, .75, 4.0, .32, 1.2, 4.9, blackM); const monScreen = box(.33, .78, 4.04, .34, 1.17, 4.86, glow(0x223355));
  const pc = box(.3, .75, 5.0, .75, 1.15, 5.25, M(0x20222c)); const rgb = box(.3, .78, 5.26, .31, 1.12, 5.27, glow(0x222222));
  furn(1.1, 0, 4.2, 1.5, .5, 4.8, 0x2a2a34, 0, false);
  // kitchen
  furn(7.3, 0, .2, 11, .9, .9, 0x9a8a78); furn(11, 0, 1.0, 11.8, 1.85, 1.8, 0xd8dde0); furn(8.3, 0, 2.4, 10.7, .92, 3.3, 0x8a7a68);
  box(7.4, 1.5, .15, 9.6, 2.2, .6, M(0xc9b698)); box(10, 1.5, .15, 11.7, 2.2, .6, M(0xc9b698));
  const microwave = box(9.2, .9, .25, 9.9, 1.18, .75, M(0x2a2c32)); const mwClock = box(9.78, 1.0, .74, 9.88, 1.06, .76, glow(0x44ff88));
  box(10.2, .9, .3, 10.45, 1.2, .55, M(0xcfd3d9)); // kettle
  furn(7.4, 0, 4.9, 8.2, .8, 5.9, 0x7a6a5a, 0, true); // side table
  // foyer
  furn(4.2, 0, 6.2, 4.9, .8, 6.9, 0x6a4a30); furn(.2, 0, 6.2, 1, .5, 6.6, 0x3a3a44);
  // patio: dog bed, chairs
  box(14.1, 0, 2.2, 15, .12, 3.2, M(0x7a3a3a)); furn(13.2, 0, 5.2, 14, .5, 6, 0x2a3a4a);
  // window panels (moonlight)
  const wm = new T.MeshBasicMaterial({ color: 0x2a4a8a });
  for (const [x, y, z] of [[2.5, 1.7, .08], [10, 1.7, .08], [7.6, 1.7, 9.92]]) box(x - .6, y - .6, z, x + .6, y + .6, z + .02, wm);
  for (const [x, y, z] of [[.08, 1.7, 3], [.08, 4.7, 2], [11.92, 4.7, 3]]) box(x, y - .6, z - .6, x + .02, y + .6, z + .6, wm);
  // lights (kept few: forward renderer)
  scene.add(new T.AmbientLight(0x5a68a8, .42)); scene.add(new T.HemisphereLight(0x7080c0, 0x1c1830, .3));
  light('living', 0x7fb0ff, .9, 3.3, 1.3, 1.3, 8); light('kitchen', 0xffe2b8, .9, 9.5, 1.9, 1.4, 8); light('foyer', 0xffd9a8, .7, 3, 1.2, 8, 9);
  light('hall', 0xffd9a8, .7, 6, 4.3, 7.2, 9); light('yours', 0xffc98a, .7, 2.6, 4.4, 3, 8); light('mom', 0xffb070, .7, 10.4, 3.9, 3.2, 8);
  light('outside', 0xffd8a0, 1.2, 4, 5, 18, 20);
  const porch = light('porch', 0xfff2cc, 0, 2, 3, 11, 14); const pcl = light('pc', 0xff44ff, 0, 1, 1.3, 4.6, 6); const phone = light('phone', 0x88bbff, 0, 0, 0, 0, 4); const lamp = light('lamp', 0xffe0a0, 0, 10.4, 5, 3, 12);

  // people
  const moms = { bed: sleeper(0x8a5a9a), couch: sleeper(0x5a8a7a) };
  moms.bed.position.set(10.5, 3.55, 1.3); scene.add(moms.bed); moms.couch.position.set(3.3, .5, 3.05); moms.couch.scale.set(1.05, 1.05, 1.05); scene.add(moms.couch);
  const sam = person(0x3a8a5a, { hair: 0x222222 }), driver = person(0xe0a030, { cap: 0x2a2a2a, bag: true }), biscuit = dog();
  sam.visible = driver.visible = false; scene.add(sam, driver); biscuit.position.set(14.55, .1, 2.7); scene.add(biscuit);
  const hit = []; // reserved
  return { scene, colliders, doors, creaks, rugs, rooms, lights, STAIR, moms, sam, driver, biscuit, tv: tvScreen, mw: mwClock, rgb, monScreen, pcl, porch, phone, lamp, microwave, hit,
    floorY(x, z, y) { const s = STAIR; if (x > s.x1 && x < s.x2 && z > s.z1 && z < s.z2) return Math.max(0, Math.min(3, (x - 5) * .5)); return y > 1.5 ? 3 : 0; },
    roomAt(x, z, y) { const lv = y > 1.5 ? 1 : 0; for (const r of rooms) if (x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2 && (r.lv === 2 || r.lv === lv)) return r; return { name: 'Outside', surf: 'conc' }; },
    surfaceAt(x, z, y) {
      const lv = y > 1.5 ? 1 : 0, r = this.roomAt(x, z, y), s = this.STAIR;
      if (r.surf === 'stairs') { const i = Math.floor((x - 5) / .4) + 1; return { name: `Wooden stairs, step #${i}`, base: 34, creak: i === 4 ? 2 : i === 11 ? 1 : 0, step: i }; }
      for (const g of rugs) if (g.lv === lv && x >= g.x1 && x <= g.x2 && z >= g.z1 && z <= g.z2) return { name: 'Rug / carpet (quiet)', base: 20, creak: 0 };
      for (const c of creaks) if (c.lv === lv && x >= c.x1 && x <= c.x2 && z >= c.z1 && z <= c.z2) return { name: 'Hardwood (worn boards)', base: 34, creak: c.sev };
      return r.surf === 'carpet' ? { name: 'Carpet (quiet)', base: 22, creak: 0 } : r.surf === 'tile' ? { name: 'Tile (clacky)', base: 30, creak: 0 } : r.surf === 'conc' ? { name: 'Concrete / stone', base: 30, creak: 0 } : { name: 'Hardwood floor', base: 33, creak: 0 };
    } };
})();
