// Shared leaderboard for games without their own (Demolition Rush has a custom one).
// Firestore, public read; only players signed in on rank-game.com with a nickname can rank (via cloudsave.js's
// rgAuth, so load cloudsave.js first). Rules live in the blog repo's firebase/ folder:
// a new game needs its slug and max score added to the games/{game}/scores rule there.
// Usage: const lb = leaderboard(containerEl, 'my-game'); then lb.show(score) at game over.
// Optional 3rd arg formats the stored integer for display, e.g. (g) => `${(g / 1000).toFixed(2)} kg`.
(() => {
  const FS = 'https://firestore.googleapis.com/v1/projects/hatdoc-blog-1048/databases/(default)/documents';
  const FKEY = 'AIzaSyDz5J34ahi7fP48CU2cPrp1FNmqK-20D5E';

  document.head.insertAdjacentHTML('beforeend', `<style>
    .lb { width: min(320px, 90vw); text-align: left; font: 14px system-ui, sans-serif; color: #fff; }
    .lb h3 { margin: 0 0 6px; font-size: 13px; letter-spacing: 1px; opacity: .7; text-align: center; }
    .lb .act { display: block; margin: 0 auto 8px; font: 700 15px system-ui, sans-serif; padding: 9px 14px; border: 0;
      border-radius: 10px; background: #ffd84a; color: #111; cursor: pointer; }
    .lb .act[hidden] { display: none; }
    .lb .note a { color: #ffd84a; }
    .lb ol { list-style: none; margin: 0; padding: 0; max-height: 34vh; overflow-y: auto; }
    .lb li { display: flex; gap: 8px; padding: 5px 10px; border-radius: 8px; }
    .lb li:nth-child(odd) { background: #ffffff14; }
    .lb li.me { background: #ffd84a33; outline: 2px solid #ffd84a; }
    .lb .rk { width: 28px; opacity: .7; font-weight: 800; }
    .lb .nm { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .lb .sc { font-weight: 800; font-variant-numeric: tabular-nums; }
    .lb .muted { justify-content: center; opacity: .6; background: none !important; }
    .lb .note { text-align: center; font-size: 13px; opacity: .8; margin: -2px 0 8px; }
    .lb .note[hidden] { display: none; }
  </style>`);

  // Top scores of a board, highest first (for showing a live rank while playing)
  window.leaderboardTop = async (game, n = 100) => {
    const res = await fetch(`${FS}/games/${game}:runQuery?key=${FKEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'scores' }], orderBy: [{ field: { fieldPath: 'score' }, direction: 'DESCENDING' }], limit: n } }),
    });
    if (!res.ok) throw new Error('leaderboard ' + res.status);
    return (await res.json()).filter((r) => r.document).map((r) => +r.document.fields.score.integerValue);
  };

  window.leaderboard = (root, game, fmt = String) => {
    const A = window.rgAuth || { onSite: false };
    root.classList.add('lb');
    root.innerHTML = `<h3>🏆 TOP 10</h3><div class="note" hidden></div><button class="act" hidden></button><ol></ol>`;
    const btn = root.querySelector('.act'), list = root.querySelector('ol'), note = root.querySelector('.note');
    let score = 0, done = true, busy = false;
    const say = (html) => { note.innerHTML = html; note.hidden = !html; };
    const esc = (t) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
    if (A.onSite) { window.rgHasBoard = true; parent.postMessage({ type: 'rg-board' }, 'https://rank-game.com'); } // page shows the nickname box / sign-in prompt
    // Keep game keyboard/touch handlers from reacting to typing or taps in the panel.
    for (const ev of ['keydown', 'pointerdown', 'touchstart', 'touchend']) root.addEventListener(ev, (e) => e.stopPropagation());

    const msg = (t) => { list.innerHTML = ''; const li = document.createElement('li'); li.className = 'muted'; li.textContent = t; list.append(li); };
    async function load() {
      msg('Loading…');
      try {
        const res = await fetch(`${FS}/games/${game}:runQuery?key=${FKEY}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'scores' }],
            orderBy: [{ field: { fieldPath: 'score' }, direction: 'DESCENDING' }], limit: 10 } }),
        });
        if (!res.ok) throw 0;
        const rows = (await res.json()).filter((r) => r.document);
        if (!rows.length) return msg('No scores yet. Be the first!');
        list.innerHTML = '';
        rows.forEach(({ document: d }, i) => {
          const li = document.createElement('li');
          if (A.user && d.name.endsWith('/' + A.user.uid)) li.className = 'me';
          for (const [cls, text] of [['rk', ['🥇', '🥈', '🥉'][i] || i + 1], ['nm', d.fields.name.stringValue], ['sc', fmt(+d.fields.score.integerValue)]]) {
            const s = document.createElement('span'); s.className = cls; s.textContent = text; li.append(s);
          }
          list.append(li);
        });
      } catch { msg('Leaderboard is offline right now.'); }
    }

    // what to show under "TOP 10" after a game, depending on sign-in; signed in with a nickname = save automatically
    async function update() {
      btn.hidden = true;
      if (done || score <= 0) return;
      if (!A.onSite) return say('🔒 Play on <a href="https://rank-game.com" target="_blank">rank-game.com</a> and sign in to rank');
      if (!A.user) { say(''); btn.textContent = '🔑 Sign in to save this score'; btn.onclick = A.login; btn.hidden = false; return; }
      if (!A.user.nick) return say('✏️ Pick a nickname under the game to save this score');
      if (busy) return;
      busy = true; say('Saving…');
      try {
        const best = await A.submit(`games/${game}/scores`, score);
        done = true;
        say(best >= score ? `Your best here is ${esc(fmt(best))}, so it stays.`
          : best !== null ? `🎉 New best for ${esc(A.user.nick)}! (was ${esc(fmt(best))})` : `Saved as ${esc(A.user.nick)}`);
        load();
      } catch { say("Couldn't save."); btn.textContent = 'Retry'; btn.onclick = update; btn.hidden = false; }
      busy = false;
    }
    addEventListener('rg-auth', () => { update(); load(); });

    return {
      show(s) {
        score = Math.floor(s); done = false; say('');
        update();
        load();
      },
    };
  };
})();
