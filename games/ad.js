// Sponsored banner for game-over screens (Demolition Rush uses its rooftop signs instead).
// To sell the slot, set AD below and push. Keep the SPONSORED label: paid ads must be disclosed.
// With AD = null it shows a house ad that sends advertisers to the blog's enquiry form.
(() => {
  const AD = null; // e.g. { text: "☕ Jed's Cafe · 10% off with code GAMER", url: 'https://example.com', color: '#1f7a4d' }
  const BLOG = 'https://rank-game.com/about';
  const ad = AD || { text: '📣 Your brand here · Advertise →', url: `${BLOG}?topic=ad#contact`, color: '#2a2f45' };

  document.head.insertAdjacentHTML('beforeend', `<style>
    .ad { display: flex; flex-direction: column; align-items: center; gap: 6px; font: 13px system-ui, sans-serif; }
    .ad a.banner { display: flex; align-items: center; gap: 8px; width: min(320px, 90vw); box-sizing: border-box; padding: 9px 12px;
      border-radius: 10px; color: #fff; text-decoration: none; font-weight: 700; border: 1px solid #fff3; }
    .ad .tag { font-size: 9px; letter-spacing: 1px; opacity: .75; border: 1px solid #fff8; border-radius: 4px; padding: 1px 4px; }
    .ad a.ask { color: #fffa; }
  </style>`);

  window.adBanner = (el) => {
    el.className = 'ad';
    el.innerHTML = '<a class="banner" target="_blank" rel="noopener sponsored"><span class="tag">SPONSORED</span><span class="txt"></span></a>'
      + `<a class="ask" target="_blank" rel="noopener" href="${BLOG}?topic=game#contact">💡 Want a game made? Suggest one</a>`;
    const a = el.querySelector('.banner');
    a.href = ad.url; a.style.background = ad.color;
    el.querySelector('.txt').textContent = ad.text;
    // Keep game key/tap handlers from firing when the banner is used.
    for (const ev of ['keydown', 'pointerdown', 'touchstart', 'touchend']) el.addEventListener(ev, (e) => e.stopPropagation());
  };
})();
