// Fun themes drawn as emoji scenes: [label, emojis, count]. First emoji is the big one (or the crowd, if count is given);
// the rest become stickers. Add a theme or candidate by adding a line (a theme needs at least 16, and 32 to offer the 32 bracket).
const ART_THEMES = [
  { id: 'fight', name: 'Who would win?', emoji: '🥊', items: [
    ['100 grandmas', '👵', 100], ['King Kong with one hand tied', '🦍🪢'], ['A tiger', '🐅'], ['100 angry geese', '🪿', 100],
    ['A horse-sized duck', '🦆🐴'], ['100 duck-sized horses', '🐴', 100], ['A swarm of bees', '🐝', 90], ['An angry mom with a slipper', '👩🩴'],
    ['A T-rex with tiny arms', '🦖'], ['A giant lizard monster', '🦎🏙️'], ['A sumo wrestler', '🤼'], ['A million ants', '🐜', 100],
    ['A boxing kangaroo', '🦘🥊'], ['A wizard', '🧙🔮'], ['A ninja', '🥷'], ['50 toddlers with water balloons', '🧒', 50],
    ['A grizzly bear', '🐻'], ['100 raccoons', '🦝', 100], ['A dragon', '🐉'], ['A shark with legs', '🦈🦵'],
    ['A zombie horde', '🧟', 64], ['A robot vacuum', '🤖'], ['An angry swan', '🦢'], ['A pigeon the size of a bus', '🐦🚌'],
    ['A bodybuilder who skipped leg day', '💪'], ['A vampire', '🧛'], ['An angry stag', '🦌'], ['A cow with a jetpack', '🐄🚀'],
    ['A pirate crew', '🏴‍☠️', 12], ['A cat with the zoomies', '🐈💨'], ['An elephant on roller skates', '🐘🛼'], ['Santa Claus', '🎅'],
  ] },
  { id: 'pet', name: 'Dream pet', emoji: '🐾', items: [
    ['A cat-sized T-rex', '🦖🐈'], ['A pocket dragon', '🐉'], ['A talking goldfish', '🐠💬'], ['A pet cloud', '☁️'],
    ['A tiny elephant', '🐘'], ['A unicorn pony', '🦄'], ['A fire-breathing lizard', '🦎🔥'], ['A pet shark in a bathtub', '🦈🛁'],
    ['A sloth that never leaves the couch', '🦥🛋️'], ['A phoenix', '🔥🦅'], ['A giant fluffy bunny', '🐇'], ['A pet octopus', '🐙'],
    ['A baby dinosaur', '🦕'], ['A robot dog', '🤖🐕'], ['A dog that does your taxes', '🐕📊'], ['A cat that pays rent', '🐈💰'],
    ['A friendly ghost', '👻'], ['A flying pig', '🐖☁️'], ['A hamster the size of a bus', '🐹🚌'], ['A tiny alien', '👽'],
    ['A parrot that repeats your secrets', '🦜🤫'], ['100 kittens', '🐱', 100], ['A snail race champion', '🐌🏁'], ['A woolly mammoth calf', '🦣'],
    ['A chicken who thinks it is a dog', '🐔🐕'], ['A very small panda', '🐼'], ['A bat roommate', '🦇'], ['A dancing penguin', '🐧🎶'],
    ['A dragon egg', '🥚🐉'], ['A llama in pajamas', '🦙🛏️'], ['A cat made of toast', '🍞🐈'], ['An army of ducklings', '🦆', 64],
  ] },
  { id: 'power', name: 'Most useless superpower', emoji: '🦸', items: [
    ['Always speak in rhymes', '🎤'], ['Lag 3 seconds behind real life', '⏳'], ['Talk to pigeons', '🕊️💬'], ['Sneeze glitter', '🤧✨'],
    ['Float one inch off the ground', '🧘'], ['Hot toast hands', '🍞🖐️'], ['Teleport 10 centimetres', '📍'], ['Always know the exact time', '🕰️'],
    ['Turn any liquid into soup', '🥣'], ['Make any sound with your elbow', '💪🔊'], ['Invisible only when nobody is looking', '👀'], ['Fly at walking speed', '🦸🚶'],
    ['Never lose a sock again', '🧦'], ['Glow dimly in the dark', '💡'], ['Instantly dry anything', '🌬️'], ['Read the minds of pets', '🐶🧠'],
    ['Super strength for opening jars', '🫙💪'], ['Freeze time for 1 second', '⏸️'], ['Breathe underwater, only in puddles', '💧'], ['Always find a parking spot', '🅿️'],
    ['Control one specific cloud', '☁️'], ['Perfect hair, always', '💇'], ['Speak to bees, only about weather', '🐝🗣️'], ['Wi-Fi in your head, no password', '📶'],
    ['Rewind 5 seconds once a year', '⏪'], ['Smell colours', '👃🎨'], ['Shrink to 1 inch for an hour', '🤏'], ['Clap and the lights switch off', '👏💡'],
    ['Dance perfectly, only when alone', '💃'], ['Always land on your feet', '🐈'], ['Fall asleep anywhere instantly', '😴'], ['Make plants slightly happier', '🌱'],
  ] },
  { id: 'type', name: 'Ideal type', emoji: '💘', items: [
    ['Laughs like a goose', '🪿'], ['Narrates life like a nature documentary', '🎙️'], ['Is always 30 minutes early', '⏰'], ['Dances everywhere', '💃'],
    ['Cooks perfect breakfasts', '🍳'], ['Talks to animals', '🐕💬'], ['Owns a pet dragon', '🐉'], ['Speaks only in movie quotes', '🎬'],
    ['Is secretly a ninja', '🥷'], ['Always has snacks', '🍿'], ['Sings loudly in the shower', '🚿🎤'], ['Karaoke champion', '🎤🏆'],
    ['Remembers every birthday', '🎂'], ['Fixes anything with duct tape', '🔧'], ['Professional napper', '😴'], ['Laughs at your worst jokes', '🤣'],
    ['Never gets lost', '🧭'], ['Part-time wizard', '🧙'], ['A different hat every day', '🎩'], ['Wins every board game', '🎲'],
    ['Tells terrible puns constantly', '🥁'], ['Obsessed with houseplants', '🪴'], ['Owns a tiny horse', '🐴'], ['Brings flowers every week', '💐'],
    ['Sends memes at 3 a.m.', '📱'], ['Superhero on weekends', '🦸'], ['Can juggle anything', '🤹'], ['Road trips and a perfect playlist', '🚗🎶'],
    ['Hugs like a warm blanket', '🫂'], ['Is an astronaut', '🧑‍🚀'], ['Never spoils the movie', '🎞️'], ['Gives amazing piggyback rides', '🐒'],
  ] },
];
