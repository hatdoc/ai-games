// Life modules, part 1: human and companion animals (dog, cat).
// Everything marked "modelled" is a game model on top of real country indicators, never a statistic about a real person.
(function (g) {
  const LE = g.LE, M = LE.modules, say = LE.say, flag = LE.flag, N = LE.mod;
  const cl = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
  const yrs = (a) => (a < 1 ? `${Math.max(0, Math.round(a * 12))} months` : `${Math.floor(a)} years`);
  const pick = (R, arr, avoid, key) => { let x, n = 0; do { x = arr.next ? arr.next() : R.pick(arr); n++; } while (avoid && key(x) === avoid && n < 30); return x; };
  const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  const Phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

  const NAMES = ['Ayo', 'Mei', 'Sol', 'Ravi', 'Lina', 'Kofi', 'Yuki', 'Omar', 'Inés', 'Tariq', 'Anya', 'Noor', 'Zane', 'Mina', 'Jabu', 'Rosa', 'Kai', 'Amara', 'Dev', 'Elif', 'Tomás', 'Hana', 'Bao', 'Sana', 'Luka', 'Imani', 'Arjun', 'Freya', 'Chidi', 'Leila'];
  const PETNAMES = ['Biscuit', 'Maple', 'Juno', 'Pepper', 'Otis', 'Nova', 'Mochi', 'Ziggy', 'Clover', 'Bean', 'Tilly', 'Rusty', 'Pip', 'Willow', 'Sunny', 'Ash'];

  // =============== HUMAN ===============
  const HS = ['Infancy', 'Childhood', 'Adolescence', 'Young adulthood', 'Adulthood', 'Middle age', 'Old age'];
  const hStage = (a) => HS[a < 3 ? 0 : a < 12 ? 1 : a < 18 ? 2 : a < 30 ? 3 : a < 45 ? 4 : a < 65 ? 5 : 6];
  const EDU = ['No formal schooling', 'Primary school', 'Secondary school', 'Vocational training', 'University'];
  const SIG = 0.95; // spread of household income inside a country (modelled, lognormal)
  const calCache = {};
  // Survival model: child mortality from the country's under-5 rate; adult Gompertz hazard calibrated so the
  // average lifespan matches the country's life expectancy at birth.
  function childH(c) { const q5 = cl(c.u5 / 1000, 0.002, 0.4); const q1 = 0.75 * q5; return { h0: LE.hz(1 - q1, 1), h1: LE.hz((1 - q5) / (1 - q1), 4) }; }
  // average life expectancy over the spread of household incomes inside a country (7-point normal quadrature),
  // so the whole population, not just the average household, matches the published life expectancy
  const ZS = [-2.5, -1.67, -0.83, 0, 0.83, 1.67, 2.5], ZW = ZS.map((z) => Math.exp(-z * z / 2)), ZT = ZW.reduce((a, b) => a + b);
  function e0(c, A) { const { h0, h1 } = childH(c); let tot = 0;
    ZS.forEach((z, zi) => { const rel = Math.exp(SIG * z - SIG * SIG / 2), mc = Math.pow(rel, -0.25) * normA(0.25), ma = Math.pow(rel, -0.15) * normA(0.15); let S = 1, sum = 0; const dt = 0.25;
      for (let a = 0; a < 120; a += dt) { const h = a < 1 ? h0 * mc : a < 5 ? h1 * mc : (0.0004 + A * Math.exp(0.085 * (a - 5))) * ma; const S2 = S * Math.exp(-h * dt); sum += (S + S2) / 2 * dt; S = S2; }
      tot += sum * ZW[zi]; });
    return tot / ZT; }
  function calib(c) {
    if (calSafe(c)) return calCache[c.iso];
    let lo = 1e-6, hi = 0.05; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (e0(c, m) > c.le) lo = m; else hi = m; }
    return (calCache[c.iso] = (lo + hi) / 2);
  }
  const calSafe = (c) => calCache[c.iso] != null;
  const normA = (a) => Math.exp(-a * SIG * SIG / 2 * (1 + a)); // keeps the population-average hazard equal to the country's

  M.human = {
    dt: () => 1,
    stage: (s) => hStage(s.age),
    fmtAge: (a) => `${Math.floor(a)} years`,
    birth(s, R, avoid) {
      const cs = LE.countries; let c, n = 0;
      do { c = R.wpick(cs, (x) => x.births); n++; } while (avoid && c.iso === avoid && n < 40);
      const z = R.norm(); const rel = Math.exp(SIG * z - SIG * SIG / 2);
      const urban = R.chance(cl((c.urban || 50) / 100, 0.05, 0.98));
      const income = Math.round((c.gdp || 1000) * rel);
      const pct = Math.round(Phi(z) * 100);
      const hc = cl(28 * Math.log10(Math.max(8, (c.health || 40) * Math.sqrt(rel))) - 18);
      const secP = cl((c.sec || 40) / 100, 0.08, 0.98), terP = cl((c.tert || 10) / 100, 0.02, 0.95);
      const sex = R.chance(0.5) ? 'girl' : 'boy';
      const lam = cl(c.cbr ? (c.births / c.pop * 1000) / 10 : 1.8, 0.4, 3.2);
      const sibs = Math.min(7, R.poisson(lam));
      const single = R.chance(0.12);
      const rural = ['subsistence farmer', 'farm worker', 'market trader', 'fisher', 'herder', 'builder', 'domestic worker'];
      const city = ['shop assistant', 'bus driver', 'factory worker', 'nurse', 'electrician', 'office clerk', 'street vendor', 'teacher'];
      const rich = ['engineer', 'doctor', 'lawyer', 'software developer', 'accountant', 'business owner', 'university lecturer'];
      const occ = () => R.pick(rel > 2.2 ? rich : urban ? city : rural);
      s.traits = { bold: R.r(), caution: R.r(), social: R.r(), curious: R.r() };
      s.talent = R.pick(['music', 'sport', 'maths', 'art', 'craft', 'caring', 'languages']);
      s.talentLvl = R.range(0.2, 1);
      s.frail = Math.exp(0.2 * R.norm());
      s.name = R.pick(NAMES);
      s.born = { key: c.iso, place: `${urban ? 'a city or town' : 'a rural area'} in ${c.name}`, country: c, urban, income, pct, hc: Math.round(hc), secP, terP, rel, sex,
        parents: single ? [occ()] : [occ(), occ()], sibs, season: R.pick(['spring', 'summer', 'autumn', 'winter']),
        env: urban ? 'Urban' : 'Rural', story: '' };
      s.n = { health: cl(78 + R.range(0, 20) - (hc < 30 ? 6 : 0)), joy: 70, money: Math.round(cl(pct)), friends: 20, skills: 10 };
      s.edu = 0; s.career = null; s.partner = null; s.kids = 0; s.grades = R.range(0.3, 0.9); s.debt = 0; s.country = c.name;
      s.family = [...s.born.parents.map((o, i) => ({ rel: i ? 'Parent' : 'Parent', name: R.pick(NAMES), note: o })), ...Array.from({ length: sibs }, (_, i) => ({ rel: 'Sibling', name: R.pick(NAMES), note: '' }))];
      s.born.story = `${s.name} was born a ${sex} in ${s.born.place}, ${c.name}, in ${s.born.season}. ${single ? `One parent, a ${s.born.parents[0]}, raised the household` : `The parents were a ${s.born.parents[0]} and a ${s.born.parents[1]}`}, with ${sibs} ${sibs === 1 ? 'sibling' : 'siblings'}. The household lived on about $${income.toLocaleString('en-US')} a year per person (modelled from ${c.name}'s average of $${Math.round(c.gdp || 0).toLocaleString('en-US')}).`;
    },
    tick(s) {
      N(s, 'health', s.age < 45 ? 0.5 : -0.9 - (s.age > 70 ? 0.7 : 0));
      N(s, 'joy', (s.n.money - 50) * 0.01 + (s.n.friends - 40) * 0.01 - 0.2 + (s.partner ? 0.5 : 0));
      N(s, 'money', s.career ? 0.4 : -0.2);
    },
    hazard(s) {
      const c = s.born.country, a = s.age, { h0, h1 } = childH(c);
      const m = s.mods.h * s.frail * (a < 5 ? Math.pow(s.born.rel, -0.25) * normA(0.25) : Math.pow(s.born.rel, -0.15) * normA(0.15)) * (1 + Math.max(0, 40 - s.n.health) / 60);
      const base = a < 1 ? h0 : a < 5 ? h1 : 0.0004 + calib(c) * Math.exp(0.085 * (a - 5));
      const t = base * m;
      if (a < 1) return { 'complications around birth': t * 0.5, infection: t * 0.35, malnutrition: t * 0.15 };
      if (a < 5) return { infection: t * 0.55, malnutrition: t * 0.2, 'an accident': t * 0.25 };
      if (a < 40) return { 'an accident': t * 0.4, infection: t * 0.25, 'illness': t * 0.35 };
      return { 'heart disease': t * 0.35, cancer: t * 0.25, stroke: t * 0.1, 'lung infection': t * 0.15, 'old age': t * 0.15 };
    },
    death(s, cause) {
      const old = s.age >= 70;
      const text = old ? `${s.name} died at ${Math.floor(s.age)}, of ${cause}, surrounded by ${s.kids ? 'family' : 'friends'}. Looking back, it was a whole life: ${s.career || 'work of many kinds'}, ${s.partner ? 'a partner who stayed' : 'a life lived mostly their own way'}.` : `${s.name} died at ${Math.floor(s.age)} of ${cause}. ${s.age < 5 ? 'Around the world, far too many children still die this young of causes that are preventable.' : 'A life cut shorter than anyone wished.'}`;
      return { text };
    },
    eventRate: (s) => (s.age < 3 ? 0.15 : 0.35),
    stats: (s) => [['Country', s.country], ['Education', EDU[s.edu]], ['Career', s.career || 'None'], ['Partner', s.partner ? 'Yes' : 'No'], ['Children', s.kids]],
    meters: (s) => [['Health', s.n.health, 'g'], ['Wellbeing', s.n.joy, 'y'], ['Money', s.n.money, 'b'], ['Friends', s.n.friends, 'p'], ['Skills', s.n.skills, 'o']],
    info(s) { const b = s.born; return [['Country', s.country], ['Setting', b.env], ['Income rank in country', `top ${Math.max(1, 100 - b.pct)}%`], ['Healthcare access', b.hc > 65 ? 'Good' : b.hc > 40 ? 'Moderate' : 'Limited'], ['Education', EDU[s.edu]], ['Career', s.career || 'None yet'], ['Partner', s.partner || 'None'], ['Children', s.kids]]; },
    milestones: [
      { id: 'steps', when: (s) => s.age >= 1, fx: (s) => say(s, `${s.name} took first steps. The household cheered, whatever else the year held.`, { tone: 'joy' }) },
      { id: 'school', when: (s) => s.age >= 6, fx: (s, R) => {
        const p = cl(0.35 + s.born.secP * 0.6 + (s.born.pct - 50) / 250, 0.1, 0.99);
        if (R.chance(p)) { s.edu = 1; N(s, 'skills', 12); say(s, `${s.name} started school with a worn bag and big questions.`, { tone: 'joy' }); }
        else { N(s, 'skills', 2); say(s, `School was too far, too costly or too busy a luxury: ${s.name} spent the days helping at home and learning from neighbours instead.`, { tone: 'hard' }); } } },
      { id: 'talent', when: (s) => s.age >= 9, fx: (s) => say(s, `${s.name} discovered a gift for ${s.talent}. Whether it would ever become more than a pastime depended on who noticed.`, { tone: 'joy' }) },
      { id: 'mentor', when: (s) => s.age >= 12 && s.edu >= 1, fx: (s, R) => { if (R.chance(0.5)) { flag(s, 'mentor', 'A teacher noticed your effort and quietly pushed you to keep going.'); s.grades = cl(s.grades + 0.12, 0, 1); N(s, 'skills', 8); } else say(s, 'A crowded classroom, a hard exam, a friend who made it bearable.', { tone: 'calm' }); } },
      { id: 'secondary', when: (s) => s.age >= 13, fx: (s, R) => {
        if (s.edu === 1 && R.chance(cl(s.born.secP * 0.8 + (s.born.pct - 50) / 300 + s.grades * 0.15, 0.08, 0.97))) { s.edu = 2; say(s, 'Secondary school opened a bigger world.', { tone: 'calm' }); }
        else if (s.edu === 1) say(s, 'The family needed an income more than a classroom. School ended early.', { tone: 'hard' }); } },
      { id: 'job', when: (s) => s.age >= 22 && !s.career && s.done.d18, fx: (s, R) => {
        const rich = ['engineer', 'nurse', 'accountant', 'designer', 'software developer', 'teacher', 'laboratory technician'];
        const mid = ['electrician', 'shop manager', 'driver', 'technician', 'cook', 'office clerk', 'nurse assistant'];
        const low = ['farm worker', 'market trader', 'builder', 'domestic worker', 'factory worker', 'street vendor', 'fisher'];
        const pool = s.edu >= 4 ? rich : s.edu >= 2 ? (s.born.urban ? mid : low.concat(mid)) : low;
        s.career = R.pick(pool); N(s, 'money', 10); say(s, `${s.name} found work as a ${s.career}. The pay and hours depended far more on where than on how hard.`, { tone: 'calm' }); } },
      { id: 'scare', when: (s) => s.age >= 52, fx: (s, R) => { if (R.chance(0.6)) { N(s, 'health', -12); s.mods.h *= s.born.hc > 55 ? 1.0 : 1.12; say(s, `A health scare in middle age. ${s.born.hc > 55 ? 'Good care caught it early.' : 'Care was far away and costly, and it took a toll.'}`, { tone: 'hard' }); } } },
      { id: 'grand', when: (s) => s.age >= 68 && s.kids > 0, fx: (s) => say(s, 'A grandchild climbed onto your lap and asked for a story. You had plenty.', { tone: 'joy' }) },
    ],
    decisions: [
      { id: 'd14', when: (s) => s.age >= 14, title: 'A turning year', text: (s) => `${s.name} is fourteen. The year ahead will set habits that last.`, options: [
        { k: 'study', label: 'Study hard', hint: 'Better grades, less free time', bias: { caution: 1 }, fx: (s) => { s.grades = cl(s.grades + 0.15, 0, 1); N(s, 'skills', 8); N(s, 'joy', -4); say(s, 'You buried yourself in books. It cost evenings and paid in confidence.', { tone: 'calm' }); } },
        { k: 'earn', label: 'Help the family earn', hint: 'Money now, schooling later', bias: { caution: 0.5 }, fx: (s) => { N(s, 'money', 8); s.grades = cl(s.grades - 0.08, 0, 1); say(s, 'You worked beside your family. The household breathed easier.', { tone: 'calm' }); } },
        { k: 'passion', label: 'Follow your passion', hint: 'Skill grows, grades may slip', bias: { curious: 1, bold: 0.5 }, fx: (s) => { s.talentLvl = cl(s.talentLvl + 0.2, 0, 1); N(s, 'joy', 8); say(s, `Every spare hour went to ${s.talent}. It started to feel like yours.`, { tone: 'joy' }); } },
        { k: 'friends', label: 'Invest in friends', hint: 'Bonds that last decades', bias: { social: 1 }, fx: (s) => { N(s, 'friends', 18); N(s, 'joy', 6); flag(s, 'crew', 'A group of friends made at fourteen became the people you called for the rest of your life.'); } },
      ] },
      { id: 'd18', when: (s) => s.age >= 18, title: 'Eighteen', text: (s) => `${s.name} turns eighteen in ${s.country}. Options depend on money, grades and what is available. None are guaranteed.`, options: [
        { k: 'uni', label: 'Apply to university', hint: 'Needs secondary school, grades and a place', when: (s) => s.edu >= 2, bias: { curious: 1, caution: 0.4 }, fx: (s, R) => {
          const p = cl(0.15 + s.grades * 0.5 + s.born.terP * 0.4 + (LE.hasFlag(s, 'mentor') ? 0.15 : 0) + (s.born.pct - 50) / 300, 0.04, 0.95);
          if (R.chance(p)) { s.edu = 4; s.debt = s.born.country.gdp > 20000 ? 1 : 0; N(s, 'skills', 20); N(s, 'money', -6); say(s, `${s.name} got a place at university.${LE.hasFlag(s, 'mentor') ? '' : ''}`, { tone: 'joy', because: LE.hasFlag(s, 'mentor') ? 'mentor' : null }); }
          else { say(s, 'The place did not come, because of grades, money or too few seats. A door closed; others remain.', { tone: 'hard' }); } } },
        { k: 'voc', label: 'Vocational training', hint: 'A skill and an income sooner', bias: { caution: 0.6 }, fx: (s) => { s.edu = Math.max(s.edu, 3); N(s, 'skills', 14); say(s, 'You trained for a trade that people always need.', { tone: 'calm' }); } },
        { k: 'work', label: 'Start working', hint: 'Income now', bias: { bold: 0.3 }, fx: (s) => { N(s, 'money', 10); say(s, 'You went straight to work and learned on the job.', { tone: 'calm' }); } },
        { k: 'travel', label: 'Travel first', hint: 'Experience, little money', bias: { bold: 1, curious: 0.8 }, fx: (s) => { N(s, 'joy', 14); N(s, 'friends', 6); N(s, 'money', -8); say(s, 'You went out into the world with little money and a lot of curiosity.', { tone: 'joy' }); } },
      ] },
      { id: 'love', when: (s) => s.age >= 26, title: 'Someone special', text: 'Someone has come into your life who makes ordinary days feel different.', options: [
        { k: 'commit', label: 'Commit', hint: 'Build a life together', bias: { social: 1, caution: 0.3 }, fx: (s, R) => { s.partner = R.pick(NAMES); N(s, 'joy', 14); say(s, `You built a life with ${s.partner}.`, { tone: 'joy' }); if (R.chance(cl(0.85 - (s.born.country.cbr < 12 ? 0.25 : 0), 0.3, 0.9))) { s.kids = R.int(1, Math.max(1, Math.round(s.born.country.cbr / 12))); say(s, s.kids === 1 ? 'A child arrived and rearranged everything.' : `${s.kids} children arrived, one after another.`, { tone: 'joy' }); } } },
        { k: 'career', label: 'Focus on work first', hint: 'Money and skills, quieter heart', bias: { caution: 0.8 }, fx: (s) => { N(s, 'skills', 8); N(s, 'money', 8); N(s, 'joy', -4); say(s, 'You said not yet. Work grew; the question stayed.', { tone: 'calm' }); } },
        { k: 'free', label: 'Stay independent', hint: 'Friends, freedom', bias: { bold: 0.5 }, fx: (s) => { N(s, 'friends', 10); N(s, 'joy', 4); say(s, 'You chose your own pace and a wide circle of friends.', { tone: 'calm' }); } },
      ] },
      { id: 'move', when: (s) => s.age >= 38, title: 'A crossroads', text: (s) => `Years in, ${s.name} wonders about a different path.`, options: [
        { k: 'stay', label: 'Stay and deepen roots', hint: 'Stability', bias: { caution: 1 }, fx: (s) => { N(s, 'joy', 6); N(s, 'friends', 6); say(s, 'You stayed, and the community stayed with you.', { tone: 'calm' }); } },
        { k: 'abroad', label: 'Move overseas', hint: 'Higher pay, far from home. Hard to undo', irrev: true, bias: { bold: 1, curious: 0.6 }, fx: (s, R) => { const ok = R.chance(0.65); N(s, 'money', ok ? 22 : -8); N(s, 'friends', -14); N(s, 'joy', ok ? 4 : -6); s.mods.h *= ok ? 0.95 : 1.05; say(s, ok ? 'The move paid off, in money if not always in belonging.' : 'It was harder than it looked. Work was scarce and home was far.', { tone: ok ? 'turn' : 'hard', turn: true }); } },
        { k: 'biz', label: 'Start something of your own', hint: 'Risky, rewarding', bias: { bold: 1 }, fx: (s, R) => { const ok = R.chance(0.45 + s.n.skills / 400); N(s, 'money', ok ? 18 : -14); N(s, 'joy', ok ? 8 : -4); say(s, ok ? 'It worked: slowly, then all at once.' : 'It folded in the second year. You learned more than money could buy.', { tone: ok ? 'joy' : 'hard', turn: true }); } },
        { k: 'care', label: 'Care for family', hint: 'Love, and a toll on money', bias: { social: 1 }, fx: (s) => { N(s, 'joy', 8); N(s, 'money', -8); N(s, 'friends', 4); say(s, 'You made room for the people who needed you.', { tone: 'joy' }); } },
      ] },
      { id: 'retire', when: (s) => s.age >= 64, title: 'Retirement', text: 'The working years are ending, or could.', options: [
        { k: 'retire', label: 'Retire', hint: 'Rest, a smaller income', bias: { caution: 0.8 }, fx: (s) => { N(s, 'joy', 10); N(s, 'money', -10); s.mods.h *= 0.98; say(s, 'You stopped work and discovered how many hours a day has.', { tone: 'joy' }); } },
        { k: 'work', label: 'Keep working', hint: 'Income and purpose', bias: { bold: 0.4 }, fx: (s) => { N(s, 'money', 6); N(s, 'joy', -2); say(s, 'You kept going, because the work still mattered.', { tone: 'calm' }); } },
        { k: 'part', label: 'Part time and teach', hint: 'A bit of both', bias: { social: 0.8, curious: 0.5 }, fx: (s) => { N(s, 'joy', 8); N(s, 'friends', 6); say(s, 'You passed on what you knew, for fewer hours and more meaning.', { tone: 'joy' }); } },
      ] },
    ],
    events: [
      { id: 'friend', w: 3, when: (s) => s.age >= 5 && s.age < 60, tone: 'joy', fx: (s) => { N(s, 'friends', 8); N(s, 'joy', 4); say(s, 'A new friend, over something small, who became something large.', { tone: 'joy' }); } },
      { id: 'illness', w: 2, tone: 'hard', when: (s) => s.age >= 2, wf: (s) => 1 + Math.max(0, 55 - s.born.hc) / 40, fx: (s, R) => { N(s, 'health', -14); s.mods.h *= s.born.hc > 55 ? 1.0 : 1.04; say(s, `A bad illness. ${s.born.hc > 55 ? 'A clinic was near, and it passed.' : 'The nearest care was far and costly, and recovery was slow.'}`, { tone: 'hard' }); } },
      { id: 'money', w: 2, tone: 'hard', when: (s) => s.age >= 18 && s.age < 66, fx: (s) => { N(s, 'money', -12); N(s, 'joy', -5); say(s, 'A hard year financially: prices, a lost job, an unexpected bill.', { tone: 'hard' }); } },
      { id: 'win', w: 2, when: (s) => s.age >= 16 && s.age < 70, tone: 'joy', fx: (s) => { N(s, 'money', 8); N(s, 'joy', 8); N(s, 'skills', 6); say(s, `Your ${s.talent} earned recognition: a prize, a shout-out, a slice of pride.`, { tone: 'joy' }); } },
      { id: 'festival', w: 3, when: (s) => true, tone: 'joy', fx: (s) => { N(s, 'joy', 6); say(s, `A festival in ${s.born.country.name}: food, music, everyone outside until late.`, { tone: 'joy' }); } },
      { id: 'kind', w: 1.5, when: (s) => s.age >= 8, tone: 'joy', fx: (s, R) => { if (!LE.hasFlag(s, 'kindness')) { flag(s, 'kindness', 'A stranger helped when you most needed it, and you remembered.'); } else say(s, 'You passed on a favour, because someone once did the same for you.', { tone: 'joy', because: 'kindness' }); N(s, 'joy', 6); } },
      { id: 'loss', w: 1.5, tone: 'hard', when: (s) => s.age >= 20, fx: (s) => { N(s, 'joy', -10); say(s, 'Someone you loved died. Grief arrived slowly and stayed a long time.', { tone: 'hard' }); } },
      { id: 'storm', w: 1, tone: 'hard', when: (s) => s.age >= 4, fx: (s) => { N(s, 'money', -8); say(s, `A flood, storm or heatwave hit ${s.born.place}. People helped each other rebuild.`, { tone: 'hard' }); } },
      { id: 'skill', w: 2, when: (s) => s.age >= 14 && s.age < 70, tone: 'calm', fx: (s) => { N(s, 'skills', 8); say(s, 'You learned something new that opened a small door.', { tone: 'calm' }); } },
      { id: 'opportunity', w: 2, when: (s) => s.age >= 20 && s.age < 60 && s.career, tone: 'joy', wf: (s) => (LE.hasFlag(s, 'crew') ? 1.8 : 1), fx: (s) => { N(s, 'money', 10); say(s, LE.hasFlag(s, 'crew') ? 'An old friend from your crew offered you a better job.' : 'A better job came up, through work and a bit of luck.', { tone: 'turn', turn: true, because: LE.hasFlag(s, 'crew') ? 'crew' : null }); } },
    ],
  };

  LE._h = { cl, NAMES, PETNAMES, SIG, EDU };

  // =============== COMPANION ANIMALS (dog, cat) ===============
  const VAR = {
    dog: { stages: ['Newborn puppy', 'Puppy', 'Adolescent', 'Adult', 'Senior'], noun: 'puppy', litter: [5.5, 1.6], senK: 0.30, senA: 0.004,
      H: { home: [0.35, 0.05, 0.025, 0.012], shelter: [0.8, 0.28, 0.14, 0.1], stray: [1.7, 1.1, 0.65, 0.42] }, adultTo: 8, seniorTo: 8 },
    cat: { stages: ['Newborn kitten', 'Kitten', 'Adolescent', 'Adult', 'Senior'], noun: 'kitten', litter: [4, 1.2], senK: 0.27, senA: 0.0025,
      H: { home: [0.4, 0.08, 0.045, 0.025], shelter: [0.8, 0.28, 0.16, 0.12], stray: [1.9, 1.35, 0.85, 0.6] }, adultTo: 10, seniorTo: 10 },
  };
  const cv = (s) => VAR[s.sp];
  const cStage = (s) => { const a = s.age, v = cv(s); return v.stages[a < 0.17 ? 0 : a < 1 ? 1 : a < 2 ? 2 : a < v.adultTo ? 3 : 4]; };
  const homeSet = (s, h, why) => { s.home = h; s.n.safety = h === 'home' ? 85 : h === 'shelter' ? 55 : 25; };

  M.companion = {
    dt: () => 1 / 12,
    stage: cStage,
    fmtAge: (a) => (a < 2 ? `${Math.round(a * 12)} months` : `${a.toFixed(1)} years`),
    birth(s, R, avoid) {
      const v = cv(s), dog = s.sp === 'dog';
      let c, n = 0; do { c = R.wpick(LE.countries, (y) => y.births); n++; } while (avoid && c.iso === avoid && n < 40);
      const pHome = 0.25 + 0.5 * cl(Math.log10(Math.max(1, c.gdp) / 500) / 1.7, 0, 1);
      const home = R.chance(pHome) ? 'home' : R.chance(0.2) ? 'shelter' : 'stray';
      s.traits = { bold: R.r(), caution: R.r(), social: R.r(), curious: R.r() };
      const lit = Math.max(2, Math.round(v.litter[0] + v.litter[1] * R.norm()));
      const anc = dog ? R.pick(['mixed ancestry, small', 'mixed ancestry, medium', 'mixed ancestry, large', 'Labrador-type', 'Shepherd-type', 'Terrier-type', 'village-dog type']) : R.pick(['tabby', 'tortoiseshell', 'black', 'ginger', 'white', 'grey', 'bicolour']);
      const big = /large|Labrador|Shepherd/.test(anc), small = /small|Terrier/.test(anc);
      s.size = dog ? (big ? 1.2 : small ? 0.85 : 1) : 1;
      s.name = R.pick(PETNAMES); s.sex = R.chance(0.5) ? 'female' : 'male';
      s.n = { health: cl(80 + R.range(-5, 15)), food: 70, calm: 60, trust: home === 'home' ? 55 : 22, bond: home === 'home' ? 45 : 5, skill: 5, energy: 80, safety: 50 };
      homeSet(s, home);
      s.litter = lit; s.mother = R.pick(PETNAMES);
      s.born = { key: c.iso, place: `${home === 'home' ? 'a household' : home === 'shelter' ? 'a shelter' : 'the streets'} in ${c.name}`, country: c, env: home === 'stray' ? 'Streets and alleys' : home === 'shelter' ? 'Animal shelter' : 'Family home', anc, home0: home, story: '' };
      s.family = [{ rel: 'Mother', name: s.mother, note: '' }, ...Array.from({ length: lit - 1 }, () => ({ rel: 'Littermate', name: R.pick(PETNAMES), note: '' }))];
      const where = home === 'home' ? `a warm corner of a family home in ${c.name}` : home === 'shelter' ? `a shelter in ${c.name}` : `a gap under a wall on a street in ${c.name}`;
      s.born.story = `${s.name} was born, a ${s.sex} ${anc} ${v.noun}, one of ${lit} in ${where}. Mother ${s.mother} was the whole world. Where you land first (a home, a shelter, a street) is decided by luck, not by you.`;
    },
    tick(s, dt, R) {
      const home = s.home;
      N(s, 'food', home === 'home' ? (R.range(-6, 14)) : home === 'shelter' ? R.range(-8, 10) : R.range(-14, 10), 0, 100);
      N(s, 'health', s.n.food > 40 ? 1.2 : -3);
      N(s, 'calm', s.n.safety > 60 ? 1 : -1.5);
      N(s, 'energy', R.range(-10, 12));
      if (home === 'home') N(s, 'bond', 0.4); N(s, 'trust', s.n.bond > 30 ? 0.3 : 0);
    },
    hazard(s) {
      const v = cv(s), a = s.age, st = a < 0.17 ? 0 : a < 1 ? 1 : a < 2 ? 2 : 3;
      let base = v.H[s.home][st];
      const sen = v.senA * Math.exp(v.senK * (s.sp === 'dog' ? a * s.size : a));
      const m = s.mods.h * (1 + Math.max(0, 45 - s.n.health) / 40) * (s.n.food < 20 ? 1.3 : 1);
      const hz = { illness: base * m * 0.45, 'cold, hunger and hard weather': base * m * (s.home === 'stray' ? 0.3 : 0.1), 'an accident': base * m * 0.25, 'old age': sen * m };
      if (s.home === 'stray') hz['traffic'] = base * m * 0.2;
      return hz;
    },
    death(s, cause) {
      const dog = s.sp === 'dog', end = s.age >= 10;
      const q = s.home === 'home' ? ` ${s.name} was never alone at the end.` : s.home === 'shelter' ? ` Volunteers sat with ${s.name}.` : ` Some kind people along the street remembered ${s.name}.`;
      return { text: `${s.name} died at ${M.companion.fmtAge(s.age)}, of ${cause}.${q}` };
    },
    eventRate: () => 0.9,
    stats: (s) => [['Home at the end', s.home], ['Trust in people', Math.round(s.n.trust)], ['Bond', Math.round(s.n.bond)], [s.sp === 'dog' ? 'Training' : 'Hunting skill', Math.round(s.n.skill)]],
    meters: (s) => [['Health', s.n.health, 'g'], ['Fed', s.n.food, 'o'], ['Energy', s.n.energy, 'y'], ['Calm', s.n.calm, 'b'], ['Trust in people', s.n.trust, 'p'], [s.sp === 'dog' ? 'Attachment' : 'Bond', s.n.bond, 'r'], [s.sp === 'dog' ? 'Training' : 'Hunting skill', s.n.skill, 'o'], ['Safety', s.n.safety, 'b']],
    info: (s) => [['Home', s.home === 'home' ? 'Family home' : s.home === 'shelter' ? 'Animal shelter' : 'Streets'], ['Ancestry', s.born.anc], ['Siblings', s.litter - 1], ['Mother', s.mother], ['Country', s.born.country.name]],
    milestones: [
      { id: 'eyes', when: (s) => s.age >= 0.06, fx: (s) => say(s, `${s.name}'s eyes opened on a blurry world made of warmth, smell and ${s.mother}'s voice.`, { tone: 'joy' }) },
      { id: 'wean', when: (s) => s.age >= 0.15, fx: (s) => say(s, `Weaning: ${s.name} took the first solid food.${s.home === 'stray' ? ' Meals were whatever could be found.' : ''}`, { tone: 'calm' }) },
      { id: 'sep', when: (s) => s.age >= 0.2 && s.home !== 'stray', fx: (s, R) => { if (s.home === 'shelter') say(s, `The shelter staff kept ${s.name} warm and counted the days until adoption.`, { tone: 'calm' }); else say(s, `Littermates drifted into new homes; ${s.name} stayed with a family.`, { tone: 'calm' }); } },
    ],
    decisions: [
      { id: 'stranger', when: (s) => s.home !== 'home' && s.age >= 0.3 && s.age < 3, title: 'A stranger crouches', text: (s) => `A person stops and puts something down that smells wonderful. ${s.name} is hungry and unsure.`, options: [
        { k: 'approach', label: (s) => (s.sp === 'dog' ? 'Creep close and take it' : 'Edge forward and eat'), hint: 'Trust may grow', bias: { bold: 1, social: 0.6 }, fx: (s, R) => { N(s, 'food', 30); N(s, 'trust', 22); if (R.chance(0.8)) { flag(s, 'seed', 'A stranger fed you, and you learned that some people are safe.'); } else say(s, 'The stranger moved too fast and you ran, hungry but alive.', { tone: 'hard' }); } },
        { k: 'wait', label: 'Wait until they leave', hint: 'Safe, hungry', bias: { caution: 1 }, fx: (s) => { N(s, 'food', 8); N(s, 'safety', 4); say(s, 'You waited, ate when they were gone, and watched from behind a wall.', { tone: 'calm' }); } },
        { k: 'follow', label: 'Follow them a little way', hint: 'Bold. Risky', bias: { bold: 1, curious: 0.8 }, fx: (s, R) => { N(s, 'trust', 14); N(s, 'safety', -8); N(s, 'energy', -10); if (R.chance(0.5)) flag(s, 'seed', 'You followed a kind stranger down the street, and they remembered you.'); else say(s, 'You lost them at a busy crossing and found your way back at dusk.', { tone: 'hard' }); } },
        { k: 'guard', label: (s) => (s.sp === 'dog' ? 'Guard the food and growl' : 'Hiss and keep the spot'), hint: 'Keeps your place', bias: { bold: 0.4 }, fx: (s) => { N(s, 'food', 10); N(s, 'trust', -6); N(s, 'calm', -4); say(s, 'You kept what was yours. Trust has to be earned in both directions.', { tone: 'calm' }); } },
      ] },
      { id: 'guests', when: (s) => s.home === 'home' && s.age >= 0.4, title: 'Visitors at the door', text: (s) => `New voices, new smells, a doorbell. ${s.name} has to decide who these people are.`, options: [
        { k: 'greet', label: 'Greet them', hint: 'Social, hopeful', bias: { social: 1, bold: 0.4 }, fx: (s) => { N(s, 'trust', 12); N(s, 'bond', 6); say(s, 'The visitors laughed and scratched exactly the right place.', { tone: 'joy' }); } },
        { k: 'hide', label: 'Watch from a hiding place', hint: 'Cautious', bias: { caution: 1 }, fx: (s) => { N(s, 'calm', 4); N(s, 'trust', 3); say(s, 'You watched from the doorway until the new smells became familiar.', { tone: 'calm' }); } },
        { k: 'alert', label: (s) => (s.sp === 'dog' ? 'Sound the alarm' : 'Stand your ground'), hint: 'Protective', bias: { bold: 0.8 }, fx: (s) => { N(s, 'bond', 4); N(s, 'calm', -4); say(s, 'You announced them to the household. The household was pleased.', { tone: 'calm' }); } },
      ] },
      { id: 'gate', when: (s) => s.age >= 0.7, title: 'The gate is open', text: (s) => (s.home === 'home' ? 'Someone forgot to latch the gate. The street smells like everything at once.' : 'A new street opens up, full of smells.'), options: [
        { k: 'explore', label: 'Explore the street', hint: 'Curiosity, risk', bias: { curious: 1, bold: 0.7 }, fx: (s, R) => { N(s, 'energy', -14); if (R.chance(0.7)) { s.n.skill = cl(s.n.skill + 8); say(s, 'You came back with a thousand new smells and a friend of your own species.', { tone: 'joy' }); } else { N(s, 'health', -10); N(s, 'calm', -10); say(s, 'A scare near a road. You came home shaking and a bit wiser.', { tone: 'hard' }); } } },
        { k: 'stay', label: 'Stay by the gate and watch', hint: 'Safe', bias: { caution: 1 }, fx: (s) => { N(s, 'calm', 6); say(s, 'You watched the world from the threshold.', { tone: 'calm' }); } },
        { k: 'follow', label: (s) => (s.sp === 'dog' ? 'Follow your person' : 'Slip out and come back at dusk'), hint: 'Bond', bias: { social: 1 }, fx: (s) => { N(s, 'bond', 8); say(s, s.sp === 'dog' ? 'You never let them out of sight and they noticed.' : 'You roamed all afternoon and then came back at dusk, exactly when you decided to.', { tone: 'joy' }); } },
      ] },
      { id: 'train', when: (s) => s.sp === 'dog' && s.home !== 'stray' && s.age >= 0.6, title: 'Training day', text: 'Treats, a clicker and a patient voice.', options: [
        { k: 'eager', label: 'Work eagerly', hint: 'Skill and bond', bias: { social: 1, curious: 0.5 }, fx: (s) => { s.n.skill = cl(s.n.skill + 30); N(s, 'bond', 8); say(s, 'You learned sit, stay and come, mostly for the treats.', { tone: 'joy' }); } },
        { k: 'play', label: 'Treat it as a game', hint: 'Joy, slower progress', bias: { bold: 0.5 }, fx: (s) => { s.n.skill = cl(s.n.skill + 14); N(s, 'bond', 12); say(s, 'You turned training into play and nobody minded.', { tone: 'joy' }); } },
        { k: 'ignore', label: 'Ignore it, sniff something', hint: 'Independent', bias: { curious: 0.8 }, fx: (s) => { s.n.skill = cl(s.n.skill + 4); say(s, 'You had better things to smell.', { tone: 'calm' }); } },
      ] },
      { id: 'hunt', when: (s) => s.sp === 'cat' && s.age >= 0.5, title: 'Something moves in the grass', text: 'A flick of tail, a stir of wings. The old instinct wakes up.', options: [
        { k: 'stalk', label: 'Stalk it', hint: 'Skill, adrenaline', bias: { bold: 1, curious: 0.6 }, fx: (s, R) => { s.n.skill = cl(s.n.skill + 18); N(s, 'food', 10); say(s, 'Belly low, tail still, then a lightning pounce. You were good at this.', { tone: 'joy' }); } },
        { k: 'watch', label: 'Watch from the sill', hint: 'Calm', bias: { caution: 1 }, fx: (s) => { N(s, 'calm', 6); say(s, 'You watched it, tail twitching, content to be a spectator.', { tone: 'calm' }); } },
        { k: 'play', label: 'Chase a toy instead', hint: 'Bond with people', bias: { social: 1 }, fx: (s) => { N(s, 'bond', 10); say(s, 'A feather on a string. Your person was very proud.', { tone: 'joy' }); } },
      ] },
      { id: 'territory', when: (s) => s.age >= 1.2, title: 'A rival on the fence', text: (s) => (s.sp === 'dog' ? 'Another dog is staring at the yard.' : 'A strange cat sits on the wall that is yours.'), options: [
        { k: 'confront', label: 'Hold your ground', hint: 'Bold', bias: { bold: 1 }, fx: (s, R) => { if (R.chance(0.65)) { N(s, 'safety', 6); say(s, 'You made yourself big. The rival left.', { tone: 'calm' }); } else { N(s, 'health', -12); N(s, 'calm', -8); say(s, 'A scuffle: scrapes and wounded pride.', { tone: 'hard' }); } } },
        { k: 'friend', label: 'Offer a sniff and make peace', hint: 'Social', bias: { social: 1 }, fx: (s) => { N(s, 'calm', 6); N(s, 'trust', 4); say(s, 'You made a friend instead of an enemy. It happens more than people think.', { tone: 'joy' }); } },
        { k: 'avoid', label: 'Give way', hint: 'Safe', bias: { caution: 1 }, fx: (s) => { N(s, 'calm', 2); say(s, 'You gave up the wall for peace. There are other walls.', { tone: 'calm' }); } },
      ] },
      { id: 'service', when: (s) => s.sp === 'dog' && s.home === 'home' && s.n.skill >= 40 && s.n.bond >= 55 && s.age >= 1.5, title: 'A new kind of job', text: 'People notice that you are calm, clever and devoted. A training programme invites you.', options: [
        { k: 'work', label: 'Train as an assistance dog', hint: 'Purpose, hard work, a steady life', irrev: true, bias: { social: 1, caution: 0.4 }, fx: (s) => { s.work = true; N(s, 'bond', 10); s.mods.h *= 0.9; flag(s, 'service', 'You became an assistance dog, and a person you helped trusted you with their daily life.'); } },
        { k: 'family', label: 'Stay a family dog', hint: 'Play and home', bias: { curious: 0.4 }, fx: (s) => { N(s, 'calm', 6); say(s, 'You stayed as the family dog, which is its own full-time job.', { tone: 'joy' }); } },
      ] },
      { id: 'change', when: (s) => s.home === 'home' && s.age >= 4.5 && s.age < 9, title: 'The household changes', text: 'A baby arrives, or a move, or a new routine. Everything smells different.', options: [
        { k: 'adapt', label: 'Adapt calmly', hint: 'Stable', bias: { caution: 0.7, social: 0.6 }, fx: (s) => { N(s, 'calm', 4); N(s, 'bond', 6); say(s, 'You made room for the new routine, and the new family member made room for you.', { tone: 'joy' }); } },
        { k: 'protect', label: 'Stay close and watchful', hint: 'Protective', bias: { bold: 0.6 }, fx: (s) => { N(s, 'bond', 10); N(s, 'calm', -4); say(s, 'You took your new job seriously: guardian of the nursery.', { tone: 'joy' }); } },
        { k: 'sulk', label: 'Retreat and sulk', hint: 'Stress', bias: { caution: 0.8 }, fx: (s, R) => { N(s, 'calm', -10); N(s, 'bond', -4); if (R.chance(0.1)) { homeSet(s, 'shelter'); say(s, 'It did not work out, and you ended up at a shelter. It happens to too many animals.', { tone: 'hard', turn: true }); } else say(s, 'It took weeks to feel like yours again.', { tone: 'calm' }); } },
      ] },
      { id: 'senior', when: (s) => s.age >= cv(s).seniorTo, title: 'Slower days', text: 'The joints ache. Mornings are slow and the sun puts you to sleep.', options: [
        { k: 'sun', label: 'Take the sunny spot', hint: 'Comfort', bias: { caution: 1 }, fx: (s) => { N(s, 'calm', 10); N(s, 'health', 4); say(s, 'You napped in the sun and nobody asked you for anything.', { tone: 'joy' }); } },
        { k: 'walk', label: 'Keep up your walks', hint: 'Joy, a bit of ache', bias: { bold: 0.8 }, fx: (s) => { N(s, 'energy', -6); N(s, 'health', 2); N(s, 'bond', 6); say(s, 'You kept walking, slower, but you were there.', { tone: 'joy' }); } },
      ] },
    ],
    events: [
      { id: 'toy', w: 2, tone: 'joy', when: (s) => s.home === 'home', fx: (s) => { N(s, 'calm', 6); N(s, 'bond', 4); say(s, 'A new toy and a long game in the yard.', { tone: 'joy' }); } },
      { id: 'sun', w: 2, tone: 'calm', when: (s) => s.age > 0.5, fx: (s) => { N(s, 'calm', 8); say(s, 'A long afternoon in a patch of sunlight. Nothing else mattered.', { tone: 'calm' }); } },
      { id: 'vet', w: 1.5, tone: 'calm', when: (s) => s.home === 'home', fx: (s) => { N(s, 'health', 10); s.mods.h = Math.max(0.6, s.mods.h * 0.96); say(s, 'A vet visit: a needle, a treat, a clean bill of health.', { tone: 'calm' }); } },
      { id: 'storm', w: 1, tone: 'hard', when: (s) => s.age > 0.3, fx: (s) => { N(s, 'calm', -10); say(s, s.home === 'home' ? 'Thunder. You hid under the bed until your person sat on the floor with you.' : 'A storm. You found a dry corner and waited it out.', { tone: 'hard' }); } },
      { id: 'scraps', w: 3, tone: 'calm', when: (s) => s.home === 'stray', fx: (s) => { N(s, 'food', 24); say(s, 'A lucky find behind a market stall.', { tone: 'calm' }); } },
      { id: 'kindshop', w: 2, tone: 'joy', when: (s) => s.home === 'stray', fx: (s) => { N(s, 'food', 20); N(s, 'trust', 6); say(s, 'A shopkeeper started leaving a bowl of water out every morning.', { tone: 'joy' }); } },
      { id: 'cold', w: 1.5, tone: 'hard', when: (s) => s.home === 'stray', fx: (s) => { N(s, 'health', -10); N(s, 'calm', -6); say(s, 'A cold, wet week. You curled up under a parked cart and waited.', { tone: 'hard' }); } },
      { id: 'catch', w: 1, tone: 'calm', when: (s) => s.home === 'stray' && s.age < 6, fx: (s) => { homeSet(s, 'shelter'); say(s, 'A municipal team picked you up and took you to a shelter: warm, loud, safe enough.', { tone: 'turn', turn: true }); } },
      { id: 'rescue', w: 1, tone: 'joy', when: (s) => s.home !== 'home' && s.age < 8, wf: (s) => (LE.hasFlag(s, 'seed') ? 6 : 1) * (s.home === 'shelter' ? 2 : 1) * (s.age < 2 ? 1.5 : 1),
        fx: (s) => { homeSet(s, 'home'); N(s, 'bond', 30); N(s, 'trust', 18); s.mods.h = Math.max(0.6, s.mods.h * 0.8); const seed = LE.hasFlag(s, 'seed'); say(s, seed ? 'You walked up to someone who looked a bit like the stranger who once fed you. This time they took you home.' : 'A family walked past, stopped, and took you home.', { tone: 'turn', turn: true, because: seed ? 'seed' : null }); } },
      { id: 'friend', w: 2, tone: 'joy', when: (s) => s.age > 0.4, fx: (s) => { N(s, 'calm', 6); N(s, 'trust', 3); say(s, s.sp === 'dog' ? 'A dog down the road became your best friend.' : 'A neighbour cat started sharing your wall.', { tone: 'joy' }); } },
      { id: 'lap', w: 2, tone: 'joy', when: (s) => s.home === 'home', fx: (s) => { N(s, 'bond', 6); say(s, s.sp === 'dog' ? 'Your person came home and the whole world turned into joy.' : 'You chose your person\'s lap, entirely on your own terms.', { tone: 'joy' }); } },
    ],
  };
})(typeof window !== 'undefined' ? window : globalThis);
