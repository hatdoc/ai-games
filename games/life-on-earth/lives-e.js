// Life modules, part 3: LE.wild(id, cfg) builds a full life module for a wild animal from data.
// Stage survival figures are MODELLED approximations chosen so life expectancy lands in published ranges;
// they are not measurements. Places are real; their weights are a gameplay choice (not data).
(function (g) {
  const LE = g.LE, M = LE.modules, say = LE.say, flag = LE.flag, N = LE.mod, hz = LE.hz;
  const cl = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
  const fy = (a) => { const m = Math.max(1, Math.round(a * 12)); return a < 1 ? `${m} month${m > 1 ? 's' : ''}` : `${a.toFixed(1)} years`; };
  const KEYS = ['food', 'health', 'skill', 'bond', 'safety', 'status'];
  const fx = (s, o = {}) => { for (const k of KEYS) if (o[k]) N(s, k, o[k]); if (o.h) s.mods.h *= o.h; };

  LE.wild = (id, c) => {
    const stageOf = (a) => { for (const [to, label] of c.stages) if (a < to) return label; return c.stages[c.stages.length - 1][1]; };
    const place = (R, avoid) => { let x, n = 0; do { x = R.wpick(c.regions, (p) => p.w); n++; } while (avoid && x.name === avoid && n < 30); return x; };
    const cap = (t) => t[0].toUpperCase() + t.slice(1);
    const text = (t, s) => (typeof t === 'function' ? t(s) : t).replace(/\{n\}/g, s.name);

    M[id] = {
      dt: (s) => c.dt(s.age), stage: (s) => stageOf(s.age), fmtAge: fy,
      birth(s, R, avoid) {
        const r = place(R, avoid), sexes = c.sexes || ['female', 'male'];
        s.traits = { bold: R.r(), caution: R.r(), social: R.r(), curious: R.r() };
        s.sex = R.pick(sexes); s.name = R.pick(c.names); s.mother = R.pick(c.names); s.group = R.int(c.group[0], c.group[1]); s.sibs = R.int(c.sibs[0], c.sibs[1]);
        s.env = { food: R.range(0.7, 1.05), bad: 0 }; s.n = { health: 85, food: 65, skill: 5, bond: 60, status: 20, safety: 70 };
        s.young = 0; s.nextBreed = c.breed ? c.breed.from + R.range(0, 1.5) : 1e9;
        s.born = { key: r.name, place: r.name, env: c.env, region: r, story: text(c.story, s).replace(/\{place\}/g, r.name).replace(/\{sibs\}/g, s.sibs).replace(/\{group\}/g, s.group).replace(/\{mother\}/g, s.mother) };
        s.family = [{ rel: 'Mother', name: s.mother, note: '' }, ...Array.from({ length: s.sibs }, () => ({ rel: c.sibWord || 'Sibling', name: R.pick(c.names), note: '' }))];
      },
      tick(s, dt, R) {
        const e = s.env; e.food = cl(e.food + R.range(-0.05, 0.05) + (e.bad > 0 ? -0.03 : 0.01), 0.3, 1.25); e.bad = Math.max(0, e.bad - dt);
        N(s, 'food', R.range(-10, 14) * (0.5 + e.food / 2) - 3 + (s.age < c.nurse ? 5 : 0)); N(s, 'health', s.n.food > 35 ? 0.8 : -3);
        const b = c.breed;
        if (b && s.age >= s.nextBreed && s.age < b.to && (!b.femaleOnly || s.sex === 'female') && (s.sex !== 'male' || !b.femaleOnly)) {
          const n = R.int(b.litter[0], b.litter[1]), ok = Math.max(0, Math.round(n * R.range(b.surv[0], b.surv[1])));
          s.nextBreed = s.age + R.range(b.every[0], b.every[1]); s.young += ok;
          for (let i = 0; i < ok; i++) s.family.push({ rel: cap(b.noun), name: R.pick(c.names), note: `born at age ${s.age.toFixed(1)}` });
          say(s, ok ? text(b.yes, s).replace(/\{k\}/g, `${ok} ${ok > 1 ? b.nounPl : b.noun}`) : text(b.no, s), { tone: ok ? 'joy' : 'hard', turn: !!ok && s.young === ok });
        }
      },
      hazard(s) {
        const a = s.age, e = s.env, p = 1.35 - e.food, m = s.mods.h * (1 + Math.max(0, 40 - s.n.health) / 50), o = {};
        let from = 0;
        for (const [to, surv, causes] of c.bands) {
          if (a < to) {
            const h = hz(surv, to - from);
            for (const [n, sh, fs] of causes) o[n] = h * sh * m * (fs ? p : 1);
            if (c.threat && a >= 1) o[c.threatName || 'conflict with people'] = s.born.region.threat * c.threat * m;
            return o;
          }
          from = to;
        }
        const A = c.adult, sx = (c.sexH && c.sexH[s.sex]) || 1;
        for (const [n, sh, fs] of A.causes) o[n] = A.base * sh * m * sx * (fs ? p : 1);
        if (c.threat) o[c.threatName || 'conflict with people'] = s.born.region.threat * c.threat * m;
        o['old age'] = A.senA * Math.exp(A.senK * (a - from)) * m * sx;
        return o;
      },
      death: (s, cause) => ({ text: `${s.name} died at ${fy(s.age)}, of ${cause}. ${s.young ? `The ${s.young} ${c.breed.nounPl} you raised carried your line on.` : c.legacy}` }),
      eventRate: (s) => (s.age < c.nurse ? c.rate[0] : c.rate[1]),
      diaryEvery: c.diaryEvery || 2,
      diary(s, R) { const pool = s.age < c.diary.to ? c.diary.young : c.diary.adult; return text(R.pick(pool), s); },
      stats: (s) => [['Place', s.born.place], ['Sex', s.sex], [`${cap(c.breed ? c.breed.nounPl : 'offspring')} raised`, s.young], [c.skill, Math.round(s.n.skill)], ['Standing', Math.round(s.n.status)]],
      meters: (s) => [['Health', s.n.health, 'g'], [c.fed, s.n.food, 'o'], [c.skill, s.n.skill, 'y'], [c.bondLabel, s.n.bond, 'r'], ['Standing', s.n.status, 'p'], ['Safety', s.n.safety, 'b']],
      info: (s) => [['Place', s.born.place], [c.groupLabel, `${s.group}`], [c.foodLabel, s.env.food > 0.9 ? 'Plentiful' : s.env.food > 0.6 ? 'Moderate' : 'Scarce'], ['Season', s.env.bad > 0 ? c.badName : 'Normal'], ['Mother', s.mother], [c.breed ? cap(c.breed.nounPl) : 'Offspring', s.young]],
      milestones: c.milestones.map(([mid, age, t, tone]) => ({ id: mid, when: (s) => s.age >= age, fx: (s) => say(s, text(t, s), { tone: tone || 'calm' }) })),
      decisions: c.decisions.map((d) => ({
        id: d.id, when: (s) => s.age >= d.from && s.age < (d.to || 1e9) && (!d.ok || d.ok(s)), title: d.title, text: (s) => text(d.text, s),
        options: d.opts.map(([k, label, hint, bias, f, t, risk, irrev]) => ({
          k, label, hint, bias, irrev: !!irrev,
          fx(s, R) {
            if (risk && !R.chance(cl(risk.p + s.n.skill / 400, 0.05, 0.95))) { fx(s, risk.fx); say(s, text(risk.t, s), { tone: 'hard' }); return; }
            fx(s, f);
            if (f.flag) flag(s, f.flag[0], f.flag[1]); else say(s, text(t, s), { tone: 'calm' });
          },
        })),
      })),
      events: c.events.map((e, i) => ({
        id: 'e' + i, w: e.w, tone: e.tone || 'calm',
        when: (s) => s.age >= (e.a ? e.a[0] : 0) && s.age < (e.a ? e.a[1] : 1e9) && (!e.ok || e.ok(s)) && (!e.bad || s.env.bad <= 0),
        wf: e.f ? (s) => (s.flags[e.f] ? 5 : 1) : null,
        fx(s) {
          if (e.setBad) s.env.bad = e.setBad;
          if (e.food) s.env.food = cl(s.env.food + e.food, 0.3, 1.25);
          fx(s, e.fx || {});
          const chained = e.f && s.flags[e.f];
          say(s, text(chained ? e.t2 : e.t, s), { tone: chained ? 'turn' : e.tone || 'calm', turn: !!chained || !!e.turn, because: chained ? e.f : null });
        },
      })),
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
