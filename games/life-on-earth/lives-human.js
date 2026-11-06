// Human life, detailed edition: a year-by-year account, specific decisions, a life record and a country-aware cause of death.
// Extends the base human module in lives-a.js (birth circumstances and calibrated survival stay the same).
// Everything marked "modelled" is a game model on top of real country indicators, never a statistic about a real person.
(function (g) {
  const LE = g.LE, H = LE.modules.human, say = LE.say, flag = LE.flag, N = LE.mod, { cl, NAMES, EDU } = LE._h;
  const reg = (c) => (['PAK', 'AFG'].includes(c.iso) ? 'sa' : /Sub-Saharan/.test(c.region) ? 'ssa' : /South Asia/.test(c.region) ? 'sa' : /East Asia/.test(c.region) ? 'eap' : /Europe/.test(c.region) ? 'eca' : /Latin/.test(c.region) ? 'lac' : /Middle East|North Africa/.test(c.region) ? 'mena' : 'na');
  const MEALS = { ssa: ['maize porridge with greens', 'rice and beans', 'cassava with stew', 'millet porridge and fish'], sa: ['rice and lentils', 'flatbread with vegetables', 'rice and curry', 'chapati and dal'], eap: ['rice with vegetables and fish', 'noodle soup', 'steamed buns', 'rice porridge with pickles'], eca: ['bread and soup', 'potatoes and sausage', 'buckwheat and stew', 'pasta with sauce'], lac: ['rice and beans', 'tortillas and eggs', 'corn cakes and cheese', 'chicken and rice'], mena: ['bread and stew', 'rice with chicken', 'flatbread with beans', 'couscous with vegetables'], na: ['sandwiches', 'pasta', 'tacos', 'cereal and fruit'] };
  const MALARIA = (s) => ['ssa', 'sa'].includes(s.reg) && /Low|Lower/.test(s.born.country.income);
  const rnd = (R, a) => R.pick(a);
  const fill = (s, t) => t.replace(/\{n\}/g, s.name).replace(/\{meal\}/g, s.meal).replace(/\{job\}/g, s.career || 'work').replace(/\{place\}/g, s.born.country.name).replace(/\{home\}/g, s.home);
  const tierText = (s) => (s.born.pct < 15 ? 'one of the poorest families' : s.born.pct < 40 ? 'a family of modest means' : s.born.pct < 75 ? 'an ordinary family' : 'a well-off family');
  const rec = (s) => s.rec;

  // ---------------- birth additions ----------------
  const baseBirth = H.birth;
  H.birth = function (s, R, avoid) {
    baseBirth.call(this, s, R, avoid);
    const c = s.born.country; s.reg = reg(c); s.rec = { jobs: [], edu: [], partners: [], kids: [], grand: 0, moves: [], notes: [] };
    s.tier = s.born.pct < 30 ? 'poor' : s.born.pct > 75 ? 'rich' : 'mid';
    s.meal = R.pick(MEALS[s.reg]); s.n.stress = 20; s.n.family = 70; s.enrolled = false; s.schoolEnd = 99; s.field = null; s.grand = 0; s.alive_parents = true;
    s.home = s.tier === 'poor' ? (s.born.urban ? 'a crowded one-room flat' : 'a small house of mud brick and timber') : s.tier === 'rich' ? 'a comfortable house with a room of your own' : (s.born.urban ? 'a modest apartment' : 'a simple family house');
    s.born.story = s.born.story.replace(`${c.name}, ${c.name}`, c.name);
    s.born.story += ` Home was ${s.home}, and the usual meal was ${s.meal}.`;
  };

  // meters drift back toward ordinary levels so one good year does not pin them at 100
  const baseTick = H.tick;
  H.tick = function (s, dt, R) { baseTick.call(this, s, dt, R); N(s, 'family', -0.7); N(s, 'friends', -0.5); N(s, 'joy', (55 - s.n.joy) * 0.1); N(s, 'stress', (25 - s.n.stress) * 0.12); };

  // ---------------- survival: same calibrated hazard, country-aware causes ----------------
  const baseHaz = H.hazard;
  function causes(s) {
    const lo = /Low|Lower/.test(s.born.country.income), a = s.age, F = s.born.sex === 'girl', m = MALARIA(s), ssa = s.reg === 'ssa';
    if (a < 1) return lo ? [['neonatal complications', 3], ['pneumonia', 2], ['diarrhoeal disease', 2], ['malaria', m ? 2 : 0], ['malnutrition', 1.5]] : [['complications around birth', 3], ['a congenital condition', 2], ['sudden infant death', 1], ['an infection', 1]];
    if (a < 5) return lo ? [['pneumonia', 3], ['diarrhoeal disease', 2], ['malaria', m ? 3 : 0], ['measles', 1], ['malnutrition', 2], ['drowning', 1]] : [['a congenital condition', 2], ['childhood cancer', 1], ['an accident', 2], ['an infection', 1]];
    if (a < 40) return lo ? [['malaria', m ? 2 : 0], ['tuberculosis', 2], ['HIV/AIDS', ssa ? 2 : 0.3], ['a road accident', 2], ['violence', 1], ['pneumonia', 1.5], ['complications of childbirth', F && a > 15 ? 2 : 0], ['drowning', 1]] : [['a road accident', 3], ['cancer', 2], ['an overdose', 1], ['heart disease', 1], ['a serious illness', 1]];
    if (a < 65) return lo ? [['stroke', 2], ['heart disease', 2], ['tuberculosis', 1.5], ['diabetes', 1], ['liver disease', 1], ['a road accident', 1], ['pneumonia', 1]] : [['cancer', 4], ['heart disease', 3], ['stroke', 1], ['liver disease', 1], ['chronic lung disease', 1.5], ['an accident', 1]];
    return lo ? [['stroke', 3], ['heart disease', 3], ['pneumonia', 2], ['chronic kidney disease', 1.5], ['diabetes', 1.5], ['dementia', 1]] : [['dementia', 3], ['heart disease', 3], ['cancer', 3], ['stroke', 2], ['chronic lung disease', 1.5], ['a fall', 1], ['kidney disease', 1]];
  }
  H.hazard = function (s) {
    const tot = LE.sumH(baseHaz.call(this, s)), t = causes(s).filter((x) => x[1] > 0), w = t.reduce((a, x) => a + x[1], 0), o = {};
    t.forEach(([n, x]) => (o[n] = tot * x / w)); return o;
  };
  H.death = function (s, cause) {
    const a = Math.floor(s.age), young = a < 5;
    const tail = young ? ' Around the world, too many children still die this young of causes that are preventable.' : a < 40 ? ' It came far sooner than anyone expected.' : a >= 80 ? ' It was a long life, and a full one.' : '';
    return { text: `${s.name} died of ${cause} at ${a}.${tail}`, recap: H.recap(s, cause) };
  };

  // ---------------- life record ----------------
  const ord = (n) => (n === 1 ? 'one child' : `${n} children`);
  H.recap = function (s, cause) {
    const b = s.born, c = b.country, r = s.rec, out = [];
    out.push(`Born a ${b.sex} into ${tierText(s)}${b.urban ? ' in a city or town' : ' in a rural area'} in ${c.name}.`);
    out.push(r.edu.length ? r.edu.map((e) => `${e.what} at ${e.age}`).join('; ').replace(/^./, (x) => x.toUpperCase()) + '.' : 'Never attended formal school.');
    if (r.jobs.length) out.push(`Worked as ${r.jobs.map((j) => j.title).filter((v, i, a) => a.indexOf(v) === i).join(', then ')}${s.retired ? ' until retiring' : ''}.`);
    if (r.partners.length) out.push(r.partners.map((p) => (p.end === 'died' ? `Was widowed after ${Math.max(1, Math.round(p.endAge - p.from))} years with ${p.name}` : p.end === 'split' ? `Married ${p.name}; the relationship ended after ${Math.max(1, Math.round(p.endAge - p.from))} years` : `Shared ${Math.max(1, Math.floor(s.age - p.from))} years with ${p.name}`)).join('. ') + '.');
    if (r.kids.length) out.push(`Raised ${ord(r.kids.length)}.` + (r.grand ? ` Lived to see ${r.grand} grandchild${r.grand > 1 ? 'ren' : ''}.` : ''));
    if (r.moves.length) out.push(r.moves.join('. ') + '.');
    if (r.notes.length) out.push(r.notes.join(' '));
    if (cause) out.push(`Died of ${cause} at ${Math.floor(s.age)}.`);
    return out.join(' ');
  };
  H.stats = (s) => [['Country', s.country], ['Education', EDU[s.edu]], ['Career', s.career || (s.rec.jobs.length ? s.rec.jobs[s.rec.jobs.length - 1].title : 'None')], ['Partners', s.rec.partners.length], ['Children', s.rec.kids.length], ['Grandchildren', s.rec.grand]];
  H.info = function (s) { const b = s.born; return [['Country', s.country], ['Setting', b.env], ['Home', s.home], ['Income rank in country', `top ${Math.max(1, 100 - b.pct)}%`], ['Healthcare access', b.hc > 65 ? 'Good' : b.hc > 40 ? 'Moderate' : 'Limited'], ['Education', EDU[s.edu]], ['Work', s.career || (s.retired ? 'Retired' : 'None right now')], ['Partner', s.partner || 'None'], ['Children', s.rec.kids.length], ['Grandchildren', s.rec.grand]]; };
  H.meters = (s) => [['Health', s.n.health, 'g'], ['Wellbeing', s.n.joy, 'y'], ['Money', s.n.money, 'b'], ['Stress', s.n.stress, 'r'], ['Family bonds', s.n.family, 'p'], ['Friends', s.n.friends, 'o'], ['Skills', s.n.skills, 'b']];

  // ---------------- the year in review (the part that lets quiet time tell you what happened) ----------------
  const BAND = [
    [3, (s, R) => rnd(R, ['{n} learned new words every week and talked to anyone who would listen.', 'Days were naps, play and {meal}.', '{n} followed the older children everywhere and was always a step behind.', 'A year of falling over, getting up and being carried home.'])],
    [8, (s, R) => rnd(R, ['{n} played outside until someone called everyone in for {meal}.', 'The days were chores, games and endless questions.', '{n} learned the names of every neighbour and who had the best fruit tree.', 'Winter or rainy season, summer or dry, childhood had its own calendar of games.'])],
    [12, (s, R) => rnd(R, ['{n} grew fast and wore out shoes faster.', 'Friendships got serious: secret handshakes, best friends, first arguments.', 'Home was {home}, and {n} knew every corner of it.', 'Dinner was {meal} again, and {n} was always hungry for more.'])],
    [18, (s, R) => rnd(R, ['{n} was suddenly aware of everything: looks, music, what other people thought.', 'Mood swung from certain to lost and back, sometimes in one afternoon.', 'The future became a real question at the dinner table.', 'Friends mattered more than family some weeks, and less than family others.'])],
    [30, (s, R) => rnd(R, ['{n} was figuring out who to become, one decision at a time.', 'Days were full: work or study, friends, and trying to build a life.', 'Rent, plans, and a phone full of messages filled most weeks.', 'Everything seemed possible and a little too expensive.'])],
    [45, (s, R) => rnd(R, ['Life settled into a rhythm of work, family and the occasional surprise.', '{n} spent the year juggling responsibilities and trying to remember to rest.', 'The routines of {home} held together everything else.', 'Years began to blur together, and {n} made an effort to notice them.'])],
    [65, (s, R) => rnd(R, ['{n} noticed the body slowing and the mind getting clearer about what matters.', 'The calendar filled with family events, appointments and fewer deadlines.', 'Old friends were precious, and a few were gone.', 'Mornings were slow, evenings were for stories.'])],
    [200, (s, R) => rnd(R, ['{n} lived day by day, grateful for small things.', 'Most days looked the same, and each was a gift.', 'Visits from family became the highlights of the week.', 'The past felt close; the present felt precious.'])],
  ];
  function work(s, R) {
    const a = s.age;
    if (s.enrolled && a < 12) return rnd(R, ['School meant {n} sitting with ' + (s.tier === 'poor' ? 'forty classmates in one room' : 'a friendly class') + ' and learning to read properly.', 'At school {n} learned sums and songs, and sometimes got into trouble for chatting.']);
    if (s.enrolled && a < 18) return rnd(R, ['School was a mix of exams, teachers who mattered and friends who mattered more.', '{n} spent evenings on homework and mornings walking to school.']);
    if (s.enrolled) return rnd(R, ['Studies took most of the year, with deadlines, cheap meals and late nights.', 'Lectures, exams and a growing circle of friends made up the year.']);
    if (s.career) return rnd(R, [`Work as a {job} filled the days${s.n.stress > 60 ? ', and the pressure was getting to {n}' : ''}.`, 'The job ' + (s.n.money > 60 ? 'paid enough to plan ahead.' : 'barely covered the bills.'), 'Another year as a {job}: ' + rnd(R, ['colleagues came and went.', 'small wins, small frustrations.', 'the routine was predictable and the pay was too.'])]);
    if (s.retired) return rnd(R, ['Retirement meant gardening, long walks and unhurried mornings.', 'Without work, the days were {n}\'s own.']);
    if (a < 6) return null;
    if (a < 16) return rnd(R, [s.born.urban ? 'Out of school, {n} ran errands and minded younger children.' : 'Out of school, {n} worked in the fields and with the animals.', 'Without school, days were chores and whatever small jobs came along.']);
    if (a >= 12 && a < 65) return rnd(R, ['Work was hard to find, and {n} took whatever odd jobs came up.', 'Days were spent helping relatives and looking for a better chance.']);
    return null;
  }
  function mood(s, R) {
    const p = [];
    if (s.n.health < 35) p.push('Health was poor: ' + rnd(R, ['aches, tiredness and too many doctor visits.', 'a cough that wouldn\'t go away and a body that felt older than it was.']));
    else if (s.n.health > 85 && s.age < 60) p.push(rnd(R, ['{n} felt strong and healthy.', 'Energy was never a problem this year.']));
    if (s.n.money < 20) p.push('Money was tight: ' + rnd(R, ['{meal} stretched further than it should have.', 'every unexpected cost was a crisis.']));
    else if (s.n.money > 75) p.push('Money was comfortable and meals, trips and gifts reflected it.');
    if (s.n.joy < 30) p.push(rnd(R, ['It was a heavy year emotionally.', 'Spirits were low for much of it.']));
    else if (s.n.joy > 80) p.push(rnd(R, ['It was a good year, and {n} knew it.', 'Laughter was easy this year.']));
    if (s.n.stress > 70) p.push('Stress was high, and sleep suffered.');
    if (s.partner && R.chance(0.35)) p.push(rnd(R, [`${s.partner} and {n} had quiet evenings and a few loud arguments.`, `Life with ${s.partner} felt like a team effort.`]));
    if (s.rec.kids.length && s.age < 70 && R.chance(0.45)) p.push(rnd(R, [`The children (${s.rec.kids.map((k) => k.name).slice(0, 3).join(', ')}) kept every day busy.`, `Parenting meant ${rnd(R, ['school runs and bedtime stories.', 'endless questions and endless laundry.', 'worrying about money and about them.'])}`]));
    return p.slice(0, 2).join(' ');
  }
  H.diary = function (s, R) {
    if (s.age < 1) return null;
    let base = BAND.find((b) => s.age < b[0])[1](s, R); for (let i = 0; i < 4 && base === s.lastBase; i++) base = BAND.find((b) => s.age < b[0])[1](s, R); s.lastBase = base; const parts = [base, work(s, R), mood(s, R)].filter(Boolean).map((x) => fill(s, x));
    return parts.join(' ');
  };
  H.stageText = (s, st) => ({ Infancy: 'Infancy begins.', Childhood: `${s.name} is a child now: old enough to run errands, ask hard questions and be told to wash.`, Adolescence: `Adolescence: ${s.name}'s body, mood and ambitions all start changing at once.`, 'Young adulthood': `${s.name} is a young adult now, with the first real choices about work, love and where to live.`, Adulthood: `Adulthood in full: ${s.name} is responsible for others as well as for themselves.`, 'Middle age': `${s.name} is in middle age: the middle of the story, with the end of it starting to come into view.`, 'Old age': `Old age: ${s.name} has seen a lot, and the world is starting to look like something the younger people made.` })[st];
  H.fmtAge = (a) => (a < 1 ? 'Birth' : Math.floor(a) === 1 ? '1 year' : `${Math.floor(a)} years`);
  H.diaryEvery = 1;
  H.eventRate = (s) => (s.age < 3 ? 0.2 : 0.6);

  // ---------------- decisions, specific and spread across the life ----------------
  const pool = (s, R) => {
    const f = s.field;
    if (f === 'medicine') return ['doctor', 'nurse', 'pharmacist', 'medical technician', 'public health worker'];
    if (f === 'tech') return ['software developer', 'civil engineer', 'network technician', 'electrical engineer', 'data analyst'];
    if (f === 'business') return ['accountant', 'bank clerk', 'sales manager', 'small business owner', 'logistics coordinator'];
    if (f === 'education') return ['school teacher', 'university lecturer', 'education officer', 'tutor'];
    if (f === 'arts') return ['journalist', 'graphic designer', 'translator', 'museum guide', 'photographer'];
    if (f === 'law') return ['lawyer', 'paralegal', 'civil servant', 'court clerk'];
    if (f === 'trade') return [s.trade || 'electrician', 'site supervisor', 'workshop owner', 'technician'];
    return s.born.urban ? ['shop assistant', 'bus driver', 'factory worker', 'street vendor', 'security guard', 'cleaner', 'delivery rider', 'cook'] : ['farm worker', 'market trader', 'builder', 'fisher', 'herder', 'domestic worker', 'driver', 'tailor'];
  };
  const PROFILE = [['steady pay, regular hours, little chance to grow', 4, -4, 6, 'steady'], ['high pay but long hours and constant pressure', 12, 14, -4, 'highpay'], ['meaningful work but unstable and underpaid', -2, 4, 8, 'meaning'], ['decent pay and a friendly team, nothing exciting', 6, 0, 4, 'decent'], ['a risky start-up style job that could pay off or collapse', 8, 10, 0, 'risky']];
  function offers(s) {
    if (!s.offers) { const r = LE.R({ rs: (s.rs ^ 0x5bd1e995) | 0 }), p = pool(s, r), prof = PROFILE.slice(); const o = [];
      for (let i = 0; i < 3; i++) { const pr = prof.splice(r.int(0, prof.length - 1), 1)[0]; o.push({ title: r.pick(p), prof: pr }); } s.offers = o; }
    return s.offers;
  }
  const startJob = (s, title, why) => { if (s.career) endJob(s); s.career = title; s.rec.jobs.push({ title, from: Math.floor(s.age) }); if (why) say(s, why, { tone: 'turn', turn: true }); };
  const endJob = (s) => { const j = s.rec.jobs[s.rec.jobs.length - 1]; if (j && !j.to) j.to = Math.floor(s.age); s.career = null; };
  const meet = (s, R, kind) => { const nm = R.pick(NAMES); s.partner = nm; s.rec.partners.push({ name: nm, from: Math.floor(s.age) }); s.n.family = Math.min(100, s.n.family + 8); return nm; };
  const addKids = (s, R, n) => { for (let i = 0; i < n; i++) { const k = { name: R.pick(NAMES), born: Math.floor(s.age) }; s.rec.kids.push(k); s.family.push({ rel: 'Child', name: k.name, note: `born when ${s.name} was ${k.born}` }); } s.kids = s.rec.kids.length; };
  const endPartner = (s, how) => { const p = s.rec.partners[s.rec.partners.length - 1]; if (p && !p.end) { p.end = how; p.endAge = Math.floor(s.age); } s.partner = null; };

  H.decisions = [
    { id: 'dafter', when: (s) => s.age >= 8, title: 'After school', text: (s) => `The bell goes. ${s.name} has a few free hours before ${s.meal}. What fills them?`, options: [
      { k: 'play', label: 'Play outside with friends', hint: 'Friendships and joy', bias: { social: 1 }, fx: (s) => { N(s, 'friends', 10); N(s, 'joy', 6); say(s, 'You played until the light faded. The games became the friendships.', { tone: 'joy' }); } },
      { k: 'help', label: 'Help the family with their work', hint: 'Money and responsibility, less play', bias: { caution: 0.6 }, fx: (s) => { N(s, 'money', 5); N(s, 'family', 8); N(s, 'joy', -3); say(s, `You helped ${s.born.urban ? 'in the shop or at home' : 'in the fields and with the animals'}. The family noticed, and so did your tired legs.`, { tone: 'calm' }); } },
      { k: 'read', label: 'Do homework and read', hint: 'Better grades', bias: { curious: 1 }, fx: (s) => { s.grades = cl(s.grades + 0.08, 0, 1); N(s, 'skills', 6); say(s, 'You found that books went further than your street did.', { tone: 'calm' }); } },
      { k: 'screen', label: 'Watch TV or play on a phone', hint: 'Fun now, little else', bias: { bold: 0.3 }, fx: (s) => { N(s, 'joy', 6); s.grades = cl(s.grades - 0.03, 0, 1); say(s, 'You spent the hours in front of a screen, which was fun and left little behind.', { tone: 'calm' }); } },
    ] },
    { id: 'dbully', when: (s) => s.age >= 10 && s.enrolled, title: 'Someone is making school hard', text: (s) => `A classmate keeps picking on ${s.name} in front of others.`, options: [
      { k: 'teacher', label: 'Tell a teacher', hint: 'Safe, may be taken seriously', bias: { caution: 1 }, fx: (s, R) => { if (R.chance(0.65)) { N(s, 'stress', -12); say(s, 'The teacher stepped in, and it mostly stopped.', { tone: 'joy' }); } else { N(s, 'stress', 6); say(s, 'The teacher shrugged it off, and it got a little worse before it got better.', { tone: 'hard' }); } } },
      { k: 'fight', label: 'Stand up to them', hint: 'Bold, risky', bias: { bold: 1 }, fx: (s, R) => { if (R.chance(0.5)) { N(s, 'friends', 6); N(s, 'stress', -8); say(s, 'You stood your ground. They backed off, and others noticed.', { tone: 'turn', turn: true }); } else { N(s, 'health', -6); N(s, 'stress', 8); say(s, 'It turned into a scuffle and a visit to the principal.', { tone: 'hard' }); } } },
      { k: 'ignore', label: 'Ignore it and stay close to friends', hint: 'Avoids conflict, slow fix', bias: { caution: 0.6, social: 0.6 }, fx: (s) => { N(s, 'friends', 4); N(s, 'stress', 4); say(s, 'You kept your circle close, and the bully lost interest eventually.', { tone: 'calm' }); } },
      { k: 'befriend', label: 'Try to befriend them', hint: 'Surprising, sometimes works', bias: { social: 1, curious: 0.5 }, fx: (s, R) => { if (R.chance(0.45)) { N(s, 'friends', 12); flag(s, 'bully_friend', 'You tried kindness on the one person who gave you trouble, and found an unexpected friend.'); } else { N(s, 'stress', 6); say(s, 'It did not work, but you were proud you tried.', { tone: 'calm' }); } } },
    ] },
    { id: 'dtalent', when: (s) => s.age >= 12, title: 'What are you drawn to?', text: (s) => `${s.name} is old enough to choose where to put time and energy.`, options: [
      { k: 'music', label: 'Music', hint: 'Singing, an instrument, a band', bias: { social: 0.6, curious: 0.5 }, fx: (s) => { s.talent = 'music'; s.talentLvl = cl(s.talentLvl + 0.2, 0, 1); N(s, 'joy', 6); say(s, 'You started singing in every room and borrowing every instrument.', { tone: 'joy' }); } },
      { k: 'sport', label: 'Sport', hint: 'Training, teams, a stronger body', bias: { bold: 0.8, social: 0.4 }, fx: (s) => { s.talent = 'sport'; s.talentLvl = cl(s.talentLvl + 0.2, 0, 1); N(s, 'health', 5); N(s, 'friends', 5); say(s, 'You joined a team and discovered that effort has a sound: your own breathing.', { tone: 'joy' }); } },
      { k: 'maths', label: 'Maths and science', hint: 'Puzzles and logic', bias: { curious: 1, caution: 0.4 }, fx: (s) => { s.talent = 'maths'; s.grades = cl(s.grades + 0.08, 0, 1); N(s, 'skills', 8); say(s, 'Numbers started making sense in a way that felt like a secret.', { tone: 'calm' }); } },
      { k: 'art', label: 'Art and writing', hint: 'Making things from nothing', bias: { curious: 0.8 }, fx: (s) => { s.talent = 'art'; s.talentLvl = cl(s.talentLvl + 0.2, 0, 1); N(s, 'joy', 6); say(s, 'You filled notebooks with drawings and stories.', { tone: 'joy' }); } },
      { k: 'craft', label: 'Fixing and building things', hint: 'Hands-on skills', bias: { caution: 0.5, bold: 0.3 }, fx: (s) => { s.talent = 'craft'; N(s, 'skills', 8); say(s, 'You took things apart to see how they worked, and mostly put them back.', { tone: 'calm' }); } },
      { k: 'caring', label: 'Looking after people', hint: 'Helping, listening', bias: { social: 1 }, fx: (s) => { s.talent = 'caring'; N(s, 'friends', 6); N(s, 'family', 6); say(s, 'People started coming to you with their troubles.', { tone: 'joy' }); } },
    ] },
    { id: 'd14', when: (s) => s.age >= 14, title: 'A turning year', text: (s) => `${s.name} is fourteen. The year ahead will set habits that last.`, options: [
      { k: 'study', label: 'Study hard', hint: 'Better grades, less free time', bias: { caution: 1 }, fx: (s) => { s.grades = cl(s.grades + 0.15, 0, 1); N(s, 'skills', 8); N(s, 'joy', -4); say(s, 'You buried yourself in books. It cost evenings and paid in confidence.', { tone: 'calm' }); } },
      { k: 'earn', label: 'Help the family earn', hint: 'Money now, schooling later', bias: { caution: 0.5 }, fx: (s) => { N(s, 'money', 8); N(s, 'family', 6); s.grades = cl(s.grades - 0.08, 0, 1); say(s, 'You worked beside your family. The household breathed easier.', { tone: 'calm' }); } },
      { k: 'passion', label: 'Follow your passion', hint: 'Skill grows, grades may slip', bias: { curious: 1, bold: 0.5 }, fx: (s) => { s.talentLvl = cl(s.talentLvl + 0.2, 0, 1); N(s, 'joy', 8); say(s, `Every spare hour went to ${s.talent}. It started to feel like yours.`, { tone: 'joy' }); } },
      { k: 'friends', label: 'Invest in friends', hint: 'Bonds that last decades', bias: { social: 1 }, fx: (s) => { N(s, 'friends', 18); N(s, 'joy', 6); flag(s, 'crew', 'A group of friends made at fourteen became the people you called for the rest of your life.'); } },
    ] },
    { id: 'dexam', when: (s) => s.age >= 16 && s.enrolled, title: 'Exam season', text: (s) => `The big exams are close. ${s.name} has a few weeks left.`, options: [
      { k: 'steady', label: 'Make a steady study plan', hint: 'Best odds, less stress', bias: { caution: 1 }, fx: (s) => { s.grades = cl(s.grades + 0.1, 0, 1); N(s, 'stress', -4); say(s, 'You studied an hour or two a day, every day, and slept well.', { tone: 'calm' }); } },
      { k: 'cram', label: 'Cram at the last minute', hint: 'Stress and risk', bias: { bold: 0.8 }, fx: (s, R) => { if (R.chance(0.5)) { s.grades = cl(s.grades + 0.06, 0, 1); say(s, 'You pulled it off on caffeine and fear.', { tone: 'calm' }); } else { s.grades = cl(s.grades - 0.03, 0, 1); N(s, 'stress', 10); say(s, 'You ran out of time and it showed.', { tone: 'hard' }); } } },
      { k: 'tutor', label: 'Ask for a tutor or extra lessons', hint: 'Costs money, big boost', bias: { caution: 0.6 }, when: (s) => s.born.pct > 25 || s.n.money > 30, fx: (s) => { N(s, 'money', -8); s.grades = cl(s.grades + 0.14, 0, 1); say(s, 'A tutor made the hard parts click.', { tone: 'joy' }); } },
      { k: 'group', label: 'Study with a group of friends', hint: 'Fun, uneven', bias: { social: 1 }, fx: (s) => { s.grades = cl(s.grades + 0.06, 0, 1); N(s, 'friends', 6); say(s, 'Four of you quizzed each other until midnight, and ate most of the snacks.', { tone: 'joy' }); } },
    ] },
    { id: 'dlove0', when: (s) => s.age >= 17, title: 'A first crush', text: (s) => `Someone in ${s.name}'s year keeps showing up in every thought.`, options: [
      { k: 'ask', label: 'Say something', hint: 'Bold. Could go either way', bias: { bold: 1 }, fx: (s, R) => { if (R.chance(0.55)) { N(s, 'joy', 12); flag(s, 'firstlove', 'Your first real romance began with one nervous sentence.'); } else { N(s, 'joy', -6); say(s, 'They said no, kindly. It still stung for weeks.', { tone: 'hard' }); } } },
      { k: 'friends', label: 'Stay friends and see', hint: 'Slow and safe', bias: { caution: 1 }, fx: (s) => { N(s, 'friends', 6); say(s, 'You stayed close and let time decide.', { tone: 'calm' }); } },
      { k: 'focus', label: 'Focus on school and goals', hint: 'Future first', bias: { caution: 0.7 }, fx: (s) => { s.grades = cl(s.grades + 0.04, 0, 1); say(s, 'You put your energy into what came next.', { tone: 'calm' }); } },
    ] },
    { id: 'd18', when: (s) => s.age >= 18, title: 'Eighteen', text: (s) => `${s.name} turns eighteen in ${s.country}. Options depend on money, grades and what is available. None are guaranteed.`, options: [
      { k: 'uni', label: 'Apply to university', hint: 'Needs secondary school, grades and a place', when: (s) => s.edu >= 2, bias: { curious: 1, caution: 0.4 }, fx: (s, R) => {
        const p = cl(0.15 + s.grades * 0.5 + s.born.terP * 0.4 + (LE.hasFlag(s, 'mentor') ? 0.15 : 0) + (s.born.pct - 50) / 300, 0.04, 0.95);
        if (R.chance(p)) { s.edu = 4; s.rec.edu.push({ what: 'Studied at university', age: 18 }); s.enrolled = true; s.schoolEnd = 22; s.debt = s.born.country.gdp > 20000 ? 1 : 0; N(s, 'skills', 20); N(s, 'money', -6); say(s, `${s.name} got a place at university.`, { tone: 'joy', because: LE.hasFlag(s, 'mentor') ? 'mentor' : null }); s.pickMajor = true; }
        else say(s, 'The place did not come, because of grades, money or too few seats. A door closed; others remain.', { tone: 'hard' }); } },
      { k: 'voc', label: 'Vocational training', hint: 'A skill and an income sooner', bias: { caution: 0.6 }, fx: (s) => { s.edu = Math.max(s.edu, 3); s.rec.edu.push({ what: 'Finished vocational training', age: 20 }); s.enrolled = true; s.schoolEnd = 20; N(s, 'skills', 14); s.pickTrade = true; say(s, 'You trained for a trade that people always need.', { tone: 'calm' }); } },
      { k: 'work', label: 'Start working', hint: 'Income now', bias: { bold: 0.3 }, fx: (s) => { N(s, 'money', 10); s.schoolEnd = 0; s.enrolled = false; say(s, 'You went straight to work and learned on the job.', { tone: 'calm' }); } },
      { k: 'travel', label: 'Travel first', hint: 'Experience, little money', bias: { bold: 1, curious: 0.8 }, fx: (s) => { N(s, 'joy', 14); N(s, 'friends', 6); N(s, 'money', -8); say(s, 'You went out into the world with little money and a lot of curiosity.', { tone: 'joy' }); } },
    ] },
    { id: 'dmajor', when: (s) => s.pickMajor && !s.field, title: 'What will you study?', text: 'Choosing a field at university shapes the work you can do for decades.', options: [
      { k: 'medicine', label: 'Medicine and health', hint: 'Long training, always needed', bias: { caution: 0.6, social: 0.5 }, fx: (s) => { s.field = 'medicine'; N(s, 'stress', 10); say(s, 'You enrolled in health sciences: anatomy, long shifts and first patients.', { tone: 'calm' }); } },
      { k: 'tech', label: 'Engineering or computing', hint: 'Practical, in demand', bias: { curious: 1 }, fx: (s) => { s.field = 'tech'; N(s, 'skills', 8); say(s, 'You picked engineering and computing: problem sets and a lot of screens.', { tone: 'calm' }); } },
      { k: 'business', label: 'Business and economics', hint: 'Many doors, less specialised', bias: { bold: 0.6 }, fx: (s) => { s.field = 'business'; say(s, 'You studied business: spreadsheets, case studies, a taste for deals.', { tone: 'calm' }); } },
      { k: 'education', label: 'Education', hint: 'Teaching, steady, meaningful', bias: { social: 1 }, fx: (s) => { s.field = 'education'; N(s, 'joy', 4); say(s, 'You trained as a teacher.', { tone: 'calm' }); } },
      { k: 'arts', label: 'Arts, media and languages', hint: 'Creative, uncertain', bias: { curious: 1 }, fx: (s) => { s.field = 'arts'; N(s, 'joy', 6); say(s, 'You went for writing, design and languages.', { tone: 'joy' }); } },
      { k: 'law', label: 'Law and public service', hint: 'Respected, competitive', bias: { caution: 0.5, bold: 0.3 }, fx: (s) => { s.field = 'law'; say(s, 'You chose law: heavy books, sharper arguments.', { tone: 'calm' }); } },
    ] },
    { id: 'dtrade', when: (s) => s.pickTrade && !s.field, title: 'Which trade?', text: 'Vocational training means picking one craft and getting good at it.', options: [
      { k: 'electric', label: 'Electrician', hint: 'Always in demand', bias: { caution: 0.5 }, fx: (s) => { s.field = 'trade'; s.trade = 'electrician'; say(s, 'You apprenticed with an electrician.', { tone: 'calm' }); } },
      { k: 'nurse', label: 'Nursing assistant', hint: 'Caring work, shift hours', bias: { social: 1 }, fx: (s) => { s.field = 'trade'; s.trade = 'nursing assistant'; say(s, 'You trained in care work.', { tone: 'calm' }); } },
      { k: 'mech', label: 'Mechanic', hint: 'Cars, machines, grease', bias: { bold: 0.4 }, fx: (s) => { s.field = 'trade'; s.trade = 'mechanic'; say(s, 'You learned engines from the inside.', { tone: 'calm' }); } },
      { k: 'cook', label: 'Cook or baker', hint: 'Long hours, instant feedback', bias: { social: 0.6 }, fx: (s) => { s.field = 'trade'; s.trade = 'cook'; say(s, 'You trained in a kitchen, where every day has a deadline.', { tone: 'calm' }); } },
      { k: 'tailor', label: 'Tailor or craftsperson', hint: 'Skilled, self-directed', bias: { curious: 0.6 }, fx: (s) => { s.field = 'trade'; s.trade = 'tailor'; say(s, 'You learned to make things people wear and keep.', { tone: 'calm' }); } },
    ] },
    { id: 'djob', when: (s) => s.age >= 20 && !s.career && !s.retired && !s.enrolled && s.done.d18, title: 'Job offers', text: (s) => `Three possibilities have come up for ${s.name}. Each has a catch.`, options: [0, 1, 2].map((i) => ({ k: 'o' + i, label: (s) => `${cap(offers(s)[i].title)} (${offers(s)[i].prof[0]})`, hint: 'Pay, pressure and security differ', bias: i === 0 ? { caution: 1 } : i === 1 ? { bold: 1 } : { social: 1 },
      fx: (s) => { const o = offers(s)[i], p = o.prof; N(s, 'money', p[1]); N(s, 'stress', p[2]); N(s, 'joy', p[3] - 4); startJob(s, o.title, `${s.name} started work as a ${o.title}: ${p[0]}.`); s.offers = null; } })).concat([{ k: 'none', label: 'Keep looking', hint: 'Time to find something better, no income', bias: { caution: -0.4 }, fx: (s) => { N(s, 'money', -4); N(s, 'stress', 6); s.offers = null; s.done.djob = 0; s.done['djob'] = 0; s.age += 0.5; say(s, 'You turned them all down and kept looking. The savings shrank.', { tone: 'hard' }); } }]) },
    { id: 'dhome', when: (s) => s.age >= 22, title: 'Where to live', text: (s) => `${s.name} is old enough to live on their own terms. Options depend on money.`, options: [
      { k: 'parents', label: 'Stay with family', hint: 'Cheap, close', bias: { caution: 1, social: 0.5 }, fx: (s) => { N(s, 'money', 6); N(s, 'family', 8); N(s, 'joy', -2); say(s, 'You stayed home and saved. Family dinners continued.', { tone: 'calm' }); } },
      { k: 'friends', label: 'Share a place with friends', hint: 'Fun, noisy', bias: { social: 1 }, fx: (s) => { N(s, 'friends', 8); N(s, 'joy', 6); N(s, 'money', -4); say(s, 'Three of you split rent and fridge space.', { tone: 'joy' }); } },
      { k: 'alone', label: 'Rent your own place', hint: 'Independence, costs more', bias: { bold: 0.6 }, when: (s) => s.n.money > 25, fx: (s) => { N(s, 'money', -9); N(s, 'joy', 4); N(s, 'stress', -4); say(s, 'A key of your own, and a bill of your own.', { tone: 'joy' }); } },
      { k: 'city', label: 'Move to a bigger city', hint: 'More chances, far from home', bias: { bold: 1, curious: 0.7 }, fx: (s) => { N(s, 'money', -6); N(s, 'family', -10); N(s, 'skills', 6); s.rec.moves.push(`Moved to a bigger city at ${Math.floor(s.age)}`); flag(s, 'bigcity', 'You moved to a big city for opportunity and left the familiar behind.'); } },
    ] },
    { id: 'dhabits', when: (s) => s.age >= 27, title: 'How to live', text: (s) => `Habits are forming, and ${s.name}'s body will keep the receipts.`, options: [
      { k: 'fit', label: 'Exercise and sleep properly', hint: 'Longer, healthier', bias: { caution: 1 }, fx: (s) => { N(s, 'health', 6); s.mods.h = Math.max(0.6, s.mods.h * 0.95); N(s, 'stress', -6); say(s, 'You built routines: walks, early nights, real meals.', { tone: 'calm' }); } },
      { k: 'social', label: 'Go out often with friends', hint: 'Joy, some wear and tear', bias: { social: 1 }, fx: (s) => { N(s, 'friends', 8); N(s, 'joy', 6); N(s, 'health', -3); say(s, 'Weekends were long and loud and worth it.', { tone: 'joy' }); } },
      { k: 'smoke', label: 'Smoke and drink to cope', hint: 'Calms now, costs later', bias: { bold: 0.4 }, fx: (s) => { N(s, 'stress', -6); N(s, 'health', -6); s.mods.h *= 1.1; say(s, 'It helped in the moment, and the body kept a record.', { tone: 'hard' }); } },
      { k: 'busy', label: 'Throw yourself into work', hint: 'Money and skills, stress', bias: { bold: 0.5 }, fx: (s) => { N(s, 'money', 8); N(s, 'skills', 6); N(s, 'stress', 10); say(s, 'You said yes to every project.', { tone: 'calm' }); } },
    ] },
    { id: 'love', when: (s) => s.age >= 26, title: 'Someone special', text: (s) => (LE.hasFlag(s, 'firstlove') ? 'An old flame, or maybe someone new, has come into your life. The first romance taught you something.' : 'Someone has come into your life who makes ordinary days feel different.'), options: [
      { k: 'kind', label: 'Commit to someone kind and steady', hint: 'A safe and gentle life', bias: { caution: 1, social: 0.5 }, fx: (s, R) => { const nm = meet(s, R); N(s, 'joy', 12); N(s, 'stress', -6); say(s, `You built a life with ${nm}, steady and gentle.`, { tone: 'joy' }); } },
      { k: 'spark', label: 'Follow the spark', hint: 'Exciting and uncertain', bias: { bold: 1 }, fx: (s, R) => { const nm = meet(s, R); N(s, 'joy', 14); N(s, 'stress', 6); say(s, `${nm} was exciting from the first day. Whether it would last was another question.`, { tone: 'joy' }); } },
      { k: 'family', label: 'Meet someone your family introduces', hint: 'Common in many places, may grow into love', when: (s) => ['sa', 'mena', 'ssa'].includes(s.reg) || s.born.country.income.indexOf('High') < 0, bias: { caution: 0.6, social: 0.4 }, fx: (s, R) => { const nm = meet(s, R); N(s, 'family', 10); N(s, 'joy', 6); say(s, `Your family introduced you to ${nm}. Love came slowly, as it can.`, { tone: 'calm' }); } },
      { k: 'career', label: 'Focus on work first', hint: 'Money and skills, quieter heart', bias: { caution: 0.8 }, fx: (s) => { N(s, 'skills', 8); N(s, 'money', 8); N(s, 'joy', -4); say(s, 'You said not yet. Work grew; the question stayed.', { tone: 'calm' }); } },
      { k: 'free', label: 'Stay independent', hint: 'Friends, freedom', bias: { bold: 0.5 }, fx: (s) => { N(s, 'friends', 10); N(s, 'joy', 4); say(s, 'You chose your own pace and a wide circle of friends.', { tone: 'calm' }); } },
    ] },
    { id: 'dkids', when: (s) => s.partner && s.age >= 28 && s.age < 42, title: 'Children?', text: (s) => `${s.name} and ${s.partner} are talking about family.`, options: [
      { k: 'none', label: 'No children', hint: 'More time, money, freedom', bias: { caution: 0.3 }, fx: (s) => { N(s, 'money', 6); N(s, 'joy', 2); say(s, 'You decided it would be the two of you, and travel, friends and hobbies filled the space.', { tone: 'calm' }); } },
      { k: 'one', label: 'One child', hint: 'Every attention in one place', bias: { caution: 0.6 }, fx: (s, R) => { addKids(s, R, 1); N(s, 'joy', 10); N(s, 'stress', 8); N(s, 'family', 8); say(s, `${s.rec.kids[s.rec.kids.length - 1].name} was born. Sleep became a memory.`, { tone: 'joy', turn: true }); } },
      { k: 'two', label: 'Two children', hint: 'Busy, loud, rich', bias: { social: 0.6 }, fx: (s, R) => { addKids(s, R, 2); N(s, 'joy', 12); N(s, 'stress', 12); N(s, 'family', 10); N(s, 'money', -6); say(s, `${s.rec.kids.slice(-2).map((k) => k.name).join(' and ')} arrived within a few years.`, { tone: 'joy', turn: true }); } },
      { k: 'many', label: 'A big family', hint: 'Whatever comes. Hard on money and sleep', bias: { social: 1, bold: 0.3 }, fx: (s, R) => { addKids(s, R, R.int(3, Math.max(3, Math.round(s.born.country.cbr / 7)))); N(s, 'joy', 12); N(s, 'stress', 16); N(s, 'family', 14); N(s, 'money', -10); say(s, `The house filled up with children: ${s.rec.kids.map((k) => k.name).join(', ')}.`, { tone: 'joy', turn: true }); } },
    ] },
    { id: 'dparent', when: (s) => s.rec.kids.length && s.age >= s.rec.kids[0].born + 5, title: 'How to raise them', text: (s) => `${s.rec.kids[0].name} is five now, and there are a lot of opinions about parenting.`, options: [
      { k: 'warm', label: 'Warm and talkative', hint: 'Close bonds, less discipline', bias: { social: 1 }, fx: (s) => { N(s, 'family', 10); N(s, 'joy', 6); flag(s, 'warm', 'You raised your children with warmth and conversation, and they stayed close.'); } },
      { k: 'strict', label: 'Strict and structured', hint: 'Order, distance', bias: { caution: 1 }, fx: (s) => { N(s, 'family', -2); N(s, 'stress', -4); say(s, 'You set clear rules. The house ran on time and sometimes on tension.', { tone: 'calm' }); } },
      { k: 'edu', label: 'Push education above all', hint: 'Opportunity, pressure', bias: { caution: 0.6, curious: 0.4 }, fx: (s) => { N(s, 'money', -5); N(s, 'family', 2); flag(s, 'pushed', 'You put every spare coin and hour into your children\'s schooling.'); } },
      { k: 'free', label: 'Let them explore', hint: 'Independent, unpredictable', bias: { curious: 1, bold: 0.5 }, fx: (s) => { N(s, 'joy', 6); N(s, 'family', 6); say(s, 'You let them roam, climb and make mistakes, and kept the first-aid kit nearby.', { tone: 'joy' }); } },
    ] },
    { id: 'dcareer', when: (s) => s.age >= 35 && s.career, title: 'A career crossroads', text: (s) => `After years as a ${s.career}, a choice appears for ${s.name}.`, options: [
      { k: 'promo', label: 'Take the promotion with longer hours', hint: 'More money, less home', bias: { bold: 1 }, fx: (s) => { N(s, 'money', 12); N(s, 'stress', 12); N(s, 'family', -8); say(s, 'You took the step up, and the pay went up with the hours.', { tone: 'calm', turn: true }); } },
      { k: 'stay', label: 'Stay where you are', hint: 'Stable', bias: { caution: 1 }, fx: (s) => { N(s, 'stress', -6); N(s, 'family', 4); say(s, 'You stayed put and used the calm to build life outside work.', { tone: 'calm' }); } },
      { k: 'switch', label: 'Switch fields entirely', hint: 'Fresh start, a pay dip', bias: { curious: 1, bold: 0.6 }, fx: (s, R) => { const old = s.career; endJob(s); const np = ['driver', 'shop owner', 'teacher', 'carer', 'consultant', 'farmer', 'cook'][R.int(0, 6)]; N(s, 'money', -8); N(s, 'joy', 8); startJob(s, np, `After years as a ${old}, you started over as a ${np}.`); } },
      { k: 'part', label: 'Go part time for family', hint: 'Time, less income', bias: { social: 1 }, when: (s) => s.rec.kids.length || s.partner, fx: (s) => { N(s, 'money', -9); N(s, 'family', 10); N(s, 'joy', 8); say(s, 'You cut your hours and found out what your children looked like in daylight.', { tone: 'joy' }); } },
    ] },
    { id: 'move', when: (s) => s.age >= 38, title: 'A crossroads', text: (s) => `Years in, ${s.name} wonders about a different path.`, options: [
      { k: 'stay', label: 'Stay and deepen roots', hint: 'Stability', bias: { caution: 1 }, fx: (s) => { N(s, 'joy', 6); N(s, 'friends', 6); say(s, 'You stayed, and the community stayed with you.', { tone: 'calm' }); } },
      { k: 'abroad', label: 'Move overseas', hint: 'Higher pay, far from home. Hard to undo', irrev: true, bias: { bold: 1, curious: 0.6 }, fx: (s, R) => { const ok = R.chance(0.65); N(s, 'money', ok ? 22 : -8); N(s, 'friends', -14); N(s, 'family', -10); N(s, 'joy', ok ? 4 : -6); s.mods.h *= ok ? 0.95 : 1.05; s.rec.moves.push(`Moved abroad at ${Math.floor(s.age)}`); say(s, ok ? 'The move paid off, in money if not always in belonging.' : 'It was harder than it looked. Work was scarce and home was far.', { tone: ok ? 'turn' : 'hard', turn: true }); } },
      { k: 'biz', label: 'Start something of your own', hint: 'Risky, rewarding', bias: { bold: 1 }, fx: (s, R) => { const ok = R.chance(0.45 + s.n.skills / 400); N(s, 'money', ok ? 18 : -14); N(s, 'joy', ok ? 8 : -4); N(s, 'stress', 10); if (ok) startJob(s, 'business owner', 'You started your own business, and it worked: slowly, then all at once.'); else say(s, 'It folded in the second year. You learned more than money could buy.', { tone: 'hard', turn: true }); } },
      { k: 'care', label: 'Care for family', hint: 'Love, and a toll on money', bias: { social: 1 }, fx: (s) => { N(s, 'joy', 8); N(s, 'money', -8); N(s, 'family', 10); say(s, 'You made room for the people who needed you.', { tone: 'joy' }); } },
    ] },
    { id: 'dmoney', when: (s) => s.age >= 44 && s.n.money > 30, title: 'What to do with savings', text: (s) => `${s.name} has a little money set aside for the first time.`, options: [
      { k: 'invest', label: 'Invest it for the long term', hint: 'Could grow, could shrink', bias: { bold: 0.8 }, fx: (s, R) => { const ok = R.chance(0.65); N(s, 'money', ok ? 10 : -8); say(s, ok ? 'The savings grew slowly over the years.' : 'A bad year ate part of the savings.', { tone: ok ? 'calm' : 'hard' }); } },
      { k: 'kids', label: 'Save for the children\'s future', hint: 'Opportunity for them', bias: { social: 1 }, when: (s) => s.rec.kids.length, fx: (s) => { N(s, 'money', -4); N(s, 'family', 8); flag(s, 'edufund', 'You put your savings into your children\'s education, and it opened doors for them.'); } },
      { k: 'relatives', label: 'Help relatives in need', hint: 'Kinship over comfort', bias: { social: 1 }, fx: (s) => { N(s, 'money', -8); N(s, 'family', 10); N(s, 'joy', 6); say(s, 'You sent money home. Nobody forgot it.', { tone: 'joy' }); } },
      { k: 'spend', label: 'Spend it on experiences', hint: 'Memories now', bias: { bold: 0.6, curious: 0.5 }, fx: (s) => { N(s, 'money', -8); N(s, 'joy', 12); say(s, 'A long trip, a new skill, a few great meals: you spent it and do not regret it.', { tone: 'joy' }); } },
    ] },
    { id: 'dscare', when: (s) => s.age >= 50, title: 'The doctor\'s warning', text: (s) => `A check-up finds high blood pressure and early signs of something worse. ${s.born.hc > 55 ? 'Treatment is available.' : 'Treatment is expensive and far away.'}`, options: [
      { k: 'follow', label: 'Follow the advice', hint: 'Diet, medication, rest', bias: { caution: 1 }, fx: (s) => { N(s, 'health', 8); N(s, 'money', -4); s.mods.h = Math.max(0.6, s.mods.h * 0.92); s.rec.notes.push('Managed high blood pressure after a warning at ' + Math.floor(s.age) + '.'); say(s, 'You changed what you ate and took the tablets. It added years.', { tone: 'turn', turn: true }); } },
      { k: 'ignore', label: 'Ignore it for now', hint: 'Risky', bias: { bold: 0.6 }, fx: (s) => { s.mods.h *= 1.12; N(s, 'stress', -4); say(s, 'You told yourself it was nothing, and the numbers kept rising.', { tone: 'hard', turn: true }); } },
      { k: 'trad', label: 'Try traditional or home remedies', hint: 'Familiar, unproven', bias: { social: 0.4 }, fx: (s, R) => { if (R.chance(0.3)) { N(s, 'health', 3); say(s, 'Rest and a better diet helped a bit.', { tone: 'calm' }); } else { s.mods.h *= 1.05; say(s, 'It comforted you, but it did not change the numbers.', { tone: 'calm' }); } } },
    ] },
    { id: 'dparents55', when: (s) => s.age >= 55 && s.age < 72, title: 'Aging parents', text: (s) => `${s.name}'s parents are frail and need more help.`, options: [
      { k: 'home', label: 'Bring them into your home', hint: 'Close, demanding', bias: { social: 1 }, fx: (s) => { N(s, 'family', 10); N(s, 'stress', 10); N(s, 'joy', 4); s.rec.notes.push('Cared for an aging parent.'); say(s, 'Your parents moved in. The house was full again, and so were the days.', { tone: 'joy' }); } },
      { k: 'pay', label: 'Pay for care', hint: 'Costs money', bias: { caution: 0.6 }, when: (s) => s.n.money > 35, fx: (s) => { N(s, 'money', -12); N(s, 'stress', -2); say(s, 'You paid for a carer. It eased the days for everyone.', { tone: 'calm' }); } },
      { k: 'visit', label: 'Visit as often as you can', hint: 'Distance, guilt', bias: { caution: 0.4 }, fx: (s) => { N(s, 'family', 3); N(s, 'stress', 4); say(s, 'You traveled between your home and theirs, never quite satisfied.', { tone: 'calm' }); } },
    ] },
    { id: 'retire', when: (s) => s.age >= 64, title: 'Retirement', text: 'The working years are ending, or could.', options: [
      { k: 'retire', label: 'Retire', hint: 'Rest, a smaller income', bias: { caution: 0.8 }, fx: (s) => { if (s.career) endJob(s); s.retired = true; N(s, 'joy', 10); N(s, 'money', -10); N(s, 'stress', -10); s.mods.h *= 0.98; say(s, 'You stopped work and discovered how many hours a day has.', { tone: 'joy' }); } },
      { k: 'work', label: 'Keep working', hint: 'Income and purpose', bias: { bold: 0.4 }, fx: (s) => { N(s, 'money', 6); N(s, 'joy', -2); say(s, 'You kept going, because the work still mattered.', { tone: 'calm' }); } },
      { k: 'part', label: 'Part time and teach', hint: 'A bit of both', bias: { social: 0.8, curious: 0.5 }, fx: (s) => { N(s, 'joy', 8); N(s, 'friends', 6); N(s, 'money', -4); say(s, 'You passed on what you knew, for fewer hours and more meaning.', { tone: 'joy' }); } },
    ] },
    { id: 'dold', when: (s) => s.age >= 72, title: 'Where to spend the later years', text: (s) => `${s.name} is slowing down, and living arrangements matter.`, options: [
      { k: 'home', label: 'Stay in your own home', hint: 'Independence', bias: { bold: 0.6 }, fx: (s) => { N(s, 'joy', 6); N(s, 'family', -2); say(s, 'You stayed in your own place, with its own sounds and its own tea.', { tone: 'calm' }); } },
      { k: 'child', label: 'Move in with your children', hint: 'Family, less privacy', bias: { social: 1 }, when: (s) => s.rec.kids.length, fx: (s) => { N(s, 'family', 12); N(s, 'joy', 4); N(s, 'health', 2); say(s, 'You moved into a room in your child\'s house, in the middle of the noise you once made.', { tone: 'joy' }); } },
      { k: 'care', label: 'Move to assisted living', hint: 'Care at hand, costs money', bias: { caution: 1 }, when: (s) => s.n.money > 40, fx: (s) => { N(s, 'health', 4); N(s, 'money', -10); s.mods.h *= 0.95; say(s, 'You moved to a place with help on hand and a window onto a garden.', { tone: 'calm' }); } },
      { k: 'village', label: 'Return to where you grew up', hint: 'Roots', bias: { curious: 0.4 }, fx: (s) => { N(s, 'joy', 8); N(s, 'friends', -6); say(s, `You went back to ${s.born.country.name}'s familiar streets and found most of the faces had changed.`, { tone: 'joy' }); } },
    ] },
    { id: 'dlegacy', when: (s) => s.age >= 80, title: 'What to leave behind', text: (s) => `${s.name} has time to think about what a life adds up to.`, options: [
      { k: 'memoir', label: 'Write or record your story', hint: 'For the people who come after', bias: { curious: 1 }, fx: (s) => { N(s, 'joy', 8); s.rec.notes.push('Recorded the story of a life for the family.'); flag(s, 'memoir', 'You wrote down your story, and it was read aloud at gatherings for years.'); } },
      { k: 'reconcile', label: 'Make peace with someone', hint: 'An old argument', bias: { social: 1 }, fx: (s) => { N(s, 'joy', 10); N(s, 'family', 8); say(s, 'You made the call you had put off for thirty years.', { tone: 'turn', turn: true }); } },
      { k: 'give', label: 'Give gifts and settle your affairs', hint: 'Tidy and generous', bias: { caution: 0.8 }, fx: (s) => { N(s, 'money', -6); N(s, 'family', 8); say(s, 'You gave things to people who would value them.', { tone: 'calm' }); } },
      { k: 'trip', label: 'One more trip', hint: 'A last adventure', bias: { bold: 1 }, fx: (s) => { N(s, 'joy', 12); N(s, 'health', -3); say(s, 'You went somewhere you had always meant to see.', { tone: 'joy' }); } },
    ] },
  ];
  const cap = (t) => t.replace(/^./, (c) => c.toUpperCase());

  // ---------------- milestones: things that simply happen ----------------
  H.milestones = [
    { id: 'steps', when: (s) => s.age >= 1, fx: (s) => say(s, `${s.name} took first steps. The household cheered, whatever else the year held.`, { tone: 'joy' }) },
    { id: 'words', when: (s) => s.age >= 2, fx: (s, R) => say(s, `${s.name}'s first words: ${R.pick(['a name, shouted across the house', 'the word for "more"', 'a rude word learned from a neighbour', 'the family\'s word for "no"'])}.`, { tone: 'joy' }) },
    { id: 'school', when: (s) => s.age >= 6, fx: (s, R) => {
      const p = cl(0.35 + s.born.secP * 0.6 + (s.born.pct - 50) / 250, 0.1, 0.99);
      if (R.chance(p)) { s.edu = 1; s.enrolled = true; s.schoolEnd = 12; s.rec.edu.push({ what: 'Started primary school', age: 6 }); N(s, 'skills', 12); say(s, `${s.name} started school with a worn bag and big questions.`, { tone: 'joy' }); }
      else { N(s, 'skills', 2); say(s, 'School was too far, too costly or too busy a luxury: ' + s.name + ' spent the days helping at home and learning from neighbours instead.', { tone: 'hard' }); } } },
    { id: 'mentor', when: (s) => s.age >= 12 && s.edu >= 1, fx: (s, R) => { if (R.chance(0.5)) { flag(s, 'mentor', 'A teacher noticed your effort and quietly pushed you to keep going.'); s.grades = cl(s.grades + 0.12, 0, 1); N(s, 'skills', 8); } else say(s, 'A crowded classroom, a hard exam, a friend who made it bearable.', { tone: 'calm' }); } },
    { id: 'secondary', when: (s) => s.age >= 13, fx: (s, R) => {
      if (s.edu === 1 && R.chance(cl(s.born.secP * 0.8 + (s.born.pct - 50) / 300 + s.grades * 0.15, 0.08, 0.97))) { s.edu = 2; s.schoolEnd = 18; s.rec.edu.push({ what: 'Moved on to secondary school', age: 13 }); say(s, 'Secondary school opened a bigger world.', { tone: 'calm' }); }
      else if (s.edu === 1) { s.enrolled = false; s.schoolEnd = 0; say(s, 'The family needed an income more than a classroom. School ended early.', { tone: 'hard' }); } } },
    { id: 'gradsec', when: (s) => s.age >= 18 && s.edu === 2 && !s.rec.edu.some((e) => /graduated/.test(e.what)), fx: (s) => { s.rec.edu.push({ what: 'Finished secondary school and graduated', age: 18 }); say(s, 'Graduation day: a certificate, a photo, a relieved family.', { tone: 'joy' }); } },
    { id: 'schoolover', when: (s) => s.enrolled && s.age >= s.schoolEnd, fx: (s) => { s.enrolled = false; say(s, s.edu === 4 ? 'You finished your studies, and the degree arrived with a lot of debt in some places and a lot of pride in all.' : 'Your schooling came to an end.', { tone: 'calm' }); } },
    { id: 'grand', when: (s) => s.age >= 62 && s.rec.kids.length > 0, fx: (s, R) => { s.rec.grand = Math.min(12, R.int(1, s.rec.kids.length + 2)); s.grand = s.rec.grand; say(s, `${s.rec.grand === 1 ? 'A grandchild' : s.rec.grand + ' grandchildren'} arrived over the years, and with them a new kind of joy.`, { tone: 'joy', turn: true }); } },
  ];

  // ---------------- events: things that happen to you ----------------
  const E = (id, w, tone, when, fx, wf) => ({ id, w, tone, when, fx, wf });
  H.events = [
    E('friend', 3, 'joy', (s) => s.age >= 5 && s.age < 60, (s, R) => { N(s, 'friends', 8); N(s, 'joy', 4); say(s, R.pick(['A new friend, over something small, who became something large.', 'You and a neighbour discovered the same favourite song.', 'A new colleague turned out to be someone you could say anything to.']), { tone: 'joy' }); }),
    E('illness', 2, 'hard', (s) => s.age >= 2, (s, R) => { const lo = s.born.hc < 40; const kind = MALARIA(s) && R.chance(0.5) ? 'malaria' : R.pick(['a bad flu', 'a stomach infection', 'a nasty chest infection']); N(s, 'health', -14); s.mods.h *= s.born.hc > 55 ? 1.0 : 1.04; say(s, `${kind[0].toUpperCase() + kind.slice(1)}. ${s.born.hc > 55 ? 'A clinic was near, and it passed within a week.' : 'The nearest care was far and costly, and recovery took weeks.'}`, { tone: 'hard' }); }, (s) => 1 + Math.max(0, 55 - s.born.hc) / 40),
    E('money', 2, 'hard', (s) => s.age >= 18 && s.age < 66, (s, R) => { N(s, 'money', -12); N(s, 'joy', -5); N(s, 'stress', 8); say(s, R.pick(['Prices rose faster than pay and every shopping trip hurt.', 'An unexpected bill (a repair, a hospital visit, a school fee) hit at the worst moment.', 'A rent increase forced hard choices.']), { tone: 'hard' }); }),
    E('jobloss', 1.2, 'hard', (s) => s.career && s.age < 62, (s) => { const old = s.career; endJob(s); N(s, 'money', -14); N(s, 'stress', 14); N(s, 'joy', -8); say(s, `You lost your job as a ${old}. The company cut staff, and you were one of them.`, { tone: 'hard', turn: true }); }),
    E('rehire', 4, 'joy', (s) => !s.career && !s.retired && s.age >= 20 && s.age < 66 && s.done.djob, (s, R) => { const t = R.pick(pool(s, R)); N(s, 'money', 8); N(s, 'stress', -8); startJob(s, t, `After a hard stretch, you found work as a ${t}.`); }),
    E('win', 2, 'joy', (s) => s.age >= 16 && s.age < 70, (s) => { N(s, 'money', 8); N(s, 'joy', 8); N(s, 'skills', 6); say(s, `Your ${s.talent} earned recognition: a prize, a shout-out, a slice of pride.`, { tone: 'joy' }); }),
    E('festival', 3, 'joy', (s) => true, (s, R) => { N(s, 'joy', 6); N(s, 'family', 4); say(s, `A festival in ${s.born.country.name}: ${R.pick(['food, music, everyone outside until late.', 'relatives from far away and too much to eat.', 'costumes, fireworks and the street full of neighbours.'])}`, { tone: 'joy' }); }),
    E('kind', 1.5, 'joy', (s) => s.age >= 8, (s) => { if (!LE.hasFlag(s, 'kindness')) flag(s, 'kindness', 'A stranger helped when you most needed it, and you remembered.'); else say(s, 'You passed on a favour, because someone once did the same for you.', { tone: 'joy', because: 'kindness' }); N(s, 'joy', 6); }),
    E('loss', 1.5, 'hard', (s) => s.age >= 20, (s) => { N(s, 'joy', -10); N(s, 'family', -4); say(s, 'Someone you loved died. Grief arrived slowly and stayed a long time.', { tone: 'hard' }); }),
    E('storm', 1, 'hard', (s) => s.age >= 4, (s, R) => { N(s, 'money', -8); N(s, 'stress', 8); say(s, `${R.pick(['A flood', 'A storm', 'A heatwave', 'A long drought', 'A fire in the neighbourhood'])} hit ${s.born.place}. People helped each other rebuild.`, { tone: 'hard' }); }),
    E('skill', 2, 'calm', (s) => s.age >= 14 && s.age < 70, (s, R) => { N(s, 'skills', 8); say(s, R.pick(['You learned to drive, and a hundred small errands became possible.', 'An evening class taught you something you had always wanted to know.', 'A colleague showed you a trick that saved hours.', 'You taught yourself a new tool from videos and trial and error.']), { tone: 'calm' }); }),
    E('opportunity', 2, 'joy', (s) => s.age >= 20 && s.age < 60 && s.career, (s) => { N(s, 'money', 10); say(s, LE.hasFlag(s, 'crew') ? 'An old friend from your crew offered you a better job.' : 'A better job came up, through work and a bit of luck.', { tone: 'turn', turn: true, because: LE.hasFlag(s, 'crew') ? 'crew' : null }); }, (s) => (LE.hasFlag(s, 'crew') ? 1.8 : 1)),
    E('scholar', 1.5, 'joy', (s) => s.age >= 14 && s.age < 19 && s.enrolled, (s) => { N(s, 'money', 6); s.grades = cl(s.grades + 0.05, 0, 1); say(s, 'A scholarship, a small one, that covered books and bus fare for a year.', { tone: 'joy', turn: true }); }),
    E('strike', 1, 'hard', (s) => s.enrolled && s.age < 18, (s) => { s.grades = cl(s.grades - 0.03, 0, 1); say(s, 'A teachers\' strike closed the school for weeks.', { tone: 'hard' }); }),
    E('sibling', 2, 'calm', (s) => s.age >= 3 && s.born.sibs > 0, (s, R) => { N(s, 'family', 5); say(s, R.pick(['You and a sibling had a huge fight and made up before bed.', 'A sibling took the blame for something you did.', 'A sibling got engaged, and the family cooked for days.']), { tone: 'calm' }); }),
    E('bone', 1, 'hard', (s) => s.age >= 5 && s.age < 60, (s) => { N(s, 'health', -8); say(s, 'A broken bone from a fall: weeks in a cast and a lot of patience.', { tone: 'hard' }); }),
    E('remit', 1.2, 'joy', (s) => s.age >= 20 && s.age < 65 && /Low|Lower/.test(s.born.country.income), (s) => { N(s, 'money', 6); N(s, 'family', 6); say(s, 'A cousin working abroad sent money home, and it paid the term fees.', { tone: 'joy' }); }),
    E('loan', 1, 'hard', (s) => s.age >= 22 && s.age < 60 && s.n.money < 40, (s) => { N(s, 'money', 6); N(s, 'stress', 10); say(s, 'You took out a loan to get through, and the repayments shaped every month after.', { tone: 'hard' }); }),
    E('wedding', 1.5, 'joy', (s) => s.age >= 18 && s.age < 80, (s) => { N(s, 'joy', 6); N(s, 'friends', 4); say(s, 'A friend\'s wedding, with dancing until the band gave up.', { tone: 'joy' }); }),
    E('crime', 0.8, 'hard', (s) => s.age >= 15 && s.age < 70, (s) => { N(s, 'money', -6); N(s, 'stress', 8); say(s, 'Someone stole your phone and a few weeks of money with it.', { tone: 'hard' }); }),
    E('dengue', 0.8, 'hard', (s) => ['sa', 'eap', 'lac'].includes(s.reg) && s.age >= 5, (s) => { N(s, 'health', -12); say(s, 'A week of high fever and aches (dengue was going around). You recovered.', { tone: 'hard' }); }),
    E('breakup', 1.2, 'hard', (s) => s.partner && s.age < 60, (s) => { const nm = s.partner; endPartner(s, 'split'); N(s, 'joy', -14); N(s, 'family', -10); say(s, `You and ${nm} split up, after years of trying to make it work.`, { tone: 'hard', turn: true }); }),
    E('widow', 1.2, 'hard', (s) => s.partner && s.age >= 55, (s) => { const nm = s.partner; endPartner(s, 'died'); N(s, 'joy', -18); N(s, 'family', -6); say(s, `${nm} died. The house was too quiet, and everyone in the family came.`, { tone: 'hard', turn: true }); }),
    E('newlove', 1.5, 'joy', (s) => !s.partner && s.age >= 28 && s.age < 75 && s.done.love, (s, R) => { const nm = meet(s, R); N(s, 'joy', 12); say(s, `You met ${nm} at a friend's gathering. It started slowly, then wasn't slow at all.`, { tone: 'joy', turn: true }); }),
    E('promotion', 1.5, 'joy', (s) => s.career && s.age >= 25 && s.age < 62, (s) => { N(s, 'money', 10); N(s, 'joy', 6); say(s, `A promotion at work as a ${s.career}: more money, more responsibility.`, { tone: 'joy' }); }),
    E('burnout', 1, 'hard', (s) => s.n.stress > 65 && s.age < 65, (s) => { N(s, 'stress', -18); N(s, 'health', -8); N(s, 'joy', -6); say(s, 'You ran out of road: a week in bed, a long talk with someone who loved you, a few things you finally said no to.', { tone: 'hard', turn: true }); }),
    E('grandkids', 2, 'joy', (s) => s.rec.grand > 0 && s.age >= 65, (s) => { N(s, 'joy', 8); N(s, 'family', 6); say(s, 'A weekend with the grandchildren: sticky hands, loud games, and a lot of love.', { tone: 'joy' }); }),
    E('oldfriend', 1.5, 'calm', (s) => s.age >= 60, (s) => { N(s, 'joy', 4); say(s, 'You met an old friend after twenty years and picked up exactly where you left off.', { tone: 'calm' }); }),
  ];
})(typeof window !== 'undefined' ? window : globalThis);
