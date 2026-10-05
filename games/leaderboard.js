// Shared leaderboard for games without their own (Demolition Rush has a custom one).
// Firestore, public read / create-only; rules live in the blog repo's firebase/ folder:
// a new game needs its slug and max score added to the games/{game}/scores rule there.
// Usage: const lb = leaderboard(containerEl, 'my-game'); then lb.show(score) at game over.
// Optional 3rd arg formats the stored integer for display, e.g. (g) => `${(g / 1000).toFixed(2)} kg`.
(() => {
  const FS = 'https://firestore.googleapis.com/v1/projects/hatdoc-blog-1048/databases/(default)/documents';
  const FKEY = 'AIzaSyDz5J34ahi7fP48CU2cPrp1FNmqK-20D5E';
  const BAD = /f+u+c+k|sh[i1]t|b[i1]tch|cunt|n[i1]gg|fag|dick|pussy|씨발|시발|병신|좆|썅|개새/i;
  const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  document.head.insertAdjacentHTML('beforeend', `<style>
    .lb { width: min(320px, 90vw); text-align: left; font: 14px system-ui, sans-serif; color: #fff; }
    .lb h3 { margin: 0 0 6px; font-size: 13px; letter-spacing: 1px; opacity: .7; text-align: center; }
    .lb form { display: flex; gap: 6px; margin-bottom: 8px; }
    .lb form[hidden] { display: none; }
    .lb input { flex: 1; min-width: 0; font: 700 15px system-ui, sans-serif; padding: 9px 10px; border-radius: 10px;
      border: 2px solid #fff4; background: #0006; color: #fff; }
    .lb form button { font: 700 15px system-ui, sans-serif; padding: 9px 14px; border: 0; border-radius: 10px;
      background: #ffd84a; color: #111; cursor: pointer; }
    .lb ol { list-style: none; margin: 0; padding: 0; max-height: 34vh; overflow-y: auto; }
    .lb li { display: flex; gap: 8px; padding: 5px 10px; border-radius: 8px; }
    .lb li:nth-child(odd) { background: #ffffff14; }
    .lb li.me { background: #ffd84a33; outline: 2px solid #ffd84a; }
    .lb .rk { width: 28px; opacity: .7; font-weight: 800; }
    .lb .nm { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .lb .sc { font-weight: 800; font-variant-numeric: tabular-nums; }
    .lb .muted { justify-content: center; opacity: .6; background: none !important; }
  </style>`);

  window.leaderboard = (root, game, fmt = String) => {
    const path = `${FS}/games/${game}/scores`;
    const myIds = new Set(get(`lb-ids-${game}`, []));
    root.classList.add('lb');
    root.innerHTML = `<h3>🏆 TOP 10</h3>
      <form><input maxlength="14" placeholder="Your name" autocomplete="off"><button>Submit</button></form><ol></ol>`;
    const form = root.querySelector('form'), input = form.querySelector('input'), btn = form.querySelector('button');
    const list = root.querySelector('ol');
    let score = 0;
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
          if (myIds.has(d.name)) li.className = 'me';
          for (const [cls, text] of [['rk', ['🥇', '🥈', '🥉'][i] || i + 1], ['nm', d.fields.name.stringValue], ['sc', fmt(+d.fields.score.integerValue)]]) {
            const s = document.createElement('span'); s.className = cls; s.textContent = text; li.append(s);
          }
          list.append(li);
        });
      } catch { msg('Leaderboard is offline right now.'); }
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let name = input.value.replace(/\s+/g, ' ').trim().slice(0, 14);
      if (!name) return input.focus();
      if (BAD.test(name)) name = 'Player';
      set('lb-name', name);
      btn.disabled = true; btn.textContent = '…';
      try {
        const res = await fetch(`${path}?key=${FKEY}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { name: { stringValue: name }, score: { integerValue: String(score) } } }),
        });
        if (!res.ok) throw 0;
        myIds.add((await res.json()).name); set(`lb-ids-${game}`, [...myIds]);
        form.hidden = true;
        load();
      } catch { btn.disabled = false; btn.textContent = 'Retry'; }
    });

    return {
      show(s) {
        score = Math.floor(s);
        input.value = get('lb-name', '');
        btn.disabled = false; btn.textContent = 'Submit';
        form.hidden = score <= 0;
        load();
      },
    };
  };
})();
