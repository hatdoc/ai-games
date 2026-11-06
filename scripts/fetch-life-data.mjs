// Builds games/life-on-earth/data/countries.json from the World Bank API (open data, CC BY 4.0).
// Birth/mortality series are World Bank compilations of UN World Population Prospects.
//   node scripts/fetch-life-data.mjs
import fs from 'node:fs';

const IND = {
  cbr: 'SP.DYN.CBRT.IN', pop: 'SP.POP.TOTL', le: 'SP.DYN.LE00.IN', u5: 'SH.DYN.MORT', gdp: 'NY.GDP.PCAP.CD',
  sec: 'SE.SEC.ENRR', tert: 'SE.TER.ENRR', urban: 'SP.URB.TOTL.IN.ZS', health: 'SH.XPD.CHEX.PC.CD',
};
const YEAR = 2022;
const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); };

const meta = (await get('https://api.worldbank.org/v2/country?format=json&per_page=400'))[1]
  .filter((c) => c.region.id !== 'NA'); // drop aggregates
const out = Object.fromEntries(meta.map((c) => [c.id, { iso: c.id, name: c.name, region: c.region.value, income: c.incomeLevel.value }]));

for (const [k, code] of Object.entries(IND)) {
  // mrv=3: most recent of the last 3 years up to YEAR, so a missing 2022 value falls back to 2021/2020
  const rows = (await get(`https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=20000&date=${YEAR - 4}:${YEAR}`))[1] || [];
  const best = {};
  for (const r of rows) if (r.value != null && out[r.countryiso3code] && (!best[r.countryiso3code] || +r.date > best[r.countryiso3code].d)) best[r.countryiso3code] = { d: +r.date, v: r.value };
  for (const [iso, b] of Object.entries(best)) out[iso][k] = +b.v.toFixed(2);
}
// keep countries with what the human lottery needs
const countries = Object.values(out).filter((c) => c.cbr && c.pop && c.le && c.u5 != null)
  .map((c) => ({ ...c, births: Math.round(c.cbr * c.pop / 1000) })).sort((a, b) => b.births - a.births);
const total = countries.reduce((s, c) => s + c.births, 0);
fs.mkdirSync('games/life-on-earth/data', { recursive: true });
fs.writeFileSync('games/life-on-earth/data/countries.json', JSON.stringify({
  source: 'World Bank World Development Indicators (UN World Population Prospects for births and mortality)',
  url: 'https://data.worldbank.org/indicator', licence: 'CC BY 4.0', retrieved: new Date().toISOString().slice(0, 10), observationYear: `${YEAR} (or latest of ${YEAR - 4}-${YEAR})`,
  units: { births: 'crude birth rate x population', le: 'years', u5: 'deaths per 1,000 live births', gdp: 'current US$ per person', sec: 'gross secondary enrolment %', tert: 'gross tertiary enrolment %', urban: '% urban', health: 'US$ per person' },
  limitations: 'Births are derived (crude birth rate x population), not a census. Country averages hide huge within-country variation.',
  totalBirths: total, countries,
}));
console.log(countries.length, 'countries, births/yr', total);
