// Detail layer for the animal modules: an account of every stretch of life (so quiet time still tells you what happened)
// plus extra decisions at specific moments. Stage and need values come from the simulation; text only describes them.
(function (g) {
  const LE = g.LE, M = LE.modules, say = LE.say, flag = LE.flag, N = LE.mod;
  const cl = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
  const P = (R, a) => R.pick(a);
  const fillA = (s, t) => t.replace(/\{n\}/g, s.name).replace(/\{m\}/g, s.mother || 'mother');
  // choose a line that is not the previous one
  const fresh = (s, R, arr) => { let t, i = 0; do { t = R.pick(arr); i++; } while (t === s.lastLine && i < 4); s.lastLine = t; return t; };
  const join = (s, parts) => fillA(s, parts.filter(Boolean).join(' '));

  // ===== dog and cat =====
  const ST = { 'Newborn puppy': 0, 'Newborn kitten': 0, Puppy: 1, Kitten: 1, Adolescent: 2, Adult: 3, Senior: 4 };
  const CA = {
    dog: [
      ['{n} was a warm, blind bundle pressed against {m} and the littermates.', 'Days were milk, sleep and the sound of {m}\'s heartbeat.', '{n} wriggled to the front of the pile whenever {m} came back.'],
      ['{n} chewed everything within reach, including a shoe, a rope and a sibling\'s ear.', 'Every new smell was a discovery, and the world was mostly smells.', '{n} learned that a wagging tail makes people smile.', 'Puppyhood was a blur of zoomies and naps in odd places.'],
      ['{n} was all legs and opinions, testing every rule and every fence.', 'Adolescence made {n} bold and sometimes deaf to every command.', '{n} chased anything that moved and was surprised every time it ran.', 'The teenage months were loud, muddy and full of energy.'],
      ['{n} knew the routine of every day and loved it: the walk, the meal, the nap.', 'Adult life settled into familiar smells, familiar faces and a favourite spot.', '{n} patrolled the usual route, nose busy with news.', 'A calm, confident year of fetch, sniffing and sitting close to people.'],
      ['{n} moved slower and slept more, with grey on the muzzle.', 'Old legs made stairs a negotiation, but the nose was as sharp as ever.', '{n} greeted every person like an old friend, a little slower than before.', 'Long naps in the sun were the best part of the day.'],
    ],
    cat: [
      ['{n} was a tiny, blind kitten, kneading {m} and purring before learning to see.', 'Days were milk, warmth and a pile of siblings.', '{n} learned the smell of {m} before anything else.'],
      ['{n} pounced on every shadow, string and moving toe.', 'Kitten days were short bursts of chaos separated by instant sleep.', '{n} climbed everything, then discovered it was a long way down.', 'Everything was a toy, including the curtains.'],
      ['{n} grew into long legs and bigger plans, with a new interest in heights.', 'The adolescent months were all window ledges and midnight sprints.', '{n} worked out which people were soft touches and which were not.', 'Boundaries were something to be tested by a cat, in private.'],
      ['{n} had a territory, a routine and a quiet confidence in both.', 'Adult life was patrols at dawn, naps through the heat and an evening round of the neighbourhood.', '{n} picked a favourite spot and defended it politely.', 'Hunting practice, grooming and long naps filled a good year.'],
      ['{n} slept more, jumped less and purred louder.', 'The old cat found the warmest spot in every room.', '{n} watched the garden from a windowsill, no longer needing to prove anything.', 'Slower days, softer steps, a favourite blanket.'],
    ],
  };
  const HOME = { home: ['Home was warm, with a bowl that was always filled and a lap that was almost always available.', 'The household\'s routine became {n}\'s routine.', 'The family\'s voices were a comfort even from another room.', 'There was always someone around, which {n} counted as luck.'],
    shelter: ['The shelter was loud and clean, with kind staff and a lot of neighbours calling out.', 'Volunteers came and went each day, and every visitor was a possibility.', 'A cage, a blanket and a patient routine made up the days.', 'Days at the shelter were measured in feeding times and visitors.'],
    stray: ['The streets were a patchwork of food stalls, parked cars and corners to hide in.', 'Every day was about finding food, water and a dry spot.', 'Strangers could mean a kick or a crust; {n} learned to tell the difference.', 'Nights were cold under a stairwell, and mornings meant the hunt began again.'] };
  for (const v of ['dog', 'cat']) { /* both variants share a module; diary reads s.sp */ }
  M.companion.diaryEvery = 1;
  M.companion.diary = function (s, R) {
    const i = ST[s.stage], parts = [fresh(s, R, CA[s.sp][i])];
    if (R.chance(0.7)) parts.push(P(R, HOME[s.home]));
    if (s.n.food < 28) parts.push('Food was scarce, and the hunger showed.');
    else if (s.n.health < 40) parts.push('Something was wrong with the body, and each day took more effort.');
    else if (s.n.calm < 28) parts.push('It was an anxious time, and every sound made {n} flinch.');
    else if (s.n.bond > 75 && R.chance(0.5)) parts.push('{n} was deeply loved, and knew it.');
    else if (s.n.trust < 20 && s.home !== 'home') parts.push('People were not to be trusted yet.');
    return join(s, parts);
  };
  M.companion.eventRate = () => 1.4;
  M.companion.decisions.push(
    { id: 'toddler', when: (s) => s.sp === 'dog' && s.home === 'home' && s.age >= 1.2 && s.age < 4, title: 'A toddler grabs your tail', text: (s) => `A small human has discovered ${s.name}'s tail and is delighted. ${s.name} is not.`, options: [
      { k: 'endure', label: 'Put up with it', hint: 'Patient and gentle', bias: { social: 1, caution: 0.4 }, fx: (s) => { N(s, 'bond', 10); N(s, 'trust', 8); N(s, 'calm', -4); flag(s, 'gentle', 'You were patient with a small child, and the family never forgot it.'); } },
      { k: 'leave', label: 'Walk away and lie somewhere else', hint: 'Avoids trouble', bias: { caution: 1 }, fx: (s) => { N(s, 'calm', 6); say(s, 'You found a spot out of reach. The toddler found you again, but later.', { tone: 'calm' }); } },
      { k: 'warn', label: 'Growl a clear warning', hint: 'Honest, risky', bias: { bold: 1 }, fx: (s, R) => { if (R.chance(0.7)) { N(s, 'bond', 2); say(s, 'The adults taught the child to be gentle. The tail got some peace.', { tone: 'calm' }); } else { N(s, 'trust', -12); N(s, 'bond', -10); say(s, 'The household was shaken, and you were watched closely for weeks.', { tone: 'hard', turn: true }); } } },
    ] },
    { id: 'newpup', when: (s) => s.sp === 'dog' && s.home === 'home' && s.age >= 4 && s.age < 8, title: 'A new puppy arrives', text: (s) => `The family brought home a puppy. ${s.name} must decide what to do about it.`, options: [
      { k: 'welcome', label: 'Welcome it and teach it the rules', hint: 'Friendship', bias: { social: 1 }, fx: (s) => { N(s, 'bond', 6); N(s, 'calm', 6); say(s, 'You showed the puppy where to sleep, what to chew and what not to.', { tone: 'joy' }); } },
      { k: 'ignore', label: 'Ignore it', hint: 'Peace and quiet', bias: { caution: 0.6 }, fx: (s) => { N(s, 'calm', 2); say(s, 'You pretended the puppy was a moving cushion.', { tone: 'calm' }); } },
      { k: 'guard', label: 'Guard your toys and bed', hint: 'Possessive', bias: { bold: 0.8 }, fx: (s) => { N(s, 'calm', -6); N(s, 'bond', -2); say(s, 'You drew clear lines: this was yours, that was theirs.', { tone: 'calm' }); } },
    ] },
    { id: 'carrier', when: (s) => s.sp === 'cat' && s.home === 'home' && s.age >= 1 && s.age < 6, title: 'The cat carrier appears', text: (s) => `${s.name} recognises the box. It means the vet.`, options: [
      { k: 'hide', label: 'Vanish under the bed', hint: 'Avoid it', bias: { caution: 1 }, fx: (s) => { N(s, 'calm', -4); N(s, 'trust', -2); say(s, 'You were found after an hour. The vet visit happened anyway.', { tone: 'calm' }); } },
      { k: 'go', label: 'Go in with dignity', hint: 'Cooperate', bias: { social: 0.8 }, fx: (s) => { N(s, 'health', 6); N(s, 'trust', 4); s.mods.h = Math.max(0.6, s.mods.h * 0.97); say(s, 'You sat in the box like a queen. The vet said you were in perfect shape.', { tone: 'joy' }); } },
      { k: 'yowl', label: 'Make your displeasure heard', hint: 'Loud', bias: { bold: 1 }, fx: (s) => { N(s, 'calm', -6); N(s, 'health', 4); say(s, 'You yowled the whole way there and the whole way back. Everyone knew.', { tone: 'calm' }); } },
    ] },
    { id: 'newpet', when: (s) => s.sp === 'cat' && s.home === 'home' && s.age >= 3 && s.age < 9, title: 'Someone else has moved in', text: (s) => `A new pet has arrived in ${s.name}'s house, and it has opinions.`, options: [
      { k: 'accept', label: 'Slowly accept it', hint: 'Takes weeks', bias: { social: 0.8 }, fx: (s) => { N(s, 'calm', 4); N(s, 'bond', 4); say(s, 'After a month of hissing, you shared the same sunbeam.', { tone: 'joy' }); } },
      { k: 'boss', label: 'Make it clear who is in charge', hint: 'Establish rank', bias: { bold: 1 }, fx: (s) => { N(s, 'calm', -2); say(s, 'You established a firm hierarchy, and the newcomer agreed.', { tone: 'calm' }); } },
      { k: 'avoid', label: 'Avoid it and sit up high', hint: 'Safe', bias: { caution: 1 }, fx: (s) => { N(s, 'calm', 2); say(s, 'You took over the top of the bookshelf and watched.', { tone: 'calm' }); } },
    ] },
  );

  // ===== lion =====
  const LL = { 'Newborn cub': ['{n} spent the first weeks hidden in a thicket with {m}, who moved the litter whenever she felt unsafe.', 'The world was the den, the smell of {m} and the grunting of siblings.'], 'Young cub': ['{n} tumbled after the aunts, ambushed tails and learned that lion cubs are everyone\'s business.', 'Play was practice: stalk, pounce, wrestle, repeat.', '{n} followed the pride on its slow patrols, always last, always interested.'], Juvenile: ['{n} began to watch the hunts seriously and to join in a clumsy way.', 'The juvenile months were full of stalking practice and getting it wrong.', '{n} ate when the adults had finished and learned patience the hard way.'], Subadult: ['{n} was nearly adult-sized and still working out what that meant.', 'Subadult months mixed confidence and uncertainty in about equal measure.', '{n} learned the edges of the territory and who lived beyond them.'], Adult: ['{n} held a place in the pride, hunting, resting and watching.', 'Adult life was mostly rest, punctuated by short bursts of effort.', 'The seasons passed in cycles of hunts, naps and territory checks.'], Senior: ['{n} moved slower and let the young do the hunting.', 'Old scars and slower legs made every day a calculation.', 'The pride still made room for {n} at kills, out of loyalty.'] };
  M.lion.diaryEvery = 1;
  M.lion.diary = function (s, R) {
    const parts = [fresh(s, R, LL[s.stage] || LL.Adult)];
    if (s.env.drought > 0) parts.push('The drought dried the waterholes and the herds drifted off.');
    else if (s.env.prey > 0.95 && R.chance(0.5)) parts.push('Prey was everywhere, and the pride was fat and lazy.');
    else if (s.env.prey < 0.6) parts.push('Prey was thin, and the pride roamed far for each meal.');
    if (s.n.food < 25) parts.push('Hunger was a constant companion.');
    else if (s.n.health < 40) parts.push('A wound or illness slowed every step.');
    if (s.sex === 'female' && s.stage === 'Adult' && R.chance(0.3)) parts.push('The pride\'s lionesses hunted together, signalling with flicks of their tails.');
    if (s.sex === 'male' && s.stage === 'Adult' && R.chance(0.3)) parts.push('Roars at dusk marked the territory\'s edge for miles.');
    return join(s, parts);
  };
  M.lion.eventRate = () => 1.4;
  M.lion.decisions.push(
    { id: 'preyc', when: (s) => s.age >= 3.5 && s.age < 11, title: 'Which prey?', text: 'A herd grazes nearby: buffalo, zebra and a few warthogs. The pride is hungry.', options: [
      { k: 'buffalo', label: 'Go for the buffalo', hint: 'Big meal, big danger', bias: { bold: 1 }, fx: (s, R) => { if (R.chance(0.45 + s.n.skill / 300)) { N(s, 'food', 28); N(s, 'status', 6); say(s, 'The pride took down a buffalo after a long, dangerous chase. Everyone ate for days.', { tone: 'joy' }); } else { N(s, 'health', -16); N(s, 'food', -6); say(s, 'The buffalo fought back, and you left with a limp and an empty stomach.', { tone: 'hard' }); } } },
      { k: 'zebra', label: 'Go for the zebra', hint: 'Fast, balanced', bias: { curious: 0.6 }, fx: (s, R) => { if (R.chance(0.6)) { N(s, 'food', 18); say(s, 'A zebra, at last. Quick, loud and efficient.', { tone: 'calm' }); } else { N(s, 'food', -4); say(s, 'The herd scattered. A hungry night followed.', { tone: 'calm' }); } } },
      { k: 'warthog', label: 'Go for the warthogs', hint: 'Small and safe', bias: { caution: 1 }, fx: (s) => { N(s, 'food', 10); say(s, 'A small meal, little risk, and a good deal of digging.', { tone: 'calm' }); } },
    ] },
    { id: 'water', when: (s) => s.env.drought > 0 && s.age >= 1, title: 'The last waterhole', text: 'The drought has left one waterhole, shared with crocodiles, hippos and everyone else.', options: [
      { k: 'drink', label: 'Drink at dusk, quickly', hint: 'Balanced', bias: { caution: 0.6 }, fx: (s) => { N(s, 'food', 6); say(s, 'You drank fast, at the edge, with one eye on the reeds.', { tone: 'calm' }); } },
      { k: 'far', label: 'Walk to a farther, safer waterhole', hint: 'Safe, long walk', bias: { caution: 1 }, fx: (s) => { N(s, 'food', -6); N(s, 'health', -3); say(s, 'You walked half the night to a quieter pool.', { tone: 'calm' }); } },
      { k: 'wait', label: 'Wait and drink with the pride at dawn', hint: 'Together', bias: { social: 1 }, fx: (s) => { N(s, 'bond', 6); say(s, 'You drank with the whole pride in the cool of dawn.', { tone: 'joy' }); } },
    ] },
  );

  // ===== penguin =====
  const PL = { Egg: ['The egg sat on its father\'s feet in the dark, wrapped in a fold of warm skin, at minus 40.', 'Inside the shell {n} was growing, wrapped in warmth and sound.'], Hatchling: ['{n} pecked free and lay on a parent\'s feet under the brood pouch, fed with a milky secretion.', 'The hatchling days were warmth, a faint peep and the sound of the colony.'], Chick: ['{n} huddled in the creche with hundreds of other grey chicks while parents trekked to the sea.', 'Between feeds the chicks squeaked, shoved and slept in a crowd.', '{n} grew fast on regurgitated fish and krill from a parent just back from the sea.'], Juvenile: ['{n} spent months at sea, learning to hunt and avoid being hunted.', 'The ocean was cold, wide and full of food and danger in about equal measure.', '{n} dived deeper each month, chasing fish, krill and squid.'], Adult: ['{n} followed the colony\'s annual rhythm: sea in summer, ice in the dark months.', 'Adult life meant long swims, long walks and long fasts.', '{n} spent the year between the ice and the sea.'] };
  M.penguin.diaryEvery = 1;
  M.penguin.diary = function (s, R) {
    const parts = [fresh(s, R, PL[s.stage])];
    if (s.env.ice < 0.6) parts.push('The sea ice was thin and breaking early.');
    else if (s.env.ice > 0.95 && R.chance(0.4)) parts.push('The sea ice was solid and stable this year.');
    if (s.n.food < 25) parts.push('Food was hard to find.');
    if (s.n.warmth < 25 && s.age < 1) parts.push('The cold bit hard.');
    if (s.stage === 'Adult' && s.mate && R.chance(0.35)) parts.push(`${s.mate} and ${s.name} called to each other across the colony.`);
    return join(s, parts);
  };
  M.penguin.eventRate = () => 1.4;
  M.penguin.decisions.push(
    { id: 'skua', when: (s) => s.age >= 0.3 && s.age < 0.6, title: 'A giant petrel circles', text: 'A big dark bird is patrolling the creche, looking for a chick on its own.', options: [
      { k: 'huddle', label: 'Press into the huddle', hint: 'Safest', bias: { caution: 1, social: 0.6 }, fx: (s) => { N(s, 'safety', 4); say(s, 'You were one of a hundred identical grey shapes, and the bird gave up.', { tone: 'calm' }); } },
      { k: 'freeze', label: 'Freeze where you are', hint: 'Hope to blend in', bias: { caution: 0.5 }, fx: (s, R) => { if (R.chance(0.7)) say(s, 'The bird passed over you.', { tone: 'calm' }); else { N(s, 'health', -12); say(s, 'The bird took a peck at you before adults chased it off.', { tone: 'hard' }); } } },
      { k: 'run', label: 'Run to your parent\'s call', hint: 'Fast, exposed', bias: { bold: 1 }, fx: (s, R) => { if (R.chance(0.6)) { N(s, 'bond', 6); say(s, 'You waddled through the crowd to the voice you knew.', { tone: 'joy' }); } else { N(s, 'health', -8); say(s, 'You tripped over three other chicks and were lucky.', { tone: 'hard' }); } } },
    ] },
    { id: 'sealdive', when: (s) => s.age >= 1.0 && s.age < 4, title: 'A shape under the ice', text: 'A leopard seal has been seen near the ice edge. The fish are on the other side.', options: [
      { k: 'wait', label: 'Wait for the group', hint: 'Safer', bias: { caution: 1, social: 0.6 }, fx: (s) => { N(s, 'food', -6); say(s, 'You waited with the others until the seal moved on.', { tone: 'calm' }); } },
      { k: 'dive', label: 'Dive in and swim fast', hint: 'Food now, risk', bias: { bold: 1 }, fx: (s, R) => { if (R.chance(0.75)) { N(s, 'food', 18); s.n.skill = cl(s.n.skill + 6); say(s, 'You darted past, speed against teeth, and ate well.', { tone: 'joy' }); } else { N(s, 'health', -18); say(s, 'A near miss left you torn and shaking.', { tone: 'hard' }); } } },
      { k: 'other', label: 'Find another ice edge', hint: 'Long walk', bias: { curious: 0.6 }, fx: (s) => { N(s, 'food', -4); N(s, 'health', -2); say(s, 'You walked a long way across the ice to a different edge.', { tone: 'calm' }); } },
    ] },
  );

  // ===== sea turtle =====
  const TL = { Egg: ['{n} was one egg in a clutch of around a hundred, in warm sand, in the dark.', 'Under the beach, {n} grew in a nest warmed by the sun.'], Hatchling: ['{n} was a hatchling with a swimming frenzy and a long way to go.'], 'Juvenile (ocean)': ['{n} drifted on currents, eating jellyfish, small crabs and whatever came by.', 'The open ocean was huge and empty, with a few floating weed rafts to hide in.', '{n} grew steadily, a small turtle in a very big sea.'], 'Juvenile (coast)': ['{n} grazed the seagrass meadow every day, getting heavier and greener.', 'The meadow was safe, with cleaning stations and long naps.', 'Years passed in a routine of grazing, resting and dodging boats.'], Adult: ['{n} cruised the coast and the open ocean, grazing and resting.', 'Adult turtles move between feeding and breeding grounds across oceans.', '{n} dived and rested, a small part of a very old ocean story.'] };
  M.turtle.diaryEvery = 1;
  M.turtle.diary = function (s, R) {
    const parts = [fresh(s, R, TL[s.stage])];
    if (s.n.food < 25) parts.push('Food was scarce, and the shell felt heavy.');
    else if (s.n.health < 40) parts.push('Something ailed the body and slowed every swim.');
    if (s.stage === 'Adult' && s.sex === 'female' && R.chance(0.3)) parts.push('Somewhere in the body a clock was counting toward the next nesting season.');
    return join(s, parts);
  };
  M.turtle.eventRate = () => 1.2;
  M.turtle.decisions.push(
    { id: 'jelly', when: (s) => s.age >= 0.7 && s.age < 5, title: 'A jellyfish, or something', text: 'A pale, floating shape drifts nearby. It looks like food.', options: [
      { k: 'eat', label: 'Eat it', hint: 'Might be food, might be plastic', bias: { bold: 1 }, fx: (s, R) => { if (R.chance(0.65)) { N(s, 'food', 14); say(s, 'It was a jellyfish. It tasted like the sea.', { tone: 'calm' }); } else { N(s, 'health', -16); s.mods.h *= 1.1; say(s, 'It was a plastic bag. It sat in the gut for days.', { tone: 'hard', turn: true }); } } },
      { k: 'sniff', label: 'Circle it first', hint: 'Slow, careful', bias: { caution: 1 }, fx: (s) => { N(s, 'food', 4); s.n.skill = cl(s.n.skill + 4); say(s, 'You circled until you were sure, then ate or left it as the sea suggested.', { tone: 'calm' }); } },
      { k: 'leave', label: 'Swim on', hint: 'Safe', bias: { caution: 0.8 }, fx: (s) => { N(s, 'food', -4); say(s, 'You left it alone and kept drifting.', { tone: 'calm' }); } },
    ] },
    { id: 'cyclone', when: (s) => s.age >= 5 && s.age < 40, title: 'A storm builds', text: 'The sea heaves and the sky darkens. A big storm is coming.', options: [
      { k: 'deep', label: 'Dive deep and wait', hint: 'Calm below, needs air', bias: { caution: 1 }, fx: (s) => { N(s, 'food', -4); say(s, 'You held in the deep water and let the surface rage.', { tone: 'calm' }); } },
      { k: 'reef', label: 'Shelter in the reef', hint: 'Protected, crowded', bias: { social: 0.6 }, fx: (s) => { N(s, 'safety', 4); say(s, 'The reef took the force of the waves, and you took the reef.', { tone: 'calm' }); } },
      { k: 'ride', label: 'Ride it out at the surface', hint: 'Risky', bias: { bold: 1 }, fx: (s, R) => { if (R.chance(0.6)) say(s, 'You rode the waves like a cork.', { tone: 'calm' }); else { N(s, 'health', -12); say(s, 'The storm threw you around and left you exhausted.', { tone: 'hard' }); } } },
    ] },
  );

  // ===== blue whale =====
  const WL = { Calf: ['{n} stayed close to {m}, nursing several times a day, rolling in the water and learning to breathe in rhythm.', 'The calf\'s world was {m}\'s flank, the ocean\'s hum and milk.'], Juvenile: ['{n} learned to lunge-feed under {m}\'s eye and made plenty of mistakes.', 'The juvenile whale grew by metres, every year.', '{n} followed seasonal currents, discovering where the krill were.'], Subadult: ['{n} was nearly full-grown and more independent every season.', 'The ocean was getting familiar: routes, sounds, feeding grounds.', '{n} spent months alone and a few weeks in company.'], Adult: ['{n} migrated between feeding and breeding grounds, thousands of kilometres each year.', 'Adult life was a long cycle of feeding, travelling and singing.', 'Each season brought the same journey and a different ocean.'] };
  M.whale.diaryEvery = 3;
  M.whale.diary = function (s, R) {
    const parts = [fresh(s, R, WL[s.stage])];
    if (s.env.krill < 0.5) parts.push('Krill was sparse, and the whale roamed farther for each mouthful.');
    else if (s.env.krill > 0.9 && R.chance(0.4)) parts.push('Krill was thick, and each lunge took in tonnes of water and food.');
    if (s.env.threat > 0.6 && R.chance(0.3)) parts.push('Ship noise was constant, a low drone under the songs.');
    if (s.sex === 'female' && s.calves && R.chance(0.2)) parts.push('The calves were somewhere in the ocean, and the mother\'s song carried across.');
    return join(s, parts);
  };
  M.whale.eventRate = () => 1.0;
  M.whale.decisions.push(
    { id: 'orcas', when: (s) => s.age >= 0.8 && s.age < 6, title: 'Orcas', text: 'Dark fins at the horizon: a pod of orcas has noticed the whales.', options: [
      { k: 'deep', label: 'Dive and flee at speed', hint: 'Fast, tiring', bias: { bold: 0.6 }, fx: (s, R) => { N(s, 'food', -6); if (R.chance(0.8)) say(s, 'Your big body outran them, mostly.', { tone: 'calm' }); else { N(s, 'health', -16); say(s, 'They got close enough to leave marks.', { tone: 'hard' }); } } },
      { k: 'stay', label: 'Stay with the group', hint: 'Safety in numbers', bias: { social: 1, caution: 0.6 }, fx: (s) => { N(s, 'safety', 4); say(s, 'The adults closed ranks, and the orcas moved on.', { tone: 'calm' }); } },
      { k: 'shallow', label: 'Head for shallow water', hint: 'Different risk', bias: { curious: 0.4 }, fx: (s, R) => { if (R.chance(0.6)) say(s, 'The shallows confused them, and you slipped away.', { tone: 'calm' }); else { N(s, 'health', -10); say(s, 'The shallows were cramped and dangerous.', { tone: 'hard' }); } } },
    ] },
    { id: 'diet', when: (s) => s.age >= 6 && s.age < 30, title: 'Krill or fish', text: 'A swarm of krill is thin and far; a school of small fish is close.', options: [
      { k: 'krill', label: 'Wait for the krill', hint: 'Your main food', bias: { caution: 0.8 }, fx: (s) => { N(s, 'food', 12); say(s, 'You waited, and the krill rose at dusk.', { tone: 'calm' }); } },
      { k: 'fish', label: 'Take the fish while you can', hint: 'Quick, less ideal', bias: { bold: 0.6 }, fx: (s) => { N(s, 'food', 8); say(s, 'You gulped the fish school and moved on, a little unsure.', { tone: 'calm' }); } },
    ] },
  );

  // ===== monarch =====
  const ML = { Egg: ['{n} was a ridged, pale egg on a milkweed leaf, glued by a mother who never saw it again.', 'Inside the shell, a caterpillar was forming.'], Caterpillar: ['{n} ate milkweed without stopping, growing and shedding skin.', 'Each leaf was a meal, and each meal made the toxins stronger.', '{n} left chewed leaf edges and a trail of droppings.'], Chrysalis: ['Inside the chrysalis, {n} was dissolving and rebuilding, with no sign from outside.', 'The jade case hung still while everything inside it changed.'], Butterfly: ['{n} flew from flower to flower, drinking nectar in the sun.', 'The butterfly days were warmth, nectar and a constant eye on shadows.', '{n} roosted in sheltered branches overnight and flew at first light.'] };
  M.monarch.diaryEvery = 2;
  M.monarch.diary = function (s, R) {
    const parts = [fresh(s, R, ML[s.stage])];
    if (s.stage === 'Butterfly' && s.mig && s.south) parts.push(P(R, ['{n} flew south day after day, following a sun compass no one taught it.', 'Each night {n} roosted with other travelling monarchs; each morning they moved on.']));
    if (s.stage === 'Butterfly' && s.mig && !s.south) parts.push('{n} fed on late flowers, building fat for a journey it has never made.');
    if (s.env.weather < 0.4) parts.push('The weather was rough, and travel slowed.');
    if (s.n.food < 25) parts.push('Nectar was hard to find.');
    return join(s, parts);
  };
  M.monarch.eventRate = () => 14;
  M.monarch.decisions.push(
    { id: 'flower', when: (s) => s.age >= 30 / 365 && s.age < 70 / 365, title: 'Which flowers?', text: 'Three patches of flowers are in view: a bright garden, a wild meadow and a busy roadside.', options: [
      { k: 'garden', label: 'The bright garden', hint: 'Rich, popular', bias: { social: 0.6 }, fx: (s) => { N(s, 'food', 16); say(s, 'The garden was crowded with bees, and the nectar was excellent.', { tone: 'joy' }); } },
      { k: 'meadow', label: 'The wild meadow', hint: 'Quiet, varied', bias: { curious: 0.8 }, fx: (s) => { N(s, 'food', 10); N(s, 'safety', 4); say(s, 'The meadow was quiet and full of surprises.', { tone: 'calm' }); } },
      { k: 'road', label: 'The roadside flowers', hint: 'Close, but traffic', bias: { bold: 0.8 }, fx: (s, R) => { N(s, 'food', 8); if (R.chance(0.2)) { N(s, 'health', -10); say(s, 'A truck passed within a wingspan.', { tone: 'hard' }); } else say(s, 'You fed in the draught of passing cars.', { tone: 'calm' }); } },
    ] },
    { id: 'shower', when: (s) => s.age >= 30 / 365 && s.age < 150 / 365, title: 'Dark clouds', text: 'A storm front is rolling in. You can shelter or push on.', options: [
      { k: 'shelter', label: 'Shelter under leaves', hint: 'Safe, loses time', bias: { caution: 1 }, fx: (s) => { N(s, 'food', -4); say(s, 'You clung to the underside of a leaf and waited out the rain.', { tone: 'calm' }); } },
      { k: 'push', label: 'Push on ahead of the storm', hint: 'Fast, risky', bias: { bold: 1 }, fx: (s, R) => { if (R.chance(0.6)) { N(s, 'fat', 4); say(s, 'You beat the front, with wet wings at the end.', { tone: 'calm' }); } else { N(s, 'health', -14); say(s, 'The storm caught you in the open.', { tone: 'hard' }); } } },
    ] },
  );
})(typeof window !== 'undefined' ? window : globalThis);
