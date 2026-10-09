// Sentai Strike: drawing. Everything is drawn with canvas shapes (no images).
// Screen 960x540, ground at y=470. Figures are drawn in a local y-up space.
(() => {
  const GY = 470, rad = (d) => d * Math.PI / 180;
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
  };
  const K = Object.keys(P.idle), mix = (a, b, t) => { const o = {}; for (const k of K) o[k] = a[k] + (b[k] - a[k]) * t; return o; };
  const ease = (t) => t * t * (3 - 2 * t);
  const walkPose = (base, frame, sp = 5) => { const w = Math.sin(frame / sp) * 26, o = { ...base }; o.th1 -= w; o.th2 += w; o.sh1 -= Math.max(0, w) * 0.6; o.sh2 -= Math.max(0, -w) * 0.6; o.ua1 += w * 0.6; o.ua2 -= w * 0.6; o.hip -= Math.abs(Math.sin(frame / sp)) * 3; return o; };

  function heroPose(h, frame, s) {
    const H = SS.HEROES[h.id];
    switch (h.state) {
      case 'atk': { const m = H.chain[h.ci], t = h.t <= m.s ? ease(h.t / m.s) : h.t <= m.s + m.a ? 1 : 1 - ease(Math.min(1, (h.t - m.s - m.a) / m.c)); return mix(P.idle, P[m.pose] || P.jab, t); }
      case 'air': return P.airkick;
      case 'sp': return h.sp === 'rise' ? P.rise : h.sp === 'slam' ? P.slam : h.sp === 'rush' ? P.rush : mix(P.idle, P.shoot, Math.min(1, h.t / 5));
      case 'stance': return P.stance;
      case 'guard': return P.guard;
      case 'hurt': return P.hurt;
      case 'down': case 'ko': return h.y > 5 ? mix(P.hurt, P.down, 0.5) : P.down;
      case 'tagin': return h.t < 14 ? P.airkick : P.pose2;
      case 'walk': return walkPose(P.idle, frame, h.dash ? 3 : 5);
      case 'jump': return P.jump;
      default: { const o = { ...P.idle }, b = Math.sin(frame / 12); o.hip += b * 1.5; o.fa1 += b * 4; o.fa2 -= b * 4; if (h.stuck > 0) { o.ua1 = 10 + b * 20; o.ua2 = -10 - b * 20; } return o; }
    }
  }

  // ---------- skeleton figure (heroes, grunts, the dark striker) ----------
  // look: { suit, dark, trim, glove, helmet, visor, kind: 'hero'|'grunt'|'brute', sword }
  function figure(c, x, y, face, p, look, k = 1, flash = 0) {
    c.save(); c.translate(x, GY - y); c.scale(face * k, -k);
    if (p.rot) { c.translate(0, p.hip * 0.5); c.rotate(rad(p.rot)); c.translate(0, -p.hip * 0.5); }
    const hip = [0, p.hip], tl = 54, tor = rad(p.tor);
    const neck = [Math.sin(tor) * tl, p.hip + Math.cos(tor) * tl];
    const seg = (f, a, l) => [f[0] + Math.sin(rad(a)) * l, f[1] - Math.cos(rad(a)) * l];
    const sh1 = [neck[0] - 6, neck[1] - 4], sh2 = [neck[0] + 4, neck[1] - 4];
    const el1 = seg(sh1, p.ua1, 30), ha1 = seg(el1, p.fa1, 28), el2 = seg(sh2, p.ua2, 30), ha2 = seg(el2, p.fa2, 28);
    const kn1 = seg(hip, p.th1, 44), ft1 = seg(kn1, p.sh1, 44), kn2 = seg(hip, p.th2, 44), ft2 = seg(kn2, p.sh2, 44);
    const F = (col) => (flash ? mixc(col, '#ffffff', flash) : col);
    const line = (a, b, w, col) => { c.strokeStyle = F(col); c.lineWidth = w; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); };
    const dot = (a, r, col) => { c.fillStyle = F(col); c.beginPath(); c.arc(a[0], a[1], r, 0, 7); c.fill(); };
    const out = '#14101e', limb = (a, b, w, col) => { line(a, b, w + 5, out); line(a, b, w, col); };
    c.lineCap = 'round'; c.lineJoin = 'round';
    const big = look.kind === 'brute' ? 1.35 : 1;
    // back limbs
    limb(hip, kn1, 16 * big, look.dark); limb(kn1, ft1, 14 * big, look.dark); dot(ft1, 9, out); dot(ft1, 7, look.boot || look.dark);
    limb(sh1, el1, 12 * big, look.dark); limb(el1, ha1, 11 * big, look.dark); dot(ha1, 9, out); dot(ha1, 7.5, look.glove || look.dark);
    // torso
    limb(hip, neck, 30 * big, look.suit);
    if (look.kind === 'hero') { // white chest V and belt
      c.strokeStyle = F('#ffffff'); c.lineWidth = 5; c.beginPath(); c.moveTo(neck[0] - 8, neck[1] - 4); c.lineTo((hip[0] + neck[0]) / 2 + 2, (hip[1] + neck[1]) / 2 + 4); c.lineTo(neck[0] + 9, neck[1] - 6); c.stroke();
      const bx = Math.sin(tor) * 10, by = p.hip + Math.cos(tor) * 10; line([bx - 15, by], [bx + 15, by], 7, '#f1f3f5'); dot([bx + 2, by], 5, '#ffd43b');
    } else if (look.kind === 'grunt' || look.kind === 'brute') { // bone stripes
      for (let i = 1; i <= 3; i++) { const t = i / 4, mx = hip[0] + (neck[0] - hip[0]) * t, my = hip[1] + (neck[1] - hip[1]) * t; line([mx - 10, my], [mx + 10, my], 3, '#dee2e6'); }
    }
    // front leg
    limb(hip, kn2, 16 * big, look.suit); limb(kn2, ft2, 14 * big, look.suit); dot(ft2, 9, out); dot(ft2, 7, look.boot || look.suit);
    // head / helmet
    const head = [neck[0] + Math.sin(tor) * 20, neck[1] + Math.cos(tor) * 20];
    dot(head, 18 * (look.kind === 'brute' ? 1.1 : 1), out); dot(head, 16 * (look.kind === 'brute' ? 1.1 : 1), look.helmet);
    c.save(); c.translate(head[0], head[1]); c.rotate(-tor);
    c.fillStyle = F(look.visor || '#111');
    if (look.kind === 'hero') {
      const v = look.vshape;
      c.beginPath();
      if (v === 'T') { c.rect(-2, 0, 17, 6); c.rect(8, -9, 6, 12); }
      else if (v === 'V') { c.moveTo(-2, 6); c.lineTo(8, -6); c.lineTo(16, 6); c.lineTo(12, 6); c.lineTo(8, 0); c.lineTo(2, 6); }
      else if (v === 'X') { c.moveTo(0, 7); c.lineTo(16, -6); c.lineTo(16, -1); c.lineTo(4, 8); c.moveTo(0, -6); c.lineTo(16, 7); c.lineTo(12, 8); c.lineTo(0, -2); }
      else c.roundRect ? c.roundRect(-1, -5, 17, 12, 5) : c.rect(-1, -5, 17, 12);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(2, 3, 6, 2); // shine
      if (look.mouth) { c.fillStyle = F('#c9c9c9'); c.fillRect(6, -13, 9, 4); }
    } else { // grunt mask: two red eyes, horns on brutes
      c.fillStyle = '#ff3b3b'; c.beginPath(); c.arc(9, 3, 3, 0, 7); c.arc(2, 3, 2.5, 0, 7); c.fill();
      if (look.kind === 'brute') { c.fillStyle = F('#e9ecef'); c.beginPath(); c.moveTo(-8, 14); c.lineTo(-14, 30); c.lineTo(-2, 16); c.moveTo(6, 15); c.lineTo(12, 32); c.lineTo(12, 14); c.fill(); }
    }
    c.restore();
    // front arm on top (+ weapon)
    limb(sh2, el2, 12 * big, look.suit); limb(el2, ha2, 11 * big, look.suit); dot(ha2, 9.5, out); dot(ha2, 8, look.glove || look.suit);
    if (look.sword) { const a = Math.atan2(ha2[1] - el2[1], ha2[0] - el2[0]); line(ha2, [ha2[0] + Math.cos(a) * 58, ha2[1] + Math.sin(a) * 58], 5, '#e9ecef'); line(ha2, [ha2[0] + Math.cos(a) * 12, ha2[1] + Math.sin(a) * 12], 7, '#495057'); }
    if (look.bow) { c.strokeStyle = F('#8d5524'); c.lineWidth = 4; c.beginPath(); c.arc(ha2[0], ha2[1], 22, -1.2, 1.2); c.stroke(); }
    c.restore();
  }
  const VSHAPE = { red: 'T', blue: 'V', yellow: 'R', silver: 'X' };
  const heroLook = (id) => { const H = SS.HEROES[id]; return { kind: 'hero', suit: H.color, dark: shade(H.color, -0.25), helmet: H.color, visor: '#16121f', glove: '#f8f9fa', boot: '#f8f9fa', vshape: VSHAPE[id], mouth: true, sword: false }; };

  // ---------- small helpers ----------
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16), f = (c) => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
  function rgb(c) { if (c[0] === '#') { const n = parseInt(c.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; } return c.match(/\d+/g).slice(0, 3).map(Number); }
  function mixc(a, b, t) { const A = rgb(a), B = rgb(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; }
  const ell = (c, x, y, rx, ry, col, rot = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, 7); c.fill(); };
  const outl = (c, w = 4) => { c.strokeStyle = '#14101e'; c.lineWidth = w; c.stroke(); };

  // ---------- backgrounds ----------
  const BG = {
    Downtown: { sky: ['#74c0fc', '#d0ebff'], far: '#5c7cfa', near: '#4263eb', ground: '#868e96', line: '#adb5bd' },
    Harbor: { sky: ['#ffa94d', '#ffe8cc'], far: '#e8590c', near: '#495057', ground: '#6c757d', line: '#ced4da', water: '#1971c2' },
    Beach: { sky: ['#66d9e8', '#e3fafc'], far: '#22b8cf', near: '#0c8599', ground: '#ffe066', line: '#fcc419', water: '#15aabf' },
    'Building Site': { sky: ['#ffd43b', '#fff9db'], far: '#f08c00', near: '#e67700', ground: '#a9927d', line: '#c8b6a6', cranes: true },
    'Night Market': { sky: ['#1b1440', '#4c2a85'], far: '#3b2a6b', near: '#2a1f4f', ground: '#343a40', line: '#495057', lanterns: true, night: true },
    Rooftops: { sky: ['#ff8787', '#ffd8a8'], far: '#c92a2a', near: '#862e9c', ground: '#5f3dc4', line: '#7950f2', roof: true },
    'The Hive': { sky: ['#f59f00', '#ffec99'], far: '#e67700', near: '#d9480f', ground: '#b5651d', line: '#e8a33d', hive: true },
    City: { sky: ['#4dabf7', '#e7f5ff'], far: '#748ffc', near: '#5c7cfa', ground: '#495057', line: '#868e96' },
  };
  const towers = Array.from({ length: 40 }, (_, i) => [i * 90 - 200, 120 + ((i * 131) % 200), 60 + (i % 4) * 16]);
  function drawBG(c, place, camX, T) {
    const B = BG[place] || BG.Downtown;
    const g = c.createLinearGradient(0, 0, 0, GY); g.addColorStop(0, B.sky[0]); g.addColorStop(1, B.sky[1]); c.fillStyle = g; c.fillRect(0, 0, 960, 540);
    if (B.night) { c.fillStyle = '#fff'; for (let i = 0; i < 50; i++) { c.globalAlpha = 0.4 + 0.4 * Math.sin(T * 2 + i); c.fillRect((i * 197) % 960, (i * 89) % 260, 2, 2); } c.globalAlpha = 1; ell(c, 800, 90, 34, 34, '#fff3bf'); }
    else ell(c, 820 - camX * 0.05, 90, 40, 40, '#fff9db');
    // far skyline
    for (const [x, h, w] of towers) { const X = x - camX * 0.3; if (X < -100 || X > 1000) continue; c.fillStyle = B.far; c.fillRect(X, GY - 60 - h, w, h + 60);
      c.fillStyle = B.night ? '#ffe066aa' : '#ffffff40'; for (let wy = GY - 50 - h; wy < GY - 70; wy += 22) for (let wx = 8; wx < w - 8; wx += 14) if (((x + wy + wx) % 7) < 3) c.fillRect(X + wx, wy, 6, 9); }
    if (B.water) { c.fillStyle = B.water; c.fillRect(0, GY - 70, 960, 70); c.strokeStyle = '#ffffff55'; c.lineWidth = 2; for (let i = 0; i < 8; i++) { c.beginPath(); const y = GY - 60 + i * 7; c.moveTo(0, y); for (let x = 0; x < 960; x += 20) c.lineTo(x, y + Math.sin(x / 30 + T * 2 + i) * 2); c.stroke(); } }
    if (B.cranes) { c.strokeStyle = '#e67700'; c.lineWidth = 6; for (const x0 of [200, 900, 1500]) { const X = x0 - camX * 0.5; c.beginPath(); c.moveTo(X, GY); c.lineTo(X, GY - 330); c.lineTo(X + 200, GY - 330); c.moveTo(X - 60, GY - 330); c.lineTo(X, GY - 330); c.stroke(); c.lineWidth = 2; c.beginPath(); c.moveTo(X + 160, GY - 330); c.lineTo(X + 160, GY - 230 + Math.sin(T) * 10); c.stroke(); c.lineWidth = 6; } }
    if (B.hive) { c.strokeStyle = '#ffffff30'; c.lineWidth = 3; for (let y = 0; y < 8; y++) for (let x = 0; x < 14; x++) { const X = x * 80 + (y % 2) * 40 - (camX * 0.4) % 80, Y = y * 46 + 20; c.beginPath(); for (let k = 0; k < 6; k++) c.lineTo(X + Math.cos(k * Math.PI / 3) * 28, Y + Math.sin(k * Math.PI / 3) * 28); c.closePath(); c.stroke(); } }
    // near buildings / props
    for (let i = 0; i < 12; i++) { const X = i * 220 - (camX * 0.7) % 220 - 60, h = 90 + ((i * 7919 + Math.floor((camX * 0.7) / 220) * 31) % 90);
      c.fillStyle = B.near; c.fillRect(X, GY - h, 150, h); c.fillStyle = '#00000022'; c.fillRect(X + 140, GY - h, 10, h);
      if (B.lanterns) for (let k = 0; k < 4; k++) ell(c, X + 20 + k * 36, GY - h - 8 + Math.sin(T * 2 + k) * 2, 9, 12, k % 2 ? '#ff6b6b' : '#ffd43b'); }
    if (B.roof) { c.fillStyle = '#212529'; for (let x = -(camX % 60); x < 960; x += 60) { c.fillRect(x, GY - 40, 4, 40); } c.fillRect(0, GY - 40, 960, 4); }
    // ground
    c.fillStyle = B.ground; c.fillRect(0, GY, 960, 70);
    c.fillStyle = B.line; for (let x = -(camX % 80); x < 960; x += 80) c.fillRect(x, GY + 26, 40, 5);
    c.fillStyle = '#00000022'; c.fillRect(0, GY, 960, 4);
  }

  // ---------- enemies ----------
  function drawMob(c, e, cam, frame) {
    const x = e.x - cam, M = SS.MOBS[e.k], fl = e.flash || 0;
    if (e.k === 'spiderling') { const y = GY - e.y - 18; for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) { c.strokeStyle = '#14101e'; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y); c.lineTo(x + sd * (16 + i * 4), y - 8 + Math.sin(frame / 3 + i) * 4); c.lineTo(x + sd * (24 + i * 5), GY - e.y); c.stroke(); } ell(c, x, y, 20, 15, fl ? '#fff' : '#7048e8'); ell(c, x + e.face * 14, y - 4, 10, 9, '#5f3dc4'); ell(c, x + e.face * 18, y - 6, 3, 3, '#ff3b3b'); return; }
    if (e.k === 'bee') { const y = GY - e.y - 22; c.globalAlpha = 0.6; ell(c, x - 6, y - 16, 14, 8, '#e7f5ff', Math.sin(frame) * 0.3); ell(c, x + 6, y - 16, 14, 8, '#e7f5ff', -Math.sin(frame) * 0.3); c.globalAlpha = 1;
      ell(c, x, y, 22, 15, fl ? '#fff' : '#fcc419'); c.fillStyle = '#212529'; c.fillRect(x - 8, y - 14, 5, 28); c.fillRect(x + 4, y - 14, 5, 28); ell(c, x + e.face * 20, y - 2, 9, 9, '#212529'); c.fillStyle = '#212529'; c.beginPath(); c.moveTo(x - e.face * 22, y - 3); c.lineTo(x - e.face * 34, y); c.lineTo(x - e.face * 22, y + 3); c.fill(); return; }
    let p;
    if (e.dead) p = e.state === 'air' ? mix(P.hurt, P.down, 0.5) : P.down;
    else if (e.carry) p = walkPose(P.carry, frame, 4);
    else if (e.state === 'wind') p = M.ranged ? P.shoot : P.wind;
    else if (e.state === 'strike') p = M.ranged ? P.shoot : e.k === 'brute' ? P.power : P.jab;
    else if (e.state === 'hurt') p = P.hurt;
    else if (e.state === 'air') p = mix(P.hurt, P.down, 0.4);
    else if (e.state === 'down') p = P.down;
    else p = walkPose(P.idle, frame + e.x, 5);
    const look = { kind: e.k === 'brute' ? 'brute' : 'grunt', suit: '#212529', dark: '#141414', helmet: '#343a40', glove: '#495057', bow: M.ranged };
    figure(c, x, e.y, e.face, p, look, e.k === 'brute' ? 1.1 : 0.92, fl);
    if (e.state === 'wind' && !e.dead) { c.fillStyle = '#ff6b6b'; c.font = '900 26px system-ui'; c.textAlign = 'center'; c.fillText('!', x, GY - e.y - e.h - 22); }
  }

  // bosses: drawn in local space at their feet, facing right (scale handles the facing)
  function drawBoss(c, b, cam, frame, k = 1, flash = 0) {
    const D = b.def, id = D.parts ? D.parts[0] : 'turtle', col = flash ? mixc(D.color, '#ffffff', flash) : D.color, col2 = D.color2 || shade(D.color, 0.35);
    c.save(); c.translate(b.x - cam, GY - b.y * k); c.scale((b.face || -1) * k, k);
    if (b.dizzy) c.rotate(Math.sin(frame / 4) * 0.08);
    const bob = Math.sin(frame / 10) * 3, tele = b.tele && frame % 8 < 4;
    if (tele) { c.shadowColor = '#ff3b3b'; c.shadowBlur = 30; }
    const inv = b.move === 'shell' || b.move === 'guard';
    if (id === 'turtle') {
      for (const lx of [-34, 30]) { c.fillStyle = shade(D.color, -0.2); c.fillRect(lx - 12, -40, 24, 40); }
      ell(c, 56, -88 + bob, 26, 22, shade(D.color, 0.15)); ell(c, 66, -92 + bob, 5, 5, '#fff'); ell(c, 68, -92 + bob, 2.5, 2.5, '#111');
      c.beginPath(); c.ellipse(-6, -80, 66, inv ? 64 : 56, 0, Math.PI, 0); c.closePath(); c.fillStyle = col; c.fill(); outl(c);
      c.strokeStyle = shade(D.color, -0.35); c.lineWidth = 4; for (const [hx, hy] of [[-30, -100], [10, -112], [-6, -126], [30, -96]]) { c.beginPath(); for (let i = 0; i < 6; i++) c.lineTo(hx + Math.cos(i * 1.047) * 14, hy + Math.sin(i * 1.047) * 14); c.closePath(); c.stroke(); }
      c.fillStyle = col2; c.fillRect(-72, -84, 132, 10);
    } else if (id === 'eagle') {
      const flap = Math.sin(frame / (b.fly ? 2 : 8)) * 0.6;
      c.save(); c.translate(-10, -100); c.rotate(-0.6 + flap); ell(c, -40, 0, 60, 18, shade(D.color, -0.15)); c.restore();
      ell(c, 0, -80 + bob, 34, 52, col); ell(c, 4, -64 + bob, 22, 34, '#f8f0e3');
      ell(c, 16, -140 + bob, 24, 22, '#f8f9fa'); c.fillStyle = '#fab005'; c.beginPath(); c.moveTo(34, -146 + bob); c.lineTo(58, -136 + bob); c.lineTo(34, -130 + bob); c.fill(); ell(c, 24, -146 + bob, 4, 4, '#111');
      c.save(); c.translate(10, -100); c.rotate(0.6 - flap); ell(c, 40, 0, 60, 18, col); c.restore();
      c.fillStyle = '#fab005'; c.fillRect(-14, -30, 8, 30); c.fillRect(8, -30, 8, 30);
    } else if (id === 'puffer') {
      const r = inv ? 74 : 56 + Math.sin(frame / 8) * 3;
      c.strokeStyle = '#14101e'; c.lineWidth = 4; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, l = inv ? 24 : 12; c.beginPath(); c.moveTo(Math.cos(a) * r, -r - 10 + Math.sin(a) * r); c.lineTo(Math.cos(a) * (r + l), -r - 10 + Math.sin(a) * (r + l)); c.stroke(); }
      ell(c, 0, -r - 10, r, r, col); ell(c, 0, -r * 0.6 - 10, r * 0.75, r * 0.45, '#fff9db');
      ell(c, r * 0.45, -r - 22, 10, 12, '#fff'); ell(c, r * 0.5, -r - 22, 5, 6, '#111'); ell(c, r * 0.85, -r - 4, 8, 6, '#e8590c');
      c.fillStyle = col2; c.beginPath(); c.moveTo(-r, -r - 10); c.lineTo(-r - 30, -r - 30); c.lineTo(-r - 30, -r + 10); c.fill();
    } else if (id === 'mole') {
      ell(c, 0, -60 + bob, 52, 60, col); ell(c, 10, -46 + bob, 30, 36, '#c9a98a');
      ell(c, 34, -108 + bob, 28, 24, col); ell(c, 58, -104 + bob, 8, 7, '#ff8787');
      c.fillStyle = '#212529'; c.fillRect(24, -122 + bob, 30, 9); // sunglasses
      for (const sx of [1, -1]) { c.save(); c.translate(sx * 40, -60); c.rotate(sx * Math.sin(frame / 6) * 0.3); c.fillStyle = '#adb5bd'; c.beginPath(); c.moveTo(0, -12); c.lineTo(sx * 38, 0); c.lineTo(0, 12); c.fill(); c.restore(); }
    } else if (id === 'spider') {
      for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) { c.strokeStyle = '#14101e'; c.lineWidth = 8; c.beginPath(); c.moveTo(sd * 20, -60); const kx = sd * (60 + i * 14), ky = -110 + i * 6 + Math.sin(frame / 6 + i) * 6; c.lineTo(kx, ky); c.lineTo(sd * (70 + i * 20), 0); c.stroke(); }
      ell(c, -20, -66, 52, 42, col); ell(c, 42, -62, 30, 28, shade(D.color, 0.15));
      c.fillStyle = '#fa5252'; c.beginPath(); c.moveTo(-28, -84); c.lineTo(-12, -66); c.lineTo(-28, -48); c.lineTo(-44, -66); c.fill();
      for (const [ex, ey] of [[56, -70], [62, -60], [50, -58], [58, -50]]) ell(c, ex, ey, 4, 4, '#ff3b3b');
    } else if (id === 'dark') {
      c.restore(); c.save();
      const p = b.move === 'dash' ? P.rush : b.move === 'counter' ? P.stance : b.move === 'shoot' ? P.shoot : b.move === 'swipe' && b.mt > 18 ? P.slash : b.dizzy ? P.hurt : walkPose(P.idle, frame, 6);
      figure(c, b.x - cam, b.y * k, b.face || -1, p, { kind: 'hero', suit: '#212529', dark: '#0b0b0f', helmet: '#343a40', visor: '#e03131', glove: '#e03131', boot: '#212529', vshape: 'T', sword: true }, 1.15 * k, flash);
      if (tele || b.move === 'counter') { c.strokeStyle = b.move === 'counter' ? '#ae3ec9' : '#ff3b3b'; c.lineWidth = 3; c.globalAlpha = 0.6; c.beginPath(); c.arc(b.x - cam, GY - b.y * k - 70 * k, 70 * k, 0, 7); c.stroke(); c.globalAlpha = 1; }
      c.restore(); return;
    } else if (id === 'queen') {
      const flap = Math.sin(frame / 2) * 0.4;
      c.globalAlpha = 0.55; c.save(); c.translate(-10, -120); c.rotate(-0.4 + flap); ell(c, -10, -30, 26, 60, '#e7f5ff'); c.restore(); c.save(); c.translate(10, -120); c.rotate(0.4 - flap); ell(c, 10, -30, 26, 60, '#e7f5ff'); c.restore(); c.globalAlpha = 1;
      ell(c, -30, -60 + bob, 40, 34, col); c.fillStyle = '#212529'; c.fillRect(-52, -90 + bob, 10, 60); c.fillRect(-28, -94 + bob, 10, 66);
      c.fillStyle = '#212529'; c.beginPath(); c.moveTo(-68, -64 + bob); c.lineTo(-96, -58 + bob); c.lineTo(-68, -52 + bob); c.fill();
      ell(c, 16, -112 + bob, 24, 36, col); ell(c, 30, -158 + bob, 22, 20, '#212529'); ell(c, 40, -160 + bob, 8, 10, '#e03131');
      c.fillStyle = '#ffd43b'; c.beginPath(); c.moveTo(14, -176 + bob); c.lineTo(20, -196 + bob); c.lineTo(28, -182 + bob); c.lineTo(36, -198 + bob); c.lineTo(42, -180 + bob); c.closePath(); c.fill(); outl(c, 2);
      c.fillStyle = '#212529'; c.fillRect(-4, -30, 8, 30); c.fillRect(16, -30, 8, 30);
    }
    if (D.color2 && id !== 'dark') { c.globalAlpha = 0.5; c.fillStyle = D.color2; for (let i = 0; i < 3; i++) c.fillRect(-60 + i * 40, -D.h * 0.6 - 6, 22, 12); c.globalAlpha = 1; }
    c.shadowBlur = 0;
    if (b.dizzy) { c.scale(b.face || -1, 1); for (let i = 0; i < 3; i++) { const a = frame / 10 + i * 2.1; c.fillStyle = '#ffd43b'; c.font = '900 22px system-ui'; c.save(); c.scale(1, 1); c.fillText('★', Math.cos(a) * 40 - 8, -D.h - 20 + Math.sin(a) * 10); c.restore(); } }
    c.restore();
  }

  // ---------- civilians ----------
  function drawCiv(c, v, cam, frame) {
    const x = v.x - cam, carried = v.state === 'carried', y = carried ? v.y : 0;
    c.save(); c.translate(x, GY - y); c.scale(v.dir || 1, 1);
    if (carried) { c.rotate(Math.PI * 0.5 * (v.dir || 1)); }
    const run = Math.sin(frame / 3 + v.x) * 10;
    if (v.kind === 'dog') { ell(c, 0, -16, 18, 10, '#d9480f'); ell(c, 16, -24, 9, 8, '#d9480f'); ell(c, 21, -26, 2, 2, '#111'); c.strokeStyle = '#d9480f'; c.lineWidth = 4; c.beginPath(); c.moveTo(-10, -10); c.lineTo(-10 + run * 0.6, 0); c.moveTo(10, -10); c.lineTo(10 - run * 0.6, 0); c.moveTo(-16, -18); c.lineTo(-24, -28 + run * 0.4); c.stroke(); c.restore(); return; }
    const kid = v.kind === 'kid', sc = kid ? 0.7 : 1, body = { suit: '#495057', kid: '#4dabf7', granny: '#be4bdb', student: '#40c057' }[v.kind] || '#868e96';
    c.scale(sc, sc);
    c.strokeStyle = '#343a40'; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, -36); c.lineTo(run, 0); c.moveTo(0, -36); c.lineTo(-run, 0); c.stroke();
    c.fillStyle = body; c.fillRect(-10, -70, 20, 36);
    if (v.kind === 'suit') { c.fillStyle = '#e03131'; c.beginPath(); c.moveTo(-2, -68); c.lineTo(2, -68); c.lineTo(3, -50); c.lineTo(0, -46); c.lineTo(-3, -50); c.fill(); }
    c.strokeStyle = '#ffd8a8'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, -64); c.lineTo(14, -84 + Math.sin(frame / 2 + v.x) * 6); c.moveTo(0, -64); c.lineTo(-12, -86 - Math.sin(frame / 2 + v.x) * 6); c.stroke(); // arms up in panic
    ell(c, 0, -82, 11, 11, '#ffd8a8');
    if (v.kind === 'granny') { ell(c, -6, -92, 7, 7, '#dee2e6'); c.strokeStyle = '#8d5524'; c.lineWidth = 3; c.beginPath(); c.moveTo(14, -50); c.lineTo(18, 0); c.stroke(); }
    if (kid) { c.fillStyle = '#fa5252'; c.fillRect(-11, -92, 22, 6); c.fillRect(4, -88, 12, 3); }
    ell(c, 4, -84, 2, 2.5, '#111'); ell(c, 4, -78, 3, 2.5, '#111');
    c.restore();
    if (carried && frame % 60 < 40) { c.fillStyle = '#fff'; c.strokeStyle = '#14101e'; c.lineWidth = 3; c.font = '900 16px system-ui'; c.textAlign = 'center'; c.strokeText('HELP!', x, GY - y - 40); c.fillText('HELP!', x, GY - y - 40); }
  }

  // ---------- projectiles ----------
  function drawShot(c, p, cam, frame) {
    const x = p.x - cam, y = GY - p.y;
    switch (p.k) {
      case 'wave': c.strokeStyle = '#ff8787'; c.lineWidth = 10; c.beginPath(); c.arc(x - Math.sign(p.vx) * 20, y, 40, -0.9 * Math.sign(p.vx) + (p.vx < 0 ? Math.PI : 0), 0.9 * Math.sign(p.vx) + (p.vx < 0 ? Math.PI : 0)); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 4; c.stroke(); break;
      case 'shuriken': c.save(); c.translate(x, y); c.rotate(frame / 2); c.fillStyle = '#74c0fc'; c.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 4 : 13, a = i * Math.PI / 4; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.fill(); outl(c, 2); c.restore(); break;
      case 'quake': c.fillStyle = '#ffd43b'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x - 30 + i * 14, GY); c.lineTo(x - 22 + i * 14, GY - 30 - (i % 2) * 20); c.lineTo(x - 14 + i * 14, GY); c.fill(); } break;
      case 'laser': { const L = 760, k = p.life / 12; c.fillStyle = `rgba(173,181,189,${k})`; c.fillRect(p.face > 0 ? x : x - L, y - 14 * k, L, 28 * k); c.fillStyle = `rgba(255,255,255,${k})`; c.fillRect(p.face > 0 ? x : x - L, y - 5 * k, L, 10 * k); break; }
      case 'arrow': c.strokeStyle = '#8d5524'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 14, y); c.lineTo(x + 14, y); c.stroke(); c.fillStyle = '#adb5bd'; c.beginPath(); c.moveTo(x + Math.sign(p.vx) * 20, y); c.lineTo(x + Math.sign(p.vx) * 10, y - 5); c.lineTo(x + Math.sign(p.vx) * 10, y + 5); c.fill(); break;
      case 'feather': ell(c, x, y, 16, 5, '#f8f0e3', Math.atan2(-p.vy, p.vx)); break;
      case 'spine': c.strokeStyle = '#e67700'; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y); c.lineTo(x - p.vx * 2.5, y + p.vy * 2.5); c.stroke(); break;
      case 'rock': ell(c, x, y, 14, 12, '#868e96'); ell(c, x - 4, y - 4, 5, 4, '#adb5bd'); break;
      case 'web': c.strokeStyle = '#f1f3f5'; c.lineWidth = 2; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 22, y + Math.sin(a) * 22); c.stroke(); } c.beginPath(); c.arc(x, y, 12, 0, 7); c.stroke(); break;
      case 'stinger': c.fillStyle = '#212529'; c.beginPath(); c.moveTo(x + Math.sign(p.vx) * 16, y); c.lineTo(x - Math.sign(p.vx) * 10, y - 4); c.lineTo(x - Math.sign(p.vx) * 10, y + 4); c.fill(); break;
      case 'honey': ell(c, x, y, 13, 11, '#f59f00'); break;
      case 'darkwave': c.strokeStyle = '#ae3ec9'; c.lineWidth = 10; c.beginPath(); c.arc(x - Math.sign(p.vx) * 20, y, 40, p.vx > 0 ? -0.9 : Math.PI - 0.9, p.vx > 0 ? 0.9 : Math.PI + 0.9); c.stroke(); c.strokeStyle = '#212529'; c.lineWidth = 4; c.stroke(); break;
      case 'roboshot': ell(c, x, y, 18, 7, '#74c0fc'); ell(c, x, y, 10, 4, '#fff'); break;
      case 'robobeam': c.fillStyle = '#4dabf7'; c.fillRect(x - 70, y - 26, 140, 52); c.fillStyle = '#fff'; c.fillRect(x - 70, y - 10, 140, 20); break;
      case 'rocketfist': c.fillStyle = '#f59f00'; c.beginPath(); c.roundRect ? c.roundRect(x - 34, y - 26, 68, 52, 14) : c.rect(x - 34, y - 26, 68, 52); c.fill(); outl(c); c.fillStyle = '#ff922b'; ell(c, x - Math.sign(p.vx) * 50, y, 22 + Math.random() * 8, 10, '#ff922b'); break;
      case 'giantshot': ell(c, x, y, 26, 26, '#e03131'); ell(c, x, y, 14, 14, '#ffa8a8'); break;
    }
  }

  // ---------- giant robot ----------
  function drawRobo(c, r, cam, frame) {
    const H = SS.HEROES[r.pilot], arm = H.robo, x = r.x - cam;
    c.save(); c.translate(x, GY - r.y); c.scale(r.face, 1);
    const hit = r.state === 'hurt' && frame % 6 < 3, metal = hit ? '#fff' : '#dee2e6', dk = '#868e96';
    const atk = r.state === 'atk' ? Math.min(1, r.t / 10) : r.state === 'big' ? 1 : 0, walk = r.state === 'walk' ? Math.sin(frame / 8) * 10 : 0, guard = r.state === 'guard';
    // legs
    for (const [lx, w] of [[-40, walk], [30, -walk]]) { c.fillStyle = dk; c.fillRect(lx - 20, -120, 40, 120 + w * 0.2); c.fillStyle = metal; c.fillRect(lx - 24, -20, 48, 20); c.fillStyle = H.color; c.fillRect(lx - 20, -100, 40, 14); }
    // body
    c.fillStyle = metal; c.beginPath(); c.moveTo(-70, -250); c.lineTo(70, -250); c.lineTo(56, -120); c.lineTo(-56, -120); c.closePath(); c.fill(); outl(c, 5);
    c.fillStyle = H.color; ell(c, 0, -200, 26, 26, H.color); ell(c, 0, -200, 14, 14, '#fff9db'); // pilot core
    c.fillStyle = '#ffd43b'; c.fillRect(-56, -140, 112, 12);
    // head
    c.fillStyle = metal; c.fillRect(-26, -300, 52, 50); outl(c, 4); c.fillStyle = '#ffd43b'; c.beginPath(); c.moveTo(-26, -300); c.lineTo(0, -330); c.lineTo(26, -300); c.fill();
    c.fillStyle = '#4dabf7'; c.fillRect(-18, -284, 36, 12);
    // back arm
    c.fillStyle = dk; c.fillRect(-90, -240, 30, 90);
    // front arm: depends on pilot
    c.save(); c.translate(60, -235); c.rotate(guard ? -1.4 : -0.2 - atk * 1.2);
    c.fillStyle = metal; c.fillRect(-14, 0, 32, 110); outl(c, 4);
    if (arm === 'saber') { c.fillStyle = '#e9ecef'; c.fillRect(-4, 100, 14, 200); c.fillStyle = H.color; c.fillRect(-12, 96, 30, 14); if (atk) { c.globalAlpha = 0.4; c.fillStyle = '#fff'; c.fillRect(-10, 100, 26, 200); c.globalAlpha = 1; } }
    if (arm === 'blaster') { c.fillStyle = '#495057'; c.fillRect(-10, 100, 26, 70); c.fillStyle = '#74c0fc'; ell(c, 3, 170, 8, 8, '#74c0fc'); }
    if (arm === 'drill') { c.fillStyle = '#f59f00'; c.beginPath(); c.moveTo(-18, 100); c.lineTo(22, 100); c.lineTo(2, 180); c.fill(); c.strokeStyle = '#e67700'; c.lineWidth = 3; for (let i = 0; i < 4; i++) { const o = (frame * 2 + i * 20) % 80; c.beginPath(); c.moveTo(-18 + o / 4, 100 + o); c.lineTo(22 - o / 4, 100 + o - 8); c.stroke(); } }
    c.restore();
    if (guard) { c.strokeStyle = '#74c0fc'; c.lineWidth = 8; c.globalAlpha = 0.7; c.beginPath(); c.arc(40, -180, 140, -1, 1); c.stroke(); c.globalAlpha = 1; }
    if (r.state === 'charge') { c.globalAlpha = 0.3 + 0.3 * Math.sin(frame / 2); ell(c, 0, -180, 120 + r.charge, 160 + r.charge, H.color); c.globalAlpha = 1; }
    if (r.y > 0) { ell(c, -40, 10, 14, 24 + Math.random() * 10, '#ff922b'); ell(c, 30, 10, 14, 24 + Math.random() * 10, '#ff922b'); }
    c.restore();
  }
  function drawCity(c, s, cam, frame) {
    for (const b of s.buildings) {
      const x = b.x - cam * 0.85, w = b.w, h = b.hp > 0 ? b.h : 30;
      c.fillStyle = b.hp > 0 ? '#495057' : '#6c757d'; c.fillRect(x - w / 2, GY - h, w, h);
      if (b.hp > 0) { c.fillStyle = '#ffe066'; for (let y = GY - h + 14; y < GY - 20; y += 26) for (let xx = x - w / 2 + 12; xx < x + w / 2 - 12; xx += 24) if (((xx + y) | 0) % 3) c.fillRect(xx, y, 12, 14);
        if (b.hp < 3) { c.strokeStyle = '#212529'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 10, GY - h); c.lineTo(x + 6, GY - h + 40); c.lineTo(x - 8, GY - h + 70); if (b.hp < 2) { c.moveTo(x + 20, GY - h + 10); c.lineTo(x + 8, GY - h + 60); } c.stroke(); }
      } else { c.fillStyle = '#868e96'; for (let i = 0; i < 5; i++) ell(c, x - w / 2 + 12 + i * w / 5, GY - 28, 18, 12, '#868e96'); if (frame % 40 < 20) { c.globalAlpha = 0.4; ell(c, x, GY - 60 - (frame % 40), 30, 20, '#adb5bd'); c.globalAlpha = 1; } }
    }
  }

  // ---------- effects ----------
  function drawBurst(c, x, y, life, size, inner, edge) {
    const k = 1 - life, r = size * (0.45 + k * 0.9), n = 12;
    c.save(); c.translate(x, y); c.rotate(x * 0.01); c.globalAlpha = Math.min(1, life * 2.2);
    const star = (rr, jag) => { c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, q = i % 2 ? rr * jag * (0.8 + ((i * 37) % 7) / 20) : rr; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); } c.closePath(); };
    star(r, 0.45); c.fillStyle = edge; c.fill(); star(r * 0.62, 0.5); c.fillStyle = inner; c.fill();
    c.restore(); c.globalAlpha = 1;
  }

  globalThis.SR = { GY, P, figure, heroPose, heroLook, drawBG, drawMob, drawBoss, drawCiv, drawShot, drawRobo, drawCity, drawBurst, shade, mixc, ell };
})();
