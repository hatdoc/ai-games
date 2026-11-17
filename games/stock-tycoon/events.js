// Stock Tycoon events: what can happen in the world and to a company, how hard it hits, and how the news reports it.
// The engine decides when these happen; this file is only the tables and the wording. Countries and people are invented.
// IMPORTANT once the game is live: the order of entries and every number here is part of the simulation (see engine.js).
const Events = (() => {
  const LANDS = ['Valdoria', 'Kessarine', 'Ostmark', 'the Tarn Republic', 'the Aubrey Isles', 'Khoresh', 'Sundara', 'the Norvik Federation', 'Calantha', 'Zemlya Nova'];
  const FIRST = ['Mara', 'Tobias', 'Ines', 'Callum', 'Priya', 'Anders', 'Lucia', 'Desmond', 'Yuki', 'Farah', 'Gideon', 'Noor', 'Rafael', 'Signe', 'Kwame', 'Elodie'];
  const LAST = ['Vance', 'Okafor', 'Lindqvist', 'Moreau', 'Tanaka', 'Hale', 'Castellan', 'Brandt', 'Achebe', 'Whitlock', 'Soren', 'Delacroix', 'Iyer', 'Marlowe', 'Petrov', 'Quill'];
  const SOURCES = [['An unverified online post', 'Low'], ['Trade press reports', 'Medium'], ['Well-placed sources', 'High']];
  const TECHY = ['ai', 'tech', 'soft', 'elec', 'auto', 'ev', 'game', 'ent', 'food', 'retail'];

  // Company events. w: how common. lo..hi: the hit to the share price in percent. secs: industries it can happen in (null = any).
  // after: headline ending. what: the story. rumour / deny: wording when it leaks early, or is denied. fx: lasting effects.
  const CO = {
    resign: { w: 8, lo: -8, hi: -2, secs: null, cat: 'Company', after: 'as chief executive steps down', what: (x) => `${x.ceo} has resigned as chief executive of ${x.n}. ${x.next} takes over immediately.`,
      rumour: 'is preparing to replace its chief executive', deny: 'says its chief executive is not leaving', fx: { ceo: 1 } },
    death: { w: 1, lo: -12, hi: -4, secs: null, cat: 'Company', after: 'after the sudden death of its chief executive', what: (x) => `${x.n} said chief executive ${x.ceo} died unexpectedly. ${x.next} has been named as successor.`, fx: { ceo: 1 } },
    scandal: { w: 3, lo: -20, hi: -7, secs: null, cat: 'Company', after: 'as chief executive is caught in a personal scandal', what: (x) => `Reports of an affair and misuse of company money have engulfed ${x.n} chief executive ${x.ceo}. The board has opened an inquiry.`,
      rumour: 'faces damaging claims about its chief executive', deny: 'calls the claims about its chief executive false', fx: { rep: -25 } },
    merger: { w: 4, lo: 8, hi: 22, secs: null, cat: 'Deals', after: 'on merger announcement', what: (x) => `${x.n} announced a merger with a privately held rival, creating a much larger group. ${x.ceo} will lead the combined company.`,
      rumour: 'is in advanced merger talks', deny: 'says it is not in merger talks', fx: { growth: 0.01, health: 4 } },
    acquire: { w: 5, lo: -3, hi: 7, secs: null, cat: 'Deals', after: 'after buying a competitor', what: (x) => `${x.n} agreed to buy a smaller competitor. Investors are weighing the price paid against the extra market share.`,
      rumour: 'is preparing to acquire a competitor', deny: 'says it has no acquisition planned', fx: {} },
    launch: { w: 10, lo: 3, hi: 13, secs: TECHY, cat: 'Company', after: 'after a major product launch', what: (x) => `${x.n} launched its newest product to strong early demand.`, fx: { health: 2 } },
    flop: { w: 4, lo: -12, hi: -4, secs: TECHY, cat: 'Company', after: 'as flagship product is delayed', what: (x) => `${x.n} pushed back its next major product, citing development problems.`,
      rumour: 'is struggling with development problems on its next product', deny: 'says its next product is on schedule', fx: {} },
    recall: { w: 5, lo: -15, hi: -4, secs: ['auto', 'ev', 'elec', 'food', 'pharma', 'health', 'agri'], cat: 'Company', after: 'on product recall', what: (x) => `${x.n} is recalling a product over safety concerns. The cost is still being counted.`, fx: { health: -4 } },
    fraud: { w: 1.2, lo: -40, hi: -18, secs: null, cat: 'Company', after: 'as accounting fraud is uncovered', what: (x) => `Auditors found that ${x.n} overstated its profits. Regulators have opened an investigation and the finance chief has been suspended.`,
      rumour: 'may be hiding financial difficulties', deny: 'says its accounts are sound', fx: { health: -22, rep: -30 } },
    lawsuit: { w: 6, lo: -12, hi: -3, secs: null, cat: 'Company', after: 'as it is hit with a major lawsuit', what: (x) => `${x.n} is being sued for damages that could run into the hundreds of millions. The company says it will fight the claim.`, fx: { health: -3 } },
    contract: { w: 8, lo: 4, hi: 13, secs: ['aero', 'build', 'tech', 'soft', 'ai', 'health', 'tel', 'trans', 'renew'], cat: 'Company', after: 'after winning a government contract', what: (x) => `${x.n} won a multi-year government contract, beating several rivals.`,
      rumour: 'is close to winning a large government contract', deny: 'says no contract has been awarded', fx: { health: 3 } },
    breakthrough: { w: 4, lo: 10, hi: 26, secs: ['ai', 'pharma', 'tech', 'renew', 'ev', 'health', 'elec'], cat: 'Company', after: 'following a revolutionary technology announcement', what: (x) => `${x.n} announced a breakthrough its engineers have chased for years. Analysts say it could reshape the industry.`,
      rumour: 'is about to announce a technological breakthrough', deny: 'plays down talk of a breakthrough', fx: { growth: 0.03 } },
    layoffs: { w: 5, lo: -4, hi: 4, secs: null, cat: 'Company', after: 'as it announces major layoffs', what: (x) => `${x.n} will cut thousands of jobs to lower costs. Investors are split on whether it signals trouble or discipline.`, fx: {} },
    competitor: { w: 6, lo: -9, hi: -3, secs: null, cat: 'Industry', after: 'as a new competitor enters its market', what: (x) => `A well-funded newcomer has moved into ${x.n}'s main market with lower prices.`, fx: {} },
    approval: { w: 5, lo: 8, hi: 28, secs: ['pharma', 'health', 'ev', 'aero', 'fin', 'renew', 'tel'], cat: 'Company', after: 'after winning regulatory approval', what: (x) => `Regulators approved ${x.n}'s newest product, clearing the way for sales.`,
      rumour: 'is expected to win regulatory approval', deny: 'says the regulator has not decided', fx: { growth: 0.02, health: 4 } },
    rejection: { w: 3, lo: -35, hi: -12, secs: ['pharma', 'health'], cat: 'Company', after: 'after regulators reject its product', what: (x) => `Regulators turned down ${x.n}'s application, saying more evidence is needed.`,
      rumour: 'is facing a regulatory rejection', deny: 'says its application is still under review', fx: { health: -8 } },
    trialwin: { w: 4, lo: 15, hi: 45, secs: ['pharma'], cat: 'Company', after: 'on successful clinical trial', what: (x) => `${x.n} said its lead treatment met every goal in a late-stage clinical trial.`,
      rumour: 'has seen strong results in a clinical trial', deny: 'says trial results are not ready', fx: { growth: 0.03, health: 10 } },
    trialfail: { w: 4, lo: -45, hi: -18, secs: ['pharma'], cat: 'Company', after: 'after clinical trial fails', what: (x) => `${x.n} said its lead treatment failed to beat a placebo in a late-stage clinical trial.`,
      rumour: 'has seen a clinical trial go badly', deny: 'says trial results are not ready', fx: { health: -12 } },
    holder: { w: 6, lo: -7, hi: -2, secs: null, cat: 'Markets', after: 'as a major shareholder sells', what: (x) => `One of ${x.n}'s largest shareholders sold its entire position in a single block.`, fx: {} },
    // ---- people at the top
    affair: { w: 3, lo: -11, hi: -3, secs: null, cat: 'Company', after: 'as chief executive is forced out over an affair', what: (x) => `${x.n} chief executive ${x.ceo} has left after the board learned of an undisclosed relationship with a member of staff. ${x.next} steps in.`,
      rumour: 'has a chief executive under investigation by the board over a relationship at work', deny: 'says its board has full confidence in the chief executive', fx: { ceo: 1, rep: -12 } },
    insider: { w: 2, lo: -15, hi: -5, secs: null, cat: 'Company', after: 'as chief executive is investigated for insider trading', what: (x) => `Regulators are examining share sales by ${x.n} chief executive ${x.ceo} made days before bad news became public.`,
      rumour: 'has a chief executive who sold shares before bad news', deny: 'says its chief executive\'s share sales were scheduled months ago', fx: { rep: -20 } },
    starhire: { w: 3, lo: 3, hi: 9, secs: null, cat: 'Company', after: 'after hiring a star executive from a rival', what: (x) => `${x.n} has hired one of the best-regarded executives in its industry to run its largest division.`, fx: { rep: 10 } },
    founder: { w: 1.5, lo: -6, hi: 8, secs: null, cat: 'Company', after: 'as its founder returns to take charge', what: (x) => `The founder of ${x.n} is back as chief executive, replacing ${x.ceo}. Investors are split between nostalgia and worry.`, fx: { ceo: 1 } },
    // ---- money and forecasts
    buyback: { w: 5, lo: 2, hi: 7, secs: null, cat: 'Markets', after: 'on share buyback plan', what: (x) => `${x.n} will spend spare cash buying back its own shares, which leaves fewer shares to split the profits between.`, fx: {} },
    guideup: { w: 6, lo: 4, hi: 12, secs: null, cat: 'Results', after: 'after raising its profit forecast', what: (x) => `${x.n} now expects to earn more this year than it had told investors, citing stronger demand.`,
      rumour: 'is about to raise its profit forecast', deny: 'says its forecast is unchanged', fx: { health: 2 } },
    guidedown: { w: 6, lo: -14, hi: -5, secs: null, cat: 'Results', after: 'on profit warning', what: (x) => `${x.n} warned that this year's profit will fall short of what it had told investors.`,
      rumour: 'is preparing a profit warning', deny: 'says its forecast is unchanged', fx: { health: -3 } },
    upgrade: { w: 6, lo: 2, hi: 6, secs: null, cat: 'Markets', after: 'after analysts upgrade the stock', what: (x) => `Several large brokers raised their rating on ${x.n}, saying the market has been too gloomy about it.`, fx: {} },
    downgrade: { w: 6, lo: -7, hi: -2, secs: null, cat: 'Markets', after: 'after analysts downgrade the stock', what: (x) => `Several large brokers cut their rating on ${x.n}, saying its best growth is behind it.`, fx: {} },
    activist: { w: 3, lo: 4, hi: 11, secs: null, cat: 'Markets', after: 'as an activist investor builds a stake', what: (x) => `A well-known activist fund has bought a large stake in ${x.n} and is demanding cost cuts and a seat on the board.`,
      rumour: 'is being targeted by an activist investor', deny: 'says it has had no approach from any activist fund', fx: {} },
    // ---- customers, partners and products
    partner: { w: 6, lo: 4, hi: 14, secs: null, cat: 'Deals', after: 'on major partnership', what: (x) => `${x.n} signed a long-term partnership with one of the largest companies in its field.`,
      rumour: 'is close to a major partnership', deny: 'says no partnership has been agreed', fx: { health: 2 } },
    wincust: { w: 5, lo: 5, hi: 14, secs: null, cat: 'Company', after: 'after landing its biggest customer yet', what: (x) => `${x.n} signed the largest customer contract in its history.`, fx: { health: 2 } },
    losecust: { w: 4, lo: -16, hi: -6, secs: null, cat: 'Company', after: 'after losing its biggest customer', what: (x) => `The largest customer of ${x.n} is moving its business to a rival.`,
      rumour: 'is about to lose its biggest customer', deny: 'says its customer relationships are strong', fx: { health: -4 } },
    viral: { w: 5, lo: 5, hi: 16, secs: ['retail', 'food', 'game', 'ent', 'elec', 'soft'], cat: 'Company', after: 'as its new product sells out', what: (x) => `A new product from ${x.n} has caught on far faster than expected and is sold out in most shops.`, fx: {} },
    misfire: { w: 5, lo: -14, hi: -5, secs: TECHY, cat: 'Company', after: 'as new product disappoints', what: (x) => `Early sales of the newest product from ${x.n} are well below what the company had promised.`, fx: {} },
    hit: { w: 4, lo: 8, hi: 22, secs: ['game', 'ent'], cat: 'Company', after: 'on record-breaking release', what: (x) => `The latest release from ${x.n} broke opening-week records.`, fx: { health: 4 } },
    bomb: { w: 4, lo: -18, hi: -6, secs: ['game', 'ent'], cat: 'Company', after: 'as big release flops', what: (x) => `The most expensive release in the history of ${x.n} opened to poor reviews and empty seats.`, fx: { health: -4 } },
    abroad: { w: 5, lo: 2, hi: 8, secs: null, cat: 'Company', after: 'on overseas expansion', what: (x) => `${x.n} is opening in three new countries next year.`, fx: {} },
    // ---- trouble
    strike: { w: 5, lo: -9, hi: -3, secs: ['auto', 'ev', 'trans', 'mine', 'build', 'retail', 'food', 'aero', 'oil', 'health'], cat: 'Company', after: 'as workers walk out', what: (x) => `Thousands of staff at ${x.n} have gone on strike over pay. Operations are running at a fraction of normal.`, fx: {} },
    breach: { w: 5, lo: -12, hi: -4, secs: ['tech', 'soft', 'fin', 'bank', 'retail', 'tel', 'health', 'ins', 'game', 'ai'], cat: 'Company', after: 'after customer data is stolen', what: (x) => `Hackers stole the personal details of millions of ${x.n} customers. Regulators have been notified.`, fx: { health: -3, rep: -6 } },
    blaze: { w: 4, lo: -12, hi: -4, secs: ['auto', 'ev', 'elec', 'food', 'pharma', 'mine', 'oil', 'agri', 'build'], cat: 'Company', after: 'after fire at its main plant', what: (x) => `A fire has shut the largest plant ${x.n} operates. It may be months before production is back to normal.`, fx: { health: -3 } },
    antitrust: { w: 3, lo: -12, hi: -4, secs: ['tech', 'soft', 'ai', 'tel', 'bank', 'retail', 'pharma', 'ent'], cat: 'Politics', after: 'as competition watchdog opens inquiry', what: (x) => `The competition regulator is investigating whether ${x.n} has abused its market power.`,
      rumour: 'is about to face a competition inquiry', deny: 'says it has not been contacted by the competition regulator', fx: {} },
    fined: { w: 5, lo: -8, hi: -2, secs: null, cat: 'Company', after: 'after record fine', what: (x) => `${x.n} was fined by regulators for breaking industry rules. It says it will not appeal.`, fx: { health: -2 } },
    patentwin: { w: 3, lo: 5, hi: 14, secs: ['tech', 'pharma', 'elec', 'ai', 'soft'], cat: 'Company', after: 'after winning patent case', what: (x) => `A court ruled that a rival copied technology owned by ${x.n} and must pay to keep using it.`, fx: {} },
    patentloss: { w: 3, lo: -15, hi: -5, secs: ['tech', 'pharma', 'elec', 'ai', 'soft'], cat: 'Company', after: 'after losing patent case', what: (x) => `A court ruled that ${x.n} infringed a rival's patent. It faces damages and may have to change its product.`, fx: { health: -3 } },
    // ---- things that only happen in one line of business
    strikeoil: { w: 5, lo: 8, hi: 22, secs: ['oil', 'mine'], cat: 'Company', after: 'on major discovery', what: (x) => `${x.n} confirmed a large new deposit, one of the biggest finds in the region for years.`,
      rumour: 'has made a major discovery', deny: 'says exploration results are not ready', fx: { growth: 0.02 } },
    spill: { w: 4, lo: -18, hi: -7, secs: ['oil', 'mine'], cat: 'Company', after: 'after environmental disaster', what: (x) => `A leak at a site run by ${x.n} has polluted miles of coastline. The clean-up bill is expected to be enormous.`, fx: { health: -6, rep: -10 } },
    badloans: { w: 5, lo: -13, hi: -5, secs: ['bank', 'fin', 'ins'], cat: 'Company', after: 'as it writes off bad loans', what: (x) => `${x.n} set aside a large sum to cover loans it no longer expects to be repaid.`,
      rumour: 'is sitting on bad loans', deny: 'says its loan book is healthy', fx: { health: -6 } },
    crash: { w: 4, lo: -15, hi: -5, secs: ['trans', 'aero'], cat: 'Company', after: 'after fatal accident', what: (x) => `A serious accident involving ${x.n} is under investigation. Part of its fleet has been grounded.`, fx: { health: -4, rep: -8 } },
    tenant: { w: 5, lo: -10, hi: -3, secs: ['re'], cat: 'Company', after: 'as its biggest tenant moves out', what: (x) => `The largest tenant of ${x.n} will not renew its lease.`, fx: {} },
    harvest: { w: 5, lo: 3, hi: 9, secs: ['agri', 'food'], cat: 'Company', after: 'on bumper harvest', what: (x) => `Ideal weather gave ${x.n} one of its best growing seasons on record.`, fx: {} },
  };

  // World and industry events. p: chance per day. dur: how long it lasts in days (none = one-off). m: hit to the whole market in
  // percent. sec: extra hit per industry in percent. infl: push on inflation. end: headline when it is over (part of the hit reverses).
  const GLOBAL = [
    { key: 'war', p: 1 / 900, dur: [60, 200], m: -3, sec: { oil: 8, aero: 5, mine: 3, trans: -5, retail: -2 }, infl: 0.8, cat: 'Global', level: 'Severe',
      title: (l) => `War breaks out between ${l[0]} and ${l[1]}`, body: 'Fighting threatens oil supplies and shipping routes. Energy and defence shares rose while airlines, shippers and retailers fell.', end: (l) => `${l[0]} and ${l[1]} agree a ceasefire` },
    { key: 'tradewar', p: 1 / 700, dur: [90, 250], m: -2, sec: { trans: -5, elec: -4, auto: -4, agri: -3, mine: -3, retail: -2 }, infl: 0.4, cat: 'Politics', level: 'Major',
      title: (l) => `${l[0]} imposes sweeping trade restrictions`, body: 'New tariffs and export limits raise costs for anyone who ships goods across borders.', end: (l) => `${l[0]} lifts trade restrictions` },
    { key: 'oil', p: 1 / 600, dur: [40, 120], m: -1.5, sec: { oil: 10, ev: 4, renew: 4, trans: -6, auto: -3 }, infl: 0.6, cat: 'Global', level: 'Major',
      title: (l) => `Oil shortage as ${l[0]} cuts production`, body: 'Fuel prices are climbing. Oil producers and their alternatives gain; anyone who burns fuel to make money loses.', end: () => 'Oil supply returns to normal' },
    { key: 'pandemic', p: 1 / 2500, dur: [150, 300], m: -6, sec: { pharma: 8, game: 8, soft: 5, health: 4, food: 2, trans: -12, ent: -8, retail: -5, re: -5 }, infl: 0.3, cat: 'Global', level: 'Severe',
      title: (l) => `Global pandemic declared as new virus spreads from ${l[0]}`, body: 'Travel is collapsing and people are staying home. Drug makers, games and software gain; airlines, cinemas and shops suffer.', end: () => 'Pandemic declared over' },
    { key: 'disaster', p: 1 / 300, m: -1, sec: { build: 4, ins: -7, agri: -3 }, infl: 0.1, cat: 'Global', level: 'Moderate',
      title: (l) => `${['Major earthquake strikes', 'Hurricane devastates', 'Severe floods hit'][l[0].length % 3]} ${l[0]}`, body: 'Insurers face heavy claims. Builders expect years of reconstruction work.' },
    { key: 'unrest', p: 1 / 350, m: -2, sec: { fin: -3, bank: -3 }, infl: 0, cat: 'Politics', level: 'Moderate',
      title: (l) => `Government of ${l[0]} collapses amid protests`, body: 'Political instability is making investors nervous, and banks with money lent there most of all.' },
    { key: 'techboom', p: 1 / 500, m: 1, sec: { ai: 8, tech: 5, soft: 4, elec: 2 }, infl: 0, cat: 'Industry', level: 'Major',
      title: () => 'Researchers unveil major computing breakthrough', body: 'A new kind of chip promises far more computing power for the same cost. Technology shares led the market higher.' },
    { key: 'bankcrisis', p: 1 / 1500, dur: [60, 150], m: -4, sec: { bank: -12, fin: -9, re: -5, ins: -4 }, infl: -0.2, cat: 'Economy', level: 'Severe',
      title: (l) => `Banking crisis as a major lender in ${l[0]} fails`, body: 'Savers are pulling money out and banks have stopped lending to each other. Financial shares are being sold hard.', end: () => 'Banking system stabilises after rescue deal' },
    { key: 'outage', p: 1 / 500, m: -0.5, sec: { tel: -6, tech: -3, soft: -3 }, infl: 0, cat: 'Industry', level: 'Moderate',
      title: () => 'Nationwide network outage halts payments and travel', body: 'A failure at a major network operator knocked phones, card payments and booking systems offline for hours.' },
    { key: 'tradedeal', p: 1 / 500, m: 2, sec: { trans: 4, auto: 3, agri: 3, elec: 3, mine: 2 }, infl: -0.2, cat: 'Politics', level: 'Moderate',
      title: (l) => `New trade agreement signed with ${l[0]}`, body: 'Lower tariffs should make exports cheaper. Shippers, car makers and farmers stand to gain most.' },
    { key: 'stimulus', p: 1 / 700, m: 2.5, sec: { build: 5, retail: 3, bank: 2 }, infl: 0.3, cat: 'Economy', level: 'Major',
      title: () => 'Government announces large spending programme', body: 'Billions will go into roads, rail and payments to households. Builders and retailers rallied.' },
    { key: 'chips', p: 1 / 600, dur: [60, 150], m: -0.5, sec: { elec: -6, tech: -5, ev: -5, auto: -4 }, infl: 0.2, cat: 'Industry', level: 'Major',
      title: () => 'Global chip shortage hits manufacturers', body: 'Factories that depend on chips are cutting production because they cannot get enough of them.', end: () => 'Chip supplies recover' },
    { key: 'crop', p: 1 / 500, m: 0, sec: { agri: 6, food: -4 }, infl: 0.3, cat: 'Industry', level: 'Moderate',
      title: (l) => `Drought in ${l[0]} devastates harvests`, body: 'Crop prices are jumping. Good for those who grow and supply farms, bad for food makers who buy the crops.' },
    { key: 'housing', p: 1 / 700, m: 0.5, sec: { build: 6, re: 5, bank: 2 }, infl: 0.1, cat: 'Economy', level: 'Moderate',
      title: () => 'House prices post biggest rise in a decade', body: 'Buyers are outnumbering sellers. Home builders, landlords and mortgage lenders all benefit.' },
    { key: 'cyber', p: 1 / 500, m: -0.5, sec: { soft: 4, fin: -4, bank: -3, tel: -2 }, infl: 0, cat: 'Industry', level: 'Moderate',
      title: () => 'Wave of cyber attacks hits banks', body: 'Several lenders were forced offline. Demand for security software is expected to jump.' },
    { key: 'green', p: 1 / 600, m: 0, sec: { renew: 8, ev: 6, mine: 2, oil: -3 }, infl: 0, cat: 'Politics', level: 'Major',
      title: () => 'Lawmakers pass sweeping clean-energy subsidies', body: 'Solar, wind and electric vehicle makers will receive years of support. Oil producers were sold.' },
    { key: 'drugprice', p: 1 / 700, m: 0, sec: { ins: 2, pharma: -8, health: -3 }, infl: 0, cat: 'Politics', level: 'Major',
      title: () => 'New law caps medicine prices', body: 'Drug makers will earn less on their best-selling medicines. Insurers, who pay for them, gain.' },

    // ---- politics
    { key: 'electgood', p: 1 / 900, m: 1.5, sec: { bank: 2, oil: 2, build: 2 }, infl: 0, cat: 'Politics', level: 'Major',
      title: () => 'Business-friendly party wins the election', body: 'The winners campaigned on lower taxes and lighter regulation. Banks, energy and builders led the rally.' },
    { key: 'electbad', p: 1 / 900, m: -1.5, sec: { renew: 2, bank: -4, oil: -4, tel: -2 }, infl: 0.1, cat: 'Politics', level: 'Major',
      title: () => 'Election winner promises windfall taxes on banks and energy', body: 'The new government wants to tax what it calls excess profits. Banks and oil companies fell hardest.' },
    { key: 'taxcut', p: 1 / 1000, m: 2.5, sec: {}, infl: 0.2, cat: 'Politics', level: 'Major',
      title: () => 'Lawmakers pass a cut in company tax', body: 'Companies will keep more of what they earn from next year. Shares rose across the board.' },
    { key: 'taxhike', p: 1 / 1000, m: -2.5, sec: {}, infl: 0, cat: 'Politics', level: 'Major',
      title: () => 'Company tax to rise in new budget', body: 'The government will raise the tax on company profits to pay for public services. Shares fell across the board.' },
    { key: 'sanctions', p: 1 / 800, dur: [90, 300], m: -1, sec: { oil: 5, mine: 4, aero: 2, trans: -3, bank: -2 }, infl: 0.3, cat: 'Politics', level: 'Major',
      title: (l) => `Sweeping sanctions imposed on ${l[0]}`, body: 'Trade with a major exporter of raw materials is being cut off. Producers elsewhere gain; shippers and banks with business there lose.', end: (l) => `Sanctions on ${l[0]} are lifted` },
    { key: 'coup', p: 1 / 900, m: -1.5, sec: { oil: 4, mine: 3, bank: -2 }, infl: 0.2, cat: 'Politics', level: 'Major',
      title: (l) => `Military seizes power in ${l[0]}`, body: 'Borders are closed and exports have stopped. Buyers of its oil and metals are scrambling for other suppliers.' },
    { key: 'minwage', p: 1 / 800, m: -0.3, sec: { retail: -4, food: -3, agri: -2 }, infl: 0.2, cat: 'Politics', level: 'Moderate',
      title: () => 'Minimum wage to rise sharply', body: 'Good news for low-paid workers, a bigger wage bill for shops, restaurants and farms.' },
    { key: 'airules', p: 1 / 800, m: -0.3, sec: { ai: -9, soft: -3, tech: -3 }, infl: 0, cat: 'Politics', level: 'Major',
      title: () => 'Strict new law on artificial intelligence passed', body: 'AI companies must prove their systems are safe before release and can be fined heavily if they are not.' },
    { key: 'defence', p: 1 / 700, m: 0.3, sec: { aero: 8, tech: 2 }, infl: 0.1, cat: 'Politics', level: 'Major',
      title: () => 'Government announces biggest rise in defence spending in decades', body: 'Orders for aircraft, ships and satellites will follow for years.' },
    { key: 'healthplan', p: 1 / 800, m: 0, sec: { health: 6, pharma: 3, ins: -3 }, infl: 0, cat: 'Politics', level: 'Moderate',
      title: () => 'Public health budget boosted', body: 'Hospitals and clinics will receive more public money. Health insurers expect to lose customers to the public system.' },
    { key: 'gamecurb', p: 1 / 900, m: 0, sec: { game: -9, ent: -2 }, infl: 0, cat: 'Politics', level: 'Major',
      title: (l) => `${l[0]} limits how long children may play video games`, body: 'One of the largest games markets in the world is restricting play time and in-game spending for minors.' },
    { key: 'genstrike', p: 1 / 800, m: -1, sec: { trans: -5, retail: -3, auto: -3 }, infl: 0, cat: 'Politics', level: 'Moderate',
      title: () => 'Nationwide general strike brings transport to a halt', body: 'Trains, ports and many factories are shut for the day in a dispute over pensions.' },
    // ---- conflict
    { key: 'standoff', p: 1 / 600, dur: [20, 60], m: -2, sec: { aero: 4, oil: 4, trans: -2 }, infl: 0.2, cat: 'Global', level: 'Major',
      title: (l) => `Troops mass on the border between ${l[0]} and ${l[1]}`, body: 'Both governments say they do not want war, and neither is backing down. Investors are buying defence and energy shares and selling the rest.', end: (l) => `${l[0]} and ${l[1]} pull their troops back` },
    { key: 'attack', p: 1 / 900, m: -2.5, sec: { aero: 2, trans: -6, ins: -4, ent: -3 }, infl: 0, cat: 'Global', level: 'Severe',
      title: (l) => `Deadly attack in the capital of ${l[0]}`, body: 'Flights are grounded and public events are cancelled. Travel companies and insurers were hit hardest.' },
    { key: 'gridhack', p: 1 / 900, m: -1, sec: { soft: 5, tel: -4, renew: -2 }, infl: 0, cat: 'Global', level: 'Major',
      title: (l) => `State-backed hackers knock out the power grid in ${l[0]}`, body: 'Millions were left without electricity for a day. Governments everywhere are expected to spend more on cyber security.' },
    { key: 'canal', p: 1 / 700, dur: [10, 30], m: -0.8, sec: { oil: 2, retail: -3, auto: -3, elec: -3, trans: -2 }, infl: 0.2, cat: 'Global', level: 'Moderate',
      title: () => 'Grounded ship blocks a major shipping canal', body: 'Hundreds of cargo ships are queuing. Goods bound for shops and factories will arrive weeks late.', end: () => 'Shipping canal reopens' },
    // ---- the economy and the weather
    { key: 'housebust', p: 1 / 1200, dur: [90, 200], m: -1.5, sec: { re: -8, build: -7, bank: -4 }, infl: -0.2, cat: 'Economy', level: 'Major',
      title: () => 'House prices post their sharpest fall in years', body: 'Sellers are cutting prices and buyers are waiting. Builders, landlords and mortgage lenders all suffer.', end: () => 'House prices stop falling' },
    { key: 'metals', p: 1 / 700, m: 0, sec: { mine: 9, build: -3, auto: -2, elec: -2 }, infl: 0.3, cat: 'Economy', level: 'Major',
      title: () => 'Metal prices surge to record highs', body: 'Demand for copper, lithium and iron ore is outrunning supply. Miners gain; everyone who builds with metal pays more.' },
    { key: 'spendup', p: 1 / 600, m: 0.8, sec: { retail: 5, ent: 3, auto: 3 }, infl: 0.1, cat: 'Economy', level: 'Moderate',
      title: () => 'Consumer confidence hits a ten-year high', body: 'Households say they feel better off and plan to spend more on shopping, cars and nights out.' },
    { key: 'spenddown', p: 1 / 600, m: -0.8, sec: { food: 1, retail: -5, ent: -3, auto: -3 }, infl: -0.1, cat: 'Economy', level: 'Moderate',
      title: () => 'Consumer confidence slumps', body: 'Households are worried about their jobs and are putting off big purchases.' },
    { key: 'currency', p: 1 / 900, m: -2, sec: { mine: -2, bank: -4, fin: -3 }, infl: 0.3, cat: 'Economy', level: 'Major',
      title: (l) => `Currency of ${l[0]} collapses`, body: 'Investors are pulling money out of the country and out of banks that lent there.' },
    { key: 'heatwave', p: 1 / 500, m: 0, sec: { oil: 4, renew: 3, food: -2, agri: -3 }, infl: 0.2, cat: 'Global', level: 'Moderate',
      title: () => 'Record heatwave strains power supplies', body: 'Electricity demand is at an all-time high and crops are wilting in the fields.' },
  ];
  const REGIME_NEWS = [
    { m: 0.01, title: 'Economy back to healthy growth', body: 'Hiring and spending are rising again. The recovery has turned into a full expansion.' },
    { m: -0.01, title: 'Economic growth is slowing', body: 'Factory orders and hiring have cooled. Economists are split on whether a recession follows.' },
    { m: -0.025, title: 'Economy slips into recession', body: 'Output has shrunk and unemployment is rising. Companies that depend on spending are hit hardest; food, health and telecoms hold up best.' },
    { m: 0.02, title: 'Recession ends as economy starts to recover', body: 'Output is growing again. The companies that fell furthest in the recession tend to bounce back hardest.' },
  ];

  const verb = (ch) => (ch >= 0.15 ? 'surges' : ch >= 0.05 ? 'jumps' : ch >= 0.01 ? 'rises' : ch > -0.01 ? 'holds steady' : ch > -0.05 ? 'slips' : ch > -0.15 ? 'falls' : 'plunges');
  const pc = (x) => (Math.abs(x) * 100).toFixed(1) + '%';
  const spc = (x) => { const s = pc(x); return (x < 0 && s !== '0.0%' ? '-' : '+') + s; };
  const coTitle = (name, ch, after) => `${name} ${verb(ch)}${Math.abs(ch) < 0.01 ? '' : ' ' + pc(ch)} ${after}`;
  const level = (x) => (Math.abs(x) < 0.03 ? 'Minor' : Math.abs(x) < 0.1 ? 'Moderate' : Math.abs(x) < 0.25 ? 'Major' : 'Severe');
  return { LANDS, FIRST, LAST, SOURCES, CO, GLOBAL, REGIME_NEWS, verb, pc, spc, coTitle, level };
})();
if (typeof module !== 'undefined') module.exports = Events;
