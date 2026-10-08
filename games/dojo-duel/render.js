// Dojo Duel: drawing. Fighters are little skeletons whose joint angles blend between poses.
(() => {
  // angles in degrees. tor: lean forward from upright. limbs: 0 = pointing down, + = swung forward.
  // 1 = back arm/leg (drawn behind the body), 2 = front. hip: hip height. rot: whole-body tilt.
  const P = {
    idle: { tor: 6, head: 0, ua1: 30, fa1: 120, ua2: 50, fa2: 135, th1: -18, sh1: -8, th2: 20, sh2: 6, hip: 90, rot: 0 },
    crouch: { tor: 22, head: -10, ua1: 40, fa1: 125, ua2: 60, fa2: 140, th1: 55, sh1: -35, th2: 85, sh2: -10, hip: 56, rot: 0 },
    block: { tor: -4, head: -6, ua1: 70, fa1: 165, ua2: 78, fa2: 170, th1: -22, sh1: -10, th2: 18, sh2: 6, hip: 88, rot: 0 },
    cblock: { tor: 16, head: -8, ua1: 70, fa1: 165, ua2: 78, fa2: 170, th1: 55, sh1: -35, th2: 85, sh2: -10, hip: 56, rot: 0 },
    jab: { tor: 12, head: 2, ua1: 40, fa1: 130, ua2: 92, fa2: 92, th1: -22, sh1: -10, th2: 22, sh2: 6, hip: 88, rot: 0 },
    cross: { tor: 20, head: 4, ua1: 92, fa1: 92, ua2: 45, fa2: 135, th1: -28, sh1: -14, th2: 26, sh2: 6, hip: 86, rot: 0 },
    power: { tor: 28, head: 6, ua1: 96, fa1: 96, ua2: 30, fa2: 100, th1: -40, sh1: -30, th2: 38, sh2: 10, hip: 82, rot: 0 },
    kick: { tor: -14, head: 4, ua1: 40, fa1: 120, ua2: 20, fa2: 100, th1: -6, sh1: 0, th2: 95, sh2: 92, hip: 92, rot: 0 },
    highkick: { tor: -26, head: 10, ua1: 30, fa1: 110, ua2: 10, fa2: 90, th1: -4, sh1: 0, th2: 128, sh2: 122, hip: 92, rot: 0 },
    roundhouse: { tor: -30, head: 10, ua1: -20, fa1: 60, ua2: 120, fa2: 150, th1: 0, sh1: 0, th2: 112, sh2: 104, hip: 92, rot: -8 },
    lowpunch: { tor: 28, head: -6, ua1: 40, fa1: 125, ua2: 75, fa2: 80, th1: 55, sh1: -35, th2: 85, sh2: -10, hip: 56, rot: 0 },
    sweep: { tor: 34, head: -10, ua1: 70, fa1: 70, ua2: 40, fa2: 100, th1: 70, sh1: -45, th2: 92, sh2: 90, hip: 38, rot: 0 },
    uppercut: { tor: -10, head: 14, ua1: 20, fa1: 100, ua2: 168, fa2: 176, th1: -30, sh1: -20, th2: 32, sh2: 10, hip: 92, rot: 0 },
    dragon: { tor: -6, head: 16, ua1: 30, fa1: 110, ua2: 172, fa2: 178, th1: 40, sh1: -40, th2: 90, sh2: 0, hip: 90, rot: 0 },
    flykick: { tor: -24, head: 6, ua1: 120, fa1: 150, ua2: 30, fa2: 80, th1: -60, sh1: -110, th2: 100, sh2: 100, hip: 80, rot: 0 },
    stomp: { tor: -6, head: -6, ua1: 120, fa1: 170, ua2: 125, fa2: 175, th1: -8, sh1: -4, th2: 80, sh2: 0, hip: 92, rot: 0 },
    cyclone: { tor: -18, head: 6, ua1: -60, fa1: -40, ua2: 120, fa2: 140, th1: 0, sh1: 0, th2: 104, sh2: 100, hip: 94, rot: 0 },
    throw: { tor: 18, head: 4, ua1: 88, fa1: 80, ua2: 88, fa2: 76, th1: -26, sh1: -12, th2: 26, sh2: 6, hip: 86, rot: 0 },
    jump: { tor: 4, head: 0, ua1: 110, fa1: 150, ua2: 120, fa2: 155, th1: 60, sh1: -50, th2: 85, sh2: -25, hip: 90, rot: 0 },
    airpunch: { tor: 14, head: 4, ua1: 70, fa1: 130, ua2: 110, fa2: 100, th1: 60, sh1: -50, th2: 80, sh2: -30, hip: 90, rot: 0 },
    airkick: { tor: -10, head: 4, ua1: 100, fa1: 150, ua2: 60, fa2: 120, th1: 40, sh1: -60, th2: 70, sh2: 62, hip: 90, rot: 0 },
    hstun: { tor: -24, head: -22, ua1: -10, fa1: 20, ua2: 0, fa2: 30, th1: -24, sh1: -10, th2: 14, sh2: 4, hip: 86, rot: 0 },
    launched: { tor: -30, head: -30, ua1: -60, fa1: -40, ua2: -30, fa2: 0, th1: 40, sh1: 20, th2: 70, sh2: 60, hip: 90, rot: -55 },
    down: { tor: 0, head: 0, ua1: -170, fa1: -175, ua2: -150, fa2: -160, th1: 4, sh1: 0, th2: 10, sh2: 4, hip: 16, rot: -90 },
    win: { tor: -4, head: 10, ua1: 160, fa1: 175, ua2: 150, fa2: 170, th1: -18, sh1: -8, th2: 20, sh2: 6, hip: 92, rot: 0 },
  };
  const K = Object.keys(P.idle);
  const mix = (a, b, t) => { const o = {}; for (const k of K) o[k] = a[k] + (b[k] - a[k]) * t; return o; };
  const ease = (t) => t * t * (3 - 2 * t);

  function poseOf(f, frame, s) {
    const C = FD.CHARS[f.id];
    if (s && s.phase === 'over' && s.winner === s.p.indexOf(f) && f.state !== 'attack') return mix(P.idle, P.win, 0.5 + Math.sin(frame / 8) * 0.5);
    switch (f.state) {
      case 'attack': {
        const m = f.move, pose = P[m.pose] || P.jab, base = m.air ? P.jump : m.crouch ? P.crouch : P.idle;
        const t = f.mt <= m.start ? ease(f.mt / m.start) : f.mt <= m.start + m.act ? 1 : 1 - ease((f.mt - m.start - m.act) / m.rec);
        const o = mix(base, pose, t);
        if (m.pose === 'cyclone' && f.mt > m.start) o.spin = Math.floor((f.mt - m.start) / 4) % 2;
        if (m.pose === 'stomp' && f.mt > m.start) { o.th2 = 10; o.sh2 = 4; }
        return o;
      }
      case 'walk': { const w = Math.sin(frame / 5) * 24 * Math.sign(f.vx * f.face || 1); const o = { ...P.idle }; o.th1 -= w; o.th2 += w; o.sh1 -= Math.max(0, w) * 0.6; o.sh2 -= Math.max(0, -w) * 0.6; o.hip -= Math.abs(Math.sin(frame / 5)) * 3; return o; }
      case 'crouch': return P.crouch;
      case 'cblock': return P.cblock;
      case 'block': case 'bstun': return P.block;
      case 'jump': return P.jump;
      case 'hstun': return P.hstun;
      case 'launched': { const o = { ...P.launched }; o.rot = -55 - Math.min(40, (f.vy < 0 ? -f.vy * 4 : 0)); return o; }
      case 'down': case 'ko': return P.down;
      case 'getup': return mix(P.down, P.idle, ease(1 - f.t / 22));
      default: { const o = { ...P.idle }; const b = Math.sin(frame / 12); o.hip += b * 1.5; o.fa1 += b * 4; o.fa2 -= b * 4; return o; }
    }
  }

  const rad = (d) => d * Math.PI / 180;
  // draw one fighter at its feet position; ctx is in world space with y up
  // flash: { col: [r, g, b], k: 0..1 } tints only the fighter's own colours (hit flash, special glow)
  function drawFighter(ctx, f, frame, s, flash) {
    const T = (c) => (flash && c !== '#120c1c' ? tint(c, flash.col, flash.k) : c);
    const C = FD.CHARS[f.id], p = poseOf(f, frame, s), big = C.big ? 1.12 : 1, leg = f.id === 'lin' ? 1.12 : 1;
    const face = p.spin ? -f.face : f.face;
    ctx.save(); ctx.translate(f.x, f.y); ctx.scale(face * big, big);
    if (p.rot) { ctx.translate(0, p.hip * 0.5); ctx.rotate(rad(p.rot)); ctx.translate(0, -p.hip * 0.5); }
    const hip = [0, p.hip], tl = 56, tor = rad(p.tor);
    const neck = [hip[0] + Math.sin(tor) * tl, hip[1] + Math.cos(tor) * tl];
    const seg = (from, ang, len) => [from[0] + Math.sin(rad(ang)) * len, from[1] - Math.cos(rad(ang)) * len];
    const sh1 = [neck[0] - 6, neck[1] - 4], sh2 = [neck[0] + 4, neck[1] - 4];
    const el1 = seg(sh1, p.ua1, 32), ha1 = seg(el1, p.fa1, 30), el2 = seg(sh2, p.ua2, 32), ha2 = seg(el2, p.fa2, 30);
    const kn1 = seg(hip, p.th1, 46 * leg), ft1 = seg(kn1, p.sh1, 46 * leg), kn2 = seg(hip, p.th2, 46 * leg), ft2 = seg(kn2, p.sh2, 46 * leg);
    const line = (a, b, w, col) => { ctx.strokeStyle = T(col); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
    const dot = (a, r, col) => { ctx.fillStyle = T(col); ctx.beginPath(); ctx.arc(a[0], a[1], r, 0, 7); ctx.fill(); };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const dark = shade(C.color, -0.35), out = '#120c1c';
    const limb = (a, b, w, col) => { line(a, b, w + 5, out); line(a, b, w, col); };
    // back arm and leg
    limb(hip, kn1, 17, dark); limb(kn1, ft1, 15, dark); dot(ft1, 9, out); dot(ft1, 7, '#2b2b2b');
    limb(sh1, el1, 13, shade(C.color, -0.2)); limb(el1, ha1, 11, shade(C.skin, -0.2)); dot(ha1, 10, out); dot(ha1, 8, shade(C.trim, -0.25));
    // torso
    limb(hip, neck, 30, C.color);
    const bx = hip[0] + Math.sin(tor) * 12, by = hip[1] + Math.cos(tor) * 12, cx = Math.cos(tor) * 16, cy = -Math.sin(tor) * 16; // belt across the waist
    line([bx - cx, by - cy], [bx + cx, by + cy], 8, C.trim); line([bx + cx * 0.3, by + cy * 0.3], [bx - cx * 0.2 - 4, by - cy * 0.2 - 16], 4, C.trim);
    // front leg
    limb(hip, kn2, 17, C.color); limb(kn2, ft2, 15, C.color); dot(ft2, 9, out); dot(ft2, 7, '#3a3a3a');
    // head
    const head = [neck[0] + Math.sin(tor + rad(p.head) * 0.5) * 22, neck[1] + Math.cos(tor + rad(p.head) * 0.5) * 22];
    dot(head, 18, out); dot(head, 16, C.skin);
    drawHair(ctx, C, head, rad(p.tor + p.head * 0.5), T);
    // face: eye and mouth looking forward
    const hurt = ['hstun', 'launched', 'down', 'ko'].includes(f.state);
    ctx.fillStyle = '#111';
    if (hurt) { ctx.lineWidth = 2.5; ctx.strokeStyle = '#111'; ctx.beginPath(); ctx.moveTo(head[0] + 4, head[1] + 4); ctx.lineTo(head[0] + 11, head[1] - 2); ctx.moveTo(head[0] + 4, head[1] - 2); ctx.lineTo(head[0] + 11, head[1] + 4); ctx.stroke(); }
    else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(head[0] + 8, head[1] + 2, 3.6, 4.2, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(head[0] + 9.5, head[1] + 1.5, 2, 0, 7); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#111'; ctx.beginPath(); ctx.moveTo(head[0] + 4, head[1] + 8); ctx.lineTo(head[0] + 12, head[1] + (f.state === 'attack' ? 6 : 8)); ctx.stroke(); }
    ctx.fillStyle = '#111'; ctx.fillRect(head[0] + 6, head[1] - 8, hurt ? 7 : 6, f.state === 'attack' || hurt ? 3.5 : 2);
    // front arm on top
    limb(sh2, el2, 13, C.color); limb(el2, ha2, 11, C.skin); dot(ha2, 10.5, out); dot(ha2, 8.5, C.trim);
    ctx.restore();
  }
  function drawHair(ctx, C, h, a, T) {
    ctx.save(); ctx.translate(h[0], h[1]); ctx.rotate(-a);
    ctx.fillStyle = T(C.hair);
    if (C.name === 'Kenji') { ctx.beginPath(); ctx.arc(0, 4, 16.5, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); ctx.fillStyle = T(C.color); ctx.fillRect(-16, 2, 32, 5); ctx.beginPath(); ctx.moveTo(-15, 5); ctx.lineTo(-30, 0); ctx.lineTo(-28, 9); ctx.fill(); }
    if (C.name === 'Vex') { ctx.beginPath(); ctx.moveTo(-16, 2); ctx.lineTo(-24, 22); ctx.lineTo(-6, 14); ctx.lineTo(-8, 28); ctx.lineTo(6, 16); ctx.lineTo(14, 22); ctx.lineTo(16, 4); ctx.arc(0, 4, 16, 0, Math.PI, true); ctx.fill(); }
    if (C.name === 'Tank') { ctx.fillRect(-12, 15, 24, 4); ctx.fillStyle = T('#111111'); ctx.fillRect(2, -14, 12, 6); }
    if (C.name === 'Lin') { ctx.beginPath(); ctx.arc(0, 4, 16.5, Math.PI * 0.9, Math.PI * 2.1); ctx.fill(); ctx.beginPath(); ctx.arc(-14, 12, 7, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(-16, 8); ctx.quadraticCurveTo(-30, -10, -22, -24); ctx.lineTo(-18, -22); ctx.quadraticCurveTo(-24, -8, -12, 4); ctx.fill(); }
    ctx.restore();
  }
  function rgbOf(c) { if (c[0] === '#') { const n = parseInt(c.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; } return c.match(/\d+/g).slice(0, 3).map(Number); }
  function tint(c, to, k) { const a = rgbOf(c); return `rgb(${a.map((v, i) => Math.round(v + (to[i] - v) * k)).join(',')})`; }
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16), f = (c) => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }

  // ---------- stage: rooftop dojo at night ----------
  const stars = Array.from({ length: 70 }, (_, i) => [(i * 937) % 2400 - 500, 240 + ((i * 577) % 520), (i % 3) + 1]);
  const city = Array.from({ length: 34 }, (_, i) => [i * 80 - 300, 90 + ((i * 131) % 230), 60 + (i % 3) * 14]);
  function drawStage(ctx, camX, T) {
    // sky (screen space handled by caller); here world-space layers with parallax
    for (const [x, y, r] of stars) { ctx.globalAlpha = 0.5 + Math.sin(T * 2 + x) * 0.3; ctx.fillStyle = '#fff'; ctx.fillRect(x + camX * 0.9, y, r, r); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff4d6'; ctx.beginPath(); ctx.arc(1100 + camX * 0.85, 640, 60, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; ctx.globalAlpha = 0.15; ctx.beginPath(); ctx.arc(1100 + camX * 0.85, 640, 95, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    // skyline
    for (const [x, h, w] of city) {
      const X = x + camX * 0.55;
      ctx.fillStyle = '#1d1838'; ctx.fillRect(X, 0, w, h + 60);
      ctx.fillStyle = '#ffd86b55'; for (let wy = 30; wy < h + 40; wy += 26) for (let wx = 8; wx < w - 8; wx += 16) if (((x * 7 + wy * 3 + wx) % 5) < 2) ctx.fillRect(X + wx, wy, 7, 10);
    }
    // dojo back wall + lanterns
    ctx.fillStyle = '#3b2a20'; ctx.fillRect(-200, 0, 1800, 40);
    // a string of paper lanterns across the back
    ctx.strokeStyle = '#1a1210'; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = -100; x <= 1500; x += 20) { const y = 400 - Math.sin(((x + 100) % 400) / 400 * Math.PI) * 30; x === -100 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    for (let x = 0; x < 1500; x += 100) {
      const y = 400 - Math.sin(((x + 100) % 400) / 400 * Math.PI) * 30 - 14, sw = Math.sin(T * 1.5 + x) * 2;
      ctx.fillStyle = '#ffd43b2a'; ctx.beginPath(); ctx.arc(x + sw, y, 16, 0, 7); ctx.fill();
      ctx.fillStyle = x % 200 ? '#ff6b3d' : '#e03131'; ctx.beginPath(); ctx.ellipse(x + sw, y, 7, 10, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#1a1210'; ctx.fillRect(x + sw - 4, y + 8, 8, 3); ctx.fillRect(x + sw - 4, y - 11, 8, 3);
    }
    // wooden floor
    const g = ctx.createLinearGradient(0, 0, 0, -140); g.addColorStop(0, '#a0673f'); g.addColorStop(1, '#5c3a22');
    ctx.fillStyle = g; ctx.fillRect(-300, -160, 2000, 160);
    ctx.strokeStyle = '#00000033'; ctx.lineWidth = 2;
    for (let y = -20; y > -160; y -= 28) { ctx.beginPath(); ctx.moveTo(-300, y); ctx.lineTo(1700, y); ctx.stroke(); }
    ctx.fillStyle = '#ffffff10'; ctx.fillRect(-300, -6, 2000, 6);
    // stage edges (walls)
    ctx.fillStyle = '#2b1d14'; ctx.fillRect(-300, -160, 330, 600); ctx.fillRect(1370, -160, 330, 600);
  }
  function drawShadow(ctx, f) { ctx.fillStyle = '#00000044'; ctx.beginPath(); ctx.ellipse(f.x, -4, Math.max(18, 44 - f.y * 0.12), 8, 0, 0, 7); ctx.fill(); }

  // comic-style impact burst: a jagged star that pops out and fades
  function drawBurst(ctx, x, y, life, size, inner, edge) {
    const k = 1 - life, r = size * (0.45 + k * 0.9), n = 12;
    ctx.save(); ctx.translate(x, y); ctx.rotate(x * 0.01); ctx.globalAlpha = Math.min(1, life * 2.2);
    const star = (rad, jag) => { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, rr = i % 2 ? rad * jag * (0.8 + ((i * 37) % 7) / 20) : rad; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); };
    star(r, 0.45); ctx.fillStyle = edge; ctx.fill();
    star(r * 0.62, 0.5); ctx.fillStyle = inner; ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function drawGuard(ctx, x, y, face, life) { // blue shield arc in front of a blocking fighter
    ctx.save(); ctx.globalAlpha = life; ctx.translate(x, y); ctx.scale(face, 1);
    ctx.strokeStyle = '#74c0fc'; ctx.lineWidth = 8 * life + 2; ctx.beginPath(); ctx.arc(-10, 0, 46 + (1 - life) * 18, -0.9, 0.9); ctx.stroke();
    ctx.strokeStyle = '#e7f5ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-10, 0, 40 + (1 - life) * 18, -0.7, 0.7); ctx.stroke();
    ctx.restore(); ctx.globalAlpha = 1;
  }
  globalThis.FR = { drawFighter, drawStage, drawShadow, poseOf, shade, drawBurst, drawGuard };
})();
