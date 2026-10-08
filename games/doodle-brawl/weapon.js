// Doodle Brawl: turns a drawing into a weapon. Deterministic: the same code always gives the same weapon
// (online, both players build it from the code). The first point you draw is the handle.
(() => {
  const CANVAS = 400, SCALE = 0.62, STEP = 4; // drawing units -> world units; resample spacing

  // ---------- share codes: strokes quantized to 0..254, 255 separates strokes ----------
  function simplify(pts, eps = 1.6) { // Douglas-Peucker
    if (pts.length < 3) return pts;
    const [a, b] = [pts[0], pts[pts.length - 1]];
    let far = 0, idx = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      const d = len < 1e-6 ? Math.hypot(p[0] - a[0], p[1] - a[1]) // closed loop: distance from the start point
        : Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
      if (d > far) { far = d; idx = i; }
    }
    if (far <= eps) return [a, b];
    return [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)];
  }
  function encode(strokes) {
    const bytes = [];
    for (const st of strokes.slice(0, 24)) {
      const q = simplify(st.map(([x, y]) => [Math.round(Math.max(0, Math.min(CANVAS, x)) / CANVAS * 254), Math.round(Math.max(0, Math.min(CANVAS, y)) / CANVAS * 254)]));
      if (bytes.length) bytes.push(255);
      for (const [x, y] of q.slice(0, 160)) bytes.push(x, y);
    }
    let bin = ''; for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(code) {
    try {
      const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
      const strokes = []; let cur = [];
      for (let i = 0; i < bin.length; i++) {
        const b = bin.charCodeAt(i);
        if (b === 255) { if (cur.length) strokes.push(cur); cur = []; continue; }
        const y = bin.charCodeAt(++i); if (Number.isNaN(y)) break;
        cur.push([b / 254 * CANVAS, y / 254 * CANVAS]);
      }
      if (cur.length) strokes.push(cur);
      return strokes.filter((s) => s.length);
    } catch { return []; }
  }

  // ---------- analysis ----------
  function resample(st) {
    const out = [st[0]];
    let carry = 0;
    for (let i = 1; i < st.length; i++) {
      const [x0, y0] = st[i - 1], [x1, y1] = st[i], d = Math.hypot(x1 - x0, y1 - y0);
      let t = STEP - carry;
      while (t <= d) { out.push([x0 + (x1 - x0) * t / d, y0 + (y1 - y0) * t / d]); t += STEP; }
      carry = d - (t - STEP);
    }
    return out;
  }
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const NAMES = {
    sword: ['Dragon Slayer', "Grandpa's Sword", 'Pointy Boi', 'Excalibur (Probably)', 'The Classic', 'Sir Stabsalot'],
    spear: ['Death Stick', 'Long Boi', 'Pokey', 'The Noodle', 'Personal Space', 'Stick of Truth'],
    hammer: ['Bonk Machine', "Grandpa's Mallet", 'The Persuader', 'Big Bonk Energy', 'Thunder Lollipop', 'Meat Tenderizer'],
    club: ['Ridiculous Club', 'The Big Stick', 'Caveman Classic', 'Log of Justice'],
    dagger: ['Toothpick of Doom', 'Tiny Terror', 'Pocket Stabber', 'Butter Knife', 'Sneaky Snack'],
    shield: ['Frisbee of Fury', 'Dinner Plate', 'Spinning Shield', 'Pizza of Protection', 'The Wall'],
    curved: ['The Banana', 'Wobbly Moon', 'Scimitar-ish', 'Smile Blade', 'Crescent Bonk'],
    experimental: ['Ultimate Potato', 'Abstract Art', 'Mystery Meat', 'Unstable Experiment', 'What Is This', 'Spaghetti Incident'],
    star: ['Ninja Star', 'Pointy Snowflake', 'Starfish of Doom'],
    spiral: ['Hypno Swirl', 'Dizzy Stick', 'Cinnamon Roll'],
    pebble: ['A Single Pebble', 'The Dot', 'Literally Nothing'],
  };
  const SPECIAL = {
    sword: 'Spin Slash', spear: 'Lunge', hammer: 'Ground Slam', club: 'Ground Slam', dagger: 'Flurry', shield: 'Shield Bash',
    curved: 'Boomerang', experimental: 'Chaos Surge', star: 'Star Throw', spiral: 'Hypnotize', pebble: 'Pebble Toss',
  };

  function analyze(strokesIn) {
    const code = encode(strokesIn);
    const strokes = decode(code).map(resample); // always the decoded drawing, so a shared code gives exactly this weapon
    if (!strokes.length) return null;
    const grip = strokes[0][0];
    let all = strokes.flat();
    // weapon axis: from the handle to the farthest ink
    let far = all[0], fd = 0;
    for (const p of all) { const d = Math.hypot(p[0] - grip[0], p[1] - grip[1]); if (d > fd) { fd = d; far = p; } }
    const ang = Math.atan2(far[1] - grip[1], far[0] - grip[0]), c = Math.cos(-ang), s = Math.sin(-ang);
    // local coordinates (x along the weapon, y across), world units, y up
    const local = (p) => { const dx = p[0] - grip[0], dy = p[1] - grip[1]; return [(dx * c - dy * s) * SCALE, -(dx * s + dy * c) * SCALE]; };
    const segs = strokes.map((st) => st.map(local));
    const pts = segs.flat(), n = pts.length;
    let minX = 0, maxX = 0, minY = 0, maxY = 0, sx = 0, sy = 0;
    for (const [x, y] of pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); sx += x; sy += y; }
    const reach = Math.max(8, maxX), width = maxY - minY, ink = n * STEP;
    const mass = Math.min(9, 0.35 + ink / 420);
    const com = sx / n, comRatio = com / reach;
    let inertia = 0; for (const [x, y] of pts) inertia += (x * x + y * y) / 10000; inertia = inertia / n * mass + 0.06;
    // tip: how narrow the far 15% is compared with the whole weapon
    const tipPts = pts.filter(([x]) => x > reach * 0.93), tipW = tipPts.length ? Math.max(...tipPts.map((p) => p[1])) - Math.min(...tipPts.map((p) => p[1])) : 0;
    const sharp = Math.max(0, Math.min(1, 1 - tipW / 40 - (tipPts.length > n * 0.3 ? 0.4 : 0)));
    // turning, loops and corners per stroke
    let turning = 0, corners = 0, closed = 0, spiral = 0;
    for (const st of segs) {
      let t = 0, tabs = 0;
      for (let i = 2; i < st.length; i++) {
        const a1 = Math.atan2(st[i - 1][1] - st[i - 2][1], st[i - 1][0] - st[i - 2][0]), a2 = Math.atan2(st[i][1] - st[i - 1][1], st[i][0] - st[i - 1][0]);
        let d = a2 - a1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
        t += d; tabs += Math.abs(d); turning += Math.abs(d);
      }
      // sharp corners: direction over 3 points before vs 3 after (resampling smooths single-point turns)
      for (let i = 3, last = -9; i < st.length - 3; i++) {
        let d = Math.atan2(st[i + 3][1] - st[i][1], st[i + 3][0] - st[i][0]) - Math.atan2(st[i][1] - st[i - 3][1], st[i][0] - st[i - 3][0]);
        while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
        if (Math.abs(d) > 1.9 && i - last > 4) { corners++; last = i; }
      }
      const len = st.length * STEP * SCALE, gap = Math.hypot(st[0][0] - st[st.length - 1][0], st[0][1] - st[st.length - 1][1]);
      if (len > 90 && gap < 18) closed++;
      else if (Math.abs(t) > Math.PI * 3.6 && Math.abs(t) > tabs * 0.75) spiral++; // keeps turning the same way
    }
    const curvature = turning / (Math.PI * 2) / Math.max(1, segs.length);
    let asym = 0; for (const [, y] of pts) asym += y; asym = Math.abs(asym / n) / Math.max(10, width);
    // ----- what is it? -----
    let type;
    if (ink < 30) type = 'pebble';
    else if (segs.length > 9 || n > 900) type = 'experimental';
    else if (closed && corners >= 4 && width > 40) type = 'star'; // a star's first tip is the stroke's start, so 4 counted corners
    else if (spiral) type = 'spiral';
    else if (closed && width / reach > 0.55) type = 'shield';
    else if (reach < 60) type = 'dagger';
    else if (comRatio > 0.6 && width > 38) type = 'hammer';
    else if (mass > 2.6 && width < 40 && reach > 110) type = 'club';
    else if (reach / Math.max(10, width) > 5 && reach > 140) type = 'spear';
    else if (curvature > 0.32) type = 'curved';
    else type = 'sword';
    // ----- stats 1..10 (for the card) and the numbers the fight uses -----
    const clamp = (v) => Math.max(1, Math.min(10, Math.round(v)));
    const swing = 1 / Math.sqrt(inertia); // how fast it swings
    const st = {
      reach: clamp(reach / 26), power: clamp(mass * 2.2 + comRatio * 3), speed: clamp(2 + swing * 3.2),
      guard: clamp(width / 14 + (type === 'shield' ? 3 : 0)), pierce: clamp(sharp * 10 * Math.min(1, reach / 90)), control: clamp(10 - asym * 10 - (type === 'experimental' ? 4 : 0) - Math.max(0, mass - 5)),
    };
    const names = NAMES[type];
    return {
      code, type, special: SPECIAL[type], name: names[hash(code) % names.length], segs, reach, width, mass, inertia, swing, comRatio, sharp, curvature, corners,
      strokes: segs.length, ink, asym, unstable: type === 'experimental', stats: st, minX, maxX, minY, maxY,
    };
  }

  // ---------- ready-made doodles for CPU fighters and bosses ----------
  const line = (x0, y0, x1, y1) => { const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 6)); return Array.from({ length: n + 1 }, (_, i) => [x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]); };
  const circle = (cx, cy, r, from = 0, to = Math.PI * 2, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const a = from + (to - from) * i / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
  const PRESETS = {
    sword: [line(200, 330, 200, 90), line(160, 280, 240, 280)],
    spear: [line(200, 380, 200, 60), [...line(200, 60, 185, 90), ...line(185, 90, 215, 90), ...line(215, 90, 200, 60)]],
    hammer: [line(200, 340, 200, 140), [...line(150, 140, 250, 140), ...line(250, 140, 250, 80), ...line(250, 80, 150, 80), ...line(150, 80, 150, 140)], line(150, 95, 250, 95), line(150, 110, 250, 110), line(150, 125, 250, 125)],
    dagger: [line(200, 240, 200, 180), line(185, 228, 215, 228)],
    shield: [circle(200, 200, 70)],
    curved: [Array.from({ length: 30 }, (_, i) => { const a = Math.PI * 0.95 - i / 29 * Math.PI * 0.75; return [140 + Math.cos(a) * 140 + 140, 330 - Math.sin(a) * 180]; })],
    club: [line(195, 340, 205, 100), line(205, 340, 215, 100), line(185, 300, 215, 110), line(190, 330, 220, 120), line(200, 340, 225, 105)],
    star: [(() => { const p = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 30 : 75; p.push([200 + Math.cos(a) * r, 200 + Math.sin(a) * r]); } return p.flatMap((q, i) => (i ? line(p[i - 1][0], p[i - 1][1], q[0], q[1]).slice(1) : [q])); })()],
  };
  const preset = (name) => analyze(PRESETS[name]);

  globalThis.WP = { analyze, encode, decode, preset, PRESETS, NAMES, SPECIAL, CANVAS };
})();
