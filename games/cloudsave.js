// Cloud save for games embedded on rank-game.com. Players sign in on the site; the page sends this frame a Firebase
// ID token (postMessage), and the game's localStorage save is mirrored to Firestore saves/{uid}/games/{game}.
// Played anywhere else (itch.io, the github.io link) nothing changes: saves stay in the browser.
// Usage, before the game's own script:  <script src="../cloudsave.js" data-game="beat-bloom" data-keys="beatbloom-save"></script>
// data-keys: space-separated localStorage keys; a trailing * matches a prefix (e.g. "dr2-*").
(() => {
  const me = document.currentScript, game = me.dataset.game, patterns = me.dataset.keys.split(/\s+/).filter(Boolean);
  const SITE = 'https://rank-game.com', FS = 'https://firestore.googleapis.com/v1/projects/hatdoc-blog-1048/databases/(default)/documents';
  const KEY = 'AIzaSyDz5J34ahi7fP48CU2cPrp1FNmqK-20D5E';
  window.rgAuth = { onSite: false, user: null };
  if (top === self) return;
  const tracked = (k) => patterns.some((p) => (p.endsWith('*') ? k.startsWith(p.slice(0, -1)) : k === p));
  const ls = (() => { try { return localStorage; } catch { return null; } })();
  if (!ls) return;
  const snapshot = () => { const o = {}; for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (tracked(k)) o[k] = ls.getItem(k); } return o; };

  // Merge two saves so neither device loses progress: numbers keep the higher value, objects merge key by key,
  // lists keep the longer one, anything else keeps this device's value.
  // ponytail: "higher is better" is a guess per field (fine for scores, stars, unlocks); a game with spendable
  // numbers (coins) can gain a little by syncing two devices. Add per-game merge rules if that matters.
  const deep = (a, b) => {
    if (a === undefined) return b;
    if (b === undefined) return a;
    if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b);
    if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && b.length > a.length ? b : a;
    if (a && b && typeof a === 'object' && typeof b === 'object') { const o = { ...a }; for (const k in b) o[k] = deep(a[k], b[k]); return o; }
    return a;
  };
  const parse = (s) => { try { return JSON.parse(s); } catch { return undefined; } };
  // compare saves by content, so the same data saved with keys in another order isn't "changed"
  const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort()) : x));
  const same = (a, b) => a === b || (a != null && b != null && parse(a) !== undefined && canon(parse(a)) === canon(parse(b)));
  const mergeVal = (l, c) => { // localStorage strings
    if (l == null) return c; if (c == null) return l;
    const L = parse(l), C = parse(c);
    return L === undefined || C === undefined ? l : JSON.stringify(deep(L, C));
  };

  let token = null, uid = null, tokenAt = 0, ready = false, timer = null, pending = null;
  const ask = () => parent.postMessage({ type: 'rg-cloud-ready', game }, SITE);
  const waitToken = () => new Promise((res) => { pending = res; ask(); setTimeout(() => res(), 4000); });
  const docUrl = () => `${FS}/saves/${uid}/games/${game}?key=${KEY}`;
  const auth = () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
  async function push() {
    if (!uid) return;
    if (Date.now() - tokenAt > 45 * 60e3) await waitToken(); // ID tokens last an hour
    const body = { fields: { d: { stringValue: JSON.stringify(snapshot()) }, at: { integerValue: String(Date.now()) } } };
    const res = await fetch(docUrl(), { method: 'PATCH', headers: auth(), body: JSON.stringify(body) }).catch(() => null);
    parent.postMessage({ type: 'rg-cloud-status', game, ok: !!res?.ok }, SITE);
  }

  // Leaderboards (leaderboard.js, Demolition Rush): only signed-in players with a nickname (set under the game on
  // rank-game.com) can rank. One entry per player per board (doc id = uid); the rules check the name is their nickname.
  const anc = location.ancestorOrigins;
  Object.assign(window.rgAuth, {
    onSite: anc ? anc[anc.length - 1] === SITE : document.referrer.startsWith(SITE),
    login: () => parent.postMessage({ type: 'rg-login' }, SITE),
    // collection: e.g. 'games/snake/scores'. Keeps the higher of old and new; returns the previous best (or null)
    async submit(collection, score, extra = {}) {
      const { uid, nick } = this.user;
      if (Date.now() - tokenAt > 45 * 60e3) await waitToken();
      const url = `${FS}/${collection}/${uid}?key=${KEY}`;
      const cur = await fetch(url, { headers: auth() }), old = cur.ok ? (await cur.json()).fields : null;
      if (!cur.ok && cur.status !== 404) throw new Error('board ' + cur.status);
      const best = old ? +old.score.integerValue : null;
      if (best >= score && old.name.stringValue === nick) return best;
      const int = (n) => ({ integerValue: String(n) });
      const fields = best >= score ? { ...old, name: { stringValue: nick } } // just a nickname change
        : { name: { stringValue: nick }, score: int(score), ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, int(v)])) };
      const res = await fetch(url, { method: 'PATCH', headers: auth(), body: JSON.stringify({ fields }) });
      if (!res.ok) throw new Error('submit ' + res.status);
      return best;
    },
  });
  const schedule = () => { if (!ready) return; clearTimeout(timer); timer = setTimeout(push, 3000); };

  // watch the game's saves
  const set = Storage.prototype.setItem, del = Storage.prototype.removeItem;
  Storage.prototype.setItem = function (k, v) { set.call(this, k, v); if (this === ls && tracked(k)) schedule(); };
  Storage.prototype.removeItem = function (k) { del.call(this, k); if (this === ls && tracked(k)) schedule(); };
  addEventListener('pagehide', () => { if (timer) { clearTimeout(timer); push(); } });

  // First token for this user: merge cloud + local. If that changed the save, a game that defines
  // window.cloudSaveChanged() reloads its save in place; other games are reloaded (they read their save at start).
  async function signIn() {
    ready = false;
    const res = await fetch(docUrl(), { headers: auth() }).catch(() => null);
    if (!res || (!res.ok && res.status !== 404)) return parent.postMessage({ type: 'rg-cloud-status', game, ok: false }, SITE);
    const cloud = res.ok ? parse((await res.json()).fields?.d?.stringValue || '{}') || {} : {};
    const local = snapshot();
    let changed = false;
    for (const k of new Set([...Object.keys(local), ...Object.keys(cloud)])) {
      const v = mergeVal(local[k], cloud[k]);
      if (!same(v, local[k])) { set.call(ls, k, v); changed = true; }
    }
    ready = true;
    if (Object.keys(snapshot()).some((k) => !same(snapshot()[k], cloud[k]))) await push();
    else parent.postMessage({ type: 'rg-cloud-status', game, ok: true }, SITE);
    if (changed) typeof window.cloudSaveChanged === 'function' ? window.cloudSaveChanged() : location.reload();
  }
  addEventListener('message', (e) => {
    if (e.origin !== SITE || e.source !== parent) return;
    if (e.data?.type === 'rg-cloud-hello') { if (window.rgHasBoard) parent.postMessage({ type: 'rg-board' }, SITE); return ask(); } // the page loaded after us and missed our first messages
    if (e.data?.type !== 'rg-cloud-auth') return;
    const { token: t, uid: u, nick } = e.data;
    window.rgAuth.user = t && u ? { uid: u, nick: nick || null } : null;
    setTimeout(() => dispatchEvent(new Event('rg-auth'))); // after the token below is stored
    if (!t || !u) { token = uid = null; ready = false; return; } // signed out: keep playing locally
    const fresh = u !== uid;
    token = t; tokenAt = Date.now();
    if (pending) { pending(); pending = null; }
    if (fresh) { uid = u; signIn(); }
  });
  ask();
})();
