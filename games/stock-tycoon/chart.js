// Line chart on a canvas. Chart.attach(canvas, points, onHover): points are [{ v, ... }] oldest first; green when the
// period ends higher than it began, red otherwise. Dragging or hovering picks a point and calls onHover(point | null).
const Chart = (() => {
  const PAD = { l: 8, r: 8, t: 14, b: 14 };
  // the highest and lowest price on the chart, in the top and bottom right corners
  const label = (v) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function scale(x, css, w, h, top, lo) {
    x.fillStyle = css.getPropertyValue('--muted').trim(); x.font = '11px system-ui, sans-serif'; x.textAlign = 'right';
    x.fillText(label(top), w - PAD.r, 10); x.fillText(label(lo), w - PAD.r, h - 2);
  }
  function draw(cv, pts, hi) {
    const dpr = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight, x = cv.getContext('2d');
    cv.width = w * dpr; cv.height = h * dpr; x.scale(dpr, dpr);
    const css = getComputedStyle(cv), up = pts[pts.length - 1].v >= pts[0].v, col = css.getPropertyValue(up ? '--up' : '--down').trim();
    let lo = Math.min(...pts.map((p) => p.v)), top = Math.max(...pts.map((p) => p.v));
    if (top === lo) { top += top * 0.01 || 1; lo -= lo * 0.01 || 1; }
    const X = (i) => PAD.l + (pts.length > 1 ? i / (pts.length - 1) : 1) * (w - PAD.l - PAD.r);
    const Y = (v) => PAD.t + (top - v) / (top - lo) * (h - PAD.t - PAD.b);
    // where the period started
    x.strokeStyle = css.getPropertyValue('--line').trim(); x.setLineDash([3, 4]); x.beginPath(); x.moveTo(PAD.l, Y(pts[0].v)); x.lineTo(w - PAD.r, Y(pts[0].v)); x.stroke(); x.setLineDash([]);
    x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(X(i), Y(p.v)) : x.moveTo(X(i), Y(p.v))));
    x.strokeStyle = col; x.lineWidth = 2; x.lineJoin = x.lineCap = 'round'; x.stroke();
    x.lineTo(X(pts.length - 1), h); x.lineTo(X(0), h); x.closePath();
    const fill = x.createLinearGradient(0, 0, 0, h); fill.addColorStop(0, col + '40'); fill.addColorStop(1, col + '00'); x.fillStyle = fill; x.fill();
    const dot = (i, r) => { x.beginPath(); x.arc(X(i), Y(pts[i].v), r, 0, 7); x.fillStyle = col; x.fill(); };
    scale(x, css, w, h, top, lo);
    if (hi == null) dot(pts.length - 1, 4); // the current price
    else {
      x.strokeStyle = css.getPropertyValue('--muted').trim(); x.lineWidth = 1; x.beginPath(); x.moveTo(X(hi), 0); x.lineTo(X(hi), h); x.stroke();
      dot(hi, 5);
    }
    return { index: (px) => Math.max(0, Math.min(pts.length - 1, Math.round((px - PAD.l) / (w - PAD.l - PAD.r) * (pts.length - 1)))) };
  }
  function attach(cv, pts, onHover) {
    const geo = draw(cv, pts, null);
    const pick = (e) => { const i = geo.index(e.clientX - cv.getBoundingClientRect().left); draw(cv, pts, i); onHover(pts[i]); };
    cv.onpointerdown = cv.onpointermove = pick;
    cv.onpointerleave = cv.onpointerup = cv.onpointercancel = (e) => { if (e.type === 'pointerup' && e.pointerType === 'mouse') return; draw(cv, pts, null); onHover(null); };
  }
  // Candlesticks: bars are [{ o, h, l, c, ... }] oldest first. Green closed higher than it opened, red lower.
  function drawCandles(cv, bars, hi) {
    const dpr = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight, x = cv.getContext('2d');
    cv.width = w * dpr; cv.height = h * dpr; x.scale(dpr, dpr);
    const css = getComputedStyle(cv), col = (b) => css.getPropertyValue(b.c >= b.o ? '--up' : '--down').trim();
    const lo = Math.min(...bars.map((b) => b.l)), top = Math.max(...bars.map((b) => b.h)), span = top - lo || 1;
    const step = (w - PAD.l - PAD.r) / bars.length, bw = Math.max(1, Math.min(14, step * 0.65));
    const X = (i) => PAD.l + step * (i + 0.5), Y = (v) => PAD.t + (top - v) / span * (h - PAD.t - PAD.b);
    if (hi != null) { x.strokeStyle = css.getPropertyValue('--line').trim(); x.lineWidth = Math.max(bw + 4, 2); x.beginPath(); x.moveTo(X(hi), 0); x.lineTo(X(hi), h); x.stroke(); }
    bars.forEach((b, i) => {
      x.strokeStyle = x.fillStyle = col(b); x.lineWidth = 1;
      x.beginPath(); x.moveTo(X(i), Y(b.h)); x.lineTo(X(i), Y(b.l)); x.stroke();
      x.fillRect(X(i) - bw / 2, Math.min(Y(b.o), Y(b.c)), bw, Math.max(1, Math.abs(Y(b.o) - Y(b.c))));
    });
    scale(x, css, w, h, top, lo);
    return { index: (px) => Math.max(0, Math.min(bars.length - 1, Math.floor((px - PAD.l) / step))) };
  }
  function candles(cv, bars, onHover) {
    const geo = drawCandles(cv, bars, null);
    const pick = (e) => { const i = geo.index(e.clientX - cv.getBoundingClientRect().left); drawCandles(cv, bars, i); onHover(bars[i]); };
    cv.onpointerdown = cv.onpointermove = pick;
    cv.onpointerleave = cv.onpointerup = cv.onpointercancel = (e) => { if (e.type === 'pointerup' && e.pointerType === 'mouse') return; drawCandles(cv, bars, null); onHover(null); };
  }
  return { attach, candles };
})();
