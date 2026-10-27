// Toys After Dark: the 3D bedroom, toy characters and humans. Units are "toy inches": a toy is ~3.4 tall, Mom ~24.
const TAD = window.TAD = {};
(() => {
  const T = THREE;
  const canvas = document.getElementById('c');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
  const scene = new T.Scene();
  scene.background = new T.Color(0x1a1530); scene.fog = new T.Fog(0x2a1d33, 60, 130);
  const camera = new T.PerspectiveCamera(52, 1, 0.5, 300);
  Object.assign(TAD, { T, renderer, scene, camera });

  // ---------- helpers ----------
  const mats = {};
  const std = (c, r = 0.7, m = 0, extra) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: m }, extra));
  const mesh = (geo, mat, x = 0, y = 0, z = 0, shadow = true) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; return m; };
  const box = (w, h, d, mat, x, y, z) => mesh(new T.BoxGeometry(w, h, d), mat, x, y, z);
  const cyl = (rt, rb, h, mat, x, y, z, seg = 20) => mesh(new T.CylinderGeometry(rt, rb, h, seg), mat, x, y, z);
  const sph = (r, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = mesh(new T.SphereGeometry(r, 24, 16), mat, x, y, z); m.scale.set(sx, sy, sz); return m; };
  const ctex = (w, h, draw, rep) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8;
    if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t;
  };
  TAD.sprite = (txt, size = 3) => {
    const t = ctex(128, 128, (g) => { g.font = '96px "Apple Color Emoji","Segoe UI Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 64, 70); });
    const s = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.scale.set(size, size, 1); s.renderOrder = 10; return s;
  };

  // ---------- lighting ----------
  scene.add(new T.HemisphereLight(0xffe2c0, 0x7a5236, 0.4));
  const moon = new T.DirectionalLight(0x9db4ff, 0.5); moon.position.set(-40, 40, 10); moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 140 }); moon.shadow.bias = -0.0006;
  scene.add(moon);
  const lamp = new T.PointLight(0xffa850, 2.2, 85, 1.4); lamp.position.set(16, 15, -17); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.002; scene.add(lamp);
  const night = new T.PointLight(0xff9a5a, 0.6, 50, 1.6); night.position.set(-18, 6, 17); scene.add(night); // HQ glow
  const hallLight = new T.PointLight(0xfff0d0, 0, 90, 1.2); hallLight.position.set(0, 14, -30); scene.add(hallLight);
  Object.assign(TAD, { lamp, hallLight, moon });

  // ---------- room shell ----------
  const floorTex = ctex(512, 512, (g, w, h) => {
    g.fillStyle = '#8b5a34'; g.fillRect(0, 0, w, h);
    const pw = w / 4;
    for (let i = 0; i < 4; i++) {
      const hue = 28 + Math.random() * 6, l = 34 + Math.random() * 8;
      g.fillStyle = `hsl(${hue},48%,${l}%)`; g.fillRect(i * pw, 0, pw, h);
      for (let k = 0; k < 40; k++) { g.strokeStyle = `rgba(60,30,10,${0.05 + Math.random() * 0.1})`; g.beginPath(); const y = Math.random() * h; g.moveTo(i * pw, y); g.bezierCurveTo(i * pw + pw * .3, y + 6, i * pw + pw * .7, y - 6, (i + 1) * pw, y + 2); g.stroke(); }
      g.fillStyle = 'rgba(30,14,4,.55)'; g.fillRect(i * pw, 0, 2, h);
      for (let j = 0; j < 2; j++) { g.fillRect(i * pw, ((i * 97 + j * 256) % h), pw, 2); }
    }
  }, [6, 6]);
  const floor = mesh(new T.PlaneGeometry(48, 48), std(0xffffff, 0.55, 0, { map: floorTex }), 0, 0, 0, false); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const paper = ctex(256, 256, (g, w, h) => {
    g.fillStyle = '#6b86b8'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x, 0, 32, h); }
    g.fillStyle = '#ffe9a8'; for (let i = 0; i < 9; i++) { const x = (i * 83) % w, y = (i * 47 + 20) % h; g.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5, r = k % 2 ? 4 : 9; g.lineTo(x + Math.sin(a) * r, y - Math.cos(a) * r); } g.fill(); }
  }, [4, 2]);
  const wallMat = std(0xffffff, 0.9, 0, { map: paper });
  const wallH = 34;
  // back wall with a door gap x in [-4,4]
  [[-14, 20], [14, 20]].forEach(([x, w]) => scene.add(box(w, wallH, 1, wallMat, x, wallH / 2, -24.5)));
  scene.add(box(8, wallH - 18, 1, wallMat, 0, 18 + (wallH - 18) / 2, -24.5));
  const left = box(1, wallH, 48, wallMat, -24.5, wallH / 2, 0); scene.add(left);
  const right = box(1, wallH, 48, wallMat, 24.5, wallH / 2, 0); scene.add(right);
  [-24, 24].forEach((x) => scene.add(box(0.8, 1.6, 48, std(0xf6efe4, 0.6), x * 0.99, 0.8, 0)));
  scene.add(box(48, 1.6, 0.8, std(0xf6efe4, 0.6), 0, 0.8, -23.7));
  // window (left wall) with moon
  const win = box(0.6, 14, 12, std(0x9fc0ff, 0.2, 0, { emissive: 0x4a6aa8, emissiveIntensity: 0.9 }), -24, 18, 2); scene.add(win);
  scene.add(box(0.9, 15, 0.7, std(0xf4ead8), -23.9, 18, 2)); scene.add(box(0.9, 0.7, 13, std(0xf4ead8), -23.9, 18, 2));
  scene.add(box(0.9, 0.9, 14, std(0xf4ead8), -23.9, 11, 2));
  // door + hallway
  const door = new T.Group(); door.position.set(-4, 0, -24); const panel = box(8, 18, 0.6, std(0xd9b98c, 0.6), 4, 9, 0); door.add(panel);
  door.add(sph(0.35, std(0xe8c34a, 0.2, 0.9), 7, 8.5, 0.5)); scene.add(door);
  scene.add(box(8.6, 0.5, 1, std(0xf6efe4), 0, 18.25, -24.5)); scene.add(box(0.5, 18, 1, std(0xf6efe4), -4.3, 9, -24.5)); scene.add(box(0.5, 18, 1, std(0xf6efe4), 4.3, 9, -24.5));
  const hall = mesh(new T.PlaneGeometry(40, 30), new T.MeshBasicMaterial({ color: 0xfff1d6 }), 0, 14, -34, false); scene.add(hall);
  const hallFloor = mesh(new T.PlaneGeometry(40, 14), std(0x5b4636, 0.8), 0, 0, -31, false); hallFloor.rotation.x = -Math.PI / 2; scene.add(hallFloor);
  const strip = mesh(new T.PlaneGeometry(8, 7), new T.MeshBasicMaterial({ color: 0xfff1c4, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }), 0, 0.06, -20.2, false);
  strip.rotation.x = -Math.PI / 2; scene.add(strip); // light spilling under the door; footsteps' shadows flicker it
  const underShadow = mesh(new T.PlaneGeometry(2, 1.2), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false }), 0, 0.07, -22.6, false);
  underShadow.rotation.x = -Math.PI / 2; scene.add(underShadow);
  const shaft = mesh(new T.CylinderGeometry(4, 16, 36, 24, 1, true, 0, Math.PI), new T.MeshBasicMaterial({ color: 0xfff1c4, transparent: true, opacity: 0, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false }), 0, 0, -6, false); shaft.visible = false;
  shaft.rotation.set(Math.PI / 2, 0, -Math.PI / 2); shaft.position.set(0, 7, -9); shaft.scale.set(1, 1, 0.55); scene.add(shaft);
  Object.assign(TAD, { door, strip, underShadow, hall, shaft });

  // ---------- furniture ----------
  const wood = std(0xc99a64, 0.6), darkWood = std(0x7a5233, 0.6), white = std(0xf3ecdf, 0.6);
  // bed (left, back)
  const bed = new T.Group();
  bed.add(box(14, 3, 26, darkWood, -16, 2.5, -9));
  [[-22.5, -21.5], [-9.5, -21.5], [-22.5, 3.5], [-9.5, 3.5]].forEach(([x, z]) => bed.add(box(1.4, 3, 1.4, darkWood, x, 1.5, z)));
  bed.add(box(13.4, 3.4, 25.4, std(0xe9e4f5, 0.9), -16, 5.7, -9));
  const blanket = box(13.8, 1.2, 15, std(0xe0566b, 0.95), -16, 7.5, -3); bed.add(blanket);
  [[-18.5], [-13.5]].forEach(([x]) => { const p = box(5, 1.8, 3.8, std(0xfff7ee, 0.95), x, 8, -19); p.rotation.y = 0.05; bed.add(p); });
  bed.add(box(14, 10, 1.2, darkWood, -16, 8, -22.4));
  scene.add(bed);
  // desk (right, back) with lamp, books
  const desk = new T.Group();
  desk.add(box(14, 1.2, 10, wood, 16, 9, -17));
  [[10, -21.5], [22, -21.5], [10, -12.5], [22, -12.5]].forEach(([x, z]) => desk.add(box(1.2, 8.5, 1.2, wood, x, 4.3, z)));
  desk.add(box(12, 4, 0.8, darkWood, 16, 6.5, -21.6));
  desk.add(cyl(0.9, 1.1, 0.5, std(0x333a55, 0.4), 12, 9.8, -19));
  const arm = cyl(0.12, 0.12, 5, std(0x333a55, 0.4), 12, 12.5, -19); desk.add(arm);
  const shade = cyl(1.2, 2.4, 2.2, std(0xffe0a0, 0.5, 0, { emissive: 0xffa84a, emissiveIntensity: 0.9 }), 13.5, 15.2, -18); shade.rotation.z = 0.4; desk.add(shade);
  desk.add(box(3, 0.7, 2.4, std(0xc94a4a), 19, 10, -18)); desk.add(box(3, 0.6, 2.4, std(0x4a8ac9), 19, 10.65, -18));
  // chair
  desk.add(box(4.2, 0.8, 4.2, std(0x4a6f8a), 16, 5, -6.5)); desk.add(box(4.2, 5, 0.6, std(0x4a6f8a), 16, 7.8, -4.6));
  [[14.2, -8.2], [17.8, -8.2], [14.2, -4.8], [17.8, -4.8]].forEach(([x, z]) => desk.add(box(0.5, 4.6, 0.5, std(0x333), x, 2.3, z)));
  scene.add(desk);
  // wardrobe + bookshelf (right wall)
  const ward = new T.Group();
  ward.add(box(5, 28, 12, std(0xb98756, 0.55), 21.5, 14, 4));
  ward.add(box(0.3, 25, 5.2, std(0xa77646), 18.9, 14, 1.2)); ward.add(box(0.3, 25, 5.2, std(0xa77646), 18.9, 14, 6.8));
  ward.add(sph(0.35, std(0xe8c34a, 0.2, 0.9), 18.7, 13, 3.4)); ward.add(sph(0.35, std(0xe8c34a, 0.2, 0.9), 18.7, 13, 4.6));
  scene.add(ward);
  const shelf = new T.Group(); shelf.add(box(4, 22, 10, std(0x9b6b3f, 0.6), 22, 11, 17));
  for (let i = 0; i < 4; i++) { shelf.add(box(0.4, 0.5, 9.6, white, 19.8, 3 + i * 5, 17)); for (let k = 0; k < 4; k++) shelf.add(box(0.8, 3.2, 1.6, std(new T.Color().setHSL(Math.random(), 0.6, 0.55)), 19.9, 4.9 + i * 5, 13.4 + k * 2.4)); }
  scene.add(shelf);
  // toy box (open) + HQ fort
  const toybox = new T.Group();
  toybox.add(box(8, 6, 6, std(0xd8453f, 0.5), -9, 3, 17)); toybox.add(box(8.4, 0.6, 6.4, std(0xf2c14e, 0.5), -9, 6.2, 17));
  const lid = box(8.4, 0.5, 6.4, std(0x3d7fd0, 0.5), -9, 8.8, 20.9); lid.rotation.x = 1.15; toybox.add(lid);
  const tbLabel = TAD.sprite('🧸', 2.6); tbLabel.position.set(-9, 5, 20.2); toybox.add(tbLabel);
  scene.add(toybox);
  const hq = new T.Group();
  const cardboard = std(0xb98a55, 0.95);
  hq.add(box(7, 6, 0.3, cardboard, -19.5, 3, 22.4)); hq.add(box(0.3, 6, 6, cardboard, -23, 3, 19.5)); hq.add(box(0.3, 6, 6, cardboard, -16, 3, 19.5));
  hq.add(box(7, 0.3, 6.4, std(0xa07445, 0.95), -19.5, 6, 19.5));
  const flag = box(0.1, 2, 3, std(0xff5d5d, 0.8), -19.5, 8, 19.5); flag.rotation.y = 0.1; hq.add(flag); hq.add(cyl(0.12, 0.12, 4, std(0x444), -19.5, 7.5, 19.5));
  hq.add(TAD.sprite('🏴', 2.4)).position.set(-19.5, 10, 19.5);
  scene.add(hq);
  // rug (play mat) in the centre
  const rugTex = ctex(512, 512, (g, w, h) => {
    g.fillStyle = '#2f6fc7'; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill();
    [['#ffd34a', 232], ['#e85a6a', 190], ['#4fc08d', 150], ['#f6efe4', 112]].forEach(([c, r]) => { g.fillStyle = c; g.beginPath(); g.arc(256, 256, r, 0, 7); g.fill(); });
    g.strokeStyle = '#3a3a48'; g.lineWidth = 34; g.beginPath(); g.arc(256, 256, 70, 0, 7); g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.setLineDash([14, 12]); g.beginPath(); g.arc(256, 256, 70, 0, 7); g.stroke();
    g.setLineDash([]); g.fillStyle = '#ffffff55'; for (let i = 0; i < 300; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  });
  const rug = mesh(new T.CircleGeometry(11, 48), std(0xffffff, 1, 0, { map: rugTex }), 0, 0.04, 4, false); rug.rotation.x = -Math.PI / 2; rug.receiveShadow = true; scene.add(rug);
  // scattered blocks + tower + toy car
  const blockCols = [0xe85a6a, 0x4a8ac9, 0xf2c14e, 0x4fc08d, 0xb06be0];
  const letters = 'ABCDEF';
  const blocks = [];
  function block(x, y, z, i, ry) {
    const c = blockCols[i % 5]; const t = ctex(64, 64, (g) => { g.fillStyle = '#' + c.toString(16).padStart(6, '0'); g.fillRect(0, 0, 64, 64); g.fillStyle = '#fff'; g.font = 'bold 40px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(letters[i % 6], 32, 34); });
    const m = box(2.6, 2.6, 2.6, std(0xffffff, 0.45, 0, { map: t }), x, y, z); m.rotation.y = ry; scene.add(m); return m;
  }
  [[-6, 1.3, -4], [-9, 1.3, 2], [-2, 1.3, 15], [12, 1.3, 8], [14, 1.3, -4], [2, 1.3, -9], [0, 1.3, -16]].forEach((p, i) => blocks.push(block(p[0], p[1], p[2], i, Math.random() * 3)));
  const tower = []; for (let i = 0; i < 5; i++) { const b = block(6 + Math.sin(i) * 0.2, 1.3 + i * 2.6, 11, i, i * 0.15); tower.push(b); b.userData.home = b.position.clone(); b.userData.vel = new T.Vector3(); }
  Object.assign(TAD, { tower, blocks });
  const car = new T.Group(); car.add(box(4.2, 1.4, 2.2, std(0xe8453f, 0.35, 0.3), 0, 1.3, 0)); car.add(box(2.2, 1.2, 1.9, std(0x9fd0ff, 0.15, 0.1), -0.2, 2.4, 0));
  [[-1.4, -1.2], [1.4, -1.2], [-1.4, 1.2], [1.4, 1.2]].forEach(([x, z]) => { const w = cyl(0.65, 0.65, 0.5, std(0x222), x, 0.65, z, 14); w.rotation.x = Math.PI / 2; car.add(w); });
  car.position.set(-3, 0, -3); car.rotation.y = 0.5; scene.add(car); TAD.car = car;
  // dust motes in the lamp light
  const dustG = new T.BufferGeometry(), dp = new Float32Array(150 * 3);
  for (let i = 0; i < 150; i++) { dp[i * 3] = 8 + Math.random() * 18; dp[i * 3 + 1] = 4 + Math.random() * 16; dp[i * 3 + 2] = -22 + Math.random() * 18; }
  dustG.setAttribute('position', new T.BufferAttribute(dp, 3));
  const dust = new T.Points(dustG, new T.PointsMaterial({ color: 0xffe2b0, size: 0.14, transparent: true, opacity: 0.55, depthWrite: false })); scene.add(dust); TAD.dust = dust;

  // 2D collision + sight data. tall = blocks a human's line of sight
  TAD.OBST = [
    { n: 'bed', x0: -23, z0: -22, x1: -9, z1: 4 }, { n: 'desk', x0: 9.5, z0: -22, x1: 22.5, z1: -12 },
    { n: 'ward', x0: 19, z0: -2, x1: 24, z1: 10, tall: 1 }, { n: 'shelf', x0: 20, z0: 12, x1: 24, z1: 22, tall: 1 },
    { n: 'toybox', x0: -13, z0: 14, x1: -5, z1: 20 }, { n: 'hq', x0: -23.5, z0: 16, x1: -15.5, z1: 22.8 },
    { n: 'chair', x0: 13.8, z0: -8.6, x1: 18.2, z1: -4.4 },
  ];
  TAD.PLACES = { hq: [-19.5, 12.5, 'Toy HQ'], desk: [16, -9, 'the desk'], box: [-9, 11.5, 'the toy box'], bed: [-7, -8, 'the bed'], door: [0, -19, 'the doorway'], ward: [16.5, 4, 'the wardrobe'], rug: [0, 4, 'the play mat'], tower: [6, 8, 'the block tower'], shelf: [17, 17, 'the bookshelf'], win: [-20, 6, 'the window'] };
  // hiding spots: interact at (x,z) to slip to (hx,hz). small = only the Tiny Explorer fits
  TAD.HIDES = [
    { n: 'under the bed', x: -7.2, z: -2, hx: -15, hz: -3 }, { n: 'under the desk', x: 16, z: -10.4, hx: 16, hz: -17 },
    { n: 'in the toy box', x: -9, z: 12.2, hx: -9, hz: 17 }, { n: 'mouse hole', x: -22, z: 10, hx: -23.4, hz: 10, small: 1 },
    { n: 'old shoe', x: 8, z: -9, hx: 8, hz: -9.9, small: 1 },
  ];
  TAD.hideProps = []; // small hiding-spot props
  const shoe = new T.Group(); shoe.add(box(3.4, 1.8, 1.6, std(0x8b3a2a, 0.7), 8, 0.9, -9.9)); shoe.add(box(1.4, 1.2, 1.6, std(0x8b3a2a, 0.7), 9.8, 1.7, -9.9)); shoe.rotation.y = -0.2; scene.add(shoe);
  const hole = mesh(new T.CircleGeometry(1.5, 16, 0, Math.PI), new T.MeshBasicMaterial({ color: 0x050308, side: T.DoubleSide }), -24, 1.5, 10, false); hole.rotation.y = Math.PI / 2; scene.add(hole);

  // ---------- toys ----------
  const KINDS = {
    robot:    { name: 'Bolt the Robot', color: 0x6ec6ff, trim: 0xff5d5d, emoji: '🤖', desc: 'Rock-solid freeze pose: suspicion builds 30% slower. Beeps now and then.', ability: 'Lock-up', speed: 1 },
    ninja:    { name: 'Kage the Ninja', color: 0x2a2f55, trim: 0xe0314b, emoji: '🥷', desc: 'Ability: Shadow Dash, a short burst. Landings are noisy.', ability: 'Shadow Dash', speed: 1.05 },
    teddy:    { name: 'Biscuit the Bear', color: 0xb9794a, trim: 0xf2c14e, emoji: '🧸', desc: 'Carries heavy items at full speed. Slower on foot.', ability: 'Bear Hug', speed: 0.78 },
    windup:   { name: 'Tick-Tock', color: 0xf2c14e, trim: 0x3d7fd0, emoji: '⏰', desc: 'Ability: Wind-up Sprint for 2s, then a long cooldown.', ability: 'Sprint', speed: 1 },
    clown:    { name: 'Giggles the Clown', color: 0xb06be0, trim: 0xffd34a, emoji: '🤡', desc: 'Ability: Honk! lures humans toward the noise. Risky.', ability: 'Honk', speed: 1 },
    explorer: { name: 'Pip the Explorer', color: 0x7fb069, trim: 0xe9d8a6, emoji: '🧭', desc: 'Squeezes into tiny hiding spots nobody else fits.', ability: 'Squeeze', speed: 1.02 },
  };
  TAD.KINDS = KINDS;
  const eyeMat = std(0xffffff, 0.2), pupMat = std(0x111111, 0.1);
  function eyes(g, y, z, spread, r) {
    [-1, 1].forEach((s) => { g.add(sph(r, eyeMat, s * spread, y, z)); g.add(sph(r * 0.55, pupMat, s * spread, y, z + r * 0.62)); });
  }
  TAD.makeToy = (kind, tint, acc) => {
    const K = KINDS[kind], col = tint != null ? tint : K.color;
    const g = new T.Group(), body = new T.Group(); g.add(body);
    const main = kind === 'teddy' ? std(col, 1) : kind === 'robot' ? std(col, 0.25, 0.25) : kind === 'windup' ? std(col, 0.3, 0.7) : std(col, 0.55);
    const trim = std(K.trim, 0.5), skin = std(0xffe0c0, 0.7);
    const head = new T.Group(); head.position.y = 2.75; body.add(head);
    const legL = new T.Group(), legR = new T.Group(), armL = new T.Group(), armR = new T.Group();
    legL.position.set(-0.45, 1.15, 0); legR.position.set(0.45, 1.15, 0); armL.position.set(-1.05, 2.1, 0); armR.position.set(1.05, 2.1, 0);
    [legL, legR, armL, armR].forEach((p) => body.add(p));
    const limb = (p, mat, len, r) => { const m = cyl(r, r * 0.9, len, mat, 0, -len / 2, 0, 12); p.add(m); };
    let key = null;
    if (kind === 'robot') {
      body.add(box(1.7, 1.7, 1.3, main, 0, 1.85, 0)); head.add(box(1.6, 1.3, 1.4, main, 0, 0, 0)); head.add(box(1.2, 0.5, 0.3, std(0x0a1830, 0.1), 0, 0.05, 0.72));
      [-1, 1].forEach((s) => head.add(sph(0.17, std(0x6ef0ff, 0.2, 0, { emissive: 0x39d0ff, emissiveIntensity: 1.4 }), s * 0.38, 0.05, 0.85)));
      head.add(cyl(0.05, 0.05, 0.7, trim, 0, 1, 0)); head.add(sph(0.2, trim, 0, 1.4, 0)); body.add(sph(0.22, trim, 0, 2, 0.68)); body.add(box(1.1, 0.4, 0.3, trim, 0, 1.4, 0.66));
      limb(legL, std(0xdfe6ef, 0.3, 0.5), 1.2, 0.3); limb(legR, std(0xdfe6ef, 0.3, 0.5), 1.2, 0.3); limb(armL, std(0xdfe6ef, 0.3, 0.5), 1.2, 0.26); limb(armR, std(0xdfe6ef, 0.3, 0.5), 1.2, 0.26);
    } else if (kind === 'ninja') {
      body.add(cyl(0.8, 0.95, 1.9, main, 0, 1.85, 0)); body.add(box(1.9, 0.35, 1.1, trim, 0, 1.55, 0));
      head.add(sph(0.95, main, 0, 0, 0)); head.add(box(1.5, 0.45, 0.3, skin, 0, 0.1, 0.8)); eyes(head, 0.12, 0.88, 0.32, 0.12);
      const sc = box(2.2, 0.35, 0.3, trim, 0, 0.55, 0); head.add(sc); const tail = box(0.3, 0.3, 1.2, trim, 0, 0.5, -1.1); tail.rotation.x = -0.4; head.add(tail);
      const sword = box(0.18, 0.18, 2.2, std(0xcdd5e0, 0.2, 0.9), 0.5, 2.3, -0.8); sword.rotation.set(0, 0, 0.9); body.add(sword);
      limb(legL, main, 1.2, 0.34); limb(legR, main, 1.2, 0.34); limb(armL, main, 1.2, 0.28); limb(armR, main, 1.2, 0.28);
    } else if (kind === 'teddy') {
      body.add(sph(1.15, main, 0, 1.75, 0, 1, 1.1, 0.95)); body.add(sph(0.8, std(0xe8c9a0, 1), 0, 1.65, 0.62, 1, 1.1, 0.5));
      head.add(sph(1, main, 0, 0, 0)); head.add(sph(0.5, std(0xe8c9a0, 1), 0, -0.3, 0.8, 1, 0.8, 0.8)); head.add(sph(0.16, pupMat, 0, -0.1, 1.28)); eyes(head, 0.28, 0.85, 0.38, 0.13);
      [-1, 1].forEach((s) => { head.add(sph(0.38, main, s * 0.78, 0.82, 0)); head.add(sph(0.2, std(0xe8c9a0, 1), s * 0.78, 0.82, 0.18)); });
      const bt = box(1.1, 0.4, 0.3, trim, 0, 0.78, 0.9); body.add(bt); bt.position.set(0, 2.65, 0.6);
      limb(legL, main, 1.2, 0.5); limb(legR, main, 1.2, 0.5); limb(armL, main, 1.2, 0.42); limb(armR, main, 1.2, 0.42);
    } else if (kind === 'windup') {
      body.add(cyl(1, 1, 1.9, main, 0, 1.85, 0)); body.add(cyl(1.02, 1.02, 0.3, trim, 0, 1.2, 0)); body.add(cyl(1.02, 1.02, 0.3, trim, 0, 2.5, 0));
      head.add(sph(0.95, std(0xf6e8c8, 0.4, 0.4), 0, 0, 0)); eyes(head, 0.1, 0.78, 0.36, 0.2); head.add(cyl(0.15, 0.15, 0.4, trim, 0, 1.05, 0));
      key = new T.Group(); key.position.set(0, 2, -1); key.add(cyl(0.12, 0.12, 0.8, std(0xcfd6df, 0.3, 0.9), 0, 0, -0.2)).rotation.x = Math.PI / 2;
      const kh = box(2, 0.25, 0.25, std(0xcfd6df, 0.3, 0.9), 0, 0, -0.6); key.add(kh); key.add(sph(0.35, std(0xcfd6df, 0.3, 0.9), 1, 0, -0.6)); key.add(sph(0.35, std(0xcfd6df, 0.3, 0.9), -1, 0, -0.6)); body.add(key);
      limb(legL, std(0xcfd6df, 0.3, 0.9), 1.2, 0.3); limb(legR, std(0xcfd6df, 0.3, 0.9), 1.2, 0.3); limb(armL, std(0xcfd6df, 0.3, 0.9), 1.1, 0.24); limb(armR, std(0xcfd6df, 0.3, 0.9), 1.1, 0.24);
    } else if (kind === 'clown') {
      body.add(cyl(0.7, 1.15, 1.9, main, 0, 1.85, 0)); for (let i = 0; i < 3; i++) body.add(cyl(0.9 - i * 0.05, 0.95 - i * 0.05, 0.3, trim, 0, 1.2 + i * 0.6, 0));
      body.add(cyl(1.1, 0.5, 0.5, std(0xffffff, 0.9), 0, 2.75, 0));
      head.add(sph(0.95, std(0xfff0e0, 0.6), 0, 0, 0)); head.add(sph(0.3, std(0xe8312f, 0.3), 0, -0.05, 0.95)); eyes(head, 0.2, 0.8, 0.36, 0.17);
      [[0xff5d5d, -0.85], [0xffd34a, -0.3], [0x4fc08d, 0.3], [0x4a8ac9, 0.85]].forEach(([c, x]) => head.add(sph(0.4, std(c, 0.8), x, 0.65, -0.1)));
      const sm = box(0.9, 0.15, 0.2, std(0xe8312f), 0, -0.45, 0.88); head.add(sm);
      limb(legL, std(0xffffff, 0.6), 1.2, 0.3); limb(legR, std(0xffffff, 0.6), 1.2, 0.3); limb(armL, trim, 1.2, 0.28); limb(armR, trim, 1.2, 0.28);
      [-1, 1].forEach((s) => (s < 0 ? legL : legR).add(box(0.9, 0.35, 1.5, std(0xe8312f), 0, -1.2, 0.35)));
    } else { // explorer
      body.add(cyl(0.85, 1, 1.9, main, 0, 1.85, 0)); body.add(box(1.8, 0.3, 1.2, std(0x6a4a2a), 0, 1.4, 0)); body.add(box(1.5, 1.6, 0.8, std(0xc07a3a, 0.9), 0, 2, -0.9)); body.add(box(1.2, 0.5, 0.5, std(0x6a4a2a), 0, 2.4, -1.2));
      head.add(sph(0.9, skin, 0, 0, 0)); eyes(head, 0.05, 0.75, 0.32, 0.14); head.add(cyl(1.7, 1.7, 0.1, trim, 0, 0.7, 0)); head.add(cyl(0.85, 1, 0.7, trim, 0, 1.0, 0)); head.add(cyl(0.9, 0.9, 0.15, std(0x5b8a3a), 0, 0.85, 0));
      limb(legL, std(0xa38a5a, 0.8), 1.2, 0.3); limb(legR, std(0xa38a5a, 0.8), 1.2, 0.3); limb(armL, main, 1.2, 0.26); limb(armR, main, 1.2, 0.26);
    }
    // accessories (cosmetics)
    if (acc === 'crown') { head.add(cyl(0.6, 0.7, 0.5, std(0xffd34a, 0.2, 0.9), 0, 1.15, 0)); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; head.add(cyl(0.0, 0.14, 0.4, std(0xffd34a, 0.2, 0.9), Math.sin(a) * 0.6, 1.55, Math.cos(a) * 0.6)); } }
    if (acc === 'party') { const c = mesh(new T.ConeGeometry(0.6, 1.4, 16), std(0xff5da2, 0.5), 0, 1.5, 0); head.add(c); head.add(sph(0.15, std(0xffd34a), 0, 2.25, 0)); }
    if (acc === 'shades') head.add(box(1.5, 0.3, 0.2, std(0x080808, 0.1, 0.5), 0, 0.15, 0.95));
    if (acc === 'cape') { const c = box(1.8, 2.4, 0.15, std(0xd8203f, 0.8), 0, 1.7, -0.75); c.rotation.x = 0.12; body.add(c); }
    if (acc === 'bow') { body.add(sph(0.28, std(0xff5da2), -0.3, 2.7, 0.7)); body.add(sph(0.28, std(0xff5da2), 0.3, 2.7, 0.7)); }
    const ol = new T.MeshBasicMaterial({ color: 0x1a1020, side: T.BackSide }), meshes = []; g.traverse((o) => { if (o.isMesh) { o.castShadow = true; meshes.push(o); } });
    meshes.forEach((m) => { const o2 = new T.Mesh(m.geometry, ol); o2.position.copy(m.position); o2.quaternion.copy(m.quaternion); o2.scale.copy(m.scale).multiplyScalar(1.07); m.parent.add(o2); });
    // dot shadow blob so toys read against the floor
    const blob = mesh(new T.CircleGeometry(1.3, 16), new T.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.35, depthWrite: false }), 0, 0.06, 0, false); blob.rotation.x = -Math.PI / 2; g.add(blob);
    const o = { kind, group: g, body, head, legL, legR, armL, armR, key, ph: Math.random() * 6, blob };
    return o;
  };
  // pose = target rotations; blended in game via animateToy
  const POSE = {
    robot: { aL: [0, -0.15], aR: [0, 0.15], by: 0, lean: 0, ht: 0 },
    ninja: { aL: [-1.1, 0.6], aR: [-1.1, -0.6], by: -0.5, lean: 0.25, ht: 0 },
    teddy: { aL: [-0.4, -0.5], aR: [-0.4, 0.5], by: -0.4, lean: 0, ht: 0.2, legs: -1.3 },
    windup: { aL: [-2.6, -0.3], aR: [0, 0.2], by: 0, lean: 0, ht: 0.15 },
    clown: { aL: [-2.8, -0.5], aR: [-2.8, 0.5], by: 0, lean: 0, ht: -0.25 },
    explorer: { aL: [-1.7, -0.2], aR: [-1.7, 0.2], by: 0, lean: 0, ht: 0 },
  };
  // amount: 0 none, 1 = moving at full speed; f = frozen 0..1 (eased by caller)
  TAD.animateToy = (o, dt, speed, f, t, emote) => {
    const P = POSE[o.kind], w = Math.min(1, speed / 8), ph = t * 11 + o.ph, s = Math.sin(ph) * w, idle = Math.sin(t * 2 + o.ph) * 0.04 * (1 - f);
    const lerp = (a, b, k) => a + (b - a) * k;
    o.legL.rotation.x = lerp(s * 0.9, P.legs || 0, f); o.legR.rotation.x = lerp(-s * 0.9, P.legs || 0, f);
    let axL = -s * 0.9 + idle, axR = s * 0.9 - idle, azL = -0.1, azR = 0.1;
    if (emote === 'wave') { axR = -2.6; azR = 0.4 + Math.sin(t * 14) * 0.5; } else if (emote === 'dance') { axL = -2.4 + Math.sin(t * 9) * 0.5; axR = -2.4 - Math.sin(t * 9) * 0.5; o.body.rotation.y = Math.sin(t * 9) * 0.5; } else o.body.rotation.y = 0;
    o.armL.rotation.x = lerp(axL, P.aL[0], f); o.armR.rotation.x = lerp(axR, P.aR[0], f);
    o.armL.rotation.z = lerp(azL, P.aL[1], f); o.armR.rotation.z = lerp(azR, P.aR[1], f);
    o.body.position.y = lerp(Math.abs(Math.sin(ph)) * 0.18 * w, P.by, f) + (emote === 'dance' ? Math.abs(Math.sin(t * 9)) * 0.4 : 0);
    o.body.rotation.x = lerp(0, P.lean, f); o.head.rotation.z = lerp(0, P.ht, f); o.head.rotation.x = lerp(Math.sin(ph * 0.5) * 0.04 * w, 0, f);
    if (o.key) o.key.rotation.z += dt * (f > 0.5 ? 0 : 4 * (0.3 + w));
  };

  // ---------- humans ----------
  TAD.makeHuman = (type) => {
    const mom = type === 'mom', g = new T.Group(), K = mom ? 1 : 0.72;
    const skin = std(mom ? 0xe3b48f : 0xecbf9a, 0.7), skinD = std(0xc58f6c, 0.8), top = std(mom ? 0x7a2f45 : 0xf2c62e, 0.9), inner = std(mom ? 0xf0e6d6 : 0xf2c62e, 0.9), pants = std(mom ? 0x2b3a5c : 0x2f5f9f, 0.95), shoe = std(mom ? 0xc7a487 : 0xf4f4f4, 0.6), hair = std(mom ? 0x5a371f : 0x3a2414, 0.85);
    const ell = (r, m, x, y, z, sx, sy, sz) => sph(r, m, x, y, z, sx, sy, sz);
    const mkLeg = (x) => { const l = new T.Group(); l.position.set(x, 10.8, 0); l.add(cyl(0.95, 0.64, 10.6, pants, 0, -5.3, 0, 16)); l.add(ell(1, shoe, 0, -10.9, 0.7, 0.95, 0.55, 1.9)); g.add(l); return l; };
    const legL = mkLeg(-1.25), legR = mkLeg(1.25);
    g.add(ell(1, pants, 0, 11.2, 0, 2.55, 1.5, 1.7));
    const torso = cyl(2.05, 2.3, 7.8, top, 0, 15.0, 0, 24); torso.scale.z = 0.6; g.add(torso);
    g.add(ell(1, top, 0, 18.5, 0, 2.45, 0.85, 1.25)); g.add(box(mom ? 1.9 : 0.2, 6.9, 0.2, inner, 0, 15.5, 1.38));
    g.add(cyl(0.62, 0.72, 1.9, skin, 0, 19.9, 0, 12));
    const mkArm = (x) => { const a = new T.Group(); a.position.set(x, 18.3, 0); a.add(ell(1, top, 0, 0, 0, 0.7, 0.7, 0.7)); a.add(cyl(0.56, 0.5, 4.4, top, 0, -2.2, 0, 12));
      const fore = new T.Group(); fore.position.y = -4.4; fore.rotation.x = -0.28; fore.add(cyl(0.5, 0.4, 4.2, mom ? top : skin, 0, -2.1, 0, 12)); fore.add(ell(1, skin, 0, -4.5, 0, 0.5, 0.85, 0.36)); a.add(fore); g.add(a); return a; };
    const armL = mkArm(-3.0), armR = mkArm(3.0);
    const head = new T.Group(); head.position.y = 22.5; g.add(head);
    head.add(ell(mom ? 1.85 : 2.05, skin, 0, 0, 0, 0.92, 1.1, 0.97)); head.add(ell(0.34, skinD, 0, -0.35, 1.95, 1, 1.2, 1));
    [-1, 1].forEach((x) => { head.add(ell(0.34, std(0xf4f0ea, 0.3), x * 0.78, 0.35, 1.7, 1, 0.8, 0.45)); head.add(ell(0.17, std(mom ? 0x4a3322 : 0x2c4a6a, 0.2), x * 0.78, 0.35, 1.93, 1, 1, 0.5)); head.add(box(0.95, 0.13, 0.2, hair, x * 0.8, 0.85, 1.75)); head.add(ell(0.4, skin, x * 1.82, 0, 0, 0.5, 1, 0.8)); });
    head.add(box(0.95, 0.12, 0.2, std(0x8a3a3a, 0.5), 0, -1.05, 1.75));
    if (mom) { head.add(ell(2.0, hair, 0, 0.55, -0.45, 1, 1.02, 1)); head.add(ell(2.0, hair, 0, -1.6, -1, 1.02, 1.5, 0.85)); [-1, 1].forEach((x) => head.add(box(0.55, 4.6, 1.5, hair, x * 1.85, -1.4, 0.1))); }
    else { head.add(ell(2.08, hair, 0, 0.5, -0.3, 1, 1, 1)); head.add(cyl(2.05, 2.05, 0.6, std(0xc8402f, 0.8), 0, 1.45, 0.2, 20)); head.add(box(3, 0.3, 2.2, std(0xc8402f, 0.8), 0, 1.25, 2.1)); }
    g.scale.setScalar(K);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return { group: g, legL, legR, armL, armR, head, mom, s: K };
  };
  TAD.animateHuman = (h, t, walking) => {
    const s = Math.sin(t * 5) * (walking ? 0.55 : 0);
    h.legL.rotation.x = s; h.legR.rotation.x = -s; h.armL.rotation.x = -s * 0.7; h.armR.rotation.x = s * 0.7;
    h.group.children[0].position.y = 0; h.group.position.y = walking ? Math.abs(Math.sin(t * 5)) * 0.35 : 0;
  };
  TAD.resize = () => { const w = innerWidth, h = innerHeight; renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 0.8 ? 66 : 52; camera.updateProjectionMatrix(); };
  addEventListener('resize', TAD.resize); TAD.resize();
})();
