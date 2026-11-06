// Species database for Life on Earth. Every species carries its provenance: what was observed, what is modelled.
// births.low/high = plausible range of births (or hatchings) per year; the lottery uses the geometric mean of the
// range ("point") unless the species is human, whose number is summed from data/countries.json at load time.
// "Birth" = live birth, or egg laid for egg-layers (the player lives the egg stage too, so eggs that never hatch count). Nothing here is a census of all animal births.
(function (g) {
  const LE = (g.LE = g.LE || {});
  const S = (u, l) => ({ label: l, url: u });

  LE.SPECIES = [
    {
      id: 'human', name: 'Human', sci: 'Homo sapiens', group: 'Humans', module: 'human', scope: 'core', emoji: '🧑',
      habitat: 'Every continent', conservation: 'Not assessed', img: 'human',
      blurb: 'Eight billion lives, no two alike. Your country, family and money are drawn from real demographic data.',
      births: {
        fromData: 'countries', confidence: 'high', kind: 'observed + derived',
        method: 'Sum over 196 countries of crude birth rate x population (World Bank compilation of UN World Population Prospects).',
        popn: '~8.0 billion people (2022)', year: 2022,
        sources: [S('https://data.worldbank.org/indicator/SP.DYN.CBRT.IN', 'World Bank: crude birth rate'), S('https://population.un.org/wpp/', 'UN World Population Prospects')],
        assumptions: ['Country figures are modelled by the UN, not a registration census.'],
      },
    },
    {
      id: 'dog', name: 'Domestic dog', sci: 'Canis lupus familiaris', group: 'Domestic animals', module: 'companion', scope: 'core', emoji: '🐕',
      habitat: 'Homes, streets and villages worldwide', conservation: 'Domestic', img: 'dog',
      blurb: 'Born into a litter, then fortune decides: a family, a shelter, or the street. Trust is everything.',
      births: {
        low: 700e6 / 8, high: 900e6 / 4, confidence: 'low', kind: 'modelled estimate',
        method: 'Births per year ~ population / mean life expectancy at birth (stationary-population turnover).',
        popn: '700-900 million dogs, roughly 60-85% free-ranging or semi-owned depending on source', year: 2020,
        sources: [S('https://en.wikipedia.org/wiki/Free-ranging_dog', 'Free-ranging dog (summary of population estimates)'), S('https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4684217/', 'Population estimation methods for free-ranging dogs (PLOS ONE review)')],
        assumptions: ['Life expectancy at birth of 4-8 years is an ASSUMPTION (puppy mortality is high; no single global figure).', 'Population figures come from secondary summaries, not a census.'],
      },
    },
    {
      id: 'cat', name: 'Domestic cat', sci: 'Felis catus', group: 'Domestic animals', module: 'companion', scope: 'core', emoji: '🐈',
      habitat: 'Homes, farms and streets worldwide', conservation: 'Domestic', img: 'cat',
      blurb: 'Curious, independent, territorial. Your world is a few streets, and you decide who belongs in it.',
      births: {
        low: 500e6 / 8, high: 1000e6 / 3, confidence: 'low', kind: 'modelled estimate',
        method: 'Births per year ~ population / mean life expectancy at birth (stationary-population turnover).',
        popn: '500 million - 1 billion cats (owned plus stray/feral); the figure is notoriously uncertain', year: 2021,
        sources: [S('https://www.cambridge.org/core/product/identifier/CBO9781139177177A028/type/BOOK_PART', 'Cat population management (Cambridge, cites 272M in 2007)')],
        assumptions: ['Life expectancy at birth of 3-8 years is an ASSUMPTION.', 'Popular-web totals conflict (370M-1B); the range spans them.'],
      },
    },
    {
      id: 'lion', name: 'African lion', sci: 'Panthera leo', group: 'Wild mammals', module: 'lion', scope: 'core', emoji: '🦁',
      habitat: 'African savanna and woodland', conservation: 'Vulnerable (IUCN)', img: 'lion',
      blurb: 'A cub in a pride. Sisters, scarce prey, rival males and long hot seasons shape everything.',
      births: {
        low: 20000 / 8, high: 39000 / 4, confidence: 'low', kind: 'modelled estimate',
        method: 'Births per year ~ population / mean life expectancy at birth; cub mortality above 50% in the first year lowers life expectancy.',
        popn: '~20,000-39,000 wild lions', year: 2016,
        sources: [S('https://www.cms.int/sites/default/files/document/ac27_cites_periodic_rev_status_african_lion_across_range_e.pdf', 'CITES/CMS periodic review: status of the African lion')],
        assumptions: ['Life expectancy at birth of 4-8 years is an ASSUMPTION consistent with high cub mortality.', 'Captive lions are excluded.'],
      },
    },
    {
      id: 'penguin', name: 'Emperor penguin', sci: 'Aptenodytes forsteri', group: 'Birds', module: 'penguin', scope: 'core', emoji: '🐧',
      habitat: 'Antarctic sea ice and the Southern Ocean', conservation: 'Near Threatened (IUCN)', img: 'penguin',
      blurb: 'An egg balanced on a father\'s feet in the darkest winter on Earth. Then the ice, the sea, and a long journey.',
      births: {
        low: 200000, high: 280000, confidence: 'medium', kind: 'modelled estimate',
        method: 'Breeding pairs x one egg per pair per year. Hatching failures are part of the life the player lives.',
        popn: '~238,000 breeding pairs (satellite census, 2009 data), later analyses suggest a ~10% decline 2009-2018', year: 2018,
        sources: [S('https://figshare.utas.edu.au/articles/journal_contribution/An_emperor_penguin_population_estimate_the_first_global_synoptic_survey_of_a_species_from_space/22956794', 'Fretwell et al. 2012 satellite census'), S('https://datadryad.org/dataset/doi:10.5061/dryad.m63xsj48v', 'Global analysis of emperor penguin populations (LaRue et al.)')],
        assumptions: ['Range of 200,000-280,000 pairs is an ASSUMPTION bracketing the census and later decline.'],
      },
    },
    {
      id: 'turtle', name: 'Green sea turtle', sci: 'Chelonia mydas', group: 'Reptiles', module: 'turtle', scope: 'core', emoji: '🐢',
      habitat: 'Tropical beaches, open ocean and seagrass meadows', conservation: 'Endangered (IUCN 2004 global assessment; check current)', img: 'turtle',
      blurb: 'One of a hundred eggs in warm sand. Only a handful in a thousand will ever return to nest.',
      births: {
        low: 80000 * 3 * 93, high: 250000 * 5 * 124, confidence: 'low', kind: 'modelled estimate',
        method: 'Nesting females/yr x clutches per female x eggs per clutch (eggs laid).',
        popn: 'No verified global count of nesting females was found', year: 2010,
        sources: [S('https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2017.00428/text', 'Frontiers in Marine Science (nesting biology)'), S('https://zoolstud.sinica.edu.tw/Journals/48.1/83.pdf', 'Zoological Studies (green turtle nesting)')],
        assumptions: ['80,000-250,000 nesting females per year is an ASSUMPTION (not verified against a global assessment).', 'Clutch size 93-124 and 3-7 clutches per female come from site studies (Aves Island, Saipan, Sri Lanka); the game models hatching success itself.'],
      },
    },
    {
      id: 'whale', name: 'Blue whale', sci: 'Balaenoptera musculus', group: 'Marine mammals', module: 'whale', scope: 'core', emoji: '🐋',
      habitat: 'Open ocean worldwide', conservation: 'Endangered (IUCN)', img: 'whale',
      blurb: 'You are born the size of a small boat, nursing on the richest milk in the sea, learning the long song.',
      births: {
        low: 5000 / 2 / 2.57, high: 15000 / 2 / 2.57, confidence: 'medium', kind: 'modelled estimate',
        method: 'Mature individuals x 50% female / mean calving interval (2.57 years, observed in the Gulf of California).',
        popn: '5,000-15,000 mature individuals', year: 2020,
        sources: [S('https://cascadiaresearch.org/files/Sears_etal_2013_ESR.pdf', 'Sears et al. 2013, calving intervals'), S('https://extapps.dec.ny.gov/fs/programs/dfw/SWAP2025/Mammals-Marine/Blue%20whale.pdf', 'Species summary citing 5,000-15,000 mature')],
        assumptions: ['Assumes every mature female breeds on the observed interval.'],
      },
    },
    {
      id: 'monarch', name: 'Monarch butterfly', sci: 'Danaus plexippus', group: 'Insects', module: 'monarch', scope: 'insect', emoji: '🦋',
      habitat: 'Meadows of North America and the Mexican mountains', conservation: 'Migratory population Endangered (IUCN 2022)', img: 'monarch',
      blurb: 'An egg on a milkweed leaf. Weeks to live, or, if you are born late, a journey of 4,000 km.',
      births: {
        low: 5e8, high: 2e10, confidence: 'low', kind: 'modelled estimate',
        method: 'Order-of-magnitude range for eggs laid per year across all generations and populations.',
        popn: 'Eastern overwintering population is counted by forest area; summer populations are not counted', year: 2020,
        sources: [S('https://www.iucnredlist.org/species/159446/143056507', 'IUCN Red List: Danaus plexippus')],
        assumptions: ['Range is a wide order-of-magnitude ASSUMPTION; no defensible precise value exists.', 'Excluded from the default lottery for gameplay: insects hatch in such numbers that including them would make nearly every draw an insect.'],
      },
    },
  ];

  // Species researched but excluded from the evidence-based lottery until a defensible estimate exists.
  LE.UNAVAILABLE = [
    { name: 'Honeybee', why: 'Colony counts exist, but worker births per colony per year vary by orders of magnitude; no defensible range yet.' },
    { name: 'Ant (all species)', why: 'Roughly 20 quadrillion individuals, but thousands of species with unknown turnover; the number would swamp every other species.' },
    { name: 'Great white shark', why: 'No reliable global abundance estimate.' },
    { name: 'Octopus', why: 'Hundreds of species with unknown populations; single-species data are too sparse.' },
    { name: 'Snow leopard, red panda, axolotl', why: 'Reliable data exist for population size, but no gameplay module is built yet. They join when their lives are playable.' },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
