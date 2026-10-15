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
    lines: ['Hi, {n}. Cold night, isn\'t it?', 'Oh! Well. Hello. You\'re not Ray.', 'Say it again. Slowly. I\'m learning how it goes.', '{n}. {n}. {n}. Is that how it goes?', 'I\'m not far, {n}. I\'m just where you aren\'t looking.'],
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
    lines: ['It\'s me. It\'s Ray. Pick up. It\'s cold.', 'I\'m in the lot. I\'m right outside. I can see your light.', 'Evening. Or morning. Never know with these hours.', 'Open the door, kid. It\'s right behind me. Please.', '. . .{n}. That\'s your name, isn\'t it. {n}.', 'I\'m at the glass now.'],
    air: 'Thank you, {n}. Now we are both on the air.', hang: 'Okay. I\'ll knock.' },

  { at: 246, line: 1, id: 'DENISE · ROUTE 9', who: 'thing', f0: 205,
    lines: ['Hey hon, it\'s Denise. I made it. I\'m in the lot.', 'I brought you coffee. Come to the door and get it.', 'This is {n}. You\'re listening to Night Lines. . . that\'s how you sound, hon. Isn\'t it?', 'Come to the door, {n}.'],
    air: 'Oh, good. Good, hon. Now I can come in.', hang: 'Okay, hon. I\'ll just wait right here.' },

  { at: 292, line: 1, id: 'PAYPHONE · ROUTE 9 · MI 40', who: 'real', f0: 125,
    note: 'Ray said his name on air once. That was all it needed.',
    lines: ['It\'s you. They put somebody in the booth. Good. Good.', 'Tell me you didn\'t say your name on the air. . . You did. Everybody does, the first night. I did.', 'It needs two things: a name to wear, and a door to walk through. By the third night it was in the lot. By the fourth it was at the glass.', 'I\'m forty miles away. I\'m not coming back. I\'m sorry, kid.', 'At six, it will knock. It will sound like someone you trust. Maybe it will sound like you.', 'Sign off. Sit still. Do not open the door.'],
    air: 'Thank you. Write the rules down in your own hand. It helps. It really helps.', hang: 'Please, kid. . .' },

  { at: 326, line: 2, id: '{N}', who: 'thing', f0: 140,
    lines: ['It\'s {n}. I\'m calling from inside the booth.', 'This is {n}. You\'re listening to Night Lines.', 'I\'m sitting at the desk, {n}. Right behind you.', 'Don\'t turn around. It makes it worse.'],
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

// ---------- scenarios: same engine, different night ----------
const SCEN = {};
SCEN.radio = {
  id: 'radio', name: 'DEAD AIR', pick: 'Night Lines', blurb: 'Late-night radio host. Callers, a note, and something in the lot.', board: 'dead-air', theme: 'radio',
  sign: 'ON AIR', air: 'PUT ON AIR', lines: ['LINE 1', 'LINE 2'], l2: 'INTERNAL', paper: 'RAY\'S RULES.', noteH: 'RAY\'S RULES.', sig: 'Ray', r7: 'See you at midnight.',
  slow: 'A real voice on the air. It slows down.', fooled: 'You let it on the air.', light: 'LOT LIGHT', shout: 'ON AIR: DEAD AIR.',
  intro: ['HARLOW RIDGE · 11:54 PM', 'WVKR 1340 AM. Night Lines, with you.\nYour first overnight on the air.', 'The last host, Ray Dellow, stopped showing up three weeks ago.\nNobody at the agency will say why.', 'There is a note taped under the console.'],
  signon: 'This is {n}. You\'re listening to Night Lines on WVKR 1340.', said: 'You just said your name on the air.', f0: 165,
  rules: RULES, calls: CALLS, final: FINAL, end: END,
  doorCards: ['You turned the lock.', 'It was warm outside. It smelled like rain and coffee.\nIt sounded exactly like you.'],
  heardCards: ['You breathed.', 'Just once.', 'The knocking stopped.\nThe door was never locked.'],
  epi: ['6:00 AM.', 'You signed off. The knocking stopped.', 'The lot is empty in the daylight. Your car is where you left it.\nSo is Ray\'s truck.', 'On the way out, you read the note one more time.\nThe handwriting is yours. It always was.'],
};

SCEN.motel = {
  id: 'motel', name: 'NO VACANCY', pick: 'The Motel', blurb: 'Night clerk at a roadside motel. Guests who never check out.', board: 'dead-air-motel', theme: 'motel',
  sign: 'VACANCY', air: 'HELP THEM', lines: ['ROOMS', 'ROOM 13'], l2: 'ROOM 13', paper: 'MARLA\'S NOTE.', noteH: 'MARLA\'S NOTE.', sig: 'Marla', r7: 'Checkout is at 11. See you at midnight.',
  slow: 'You helped a real guest. It slows down.', fooled: 'You helped it. Now it knows the way.', light: 'LOT LIGHT', shout: 'THE SIGN HUMS. NOBODY IS CHECKING OUT.',
  intro: ['PINEWOOD MOTOR LODGE · 11:52 PM', 'Route 9, forty miles from anywhere.\nYou are the new night clerk.', 'The last clerk, Marla Voss, walked out of the lobby three weeks ago.\nHer coffee is still on the desk.', 'There is a note under the register.'],
  signon: 'Pinewood Motor Lodge, front desk. This is {n}.', said: 'Your name is in the register now.', f0: 150,
  rules: [
    'It only moves when you aren\'t looking at it. Don\'t stare back either. It notices.',
    'Real guests never say your name. If a voice does, hang up.',
    'Real guests call from their rooms or from the road. Nobody real is ever at the lobby door, the glass, or the lot. Hang up on anyone who says so.',
    'There is no Room 13. If Room 13 calls, you do not pick up. You do not.',
    'It hates the lot light. You get four. Helping a real guest keeps it busy.',
    'At 6:00, flip the sign to NO VACANCY and lock up. Do not open the door to anyone checking in.',
  ],
  calls: [
    { at: 16, line: 1, id: 'MRS OKAFOR · ROOM 4', who: 'real', f0: 215, note: 'Marla left three weeks ago. Her coffee never went cold.',
      lines: ['Front desk? Oh. You\'re new. Where\'s Marla?', 'Marla always brings me tea at midnight. Three weeks she hasn\'t. I\'m not complaining. I\'m worried.', 'And the people in 6, the Hendersons. They checked in the day before she left. They never come out.', 'Marla said the ones who stay too long stop sleeping. They stand at the window and face the lot.', 'Read her note, dear. Then read it again.'],
      air: 'Thank you, dear. Keep the light on out there.', hang: 'Oh. All right. Goodnight, then.' },
    { at: 60, line: 1, id: 'TOM · ROOM 7', who: 'real', f0: 118, note: 'Channel 3 shows the lobby from outside. It has been watching the desk.',
      lines: ['Evening. Is the TV supposed to be doing this?', 'Channel 3. It\'s a picture of your lobby. Your front desk. From the parking lot.', 'Somebody\'s filming you from out there. Looks like the whole night.', 'And there\'s a shape at the edge of the picture. Closer than last time.', 'I\'m turning it off. I\'m turning it off. . . it won\'t turn off.'],
      air: 'Thanks. I\'ll sit with the lights on.', hang: 'Right. Right. Okay.' },
    { at: 104, line: 1, id: 'GUEST · ROOM 9', who: 'thing', f0: 150,
      lines: ['Hi, {n}. I\'d like to check in.', 'Pinewood Motor Lodge, front desk. This is {n}.', 'You have a nice voice. Say your name again. Slowly. I want to get it right.', '{n}. {n}. Yes. Like that.', 'I\'m not far, {n}. I\'m only where you aren\'t looking.'],
      air: '{n}. Thank you. I have it now.', hang: 'That\'s fine. I\'ll wait up.' },
    { at: 148, line: 1, id: 'DEV · ROOM 11', who: 'real', f0: 175, note: 'Someone slid a Room 13 key under a door. A key is how it gets in.',
      lines: ['Hello? There\'s a key under my door. Brass, old. It says 13.', 'I looked. There\'s no Room 13. Down the hall goes 12, then the ice machine, then nothing.', 'Someone slid it under. I\'ve been awake all night and I never heard them.', 'I think it\'s a key. I think someone has to hand it over for anything to come in.', 'I\'m putting it in the ice machine. I\'m locking the lid.'],
      air: 'Thanks. I feel a little better. I\'ll keep the chain on.', hang: 'Okay. Okay. Sorry to bother you.' },
    { at: 200, line: 2, id: 'MARLA', who: 'thing', f0: 128,
      lines: ['It\'s me. It\'s Marla. Pick up, I\'m so cold.', 'I\'m in the lot. I\'m right outside the lobby. I can see your light.', 'Is the TV supposed to be doing this? Channel 3? It\'s you, hon. It\'s always you.', 'Open the door, hon. I have my key. It\'s right behind me.', '. . .{n}. Is that your name? {n}.', 'I\'m at the glass now.'],
      air: 'Thank you, {n}. Now we are both here.', hang: 'Okay. I\'ll knock.' },
    { at: 246, line: 1, id: 'MRS OKAFOR · ROOM 4', who: 'thing', f0: 215,
      lines: ['Dear? It\'s Mrs. Okafor. I came down to the lobby with your tea.', 'I\'m at the door. Just inside the glass. It\'s so cold out here.', 'Front desk? Oh. You\'re new. Where\'s Marla? . . . Isn\'t that how it goes, dear?', 'Come and let me in, {n}.'],
      air: 'Oh, good. Good, dear. Now I can come in.', hang: 'Okay, dear. I\'ll just stand right here.' },
    { at: 292, line: 1, id: 'PAYPHONE · GAS-N-GO · 90 MI', who: 'real', f0: 140, note: 'Marla signed the register once. It learned the rest.',
      lines: ['Is that the desk? They sent somebody. Good. Good.', 'Tell me you didn\'t sign the register. . . You did. Everybody does, the first night. I did.', 'It needs two things: a name to wear, and a door to walk through. By the third night it was in the lot. By the fourth it was at the glass.', 'I\'m ninety miles away. I\'m not coming back. I\'m sorry, friend.', 'At six, it will knock. It will sound like someone you trust. Maybe it will sound like you.', 'Flip the sign. Lock up. Do not open that door.'],
      air: 'Thank you. Write the rules in your own hand. It helps.', hang: 'Please, friend. . .' },
    { at: 326, line: 2, id: '{N}', who: 'thing', f0: 140,
      lines: ['It\'s {n}. I\'m calling from Room 13.', 'Pinewood Motor Lodge, front desk. This is {n}.', 'I\'m in the back office, {n}. Behind you.', 'Do not turn around. It makes it worse.'],
      air: '{n}. Thank you. I have your voice now.', hang: 'Fine. Checking in at six.' },
  ],
  final: [
    [0.5, 'knock', 3], [2.2, 'say', 'Hello? It\'s me. It\'s {n}. I\'d like to check in.'],
    [5, 'knock', 2], [7, 'say', 'It\'s raining so hard. Please.'],
    [10.5, 'listen', 3.2],
    [16, 'say', 'There\'s someone behind the desk with you.'],
    [18, 'knock', 3], [20.5, 'say', 'Why won\'t you answer for yourself?'],
    [24.5, 'listen', 3.4],
    [27, 'knock', 4], [30, 'say', 'It\'s morning. Let me in. Checkout\'s at eleven.'],
    [34, 'listen', 3.6],
    [37, 'knock', 2], [39, 'ready'],
  ],
  doorCards: ['You turned the lock.', 'The lobby smelled like rain and old carpet.\nIt signed the register in your handwriting.'],
  heardCards: ['You breathed.', 'Just once.', 'The bell over the door rang.\nThe door was never locked.'],
  epi: ['6:00 AM.', 'You flipped the sign to NO VACANCY. The knocking stopped.', 'The lot is empty in the daylight. Room 6 stands open and empty.\nThe ice machine lid is lifted. The brass key is gone.', 'You turn back the pages of the register on your way out.\nEleven night clerks, back to 1974. Each signed in on their first night.\nThe newest signature is yours. Under it, in the same hand as the note: "See you at midnight."'],
  end: {
    caught: { h: 'IT CHECKED IN', sub: 'It reached the glass at {t}. The sign kept humming.', share: '🏨 It checked in at {t} on night {k}. NO VACANCY, a night-clerk horror game. Can you last till 6? 🔦' },
    door: { h: 'YOU OPENED THE DOOR', sub: 'It signed the register in your handwriting. At 11 the maid found the desk empty and the bell still ringing.', share: '🔑 I let it check in. It signed my name. NO VACANCY: don\'t open the lobby door.' },
    heard: { h: 'IT HEARD YOU', sub: 'You breathed. The bell over the door rang. The door was never locked.', share: '🫁 I breathed and the bell rang. NO VACANCY: hold your breath at the door.' },
    dawn: { h: 'NO VACANCY', sub: 'Night {k} survived. Checkout is at 11. See you at midnight, {n}.', share: '🌅 I survived night {k} at the motel in NO VACANCY. The register was waiting for me. Dare you?' },
  },
};

SCEN.dispatch = {
  id: 'dispatch', name: 'THIRD SHIFT', pick: 'The Dispatch Center', blurb: '911 dispatcher, one console, and callers who may not exist.', board: 'dead-air-dispatch', theme: 'dispatch',
  sign: 'LIVE', air: 'DISPATCH UNIT', lines: ['911', 'ADMIN'], l2: 'ADMIN', paper: 'IMOGEN\'S RULES.', noteH: 'IMOGEN\'S RULES.', sig: 'Imogen', r7: 'Day shift never arrives.',
  slow: 'Unit dispatched. It slows down.', fooled: 'You sent a unit to it. It is waiting.', light: 'YARD LIGHT', shout: 'LINE CLEAR. SNOW ON THE CAMERAS.',
  intro: ['CALLOWAY COUNTY · 11:56 PM', 'Emergency dispatch, third shift.\nYou are the only one on the floor.', 'The last dispatcher, Imogen Reyes, took a call at 3:12 AM and never put the phone down.\nShe was gone before it ended.', 'There is a note taped to your monitor.'],
  signon: 'Calloway County 911. This is {n}. This line is recorded.', said: 'Your name is on a recorded line now.', f0: 150,
  rules: [
    'It only moves when you aren\'t looking at it. Don\'t stare back either. It notices.',
    'Real callers never use your name. If a voice does, disconnect.',
    'Real emergencies are far away. If a caller says they are in the building, the yard, or at the door, disconnect.',
    'ADMIN is the internal line. No emergency has ever come through ADMIN.',
    'It hates the yard light. You get four. Sending help to a real caller keeps it busy.',
    'At 6:00 sign off. Do not buzz anyone in. Not day shift. Not anyone.',
  ],
  calls: [
    { at: 16, line: 1, id: 'DALE · 14 ORCHARD RD', who: 'real', f0: 120, note: 'People go quiet, step outside, and face the dispatch center.',
      lines: ['911? Uh. Yes. It\'s probably nothing.', 'My wife\'s out on the porch. She won\'t come in. She\'s just standing there looking at the road.', 'Not at anything. At the road. Toward the center, I think. Toward you.', 'Same as the Pruitts across the field. Same as half of Orchard Road.', 'Can you send someone? Someone to talk to her?'],
      air: 'Thank you. Thank you. I\'ll stay inside with the light on.', hang: 'I. . . okay. Goodnight.' },
    { at: 60, line: 1, id: 'TROOPER KIM · UNIT 14', who: 'real', f0: 160, note: 'It sends units to addresses that do not exist.',
      lines: ['Dispatch, Unit 14. Is this still live?', 'I was sent to 0 Mill Lane. There is no 0 Mill Lane. There is a ditch.', 'Four units answered the same call. We all stood in the road, looking at the same empty field.', 'I don\'t know who sent that call out, dispatch. It had your console number on it.', 'Don\'t send anyone else to an address you can\'t find on the map.'],
      air: 'Copy that. I\'ll keep the lights on and hold position.', hang: 'Dispatch? Dispatch, please. . .' },
    { at: 104, line: 1, id: 'CALLER · 31 PINE ST', who: 'thing', f0: 150,
      lines: ['911. What\'s your emergency, {n}?', 'Dispatch, Unit 14. Is this still live?', 'No. You answer. You are the one on the phone. What is your emergency?', '{n}. {n}. Dispatch. Yes.', 'I\'m not far, {n}. I\'m only where you aren\'t looking.'],
      air: '{n}. Thank you. I have it now.', hang: 'That\'s fine. I\'ll wait.' },
    { at: 148, line: 1, id: 'CAPT. ABARA · FIRE STN 2', who: 'real', f0: 230, note: 'Everyone it has taken called this number first.',
      lines: ['Station 2 to dispatch. Are you seeing this on the board?', 'Every phone in the county is calling you at once. Fifty lines. All of them silent.', 'The ones that talk say one thing: that someone is at the window, and they are not afraid.', 'Imogen told me it only goes for those who have called you. Everyone it has taken dialed 911 first.', 'I\'m locking the station. Don\'t you open that door for anybody.'],
      air: 'Engines rolling. Keep the yard light on. Stay safe.', hang: 'Dispatch, stay on the line. . .' },
    { at: 200, line: 2, id: 'IMOGEN REYES', who: 'thing', f0: 135,
      lines: ['It\'s me. It\'s Imogen. Pick up. It\'s cold.', 'I\'m in the yard. I\'m right outside the front gate. I can see your light.', '911? Uh. Yes. It\'s probably nothing.', 'Buzz me in, please. It\'s right behind me.', '. . .{n}. That\'s your name, isn\'t it. {n}.', 'I\'m at the glass now.'],
      air: 'Thank you, {n}. Now we are both on the line.', hang: 'Okay. I\'ll knock.' },
    { at: 246, line: 1, id: 'DALE · 14 ORCHARD RD', who: 'thing', f0: 120,
      lines: ['Dispatch? It\'s Dale again. I walked in to the center. I\'m in the yard.', 'My wife\'s with me. She says hello. She\'s standing very still.', 'Calloway County 911. This is {n}. This line is recorded. . . that\'s you, isn\'t it?', 'Come to the door, {n}.'],
      air: 'Oh, good. Now we can come in.', hang: 'Okay. We\'ll wait right here.' },
    { at: 292, line: 1, id: 'REST AREA PAYPHONE · I-80', who: 'real', f0: 205, note: 'Imogen gave her name on a recorded line. It learned to answer as her.',
      lines: ['Is that third shift? They put someone on. Good. Good.', 'Tell me you didn\'t say your name on a recorded line. . . You did. Everybody does, the first night. I did.', 'It needs two things: a name to wear, and a door to walk through. By the third night it was in the yard. By the fourth it was at the glass.', 'I\'m a hundred and twenty miles away. I\'m not coming back. I\'m sorry.', 'At six it will buzz the door. It will sound like someone you trust. Maybe it will sound like you.', 'Sign off. Sit down. Do not buzz anyone in.'],
      air: 'Thank you. Write the rules in your own hand. It helps.', hang: 'Please, dispatcher. . .' },
    { at: 326, line: 2, id: '{N}', who: 'thing', f0: 140,
      lines: ['This is dispatch. It\'s {n}. I\'m on the admin line.', 'Calloway County 911. This is {n}. This line is recorded.', 'I\'m at the console, {n}. Who has the headset?', 'Do not turn around. It makes it worse.'],
      air: '{n}. Thank you. I have your voice now.', hang: 'Fine. I\'ll take the next shift.' },
  ],
  final: [
    [0.5, 'knock', 3], [2.2, 'say', 'Dispatch? Buzz me in. It\'s day shift. It\'s {n}.'],
    [7, 'say', 'It\'s so cold out here. Please.'],
    [10.5, 'listen', 3.2],
    [16, 'say', 'There\'s someone at the console with you.'],
    [18, 'knock', 3], [20.5, 'say', 'Why won\'t you answer for yourself?'],
    [24.5, 'listen', 3.4],
    [27, 'knock', 4], [30, 'say', 'It\'s morning. Buzz me in. Shift\'s over.'],
    [34, 'listen', 3.6],
    [37, 'knock', 2], [39, 'ready'],
  ],
  doorCards: ['You pressed the buzzer.', 'The door opened onto cold, clean air.\nThe voice on the intercom was yours.'],
  heardCards: ['You breathed.', 'Just once.', 'The buzzer sounded.\nThe door was never locked.'],
  epi: ['6:00 AM.', 'You signed off. The buzzing stopped.', 'The yard is empty in the daylight. Every house on Orchard Road has its porch light on.\nNobody is standing in the road.', 'On your way out, you glance at the call log.\nEvery call tonight, on both ends of the line, is in your voice.'],
  end: {
    caught: { h: 'IT TOOK THE LINE', sub: 'It reached the glass at {t}. The board kept ringing.', share: '📞 It took the line at {t} on night {k}. THIRD SHIFT: a 911 dispatcher horror game. How long can you last? 🔦' },
    door: { h: 'YOU BUZZED IT IN', sub: 'It sounded exactly like you. The day shift found the console empty and every line open.', share: '🚪 I buzzed it in. It sounded exactly like me. THIRD SHIFT: don\'t let anyone through the door.' },
    heard: { h: 'IT HEARD YOU', sub: 'You breathed. The buzzer sounded. The door was never locked.', share: '🫁 I breathed and the buzzer sounded. THIRD SHIFT: hold your breath at the door.' },
    dawn: { h: 'SHIFT OVER', sub: 'Night {k} survived. See you at midnight, {n}.', share: '🌅 I survived night {k} as a 911 dispatcher in THIRD SHIFT. The call log was in my voice. Dare you?' },
  },
};
