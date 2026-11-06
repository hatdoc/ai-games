// Wild animal modules, batch 1: African elephant, grey wolf, chimpanzee, giant panda, orca. Built with LE.wild (lives-e.js).
// Survival figures are MODELLED to land inside published life-expectancy ranges; places are real, their weights a gameplay choice.
(function (g) {
  const LE = g.LE, W = LE.wild;
  const R = (name, w, food, threat) => ({ name, w, food, threat });

  // =============== AFRICAN ELEPHANT ===============
  W('elephant', {
    names: ['Imani', 'Tembo', 'Zawadi', 'Kibo', 'Amara', 'Jabari', 'Neema', 'Okoth', 'Sauti', 'Binti', 'Mwezi', 'Tano'],
    regions: [R('Amboseli (Kenya)', 3, 0.9, 0.3), R('Tsavo (Kenya)', 3, 0.8, 0.45), R('Chobe (Botswana)', 5, 0.9, 0.25), R('Hwange (Zimbabwe)', 3, 0.75, 0.35), R('Kruger (South Africa)', 2, 0.85, 0.2), R('Etosha (Namibia)', 1, 0.65, 0.3), R('Selous-Nyerere (Tanzania)', 2, 0.75, 0.55), R('Queen Elizabeth NP (Uganda)', 1, 0.8, 0.4)],
    stages: [[0.5, 'Newborn calf'], [3, 'Calf'], [10, 'Juvenile'], [25, 'Young adult'], [50, 'Adult'], [999, 'Elder']],
    dt: (a) => (a < 3 ? 1 / 12 : 1 / 6), nurse: 3, rate: [1.2, 0.8], env: 'African savanna and woodland', sibs: [0, 2], group: [8, 25],
    bands: [[0.5, 0.9, [['drought and thirst', 0.3, 1], ['lions or hyenas', 0.4], ['illness', 0.3]]], [3, 0.85, [['drought and thirst', 0.35, 1], ['lions or hyenas', 0.3], ['illness', 0.25], ['separation from the herd', 0.1]]], [10, 0.95, [['drought and thirst', 0.4, 1], ['illness', 0.4], ['an accident', 0.2]]]],
    adult: { base: 0.012, causes: [['drought and thirst', 0.4, 1], ['illness', 0.35], ['an accident', 0.25]], senA: 0.0045, senK: 0.1 },
    threat: 0.03, threatName: 'poaching or conflict with people',
    breed: { from: 12, to: 50, every: [4, 5.5], litter: [1, 1], surv: [0.4, 1], femaleOnly: true, noun: 'calf', nounPl: 'calves', yes: 'You gave birth to {k} after twenty-two months of pregnancy, and the whole herd came to touch the newborn.', no: 'You gave birth, but the calf did not survive the first weeks. The herd stood with you for a long time.' },
    legacy: 'The herd walked on, as elephants do, remembering.', skill: 'Foraging knowledge', fed: 'Fed', bondLabel: 'Herd bond', groupLabel: 'Herd size', foodLabel: 'Browse and water', badName: 'Drought',
    story: (s) => `{n} was born, a ${s.sex} calf, near {place}: about 100 kilograms, wobbly, and standing within the hour. The herd of {group} surrounded {mother} and the newborn, touching with their trunks. For years the world is a mother's legs, a herd's rumbles and a long search for water.`,
    diary: { to: 10, young: ['{n} stayed within a trunk\'s reach of {mother}, nursing, dozing under her belly and exploring mud.', 'The herd walked slowly to a river. {n} copied what the others did, mostly.', 'A quiet day of grazing and play with other calves, with the aunts watching.'], adult: ['Another day of walking, browsing and finding water with the herd.', 'The herd rested through the midday heat in the shade, rumbling to each other.', 'You walked the old routes the matriarch remembers, season after season.'] },
    milestones: [['trunk', 0.15, '{n} is still learning to use a trunk: it flops, tangles and sometimes trips the calf. {mother} and the aunts steady every step.', 'joy'], ['mud', 0.7, 'First mud bath and first river crossing, held between aunts in the current.', 'joy'], ['lessons', 3.5, 'Weaning begins. {mother} teaches you which trees to strip, which waterholes last in drought, and the routes the matriarch remembers.']],
    decisions: [
      { id: 'water', from: 0.8, to: 5, title: 'Waterhole crowd', text: 'The herd arrives at a crowded waterhole. Other herds and a few buffalo are already there.', opts: [
        ['stay', 'Stay under your mother', 'Safe', { caution: 1 }, { bond: 6, safety: 4 }, 'You watched the crowd from under your mother and learned who gives way to whom.'],
        ['play', 'Join the other calves in the shallows', 'Joy, a little risk', { social: 1 }, { bond: 6, skill: 6 }, 'You splashed, shoved and sprayed with the other calves until the sun went down.', { p: 0.85, fx: { health: -8, safety: -6 }, t: 'You slipped in the mud and got a scare; an aunt hauled you out.' }],
        ['explore', 'Wander off along the far bank', 'Bold. Risky', { bold: 1, curious: 0.8 }, { skill: 12 }, 'You found a mineral lick on the far bank, and the aunts remembered it afterwards.', { p: 0.6, fx: { safety: -14, bond: -4, health: -8 }, t: 'A hyena shadowed you until your mother rushed back, trumpeting.' }]] },
      { id: 'cross', from: 8, title: 'Past the fields', text: 'To reach seasonal pasture the herd must cross farmland. The farms are asleep, for now.', opts: [
        ['night', 'Cross at night in silence', 'Safer', { caution: 1 }, { safety: 4, food: -3 }, 'The herd slipped past in single file. Nobody woke.'],
        ['raid', 'Raid the maize', 'Food, danger', { bold: 1 }, { food: 30, status: 4 }, 'Maize! The herd ate until dawn.', { p: 0.55, fx: { health: -12, safety: -14 }, t: 'Farmers woke and drove the herd off with fire and noise. A flung stone cut your shoulder.' }],
        ['around', 'Take the long way round', 'Slow', { caution: 0.4 }, { food: -8, safety: 6 }, 'The long route cost a week, but it cost nothing else.']] },
      { id: 'route', from: 6, to: 40, title: 'The long walk', text: 'The rains have failed. The matriarch can lead the herd to a distant river, but the walk is long and the young tire.', opts: [
        ['follow', 'Follow the matriarch', 'Trust her memory', { social: 1, caution: 0.5 }, { skill: 10, bond: 6, food: -6, flag: ['route', 'You followed the matriarch\'s memory to a far river in a drought, and learned a route that can save a herd.'] }, ''],
        ['dig', 'Dig for water in the dry riverbed', 'Skill, effort', { curious: 1 }, { skill: 14, food: -10, health: -3 }, 'You dug with your feet and tusks until water seeped up, and others drank from your hole.'],
        ['lag', 'Rest and catch up later', 'Risky', { caution: 0.3 }, { food: -4, bond: -6, safety: -8 }, 'You rested in the shade and caught up at dusk, a little shamefaced.']] },
      { id: 'musth', from: 14, to: 35, ok: (s) => s.sex === 'male', title: 'Musth', text: 'A surge of hormones. Your temples drip. You are bigger than most and want to prove it.', opts: [
        ['fight', 'Fight for a mate', 'Status, injury risk', { bold: 1 }, { status: 20, bond: -4 }, 'You won the contest and the herd noticed.', { p: 0.5, fx: { health: -25, status: -6 }, t: 'A bigger bull sent you reeling, tusk-gored and humbled.' }],
        ['avoid', 'Keep your distance', 'Safe', { caution: 1 }, { health: 3, status: -2 }, 'You kept clear of the rivals and fed in peace.'],
        ['alone', 'Leave the bachelor group to wander', 'Freedom, risk', { curious: 0.6, bold: 0.4 }, { skill: 8, safety: -8, bond: -10 }, 'You wandered alone for weeks and learned places the herd never goes.']] },
      { id: 'lead', from: 35, ok: (s) => s.sex === 'female', title: 'Who leads?', text: 'The old matriarch is failing. The herd looks around.', opts: [
        ['lead', 'Step up and lead', 'Standing, responsibility', { bold: 1, social: 0.6 }, { status: 25, bond: 6, flag: ['leader', 'You became the herd\'s matriarch and its living memory.'] }, ''],
        ['defer', 'Follow your older sister', 'Safe', { caution: 1 }, { bond: 6, status: 2 }, 'You deferred, and she led well enough.']] },
    ],
    events: [
      { w: 2, tone: 'joy', food: 0.12, fx: { food: 12 }, t: 'Rain at last: the waterholes filled, the grass sprang up, and the herd spread out in green plenty.' },
      { w: 1.2, tone: 'hard', bad: 1, setBad: 0.9, fx: { food: -12 }, t: 'The rains failed. The waterholes shrank and the herd walked farther each day.' },
      { w: 1, tone: 'hard', a: [0.2, 6], fx: { safety: -8, bond: 5 }, t: 'Lions tested the herd at dusk. The aunts closed ranks around the calves and trumpeted until the lions gave up.' },
      { w: 1.5, tone: 'joy', fx: { bond: 6 }, t: 'You met another herd at a river. Trunks wound together in greeting, a rumbling that carries for miles.' },
      { w: 1, a: [1, 99], fx: { skill: 4, food: 8 }, t: 'The matriarch led the herd to a salt lick down a path nobody else remembered.' },
      { w: 0.8, tone: 'hard', a: [0.5, 99], fx: { health: -14, h: 1.03 }, t: 'A wire snare caught your foot. After hours of struggle and with the herd\'s help you pulled it free and limped for weeks.' },
      { w: 1, ok: (s) => s.born.region.threat < 0.45, t: 'A research vehicle idled at a distance. Somebody had given you a number. You were more interested in the acacia pods.' },
      { w: 1, tone: 'calm', a: [0.5, 99], fx: { bond: 4 }, t: 'You found the bones of an elephant who died last season. The herd stopped, touched them gently with their trunks and stood in silence.' },
      { w: 0.8, tone: 'joy', a: [2, 99], fx: { health: 4, bond: 3 }, t: 'A dust bath, a mud bath, a water bath: a perfect afternoon with no particular purpose.' },
      { w: 0.6, tone: 'hard', a: [0.3, 99], fx: { health: -14 }, t: 'Disease moved through the area. You were weak and slow for weeks, and recovered.' },
      { w: 1, f: 'route', a: [10, 99], bad: 1, setBad: 0.8, fx: { food: -6 }, t: 'A dry spell, and the herd searched for water along the old tracks.', t2: 'A new drought struck, and because you remembered the matriarch\'s route to the far river, you led others to water.' },
    ],
  });

  // =============== GREY WOLF ===============
  W('wolf', {
    names: ['Luna', 'Kodi', 'Aspen', 'Ash', 'Sable', 'Rue', 'Thorn', 'Juniper', 'Storm', 'Flint', 'Briar', 'Moss'],
    regions: [R('Yellowstone (Wyoming, USA)', 2, 0.9, 0.2), R('the Rockies near Banff (Alberta, Canada)', 3, 0.85, 0.3), R('the Northwest Territories taiga (Canada)', 3, 0.8, 0.15), R('Bialowieza and the Carpathians (Poland/Romania)', 2, 0.8, 0.35), R('the Siberian taiga (Russia)', 4, 0.75, 0.5), R('the Mongolian steppe (Mongolia)', 3, 0.7, 0.45), R('the Abruzzo Apennines (Italy)', 1, 0.7, 0.4), R('interior Alaska (USA)', 2, 0.85, 0.25)],
    stages: [[0.1, 'Newborn pup'], [0.5, 'Pup'], [1.5, 'Yearling'], [3, 'Young adult'], [8, 'Adult'], [99, 'Senior']],
    dt: (a) => (a < 0.5 ? 1 / 24 : a < 1.5 ? 1 / 12 : 1 / 6), nurse: 0.5, rate: [1.3, 0.9], env: 'Northern forest, tundra and steppe', sibs: [2, 5], sibWord: 'Littermate', group: [4, 12],
    bands: [[0.1, 0.94, [['cold or an accident in the den', 0.5], ['abandonment', 0.2], ['illness', 0.3]]], [0.5, 0.9, [['hunger', 0.4, 1], ['illness', 0.3], ['a predator', 0.3]]], [1.5, 0.76, [['hunger', 0.35, 1], ['illness', 0.3], ['a clash with a rival pack', 0.2], ['traffic', 0.15]]], [3, 0.8, [['hunger', 0.3, 1], ['a clash with a rival pack', 0.3], ['illness', 0.25], ['traffic', 0.15]]]],
    adult: { base: 0.15, causes: [['hunger in a poor winter', 0.3, 1], ['a clash with a rival pack', 0.25], ['illness (mange or distemper)', 0.25], ['injury while hunting', 0.2]], senA: 0.02, senK: 0.28 },
    threat: 0.2, threatName: 'hunters, traps or traffic',
    breed: { from: 2.2, to: 9, every: [1, 1.3], litter: [4, 6], surv: [0.2, 0.8], femaleOnly: true, noun: 'pup', nounPl: 'pups', yes: 'You whelped {k} in a den under tree roots, and the whole pack helped to feed them.', no: 'Your litter did not survive the spring. The pack grieved in its own way and stayed close.' },
    legacy: 'The pack howled at dusk, and one voice was missing.', skill: 'Hunting skill', fed: 'Fed', bondLabel: 'Pack bond', groupLabel: 'Pack size', foodLabel: 'Prey', badName: 'Hard winter',
    story: (s) => `{n} was born, a ${s.sex} pup, in a den dug under spruce roots near {place}: one of ${s.sibs + 1} blind, deaf, squirming pups in a pack of {group}. {mother} stayed close and the others brought her food. For the first weeks the world is smell and warmth.`,
    diary: { to: 1.5, young: ['{n} spent the day wrestling, chewing sticks and begging the adults for meat.', 'The adults came back from the hunt and the pups mobbed them for food.', 'A day of play-fighting, naps in the sun and learning who outranks whom.'], adult: ['The pack travelled its territory, scent-marking and following tracks in the snow.', 'A quiet day of resting and a long night of hunting.', 'The pack reunited with a long group howl at dusk.'] },
    milestones: [['eyes', 0.04, 'At two weeks {n}\'s eyes opened on a dim den and a lot of siblings. {mother} licked every one of them clean.', 'joy'], ['out', 0.15, 'At three weeks you tumbled out of the den into daylight for the first time, with the whole pack watching.', 'joy'], ['howl', 0.45, 'You joined your first group howl, a thin squeak among deep voices. Nobody laughed. Everybody joined in.', 'joy'], ['rv', 0.6, 'The pack moved the pups to a rendezvous site in a meadow, where they wait while the adults hunt.']],
    decisions: [
      { id: 'follow', from: 0.6, to: 1.5, title: 'The first hunt', text: 'The adults set off after a deer. Pups old enough are allowed to follow at a distance.', opts: [
        ['follow', 'Follow at a distance', 'Learn safely', { caution: 1 }, { skill: 12, bond: 3 }, 'You watched the chase from a ridge and learned how it works.'],
        ['stay', 'Stay at the meadow with the other pups', 'Safe', { caution: 0.6 }, { bond: 4 }, 'You stayed and waited for the adults to return.'],
        ['join', 'Dash in with the adults', 'Bold. Risky', { bold: 1 }, { skill: 20, status: 6 }, 'You charged in beside the adults and, for a moment, you were a hunter.', { p: 0.5, fx: { health: -18, safety: -8 }, t: 'A hoof caught you. The deer got away and you limped home.' }]] },
      { id: 'leave', from: 1.7, to: 3.5, title: 'Time to leave?', text: 'Many young wolves leave their pack in the second or third year to find a mate and a territory. You could too.', opts: [
        ['stay', 'Stay with your pack', 'Safe, familiar', { caution: 1, social: 0.5 }, { bond: 8, safety: 4 }, 'You stayed and helped to raise your siblings\' pups.'],
        ['alone', 'Disperse alone', 'Freedom and danger. Hard to undo', { bold: 1, curious: 0.7 }, { bond: -30, safety: -20, skill: 8, h: 1.18, flag: ['disperse', 'You left your pack and walked hundreds of kilometres looking for a mate and a place of your own.'] }, '', null, true],
        ['sib', 'Leave with a sibling', 'A partner on the road', { social: 1, bold: 0.4 }, { bond: -15, safety: -10, skill: 6, h: 1.08, flag: ['disperse', 'You left home with a sibling, and two sets of eyes made the long road safer.'] }, '']] },
      { id: 'elk', from: 2, to: 9, title: 'A big bull elk', text: 'The pack finds a large, healthy bull. This is the kind of prey that hurts hunters.', opts: [
        ['go', 'Join the attack', 'Food, injury risk', { bold: 1 }, { food: 30, status: 8, skill: 6 }, 'The pack brought it down and everyone ate.', { p: 0.6, fx: { health: -24, food: 6 }, t: 'The bull turned and kicked. You survived with a cracked rib.' }],
        ['hold', 'Hold back until it tires', 'Safer', { caution: 1 }, { food: 12, skill: 3 }, 'You waited and ate when it was over.'],
        ['flank', 'Cut off its escape', 'Skill, teamwork', { social: 1, curious: 0.5 }, { food: 22, skill: 10, bond: 6 }, 'You and the pack worked as one animal and the chase ended quickly.']] },
      { id: 'rival', from: 2, to: 9, title: 'A rival pack\'s scent', text: 'Fresh scent marks cross yours. A neighbouring pack has pushed into your territory.', opts: [
        ['fight', 'Defend the border', 'Standing, injury', { bold: 1 }, { status: 12, bond: 6 }, 'You drove the strangers back and the border held.', { p: 0.55, fx: { health: -24, safety: -10 }, t: 'The rival pack was bigger. You retreated hurt.' }],
        ['avoid', 'Retreat from the border', 'Safe', { caution: 1 }, { safety: 4, food: -4 }, 'You gave ground quietly and hunted elsewhere for a while.'],
        ['howl', 'Answer with a long howl and hold position', 'A bluff', { social: 0.8, bold: 0.3 }, { status: 4, bond: 4, safety: -2 }, 'Your pack howled together and the strangers turned away.']] },
      { id: 'old', from: 8, title: 'The slow years', text: 'You are old for a wolf. Others lead the hunt now.', opts: [
        ['rest', 'Stay near the den', 'Comfort', { caution: 1 }, { health: 3, bond: 4 }, 'You guarded the den and the young brought you the best cuts.'],
        ['keep', 'Keep your place on the hunt', 'Pride, wear', { bold: 1 }, { status: 6, health: -6 }, 'You kept pace, slower but wiser.']] },
    ],
    events: [
      { w: 2, tone: 'joy', fx: { bond: 5 }, t: 'Fresh snow and a day of play: the whole pack tumbled in it like pups.' },
      { w: 2.5, a: [0.5, 99], fx: { food: 24, skill: 3 }, t: 'A successful hunt. The pack ate in a certain order, and you got a share.' },
      { w: 1.2, tone: 'hard', bad: 1, setBad: 0.8, fx: { food: -14 }, t: 'A deep winter set in. Prey grew scarce and the pack travelled far for little.' },
      { w: 1, tone: 'hard', a: [1, 99], fx: { safety: -6, health: -3 }, t: 'You crossed a road at night. A truck flashed past close enough that you felt the air.' },
      { w: 1, tone: 'hard', a: [0.5, 99], ok: (s) => s.born.region.threat > 0.3, fx: { safety: -8 }, t: 'A trap line crossed your route. The pack smelled people and turned away, but a wolf in the area was not so lucky.' },
      { w: 1, t: 'A raven followed the pack for days, scavenging from every kill. The two of you have an old understanding.' },
      { w: 1, tone: 'hard', a: [0.3, 99], fx: { health: -14 }, t: 'Mange swept through the pack. You itched and lost fur for weeks, then recovered.' },
      { w: 1, tone: 'joy', a: [2, 99], fx: { food: 18 }, t: 'The pack found a fresh carcass left by a bear and fed for days.' },
      { w: 1, a: [1, 99], t: 'A bear and the pack watched each other across a carcass. After a long moment, everyone decided not to fight.' },
      { w: 0.8, f: 'disperse', a: [2, 99], fx: { bond: 4 }, t: 'You caught a faint howl from far away and answered it.', t2: 'Because you left your pack, you met a mate on the road, and a new pack formed around the two of you.' },
    ],
  });

  // =============== CHIMPANZEE ===============
  W('chimp', {
    names: ['Fifi', 'Frodo', 'Gaia', 'Kasi', 'Tumbo', 'Zola', 'Jengo', 'Mosi', 'Pili', 'Bahati', 'Nuru', 'Kito'],
    regions: [R('Gombe Stream (Tanzania)', 1, 0.9, 0.3), R('the Mahale Mountains (Tanzania)', 1, 0.85, 0.3), R('Kibale Forest (Uganda)', 2, 0.9, 0.3), R('Budongo Forest (Uganda)', 1, 0.85, 0.35), R('Tai Forest (Cote d\'Ivoire)', 2, 0.85, 0.4), R('Bossou (Guinea)', 1, 0.7, 0.5), R('Loango (Gabon)', 1, 0.85, 0.25), R('the Dja Reserve (Cameroon)', 2, 0.8, 0.5)],
    stages: [[0.3, 'Newborn infant'], [4, 'Infant'], [8, 'Juvenile'], [13, 'Adolescent'], [35, 'Adult'], [99, 'Elder']],
    dt: (a) => (a < 4 ? 1 / 12 : 1 / 6), nurse: 4, rate: [1.3, 0.9], env: 'Tropical African forest', sibs: [0, 2], group: [20, 80],
    bands: [[1, 0.85, [['illness', 0.4], ['a leopard', 0.1], ['a fall', 0.1], ['an attack by an outsider', 0.1], ['hunger', 0.3, 1]]], [4, 0.85, [['illness', 0.4], ['a leopard', 0.1], ['a fall', 0.1], ['an attack by an outsider', 0.1], ['hunger', 0.3, 1]]], [8, 0.9, [['illness', 0.5], ['a leopard', 0.2], ['a fall', 0.15], ['hunger', 0.15, 1]]], [13, 0.94, [['illness', 0.5], ['a leopard', 0.2], ['a fall', 0.15], ['hunger', 0.15, 1]]]],
    adult: { base: 0.05, causes: [['illness', 0.4], ['injury in a fight', 0.25], ['hunger in a lean year', 0.2, 1], ['an accident', 0.15]], senA: 0.01, senK: 0.13 },
    threat: 0.04, threatName: 'snares or poachers',
    breed: { from: 13, to: 40, every: [4.5, 6], litter: [1, 1], surv: [0.4, 1], femaleOnly: true, noun: 'infant', nounPl: 'infants', yes: 'You gave birth to {k}, tiny and clinging, in a nest high in the trees, and the community came to look.', no: 'Your infant did not survive the first weeks. You carried the little body for days, and the community kept near.' },
    legacy: 'The community called through the forest at dusk and settled into their nests.', skill: 'Tool skill', fed: 'Fed', bondLabel: 'Family bond', groupLabel: 'Community', foodLabel: 'Fruit and forage', badName: 'Fruit shortage',
    story: (s) => `{n} was born, a ${s.sex} infant, in a nest of folded branches high in the forest near {place}. For the first months {n} clung to {mother}'s belly, and later rode on her back, in a community of {group} chimpanzees.`,
    diary: { to: 8, young: ['{n} clung to {mother}, rode her back through the canopy and tested every new fruit with a sniff.', 'A day of play-fights and tickling with the other young, then a nap in the nest.', 'You watched the adults groom each other and tried to join in.'], adult: ['The community foraged together in the fruiting trees, then rested and groomed.', 'A long day of travelling, calling and grooming, and a nest at dusk.', 'Social politics, as always: who sits near whom, who shares food, who gets groomed.'] },
    milestones: [['nest', 0.1, 'Every evening {mother} built a fresh nest in the trees and {n} slept curled against her.', 'joy'], ['solid', 0.5, 'First bites of fruit pulp, chewed by mother first, then tried alone.'], ['ride', 0.6, 'You began to ride on {mother}\'s back rather than cling beneath, watching the forest from above.', 'joy'], ['fish', 2.5, 'You watched {mother} fish for termites with a stripped twig, again and again, until you tried it yourself.']],
    decisions: [
      { id: 'termite', from: 1.5, to: 6, title: 'The termite mound', text: 'A termite mound stands in the clearing. Your mother and the older chimps fish for termites with sticks.', opts: [
        ['copy', 'Copy your mother carefully', 'Skill', { curious: 1, social: 0.5 }, { skill: 20, food: 10, flag: ['tool', 'You learned from your mother how to fish for termites with a twig, a skill that would feed you for life.'] }, ''],
        ['play', 'Play with the sticks instead', 'Joy', { social: 0.7 }, { skill: 6, bond: 4 }, 'You turned the stick into a toy, and the termites got away.'],
        ['grab', 'Grab at the mound by hand', 'Impatient', { bold: 0.8 }, { skill: 4, food: 4, health: -4 }, 'You got a few termites and a lot of bites.']] },
      { id: 'gang', from: 4, to: 9, title: 'The juvenile gang', text: 'Other juveniles are chasing each other through the trees and invite you in.', opts: [
        ['join', 'Join the chase', 'Joy, friends', { social: 1, bold: 0.5 }, { bond: 6, skill: 6 }, 'You swung, chased and screamed with delight until dusk.', { p: 0.8, fx: { health: -10, safety: -6 }, t: 'A branch gave way. You fell and cried until your mother arrived.' }],
        ['stay', 'Stay close to your mother', 'Safe', { caution: 1 }, { bond: 8, safety: 4 }, 'You stayed near mother and watched from her lap.'],
        ['adult', 'Follow the adult males to see what they do', 'Curiosity', { curious: 1 }, { skill: 8, status: 3 }, 'You tagged along behind the males and learned a bit of politics.']] },
      { id: 'ranks', from: 12, to: 28, ok: (s) => s.sex === 'male', title: 'Climbing the ranks', text: 'The alpha male is ageing. Several males are eyeing the top spot.', opts: [
        ['challenge', 'Challenge a rival', 'Status. Injury risk', { bold: 1 }, { status: 25, bond: -4 }, 'You displayed, charged and won the stand-off.', { p: 0.45, fx: { health: -28, status: -8 }, t: 'You were bitten badly and driven off.' }],
        ['ally', 'Build alliances through grooming', 'Slow, safe', { social: 1 }, { status: 14, bond: 8, flag: ['ally', 'You built a quiet alliance by grooming, sharing and helping, and your allies backed you when it counted.'] }, ''],
        ['low', 'Keep a low profile', 'Safe', { caution: 1 }, { status: 2, safety: 4 }, 'You kept out of the politics and ate your fruit in peace.']] },
      { id: 'transfer', from: 11, to: 15, ok: (s) => s.sex === 'female', title: 'Leaving home?', text: 'Young females often leave to join another community. Staying means familiar faces but fewer options.', opts: [
        ['go', 'Join another community', 'New start, danger. Hard to undo', { bold: 0.8, curious: 0.8 }, { bond: -25, safety: -14, status: -4, h: 1.1, flag: ['transfer', 'You left your birth community and were accepted into a new one after a tense few days.'] }, '', null, true],
        ['stay', 'Stay in your home range', 'Safe', { caution: 1 }, { bond: 8, safety: 4 }, 'You stayed, with your mother and sisters nearby.']] },
      { id: 'monkey', from: 9, to: 35, title: 'A monkey hunt', text: 'The males are hunting colobus monkeys in the canopy. A kill is shared, and sharing is a political act.', opts: [
        ['join', 'Join the hunt', 'Meat and status', { bold: 1 }, { food: 20, status: 8 }, 'You helped to drive the monkeys and got a share of the meat.', { p: 0.7, fx: { health: -14, safety: -8 }, t: 'You fell from a branch in the chase.' }],
        ['beg', 'Wait below and beg for scraps', 'Safe', { social: 0.7 }, { food: 10, bond: 3 }, 'You sat below with your hand out and got some.'],
        ['skip', 'Skip it and forage for fruit', 'Quiet', { caution: 0.6 }, { food: 8 }, 'You ate fruit while the others hunted.']] },
      { id: 'elder', from: 35, title: 'The elder years', text: 'Your hair is greying. The young ones groom you and ask nothing.', opts: [
        ['groom', 'Spend your days grooming and resting', 'Comfort', { caution: 1 }, { bond: 8, health: 3 }, 'You groomed, rested and watched the young ones play.'],
        ['mediate', 'Keep the peace between rivals', 'Standing, wear', { social: 1 }, { status: 8, health: -4 }, 'You stepped between squabbling males, and they listened.']] },
    ],
    events: [
      { w: 2.5, tone: 'joy', fx: { food: 22, bond: 4 }, t: 'A giant fig tree fruited. The whole community feasted in the branches for days, hooting with delight.' },
      { w: 1.2, tone: 'hard', bad: 1, setBad: 0.8, fx: { food: -12 }, t: 'A poor fruiting year. The community searched wider for less, and tempers frayed.' },
      { w: 1.5, tone: 'joy', fx: { bond: 6 }, t: 'A long grooming session with a friend: picking, murmuring, the closest thing to conversation.' },
      { w: 1, tone: 'hard', a: [0.2, 99], fx: { safety: -8, bond: 3 }, t: 'A leopard was heard in the night. The community screamed the alarm and stayed awake in their nests.' },
      { w: 1, tone: 'hard', a: [0.5, 99], ok: (s) => s.born.region.threat > 0.3, fx: { safety: -8 }, t: 'A wire snare lay on the path, left by hunters for other animals. A young chimp in your group lost a hand to one.' },
      { w: 1, a: [0.3, 99], fx: { skill: 6, food: 6 }, t: 'You found a heavy stone and a nut. After many tries you cracked it, and you were very pleased with yourself.' },
      { w: 1, tone: 'hard', a: [0.3, 99], fx: { health: -14 }, t: 'A respiratory illness passed through the community. Several coughed for weeks, and you recovered slowly.' },
      { w: 1, tone: 'hard', a: [2, 99], fx: { safety: -6 }, t: 'A fight between males erupted near the fruiting tree. You kept out of the way while the screaming went on.' },
      { w: 0.8, tone: 'joy', a: [0.3, 99], t: 'A rainstorm. The adults sat hunched, then one began to display, hurling branches in the rain, and the others joined in.' },
      { w: 0.8, f: 'tool', a: [3, 99], fx: { food: 6 }, t: 'A termite mound stood beside the path.', t2: 'Because you learned to fish for termites as a youngster, you easily found food on a lean day.' },
      { w: 0.6, f: 'ally', a: [10, 99], fx: { food: 6 }, t: 'A quiet day among friends.', t2: 'Because of the alliance you built by grooming, a friend shared meat with you when others were refused.' },
    ],
  });

  // =============== GIANT PANDA ===============
  W('panda', {
    names: ['Mei', 'Bao', 'Xiao', 'Lan', 'Zhu', 'Tian', 'Yun', 'Hua', 'Shan', 'Jing', 'Qiao', 'Dou'],
    regions: [R('the Minshan Mountains (Sichuan/Gansu, China)', 4, 0.85, 0.2), R('the Qionglai Mountains (Sichuan, China)', 4, 0.85, 0.2), R('the Qinling Mountains (Shaanxi, China)', 2, 0.9, 0.15), R('the Liangshan Mountains (Sichuan, China)', 1, 0.75, 0.3), R('the Xiaoxiangling Mountains (Sichuan, China)', 1, 0.75, 0.3), R('the Daxiangling Mountains (Sichuan, China)', 1, 0.8, 0.3)],
    stages: [[0.1, 'Newborn cub'], [0.8, 'Cub'], [2, 'Young cub'], [4, 'Juvenile'], [18, 'Adult'], [99, 'Senior']],
    dt: (a) => (a < 0.5 ? 1 / 24 : a < 2 ? 1 / 12 : 1 / 6), nurse: 1.5, rate: [1.2, 0.8], env: 'Bamboo forest in the mountains', sibs: [0, 0], group: [3, 6],
    bands: [[0.1, 0.85, [['being chilled or crushed in the den', 0.4], ['illness', 0.3], ['a failure of the milk supply', 0.3]]], [0.8, 0.78, [['illness', 0.35], ['a predator', 0.2], ['hunger', 0.25, 1], ['a fall', 0.2]]], [2, 0.85, [['illness', 0.35], ['a predator', 0.2], ['hunger', 0.3, 1], ['a fall', 0.15]]], [4, 0.8, [['illness', 0.35], ['hunger', 0.35, 1], ['a fall', 0.15], ['a predator', 0.15]]]],
    adult: { base: 0.06, causes: [['hunger when the bamboo dies back', 0.35, 1], ['illness', 0.35], ['a clash with another panda', 0.1], ['injury', 0.2]], senA: 0.012, senK: 0.22 },
    threat: 0.08, threatName: 'snares or habitat loss',
    breed: { from: 5, to: 20, every: [2, 3], litter: [1, 2], surv: [0.2, 0.9], femaleOnly: true, noun: 'cub', nounPl: 'cubs', yes: 'You gave birth in a hollow tree to {k}, pink and tiny, and held them close for weeks.', no: 'Your cub did not survive. Pandas often raise only one cub at a time, and the loss was quiet.' },
    legacy: 'The mist rose over the bamboo, and the mountain went on.', skill: 'Foraging skill', fed: 'Fed', bondLabel: 'Mother bond', groupLabel: 'Neighbouring pandas', foodLabel: 'Bamboo', badName: 'Bamboo die-back',
    story: (s) => `{n} was born, a ${s.sex} cub, in a hollow tree near {place}: pink, blind and about a hundred grams, a thousandth of {mother}'s weight. {mother} raised {n} alone, curled round the cub for weeks, while the mist came and went.`,
    diary: { to: 2, young: ['{n} nursed, rolled, climbed {mother} and tumbled off again.', 'A day of bamboo chewing and tumble play with {mother}.', 'A damp mountain day: nap, nurse, nibble, repeat.'], adult: ['A day of eating bamboo for fourteen hours, with short naps in between.', 'You scent-marked a tree trunk and moved on through the mist.', 'A quiet day in the forest: eat, rest, eat, rest.'] },
    milestones: [['eyes', 0.12, 'Your eyes opened at about six weeks, to a dark den and the black-and-white shape of {mother}.', 'joy'], ['walk', 0.3, 'You took your first wobbly steps at three months, and fell over a lot.', 'joy'], ['bamboo', 0.5, 'First bites of bamboo shoots next to {mother}, mostly chewed and dropped.'], ['climb', 0.9, 'Your first climb: a few metres up a fir tree, a long wail for help, and a longer sulk afterward.', 'joy'], ['solo', 1.6, 'Your mother grew restless. The day was coming when you would have to live alone.']],
    decisions: [
      { id: 'shoots', from: 0.8, to: 2, title: 'Shoots or leaves?', text: 'Your mother is eating bamboo stems. There are also tender shoots and a bush of something unknown.', opts: [
        ['copy', 'Copy your mother exactly', 'Safe', { caution: 1 }, { skill: 12, food: 8 }, 'You chewed what she chewed and learned the right stems.'],
        ['try', 'Try the unknown plant', 'Curious. Risky', { curious: 1, bold: 0.5 }, { skill: 8, food: 4 }, 'It was fine, and you tucked that knowledge away.', { p: 0.7, fx: { health: -12 }, t: 'It made you ill. Your mother ignored it. Pandas learn this way.' }],
        ['play', 'Chase a rolling stem instead', 'Joy', { social: 0.5 }, { bond: 6, skill: 4 }, 'You rolled the stem down the slope and chased it. A whole afternoon.']] },
      { id: 'leave', from: 1.7, to: 3, title: 'Time to be alone', text: 'Your mother is moving away more each day. At about two years pandas start their own lives.', opts: [
        ['range', 'Take a range nearby', 'Familiar', { caution: 1 }, { safety: 4, skill: 6, bond: -10 }, 'You settled on the next slope and checked your mother\'s scent often.'],
        ['far', 'Strike out across the ridge', 'Bold, risky', { bold: 1 }, { skill: 10, safety: -12, bond: -14, h: 1.08, flag: ['far', 'You crossed a ridge, away from your mother\'s range, to find a place of your own.'] }, '', null, true],
        ['linger', 'Linger near your mother', 'Safe', { social: 0.6 }, { bond: 6, food: -4 }, 'You kept finding excuses to be near her until she was gone.']] },
      { id: 'season', from: 4, to: 16, title: 'Breeding season', text: 'In spring you hear bleating calls from the next valley. It is mating season, and you are not the only one who wants a mate.', opts: [
        ['go', 'Go to the calls', 'Social', { social: 1, bold: 0.5 }, { bond: 6, status: 6 }, 'You followed the calls and found company, briefly.', { p: 0.7, fx: { health: -14, safety: -6 }, t: 'A rival fought you off with bites to the neck.' }],
        ['stay', 'Stay in your range', 'Quiet', { caution: 1 }, { safety: 4 }, 'You stayed in your range and listened to the calls fade.'],
        ['mark', 'Scent-mark and call', 'Signal', { curious: 0.5 }, { status: 6, skill: 2 }, 'You marked tree after tree and called across the valley.']] },
      { id: 'bloom', from: 5, to: 16, title: 'The bamboo flowers', text: 'The bamboo in your valley has flowered, which happens once in several decades, and then the whole stand dies. Food is running out.', opts: [
        ['move', 'Walk to a new bamboo stand', 'Effort, risk', { bold: 0.7 }, { skill: 8, food: -8, safety: -6 }, 'The walk was long, but you found a living stand.', { p: 0.6, fx: { food: -14, health: -8 }, t: 'The next valley was also dying, and you went hungry for weeks.' }],
        ['wait', 'Wait it out on what is left', 'Hunger', { caution: 1 }, { food: -14, health: -4 }, 'You stayed and ate the last stems. It was a thin year.'],
        ['alt', 'Eat other plants and the odd carcass', 'Flexible', { curious: 1 }, { food: 10, skill: 4, health: -2 }, 'Pandas are bears, after all. You ate whatever you found.']] },
      { id: 'old', from: 15, title: 'Slower days', text: 'The slopes feel steeper. Your range is the same, but it takes longer to walk.', opts: [
        ['hollow', 'Settle in a favourite hollow', 'Comfort', { caution: 1 }, { health: 3, safety: 4 }, 'You made a hollow your own and stayed close to the best bamboo.'],
        ['range', 'Keep walking your whole range', 'Wear, pride', { bold: 0.8 }, { status: 4, health: -5 }, 'You kept up your rounds, slow but steady.']] },
    ],
    events: [
      { w: 2.5, tone: 'joy', fx: { food: 14, health: 2 }, t: 'A warm spring day: fresh shoots, soft light and a long afternoon in a sunny glade.' },
      { w: 1, tone: 'hard', bad: 1, setBad: 0.8, fx: { food: -12 }, t: 'A late freeze killed the tender shoots. Food was thin for weeks.' },
      { w: 1, tone: 'hard', a: [0.2, 2.5], fx: { safety: -8, bond: 5 }, t: 'A leopard cat prowled near the den. Your mother\'s growl sent it off, and you were carried to a new den that night.' },
      { w: 1, a: [0.5, 99], t: 'Camera traps clicked in the trees, set by researchers counting pandas. Somewhere your picture got a number.' },
      { w: 1, tone: 'hard', a: [0.3, 99], ok: (s) => s.born.region.threat > 0.25, fx: { safety: -6 }, t: 'A wire snare, set for musk deer, hung across your trail. You backed away slowly, shaken.' },
      { w: 1, tone: 'joy', a: [1, 99], fx: { health: 3 }, t: 'You rolled in a patch of horse manure, as pandas do. Scientists think it helps them cope with cold.' },
      { w: 1, tone: 'hard', a: [0.3, 99], fx: { food: -10, health: -6 }, t: 'A long wet spell. You huddled in a hollow tree for days, cold and hungry.' },
      { w: 1, a: [1, 99], fx: { health: 2 }, t: 'You drank at a stream and watched the mist rise. Nothing happened, which is also a good day.' },
      { w: 0.8, tone: 'hard', a: [0.5, 99], fx: { health: -14 }, t: 'A stomach infection laid you low for a week. You recovered.' },
      { w: 0.8, f: 'far', a: [3, 99], fx: { food: 6 }, t: 'A new patch of forest opened up to the east.', t2: 'Because you crossed that ridge years ago, you knew where the good bamboo was when your valley ran thin.' },
    ],
  });

  // =============== ORCA ===============
  W('orca', {
    names: ['Sedna', 'Kiska', 'Nootka', 'Skana', 'Ketos', 'Orin', 'Tide', 'Marlo', 'Selka', 'Kai', 'Isla', 'Brine'],
    regions: [R('the Salish Sea (Canada/USA)', 2, 0.6, 0.45), R('the fjords of northern Norway', 2, 0.85, 0.2), R('the waters off Iceland', 2, 0.85, 0.2), R('the Crozet Islands (France)', 1, 0.8, 0.1), R('the Antarctic Peninsula', 2, 0.9, 0.1), R('the Bering Sea (Alaska, USA)', 2, 0.85, 0.15), R('the coast of Aotearoa (New Zealand)', 1, 0.8, 0.15), R('the Strait of Gibraltar (Spain/Morocco)', 1, 0.5, 0.5)],
    stages: [[0.3, 'Newborn calf'], [3, 'Calf'], [10, 'Juvenile'], [40, 'Adult'], [999, 'Elder']],
    dt: (a) => (a < 1 ? 1 / 24 : a < 3 ? 1 / 12 : 1 / 6), nurse: 3, rate: [1.2, 0.8], env: 'Cold coastal and open ocean', sibs: [0, 2], group: [4, 25],
    sexH: { male: 1.7 },
    bands: [[0.3, 0.8, [['a failure to nurse', 0.25], ['illness', 0.25], ['hunger in a lean year', 0.3, 1], ['an attack by another whale', 0.2]]], [1, 0.84, [['illness', 0.3], ['hunger in a lean year', 0.4, 1], ['an accident', 0.3]]], [3, 0.9, [['illness', 0.3], ['hunger in a lean year', 0.4, 1], ['an accident', 0.3]]], [10, 0.94, [['illness', 0.35], ['hunger in a lean year', 0.4, 1], ['an accident', 0.25]]]],
    adult: { base: 0.02, causes: [['illness', 0.4], ['hunger in a lean year', 0.35, 1], ['an accident', 0.25]], senA: 0.002, senK: 0.08 },
    threat: 0.02, threatName: 'entanglement, a ship strike or pollution',
    breed: { from: 12, to: 42, every: [4, 6], litter: [1, 1], surv: [0.4, 1], femaleOnly: true, noun: 'calf', nounPl: 'calves', yes: 'You gave birth to {k} after seventeen months, and the whole pod pushed the newborn up for its first breath.', no: 'Your calf did not survive the first weeks. The pod stayed with you, very close, for days.' },
    legacy: 'The pod travelled on, and its calls carried a little of you.', skill: 'Hunting skill', fed: 'Fed', bondLabel: 'Pod bond', groupLabel: 'Pod size', foodLabel: 'Prey', badName: 'Lean season',
    story: (s) => `{n} was born tail-first in cold water near {place}: about two metres of black and white, in a family of {group} led by a grandmother. {mother} and the pod pushed ${s.sex === 'male' ? 'him' : 'her'} up for the first breath and have not left ${s.sex === 'male' ? 'his' : 'her'} side since.`,
    diary: { to: 4, young: ['{n} swam in {mother}\'s slipstream, surfaced when she did, and nursed.', 'A day of play with the other calves, leaping and tail-slapping.', 'The pod travelled along the coast while {n} learned the calls.'], adult: ['The pod hunted along the coast, then rested in a tight group.', 'A quiet day of travelling, calling and surfacing in time with the family.', 'The pod met another family and a noisy greeting followed.'] },
    milestones: [['breath', 0.02, 'Your first hours were spent racing to keep up, riding the pressure wave beside {mother}, and surfacing for air every few minutes.', 'joy'], ['call', 0.4, 'You began to learn the pod\'s calls, a dialect that no other pod makes exactly the same way.', 'joy'], ['fish', 1.5, '{mother} taught you to hunt: cornering prey against the shore, one step at a time.'], ['slap', 2, 'You lifted your tail clear of the water and slapped it down, again and again, for the pure noise of it.', 'joy']],
    decisions: [
      { id: 'shallows', from: 0.5, to: 3, title: 'Where mother goes', text: 'The pod is hunting along a rocky shore. The water is shallow and the tide is changing.', opts: [
        ['stay', 'Stay close beside your mother', 'Safe', { caution: 1 }, { safety: 4, bond: 4 }, 'You stayed in her wake and learned how she read the shore.'],
        ['help', 'Help to herd the fish with the others', 'Skill', { social: 1 }, { skill: 12, food: 8 }, 'You and the other young herded the shoal toward the adults.'],
        ['play', 'Slip away to play in the surf', 'Bold. Risky', { bold: 1, curious: 0.8 }, { skill: 6 }, 'You surfed the swell and the pod let you.', { p: 0.7, fx: { health: -12, safety: -10 }, t: 'You misjudged the shallows and scraped your belly on the rocks. Your mother had to call you back.' }]] },
      { id: 'technique', from: 3, to: 10, title: 'A family technique', text: 'Each pod has its own way of hunting. Your family has a special trick that older whales demonstrate.', opts: [
        ['learn', 'Study and copy it', 'Skill, culture', { curious: 1, social: 0.5 }, { skill: 22, flag: ['culture', 'You learned your family\'s hunting technique, a piece of culture passed from whale to whale.'] }, ''],
        ['own', 'Try your own variation', 'Creative, riskier', { bold: 0.8, curious: 0.8 }, { skill: 12, food: 6 }, 'Your variation worked, and the pod noticed.', { p: 0.6, fx: { food: -8, skill: 6 }, t: 'Your idea did not work this time. The pod waited patiently for you to learn.' }],
        ['skip', 'Rely on the others to feed you', 'Easy for now', { caution: 0.6 }, { food: 6, skill: -4, bond: 4 }, 'You were fed. It will not last.']] },
      { id: 'meet', from: 5, to: 40, title: 'A meeting of pods', text: 'A different family is travelling toward your waters. Pods often greet each other, but not always.', opts: [
        ['greet', 'Join the greeting', 'Social', { social: 1 }, { bond: 6, status: 4 }, 'The two pods mingled for a day, with a lot of calling.'],
        ['hang', 'Hang back by your grandmother', 'Safe', { caution: 1 }, { safety: 4 }, 'You watched from your grandmother\'s side.'],
        ['probe', 'Swim over to the strangers', 'Curious, risky', { bold: 1, curious: 1 }, { skill: 6, status: 4 }, 'You made a new friend of another family.', { p: 0.8, fx: { bond: -4, safety: -6 }, t: 'The other pod was not interested. You were gently escorted back.' }]] },
      { id: 'boats', from: 6, title: 'A boat approaches', text: 'A small boat stops nearby. People lean over the rail with cameras. Others are fishing in your pod\'s hunting grounds.', opts: [
        ['look', 'Swim over and look', 'Curious. Risk', { curious: 1, social: 0.5 }, { skill: 2, status: 2 }, 'You circled the boat. The people were thrilled. You were mildly curious.', { p: 0.8, fx: { health: -10, safety: -8 }, t: 'You swam too close to a propeller. A deep cut, and the pod stayed close for days.' }],
        ['avoid', 'Dive deep and keep away', 'Safe', { caution: 1 }, { safety: 4, food: -4 }, 'You dived and waited until the engine noise faded.'],
        ['follow', 'Follow the boat to the fish', 'Food, tangles', { bold: 0.5 }, { food: 16, safety: -6 }, 'You found the fish the boat was after.']] },
      { id: 'grandmother', from: 30, ok: (s) => s.sex === 'female', title: 'Grandmother', text: 'You are older than most of the pod. The younger whales watch where you swim, because you remember where the salmon run.', opts: [
        ['lead', 'Lead the pod to the best hunting ground', 'Responsibility', { social: 1, bold: 0.5 }, { status: 20, bond: 8, flag: ['matriarch', 'You became the pod\'s grandmother, its memory and its guide.'] }, ''],
        ['rest', 'Swim at the back and share what you know', 'Calm', { caution: 0.7 }, { bond: 6, health: 2 }, 'You stayed in the pod and your daughters led.']] },
    ],
    events: [
      { w: 2.5, tone: 'joy', fx: { food: 24, bond: 4 }, t: 'A feast: the pod found a shoal and fed for hours, then slept in a tight, slow-breathing line.' },
      { w: 1.2, tone: 'hard', bad: 1, setBad: 0.8, fx: { food: -14 }, t: 'A lean season. The fish did not come, and the pod searched wide for less.' },
      { w: 1.5, tone: 'joy', fx: { bond: 6 }, t: 'Calves in the pod led a game, leaping and spinning out of the water, one after another.' },
      { w: 1, tone: 'hard', a: [0.1, 99], fx: { safety: -6 }, t: 'A noisy stretch of water: ship engines, sonar, boats everywhere. The pod went quiet and moved on.' },
      { w: 1, a: [0.2, 99], fx: { bond: 4 }, t: 'Your pod met another family at sunrise. They exchanged long calls, swam together for a day, then split again.' },
      { w: 1, tone: 'hard', a: [0.1, 99], fx: { health: -14 }, t: 'A sudden illness left you swimming slowly at the pod\'s edge for weeks, until you recovered.' },
      { w: 1, tone: 'hard', a: [0.5, 99], ok: (s) => s.born.region.threat > 0.3, fx: { health: -12, safety: -6 }, t: 'A tangle of fishing line wrapped around you. After a long struggle you shook free, scraped and sore.' },
      { w: 1, a: [0.3, 99], fx: { bond: 3 }, t: 'The pod visited a rubbing beach and scrubbed against smooth stones, a ritual for the whole family.' },
      { w: 0.6, tone: 'joy', a: [0.2, 99], fx: { bond: 3 }, t: 'You found a floating stem of kelp and played catch with it for an hour.' },
      { w: 0.8, f: 'culture', a: [3, 99], fx: { food: 6 }, t: 'A shoal of fish appeared along the shore.', t2: 'Because you learned the family\'s hunting technique, you led the pod\'s young in a successful chase.' },
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
