// Dead Air: story data. `{n}` = the player's name.
// who 'real' = safe to put on air · 'thing' = the Listener. Every thing call shows a tell from Ray's rules
// (says your name / says it is close / comes in on Line 2) in its first two lines, so it is always fair.
// `at` = game minute the phone starts ringing (0 = 12:00 AM). `note` is learned by hearing the whole call.
const RULES = [
  'It only moves when you aren\'t looking at it. Don\'t stare back either. It notices.',
  'Real callers never say your name. If a voice does, hang up.',
  'Real callers are far away. If they say they\'re close (the lot, the glass, the door), hang up.',
  'Line 2 is inside this building. Nobody calls from Line 2. Nobody.',
  'It hates the lot light. You get four. Real voices on air slow it down.',
  'At 6:00, sign off. Do not open the door. Not for anyone.',
];

const CALLS = [
  { at: 16, line: 1, id: 'DENISE · ROUTE 9', who: 'real', f0: 205,
    note: 'Ray has been missing for three weeks.',
    lines: [
      'Oh! Well. Hello. You\'re not Ray.',
      'I\'m Denise. I drive nights out on Route 9. Ray\'s been my radio for six years.',
      'He hasn\'t been on in three weeks. They told me he quit. Ray doesn\'t quit.',
      'Did he leave you a note? Read it. Then read it again.',
      'And hon, keep real people on the air. It slows down when there\'s a real voice.'],
    air: 'That\'s all I wanted. Stay in the light, hon. Goodnight.', hang: 'Oh. Okay. Be careful, hon.' },

  { at: 60, line: 1, id: 'WALT · MILL ROAD', who: 'real', f0: 112,
    note: 'It learned to talk from the radio. It only repeats what it has heard.',
    lines: [
      'Evening. Or morning. Never know with these hours.',
      'My dog\'s been at the back door since midnight. Not barking. Just staring at the field.',
      'Same as the Hendricks\' dog. Eleven dogs on Mill Road, all of them facing your station.',
      'Ray used to say it learned to talk from this radio. That it only knows what it has heard on air.',
      'So mind what you say, son. It\'s listening to you right now. Good listener, that one.'],
    air: 'Thanks for the company. Stay in the light.', hang: 'Right. I understand. Right.' },

  { at: 104, line: 1, id: 'J. MORROW · RIVERSIDE', who: 'thing', f0: 150,
    lines: [
      'Hi, {n}. Cold night, isn\'t it?',
      'I like your voice. It\'s easy to learn.',
      'Say something else. Slowly. Say it again.',
      '{n}. {n}. {n}. Is that how it goes?',
      'I\'m not far, {n}. I\'m just where you aren\'t looking.'],
    air: '{n}. Thank you. I have it now.', hang: 'That\'s fine. I\'ll wait.' },

  { at: 148, line: 1, id: 'PRIYA · HARLOW GENERAL', who: 'real', f0: 245,
    note: 'It can\'t come in unless someone inside opens the door.',
    lines: [
      'Is this still live? Oh thank God. Please don\'t hang up.',
      'I\'m a nurse at Harlow General. Our whole ER just walked out to the parking lot.',
      'Quiet. In a line. All facing the radio tower. Nobody answers me.',
      'Ray told me once it can\'t get through a door by itself. It needs somebody inside to open it.',
      'I\'m locked in the supply room. I can hear them humming your station jingle.'],
    air: 'Thank you for picking up. I\'m keeping this radio on. Don\'t open the door.', hang: 'No, wait, please. . .' },

  { at: 200, line: 2, id: 'RAY DELLOW', who: 'thing', f0: 128,
    lines: [
      'It\'s me. It\'s Ray. Pick up. It\'s cold.',
      'I\'m in the lot. I\'m right outside. I can see your light.',
      'Open the door, kid. It\'s right behind me. Please.',
      '. . .{n}. That\'s your name, isn\'t it. {n}.',
      'I\'m at the glass now.'],
    air: 'Thank you, {n}. Now we are both on the air.', hang: 'Okay. I\'ll knock.' },

  { at: 246, line: 1, id: 'DENISE · ROUTE 9', who: 'thing', f0: 205,
    lines: [
      'Hey hon, it\'s Denise. I made it. I\'m in the lot.',
      'I brought you coffee. Come to the door and get it.',
      'You said your name was {n}, didn\'t you? Come to the door, {n}.'],
    air: 'Oh, good. Good, hon. Now I can come in.', hang: 'Okay, hon. I\'ll just wait right here.' },

  { at: 292, line: 1, id: 'PAYPHONE · ROUTE 9 · MI 40', who: 'real', f0: 125,
    note: 'Ray said his name on air once. That was all it needed.',
    lines: [
      'It\'s you. They put somebody in the booth. Good. Good.',
      'Don\'t tell me your name. I said mine on the first night, once, on air. That was all it needed.',
      'By the third night it was in the lot. By the fourth it was at the glass. Then it had my voice.',
      'I\'m forty miles away. I\'m not coming back. I\'m sorry, kid.',
      'At six, it will knock. It will sound like someone you trust. Maybe it will sound like you.',
      'Sign off. Sit still. Do not open the door.'],
    air: 'Thank you. Write the rules down in your own hand. It helps. It really helps.', hang: 'Please, kid. . .' },

  { at: 326, line: 2, id: '{N}', who: 'thing', f0: 140,
    lines: [
      'It\'s {n}. I\'m calling from inside the booth.',
      'I\'m sitting at the desk, {n}. Right behind you.',
      'Don\'t turn around. It makes it worse.'],
    air: '{n}. Thank you. I have your voice now.', hang: 'Fine. See you at six.' },
];

// Door scene at 5:50 AM. [seconds, type, arg]. 'say' = voice at the door, 'listen' = hold your breath, 'ready' = sign-off unlocks.
const FINAL = [
  [0.5, 'knock', 3], [2.2, 'say', 'It\'s me. It\'s {n}. Let me in.'],
  [7, 'say', 'It\'s so cold out here. Please.'],
  [10.5, 'listen', 3.2],
  [16, 'say', 'There\'s someone in the booth with you.'],
  [20.5, 'say', 'Why won\'t you answer for yourself?'],
  [24.5, 'listen', 3.4],
  [30, 'say', 'It\'s morning. Open the door. Shift\'s over.'],
  [34, 'listen', 3.6],
  [39, 'ready'],
];

const END = {
  caught: { h: 'IT GOT IN', sub: 'It reached the glass at {t}. Nobody on the air heard it happen.',
    share: '☠️ It got me at {t} on night {k}. DEAD AIR: night-shift radio horror, 6 minutes. Can you outlast it? 🔦' },
  door: { h: 'YOU OPENED THE DOOR', sub: 'It sounded exactly like you. In the morning the booth was empty and the radio was still on, and a voice said {n}.',
    share: '🚪 I opened the door. It sounded exactly like me. DEAD AIR: don\'t trust the voice at the door.' },
  heard: { h: 'IT HEARD YOU', sub: 'You breathed. That was all it needed. The door was never locked.',
    share: '🫁 I breathed. It heard me. DEAD AIR: hold your breath when the knocking stops.' },
  dawn: { h: 'YOU SIGNED OFF', sub: 'Night {k} survived. See you at midnight, {n}.',
    share: '🌅 I survived night {k} of DEAD AIR. Rule 7 was waiting for me. Think you can last till 6 AM?' },
};
