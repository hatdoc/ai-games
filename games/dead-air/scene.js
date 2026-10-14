// Dead Air scene: the parking lot seen through the studio window, drawn on a 360px-tall canvas
// whose width follows the screen's aspect ratio. Everything is procedural.
const Scene = (() => {
  const H = 360, HOR = 150;
  let theme = 'radio', W = 640, U = 1, cv, g, bg, glass, fogT, rain = [], drops = [], t = 0, tw = [], lights = [];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
  const rng = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // figure position by distance D: [x as fraction of W, feet y, height]
  const ROW = [[.5, 440, 430], [.5, 322, 235], [.54, 252, 150], [.58, 206, 88], [.62, 176, 46], [.66, 158, 24], [.66, 158, 24]];
  const place = (D) => {
    D = clamp(D, 0, 6); const i = Math.min(5, D | 0), k = D - i, a = ROW[i], b = ROW[i + 1];
    return { x: lerp(a[0], b[0], k) * W, y: lerp(a[1], b[1], k), h: lerp(a[2], b[2], k), a: clamp(6 - D) };
  };
  // [tilt, left arm [a1,a2], right arm [a1,a2]]: arms in radians from straight down, outward positive
  const POSES = [
    [.08, [.08, 0], [.08, 0]], [-.45, [.1, .2], [.05, -.1]], [.3, [.1, 0], [2.3, -2.1]],
    [.15, [.55, .25], [.55, .25]], [-.2, [.9, 0], [.9, 0]], [.5, [.04, 0], [.95, .5]],
  ];

  function figure(c, x, fy, h, o) {
    const s = h / 100, P = POSES[o.pose % POSES.length], L = o.lit;
    c.save(); c.globalAlpha *= o.alpha ?? 1; c.translate(x, fy); c.scale(s, s); c.lineCap = c.lineJoin = 'round';
    const ln = (x1, y1, x2, y2) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
    const body = (col, dx, w) => { // drawn twice: a pale rim on the lamp side first, then the black body over it
      c.save(); c.translate(dx, 0); c.fillStyle = c.strokeStyle = col;
      c.lineWidth = 3.4 + w; ln(-2.4, -50, -3.2, 0); ln(2.4, -50, 3.2, 0);
      c.beginPath(); c.moveTo(-4.4 - w / 2, -52); c.lineTo(4.4 + w / 2, -52); c.lineTo(5.8 + w / 2, -78); c.lineTo(-5.8 - w / 2, -78); c.closePath(); c.fill();
      c.lineWidth = 2.1 + w;
      for (const [sx, sg, a] of [[-5.4, -1, P[1]], [5.4, 1, P[2]]]) { // arms that are too long
        const ex = sx + sg * Math.sin(a[0]) * 27, ey = -77 + Math.cos(a[0]) * 27, hx = ex + sg * Math.sin(a[0] + a[1]) * 31, hy = ey + Math.cos(a[0] + a[1]) * 31;
        ln(sx, -77, ex, ey); ln(ex, ey, hx, hy); c.lineWidth = .9 + w * .4;
        for (const d of [-.35, 0, .35]) ln(hx, hy, hx + sg * Math.sin(a[0] + a[1] + d) * 8, hy + Math.cos(a[0] + a[1] + d) * 8); c.lineWidth = 2.1 + w;
      }
      c.lineWidth = 2.4 + w; ln(0, -78, 0, -84); c.restore();
    };
    if (o.bleach) body('rgb(220,226,220)', 0, 0);
    else { body(`rgba(175,205,220,${.06 + L * .2})`, -1, 1); body(`rgb(${Math.round(2 + L * 7)},${Math.round(4 + L * 8)},${Math.round(6 + L * 9)})`, 0, 0); }
    c.save(); c.translate(0, -89); c.rotate(P[0] * (1 - o.gaze * .9));
    c.fillStyle = o.bleach ? '#fff' : `rgba(196,208,203,${.2 + L * .62})`; c.beginPath(); c.ellipse(0, 0, 3.9, 6.5, 0, 0, 7); c.fill();
    if (L > .22 || o.gaze > .1) { // two black slits open as it notices you; nothing else on the face
      c.fillStyle = `rgba(0,0,0,${clamp(.4 + o.gaze * .6 + L * .2)})`;
      for (const sx of [-1.6, 1.6]) { c.beginPath(); c.ellipse(sx, -1.2, .75, 2.3 + o.gaze * .8, sx * .1, 0, 7); c.fill(); }
      if (L > .6 && o.gaze > .5) { c.strokeStyle = `rgba(0,0,0,${o.gaze * .55})`; c.lineWidth = .35; c.beginPath(); c.moveTo(-2.4, 3.4); c.lineTo(2.4, 3.4); c.stroke(); }
    }
    c.restore(); c.restore();
  }

  function face(c, k) { // end of the line: it is at the glass
    c.save(); c.fillStyle = `rgba(0,0,0,${clamp(k * 1.6)})`; c.fillRect(0, 0, W, H);
    const s = lerp(.82, 1.15, k), cx = W / 2, cy = H * .5; c.translate(cx, cy); c.rotate(.09); c.scale(s, s);
    const gr = c.createRadialGradient(-10, -40, 8, 0, 0, 200); gr.addColorStop(0, '#d7ddd8'); gr.addColorStop(.55, '#7d8884'); gr.addColorStop(1, '#0d1110');
    c.fillStyle = gr; c.beginPath(); c.ellipse(0, 0, 92, 178, 0, 0, 7); c.fill();
    const br = c.createLinearGradient(0, -170, 0, -60); br.addColorStop(0, 'rgba(0,0,0,.75)'); br.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = br; c.fillRect(-92, -170, 184, 110);
    c.fillStyle = '#000'; // two tall black pits, one a little higher than the other
    for (const [sx, dy] of [[-36, -6], [38, 8]]) { c.save(); c.translate(sx, -34 + dy); c.rotate(sx * .004); c.beginPath(); c.ellipse(0, 0, 12, 33, 0, 0, 7); c.fill(); c.restore(); }
    c.fillStyle = 'rgba(0,0,0,.55)'; c.beginPath(); c.ellipse(-4, 30, 2, 7, 0, 0, 7); c.ellipse(6, 30, 2, 7, 0, 0, 7); c.fill();
    const open = 4 + 22 * clamp((k - .55) * 2.2); // the mouth slowly drops open
    c.fillStyle = '#000'; c.beginPath(); c.moveTo(-64, 84); c.quadraticCurveTo(0, 84 - 6, 64, 84); c.quadraticCurveTo(0, 84 + open * 2.4, -64, 84); c.fill();
    c.strokeStyle = 'rgba(222,226,220,.7)'; c.lineWidth = 1.6; for (let i = -12; i <= 12; i++) { const x = i * 5, y = 84 - 3 * (1 - (x / 64) ** 2); c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 6 + open * .25 * (1 - Math.abs(x / 64))); c.stroke(); }
    c.restore();
  }

  function pines(c, y, hMin, hMax, col, step, r) {
    c.fillStyle = col; c.beginPath(); c.moveTo(-10, HOR + 2);
    for (let x = -10; x <= W + 10; x += step) { const h = hMin + r() * (hMax - hMin), w = step * .75; c.lineTo(x - w, y); c.lineTo(x, y - h); c.lineTo(x + w, y); }
    c.lineTo(W + 10, HOR + 2); c.fill();
  }
  function car(c, x, y, s, col, truck) {
    c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = col; c.beginPath();
    if (truck) { c.moveTo(-70, 0); c.lineTo(-70, -26); c.lineTo(-24, -26); c.lineTo(-18, -44); c.lineTo(22, -44); c.lineTo(32, -26); c.lineTo(66, -22); c.lineTo(68, 0); }
    else { c.moveTo(-62, 0); c.lineTo(-62, -14); c.quadraticCurveTo(-60, -22, -48, -23); c.lineTo(-30, -24); c.lineTo(-18, -38); c.lineTo(22, -38); c.lineTo(38, -24); c.lineTo(58, -21); c.quadraticCurveTo(64, -18, 64, -8); c.lineTo(64, 0); }
    c.closePath(); c.fill(); c.fillStyle = 'rgba(110,140,150,.1)'; c.beginPath();
    if (truck) { c.moveTo(-14, -28); c.lineTo(-9, -41); c.lineTo(19, -41); c.lineTo(27, -28); } else { c.moveTo(-14, -26); c.lineTo(-7, -35); c.lineTo(20, -35); c.lineTo(31, -26); }
    c.closePath(); c.fill(); c.fillStyle = '#010203';
    for (const wx of truck ? [-44, 42] : [-38, 38]) { c.beginPath(); c.arc(wx, 0, 10, 0, 7); c.fill(); }
    c.fillStyle = 'rgba(255,50,40,.85)'; c.fillRect(truck ? -70 : -62, truck ? -22 : -17, 4, 5); c.restore();
  }

  function build() {
    const r = rng(11); bg = mk(W, H); const c = bg.getContext('2d');
    let gr = c.createLinearGradient(0, 0, 0, HOR); gr.addColorStop(0, '#02050a'); gr.addColorStop(.6, '#07131c'); gr.addColorStop(1, '#1a343e'); c.fillStyle = gr; c.fillRect(0, 0, W, HOR + 2);
    tw = []; for (let i = 0; i < 90; i++) { const s = [r() * W, r() * HOR * .8, .15 + r() * .5]; tw.push(s); c.fillStyle = `rgba(210,230,255,${s[2]})`; c.fillRect(s[0], s[1], 1, 1); }
    c.fillStyle = '#0a1a21'; c.beginPath(); c.moveTo(0, HOR); for (let x = 0; x <= W; x += 6) c.lineTo(x, HOR - 12 - 9 * Math.sin(x * .013 + 1) - 5 * Math.sin(x * .041)); c.lineTo(W, HOR); c.fill();
    pines(c, HOR + 2, 8, 22, '#071216', 9, r); pines(c, HOR + 4, 12, 36, '#03080a', 14, r);
    // radio tower (the motel gets a neon sign pylon instead)
    const tx = W * .8, tb = HOR; c.strokeStyle = '#020507'; c.lineWidth = 1.6;
    if (theme === 'motel') { c.fillStyle = '#020507'; c.fillRect(tx - 2, 70, 4, tb - 70); c.fillRect(tx - 34 * U - 4, 38, 68 * U + 8, 40); c.fillStyle = '#0a0406'; c.fillRect(tx - 34 * U, 42, 68 * U, 32); }
    else {
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(tx + s * 9 * U, tb); c.lineTo(tx + s * 1.2, 26); c.stroke(); }
    c.lineWidth = .9; for (let y = tb, k = 0; y > 34; y -= 14, k++) { const w = 9 * U * (y - 26) / (tb - 26), w2 = 9 * U * (y - 14 - 26) / (tb - 26); c.beginPath(); c.moveTo(tx - w, y); c.lineTo(tx + w2, y - 14); c.moveTo(tx + w, y); c.lineTo(tx - w2, y - 14); c.moveTo(tx - w, y); c.lineTo(tx + w, y); c.stroke(); }
    }
    // lot
    gr = c.createLinearGradient(0, HOR, 0, H); if (theme === 'dispatch') { gr.addColorStop(0, '#1c2c36'); gr.addColorStop(.25, '#0f1b22'); gr.addColorStop(1, '#04080b'); } else { gr.addColorStop(0, '#0b161c'); gr.addColorStop(.25, '#060d10'); gr.addColorStop(1, '#020304'); } c.fillStyle = gr; c.fillRect(0, HOR + 1, W, H - HOR);
    c.strokeStyle = 'rgba(190,210,220,.07)'; c.lineWidth = 1.2;
    for (let k = -6; k <= 6; k++) { c.beginPath(); c.moveTo(W / 2 + k * 9, HOR + 2); c.lineTo(W / 2 + k * W * .3, H); c.stroke(); }
    c.strokeStyle = 'rgba(190,210,220,.04)'; for (const y of [190, 240, 300]) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    for (const [px, py, pw] of [[.58, 236, 60], [.18, 288, 80], [.82, 272, 52]]) { c.fillStyle = 'rgba(60,95,110,.22)'; c.beginPath(); c.ellipse(px * W, py, pw * U, pw * .09, 0, 0, 7); c.fill(); }
    car(c, W * .7, 198, .5 * U + .12, '#04080a', false); car(c, W * .1, 236, .95 * Math.max(U, .55), '#030608', true);
    // lamp pole
    const lx = W * .27; c.fillStyle = '#020405'; c.fillRect(lx - 2.4, 44, 4.8, 220); c.fillRect(lx - 2.4, 42, 24 * U + 4, 3.4); c.beginPath(); c.ellipse(lx + 22 * U, 46, 11 * U + 2, 4, 0, 0, 7); c.fill();
    lights = []; for (let i = 0; i < 14; i++) lights.push([W * (.04 + r() * .46), HOR - 5 - r() * 7, 40 + r() * 290]);
    // fog strip (tiles)
    fogT = mk(W * 2, 80); const f = fogT.getContext('2d');
    for (let i = 0; i < 46; i++) { const x = r() * W * 2, y = 18 + r() * 44, rad = 30 + r() * 60, rg = f.createRadialGradient(x, y, 0, x, y, rad); rg.addColorStop(0, 'rgba(150,185,195,.07)'); rg.addColorStop(1, 'rgba(150,185,195,0)'); f.fillStyle = rg; f.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
    // glass: frame, sill, dirt, dead plant, mug
    glass = mk(W, H); const q = glass.getContext('2d');
    for (let i = 0; i < 34; i++) { const x = r() * W, y = r() * H * .6, l = 40 + r() * 160; q.fillStyle = `rgba(190,215,225,${.015 + r() * .04})`; q.fillRect(x, y, 1 + r() * 2, l); }
    for (let i = 0; i < 90; i++) { q.fillStyle = `rgba(200,220,230,${r() * .07})`; q.beginPath(); q.arc(r() * W, r() * H, .6 + r() * 1.6, 0, 7); q.fill(); }
    q.fillStyle = '#050607'; q.fillRect(0, 0, W, 10); q.fillRect(0, 0, 11, H); q.fillRect(W - 11, 0, 11, H);
    q.fillStyle = 'rgba(255,255,255,.07)'; q.fillRect(11, 10, W - 22, 1);
    gr = q.createLinearGradient(0, H - 36, 0, H); gr.addColorStop(0, '#15110c'); gr.addColorStop(1, '#070504'); q.fillStyle = gr; q.fillRect(0, H - 36, W, 36);
    q.fillStyle = 'rgba(255,230,190,.16)'; q.fillRect(0, H - 36, W, 1.5);
    const px = W * .13; q.fillStyle = '#0d0a07'; q.fillRect(px - 9, H - 52, 18, 16); q.strokeStyle = '#0a0d08'; q.lineWidth = 1.4;
    for (const [dx, dy] of [[-12, -28], [-5, -34], [6, -30], [13, -22], [0, -22]]) { q.beginPath(); q.moveTo(px, H - 52); q.quadraticCurveTo(px + dx * .4, H - 52 + dy * .6, px + dx, H - 52 + dy); q.stroke(); }
    const mx = W * .84; q.fillStyle = '#17120d'; q.fillRect(mx - 8, H - 52, 16, 16); q.strokeStyle = '#17120d'; q.lineWidth = 2.4; q.beginPath(); q.arc(mx + 9, H - 44, 5, -1.4, 1.4); q.stroke();
    q.fillStyle = 'rgba(255,200,120,.12)'; q.fillRect(mx - 8, H - 52, 16, 2);
    rain = []; for (let i = 0; i < 70; i++) rain.push([r() * W, r() * H, 220 + r() * 160, 6 + r() * 8]);
    drops = []; for (let i = 0; i < 7; i++) drops.push([r() * W, r() * H * .8, 1.4 + r() * 1.4, 4 + r() * 9, r() * 6]);
  }

  const LAMP = { radio: [255, 214, 150], motel: [255, 190, 130], dispatch: [205, 228, 255] };
  function setTheme(n) { theme = n; if (bg) build(); }
  function init(canvas) { cv = canvas; g = cv.getContext('2d'); resize(); addEventListener('resize', resize); }
  function resize() {
    const w = Math.max(200, Math.min(800, Math.round(H * innerWidth / Math.max(1, innerHeight))));
    if (w === W && bg) return; W = w; U = clamp(W / 640, .42, 1); cv.width = W; cv.height = H; build();
  }

  // s: D (shown distance), T (minute), pose, gaze 0..1, flood 0..1, dark 0..1, dawn 0..1, glitch 0..1, face 0..1, breath 0..1, onair
  function draw(s, dt) {
    t += dt; const D = s.D, dawn = s.dawn || 0, dark = s.dark || 0, flood = s.flood || 0;
    const lamp = (1 - dawn) * (1 - dark) * (.9 + .1 * Math.sin(t * 31) * Math.sin(t * 7.3));
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.drawImage(bg, 0, 0);
    for (const [i, s2] of tw.entries()) if (i < 14) { g.fillStyle = `rgba(230,240,255,${(.2 + .5 * Math.abs(Math.sin(t * (.6 + i * .13) + i))) * (1 - dawn)})`; g.fillRect(s2[0], s2[1], 1.4, 1.4); }
    for (const [x, y, off] of lights) if (s.T < off) { g.fillStyle = 'rgba(255,196,120,.85)'; g.fillRect(x, y, 1.6, 1.6); }
    const mg = g.createRadialGradient(W * .22, 52, 2, W * .22, 52, 60); mg.addColorStop(0, `rgba(205,222,230,${.5 * (1 - dawn)})`); mg.addColorStop(.25, `rgba(150,180,195,${.16 * (1 - dawn)})`); mg.addColorStop(1, 'rgba(150,180,195,0)'); g.fillStyle = mg; g.fillRect(0, 0, W, 130);
    g.globalAlpha = .8; g.drawImage(fogT, -((t * 4) % W), HOR - 38); g.globalAlpha = .5; g.drawImage(fogT, -(W - ((t * 2.4) % W)), HOR + 4); g.globalAlpha = 1;
    const tx = W * .8; if (theme === 'motel') { const fl = (Math.sin(t * 9) * Math.sin(t * 2.3) > .85 || (s.T | 0) % 53 === 0 && t % 1 < .3) ? .25 : 1, ng = g.createRadialGradient(tx, 58, 0, tx, 58, 90); ng.addColorStop(0, `rgba(255,40,120,${.4 * fl})`); ng.addColorStop(1, 'rgba(255,40,120,0)'); g.fillStyle = ng; g.fillRect(tx - 90, 0, 180, 170); g.fillStyle = `rgba(255,90,160,${.95 * fl})`; g.font = '700 ' + Math.round(13 * Math.max(.7, U)) + 'px monospace'; g.textAlign = 'center'; g.fillText('VACANCY', tx, 63); g.fillStyle = `rgba(120,10,20,${.5})`; g.fillText('NO', tx - 30 * U, 51); g.textAlign = 'start'; } else if (t % 1.5 < .35) { const rg = g.createRadialGradient(tx, 27, 0, tx, 27, 22); rg.addColorStop(0, 'rgba(255,50,40,.9)'); rg.addColorStop(1, 'rgba(255,40,30,0)'); g.fillStyle = rg; g.fillRect(tx - 24, 3, 48, 48); }
    if (theme !== 'motel') { g.fillStyle = 'rgba(255,60,50,.5)'; g.fillRect(tx - .8, 82, 1.6, 1.6); }
    // lamp light
    const LC = LAMP[theme].join(','), LC2 = LAMP[theme].map((v) => Math.min(255, v + 30)).join(',');
    const lx = W * .27, fx = lx + 22 * U, fy = 46, ly = 262;
    if (lamp > .02) {
      for (let k = 0; k < 6; k++) { const w = (125 - k * 17) * U, a = .028 * lamp * (1 + k * .15); g.fillStyle = `rgba(${LC},${a})`; g.beginPath(); g.moveTo(fx - 4, fy + 4); g.lineTo(fx + 4, fy + 4); g.lineTo(fx + w, ly + 8); g.lineTo(fx - w, ly + 8); g.fill(); }
      g.save(); g.translate(fx, ly); g.scale(1, .22); const pg = g.createRadialGradient(0, 0, 0, 0, 0, 160 * U + 20); pg.addColorStop(0, `rgba(${LC},${.55 * lamp})`); pg.addColorStop(.5, `rgba(${LC},${.18 * lamp})`); pg.addColorStop(1, `rgba(${LC},0)`);
      g.fillStyle = pg; g.beginPath(); g.arc(0, 0, 160 * U + 20, 0, 7); g.fill(); g.restore();
      const sg = g.createLinearGradient(0, ly, 0, H); sg.addColorStop(0, `rgba(${LC},${.14 * lamp})`); sg.addColorStop(1, `rgba(${LC},0)`); g.fillStyle = sg; g.fillRect(fx - 7, ly, 14, H - ly);
      const hg = g.createRadialGradient(fx, fy, 0, fx, fy, 44); hg.addColorStop(0, `rgba(${LC2},${.95 * lamp})`); hg.addColorStop(.12, `rgba(${LC},${.5 * lamp})`); hg.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = hg; g.fillRect(fx - 46, fy - 46, 92, 92);
    }
    // the figure
    if (dawn < .55 && D < 6 && !s.hideFig) {
      const p = place(D), lit = clamp((4 - D) / 3.2) * (.25 + lamp * .75) + flood * .7;
      figure(g, p.x, p.y, p.h, { lit: clamp(lit), pose: s.pose | 0, gaze: s.gaze || 0, bleach: flood > .4, alpha: p.a * (1 - dawn * 1.8) });
    }
    if (s.ghost > .02 && D > 1 && D < 6) { const p = place(D - 1); figure(g, p.x, p.y, p.h, { lit: .5, pose: (s.pose | 0) + 2, gaze: 1, alpha: s.ghost * .9 }); }
    // rain
    if (theme === 'dispatch') { g.fillStyle = 'rgba(235,245,255,.55)'; for (const d of rain) { d[1] += d[2] * dt * .13; d[0] += Math.sin(t * .8 + d[3]) * dt * 14; if (d[1] > H) { d[1] = -6; d[0] = Math.random() * W; } g.fillRect(d[0], d[1], d[3] > 10 ? 2 : 1.3, d[3] > 10 ? 2 : 1.3); } }
    else { g.strokeStyle = 'rgba(180,205,225,.15)'; g.lineWidth = 1; g.beginPath();
      for (const d of rain) { d[1] += d[2] * dt; d[0] -= d[2] * dt * .12; if (d[1] > H) { d[1] = -10; d[0] = Math.random() * (W + 40); } g.moveTo(d[0], d[1]); g.lineTo(d[0] - d[3] * .12, d[1] + d[3]); }
      g.stroke(); }
    if (flood > .01) { // the lot light: a hard white wash from above
      const fg = g.createLinearGradient(0, 0, 0, H); fg.addColorStop(0, `rgba(255,248,225,${.15 * flood})`); fg.addColorStop(.4, `rgba(255,244,210,${.6 * flood})`); fg.addColorStop(1, `rgba(255,236,190,${.3 * flood})`);
      g.globalCompositeOperation = 'lighter'; g.fillStyle = fg; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
    }
    g.drawImage(glass, 0, 0);
    for (const d of drops) { d[4] -= dt; if (d[4] < 0) { d[1] += 22 * dt; if (d[1] > H - 40) { d[1] = Math.random() * 60; d[0] = Math.random() * W; d[4] = 2 + Math.random() * 6; } }
      g.fillStyle = 'rgba(200,225,240,.22)'; g.beginPath(); g.arc(d[0], d[1], d[2], 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(d[0] - d[2] * .4, d[1] - d[2] * .5, 1, 1);
      if (d[4] < 0) { g.fillStyle = 'rgba(200,225,240,.06)'; g.fillRect(d[0] - .5, d[1] - d[3] * 2, 1, d[3] * 2); } }
    // steam over the mug
    g.strokeStyle = `rgba(220,230,235,${.09 * (1 - dawn)})`; g.lineWidth = 2; for (let i = 0; i < 2; i++) { g.beginPath(); for (let k = 0; k < 18; k++) { const y = H - 54 - k * 1.8, x = W * .84 - 3 + i * 6 + Math.sin(t * 1.5 + k * .45 + i * 2) * (1.5 + k * .18); k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    // reflections of the room in the glass: the red ON AIR sign and the desk lamp
    const ra = (s.onair ? .2 : .07) * (.8 + .2 * Math.sin(t * 40)), rr = g.createRadialGradient(W * .14, 28, 0, W * .14, 28, 130); rr.addColorStop(0, `rgba(255,50,40,${ra})`); rr.addColorStop(1, 'rgba(255,40,30,0)'); g.fillStyle = rr; g.fillRect(0, 0, W * .5, 170);
    const ar = g.createRadialGradient(W * .08, H - 6, 0, W * .08, H - 6, 150); ar.addColorStop(0, 'rgba(255,170,70,.1)'); ar.addColorStop(1, 'rgba(255,170,70,0)'); g.fillStyle = ar; g.fillRect(0, H - 170, W * .6, 170);
    if (s.breath > .01 && D <= 1.5) { // breath fog on the glass
      const p = place(Math.max(D, 1)), bx = p.x, by = p.y - p.h * .86, bf = g.createRadialGradient(bx, by, 0, bx, by, 60 + p.h * .25); bf.addColorStop(0, `rgba(210,225,230,${.3 * s.breath * (.5 + .5 * Math.sin(t * 2.1))})`); bf.addColorStop(1, 'rgba(210,225,230,0)'); g.fillStyle = bf; g.fillRect(bx - 150, by - 150, 300, 300);
    }
    if (dawn > 0) { // sunrise wash
      const dg = g.createLinearGradient(0, 0, 0, H); dg.addColorStop(0, `rgba(110,160,205,${.4 * dawn})`); dg.addColorStop(.42, `rgba(255,170,95,${.65 * dawn})`); dg.addColorStop(1, `rgba(255,205,150,${.18 * dawn})`);
      g.globalCompositeOperation = 'lighter'; g.fillStyle = dg; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
    }
    if (dark > 0) { g.fillStyle = `rgba(0,0,0,${dark * .72})`; g.fillRect(0, 0, W, H); }
    if (s.glitch > .02) for (let i = 0; i < 6; i++) { const y = Math.random() * H, h = 4 + Math.random() * 26, dx = (Math.random() - .5) * 70 * s.glitch; g.drawImage(cv, 0, y, W, h, dx, y, W, h); }
    if (s.face > 0) face(g, s.face);
  }
  return { init, draw, figure, face, resize, setTheme, get W() { return W; }, H };
})();
