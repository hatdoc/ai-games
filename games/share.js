// One share sheet for every game. Games call navigator.share({title, text, url}); the phone's own sheet only lists the
// apps installed there (often just Instagram/Messenger), so this shows Copy link, WhatsApp, Telegram, X, Reddit,
// Facebook, Email and SMS first, with "More apps…" handing over to the native sheet (Instagram, Messenger, AirDrop…).
// Shares that carry image files still go straight to the native sheet, since web links can't attach files.
// Usage, after cloudsave.js:  <script src="../share.js"></script>
(() => {
  const native = navigator.share && navigator.share.bind(navigator);
  const abort = () => new DOMException('Share dismissed', 'AbortError');
  const enc = encodeURIComponent;

  navigator.share = (d = {}) => {
    if (d.files && d.files.length && native) return native(d);
    const text = d.text || d.title || '', url = d.url || '';
    const msg = url && !text.includes(url) ? `${text} ${url}`.trim() : text;
    const opts = [
      ['📋', 'Copy link', null],
      ['💬', 'WhatsApp', `https://wa.me/?text=${enc(msg)}`],
      ['✈️', 'Telegram', `https://t.me/share/url?url=${enc(url || ' ')}&text=${enc(text)}`],
      ['𝕏', 'X', `https://twitter.com/intent/tweet?text=${enc(text)}${url ? `&url=${enc(url)}` : ''}`],
      ...(url ? [['👽', 'Reddit', `https://www.reddit.com/submit?url=${enc(url)}&title=${enc(text.slice(0, 280))}`],
                 ['📘', 'Facebook', `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`]] : []),
      ['✉️', 'Email', `mailto:?subject=${enc(d.title || text.slice(0, 60))}&body=${enc(msg)}`],
      ['📱', 'SMS', `sms:?&body=${enc(msg)}`],
    ];
    return new Promise((resolve, reject) => {
      const root = document.createElement('div');
      root.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0008;display:flex;align-items:flex-end;justify-content:center;font:14px system-ui,sans-serif';
      root.innerHTML = '<div style="width:min(440px,100%);box-sizing:border-box;background:#1b1f33;color:#fff;border-radius:16px 16px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom));border:1px solid #fff2">'
        + '<div style="font-weight:700;margin-bottom:12px">Share</div><div class="g" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px"></div>'
        + '<button class="x" style="margin-top:12px;width:100%;padding:10px;border:0;border-radius:10px;background:#fff1;color:#fff;font:inherit;cursor:pointer">Cancel</button></div>';
      const grid = root.querySelector('.g');
      const done = (ok) => { root.remove(); document.removeEventListener('keydown', esc, true); ok ? resolve() : reject(abort()); };
      const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } };
      const btn = (icon, label, el) => {
        el.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 4px;border:0;border-radius:12px;background:#fff1;color:#fff;font:12px system-ui;text-decoration:none;cursor:pointer';
        el.innerHTML = `<span style="font-size:24px;line-height:1">${icon}</span>${label}`;
        grid.appendChild(el); return el;
      };
      for (const [icon, label, href] of opts) {
        if (href) { const a = btn(icon, label, document.createElement('a')); a.href = href; a.target = '_blank'; a.rel = 'noopener'; a.onclick = () => setTimeout(() => done(true), 50); }
        else btn(icon, label, document.createElement('button')).onclick = async (e) => {
          const b = e.currentTarget;
          try { await navigator.clipboard.writeText(msg); b.lastChild.textContent = 'Copied!'; } catch { prompt('Copy this:', msg); }
          setTimeout(() => done(true), 600);
        };
      }
      if (native) btn('⋯', 'More apps…', document.createElement('button')).onclick = () => { root.remove(); document.removeEventListener('keydown', esc, true); native(d).then(resolve, reject); };
      root.querySelector('.x').onclick = () => done(false);
      root.onclick = (e) => { if (e.target === root) done(false); };
      // Keep game key/tap handlers from firing while the sheet is used.
      for (const ev of ['keydown', 'pointerdown', 'touchstart', 'touchend', 'mousedown']) root.addEventListener(ev, (e) => e.stopPropagation());
      document.addEventListener('keydown', esc, true);
      document.body.appendChild(root);
    });
  };
})();
