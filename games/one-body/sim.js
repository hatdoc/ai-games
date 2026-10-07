// One Body: physics for the shared creature, the obstacle course and the bot limbs (planck.js, Box2D).
// Runs on the host only (or alone in practice); everyone else just draws the snapshots it sends.
// Also loads in Node for tuning: globalThis.planck must be set first.
(() => {
  const pl = globalThis.planck, V = pl.Vec2;
  const LIMBS = ['ll', 'rl', 'la', 'ra', 'hd', 'tl'];
  const LIMB_NAME = { ll: 'Left Leg', rl: 'Right Leg', la: 'Left Arm', ra: 'Right Arm', hd: 'Head', tl: 'Tail' };
  const ACTION = { ll: 'Stomp', rl: 'Stomp', la: 'Grab', ra: 'Grab', hd: 'Honk', tl: 'Boing' };
  const TURN = 4.2; // rad/s a limb turns while its button is held
  const P = { reach: 0.5, back: 0.4, tilt: 0.5, assist: 110, push: 14 }; // tuning
  const FINISH = 92, CHECKPOINTS = [0, 17, 35, 50, 64, 78];
  // ground outline (shared with the drawing code)
  const GROUND = [[-10, 0], [16, 0], [16, 0.18], [17.3, 0.18], [17.3, 0.36], [18.6, 0.36], [18.6, 0.54], [26, 0.54], [30, 0],
    [44, 0], [44, -1.1], [45.2, -1.1], [45.2, 0], [61, 0], [67, 0.9], [73, 0], [100, 0], [100, 12]];
  const BANANAS = [20, 21.6, 23.2, 24.8];
  const PADDLE = { x: 33.5, y: 2.95, len: 1.35, spin: 0.9 }; // spinning bar after the slope
  const HILLTOP = 67.2;
  const CONVEYOR = { x: 76.6, half: 2.4, speed: 2.2 };

  // ---------- course: [x, y] ground outline plus props ----------
  function buildCourse(world) {
    const ground = world.createBody();
    const pts = GROUND;
    const fix = (f, o = {}) => ground.createFixture(f, { friction: 0.9, ...o });
    for (let i = 0; i < pts.length - 1; i++) fix(pl.Edge(V(...pts[i]), V(...pts[i + 1])));
    fix(pl.Edge(V(-10, 0), V(-10, 12)));
    // bumps
    // rubber ducks to kick around
    const ducks = [5, 7.5, 10, 12].map((x) => { const d = world.createBody({ type: 'dynamic', position: V(x, 0.3) }); d.createFixture(pl.Circle(0.26), { density: 0.25, friction: 0.6, restitution: 0.5 }); return d; });
    // banana peels: almost no friction
    const bananas = BANANAS;
    for (const x of bananas) fix(pl.Box(0.45, 0.04, V(x, 0.58), 0), { friction: 0.01, userData: 'banana' });
    // spinning bar and boulders rolling down the hill
    const paddle = world.createBody({ type: 'kinematic', position: V(PADDLE.x, PADDLE.y) });
    paddle.createFixture(pl.Box(PADDLE.len, 0.12), { friction: 0.4 });
    paddle.setAngularVelocity(PADDLE.spin);
    const boulders = [0, 1].map((i) => { const b = world.createBody({ type: 'dynamic', position: V(HILLTOP + i * 3, 1.6), angularDamping: 0.2 }); b.createFixture(pl.Circle(0.42), { density: 0.35, friction: 0.8 }); return b; });
    // seesaw
    // seesaw: pivot a bit right of centre so the near end rests on the ground until you cross the middle
    const seesaw = world.createBody({ type: 'dynamic', position: V(40, 0.42) });
    seesaw.createFixture(pl.Box(3.6, 0.1), { density: 1.5, friction: 0.9 });
    world.createJoint(pl.RevoluteJoint({ enableLimit: true, lowerAngle: -0.13, upperAngle: 0.13 }, ground, seesaw, V(40.5, 0.42)));
    fix(pl.Polygon([V(40, 0), V(41, 0), V(40.5, 0.32)]));
    // bouncy mushroom at the bottom of the pit
    fix(pl.Box(0.55, 0.12, V(44.6, -1.0), -0.35), { restitution: 1.2, userData: 'mushroom' }); // tilted: bounces you forward and out
    // swinging punching bag and patrolling goose (kinematic, moved by script)
    // punching bag on a rope: a real pendulum (kept swinging by a little push), so you can shove past it
    const bag = world.createBody({ type: 'dynamic', position: V(57, 2.6), angularDamping: 0.1 });
    bag.createFixture(pl.Box(0.45, 0.6), { density: 0.7, friction: 0.5 });
    world.createJoint(pl.RevoluteJoint({}, ground, bag, V(57, 7)));
    const goose = world.createBody({ type: 'kinematic', position: V(80, 0.55) });
    goose.createFixture(pl.Box(0.45, 0.55), { friction: 0.3, userData: 'goose' });
    // conveyor belt running backwards
    fix(pl.Box(CONVEYOR.half, 0.06, V(CONVEYOR.x, 0.06), 0), { friction: 1, userData: 'conveyor' });
    const cake = world.createBody({ position: V(FINISH, 0.5) });
    cake.createFixture(pl.Box(0.8, 0.5), { isSensor: true, userData: 'cake' });
    return { pts, bananas, seesaw, bag, goose, ducks, paddle, boulders, wind: [50.5, 56.5] };
  }

  // ---------- the creature ----------
  function buildCreature(world, x, y) {
    const F = { filterGroupIndex: -1, friction: 0.9 };
    const torso = world.createBody({ type: 'dynamic', position: V(x, y), angularDamping: 2 });
    torso.createFixture(pl.Box(0.62, 0.36), { ...F, density: 1.2 });
    const part = (px, py, shape, opts = {}) => { const b = world.createBody({ type: 'dynamic', position: V(px, py) }); b.createFixture(shape, { ...F, density: 1, ...opts }); return b; };
    const head = part(x + 0.55, y + 0.85, pl.Circle(0.4), { density: 0.6 });
    const limb = (ax, ay, len, w, foot, id) => {
      const b = part(x + ax, y + ay - len / 2, pl.Box(w, len / 2));
      b.createFixture(pl.Circle(V(0, -len / 2), foot), { ...F, density: 0.5, friction: 1.4, userData: id });
      return b;
    };
    const ll = limb(-0.28, -0.3, 1.1, 0.11, 0.14, 'll'), rl = limb(0.28, -0.3, 1.1, 0.11, 0.14, 'rl');
    const la = limb(-0.45, 0.2, 0.85, 0.09, 0.12), ra = limb(0.5, 0.2, 0.85, 0.09, 0.12);
    const tl = part(x - 0.95, y - 0.05, pl.Box(0.4, 0.07), { density: 0.6 });
    const J = (b, ax, ay, lo, hi, torque) => world.createJoint(pl.RevoluteJoint({ enableMotor: true, maxMotorTorque: torque, enableLimit: true, lowerAngle: lo, upperAngle: hi },
      torso, b, V(x + ax, y + ay)));
    const joints = {
      ll: J(ll, -0.28, -0.3, -1.2, 1.2, 140), rl: J(rl, 0.28, -0.3, -1.2, 1.2, 140),
      la: J(la, -0.45, 0.2, -3, 3, 40), ra: J(ra, 0.5, 0.2, -3, 3, 40),
      hd: J(head, 0.35, 0.4, -0.7, 0.7, 30), tl: J(tl, -0.6, -0.05, -1.2, 1.2, 50),
    };
    return { torso, parts: { ll, rl, la, ra, hd: head, tl }, joints };
  }

  // seeded random so practice runs and replays are repeatable
  const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  function create(opts = {}) {
    const world = new pl.World({ gravity: V(0, -12) });
    const course = buildCourse(world);
    const s = {
      world, course, t: 0, cp: 0, best: 0, falls: 0, done: false, events: [], rand: rng(opts.seed || 1),
      input: Object.fromEntries(LIMBS.map((l) => [l, { dir: 0, act: false }])),
      target: {}, gone: {}, cramp: {}, cool: {}, grip: {}, down: 0, splat: 0, history: [], hiccupAt: 12,
    };
    const contacts = new Map(); // body -> set of touching ground/props
    world.on('begin-contact', (c) => {
      const a = c.getFixtureA(), b = c.getFixtureB();
      for (const [x, y] of [[a, b], [b, a]]) {
        const ud = y.getUserData();
        if (ud === 'cake' && s.cr && Object.values(s.cr.parts).concat(s.cr.torso).includes(x.getBody())) s.finish = true;
        if (!x.isSensor() && !y.isSensor()) { const set = contacts.get(x.getBody()) || new Set(); set.add(y.getBody()); contacts.set(x.getBody(), set); }
      }
    });
    // a leg swinging forward lifts its foot (slides); pushing back grips
    world.on('pre-solve', (c) => {
      const ca = c.getFixtureA().getUserData() === 'conveyor', cb = c.getFixtureB().getUserData() === 'conveyor';
      if (ca || cb) c.setTangentSpeed(ca ? -CONVEYOR.speed : CONVEYOR.speed); // pushes things backwards
      for (const f of [c.getFixtureA(), c.getFixtureB()]) {
        const l = f.getUserData(); if (l !== 'll' && l !== 'rl') continue;
        const d = s.input[l].dir; c.setFriction(d > 0 ? 0.03 : d < 0 ? 2 : 1.2);
      }
    });
    world.on('end-contact', (c) => {
      const a = c.getFixtureA(), b = c.getFixtureB();
      contacts.get(a.getBody())?.delete(b.getBody()); contacts.get(b.getBody())?.delete(a.getBody());
    });
    const touching = (body) => [...(contacts.get(body) || [])].filter((b) => !isMe(b));
    const isMe = (b) => b === s.cr?.torso || Object.values(s.cr?.parts || {}).includes(b);

    function spawn() {
      if (s.cr) { for (const b of [s.cr.torso, ...Object.values(s.cr.parts)]) world.destroyBody(b); }
      contacts.clear();
      const x = CHECKPOINTS[s.cp] + 1, y = groundY(x) + 1.75;
      s.cr = buildCreature(world, x, y);
      for (const l of LIMBS) { s.target[l] = l === 'tl' ? 0 : 0; s.grip[l] = null; }
      for (const l of Object.keys(s.gone)) detach(l, true);
    }
    function groundY(x) { const p = course.pts; for (let i = 0; i < p.length - 1; i++) if (x >= p[i][0] && x <= p[i + 1][0] && p[i + 1][0] > p[i][0]) return p[i][1] + (p[i + 1][1] - p[i][1]) * (x - p[i][0]) / (p[i + 1][0] - p[i][0]); return 0; }
    function detach(l, quiet) { // a voted-out limb pops off
      s.gone[l] = true;
      const j = s.cr.joints[l]; if (j) { world.destroyJoint(j); s.cr.joints[l] = null; }
      const b = s.cr.parts[l]; b.getFixtureList() && b.getFixtureList().setFilterData({ groupIndex: 0, categoryBits: 1, maskBits: 0xffff });
      if (!quiet) { b.applyLinearImpulse(V(-2, 5), b.getWorldCenter()); s.events.push({ e: 'pop', l }); }
    }
    s.detach = (l) => detach(l, false);
    s.fart = () => { // traitor power: looks exactly like a natural hiccup
      const t = s.cr.torso; t.applyLinearImpulse(V((s.rand() - 0.5) * 4, 6), t.getWorldPoint(V(-0.5, 0)));
      t.applyAngularImpulse((s.rand() < 0.5 ? -1 : 1) * 3.5);
      s.events.push({ e: 'hic' });
    };
    s.crampLimb = (l) => { s.cramp[l] = s.t + 3; s.events.push({ e: 'cramp', l }); };

    function step(dt = 1 / 60) {
      if (s.done) return;
      s.t += dt;
      const cr = s.cr, tor = cr.torso, ang = tor.getAngle(), pos = tor.getPosition();
      // limbs: position control, held buttons move the target angle
      for (const l of LIMBS) {
        const j = cr.joints[l]; if (!j) continue;
        const inp = s.input[l], cramped = s.cramp[l] > s.t;
        if (cramped) { j.setMaxMotorTorque(0); continue; }
        j.setMaxMotorTorque(l === 'll' || l === 'rl' ? 140 : l === 'tl' ? 50 : l === 'hd' ? 30 : 40);
        s.target[l] = Math.max(j.getLowerLimit(), Math.min(j.getUpperLimit(), s.target[l] + inp.dir * TURN * dt));
        j.setMotorSpeed(Math.max(-8, Math.min(8, (s.target[l] - j.getJointAngle()) * 12)));
        actions(l, inp.act);
      }
      // a little balance help so it wobbles rather than face-plants every second
      tor.applyTorque(-ang * P.assist - tor.getAngularVelocity() * P.assist * 0.2);
      // a planted leg pushing back drives the body forward (makes walking much easier to learn)
      for (const l of ['ll', 'rl']) if (!s.gone[l] && s.input[l].dir < 0 && touching(cr.parts[l]).length) tor.applyForceToCenter(V(P.push * Math.cos(ang), 0));
      // props
      const bg = course.bag, ba = bg.getAngle(), bw = bg.getAngularVelocity();
      if (0.5 * bw * bw + 2.7 * (1 - Math.cos(ba)) < 0.25 && Math.abs(ba) < 0.3) bg.applyTorque((bw >= 0 ? 1 : -1) * 6); // pump it back to ~0.4 rad swings
      for (const d of course.ducks) if (d.getPosition().x > 15.4 && d.isActive()) { s.events.push({ e: 'duck', x: d.getPosition().x, y: d.getPosition().y }); d.setTransform(V(-200, -50), 0); d.setActive(false); } // kicked far enough: poof
      // a boulder rolls down from the hill top every few seconds
      if (s.t > (s.rollAt ?? 3)) {
        s.rollAt = s.t + 4 + s.rand() * 2; const b = course.boulders[(s.rolls = (s.rolls || 0) + 1) % 2];
        b.setTransform(V(HILLTOP, 1.5), 0); b.setLinearVelocity(V(-2.6, 0)); b.setAngularVelocity(4);
      }
      const gx = 80 + Math.sin(s.t * 1.1) * 4.5;
      course.goose.setLinearVelocity(V((gx - course.goose.getPosition().x) * 60, 0));
      s.gust = Math.sin(s.t * 1.1) > 0.2; // the fan blows in gusts
      if (s.gust && pos.x > course.wind[0] && pos.x < course.wind[1] && pos.y < 5) tor.applyForceToCenter(V(-13, 0));
      // natural hiccups (so the traitor's fake ones blend in)
      if (s.t > s.hiccupAt) { s.hiccupAt = s.t + 18 + s.rand() * 25; s.fart(); }
      world.step(dt, 8, 3);
      // progress and checkpoints
      s.best = Math.max(s.best, pos.x);
      while (s.cp < CHECKPOINTS.length - 1 && pos.x > CHECKPOINTS[s.cp + 1] + 1.5) { s.cp++; s.events.push({ e: 'cp', n: s.cp }); }
      if (s.finish) { s.done = true; s.events.push({ e: 'finish' }); return; }
      // fallen over: head on the ground, upside down for a while, or into the pit/off the world
      const headDown = touching(cr.parts.hd).length > 0 && !s.gone.hd;
      s.down = Math.abs(ang) > 1.7 || headDown ? s.down + dt : 0;
      s.pit = pos.x > 43.8 && pos.x < 45.4 && pos.y < 0.9 ? (s.pit || 0) + dt : 0; // stuck in the pit
      if (s.down > 0.9 || s.pit > 2 || pos.y < -6) {
        s.pit = 0;
        s.falls++; s.down = 0;
        s.events.push({ e: 'splat', x: pos.x, y: pos.y });
        spawn();
      }
      for (const l of LIMBS) if (s.input[l].dir || s.input[l].act) s.pressed[l] = s.t;
    }
    s.pressed = {};
    function actions(l, act) {
      const cr = s.cr, b = cr.parts[l], now = s.t;
      if (l === 'la' || l === 'ra') { // grab whatever the hand touches, let go on release
        if (act && !s.grip[l]) { const other = touching(b)[0]; if (other) { s.grip[l] = world.createJoint(pl.WeldJoint({}, b, other, b.getWorldPoint(V(0, -0.42)))); s.events.push({ e: 'grab', l }); } }
        if (!act && s.grip[l]) { world.destroyJoint(s.grip[l]); s.grip[l] = null; }
        return;
      }
      if (!act || (s.cool[l] || 0) > now) return;
      if (l === 'hd') { s.cool[l] = now + 1.2; cr.torso.applyLinearImpulse(V(0, 2.5), cr.torso.getWorldCenter()); s.events.push({ e: 'honk' }); return; }
      const onGround = touching(cr.parts.ll).length + touching(cr.parts.rl).length > 0;
      if (l === 'tl') { if (!onGround) return; s.cool[l] = now + 1.4; cr.torso.applyLinearImpulse(V(2.5, 9), cr.torso.getWorldCenter()); s.events.push({ e: 'boing' }); return; }
      if (touching(b).length === 0) return;
      // stomp: push the body away from the foot
      s.cool[l] = now + 0.9;
      const d = cr.torso.getWorldCenter().clone().sub(b.getWorldPoint(V(0, -0.55))); d.normalize();
      cr.torso.applyLinearImpulse(d.mul(7), cr.torso.getWorldCenter());
      s.events.push({ e: 'stomp', l });
    }

    // snapshot for drawing / sending: creature parts + moving props, rounded
    s.snapshot = () => {
      const r = (v) => Math.round(v * 100) / 100, cr = s.cr, o = [];
      for (const b of [cr.torso, cr.parts.ll, cr.parts.rl, cr.parts.la, cr.parts.ra, cr.parts.hd, cr.parts.tl, course.seesaw, course.bag, course.goose, ...course.ducks, ...course.boulders, course.paddle]) {
        const p = b.getPosition(); o.push(r(p.x), r(p.y), r(b.getAngle()));
      }
      return o;
    };
    s.step = step; s.spawn = spawn; s.groundY = groundY;
    spawn();
    return s;
  }

  // ---------- bots ----------
  // helpful bot: walk with an alternating leg swing and balance with arms, tail and head.
  // sneaky (traitor) bot: helps most of the time, then does the wrong thing at a bad moment.
  function bot(s, l, mem, sneaky) {
    if (s.gone[l]) return { dir: 0, act: false };
    const tor = s.cr.torso, ang = tor.getAngle(), av = tor.getAngularVelocity(), t = s.t;
    mem.ph ??= s.rand() * 0.6; mem.bad ??= 0; mem.next ??= t + 6 + s.rand() * 8;
    let want = 0, act = false;
    const gait = Math.sin(t * 3.4 + mem.ph);
    if (l === 'll' || l === 'rl') { // step: swing forward until ahead, then push back until behind the other leg
      const a = s.target[l], oa = s.target[l === 'll' ? 'rl' : 'll'];
      mem.mode ??= l === 'll' ? 'swing' : 'stance';
      if (mem.mode === 'swing' && a > P.reach) mem.mode = 'stance';
      else if (mem.mode === 'stance' && a < -P.back && (oa > a + 0.3 || (oa < -P.back + 0.05 && l === 'll'))) mem.mode = 'swing';
      want = (mem.mode === 'swing' ? P.reach + 0.1 : -P.back - 0.1) - ang * P.tilt;
    }
    if (l === 'la' || l === 'ra') want = (l === 'la' ? -gait : gait) * 0.8 + ang * 1.5 + av * 0.3;
    if (l === 'tl') want = ang * 1.2 + av * 0.25;
    if (l === 'hd') want = -ang * 0.8;
    const x = tor.getPosition().x, j = s.cr.joints[l], aim = j ? j.getJointAngle() : 0;
    // stuck (no progress for a moment) or at the pit edge: boing with the tail, stomp with the back leg
    if (x > (mem.bx ?? -99) + 0.4) { mem.bx = x; mem.bt = t; }
    const stuck = t - mem.bt > 1.1 || (x > 43 && x < 44);
    if (stuck && l === 'tl') act = true;
    if (stuck && (l === 'll' || l === 'rl') && mem.mode === 'stance') act = true;
    // spinning bar: wait while an end is sweeping low in front of us
    const sa = Math.abs(Math.sin(t * PADDLE.spin));
    if ((l === 'll' || l === 'rl') && x > 30.3 && x < 32.4 && sa > 0.55) want = -ang * P.tilt;
    // boulder rolling at us: boing over it
    if (l === 'tl' && s.course.boulders.some((b) => { const d = b.getPosition().x - x; return d > 0.4 && d < 1.8 && b.getLinearVelocity().x < -0.5; })) act = true;
    if (sneaky) {
      if (t > mem.next) { mem.bad = t + 0.9 + s.rand() * 0.8; mem.next = t + 7 + s.rand() * 10; }
      if (t < mem.bad) { want = -want * 2 + (l === 'tl' || l === 'hd' ? Math.sign(ang || 1) * 1.2 : 0); act = l === 'la' || l === 'ra'; }
    }
    const d = want - (s.target[l] ?? aim);
    return { dir: Math.abs(d) < 0.06 ? 0 : Math.sign(d), act };
  }

  globalThis.OB = { P, create, bot, LIMBS, LIMB_NAME, ACTION, FINISH, CHECKPOINTS, GROUND, BANANAS, PADDLE, CONVEYOR };
})();
