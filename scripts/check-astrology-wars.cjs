// node scripts/check-astrology-wars.cjs: known-value checks for the Astrology Wars engine.
// (Also cross-checked against Swiss Ephemeris and lunar_python on 4000 random births: signs and pillars matched except for minute-level cusps.)
const A = require('../games/astrology-wars/engine.js'), assert = require('assert');
const e = A.chart({ y: 1879, m: 3, d: 14, h: 11, mi: 30, tz: .667, lat: 48.4, lon: 10, g: 'x' }); // Einstein
assert.deepStrictEqual([A.SIGNS[e.sun], A.SIGNS[e.moon], A.SIGNS[e.asc]], ['Pisces', 'Sagittarius', 'Cancer']);
assert.deepStrictEqual(A.pillars(2000, 1, 1, 12, A.sunLon(A.julday(2000, 1, 1, 4))).day, [4, 6]); // Wu-Wu day
const p = A.pillars(2024, 2, 10, 10, 321); // Chinese New Year 2024: Jia-Chen year, Bing-Yin month, Jia-Chen day
assert.deepStrictEqual([p.year, p.month, p.day], [[0, 4], [2, 2], [0, 4]]);
assert.deepStrictEqual(A.pillars(1984, 2, 3, 12, 313.9).year, [9, 11]); // before Lichun: still the Gui-Hai year
console.log('astrology-wars checks passed');
