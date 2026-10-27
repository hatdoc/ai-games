// Toys After Dark: menus, HUD, results, progression. All DOM, driven by game.js (window.tad).
(() => {
  const g = window.tad, G = g.G, S = g.S, A = TADAudio, K = TAD.KINDS, $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const UI = window.UI, esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window; UI.isTouch = isTouch; document.body.classList.toggle('touch', isTouch);
  const SITE = 'https://rank-game.com/games/toys-after-dark';

  // ---------- cosmetics / progression data ----------
  const TINTS = [{ id: 'def', n: 'Factory', c: null, cost: 0 }, { id: 'sun', n: 'Sunset', c: 0xff7a4a, cost: 90 }, { id: 'mint', n: 'Mint', c: 0x5fd6a6, cost: 90 }, { id: 'berry', n: 'Berry', c: 0xc2418f, cost: 140 }, { id: 'sky', n: 'Sky', c: 0x4aa8ff, cost: 140 }, { id: 'gold', n: 'Gold', c: 0xe6b422, cost: 320 }];
  const ACCS = [{ id: '', n: 'None', e: '·', cost: 0 }, { id: 'bow', n: 'Bow', e: '🎀', cost: 60 }, { id: 'shades', n: 'Shades', e: '🕶️', cost: 90 }, { id: 'party', n: 'Party Hat', e: '🥳', cost: 120 }, { id: 'cape', n: 'Cape', e: '🦸', cost: 200 }, { id: 'crown', n: 'Crown', e: '👑', cost: 320 }];
  const EMOTES = [{ id: 'wave', n: 'Wave', e: '👋', cost: 0 }, { id: 'dance', n: 'Dance', e: '💃', cost: 150 }];
  const ACH = [
    { id: 'statue', n: 'PROFESSIONAL STATUE', e: '🗿', d: 'Hold still in front of a human for 8 seconds in one round.', f: (s) => s.frozenObs >= 8 },
    { id: 'magnet', n: 'HUMAN MAGNET', e: '🧲', d: 'Get caught or carried off twice in one round.', f: (s) => s.catches + s.relocated >= 2 },
    { id: 'last', n: 'LAST TOY STANDING', e: '🦾', d: 'Every teammate gets caught while you survive.', f: (s) => s.allBotsDown },
    { id: 'snitch', n: 'CERTIFIED SNITCH', e: '🐀', d: 'Shout WHO DID THAT? right after a teammate is caught.', f: (s) => s.snitch > 0 },
    { id: 'clean', n: 'CLEAN GETAWAY', e: '🧼', d: 'Finish a mission with no catches and suspicion never above 60.', f: (s, w) => w && s.catches === 0 && s.peak < 60 },
    { id: 'worst', n: "WORLD'S WORST TEAMMATE", e: '📢', d: 'Make a noise that gets a teammate caught.', f: (s) => s.worstTm > 0 },
    { id: 'disguise', n: 'MASTER OF DISGUISE', e: '🎭', d: 'Sit through 2 human visits without ever passing ALERT.', f: (s) => s.visitsClean >= 2 },
    { id: 'mm', n: 'ONE MILLIMETRE FROM DISASTER', e: '😰', d: 'Reach 90+ suspicion and survive the round.', f: (s) => s.peak >= 90 && s.catches === 0 },
  ];
  const DAILY = [
    { id: 'd1', t: 'Sit through 3 human visits in one round', f: (s) => s.visits >= 3 }, { id: 'd2', t: 'Complete a mission without being caught', f: (s, w) => w && s.catches === 0 },
    { id: 'd3', t: 'Finish a round without leaving evidence on the floor', f: (s, w) => w && s.evidSeen === 0 }, { id: 'd4', t: 'Hold a freeze in front of a human for 10 seconds', f: (s) => s.frozenObs >= 10 },
    { id: 'd5', t: 'Hide from a human twice in one round', f: (s) => s.hides >= 2 }, { id: 'd6', t: 'Complete a mission in under 150 seconds', f: (s, w) => w && s.completeT < 150 },
    { id: 'd7', t: 'Survive at critical suspicion (90+) and finish', f: (s, w) => w && s.peak >= 90 },
  ];
  const today = () => new Date().toISOString().slice(0, 10), dailyDef = () => DAILY[Math.floor(Date.parse(today()) / 864e5) % DAILY.length];
  if (S.daily.day !== today()) { S.daily = { day: today(), done: false }; g.save(); }
  const owned = (k, id) => S.own[k].includes(id), tintCol = () => (TINTS.find((t) => t.id === S.tintId) || TINTS[0]).c;
  S.tint = tintCol();

  // ---------- helpers ----------
  const show = (id, on) => { const el = $(id); if (el) el.hidden = !on; };
  let alertT = 0, hintT = 0;
  UI.alert = (txt, kind = 'warn', ms = 1800) => { const el = $('#alert'); el.textContent = txt; el.className = 'show ' + kind; clearTimeout(alertT); alertT = setTimeout(() => (el.className = ''), ms); if (kind === 'bad') A.alert(); };
  UI.hint = (txt) => { const el = $('#hint'); el.textContent = txt; el.style.opacity = txt ? 1 : 0; clearTimeout(hintT); if (txt) hintT = setTimeout(() => (el.style.opacity = 0), 4500); };
  UI.toast = (txt) => { const el = document.createElement('div'); el.className = 'toast'; el.textContent = txt; $('#toasts').appendChild(el); setTimeout(() => el.remove(), 2600); };
  UI.say = (e, msg, ms = 1800) => { e.sayMsg = msg; e.sayUntil = performance.now() + ms; };
  UI.carry = () => {};
  UI.incident = (inc) => { UI.toast((inc.type === 'caught' ? '📸 ' : '😂 ') + inc.caption); };
  UI.catchCard = (cap) => { const el = $('#catch'); el.querySelector('b').textContent = cap; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2400); };
  UI.replay = (on, cap) => { show('#replayBar', on); $('#replayBar b').textContent = cap || ''; show('#results', !on && G.mode === 'results'); document.body.classList.toggle('cine', on); };
  UI.step = () => { renderMission(); };

  // ---------- menu ----------
  const mixes = () => { const v = g.level(); $('#lvl').textContent = v.l; $('#xpfill').style.width = (v.x / v.need * 100) + '%'; $('#xptxt').textContent = `${v.x} / ${v.need} XP`; $('#coins').textContent = S.coins; };
  UI.menu = () => { ['#hud', '#results', '#sheet', '#touch', '#catch'].forEach((s) => show(s, false)); show('#menu', true); $('#alert').className = ''; mixes(); const d = dailyDef(); $('#dailyTxt').textContent = d.t; $('#dailyState').textContent = S.daily.done ? '✔ Done today' : '+150 🪙'; document.body.classList.remove('cine'); };
  const ensureAudio = () => { A.resume(); applyAudio(); };
  function applyAudio() { Object.assign(A.vol, { master: S.set.master, music: S.set.music, sfx: S.set.sfx, amb: S.set.amb }); A.setVol(); }
  function applyQuality() { const q = S.set.quality; TAD.renderer.shadowMap.enabled = q !== 'low'; TAD.lamp.castShadow = q === 'high'; TAD.renderer.setPixelRatio(q === 'low' ? 1 : Math.min(devicePixelRatio, q === 'high' ? 2 : 1.5)); TAD.renderer.setSize(innerWidth, innerHeight, false); TAD.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); document.body.classList.toggle('calm', !!S.set.calm); }
  const pickMission = () => { const pool = g.MISSIONS.filter((m) => !S.lastM || m.id !== S.lastM); return pool[Math.random() * pool.length | 0].id; };
  function play(id) { ensureAudio(); id = id || pickMission(); S.lastM = id; show('#menu', false); show('#sheet', false); show('#results', false); show('#hud', true); show('#touch', isTouch); show('#catch', true); g.startRound(id); G.rewarded = false; }
  UI.startRound = () => { renderMission(); renderTeam(); UI.hint(isTouch ? 'Hold FREEZE when the door opens. Tap ACT to grab things.' : 'WASD move · hold F to freeze · E to interact · Q drop · Space ability'); };

  // ---------- sheets ----------
  function sheet(title, html, cls = '') { $('#sheet').hidden = false; $('#sheet').className = cls; $('#sheetBody').innerHTML = `<div class="sh-head"><h2>${title}</h2><button class="x" data-x>✕</button></div>${html}`; $('#sheet').querySelector('[data-x]').onclick = closeSheet; }
  function closeSheet() { $('#sheet').hidden = true; if (G.mode === 'play' && G.paused) { G.paused = false; } }
  function missionsSheet() {
    sheet('MISSIONS', '<div class="mgrid">' + g.MISSIONS.map((m) => `<button class="mcard" data-m="${m.id}"><span class="me">${m.emoji}</span><b>${m.name}</b><small>${m.blurb}</small><i>${m.steps.length} steps · ${m.time}s ${S.done[m.id] ? '· ★ done' : ''}</i></button>`).join('') + '</div>');
    $$('[data-m]').forEach((b) => (b.onclick = () => { A.click(); play(b.dataset.m); }));
  }
  function toysSheet() {
    const tab = toysSheet.tab || 'toys', lv = g.level().l;
    let body = '';
    if (tab === 'toys') body = '<div class="kgrid">' + Object.entries(K).map(([id, k]) => { const lock = !owned('kind', id) && lv < g.KIND_LVL[id]; return `<button class="kcard ${S.kind === id ? 'sel' : ''} ${lock ? 'lock' : ''}" data-k="${id}"><span class="ke">${k.emoji}</span><b>${k.name}</b><small>${k.desc}</small><i>${lock ? '🔒 Level ' + g.KIND_LVL[id] : S.kind === id ? '✔ Selected' : 'Ability: ' + k.ability}</i></button>`; }).join('') + '</div>';
    else { const row = (arr, k, sel, lab) => `<h3>${lab}</h3><div class="crow">` + arr.map((x) => `<button class="cc ${sel(x) ? 'sel' : ''}" data-c="${k}:${x.id}"><span>${x.e || '●'}</span><b>${x.n}</b><i>${owned(k, x.id) ? (sel(x) ? 'Equipped' : 'Owned') : '🪙 ' + x.cost}</i></button>`).join('') + '</div>'; body = row(TINTS.map((t) => ({ ...t, e: '' })), 'tint', (x) => S.tintId === x.id, 'Colours') + row(ACCS, 'acc', (x) => S.acc === x.id, 'Accessories') + row(EMOTES, 'emote', (x) => S.emote === x.id, 'Emotes &amp; victory dance'); }
    sheet('YOUR TOYS', `<div class="tabs"><button class="${tab === 'toys' ? 'on' : ''}" data-t="toys">Characters</button><button class="${tab === 'cos' ? 'on' : ''}" data-t="cos">Cosmetics · 🪙 ${S.coins}</button></div>` + body);
    $$('[data-t]').forEach((b) => (b.onclick = () => { toysSheet.tab = b.dataset.t; toysSheet(); }));
    $$('[data-k]').forEach((b) => (b.onclick = () => { const id = b.dataset.k; if (!owned('kind', id) && lv < g.KIND_LVL[id]) { UI.toast('Reach level ' + g.KIND_LVL[id] + ' to unlock'); return; } if (!owned('kind', id)) S.own.kind.push(id); S.kind = id; g.save(); A.click(); toysSheet(); }));
    $$('[data-c]').forEach((b) => (b.onclick = () => {
      const [k, id] = b.dataset.c.split(':'), list = k === 'tint' ? TINTS : k === 'acc' ? ACCS : EMOTES, it = list.find((x) => x.id === id);
      if (!owned(k, id)) { if (S.coins < it.cost) { UI.toast('Not enough coins. Play missions to earn more.'); return; } S.coins -= it.cost; S.own[k].push(id); UI.toast('Unlocked ' + it.n + '!'); }
      if (k === 'tint') { S.tintId = id; S.tint = it.c; } else if (k === 'acc') S.acc = id; else S.emote = id; g.save(); A.click(); mixes(); toysSheet();
    }));
  }
  function dailySheet() { const d = dailyDef(); sheet('DAILY CHALLENGE', `<div class="big"><p class="chal">${d.t}</p><p>${S.daily.done ? '✔ Completed today. A new one arrives tomorrow.' : 'Finish it in any mission for +150 🪙 and +60 XP.'}</p></div><h3>Achievements</h3><div class="ach">` + ACH.map((a) => `<div class="a ${S.ach[a.id] ? 'got' : ''}"><span>${a.e}</span><b>${a.n}</b><small>${a.d}</small></div>`).join('') + '</div>'); }
  function recordsSheet() {
    const r = S.rec; sheet('RECORDS', `<div class="stats"><div><b>${r.rounds}</b>Rounds</div><div><b>${r.wins}</b>Missions done</div><div><b>${r.bestScore}</b>Best score</div><div><b>${r.bestTime ? r.bestTime + 's' : '-'}</b>Fastest</div><div><b>${r.catches}</b>Times caught</div></div><div id="lbHost2"></div>`);
    try { leaderboard($('#lbHost2'), 'toys-after-dark').show(0); } catch (e) { /* offline */ }
  }
  function settingsSheet() {
    const s = S.set, sl = (k, lab, mn, mx, st) => `<label class="row">${lab}<input type="range" data-s="${k}" min="${mn}" max="${mx}" step="${st}" value="${s[k]}"></label>`, ck = (k, lab) => `<label class="row">${lab}<input type="checkbox" data-s="${k}" ${s[k] ? 'checked' : ''}></label>`;
    sheet('SETTINGS', '<div class="set"><h3>Audio</h3>' + sl('master', 'Master', 0, 1, 0.05) + sl('music', 'Music', 0, 1, 0.05) + sl('sfx', 'Sound effects', 0, 1, 0.05) + sl('amb', 'Ambience', 0, 1, 0.05) + '<h3>Camera &amp; controls</h3>' + sl('sens', 'Camera sensitivity', 0.3, 2.5, 0.1) + sl('cam', 'Camera distance', 0.6, 1.5, 0.05) + `<label class="row">Graphics<select data-s="quality">${['low', 'medium', 'high'].map((q) => `<option ${s.quality === q ? 'selected' : ''}>${q}</option>`).join('')}</select></label>` + '<h3>Accessibility</h3>' + ck('calm', 'Reduce screen shake &amp; effects') + ck('assist', 'Auto-freeze when a human can see you') + '<h3>Controls</h3><p class="keys"><kbd>WASD</kbd> move · <kbd>F</kbd> hold to freeze · <kbd>E</kbd> interact / hold to work · <kbd>Q</kbd> drop · <kbd>Space</kbd> ability · <kbd>T</kbd> emote · <kbd>1-6</kbd> quick chat · drag mouse to turn camera · <kbd>P</kbd> pause</p></div>');
    $$('[data-s]').forEach((el) => (el.oninput = el.onchange = () => { const k = el.dataset.s; S.set[k] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value; g.save(); applyAudio(); if (k === 'quality' || k === 'calm') applyQuality(); }));
  }
  UI.pause = () => { if (G.mode !== 'play') return; if (G.paused) { G.paused = false; $('#sheet').hidden = true; return; } G.paused = true; sheet('PAUSED', '<div class="pbtns"><button class="btn pri" id="pRes">Resume</button><button class="btn" id="pSet">Settings</button><button class="btn" id="pQuit">Quit to menu</button></div>'); $('#pRes').onclick = () => { G.paused = false; $('#sheet').hidden = true; }; $('#pSet').onclick = settingsSheet; $('#pQuit').onclick = () => { G.paused = false; $('#sheet').hidden = true; g.toMenu(); }; };

  // ---------- HUD ----------
  function renderMission() {
    if (!G.def) return; const d = G.def;
    $('#mName').innerHTML = `<span>${d.emoji}</span> ${d.name}`;
    $('#mSteps').innerHTML = d.steps.map((s, i) => `<li class="${i < G.step ? 'done' : i === G.step ? 'cur' : ''}">${i < G.step ? '✔' : i === G.step ? '▶' : '○'} ${esc(g.stepText(s))}</li>`).join('');
    const sd = G.stats && G.stats.side || {}; $('#side').innerHTML = `<span class="${sd.cool ? '' : 'fail'}">🧊 Never hit 80 suspicion</span><span class="${sd.statue ? 'ok' : ''}">🗿 Freeze 8s in sight</span><span class="${G.stats && G.stats.completeT && G.stats.completeT < d.time * 0.7 ? 'ok' : ''}">⚡ Finish in ${Math.round(d.time * 0.7)}s</span>`;
  }
  function renderTeam() {
    $('#team').innerHTML = [g.P, ...g.bots].map((e, i) => `<div class="tm" data-i="${i}"><span class="ti">${K[e.kind].emoji}</span><b>${i ? esc(e.name) : 'You'}</b><i class="dot"></i></div>`).join('') + '<div class="lives" id="lives"></div>';
  }
  const fmt = (t) => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  let hudT = 0;
  UI.hud = () => {
    const P = g.P, H = g.H, bots = g.bots; if (!P) return; hudT++;
    $('#timer').textContent = fmt(Math.max(0, G.timeLeft)); $('#timer').classList.toggle('low', G.timeLeft < 30);
    const s = P.susp, st = g.suspState(s), seen = H && g.hSees(P);
    $('#suspFill').style.width = s + '%'; $('#susp').dataset.st = st[1]; $('#suspLbl').textContent = st[2]; $('#suspNum').textContent = Math.round(s);
    const sc = $('#status'); let txt = '', cls = '';
    if (P.hidden) { txt = '🫥 HIDDEN'; cls = 'ok'; } else if (seen) { if (P.speedNow > 0.9) { txt = '👁 MOVING! FREEZE!'; cls = 'bad'; } else if (P.frozen) { txt = '😶 PERFECT STATUE'; cls = 'ok'; } else { txt = '👁 ACT NATURAL: HOLD FREEZE'; cls = 'warn'; } } else if (H && (H.phase === 'in' || H.phase === 'leave')) { txt = '🙈 OUT OF SIGHT'; cls = 'ok'; } else { txt = ''; }
    sc.textContent = txt; sc.className = cls; document.body.classList.toggle('danger', !G.set && s >= 75 && !S.set.calm);
    // human proximity
    const hp = $('#prox');
    if (H && H.phase !== 'away' && !(H.phase === 'warn' && H.fake && H.warnT < 0.5)) {
      const tx = H.phase === 'warn' ? 0 : H.x, tz = H.phase === 'warn' ? -26 : H.z, d = Math.hypot(tx - P.x, tz - P.z), ang = Math.atan2(tx - P.x, tz - P.z) + g.cy; // arrow relative to view
      hp.hidden = false; $('#proxA').style.transform = `rotate(${(Math.PI - ang) * 180 / Math.PI}deg)`; $('#proxT').textContent = (H.type === 'mom' ? 'MOM' : 'KID') + ' · ' + (H.phase === 'warn' ? 'APPROACHING' : seen ? 'LOOKING AT YOU' : Math.round(d) + ' steps'); hp.dataset.l = H.phase === 'warn' ? 'warn' : seen ? 'seen' : 'near';
    } else hp.hidden = true;
    // prompt
    const pr = $('#prompt'); let p = '';
    if (P.out > 0) p = `Timeout in the toy box… back in ${Math.ceil(P.out)}s`;
    else if (P.hidden) p = `${isTouch ? 'ACT' : 'E'} – come out`;
    else if (!P.carry && g.items.some((i) => !i.held && i !== G.target && Math.hypot(P.x - i.x, P.z - i.z) < 3.4)) p = `${isTouch ? 'ACT' : 'E'} – pick it back up`;
    else if (G.cur) {
      const t = G.target, dd = t ? Math.hypot(P.x - t.x, P.z - t.z) : 99;
      if (G.cur.t === 'get' && !P.carry && dd < 3.4) p = `${isTouch ? 'ACT' : 'E'} – pick up ${G.cur.name}`;
      else if (G.cur.t === 'drop' && P.carry && dd < t.r) p = `${isTouch ? 'ACT' : 'E'} – drop it at ${t.label || 'Toy HQ'}`;
      else if (G.cur.t === 'use' && dd < t.r) p = G.prog > 0 ? `Working… ${Math.round(G.prog / G.cur.time * 100)}%` : `Hold ${isTouch ? 'ACT' : 'E'} – ${G.cur.text}`;
      else { const hd = TAD.HIDES.filter((h) => !h.small || P.kind === 'explorer').find((h) => Math.hypot(P.x - h.x, P.z - h.z) < 3.2); if (hd) p = `${isTouch ? 'ACT' : 'E'} – hide ${hd.n}`; }
    }
    pr.textContent = p; pr.classList.toggle('on', !!p);
    $('#prog').style.width = (G.cur && G.cur.t === 'use' ? G.prog / G.cur.time * 100 : 0) + '%'; $('#progw').classList.toggle('on', G.cur && G.cur.t === 'use' && G.prog > 0);
    // abilities
    const ab = $('#bAbility'); ab.dataset.cd = P.cd.ab > 0 ? Math.ceil(P.cd.ab) : ''; ab.classList.toggle('cd', P.cd.ab > 0); $('#bAbility b').textContent = K[P.kind].ability;
    $('#bFreeze').classList.toggle('on', P.frozen);
    // team
    if ($$('#team .tm').length !== bots.length + 1) renderTeam();
    if (hudT % 6 === 0) { renderMission(); $$('#team .tm').forEach((el, i) => { const e = i ? bots[i - 1] : P; el.className = 'tm ' + (e.out > 0 ? 'out' : e.frozen ? 'fz' : e.hidden ? 'hid' : ''); }); const lv = $('#lives'); if (lv) lv.textContent = '❤'.repeat(Math.max(0, 3 - G.strikes)) + '🖤'.repeat(Math.min(3, G.strikes)); }
    // name tags and bubbles
    const lb = $('#labels'); const ents = [P, ...bots]; while (lb.children.length < ents.length) lb.appendChild(document.createElement('div'));
    ents.forEach((e, i) => { const el = lb.children[i]; const v = new TAD.T.Vector3(e.x, 5.4, e.z).project(TAD.camera); const vis = v.z < 1 && !e.hidden && !(e.out > 0) && G.mode === 'play'; el.style.display = vis ? '' : 'none'; if (!vis) return; el.style.transform = `translate(${(v.x * 0.5 + 0.5) * innerWidth}px,${(-v.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,-100%)`; const say = e.sayUntil > performance.now() ? `<div class="bub">${esc(e.sayMsg)}</div>` : ''; const html = say + (i ? `<span class="nt">${esc(e.name)}</span>` : '<span class="nt me">YOU</span>'); if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; } });
    // keep catch caption alive
  };

  // ---------- results ----------
  function computeAwards() {
    const st = G.stats, won = G.won, list = ACH.filter((a) => a.f(st, won)); const fresh = list.filter((a) => !S.ach[a.id]); fresh.forEach((a) => (S.ach[a.id] = 1)); return { list, fresh };
  }
  UI.results = () => {
    show('#hud', false); show('#touch', false); const st = G.stats, won = G.won, d = G.def, side = st.side;
    side.fast = !!(won && st.completeT < d.time * 0.7);
    const sideN = (side.cool ? 1 : 0) + (side.statue ? 1 : 0) + (side.fast ? 1 : 0), sideDone = won ? sideN : 0;
    const base = won ? 90 : 20 + st.steps * 12, xp = Math.round(base + 40 + sideDone * 30 + (won ? Math.floor(G.timeLeft / 10) : 0) + (st.peak < 50 && won ? 40 : 0) - st.catches * 5), coins = Math.round(xp * 0.55);
    const score = won ? Math.max(100, Math.round(1000 + G.timeLeft * 4 + (st.peak < 50 ? 300 : 0) + sideDone * 150 - st.catches * 100)) : st.steps * 80;
    const aw = computeAwards(); let dailyHit = false; const dd = dailyDef();
    if (!G.rewarded) { // rewards are granted exactly once per round
      G.rewarded = true; const r = S.rec; r.rounds++; r.catches += st.catches; if (won) { r.wins++; S.done[d.id] = 1; r.bestTime = r.bestTime ? Math.min(r.bestTime, Math.round(st.completeT)) : Math.round(st.completeT); } r.bestScore = Math.max(r.bestScore, score);
      S.xp += xp; S.coins += coins; if (!S.daily.done && dd.f(st, won)) { S.daily.done = true; S.xp += 60; S.coins += 150; dailyHit = true; } g.save();
    }
    const best = G.lastCatch;
    const title = won ? 'MISSION COMPLETE!' : G.why === 'caught' ? 'THE HUMANS KNOW…' : "TIME'S UP!";
    const cards = st.incidents.slice(-3).map((i, n) => `<div class="inc"><span>${i.type === 'caught' ? K[i.kind].emoji : '😂'}</span><b>${esc(i.caption)}</b><small>${esc(i.name)} · ${i.t}s${i.type === 'caught' ? ' · ' + i.susp + ' susp' : ''}</small></div>`).join('') || '<div class="inc"><span>😇</span><b>NOT A SINGLE INCIDENT</b><small>suspiciously perfect</small></div>';
    $('#results').innerHTML = `<div class="rpanel"><div class="rtitle ${won ? 'win' : 'lose'}">${title}</div><div class="rsub">${d.emoji} ${d.name} · ${st.steps}/${d.steps.length} steps · ${fmt(d.time - G.timeLeft)}</div>
      <div class="rgrid"><div><b>${Math.round(st.peak)}</b>peak suspicion</div><div><b>${st.visits}</b>human visits</div><div><b>${st.catches}</b>caught</div><div><b>${Math.round(st.frozenObs)}s</b>frozen in sight</div></div>
      <h3>Awards</h3><div class="awards">${aw.list.length ? aw.list.map((a) => `<div class="aw"><span>${a.e}</span><b>${a.n}</b></div>`).join('') : '<div class="aw dim"><span>🫥</span><b>NO AWARDS. BORING.</b></div>'}</div>
      <h3>Memorable incidents</h3><div class="incs">${cards}</div>
      <div class="rew"><span>+${xp} XP</span><span>+${coins} 🪙</span>${dailyHit ? '<span class="gold">DAILY DONE +150 🪙</span>' : ''}${sideDone ? `<span class="gold">${sideDone} side objective${sideDone > 1 ? 's' : ''}</span>` : ''}<span class="sc">Score ${score}</span></div>
      <div class="rbtns"><button class="btn pri" id="rAgain">Next mission</button><button class="btn" id="rRetry">Retry</button>${best ? '<button class="btn" id="rReplay">▶ Replay catch</button>' : ''}<button class="btn" id="rShare">📸 Save incident card</button><button class="btn ghost" id="rMenu">Menu</button></div><div id="lbHost"></div></div>`;
    show('#results', true); mixes(); A.music(won ? 'victory' : 'suspicion'); if (!won) A.sting();
    $('#rAgain').onclick = () => { A.click(); play(); }; $('#rRetry').onclick = () => { A.click(); play(G.def.id); }; $('#rMenu').onclick = () => { A.click(); g.toMenu(); };
    if (best) $('#rReplay').onclick = () => { A.click(); g.startReplay(best); };
    $('#rShare').onclick = () => shareCard(st.incidents.slice(-1)[0] || { caption: won ? 'CLEAN GETAWAY. NOBODY KNOWS.' : 'WE TRIED.', kind: g.P.kind, name: 'You', t: 0 }, score, won);
    if (aw.fresh.length) setTimeout(() => aw.fresh.forEach((a, i) => setTimeout(() => UI.toast('🏆 Achievement: ' + a.n), i * 800)), 600);
    try { if (score > 0) leaderboard($('#lbHost'), 'toys-after-dark').show(Math.min(score, 6000)); } catch (e) { /* offline */ }
  };
  function shareCard(inc, score, won) { // an actual PNG made on a canvas (no fake video claims)
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 0, 1350); gr.addColorStop(0, '#2a1f55'); gr.addColorStop(1, '#120d28'); x.fillStyle = gr; x.fillRect(0, 0, 1080, 1350);
    x.fillStyle = '#ffb347'; x.font = '800 64px system-ui,sans-serif'; x.textAlign = 'center'; x.fillText('TOYS AFTER DARK', 540, 130);
    x.font = '420px "Apple Color Emoji","Segoe UI Emoji",sans-serif'; x.fillText(K[inc.kind] ? K[inc.kind].emoji : '🧸', 540, 640);
    x.fillStyle = '#fff'; x.font = '800 70px system-ui,sans-serif'; const words = inc.caption.split(' '); let line = '', y = 860; words.forEach((w) => { if (x.measureText(line + w).width > 920) { x.fillText(line.trim(), 540, y); y += 84; line = ''; } line += w + ' '; }); x.fillText(line.trim(), 540, y);
    x.fillStyle = '#b9b3dc'; x.font = '600 38px system-ui,sans-serif'; x.fillText(`${inc.name} · ${inc.t}s in · Score ${score}`, 540, y + 90);
    x.fillStyle = '#ffb347'; x.font = '700 44px system-ui,sans-serif'; x.fillText(SITE.replace('https://', ''), 540, 1270);
    c.toBlob((b) => { const f = new File([b], 'toys-after-dark.png', { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], text: inc.caption + ' ' + SITE }).catch(() => {}); else { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'toys-after-dark.png'; a.click(); UI.toast('Incident card saved'); } });
  }

  // ---------- touch controls ----------
  if (isTouch) {
    const zone = $('#joyzone'), knob = $('#knob'); let id = null, cx = 0, cyy = 0;
    zone.addEventListener('pointerdown', (e) => { id = e.pointerId; zone.setPointerCapture(id); const r = zone.getBoundingClientRect(); cx = r.left + r.width / 2; cyy = r.top + r.height / 2; mv(e); });
    const mv = (e) => { let dx = (e.clientX - cx) / 55, dy = (e.clientY - cyy) / 55; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } window.joy.on = true; window.joy.x = dx; window.joy.y = -dy; knob.style.transform = `translate(${dx * 40}px,${dy * 40}px)`; window.recompute(); };
    zone.addEventListener('pointermove', (e) => { if (e.pointerId === id) mv(e); });
    const end = (e) => { if (e.pointerId !== id) return; id = null; window.joy.on = false; window.joy.x = window.joy.y = 0; knob.style.transform = ''; window.recompute(); };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
    const hold = (sel, on, off) => { const b = $(sel); b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); on(); }); ['pointerup', 'pointercancel'].forEach((ev) => b.addEventListener(ev, off)); };
    hold('#bFreeze', () => (g.input.freeze = true), () => (g.input.freeze = false)); hold('#bAct', () => { g.input.act = true; g.input.actEdge = true; }, () => (g.input.act = false));
    hold('#bAbility', () => (g.input.ability = true), () => {}); hold('#bDrop', () => (g.input.drop = true), () => {});
    $('#bPause').onclick = UI.pause;
  } else { $('#bFreeze').addEventListener('pointerdown', () => (g.input.freeze = true)); addEventListener('pointerup', () => { if (!down()) g.input.freeze = false; }); const down = () => false; $('#bAct').onclick = () => { g.input.actEdge = true; }; $('#bAbility').onclick = () => (g.input.ability = true); $('#bDrop').onclick = () => (g.input.drop = true); $('#bPause').onclick = UI.pause; }
  $$('#chat button').forEach((b, i) => (b.onclick = () => g.chat(i)));

  // ---------- wiring ----------
  $('#btnPlay').onclick = () => { A.click(); play(); };
  $('#btnMissions').onclick = () => { ensureAudio(); A.click(); missionsSheet(); }; $('#btnToys').onclick = () => { ensureAudio(); A.click(); toysSheet(); }; $('#btnDaily').onclick = () => { ensureAudio(); A.click(); dailySheet(); };
  $('#btnRecords').onclick = () => { ensureAudio(); A.click(); recordsSheet(); }; $('#btnSettings').onclick = () => { ensureAudio(); A.click(); settingsSheet(); };
  $('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') closeSheet(); });
  $('#replayBar button').onclick = () => g.stopReplay();
  addEventListener('keydown', (e) => { if (e.key === 'Enter' && G.mode === 'menu' && $('#sheet').hidden) { A.click(); play(); } });
  // first user gesture unlocks audio
  addEventListener('pointerdown', () => { A.resume(); applyAudio(); }, { once: true });
  addEventListener('resize', () => TAD.resize());
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'play' && !G.paused) UI.pause(); });
  applyQuality(); UI.menu();
  window.tadUI = { play, TINTS, ACCS, DAILY, ACH, dailyDef, sheets: { missionsSheet, toysSheet, dailySheet, recordsSheet, settingsSheet }, applyQuality, applyAudio };
})();
