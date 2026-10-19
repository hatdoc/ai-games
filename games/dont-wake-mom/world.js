// The house: two floors with real windows, moonlight and shadows, procedural PBR-style textures, detailed rooms and props,
// hinged/sliding doors, creak zones, Mom, Sam, the driver and the dog. Units are meters: x = east, z = south, y = up.
// The upper floor is at y = 3. Stairs climb along +x at z 8.4-9.8.
const World = (() => {
  const T = THREE, scene = new T.Scene(), LOW = matchMedia('(pointer:coarse)').matches;
  const L = (hex) => new T.Color(hex).convertSRGBToLinear(); // author in sRGB hex, render in linear
  scene.background = L(0x04060f); scene.fog = new T.FogExp2(L(0x080c1c), .022);
  const colliders = [], doors = {}, creaks = [], rugs = [], rooms = [], lights = {};
  const STAIR = { x1: 5, x2: 11, z1: 8.4, z2: 9.8 };
  const rn = Math.random;

  // ---------- procedural textures ----------
  const cv = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };
  const woodC = (h, s, l, planks = 8, size = 512, k = 1) => cv(size, size, (g, w, hh) => {
    const ph = hh / planks;
    for (let i = 0; i < planks; i++) {
      const y = i * ph; g.fillStyle = `hsl(${h + rn() * 5 - 2},${s}%,${l + rn() * 9 - 4}%)`; g.fillRect(0, y, w, ph);
      for (let n = 0; n < 30; n++) { const gy = y + rn() * ph; g.strokeStyle = `rgba(${rn() < .55 ? '0,0,0' : '255,225,180'},${(.03 + rn() * .06) * k})`; g.lineWidth = 1.5 + rn() * 1.5; g.beginPath(); g.moveTo(0, gy);
        for (let x = 0; x <= w; x += 24) g.lineTo(x, gy + Math.sin(x * .02 + n) * 1.6 + (rn() - .5)); g.stroke(); }
      if (rn() < .5) { const kx = rn() * w, ky = y + ph / 2; for (let r = 7; r > 0; r--) { g.strokeStyle = 'rgba(40,20,5,.09)'; g.beginPath(); g.ellipse(kx, ky, r * 3.2, r * 1.3, 0, 0, 7); g.stroke(); } }
      g.fillStyle = `rgba(0,0,0,${.35 * k})`; g.fillRect(rn() * w, y, 2, ph); g.fillStyle = `rgba(0,0,0,${.5 * k})`; g.fillRect(0, y, w, 3);
    }
  });
  const noiseC = (base, n = 2500, size = 256, a = .08, sz = 2) => cv(size, size, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${rn() < .5 ? '255,255,255' : '0,0,0'},${rn() * a})`; g.fillRect(rn() * w, rn() * h, sz, sz); } });
  const TEX = {
    floorW: woodC(27, 40, 34, 8, 512, 1), floorD: woodC(24, 28, 34, 2, 256, .6), floorL: woodC(30, 34, 46, 8, 512, 1), paint: noiseC('#dcdcdc', 3000, 256, .025, 1), ceil: noiseC('#e6e6e6', 3000, 256, .04),
    carpet: cv(256, 256, (g, w, h) => { g.fillStyle = '#d2d2d6'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { g.strokeStyle = `rgba(${rn() < .5 ? '255,255,255' : '0,0,20'},${rn() * .035})`; g.lineWidth = 1; g.beginPath(); const x = rn() * w, y = rn() * h; g.moveTo(x, y); g.lineTo(x + rn() * 3 - 1.5, y + rn() * 3 - 1.5); g.stroke(); } }),
    tile: cv(512, 512, (g, w, h) => { const n = 4, s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const l = 78 + rn() * 5; g.fillStyle = `hsl(220,6%,${l}%)`; g.fillRect(i * s, j * s, s, s); }
      g.fillStyle = '#6a6d76'; for (let i = 0; i <= n; i++) { g.fillRect(i * s - 3, 0, 6, h); g.fillRect(0, i * s - 3, w, 6); } }),
    grass: noiseC('#27432e', 6000, 256, .14, 3), conc: cv(256, 256, (g, w, h) => { g.fillStyle = '#80838f'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(0,0,0,${rn() * .09})`; g.fillRect(rn() * w, rn() * h, 3, 3); } g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h); }),
    asphalt: noiseC('#2d2f38', 5000, 256, .12, 2), brick: cv(256, 256, (g, w, h) => { g.fillStyle = '#6a3a30'; g.fillRect(0, 0, w, h); for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) { g.fillStyle = `hsl(${8 + rn() * 6},${35 + rn() * 10}%,${28 + rn() * 8}%)`; g.fillRect(c * 64 + (r % 2) * 32 + 2, r * 32 + 2, 60, 28); } }),
  };
  const fabricC = (hex) => cv(128, 128, (g, w, h) => { g.fillStyle = '#' + hex.toString(16).padStart(6, '0'); g.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${rn() < .5 ? '255,255,255' : '0,0,0'},${rn() * .03})`; g.fillRect(rn() * w, rn() * h, 3, 3); } });
  const tx = (c, rx, ry, srgb = true) => { const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = LOW ? 2 : 8; if (srgb) t.encoding = T.sRGBEncoding; return t; };
  const pbr = (c, rx, ry, o = {}) => { const m = new T.MeshStandardMaterial({ map: tx(c, rx, ry), bumpMap: tx(c, rx, ry, false), bumpScale: (o.bump ?? 1) * .2, color: L(o.tint ?? 0xffffff), roughness: o.rough ?? .85, metalness: o.metal ?? 0 }); if (o.tile) m.userData.tile = o.tile; return m; };
  const mc = {}, cached = (k, f) => (mc[k] ??= f());
  const M = (hex, o = {}) => cached('M' + hex + JSON.stringify(o), () => new T.MeshStandardMaterial({ color: L(hex), roughness: .8, metalness: 0, ...o }));
  const fab = (hex, rough = .95) => cached('F' + hex + rough, () => pbr(fabricC(hex), 1, 1, { rough, bump: .4, tile: 1.0 }));
  const glowM = (hex) => new T.MeshBasicMaterial({ color: L(hex).multiplyScalar(2.4) });
  const trimM = M(0xf4f1ea, { roughness: .45 }), steel = M(0xc6ccd6, { roughness: .5, metalness: .05 }), blackM = M(0x101218, { roughness: .4 }), chrome = M(0xe6eaf2, { roughness: .35, metalness: .1 });
  const skinM = M(0xe0b090, { roughness: .6 }), wood = (tint = 0x9a7a58) => cached('W' + tint, () => pbr(TEX.floorD, 1, 1, { tint, rough: .55, bump: .15, tile: 1.6 })), ceramic = M(0xf0f0f0, { roughness: .25 });
  const paints = {}, paint = (tint) => (paints[tint] ??= pbr(TEX.paint, 1, 1, { tint, rough: .92, bump: .02, tile: 1.4 }));

  // ---------- geometry helpers ----------
  const fin = (m) => { m.updateMatrix(); m.matrixAutoUpdate = false; return m; };
  function put(m, o = {}) { if (o.parent) { o.parent.add(m); return m; } m.castShadow = !o.small; m.receiveShadow = true; scene.add(m); return fin(m); }
  function box(x1, y1, z1, x2, y2, z2, m, o = {}) {
    const bw = x2 - x1, bh = y2 - y1, bd = z2 - z1, geo = new T.BoxGeometry(bw, bh, bd), k = m.userData && m.userData.tile;
    if (k) { const uv = geo.attributes.uv, dims = [[bd, bh], [bd, bh], [bw, bd], [bw, bd], [bw, bh], [bw, bh]]; for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const n = f * 4 + i; uv.setXY(n, uv.getX(n) * dims[f][0] / k, uv.getY(n) * dims[f][1] / k); } }
    const g = new T.Mesh(geo, m); g.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2); return put(g, o); }
  function cyl(x, y, z, rt, rb, h, m, o = {}) { const g = new T.Mesh(new T.CylinderGeometry(rt, rb, h, o.seg || 16), m); g.position.set(x, y + h / 2, z); if (o.rx) g.rotation.x = o.rx; if (o.rz) g.rotation.z = o.rz; return put(g, o); }
  function sph(x, y, z, r, m, o = {}) { const g = new T.Mesh(new T.SphereGeometry(r, o.seg || 14, 10), m); g.position.set(x, y, z); if (o.s) g.scale.set(...o.s); return put(g, o); }
  function rbox(cx, cy, cz, w, h, d, r, m, o = {}) { // rounded box
    const s = new T.Shape(), a = Math.max(.001, w - 2 * r) / 2, b = Math.max(.001, h - 2 * r) / 2; s.moveTo(-a, -b); s.lineTo(a, -b); s.lineTo(a, b); s.lineTo(-a, b); s.closePath();
    const g = new T.ExtrudeGeometry(s, { depth: Math.max(.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, curveSegments: 2 }); g.translate(0, 0, -(d - 2 * r) / 2);
    const mesh = new T.Mesh(g, m); mesh.position.set(cx, cy, cz); return put(mesh, o);
  }
  function plane(x, y, z, w, h, m, ry = 0, o = {}) { const g = new T.Mesh(new T.PlaneGeometry(w, h), m); g.position.set(x, y, z); g.rotation.y = ry; return put(g, { small: true, ...o }); }
  const col = (x1, x2, z1, z2, lv = 0, extra = {}) => { const c = { x1, x2, z1, z2, lv, ...extra }; colliders.push(c); return c; };
  const room = (name, x1, x2, z1, z2, lv, surf) => rooms.push({ name, x1, x2, z1, z2, lv, ...surf });
  function light(key, color, int, x, y, z, range = 9, decay = 2) { const l = new T.PointLight(L(color), int, range, decay); l.position.set(x, y, z); scene.add(l); lights[key] = l; return l; }
  function floor(x1, z1, x2, z2, y, tex, tint, rough = .55) { box(x1, y - .12, z1, x2, y, z2, pbr(tex, 1, 1, { tint, rough, bump: tex === TEX.tile ? 1 : .25, tile: tex === TEX.tile ? 2 : tex === TEX.conc ? 1.5 : 1.1 }), { small: y < 1 }); }
  function ceil(x1, z1, x2, z2, y) { box(x1, y - .04, z1, x2, y, z2, pbr(TEX.ceil, 1, 1, { tint: 0xf0ece4, rough: 1, bump: .05, tile: 2 }), { small: true }); }
  function rug(x1, z1, x2, z2, lv, tint, pattern) { const m = pbr(pattern || TEX.carpet, 1, 1, { tint, rough: 1, bump: .8, tile: 1.2 }); box(x1, lv * 3, z1, x2, lv * 3 + .025, z2, m, { small: true }); rugs.push({ x1, x2, z1, z2, lv }); }
  const creak = (x1, x2, z1, z2, lv, sev) => { // slightly darker, worn boards
    creaks.push({ x1, x2, z1, z2, lv, sev }); box(x1, lv * 3 + .004, z1, x2, lv * 3 + .01, z2, new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: sev > 1 ? .3 : .16, depthWrite: false }), { small: true }).castShadow = false;
  };
  const glassM = new T.MeshStandardMaterial({ color: L(0x8fb0e0), transparent: true, opacity: .1, roughness: .05, metalness: .2, depthWrite: false });
  const curtM = (hex) => fab(hex, .98);
  const frame = (x, y, z, w, h, ry, art) => { // framed picture on a wall
    const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = ry; scene.add(g);
    g.add(new T.Mesh(new T.BoxGeometry(w, h, .04), M(0x2a2018, { roughness: .5 })));
    const p = new T.Mesh(new T.PlaneGeometry(w - .08, h - .08), new T.MeshStandardMaterial({ map: tx(art, 1, 1), roughness: .5 })); p.position.z = .022; g.add(p); fin(g); return g;
  };
  const art = (c1, c2, shape) => cv(128, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.55)'; if (shape === 0) { g.beginPath(); g.arc(w * .68, h * .35, 20, 0, 7); g.fill(); g.beginPath(); g.moveTo(0, h); g.lineTo(w * .4, h * .5); g.lineTo(w, h); g.fill(); } else if (shape === 1) { for (let i = 0; i < 6; i++) g.fillRect(14 + i * 18, h - 20 - i * 14, 12, 20 + i * 14); } else { g.beginPath(); g.arc(w / 2, h / 2, 36, 0, 7); g.lineWidth = 8; g.strokeStyle = 'rgba(255,255,255,.6)'; g.stroke(); } });

  // ---------- walls with doorways, open passes and real windows ----------
  // gaps: {at, w, y0, y1, kind: 'door' | 'open' | 'win'} measured along the wall
  function wall(x1, z1, x2, z2, lv, gaps = [], tint = 0xcdc8bf) {
    const ax = z1 === z2, a = Math.min(ax ? x1 : z1, ax ? x2 : z2), b = Math.max(ax ? x1 : z1, ax ? x2 : z2), c = ax ? z1 : x1, y0 = lv * 3, t = .14, pm = paint(tint);
    const gs = gaps.map((g) => ({ g0: g.at - g.w / 2, g1: g.at + g.w / 2, y0: g.y0 ?? 0, y1: g.y1 ?? (g.kind === 'open' ? 2.4 : 2.15), kind: g.kind || 'door' })).sort((p, q) => p.g0 - q.g0);
    const slab = (s0, s1, ya, yb, hit, m = pm) => {
      if (ax) { box(s0, y0 + ya, c - t / 2, s1, y0 + yb, c + t / 2, m, { small: false }); if (hit) col(s0, s1, c - t / 2 - .02, c + t / 2 + .02, lv); }
      else { box(c - t / 2, y0 + ya, s0, c + t / 2, y0 + yb, s1, m, { small: false }); if (hit) col(c - t / 2 - .02, c + t / 2 + .02, s0, s1, lv); }
    };
    const trim = (s0, s1, ya, yb, m = trimM, ex = .035) => { if (ax) box(s0, y0 + ya, c - t / 2 - ex, s1, y0 + yb, c + t / 2 + ex, m, { small: true }); else box(c - t / 2 - ex, y0 + ya, s0, c + t / 2 + ex, y0 + yb, s1, m, { small: true }); };
    const segs = []; let cur = a; for (const g of gs) { if (g.g0 > cur) segs.push([cur, g.g0]); cur = g.g1; } if (cur < b) segs.push([cur, b]);
    for (const [s0, s1] of segs) { slab(s0, s1, 0, 3, true); trim(s0, s1, 0, .12); }
    for (const g of gs) {
      slab(g.g0, g.g1, g.y1, 3, false);
      if (g.y0 > 0) { slab(g.g0, g.g1, 0, g.y0, true); }
      if (g.kind === 'door') { trim(g.g0 - .07, g.g0, 0, g.y1 + .07); trim(g.g1, g.g1 + .07, 0, g.y1 + .07); trim(g.g0 - .07, g.g1 + .07, g.y1, g.y1 + .07); }
      if (g.kind === 'win') {
        const w = g.g1 - g.g0, mid = (g.g0 + g.g1) / 2, hy = (g.y0 + g.y1) / 2, wy = g.y1 - g.y0;
        if (ax) { const gl = new T.Mesh(new T.PlaneGeometry(w, wy), glassM); gl.position.set(mid, y0 + hy, c); fin(gl); scene.add(gl); } else { const gl = new T.Mesh(new T.PlaneGeometry(w, wy), glassM); gl.position.set(c, y0 + hy, mid); gl.rotation.y = Math.PI / 2; fin(gl); scene.add(gl); }
        trim(g.g0 - .05, g.g1 + .05, g.y0 - .03, g.y0 + .02, trimM, .1); trim(g.g0 - .04, g.g0 + .02, g.y0, g.y1, trimM, .05); trim(g.g1 - .02, g.g1 + .04, g.y0, g.y1, trimM, .05);
        trim(g.g0, g.g1, g.y1 - .03, g.y1 + .03, trimM, .05); trim(mid - .015, mid + .015, g.y0, g.y1, trimM, .03); trim(g.g0, g.g1, hy - .015, hy + .015, trimM, .03);
        const side = (lv === 0 ? 1 : 1); // curtains hang on the inside face; windows are on outer walls, so their side is derived from the wall position
        const inward = ax ? (c < 5 ? 1 : -1) : (c < 6 ? 1 : -1), cm = curtM(tint === 0xc9b7d6 ? 0x8a6f9a : 0x6a7fa8);
        const cw = .42; for (const sx of [g.g0 - .02, g.g1 - cw + .02]) { if (ax) box(sx, y0 + g.y0 - .25, c + inward * .1, sx + cw, y0 + g.y1 + .35, c + inward * .16, cm, { small: true }); else box(c + inward * .1, y0 + g.y0 - .25, sx, c + inward * .16, y0 + g.y1 + .35, sx + cw, cm, { small: true }); }
        trim(g.g0 - .25, g.g1 + .25, g.y1 + .33, g.y1 + .36, steel, .12);
        if (ax) col(g.g0, g.g1, c - t / 2 - .02, c + t / 2 + .02, lv); else col(c - t / 2 - .02, c + t / 2 + .02, g.g0, g.g1, lv);
      }
    }
  }

  // ---------- doors, cabinet doors, sliders ----------
  // v is openness 0..1. pass = openness at which the player fits through; sq = hinge squeak zone.
  function mover(o) {
    const g = new T.Group(); g.position.set(o.x, o.y || 0, o.z); scene.add(g);
    const th = o.hinge ? Math.atan2(-o.dir[1], o.dir[0]) : 0, t = o.t || .05, d = { ...o, g, th, v: o.v0 || 0, last: o.v0 || 0, acc: 0 }, mat = o.mat || wood(0xb08a60);
    const leaf = box(0, 0, -t / 2, o.len, o.h, t / 2, mat, { parent: g }); leaf.castShadow = true; leaf.receiveShadow = true;
    if (o.panels) for (const [x1, y1, x2, y2] of o.panels) for (const sz of [1, -1]) { const p = box(x1, y1, sz * (t / 2 + .004) - .004, x2, y2, sz * (t / 2 + .004) + .004, M(0x8f6e4a, { roughness: .6 }), { parent: g }); p.receiveShadow = true; }
    if (o.knob !== false) for (const sz of [1, -1]) { box(o.len - .11, o.h * .46, sz * (t / 2 + .005) - .003, o.len - .07, o.h * .46 + .14, sz * (t / 2 + .005) + .003, steel, { parent: g }); const lv = new T.Mesh(new T.CylinderGeometry(.01, .01, .1, 8), chrome); lv.rotation.z = Math.PI / 2; lv.position.set(o.len - .13, o.h * .46 + .02, sz * (t / 2 + .045)); g.add(lv); }
    d.apply = () => {
      if (o.hinge) g.rotation.y = th + o.s * d.v * o.amax;
      else { g.rotation.y = o.rot || 0; g.position.set(o.x + o.axis[0] * d.v * o.dist, o.y || 0, o.z + o.axis[1] * d.v * o.dist); }
    };
    d.apply(); doors[o.id] = d; return d;
  }
  const doorPanels = (len, h) => [[.12, .15, len - .12, h * .45 - .05], [.12, h * .45 + .08, len - .12, h - .15]];
  const hingeDoor = (id, name, x, z, dir, s, lv, len = .95, extra = {}) => mover({ id, name, hinge: true, x, z, y: lv * 3, dir, s, len, h: 2.1, amax: 1.9, pass: .45 / 1.9, sq: [.47, .68], base: 24, panels: doorPanels(len, 2.1), ...extra });

  // ---------- people & props ----------
  const capsule = (r, l) => (T.CapsuleGeometry ? new T.CapsuleGeometry(r, l, 4, 10) : new T.CylinderGeometry(r, r * .9, l + 2 * r, 12));
  const person = (colr, o = {}) => {
    const g = new T.Group(), cm = fab(colr, .9), lg = M(0x252b45, { roughness: .8 });
    const torso = new T.Mesh(capsule(.2, .45), cm); torso.position.y = 1.12; torso.scale.z = .65; g.add(torso);
    for (const sx of [-1, 1]) {
      const leg = new T.Mesh(new T.CylinderGeometry(.075, .065, .82, 10), lg); leg.position.set(sx * .09, .41, 0); g.add(leg);
      const arm = new T.Mesh(new T.CylinderGeometry(.055, .05, .56, 10), cm); arm.position.set(sx * .29, 1.08, 0); arm.rotation.z = sx * .08; g.add(arm);
      const hand = new T.Mesh(new T.SphereGeometry(.05, 8, 8), skinM); hand.position.set(sx * .31, .78, 0); g.add(hand);
      const shoe = new T.Mesh(new T.BoxGeometry(.09, .06, .22), M(0xeeeeee)); shoe.position.set(sx * .09, .03, .04); g.add(shoe);
    }
    const head = new T.Mesh(new T.SphereGeometry(.125, 14, 12), skinM); head.position.y = 1.64; g.add(head);
    const hair = new T.Mesh(new T.SphereGeometry(.13, 12, 10, 0, 6.3, 0, 1.5), M(o.hair ?? 0x2a1c14)); hair.position.y = 1.655; g.add(hair);
    if (o.cap) { const c = new T.Mesh(new T.CylinderGeometry(.13, .14, .08, 12), M(o.cap)); c.position.y = 1.74; g.add(c); const br = new T.Mesh(new T.BoxGeometry(.18, .02, .14), M(o.cap)); br.position.set(0, 1.71, .15); g.add(br); }
    if (o.bag) { const b = new T.Mesh(new T.BoxGeometry(.2, .26, .12), M(0xe8d9b8)); b.position.set(.33, .66, .06); b.name = 'bag'; g.add(b); }
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; }); return g;
  };
  const sleeper = (blanket) => { // Mom, asleep and cozy under a blanket (lying along x, head at -x)
    const g = new T.Group(), up = new T.Group(); g.add(up);
    const pil = new T.Mesh(new T.SphereGeometry(.28, 14, 10), fab(0xf2efe6)); pil.scale.set(1, .35, 1.1); pil.position.set(-.78, .06, 0); up.add(pil);
    const head = new T.Mesh(new T.SphereGeometry(.115, 14, 12), skinM); head.position.set(-.74, .2, 0); up.add(head);
    const hair = new T.Mesh(new T.SphereGeometry(.12, 12, 10, 0, 6.3, 0, 1.7), M(0x3a2618)); hair.position.set(-.77, .215, 0); hair.rotation.z = .5; up.add(hair);
    const sh = new T.Mesh(new T.SphereGeometry(.2, 12, 10), fab(blanket)); sh.scale.set(.8, .5, 1.5); sh.position.set(-.5, .12, 0); up.add(sh);
    const body = rbox(.2, .13, 0, 1.3, .22, .66, .08, fab(blanket), { parent: g }); g.add(body); g.body = body; g.up = up;
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; }); return g;
  };
  const dog = () => {
    const g = new T.Group(), m = M(0xb8844e, { roughness: .9 }), dk = M(0x4a2e1a);
    const body = new T.Mesh(capsule(.14, .38), m); body.rotation.z = Math.PI / 2; body.position.y = .26; g.add(body);
    const hd = new T.Mesh(new T.SphereGeometry(.12, 10, 8), m); hd.position.set(.36, .36, 0); g.add(hd);
    const sn = new T.Mesh(new T.BoxGeometry(.12, .08, .1), m); sn.position.set(.47, .32, 0); g.add(sn); const ns = new T.Mesh(new T.SphereGeometry(.025, 6, 6), blackM); ns.position.set(.53, .34, 0); g.add(ns);
    for (const sz of [-1, 1]) { const ear = new T.Mesh(new T.BoxGeometry(.06, .12, .05), dk); ear.position.set(.32, .43, sz * .1); ear.rotation.x = sz * .3; g.add(ear); for (const sx of [-.2, .2]) { const lg = new T.Mesh(new T.CylinderGeometry(.04, .04, .2, 6), m); lg.position.set(sx, .1, sz * .09); g.add(lg); } }
    const tail = new T.Group(); tail.position.set(-.34, .34, 0); const tl = new T.Mesh(new T.CylinderGeometry(.025, .018, .3, 6), m); tl.rotation.z = Math.PI / 2; tl.position.x = -.15; tail.add(tl); g.add(tail); g.tail = tail;
    g.traverse((x) => { if (x.isMesh) x.castShadow = true; }); return g;
  };

  // ======================= BUILD THE HOUSE =======================
  // floors, ceilings, roof
  floor(0, 0, 7, 6, 0, TEX.floorW, 0xffffff); floor(7, 0, 12, 6, 0, TEX.tile, 0xe8eaf0, .3); floor(0, 6, 12, 10, 0, TEX.floorL, 0xffffff);
  floor(0, 0, 5.5, 6, 3, TEX.carpet, 0x8e9bc4, 1); floor(5.5, 0, 7, 6, 3, TEX.tile, 0xe8eaf0, .3); floor(7, 0, 12, 6, 3, TEX.floorW, 0xffffff);
  floor(0, 6, 5, 10, 3, TEX.floorL, 0xffffff); floor(5, 6, 12, 8.4, 3, TEX.floorL, 0xffffff); floor(11, 8.4, 12, 10, 3, TEX.floorL, 0xffffff);
  ceil(0, 0, 7, 6, 2.88); ceil(7, 0, 12, 6, 2.88); ceil(0, 6, 5, 10, 2.88); ceil(5, 6, 12, 8.4, 2.88); ceil(11, 8.4, 12, 10, 2.88); ceil(0, 0, 12, 10, 6);
  box(-.4, 6, -.4, 12.4, 6.25, 10.4, M(0x2a2e40), { small: false });
  // outside
  box(-40, -.4, -40, 50, -.02, 50, pbr(TEX.grass, 1, 1, { rough: 1, bump: 1.2, tile: 5 }), { small: true });
  floor(0, 10, 4, 13, 0, TEX.conc, 0xffffff, .8); floor(12, 1, 17, 6.5, 0, TEX.conc, 0xffffff, .8); floor(1, 13, 3, 24.5, 0, TEX.conc, 0xffffff, .8);
  box(-40, -.02, 24.5, 50, 0, 29, pbr(TEX.asphalt, 1, 1, { rough: .9, tile: 5 }), { small: true });
  box(-40, 0, 24.45, 50, .01, 24.55, M(0xe0d080), { small: true });
  // walls: bedrooms, hall, stairs. Windows face the moon so it throws bright patches on the floors.
  const WIN = (at, w = 1.2, y0 = .9, y1 = 2.15) => ({ at, w, y0, y1, kind: 'win' });
  for (const lv of [0, 1]) wall(5, 8.4, 11, 8.4, lv, [], 0xcdc8bf);
  wall(0, 0, 12, 0, 0, [WIN(5.8)], 0x9fb2c9); wall(12, 0, 12, 10, 0, [{ at: 3.5, w: 1.7, kind: 'door' }, WIN(5.3, 1.1)], 0xd6cdb8);
  wall(0, 0, 0, 10, 0, [WIN(4.5, 1.4, 1, 2.2), WIN(8.2, 1.0)], 0x9fb2c9); wall(0, 10, 12, 10, 0, [{ at: 2, w: 1.05, kind: 'door' }, WIN(7.6, 1.3, .9, 2.2), WIN(10.6, 1.0, 1.0, 2.2)], 0xcdc8bf);
  wall(0, 0, 12, 0, 1, [WIN(4.3, 1.3), WIN(10.4, 1.3)], 0x9db4d6); wall(0, 0, 0, 10, 1, [WIN(3.5, 1.2), WIN(8, 1.1)], 0x9db4d6);
  wall(12, 0, 12, 10, 1, [WIN(3.3, 1.2), WIN(8, 1.1)], 0xc9b7d6); wall(0, 10, 12, 10, 1, [WIN(2.5, 1.2), WIN(8, 1.4, .9, 2.3)], 0xcdc8bf);
  wall(7, 0, 7, 6, 0, [{ at: 3, w: 3.2, kind: 'open' }], 0xd6cdb8); wall(0, 6, 7, 6, 0, [{ at: 3.5, w: 2.6, kind: 'open' }], 0xcdc8bf); wall(7, 6, 12, 6, 0, [{ at: 9.5, w: 2.4, kind: 'open' }], 0xcdc8bf);
  wall(0, 6, 12, 6, 1, [{ at: 2.5, w: 1.05 }, { at: 9.5, w: 1.05 }], 0xcdc8bf); wall(5.5, 0, 5.5, 6, 1, [], 0x9db4d6); wall(7, 0, 7, 6, 1, [], 0xc9b7d6);
  wall(5, 8.4, 5, 10, 1, [], 0xcdc8bf);
  // doors: your room, Mom's, front, patio, kitchen cabinet, nightstand drawer
  const dY = hingeDoor('yours', 'your bedroom door', 2.0, 6, [1, 0], 1, 1), dM = hingeDoor('mom', "Mom's door", 9.0, 6, [1, 0], 1, 1);
  const dF = hingeDoor('front', 'front door', 1.5, 10, [1, 0], 1, 0, 1.05, { mat: wood(0x6a4430), base: 28, panels: doorPanels(1.05, 2.1) });
  const dP = mover({ id: 'patio', name: 'patio door', x: 11.88, z: 2.65, y: 0, len: 1.7, h: 2.1, rot: -Math.PI / 2, axis: [0, -1], dist: 1.5, pass: .5, base: 28, mat: new T.MeshStandardMaterial({ color: L(0x88a8d0), transparent: true, opacity: .25, roughness: .1, metalness: .3 }), knob: false });
  box(11.85, 0, 2.62, 11.95, 2.1, 2.7, steel, { small: true }); box(11.85, 0, 4.3, 11.95, 2.1, 4.38, steel, { small: true });
  const dC = hingeDoor('cab', 'cabinet', 7.55, .62, [1, 0], -1, 0, .5, { y: 1.5, h: .7, amax: 1.7, pass: .3, base: 22, sq: [.8, .9], mat: wood(0xc9a878), knob: false, panels: null });
  const dD = mover({ id: 'drawer', name: 'nightstand drawer', x: 8.45, y: 3 + .45, z: 1.62, len: .5, h: .2, rot: 0, axis: [0, 1], dist: .34, pass: .8, base: 22, mat: wood(0x9a7a58), knob: false });
  box(0, .06, -.2, .5, .2, 0, wood(0x7a5a38), { parent: dD.g, small: true }); cyl(0, 0, 0, .012, .012, .09, chrome, { parent: dD.g, rz: Math.PI / 2 });
  col(1.5, 2.55, 5.85, 6.15, 1, { door: dY }); col(9.0, 10.05, 5.85, 6.15, 1, { door: dM }); col(1.5, 2.55, 9.85, 10.15, 0, { door: dF }); col(11.85, 12.15, 2.65, 4.35, 0, { door: dP });
  col(10.98, 12.1, 8.4, 10.1, 0);
  // stairs with risers, nosing and a wall-mounted handrail
  const stepM = pbr(TEX.floorD, 1, 1, { tint: 0xb08a60, rough: .5, bump: .4, tile: .6 }), riserM = M(0xeee8da, { roughness: .6 });
  for (let i = 1; i <= 15; i++) { box(5 + (i - 1) * .4, 0, 8.4, 5 + i * .4, i * .2 - .04, 9.8, riserM, { small: true }); box(5 + (i - 1) * .4 - .02, i * .2 - .04, 8.4, 5 + i * .4, i * .2, 9.8, stepM, { small: true }); }
  { const len = Math.hypot(6, 3), rail = new T.Mesh(new T.CylinderGeometry(.025, .025, len, 8), M(0x6a4a30, { roughness: .4 })); rail.rotation.z = Math.PI / 2 + Math.atan(.5); rail.position.set(8, 1.5 + .95, 8.5); put(rail, { small: true }); }
  // rooms (first match wins)
  room('Staircase', 5, 11, 8.4, 9.8, 2, { surf: 'stairs' });
  room('Your Bedroom', 0, 5.5, 0, 6, 1, { surf: 'carpet' }); room('Bathroom', 5.5, 7, 0, 6, 1, { surf: 'tile' }); room("Mom's Bedroom", 7, 12, 0, 6, 1, { surf: 'wood' });
  room('Master Hallway (2nd Floor)', 0, 12, 6, 10, 1, { surf: 'wood' });
  room('Living Room', 0, 7, 0, 6, 0, { surf: 'wood' }); room('Kitchen', 7, 12, 0, 6, 0, { surf: 'tile' }); room('Front Foyer', 0, 12, 6, 10, 0, { surf: 'wood' });
  room('Back Patio', 12, 17, 0, 7, 0, { surf: 'conc' }); room('Front Porch', 0, 4, 10, 14, 0, { surf: 'conc' }); room('Front Path', -5, 8, 14, 30, 0, { surf: 'conc' });
  // rugs & creak zones
  rug(1.2, 3, 4.2, 5.4, 1, 0x6f7faa); rug(8.2, 3.4, 10.6, 5.6, 1, 0xb07a7a); rug(1.4, .6, 5.6, 2.6, 0, 0x7a93b0); rug(.6, 7.4, 3.2, 9.4, 0, 0x9a7a52);
  creak(2.2, 3.2, 3.7, 4.8, 0, 1); creak(1.0, 2.0, 5.0, 6.0, 0, 2); creak(3.6, 4.6, 6.4, 8.4, 0, 1); creak(5.4, 6.6, 6.5, 8, 0, 1);
  creak(3.4, 4.6, 6.2, 8.0, 1, 1); creak(6.4, 7.8, 6.2, 8.2, 1, 2); creak(9.0, 10.4, 6.2, 7.0, 1, 1); creak(11, 11.9, 7.2, 8.3, 1, 1);
  creak(8.2, 9.6, 2.4, 3.4, 1, 2); creak(8.9, 9.8, 1.7, 2.5, 1, 1); creak(10.4, 11.6, 3.4, 5.4, 1, 1); creak(7.3, 8.1, 5.6, 5.95, 1, 1);

  // ---- your bedroom (upper, y0 = 3) ----
  { const Y = 3, bf = wood(0x7a5638), duvet = fab(0x4a6a9a), sheet = fab(0xe8ecf5);
    box(.3, Y + .12, .3, 2.3, Y + .36, 2.4, bf); col(.3, 2.3, .3, 2.4, 1); box(.3, Y + .1, .25, 2.3, Y + .95, .34, bf);
    rbox(1.3, Y + .5, 1.35, 1.95, .26, 2.0, .06, sheet); rbox(1.3, Y + .64, 1.75, 1.96, .22, 1.3, .08, duvet, { small: false });
    rbox(.8, Y + .66, .7, .62, .14, .4, .06, sheet); rbox(1.8, Y + .66, .7, .62, .14, .4, .06, sheet);
    box(3.4, Y + .72, .3, 5.2, Y + .76, 1.0, wood(0x8a6a48)); for (const x of [3.45, 5.1]) box(x, Y, .35, x + .05, Y + .72, .95, M(0x2a2a30)); col(3.4, 5.2, .3, 1.0, 1);
    box(3.9, Y + .76, .5, 4.4, Y + .78, .9, steel, { small: true }); box(3.9, Y + .78, .88, 4.4, Y + 1.2, .9, blackM, { small: true }); // laptop
    cyl(4.9, Y + .76, .5, .03, .05, .02, M(0x222222), { small: true }); cyl(4.9, Y + .78, .5, .012, .012, .3, M(0x333333), { small: true }); sph(4.9, Y + 1.12, .5, .08, glowM(0xffe0a0), { small: true, s: [1, .7, 1] });
    rbox(4.3, Y + .5, 1.45, .45, .06, .45, .02, fab(0x2a3040), { small: true }); box(4.1, Y, 1.25, 4.15, Y + .5, 1.3, M(0x333333), { small: true });
    box(4.6, Y, 3.8, 5.3, Y + 2.0, 5.8, wood(0x6a4e36)); col(4.6, 5.3, 3.8, 5.8, 1); box(4.58, Y + .05, 4.78, 4.6, Y + 1.9, 4.8, M(0x1a1410), { small: true }); cyl(4.56, Y + 1.0, 4.5, .012, .012, .2, chrome, { rx: 0, small: true });
    frame(5.4, Y + 1.7, 2.0, .6, .45, -Math.PI / 2, art('#2b4a7a', '#d8a070', 0)); frame(2.5, Y + 1.8, .09, .5, .4, 0, art('#4a2a5a', '#e0a0a0', 1));
    box(.2, Y + 2.6, .3, .26, Y + 2.62, 2.2, glowM(0xffd8a0), { small: true }); // string lights
  }
  // ---- Mom's room ----
  { const Y = 3, bf = wood(0x5a3a2a), duvet = fab(0x7a5a8a), sheet = fab(0xf1ece4);
    box(9.1, Y + .1, .2, 11.8, Y + .34, 2.4, bf); col(9.1, 11.8, .2, 2.4, 1); box(9.04, Y + .1, .18, 9.16, Y + 1.0, 2.42, bf);
    rbox(10.5, Y + .46, 1.3, 2.6, .24, 2.1, .06, sheet); rbox(10.9, Y + .58, 1.3, 1.6, .2, 2.12, .08, duvet, { small: false });
    box(8.4, Y, 1.0, 9.0, Y + .6, 1.62, wood(0x8a6a48)); col(8.4, 9.0, 1.0, 1.62, 1);
    cyl(8.7, Y + .6, 1.3, .03, .05, .02, M(0xddd8cc), { small: true }); cyl(8.7, Y + .62, 1.3, .012, .012, .22, steel, { small: true }); cyl(8.7, Y + .84, 1.3, .1, .13, .16, glowM(0xffd9a0), { small: true, seg: 14 });
    box(11, Y, 4.3, 11.8, Y + 1.0, 5.8, wood(0x6a4a34)); col(11, 11.8, 4.3, 5.8, 1); box(11.78, Y + 1.1, 4.45, 11.82, Y + 2.1, 5.65, M(0xb8c8d8, { roughness: .08, metalness: .9 }), { small: true });
    box(11, Y + 1.0, 4.4, 11.4, Y + 1.14, 5.7, M(0xe8d9c0), { small: true }); frame(7.7, Y + 1.8, .09, .7, .5, 0, art('#3a5a4a', '#e8d090', 2)); frame(7.1, Y + 1.7, 3.2, .45, .6, Math.PI / 2, art('#7a3a4a', '#e0c0a0', 1));
    box(7.2, Y, 4.5, 7.9, Y + 1.9, 5.9, wood(0x6a4e36)); col(7.2, 7.9, 4.5, 5.9, 1); // wardrobe by the door wall
    box(7.75, Y + .9, 4.4, 7.78, Y + 1.4, 4.42, M(0x1a1410), { small: true });
  }
  // ---- upper hall ----
  { const Y = 3; frame(4.4, Y + 1.6, 6.09, .5, .4, 0, art('#4a6a8a', '#e8c890', 0)); frame(6.2, Y + 1.6, 6.09, .5, .4, 0, art('#8a4a5a', '#f0d0a0', 2)); frame(7.5, Y + 1.6, 6.09, .4, .5, 0, art('#3a5a3a', '#d0e0a0', 1));
    furn(.2, 0, 9.1, .8, .5, 9.8, 0x6a4e36, 1); cyl(.5, Y + .5, 9.45, .12, .09, .22, M(0xc0a070), { seg: 12 }); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; sph(.5 + Math.cos(a) * .1, Y + .85 + (i % 2) * .08, 9.45 + Math.sin(a) * .1, .11, M(0x2f6a3a, { roughness: .8 }), { small: true }); } }
  function furn(x1, y1, z1, x2, y2, z2, color, lv = 0) { box(x1, lv * 3 + y1, z1, x2, lv * 3 + y2, z2, wood(color)); col(x1, x2, z1, z2, lv); }

  // ---- living room ----
  const tvScreen = (() => { const sg = new T.Mesh(new T.PlaneGeometry(1.52, .72), new T.MeshBasicMaterial({ color: L(0x335a99) })); sg.position.set(3.3, 1.02, .305); sg.rotation.y = 0; scene.add(fin(sg)); return sg; })();
  { const sofa = fab(0x6a5a7a), cush = fab(0x7b6a8d);
    box(2.4, 0, .15, 4.2, .55, .6, wood(0x3a2a22)); col(2.4, 4.2, .15, .6, 0); box(2.5, .62, .22, 4.1, 1.42, .3, blackM); box(2.8, .56, .3, 3.8, .6, .45, M(0x1a1c22), { small: true });
    rbox(3.3, .3, 3.05, 3.0, .38, .9, .06, sofa); col(1.8, 4.8, 2.6, 3.5, 0); rbox(3.3, .68, 3.38, 3.0, .44, .22, .08, sofa); rbox(1.95, .5, 3.05, .3, .6, .9, .08, sofa); rbox(4.65, .5, 3.05, .3, .6, .9, .08, sofa);
    for (const x of [2.55, 3.3, 4.05]) rbox(x, .52, 3.0, .72, .12, .7, .05, cush, { small: true });
    rbox(2.1, .7, 3.2, .35, .35, .12, .05, fab(0xd0a050), { small: true }); rbox(4.5, .7, 3.2, .35, .35, .12, .05, fab(0x5aa090), { small: true });
    box(2.6, .38, 1.3, 4.0, .42, 2.0, wood(0x6a4a30)); for (const x of [2.65, 3.9]) for (const z of [1.35, 1.9]) box(x, 0, z, x + .05, .38, z + .05, wood(0x4a3220), { small: true }); col(2.6, 4.0, 1.3, 2.0, 0);
    cyl(3.3, .42, 1.65, .06, .05, .12, M(0x88c0e0, { roughness: .1 }), { small: true }); box(2.8, .42, 1.5, 3.1, .45, 1.8, fab(0xb0704a), { small: true });
    // bookshelf (west wall) with books
    box(.15, 0, .15, .5, 2.2, 3, wood(0x4a3224)); col(.15, .5, .15, 3, 0); for (let s = 0; s < 5; s++) { const sy = .1 + s * .45; box(.18, sy, .2, .5, sy + .025, 2.95, wood(0x6a4a34), { small: true }); let z = .25; while (z < 2.8) { const w = .04 + rn() * .05, h = .22 + rn() * .12; box(.2, sy + .025, z, .46, sy + .025 + h, z + w, M(new T.Color().setHSL(rn(), .4, .35 + rn() * .15).getHex()), { small: true }); z += w + .005; } }
    // gaming desk against the west wall, PC and monitor
    box(.2, .72, 3.7, .9, .76, 5.3, wood(0x2a2a30)); for (const z of [3.75, 5.2]) box(.25, 0, z, .3, .72, z + .05, M(0x1a1a20), { small: true }); col(.2, .9, 3.7, 5.3, 0);
    box(.3, .76, 4.4, .45, .88, 4.6, blackM, { small: true }); box(.3, .86, 4.05, .34, 1.32, 4.95, blackM); box(.3, .76, 4.55, .6, .79, 4.7, M(0x1a1a20), { small: true });
    box(.5, .76, 4.1, .8, .785, 4.45, M(0x15151a), { small: true }); rbox(.55, .79, 4.65, .1, .03, .06, .01, M(0x15151a), { small: true });
    box(.3, .76, 5.0, .75, 1.18, 5.26, M(0x1d1f27, { roughness: .35 })); for (const z of [5.1]) { const f = new T.Mesh(new T.RingGeometry(.04, .075, 20), new T.MeshBasicMaterial({ color: L(0x222222), side: T.DoubleSide })); f.position.set(.52, .97, 5.265); fin(f); scene.add(f); }
    rbox(1.25, .5, 4.5, .5, .08, .5, .03, blackM); box(1.15, .05, 4.4, 1.35, .5, 4.6, M(0x222226), { small: true }); rbox(1.4, .85, 4.5, .08, .7, .46, .04, blackM);
    cyl(5.5, 0, 1.0, .03, .03, 1.6, M(0x222222), { small: true }); cyl(5.5, 1.5, 1.0, .1, .2, .22, M(0xe8dcc0, { emissive: L(0x2a2418) }), { small: true }); // floor lamp
    cyl(6.4, 0, .5, .18, .14, .3, M(0xc07050, { roughness: .8 }), { small: true }); for (let i = 0; i < 6; i++) sph(6.4 + Math.cos(i) * .12, .55 + (i % 3) * .14, .5 + Math.sin(i) * .12, .15, M(0x2f6a3a, { roughness: .85 }), { small: true });
    frame(6.95, 1.6, 2.2, .5, .7, -Math.PI / 2, art('#2a4a5a', '#e0b080', 0));
  }
  const monitor = null, monScreen = (() => { const s = new T.Mesh(new T.PlaneGeometry(.88, .44), new T.MeshBasicMaterial({ color: L(0x223355) })); s.rotation.y = Math.PI / 2; s.position.set(.355, 1.09, 4.5); scene.add(fin(s)); return s; })();
  const rgb = (() => { const s = new T.Mesh(new T.PlaneGeometry(.38, .34), new T.MeshBasicMaterial({ color: L(0x222222), side: T.DoubleSide })); s.rotation.y = Math.PI / 2; s.position.set(.76, .97, 5.13); s.position.x = .755; scene.add(fin(s)); return s; })();
  // ---- kitchen ----
  { const cab = paint(0xd9cfbc), top = M(0x3a3d46, { roughness: .25, metalness: .1 });
    box(7.3, 0, .2, 11, .9, .9, cab); col(7.3, 11, .2, .9, 0); box(7.3, .9, .2, 11, .95, .97, top); for (let x = 7.3; x < 11; x += .62) { box(x + .01, .06, .9, x + .6, .84, .915, paint(0xe6dcc8), { small: true }); cyl(x + .3, .45, .92, .012, .012, .12, chrome, { small: true }); }
    box(7.3, .95, .15, 11, 1.5, .2, pbr(TEX.tile, 1, 1, { tint: 0xf4f6fb, rough: .3, tile: .6 }), { small: true });
    for (const [a, b] of [[7.4, 9.6], [10, 11.7]]) { box(a, 1.5, .15, b, 2.3, .6, paint(0xd9cfbc)); for (let x = a + .02; x < b - .1; x += (b - a) / (b === 9.6 ? 4 : 3)) { box(x, 1.52, .6, x + .5, 2.28, .615, paint(0xe6dcc8), { small: true }); cyl(x + .46, 1.55, .63, .012, .012, .1, chrome, { small: true }); } }
    box(7.8, .95, .3, 8.7, .97, .85, blackM, { small: true }); for (const [bx, bz] of [[8.0, .45], [8.5, .45], [8.0, .72], [8.5, .72]]) cyl(bx, .97, bz, .07, .07, .012, M(0x2a2a30, { roughness: .3, metalness: .6 }), { small: true });
    box(7.8, 1.65, .15, 8.7, 2.0, .5, steel, { small: true }); // hood (under cabinet)
    box(10.55, .93, .3, 11.0, .96, .85, M(0x20232a, { roughness: .2, metalness: .5 }), { small: true }); cyl(10.78, .96, .22, .014, .014, .3, chrome, { small: true });
    box(11, 0, 1.0, 11.8, 1.85, 1.8, steel); col(11, 11.8, 1.0, 1.8, 0); box(10.98, 1.1, 1.05, 11, 1.2, 1.1, M(0x9aa0aa), { small: true }); box(10.98, .1, 1.7, 11, 1.8, 1.72, M(0x8a909a), { small: true }); box(10.975, .25, 1.12, 11.0, 1.7, 1.17, chrome, { small: true });
    box(8.3, 0, 2.4, 10.7, .92, 3.3, cab); col(8.3, 10.7, 2.4, 3.3, 0); box(8.2, .92, 2.3, 10.8, .97, 3.4, M(0xe6e2dc, { roughness: .2 }));
    for (const x of [8.8, 9.5, 10.2]) { cyl(x, 0, 3.7, .17, .17, .02, M(0x2a2a30), { small: true }); cyl(x, .02, 3.7, .02, .02, .55, M(0x3a3a40), { small: true }); cyl(x, .57, 3.7, .17, .17, .06, fab(0xa04a3a), { small: true }); }
    sph(9.4, 1.04, 2.85, .12, M(0xc84a2a, { roughness: .4 }), { small: true }); sph(9.6, 1.03, 2.9, .11, M(0xe0b030, { roughness: .4 }), { small: true }); cyl(9.5, .97, 2.85, .2, .12, .05, M(0xd8d0c0, { roughness: .3 }), { small: true });
    box(9.2, .95, .25, 9.9, 1.22, .75, M(0x23252c, { roughness: .35 })); box(9.22, .98, .745, 9.62, 1.19, .755, M(0x0a0d14, { roughness: .1, metalness: .4 }), { small: true });
    cyl(10.32, .95, .55, .09, .11, .24, steel, { small: true }); cyl(10.32, 1.19, .55, .07, .09, .03, blackM, { small: true }); cyl(10.2, 1.0, .55, .012, .012, .14, blackM, { small: true, rz: 1.2 });
    const clock = new T.Mesh(new T.CircleGeometry(.16, 24), M(0xf4f1ea, { roughness: .4 })); clock.position.set(10.9, 2.05, .1); fin(clock); scene.add(clock);
    furn(7.4, 0, 4.9, 8.2, .8, 5.9, 0x7a6a5a);
  }
  const mwClock = (() => { const m = new T.Mesh(new T.PlaneGeometry(.09, .05), new T.MeshBasicMaterial({ color: L(0x44ff88).multiplyScalar(2.2) })); m.position.set(9.77, 1.08, .756); scene.add(fin(m)); return m; })();
  // ---- foyer ----
  { box(4.2, 0, 6.2, 4.9, .8, 6.9, wood(0x6a4a30)); col(4.2, 4.9, 6.2, 6.9, 0); box(4.2, .8, 6.15, 4.9, .84, 6.95, wood(0x7a5a3a), { small: true });
    cyl(4.55, .84, 6.55, .05, .06, .02, M(0xddd8cc), { small: true }); cyl(4.55, .86, 6.55, .015, .015, .26, steel, { small: true }); cyl(4.55, 1.12, 6.55, .1, .13, .16, M(0xf0e4c8, { emissive: L(0x6a5030) }), { small: true });
    frame(4.55, 1.55, 6.09, .6, .8, 0, art('#d8e0f0', '#8a9ab8', 2)).children[1].material.metalness = .8;
    box(.2, 0, 6.2, 1, .5, 6.6, wood(0x3a3a44)); col(.2, 1, 6.2, 6.6, 0); for (let i = 0; i < 3; i++) { box(.3 + i * .22, .1, 6.25, .48 + i * .22, .18, 6.55, M(0x20242c), { small: true }); box(.3 + i * .22, .28, 6.25, .48 + i * .22, .36, 6.55, M(0x3a2a22), { small: true }); }
    for (let i = 0; i < 3; i++) { cyl(.3 + i * .22, 1.5, 6.12, .015, .015, .06, steel, { small: true, rx: Math.PI / 2 }); box(.22 + i * .22, .7, 6.1, .38 + i * .22, 1.45, 6.14, fab([0x4a5a3a, 0x7a3a3a, 0x2a3a5a][i]), { small: true }); }
    rbox(1.8, .02, 9.3, 1.0, .02, .6, .01, M(0x7a4a2a, { roughness: 1 }), { small: true });
  }
  // ---- porch, patio, yard: planters, fence, trees, street lamp, a parked car ----
  { for (const x of [0.15, 3.85]) { box(x - .05, 0, 12.85, x + .05, 1.0, 12.95, trimM); } box(0.1, .9, 12.85, 3.9, .96, 12.95, trimM, { small: true });
    for (const x of [.4, 3.6]) { cyl(x, 0, 10.4, .2, .15, .35, M(0x8a5a40, { roughness: .8 }), { small: true }); for (let i = 0; i < 5; i++) sph(x + Math.cos(i * 1.3) * .1, .5 + (i % 2) * .1, 10.4 + Math.sin(i * 1.3) * .1, .13, M(0x2f6a3a, { roughness: .9 }), { small: true }); }
    box(.4, 2.0, 10.04, .6, 2.12, 10.16, M(0x22252c), { small: true }); sph(.5, 1.95, 10.1, .06, glowM(0xfff2cc), { small: true });
    for (let x = -4; x < 18; x += .3) { box(x, 0, 6.9, x + .2, 1.3, 6.95, wood(0x6a5038), { small: true }); } for (let z = 7; z < 28; z += .3) { box(17.8, 0, z, 17.85, 1.3, z + .2, wood(0x6a5038), { small: true }); box(-3.8, 0, z, -3.75, 1.3, z + .2, wood(0x6a5038), { small: true }); }
    const trunk = M(0x3a2a1e, { roughness: 1 }), leaf = M(0x1f4a2a, { roughness: .95 });
    for (const [x, z] of [[8, 16], [-2, 18], [15, 12]]) { cyl(x, 0, z, .22, .3, 3.4, trunk, { seg: 10 }); for (let i = 0; i < 7; i++) sph(x + Math.cos(i * 2.1) * 1.0, 3.6 + (i % 3) * .5, z + Math.sin(i * 2.1) * 1.0, 1.3 + (i % 2) * .3, leaf, { seg: 10 }); }
    cyl(6, 0, 23.6, .06, .08, 4.6, M(0x30343c, { roughness: .5, metalness: .6 }), { small: true }); sph(6, 4.7, 23.6, .22, glowM(0xffe0a0), { small: true }); box(5.9, 4.55, 23.45, 6.1, 4.62, 24.2, M(0x30343c), { small: true });
    // a parked car across the street
    const paint = M(0x6a2a34, { roughness: .25, metalness: .6 }); rbox(-1, .62, 26.6, 4.2, .55, 1.8, .1, paint); rbox(-1.2, 1.12, 26.6, 2.1, .5, 1.6, .15, paint); box(-2.2, .92, 25.8, -.2, 1.3, 27.4, M(0x14181f, { roughness: .1 }), { small: true });
    for (const [x, z] of [[-2.1, 25.7], [.1, 25.7], [-2.1, 27.5], [.1, 27.5]]) cyl(x, .05, z, .32, .32, .22, M(0x15151a, { roughness: .8 }), { rz: 0, rx: Math.PI / 2, small: true });
  }
  // sky: gradient dome, stars and the moon
  { const sky = new T.Mesh(new T.SphereGeometry(120, 20, 12), new T.MeshBasicMaterial({ map: (() => { const t = new T.CanvasTexture(cv(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#02040a'); gr.addColorStop(.55, '#0a1230'); gr.addColorStop(.75, '#182348'); gr.addColorStop(1, '#202a4a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); })); t.encoding = T.sRGBEncoding; return t; })(), side: T.BackSide, fog: false }));
    scene.add(sky); const pts = []; for (let i = 0; i < 500; i++) { const a = rn() * 6.28, e = rn() * 1.2 + .1, r = 110; pts.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); }
    const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(pts, 3)); scene.add(new T.Points(sg, new T.PointsMaterial({ color: L(0xdde6ff), size: 1.1, sizeAttenuation: false, fog: false })));
    const moonM = new T.Mesh(new T.SphereGeometry(4, 16, 12), new T.MeshBasicMaterial({ color: L(0xf2f2e0), fog: false })); moonM.position.set(-40, 70, 85); scene.add(moonM); }

  // ---------- lighting rig ----------
  // moonlight: the only shadowed light. It enters through the windows and paints bright patches on the floors.
  const moon = new T.DirectionalLight(L(0x9db8ff), 1.15); moon.position.set(-14, 34, 42); moon.target.position.set(6, 0, 5); scene.add(moon, moon.target);
  if (!LOW) { moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); const sc = moon.shadow.camera; sc.left = -17; sc.right = 17; sc.top = 17; sc.bottom = -17; sc.near = 5; sc.far = 90; moon.shadow.bias = -.0006; moon.shadow.normalBias = .03; moon.shadow.radius = 3; }
  scene.add(new T.AmbientLight(L(0x3a4a8a), .12)); scene.add(new T.HemisphereLight(L(0x5a70b0), L(0x141020), .1));
  // practical lights: no shadows, so they stay cheap
  light('living', 0x7fb0ff, 2.0, 3.3, 1.4, 1.4, 9); light('kitchen', 0xffe2b8, 2.2, 9.5, 1.95, 1.3, 9); light('foyer', 0xffd9a8, 1.2, 4.55, 1.4, 6.55, 8);
  light('hall', 0xffd9a8, .7, 6, 3.4, 7.0, 7); light('yours', 0xffc98a, .8, 4.9, 4.1, .6, 7); light('mom', 0xffb070, 1.4, 8.7, 3.95, 1.3, 7);
  light('outside', 0xffd8a0, 7, 6, 4.4, 23, 22);
  const porch = light('porch', 0xfff2cc, 0, .5, 1.9, 10.4, 14); const pcl = light('pc', 0xff44ff, 0, 1, 1.3, 4.6, 7); const phone = light('phone', 0x88bbff, 0, 0, 0, 0, 5); const lamp = light('lamp', 0xffe0a0, 0, 10.4, 5, 3, 12);

  // people
  const moms = { bed: sleeper(0x8a5a9a), couch: sleeper(0x5a8a7a) };
  moms.bed.position.set(10.5, 3.6, 1.3); scene.add(moms.bed); moms.couch.position.set(3.3, .66, 3.0); moms.couch.scale.set(1.05, 1.05, 1.05); scene.add(moms.couch);
  const sam = person(0x3a8a5a, { hair: 0x1a1a1a }), driver = person(0xe0a030, { cap: 0x2a2a2a, bag: true }), biscuit = dog();
  sam.visible = driver.visible = false; scene.add(sam, driver); biscuit.position.set(14.55, 0, 2.7); scene.add(biscuit);
  box(14.1, 0, 2.2, 15, .1, 3.2, fab(0x7a3a3a, 1), { small: true });
  // merge static meshes that share a material (and shadow flags) so the whole house draws in ~100 calls instead of ~1000
  (function mergeStatic() {
    const groups = new Map();
    for (const m of scene.children.slice()) {
      if (!m.isMesh || m.matrixAutoUpdate !== false || m.material.isMeshBasicMaterial || m.material.transparent || !m.geometry.attributes.uv) continue;
      const k = m.material.uuid + (m.castShadow ? 'c' : '') + (m.receiveShadow ? 'r' : ''); let g = groups.get(k); if (!g) groups.set(k, g = { m, list: [] });
      const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); geo.applyMatrix4(m.matrix); g.list.push({ geo, src: m });
    }
    for (const { m, list } of groups.values()) {
      let n = 0; for (const { geo } of list) n += geo.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
      for (const { geo, src } of list) { const c = geo.attributes.position.count; pos.set(geo.attributes.position.array, o * 3); nor.set(geo.attributes.normal.array, o * 3); uv.set(geo.attributes.uv.array, o * 2); o += c; geo.dispose(); scene.remove(src); src.geometry.dispose(); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2));
      const mesh = new T.Mesh(g, m.material); mesh.castShadow = m.castShadow; mesh.receiveShadow = m.receiveShadow; mesh.matrixAutoUpdate = false; mesh.frustumCulled = false; scene.add(mesh);
    }
  })();
  if (LOW) for (const k of ['outside', 'hall', 'foyer']) { scene.remove(lights[k]); delete lights[k]; }
  return { scene, colliders, doors, creaks, rugs, rooms, lights, STAIR, moms, sam, driver, biscuit, tv: tvScreen, mw: mwClock, rgb, monScreen, pcl, porch, phone, lamp, moon, LOW,
    floorY(x, z, y) { const s = STAIR; if (x > s.x1 && x < s.x2 && z > s.z1 && z < s.z2) return Math.max(0, Math.min(3, (x - 5) * .5)); return y > 1.5 ? 3 : 0; },
    roomAt(x, z, y) { const lv = y > 1.5 ? 1 : 0; for (const r of rooms) if (x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2 && (r.lv === 2 || r.lv === lv)) return r; return { name: 'Outside', surf: 'conc' }; },
    surfaceAt(x, z, y) {
      const lv = y > 1.5 ? 1 : 0, r = this.roomAt(x, z, y);
      if (r.surf === 'stairs') { const i = Math.floor((x - 5) / .4) + 1; return { name: `Wooden stairs, step #${i}`, base: 34, creak: i === 4 ? 2 : i === 11 ? 1 : 0, step: i }; }
      for (const g of rugs) if (g.lv === lv && x >= g.x1 && x <= g.x2 && z >= g.z1 && z <= g.z2) return { name: 'Rug / carpet (quiet)', base: 20, creak: 0 };
      for (const c of creaks) if (c.lv === lv && x >= c.x1 && x <= c.x2 && z >= c.z1 && z <= c.z2) return { name: 'Hardwood (worn boards)', base: 34, creak: c.sev };
      return r.surf === 'carpet' ? { name: 'Carpet (quiet)', base: 22, creak: 0 } : r.surf === 'tile' ? { name: 'Tile (clacky)', base: 30, creak: 0 } : r.surf === 'conc' ? { name: 'Concrete / stone', base: 30, creak: 0 } : { name: 'Hardwood floor', base: 33, creak: 0 };
    } };
})();
