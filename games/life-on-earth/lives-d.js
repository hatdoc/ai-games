// More scenarios: extra events and decisions for every species. Events only describe moments; the simulation (needs, hazards,
// flags) decides which can happen, and some of them cite earlier choices (the butterfly effect).
(function (g) {
  const LE = g.LE, M = LE.modules, say = LE.say, flag = LE.flag, N = LE.mod;
  const cl = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
  const E = (id, w, tone, when, fx, wf) => ({ id, w, tone, when, fx, wf });
  const add = (mod, ev, dec) => { M[mod].events.push(...ev); if (dec) M[mod].decisions.push(...dec); };
  const D = (id, when, title, text, options) => ({ id, when, title, text, options });
  const O = (k, label, hint, bias, fx, extra) => Object.assign({ k, label, hint, bias, fx }, extra || {});

  // ================= COMPANION (dog and cat) =================
  const dog = (s) => s.sp === 'dog', cat = (s) => s.sp === 'cat', home = (s) => s.home === 'home', stray = (s) => s.home === 'stray', shelter = (s) => s.home === 'shelter';
  add('companion', [
    E('kitchen', 2, 'calm', (s) => home(s) && s.age > 0.5, (s, R) => { if (R.chance(0.65)) { N(s, 'food', 16); say(s, dog(s) ? 'A chicken leg was left on the counter edge. It was not there for long.' : 'You found the unattended fish on the counter and made your move.', { tone: 'joy' }); } else { N(s, 'calm', -8); N(s, 'bond', -3); say(s, 'You were caught in the act, with the evidence on your face.', { tone: 'calm' }); } }),
    E('sock', 2, 'joy', (s) => home(s) && s.age < 4, (s) => { N(s, 'calm', 6); say(s, dog(s) ? 'You stole a sock and ran a victory lap through the house with three people chasing.' : 'You knocked a glass off the table, looking right at your person the whole time.', { tone: 'joy' }); }),
    E('rainwalk', 2, 'calm', (s) => home(s) && dog(s), (s) => { N(s, 'energy', -8); N(s, 'bond', 5); say(s, 'A walk in the rain: puddles, mud and a towel waiting at home.', { tone: 'joy' }); }),
    E('groom', 1.5, 'calm', (s) => home(s) && s.age > 0.8, (s) => { N(s, 'calm', -4); N(s, 'health', 3); say(s, 'A bath and a brush-out. Not your idea of fun, and you smelled wonderful afterwards.', { tone: 'calm' }); }),
    E('moving', 1, 'hard', (s) => home(s) && s.age > 1, (s) => { N(s, 'calm', -10); say(s, 'Boxes everywhere and a new house that smelled of strangers. By the end of the week the new couch smelled like you.', { tone: 'hard' }); }),
    E('holiday', 1, 'calm', (s) => home(s) && s.age > 1, (s, R) => { N(s, 'calm', -6); N(s, 'bond', R.chance(0.5) ? 4 : -2); say(s, 'The family went away for a week. A neighbour came to feed you, and your person came home to a very loud welcome.', { tone: 'calm' }); }),
    E('powercut', 1, 'hard', (s) => home(s), (s) => { N(s, 'calm', -4); say(s, 'A power cut and a night of candles. You stayed pressed against the nearest leg.', { tone: 'calm' }); }),
    E('sick', 1.2, 'hard', (s) => s.age > 0.4, (s) => { N(s, 'health', -12); s.mods.h *= home(s) ? 1.02 : 1.06; say(s, home(s) ? 'A stomach bug: a night of misery and a trip to the vet in the morning.' : 'You got sick from something you ate, and curled up under a cart until it passed.', { tone: 'hard' }); }),
    E('ticks', 1, 'hard', (s) => s.age > 0.3, (s) => { N(s, 'health', -6); say(s, home(s) ? 'Ticks after a country walk. Your person found them all with tweezers and a lot of apology.' : 'Ticks and fleas made every day itchy until a rain washed some away.', { tone: 'hard' }); }),
    E('trick', 1.5, 'joy', (s) => dog(s) && home(s) && s.n.skill > 15, (s) => { s.n.skill = cl(s.n.skill + 5); N(s, 'bond', 5); say(s, 'You learned to shake hands, and then to do it on cue for a visitor with a biscuit.', { tone: 'joy' }); }),
    E('lost', 0.8, 'hard', (s) => home(s) && s.age > 0.8 && !LE.hasFlag(s, 'lost'), (s) => { N(s, 'calm', -14); N(s, 'safety', -10); flag(s, 'lost', 'You got lost for a day after following a smell too far, and found your way home by nose and luck.'); }),
    E('reunion', 3, 'joy', (s) => home(s) && LE.hasFlag(s, 'lost'), (s) => { N(s, 'bond', 10); say(s, 'Your person still keeps a tag on you with their number now. You did not understand it, only that they held you for a very long time.', { tone: 'joy', because: 'lost' }); }, (s) => (s.age > 1 ? 1 : 0.1)),
    E('illnessowner', 0.8, 'calm', (s) => home(s) && s.age > 2, (s) => { N(s, 'bond', 8); say(s, 'Your person was sick in bed for a week, and you refused to leave the room.', { tone: 'joy' }); }),
    E('party', 1, 'calm', (s) => home(s) && s.age > 0.8, (s, R) => { N(s, 'food', 10); N(s, 'calm', -4); say(s, 'A birthday party: many people, many hands, an entire floor of dropped crumbs.', { tone: 'joy' }); }),
    E('dentist', 0.8, 'calm', (s) => home(s) && s.age > 4, (s) => { N(s, 'health', 3); say(s, 'A dental clean at the vet. You woke up groggy and annoyed, with fresh breath.', { tone: 'calm' }); }),
    E('weight', 0.8, 'calm', (s) => home(s) && s.age > 3, (s, R) => { N(s, 'health', R.chance(0.5) ? -3 : 3); say(s, 'The vet said you had gained weight, and a new bowl and a longer route followed. Your person was dieting alongside you.', { tone: 'calm' }); }),
    // stray and shelter
    E('market', 2, 'hard', (s) => stray(s), (s, R) => { if (R.chance(0.5)) { N(s, 'food', 18); say(s, 'A vendor tossed you the fish heads at closing time.', { tone: 'joy' }); } else { N(s, 'calm', -8); N(s, 'trust', -4); say(s, 'A vendor shooed you off with a broom. You learned which stalls to avoid.', { tone: 'hard' }); } }),
    E('pack', 2, 'joy', (s) => stray(s) && dog(s) && s.age > 0.5, (s) => { N(s, 'calm', 8); N(s, 'safety', 6); say(s, 'You fell in with a loose group of street dogs, and shared a patch and a nightly chorus.', { tone: 'joy' }); }),
    E('colony', 2, 'joy', (s) => stray(s) && cat(s) && s.age > 0.5, (s) => { N(s, 'calm', 8); N(s, 'safety', 6); say(s, 'A cat colony behind a restaurant accepted you, and its volunteer feeder arrived at dusk with a bag of kibble.', { tone: 'joy' }); }),
    E('rival', 1.5, 'hard', (s) => stray(s) && s.age > 1, (s, R) => { if (R.chance(0.5)) { N(s, 'health', -10); say(s, 'A fight over a doorway ended in scratches on both sides.', { tone: 'hard' }); } else say(s, 'A rival backed down after a long stare.', { tone: 'calm' }); }),
    E('childfeed', 1.5, 'joy', (s) => stray(s) && s.age < 5, (s) => { N(s, 'food', 14); N(s, 'trust', 8); say(s, 'A child shared half a sandwich every afternoon on the way home from school.', { tone: 'joy' }); }),
    E('flood', 0.8, 'hard', (s) => stray(s), (s) => { N(s, 'health', -8); N(s, 'food', -10); say(s, 'A flooded street forced you onto a roof for a night. People rescued a few of the animals, and the water went down by morning.', { tone: 'hard' }); }),
    E('nearmiss', 1.5, 'hard', (s) => stray(s) || (home(s) && cat(s)), (s) => { N(s, 'calm', -10); say(s, 'A car came out of nowhere. You froze, then bolted, and it passed over the place you had been.', { tone: 'hard' }); }),
    E('litter', 1, 'joy', (s) => stray(s) && s.sex === 'female' && s.age > 1 && s.age < 7, (s, R) => { const n = R.int(2, 5); N(s, 'bond', 6); N(s, 'food', -10); s.family.push({ rel: 'Offspring', name: `${n} young`, note: `born when ${s.name} was ${s.age.toFixed(1)}` }); say(s, `You had a litter of ${n} under a stairwell and hid them well until they could walk.`, { tone: 'joy', turn: true }); }),
    E('ngo', 1.5, 'joy', (s) => (stray(s) || shelter(s)) && s.age > 0.3, (s) => { N(s, 'health', 12); s.mods.h = Math.max(0.6, s.mods.h * 0.95); say(s, 'A volunteer vaccination camp, with a queue of animals, a needle and a treat for every one.', { tone: 'joy' }); }),
    E('poison', 0.6, 'hard', (s) => stray(s), (s) => { N(s, 'health', -14); say(s, 'Poisoned bait left out for rats made you sick for days. You avoided that alley afterwards.', { tone: 'hard' }); }),
    E('volwalk', 2, 'joy', (s) => shelter(s) && dog(s), (s) => { N(s, 'calm', 8); N(s, 'trust', 6); say(s, 'A shelter volunteer took you on a real walk, with grass, smells and a person who talked the whole time.', { tone: 'joy' }); }),
    E('visitors', 2, 'calm', (s) => shelter(s), (s, R) => { N(s, 'calm', -4); say(s, R.pick(['A family looked at you for a while and chose another animal.', 'A visitor read your card, smiled and walked on.', 'A child pressed a hand to the glass for a full minute.']), { tone: 'calm' }); }),
    // cat only
    E('mouse', 2, 'joy', (s) => cat(s) && s.age > 0.5, (s) => { s.n.skill = cl(s.n.skill + 6); N(s, 'food', 8); say(s, home(s) ? 'You presented your person with a mouse as a gift. They did not appreciate it as much as they should have.' : 'You caught a mouse behind the market and ate it on the spot.', { tone: 'joy' }); }),
    E('sunbeam', 2, 'calm', (s) => cat(s), (s) => { N(s, 'calm', 8); say(s, 'You found the one perfect sunbeam in the house and moved with it for the whole afternoon.', { tone: 'calm' }); }),
    E('box', 1.5, 'joy', (s) => cat(s) && home(s), (s) => { N(s, 'calm', 6); say(s, 'A cardboard box arrived. You ignored the expensive toy next to it.', { tone: 'joy' }); }),
    E('roof', 1.5, 'calm', (s) => cat(s) && s.age > 1, (s, R) => { if (R.chance(0.85)) say(s, 'You walked the length of the roofs at dusk and saw the whole neighbourhood from above.', { tone: 'joy' }); else { N(s, 'health', -8); say(s, 'A misjudged jump ended in a sore paw and a limp for a week.', { tone: 'hard' }); } }),
    E('fence', 1.5, 'hard', (s) => cat(s) && s.age > 1, (s) => { N(s, 'calm', -4); say(s, 'A midnight serenade of yowls on the fence, settled by nobody and ignored by everyone.', { tone: 'calm' }); }),
    E('neighbour', 1.5, 'joy', (s) => cat(s) && s.age > 0.5, (s) => { N(s, 'food', 10); N(s, 'trust', 4); say(s, 'A neighbour started leaving a saucer out. By the second week you counted that house as yours too.', { tone: 'joy' }); }),
    // dog only
    E('swim', 1.5, 'joy', (s) => dog(s) && home(s) && s.age > 0.5, (s) => { N(s, 'energy', -10); N(s, 'bond', 6); say(s, 'A trip to the river: a stick, a splash and a spectacular shake all over your family.', { tone: 'joy' }); }),
    E('postal', 1.5, 'calm', (s) => dog(s) && home(s), (s) => { N(s, 'calm', -3); say(s, 'The postal worker came, as every day, and you defended the door as every day. You have never once lost.', { tone: 'joy' }); }),
    E('carride', 1.5, 'joy', (s) => dog(s) && home(s), (s) => { N(s, 'calm', 6); say(s, 'A car ride with your head out of the window and the whole world as one long smell.', { tone: 'joy' }); }),
    E('snow', 1, 'joy', (s) => dog(s) && s.born.country.gdp > 0, (s) => { N(s, 'energy', 6); say(s, 'First snow. You did not understand it and wanted it all.', { tone: 'joy' }); }),
  ], [
    D('stolen', (s) => dog(s) && home(s) && s.age >= 2, 'The unattended sandwich', (s) => `A whole sandwich sits on a low table. Nobody is in the room. ${s.name} is looking at it.`, [
      O('take', 'Take it and run', 'Delicious, risky', { bold: 1 }, (s, R) => { N(s, 'food', 20); if (R.chance(0.45)) { N(s, 'bond', -6); say(s, 'You were caught with crumbs on your muzzle. The sandwich was very good.', { tone: 'calm' }); } else say(s, 'You got away with it, and the sandwich was gone before the crime was.', { tone: 'joy' }); }),
      O('wait', 'Sit and look hopeful', 'Cute, slow', { social: 1 }, (s, R) => { if (R.chance(0.6)) { N(s, 'food', 10); N(s, 'bond', 4); say(s, 'Your person found you sitting nobly in front of it and shared the crust.', { tone: 'joy' }); } else say(s, 'Nobody came, and the sandwich stayed where it was.', { tone: 'calm' }); }),
      O('leave', 'Leave it alone', 'Disciplined', { caution: 1 }, (s) => { N(s, 'trust', 6); N(s, 'bond', 4); say(s, 'You looked away, and your person noticed.', { tone: 'joy' }); }),
    ]),
    D('lostwalk', (s) => dog(s) && home(s) && s.age >= 1 && s.age < 8, 'A tempting smell on the walk', (s) => 'The lead slips. A rabbit scent runs straight into the trees.', [
      O('chase', 'Chase it', 'Wild joy, a long way home', { bold: 1, curious: 0.6 }, (s, R) => { N(s, 'energy', -14); if (R.chance(0.6)) say(s, 'You came back covered in burrs, panting and delighted.', { tone: 'joy' }); else { N(s, 'safety', -12); flag(s, 'lost', 'You chased a rabbit into the woods and spent a long, frightened night finding your way home.'); } }),
      O('recall', 'Come back when called', 'Obedient', { caution: 1, social: 0.6 }, (s) => { N(s, 'bond', 6); s.n.skill = cl(s.n.skill + 6); say(s, 'You turned on a coin and trotted back. A treat followed.', { tone: 'joy' }); }),
      O('sniff', 'Follow it a little way, then return', 'A compromise', { curious: 0.8 }, (s) => { N(s, 'energy', -4); say(s, 'You followed the trail until it went cold and walked back.', { tone: 'calm' }); }),
    ]),
    D('birdwin', (s) => cat(s) && home(s) && s.age >= 1 && s.age < 8, 'A bird on the other side of the glass', (s) => 'A sparrow lands on the windowsill. The window is open a crack.', [
      O('pounce', 'Pounce through the gap', 'Instinct', { bold: 1 }, (s, R) => { s.n.skill = cl(s.n.skill + 4); if (R.chance(0.2)) { N(s, 'health', -6); say(s, 'You missed the bird and the windowsill, and your person caught your pride rather than you.', { tone: 'hard' }); } else say(s, 'The bird was gone before you were. You sat on the sill, tail twitching with shame.', { tone: 'calm' }); }),
      O('chatter', 'Chatter at it quietly', 'Watch', { caution: 0.8 }, (s) => { N(s, 'calm', 4); say(s, 'You made small clicking sounds at the bird for ten full minutes.', { tone: 'joy' }); }),
      O('ignore', 'Ignore it', 'Dignity', { caution: 1 }, (s) => { N(s, 'calm', 2); say(s, 'You looked at the sky, offended on behalf of every cat.', { tone: 'calm' }); }),
    ]),
    D('shelterdoor', (s) => shelter(s) && s.age >= 0.5 && s.age < 8, 'A visitor stops at your pen', (s) => 'A person lingers. This could be the one. How do you show them who you are?', [
      O('greet', (s) => (s.sp === 'cat' ? 'Rub against the bars and purr' : 'Wag and greet them'), 'Charm', { social: 1 }, (s, R) => { N(s, 'trust', 6); if (R.chance(0.5)) { flag(s, 'seed', 'A visitor stopped at your pen and you showed them exactly who you were.'); } else say(s, 'They smiled, wrote something down, and went on.', { tone: 'calm' }); }),
      O('calm', 'Sit calmly and watch', 'Quiet', { caution: 1 }, (s, R) => { N(s, 'calm', 4); if (R.chance(0.3)) flag(s, 'seed', 'A visitor chose the animal who sat calmly, and that was you.'); else say(s, 'You waited. Quiet is not always noticed.', { tone: 'calm' }); }),
      O('hide', 'Turn to the wall', 'Shy', { caution: 0.8 }, (s) => { N(s, 'calm', 2); say(s, 'You hid your face in the blanket. The visitor moved on.', { tone: 'calm' }); }),
    ]),
  ]);
  M.companion.eventRate = () => 2.2;

  // ================= LION =================
  add('lion', [
    E('zebra', 3, 'calm', (s) => s.age > 1, (s, R) => { N(s, 'food', 18); s.n.skill = cl(s.n.skill + 3); say(s, 'A zebra, caught after a short dash at dusk. The pride ate in order of rank, and the cubs waited their turn.', { tone: 'calm' }); }),
    E('cubplay', 2, 'joy', (s) => s.age < 1.6, (s) => { N(s, 'bond', 5); s.n.skill = cl(s.n.skill + 3); say(s, 'A long game of ambush and tumble with cousins, ended by a flick of an aunt\'s tail.', { tone: 'joy' }); }),
    E('teach', 2, 'calm', (s) => s.age > 0.5 && s.age < 2.5, (s) => { s.n.skill = cl(s.n.skill + 5); say(s, `${s.mother} dragged the carcass closer and let ${s.name} learn where to bite.`, { tone: 'calm' }); }),
    E('coop', 2, 'calm', (s) => s.sex === 'female' && s.age > 2.5, (s) => { s.n.skill = cl(s.n.skill + 3); N(s, 'status', 3); say(s, 'The lionesses fanned out in the grass, with you on the left. Each knew her job without a sound.', { tone: 'calm' }); }),
    E('elephant', 1.2, 'hard', (s) => s.age > 1, (s) => { N(s, 'safety', -6); say(s, 'An elephant herd walked through the pride\'s resting place. Nobody argued with them.', { tone: 'calm' }); }),
    E('buffalo', 1, 'hard', (s) => s.age > 2.5, (s) => { N(s, 'health', -14); say(s, 'A buffalo bull turned on the pride mid-hunt. You were thrown, winded, and walked it off over several days.', { tone: 'hard' }); }),
    E('river', 1.2, 'hard', (s) => s.age > 0.5, (s) => { N(s, 'energy', -6); say(s, 'A swollen river crossing. The pride swam in a line, with the cubs on their mothers\' backs.', { tone: 'calm' }); }),
    E('lightning', 1, 'hard', (s) => true, (s) => { N(s, 'calm', -6); say(s, 'A dry-season thunderstorm with lightning, and the whole pride pressed together under one tree.', { tone: 'calm' }); }),
    E('snake', 0.8, 'hard', (s) => s.age > 0.4, (s) => { N(s, 'health', -6); say(s, 'A puff adder was hidden in the grass. You jumped a metre and the pride found it very funny.', { tone: 'calm' }); }),
    E('vulture', 1.5, 'joy', (s) => s.age > 1, (s) => { N(s, 'food', 14); say(s, 'Circling vultures led the pride to a fresh carcass, and nobody had to hunt that day.', { tone: 'joy' }); }),
    E('fire', 0.6, 'hard', (s) => s.env.drought > 0, (s) => { N(s, 'safety', -10); N(s, 'food', -8); say(s, 'A grass fire swept across the plain. The pride moved upwind and waited for the green to return.', { tone: 'hard' }); }),
    E('rivalroar', 1.5, 'hard', (s) => s.age > 2, (s) => { N(s, 'safety', -4); say(s, 'A rival male roared from the ridge all night, and the pride answered back until morning.', { tone: 'calm' }); }),
    E('ticks', 1, 'calm', (s) => s.age > 0.3, (s) => { N(s, 'health', -3); say(s, 'Ticks and flies during the wet season. Oxpeckers did their small part.', { tone: 'calm' }); }),
    E('porcupine', 0.8, 'hard', (s) => s.age > 0.8 && s.age < 5, (s) => { N(s, 'health', -8); say(s, 'A curious sniff at a porcupine left a nose full of quills and a lesson in respect.', { tone: 'hard' }); }),
    E('giraffe', 0.8, 'hard', (s) => s.age > 2.5, (s) => { N(s, 'health', -8); say(s, 'A giraffe\'s kick missed your head by a hand and cracked a log in half.', { tone: 'hard' }); }),
    E('ranger', 0.7, 'calm', (s) => s.env.threat < 0.5 && s.age > 1, (s) => say(s, 'Researchers fitted a collar to a pridemate. You were curious about the vehicle and ignored it by lunchtime.', { tone: 'calm' })),
    E('nightdash', 1.5, 'calm', (s) => s.age > 2, (s) => { N(s, 'food', 12); say(s, 'A night hunt under no moon. The pride works best when the herd cannot see them.', { tone: 'calm' }); }),
    E('lessonmiss', 1.2, 'calm', (s) => s.age > 1 && s.age < 3, (s) => { s.n.skill = cl(s.n.skill + 3); N(s, 'food', -4); say(s, 'You tried the stalk alone and missed by a stride. The herd watched you, bored.', { tone: 'calm' }); }),
  ], [
    D('stand', (s) => s.sex === 'female' && s.cubs > 0 && s.age > 4, 'A rival male near the cubs', (s) => 'A strange male approaches the cubs. He has not been seen here before.', [
      O('guard', 'Stand between him and the cubs', 'Brave, dangerous', { bold: 1, social: 0.6 }, (s, R) => { if (R.chance(0.55)) { N(s, 'status', 6); say(s, 'You and your sisters held a line. He left.', { tone: 'turn', turn: true }); } else { N(s, 'health', -20); s.mods.h *= 1.1; say(s, 'It cost you wounds, and the cubs lived.', { tone: 'hard', turn: true }); } }),
      O('lead', 'Lead the cubs away to the reeds', 'Safer for them', { caution: 1 }, (s) => { N(s, 'safety', -4); say(s, 'You led them quietly into the reeds and waited until he moved on.', { tone: 'calm' }); }),
      O('call', 'Roar for the pride', 'Together', { social: 1 }, (s) => { N(s, 'bond', 6); say(s, 'Your roar brought the pride at a run. He changed his mind.', { tone: 'joy' }); }),
    ]),
    D('cross', (s) => s.age >= 1.8 && s.age < 6, 'The river crossing', (s) => 'The only way to the new hunting ground is a flooded river. The water is brown and fast.', [
      O('swim', 'Swim it now', 'Fast, tiring', { bold: 1 }, (s, R) => { if (R.chance(0.85)) { N(s, 'food', 6); say(s, 'You swam hard, shook off and found the herds on the other side.', { tone: 'calm' }); } else { N(s, 'health', -14); say(s, 'The current dragged you far downstream before you crawled out.', { tone: 'hard' }); } }),
      O('wait', 'Wait for the water to drop', 'Hungry wait', { caution: 1 }, (s) => { N(s, 'food', -8); say(s, 'You waited two days, and went hungry for each.', { tone: 'calm' }); }),
      O('follow', 'Follow the pride\'s lead', 'Safe together', { social: 1 }, (s) => { N(s, 'bond', 4); say(s, 'You crossed in the middle of the pride, in line.', { tone: 'calm' }); }),
    ]),
  ]);
  M.lion.eventRate = () => 2.2;

  // ================= PENGUIN =================
  add('penguin', [
    E('march', 2, 'calm', (s) => s.age > 5 && s.sex === 'female', (s) => { N(s, 'food', -6); say(s, 'A long trek of about 100 km across the ice to the open water, in single file with hundreds of others.', { tone: 'calm' }); }),
    E('whiteout', 1.5, 'hard', (s) => s.age < 6, (s) => { N(s, 'warmth', -10); say(s, 'A whiteout: nothing but snow and the sound of the colony. Everyone moved together or not at all.', { tone: 'hard' }); }),
    E('orcapatrol', 0.8, 'hard', (s) => s.age > 1, (s) => { N(s, 'safety', -8); say(s, 'A pod of orcas patrolled the ice edge. The whole group stayed on the floe for hours.', { tone: 'hard' }); }),
    E('shoal', 2, 'joy', (s) => s.age > 0.6, (s) => { N(s, 'food', 16); say(s, 'A shoal of silverfish lit up under the ice, and you dived into a shimmering wall of fish.', { tone: 'joy' }); }),
    E('stranded', 0.8, 'hard', (s) => s.age > 1, (s) => { N(s, 'food', -8); say(s, 'A fast-moving iceberg cut the colony off from the sea for a week.', { tone: 'hard' }); }),
    E('skuaegg', 0.8, 'hard', (s) => s.age < 0.18, (s) => { N(s, 'safety', -6); say(s, 'A skua hovered near the colony all day, and the father held tight.', { tone: 'calm' }); }),
    E('callrecog', 1.5, 'joy', (s) => s.age >= 0.18 && s.age < 0.6, (s) => { N(s, 'bond', 6); say(s, 'In a crowd of ten thousand voices, you recognised your parent\'s call, and they recognised yours.', { tone: 'joy' }); }),
    E('crevasse', 0.6, 'hard', (s) => s.age > 0.6, (s) => { N(s, 'health', -6); say(s, 'A crack opened in the ice under a marching line. Everyone hopped across, one at a time.', { tone: 'calm' }); }),
    E('sealbask', 1, 'calm', (s) => s.age > 0.6, (s) => say(s, 'A Weddell seal was basking on the ice. It watched the penguins with a sleepy interest and no menace.', { tone: 'calm' })),
    E('moult', 1.5, 'calm', (s) => s.age > 1, (s) => { N(s, 'warmth', -6); N(s, 'food', -8); say(s, 'The annual moult: weeks ashore with feathers falling out, unable to swim or eat.', { tone: 'hard' }); }),
    E('polynya', 1.2, 'joy', (s) => s.age > 1, (s) => { N(s, 'food', 14); say(s, 'A polynya, a hole of open water in the ice, was alive with fish and krill and every bird for miles.', { tone: 'joy' }); }),
    E('suncome', 1.5, 'joy', (s) => s.age > 0.3, (s) => { N(s, 'warmth', 8); say(s, 'After months of dark, the sun returned: a thin line of light, then a rim of gold on the whole horizon.', { tone: 'joy' }); }),
    E('tourists', 0.5, 'calm', (s) => s.age > 1, (s) => say(s, 'An expedition ship anchored far off, and tiny orange figures stood on the ice, silent.', { tone: 'calm' })),
    E('dive', 1.5, 'calm', (s) => s.age > 0.8, (s) => { s.n.skill = cl(s.n.skill + 4); say(s, 'A dive to over 100 metres in the dark, and a long hold of breath. The surface felt a long way off on the way back.', { tone: 'calm' }); }),
  ], [
    D('handover', (s) => s.age >= 5 && s.sex === 'male' && s.mate && s.age < 20, 'The egg handover', (s) => `The egg has been laid. ${s.mate} is exhausted and needs to go to the sea. Careful: the egg cannot touch the ice for even a minute.`, [
      O('careful', 'Slide it onto your feet slowly', 'Slow and safe', { caution: 1 }, (s) => { N(s, 'bond', 6); say(s, 'The transfer was slow and perfect. The egg never touched the ice.', { tone: 'joy' }); }),
      O('quick', 'Do it fast', 'Risky', { bold: 1 }, (s, R) => { if (R.chance(0.8)) say(s, 'It was done in a heartbeat.', { tone: 'calm' }); else { s.mods.h *= 1.05; N(s, 'bond', -4); say(s, 'The egg grazed the ice. Everyone froze and held their breath.', { tone: 'hard' }); } }),
    ]),
    D('blizzardhold', (s) => s.age >= 5 && s.sex === 'male' && s.mate, 'The long fast', (s) => 'Two months of fasting while holding the egg. A blizzard hits at minus 50. The huddle is warm, and the edges are not.', [
      O('huddle', 'Join the huddle and rotate positions', 'Fair and warm', { social: 1, caution: 0.6 }, (s) => { N(s, 'warmth', 12); N(s, 'food', -6); say(s, 'You took turns on the windy outside, then the warm middle.', { tone: 'calm' }); }),
      O('alone', 'Hold your own spot at the edge', 'Proud', { bold: 1 }, (s) => { N(s, 'warmth', -14); N(s, 'health', -8); say(s, 'You held your place in the wind and lost a lot of weight.', { tone: 'hard' }); }),
    ]),
  ]);
  M.penguin.eventRate = () => 2;

  // ================= SEA TURTLE =================
  add('turtle', [
    E('raft', 2, 'joy', (s) => s.age > 0.3 && s.age < 5, (s) => { N(s, 'food', 12); N(s, 'safety', 6); say(s, 'A raft of floating sargassum weed turned into a floating home: shade, food and a hundred small neighbours.', { tone: 'joy' }); }),
    E('lights', 1, 'hard', (s) => s.age < 0.2 && s.env.light > 0.4, (s) => { N(s, 'health', -6); say(s, 'Lights from the coast tugged at you like a magnet. It took a determined paddle to turn toward the dark.', { tone: 'hard' }); }),
    E('shark', 1, 'hard', (s) => s.age > 3, (s, R) => { if (R.chance(0.7)) say(s, 'A tiger shark circled in the shallows. You went to the surface and out of reach.', { tone: 'hard' }); else { N(s, 'health', -16); say(s, 'A shark bit you and left a scar on your shell that you carry for life.', { tone: 'hard' }); } }),
    E('seasnake', 0.8, 'calm', (s) => s.age > 2, (s) => say(s, 'A sea snake swam past, banded black and yellow, ignored you and went on.', { tone: 'calm' })),
    E('oil', 0.6, 'hard', (s) => s.age > 1, (s) => { N(s, 'health', -10); say(s, 'An oil slick drifted through the current. You held your breath and swam under it, and it lingered in your eyes.', { tone: 'hard' }); }),
    E('hawksbill', 1, 'joy', (s) => s.age > 8, (s) => say(s, 'A hawksbill turtle shared a reef with you, picking at sponges beside your grazing.', { tone: 'joy' })),
    E('ted', 0.6, 'joy', (s) => s.age > 3, (s) => { N(s, 'safety', 6); say(s, 'A fishing trawl with an escape hatch for turtles. You popped out of the net unharmed, someone\'s good idea saving you.', { tone: 'joy', turn: true }); }),
    E('dieback', 0.6, 'hard', (s) => s.age > 5, (s) => { N(s, 'food', -14); say(s, 'A seagrass die-back after a heat wave forced you to a new meadow far away.', { tone: 'hard' }); }),
    E('whaleshark', 0.8, 'joy', (s) => s.age > 3, (s) => say(s, 'A whale shark glided past, bigger than any boat and entirely uninterested in you.', { tone: 'joy' })),
    E('tagging', 0.8, 'calm', (s) => s.age > 8, (s) => say(s, 'Researchers netted you gently, measured your shell, glued a tracker on and let you go. You were not impressed.', { tone: 'calm' })),
    E('erosion', 0.8, 'hard', (s) => s.sex === 'female' && s.age > 30, (s) => { N(s, 'safety', -6); say(s, 'Your nesting beach had lost metres of sand to the sea and to sea walls. You found a higher spot.', { tone: 'hard' }); }),
    E('moonlight', 1.5, 'calm', (s) => s.age > 0.3, (s) => say(s, 'A full moon turned the surface to silver, and you drifted up to look at it.', { tone: 'calm' })),
    E('cleanerfish', 1, 'joy', (s) => s.age > 8, (s) => { N(s, 'health', 5); say(s, 'A reef cleaning station: surgeonfish nibbled the algae off your shell while you hung motionless.', { tone: 'joy' }); }),
  ], [
    D('beachlight', (s) => s.sex === 'female' && s.age > 30, 'The nesting beach', (s) => 'You haul out at night. The beach has a floodlit hotel at one end and a dark stretch at the other.', [
      O('dark', 'Climb the dark stretch', 'Safer for your clutch', { caution: 1 }, (s) => { N(s, 'safety', 8); s.eggs += 12; say(s, 'You laid in the dark, covered the nest, and dragged yourself back to the sea.', { tone: 'joy' }); }),
      O('lit', 'Take the closer lit stretch', 'Less crawling, hatchlings may wander', { bold: 0.4 }, (s) => { N(s, 'safety', -4); say(s, 'You laid under the glow of the hotel. Some of the hatchlings might lose their way.', { tone: 'hard' }); }),
      O('later', 'Return another night', 'Costs effort', { caution: 0.8 }, (s) => { N(s, 'food', -6); say(s, 'You went back to sea and tried the next night, tired.', { tone: 'calm' }); }),
    ]),
    D('netahead', (s) => s.age >= 5 && s.age < 60, 'A net ahead', (s) => 'Something hangs in the water ahead: a wall of netting set across the channel.', [
      O('under', 'Dive deep underneath', 'Skilled, tiring', { caution: 0.6 }, (s, R) => { if (R.chance(0.8)) say(s, 'You dived under it with a long hold of breath.', { tone: 'calm' }); else { N(s, 'health', -14); say(s, 'You scraped the net and came up tangled, then fought free.', { tone: 'hard' }); } }),
      O('around', 'Swim around it', 'Long way', { caution: 1 }, (s) => { N(s, 'food', -4); say(s, 'You detoured for hours and avoided the net entirely.', { tone: 'calm' }); }),
      O('through', 'Push through a gap', 'Bold', { bold: 1 }, (s, R) => { if (R.chance(0.6)) say(s, 'You found a hole and slipped through.', { tone: 'calm' }); else { N(s, 'health', -20); s.mods.h *= 1.1; say(s, 'You tangled. It took a long, terrifying struggle.', { tone: 'hard', turn: true }); } }),
    ]),
  ]);
  M.turtle.eventRate = () => 1.8;

  // ================= BLUE WHALE =================
  add('whale', [
    E('song', 2, 'calm', (s) => s.age > 3, (s) => { N(s, 'voice', 4); say(s, 'A 20-hertz call rolled out across the ocean, and a reply came back from far over the horizon.', { tone: 'calm' }); }),
    E('calfplay', 2, 'joy', (s) => s.age < 0.6 || (s.sex === 'female' && s.calves > 0 && s.age - s.nextCalf < 0), (s) => { N(s, 'bond', 4); say(s, 'A calf rolled and spun at the surface, in play, with a mother watching close.', { tone: 'joy' }); }),
    E('humpback', 1.5, 'joy', (s) => s.age > 1, (s) => say(s, 'A humpback whale breached beside you, and the two of you shared a feeding patch in uneasy peace.', { tone: 'joy' })),
    E('iceberg', 1, 'calm', (s) => s.born.place.indexOf('Antarctic') >= 0, (s) => say(s, 'A tabular iceberg the size of a city drifted by, with penguins on top and the sea around it full of krill.', { tone: 'calm' })),
    E('upwell', 2, 'joy', (s) => s.age > 1, (s) => { N(s, 'food', 18); say(s, 'A cold upwelling turned the sea green, thick with krill. You fed for days at a time.', { tone: 'joy' }); }),
    E('fishline', 0.8, 'hard', (s) => s.age > 1 && s.env.threat > 0.3, (s) => { N(s, 'health', -8); say(s, 'A trailing line from a fishing gear caught your flipper. Rescuers cut it free, or you worked it loose over days.', { tone: 'hard' }); }),
    E('tag', 0.8, 'calm', (s) => s.age > 3, (s) => say(s, 'A dart tag from a small boat. A sting, and a satellite now followed your journey for the scientists.', { tone: 'calm' })),
    E('watchers', 1, 'calm', (s) => s.env.threat > 0.5, (s) => say(s, 'A whale-watching boat stopped at a respectful distance, full of gasping people with cameras.', { tone: 'calm' })),
    E('shipnear', 1.2, 'hard', (s) => s.env.threat > 0.4, (s) => { N(s, 'calm', -6); say(s, 'A container ship passed close enough that the hull was a wall of steel in the water. You dived.', { tone: 'hard' }); }),
    E('seismic', 0.6, 'hard', (s) => s.age > 1, (s) => { N(s, 'voice', -6); say(s, 'Seismic air guns thudded for days from far away. You left the area and sang louder.', { tone: 'hard' }); }),
    E('sealions', 1, 'joy', (s) => s.age > 1, (s) => say(s, 'A rowdy group of sea lions followed you through a bay, ducking and weaving through your wake.', { tone: 'joy' })),
    E('breach', 1.2, 'joy', (s) => s.age > 0.5, (s) => say(s, 'You lifted a quarter of your body out of the water and fell back in a plume of white.', { tone: 'joy' })),
    E('swell', 1, 'calm', (s) => true, (s) => say(s, 'A big storm swell rolled over the surface. Four hundred metres down it was perfectly calm.', { tone: 'calm' })),
  ], [
    D('calfship', (s) => s.sex === 'female' && s.calves > 0 && s.env.threat > 0.4 && s.age > 11, 'Calf and ship', (s) => 'A ship is on course for the calving ground, with your calf at the surface.', [
      O('shield', 'Put yourself between the calf and the ship', 'Brave, risky', { bold: 1, social: 0.5 }, (s, R) => { if (R.chance(0.8)) { N(s, 'bond', 8); say(s, 'The ship slid past at a respectful distance.', { tone: 'turn', turn: true }); } else { N(s, 'health', -30); s.mods.h *= 1.3; say(s, 'It hit a glancing blow. You both survived, and you bear the scar.', { tone: 'hard', turn: true }); } }),
      O('dive', 'Lead the calf down and away', 'Safe', { caution: 1 }, (s) => { N(s, 'food', -4); say(s, 'You led the calf deep, away from the shipping route.', { tone: 'calm' }); }),
    ]),
    D('songchoice', (s) => s.age >= 12, 'The year\'s song', (s) => 'The song shifts with every season, and now you have to choose how to join it.', [
      O('lead', 'Lead with a new phrase', 'Bold', { bold: 1, curious: 0.6 }, (s) => { N(s, 'voice', 10); say(s, 'Your new phrase was picked up by whales hundreds of kilometres away.', { tone: 'joy', turn: true }); }),
      O('follow', 'Follow the common song', 'Familiar', { social: 1 }, (s) => { N(s, 'voice', 4); say(s, 'You sang the familiar song and felt part of something huge.', { tone: 'calm' }); }),
      O('silent', 'Stay quiet this year', 'Conserve energy', { caution: 1 }, (s) => { N(s, 'food', 4); say(s, 'You listened, fed and saved your voice.', { tone: 'calm' }); }),
    ]),
  ]);
  M.whale.eventRate = () => 1.6;

  // ================= MONARCH =================
  add('monarch', [
    E('dew', 2, 'joy', (s) => s.age > 28 / 365, (s) => { N(s, 'food', 6); say(s, 'Morning dew on a leaf: a sip of water and a jewel on every blade of grass.', { tone: 'joy' }); }),
    E('web', 1, 'hard', (s) => s.age > 28 / 365, (s, R) => { if (R.chance(0.5)) { N(s, 'health', -10); say(s, 'A spider web in the dusk light. You struggled free of the sticky strands with some torn scales.', { tone: 'hard' }); } else say(s, 'You flew a hand\'s width past a spider web, just in time.', { tone: 'calm' }); }),
    E('court', 2, 'joy', (s) => s.age > 33 / 365 && !s.mig, (s) => { say(s, s.sex === 'male' ? 'You chased a female through a meadow in a long, looping flight.' : 'A male pursued you through the meadow, and you chose, finally, to be caught.', { tone: 'joy' }); }),
    E('tagged', 0.8, 'joy', (s) => s.age > 28 / 365 && s.mig, (s) => { say(s, 'A group of children netted you gently and stuck a tiny numbered sticker on your wing, then let you go.', { tone: 'joy' }); }),
    E('mowing', 0.8, 'hard', (s) => s.age < 18 / 365, (s) => { s.env.milk = cl(s.env.milk - 0.1, 0.2, 1); say(s, 'Mowers near the field edge: the milkweed patch nearby was gone by lunchtime.', { tone: 'hard' }); }),
    E('wasp', 1.2, 'hard', (s) => s.age < 18 / 365, (s) => { N(s, 'health', -6); say(s, 'A paper wasp patrolled the leaf. You went still, and the wasp took the caterpillar next to you.', { tone: 'hard' }); }),
    E('frost', 0.8, 'hard', (s) => s.mig && s.age > 28 / 365 && s.age < 80 / 365, (s) => { N(s, 'health', -8); say(s, 'A frost warning: you clustered in the lee of a barn wall, still and stiff until the sun hit it.', { tone: 'hard' }); }),
    E('oe', 0.6, 'hard', (s) => s.age < 28 / 365, (s) => { N(s, 'health', -6); say(s, 'A parasite spore picked up on the leaf: the first of a series of small blows to growth and wings.', { tone: 'hard' }); }),
    E('puddle', 1.5, 'joy', (s) => s.age > 28 / 365, (s) => { N(s, 'food', 8); say(s, 'A muddy puddle, with a crowd of butterflies sipping minerals together in a cloud of wings.', { tone: 'joy' }); }),
    E('landmark', 1.5, 'calm', (s) => s.mig && s.south && s.age < 120 / 365, (s) => say(s, 'A river you had never seen, a line of hills, a long glimmer of lake: all of them somehow on your path.', { tone: 'calm' })),
    E('watchers', 1, 'joy', (s) => s.age > 28 / 365, (s) => say(s, 'A child pointed and shouted, "monarch!", and a whole picnic stopped to watch you cross.', { tone: 'joy' })),
    E('windlift', 1.5, 'joy', (s) => s.age > 28 / 365, (s) => { N(s, 'fat', 2); say(s, 'A thermal column lifted you to treetop height and let you glide across a whole valley without a single wingbeat.', { tone: 'joy' }); }),
    E('milkfind', 2, 'joy', (s) => s.age < 18 / 365, (s) => { s.n.growth = cl(s.n.growth + 5); N(s, 'food', 10); say(s, 'A fresh, tender milkweed leaf, high in nutrients and low in latex. A good meal.', { tone: 'joy' }); }),
  ], [
    D('mate', (s) => !s.mig && s.age >= 31 / 365 && s.age < 50 / 365, 'A mate', (s) => (s.sex === 'male' ? 'A female is feeding in the meadow.' : 'A male is circling you at the edge of the meadow.'), [
      O('pair', (s) => (s.sex === 'male' ? 'Pursue her' : 'Let him catch you'), 'Reproduce', { bold: 0.6, social: 0.6 }, (s, R) => { N(s, 'food', -4); if (s.sex === 'female') { s.eggs += R.int(10, 40); say(s, 'You mated, and carried the eggs that were the point of your whole short life.', { tone: 'joy', turn: true }); } else say(s, 'You mated, and your genes moved into the next generation.', { tone: 'joy', turn: true }); }),
      O('feed', 'Feed first, courtship later', 'Saves energy', { caution: 1 }, (s) => { N(s, 'food', 10); say(s, 'You fed for the afternoon and let the moment pass.', { tone: 'calm' }); }),
    ]),
    D('frostnight', (s) => s.mig && s.age >= 45 / 365 && s.age < 100 / 365, 'A frosty night on the road south', (s) => 'It is dropping below freezing. You are on an open hillside.', [
      O('fly', 'Fly on at dusk toward warmer air', 'Risky in the dark', { bold: 1 }, (s, R) => { if (R.chance(0.45)) { N(s, 'fat', -4); say(s, 'You found a warm layer and rode it on.', { tone: 'calm' }); } else { N(s, 'health', -16); say(s, 'The dark was colder than it looked.', { tone: 'hard' }); } }),
      O('roost', 'Find a sheltered tree and cluster', 'Safe', { caution: 1, social: 0.6 }, (s) => { N(s, 'safety', 6); say(s, 'You tucked into a cluster in the lee of a tree and shivered until sunrise.', { tone: 'calm' }); }),
    ]),
  ]);
  M.monarch.eventRate = () => 20;

  // ===== short and fragile lives: many small scenes in the first days and weeks =====
  add('turtle', [
    E('eggwarm', 3, 'calm', (s) => s.age < 0.15, (s) => say(s, 'Warm sand pressed on all sides, and about a hundred siblings turning slowly in the dark.', { tone: 'calm' })),
    E('eggrain', 2, 'hard', (s) => s.age < 0.15, (s) => { N(s, 'health', -4); say(s, 'Rain soaked the beach above the nest. The sand stayed cool and damp, and the clutch waited.', { tone: 'hard' }); }),
    E('eggroots', 1.5, 'hard', (s) => s.age < 0.15, (s) => { N(s, 'health', -4); say(s, 'A tangle of beach-plant roots grew through the next chamber. Some of the nest was not so lucky.', { tone: 'hard' }); }),
    E('eggmoon', 2, 'calm', (s) => s.age < 0.15, (s) => say(s, 'A spring tide washed higher up the beach than usual, and the nest held.', { tone: 'calm' })),
    E('eggsound', 2, 'joy', (s) => s.age >= 0.1 && s.age < 0.15, (s) => say(s, 'Faint scratching and tapping: your nestmates were starting to break out, and the nest got louder.', { tone: 'joy' })),
    E('crabs', 3, 'hard', (s) => s.age >= 0.15 && s.age < 0.17, (s) => { N(s, 'safety', -6); say(s, 'Ghost crabs waited at the nest mouth and in the sand, the first danger of the night.', { tone: 'hard' }); }),
    E('wave', 3, 'joy', (s) => s.age >= 0.15 && s.age < 0.19, (s) => { N(s, 'safety', 8); say(s, 'The first wave picked you up off the sand and rolled you out into the water. You swam as hard as you could.', { tone: 'joy', turn: true }); }),
    E('offshore', 3, 'calm', (s) => s.age >= 0.17 && s.age < 0.6, (s) => say(s, 'Each day further from shore, with the water getting darker and deeper and the beach long gone.', { tone: 'calm' })),
    E('plankton', 3, 'joy', (s) => s.age >= 0.17 && s.age < 5, (s) => { N(s, 'food', 12); say(s, 'A drifting patch of jellyfish and plankton: a meal that took a whole afternoon.', { tone: 'joy' }); }),
    E('seabird', 2, 'hard', (s) => s.age >= 0.17 && s.age < 2, (s) => { N(s, 'safety', -6); say(s, 'A shadow passed over the surface, a seabird, and you dived and hid in the weed.', { tone: 'hard' }); }),
    E('current', 2, 'calm', (s) => s.age >= 0.5 && s.age < 5, (s) => say(s, 'You rode a warm current for weeks. The sea was blue and empty, and you were small.', { tone: 'calm' })),
  ]);
  M.turtle.eventRate = (s) => (s.age < 0.3 ? 25 : s.age < 3 ? 5 : 1.8);
  add('monarch', [
    E('eggsun', 3, 'calm', (s) => s.age < 4 / 365, (s) => say(s, 'The leaf swayed in the morning sun, and the egg on the underside stayed cool in the shade.', { tone: 'calm' })),
    E('eggant', 2, 'hard', (s) => s.age < 4 / 365, (s) => say(s, 'An ant patrolled the stem, stopped at the leaf and moved on. The egg was left alone.', { tone: 'hard' })),
    E('catfirst', 3, 'joy', (s) => s.age >= 4 / 365 && s.age < 8 / 365, (s) => { s.n.growth = cl(s.n.growth + 4); say(s, 'Tiny and striped, you ate in neat circles at the edge of the leaf, and grew visibly in a day.', { tone: 'joy' }); }),
    E('latex', 2, 'hard', (s) => s.age >= 4 / 365 && s.age < 18 / 365, (s) => { N(s, 'health', -3); say(s, 'The milkweed sap flowed in a sticky jet from a bitten vein. You clipped the vein first, and it only splashed the leaf.', { tone: 'calm' }); }),
    E('molt', 2, 'calm', (s) => s.age >= 7 / 365 && s.age < 18 / 365, (s) => say(s, 'You stopped eating for a day, split your old skin and left it behind on the leaf, bigger, brighter and hungry.', { tone: 'calm' })),
    E('rainsmall', 2, 'hard', (s) => s.age < 18 / 365, (s) => { N(s, 'food', -4); say(s, 'A heavy raindrop hit the leaf like a drum. You held on with every claw.', { tone: 'hard' }); }),
    E('chrysdark', 3, 'calm', (s) => s.age >= 18 / 365 && s.age < 28 / 365, (s) => say(s, 'The chrysalis darkened, and the wings of the future butterfly showed through the case, orange and black.', { tone: 'calm' })),
    E('chrysshake', 2, 'hard', (s) => s.age >= 18 / 365 && s.age < 28 / 365, (s) => say(s, 'A gust shook the branch. The chrysalis swung on its silk thread and stayed in place.', { tone: 'hard' })),
    E('firstflight', 3, 'joy', (s) => s.age >= 28 / 365 && s.age < 33 / 365, (s) => { N(s, 'food', 4); say(s, 'Your first flight was a wobbly circle, then a longer one. The meadow suddenly had a third dimension.', { tone: 'joy' }); }),
  ]);
  M.monarch.eventRate = (s) => (s.age < 28 / 365 ? 90 : 25);
  add('penguin', [
    E('eggwarm', 3, 'calm', (s) => s.age < 0.18, (s) => say(s, 'The egg rested on a father\'s feet, never touching the ice, wrapped in a warm fold of skin.', { tone: 'calm' })),
    E('eggwind', 2, 'hard', (s) => s.age < 0.18, (s) => { N(s, 'warmth', -6); say(s, 'A hard wind whipped across the colony. The fathers pressed closer, shoulder to shoulder, eggs between their feet.', { tone: 'hard' }); }),
    E('pip', 3, 'joy', (s) => s.age >= 0.15 && s.age < 0.2, (s) => say(s, 'A first tiny crack in the shell, and a faint peep answered by a parent\'s low call.', { tone: 'joy' })),
    E('feed', 3, 'joy', (s) => s.age >= 0.2 && s.age < 0.6, (s) => { N(s, 'food', 14); say(s, 'A parent returned from the sea with a belly full of fish and squid, and you begged, peeping, until it was your turn.', { tone: 'joy' }); }),
    E('creche', 2, 'calm', (s) => s.age >= 0.35 && s.age < 0.6, (s) => say(s, 'Dozens of chicks were rounded up into a creche, and you stood in the middle, warm and wide-eyed.', { tone: 'calm' })),
  ]);
  M.penguin.eventRate = (s) => (s.age < 0.6 ? 8 : s.age < 1.6 ? 3 : 2);

  // ================= HUMAN =================
  const H = M.human, hasKids = (s) => s.rec.kids.length > 0;
  H.eventRate = (s) => (s.age < 3 ? 0.3 : 1.0);
  H.events.push(
    E('play', 2.5, 'joy', (s) => s.enrolled && s.age < 12, (s) => { N(s, 'joy', 6); say(s, 'A school play: ' + s.name + ' was a tree, then a tree that fell over, and the audience cheered both.', { tone: 'joy' }); }),
    E('fair', 1.5, 'joy', (s) => s.enrolled && s.age >= 10 && s.age < 18, (s) => { N(s, 'skills', 5); s.grades = cl(s.grades + 0.03, 0, 1); say(s, 'A science or craft fair: weeks of work, one nervous presentation and a ribbon for effort.', { tone: 'joy' }); }),
    E('trip', 1.5, 'joy', (s) => s.enrolled && s.age >= 8 && s.age < 18, (s) => { N(s, 'friends', 5); N(s, 'joy', 5); say(s, 'A class trip to somewhere the family had never been: a museum, a river, a city.', { tone: 'joy' }); }),
    E('result', 2, 'calm', (s) => s.enrolled && s.age >= 8, (s, R) => { const good = R.chance(0.3 + s.grades * 0.5); N(s, 'joy', good ? 6 : -4); say(s, good ? 'A good result on a hard test, and a parent who put the paper on the wall.' : 'A poor mark on a test. Not the end, but it stung.', { tone: good ? 'joy' : 'hard' }); }),
    E('phone', 1.5, 'calm', (s) => s.age >= 10 && s.age < 20, (s) => { N(s, 'friends', 4); N(s, 'joy', 3); say(s, 'A first phone, a battered hand-me-down. The whole world was suddenly in a pocket, for better and worse.', { tone: 'calm' }); }),
    E('familytrip', 1.5, 'joy', (s) => s.age >= 4 && s.age < 60 && s.n.money > 30, (s) => { N(s, 'joy', 8); N(s, 'family', 6); N(s, 'money', -5); say(s, 'A family trip, to the coast or the mountains or an uncle\'s village. The photos are still on the wall.', { tone: 'joy' }); }),
    E('newhome', 1, 'calm', (s) => s.age >= 5 && s.age < 70, (s) => { N(s, 'stress', 6); N(s, 'friends', -4); say(s, `The household moved to a new neighbourhood in ${s.born.country.name}: new streets, new faces, a different smell of cooking.`, { tone: 'calm' }); }),
    E('argue', 1.5, 'hard', (s) => s.age >= 4 && s.age < 18, (s) => { N(s, 'family', -4); N(s, 'stress', 6); say(s, 'Raised voices through the wall: money, work, something nobody explained. By morning it was over, and nobody mentioned it.', { tone: 'hard' }); }),
    E('grandstory', 2, 'joy', (s) => s.age >= 5 && s.age < 40, (s) => { N(s, 'family', 5); say(s, 'A grandparent told the old story of how the family came to ' + (s.born.urban ? 'the city' : 'the village') + ', and what they had carried.', { tone: 'joy' }); }),
    E('firstjob', 1.5, 'joy', (s) => s.age >= 15 && s.age < 20, (s) => { N(s, 'money', 6); N(s, 'skills', 4); say(s, 'A first paid job: a few hours a week, an apron or a hi-vis vest, and the pride of the first coins that were yours alone.', { tone: 'joy' }); }),
    E('driving', 1.5, 'joy', (s) => s.age >= 17 && s.age < 30 && s.born.pct > 25, (s) => { N(s, 'joy', 6); N(s, 'skills', 4); say(s, 'Driving lessons, a near-miss with a bollard and finally the licence. For the first time you could go anywhere.', { tone: 'joy' }); }),
    E('partyfx', 2, 'joy', (s) => s.age >= 16 && s.age < 35, (s, R) => { N(s, 'friends', 6); N(s, 'joy', 6); say(s, R.pick(['A party that went until dawn, ending on a rooftop with tea.', 'A friend\'s birthday and a dance floor in a living room.', 'A night around a bonfire with guitar music and bad jokes.']), { tone: 'joy' }); }),
    E('sportmatch', 1.5, 'joy', (s) => s.talent === 'sport' && s.age >= 10 && s.age < 40, (s, R) => { const w = R.chance(0.5); N(s, 'joy', w ? 8 : -2); N(s, 'health', 3); say(s, w ? 'A final won in the last minute, with the whole street on the touchline.' : 'A tight loss, a long walk home, a promise to train harder.', { tone: w ? 'joy' : 'calm' }); }),
    E('colleague', 1.5, 'hard', (s) => s.career && s.age >= 22 && s.age < 62, (s, R) => { N(s, 'stress', 8); say(s, R.pick(['A colleague took credit for your work, and you had to decide how much it mattered.', 'A difficult boss made a week of mornings hard.', 'A restructure at work, and three new people to impress.']), { tone: 'hard' }); }),
    E('houseDeal', 1, 'calm', (s) => s.age >= 28 && s.age < 60 && s.n.money > 45, (s, R) => { const ok = R.chance(0.6); N(s, 'money', ok ? 6 : -8); N(s, 'stress', 8); say(s, ok ? 'You found a place to buy or rent at a price that made sense, a small piece of the world that was yours.' : 'A deal on a home fell through at the last minute, and you started again.', { tone: ok ? 'joy' : 'hard' }); if (ok) s.rec.notes.push('Found a home of their own.'); }),
    E('abroadtrip', 1, 'joy', (s) => s.age >= 20 && s.age < 70 && s.n.money > 40, (s) => { N(s, 'joy', 10); N(s, 'money', -6); say(s, 'A trip abroad: unfamiliar food, unfamiliar writing, and the sense that your own country was one choice among many.', { tone: 'joy' }); }),
    E('volunteer', 1.2, 'joy', (s) => s.age >= 25 && s.age < 75, (s) => { N(s, 'joy', 6); N(s, 'friends', 6); say(s, 'You volunteered in the neighbourhood: a clean-up day, a school project, a food collection. It mattered more than you had expected.', { tone: 'joy' }); }),
    E('partnersick', 1, 'hard', (s) => s.partner && s.age >= 35, (s) => { N(s, 'stress', 10); N(s, 'family', 4); say(s, `${s.partner} was in hospital for a week. You learned how quiet a house can be.`, { tone: 'hard' }); }),
    E('kidschool', 2, 'joy', (s) => hasKids(s) && s.age < 70, (s) => { N(s, 'joy', 6); N(s, 'family', 5); say(s, `A school event for ${s.rec.kids[0].name}: a concert, a sports day or a graduation, and a lump in the throat.`, { tone: 'joy' }); }),
    E('kidleaves', 1.2, 'calm', (s) => hasKids(s) && s.age >= s.rec.kids[0].born + 18 && s.age < s.rec.kids[0].born + 24, (s) => { N(s, 'joy', -4); N(s, 'family', 4); say(s, `${s.rec.kids[0].name} moved out. The house was quieter and cleaner, and neither was welcome.`, { tone: 'calm', turn: true }); }),
    E('friendmoves', 1.2, 'calm', (s) => s.age >= 25 && s.age < 70, (s) => { N(s, 'friends', -6); say(s, 'A close friend moved to another city. The messages continued, and the evenings changed.', { tone: 'calm' }); }),
    E('election', 1.2, 'calm', (s) => s.age >= 18, (s, R) => { N(s, 'stress', 4); say(s, `An election in ${s.born.country.name}: strong feelings at every table, and a queue on voting day.`, { tone: 'calm' }); }),
    E('tech', 1.2, 'calm', (s) => s.age >= 15 && s.age < 75, (s) => { N(s, 'skills', 4); say(s, 'A new piece of technology arrived, and in a year it was impossible to remember doing without it.', { tone: 'calm' }); }),
    E('downturn', 1, 'hard', (s) => s.age >= 20 && s.age < 65, (s) => { N(s, 'money', -10); N(s, 'stress', 8); say(s, `An economic downturn in ${s.born.country.name}: shops closed, jobs became scarce, and everybody tightened their belts.`, { tone: 'hard' }); }),
    E('inherit', 0.7, 'joy', (s) => s.age >= 35 && s.age < 75, (s) => { N(s, 'money', 14); N(s, 'joy', -2); say(s, 'A relative died and left a small inheritance: some money, a few boxes of photographs, and a sadness bigger than the sum.', { tone: 'calm', turn: true }); }),
    E('neighbourfx', 1.2, 'hard', (s) => s.age >= 25 && s.age < 75, (s) => { N(s, 'stress', 6); say(s, 'A dispute with a neighbour over a fence, a tree or the noise. It was settled over a cup of tea, eventually.', { tone: 'hard' }); }),
    E('adoptpet', 1.5, 'joy', (s) => s.age >= 8 && s.age < 75, (s, R) => { N(s, 'joy', 8); say(s, `You took in a ${R.pick(['stray dog', 'kitten', 'rescue cat', 'puppy from a neighbour'])}. It took over the house within a week.`, { tone: 'joy' }); }),
    E('marathon', 0.8, 'joy', (s) => s.age >= 20 && s.age < 55 && s.n.health > 60, (s) => { N(s, 'health', 4); N(s, 'joy', 8); say(s, 'You trained for a long race, and finished it, mostly upright.', { tone: 'joy' }); }),
    E('instrument', 0.8, 'joy', (s) => s.age >= 25 && s.age < 75, (s) => { N(s, 'joy', 6); N(s, 'skills', 4); say(s, 'You finally picked up the instrument you had always wanted to play. The first month was dreadful and the second was better.', { tone: 'joy' }); }),
    E('oldteacher', 2, 'joy', (s) => LE.hasFlag(s, 'mentor') && s.age >= 30 && s.age < 70, (s) => { N(s, 'joy', 8); say(s, 'A message from the teacher who once believed in you. They were retired now and wanted to know how things turned out.', { tone: 'joy', because: 'mentor' }); }),
    E('crewmeet', 2, 'joy', (s) => LE.hasFlag(s, 'crew') && s.age >= 30 && s.age < 70, (s) => { N(s, 'friends', 6); N(s, 'joy', 8); say(s, 'The old crew from fourteen got together for a weekend. Half the jokes were the same as thirty years ago.', { tone: 'joy', because: 'crew' }); }),
    E('hospital', 1, 'hard', (s) => s.age >= 40 && s.age < 85, (s) => { N(s, 'health', -10); N(s, 'money', -6); N(s, 'stress', 10); say(s, 'A hospital stay of several days. The nurses were tireless and the bill was a different kind of illness.', { tone: 'hard' }); }, (s) => 1 + Math.max(0, 50 - s.n.health) / 40),
    E('hobby', 1.5, 'joy', (s) => s.retired, (s) => { N(s, 'joy', 8); say(s, 'In retirement, you took up a hobby: gardening, chess, fishing, bird-watching, or a grandchild\'s favourite game.', { tone: 'joy' }); }),
    E('smaller', 1, 'calm', (s) => s.age >= 70, (s) => { N(s, 'stress', 4); say(s, 'You moved to a smaller place, and gave away half your things with surprising ease.', { tone: 'calm' }); }),
    E('reunion', 1.5, 'joy', (s) => s.age >= 40 && s.age < 80, (s) => { N(s, 'friends', 6); N(s, 'joy', 8); say(s, 'A school reunion: everyone older, everyone the same.', { tone: 'joy' }); }),
  );
  H.decisions.push(
    D('dlend', (s) => s.age >= 22 && s.age < 50, 'A friend asks for money', (s) => 'A close friend is in trouble and asks to borrow a significant amount.', [
      O('give', 'Lend it, no questions', 'Generous, risky', { social: 1 }, (s, R) => { N(s, 'money', -8); if (R.chance(0.55)) { N(s, 'friends', 8); say(s, 'It was repaid a year later with a handwritten note.', { tone: 'joy' }); } else { N(s, 'friends', -6); say(s, 'It was never repaid, and the friendship was never quite the same.', { tone: 'hard' }); } }),
      O('some', 'Lend part of it', 'A compromise', { caution: 0.6 }, (s) => { N(s, 'money', -4); N(s, 'friends', 3); say(s, 'You lent what you could afford to lose.', { tone: 'calm' }); }),
      O('no', 'Politely say no', 'Safe, awkward', { caution: 1 }, (s) => { N(s, 'friends', -4); say(s, 'You said no, kindly. The conversation was awkward for a while.', { tone: 'calm' }); }),
    ]),
    D('dethic', (s) => s.career && s.age >= 28 && s.age < 58, 'Something wrong at work', (s) => `At work as a ${s.career}, ${s.name} notices something that is not right: a shortcut that could hurt someone, or an invoice that does not add up.`, [
      O('report', 'Report it', 'Principled, risky', { bold: 0.6 }, (s, R) => { if (R.chance(0.5)) { N(s, 'stress', 8); N(s, 'joy', 6); say(s, 'You reported it. It was handled, and a few colleagues gave you quiet respect.', { tone: 'turn', turn: true }); } else { N(s, 'stress', 12); N(s, 'money', -6); say(s, 'You reported it and became the person people avoided in the corridor.', { tone: 'hard', turn: true }); } }),
      O('ignore', 'Say nothing', 'Quiet life', { caution: 1 }, (s) => { N(s, 'stress', 4); N(s, 'joy', -4); say(s, 'You kept your head down. It nagged at you for years.', { tone: 'hard' }); }),
      O('quiet', 'Raise it quietly with the person involved', 'Diplomatic', { social: 1 }, (s) => { N(s, 'stress', 2); say(s, 'You took them aside. It was settled without a fuss, mostly.', { tone: 'calm' }); }),
    ]),
    D('dteen', (s) => hasKids(s) && s.age >= s.rec.kids[0].born + 14 && s.age < s.rec.kids[0].born + 19, 'A difficult teenager', (s) => `${s.rec.kids[0].name} is fifteen and has stopped talking to ${s.name}, except to argue.`, [
      O('listen', 'Listen without lecturing', 'Slow work', { social: 1 }, (s) => { N(s, 'family', 8); N(s, 'stress', 4); say(s, 'You sat on the edge of the bed and listened. It took a year, but they started talking again.', { tone: 'joy' }); }),
      O('rules', 'Set stricter rules', 'Control, conflict', { caution: 0.8 }, (s) => { N(s, 'family', -6); N(s, 'stress', 6); say(s, 'The rules held, and the distance grew.', { tone: 'hard' }); }),
      O('space', 'Give them space', 'Hope, worry', { curious: 0.5 }, (s) => { N(s, 'stress', 4); N(s, 'family', 2); say(s, 'You stepped back and prayed it was the right call.', { tone: 'calm' }); }),
    ]),
    D('dneigh', (s) => s.age >= 40 && s.age < 70, 'A community problem', (s) => `Something in ${s.name}'s neighbourhood needs fixing: a broken well, a dangerous junction, a failing school roof.`, [
      O('organise', 'Organise your neighbours', 'Time and effort', { social: 1, bold: 0.5 }, (s, R) => { N(s, 'stress', 8); N(s, 'friends', 10); if (R.chance(0.65)) { N(s, 'joy', 10); flag(s, 'organiser', 'You organised your neighbours to fix something that mattered, and people still talk about it.'); } else say(s, 'It dragged on, and the authorities did not move, but the neighbours remembered you tried.', { tone: 'calm' }); }),
      O('donate', 'Give a little and move on', 'Easy', { caution: 0.6 }, (s) => { N(s, 'money', -3); say(s, 'You helped a little, and someone else did the rest.', { tone: 'calm' }); }),
      O('skip', 'Leave it to others', 'No effort', { caution: 1 }, (s) => { N(s, 'joy', -2); say(s, 'It was somebody else\'s problem, or so you told yourself.', { tone: 'calm' }); }),
    ]),
    D('dexercise', (s) => s.age >= 58 && s.age < 80, 'Staying strong', (s) => 'A neighbour invites ' + s.name + ' to a walking group.', [
      O('join', 'Join the walking group', 'Health and company', { social: 1 }, (s) => { N(s, 'health', 6); N(s, 'friends', 8); s.mods.h = Math.max(0.6, s.mods.h * 0.96); say(s, 'Three mornings a week, you walked and talked and laughed, and your body thanked you.', { tone: 'joy' }); }),
      O('home', 'Exercise at home', 'Quiet', { caution: 0.8 }, (s) => { N(s, 'health', 3); say(s, 'You did your stretches in the kitchen.', { tone: 'calm' }); }),
      O('rest', 'Take it easy', 'Comfort', { caution: 0.4 }, (s) => { N(s, 'health', -2); N(s, 'joy', 4); say(s, 'You decided to rest. The armchair agreed.', { tone: 'calm' }); }),
    ]),
  );
})(typeof window !== 'undefined' ? window : globalThis);
