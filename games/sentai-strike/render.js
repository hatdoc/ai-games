// Sentai Strike: drawing. Everything is drawn with canvas shapes (no images).
// Screen 960x540, ground at y=470. Figures are drawn in a local y-up space; bosses and the robot in a y-down space.
// Static scenery is baked once per stage into wrap-around parallax layers so phones stay at 60 fps.
(() => {
  const GY = 470, TAU = Math.PI * 2, rad = (d) => d * Math.PI / 180, OUT = '#0e0b18';
  const P = { // joint angles (degrees): tor lean, ua/fa upper/fore arm, th/sh thigh/shin, 1 = back limb, 2 = front
    idle: { tor: 4, ua1: 25, fa1: 110, ua2: 40, fa2: 120, th1: -14, sh1: -6, th2: 16, sh2: 4, hip: 92, rot: 0 },
    jab: { tor: 12, ua1: 40, fa1: 130, ua2: 92, fa2: 92, th1: -22, sh1: -10, th2: 22, sh2: 6, hip: 88, rot: 0 },
    cross: { tor: 20, ua1: 92, fa1: 92, ua2: 45, fa2: 135, th1: -28, sh1: -14, th2: 26, sh2: 6, hip: 86, rot: 0 },
    slash: { tor: 18, ua1: 30, fa1: 90, ua2: 115, fa2: 100, th1: -34, sh1: -18, th2: 34, sh2: 8, hip: 84, rot: 0 },
    power: { tor: 28, ua1: 96, fa1: 96, ua2: 30, fa2: 100, th1: -40, sh1: -30, th2: 38, sh2: 10, hip: 82, rot: 0 },
    kick: { tor: -14, ua1: 40, fa1: 120, ua2: 20, fa2: 100, th1: -6, sh1: 0, th2: 95, sh2: 92, hip: 92, rot: 0 },
    highkick: { tor: -26, ua1: 30, fa1: 110, ua2: 10, fa2: 90, th1: -4, sh1: 0, th2: 128, sh2: 122, hip: 92, rot: 0 },
    jump: { tor: 4, ua1: 110, fa1: 150, ua2: 120, fa2: 155, th1: 60, sh1: -50, th2: 85, sh2: -25, hip: 90, rot: 0 },
    airkick: { tor: -10, ua1: 100, fa1: 150, ua2: 60, fa2: 120, th1: 40, sh1: -60, th2: 70, sh2: 62, hip: 90, rot: 0 },
    hurt: { tor: -24, ua1: -10, fa1: 20, ua2: 0, fa2: 30, th1: -24, sh1: -10, th2: 14, sh2: 4, hip: 86, rot: 0 },
    down: { tor: 0, ua1: -170, fa1: -175, ua2: -150, fa2: -160, th1: 4, sh1: 0, th2: 10, sh2: 4, hip: 16, rot: -90 },
    guard: { tor: -4, ua1: 70, fa1: 165, ua2: 78, fa2: 170, th1: -22, sh1: -10, th2: 18, sh2: 6, hip: 88, rot: 0 },
    rise: { tor: -10, ua1: 20, fa1: 100, ua2: 168, fa2: 176, th1: -30, sh1: -20, th2: 32, sh2: 10, hip: 92, rot: 0 },
    slam: { tor: 30, ua1: 150, fa1: 175, ua2: 155, fa2: 178, th1: 60, sh1: -40, th2: 80, sh2: -20, hip: 80, rot: 0 },
    rush: { tor: 40, ua1: 60, fa1: 90, ua2: 100, fa2: 96, th1: -50, sh1: -30, th2: 50, sh2: 10, hip: 76, rot: 0 },
    stance: { tor: 10, ua1: 70, fa1: 140, ua2: 95, fa2: 120, th1: -40, sh1: -40, th2: 50, sh2: 0, hip: 70, rot: 0 },
    shoot: { tor: 6, ua1: 30, fa1: 100, ua2: 95, fa2: 95, th1: -24, sh1: -10, th2: 24, sh2: 6, hip: 90, rot: 0 },
    pose1: { tor: -6, ua1: 160, fa1: 175, ua2: 40, fa2: 150, th1: -26, sh1: -10, th2: 30, sh2: 6, hip: 90, rot: 0 },
    pose2: { tor: 10, ua1: 100, fa1: 40, ua2: 100, fa2: 160, th1: -40, sh1: -40, th2: 50, sh2: 0, hip: 74, rot: 0 },
    pose3: { tor: -4, ua1: 135, fa1: 135, ua2: 135, fa2: 135, th1: -20, sh1: -8, th2: 20, sh2: 6, hip: 92, rot: 0 },
    carry: { tor: 0, ua1: 170, fa1: 170, ua2: 165, fa2: 170, th1: -14, sh1: -6, th2: 16, sh2: 4, hip: 92, rot: 0 },
    wind: { tor: -14, ua1: 40, fa1: 150, ua2: -40, fa2: 60, th1: -20, sh1: -10, th2: 20, sh2: 6, hip: 90, rot: 0 },
    panic: { tor: 10, ua1: 150, fa1: 178, ua2: 165, fa2: 195, th1: -14, sh1: -6, th2: 16, sh2: 4, hip: 92, rot: 0 },
    land: { tor: 14, ua1: 50, fa1: 110, ua2: 60, fa2: 110, th1: -30, sh1: 20, th2: 40, sh2: -10, hip: 74, rot: 0 },
  };
  const K = Object.keys(P.idle), mix = (a, b, t) => { const o = {}; for (const k of K) o[k] = a[k] + (b[k] - a[k]) * t; return o; };
  const ease = (t) => t * t * (3 - 2 * t), lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const walkPose = (base, frame, sp = 5) => { const ph = frame / sp, w = Math.sin(ph) * 26, o = { ...base }; o.th1 -= w; o.th2 += w; o.sh1 -= Math.max(0, w) * 0.9; o.sh2 -= Math.max(0, -w) * 0.9; o.ua1 += w * 0.7; o.ua2 -= w * 0.7; o.hip -= Math.abs(Math.cos(ph)) * 3.5; o.tor += 3; return o; };

  // ---------- render-side animation memory (per entity, keyed by the sim object) ----------
  // The clock is the sim frame: it stops during hit-stop, so poses freeze with the hit.
  const MEM = new WeakMap(); let CLK = 0;
  const mem = (key) => { let o = MEM.get(key); if (!o) MEM.set(key, (o = {})); return o; };
  const clock = (n) => { CLK = n; };
  function smooth(key, target, rate = 0.35) {
    const o = mem(key), extra = target;
    if (!o.p || CLK - o.f > 12 || CLK < o.f) { o.p = {}; for (const k of K) o.p[k] = target[k]; o.f = CLK; }
    else if (CLK > o.f) { const a = 1 - Math.pow(1 - rate, CLK - o.f); for (const k of K) o.p[k] += (target[k] - o.p[k]) * a; o.f = CLK; }
    const out = { ...o.p }; out.key = key; if (extra.trail) out.trail = extra.trail; return out;
  }
  const lag = (key, name, v, rate) => { const o = mem(key); if (o[name] === undefined || CLK < (o[name + 'f'] ?? 0)) { o[name] = v; o[name + 'f'] = CLK; } const n = CLK - o[name + 'f']; if (n > 0) { o[name] += (v - o[name]) * (1 - Math.pow(1 - rate, n)); o[name + 'f'] = CLK; } return o[name]; };
  // flashes white for a moment whenever hp drops
  function hitFlash(key, hp) { const o = mem(key); if (o.hp !== undefined && hp < o.hp) o.hitAt = CLK; o.hp = hp; const d = CLK - (o.hitAt ?? -99); return d >= 0 && d < 7 ? 1 - d / 7 : 0; }

  // attack curve: wind back (anticipation), snap through with a little overshoot, settle (follow-through)
  function atkW(t, m) {
    if (t <= m.s) { const u = t / Math.max(1, m.s); return u < 0.45 ? -0.32 * ease(u / 0.45) : -0.32 + 1.44 * Math.pow((u - 0.45) / 0.55, 1.6); }
    if (t <= m.s + m.a) return 1.12 - 0.12 * (t - m.s) / m.a;
    const r = Math.min(1, (t - m.s - m.a) / m.c); return 1 - ease(Math.pow(r, 1.3));
  }
  const EFF = { jab: 'h2', cross: 'h1', slash: 'h2', power: 'h1', kick: 'f2', highkick: 'f2', airkick: 'f2', rise: 'h2', rush: 'h2', slam: 'h2' };
  function heroPose(h, frame, s) {
    const H = SS.HEROES[h.id]; let p, rate = 0.32;
    switch (h.state) {
      case 'atk': { const m = H.chain[h.ci]; p = mix(P.idle, P[m.pose] || P.jab, atkW(h.t, m)); rate = 0.62; if (h.t >= m.s - 1 && h.t <= m.s + m.a + 3) p.trail = EFF[m.pose] || 'h2'; break; }
      case 'air': p = { ...P.airkick, trail: 'f2' }; rate = 0.5; break;
      case 'sp': p = h.sp === 'rise' ? { ...P.rise, trail: 'h2' } : h.sp === 'slam' ? { ...P.slam, trail: h.t > 8 ? 'h2' : null } : h.sp === 'rush' ? { ...P.rush, trail: 'h2' } : mix(P.idle, P.shoot, Math.min(1, h.t / 4)); rate = 0.5; break;
      case 'stance': p = P.stance; break;
      case 'guard': p = P.guard; rate = 0.55; break;
      case 'hurt': p = P.hurt; rate = 0.6; break;
      case 'down': case 'ko': p = h.y > 5 ? mix(P.hurt, P.down, 0.5) : P.down; rate = 0.3; break;
      case 'tagin': p = h.t < 14 ? { ...P.airkick, trail: 'f2' } : P.pose2; rate = 0.45; break;
      case 'walk': p = walkPose(P.idle, frame, h.dash ? 3 : 5); if (h.dash) { p.tor += 16; p.hip -= 4; } rate = 0.45; break;
      case 'jump': p = h.vy > 2 ? mix(P.jump, P.idle, 0.25) : P.jump; rate = 0.3; break;
      default: { p = { ...P.idle }; const b = Math.sin(frame / 12); p.hip += b * 1.5; p.tor += b * 1.2; p.fa1 += b * 4; p.fa2 -= b * 4; if (h.stuck > 0) { p.ua1 = 10 + b * 20; p.ua2 = -10 - b * 20; } }
    }
    const o = mem(h);
    if (o.py > 0 && h.y <= 0 && h.state !== 'down') o.land = CLK; o.py = h.y;
    const out = smooth(h, p, rate), L = CLK - (o.land ?? -99);
    if (L >= 0 && L < 9) { const d = (1 - L / 9) ** 2; out.hip -= 12 * d; out.th1 -= 14 * d; out.th2 += 18 * d; out.sh1 += 18 * d; out.sh2 -= 16 * d; out.tor += 10 * d; out.sq = 0.07 * d; }
    return out;
  }

  // ---------- color helpers ----------
  function rgb(c) { if (c[0] === '#') { const n = parseInt(c.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; } return c.match(/[\d.]+/g).slice(0, 3).map(Number); }
  function shade(col, k) { const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))); return `rgb(${rgb(col).map(f).join(',')})`; }
  function mixc(a, b, t) { const A = rgb(a), B = rgb(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; }
  const rgba = (col, a) => `rgba(${rgb(col).join(',')},${a})`;
  const PALS = new Map();
  function pal(col) { let p = PALS.get(col); if (!p) { p = { b: col, l: shade(col, 0.3), ll: shade(col, 0.62), d: shade(col, -0.3), dd: shade(col, -0.6) }; PALS.set(col, p); } return p; }
  const ell = (c, x, y, rx, ry, col, rot = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); c.fill(); };
  const outl = (c, w = 4) => { c.strokeStyle = OUT; c.lineWidth = w; c.stroke(); };
  const rr = (c, x, y, w, h, r) => { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); };

  // volume shading: UPY is +1 in the y-up figure space, -1 in the y-down boss/robot space
  let UPY = -1, RIM = '255,255,255';
  function capsule(c, a, b, ra, rb, pl, out = 2.2) {
    const dx = b[0] - a[0], dy = b[1] - a[1], th = Math.atan2(dy, dx), len = Math.hypot(dx, dy) || 0.01;
    let nx = -dy / len, ny = dx / len; if (nx * 0.45 + ny * 0.9 * UPY < 0) { nx = -nx; ny = -ny; }
    c.beginPath(); c.arc(a[0], a[1], ra, th + Math.PI / 2, th + Math.PI * 1.5); c.arc(b[0], b[1], rb, th - Math.PI / 2, th + Math.PI / 2); c.closePath();
    const r = Math.max(ra, rb), g = c.createLinearGradient(a[0] + nx * r, a[1] + ny * r, a[0] - nx * r, a[1] - ny * r);
    g.addColorStop(0, pl.l); g.addColorStop(0.38, pl.b); g.addColorStop(1, pl.dd); c.fillStyle = g; c.fill();
    if (out) { c.lineWidth = out; c.strokeStyle = OUT; c.stroke(); }
  }
  function ball(c, x, y, rx, ry, pl, out = 2.2, rot = 0) {
    c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
    const m = Math.max(rx, ry), g = c.createRadialGradient(x + rx * 0.3, y + ry * 0.38 * UPY, m * 0.08, x, y, m * 1.04);
    g.addColorStop(0, pl.ll); g.addColorStop(0.42, pl.b); g.addColorStop(1, pl.dd); c.fillStyle = g; c.fill();
    if (out) { c.lineWidth = out; c.strokeStyle = OUT; c.stroke(); }
  }
  function blob(c, pts) { const n = pts.length; c.beginPath(); c.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2); for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); } c.closePath(); }
  function glow(c, x, y, r, col, a = 0.6) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }

  // ---------- skeleton figure (heroes, grunts, civilians, the dark striker) ----------
  // look: { kind: 'hero'|'grunt'|'brute'|'civ', suit, arm, leg, glove, boot, helmet, visor, vshape, mouth, sword, bow, hair, skin }
  function joints(p, big) {
    const hip = [0, p.hip], tor = rad(p.tor), st = Math.sin(tor), ct = Math.cos(tor);
    const T = (v, u) => [st * u + ct * v, p.hip + ct * u - st * v];
    const seg = (f, a, l) => [f[0] + Math.sin(rad(a)) * l, f[1] - Math.cos(rad(a)) * l];
    const s1 = T(-4 * big, 49), s2 = T(5 * big, 49), hp1 = T(-3, 3), hp2 = T(3, 3);
    const e1 = seg(s1, p.ua1, 28), h1 = seg(e1, p.fa1, 27), e2 = seg(s2, p.ua2, 28), h2 = seg(e2, p.fa2, 27);
    const k1 = seg(hp1, p.th1, 44), f1 = seg(k1, p.sh1, 43), k2 = seg(hp2, p.th2, 44), f2 = seg(k2, p.sh2, 43);
    return { hip, tor, T, s1, s2, e1, h1, e2, h2, hp1, hp2, k1, f1, k2, f2, t1: seg(f1, p.sh1 + 90, 12), t2: seg(f2, p.sh2 + 90, 12), neck: T(0, 56), head: T(1, 71) };
  }
  const TORSO = [[-11, -3], [-10, 14], [-12, 30], [-13, 44], [-11, 52], [-5, 58], [5, 58], [12, 52], [14.5, 42], [12, 29], [10, 17], [11, 6], [10, -3], [0, -6]];
  const COLLAR = [[-11, 51], [-5, 58], [5, 58], [12.5, 51], [13.5, 44], [6, 45.5], [1.5, 41], [-5, 46]];
  function figure(c, x, y, face, p, look, k = 1, flash = 0) {
    const kind = look.kind, big = kind === 'brute' ? 1.3 : 1, civ = kind === 'civ';
    const fq = flash > 0.04 ? Math.min(1, Math.round(flash * 4) / 4) : 0;
    const PL = (col, back) => { const cc = fq ? mixc(col, '#ffffff', fq * 0.85) : col; return pal(back ? shade(cc, -0.32) : cc); };
    const sq = p.sq || 0, J = joints(p, big);
    c.save(); c.translate(x, GY - y); c.scale(face * k * (1 + sq * 0.6), -k * (1 - sq));
    if (p.rot) { c.translate(0, p.hip * 0.5); c.rotate(rad(p.rot)); c.translate(0, -p.hip * 0.5); }
    UPY = 1; c.lineCap = 'round'; c.lineJoin = 'round';
    const suit = look.suit, armC = look.arm || suit, legC = look.leg || suit, glove = look.glove || armC, boot = look.boot || legC;
    // motion smear (behind the body)
    if (p.key) {
      const o = mem(p.key); o.tr ||= [];
      if (p.trail && o.tf !== CLK) {
        let a, b;
        if (p.trail === 'f2') { a = J.k2; b = J.t2; } else { const e = p.trail === 'h1' ? J.e1 : J.e2, hd = p.trail === 'h1' ? J.h1 : J.h2, d = Math.hypot(hd[0] - e[0], hd[1] - e[1]) || 1;
          if (look.sword && p.trail === 'h2') { a = hd; b = [hd[0] + (hd[0] - e[0]) / d * 64, hd[1] + (hd[1] - e[1]) / d * 64]; } else { a = lerp2(e, hd, 0.35); b = [hd[0] + (hd[0] - e[0]) / d * 7, hd[1] + (hd[1] - e[1]) / d * 7]; } }
        o.tr.push({ a, b, f: CLK }); o.tf = CLK;
      }
      o.tr = o.tr.filter((q) => CLK - q.f <= 6);
      if (o.tr.length > 1) smear(c, o.tr, look.trail || (kind === 'hero' ? pal(suit).ll : '#ff8787'), !!look.sword);
    }
    // back leg + arm (darker: they are further away)
    const leg = (hp, kn, ft, toe, back) => {
      capsule(c, hp, kn, 9.6 * big, 7.4 * big, PL(legC, back)); capsule(c, kn, ft, 7.4 * big, 5.6 * big, PL(legC, back));
      if (boot !== legC) capsule(c, lerp2(kn, ft, civ ? 0.8 : 0.42), ft, (civ ? 5.6 : 6.8) * big, 6.2 * big, PL(boot, back));
      capsule(c, ft, toe, 6 * big, 4.4 * big, PL(boot, back));
    };
    const arm = (sh, el, ha, back) => {
      capsule(c, sh, el, 7.4 * big, 6.2 * big, PL(armC, back)); capsule(c, el, ha, 6.2 * big, 5.2 * big, PL(armC, back));
      if (glove !== armC && !civ) capsule(c, lerp2(el, ha, 0.48), ha, 6.2 * big, 6.6 * big, PL(glove, back));
      ball(c, ha[0], ha[1], (civ ? 5 : 7) * big, (civ ? 5 : 7) * big, PL(glove, back), 2);
    };
    leg(J.hp1, J.k1, J.f1, J.t1, true);
    arm(J.s1, J.e1, J.h1, true);
    // torso
    c.save(); c.translate(0, J.hip[1]); c.rotate(-J.tor); c.scale(big, 1);
    const S = PL(suit); blob(c, TORSO);
    let g = c.createLinearGradient(15, 44, -14, 30); g.addColorStop(0, S.l); g.addColorStop(0.4, S.b); g.addColorStop(1, S.dd); c.fillStyle = g; c.fill(); c.lineWidth = 2.2; c.strokeStyle = OUT; c.stroke();
    c.strokeStyle = `rgba(${RIM},0.55)`; c.lineWidth = 2; c.beginPath(); c.moveTo(-9.5, 2); c.quadraticCurveTo(-11, 30, -9.5, 50); c.stroke(); // rim light on the back edge
    if (kind === 'hero') {
      const W = PL('#f4f5f7'); blob(c, COLLAR); g = c.createLinearGradient(12, 56, -8, 44); g.addColorStop(0, W.ll); g.addColorStop(0.5, W.b); g.addColorStop(1, W.d); c.fillStyle = g; c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke();
      c.strokeStyle = rgba(S.dd, 0.5); c.lineWidth = 1.2; c.beginPath(); c.moveTo(11, 28); c.quadraticCurveTo(4, 22, 9, 12); c.stroke(); // ab line
      const B = PL('#dfe3e8'); rr(c, -11, 4, 22, 8, 2); g = c.createLinearGradient(0, 12, 0, 4); g.addColorStop(0, B.ll); g.addColorStop(1, B.d); c.fillStyle = g; c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke();
      const Gd = PL('#f5c518'); rr(c, 4, 2.5, 9, 11, 2.5); g = c.createLinearGradient(4, 13, 13, 2); g.addColorStop(0, Gd.ll); g.addColorStop(0.5, Gd.b); g.addColorStop(1, Gd.dd); c.fillStyle = g; c.fill(); c.lineWidth = 1.5; c.stroke();
      ell(c, 8.5, 8, 2.2, 2.2, look.visor === '#e03131' ? '#e03131' : '#16121f');
    } else if (kind === 'grunt' || kind === 'brute') {
      c.strokeStyle = fq ? '#fff' : '#cfc9bb'; c.lineWidth = 2.4;
      for (const yy of [46, 39, 32]) { c.beginPath(); c.moveTo(-9, yy + 2); c.quadraticCurveTo(3, yy + 5, 12, yy - 1); c.stroke(); }
      c.beginPath(); c.moveTo(-6, 50); c.lineTo(-7, 18); c.stroke();
      rr(c, -11, 4, 22, 7, 2); c.fillStyle = kind === 'brute' ? '#8f1d1d' : '#2b2733'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = OUT; c.stroke();
      if (kind === 'brute') { ball(c, -6, 52, 9, 7, PL('#3a3542'), 2); }
    } else if (civ && look.tie) { c.fillStyle = look.tie; c.beginPath(); c.moveTo(9, 56); c.lineTo(12, 56); c.lineTo(12.5, 36); c.lineTo(10, 32); c.lineTo(8, 36); c.closePath(); c.fill(); c.fillStyle = '#f1f3f5'; c.beginPath(); c.moveTo(6, 58); c.lineTo(13, 58); c.lineTo(9.5, 50); c.fill(); }
    c.restore();
    leg(J.hp2, J.k2, J.f2, J.t2, false);
    // neck + head
    capsule(c, J.neck, J.T(0.5, 63), 5.2 * big, 5 * big, PL(civ ? look.skin : shade(suit, -0.35)), 1.6);
    c.save(); c.translate(J.head[0], J.head[1]); c.rotate(-J.tor * 0.55); if (big > 1) c.scale(1.12, 1.12);
    if (kind === 'hero') helmet(c, look, PL); else if (civ) civHead(c, look, PL); else gruntHead(c, look, PL, kind === 'brute');
    c.restore();
    // front arm (+ weapon)
    ball(c, J.s2[0], J.s2[1], 8.6 * big, 8 * big, PL(armC), 2);
    arm(J.s2, J.e2, J.h2, false);
    if (look.sword) sword(c, J.e2, J.h2, fq);
    if (look.bow) { const a = Math.atan2(J.h2[1] - J.e2[1], J.h2[0] - J.e2[0]); c.strokeStyle = '#6b4226'; c.lineWidth = 3.5; c.beginPath(); c.arc(J.h2[0] - Math.cos(a) * 8, J.h2[1] - Math.sin(a) * 8, 24, a - 1.15, a + 1.15); c.stroke(); c.strokeStyle = '#e9ecef'; c.lineWidth = 1; c.beginPath(); c.moveTo(J.h2[0] - Math.cos(a) * 8 + Math.cos(a - 1.15) * 24, J.h2[1] - Math.sin(a) * 8 + Math.sin(a - 1.15) * 24); c.lineTo(J.h2[0] - Math.cos(a) * 8 + Math.cos(a + 1.15) * 24, J.h2[1] - Math.sin(a) * 8 + Math.sin(a + 1.15) * 24); c.stroke(); }
    c.restore(); UPY = -1;
  }
  function smear(c, tr, col, blade) {
    const n = tr.length;
    for (let i = 1; i < n; i++) {
      const p = tr[i - 1], q = tr[i], al = (i / (n - 1)) * (blade ? 0.7 : 0.45);
      c.fillStyle = rgba(col, al); c.beginPath(); c.moveTo(p.a[0], p.a[1]); c.lineTo(p.b[0], p.b[1]); c.lineTo(q.b[0], q.b[1]); c.lineTo(q.a[0], q.a[1]); c.closePath(); c.fill();
    }
    if (n < 3) return; c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = blade ? 3 : 2.4; c.beginPath(); c.moveTo(tr[0].b[0], tr[0].b[1]); for (let i = 1; i < n; i++) c.lineTo(tr[i].b[0], tr[i].b[1]); c.stroke();
  }
  function sword(c, el, ha, fq) {
    const d = Math.hypot(ha[0] - el[0], ha[1] - el[1]) || 1, ux = (ha[0] - el[0]) / d, uy = (ha[1] - el[1]) / d, nx = -uy, ny = ux;
    const at = (l, w) => [ha[0] + ux * l + nx * w, ha[1] + uy * l + ny * w];
    capsule(c, at(-7, 0), at(6, 0), 2.6, 2.6, pal('#3b3540'), 1.2);
    c.beginPath(); const g1 = at(6, -6), g2 = at(6, 6); c.moveTo(g1[0], g1[1]); c.lineTo(g2[0], g2[1]); c.strokeStyle = OUT; c.lineWidth = 5; c.stroke(); c.strokeStyle = '#f5c518'; c.lineWidth = 3; c.stroke();
    const b = [at(8, -2.8), at(58, -2.4), at(66, 0), at(58, 2.4), at(8, 2.8)];
    c.beginPath(); c.moveTo(b[0][0], b[0][1]); for (const q of b.slice(1)) c.lineTo(q[0], q[1]); c.closePath();
    const g = c.createLinearGradient(...at(30, -3), ...at(30, 3)); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, fq ? '#ffffff' : '#c9d3dd'); g.addColorStop(1, '#6c7785'); c.fillStyle = g; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.2; c.stroke();
  }
  function visorPath(c, v) {
    c.beginPath();
    if (v === 'T') { c.rect(-1.5, 1.5, 14, 5); c.rect(6, -8, 5, 10); }
    else if (v === 'V') { c.moveTo(-1.5, 6.5); c.lineTo(6.2, -6.5); c.lineTo(12.8, 6.5); c.lineTo(9.6, 6.9); c.lineTo(6.2, 0.6); c.lineTo(2.4, 6.9); c.closePath(); }
    else if (v === 'X') { c.moveTo(-0.5, 6.5); c.lineTo(12.5, -5.5); c.lineTo(12.5, -1.5); c.lineTo(3, 7.5); c.closePath(); c.moveTo(-0.5, -5); c.lineTo(12.5, 6.5); c.lineTo(9.5, 7.5); c.lineTo(-0.5, -1.5); c.closePath(); }
    else if (c.roundRect) c.roundRect(-0.5, -4, 13.4, 10.5, 4); else c.rect(-0.5, -4, 13.4, 10.5);
  }
  function helmet(c, look, PL) {
    const H = PL(look.helmet);
    c.beginPath(); c.ellipse(-1, 1, 13, 14.5, 0, 0, TAU);
    let g = c.createRadialGradient(4, 8, 1, -1, 1, 17); g.addColorStop(0, H.ll); g.addColorStop(0.38, H.b); g.addColorStop(1, H.dd); c.fillStyle = g; c.fill(); c.lineWidth = 2.2; c.strokeStyle = OUT; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2.6; c.beginPath(); c.ellipse(-1, 1, 10.5, 12, 0, 0.3 * Math.PI, 0.78 * Math.PI); c.stroke(); // crown highlight
    c.strokeStyle = `rgba(${RIM},0.6)`; c.lineWidth = 2; c.beginPath(); c.ellipse(-1, 1, 12, 13.5, 0, 0.82 * Math.PI, 1.3 * Math.PI); c.stroke(); // rim light
    ball(c, -4, -1, 3.6, 3.8, PL('#c5ccd6'), 1.2); // ear disc
    visorPath(c, look.vshape);
    const vc = look.visor || '#16121f'; g = c.createLinearGradient(0, 8, 0, -8); g.addColorStop(0, shade(vc, 0.35)); g.addColorStop(0.45, vc); g.addColorStop(1, shade(vc, -0.6)); c.fillStyle = g; c.fill(); c.lineWidth = 1.3; c.strokeStyle = OUT; c.stroke();
    c.save(); visorPath(c, look.vshape); c.clip(); c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.moveTo(-2, 5); c.lineTo(14, 8); c.lineTo(14, 6.4); c.lineTo(-2, 3.6); c.fill(); c.fillStyle = 'rgba(160,220,255,0.35)'; c.fillRect(-2, -8, 16, 3); c.restore();
    if (look.mouth) { const M = PL('#c9ced6'); rr(c, 2.5, -12.5, 8.5, 3.6, 1.5); g = c.createLinearGradient(0, -9, 0, -12.5); g.addColorStop(0, M.ll); g.addColorStop(1, M.d); c.fillStyle = g; c.fill(); c.lineWidth = 1; c.strokeStyle = OUT; c.stroke(); }
  }
  function gruntHead(c, look, PL, brute) {
    const H = PL(look.helmet);
    if (brute) for (const sx of [-1, 1]) { const B = PL('#e9e2d0'); c.beginPath(); c.moveTo(sx < 0 ? -9 : 3, 10); c.quadraticCurveTo(sx < 0 ? -20 : 14, 18, sx < 0 ? -16 : 16, 32); c.quadraticCurveTo(sx < 0 ? -10 : 9, 20, sx < 0 ? -2 : 8, 12); c.closePath(); const g = c.createLinearGradient(0, 10, 0, 32); g.addColorStop(0, B.d); g.addColorStop(1, B.ll); c.fillStyle = g; c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke(); }
    ball(c, -1, 1, 12.5, 14, H, 2.2, 0);
    const Bn = PL('#d8d1c2'); c.beginPath(); c.ellipse(5.5, -1, 7.5, 10.5, 0.12, 0, TAU); const g = c.createLinearGradient(12, 6, 0, -8); g.addColorStop(0, Bn.ll); g.addColorStop(1, Bn.d); c.fillStyle = g; c.fill(); c.lineWidth = 1.4; c.strokeStyle = OUT; c.stroke();
    ell(c, 8.5, 2.5, 2.8, 3.2, '#140d12'); ell(c, 3.2, 2.5, 2.4, 3, '#140d12');
    glow(c, 8.5, 2.5, 7, '#ff2a2a', 0.55); ell(c, 8.5, 2.5, 1.4, 1.6, '#ffd0d0'); ell(c, 3.2, 2.5, 1.2, 1.4, '#ffb0b0');
    c.strokeStyle = '#3a3036'; c.lineWidth = 1; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(3.5 + i * 2.3, -5); c.lineTo(3.8 + i * 2.3, -9.5); c.stroke(); }
    c.strokeStyle = `rgba(${RIM},0.5)`; c.lineWidth = 2; c.beginPath(); c.ellipse(-1, 1, 11.5, 13, 0, 0.85 * Math.PI, 1.3 * Math.PI); c.stroke();
  }
  function civHead(c, look, PL) {
    ball(c, -0.5, 1, 10.5, 12, PL(look.skin), 2);
    c.save(); c.beginPath(); c.ellipse(-0.5, 1, 10.5, 12, 0, 0, TAU); c.clip(); const Hr = PL(look.hair); ball(c, -5, 9, 12, 9.5, Hr, 0, -0.35); c.restore();
    c.beginPath(); c.ellipse(-0.5, 1, 10.5, 12, 0, 0, TAU); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
    if (look.bun) ball(c, -10, 9, 5, 5, PL(look.hair), 1.5);
    if (look.cap) { ball(c, -1, 9, 11.5, 6, PL(look.cap), 1.5); ball(c, 9, 6.5, 7, 2, PL(look.cap), 1.2); }
    ell(c, 6.5, 2.5, 1.4, 1.9, '#1b1416'); c.strokeStyle = '#3b2a22'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(4, 6); c.lineTo(9, 5.2); c.stroke();
    ell(c, 7.6, -5, 1.8, 2.4, '#5a1f22'); ell(c, -2, 1, 1.8, 2.6, shade(look.skin, -0.15));
  }
  const VSHAPE = { red: 'T', blue: 'V', yellow: 'R', silver: 'X' };
  const LOOKS = {};
  const heroLook = (id) => { const H = SS.HEROES[id], L = LOOKS[id] ||= { kind: 'hero', suit: H.color, helmet: H.color, visor: '#14121f', glove: '#f4f5f7', boot: '#f4f5f7', vshape: VSHAPE[id], mouth: true }; return { ...L, sword: false }; };
  // a tiny helmet for the HUD portraits
  function portrait(c, x, y, s, id) {
    c.save(); c.translate(x, y); c.scale(s, -s); UPY = 1; c.lineCap = 'round'; c.lineJoin = 'round';
    capsule(c, [0, -12], [0, -16], 9, 9, pal(shade(SS.HEROES[id].color, -0.3)), 1.5); helmet(c, heroLook(id), pal);
    c.restore(); UPY = -1;
  }

  // ---------- backgrounds: baked, wrap-around parallax layers ----------
  const LW = 1920;
  const TH = {
    Downtown: { sky: ['#2c78c8', '#7cb6e8', '#d6ebfa'], sun: [770, 105, 36, '#fffbea', '255,242,205'], haze: '#b8d3ec', cloud: '#ffffff', far: 'towers', farC: ['#5f84ad', '#6c8fb6', '#7b9bbf'], mid: 'city', midC: ['#7a8597', '#9a7a6a', '#6a7f92', '#a59478', '#7a6f86', '#8f8f8a'], win: '#cfe2f5', near: 'street', ground: 'road', rim: '255,246,224' },
    Harbor: { sky: ['#4a3168', '#d9694a', '#ffcf8f'], sun: [610, 330, 50, '#fff0cf', '255,186,110'], haze: '#e9a074', cloud: '#ffb98c', far: 'port', farC: ['#7d4d5c'], sea: [372, '#e7956a', '#2b4a6c'], mid: 'containers', midC: ['#b23a2e', '#2d6a9f', '#d9822b', '#2e7d57', '#6f7b85', '#9a3f6b'], near: 'docks', ground: 'pier', rim: '255,190,120' },
    Beach: { sky: ['#1784cf', '#63c3ee', '#e4f8ff'], sun: [810, 92, 40, '#fffef2', '255,250,215'], haze: '#c2e9f6', cloud: '#ffffff', far: 'islands', farC: ['#5b9c8a'], sea: [352, '#72d6e6', '#0f6f9c'], foam: true, mid: 'palms', near: 'beach', ground: 'sand', rim: '255,252,235' },
    'Building Site': { sky: ['#b8762c', '#eab866', '#fbe6b5'], sun: [720, 140, 44, '#fff6dc', '255,220,150'], haze: '#e4bf88', cloud: '#fde3b8', far: 'towers', farC: ['#a98258', '#b58f63'], mid: 'girders', near: 'site', ground: 'dirt', rim: '255,226,170' },
    'Night Market': { night: true, sky: ['#05061a', '#171640', '#43275f'], moon: [800, 88, 28], haze: '#33285a', far: 'towers', farC: ['#1d1b3e', '#24204a'], lit: true, mid: 'shops', near: 'stalls', ground: 'wet', rim: '255,120,210' },
    Rooftops: { sky: ['#2d2357', '#b4557a', '#ffaa76'], sun: [250, 360, 64, '#ffe2b8', '255,165,120'], haze: '#c98093', cloud: '#ffb9a2', far: 'skyline', farC: ['#6a3f68', '#5e3a62', '#734870'], lit: true, mid: 'roofgear', near: 'roof', ground: 'tar', rim: '255,170,150' },
    'The Hive': { hive: true, sky: ['#2a1300', '#7a4005', '#c9820f'], haze: '#b8710f', far: 'comb', mid: 'drips', near: 'hive', ground: 'wax', rim: '255,205,90' },
    City: { sky: ['#3381d3', '#86c0ee', '#e0f0fb'], sun: [820, 100, 34, '#fffbea', '255,242,205'], haze: '#bfd8ee', cloud: '#ffffff', far: 'towers', farC: ['#7393b8', '#7f9dc0', '#8aa6c6'], mid: 'city', midC: ['#8691a3', '#99887a', '#7a8b9c', '#a29684'], win: '#d6e7f7', low: true, ground: 'road', rim: '255,246,224' },
  };
  const BAKED = new Map();
  const mk = (w, h, fn) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; fn(cv.getContext('2d'), w, h); return cv; };
  const wrap = (x, w, fn) => { fn(x); if (x + w > LW) fn(x - LW); if (x < 0) fn(x + LW); };
  function bake(place) {
    let B = BAKED.get(place); if (B) return B;
    if (BAKED.size >= 2) BAKED.clear();
    const t = TH[place] || TH.Downtown, R = SS.mulberry([...place].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7));
    B = { t, lights: [] };
    B.sky = mk(960, GY, (g) => paintSky(g, t, R));
    B.far = mk(LW, GY, (g) => paintFar(g, t, R, B));
    B.mid = mk(LW, GY, (g) => paintMid(g, t, R, B));
    if (t.near) B.near = mk(LW, GY, (g) => paintNear(g, t, R, B));
    B.ground = mk(LW, 70, (g) => paintGround(g, t, R));
    BAKED.set(place, B); return B;
  }
  function blit(c, cv, off, y = 0) { const x = -(((off % LW) + LW) % LW); c.drawImage(cv, x, y); if (x + LW < 960) c.drawImage(cv, x + LW, y); }
  const vgrad = (g, y0, y1, stops) => { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach((s, i) => gr.addColorStop(i / (stops.length - 1), s)); return gr; };
  const hgrad = (g, x0, x1, stops) => { const gr = g.createLinearGradient(x0, 0, x1, 0); stops.forEach((s, i) => gr.addColorStop(i / (stops.length - 1), s)); return gr; };

  function paintSky(g, t, R) {
    g.fillStyle = vgrad(g, 0, GY, t.sky); g.fillRect(0, 0, 960, GY);
    if (t.night) { for (let i = 0; i < 140; i++) { g.globalAlpha = 0.25 + R() * 0.7; const s = R() < 0.1 ? 2 : 1.2; g.fillStyle = '#fff'; g.fillRect(R() * 960, R() * 300, s, s); } g.globalAlpha = 1; }
    if (t.sun) { const [x, y, r, col, gl] = t.sun; glow(g, x, y, r * 7, `rgb(${gl})`, 0.5); glow(g, x, y, r * 2.2, `rgb(${gl})`, 0.6); ell(g, x, y, r, r, col); }
    if (t.moon) { const [x, y, r] = t.moon; glow(g, x, y, r * 6, '#9fa8ff', 0.28); ell(g, x, y, r, r, '#f3f0dc'); for (const [dx, dy, cr] of [[-8, -6, 6], [9, 4, 4], [-2, 10, 3.5], [6, -11, 3]]) ell(g, x + dx, y + dy, cr, cr, 'rgba(180,175,150,0.45)'); }
    if (t.hive) { // amber light falling from above
      for (let i = 0; i < 5; i++) { const x = 100 + i * 200; g.fillStyle = hgrad(g, x - 60, x + 60, ['rgba(255,220,120,0)', 'rgba(255,220,120,0.14)', 'rgba(255,220,120,0)']); g.beginPath(); g.moveTo(x - 30, 0); g.lineTo(x + 30, 0); g.lineTo(x + 90, GY); g.lineTo(x - 50, GY); g.fill(); }
    }
  }
  function clouds(g, t, R, n, y0, y1, a = 0.85) {
    for (let i = 0; i < n; i++) { const cx = R() * LW, cy = y0 + R() * (y1 - y0), s = 0.6 + R() * 0.9;
      wrap(cx - 120 * s, 240 * s, (x) => { for (let j = 0; j < 6; j++) { const ox = x + 120 * s + (j - 2.5) * 30 * s, oy = cy - Math.sin(j / 5 * Math.PI) * 22 * s, r = (26 + Math.sin(j * 1.7) * 8) * s;
        const gr = g.createRadialGradient(ox, oy - r * 0.4, r * 0.2, ox, oy, r); gr.addColorStop(0, rgba(t.cloud, a)); gr.addColorStop(1, rgba(t.cloud, 0)); g.fillStyle = gr; g.beginPath(); g.arc(ox, oy, r, 0, TAU); g.fill(); } });
    }
  }
  function towersLayer(g, t, R, n, hMin, hMax, hazeK) {
    for (let i = 0; i < n; i++) {
      const w = 40 + R() * 80, h = hMin + R() * (hMax - hMin), x0 = R() * LW, col = mixc(t.farC[i % t.farC.length], t.haze, hazeK), top = GY - h, kind = R();
      wrap(x0, w + 20, (x) => {
        g.fillStyle = hgrad(g, x, x + w, [shade(col, 0.08), col, shade(col, -0.12)]); g.fillRect(x, top, w, h);
        if (kind < 0.3) { g.fillRect(x + w * 0.2, top - 18, w * 0.6, 18); g.fillRect(x + w / 2 - 1.5, top - 50, 3, 32); }
        else if (kind < 0.5) { g.beginPath(); g.moveTo(x, top); g.lineTo(x + w / 2, top - 24); g.lineTo(x + w, top); g.fill(); }
        g.fillStyle = t.lit ? 'rgba(255,214,120,0.75)' : rgba(shade(col, 0.25), 0.55);
        for (let wy = top + 10; wy < GY - 10; wy += 13) for (let wx = x + 6; wx < x + w - 8; wx += 10) if (t.lit ? R() < 0.28 : (wx * 7 + wy) % 5 < 2) g.fillRect(wx, wy, 5, 6);
      });
    }
  }
  function sea(g, t) { const [y, a, b] = t.sea; g.fillStyle = vgrad(g, y, GY, [a, mixc(a, b, 0.5), b]); g.fillRect(0, y, LW, GY - y); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, y, LW, 1.5); }
  function paintFar(g, t, R, B) {
    if (t.cloud) clouds(g, t, R, 9, 50, 210);
    if (t.far === 'towers') { towersLayer(g, t, R, 34, 120, 330, 0.62); towersLayer(g, t, R, 22, 80, 220, 0.42); }
    if (t.far === 'skyline') { towersLayer(g, t, R, 44, 40, 200, 0.55); towersLayer(g, t, R, 28, 20, 120, 0.35); }
    if (t.far === 'port') {
      towersLayer(g, { ...t, farC: ['#6d4458', '#5e3d55'] }, R, 26, 130, 250, 0.5);
      g.fillStyle = mixc(t.farC[0], t.haze, 0.55); g.beginPath(); g.moveTo(0, 372); for (let x = 0; x <= LW; x += 40) g.lineTo(x, 350 - Math.sin(x / LW * TAU * 3) * 14 - Math.sin(x / LW * TAU * 7) * 6); g.lineTo(LW, 372); g.fill();
      for (let i = 0; i < 5; i++) { const x0 = 120 + i * 380 + R() * 80, col = mixc('#3c2a3e', t.haze, 0.45); // container cranes
        wrap(x0, 220, (x) => { g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.moveTo(x, 372); g.lineTo(x + 18, 240); g.lineTo(x + 36, 372); g.moveTo(x + 70, 372); g.lineTo(x + 88, 240); g.lineTo(x + 106, 372); g.moveTo(x - 60, 236); g.lineTo(x + 210, 236); g.moveTo(x + 10, 290); g.lineTo(x + 100, 290); g.stroke(); g.lineWidth = 2; g.beginPath(); g.moveTo(x + 18, 240); g.lineTo(x + 53, 200); g.lineTo(x + 88, 240); g.moveTo(x + 53, 200); g.lineTo(x + 200, 236); g.moveTo(x + 53, 200); g.lineTo(x - 60, 236); g.stroke(); });
      }
      sea(g, t);
      const sx = 1150; g.fillStyle = mixc('#2e2233', t.haze, 0.35); g.beginPath(); g.moveTo(sx, 372); g.lineTo(sx + 260, 372); g.lineTo(sx + 240, 392); g.lineTo(sx + 20, 392); g.fill(); g.fillRect(sx + 160, 345, 50, 27); g.fillRect(sx + 180, 325, 12, 20);
    }
    if (t.far === 'islands') {
      for (let i = 0; i < 4; i++) { const x0 = R() * LW, w = 200 + R() * 260, h = 30 + R() * 60, col = mixc(t.farC[0], t.haze, 0.35 + i * 0.1);
        wrap(x0, w, (x) => { g.fillStyle = col; g.beginPath(); g.moveTo(x, 353); g.bezierCurveTo(x + w * 0.25, 353 - h, x + w * 0.5, 353 - h * 1.2, x + w * 0.7, 353 - h * 0.6); g.quadraticCurveTo(x + w * 0.85, 353 - h * 0.3, x + w, 353); g.fill(); });
      }
      sea(g, t);
    }
    if (t.far === 'comb') {
      const r = 34, hw = r * Math.sqrt(3);
      for (let row = -1; row < 16; row++) for (let col = 0; col < Math.ceil(LW / hw); col++) {
        const x = col * hw + (row % 2) * hw / 2, y = row * r * 1.5, v = R(), dark = 0.25 + (y / GY) * 0.35;
        g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2)); } g.closePath();
        const gr = g.createRadialGradient(x - 6, y - 8, 2, x, y, r);
        if (v < 0.25) { gr.addColorStop(0, '#ffd35a'); gr.addColorStop(0.6, '#e58e0c'); gr.addColorStop(1, '#8a4a04'); } else if (v < 0.4) { gr.addColorStop(0, '#f6dfa3'); gr.addColorStop(1, '#b8873e'); } else { gr.addColorStop(0, '#2d1602'); gr.addColorStop(0.7, '#5a2f05'); gr.addColorStop(1, '#a8650c'); }
        g.fillStyle = gr; g.fill(); g.strokeStyle = '#d9962a'; g.lineWidth = 4; g.stroke(); g.fillStyle = `rgba(60,25,0,${dark})`; g.fill();
        if (v < 0.25 && R() < 0.18) B.lights.push({ x, y, r: 42, col: '#ffb020', p: 0.15, pulse: true });
      }
    }
    if (!t.sea) { g.fillStyle = vgrad(g, GY - 170, GY, [rgba(t.haze, 0), rgba(t.haze, 0.65)]); g.fillRect(0, GY - 170, LW, 170); }
  }
  function building(g, x, w, h, col, win, lit, R, shop) {
    const top = GY - h;
    g.fillStyle = hgrad(g, x, x + w, [shade(col, 0.14), col, shade(col, -0.18)]); g.fillRect(x, top, w, h);
    g.fillStyle = shade(col, -0.35); g.fillRect(x + w, top + 6, 10, h - 6); // side face
    g.fillStyle = shade(col, 0.3); g.fillRect(x - 3, top - 6, w + 6, 7); g.fillStyle = shade(col, -0.25); g.fillRect(x - 3, top + 1, w + 6, 2);
    const cols = Math.max(2, Math.floor((w - 16) / 22)), cw = (w - 16) / cols;
    for (let wy = top + 16; wy < GY - (shop ? 60 : 24); wy += 30) for (let i = 0; i < cols; i++) {
      const wx = x + 8 + i * cw + 3, ww = cw - 6, on = lit && R() < 0.35;
      g.fillStyle = on ? vgrad(g, wy, wy + 18, ['#ffe7a3', '#f2b84b']) : vgrad(g, wy, wy + 18, [mixc(win, '#ffffff', 0.4), mixc(win, col, 0.45)]); g.fillRect(wx, wy, ww, 18);
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(wx, wy + 16, ww, 2);
    }
    if (shop) { const sc = ['#d9480f', '#2b8a3e', '#1c7ed6', '#c2255c', '#f08c00'][Math.floor(R() * 5)];
      g.fillStyle = vgrad(g, GY - 52, GY, ['#2b2f36', '#3c424b']); g.fillRect(x + 6, GY - 52, w - 12, 52);
      g.fillStyle = vgrad(g, GY - 50, GY - 10, ['rgba(200,230,255,0.55)', 'rgba(120,150,180,0.35)']); g.fillRect(x + 12, GY - 46, w - 24, 40);
      for (let i = 0; i < (w - 8) / 16; i++) { g.fillStyle = i % 2 ? '#f8f9fa' : sc; g.beginPath(); g.moveTo(x + 4 + i * 16, GY - 64); g.lineTo(x + 20 + i * 16, GY - 64); g.lineTo(x + 22 + i * 16, GY - 50); g.lineTo(x + 6 + i * 16, GY - 50); g.fill(); }
    }
    const k = R(); if (k < 0.35) { const tx = x + w * 0.65; g.fillStyle = shade(col, -0.3); g.fillRect(tx, top - 34, 3, 28); g.fillRect(tx + 22, top - 34, 3, 28); g.fillStyle = vgrad(g, top - 52, top - 30, ['#8a6a4a', '#5e4630']); rr(g, tx - 4, top - 54, 34, 24, 4); g.fill(); g.fillStyle = '#4a3828'; g.beginPath(); g.moveTo(tx - 6, top - 54); g.lineTo(tx + 13, top - 64); g.lineTo(tx + 32, top - 54); g.fill(); }
    else if (k < 0.6) { g.fillStyle = shade(col, -0.2); g.fillRect(x + 10, top - 18, 26, 12); g.fillRect(x + 42, top - 14, 18, 8); }
  }
  function paintMid(g, t, R, B) {
    if (t.mid === 'city') {
      let x = -40; while (x < LW - 60) { const w = 110 + R() * 90, h = (t.low ? 70 : 150) + R() * (t.low ? 90 : 140), col = mixc(t.midC[Math.floor(R() * t.midC.length)], t.haze, t.low ? 0.4 : 0.18); building(g, x, w, h, col, t.win, false, R, !t.low); x += w + 14 + R() * 30; }
    }
    if (t.mid === 'containers') {
      for (let x0 = 0; x0 < LW; x0 += 300 + R() * 60) { const stacks = 2 + Math.floor(R() * 3);
        for (let s = 0; s < stacks; s++) for (let lv = 0; lv < 1 + Math.floor(R() * 3); lv++) { const x = x0 + s * 124, y = GY - 56 - lv * 52, col = mixc(t.midC[Math.floor(R() * t.midC.length)], t.haze, 0.22);
          g.fillStyle = vgrad(g, y, y + 50, [shade(col, 0.15), col, shade(col, -0.25)]); g.fillRect(x, y, 120, 50); g.strokeStyle = shade(col, -0.35); g.lineWidth = 1.5; for (let i = 8; i < 120; i += 8) { g.beginPath(); g.moveTo(x + i, y + 4); g.lineTo(x + i, y + 46); g.stroke(); } g.strokeRect(x + 0.5, y + 0.5, 119, 49); }
      }
      for (let x = 160; x < LW; x += 640) { g.fillStyle = '#3a3036'; g.fillRect(x, GY - 300, 6, 300); g.fillStyle = '#5a4a50'; g.fillRect(x - 18, GY - 306, 42, 8); B.lights.push({ x: x + 3, y: GY - 300, r: 46, col: '#ffcf8a', p: 0.4 }); }
    }
    if (t.mid === 'palms') {
      for (let i = 0; i < 9; i++) { const x0 = R() * LW, h = 190 + R() * 110, lean = (R() - 0.5) * 120;
        wrap(x0 - 120, 260, (x) => {
          g.lineCap = 'round'; for (let s = 0; s < 14; s++) { const t0 = s / 14, t1 = (s + 1) / 14, px = (q) => x + lean * q * q, py = (q) => GY - h * q; g.strokeStyle = s % 2 ? '#8a6a45' : '#a07d52'; g.lineWidth = 12 - s * 0.4; g.beginPath(); g.moveTo(px(t0), py(t0)); g.lineTo(px(t1), py(t1)); g.stroke(); }
          const tx = x + lean, ty = GY - h;
          for (let f = 0; f < 8; f++) { const a = -Math.PI / 2 + (f - 3.5) * 0.42 + (f > 3 ? 0.4 : -0.4), L = 80 + R() * 30, ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * 0.55 + 30;
            g.strokeStyle = f % 2 ? '#2f7d3a' : '#3e9a48'; g.lineWidth = 9; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + Math.cos(a) * L * 0.6, ty + Math.sin(a) * L * 0.6 - 18, ex, ey); g.stroke();
            g.strokeStyle = '#1f5f2a'; g.lineWidth = 1.5; for (let q = 0.3; q < 1; q += 0.12) { const lx = tx + (ex - tx) * q, ly = ty + (ey - ty) * q - Math.sin(q * Math.PI) * 14; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + 4, ly + 9); g.stroke(); } }
          ell(g, tx - 4, ty + 6, 6, 6, '#6b4a26'); ell(g, tx + 5, ty + 8, 6, 6, '#5a3d1f');
        });
      }
      const lx = 900; g.fillStyle = '#e9ecef'; g.fillRect(lx, GY - 120, 6, 120); g.fillRect(lx + 50, GY - 120, 6, 120); g.fillStyle = vgrad(g, GY - 160, GY - 120, ['#e03131', '#a61e1e']); g.fillRect(lx - 10, GY - 160, 76, 42); g.fillStyle = '#f8f9fa'; g.fillRect(lx - 4, GY - 150, 64, 10); g.fillStyle = '#c92a2a'; g.beginPath(); g.moveTo(lx - 18, GY - 160); g.lineTo(lx + 28, GY - 182); g.lineTo(lx + 74, GY - 160); g.fill();
    }
    if (t.mid === 'girders') {
      for (let x0 = 60; x0 < LW; x0 += 520) { const floors = 4 + Math.floor(R() * 3), w = 260;
        for (let f = 0; f <= floors; f++) { const y = GY - f * 52; g.fillStyle = f % 2 ? '#9a9da3' : '#878a90'; if (f > 0 && f < floors - 1) g.fillRect(x0, y, w, 7); g.fillStyle = '#c4581b'; g.fillRect(x0, y - 4, w, 5); }
        for (let i = 0; i <= 4; i++) { g.fillStyle = hgrad(g, x0 + i * 65 - 4, x0 + i * 65 + 4, ['#e4762a', '#b14c12']); g.fillRect(x0 + i * 65 - 4, GY - floors * 52, 8, floors * 52); }
        g.strokeStyle = 'rgba(160,70,20,0.8)'; g.lineWidth = 2; for (let f = 0; f < floors; f++) for (let i = 0; i < 4; i++) if (R() < 0.5) { g.beginPath(); g.moveTo(x0 + i * 65, GY - f * 52); g.lineTo(x0 + (i + 1) * 65, GY - (f + 1) * 52); g.stroke(); }
        g.fillStyle = 'rgba(40,140,80,0.35)'; g.fillRect(x0 + 130, GY - floors * 52, 130, floors * 52 - 120);
      }
      for (const x0 of [300, 1260]) { // tower crane
        g.strokeStyle = '#e8a10f'; g.lineWidth = 3; g.strokeRect(x0, GY - 400, 26, 400); for (let y = GY; y > GY - 400; y -= 26) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + 26, y - 26); g.stroke(); }
        g.strokeRect(x0 - 120, GY - 420, 420, 20); for (let x = x0 - 120; x < x0 + 300; x += 20) { g.beginPath(); g.moveTo(x, GY - 400); g.lineTo(x + 20, GY - 420); g.stroke(); }
        g.fillStyle = '#5c5f66'; g.fillRect(x0 - 118, GY - 400, 50, 34); g.fillStyle = '#e8a10f'; g.fillRect(x0 - 6, GY - 446, 38, 30); g.fillStyle = '#9fd3f5'; g.fillRect(x0, GY - 440, 14, 12);
        g.strokeStyle = '#333'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0 + 240, GY - 400); g.lineTo(x0 + 240, GY - 260); g.stroke(); g.fillStyle = '#d9480f'; g.fillRect(x0 + 232, GY - 262, 16, 10); g.fillStyle = '#888'; g.fillRect(x0 + 200, GY - 252, 80, 10);
      }
    }
    if (t.mid === 'shops') {
      let x = -20; while (x < LW) { const w = 140 + R() * 80, h = 150 + R() * 110, col = mixc(['#3a2f5c', '#2f3557', '#46305a', '#33284a'][Math.floor(R() * 4)], t.haze, 0.15);
        building(g, x, w, h, col, '#3a3a66', true, R, false);
        const sc = ['#ff4fa3', '#33e1ff', '#ffd43b', '#9dff6a'][Math.floor(R() * 4)], sy = GY - h + 30 + R() * 40, vert = R() < 0.5;
        g.fillStyle = '#120f22'; if (vert) rr(g, x + w - 30, sy, 22, 70, 4); else rr(g, x + 14, sy, w - 40, 26, 4); g.fill(); g.strokeStyle = sc; g.lineWidth = 2.5; g.stroke();
        g.lineWidth = 2; g.beginPath(); if (vert) for (let i = 0; i < 3; i++) { g.moveTo(x + w - 25, sy + 10 + i * 20); g.lineTo(x + w - 13, sy + 10 + i * 20); g.moveTo(x + w - 19, sy + 5 + i * 20); g.lineTo(x + w - 19, sy + 17 + i * 20); } else for (let i = 0; i < 4; i++) { g.moveTo(x + 24 + i * 22, sy + 8); g.lineTo(x + 36 + i * 22, sy + 8); g.lineTo(x + 30 + i * 22, sy + 19); } g.stroke();
        B.lights.push({ x: vert ? x + w - 19 : x + w / 2, y: vert ? sy + 35 : sy + 13, r: 60, col: sc, p: 0.4, flick: R() < 0.3 });
        x += w + 6 + R() * 18; }
    }
    if (t.mid === 'roofgear') {
      for (let x0 = 80; x0 < LW; x0 += 480 + R() * 80) {
        const k = R();
        if (k < 0.4) { const tx = x0; g.fillStyle = '#3b2b3a'; for (const lx of [0, 22, 44, 66]) g.fillRect(tx + lx, GY - 120, 5, 120); g.strokeStyle = '#3b2b3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(tx, GY - 40); g.lineTo(tx + 70, GY - 100); g.moveTo(tx + 70, GY - 40); g.lineTo(tx, GY - 100); g.stroke(); g.fillStyle = hgrad(g, tx - 10, tx + 80, ['#a0705a', '#7a4f3e', '#4f3229']); rr(g, tx - 10, GY - 200, 90, 84, 6); g.fill(); g.strokeStyle = 'rgba(40,20,20,0.5)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(tx - 10, GY - 190 + i * 14); g.lineTo(tx + 80, GY - 190 + i * 14); g.stroke(); } g.fillStyle = '#5a3a30'; g.beginPath(); g.moveTo(tx - 16, GY - 198); g.lineTo(tx + 35, GY - 232); g.lineTo(tx + 86, GY - 198); g.fill(); }
        else if (k < 0.7) { const bx = x0; g.fillStyle = '#2f2338'; g.fillRect(bx + 20, GY - 150, 6, 150); g.fillRect(bx + 170, GY - 150, 6, 150); g.fillStyle = vgrad(g, GY - 260, GY - 150, ['#ff7a59', '#ff3d7f']); rr(g, bx, GY - 262, 200, 112, 6); g.fill(); g.strokeStyle = '#2f2338'; g.lineWidth = 6; g.stroke(); g.fillStyle = '#fff3'; g.beginPath(); g.arc(bx + 60, GY - 206, 32, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.font = '900 30px system-ui'; g.fillText('POW!', bx + 100, GY - 196); }
        else { const ax = x0 + 40; g.strokeStyle = '#2f2338'; g.lineWidth = 4; g.beginPath(); g.moveTo(ax, GY); g.lineTo(ax, GY - 260); g.stroke(); g.lineWidth = 2; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(ax - 22 + i * 3, GY - 60 * i); g.lineTo(ax + 22 - i * 3, GY - 60 * i); g.stroke(); } B.lights.push({ x: ax, y: GY - 262, r: 24, col: '#ff3030', p: 0.4, blink: true }); }
      }
      g.fillStyle = vgrad(g, GY - 120, GY, ['rgba(201,128,147,0)', 'rgba(201,128,147,0.45)']); g.fillRect(0, GY - 120, LW, 120);
    }
    if (t.mid === 'drips') {
      for (let i = 0; i < 16; i++) { const x0 = R() * LW, w = 40 + R() * 70, h = 80 + R() * 200;
        wrap(x0, w, (x) => { g.fillStyle = hgrad(g, x, x + w, ['#f5c24a', '#d98c12', '#8f5208']); g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.quadraticCurveTo(x + w * 0.9, h * 0.7, x + w / 2 + 6, h); g.quadraticCurveTo(x + w / 2, h + 26, x + w / 2 - 6, h); g.quadraticCurveTo(x + w * 0.1, h * 0.7, x, 0); g.fill(); g.fillStyle = 'rgba(255,240,180,0.35)'; g.fillRect(x + w * 0.2, 0, 4, h * 0.7); });
      }
      for (let i = 0; i < 8; i++) { const x0 = R() * LW, w = 60 + R() * 70, h = 100 + R() * 160;
        wrap(x0, w, (x) => { g.fillStyle = hgrad(g, x, x + w, ['#e8b04a', '#b8730e', '#6e3c06']); g.beginPath(); g.moveTo(x, GY); g.quadraticCurveTo(x + w * 0.2, GY - h, x + w / 2, GY - h - 10); g.quadraticCurveTo(x + w * 0.8, GY - h, x + w, GY); g.fill(); });
      }
      g.fillStyle = vgrad(g, GY - 140, GY, ['rgba(184,113,15,0)', 'rgba(184,113,15,0.5)']); g.fillRect(0, GY - 140, LW, 140);
    }
  }
  function paintNear(g, t, R, B) {
    g.lineCap = 'round';
    if (t.near === 'street') {
      for (let x0 = 100; x0 < LW; x0 += 480) { // street lamp
        g.fillStyle = hgrad(g, x0 - 4, x0 + 4, ['#5c6470', '#2e333b']); g.fillRect(x0 - 3, GY - 210, 7, 210); g.fillRect(x0 - 7, GY - 20, 15, 20);
        g.strokeStyle = '#3a4048'; g.lineWidth = 5; g.beginPath(); g.moveTo(x0, GY - 205); g.quadraticCurveTo(x0, GY - 225, x0 + 30, GY - 222); g.stroke(); g.fillStyle = '#2e333b'; rr(g, x0 + 22, GY - 228, 30, 10, 4); g.fill(); g.fillStyle = '#fff6d8'; g.fillRect(x0 + 26, GY - 219, 22, 3);
      }
      for (let x0 = 330; x0 < LW; x0 += 480) { // tree
        g.fillStyle = hgrad(g, x0 - 6, x0 + 6, ['#7a5536', '#4a3220']); g.fillRect(x0 - 5, GY - 110, 10, 110); g.fillStyle = '#5c5f66'; g.fillRect(x0 - 26, GY - 6, 52, 6);
        for (const [dx, dy, r] of [[-26, -128, 30], [24, -132, 32], [0, -160, 36], [-12, -110, 24], [18, -108, 26]]) ball(g, x0 + dx, GY + dy, r, r * 0.9, pal('#3f8f43'), 0);
      }
      for (let x0 = 230; x0 < LW; x0 += 960) { ball(g, x0, GY - 22, 9, 9, pal('#e03131'), 1.5); g.fillStyle = hgrad(g, x0 - 9, x0 + 9, ['#ff6b6b', '#a51d1d']); g.fillRect(x0 - 8, GY - 22, 16, 22); g.fillRect(x0 - 12, GY - 16, 24, 5); }
      for (let x0 = 720; x0 < LW; x0 += 960) { g.fillStyle = '#7a5536'; for (let i = 0; i < 3; i++) g.fillRect(x0, GY - 34 + i * 8, 80, 5); g.fillStyle = '#2e333b'; g.fillRect(x0 + 6, GY - 34, 4, 34); g.fillRect(x0 + 70, GY - 34, 4, 34); }
    }
    if (t.near === 'docks') {
      for (let x = 40; x < LW; x += 120) { g.fillStyle = hgrad(g, x - 3, x + 3, ['#6c757d', '#343a40']); g.fillRect(x - 3, GY - 54, 6, 54); }
      g.strokeStyle = '#2b2f36'; g.lineWidth = 3; for (let x = 40; x < LW; x += 120) { g.beginPath(); g.moveTo(x, GY - 50); g.quadraticCurveTo(x + 60, GY - 30, x + 120, GY - 50); g.stroke(); g.beginPath(); g.moveTo(x, GY - 30); g.quadraticCurveTo(x + 60, GY - 14, x + 120, GY - 30); g.stroke(); }
      for (let x0 = 260; x0 < LW; x0 += 640) { g.fillStyle = hgrad(g, x0 - 14, x0 + 14, ['#495057', '#212529']); rr(g, x0 - 14, GY - 30, 28, 30, 6); g.fill(); g.fillStyle = '#f2c94c'; g.fillRect(x0 - 14, GY - 22, 28, 6); ell(g, x0, GY - 30, 16, 6, '#343a40'); }
      for (let x0 = 520; x0 < LW; x0 += 960) { g.fillStyle = '#6b4a2b'; g.fillRect(x0 - 3, GY - 90, 6, 90); g.lineWidth = 9; g.strokeStyle = '#ff6b3d'; g.beginPath(); g.arc(x0, GY - 96, 18, 0, TAU); g.stroke(); g.strokeStyle = '#fff'; g.setLineDash([9, 10]); g.stroke(); g.setLineDash([]); }
      for (let x0 = 760; x0 < LW; x0 += 960) for (const [dx, dy, s] of [[0, 0, 44], [46, 0, 40], [20, -40, 38]]) { g.fillStyle = vgrad(g, GY - s + dy, GY + dy, ['#c48a4a', '#8a5a2b']); g.fillRect(x0 + dx, GY - s + dy, s, s); g.strokeStyle = '#6b4220'; g.lineWidth = 2; g.strokeRect(x0 + dx + 1, GY - s + dy + 1, s - 2, s - 2); g.beginPath(); g.moveTo(x0 + dx, GY - s + dy); g.lineTo(x0 + dx + s, GY + dy); g.stroke(); }
    }
    if (t.near === 'beach') {
      for (let x0 = 180; x0 < LW; x0 += 640) { const cols = [['#ff6b6b', '#fff'], ['#4dabf7', '#fff'], ['#ffd43b', '#ff922b']][Math.floor(R() * 3)];
        g.strokeStyle = '#e9ecef'; g.lineWidth = 4; g.beginPath(); g.moveTo(x0, GY); g.lineTo(x0 + 10, GY - 150); g.stroke();
        for (let i = 0; i < 6; i++) { g.fillStyle = cols[i % 2]; g.beginPath(); g.moveTo(x0 + 10, GY - 160); g.lineTo(x0 + 10 - 80 + i * 26.6, GY - 128 + Math.sin(i / 5 * Math.PI) * -8); g.lineTo(x0 + 10 - 80 + (i + 1) * 26.6, GY - 128 + Math.sin((i + 1) / 5 * Math.PI) * -8); g.fill(); }
        g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.moveTo(x0 - 70, GY - 128); g.quadraticCurveTo(x0 + 10, GY - 112, x0 + 90, GY - 128); g.lineTo(x0 + 90, GY - 126); g.quadraticCurveTo(x0 + 10, GY - 108, x0 - 70, GY - 126); g.fill(); }
      for (let x0 = 470; x0 < LW; x0 += 640) { ball(g, x0, GY - 14, 34, 18, pal('#868e96'), 0); ball(g, x0 + 30, GY - 8, 20, 12, pal('#7a828a'), 0); }
    }
    if (t.near === 'site') {
      for (let x0 = 80; x0 < LW; x0 += 400) { for (const lx of [6, 104]) { g.fillStyle = '#495057'; g.fillRect(x0 + lx, GY - 46, 5, 46); } for (const y of [GY - 46, GY - 26]) { g.save(); g.beginPath(); g.rect(x0, y, 116, 14); g.clip(); g.fillStyle = '#f8f9fa'; g.fillRect(x0, y, 116, 14); g.fillStyle = '#f76707'; for (let i = -2; i < 10; i++) { g.beginPath(); g.moveTo(x0 + i * 16, y + 14); g.lineTo(x0 + i * 16 + 8, y + 14); g.lineTo(x0 + i * 16 + 22, y); g.lineTo(x0 + i * 16 + 14, y); g.fill(); } g.restore(); } }
      for (let x0 = 270; x0 < LW; x0 += 400) { g.fillStyle = vgrad(g, GY - 34, GY, ['#ff922b', '#d9480f']); g.beginPath(); g.moveTo(x0 - 4, GY - 34); g.lineTo(x0 + 4, GY - 34); g.lineTo(x0 + 13, GY - 4); g.lineTo(x0 - 13, GY - 4); g.fill(); g.fillStyle = '#fff'; g.fillRect(x0 - 7, GY - 22, 14, 5); g.fillStyle = '#343a40'; g.fillRect(x0 - 16, GY - 4, 32, 4); }
      for (let x0 = 600; x0 < LW; x0 += 800) { for (let i = 0; i < 6; i++) ball(g, x0 + (i % 3) * 30 + (i > 2 ? 15 : 0), GY - 10 - (i > 2 ? 16 : 0), 17, 10, pal('#c2a878'), 1); }
    }
    if (t.near === 'stalls') {
      for (let x0 = 40; x0 < LW; x0 += 320) { const ac = ['#e03131', '#1971c2', '#2b8a3e', '#c2255c'][Math.floor(R() * 4)];
        g.fillStyle = '#3a2a1e'; g.fillRect(x0, GY - 120, 5, 120); g.fillRect(x0 + 200, GY - 120, 5, 120);
        g.fillStyle = vgrad(g, GY - 60, GY, ['#7a4f2e', '#4a2f1a']); g.fillRect(x0 - 6, GY - 56, 218, 56);
        for (let i = 0; i < 9; i++) ball(g, x0 + 14 + i * 22, GY - 62, 9, 7, pal(['#ff922b', '#ffd43b', '#ff6b6b', '#69db7c', '#f783ac'][i % 5]), 1);
        for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? '#f8f9fa' : ac; g.beginPath(); g.moveTo(x0 - 10 + i * 25, GY - 128); g.lineTo(x0 + 15 + i * 25, GY - 128); g.lineTo(x0 + 15 + i * 25, GY - 108); g.quadraticCurveTo(x0 + 2 + i * 25, GY - 98, x0 - 10 + i * 25, GY - 108); g.fill(); }
        g.strokeStyle = '#1a1424'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0 + 100, GY - 128); g.quadraticCurveTo(x0 + 260, GY - 160, x0 + 420, GY - 128); g.stroke();
        for (let i = 1; i < 6; i++) { const q = i / 6, lx = x0 + 100 + 320 * q, ly = GY - 128 - Math.sin(q * Math.PI) * 15 + 12, col = i % 2 ? '#ff4d4d' : '#ffb21e';
          wrap(lx - 10, 20, (xx) => { ball(g, xx, ly, 8, 10, pal(col), 1.2); g.fillStyle = '#2b1d14'; g.fillRect(xx - 4, ly - 12, 8, 3); g.fillRect(xx - 4, ly + 9, 8, 3); }); B.lights.push({ x: lx, y: ly, r: 38, col, p: 0.75, sway: i }); }
      }
    }
    if (t.near === 'roof') {
      for (let x0 = 120; x0 < LW; x0 += 520) { g.fillStyle = vgrad(g, GY - 60, GY, ['#a8a2b8', '#6c6680']); rr(g, x0, GY - 60, 90, 60, 4); g.fill(); g.strokeStyle = '#4a4560'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(x0 + 8, GY - 52 + i * 8); g.lineTo(x0 + 50, GY - 52 + i * 8); g.stroke(); } g.beginPath(); g.arc(x0 + 70, GY - 30, 14, 0, TAU); g.stroke(); }
      for (let x0 = 380; x0 < LW; x0 += 520) { g.fillStyle = hgrad(g, x0, x0 + 14, ['#8e88a0', '#4e4860']); g.fillRect(x0, GY - 90, 14, 90); g.fillRect(x0 - 4, GY - 96, 22, 8); }
    }
    if (t.near === 'hive') {
      for (let x0 = 150; x0 < LW; x0 += 420) { const r = 16; for (let i = 0; i < 7; i++) { const x = x0 + (i % 4) * r * 1.73 + (i > 3 ? r * 0.87 : 0), y = GY - r - (i > 3 ? r * 1.5 : 0);
        g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); const gr = g.createRadialGradient(x - 4, y - 4, 1, x, y, r); gr.addColorStop(0, '#ffe08a'); gr.addColorStop(1, '#c47a0c'); g.fillStyle = gr; g.fill(); g.strokeStyle = '#8a4f06'; g.lineWidth = 2.5; g.stroke(); } }
    }
  }
  function paintGround(g, t, R) {
    const H = 70, dots = (n, cols, s = 2) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(R() * LW, R() * H, s, s * 0.7); } };
    if (t.ground === 'road') {
      g.fillStyle = vgrad(g, 0, 16, ['#c5c8cc', '#a3a7ad']); g.fillRect(0, 0, LW, 16); g.fillStyle = 'rgba(0,0,0,0.15)'; for (let x = 0; x < LW; x += 64) g.fillRect(x, 0, 2, 16);
      g.fillStyle = '#e9ecef'; g.fillRect(0, 16, LW, 2); g.fillStyle = '#6c7178'; g.fillRect(0, 18, LW, 5);
      g.fillStyle = vgrad(g, 23, H, ['#3d4148', '#4a4f57', '#3a3e45']); g.fillRect(0, 23, LW, H - 23); dots(1400, ['rgba(255,255,255,0.08)', 'rgba(0,0,0,0.18)']);
      g.fillStyle = 'rgba(255,255,255,0.75)'; for (let x = 0; x < LW; x += 120) g.fillRect(x, 46, 62, 4);
    }
    if (t.ground === 'pier') {
      g.fillStyle = vgrad(g, 0, H, ['#9a8670', '#6e5d4b']); g.fillRect(0, 0, LW, H); g.fillStyle = '#f2c94c'; g.fillRect(0, 0, LW, 4);
      g.strokeStyle = 'rgba(40,25,15,0.5)'; g.lineWidth = 1.5; for (let y = 12; y < H; y += 11) { g.beginPath(); g.moveTo(0, y); g.lineTo(LW, y); g.stroke(); for (let x = (y * 37) % 160; x < LW; x += 160) { g.beginPath(); g.moveTo(x, y - 11); g.lineTo(x, y); g.stroke(); } }
      dots(500, ['rgba(255,255,255,0.08)', 'rgba(0,0,0,0.15)']);
    }
    if (t.ground === 'sand') {
      g.fillStyle = vgrad(g, 0, H, ['#f6df9f', '#e8c477', '#d9ad5e']); g.fillRect(0, 0, LW, H); dots(1600, ['rgba(255,255,255,0.35)', 'rgba(140,100,40,0.25)']);
      g.strokeStyle = 'rgba(170,120,50,0.25)'; g.lineWidth = 2; for (let i = 0; i < 40; i++) { const x = R() * LW, y = 10 + R() * 55; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 30, y - 4, x + 60, y); g.stroke(); }
    }
    if (t.ground === 'dirt') {
      g.fillStyle = vgrad(g, 0, H, ['#b39274', '#92735a', '#7c604a']); g.fillRect(0, 0, LW, H); dots(2200, ['#6b5240', '#c9ad90', '#8a7a6a'], 3);
      g.fillStyle = 'rgba(70,50,35,0.3)'; for (const y of [26, 50]) for (let x = 0; x < LW; x += 14) g.fillRect(x, y + Math.sin(x / 90) * 3, 10, 6);
    }
    if (t.ground === 'wet') {
      g.fillStyle = vgrad(g, 0, H, ['#2a2640', '#17142a', '#100e1e']); g.fillRect(0, 0, LW, H); g.fillStyle = '#4b4570'; g.fillRect(0, 0, LW, 2);
      for (let i = 0; i < 18; i++) { const x = R() * LW, y = 14 + R() * 50, w = 60 + R() * 120; g.fillStyle = 'rgba(120,110,190,0.18)'; g.beginPath(); g.ellipse(x, y, w / 2, 4, 0, 0, TAU); g.fill(); }
    }
    if (t.ground === 'tar') {
      g.fillStyle = vgrad(g, 0, H, ['#5a4d6b', '#3f3550', '#2f283c']); g.fillRect(0, 0, LW, H); g.fillStyle = '#8a7aa0'; g.fillRect(0, 0, LW, 3);
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; for (let x = 0; x < LW; x += 96) { g.beginPath(); g.moveTo(x, 3); g.lineTo(x - 30, H); g.stroke(); } dots(900, ['rgba(255,255,255,0.08)', 'rgba(0,0,0,0.2)']);
    }
    if (t.ground === 'wax') {
      g.fillStyle = vgrad(g, 0, H, ['#e6a73a', '#c27d16', '#9a5c0a']); g.fillRect(0, 0, LW, H);
      g.strokeStyle = 'rgba(120,60,0,0.35)'; g.lineWidth = 2; const r = 14, hw = r * 1.732; for (let row = 0; row < 7; row++) for (let x = (row % 2) * hw / 2; x < LW; x += hw) { const y = row * r * 1.5; g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6); } g.closePath(); g.stroke(); }
    }
    g.fillStyle = vgrad(g, 0, 10, ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0)']); g.fillRect(0, 0, LW, 10);
  }
  function drawBG(c, place, camX, T) {
    const B = bake(place), t = B.t; RIM = t.rim;
    c.drawImage(B.sky, 0, 0);
    if (t.night) { c.fillStyle = '#fff'; for (let i = 0; i < 14; i++) { c.globalAlpha = 0.5 + 0.5 * Math.sin(T * 3 + i * 1.7); c.fillRect((i * 263) % 960, (i * 97) % 240, 2, 2); } c.globalAlpha = 1; }
    blit(c, B.far, camX * 0.15);
    if (t.sea) { // shimmering water
      const [sy] = t.sea; c.save(); c.globalAlpha = 0.5;
      for (let i = 0; i < 9; i++) { const y = sy + 6 + i * i * 1.4, w = 18 + i * 5; c.fillStyle = 'rgba(255,255,255,0.55)'; for (let x = (-(camX * (0.15 + i * 0.03)) % 160 + 160 + i * 53) % 160 - 160; x < 960; x += 160) c.fillRect(x + Math.sin(T * 1.5 + i + x) * 6, y, w, 1.5); }
      if (t.sun) { const sx = t.sun[0]; for (let i = 0; i < 12; i++) { const y = sy + 4 + i * ((GY - sy) / 12); c.fillStyle = `rgba(${t.sun[4]},0.75)`; c.fillRect(sx - (10 + i * 3) + Math.sin(T * 2 + i) * 5, y, 20 + i * 6, 2); } }
      c.restore();
    }
    blit(c, B.mid, camX * 0.4);
    if (t.foam) { c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 3; c.beginPath(); for (let x = 0; x <= 960; x += 16) c.lineTo(x, GY - 6 + Math.sin(x / 40 + T * 2 - camX / 40) * 2 + Math.sin(T * 0.8) * 3); c.stroke(); }
    if (B.near) blit(c, B.near, camX * 0.75);
    if (B.lights.length) { // glows on top of the baked lights
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const L of B.lights) {
        const off = ((camX * L.p) % LW + LW) % LW; let x = L.x - off; if (x < -80) x += LW; if (x > 1040) continue;
        let a = 0.5; if (L.blink) a = Math.sin(T * 3 + L.x) > 0.3 ? 0.9 : 0.05; if (L.flick) a = Math.sin(T * 13 + L.x) > -0.7 ? 0.55 : 0.1; if (L.pulse) a = 0.25 + 0.2 * Math.sin(T * 1.5 + L.x * 0.01);
        const y = L.y + (L.sway ? Math.sin(T * 2 + L.sway) * 1.5 : 0); glow(c, x, y, L.r, L.col, a);
        if (t.ground === 'wet' && L.p >= 0.4) { c.fillStyle = vgrad(c, GY + 2, GY + 64, [rgba(L.col, 0.28 * a), rgba(L.col, 0)]); c.fillRect(x - 8, GY + 2, 16, 62); }
      }
      c.restore();
    }
    if (t.hive) { c.fillStyle = 'rgba(255,230,140,0.8)'; for (let i = 0; i < 22; i++) { const x = ((i * 137 + T * (14 + (i % 4) * 6)) % 1000) - 20, y = 50 + ((i * 71) % 380) + Math.sin(T + i) * 12; c.globalAlpha = 0.4 + 0.4 * Math.sin(T * 2 + i); c.fillRect(x, y, 2.5, 2.5); } c.globalAlpha = 1; }
    blit(c, B.ground, camX, GY);
  }
  // soft contact shadow under feet
  function shadow(c, x, w, a = 0.35) { const g = c.createRadialGradient(x, GY + 4, 0, x, GY + 4, w); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(x, GY + 4, w, w * 0.22, 0, 0, TAU); c.fill(); }
  let VIG = null;
  function vignette(c) { VIG ||= mk(960, 540, (g) => { const gr = g.createRadialGradient(480, 280, 260, 480, 280, 640); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.42)'); g.fillStyle = gr; g.fillRect(0, 0, 960, 540); }); c.drawImage(VIG, 0, 0); }

  // ---------- enemies ----------
  const GRUNT = { kind: 'grunt', suit: '#25222d', helmet: '#3a3642', glove: '#4a4552', boot: '#2e2a35', trail: '#ff6b6b' };
  const BRUTE = { ...GRUNT, kind: 'brute', suit: '#2c2833', helmet: '#45404d' };
  function drawMob(c, e, cam, frame) {
    const M = SS.MOBS[e.k], fl = hitFlash(e, e.hp), x = e.x - cam + (fl > 0.3 ? (frame % 2 ? 2 : -2) : 0);
    let fade = 1; if (e.dead && e.state === 'down' && e.t < 16) fade = e.t / 16; c.globalAlpha = fade;
    if (e.k === 'spiderling') {
      const y = GY - e.y - 18, F = e.face, Bd = pal(fl ? '#ffffff' : '#6741d9');
      c.lineCap = 'round'; for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) { const kx = x + sd * (14 + i * 5), ky = y - 14 + Math.sin(frame / 3 + i + sd) * 4; c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.moveTo(x, y); c.lineTo(kx, ky); c.lineTo(x + sd * (24 + i * 6), GY - e.y); c.stroke(); c.strokeStyle = '#4a2fa8'; c.lineWidth = 2.5; c.stroke(); }
      ball(c, x - F * 6, y, 19, 15, Bd); ball(c, x + F * 14, y - 3, 11, 9, pal(fl ? '#fff' : '#5235b8'));
      ell(c, x + F * 19, y - 6, 2.5, 2.5, '#ff3b3b'); ell(c, x + F * 15, y - 7, 2, 2, '#ff3b3b'); glow(c, x + F * 18, y - 6, 8, '#ff3030', 0.5);
      c.fillStyle = '#ff6b6b'; c.beginPath(); c.moveTo(x - F * 6, y - 9); c.lineTo(x - F * 2, y - 2); c.lineTo(x - F * 6, y + 5); c.lineTo(x - F * 10, y - 2); c.fill();
      c.globalAlpha = 1; return;
    }
    if (e.k === 'bee') {
      const y = GY - e.y - 22, F = e.face;
      c.globalAlpha = 0.5 * fade; for (const s of [-1, 1]) { c.save(); c.translate(x - F * 4, y - 12); c.rotate(-F * 0.3 + s * Math.sin(frame * 1.3) * 0.5); ell(c, s * 8, -10, 9, 16, '#e7f5ff'); c.restore(); } c.globalAlpha = fade;
      c.save(); c.beginPath(); c.ellipse(x, y, 22, 15, 0, 0, TAU); c.clip(); ball(c, x, y, 22, 15, pal(fl ? '#fff' : '#fcc419'), 0); c.fillStyle = 'rgba(25,20,15,0.85)'; c.fillRect(x - 9, y - 16, 6, 32); c.fillRect(x + 3, y - 16, 6, 32); c.restore();
      c.beginPath(); c.ellipse(x, y, 22, 15, 0, 0, TAU); outl(c, 2);
      ball(c, x + F * 21, y - 3, 10, 9, pal('#2b2622')); ell(c, x + F * 25, y - 5, 3, 3.5, '#ff6b6b');
      c.fillStyle = '#1b1612'; c.beginPath(); c.moveTo(x - F * 21, y - 4); c.lineTo(x - F * 36, y + 1); c.lineTo(x - F * 21, y + 4); c.fill();
      c.globalAlpha = 1; return;
    }
    let p, rate = 0.3;
    if (e.dead) p = e.state === 'air' ? mix(P.hurt, P.down, 0.5) : P.down;
    else if (e.carry) p = walkPose(P.carry, frame, 4);
    else if (e.state === 'wind') { p = M.ranged ? P.shoot : P.wind; rate = 0.25; }
    else if (e.state === 'strike') { p = M.ranged ? P.shoot : { ...(e.k === 'brute' ? P.power : P.jab), trail: e.k === 'brute' ? 'h1' : 'h2' }; rate = 0.65; }
    else if (e.state === 'hurt') { p = P.hurt; rate = 0.6; }
    else if (e.state === 'air') p = mix(P.hurt, P.down, 0.4);
    else if (e.state === 'down') p = P.down;
    else p = walkPose(P.idle, frame + e.x, 5);
    const look = { ...(e.k === 'brute' ? BRUTE : GRUNT), bow: M.ranged };
    figure(c, x, e.y, e.face, smooth(e, p, rate), look, e.k === 'brute' ? 1.1 : 0.92, fl);
    if (e.state === 'wind' && !e.dead) { const yy = GY - e.y - e.h - 30, pu = 1 + 0.15 * Math.sin(frame / 2); glow(c, x, yy, 26, '#ff3b3b', 0.5); c.save(); c.translate(x, yy); c.scale(pu, pu); c.fillStyle = '#ff3b3b'; c.beginPath(); c.moveTo(0, -14); c.lineTo(12, 8); c.lineTo(-12, 8); c.closePath(); c.fill(); c.lineWidth = 2; c.strokeStyle = '#fff'; c.stroke(); c.fillStyle = '#fff'; c.font = '900 14px system-ui'; c.textAlign = 'center'; c.fillText('!', 0, 6); c.restore(); }
    c.globalAlpha = 1;
  }

  // bosses: drawn in local space at their feet, facing right (scale handles the facing); y is down here
  function drawBoss(c, b, cam, frame, k = 1, flash = 0) {
    const D = b.def, id = D.parts ? D.parts[0] : 'turtle', key = b.key || b, fq = flash > 0.04 ? Math.round(flash * 4) / 4 : 0;
    const C = (col) => pal(fq ? mixc(col, '#ffffff', fq * 0.85) : col), col2 = D.color2 || shade(D.color, 0.35);
    const o = mem(key), inv = b.move === 'shell' || b.move === 'guard';
    // anticipation / lunge: lean back while it telegraphs, lunge forward when it strikes
    let tl = 0, ts = 1; if (b.tele) { tl = -0.1; ts = 0.92; } else if (b.move && !inv && b.move !== 'counter') { tl = 0.13; ts = 1.05; }
    o.bl = lag(key, 'lean', tl, 0.25); o.bs = lag(key, 'sq', ts, 0.25);
    if (id === 'dark') {
      const p = b.move === 'dash' ? { ...P.rush, trail: 'h2' } : b.move === 'counter' ? P.stance : b.move === 'shoot' ? P.shoot : b.move === 'swipe' && b.mt > 18 ? { ...P.slash, trail: 'h2' } : b.move === 'swipe' ? P.wind : b.dizzy ? P.hurt : walkPose(P.idle, frame, 6);
      if (b.tele || b.move === 'counter') { const col = b.move === 'counter' ? '#be4bdb' : '#ff3b3b'; c.save(); c.globalCompositeOperation = 'lighter'; glow(c, b.x - cam, GY - b.y * k - 80 * k, 110 * k, col, 0.35 + 0.15 * Math.sin(frame / 3)); c.restore(); }
      figure(c, b.x - cam, b.y * k, b.face || -1, smooth(key, p, b.move === 'swipe' ? 0.6 : 0.35), { kind: 'hero', suit: '#26262e', helmet: '#33333d', visor: '#e03131', glove: '#c92a2a', boot: '#1d1d24', vshape: 'T', sword: true, mouth: true, trail: '#ff6b6b' }, 1.15 * k, flash);
      return;
    }
    const X = b.x - cam, Y = GY - b.y * k;
    if (b.tele) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, X, Y - D.h * 0.5 * k, (D.w * 0.9 + 40) * k, '#ff3b3b', 0.3 + 0.2 * Math.sin(frame / 2.5)); c.restore(); }
    c.save(); c.translate(X, Y); c.scale((b.face || -1) * k, k); UPY = -1; c.lineCap = 'round'; c.lineJoin = 'round';
    c.rotate(o.bl + (b.dizzy ? Math.sin(frame / 4) * 0.08 : 0)); const br = 1 + Math.sin(frame / 14) * 0.015; c.scale(2 - o.bs, o.bs * br);
    const bob = Math.sin(frame / 10) * 3, S = C(D.color), Sd = C(shade(D.color, -0.25)), S2 = C(col2);
    const eye = (x, y, r, angry = true) => { ball(c, x, y, r, r, pal('#ffffff'), 1.6); ell(c, x + r * 0.25, y, r * 0.5, r * 0.55, '#16121f'); ell(c, x + r * 0.05, y - r * 0.3, r * 0.22, r * 0.22, '#fff'); if (angry) { c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(x - r * 1.1, y - r * 1.2); c.lineTo(x + r * 1.1, y - r * 0.6); c.stroke(); } };
    if (id === 'turtle') {
      for (const lx of [-40, 26]) { capsule(c, [lx, -46], [lx - 2, -8], 14, 15, Sd, 2.5); for (let i = 0; i < 3; i++) ell(c, lx - 10 + i * 9, -3, 3, 3, '#e9ecef'); }
      if (!inv) { capsule(c, [36, -72], [56, -88 + bob], 15, 14, C(shade(D.color, 0.12)), 2.5); ball(c, 64, -94 + bob, 25, 21, C(shade(D.color, 0.15)), 2.5); c.fillStyle = '#f2c94c'; c.beginPath(); c.moveTo(80, -98 + bob); c.quadraticCurveTo(94, -92 + bob, 84, -82 + bob); c.lineTo(76, -86 + bob); c.closePath(); c.fill(); outl(c, 2); eye(70, -102 + bob, 6); }
      else ball(c, 52, -78, 12, 10, C(shade(D.color, 0.1)), 2);
      const sh = inv ? 66 : 58; c.beginPath(); c.ellipse(-6, -80, 72, sh, 0, Math.PI, TAU); c.closePath();
      let g = c.createRadialGradient(-26, -80 - sh * 0.8, 6, -6, -80, 90); g.addColorStop(0, S.ll); g.addColorStop(0.45, S.b); g.addColorStop(1, S.dd); c.fillStyle = g; c.fill(); outl(c, 3);
      c.save(); c.clip(); for (const [hx, hy] of [[-36, -100], [6, -112], [-14, -132], [30, -96], [-56, -88], [44, -120]]) { c.beginPath(); for (let i = 0; i < 6; i++) c.lineTo(hx + Math.cos(i * 1.047) * 15, hy + Math.sin(i * 1.047) * 13); c.closePath(); c.fillStyle = rgba(S.l, 0.35); c.fill(); c.strokeStyle = S.dd; c.lineWidth = 3.5; c.stroke(); } c.restore();
      rr(c, -80, -86, 148, 12, 6); g = c.createLinearGradient(0, -86, 0, -74); g.addColorStop(0, S2.ll); g.addColorStop(1, S2.d); c.fillStyle = g; c.fill(); outl(c, 2.5);
    } else if (id === 'eagle') {
      const flap = Math.sin(frame / (b.fly ? 2 : 8)) * 0.6;
      const wing = (sx, rot, pl) => { c.save(); c.translate(sx, -104); c.rotate(rot); for (let i = 0; i < 4; i++) ball(c, -30 - i * 16, 6 + i * 5, 42 - i * 4, 11, pl, 2, 0.15); ball(c, -24, -2, 34, 16, pl, 2); c.restore(); };
      wing(-6, -0.6 + flap, Sd);
      c.fillStyle = C(shade(D.color, -0.3)).b; c.beginPath(); c.moveTo(-20, -50); c.lineTo(-58, -20); c.lineTo(-40, -14); c.lineTo(-48, -2); c.lineTo(-10, -36); c.fill(); outl(c, 2);
      for (const lx of [-10, 12]) { capsule(c, [lx, -40], [lx, -6], 5, 4, pal('#f2b705'), 2); for (const d of [-7, 0, 7]) { c.strokeStyle = '#212529'; c.lineWidth = 3; c.beginPath(); c.moveTo(lx, -4); c.lineTo(lx + d + 4, 0); c.stroke(); } }
      ball(c, 0, -80 + bob, 34, 52, S, 2.5); ball(c, 8, -68 + bob, 21, 32, pal('#f3e7d3'), 0);
      c.strokeStyle = 'rgba(150,110,70,0.5)'; c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(8, -84 + i * 12 + bob, 9, 0.2, Math.PI - 0.2); c.stroke(); }
      ball(c, 18, -140 + bob, 24, 22, pal(fq ? '#fff' : '#f8f9fa'), 2.5);
      c.beginPath(); c.moveTo(34, -148 + bob); c.quadraticCurveTo(62, -146 + bob, 60, -128 + bob); c.quadraticCurveTo(52, -134 + bob, 34, -132 + bob); c.closePath(); const g = c.createLinearGradient(34, -148, 60, -128); g.addColorStop(0, '#ffd43b'); g.addColorStop(1, '#e67700'); c.fillStyle = g; c.fill(); outl(c, 2);
      ball(c, 26, -146 + bob, 5, 5, pal('#ffd43b'), 1.2); ell(c, 27, -146 + bob, 2.5, 3, '#111'); c.strokeStyle = OUT; c.lineWidth = 3.5; c.beginPath(); c.moveTo(16, -156 + bob); c.lineTo(36, -150 + bob); c.stroke();
      wing(10, 0.6 - flap - 0.2, S);
    } else if (id === 'puffer') {
      const r = inv ? 74 : 56 + Math.sin(frame / 8) * 3, cy = -r - 10;
      c.fillStyle = S2.b; c.beginPath(); c.moveTo(-r + 6, cy); c.lineTo(-r - 34, cy - 30); c.quadraticCurveTo(-r - 22, cy, -r - 34, cy + 28); c.closePath(); c.fill(); outl(c, 2.5);
      for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, l = inv ? 26 : 14, x0 = Math.cos(a) * r, y0 = cy + Math.sin(a) * r, x1 = Math.cos(a) * (r + l), y1 = cy + Math.sin(a) * (r + l), nx = -Math.sin(a) * 6, ny = Math.cos(a) * 6;
        c.beginPath(); c.moveTo(x0 + nx, y0 + ny); c.lineTo(x1, y1); c.lineTo(x0 - nx, y0 - ny); c.closePath(); c.fillStyle = C('#f8f0d8').b; c.fill(); c.lineWidth = 1.6; c.strokeStyle = OUT; c.stroke(); }
      ball(c, 0, cy, r, r, S, 3); c.save(); c.beginPath(); c.arc(0, cy, r - 1.5, 0, TAU); c.clip(); ball(c, 4, cy + r * 0.45, r * 0.8, r * 0.5, pal('#fff6d6'), 0); c.restore();
      for (const [sx, sy] of [[-30, -0.7], [-10, -0.85], [-42, -0.4], [12, -0.75]]) ell(c, sx * r / 56, cy + sy * r * 0.6, 5, 4, rgba(S.dd, 0.5));
      eye(r * 0.45, cy - 14, 13); ball(c, r * 0.88, cy + 8, 9, 7, pal('#ff922b'), 2); ell(c, r * 0.92, cy + 8, 3, 2.5, '#7a2e0b');
      c.save(); c.translate(-6, cy + 18); c.rotate(Math.sin(frame / 5) * 0.3); ball(c, -10, 0, 18, 8, S2, 2); c.restore();
    } else if (id === 'mole') {
      for (const lx of [-24, 22]) ball(c, lx, -8, 18, 9, Sd, 2);
      ball(c, 0, -62 + bob, 52, 60, S, 3); ball(c, 10, -48 + bob, 30, 36, pal('#c9a98a'), 0);
      ball(c, 36, -110 + bob, 29, 25, S, 2.5); ball(c, 62, -104 + bob, 9, 7, pal('#ff8fa3'), 2);
      c.fillStyle = '#16121f'; rr(c, 22, -126 + bob, 34, 11, 4); c.fill(); c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.moveTo(28, -124 + bob); c.lineTo(34, -124 + bob); c.lineTo(30, -117 + bob); c.lineTo(25, -117 + bob); c.fill();
      for (const sx of [1, -1]) { c.save(); c.translate(sx * 42, -62 + bob); c.rotate(sx * Math.sin(frame / 6) * 0.3);
        c.beginPath(); c.moveTo(0, -14); c.lineTo(sx * 46, 0); c.lineTo(0, 14); c.closePath(); const g = c.createLinearGradient(0, -14, 0, 14); g.addColorStop(0, '#f1f3f5'); g.addColorStop(0.5, '#adb5bd'); g.addColorStop(1, '#495057'); c.fillStyle = g; c.fill(); outl(c, 2);
        c.strokeStyle = '#5c636a'; c.lineWidth = 2; for (let i = 0; i < 4; i++) { const q = ((i * 11 + frame * 2) % 44) / 46; c.beginPath(); c.moveTo(sx * 46 * q, -14 * (1 - q)); c.lineTo(sx * (46 * q + 5), 14 * (1 - q)); c.stroke(); } c.restore(); }
    } else if (id === 'spider') {
      const L = C(shade(D.color, -0.35));
      for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) { const kx = sd * (60 + i * 14), ky = -112 + i * 6 + Math.sin(frame / 6 + i + sd) * 6, fx = sd * (72 + i * 20); capsule(c, [sd * 18, -64], [kx, ky], 6, 5, L, 2); capsule(c, [kx, ky], [fx, 0], 5, 2.5, L, 2); }
      ball(c, -22, -68, 54, 44, S, 3); c.fillStyle = '#ff3b3b'; c.beginPath(); c.moveTo(-30, -92); c.lineTo(-18, -70); c.lineTo(-30, -48); c.lineTo(-42, -70); c.closePath(); c.fill(); outl(c, 2);
      ball(c, 42, -62, 30, 28, C(shade(D.color, 0.12)), 2.5);
      for (const [ex, ey, er] of [[56, -72, 5], [64, -62, 4.5], [50, -60, 4], [60, -52, 3.5], [48, -76, 3]]) { glow(c, ex, ey, er * 3, '#ff2020', 0.5); ell(c, ex, ey, er, er, '#ff3b3b'); ell(c, ex - 1, ey - 1, er * 0.35, er * 0.35, '#fff'); }
      for (const fx of [62, 70]) { c.fillStyle = '#e9ecef'; c.beginPath(); c.moveTo(fx - 4, -44); c.lineTo(fx + 2, -30 + Math.sin(frame / 4) * 2); c.lineTo(fx + 4, -44); c.fill(); }
    } else if (id === 'queen') {
      const flap = Math.sin(frame / 2) * 0.4;
      const wings = () => { for (const s of [-1, 1]) { c.save(); c.translate(s * 10, -122); c.rotate(s * 0.4 - s * flap); c.beginPath(); c.ellipse(s * 10, -34, 26, 62, 0, 0, TAU); c.fillStyle = 'rgba(220,240,255,0.45)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2; c.stroke(); c.lineWidth = 1; c.beginPath(); c.moveTo(0, 0); c.lineTo(s * 14, -80); c.moveTo(s * 4, -30); c.lineTo(s * 26, -40); c.moveTo(s * 6, -54); c.lineTo(s * 22, -76); c.stroke(); c.restore(); } };
      wings();
      for (const lx of [-4, 16]) capsule(c, [lx, -40], [lx + 4, -2], 4.5, 3, pal('#2b2622'), 2);
      c.save(); c.translate(-34, -64 + bob); c.rotate(-0.2); c.beginPath(); c.ellipse(0, 0, 44, 32, 0, 0, TAU); c.save(); c.clip(); ball(c, 0, 0, 44, 32, S, 0); c.fillStyle = 'rgba(25,20,15,0.85)'; for (const sx of [-24, -6, 12]) c.fillRect(sx, -34, 9, 68); c.restore(); outl(c, 3);
      c.fillStyle = '#1b1612'; c.beginPath(); c.moveTo(-40, -6); c.lineTo(-72, 4); c.lineTo(-40, 8); c.fill(); c.restore();
      ball(c, 16, -112 + bob, 25, 36, S, 2.5); c.fillStyle = 'rgba(25,20,15,0.85)'; c.fillRect(-2, -104 + bob, 36, 8);
      ball(c, 30, -158 + bob, 23, 21, pal('#2b2622'), 2.5); ball(c, 42, -160 + bob, 10, 13, pal('#e03131'), 1.5); ell(c, 40, -165 + bob, 3, 4, 'rgba(255,255,255,0.7)');
      c.strokeStyle = '#2b2622'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(36, -176 + bob); c.quadraticCurveTo(50, -196 + bob, 62, -190 + bob); c.stroke();
      c.beginPath(); c.moveTo(12, -176 + bob); c.lineTo(18, -198 + bob); c.lineTo(26, -184 + bob); c.lineTo(34, -202 + bob); c.lineTo(42, -182 + bob); c.closePath(); const g = c.createLinearGradient(0, -202, 0, -176); g.addColorStop(0, '#fff3bf'); g.addColorStop(0.5, '#ffd43b'); g.addColorStop(1, '#e67700'); c.fillStyle = g; c.fill(); outl(c, 2); ell(c, 27, -186 + bob, 3, 3, '#e64980');
      capsule(c, [24, -120 + bob], [46, -110 + bob], 4, 3.5, pal('#2b2622'), 1.6);
    }
    if (D.color2 && id !== 'dark') { for (let i = 0; i < 3; i++) ball(c, -44 + i * 36, -D.h * 0.6, 11, 7, S2, 1.5); }
    if (b.dizzy) { c.scale(b.face || -1, 1); for (let i = 0; i < 3; i++) { const a = frame / 10 + i * 2.1; star(c, Math.cos(a) * 44, -D.h - 22 + Math.sin(a) * 10, 9, '#ffd43b'); } }
    c.restore();
  }
  function star(c, x, y, r, col) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); }

  // ---------- civilians ----------
  const CIV = {
    suit: { suit: '#3b4250', leg: '#2b2f38', glove: '#f1c9a5', boot: '#1b1b1f', skin: '#f1c9a5', hair: '#2b2018', tie: '#c92a2a' },
    kid: { suit: '#339af0', leg: '#364fc7', glove: '#e8b48a', boot: '#f8f9fa', skin: '#e8b48a', hair: '#3b2a1e', cap: '#e03131' },
    granny: { suit: '#ae3ec9', leg: '#5f3dc4', glove: '#f3d2b6', boot: '#5c4033', skin: '#f3d2b6', hair: '#ced4da', bun: true },
    student: { suit: '#2f9e44', leg: '#343a40', glove: '#c99067', boot: '#f1f3f5', skin: '#c99067', hair: '#1b1410' },
  };
  function drawCiv(c, v, cam, frame) {
    const x = v.x - cam, carried = v.state === 'carried', y = carried ? v.y : 0;
    if (v.kind === 'dog') {
      c.save(); c.translate(x, GY - y); c.scale(v.dir || 1, 1); if (carried) c.rotate(Math.PI * 0.5);
      const run = Math.sin(frame / 3 + v.x) * 10, D = pal('#c76a2b');
      for (const [lx, s] of [[-10, 1], [10, -1]]) capsule(c, [lx, -12], [lx + s * run * 0.6, 0], 3.5, 3, D, 1.5);
      c.strokeStyle = D.d; c.lineWidth = 4; c.beginPath(); c.moveTo(-16, -18); c.lineTo(-24, -28 + run * 0.4); c.stroke();
      ball(c, 0, -17, 18, 10, D, 2); ball(c, 16, -26, 9, 8, D, 2); ball(c, 13, -32, 3, 6, pal('#8a4416'), 1, -0.4); ell(c, 21, -28, 1.8, 1.8, '#111'); ell(c, 25, -25, 2.2, 1.8, '#111');
      c.restore(); return;
    }
    const L = { kind: 'civ', ...(CIV[v.kind] || CIV.suit) }, kid = v.kind === 'kid';
    const p = carried ? { ...P.down, ua1: -150 + Math.sin(frame / 3) * 30, ua2: -120 - Math.sin(frame / 3) * 30, th2: 30 + Math.sin(frame / 2) * 20 } : walkPose(P.panic, frame + v.x, 3);
    if (!carried) { p.fa1 += Math.sin(frame / 2 + v.x) * 20; p.fa2 -= Math.sin(frame / 2 + v.x) * 20; }
    figure(c, x, y, v.dir || 1, smooth(v, p, 0.4), L, kid ? 0.6 : 0.82);
    if (carried && frame % 60 < 40) { c.font = 'italic 900 16px system-ui'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = OUT; c.strokeText('HELP!', x, GY - y - 46); c.fillStyle = '#fff'; c.fillText('HELP!', x, GY - y - 46); }
  }

  // ---------- projectiles ----------
  function drawShot(c, p, cam, frame) {
    const x = p.x - cam, y = GY - p.y, d = Math.sign(p.vx) || p.face || 1;
    switch (p.k) {
      case 'wave': case 'darkwave': { const dk = p.k === 'darkwave', col = dk ? '#be4bdb' : '#ff6b6b';
        c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, 70, col, 0.45); c.restore();
        c.save(); c.translate(x, y); c.scale(d, 1); c.beginPath(); c.arc(-26, 0, 46, -1, 1); c.arc(-40, 0, 40, 0.95, -0.95, true); c.closePath(); const g = c.createLinearGradient(-30, 0, 22, 0); g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.6, col); g.addColorStop(1, dk ? '#2b0b33' : '#fff'); c.fillStyle = g; c.fill(); c.restore(); break; }
      case 'shuriken': c.save(); c.translate(x, y); c.rotate(frame / 2); c.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 4 : 14, a = i * Math.PI / 4; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); const g = c.createLinearGradient(-14, -14, 14, 14); g.addColorStop(0, '#e7f5ff'); g.addColorStop(0.5, '#74c0fc'); g.addColorStop(1, '#1864ab'); c.fillStyle = g; c.fill(); outl(c, 1.5); ell(c, 0, 0, 3, 3, '#16121f'); c.restore();
        c.strokeStyle = 'rgba(116,192,252,0.4)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - d * 10, y); c.lineTo(x - d * 40, y); c.stroke(); break;
      case 'quake': for (let i = 0; i < 4; i++) { const h = 30 + (i % 2) * 22 + Math.sin(frame + i) * 4; c.beginPath(); c.moveTo(x - 32 + i * 15, GY); c.lineTo(x - 24 + i * 15, GY - h); c.lineTo(x - 14 + i * 15, GY); c.closePath(); const g = c.createLinearGradient(0, GY - h, 0, GY); g.addColorStop(0, '#fff3bf'); g.addColorStop(1, '#e67700'); c.fillStyle = g; c.fill(); outl(c, 1.5); } glow(c, x, GY - 10, 50, '#ffd43b', 0.4); break;
      case 'laser': { const Lw = 760, k = p.life / 12, x0 = p.face > 0 ? x : x - Lw; c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = vgrad(c, y - 22 * k, y + 22 * k, ['rgba(116,192,252,0)', `rgba(116,192,252,${0.7 * k})`, 'rgba(116,192,252,0)']); c.fillRect(x0, y - 22 * k, Lw, 44 * k); c.restore(); c.fillStyle = `rgba(255,255,255,${k})`; c.fillRect(x0, y - 4 * k, Lw, 8 * k); break; }
      case 'arrow': c.strokeStyle = '#7a4a24'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - d * 16, y); c.lineTo(x + d * 12, y); c.stroke(); c.fillStyle = '#ced4da'; c.beginPath(); c.moveTo(x + d * 22, y); c.lineTo(x + d * 10, y - 5); c.lineTo(x + d * 10, y + 5); c.fill(); c.fillStyle = '#e03131'; c.beginPath(); c.moveTo(x - d * 16, y); c.lineTo(x - d * 22, y - 5); c.lineTo(x - d * 12, y); c.lineTo(x - d * 22, y + 5); c.fill(); break;
      case 'feather': { const a = Math.atan2(-p.vy, p.vx); ball(c, x, y, 17, 5, pal('#f3e7d3'), 1.2, a); c.strokeStyle = '#a0522d'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - Math.cos(a) * 17, y - Math.sin(a) * 17); c.lineTo(x + Math.cos(a) * 17, y + Math.sin(a) * 17); c.stroke(); break; }
      case 'spine': c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.moveTo(x, y); c.lineTo(x - p.vx * 2.5, y + p.vy * 2.5); c.stroke(); c.strokeStyle = '#ffd8a8'; c.lineWidth = 2.5; c.stroke(); break;
      case 'rock': ball(c, x, y, 14, 12, pal('#868e96'), 2, frame * 0.1); break;
      case 'web': c.strokeStyle = 'rgba(241,243,245,0.9)'; c.lineWidth = 1.6; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + frame * 0.05; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 24, y + Math.sin(a) * 24); c.stroke(); } for (const r of [8, 15, 22]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); } break;
      case 'stinger': c.fillStyle = '#1b1612'; c.beginPath(); c.moveTo(x + d * 18, y); c.lineTo(x - d * 10, y - 4); c.lineTo(x - d * 10, y + 4); c.fill(); c.strokeStyle = 'rgba(255,212,59,0.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - d * 12, y); c.lineTo(x - d * 30, y); c.stroke(); break;
      case 'honey': ball(c, x, y, 13, 11, pal('#f59f00'), 1.5); break;
      case 'roboshot': c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, 36, '#4dabf7', 0.7); c.restore(); ell(c, x, y, 20, 7, '#a5d8ff'); ell(c, x, y, 11, 4, '#fff'); break;
      case 'robobeam': { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = vgrad(c, y - 46, y + 46, ['rgba(77,171,247,0)', 'rgba(77,171,247,0.75)', 'rgba(77,171,247,0)']); c.fillRect(x - 90, y - 46, 180, 92); c.restore(); c.fillStyle = vgrad(c, y - 14, y + 14, ['#a5d8ff', '#ffffff', '#a5d8ff']); c.fillRect(x - 80, y - 14, 160, 28); break; }
      case 'rocketfist': { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) glow(c, x - d * (50 + i * 18), y + Math.sin(frame + i) * 3, 26 - i * 4, '#ff922b', 0.7); c.restore();
        c.save(); c.translate(x, y); c.scale(d, 1); c.fillStyle = vgrad(c, -26, 26, ['#ffd8a8', '#f59f00', '#a34d00']); rr(c, -34, -26, 68, 52, 14); c.fill(); outl(c, 3); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 2; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(14, -18 + i * 14); c.lineTo(32, -18 + i * 14); c.stroke(); } c.restore(); break; }
      case 'giantshot': c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, 50, '#ff3b3b', 0.6); c.restore(); ball(c, x, y, 24, 24, pal('#e03131'), 2); ell(c, x, y, 10, 10, '#ffe3e3'); break;
    }
  }

  // ---------- giant robot (y-down space, facing right) ----------
  function drawRobo(c, r, cam, frame) {
    const H = SS.HEROES[r.pilot], arm = H.robo, x = r.x - cam, o = mem(r), Z = SS.ROBO[arm].z;
    const hurt = r.state === 'hurt' && frame % 6 < 3, M = pal(hurt ? '#ffffff' : '#d3d9e0'), DK = pal('#5f6875'), HC = pal(H.color), GD = pal('#f2b705');
    // front arm angle: wind up, snap through, follow through (0 = hanging, negative = forward/up)
    let tA = arm === 'saber' ? -0.72 : -0.25, rate = 0.3, strike = false, lunge = 0;
    if (r.state === 'guard') { tA = -1.45; rate = 0.45; }
    else if (r.state === 'atk' && Z.s) { const t = r.t; rate = 0.55; if (arm === 'saber') { if (t <= Z.s) tA = -0.72 - 2.1 * ease(t / Z.s); else if (t <= Z.s + Z.a) { tA = -0.45; strike = true; rate = 0.75; } else tA = -0.45 - 0.27 * ease((t - Z.s - Z.a) / Z.c); }
      else { if (t <= Z.s) tA = 0.45 * ease(t / Z.s); else if (t <= Z.s + Z.a) { tA = -1.58; strike = true; rate = 0.8; lunge = 26; } else { tA = -1.58 + 1.33 * ease((t - Z.s - Z.a) / Z.c); lunge = 26 * (1 - (t - Z.s - Z.a) / Z.c); } } }
    else if (r.state === 'charge') { tA = arm === 'saber' ? 0.9 : -1.45; }
    else if (r.state === 'big') { if (arm === 'saber') { tA = r.t < 6 ? -2.8 : -0.3; strike = r.t >= 4 && r.t < 14; rate = 0.7; } else { tA = -1.55; lunge = r.t < 10 ? 20 : 0; } }
    else if (arm === 'blaster' && r.cd > 0) tA = -1.5;
    const A = lag(r, 'arm', tA, rate), Lg = lag(r, 'lunge', lunge, 0.4);
    const walk = r.state === 'walk' ? Math.sin(frame / 8) : 0;
    c.save(); c.translate(x, GY - r.y); c.scale(r.face, 1); c.translate(Lg, 0); UPY = -1; c.lineJoin = 'round'; c.lineCap = 'round';
    if (r.state === 'charge') { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 0, -180, 170 + r.charge, H.color, 0.25 + 0.2 * Math.sin(frame / 2)); c.restore(); }
    if (r.y > 0) { c.save(); c.globalCompositeOperation = 'lighter'; for (const fx of [-40, 30]) { const fl = 34 + Math.random() * 18; c.fillStyle = vgrad(c, 0, fl, ['rgba(255,240,200,0.95)', 'rgba(255,146,43,0.7)', 'rgba(255,80,0,0)']); c.beginPath(); c.moveTo(fx - 16, 0); c.quadraticCurveTo(fx, fl * 1.6, fx + 16, 0); c.fill(); } c.restore(); }
    const panel = (x0, y0, w, h, pl, rad = 6, lw = 3) => { rr(c, x0, y0, w, h, rad); const g = c.createLinearGradient(x0, y0, x0 + w, y0 + h); g.addColorStop(0, pl.ll); g.addColorStop(0.45, pl.b); g.addColorStop(1, pl.dd); c.fillStyle = g; c.fill(); c.lineWidth = lw; c.strokeStyle = OUT; c.stroke(); };
    // back arm
    c.save(); c.translate(-54, -238); c.rotate(0.15 + walk * 0.2); panel(-15, -4, 30, 62, pal('#8a939e')); panel(-16, 56, 32, 54, pal('#8a939e')); ball(c, 0, 118, 17, 15, pal('#8a939e'), 3); c.restore();
    // legs
    for (const [lx, sw, back] of [[-36, walk, true], [32, -walk, false]]) { const LP = back ? pal('#9aa3ad') : M;
      c.save(); c.translate(lx, -122); c.rotate(sw * 0.16); panel(-19, 0, 38, 58, back ? pal('#4d5560') : DK); ball(c, 0, 60, 16, 14, back ? pal(shade(H.color, -0.3)) : HC, 3); panel(-23, 66, 46, 44, LP); c.beginPath(); c.moveTo(-28, 108); c.lineTo(36, 108); c.lineTo(42, 122); c.lineTo(-28, 122); c.closePath(); c.fillStyle = vgrad(c, 108, 122, [LP.l, LP.d]); c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke(); c.restore(); }
    // pelvis + torso
    panel(-46, -142, 92, 30, DK, 8); panel(-14, -140, 28, 24, HC, 4, 2);
    c.beginPath(); c.moveTo(-72, -254); c.lineTo(72, -254); c.lineTo(58, -150); c.lineTo(-58, -150); c.closePath(); let g = c.createLinearGradient(-60, -254, 40, -150); g.addColorStop(0, M.ll); g.addColorStop(0.5, M.b); g.addColorStop(1, M.dd); c.fillStyle = g; c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-40 + i * 4, -172 + i * 6); c.lineTo(40 - i * 4, -172 + i * 6); c.stroke(); }
    c.beginPath(); c.moveTo(-64, -252); c.lineTo(0, -198); c.lineTo(64, -252); c.lineTo(50, -232); c.lineTo(0, -212); c.lineTo(-50, -232); c.closePath(); g = c.createLinearGradient(0, -252, 0, -198); g.addColorStop(0, GD.ll); g.addColorStop(1, GD.d); c.fillStyle = g; c.fill(); c.lineWidth = 2.5; c.stroke();
    c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 0, -186, 44, H.color, 0.55 + 0.15 * Math.sin(frame / 6)); c.restore(); ball(c, 0, -186, 20, 20, HC, 3); ell(c, 0, -186, 9, 9, '#fff9db'); ell(c, -5, -192, 4, 3, '#ffffff');
    // head
    panel(-14, -266, 28, 14, DK, 3, 2);
    panel(-26, -306, 52, 48, M, 10, 4);
    c.beginPath(); c.moveTo(0, -298); c.lineTo(-38, -338); c.lineTo(-28, -340); c.lineTo(0, -312); c.lineTo(28, -340); c.lineTo(38, -338); c.closePath(); g = c.createLinearGradient(0, -340, 0, -298); g.addColorStop(0, GD.ll); g.addColorStop(1, GD.d); c.fillStyle = g; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke(); ball(c, 0, -306, 6, 6, pal('#e03131'), 2);
    rr(c, -20, -290, 40, 11, 4); c.fillStyle = '#0b1a2a'; c.fill(); c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 0, -284, 30, '#4dabf7', 0.6); c.restore(); c.fillStyle = vgrad(c, -289, -280, ['#d0ebff', '#4dabf7']); c.fillRect(-16, -288, 32, 6);
    panel(-12, -276, 24, 12, pal('#adb5bd'), 3, 2);
    // saber smear history (robot-local coords)
    const rot = (px, py) => [56 + px * Math.cos(A) - py * Math.sin(A), -236 + px * Math.sin(A) + py * Math.cos(A)];
    o.tr ||= []; if ((strike || (r.state === 'big' && arm === 'saber' && r.t < 16)) && o.tf !== CLK) { o.tr.push(arm === 'saber' ? { a: rot(0, 118), b: rot(0, 318), f: CLK } : { a: rot(0, 60), b: rot(0, 190), f: CLK }); o.tf = CLK; }
    o.tr = o.tr.filter((q) => CLK - q.f <= 6); if (o.tr.length > 1) smear(c, o.tr, arm === 'saber' ? '#d0ebff' : H.color, arm === 'saber');
    // front arm
    c.save(); c.translate(56, -236); c.rotate(A);
    panel(-16, -6, 32, 64, M); ball(c, 0, 58, 14, 14, DK, 3); panel(-18, 62, 36, 50, M);
    if (arm === 'saber') { capsule(c, [0, 108], [0, 128], 7, 7, pal('#343a40'), 2); panel(-18, 124, 36, 10, HC, 3, 2); c.beginPath(); c.moveTo(-8, 134); c.lineTo(8, 134); c.lineTo(6, 306); c.lineTo(0, 322); c.lineTo(-6, 306); c.closePath(); g = c.createLinearGradient(-8, 0, 8, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#cfd8e3'); g.addColorStop(1, '#6c7785'); c.fillStyle = g; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke(); if (r.state === 'atk' || r.state === 'big' || r.state === 'charge') { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(165,216,255,0.35)'; c.fillRect(-14, 134, 28, 188); c.restore(); } }
    if (arm === 'blaster') { panel(-14, 104, 28, 74, pal('#495057'), 4); panel(-18, 112, 36, 18, HC, 4, 2); c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 0, 180, r.cd > 8 ? 40 : 18, '#74c0fc', 0.8); c.restore(); ell(c, 0, 178, 7, 5, '#e7f5ff'); }
    if (arm === 'drill') { c.beginPath(); c.moveTo(-22, 104); c.lineTo(22, 104); c.lineTo(0, 196); c.closePath(); g = c.createLinearGradient(-22, 0, 22, 0); g.addColorStop(0, '#ffe8a3'); g.addColorStop(0.5, '#f59f00'); g.addColorStop(1, '#a35a00'); c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke(); c.strokeStyle = 'rgba(120,60,0,0.8)'; c.lineWidth = 3; const sp = r.state === 'atk' || r.state === 'big' ? 6 : 1.5; for (let i = 0; i < 5; i++) { const q = ((frame * sp + i * 18) % 90) / 92; c.beginPath(); c.moveTo(-22 * (1 - q), 104 + q * 92); c.lineTo(22 * (1 - q) - 4, 104 + q * 92 - 10); c.stroke(); } }
    c.restore();
    panel(34, -274, 58, 40, HC, 10, 4); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(42, -268, 40, 5);
    if (r.state === 'guard') { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(116,192,252,0.85)'; c.lineWidth = 6; c.beginPath(); for (let i = 0; i <= 6; i++) { const a = -1 + i / 3; c.lineTo(40 + Math.cos(a) * 150, -180 + Math.sin(a) * 150); } c.stroke(); c.fillStyle = 'rgba(116,192,252,0.15)'; c.beginPath(); c.arc(40, -180, 150, -1, 1); c.lineTo(40, -180); c.fill(); c.restore(); }
    c.restore();
  }
  function drawCity(c, s, cam, frame) {
    s.buildings.forEach((b, i) => {
      const x = b.x - cam * 0.85, w = b.w, alive = b.hp > 0, h = alive ? b.h : 34, top = GY - h, col = ['#5c6b7d', '#6d6378', '#5a7068', '#7a6a5c'][i % 4];
      if (alive) {
        c.fillStyle = hgrad(c, x - w / 2, x + w / 2, [shade(col, 0.2), col, shade(col, -0.25)]); c.fillRect(x - w / 2, top, w, h);
        c.fillStyle = shade(col, -0.45); c.fillRect(x + w / 2, top + 8, 12, h - 8); c.fillStyle = shade(col, 0.35); c.fillRect(x - w / 2 - 3, top - 6, w + 6, 7);
        for (let y = top + 14, row = 0; y < GY - 20; y += 26, row++) for (let xx = x - w / 2 + 12, col2 = 0; xx < x + w / 2 - 14; xx += 22, col2++) { const on = ((i * 7 + row * 3 + col2 * 5) % 4) === 0, broken = b.hp < 3 && ((row + col2 + i) % 5 === 0);
          c.fillStyle = broken ? '#1a1a22' : on ? '#ffe08a' : vgrad(c, y, y + 14, ['#e3f1ff', '#93aecb']); c.fillRect(xx, y, 12, 14); }
        if (b.hp < 3) { c.strokeStyle = '#1b1b22'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 10, top); c.lineTo(x + 6, top + 40); c.lineTo(x - 8, top + 70); c.lineTo(x + 4, top + 96); if (b.hp < 2) { c.moveTo(x + 24, top + 10); c.lineTo(x + 10, top + 60); c.lineTo(x + 26, top + 90); } c.stroke();
          if (b.hp < 2) { c.globalAlpha = 0.5; for (let k2 = 0; k2 < 3; k2++) { const q = ((frame + k2 * 20) % 60) / 60; ell(c, x + 10 + k2 * 6, top - 10 - q * 60, 12 + q * 18, 10 + q * 14, '#6c6f76'); } c.globalAlpha = 1; } }
      } else {
        for (let k2 = 0; k2 < 6; k2++) ball(c, x - w / 2 + 10 + k2 * w / 6, GY - 14 - (k2 % 2) * 10, 20, 14, pal('#7d828a'), 1.5);
        if (frame % 50 < 34) { c.globalAlpha = 0.35; ell(c, x, GY - 60 - (frame % 50), 30, 22, '#adb5bd'); c.globalAlpha = 1; }
      }
    });
  }

  // ---------- effects ----------
  function drawBurst(c, x, y, life, size, inner, edge) {
    const k = 1 - life, r = size * (0.5 + k * 0.85);
    c.save(); c.translate(x, y); c.globalCompositeOperation = 'lighter';
    if (k < 0.5) glow(c, 0, 0, r * 1.6, '#ffffff', 0.9 * (1 - k * 2));
    glow(c, 0, 0, r * 1.2, edge, 0.6 * life);
    c.globalCompositeOperation = 'source-over'; c.rotate(x * 0.013);
    c.globalAlpha = Math.min(1, life * 2.2);
    const n = 10; c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU, q = i % 2 ? r * 0.28 : r * (0.85 + ((i * 37) % 7) / 18); c.lineTo(Math.cos(a) * q, Math.sin(a) * q); } c.closePath(); c.fillStyle = edge; c.fill();
    c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU + 0.15, q = i % 2 ? r * 0.2 : r * 0.6; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); } c.closePath(); c.fillStyle = inner; c.fill();
    c.strokeStyle = `rgba(255,255,255,${life})`; c.lineWidth = 3 * life + 1; c.beginPath(); c.arc(0, 0, r * (0.8 + k * 0.7), 0, TAU); c.stroke();
    c.restore(); c.globalAlpha = 1;
  }

  globalThis.SR = { GY, P, figure, heroPose, heroLook, drawBG, drawMob, drawBoss, drawCiv, drawShot, drawRobo, drawCity, drawBurst, shade, mixc, ell, clock, smooth, hitFlash, lag, shadow, vignette, portrait, glow, rr, star, ball, pal };
})();
