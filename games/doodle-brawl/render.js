// Doodle Brawl: drawing. Everything looks inked on notebook paper, with a slight hand-drawn "boil" wobble.
(() => {
  const INK = '#1d1b2f';
  let boil = 0; // changes every few frames so outlines wobble like a flip-book
  const jit = (i, a = 1.2) => Math.sin(i * 12.9898 + boil * 78.233) * a;

  function paper(ctx, W, H, camX, scale) {
    ctx.fillStyle = '#fdfaf1'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#c9dcf0'; ctx.lineWidth = 1.5;
    const gap = 34 * scale, off = (-camX * scale * 0.25) % gap;
    for (let y = gap; y < H; y += gap) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.strokeStyle = '#f2a7a7'; ctx.lineWidth = 2;
    const mx = ((-camX + 120) * scale * 0.25) % W + W * 0.05;
    ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(mx, H); ctx.stroke();
    void off;
  }
  // a wobbly hand-drawn line through points
  function inkPath(ctx, pts, close) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x + jit(i), y + jit(i + 7)) : ctx.moveTo(x + jit(i), y + jit(i + 7))));
    if (close) ctx.closePath();
  }
  function arena(ctx, s, T) {
    // floor and walls, drawn in pencil
    ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineCap = 'round';
    inkPath(ctx, [[-200, 0], [300, 0], [600, 0], [900, 0], [1400, 0]]); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#8a8698';
    for (let x = -200; x < 1400; x += 22) { ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x - 14, -22); ctx.stroke(); }
    for (const wx of [40, 1160]) {
      ctx.fillStyle = '#ece7da'; ctx.fillRect(wx === 40 ? -200 : 1160, -40, 240, 900);
      ctx.strokeStyle = INK; ctx.lineWidth = 4; inkPath(ctx, [[wx, -30], [wx, 300], [wx, 700]]); ctx.stroke();
      ctx.strokeStyle = '#8a8698'; ctx.lineWidth = 1.5;
      for (let y = 0; y < 700; y += 24) { const d = wx === 40 ? -1 : 1; ctx.beginPath(); ctx.moveTo(wx, y); ctx.lineTo(wx + d * 18, y + 12); ctx.stroke(); }
    }
    // hanging crates
    for (const c of s.crates) {
      if (c.broken) continue;
      if (c.hang) { ctx.strokeStyle = '#8a6d4b'; ctx.lineWidth = 2.5; inkPath(ctx, [[c.x, 700], [c.x, c.y + c.w]]); ctx.stroke(); }
      const sw = c.hang ? Math.sin(T * 1.3 + c.x) * 0.04 : 0;
      ctx.save(); ctx.translate(c.x, c.y + c.w / 2); ctx.rotate(sw);
      ctx.fillStyle = '#e2b77a'; ctx.fillRect(-c.w / 2, -c.w / 2, c.w, c.w);
      ctx.strokeStyle = INK; ctx.lineWidth = 3.5; inkPath(ctx, [[-c.w / 2, -c.w / 2], [c.w / 2, -c.w / 2], [c.w / 2, c.w / 2], [-c.w / 2, c.w / 2]], true); ctx.stroke();
      ctx.lineWidth = 2.5; inkPath(ctx, [[-c.w / 2, -c.w / 2], [c.w / 2, c.w / 2]]); ctx.stroke(); inkPath(ctx, [[c.w / 2, -c.w / 2], [-c.w / 2, c.w / 2]]); ctx.stroke();
      ctx.restore();
    }
    // the barrel
    const b = s.barrel;
    if (!b.gone) {
      const lit = b.fuse > 0, flash = lit && Math.floor(T * 12) % 2;
      ctx.fillStyle = flash ? '#ffd43b' : '#ff6b6b'; ctx.fillRect(b.x - 22, 0, 44, 58);
      ctx.strokeStyle = INK; ctx.lineWidth = 3.5; inkPath(ctx, [[b.x - 22, 0], [b.x + 22, 0], [b.x + 22, 58], [b.x - 22, 58]], true); ctx.stroke();
      ctx.lineWidth = 2; inkPath(ctx, [[b.x - 22, 18], [b.x + 22, 18]]); ctx.stroke(); inkPath(ctx, [[b.x - 22, 40], [b.x + 22, 40]]); ctx.stroke();
      ctx.save(); ctx.scale(1, -1); ctx.fillStyle = INK; ctx.font = '900 15px "Comic Sans MS", "Chalkboard SE", system-ui'; ctx.textAlign = 'center'; ctx.fillText('TNT', b.x, -24); ctx.restore();
      if (lit) { ctx.strokeStyle = '#ff922b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x, 58); ctx.quadraticCurveTo(b.x + 10, 70, b.x + 4, 78 + Math.sin(T * 30) * 3); ctx.stroke(); }
    }
  }

  // the weapon exactly as it was drawn
  function weapon(ctx, f, ink, trail, T) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (f.sp && f.sp.k === 'boomer') return;
    const draw = (phi, alpha, width) => {
      ctx.globalAlpha = alpha; ctx.strokeStyle = ink; ctx.lineWidth = width;
      for (const st of f.w.segs) {
        ctx.beginPath();
        for (let i = 0; i < st.length; i += (st.length > 120 ? 2 : 1)) {
          const k = f.reach / f.w.reach, [x, y] = DB.wpos(f, [st[i][0] * k, st[i][1] * k], phi); // k: chaos 'giant' scale
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
    };
    // motion trail while swinging fast
    if (Math.abs(f.om) > 0.12 && trail) for (let k = 3; k >= 1; k--) draw(f.phi - f.om * k * 0.9, 0.12 * (4 - k) / 3, 5);
    ctx.globalAlpha = 1;
    draw(f.phi, 1, 6.5);
    ctx.globalAlpha = 1;
  }
  // the bean fighter
  const HATS = {
    crown: (ctx) => { ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-14, 16); ctx.lineTo(-7, 8); ctx.lineTo(0, 18); ctx.lineTo(7, 8); ctx.lineTo(14, 16); ctx.lineTo(14, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); },
    cap: (ctx) => { ctx.fillStyle = '#4dabf7'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI); ctx.fill(); ctx.stroke(); ctx.fillRect(0, -1, 24, 5); ctx.strokeRect(0, -1, 24, 5); },
    horns: (ctx) => { ctx.fillStyle = '#fff4e6'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 8, 0); ctx.quadraticCurveTo(d * 22, 6, d * 18, 22); ctx.lineTo(d * 14, 4); ctx.fill(); ctx.stroke(); } },
    party: (ctx) => { ctx.fillStyle = '#ff6b9b'; ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(0, 30); ctx.lineTo(11, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(0, 32, 5, 0, 7); ctx.fill(); },
    tophat: (ctx) => { ctx.fillStyle = '#212529'; ctx.fillRect(-18, 0, 36, 5); ctx.fillRect(-11, 4, 22, 22); ctx.strokeRect(-11, 4, 22, 22); ctx.fillStyle = '#e03131'; ctx.fillRect(-11, 6, 22, 4); },
    halo: (ctx, T) => { ctx.strokeStyle = '#fcc419'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 14 + Math.sin(T * 3) * 2, 15, 5, 0, 0, 7); ctx.stroke(); },
    propeller: (ctx, T) => { ctx.fillStyle = '#69db7c'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI); ctx.fill(); ctx.stroke(); const s = Math.sin(T * 25) * 16; ctx.fillStyle = '#ff6b6b'; ctx.fillRect(-s, 16, s * 2, 4); ctx.fillRect(-1.5, 10, 3, 8); },
  };
  function bean(ctx, f, col, T, s, o) {
    const r = f.r, mood = f.hp <= 0 ? 'ko' : f.stun || f.tumble ? 'hurt' : f.dizzy > 0 ? 'dizzy' : s.phase === 'over' ? (s.winner === s.p.indexOf(f) ? 'win' : 'sad') : f.phase !== 'idle' || f.sp ? 'fight' : f.block ? 'guard' : 'idle';
    const squash = f.y === 0 && !f.tumble ? 1 + Math.sin(T * 6 + f.x) * 0.03 : 1;
    ctx.save(); ctx.translate(f.x, f.y + r);
    if (f.tumble || f.hp <= 0) ctx.rotate(f.spin);
    if (mood === 'win') ctx.translate(0, Math.abs(Math.sin(T * 8)) * 18);
    ctx.scale(f.face, 1);
    if (f.dodge > 0) ctx.globalAlpha = 0.45;
    // feet
    ctx.fillStyle = INK;
    const step = f.y === 0 && Math.abs(f.vx) > 0.5 ? Math.sin(T * 18) * 6 : 0;
    for (const [dx, k] of [[-10, 1], [10, -1]]) { ctx.beginPath(); ctx.ellipse(dx + step * k, -r + 3, 9, 5, 0, 0, 7); ctx.fill(); }
    // body
    ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 4;
    ctx.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2; ctx.lineTo(Math.cos(a) * r * (1 + jit(i, 0.025)) / squash, Math.sin(a) * r * 1.08 * squash + jit(i + 3, 0.6)); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff55'; ctx.beginPath(); ctx.ellipse(-r * 0.35, r * 0.45, r * 0.25, r * 0.15, -0.5, 0, 7); ctx.fill();
    // face
    const ex = r * 0.32, ey = r * 0.22;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    for (const dx of [ex - 9, ex + 9]) { ctx.beginPath(); ctx.ellipse(dx, ey, 7, 8.5, 0, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = INK;
    if (mood === 'ko' || mood === 'hurt') { ctx.lineWidth = 2.5; for (const dx of [ex - 9, ex + 9]) { ctx.beginPath(); ctx.moveTo(dx - 4, ey - 4); ctx.lineTo(dx + 4, ey + 4); ctx.moveTo(dx + 4, ey - 4); ctx.lineTo(dx - 4, ey + 4); ctx.stroke(); } }
    else if (mood === 'dizzy') { ctx.lineWidth = 2; for (const dx of [ex - 9, ex + 9]) { ctx.beginPath(); for (let i = 0; i < 18; i++) { const a = i * 0.7 + T * 8; ctx.lineTo(dx + Math.cos(a) * i * 0.3, ey + Math.sin(a) * i * 0.3); } ctx.stroke(); } }
    else { const look = o ? Math.sign(o.x - f.x) * f.face : 1; for (const dx of [ex - 9, ex + 9]) { ctx.beginPath(); ctx.arc(dx + 2.5 * look, ey - 1, 3.6, 0, 7); ctx.fill(); } }
    // brows + mouth
    ctx.lineWidth = 3; ctx.beginPath();
    if (mood === 'fight' || mood === 'sad') { ctx.moveTo(ex - 15, ey + 13); ctx.lineTo(ex - 4, ey + 9); ctx.moveTo(ex + 15, ey + 13); ctx.lineTo(ex + 4, ey + 9); }
    else if (mood === 'guard') { ctx.moveTo(ex - 15, ey + 10); ctx.lineTo(ex - 4, ey + 12); ctx.moveTo(ex + 4, ey + 12); ctx.lineTo(ex + 15, ey + 10); }
    ctx.stroke();
    ctx.lineWidth = 2.5; ctx.beginPath();
    if (mood === 'win') { ctx.arc(ex, -2, 9, Math.PI * 1.1, Math.PI * 1.9, true); ctx.fillStyle = '#c92a2a'; ctx.fill(); ctx.stroke(); }
    else if (mood === 'hurt' || mood === 'ko') { ctx.ellipse(ex, -6, 6, 7, 0, 0, 7); ctx.fillStyle = INK; ctx.fill(); }
    else if (mood === 'sad') { ctx.arc(ex, -14, 8, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
    else if (mood === 'fight') { ctx.moveTo(ex - 7, -6); ctx.lineTo(ex + 7, -6); ctx.stroke(); }
    else { ctx.arc(ex, -2, 6, Math.PI * 1.15, Math.PI * 1.85, true); ctx.stroke(); }
    // hat
    if (f.hat && HATS[f.hat]) { ctx.save(); ctx.translate(-2, r * 1.02); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; HATS[f.hat](ctx, T); ctx.restore(); }
    // hand
    ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r * 0.7, 4, 7, 0, 7); ctx.fill(); ctx.stroke();
    ctx.restore(); ctx.globalAlpha = 1;
    if (f.dizzy > 0) { f.dizzy--; ctx.fillStyle = '#fcc419'; for (let i = 0; i < 3; i++) { const a = T * 4 + i * 2.1; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * 26, f.y + r * 2.3 + Math.sin(a) * 6, 4, 0, 7); ctx.fill(); } }
  }

  // a weapon thumbnail for cards and the drawing screen (drawn in canvas coords)
  function thumb(cv, strokes, ink = INK, pad = 16) {
    const ctx = cv.getContext('2d'), w = cv.width, h = cv.height;
    ctx.clearRect(0, 0, w, h);
    const all = strokes.flat(); if (!all.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of all) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const k = Math.min((w - pad * 2) / Math.max(20, x1 - x0), (h - pad * 2) / Math.max(20, y1 - y0));
    ctx.save(); ctx.translate(w / 2 - (x0 + x1) / 2 * k, h / 2 - (y0 + y1) / 2 * k); ctx.scale(k, k);
    ctx.strokeStyle = ink; ctx.lineWidth = Math.max(3, 7 / k); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const st of strokes) { ctx.beginPath(); st.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
    ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(strokes[0][0][0], strokes[0][0][1], Math.max(5, 9 / k), 0, 7); ctx.fill(); // the handle
    ctx.restore();
  }

  globalThis.DR = { paper, arena, weapon, bean, thumb, tick: () => { boil = Math.floor(performance.now() / 120); }, INK, HATS };
})();
