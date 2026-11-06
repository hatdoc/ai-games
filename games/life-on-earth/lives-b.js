// Life modules, part 2: lion, emperor penguin, green sea turtle, blue whale, monarch butterfly.
// Stage survival figures are MODELLED approximations chosen so life expectancy lands in published ranges;
// they are not measurements. Places are real; their weights are a gameplay choice (not data).
(function (g) {
  const LE = g.LE, M = LE.modules, say = LE.say, flag = LE.flag, N = LE.mod, hz = LE.hz;
  const cl = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
  const pickPlace = (R, list, avoid) => { let x, n = 0; do { x = R.wpick(list, (p) => p.w); n++; } while (avoid && x.name === avoid && n < 30); return x; };
  const fy = (a) => (a < 1 ? `${Math.round(a * 12)} months` : `${a.toFixed(1)} years`);
  const NM = ['Amani', 'Zuri', 'Kito', 'Nala', 'Sefu', 'Imara', 'Tau', 'Rafiki', 'Asha', 'Mosi', 'Pili', 'Jengo'];
  const SEA = ['Marlo', 'Coral', 'Tide', 'Wren', 'Skye', 'Brine', 'Dune', 'Kelp', 'Reef', 'Fern', 'Pearl', 'Sable'];

  // =============== LION ===============
  const LR = [
    { name: 'the Serengeti-Mara plains (Tanzania/Kenya)', prey: 0.95, threat: 0.35, w: 4 }, { name: 'the Kruger lowveld (South Africa)', prey: 0.85, threat: 0.25, w: 3 },
    { name: 'the Okavango and Chobe (Botswana)', prey: 0.85, threat: 0.35, w: 3 }, { name: 'Etosha pan (Namibia)', prey: 0.65, threat: 0.3, w: 2 },
    { name: 'the Ruaha-Selous ecosystem (Tanzania)', prey: 0.75, threat: 0.5, w: 3 }, { name: 'the Luangwa valley (Zambia)', prey: 0.75, threat: 0.5, w: 2 },
  ];
  const lStage = (s) => { const a = s.age; return a < 0.4 ? 'Newborn cub' : a < 1.5 ? 'Young cub' : a < 2.5 ? 'Juvenile' : a < 4 ? 'Subadult' : a < (s.sex === 'male' ? 10 : 13) ? 'Adult' : 'Senior'; };
  M.lion = {
    dt: () => 1 / 6, stage: lStage, fmtAge: fy,
    birth(s, R, avoid) {
      const r = pickPlace(R, LR, avoid); s.traits = { bold: R.r(), caution: R.r(), social: R.r(), curious: R.r() };
      s.sex = R.chance(0.5) ? 'female' : 'male'; s.name = R.pick(NM); s.prideSize = R.int(4, 12); const lit = R.int(1, 4);
      s.env = { prey: r.prey, threat: r.threat, drought: 0 }; s.n = { health: 85, food: 65, skill: 5, bond: 60, status: 20, safety: 70 };
      s.cubs = 0; s.mother = R.pick(NM); s.nextLitter = 3.8; s.takeover = false;
      s.born = { key: r.name, place: r.name, env: 'African savanna', region: r, story: `${s.name} was born, a ${s.sex} cub, in a thicket near ${r.name}: one of ${lit}, in a pride of ${s.prideSize}. Mother ${s.mother} hid the litter for weeks. The savanna is never the same two years running, and neither is the food.` };
      s.family = [{ rel: 'Mother', name: s.mother, note: '' }, ...Array.from({ length: lit - 1 }, () => ({ rel: 'Littermate', name: R.pick(NM), note: '' }))];
    },
    tick(s, dt, R) {
      s.env.prey = cl(s.env.prey + R.range(-0.05, 0.05) + (s.env.drought > 0 ? -0.03 : 0.01), 0.3, 1.25); s.env.drought = Math.max(0, s.env.drought - dt);
      N(s, 'food', R.range(-10, 14) * (0.5 + s.env.prey / 2) - 3 + (s.age < 1 ? 4 : 0)); N(s, 'health', s.n.food > 35 ? 0.8 : -3);
      if (s.sex === 'female' && s.age >= s.nextLitter && s.age < 12) { const n = R.int(1, 4), ok = Math.max(0, Math.round(n * R.range(0.5, 1))); s.nextLitter = s.age + R.range(1.7, 2.5); s.cubs += ok; for (let i = 0; i < ok; i++) s.family.push({ rel: 'Cub', name: R.pick(NM), note: `born at age ${s.age.toFixed(1)}` }); say(s, ok ? `You gave birth to ${ok} ${ok > 1 ? 'cubs' : 'cub'} in a thicket, and the pride's other mothers moved closer.` : 'You gave birth, but the litter did not survive the first weeks. The pride shared the loss.', { tone: ok ? 'joy' : 'hard', turn: !!ok }); }
    },
    hazard(s) {
      const a = s.age, e = s.env, p = 1.35 - e.prey, m = s.mods.h * (1 + Math.max(0, 40 - s.n.health) / 50);
      const f = s.sex === 'female', sen = 0.004 * Math.exp(0.33 * a);
      if (a < 0.4) return { starvation: 0.25 * p * m, 'illness': 0.2 * p * m, 'the dangers of the savanna': 0.3 * p * m };
      if (a < 1.5) return { starvation: 0.15 * p * m, 'illness': 0.1 * p * m, 'the dangers of the savanna': 0.15 * p * m };
      if (a < 2.5) return { starvation: 0.06 * p * m, 'the dangers of the savanna': 0.08 * m };
      const b = f ? 0.06 : (a < 4 ? 0.2 : 0.14);
      return { 'hardship during a poor season': b * 0.35 * p * m, 'a territorial clash': (f ? 0.15 : 0.5) * b * m, 'conflict with people': e.threat * 0.04 * m, illness: b * 0.15 * m, 'old age': sen * m };
    },
    death: (s, c) => ({ text: `${s.name} died at ${fy(s.age)}, of ${c}. ${s.cubs ? `The ${s.cubs} cubs you bore carried your line on.` : 'The pride moved on across the plain, as prides do.'}` }),
    eventRate: () => 0.9,
    stats: (s) => [['Place', s.born.place], ['Sex', s.sex], ['Cubs born', s.cubs], ['Hunting skill', Math.round(s.n.skill)], ['Standing', Math.round(s.n.status)]],
    meters: (s) => [['Health', s.n.health, 'g'], ['Belly full', s.n.food, 'o'], ['Hunting skill', s.n.skill, 'y'], ['Pride bond', s.n.bond, 'r'], ['Standing', s.n.status, 'p'], ['Safety', s.n.safety, 'b']],
    info: (s) => [['Place', s.born.place], ['Pride', `${s.prideSize} lions`], ['Prey', s.env.prey > 0.9 ? 'Plentiful' : s.env.prey > 0.6 ? 'Moderate' : 'Scarce'], ['Season', s.env.drought > 0 ? 'Drought' : 'Normal'], ['Mother', s.mother], ['Cubs', s.cubs]],
    milestones: [
      { id: 'meet', when: (s) => s.age >= 0.17, fx: (s) => say(s, `At about two months ${s.name} was carried out of the thicket and into the pride: aunts, cousins and a chorus of new smells.`, { tone: 'joy' }) },
      { id: 'meat', when: (s) => s.age >= 0.5, fx: (s) => { N(s, 'food', 12); say(s, 'First taste of meat from a kill, the beginning of learning what a lion is.', { tone: 'calm' }); } },
      { id: 'roar', when: (s) => s.age >= 1.3, fx: (s) => say(s, 'You tried your first roar. A squeak came out; the pride seemed amused.', { tone: 'joy' }) },
    ],
    decisions: [
      { id: 'watch', when: (s) => s.age >= 0.9, title: 'The hunt', text: 'The lionesses are stalking a herd of wildebeest. The cubs are told to stay back.', options: [
        { k: 'watch', label: 'Watch from the grass', hint: 'Learn safely', bias: { caution: 1 }, fx: (s) => { s.n.skill = cl(s.n.skill + 14); say(s, 'You watched every move: the circling, the patience, the sudden burst.', { tone: 'calm' }); } },
        { k: 'play', label: 'Play-stalk your siblings', hint: 'Bonds and practice', bias: { social: 1 }, fx: (s) => { s.n.skill = cl(s.n.skill + 8); N(s, 'bond', 10); say(s, 'Pounce practice with your littermates: grass, dust and total joy.', { tone: 'joy' }); } },
        { k: 'wander', label: 'Creep closer for a look', hint: 'Bold. Risky', bias: { bold: 1, curious: 0.8 }, fx: (s, R) => { if (R.chance(0.75)) { s.n.skill = cl(s.n.skill + 20); say(s, 'You got close enough to see it all. A lioness gave you a look and you retreated, wiser.', { tone: 'calm' }); } else { N(s, 'health', -15); N(s, 'safety', -10); say(s, 'You spooked the herd. The lionesses were not pleased, and you got a sharp cuff.', { tone: 'hard' }); } } },
      ] },
      { id: 'first', when: (s) => s.age >= 2, title: 'First real hunt', text: 'The pride goes after prey and invites the juveniles to join.', options: [
        { k: 'join', label: 'Join in', hint: 'Skill, some risk', bias: { bold: 1 }, fx: (s, R) => { if (R.chance(0.55 + s.n.skill / 250)) { s.n.skill = cl(s.n.skill + 20); N(s, 'food', 20); N(s, 'status', 8); flag(s, 'firsthunt', 'Your first hunt: you helped bring down prey and won a place among the hunters.'); } else { s.n.skill = cl(s.n.skill + 8); N(s, 'health', -8); say(s, 'The prey bolted. You were cuffed by a hoof, and learned.', { tone: 'hard' }); } } },
        { k: 'watch', label: 'Watch and learn', hint: 'Safe', bias: { caution: 1 }, fx: (s) => { s.n.skill = cl(s.n.skill + 8); say(s, 'You studied how the pride works together.', { tone: 'calm' }); } },
        { k: 'scav', label: 'Scavenge at the edges', hint: 'Food, low skill', bias: { caution: 0.5 }, fx: (s) => { N(s, 'food', 14); say(s, 'You ate what others left. It works, but it is no way to become a hunter.', { tone: 'calm' }); } },
      ] },
      { id: 'disperse', when: (s) => s.age >= 3, title: 'Time to move on?', text: (s) => (s.sex === 'male' ? 'Young males are pushed out of their birth pride at this age. You and your male cousins leave together or alone.' : 'Young females usually stay in the pride, but you could look for new territory.'), options: [
        { k: 'stay', label: (s) => (s.sex === 'male' ? 'Leave with your brothers' : 'Stay in your pride'), hint: (s) => (s.sex === 'male' ? 'A coalition is safer' : 'Safe, familiar'), bias: { social: 1, caution: 0.5 }, fx: (s) => { if (s.sex === 'male') { N(s, 'bond', -20); N(s, 'status', 6); flag(s, 'coalition', 'You left home with your brothers: a coalition that would help you win a pride.'); } else { N(s, 'bond', 10); N(s, 'safety', 6); say(s, 'You stayed. The pride is your family for life.', { tone: 'calm' }); } } },
        { k: 'alone', label: 'Strike out alone', hint: 'Freedom and danger. Hard to undo', irrev: true, bias: { bold: 1 }, fx: (s, R) => { N(s, 'bond', -30); N(s, 'safety', -20); s.mods.h *= 1.15; flag(s, 'solo', 'You went alone into unclaimed land, where every ridge could hide a rival.'); } },
      ] },
      { id: 'challenge', when: (s) => s.sex === 'male' && s.age >= 4.5 && s.age < 9, title: 'A pride of your own?', text: 'There is a resident coalition guarding a pride. They are strong, and they are tiring.', options: [
        { k: 'fight', label: 'Challenge them', hint: 'Win a pride or lose big', irrev: true, bias: { bold: 1 }, fx: (s, R) => { const p = cl(0.3 + (LE.hasFlag(s, 'coalition') ? 0.3 : 0) + s.n.skill / 300, 0.1, 0.8); if (R.chance(p)) { N(s, 'status', 50); s.mods.h *= 0.9; flag(s, 'pride', 'You and your coalition won a pride, and with it a territory and the chance to father cubs.'); s.cubs += R.int(2, 6); } else { N(s, 'health', -30); s.mods.h *= 1.15; say(s, 'You were driven off, hurt. There will be other seasons.', { tone: 'hard', turn: true }); } } },
        { k: 'nomad', label: 'Stay nomadic', hint: 'Safe-ish, no status', bias: { caution: 1 }, fx: (s) => { N(s, 'status', -4); say(s, 'You roamed wide, keeping out of everyone\'s way.', { tone: 'calm' }); } },
        { k: 'wait', label: 'Wait a season', hint: 'Grow stronger', bias: { caution: 0.7 }, fx: (s) => { s.n.skill = cl(s.n.skill + 10); say(s, 'You waited, and watched, and grew.', { tone: 'calm' }); } },
      ] },
      { id: 'senior', when: (s) => s.age >= (s.sex === 'male' ? 10 : 13), title: 'The long afternoon', text: 'You are old for a lion. The younger ones hunt now.', options: [
        { k: 'rest', label: 'Rest in the shade', hint: 'Comfort', bias: { caution: 1 }, fx: (s) => { N(s, 'health', 4); say(s, 'You rested in the shade and the pride brought you the best cuts.', { tone: 'joy' }); } },
        { k: 'lead', label: 'Keep your place at the hunt', hint: 'Pride, wear', bias: { bold: 1 }, fx: (s) => { N(s, 'status', 6); N(s, 'health', -6); say(s, 'You took your place at the hunt, slower but still wise.', { tone: 'joy' }); } },
      ] },
    ],
    events: [
      { id: 'take', w: 1, tone: 'hard', when: (s) => s.age > 0.3 && s.age < 2 && !s.takeover, fx: (s, R) => { s.takeover = true; s.mods.h *= 1.1; N(s, 'safety', -20); say(s, 'New males arrived and challenged the pride\'s males. In the upheaval, your mother led the young away to the reeds until things settled.', { tone: 'hard', turn: true }); } },
      { id: 'drought', w: 1.2, tone: 'hard', when: (s) => s.env.drought <= 0, fx: (s) => { s.env.drought = 0.8; N(s, 'food', -12); say(s, 'The rains failed. Waterholes shrank, the herds moved on, and the pride went hungry together.', { tone: 'hard' }); } },
      { id: 'rain', w: 1.5, tone: 'joy', when: (s) => true, fx: (s) => { s.env.prey = cl(s.env.prey + 0.1, 0, 1.25); N(s, 'food', 12); say(s, 'Rain at last: green grass, fat herds, a season of plenty.', { tone: 'joy' }); } },
      { id: 'kill', w: 3, tone: 'calm', when: (s) => s.age > 0.6, fx: (s) => { N(s, 'food', 24); if (s.age > 2) s.n.skill = cl(s.n.skill + 3); say(s, 'A successful hunt. The whole pride fed, in a certain order.', { tone: 'calm' }); } },
      { id: 'hyena', w: 1, tone: 'hard', when: (s) => s.age > 1.5, fx: (s) => { N(s, 'food', -6); N(s, 'health', -4); say(s, 'A clan of hyenas contested a carcass. After a noisy standoff, both sides backed down.', { tone: 'hard' }); } },
      { id: 'dusk', w: 2, tone: 'calm', when: (s) => true, fx: (s) => { N(s, 'bond', 4); say(s, 'Dusk on the plain. The pride roared together, a sound that carries for miles.', { tone: 'calm' }); } },
      { id: 'veh', w: 1, tone: 'calm', when: (s) => s.born.region.threat < 0.45, fx: (s) => say(s, 'Safari vehicles stopped at a respectful distance. Cameras clicked. You were unimpressed.', { tone: 'calm' }) },
      { id: 'snare', w: 0.8, tone: 'hard', when: (s) => s.age > 1.5 && s.env.threat > 0.3, fx: (s) => { N(s, 'health', -12); s.mods.h *= 1.04; say(s, 'A wire snare set for other animals caught your paw. You freed yourself after a long struggle and walked with a limp for weeks.', { tone: 'hard' }); } },
      { id: 'disease', w: 0.5, tone: 'hard', when: (s) => s.age > 0.5, fx: (s) => { N(s, 'health', -14); say(s, 'A disease moved through the pride. You were sick for weeks and recovered.', { tone: 'hard' }); } },
    ],
  };

  // =============== EMPEROR PENGUIN ===============
  const PC = [{ name: 'Cape Washington (Ross Sea)', w: 3 }, { name: 'Coulman Island (Ross Sea)', w: 3 }, { name: 'Halley Bay (Weddell Sea)', w: 2 }, { name: 'Atka Bay (Weddell Sea)', w: 2 }, { name: 'Pointe Geologie (Adelie Land)', w: 2 }, { name: 'Auster (Mawson Coast)', w: 2 }, { name: 'Snow Hill Island', w: 1 }];
  const pStage = (a) => (a < 0.18 ? 'Egg' : a < 0.3 ? 'Hatchling' : a < 0.6 ? 'Chick' : a < 5 ? 'Juvenile' : 'Adult');
  M.penguin = {
    dt: (s) => (s.age < 1 ? 1 / 24 : s.age < 5 ? 1 / 6 : 1 / 4),
    stage: pStage,
    fmtAge: (a) => (a < 1 ? `${Math.round(a * 12)} months` : `${a.toFixed(1)} years`),
    birth(s, R, avoid) {
      const c = pickPlace(R, PC, avoid); s.traits = { bold: R.r(), caution: R.r(), social: R.r(), curious: R.r() };
      s.sex = R.chance(0.5) ? 'female' : 'male'; s.name = R.pick(SEA); s.env = { ice: R.range(0.65, 1.05) }; s.n = { health: 90, food: 70, warmth: 70, skill: 0, bond: 70, mate: 0 };
      s.chicks = 0; s.eggsLaid = 0; s.mate = null; s.yr = 0; s.parents = [R.pick(SEA), R.pick(SEA)];
      s.born = { key: c.name, place: c.name, env: 'Antarctic sea ice', story: `${s.name} was an egg laid in the Antarctic autumn near ${c.name}. At minus 40 the egg sat on ${s.parents[0]}'s feet beneath a fold of warm skin. Two months of winter dark begin before anyone hatches.` };
      s.family = [{ rel: 'Father', name: s.parents[0], note: 'incubated the egg' }, { rel: 'Mother', name: s.parents[1], note: 'fed at sea' }];
    },
    tick(s, dt, R) {
      N(s, 'food', R.range(-6, 8)); N(s, 'warmth', R.range(-5, 6) + (s.age < 0.6 ? 2 : 0));
      if (Math.floor(s.age) > s.yr) { s.yr = Math.floor(s.age); s.env.ice = cl(s.env.ice + R.range(-0.15, 0.15), 0.4, 1.1); }
      if (s.age >= 5 && s.age % 1 < dt && s.mate) { // a breeding year
        const ok = R.chance(0.8 * s.env.ice); s.eggsLaid++;
        if (ok && R.chance(0.7 * s.env.ice)) { s.chicks++; s.family.push({ rel: 'Chick', name: R.pick(SEA), note: `fledged at age ${s.age.toFixed(0)}` }); say(s, `Another breeding season: ${s.sex === 'male' ? 'you held the egg through months of blizzards' : 'you walked 100 km to the sea and back to feed the chick'}, and a chick fledged.`, { tone: 'joy', turn: s.chicks === 1 }); }
        else say(s, 'A hard breeding season: the sea ice broke up early and the chick did not make it. You will try again.', { tone: 'hard' });
      }
    },
    hazard(s) {
      const a = s.age, ice = s.env.ice, m = s.mods.h * (1 + Math.max(0, 40 - s.n.health) / 60);
      if (a < 0.18) return { 'a cold snap': hz(0.78, 0.18) * m };
      if (a < 0.3) return { 'a storm': hz(0.88, 0.12) * (1.6 - ice) * m };
      if (a < 0.6) return { 'starvation in a poor year': hz(0.8, 0.3) * (1.8 - ice) * m * 0.7, 'a giant petrel': hz(0.8, 0.3) * m * 0.3 };
      if (a < 1.6) return { 'a leopard seal': hz(0.62, 1) * 0.55 * m, 'starvation at sea': hz(0.62, 1) * 0.45 * m * (1.4 - ice * 0.4) };
      if (a < 5) return { 'a leopard seal': hz(0.88, 1) * 0.5 * m, 'a hard winter at sea': hz(0.88, 1) * 0.5 * m };
      return { 'a hard winter': hz(0.95, 1) * 0.5 * m * (1.2 - ice * 0.2), 'a leopard seal or orca': hz(0.95, 1) * 0.5 * m, 'old age': 0.015 * Math.exp(0.25 * (a - 14)) * m };
    },
    death: (s, c) => ({ text: `${s.name} died at ${fy(s.age)}, of ${c}. ${s.chicks ? `${s.chicks} ${s.chicks > 1 ? 'chicks' : 'chick'} you raised now swim the Southern Ocean.` : 'The colony huddled on through the dark.'}` }),
    eventRate: (s) => (s.age < 0.6 ? 1.4 : 0.8),
    stats: (s) => [['Colony', s.born.place], ['Sex', s.sex], ['Chicks fledged', s.chicks], ['Breeding years', s.eggsLaid], ['Sea-ice conditions', `${Math.round(s.env.ice * 100)}%`]],
    meters: (s) => [['Health', s.n.health, 'g'], ['Fed', s.n.food, 'o'], ['Warmth', s.n.warmth, 'r'], ['Swimming skill', s.n.skill, 'b'], ['Pair bond', s.mate ? s.n.bond : 0, 'p']],
    info: (s) => [['Colony', s.born.place], ['Sea ice', s.env.ice > 0.9 ? 'Stable' : s.env.ice > 0.65 ? 'Variable' : 'Poor'], ['Parents', s.parents.join(' and ')], ['Mate', s.mate || 'None yet'], ['Chicks fledged', s.chicks]],
    milestones: [
      { id: 'hatch', when: (s) => s.age >= 0.18, fx: (s) => { say(s, `${s.name} pipped the shell after about two months. The first thing was ${s.parents[0]}'s warm brood pouch and the second was cold.`, { tone: 'joy' }); } },
      { id: 'creche', when: (s) => s.age >= 0.35, fx: (s) => say(s, 'You joined the creche, a crowd of fluffy grey chicks huddling while the adults fed at sea.', { tone: 'joy' }) },
      { id: 'molt', when: (s) => s.age >= 0.55, fx: (s) => say(s, 'Waterproof feathers replaced the down. The sea ice shrank and the open water crept closer.', { tone: 'calm' }) },
    ],
    decisions: [
      { id: 'huddle', when: (s) => s.age >= 0.2, title: 'A blizzard', text: 'Wind and snow. The chicks form a huddle, and the centre is warm, the edges are not.', options: [
        { k: 'centre', label: 'Squeeze into the centre', hint: 'Warm and safe', bias: { caution: 1, social: 0.5 }, fx: (s) => { N(s, 'warmth', 20); say(s, 'You pressed into the huddle. The wind became somebody else\'s problem.', { tone: 'calm' }); } },
        { k: 'edge', label: 'Stay at the edge and watch', hint: 'Cold, curious', bias: { curious: 1, bold: 0.6 }, fx: (s) => { N(s, 'warmth', -15); N(s, 'health', -5); s.n.skill = cl(s.n.skill + 4); say(s, 'You saw the whole colony from the edge and shivered for it.', { tone: 'hard' }); } },
        { k: 'parent', label: 'Stay close to your parent', hint: 'Bond', bias: { social: 1 }, fx: (s) => { N(s, 'warmth', 8); N(s, 'bond', 6); say(s, 'You stayed on your parent\'s feet. They did not move for hours.', { tone: 'joy' }); } },
      ] },
      { id: 'swim', when: (s) => s.age >= 0.6, title: 'The edge of the ice', text: 'Open water, blue and cold. Adults dive off the edge. You have never swum.', options: [
        { k: 'dive', label: 'Dive in now', hint: 'Bold. A leopard seal may be near', bias: { bold: 1 }, fx: (s, R) => { s.n.skill = cl(s.n.skill + 24); if (R.chance(0.85)) flag(s, 'swim', 'You dived on the first day and learned to swim faster than most.'); else { N(s, 'health', -20); say(s, 'A seal passed close. You made it out of the water, shaking.', { tone: 'hard' }); } } },
        { k: 'flock', label: 'Wait and go with the group', hint: 'Safer in numbers', bias: { social: 1, caution: 0.6 }, fx: (s) => { s.n.skill = cl(s.n.skill + 14); say(s, 'You went in with the flock and followed the bubbles of the one ahead.', { tone: 'calm' }); } },
        { k: 'wait', label: 'Wait for calmer water', hint: 'Slower, hungrier', bias: { caution: 1 }, fx: (s) => { N(s, 'food', -12); s.n.skill = cl(s.n.skill + 8); say(s, 'You waited a few days and learned from watching.', { tone: 'calm' }); } },
      ] },
      { id: 'forage', when: (s) => s.age >= 1.5, title: 'Where to feed', text: 'Years at sea. Krill and fish are patchy. Two feeding grounds are on offer.', options: [
        { k: 'edge', label: 'Stay near the ice edge', hint: 'Known, crowded', bias: { caution: 1 }, fx: (s) => { N(s, 'food', 10); say(s, 'You fished the ice edge, close to home, with plenty of company.', { tone: 'calm' }); } },
        { k: 'far', label: 'Follow the cold currents far north', hint: 'Richer, farther', bias: { bold: 1, curious: 0.7 }, fx: (s, R) => { if (R.chance(0.7)) { N(s, 'food', 25); N(s, 'health', 6); s.n.skill = cl(s.n.skill + 8); say(s, 'You found a rich upwelling a thousand kilometres out and returned fat.', { tone: 'joy' }); } else { N(s, 'food', -12); say(s, 'The far grounds were empty. It was a hungry year.', { tone: 'hard' }); } } },
      ] },
      { id: 'mate', when: (s) => s.age >= 5, title: 'The colony returns to breed', text: 'In the dark autumn, thousands of adults call across the ice. Each voice is unique, and you are looking for a partner.', options: [
        { k: 'loud', label: 'Answer the strongest voice', hint: 'Impressive, uncertain', bias: { bold: 1 }, fx: (s, R) => { s.mate = R.pick(SEA); s.n.bond = 55; s.family.push({ rel: 'Mate', name: s.mate, note: '' }); flag(s, 'paired', `You paired with ${s.mate}. Emperor penguins stay faithful only a season at a time.`); } },
        { k: 'steady', label: 'Find a patient partner who calls steadily', hint: 'Stable', bias: { caution: 1, social: 0.6 }, fx: (s, R) => { s.mate = R.pick(SEA); s.n.bond = 80; s.family.push({ rel: 'Mate', name: s.mate, note: '' }); flag(s, 'paired', `You paired with ${s.mate}, steady and patient.`); } },
        { k: 'skip', label: 'Skip a year', hint: 'No chick this year', bias: { caution: 0.4 }, fx: (s) => { s.done.mate = 0; s.age += 0.5; say(s, 'You skipped the courtship and fed through the winter. There will be another autumn.', { tone: 'calm' }); } },
      ] },
    ],
    events: [
      { id: 'ice', w: 1, tone: 'hard', when: (s) => s.age < 2, fx: (s) => { s.env.ice = cl(s.env.ice - 0.1, 0.4, 1.1); say(s, 'The sea ice broke up earlier than usual this year. Climate and weather shape everything for penguins.', { tone: 'hard' }); } },
      { id: 'aurora', w: 2, tone: 'calm', when: (s) => true, fx: (s) => say(s, 'Aurora lights rippled across the polar night above thousands of huddled birds.', { tone: 'calm' }) },
      { id: 'krill', w: 2, tone: 'joy', when: (s) => s.age > 0.6, fx: (s) => { N(s, 'food', 18); say(s, 'A shimmering cloud of krill, and the whole flock gorged.', { tone: 'joy' }); } },
      { id: 'play', w: 1.5, tone: 'joy', when: (s) => s.age > 0.6 && s.age < 5, fx: (s) => { s.n.skill = cl(s.n.skill + 4); say(s, 'Porpoising through the waves with a group of friends, for the sheer speed of it.', { tone: 'joy' }); } },
      { id: 'storm', w: 1.5, tone: 'hard', when: (s) => s.age < 0.6, fx: (s) => { N(s, 'warmth', -10); say(s, 'A fierce storm. The colony huddled tighter and waited it out.', { tone: 'hard' }); } },
      { id: 'tourist', w: 0.6, tone: 'calm', when: (s) => s.age > 1, fx: (s) => say(s, 'A research ship stopped nearby, and curious scientists counted the colony from a respectful distance.', { tone: 'calm' }) },
    ],
  };

  // =============== GREEN SEA TURTLE ===============
  const TB = [{ name: 'Tortuguero (Costa Rica)', light: 0.15, w: 3 }, { name: 'Raine Island (Great Barrier Reef)', light: 0.05, w: 3 }, { name: 'Ascension Island (Atlantic)', light: 0.05, w: 2 }, { name: 'Poilao (Guinea-Bissau)', light: 0.05, w: 2 }, { name: 'a beach in Hawaii (French Frigate Shoals)', light: 0.1, w: 1 }, { name: 'a beach near a resort town (Mediterranean)', light: 0.7, w: 1 }];
  const tStage = (a) => (a < 0.15 ? 'Egg' : a < 0.17 ? 'Hatchling' : a < 5 ? 'Juvenile (ocean)' : a < 30 ? 'Juvenile (coast)' : 'Adult');
  M.turtle = {
    dt: (s) => (s.age < 0.3 ? 1 / 52 : s.age < 3 ? 0.25 : 1),
    stage: tStage,
    fmtAge: (a) => (a < 0.15 ? `${Math.round(a * 52)} weeks` : `${a.toFixed(1)} years`),
    birth(s, R, avoid) {
      const b = pickPlace(R, TB, avoid); s.traits = { bold: R.r(), caution: R.r(), social: R.r(), curious: R.r() };
      const temp = 29.5 + 1.2 * R.norm() + (b.light > 0.5 ? 0.5 : 0); const pf = 1 / (1 + Math.exp(-(temp - 29.2) / 0.6));
      s.sex = R.chance(pf) ? 'female' : 'male'; s.temp = temp; s.name = R.pick(SEA); s.n = { health: 90, food: 70, skill: 0, safety: 50, homing: 0 };
      s.env = { light: b.light }; s.eggs = 0; s.clutches = 0; s.nextNest = 31; s.nestBeach = null; s.mates = 0; s.yr = 0;
      s.born = { key: b.name, place: b.name, env: 'Tropical beach', story: `${s.name} was one of about a hundred eggs buried in warm sand on ${b.name}. The sand held ${temp.toFixed(1)} degrees, and in sea turtles the sand's warmth helps decide whether a turtle is male or female. For ${s.name}, it was ${s.sex}. No parent stayed. Mother had already returned to the sea.` };
      s.family = [{ rel: 'Mother', name: R.pick(SEA), note: 'laid the clutch and left' }, ...Array.from({ length: 6 }, () => ({ rel: 'Nestmate', name: R.pick(SEA), note: '' }))];
    },
    tick(s, dt, R) {
      N(s, 'food', R.range(-8, 10)); N(s, 'health', s.n.food > 30 ? 1 : -2);
      if (s.age >= s.nextNest && s.sex === 'female') {
        const n = R.int(3, 5), eggs = n * R.int(95, 125), beach = s.nestBeach || s.born.place; s.clutches += n; s.eggs += eggs; s.nextNest = s.age + R.int(2, 4);
        s.family.push({ rel: 'Offspring', name: `${eggs} eggs`, note: `laid at ${beach}, age ${Math.floor(s.age)}` });
        say(s, `Nesting season at ${beach}: you hauled out by moonlight and laid ${n} clutches, about ${eggs} eggs in all, hoping a few would see the sea.`, { tone: 'joy', turn: s.clutches === n });
      } else if (s.age >= s.nextNest && s.sex === 'male') { s.nextNest = s.age + R.int(1, 3); s.mates += R.int(1, 3); say(s, 'You swam to the breeding grounds off the nesting beach and mated with several females. Males migrate to breed far more often than females nest.', { tone: 'calm' }); }
    },
    hazard(s) {
      const a = s.age, m = s.mods.h * (1 + Math.max(0, 40 - s.n.health) / 60);
      if (a < 0.15) return { 'a flooded nest': hz(0.6, 0.15) * m * 0.4, 'a ghost crab or predator in the nest': hz(0.6, 0.15) * m * 0.6 };
      if (a < 0.17) return { 'predators on the beach': hz(0.7, 0.02) * m };
      if (a < 1) return { 'seabirds and fish in the open ocean': hz(0.5, 0.83) * m };
      if (a < 5) return { 'predators in the open ocean': hz(0.55, 4) * m * 0.7, 'floating plastic and nets': hz(0.55, 4) * m * 0.3 };
      if (a < 30) return { 'sharks': hz(0.85, 1) * m * 0.3, 'fishing nets and boats': hz(0.85, 1) * m * 0.5, disease: hz(0.85, 1) * m * 0.2 };
      return { 'fishing nets and boats': hz(0.95, 1) * m * 0.5, 'disease and sharks': hz(0.95, 1) * m * 0.5, 'old age': 0.004 * Math.exp(0.1 * (a - 60)) * m };
    },
    death: (s, c) => ({ text: `${s.name} died at ${fy(s.age)}, of ${c}. ${s.eggs ? `You laid about ${s.eggs} eggs in your life, and some of those turtles still cross the ocean.` : s.age < 1 ? 'Fewer than one egg in a thousand becomes an adult turtle, and this is how that number comes about.' : 'The ocean current carried on.'}` }),
    eventRate: (s) => (s.age < 0.3 ? 2 : 0.7),
    stats: (s) => [['Nesting beach', s.born.place], ['Sex', `${s.sex} (nest temperature ${s.temp.toFixed(1)} C)`], ['Eggs laid', s.eggs], ['Nesting clutches', s.clutches], ['Foraging skill', Math.round(s.n.skill)]],
    meters: (s) => [['Health', s.n.food > 0 ? s.n.health : 0, 'g'], ['Fed', s.n.food, 'o'], ['Navigation skill', s.n.skill, 'b'], ['Safety', s.n.safety, 'r']],
    info: (s) => [['Born at', s.born.place], ['Sex', s.sex], ['Nest temp', `${s.temp.toFixed(1)} C`], ['Lights near the beach', s.env.light > 0.5 ? 'Bright' : s.env.light > 0.1 ? 'Some' : 'Dark'], ['Eggs laid', s.eggs]],
    milestones: [
      { id: 'hatch', when: (s) => s.age >= 0.15, fx: (s) => say(s, `After about 55 days, ${s.name} and ${'the whole nest'} pipped out and scrambled up through the sand together, at night, when it is coolest.`, { tone: 'joy' }) },
      { id: 'frenzy', when: (s) => s.age >= 0.18, fx: (s) => say(s, 'The swim frenzy: you paddled non-stop for about 36 hours to get beyond the coastal predators.', { tone: 'calm' }) },
      { id: 'weed', when: (s) => s.age >= 0.8, fx: (s) => say(s, 'You drifted among rafts of floating sargassum weed, the open ocean\'s nursery.', { tone: 'calm' }) },
      { id: 'settle', when: (s) => s.age >= 5, fx: (s) => { N(s, 'food', 20); say(s, 'You left the open ocean for the first seagrass meadow. From now on you are a grazer, and the meadow keeps you safe.', { tone: 'joy' }); } },
    ],
    decisions: [
      { id: 'dash', when: (s) => s.age >= 0.15, title: 'The dash to the sea', text: (s) => `Dark beach. Ahead, a low glow. ${s.env.light > 0.5 ? 'The town behind the dunes is bright, brighter than the sea.' : 'The sea reflects a little moonlight, and everything else is black.'} The ocean is somewhere, and you cannot ask.`, options: [
        { k: 'bright', label: 'Head for the brightest glow', hint: 'Instinct says light', bias: { bold: 0.6 }, fx: (s, R) => { const ok = R.chance(1 - s.env.light * 0.75); if (ok) { N(s, 'safety', 10); say(s, 'You followed the glow and it was the sea.', { tone: 'joy' }); } else { N(s, 'health', -20); s.mods.h *= 1.5; say(s, 'It was streetlights. You wandered the wrong way, exhausted, until volunteers carried the lost hatchlings to the water.', { tone: 'hard', turn: true }); } } },
        { k: 'slope', label: 'Follow the downhill slope', hint: 'The beach slopes to the sea', bias: { caution: 1, curious: 0.5 }, fx: (s, R) => { N(s, 'safety', 8); say(s, 'You followed the slope of the sand, the oldest compass there is.', { tone: 'calm' }); } },
        { k: 'pause', label: 'Wait for the others', hint: 'Safety in numbers, but daylight is coming', bias: { social: 1 }, fx: (s, R) => { if (R.chance(0.6)) { say(s, 'You waited and rushed in with the whole group, overwhelming the crabs.', { tone: 'calm' }); } else { N(s, 'health', -8); s.mods.h *= 1.2; say(s, 'Dawn came early, and so did the gulls.', { tone: 'hard' }); } } },
      ] },
      { id: 'drift', when: (s) => s.age >= 0.5, title: 'Where to drift', text: 'The ocean currents run in great loops. You can ride the main current or stay in a weed raft.', options: [
        { k: 'gyre', label: 'Ride the great current', hint: 'Fast, far', bias: { bold: 1, curious: 0.5 }, fx: (s) => { s.n.skill = cl(s.n.skill + 10); N(s, 'food', 6); say(s, 'You crossed an ocean basin on the current, one of the great journeys of the sea.', { tone: 'joy' }); } },
        { k: 'raft', label: 'Stay in the weed raft', hint: 'Food and cover, slow', bias: { caution: 1 }, fx: (s) => { N(s, 'food', 12); N(s, 'safety', 8); say(s, 'You sheltered and nibbled in the weed, safe among tiny creatures.', { tone: 'calm' }); } },
      ] },
      { id: 'meadow', when: (s) => s.age >= 5, title: 'Choosing a meadow', text: 'Two seagrass meadows: a close, crowded one and a distant, richer one.', options: [
        { k: 'near', label: 'The nearby meadow', hint: 'Safe', bias: { caution: 1 }, fx: (s) => { N(s, 'food', 8); N(s, 'safety', 10); say(s, 'You grazed the near meadow with its familiar currents.', { tone: 'calm' }); } },
        { k: 'far', label: 'The far, richer meadow', hint: 'Richer, riskier', bias: { bold: 1 }, fx: (s, R) => { if (R.chance(0.75)) { N(s, 'food', 24); N(s, 'health', 6); say(s, 'The far meadow was a green paradise.', { tone: 'joy' }); } else { N(s, 'health', -10); say(s, 'Boat traffic and fishing nets made the far meadow harder than it looked.', { tone: 'hard' }); } } },
      ] },
      { id: 'home', when: (s) => s.age >= 30 && s.sex === 'female', title: 'The pull of home', text: (s) => `After decades, something tells you where to go: the beach you hatched on, ${s.born.place}, is thousands of kilometres away.`, options: [
        { k: 'natal', label: 'Return to your natal beach', hint: 'Natal homing, a long swim', irrev: true, bias: { caution: 0.6, social: 0.4 }, fx: (s) => { s.nestBeach = s.born.place; N(s, 'homing', 100); flag(s, 'homing', `You returned to ${s.born.place}, the beach you hatched on, after decades at sea, a navigation feat no one fully understands.`); } },
        { k: 'near', label: 'Nest on a nearer beach', hint: 'Shorter swim, unfamiliar sand', bias: { bold: 0.6 }, fx: (s) => { s.nestBeach = 'a nearer beach'; say(s, 'You chose the nearest decent beach and laid there.', { tone: 'calm' }); } },
      ] },
    ],
    events: [
      { id: 'net', w: 1.5, tone: 'hard', when: (s) => s.age >= 1, fx: (s, R) => { if (R.chance(0.7)) { N(s, 'health', -10); say(s, 'You tangled in a fishing net. A turtle-excluder device, or a fisher who cared, set you free.', { tone: 'hard' }); } else { N(s, 'health', -20); say(s, 'A net dragged you for a long time before the line broke.', { tone: 'hard' }); } } },
      { id: 'plastic', w: 1, tone: 'hard', when: (s) => s.age >= 0.3, fx: (s) => { N(s, 'health', -6); say(s, 'A plastic bag looked like a jellyfish. You noticed in time, mostly.', { tone: 'hard' }); } },
      { id: 'cleaner', w: 2, tone: 'joy', when: (s) => s.age >= 5, fx: (s) => { N(s, 'health', 6); say(s, 'Cleaner fish at a reef station nibbled algae off your shell. You hung in the water, perfectly still.', { tone: 'joy' }); } },
      { id: 'storm', w: 1, tone: 'hard', when: (s) => s.age >= 0.2, fx: (s) => { N(s, 'food', -6); say(s, 'A cyclone churned the water. You dived deep and waited it out.', { tone: 'hard' }); } },
      { id: 'friends', w: 2, tone: 'joy', when: (s) => s.age >= 5, fx: (s) => say(s, 'A dozen turtles gathered at the same sunny reef to rest. It was a sort of gathering.', { tone: 'joy' }) },
      { id: 'tumour', w: 0.5, tone: 'hard', when: (s) => s.age >= 5, fx: (s) => { N(s, 'health', -12); s.mods.h *= 1.05; say(s, 'A skin disease (fibropapillomatosis) left growths that slowed you down. Some turtles recover.', { tone: 'hard' }); } },
      { id: 'meet', w: 1.5, tone: 'calm', when: (s) => s.age >= 1, fx: (s) => say(s, 'A pod of dolphins played alongside you for an hour and left.', { tone: 'calm' }) },
      { id: 'grass', w: 2, tone: 'joy', when: (s) => s.age >= 5, fx: (s) => { N(s, 'food', 15); say(s, 'The meadow flourished. You grazed until the water turned gold at sunset.', { tone: 'joy' }); } },
    ],
  };

  // =============== BLUE WHALE ===============
  const WP = [{ name: 'the Eastern North Pacific (California and the Gulf of California)', threat: 0.7, w: 3 }, { name: 'the Antarctic Southern Ocean', threat: 0.15, w: 3 }, { name: 'Chilean Patagonia (Gulf of Corcovado)', threat: 0.4, w: 2 }, { name: 'the northern Indian Ocean (Sri Lanka)', threat: 0.75, w: 1 }];
  const wStage = (a) => (a < 0.6 ? 'Calf' : a < 5 ? 'Juvenile' : a < 10 ? 'Subadult' : 'Adult');
  M.whale = {
    dt: () => 1 / 12, stage: wStage, fmtAge: (a) => (a < 2 ? `${Math.round(a * 12)} months` : `${a.toFixed(1)} years`),
    birth(s, R, avoid) {
      const p = pickPlace(R, WP, avoid); s.traits = { bold: R.r(), caution: R.r(), social: R.r(), curious: R.r() };
      s.sex = R.chance(0.5) ? 'female' : 'male'; s.name = R.pick(SEA); s.mother = R.pick(SEA);
      s.env = { krill: R.range(0.6, 1), threat: p.threat }; s.n = { health: 95, food: 85, skill: 0, bond: 95, voice: 5 };
      s.calves = 0; s.nextCalf = R.range(10, 13); s.yr = 0;
      s.born = { key: p.name, place: p.name, env: 'Open ocean', story: `${s.name} was born in warm water in ${p.name}: seven metres long, two and a half tonnes, a calf of the largest animal that has ever lived. Mother ${s.mother} nursed ${s.name} on milk as rich as cream. The first six months of life are mostly milk, swimming and ${s.mother}'s low voice.` };
      s.family = [{ rel: 'Mother', name: s.mother, note: 'nursed you' }];
    },
    tick(s, dt, R) {
      if (Math.floor(s.age) > s.yr) { s.yr = Math.floor(s.age); s.env.krill = cl(s.env.krill + R.range(-0.2, 0.2), 0.3, 1.1); }
      N(s, 'food', (s.env.krill - 0.6) * 12 + R.range(-6, 8)); N(s, 'health', s.n.food > 30 ? 0.6 : -2); if (s.age >= 0.6) N(s, 'bond', -0.5); if (s.age > 3) N(s, 'voice', 0.3);
      if (s.sex === 'female' && s.age >= s.nextCalf && s.age < 55) { s.calves++; s.nextCalf = s.age + R.range(2.2, 3.2); s.family.push({ rel: 'Calf', name: R.pick(SEA), note: `born when you were ${Math.floor(s.age)}` }); say(s, `You gave birth to a calf after eleven months of pregnancy, in warm water. For the next half year, the whole world was ${s.calves === 1 ? 'new' : 'familiar and new at once'}.`, { tone: 'joy', turn: s.calves === 1 }); }
    },
    hazard(s) {
      const a = s.age, m = s.mods.h * (1 + Math.max(0, 40 - s.n.health) / 60), t = s.env.threat;
      const sen = 0.004 * Math.exp(0.1 * Math.max(0, a - 45));
      const cal = a < 0.6 ? 0.2 : a < 2 ? 0.08 : 0.012;
      return { 'an orca encounter': cal * 0.4 * m, starvation: cal * 0.3 * m * (1.5 - s.env.krill), 'a ship strike': 0.003 * t * m, 'fishing gear entanglement': 0.002 * t * m, illness: cal * 0.3 * m, 'old age': sen * m };
    },
    death: (s, c) => ({ text: `${s.name} died at ${fy(s.age)}, of ${c}, and slowly sank into the deep. A whale fall feeds a whole ecosystem on the sea floor for decades. ${s.calves ? `${s.calves} calves swim on.` : ''}` }),
    eventRate: () => 0.6,
    stats: (s) => [['Waters', s.born.place], ['Sex', s.sex], ['Calves', s.calves], ['Song', Math.round(s.n.voice)], ['Feeding grounds', s.env.krill > 0.8 ? 'Rich' : 'Mixed']],
    meters: (s) => [['Health', s.n.health, 'g'], ['Fed', s.n.food, 'o'], ['Bond with mother', s.age < 5 ? s.n.bond : 0, 'r'], ['Voice and song', s.n.voice, 'p']],
    info: (s) => [['Waters', s.born.place], ['Krill', s.env.krill > 0.85 ? 'Dense' : s.env.krill > 0.6 ? 'Patchy' : 'Poor'], ['Mother', s.mother], ['Calves', s.calves], ['Ship traffic', s.env.threat > 0.6 ? 'Heavy' : s.env.threat > 0.3 ? 'Moderate' : 'Light']],
    milestones: [
      { id: 'milk', when: (s) => s.age >= 0.1, fx: (s) => { say(s, `${s.name} was putting on about 90 kilograms a day on ${s.mother}'s milk.`, { tone: 'joy' }); } },
      { id: 'wean', when: (s) => s.age >= 0.6, fx: (s) => say(s, 'Weaning. You learned to gulp krill, as your mother had shown you on the migration.', { tone: 'calm' }) },
      { id: 'song', when: (s) => s.age >= 5 && s.sex === 'male', fx: (s) => { N(s, 'voice', 20); say(s, 'Your voice deepened into a low song, a 20-hertz call that carries for hundreds of kilometres.', { tone: 'joy' }); } },
    ],
    decisions: [
      { id: 'follow', when: (s) => s.age >= 0.25, title: 'The first migration', text: 'The water is cooling. Your mother turns north to the feeding grounds. The journey is long.', options: [
        { k: 'close', label: 'Stay in your mother\'s slipstream', hint: 'Easy, safe', bias: { caution: 1, social: 0.6 }, fx: (s) => { N(s, 'bond', 6); say(s, 'You drafted in her wake for thousands of kilometres.', { tone: 'calm' }); } },
        { k: 'range', label: 'Swim wider, explore', hint: 'Curious, tiring', bias: { curious: 1, bold: 0.6 }, fx: (s, R) => { N(s, 'food', -8); N(s, 'bond', -6); s.n.voice = cl(s.n.voice + 5); if (R.chance(0.1)) { N(s, 'health', -14); say(s, 'A passing ship came too close. You swerved back to your mother.', { tone: 'hard' }); } else say(s, 'You swam off a hundred metres each time and came back, learning your ocean.', { tone: 'joy' }); } },
      ] },
      { id: 'ground', when: (s) => s.age >= 2, title: 'Choosing a feeding ground', text: 'Cold upwelling zones are krill-rich but change from year to year. Your mother\'s route is the safe known one.', options: [
        { k: 'mother', label: 'Follow your mother\'s old route', hint: 'Known, reliable', bias: { caution: 1 }, fx: (s) => { N(s, 'food', 10); say(s, 'You followed the route you learned and found krill where she did.', { tone: 'calm' }); } },
        { k: 'new', label: 'Try an unfamiliar upwelling', hint: 'May be richer', bias: { bold: 1, curious: 0.8 }, fx: (s, R) => { if (R.chance(0.6)) { N(s, 'food', 22); flag(s, 'newground', 'You found a krill-rich upwelling your mother never knew, and it became your own.'); } else { N(s, 'food', -12); say(s, 'The new waters held little. A lean season.', { tone: 'hard' }); } } },
      ] },
      { id: 'lane', when: (s) => s.age >= 8 && s.env.threat > 0.3, title: 'A shipping lane', text: 'The shortest route crosses a busy shipping lane. The long way is a detour of days.', options: [
        { k: 'cross', label: 'Cross the lane', hint: 'Quick, risky', bias: { bold: 1 }, fx: (s, R) => { if (R.chance(0.1 + s.env.threat * 0.15)) { N(s, 'health', -35); s.mods.h *= 1.4; say(s, 'A container ship passed close. You survived with scars.', { tone: 'hard', turn: true }); } else say(s, 'You slipped across at night, between ships.', { tone: 'calm' }); } },
        { k: 'around', label: 'Take the long way', hint: 'Safe, slower', bias: { caution: 1 }, fx: (s) => { N(s, 'food', -6); say(s, 'You went around, adding days to the journey.', { tone: 'calm' }); } },
      ] },
      { id: 'sing', when: (s) => s.age >= 10, title: 'A low call across the ocean', text: 'Far away, another whale is calling. The sound travels hundreds of kilometres.', options: [
        { k: 'answer', label: 'Call back', hint: 'Social', bias: { social: 1 }, fx: (s) => { N(s, 'voice', 10); say(s, 'You called back, and the reply took ten minutes to arrive.', { tone: 'joy' }); } },
        { k: 'listen', label: 'Just listen', hint: 'Quiet', bias: { caution: 0.8 }, fx: (s) => { say(s, 'You listened to a conversation across half an ocean.', { tone: 'calm' }); } },
      ] },
    ],
    events: [
      { id: 'bloom', w: 2, tone: 'joy', when: (s) => s.age >= 0.6, fx: (s) => { N(s, 'food', 20); say(s, 'A krill bloom, thick as soup. You lunge-fed for days.', { tone: 'joy' }); } },
      { id: 'warm', w: 1.2, tone: 'hard', when: (s) => s.age >= 0.6, fx: (s) => { s.env.krill = cl(s.env.krill - 0.15, 0.3, 1.1); N(s, 'food', -12); say(s, 'A marine heatwave scattered the krill. A lean year for every whale in the region.', { tone: 'hard' }); } },
      { id: 'breach', w: 1.5, tone: 'joy', when: (s) => s.age >= 1, fx: (s) => say(s, 'You surfaced and exhaled a plume that rose ten metres, in the sun.', { tone: 'joy' }) },
      { id: 'orca', w: 0.7, tone: 'hard', when: (s) => s.age < 4, fx: (s) => { N(s, 'safety', -10); say(s, 'A pod of orcas circled. Your mother placed herself between you and them until they moved on.', { tone: 'hard', turn: true }); } },
      { id: 'noise', w: 1, tone: 'hard', when: (s) => s.env.threat > 0.5, fx: (s) => { N(s, 'voice', -6); say(s, 'Ship noise drowned out the songs, so you had to call louder.', { tone: 'hard' }); } },
      { id: 'friends', w: 1.5, tone: 'calm', when: (s) => s.age > 3, fx: (s) => say(s, 'You fed alongside two other blues for a few days, a rare, quiet company.', { tone: 'calm' }) },
    ],
  };

  // =============== MONARCH BUTTERFLY ===============
  const MP = [{ name: 'a meadow in the American Midwest', w: 4, west: 0 }, { name: 'a roadside in southern Ontario', w: 2, west: 0 }, { name: 'a garden in central Texas', w: 2, west: 0 }, { name: 'a park on the California coast', w: 1, west: 1 }];
  const D = 1 / 365;
  const mStage = (a) => { const d = a / D; return d < 4 ? 'Egg' : d < 18 ? 'Caterpillar' : d < 28 ? 'Chrysalis' : 'Butterfly'; };
  M.monarch = {
    dt: () => D, stage: mStage, fmtAge: (a) => `${Math.round(a / D)} days`,
    birth(s, R, avoid) {
      const p = pickPlace(R, MP, avoid); s.traits = { bold: R.r(), caution: R.r(), social: R.r(), curious: R.r() };
      const late = R.chance(0.2); s.mig = late; s.sex = R.chance(0.5) ? 'female' : 'male'; s.name = 'Monarch ' + R.pick(SEA); s.eggs = 0;
      s.env = { milk: R.range(0.5, 1), weather: 0.7 }; s.n = { health: 90, food: 60, growth: 0, fat: 10, safety: 50 }; s.site = null; s.south = false; s.stage2 = 0;
      s.born = { key: p.name, place: p.name, env: 'Meadow', story: `${s.name} was an egg the size of a pinhead, glued to the underside of a milkweed leaf in ${p.name}. The leaf was food, shelter and the whole world. ${late ? 'It is late summer, so you belong to the "super generation": born to fly south, with a life measured in months, not weeks.' : 'It is high summer, so your life will be short, a few weeks of eating, changing, flying and laying eggs.'}` };
      s.family = [{ rel: 'Mother', name: 'a female monarch', note: 'laid you on milkweed' }];
    },
    tick(s, dt, R) {
      const d = s.age / D;
      if (d < 28) { N(s, 'food', R.range(-6, 10) * s.env.milk); if (mStage(s.age) === 'Caterpillar') s.n.growth = cl(s.n.growth + 7 * s.env.milk); N(s, 'health', s.n.food > 25 ? 0.5 : -2); }
      else { N(s, 'food', R.range(-8, 9)); N(s, 'fat', s.mig ? 0.4 : 0); if (s.sex === 'female' && !s.mig && d > 33 && d < 55 && R.chance(0.4)) s.eggs += R.int(8, 30); }
      if (s.mig && d >= 28 && d < 40 && s.south) N(s, 'fat', 1);
      if (d >= 240 && s.mig && s.south && s.sex === 'female' && !s.done.spring) { s.done.spring = 1; s.eggs += R.int(150, 400); say(s, 'In spring you left the Mexican mountains and laid eggs on the first milkweed you found in Texas, the first of the next generation.', { tone: 'joy', turn: true }); }
    },
    hazard(s) {
      const d = s.age / D, m = s.mods.h * (1 + Math.max(0, 40 - s.n.health) / 60), W = 365;
      if (d < 4) return { 'ants and rain': 0.06 * W * m };
      if (d < 18) return { 'wasps and spiders': (d < 8 ? 0.1 : 0.05) * W * m * (1.4 - s.env.milk), 'a parasitic fly': 0.015 * W * m, 'disease': 0.01 * W * m };
      if (d < 28) return { 'parasites': 0.015 * W * m, 'a storm': 0.015 * W * m * (s.site === 'sheltered' ? 0.4 : 1) };
      if (s.mig) { const t = s.south && d < 120 ? 0.004 : 0.0015; return { 'birds': 0.0015 * W * m, 'cold nights and storms': t * W * m * (s.env.weather < 0.4 ? 1.8 : 1), 'old age': 0.0012 * W * Math.exp((d - 28) / 70) * m, 'traffic': 0.001 * W * m }; }
      return { birds: 0.01 * W * m, 'a storm': 0.006 * W * m, 'traffic': 0.004 * W * m, 'old age': 0.004 * W * Math.exp((d - 28) / 11) * m };
    },
    death: (s, c) => ({ text: `${s.name} died at ${Math.round(s.age / D)} days, of ${c}. ${s.eggs ? `You laid about ${s.eggs} eggs, and some will become butterflies.` : ''} ${s.mig && s.south ? 'The ones who survive the journey home seed the spring.' : 'A summer butterfly lives its whole story in a few weeks.'}` }),
    eventRate: () => 12,
    stats: (s) => [['Born at', s.born.place], ['Generation', s.mig ? 'Migratory ("super generation")' : 'Summer'], ['Sex', s.sex], ['Eggs laid', s.eggs], ['Days lived', Math.round(s.age / D)]],
    meters: (s) => { const d = s.age / D; return [['Health', s.n.health, 'g'], ['Fed', s.n.food, 'o'], d < 18 ? ['Growth', s.n.growth, 'y'] : ['Fat reserves', s.n.fat, 'y'], ['Safety', s.n.safety, 'b']]; },
    info: (s) => [['Born at', s.born.place], ['Generation', s.mig ? 'Migratory' : 'Summer'], ['Sex', s.sex], ['Milkweed', s.env.milk > 0.8 ? 'Plentiful' : 'Patchy'], ['Eggs laid', s.eggs]],
    milestones: [
      { id: 'hatch', when: (s) => s.age >= 4 * D, fx: (s) => say(s, 'You hatched and ate your own eggshell first, then the milkweed leaf you were born on.', { tone: 'joy' }) },
      { id: 'molt', when: (s) => s.age >= 11 * D, fx: (s) => say(s, 'Your fourth moult. By now you weigh a thousand times what you did at hatching.', { tone: 'calm' }) },
      { id: 'meta', when: (s) => s.age >= 18 * D, fx: (s) => say(s, 'You hung in a J and split your skin one last time, and the chrysalis hardened around you: pale jade with a dotted gold rim. Inside, you came apart and rebuilt.', { tone: 'joy', turn: true }) },
      { id: 'emerge', when: (s) => s.age >= 28 * D, fx: (s) => say(s, 'You crawled out damp and crumpled, pumped fluid into your wings, and after an hour, spread them: orange, black and white. Your first flight followed.', { tone: 'joy', turn: true }) },
      { id: 'arrive', when: (s) => s.mig && s.south && s.age >= 100 * D, fx: (s) => { N(s, 'safety', 20); say(s, 'You arrived in the oyamel fir forests of the Mexican mountains, a place you had never seen, and hung with a million others in a golden mass, in the cool, still air.', { tone: 'joy', turn: true }); } },
    ],
    decisions: [
      { id: 'cat', when: (s) => s.age >= 9 * D, title: 'A shadow on the leaf', text: 'Something is moving on the stem: a wasp, perhaps.', options: [
        { k: 'freeze', label: 'Freeze', hint: 'Safe, hungry', bias: { caution: 1 }, fx: (s, R) => { N(s, 'food', -10); say(s, 'You stayed motionless until the wasp wandered off.', { tone: 'calm' }); } },
        { k: 'eat', label: 'Keep feeding', hint: 'Growth, exposed', bias: { bold: 1 }, fx: (s, R) => { s.n.growth = cl(s.n.growth + 10); N(s, 'food', 12); if (R.chance(0.15)) { s.mods.h *= 1.5; say(s, 'It noticed you. You escaped, shaken.', { tone: 'hard' }); } else say(s, 'You ate on, and the wasp never noticed.', { tone: 'calm' }); } },
        { k: 'drop', label: 'Drop on a silk thread', hint: 'Escape', bias: { curious: 0.5 }, fx: (s) => { N(s, 'food', -6); say(s, 'You dropped to the ground, then climbed back up.', { tone: 'calm' }); } },
      ] },
      { id: 'site', when: (s) => s.age >= 17 * D, title: 'Where to hang the chrysalis', text: 'The caterpillar wanders away from the milkweed to find a place to hang.', options: [
        { k: 'sheltered', label: 'Under a sheltered branch', hint: 'Protected from storms', bias: { caution: 1 }, fx: (s) => { s.site = 'sheltered'; N(s, 'safety', 12); flag(s, 'site', 'You hung your chrysalis under a sheltered branch, and a storm weeks later did not reach you.'); } },
        { k: 'leaf', label: 'Under a leaf, nearby', hint: 'Easy, exposed', bias: { curious: 0.4 }, fx: (s) => { s.site = 'leaf'; say(s, 'You hung from the milkweed itself.', { tone: 'calm' }); } },
        { k: 'wall', label: 'High on a wall', hint: 'Far from ants, exposed to wind', bias: { bold: 1 }, fx: (s) => { s.site = 'wall'; N(s, 'safety', 4); s.mods.h *= 1.1; say(s, 'You climbed high, away from ants, into the wind.', { tone: 'calm' }); } },
      ] },
      { id: 'south', when: (s) => s.mig && s.age >= 29 * D, title: 'Something tells you: south', text: 'Shorter days, cooler air. A sun compass in your brain points the way, though you have never been there.', options: [
        { k: 'go', label: 'Fly south now', hint: 'A 4,000 km journey. Hard to undo', irrev: true, bias: { bold: 0.5, caution: 0.3 }, fx: (s) => { s.south = true; N(s, 'fat', 8); flag(s, 'south', 'You set out south on a journey of up to 4,000 kilometres, using a sun compass and a magnetic sense.'); } },
        { k: 'wait', label: 'Wait for a warm day', hint: 'Safer today, risk of cold later', bias: { caution: 1 }, fx: (s, R) => { N(s, 'fat', 6); s.env.weather = R.range(0.3, 0.9); s.south = true; say(s, 'You waited out a cold front, feeding on late-blooming asters, then set off.', { tone: 'calm' }); } },
      ] },
      { id: 'lay', when: (s) => s.sex === 'female' && !s.mig && s.age >= 33 * D, title: 'Where to lay', text: 'A meadow of milkweed. Each egg gets one plant.', options: [
        { k: 'many', label: 'Spread eggs across many plants', hint: 'Safer odds', bias: { caution: 1 }, fx: (s) => { s.eggs += 0; flag(s, 'spread', 'You laid your eggs across many plants. A single bad patch could not take them all.'); } },
        { k: 'best', label: 'Choose the lush patch', hint: 'Rich food, ants close', bias: { bold: 0.6 }, fx: (s) => { say(s, 'You picked the greenest patch for your eggs.', { tone: 'calm' }); } },
      ] },
      { id: 'roost', when: (s) => s.mig && s.south && s.age >= 60 * D, title: 'A cold night in the mountains', text: 'Temperatures are dropping. Other monarchs are clustering.', options: [
        { k: 'cluster', label: 'Join a cluster in the trees', hint: 'Safe, crowded', bias: { social: 1 }, fx: (s) => { N(s, 'safety', 12); say(s, 'Thousands of butterflies hung together, trapping warmth.', { tone: 'calm' }); } },
        { k: 'alone', label: 'Roost alone', hint: 'Colder', bias: { bold: 0.6 }, fx: (s) => { N(s, 'safety', -8); s.mods.h *= 1.2; say(s, 'You roosted alone and felt every degree.', { tone: 'hard' }); } },
      ] },
    ],
    events: [
      { id: 'nectar', w: 3, tone: 'joy', when: (s) => s.age >= 28 * D, fx: (s) => { N(s, 'food', 14); N(s, 'fat', s.mig ? 3 : 0); say(s, 'A field of goldenrod and asters: nectar for hours, in the sun.', { tone: 'joy' }); } },
      { id: 'rain', w: 2, tone: 'hard', when: (s) => true, fx: (s) => { s.env.weather = cl(s.env.weather - 0.1, 0.2, 1); N(s, 'food', -8); say(s, 'A rainstorm. You pressed under a leaf and waited.', { tone: 'hard' }); } },
      { id: 'bird', w: 1, tone: 'hard', when: (s) => s.age >= 28 * D, fx: (s) => { N(s, 'safety', -8); say(s, 'A bird snapped at you and the taste (milkweed toxins) made it spit you out. Your bright colours are a warning.', { tone: 'hard' }); } },
      { id: 'mow', w: 0.6, tone: 'hard', when: (s) => s.age < 18 * D, fx: (s) => { s.env.milk = cl(s.env.milk - 0.15, 0.2, 1); say(s, 'A mower worked a nearby field. Milkweed grew scarce, and you moved on.', { tone: 'hard' }); } },
      { id: 'garden', w: 1.5, tone: 'joy', when: (s) => s.age >= 28 * D, fx: (s) => { N(s, 'food', 10); say(s, 'A garden planted for pollinators, and someone had left milkweed on purpose.', { tone: 'joy', turn: s.born.place.includes('garden') }); } },
      { id: 'tailwind', w: 1.5, tone: 'joy', when: (s) => s.mig && s.south && s.age < 100 * D, fx: (s) => { N(s, 'fat', 5); say(s, 'A strong northerly tailwind carried you 150 km in a single day.', { tone: 'joy' }); } },
      { id: 'hurricane', w: 0.5, tone: 'hard', when: (s) => s.mig && s.south && s.age < 100 * D, fx: (s) => { s.env.weather = 0.3; N(s, 'fat', -6); say(s, 'A storm front over the Gulf of Mexico forced you to land and wait, burning precious fat.', { tone: 'hard' }); } },
    ],
  };
})(typeof window !== 'undefined' ? window : globalThis);
