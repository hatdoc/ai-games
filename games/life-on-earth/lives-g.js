// Wild animal modules, batch 2: polar bear, bald eagle, koala, giraffe, tiger. Built with LE.wild (lives-e.js).
// Survival figures are MODELLED to land inside published life-expectancy ranges; places are real, their weights a gameplay choice.
(function (g) {
  const LE = g.LE, W = LE.wild;
  const R = (name, w, food, threat) => ({ name, w, food, threat });

  // =============== POLAR BEAR ===============
  W('polar', {
    names: ['Nanuq', 'Sila', 'Aput', 'Kaya', 'Siku', 'Nuka', 'Anori', 'Tuuq', 'Imiq', 'Pana', 'Aska', 'Qilak'],
    regions: [R('Svalbard (Norway)', 2, 0.8, 0.15), R('western Hudson Bay (Manitoba, Canada)', 2, 0.65, 0.3), R('the Beaufort Sea (Alaska, USA/Canada)', 2, 0.7, 0.2), R('the Chukchi Sea (Russia/USA)', 2, 0.75, 0.25), R('East Greenland (Denmark)', 2, 0.8, 0.15), R('Franz Josef Land (Russia)', 1, 0.85, 0.1), R('Baffin Bay (Canada/Greenland)', 2, 0.8, 0.2)],
    stages: [[0.3, 'Newborn cub'], [2.3, 'Cub'], [5, 'Subadult'], [20, 'Adult'], [99, 'Senior']],
    dt: (a) => (a < 0.3 ? 1 / 24 : a < 2.3 ? 1 / 12 : 1 / 6), nurse: 2.3, rate: [1.1, 0.8], env: 'Arctic sea ice', sibs: [0, 2], group: [2, 6],
    bands: [[0.3, 0.9, [['the cold in the den', 0.3], ['illness', 0.3], ['a failure of the milk', 0.4]]], [1, 0.72, [['hunger when the ice melts early', 0.45, 1], ['illness', 0.2], ['an adult male', 0.2], ['drowning', 0.15]]], [2.3, 0.88, [['hunger when the ice melts early', 0.5, 1], ['illness', 0.25], ['drowning', 0.25]]], [5, 0.85, [['hunger when the ice melts early', 0.5, 1], ['illness', 0.2], ['injury', 0.15], ['a clash with another bear', 0.15]]]],
    adult: { base: 0.06, causes: [['hunger when the ice melts early', 0.45, 1], ['injury', 0.2], ['illness', 0.15], ['a clash with another bear', 0.2]], senA: 0.008, senK: 0.15 },
    threat: 0.03, threatName: 'hunters or conflict with people',
    breed: { from: 5, to: 22, every: [2.8, 3.4], litter: [1, 3], surv: [0.4, 1], femaleOnly: true, noun: 'cub', nounPl: 'cubs', yes: 'You gave birth to {k} in a snow den in the middle of winter, and stayed there fasting for months.', no: 'You came out of the den alone. The cubs had not survived the winter.' },
    legacy: 'The ice went on drifting, and the wind erased the tracks.', skill: 'Hunting skill', fed: 'Fed', bondLabel: 'Mother bond', groupLabel: 'Bears nearby', foodLabel: 'Sea ice and seals', badName: 'Early ice melt',
    story: (s) => `{n} was born, a ${s.sex} cub, in a snow den dug by {mother} near {place}, in the dark of mid-winter: about 600 grams, blind and nearly hairless.${s.sibs ? ` You shared the den with ${s.sibs} sibling${s.sibs > 1 ? 's' : ''}.` : ''} Outside was the Arctic night; inside was {mother}'s warmth and milk so rich it would make you fat in weeks.`,
    diary: { to: 2.3, young: ['{n} nursed in the dark, tucked against {mother}\'s warm belly.', 'A day of tumbling on the ice behind {mother}, learning to walk on snow.', 'You followed {mother} across the ice, riding on her back through open water.'], adult: ['A day of walking the ice edge, waiting at a breathing hole for a seal.', 'You rested in a snow drift and watched the horizon.', 'The wind changed and you followed a scent for kilometres.'] },
    milestones: [['den', 0.25, 'In early spring {mother} dug open the den. {n} saw daylight for the first time: dazzling white, blue shadows and wind.', 'joy'], ['walk', 0.35, 'Your first walk across the sea ice, in a slow line behind {mother}.'], ['swim', 0.9, 'Your first swim: {mother} slid into the water and you scrambled in after, gasping with cold.', 'joy'], ['seal', 1.3, 'You watched {mother} wait at a seal\'s breathing hole for hours, and then strike. You tried it once yourself, and fell in.']],
    decisions: [
      { id: 'seal', from: 1.2, to: 2.4, title: 'The breathing hole', text: 'Your mother has found a seal breathing hole. She is waiting, and the cub is told to stay still.', opts: [
        ['still', 'Stay perfectly still', 'Learn safely', { caution: 1 }, { skill: 12, bond: 4 }, 'You watched her wait and strike, and learned how patience works on the ice.'],
        ['help', 'Creep closer to help', 'Bold. Risky', { bold: 1 }, { skill: 18, food: 10 }, 'You helped to pin the seal.', { p: 0.55, fx: { food: -4, safety: -8 }, t: 'Your movement alerted the seal. It vanished, and your mother gave you a long look.' }],
        ['play', 'Chase snowballs instead', 'Joy', { social: 0.6 }, { bond: 6, skill: 3 }, 'You made your own game and she let you.']] },
      { id: 'alone', from: 2.1, to: 3.2, title: 'Alone at last', text: 'Your mother has chased you away. She is ready to mate again, and you are on your own.', opts: [
        ['coast', 'Head for the coast to scavenge', 'Safe-ish, close to people', { caution: 0.8 }, { food: 8, safety: -4, skill: 6 }, 'You headed for the shore to scavenge on whale and walrus remains.'],
        ['ice', 'Follow the ice edge to hunt seals', 'Skill, risk', { bold: 1 }, { skill: 14, food: 6 }, 'You hunted on your own for the first time, and it worked.', { p: 0.6, fx: { food: -10, health: -8 }, t: 'You were too inexperienced and went hungry for days.' }],
        ['elder', 'Follow an older bear at a distance', 'Cautious', { social: 0.5, caution: 0.5 }, { skill: 8, food: 4, flag: ['follow', 'You followed an older bear at a distance and learned where it hunted.'] }, '']] },
      { id: 'melt', from: 5, to: 20, title: 'The early melt', text: 'The ice is breaking up weeks earlier than it used to. You can follow it north or swim for land.', opts: [
        ['north', 'Follow the ice north', 'Hunting continues, effort', { bold: 0.8 }, { skill: 8, food: -8, health: -4 }, 'You followed the retreating ice for days, and it carried you to better hunting.', { p: 0.6, fx: { food: -14, health: -10 }, t: 'The ice vanished faster than you could swim. You made it, thin and exhausted.' }],
        ['land', 'Swim for land and fast', 'Safe, hungry', { caution: 1 }, { food: -16, health: -4, skill: 2 }, 'You came ashore and lived off your fat until the ice returned.'],
        ['forage', 'Scavenge eggs and berries', 'Flexible', { curious: 1 }, { food: 8, skill: 4 }, 'You ate eggs, berries and anything washed up. It is not seal fat, but it is something.']] },
      { id: 'town', from: 3, title: 'The smell of a settlement', text: 'A town lies ahead, with the smell of food and rubbish. A hungry bear is tempted.', opts: [
        ['approach', 'Approach the dump', 'Food, danger', { bold: 1 }, { food: 26, status: 2 }, 'You ate until you were full, and then people shouted.', { p: 0.5, fx: { safety: -18, health: -12 }, t: 'A patrol drove you off with noise and rubber bullets. You left hungry and sore.' }],
        ['avoid', 'Skirt the town', 'Safe', { caution: 1 }, { safety: 4, food: -3 }, 'You gave the town a wide berth.'],
        ['watch', 'Watch from a distance', 'Cautious curiosity', { curious: 0.8 }, { skill: 3 }, 'You watched, learned the pattern, and moved on.']] },
      { id: 'old', from: 18, title: 'Slower days', text: 'The ice is the same but you are slower. Hunting takes more patience and gets less.', opts: [
        ['shore', 'Scavenge on the shore', 'Comfort', { caution: 1 }, { food: 6, health: 2 }, 'You lived on what the tide brought in.'],
        ['hunt', 'Keep hunting at the ice edge', 'Pride, wear', { bold: 0.8 }, { status: 4, health: -5 }, 'You waited at the holes, slower but wiser.']] },
    ],
    events: [
      { w: 2.2, tone: 'joy', a: [0.5, 99], fx: { food: 24, skill: 3 }, t: 'A successful hunt: a ringed seal pulled from a breathing hole. You ate the blubber first.' },
      { w: 1.2, tone: 'hard', bad: 1, setBad: 0.9, fx: { food: -14 }, t: 'The ice broke up early. Seals were out of reach and you lived off your fat.' },
      { w: 1, a: [0.3, 99], fx: { health: 2 }, t: 'A blizzard hit. You dug into a drift and slept while the wind howled above.' },
      { w: 1, tone: 'hard', a: [0.3, 2.5], fx: { safety: -6, bond: 4 }, t: 'A strange adult male approached. Your mother put herself between the two of you, and the male walked away.' },
      { w: 1, a: [2.5, 99], fx: { food: 20 }, t: 'You came across a whale carcass on the shore and fed for days beside a dozen other bears.' },
      { w: 1, tone: 'hard', a: [0.5, 99], ok: (s) => s.born.region.threat > 0.2, fx: { safety: -6, health: -4 }, t: 'A helicopter circled, and a dart struck your shoulder. You woke on the ice with a numbered tag in your ear.' },
      { w: 1, a: [1, 99], t: 'The northern lights rippled across the sky above the ice. You did not look up; you were watching a hole.' },
      { w: 1, tone: 'hard', a: [0.2, 99], fx: { health: -12 }, t: 'You went through thin ice and swam hard for the edge. You pulled out frozen and shaking.' },
      { w: 0.7, tone: 'joy', a: [0.3, 2.5], fx: { bond: 5 }, t: 'A slide down a snow bank, over and over again, with your mother watching and waiting.' },
      { w: 0.8, f: 'follow', a: [3, 99], fx: { food: 4 }, t: 'Seal tracks crossed the ice.', t2: 'Because you followed an older bear when you were young, you knew where seals haul out in spring, and you ate well.' },
    ],
  });

  // =============== BALD EAGLE ===============
  W('eagle', {
    names: ['Sky', 'Talon', 'Ridge', 'Cedar', 'Zephyr', 'Alder', 'Birch', 'Finn', 'Gale', 'Crest', 'Sora', 'Vale'],
    regions: [R('the Chilkat River (Alaska, USA)', 2, 0.9, 0.1), R('Chesapeake Bay (Maryland/Virginia, USA)', 3, 0.85, 0.25), R('the Great Lakes shore (Minnesota, USA)', 3, 0.8, 0.2), R('the Puget Sound (Washington, USA)', 3, 0.85, 0.2), R('the Florida wetlands (USA)', 2, 0.8, 0.3), R('the Yellowstone region (Wyoming/Montana, USA)', 1, 0.75, 0.2), R('the coast of British Columbia (Canada)', 2, 0.9, 0.15)],
    stages: [[0.1, 'Egg'], [0.33, 'Nestling'], [1, 'Fledgling'], [5, 'Juvenile'], [25, 'Adult'], [99, 'Senior']],
    dt: (a) => (a < 0.4 ? 1 / 48 : a < 1 ? 1 / 12 : 1 / 6), nurse: 0.4, rate: [1.4, 0.8], env: 'Tall trees beside lakes, rivers and coasts', sibs: [0, 2], sibWord: 'Nest-mate', group: [2, 6],
    bands: [[0.1, 0.8, [['a cold snap or a nest raider', 0.4], ['an egg that never hatched', 0.4], ['a storm', 0.2]]], [0.33, 0.85, [['a storm', 0.25], ['starvation', 0.35, 1], ['a fall from the nest', 0.2], ['a great horned owl', 0.2]]], [1, 0.7, [['starvation', 0.4, 1], ['a collision', 0.2], ['illness', 0.2], ['lead poisoning', 0.2]]], [5, 0.8, [['hunger in a hard winter', 0.25, 1], ['a collision', 0.25], ['lead poisoning', 0.2], ['illness', 0.3]]]],
    adult: { base: 0.06, causes: [['lead poisoning', 0.2], ['a collision with a power line or vehicle', 0.25], ['illness', 0.25], ['hunger in a hard winter', 0.3, 1]], senA: 0.006, senK: 0.15 },
    threat: 0.03, threatName: 'shooting or poison',
    breed: { from: 5, to: 25, every: [1, 1.1], litter: [1, 3], surv: [0.4, 0.9], noun: 'eaglet', nounPl: 'eaglets', yes: 'You and your mate raised {k} in a huge stick nest high in a tall tree.', no: 'A storm took the nest, and this year no eaglet fledged. Eagles rebuild.' },
    legacy: 'The river ran on below the empty nest tree.', skill: 'Hunting skill', fed: 'Fed', bondLabel: 'Pair bond', groupLabel: 'Eagles nearby', foodLabel: 'Fish', badName: 'Hard freeze',
    story: (s) => `{n} was an egg, one of ${s.sibs + 1}, in a huge stick nest high in a tall tree near {place}. Both parents took turns sitting on the clutch for five weeks. The first thing {n} ever heard was {mother}'s voice through the shell.`,
    diary: { to: 1, young: ['{n} huddled in the nest while {mother} tore fish into tiny pieces and fed each chick in turn.', 'A day of squabbling in the nest, flapping on the rim and waiting for the next fish.', 'A parent brought a fish and the whole nest erupted in screaming.'], adult: ['A day spent perched on a high branch over the water, scanning for fish.', 'You soared on a thermal for hours without a single wingbeat.', 'A quiet day: perch, preen, watch the river.'] },
    milestones: [['hatch', 0.1, 'After five weeks of waiting, {n} pipped the shell and tumbled out: grey, damp and ravenous.', 'joy'], ['flap', 0.25, 'You started flapping on the nest rim, an exercise routine that terrified every stick beneath you.'], ['fledge', 0.33, 'After about twelve weeks you stepped off the nest, flapped hard and, for a few seconds, flew.', 'joy'], ['white', 4.5, 'Your head and tail turned white, five years in the making. The mottled brown of youth is gone.', 'joy']],
    decisions: [
      { id: 'edge', from: 0.3, to: 1, title: 'The edge of the nest', text: 'It is time to leave the nest. The branch is high and the ground is a long way down.', opts: [
        ['leap', 'Leap and flap hard', 'Bold. Risky', { bold: 1 }, { skill: 14, status: 4 }, 'You leapt, flapped and flew a clumsy circle.', { p: 0.7, fx: { health: -14, safety: -10 }, t: 'You landed in the undergrowth. Your parents fed you on the ground for days.' }],
        ['hop', 'Hop to a nearby branch first', 'Safe', { caution: 1 }, { skill: 8 }, 'You hopped from branch to branch until you were ready.'],
        ['wait', 'Wait a few more days', 'Cautious', { caution: 0.8 }, { skill: 2, bond: 4, food: 6 }, 'You waited and your parents kept bringing fish.']] },
      { id: 'fish', from: 0.5, to: 2, title: 'The first fish', text: 'The river is full of fish. They flash silver in the water below.', opts: [
        ['dive', 'Dive for a fish yourself', 'Skill, risk', { bold: 1 }, { skill: 18, food: 14 }, 'You struck, and your talons closed on something heavy.', { p: 0.4, fx: { food: -4, health: -6 }, t: 'You hit the water and came up empty. You tried again tomorrow.' }],
        ['steal', 'Steal one from another bird', 'Food, quarrel', { bold: 0.6 }, { food: 16, skill: 4, safety: -4 }, 'You mobbed an osprey until it dropped its catch.'],
        ['carrion', 'Find a dead fish on the shore', 'Safe', { caution: 1 }, { food: 10, skill: 2 }, 'There was a dead fish on the gravel bar. You were not too proud.']] },
      { id: 'winter', from: 0.8, to: 4, title: 'The first winter', text: 'The lake is freezing. Food will be hard to find if you stay.', opts: [
        ['south', 'Follow the river south', 'Safer', { curious: 0.6 }, { food: 4, skill: 6, safety: -3 }, 'You followed the thawing river south and found open water.'],
        ['stay', 'Stay and scavenge', 'Risky', { caution: 0.4 }, { food: -6, health: -4, skill: 2 }, 'You stayed and ate what you could find. It was a thin winter.'],
        ['gather', 'Join the eagles at the winter feeding ground', 'Social', { social: 1 }, { food: 16, bond: 4, flag: ['gather', 'You joined a winter gathering of eagles at an open river, learned where salmon run late in the year, and came back every winter.'] }, '']] },
      { id: 'mate', from: 4, to: 20, title: 'A mate', text: 'A mature eagle circles with you high above the river. They lock talons and spiral toward the ground in a cartwheel display.', opts: [
        ['pair', 'Accept the courtship', 'Settle, nest', { social: 1 }, { bond: 20, status: 10, flag: ['mate', 'You found a mate in a cartwheel display and built a nest you would use for years.'] }, ''],
        ['solo', 'Keep roaming', 'Freedom', { curious: 1 }, { skill: 6, bond: -4 }, 'You broke off the display and kept roaming.'],
        ['wait', 'Wait another season', 'Patient', { caution: 1 }, { skill: 3 }, 'You let the moment pass and watched the pair fly off together.']] },
      { id: 'gale', from: 5, title: 'The storm and the nest', text: 'A gale is coming. Your nest is huge, heavy and high in a tall tree.', opts: [
        ['stay', 'Stay on the nest', 'Devotion', { social: 0.8, caution: 0.3 }, { bond: 6, health: -4 }, 'You hunched over the nest through the gale and the nest held.', { p: 0.7, fx: { health: -14, bond: -6 }, t: 'The branch snapped in the gale. The nest fell and you barely escaped.' }],
        ['shelter', 'Shelter in a cedar and leave the nest', 'Safe', { caution: 1 }, { safety: 4, bond: -4 }, 'You rode out the storm in a thick cedar.'],
        ['mend', 'Reinforce the nest with new sticks', 'Work', { curious: 0.5 }, { skill: 4, bond: 4 }, 'You hauled sticks all afternoon and the nest held fast.']] },
    ],
    events: [
      { w: 2.4, a: [0.4, 99], fx: { food: 24, skill: 3 }, t: 'A good fish: you stooped and rose with a trout in your talons.' },
      { w: 1, tone: 'hard', bad: 1, setBad: 0.8, fx: { food: -14 }, t: 'A hard freeze closed the river. Fish were out of reach for weeks.' },
      { w: 1, tone: 'hard', a: [0.3, 99], fx: { safety: -6, food: -4 }, t: 'A flock of crows mobbed you at a carcass, then a coyote moved in.' },
      { w: 1.2, tone: 'joy', a: [0.4, 99], fx: { health: 3 }, t: 'You rode a thermal up beyond sight of the ground, with the whole river valley spread out below.' },
      { w: 1, tone: 'hard', a: [0.5, 99], ok: (s) => s.born.region.threat > 0.2, fx: { safety: -8, health: -6 }, t: 'You ate from a deer carcass and later felt dizzy for days. It was full of lead fragments from a hunter\'s bullet.' },
      { w: 1, a: [0.5, 99], fx: { food: 12 }, t: 'An osprey caught a fish and you gave chase. This is how eagles often eat: with the help of someone else\'s work.' },
      { w: 1, tone: 'hard', a: [0.3, 99], fx: { health: -14 }, t: 'A bout of illness left you listless and hungry for a week. You recovered.' },
      { w: 1, a: [1, 99], t: 'Boats and anglers passed along the shore. They looked up. You looked at their fish.' },
      { w: 0.6, tone: 'hard', a: [0.1, 0.35], fx: { safety: -8 }, t: 'A great horned owl landed near the nest at night. The parents screamed and drove it off.' },
      { w: 0.8, f: 'gather', a: [3, 99], fx: { food: 4 }, t: 'The winter river froze over.', t2: 'Because you joined the winter eagle gathering years ago, you knew where to find open water and salmon this winter.' },
      { w: 0.8, f: 'mate', a: [5, 99], fx: { bond: 5 }, t: 'The nest needed repair.', t2: 'You and your mate, who found each other in the cartwheel display, rebuilt the nest together, adding another layer of branches.' },
    ],
  });

  // =============== KOALA ===============
  W('koala', {
    names: ['Kip', 'Wattle', 'Ollie', 'Boyd', 'Matilda', 'Banjo', 'Quinn', 'Hazel', 'Gum', 'Rue', 'Wilga', 'Tully'],
    regions: [R('Moreton Bay (Queensland, Australia)', 3, 0.75, 0.4), R('the north coast of New South Wales (Australia)', 3, 0.75, 0.4), R('Port Stephens (New South Wales, Australia)', 2, 0.8, 0.35), R('Gippsland (Victoria, Australia)', 2, 0.85, 0.25), R('the Strzelecki Ranges (Victoria, Australia)', 1, 0.85, 0.25), R('Kangaroo Island (South Australia)', 1, 0.9, 0.1), R('the Pilliga forest (New South Wales, Australia)', 1, 0.6, 0.25)],
    stages: [[0.5, 'Pouch joey'], [1, 'Back-riding joey'], [2.5, 'Juvenile'], [12, 'Adult'], [99, 'Senior']],
    dt: (a) => (a < 1 ? 1 / 24 : a < 2.5 ? 1 / 12 : 1 / 6), nurse: 1, rate: [1.2, 0.8], env: 'Eucalyptus forest and woodland', sibs: [0, 0], group: [2, 6],
    bands: [[0.5, 0.88, [['illness', 0.35], ['a fall from the mother', 0.2], ['hunger', 0.25, 1], ['a dog or a car', 0.2]]], [1, 0.88, [['illness', 0.35], ['a fall', 0.2], ['hunger', 0.25, 1], ['a dog or a car', 0.2]]], [2.5, 0.7, [['illness', 0.3], ['heat and drought', 0.25, 1], ['hunger', 0.2, 1], ['injury', 0.25]]]],
    adult: { base: 0.1, causes: [['illness', 0.3], ['heat and drought', 0.25, 1], ['a bushfire', 0.2], ['injury', 0.25]], senA: 0.01, senK: 0.3 },
    threat: 0.06, threatName: 'cars, dogs or land clearing',
    breed: { from: 2, to: 12, every: [1, 2], litter: [1, 1], surv: [0.35, 1], femaleOnly: true, noun: 'joey', nounPl: 'joeys', yes: 'You gave birth to {k}, the size of a jelly bean, which crawled into your pouch and stayed for six months.', no: 'The joey did not survive. Koala mothers often breed again within the year.' },
    legacy: 'The eucalyptus leaves rustled, and the forest went on.', skill: 'Foraging knowledge', fed: 'Fed', bondLabel: 'Mother bond', groupLabel: 'Koalas nearby', foodLabel: 'Eucalyptus leaves', badName: 'Heatwave',
    story: (s) => `{n} was born, a ${s.sex} joey, the size of a jelly bean, and crawled into {mother}'s pouch on a eucalypt ridge near {place}. For six months {n} fed on milk in the dark, then began to eat a special paste called pap to learn which leaves are safe.`,
    diary: { to: 2.5, young: ['{n} rode on {mother}\'s back through the canopy and tried a new leaf each day.', 'A day of sleeping in a fork of the tree, eighteen hours of it.', 'You clung on while {mother} climbed to the top branches to feed in the cool of the evening.'], adult: ['A day of sleeping twenty hours and chewing for the rest.', 'You climbed to a fresh branch and ate a few leaves before dozing off.', 'A neighbour bellowed in the night from the next tree.'] },
    milestones: [['pouch', 0.45, 'After six months {n}\'s head popped out of the pouch for the first time: a world of green leaves and sky.', 'joy'], ['pap', 0.5, 'You began to eat pap from {mother}, which carries the gut microbes needed to digest eucalyptus. It was not appetising, and it was essential.'], ['back', 0.55, 'You moved to {mother}\'s back, holding on with all four limbs, watching the forest roll by.', 'joy'], ['solo', 1.1, 'At about a year {mother} stopped letting you ride. Time to find your own tree.']],
    decisions: [
      { id: 'leaves', from: 0.6, to: 1.5, title: 'Which leaves?', text: 'Eucalyptus leaves are toxic to most animals, and every tree tastes different. {mother} sniffs and chooses carefully.', opts: [
        ['copy', 'Eat what your mother eats', 'Safe', { caution: 1 }, { skill: 12, food: 8 }, 'You learned the leaves your family eats and which trees to avoid.'],
        ['sample', 'Sample leaves from a new tree', 'Curious. Risky', { curious: 1 }, { skill: 10, food: 4 }, 'It was fine, and tasted better than expected.', { p: 0.65, fx: { health: -12 }, t: 'It was too bitter, and your stomach did not agree.' }],
        ['sleep', 'Doze in a fork instead', 'Calm', { caution: 0.5 }, { health: 2, bond: 4 }, 'You slept, as koalas do.']] },
      { id: 'home', from: 1, to: 3, title: 'Finding your own tree', text: 'Your mother has chased you out of her tree. You need a home range, but the woods are patchy, with roads and open ground between the trees.', opts: [
        ['near', 'Settle in nearby trees', 'Safe', { caution: 1 }, { safety: 4, skill: 4 }, 'You found a tree not far from home and settled in.'],
        ['cross', 'Cross open ground to a better forest', 'Bold. Risky', { bold: 1 }, { food: 10, skill: 6, safety: -6 }, 'You crossed and found a quiet grove of manna gums.', { p: 0.55, fx: { health: -18, safety: -12 }, t: 'A car came down the road as you crossed. You escaped with a broken claw and a thundering heart.' }],
        ['follow', 'Follow an older koala', 'Cautious', { social: 0.6 }, { skill: 8, bond: 2 }, 'You trailed an older koala and found a good tree.']] },
      { id: 'heat', from: 2, title: 'Heatwave', text: 'A scorching day. The leaves are dry and the air is shimmering.', opts: [
        ['hug', 'Hug the cool trunk', 'Calm', { caution: 1 }, { health: 2, food: -4, flag: ['trunk', 'On a scorching day you hugged a cool trunk and discovered how koalas survive a heatwave.'] }, ''],
        ['water', 'Climb down for a drink', 'Risky', { bold: 0.6 }, { health: 6, safety: -6 }, 'You came down to drink, a risky thing for a koala to do.', { p: 0.7, fx: { safety: -14, health: -6 }, t: 'A dog was waiting near the water. You scrambled back up the tree, shaking.' }],
        ['move', 'Move to shadier branches', 'Effort', { curious: 0.5 }, { food: -4, skill: 4 }, 'You climbed higher into the shade and waited.']] },
      { id: 'season', from: 2, to: 10, title: 'Breeding season', text: 'The air is full of bellowing. Males are advertising and females are choosing.', opts: [
        ['bellow', 'Bellow from your tree', 'Standing', { bold: 1 }, { status: 8, health: -3 }, 'You gave your best bellow, a sound like a pig in a wind tunnel.'],
        ['wander', 'Wander to find a mate', 'Risk', { curious: 0.8 }, { bond: 4, safety: -8 }, 'You moved between the trees, looking.'],
        ['quiet', 'Stay quiet in your tree', 'Safe', { caution: 1 }, { safety: 4 }, 'You stayed in your tree and let the season pass.']] },
      { id: 'smoke', from: 3, title: 'Smoke on the wind', text: 'A bushfire is burning in the next valley. Embers are carried on the wind and the air smells of smoke.', opts: [
        ['up', 'Climb higher', 'Instinct', { caution: 0.2 }, { safety: -10 }, 'You climbed high, which is what koalas do, and the fire passed beneath.', { p: 0.5, fx: { health: -30, safety: -20 }, t: 'The fire reached the canopy. You escaped with burned paws, and lost your tree.' }],
        ['run', 'Run for the creek line', 'Better chance', { bold: 0.8 }, { safety: -4, health: -4, flag: ['fire', 'You ran for the creek when the bushfire came, and escaped both the flames and the worst of the smoke.'] }, ''],
        ['wait', 'Stay put', 'Hope', { caution: 0.6 }, { safety: -6 }, 'You held on. The fire missed you, barely.', { p: 0.6, fx: { health: -30, safety: -20 }, t: 'The fire came through, and you were caught in it.' }]] },
      { id: 'old', from: 10, title: 'Slow days', text: 'Your teeth are worn and the leaves take longer to chew.', opts: [
        ['stay', 'Spend the days in one favourite tree', 'Comfort', { caution: 1 }, { health: 3, safety: 4 }, 'You stayed in the tree you knew best and chewed slowly.'],
        ['move', 'Keep moving between trees', 'Wear, pride', { bold: 0.7 }, { food: 4, health: -4 }, 'You kept visiting the old trees, slow but steady.']] },
    ],
    events: [
      { w: 2.5, tone: 'joy', a: [0.3, 99], fx: { food: 16, health: 2 }, t: 'A fresh flush of new leaves after rain: tender, moist and delicious.' },
      { w: 1.2, tone: 'hard', bad: 1, setBad: 0.8, fx: { food: -12, health: -4 }, t: 'A heatwave. The leaves lost their water, and you went thirsty.' },
      { w: 1, a: [0.5, 99], fx: { health: 2 }, t: 'You slept for twenty hours and ate for the rest. It was a good day by koala standards.' },
      { w: 1, tone: 'hard', a: [1, 99], ok: (s) => s.born.region.threat > 0.3, fx: { safety: -8 }, t: 'A dog barked at the foot of your tree all night. You stayed very still.' },
      { w: 1, tone: 'hard', a: [0.5, 99], fx: { health: -14 }, t: 'Your eyes were red and sore, and you were off your food. Chlamydia is common in koalas and treatable, if you are found. You recovered slowly.' },
      { w: 1, tone: 'hard', a: [1, 99], ok: (s) => s.born.region.threat > 0.3, fx: { safety: -8, health: -4 }, t: 'A road ran between your trees. Cars passed at night. You crossed once, without ever knowing how lucky you were.' },
      { w: 1, a: [0.5, 99], t: 'A kookaburra laughed from the next tree, and a flock of lorikeets swept through. You did not wake up.' },
      { w: 1, tone: 'joy', a: [0.5, 99], fx: { health: 3 }, t: 'A cold front rolled in and you curled into a ball in the fork of your tree, snug.' },
      { w: 0.6, tone: 'joy', a: [0.3, 1], fx: { bond: 5 }, t: '{mother} groomed your fur and you fell asleep in the crook of her arm.' },
      { w: 0.8, f: 'trunk', a: [3, 99], fx: { health: 4 }, t: 'A scorcher of a day.', t2: 'Because you had learned to hug a cool trunk in a heatwave, you stayed comfortable when the other koalas panted.' },
      { w: 0.8, f: 'fire', a: [4, 99], fx: { safety: 6 }, t: 'The air smelled of smoke again.', t2: 'Because you survived the bushfire by running for the creek, you knew exactly where to go when the smoke came again.' },
    ],
  });

  // =============== GIRAFFE ===============
  W('giraffe', {
    names: ['Zuri', 'Twiga', 'Jana', 'Kito', 'Amani', 'Sefu', 'Tendai', 'Raha', 'Faraji', 'Safiya', 'Nia', 'Juma'],
    regions: [R('the Serengeti (Tanzania)', 3, 0.8, 0.3), R('Tarangire (Tanzania)', 2, 0.75, 0.35), R('Etosha (Namibia)', 2, 0.65, 0.25), R('Kruger (South Africa)', 2, 0.85, 0.2), R('Murchison Falls (Uganda)', 1, 0.8, 0.35), R('Samburu (Kenya)', 2, 0.65, 0.4), R('Koure (Niger)', 1, 0.5, 0.5), R('Hwange (Zimbabwe)', 1, 0.7, 0.35)],
    stages: [[0.1, 'Newborn calf'], [1, 'Calf'], [4, 'Juvenile'], [7, 'Young adult'], [25, 'Adult'], [99, 'Elder']],
    dt: (a) => (a < 0.3 ? 1 / 24 : a < 4 ? 1 / 12 : 1 / 6), nurse: 1, rate: [1.2, 0.8], env: 'African savanna and acacia woodland', sibs: [0, 1], group: [5, 20],
    bands: [[0.1, 0.85, [['lions or hyenas', 0.5], ['a fall', 0.2], ['illness', 0.3]]], [1, 0.65, [['lions, leopards or hyenas', 0.6], ['illness', 0.2], ['hunger', 0.2, 1]]], [4, 0.88, [['lions or hyenas', 0.5], ['illness', 0.25], ['hunger', 0.25, 1]]]],
    adult: { base: 0.06, causes: [['lions', 0.2], ['illness', 0.25], ['drought', 0.35, 1], ['an accident', 0.1], ['a clash with another giraffe', 0.1]], senA: 0.012, senK: 0.18 },
    threat: 0.04, threatName: 'snares or poaching',
    breed: { from: 5, to: 25, every: [1.5, 2.2], litter: [1, 1], surv: [0.35, 1], femaleOnly: true, noun: 'calf', nounPl: 'calves', yes: 'You gave birth standing up, after fifteen months, and your calf dropped nearly two metres to the ground.', no: 'The calf did not survive the first weeks. Giraffe mothers lose many calves to lions.' },
    legacy: 'The herd moved slowly on across the plain, heads high.', skill: 'Foraging knowledge', fed: 'Fed', bondLabel: 'Herd bond', groupLabel: 'Herd size', foodLabel: 'Acacia leaves', badName: 'Dry season',
    story: (s) => `{n} was born, a ${s.sex} calf, standing up: {mother} gave birth upright near {place}, and {n} dropped nearly two metres to the ground, already about 1.8 metres tall. Within an hour {n} was on wobbly legs. For the first weeks a calf lies hidden in the grass, visited by {mother} to nurse, while the herd keeps watch.`,
    diary: { to: 4, young: ['{n} lay hidden in the long grass while {mother} browsed in the distance, and came to nurse at dusk.', 'A day of nursing, wobbling and stretching legs beside {mother}.', 'The calves gathered under one aunt\'s watch while the mothers fed.'], adult: ['A day of browsing acacia leaves with a long dark tongue, careful of the thorns.', 'The herd rested in the shade, chewing cud and watching for lions.', 'You walked slowly with the herd, heads high, scanning the horizon.'] },
    milestones: [['stand', 0.005, '{n} was on trembling legs within an hour of birth, taking the first wobbly steps.', 'joy'], ['hide', 0.05, 'For the first weeks you lay hidden in the long grass, still as stone, while {mother} fed at a distance.'], ['gang', 0.2, 'You joined the other calves in a group looked after by one adult while the mothers feed.', 'joy'], ['thorn', 0.6, 'You learned to strip leaves from a thorn tree with your long, dark tongue, without minding the spines.']],
    decisions: [
      { id: 'hide', from: 0.02, to: 0.3, title: 'Lie low or follow?', text: 'Your mother is feeding at a distance. Something moves in the grass.', opts: [
        ['lie', 'Lie perfectly still', 'Safe', { caution: 1 }, { safety: 4, skill: 2 }, 'You lay flat and your spotted coat blended with the grass.'],
        ['follow', 'Get up and follow your mother', 'Bold. Risky', { bold: 1 }, { skill: 6, bond: 6 }, 'You got up, wobbled across and nursed.', { p: 0.55, fx: { safety: -14, health: -10 }, t: 'A hyena saw you and gave chase. Your mother arrived and kicked it, but you were shaken.' }],
        ['call', 'Bleat softly', 'Bond', { social: 0.8 }, { bond: 6, safety: -4 }, 'You made a small bleat and she came.']] },
      { id: 'drink', from: 1, to: 24, title: 'The waterhole', text: 'A giraffe has to splay its legs wide and bend awkwardly to drink, the most vulnerable moment of the day. Lions know it.', opts: [
        ['quick', 'Drink quickly in short bursts', 'Safe-ish', { caution: 0.8 }, { health: 3, safety: -2 }, 'You drank in short bursts, head up between sips.'],
        ['guard', 'Wait for another giraffe to stand guard', 'Safe, slow', { caution: 1, social: 0.5 }, { health: 2, bond: 4 }, 'You waited until another giraffe stood watch, and then drank.'],
        ['bold', 'Drink your fill without fuss', 'Bold. Risky', { bold: 1 }, { health: 5, food: 4 }, 'You drank until you were full.', { p: 0.7, fx: { safety: -16, health: -12 }, t: 'Lions burst from the reeds. You kicked free, bruised and lucky.' }]] },
      { id: 'horizons', from: 3, to: 5, title: 'Broader horizons', text: 'You are old enough to wander away from the herd for the day.', opts: [
        ['wander', 'Explore the next valley', 'Curiosity, risk', { curious: 1 }, { skill: 10, safety: -6 }, 'You found a stand of acacia nobody had stripped.', { p: 0.7, fx: { safety: -12, health: -6 }, t: 'Lions were hunting nearby. You ran, and escaped.' }],
        ['stay', 'Stay with the herd', 'Safe', { caution: 1 }, { bond: 6, safety: 4 }, 'You stayed in the herd and learned its routines.'],
        ['pair', 'Walk with a friend', 'Safer together', { social: 1 }, { bond: 8, skill: 4, flag: ['pair', 'You started walking with a friend, and the two of you watched each other\'s backs for years.'] }, '']] },
      { id: 'necking', from: 5, to: 20, ok: (s) => s.sex === 'male', title: 'Necking', text: 'Males settle rank by "necking", swinging their long necks like clubs. A rival is ready.', opts: [
        ['fight', 'Take on the rival', 'Status. Injury risk', { bold: 1 }, { status: 20, bond: -4 }, 'You swung and landed a blow on his flank, and he gave way.', { p: 0.5, fx: { health: -22, status: -6 }, t: 'He caught you under the jaw, and you reeled away stunned.' }],
        ['spar', 'Spar gently', 'Practice', { social: 0.8 }, { skill: 6, status: 6, health: -3 }, 'You swung and swayed in slow motion, learning each other.'],
        ['avoid', 'Walk away', 'Safe', { caution: 1 }, { safety: 4, status: -2 }, 'You walked off, and the rival watched you go.']] },
      { id: 'mother', from: 5, to: 8, ok: (s) => s.sex === 'female', title: 'A mother\'s choice', text: 'You are about to be a mother. The herd has a quiet corner where females give birth, but it is far from water.', opts: [
        ['quiet', 'Give birth in the quiet corner', 'Safe, hungry', { caution: 1 }, { safety: 4, food: -6 }, 'You walked to the quiet corner and gave birth in peace.'],
        ['herd', 'Stay with the herd', 'Company', { social: 1 }, { bond: 6, safety: -4 }, 'You stayed with the herd, and your aunts stood guard.'],
        ['water', 'Stay near the water', 'Food, danger', { bold: 0.7 }, { food: 6, safety: -8 }, 'You gave birth near the water and watched the reeds for lions.']] },
      { id: 'elder', from: 20, title: 'Slow days', text: 'The high branches are harder to reach and the walks are slower.', opts: [
        ['shade', 'Rest more in the shade', 'Comfort', { caution: 1 }, { health: 3, food: -2 }, 'You rested in the shade and the herd moved around you.'],
        ['browse', 'Keep browsing high', 'Pride, wear', { bold: 0.7 }, { food: 4, health: -4 }, 'You kept your head in the tallest branches.']] },
    ],
    events: [
      { w: 2.4, tone: 'joy', a: [0.3, 99], fx: { food: 16, health: 2 }, t: 'The acacias flushed green after rain, and the whole herd browsed in peace.' },
      { w: 1.2, tone: 'hard', bad: 1, setBad: 0.9, fx: { food: -12 }, t: 'A dry season. The leaves went brittle and the herd walked farther each day.' },
      { w: 1.2, tone: 'hard', a: [0.05, 99], fx: { safety: -10 }, t: 'Lions stalked the herd at dusk. The herd closed up and the lions gave up, this time.' },
      { w: 1, a: [0.3, 99], fx: { safety: 2 }, t: 'Zebra and wildebeest joined the herd at a waterhole. Giraffes see danger first, and the others watched them.' },
      { w: 1, tone: 'hard', a: [0.5, 99], ok: (s) => s.born.region.threat > 0.3, fx: { safety: -8, health: -6 }, t: 'A wire snare caught your leg and you pulled hard until it gave. The wound took weeks to heal.' },
      { w: 1, tone: 'joy', a: [0.1, 2], fx: { bond: 5 }, t: 'You raced the other calves, galloping and kicking in the grass.' },
      { w: 1, a: [0.5, 99], fx: { health: 2 }, t: 'Oxpeckers hopped over your coat and ate ticks from your neck. A kind of friendship.' },
      { w: 1, tone: 'hard', a: [0.3, 99], fx: { health: -14 }, t: 'A disease swept the herd, and you were weak for weeks.' },
      { w: 1, a: [0.3, 99], t: 'A thunderstorm rolled across the plain and every giraffe froze to watch it come.' },
      { w: 0.8, f: 'pair', a: [3, 99], fx: { safety: 4 }, t: 'Lions crept through the grass at dusk.', t2: 'Because your friend was beside you, you both noticed the lions first and ran together.' },
    ],
  });

  // =============== TIGER ===============
  W('tiger', {
    names: ['Raja', 'Rani', 'Sher', 'Chandra', 'Surya', 'Nila', 'Kavi', 'Arun', 'Maya', 'Amur', 'Sundar', 'Taj'],
    regions: [R('the Sundarbans (India/Bangladesh)', 2, 0.7, 0.55), R('Ranthambore (Rajasthan, India)', 2, 0.7, 0.35), R('Jim Corbett (Uttarakhand, India)', 3, 0.85, 0.3), R('Bandipur (Karnataka, India)', 3, 0.85, 0.3), R('Chitwan (Nepal)', 2, 0.8, 0.35), R('the Sikhote-Alin forests (Russian Far East)', 1, 0.6, 0.45), R('the Western Forest Complex (Thailand)', 1, 0.75, 0.35), R('Taman Negara (Malaysia)', 1, 0.7, 0.55)],
    stages: [[0.2, 'Newborn cub'], [1.5, 'Cub'], [2.5, 'Juvenile'], [4, 'Subadult'], [12, 'Adult'], [99, 'Senior']],
    dt: (a) => (a < 0.4 ? 1 / 24 : a < 2.5 ? 1 / 12 : 1 / 6), nurse: 1.5, rate: [1.2, 0.8], env: 'Forest, grassland and mangrove', sibs: [1, 3], sibWord: 'Littermate', group: [2, 5],
    sexH: { male: 1.3 },
    bands: [[0.2, 0.9, [['illness', 0.3], ['a predator or an adult male', 0.4], ['hunger', 0.3, 1]]], [1.5, 0.65, [['hunger', 0.3, 1], ['illness', 0.2], ['an adult male', 0.3], ['a predator', 0.2]]], [2.5, 0.85, [['hunger', 0.3, 1], ['illness', 0.2], ['injury while hunting', 0.3], ['a clash with another tiger', 0.2]]], [4, 0.7, [['hunger', 0.25, 1], ['a clash with another tiger', 0.3], ['injury while hunting', 0.25], ['illness', 0.2]]]],
    adult: { base: 0.1, causes: [['a clash with another tiger', 0.25], ['injury while hunting', 0.25], ['illness', 0.2], ['hunger', 0.3, 1]], senA: 0.01, senK: 0.22 },
    threat: 0.06, threatName: 'poachers or conflict with people',
    breed: { from: 3.5, to: 14, every: [2, 2.5], litter: [2, 4], surv: [0.2, 0.7], femaleOnly: true, noun: 'cub', nounPl: 'cubs', yes: 'You gave birth in a thicket to {k}, and spent weeks guarding the den and hunting.', no: 'Your litter did not survive the first months. Tigers often lose cubs to disease and rivals.' },
    legacy: 'The forest closed over the trail, and the langurs resumed their calls.', skill: 'Hunting skill', fed: 'Fed', bondLabel: 'Mother bond', groupLabel: 'Neighbouring tigers', foodLabel: 'Prey', badName: 'Drought',
    story: (s) => `{n} was born, a ${s.sex} cub, in a thicket near {place}, one of ${s.sibs + 1}: blind, striped and about a kilogram. {mother} hid the litter and moved them from den to den while hunting alone. Tigers are the solitary giants of the forest; for two years you will learn to be one.`,
    diary: { to: 2.5, young: ['{n} tumbled with the littermates under {mother}\'s watchful eye.', '{mother} came back from a kill, and the cubs ate in a heap.', 'A day of stalking butterflies, grass stems and each other.'], adult: ['A night of patrolling the territory and a day of resting in the shade.', 'You walked your boundary, marking trees and listening for rivals.', 'You rested in a pool through the heat of midday and hunted at dusk.'] },
    milestones: [['eyes', 0.04, 'At about a week your eyes opened. The first sight was {mother}, enormous and warm.', 'joy'], ['meat', 0.2, '{mother} brought meat to the den for the first time, and the cubs fought over it.'], ['follow', 0.35, 'At about two months you left the den for the first time and followed {mother} through tall grass.', 'joy'], ['stalk', 1, 'You tried your first stalk, on a peacock, with all the grace of a teddy bear. The bird walked away.', 'joy']],
    decisions: [
      { id: 'kill', from: 0.8, to: 2.5, title: 'A kill to learn from', text: '{mother} has brought down a deer and called the cubs. This is a chance to learn how to kill.', opts: [
        ['watch', 'Watch her closely', 'Safe', { caution: 1 }, { skill: 10, food: 8 }, 'You watched where she bit and how she held on.'],
        ['practice', 'Try a killing bite on the carcass', 'Practice', { curious: 1, bold: 0.5 }, { skill: 14, food: 6 }, 'You practised the grip and the bite on a carcass.'],
        ['tug', 'Fight your siblings for the best portion', 'Standing', { bold: 0.8 }, { food: 14, bond: -4, status: 4 }, 'You won the best portion and a few scratches.']] },
      { id: 'leave', from: 1.8, to: 3.2, title: 'Leaving home', text: 'At about two years you are nearly as big as your mother. She is ready to breed again, and it is time to find a territory of your own.', opts: [
        ['near', 'Take a range at the edge of hers', 'Safe-ish', { caution: 1 }, { bond: -10, safety: 2, skill: 4 }, 'You settled next door, close to home.'],
        ['far', 'Travel far to open forest', 'Bold. Hard to undo', { bold: 1, curious: 0.8 }, { bond: -25, safety: -18, skill: 8, h: 1.15, flag: ['far', 'You travelled across rivers, roads and villages to find a forest with no tiger in it, and made it.'] }, '', null, true],
        ['sib', 'Travel with a sibling for a while', 'Safer together', { social: 1 }, { bond: -8, safety: -6, skill: 6 }, 'You and your sibling travelled together, then went separate ways.']] },
      { id: 'village', from: 2.5, title: 'Cattle at the forest edge', text: 'A herd of cattle grazes at the forest edge, with no fence and a distant herder. An easy meal beckons.', opts: [
        ['take', 'Take a calf', 'Easy food, danger', { bold: 1 }, { food: 26, safety: -10 }, 'You killed a calf and slipped back into the trees.', { p: 0.5, fx: { health: -20, safety: -18 }, t: 'Villagers gave chase with torches and a gun. You escaped, wounded, and learned to fear the edge.' }],
        ['wild', 'Stick to wild prey', 'Safe, harder', { caution: 1 }, { skill: 6, food: 6 }, 'You went deeper into the forest after wild prey.'],
        ['watch', 'Watch and move on', 'Quiet', { curious: 0.5 }, { skill: 2 }, 'You watched the herd and let it be.']] },
      { id: 'rival', from: 3.5, to: 13, title: 'A rival on the boundary', text: 'Scent marks tell you another tiger is pushing into your range. It will be a fight, or it will be a retreat.', opts: [
        ['fight', 'Fight', 'Standing, injury', { bold: 1 }, { status: 22, health: -6 }, 'You drove the rival off and the range was yours.', { p: 0.5, fx: { health: -30, status: -8, safety: -8 }, t: 'The rival was stronger. You were badly hurt and driven back.' }],
        ['mark', 'Scent-mark and roar', 'Bluff', { social: 0.5, bold: 0.4 }, { status: 6, safety: -3 }, 'You marked every tree and roared at dusk. The rival kept away.'],
        ['yield', 'Yield the land', 'Safe, lose range', { caution: 1 }, { status: -10, safety: 4, food: -6 }, 'You gave up the border and moved your hunting deeper.']] },
      { id: 'old', from: 11, title: 'Slower days', text: 'Your legs are not what they were, and the chase is shorter.', opts: [
        ['ambush', 'Hunt only from ambush near a waterhole', 'Patience', { caution: 0.8 }, { food: 8, health: -2 }, 'You waited and the prey came to you.'],
        ['rest', 'Rest and let the younger ones pass', 'Comfort', { caution: 1 }, { health: 3, status: -4 }, 'You let the young males go by, and slept in the shade.']] },
    ],
    events: [
      { w: 2.4, a: [0.7, 99], fx: { food: 24, skill: 3 }, t: 'A successful kill: a sambar deer fed you for days.' },
      { w: 1.2, tone: 'hard', bad: 1, setBad: 0.9, fx: { food: -12 }, t: 'A dry season. The prey went to the few remaining waterholes, and you had to hunt them there.' },
      { w: 1, tone: 'hard', a: [0.2, 2.5], fx: { safety: -8 }, t: 'A strange male tiger passed near the den. {mother} moved the whole litter that night, carrying you one by one in her mouth.' },
      { w: 1, tone: 'joy', a: [0.5, 99], fx: { health: 3 }, t: 'You spent the heat of the day lying in a pool, chin on the water, as tigers like to do.' },
      { w: 1, tone: 'hard', a: [0.5, 99], ok: (s) => s.born.region.threat > 0.3, fx: { safety: -8, health: -6 }, t: 'A wire snare pulled tight on your leg. You thrashed free after a night of pain and limped for weeks.' },
      { w: 1, a: [0.5, 99], t: 'A camera trap flashed in the dark. Somewhere, a researcher counted your stripes and gave you a number.' },
      { w: 1, tone: 'hard', a: [0.3, 99], fx: { health: -14 }, t: 'A porcupine\'s quills pierced your paw. You limped and went hungry until the wound healed.' },
      { w: 1, a: [1, 99], fx: { status: 2 }, t: 'You walked your boundary at dusk, scent-marking every tree. The forest knew who you were.' },
      { w: 1, tone: 'hard', a: [0.3, 99], fx: { health: -14 }, t: 'A fever left you weak for a week. You recovered.' },
      { w: 0.7, tone: 'joy', a: [0.2, 2.5], fx: { bond: 5 }, t: 'The cubs pounced on {mother}\'s tail and she let them, with a long-suffering sigh.' },
      { w: 0.8, f: 'far', a: [3, 99], fx: { food: 4, status: 4 }, t: 'A poor season on the old range.', t2: 'Because you crossed so far to find a territory of your own, you held a forest with plenty of prey and no rivals.' },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
