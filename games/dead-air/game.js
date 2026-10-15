// Dead Air: game logic. Story in story.js, sound in audio.js, picture in scene.js.
const $ = (id) => document.getElementById(id);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), rnd = (a, b) => a + Math.random() * (b - a);
const SPEED = +new URLSearchParams(location.search).get('speed') || 1; // ?speed=4 to test fast
const SITE = 'https://rank-game.com/games/dead-air';
const CLOCK = .95; // game minutes per real second: 12:00 to 5:50 AM takes about 6 minutes
const store = {
  get() { try { return JSON.parse(localStorage.getItem('dead-air-save')) || {}; } catch { return {}; } },
  set(o) { try { localStorage.setItem('dead-air-save', JSON.stringify({ ...store.get(), ...o })); } catch {} },
};
const sv = store.get();
const G = { state: 'title', scen: SCEN[sv.scen] ? sv.scen : 'radio', name: sv.name || '', night: 1, calm: !!sv.calm, view: 1, cam: 1, D: 5, shownD: Math.max(2, 5 - (sv.plays || 0)), pose: 0, gaze: 0, flood: 0, dark: 0, dawn: 0, glitch: 0, face: 0, spike: 0, T: 0, time: 0, holding: false, tips: {}, steps: 0 };
const fmt = (s) => s.replace(/\{n\}/g, G.name).replace(/\{N\}/g, G.name.toUpperCase());
const clock = (m) => { m = Math.floor(m); const h = m / 60 | 0; return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const interval = () => (30 - 11 * G.T / 360) / (1 + .18 * (G.night - 1)); // seconds of being unseen per step
const idleMsgs = () => ['NO CALLS WAITING.', 'LINE CLEAR. KEEP AN EYE ON THE WINDOW.', `STATIC ON ${S.lines[1]}. (NOBODY CALLS ${S.lines[1]}.)`, S.shout, 'THE PHONE IS QUIET. THE LOT IS NOT.'];
let S = SCEN[G.scen];
function setScen(id) {
  G.scen = id; S = SCEN[id]; Scene.setTheme(S.theme); sv.scen = id; store.set({ scen: id });
  $('onair').textContent = S.sign; $('l1t').textContent = S.lines[0]; $('l2t').textContent = S.lines[1]; $('noteBtn').innerHTML = `<b>${S.paper}</b>1. ${S.rules[0].split('.')[0]}.<br>2. ${S.rules[1].split('.')[0]}.<br>3. . . .<br><u>(tap to read)</u>`;
  $('bLight').firstChild.textContent = '🔦 ' + S.light; document.title = S.name === 'DEAD AIR' ? 'Dead Air' : `Dead Air: ${S.pick}`;
  for (const b of document.querySelectorAll('.scn')) b.classList.toggle('on', b.dataset.id === id);
  $('scnBlurb').textContent = S.blurb; $('best').textContent = sv.bestT ? `Longest night: ${clock(sv.bestT)} · survived: ${sv.won || 0}` : '';
}
$('scns').innerHTML = Object.values(SCEN).map((x) => `<button class="scn" data-id="${x.id}"><b>${x.name}</b><span>${x.pick}</span></button>`).join('');
for (const b of document.querySelectorAll('.scn')) b.onclick = () => setScen(b.dataset.id);
const mkBoard = () => leaderboard($('lb'), S.board, (s) => s >= 500 ? `🌅 Night ${(s - 400) / 100}` : clock(s));

function toast(msg, ms = 3200) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), ms); }
function tip(k, msg) { if (!G.tips[k]) { G.tips[k] = 1; toast(msg, 4200); } }
const setState = (s) => { G.state = s; document.body.dataset.s = s; };

// ---------- title / intro ----------
function openTitle() {
  setState('title'); $('title').hidden = false; G.view = 1; G.cam = 1; G.D = G.shownD = Math.max(2, 5 - (sv.plays || 0)); G.face = 0; $('nameIn').value = G.name; $('calm').checked = G.calm; setScen(G.scen); checkName();
}
const checkName = () => { $('bStart').disabled = !$('nameIn').value.trim(); };
$('nameIn').oninput = checkName;
$('nameIn').onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter' && !$('bStart').disabled) $('bStart').click(); };
$('bStart').onclick = () => {
  G.name = $('nameIn').value.trim().replace(/[<>&"]/g, '').slice(0, 12); G.calm = $('calm').checked; G.night = 1;
  $('title').hidden = true; store.set({ name: G.name, calm: G.calm, plays: (sv.plays = (sv.plays || 0) + 1) }); A.init();
  cards(S.intro, () => showNote(false, () => startGame()));
};

let cardT = 0, cardRun = 0, cardGo = null;
function cards(lines, cb, dim) {
  const id = ++cardRun, el = $('cards'), tx = $('cardTxt'); let i = 0; el.hidden = false; el.classList.toggle('dim', !!dim);
  const next = () => {
    if (id !== cardRun) return; clearTimeout(cardT);
    if (i >= lines.length) { el.hidden = true; cardGo = null; cb(); return; }
    tx.textContent = fmt(lines[i++]); tx.classList.remove('in'); void tx.offsetWidth; tx.classList.add('in'); cardT = setTimeout(next, 3600);
  };
  cardGo = next; el.onclick = next; next();
}

function showNote(epi, cb) {
  $('noteH').textContent = epi ? `${G.name.toUpperCase()}'S RULES.` : S.noteH;
  $('noteList').innerHTML = S.rules.map((r) => `<li>${r}</li>`).join('') + (epi ? `<li class="r7">${S.r7}</li>` : '');
  $('noteSig').textContent = epi ? `— ${G.name}` : `— ${S.sig}`; $('noteSig').classList.toggle('swap', !!epi);
  $('note').hidden = false; if (epi) setTimeout(() => { A.sting(.3); A.say(G.name); }, 2000); $('bNoteGo').textContent = cb ? (epi ? 'CLOCK OUT' : 'START THE SHIFT') : 'CLOSE'; $('bNoteGo').onclick = () => { $('note').hidden = true; cb && cb(); };
}

// ---------- the night ----------
function startGame() {
  Object.assign(G, { state: 'play', T: 0, time: 0, D: 5, shownD: 5, view: 0, cam: 0, gaze: 0, contact: 0, unseen: 0, slowUntil: 0, charges: Math.max(3, 5 - G.night), cd: 0, nextPhantom: rnd(70, 110), nextOdd: rnd(25, 45), nextGlitch: rnd(30, 50), signAt: 2.5, prints: 0, flood: 0, dark: 0, dawn: 0, glitch: 0, face: 0, spike: 0, call: null, queue: S.calls.slice(), nextAt: S.calls[0].at, notes: [], real: 0, fooled: 0, steps: 0, onair: false, final: null, flick: null, nextFlick: rnd(30, 50), pose: 0, holding: false });
  setState('play'); $('onair').classList.remove('on'); idle(); setBtns(); ledBar();
  A.mix({ view: 0, fear: 0 }); toast('Tap ▲ WINDOW (or press Space) to look outside, and again to come back to the desk', 5000);
}
// you say your name on the air / sign the register / speak on a recorded line: that is how it learns it
function signOn() {
  if (G.state !== 'play') return; const text = fmt(S.signon), p = A.voice(S.f0, text, false);
  $('txt').innerHTML = ''; $('lineTag').textContent = '—'; $('cid').textContent = 'YOU'; addLine('▶ ' + text, 'air');
  setTimeout(() => { if (G.state !== 'play') return; A.roof(); G.spike = .8; toast(S.said, 4600); }, (p.dur + .9) * 1000 / SPEED);
  setTimeout(() => { if (G.state === 'play' && !G.call) idle(); }, (p.dur + 5.5) * 1000 / SPEED);
}
function idle(msg) { $('txt').innerHTML = `<p class="ln idle">${msg || idleMsgs()[Math.random() * 5 | 0]}</p>`; $('lineTag').textContent = '—'; $('lineTag').className = 'tag'; $('cid').textContent = 'STANDBY'; $('pat').parentElement.style.opacity = 0; }

function look(on) {
  if (G.state !== 'play' || G.final) return; const was = G.view; G.view = on === undefined ? (G.view ? 0 : 1) : on ? 1 : 0;
  if (G.view && !was && G.D <= 2 && G.seenAt !== G.D) { G.seenAt = G.D; G.spike = 1; G.glitch = .7; G.gaze = Math.max(G.gaze, 1.8); A.sting(.4); } // it was already looking at you
  if (G.view) { tip('look', 'It only moves while you are not looking. Don\'t stare back, either.'); if (G.D <= 3) tip('flood', `Use the ${S.light} (or press F) to push it back. You only get a few.`); }
}
function useLight() {
  if (G.state !== 'play' || G.final || G.cam < .5) return;
  if (G.cd > 0) return; if (G.D >= 6) return toast('Nothing out there right now.', 1800);
  if (G.charges <= 0) return toast('The lot light is dead.', 2200);
  G.charges--; G.cd = 3; G.D = Math.min(6, G.D + 2); G.flood = 1; G.gaze = 0; G.contact = 0; G.glitch = .6; A.flood(); ledBar(); toast(G.charges ? `${G.charges} left` : 'That was the last one.', 1800);
}
function ledBar() { $('leds').innerHTML = Array.from({ length: Math.max(3, 5 - G.night) }, (_, i) => `<i class="${i < (G.charges ?? 0) ? 'on' : ''}"></i>`).join(''); }

function stepFigure(n, seen) {
  G.D -= n; G.pose = (G.pose + 1 + (Math.random() * 3 | 0)) % 6; G.steps++;
  if (G.D <= 0) { G.D = 0; return die('caught'); }
  if (G.cam <= .55) G.shownD = G.D;
  A.step(G.D); G.spike = Math.max(G.spike, .3 + (5 - G.D) * .09);
  if (G.steps === 1) tip('step', 'Something shifted outside.');
  if (G.D === 1) { G.prints = Math.min(3, G.prints + 1); A.tap(3); tip('glass', 'tap. tap. tap. . .'); }
}

function die(kind) {
  if (G.state !== 'play') return; setState('dying'); $('toast').classList.remove('on'); G.kind = kind; G.dieT = 0; G.view = 1; A.stopRing(); A.death(); G.spike = 1; G.call = null; G.final = null; $('door').hidden = true;
}

// ---------- calls ----------
function setBtns() {
  const ph = G.call?.phase, open = ph === 'ring' || ph === 'live' || ph === 'decide';
  $('bAir').disabled = $('bHang').disabled = !open; $('bAir').querySelector('b').textContent = ph === 'ring' ? 'ANSWER' : S.air; $('bHang').querySelector('b').textContent = ph === 'ring' ? 'DECLINE' : 'HANG UP';
}
function startRing() {
  const def = G.queue.shift(), thing = def.line === 2;
  G.call = { def, phase: 'ring', pat: 1, i: -1, cur: null, done: false, read: 0 };
  $('txt').innerHTML = ''; $('lineTag').textContent = S.lines[def.line - 1]; $('lineTag').className = `tag ring l${def.line}`;
  $('cid').textContent = thing ? `${S.l2} · ${fmt(def.id)}` : fmt(def.id); $('pat').parentElement.style.opacity = 1;
  addLine('☎ INCOMING CALL…', 'idle'); A.ring(thing); setBtns();
  tip('ring', 'It\'s ringing. Tap ANSWER (or press A) at the desk.');
}
function addLine(text, cls) { const p = document.createElement('p'); p.className = `ln ${cls || ''}`; p.textContent = text; $('txt').append(p); while ($('txt').children.length > 5) $('txt').firstChild.remove(); return p; }
function answer() {
  const c = G.call; c.phase = 'live'; A.stopRing(); A.pick(); $('txt').innerHTML = ''; $('lineTag').className = `tag live l${c.def.line}`; c.pat = 1; setBtns(); nextLine();
}
function nextLine() {
  const c = G.call, d = c.def; c.i++;
  if (c.i >= d.lines.length) { c.phase = 'decide'; c.done = true; c.pat = 1; return tip('decide', `Real, or not? ${S.air.toLowerCase()}, or hang up.`); }
  const text = fmt(d.lines[c.i]), thing = d.who === 'thing', p = A.voice(d.f0, text, thing);
  c.cur = { el: addLine('', 'live'), text, n: 0, t: 0, dur: p.dur };
  if (thing && c.i > 0) G.unseen += 5; // it hears you listening
  if (thing && /\{n\}/.test(d.lines[c.i]) && !c.said) { c.said = 1; setTimeout(() => A.say(G.name), 500); }
}
function putOnAir() {
  const c = G.call, d = c.def, thing = d.who === 'thing'; A.click();
  if (c.cur) c.cur.el.textContent = c.cur.text; c.cur = null; c.phase = 'closing'; c.done = true;
  const text = '▶ ' + fmt(d.air); addLine(text, 'air'); const p = A.voice(d.f0, fmt(d.air), thing); c.endAt = G.time + p.dur + 1.2;
  G.onair = true; $('onair').classList.add('on'); setBtns();
  if (!thing) { G.slowUntil = G.time + 32; G.real++; toast(S.slow, 2600); }
  else { G.fooled++; A.sting(); G.spike = 1; G.glitch = 1; G.flick = { t: 0, dur: .9, step: false }; setTimeout(() => A.say(G.name), 700); stepFigure(2); toast(S.fooled, 2600); }
}
function hangUp() {
  const c = G.call, d = c.def; A.click(); if (c.phase === 'ring') { A.stopRing(); return endCall(); }
  if (c.cur) c.cur.el.textContent = c.cur.text; c.cur = null; c.phase = 'closing';
  const text = fmt(d.hang); addLine(text, 'hang'); const p = A.voice(d.f0, text, d.who === 'thing'); c.endAt = G.time + Math.min(p.dur, 2.4) + .4; setBtns();
  if (d.who === 'thing') { G.spike = Math.max(G.spike, .45); setTimeout(() => A.knock(1, .35), 1400); }
}
function endCall() {
  const c = G.call; if (!c) return; A.stopRing();
  if (c.def.who === 'real' && c.done && !G.notes.includes(c.def.note)) G.notes.push(c.def.note);
  G.call = null; G.onair = false; $('onair').classList.remove('on'); setBtns(); idle();
  G.nextAt = Math.max(G.T + 9, G.queue.length ? G.queue[0].at : 1e9);
}
function monitorSpeaks() {
  const old = $('txt').innerHTML, N = G.name.toUpperCase(), m = [N, 'I SEE YOU', 'BEHIND YOU', 'LOOK UP', `${N} ${N} ${N}`, 'IT IS CLOSER'][Math.random() * 6 | 0];
  $('txt').innerHTML = `<p class="ln glitch">${m}</p>`; $('mon').classList.add('shake'); A.creak();
  setTimeout(() => { if (!G.call) $('txt').innerHTML = old; $('mon').classList.remove('shake'); }, 650);
}
function callTick(dt) {
  const c = G.call; $('l2').classList.toggle('on', (!!c && c.def.line === 2) || G.time < (G.phantom || 0)); $('l1').classList.toggle('on', !!c && c.def.line === 1);
  if (!c) { if (G.queue.length && G.T >= G.nextAt) startRing(); return; }
  if (c.phase === 'ring') { c.pat -= dt / 12; if (c.pat <= 0) { A.stopRing(); toast('Missed call.', 1800); endCall(); } }
  else if (c.phase === 'live' && c.cur) {
    const L = c.cur; L.t += dt; const n = Math.min(L.text.length, Math.ceil(L.text.length * Math.min(1, L.t / (L.dur * .9))));
    if (n !== L.n) { L.n = n; L.el.textContent = L.text.slice(0, n); } L.el.classList.toggle('typing', n < L.text.length);
    if (L.t >= L.dur + .5) { L.el.classList.remove('typing'); c.cur = null; nextLine(); }
  } else if (c.phase === 'decide') { c.pat -= dt / 16; if (c.pat <= 0) hangUp(); }
  else if (c.phase === 'closing' && G.time >= c.endAt) endCall();
  $('pat').style.transform = `scaleX(${clamp(c.pat)})`; $('pat').classList.toggle('low', c.pat < .3);
}

// ---------- the final minutes ----------
function startFinal() {
  G.final = { t: 0, i: 0, ready: false, lis: null, said: false, type: null }; G.view = 0; A.stopRing();
  $('door').hidden = false; $('bSign').disabled = true; $('doorSay').textContent = ''; $('listen').hidden = true; toast('Someone is at the door.', 3000);
}
function doorShake() { const s = $('slab'); s.classList.remove('knock'); void s.offsetWidth; s.classList.add('knock'); }
function finalTick(dt) {
  const f = G.final; f.t += dt; G.T = Math.min(360, 350 + f.t * .3); G.dawn = 0;
  while (f.i < S.final.length && S.final[f.i][0] <= f.t) {
    const [, k, a] = S.final[f.i++];
    if (k === 'knock') { A.knock(a, 1.1); for (let j = 0; j < a; j++) setTimeout(doorShake, j * 500); }
    else if (k === 'say') { const text = fmt(a), p = A.voice(135, text, true); f.type = { text, t: 0, dur: p.dur }; if (/\{n\}/.test(a) && !f.said) { f.said = 1; setTimeout(() => A.say(G.name), 900); } }
    else if (k === 'listen') { f.lis = { start: f.t, end: f.t + a }; $('listen').hidden = false; }
    else if (k === 'ready') { f.ready = true; $('bSign').disabled = false; toast('6:00 AM. You can sign off.', 3500); }
  }
  if (f.type) { const y = f.type; y.t += dt; const n = Math.ceil(y.text.length * Math.min(1, y.t / (y.dur * .9))); $('doorSay').textContent = y.text.slice(0, n); }
  if (f.lis) { if (f.t > f.lis.end) { f.lis = null; $('listen').hidden = true; A.knock(1, .45); } else if (f.t > f.lis.start + .55 && !G.holding) return finish('heard'); }
  $('door').style.setProperty('--glow', clamp((G.T - 352) / 8) * .8 + .15);
  $('door').classList.toggle('hush', !!f.lis); $('bHold').classList.toggle('need', !!f.lis);
}
function signOff() {
  if (!G.final?.ready) return; G.final = null; $('door').hidden = true; setState('dawnseq'); G.view = 1; G.dawnT = 0; G.D = 6; G.shownD = 6; A.dawn(); A.mix({ view: 1, fear: 0, quiet: 0 });
}
function dawnTick(dt) {
  G.dawnT += dt; G.cam = Math.min(1, G.cam + dt * 2); G.dawn = clamp(G.dawnT / 8); G.T = 360;
  if (G.dawnT > 10 && !G.cardsOn) { G.cardsOn = true; cards(S.epi, () => showNote(true, () => { G.cardsOn = false; showEnd('dawn'); }), true); }
}

// ---------- ending ----------
function finish(kind) {
  if (G.state === 'over') return; G.kind = kind; setState('over'); A.stopRing(); $('door').hidden = true; A.mix({ view: 0, fear: 0, quiet: 1 });
  const lines = kind === 'door' ? S.doorCards : S.heardCards;
  if (kind !== 'caught') { A.sting(); cards(lines, () => showEnd(kind)); } else setTimeout(() => showEnd(kind), 900);
}
function showEnd(kind) {
  setState('over'); const win = kind === 'dawn', e = S.end[kind], t = clock(G.T), score = win ? 400 + 100 * Math.min(G.night, 5) : Math.min(Math.floor(G.T), 359);
  const f = (s) => s.replace(/\{t\}/g, t).replace(/\{k\}/g, G.night).replace(/\{n\}/g, G.name);
  $('endH').textContent = e.h; $('endSub').textContent = f(e.sub);
  $('endStats').innerHTML = `<span>🕒 <b>${t}</b></span><span>📞 real on air <b>${G.real}</b></span><span>👤 fooled <b>${G.fooled}</b></span><span>🔦 lights left <b>${G.charges}</b></span>`;
  $('notes').innerHTML = G.notes.length ? '<h4>WHAT YOU LEARNED</h4>' + G.notes.map((n) => `<p>📝 ${n}</p>`).join('') : '';
  $('bAgain').textContent = win ? `NIGHT ${G.night + 1} →` : 'TRY AGAIN'; $('end').hidden = false; $('end').classList.toggle('win', win);
  const s = { bestT: Math.max(sv.bestT || 0, Math.floor(G.T)) }; if (win) s.won = (sv.won || 0) + 1; Object.assign(sv, s); store.set(s);
  mkBoard().show(score); adBanner($('ad')); $('end').scrollTop = 0;
}
$('bAgain').onclick = () => { $('end').hidden = true; if (G.kind === 'dawn') G.night++; startGame(); A.init(); };
$('bMenu').onclick = () => { $('end').hidden = true; openTitle(); };

// share: a 1200x630 card with the figure, plus the text and link
function shareCard() {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 630; const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 630); gr.addColorStop(0, '#02060a'); gr.addColorStop(1, '#0c1d26'); x.fillStyle = gr; x.fillRect(0, 0, 1200, 630);
  const lg = x.createRadialGradient(850, 80, 0, 850, 80, 520); lg.addColorStop(0, 'rgba(255,200,130,.35)'); lg.addColorStop(1, 'rgba(255,200,130,0)'); x.fillStyle = lg; x.fillRect(0, 0, 1200, 630);
  const pg = x.createLinearGradient(0, 480, 0, 630); pg.addColorStop(0, '#0a1317'); pg.addColorStop(1, '#030506'); x.fillStyle = pg; x.fillRect(0, 520, 1200, 110);
  Scene.figure(x, 905, 560, 520, { lit: .85, pose: G.pose, gaze: .9 });
  x.fillStyle = '#f3ece0'; x.font = '900 118px Georgia, serif'; x.fillText('DEAD AIR', 60, 190); x.fillStyle = '#ff5a4d'; x.font = '800 30px ui-monospace, Menlo, monospace'; x.fillText(`● ${S.name} · ${S.pick.toUpperCase()}`, 64, 250);
  const e = S.end[G.kind]; x.fillStyle = '#fff'; x.font = '800 54px system-ui, sans-serif'; x.fillText(e.h, 60, 360);
  x.fillStyle = '#ffb454'; x.font = '700 40px ui-monospace, Menlo, monospace'; x.fillText(`${clock(G.T)} · night ${G.night}`, 62, 425);
  x.fillStyle = '#a9b8b2'; x.font = '600 28px system-ui, sans-serif'; x.fillText('Can you outlast it? rank-game.com', 62, 570);
  return c;
}
$('bShare').onclick = async (ev) => {
  const e = S.end[G.kind], text = e.share.replace(/\{t\}/g, clock(G.T)).replace(/\{k\}/g, G.night), b = ev.currentTarget;
  try {
    const blob = await new Promise((r) => shareCard().toBlob(r, 'image/png')), file = new File([blob], 'dead-air.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: `${text} ${SITE}` });
    else if (navigator.share) await navigator.share({ title: 'DEAD AIR', text, url: SITE });
    else { await navigator.clipboard.writeText(`${text} ${SITE}`); b.textContent = 'Copied! ✅'; setTimeout(() => (b.textContent = '📣 SHARE'), 2200); }
  } catch {}
};
$('bSave').onclick = () => { const a = document.createElement('a'); a.download = 'dead-air.png'; a.href = shareCard().toDataURL('image/png'); a.click(); };

// ---------- loop ----------
let last = performance.now(), fr = 0;
function frame(now) {
  const dt = Math.min(.1, (now - last) / 1000) * SPEED; last = now; fr++;
  try { update(dt); render(dt); } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}
function update(dt) {
  G.flood = Math.max(0, G.flood - dt / (G.calm ? .6 : 1.2)); G.glitch = Math.max(0, G.glitch - dt * 1.6); G.spike = Math.max(0, G.spike - dt * .45); G.cd = Math.max(0, G.cd - dt);
  if (G.state === 'dying') return dieTick(dt);
  if (G.state === 'dawnseq') return dawnTick(dt);
  if (G.state !== 'play') { G.shownD += (G.D - G.shownD) * Math.min(1, dt * 4); return; }
  G.time += dt; if (G.signAt && G.time >= G.signAt) { G.signAt = 0; signOn(); }
  if (G.final) finalTick(dt); else G.T = Math.min(350, G.T + dt * CLOCK);
  G.cam += clamp(G.view - G.cam, -dt * 3.6, dt * 3.6); const watching = G.cam > .55 && !G.final;
  if (watching && G.D <= 4) G.gaze = Math.min(6, G.gaze + dt); else G.gaze = Math.max(0, G.gaze - dt * .5);
  if (!G.final) {
    if (!watching) { G.contact = 0; if (G.T > 12) { G.unseen += dt * (G.time < G.slowUntil ? .5 : 1); if (G.unseen >= interval()) { G.unseen = 0; stepFigure(1); } } }
    else if (G.gaze >= 5) { G.contact += dt; if (G.contact >= 2) { G.contact = 0; stepFigure(1, true); } } else G.contact = 0;
    // the lot light stutters now and then; if you are watching when it goes out, it may come closer in the dark
    G.nextFlick -= dt; if (G.nextFlick <= 0 && !G.flick) { G.nextFlick = rnd(30, 55); G.flick = { t: 0, dur: rnd(.6, .95), step: G.D <= 4 && G.D > 1 && Math.random() < .55 }; A.flicker(); }
    // small scares: a ring on the internal line with nobody on it, noises in the building, the monitor speaking
    G.nextPhantom -= dt; if (G.nextPhantom <= 0 && !G.call && G.T > 90) { G.nextPhantom = rnd(60, 100); G.phantom = G.time + 3.4; A.ring(true); setTimeout(A.stopRing, 3300); tip('phantom', `${S.lines[1]} just rang. Nobody calls ${S.lines[1]}. Let it ring.`); }
    G.nextOdd -= dt; if (G.nextOdd <= 0 && G.T > 25) { G.nextOdd = rnd(14, 34) * (G.D <= 3 ? .6 : 1) * (G.T > 240 ? .7 : 1); const k = Math.random(); (k < .4 ? A.creak : k < .75 || G.D > 3 ? A.roof : A.breath)(); }
    G.nextGlitch -= dt; if (G.nextGlitch <= 0 && G.D <= 4 && G.cam < .3 && !G.call) { G.nextGlitch = rnd(24, 48) * (G.T > 240 ? .65 : 1); monitorSpeaks(); }
    callTick(dt); if (G.T >= 350 && !G.call) startFinal();
  }
  if (G.flick) { const k = G.flick; k.t += dt; G.dark = Math.sin(k.t * 55) > -.2 ? clamp(Math.sin(k.t / k.dur * Math.PI) * 1.4) : .15; if (k.t >= k.dur) { G.dark = 0; if (k.step && watching) stepFigure(1, true); G.flick = null; } }
  G.shownD = G.cam > .55 ? G.shownD + (G.D - G.shownD) * Math.min(1, dt * (G.D > G.shownD ? 6 : 12)) : G.D;
}
function dieTick(dt) {
  G.dieT += dt; G.cam = Math.min(1, G.cam + dt * 6); G.shownD = Math.max(0, G.shownD - dt * 7); G.glitch = 1; G.face = clamp((G.dieT - .3) / .45); G.dark = 0;
  if (G.dieT > .3 && !G.flashed) { G.flashed = 1; flash(); } if (G.dieT > 1.9) { G.flashed = 0; finish('caught'); }
}
function flash() { if (G.calm) return; const f = $('flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }

let lastVu = -1, lastClock = '', fearNow = 0;
const gc = $('grain'), grain = gc.getContext('2d'); gc.width = Math.min(560, Math.ceil(innerWidth / 2.2)); gc.height = Math.min(360, Math.ceil(innerHeight / 2.2)); const gi = grain.createImageData(gc.width, gc.height);
function render(dt) {
  const st = G.state, fear = clamp(Math.max(clamp((5 - G.D) / 4) * .9, clamp(G.gaze / 5) * .8) + G.spike * .5 + (G.final ? .45 : 0)) * (st === 'play' || st === 'dying' ? 1 : 0);
  document.documentElement.style.setProperty('--fear', fear.toFixed(3)); fearNow = fear;
  if (st === 'play' || st === 'dying') A.mix({ view: G.cam, fear, quiet: G.final?.lis ? 1 : 0 });
  if (G.cam > .01 || st !== 'play') Scene.draw({ D: G.shownD, T: G.T, pose: G.pose, gaze: clamp(G.gaze / 4), flood: G.flood * (G.calm ? .5 : 1), dark: G.calm ? G.dark * .5 : G.dark, dawn: G.dawn, prints: G.prints, glitch: G.calm ? 0 : G.glitch, ghost: G.flick && G.D > 1 ? G.dark : 0, face: G.face, breath: 1, onair: G.onair }, dt);
  const d = $('desk'); d.style.transform = `translateY(${(G.cam * 104).toFixed(1)}%)`; d.style.visibility = G.cam > .985 ? 'hidden' : 'visible';
  $('scene').style.transform = `scale(${(1.1 - .1 * G.cam).toFixed(3)})`;
  document.body.classList.toggle('final', !!G.final); document.body.dataset.v = G.cam > .5 ? 'win' : 'desk'; $('bLook').querySelector('b').textContent = G.view ? '▼ DESK' : '▲ WINDOW';
  const ck = clock(G.T); if (ck !== lastClock) { lastClock = ck; $('clock').textContent = ck; }
  $('bLight').disabled = G.cd > 0 || G.charges <= 0; $('eye').style.opacity = clamp((G.gaze - 1.5) / 2); $('eyeI').style.transform = `scaleX(${clamp(G.gaze / 5)})`;
  if (st === 'play' && G.cam < .9) { const lv = Math.round(clamp(A.level() * 4.5) * 12); if (lv !== lastVu) { lastVu = lv; [...$('vu').children].forEach((b, i) => b.classList.toggle('on', i < lv)); } }
  if (fr % 3 === 0) { const q = gi.data; for (let i = 0; i < q.length; i += 4) { q[i] = q[i + 1] = q[i + 2] = Math.random() < .5 ? 0 : 255; q[i + 3] = Math.random() * (10 + fearNow * 20); } grain.putImageData(gi, 0, 0); }
}

// ---------- input ----------
const key = (e) => {
  if (e.repeat && e.code !== 'Space') return; const k = e.code;
  if (!$('cards').hidden && (k === 'Space' || k === 'Enter')) { e.preventDefault(); return cardGo?.(); }
  if (!$('note').hidden && (k === 'Enter' || k === 'Escape')) { e.preventDefault(); return $('bNoteGo').click(); }
  if (G.state !== 'play') return;
  if (G.final) { if (k === 'Space') { e.preventDefault(); G.holding = true; $('bHold').classList.add('down'); } return; }
  if (k === 'Space') { e.preventDefault(); look(); } else if (k === 'ArrowUp' || k === 'KeyW') look(true); else if (k === 'ArrowDown' || k === 'KeyS') look(false);
  else if (k === 'KeyF') useLight(); else if (k === 'KeyA' || k === 'Enter') { if (G.view === 0 && G.call) air(); } else if (k === 'KeyH' || k === 'Backspace') { if (G.view === 0 && G.call) hang(); } else if (k === 'KeyR') showNote(false);
};
const air = () => { const c = G.call; if (!c || G.state !== 'play' || G.cam > .5) return; if (c.phase === 'ring') answer(); else if (c.phase === 'live' || c.phase === 'decide') putOnAir(); };
const hang = () => { const c = G.call; if (!c || G.state !== 'play' || G.cam > .5 || c.phase === 'closing') return; hangUp(); };
addEventListener('keydown', key);
addEventListener('keyup', (e) => { if (e.code === 'Space') { G.holding = false; $('bHold').classList.remove('down'); } });
const hold = (on) => (e) => { e.preventDefault(); G.holding = on; $('bHold').classList.toggle('down', on); };
$('bHold').addEventListener('pointerdown', hold(true)); for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) $('bHold').addEventListener(ev, hold(false));
addEventListener('blur', () => { G.holding = false; });
const btn = (id, fn) => ($(id).onclick = (e) => { e.currentTarget.blur(); fn(); });
btn('bAir', air); btn('bHang', hang); btn('bLook', () => look()); btn('bDesk', () => look(false)); btn('bLight', useLight); btn('bRules', () => showNote(false)); btn('noteBtn', () => showNote(false));
btn('bOpen', () => finish('door')); btn('bSign', signOff);
btn('bMute', () => { A.mute(!A.muted); $('bMute').textContent = A.muted ? '🔇' : '🔊'; });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { G.away = performance.now(); A.suspend(true); return; } A.suspend(false);
  if (G.state === 'play' && !G.final && G.away && performance.now() - G.away > 3000) { toast('You looked away.', 2600); G.spike = 1; G.glitch = .8; A.say(G.name); if (G.D > 1) stepFigure(1); }
  G.away = 0;
});

Scene.init($('scene')); openTitle(); requestAnimationFrame(frame);
