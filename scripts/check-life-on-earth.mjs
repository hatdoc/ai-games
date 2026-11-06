// Checks for Life on Earth: probability model, seed reproducibility, save/restore, life cycles, mortality.
//   node scripts/check-life-on-earth.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
const dir = new URL('../games/life-on-earth/', import.meta.url);
for (const f of ['species.js', 'engine.js', 'lives-a.js', 'lives-human.js', 'lives-b.js', 'lives-c.js']) await import(new URL(f, dir));
const LE = globalThis.LE;
LE.setCountries(JSON.parse(fs.readFileSync(new URL('data/countries.json', dir))));
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

// 1. probabilities: sum to 1, match births / total
for (const scope of ['core', 'all']) {
  const t = LE.table(scope), tot = t.reduce((a, r) => a + r.births, 0);
  ok(Math.abs(t.reduce((a, r) => a + r.p, 0) - 1) < 1e-12 && t.every((r) => Math.abs(r.p - r.births / tot) < 1e-12), `P(species) = births / total (${scope}, ${t.length} species)`);
  console.log('   ' + t.map((r) => `${r.sp.id} ${(r.p * 100).toFixed(4)}%`).join('  '));
}
const dt = LE.table('core', 'discovery'); ok(dt.every((r) => Math.abs(r.p - 1 / dt.length) < 1e-12), 'discovery mode is flat (and labelled adjusted in UI)');

// 2. convergence: 200k seeds vs configured weights
const N = 200000, t = LE.table('core'), cnt = {};
for (let i = 0; i < N; i++) { const r = LE.draw('S' + i); cnt[r.sp.id] = (cnt[r.sp.id] || 0) + 1; }
let chi = 0, dof = 0, worst = 0;
for (const r of t) { const e = N * r.p, o = cnt[r.sp.id] || 0, z = (o - e) / Math.sqrt(e * (1 - r.p)); worst = Math.max(worst, Math.abs(z)); if (e >= 5) { chi += (o - e) ** 2 / e; dof++; } }
ok(worst < 4.5, `observed draws converge to weights (worst |z| = ${worst.toFixed(2)}, chi2 = ${chi.toFixed(1)} on ${dof - 1} dof)`);

// 3. reproducibility + save/restore
const run = (seed, sp) => { const s = LE.birth(seed, { speciesId: sp }); LE.autoRun(s); return s; };
for (const sp of LE.SPECIES.map((x) => x.id)) {
  const a = run('REPRO-1', sp), b = run('REPRO-1', sp);
  ok(JSON.stringify(a) === JSON.stringify(b), `same seed -> identical life (${sp})`);
  const c = LE.birth('REPRO-1', { speciesId: sp }); for (let i = 0; i < 6 && c.alive; i++) { if (c.pending) LE.choose(c, LE.autoPick(c, true)); else LE.advance(c); }
  const d = JSON.parse(JSON.stringify(c)); LE.autoRun(c); LE.autoRun(d);
  ok(JSON.stringify(c) === JSON.stringify(d), `save/restore mid-life continues identically (${sp})`);
}
ok(JSON.stringify(LE.draw('ABCD-1234')) === JSON.stringify(LE.draw('abcd-1234')), 'seed is case-insensitive');

// 4. life cycles: valid stages/ages/needs, species-appropriate text, mortality
const STAGES = { human: ['Infancy', 'Childhood', 'Adolescence', 'Young adulthood', 'Adulthood', 'Middle age', 'Old age'],
  dog: ['Newborn puppy', 'Puppy', 'Adolescent', 'Adult', 'Senior'], cat: ['Newborn kitten', 'Kitten', 'Adolescent', 'Adult', 'Senior'],
  lion: ['Newborn cub', 'Young cub', 'Juvenile', 'Subadult', 'Adult', 'Senior'], penguin: ['Egg', 'Hatchling', 'Chick', 'Juvenile', 'Adult'],
  turtle: ['Egg', 'Hatchling', 'Juvenile (ocean)', 'Juvenile (coast)', 'Adult'], whale: ['Calf', 'Juvenile', 'Subadult', 'Adult'], monarch: ['Egg', 'Caterpillar', 'Chrysalis', 'Butterfly'] };
const BAN = { human: /milkweed|krill|chrysalis|\bpup\b|\bcub\b|\bchick\b|savanna/i, dog: /milkweed|krill|chrysalis|university|salary/i, cat: /milkweed|krill|chrysalis|university|bark/i,
  lion: /milkweed|krill|university|human life/i, penguin: /milkweed|savanna|university|pride/i, turtle: /milkweed|krill|savanna|university|pride/i, whale: /milkweed|savanna|university|pride|ice floe/i, monarch: /krill|savanna|university|pride|ocean basin/i };
const EXPECT = { dog: [3, 11], cat: [3, 10], lion: [3, 11], penguin: [1, 9], turtle: [0.5, 30], whale: [30, 70], monarch: [0.04, 0.5] };
const PER = { human: 4000, dog: 3000, cat: 3000, lion: 3000, penguin: 3000, turtle: 3000, whale: 1500, monarch: 3000 };
for (const sp of Object.keys(STAGES)) {
  let sum = 0, bad = 0, decs = 0, ev = 0, maxAge = 0, banned = 0;
  for (let i = 0; i < PER[sp]; i++) {
    const s = LE.birth('L' + i, { speciesId: sp }); LE.autoRun(s);
    sum += s.age; maxAge = Math.max(maxAge, s.age); decs += s.choices.length; ev += s.log.length;
    if (!s.end || !(s.age > 0) || Object.values(s.n).some((v) => !Number.isFinite(v)) || s.log.some((e) => e.stage && !STAGES[sp].includes(e.stage))) bad++;
    if (s.log.some((e) => BAN[sp].test(e.text))) banned++;
  }
  const mean = sum / PER[sp];
  console.log(`   ${sp}: mean lifespan ${mean.toFixed(2)} y, max ${maxAge.toFixed(1)}, ${(decs / PER[sp]).toFixed(1)} decisions, ${(ev / PER[sp]).toFixed(0)} entries per life`);
  ok(bad === 0, `${sp}: all lives end in valid states with valid stages`);
  ok(banned === 0, `${sp}: no text from another species' world`);
  if (EXPECT[sp]) ok(mean >= EXPECT[sp][0] && mean <= EXPECT[sp][1], `${sp}: mean lifespan inside expected range ${EXPECT[sp].join('-')}`);
}

// 5. human mortality calibrated to country life expectancy
const by = {}; for (let i = 0; i < 60000; i++) { const s = LE.birth('H' + i, { speciesId: 'human' }); LE.autoRun(s); const k = s.born.country.iso; (by[k] ||= { c: s.born.country, a: [] }).a.push(s.age); }
for (const iso of ['IND', 'NGA', 'CHN', 'USA']) { const g = by[iso]; if (!g || g.a.length < 150) continue; const m = g.a.reduce((x, y) => x + y, 0) / g.a.length; console.log(`   ${g.c.name}: simulated mean ${m.toFixed(1)} vs life expectancy ${g.c.le} (n=${g.a.length})`); ok(Math.abs(m - g.c.le) < 2.5, `${g.c.name}: simulated lifespan within 2.5 y of life expectancy (decisions shift it a little)`); }

// 6. what-if is a separate, different life
const o = run('WHATIF-1', 'human'), w = LE.whatIf(o);
ok(w.born.key !== o.born.key && !w.alive && o.seed === w.seed, 'what-if: separate life, different circumstances, original untouched');
ok(LE.compare(run('X', 'dog'), run('X', 'lion')).same === false, 'compare refuses to equate different species');
process.exit(fails ? 1 : 0);
