// Line chart on a canvas. Chart.attach(canvas, points, onHover): points are [{ v, ... }] oldest first; green when the
// period ends higher than it began, red otherwise. Dragging or hovering picks a point and calls onHover(point | null).
const Chart = (() => {
  const PAD = { l: 8, r: 8, t: 14, b: 14 };
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
  return { attach };
})();
