// Friends on rank-game.com: tell the page which online room (#CODE) this game is in, so it can show "Invite friends".
// Games that make share links (e.g. a Gridwit challenge) call window.rgInvite('c=...', 'my challenge') instead.
(() => {
  const SITE = 'https://rank-game.com';
  if (parent === window) { window.rgInvite = () => {}; return; }
  let last = null, custom = null;
  const post = (hash, label) => parent.postMessage({ type: 'rg-room', hash, label }, SITE);
  const check = () => {
    if (custom) return;
    const h = location.hash.slice(1), code = /^[A-Z0-9]{5}$/i.test(h) ? h.toUpperCase() : '';
    if (code !== last) { last = code; post(code); }
  };
  window.rgInvite = (hash, label) => { custom = { hash, label }; post(hash, label); };
  setInterval(check, 700); // games set the hash when they open or join a room, and clear it when they leave
  addEventListener('message', (e) => { if (e.origin === SITE && e.data?.type === 'rg-cloud-hello') { if (custom) post(custom.hash, custom.label); else if (last) post(last); } });
})();
