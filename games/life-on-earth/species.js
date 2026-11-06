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
    ...[
      ['elephant', 'African elephant', 'Loxodonta africana', 'Wild mammals', '🐘', 'African savanna and woodland', 'Endangered (IUCN 2021)', 'Calf of a herd led by a grandmother. Memory, drought and the long walk to water.', 12700, 29000, 'low',
        'Adult females (20-28% of the population) divided by the calving interval (4-5.5 years).', '~350,000 savanna elephants counted in 2016 (Great Elephant Census) to ~415,000 estimated', 2016, 'Loxodonta africana', ['Adult-female share and calving interval are ASSUMPTIONS from field studies.', 'Forest elephants are excluded.']],
      ['wolf', 'Grey wolf', 'Canis lupus', 'Wild mammals', '🐺', 'Northern forest, tundra and steppe', 'Least Concern (IUCN)', 'A pup in a pack. Scent, snow, rivals and the question of whether to leave home.', 50000, 100000, 'low',
        'Births per year ~ population / life expectancy at birth (3-5 years, high pup mortality).', '~250,000-300,000 wolves worldwide', 2018, 'Canis lupus', ['Life expectancy at birth of 3-5 years is an ASSUMPTION.', 'Global population is a rough sum of national estimates.']],
      ['chimp', 'Chimpanzee', 'Pan troglodytes', 'Wild mammals', '🐒', 'Tropical African forest', 'Endangered (IUCN 2016)', 'An infant clinging to its mother in the canopy. Fig trees, tools and community politics.', 10800, 30000, 'low',
        'Births per year ~ population / life expectancy at birth (10-16 years).', '~172,700-299,700 chimpanzees (IUCN 2016)', 2016, 'Pan troglodytes', ['Life expectancy at birth of 10-16 years is an ASSUMPTION.', 'Population ranges come from IUCN modelling, not a census.']],
      ['panda', 'Giant panda', 'Ailuropoda melanoleuca', 'Wild mammals', '🐼', 'Bamboo forest in the mountains', 'Vulnerable (IUCN 2016)', 'A hundred-gram cub in a hollow tree. Bamboo, mist and a mountain to yourself.', 120, 312, 'low',
        'Births per year ~ wild population / life expectancy at birth (8-15 years). Captive pandas excluded.', 'About 1,800 wild adults and subadults (China national survey, 2014); later estimates are higher', 2014, 'Ailuropoda melanoleuca', ['Life expectancy at birth of 8-15 years is an ASSUMPTION.', 'Population figures exclude cubs; the range allows for growth since 2014.']],
      ['orca', 'Orca', 'Orcinus orca', 'Marine mammals', '🐬', 'Cold coastal and open ocean', 'Data Deficient (IUCN)', 'Born into a family led by a grandmother. Calls, culture, and a long, social life.', 1500, 3500, 'low',
        'Mature females (~25% of the population) divided by a calving interval of about 5 years.', 'Roughly 50,000 orcas worldwide', 2018, 'Orcinus orca', ['Global population is a rough estimate (IUCN lists the species as Data Deficient).', 'Ecotypes differ widely; the game uses pooled figures.']],
      ['polar', 'Polar bear', 'Ursus maritimus', 'Wild mammals', '🐻‍❄️', 'Arctic sea ice', 'Vulnerable (IUCN)', 'Born in a snow den in mid-winter. Seals, shrinking ice, and a long walk home.', 1470, 3440, 'medium',
        'Births per year ~ population / life expectancy at birth (9-15 years).', '~22,000-31,000 polar bears (IUCN Polar Bear Specialist Group)', 2015, 'Ursus maritimus', ['Life expectancy at birth of 9-15 years is an ASSUMPTION.', 'Some subpopulations have no recent count.']],
      ['eagle', 'Bald eagle', 'Haliaeetus leucocephalus', 'Birds', '🦅', 'Tall trees beside lakes, rivers and coasts', 'Least Concern (IUCN)', 'An egg in a nest the size of a car. A river, a long fall, and white feathers at five.', 107000, 157000, 'medium',
        'Nesting pairs x eggs per clutch (1.5-2.2 eggs laid per pair per year).', '~71,000 nesting pairs in the lower 48 US states (USFWS 2020 estimate)', 2020, 'Haliaeetus leucocephalus', ['Counts only the lower 48 US states; Alaska and Canada hold many more.', 'Clutch size range is an ASSUMPTION from published averages.']],
      ['koala', 'Koala', 'Phascolarctos cinereus', 'Wild mammals', '🐨', 'Eucalyptus forest and woodland', 'Vulnerable (IUCN); Endangered in parts of Australia', 'A jelly-bean joey in a pouch. Eucalyptus, heat, and a forest cut by roads.', 30000, 115000, 'low',
        'Adult females (about half the population) x joeys born per female per year (0.6-0.7).', '~100,000 to 330,000 koalas (estimates conflict)', 2018, 'Phascolarctos cinereus', ['Population estimates conflict widely, so the range is wide.', 'Joeys per female per year is an ASSUMPTION.']],
      ['giraffe', 'Giraffe', 'Giraffa camelopardalis', 'Wild mammals', '🦒', 'African savanna and acacia woodland', 'Vulnerable (IUCN)', 'Born standing up, a two-metre fall. Lions, long necks and a very tall view.', 12000, 21000, 'low',
        'Mature females (28-33% of the population) x calves per female per year (0.45-0.55).', '~97,500-117,000 giraffes (IUCN assessments)', 2018, 'Giraffa camelopardalis', ['Female share and calving rate are ASSUMPTIONS.', 'Treats giraffe as one group; taxonomy is debated.']],
      ['tiger', 'Tiger', 'Panthera tigris', 'Wild mammals', '🐅', 'Forest, grassland and mangrove', 'Endangered (IUCN)', 'A cub in a thicket. A solitary giant in a world of rivals, prey and people.', 373, 930, 'low',
        'Births per year ~ wild population / life expectancy at birth (6-10 years; cub mortality is high).', '~3,700-5,600 wild tigers (IUCN 2022)', 2022, 'Panthera tigris', ['Life expectancy at birth of 6-10 years is an ASSUMPTION.', 'Captive tigers are excluded.']],
    ].map(([id, name, sci, group, emoji, habitat, conservation, blurb, low, high, confidence, method, popn, year, q, assumptions]) => ({
      id, name, sci, group, module: id, scope: 'core', emoji, habitat, conservation, img: id, blurb,
      births: { low, high, confidence, kind: 'modelled estimate', method, popn, year, sources: [S('https://www.iucnredlist.org/search?query=' + encodeURIComponent(q) + '&searchType=species', 'IUCN Red List: ' + sci)], assumptions },
    })),
  ];

  // Species researched but excluded from the evidence-based lottery until a defensible estimate exists.
  LE.UNAVAILABLE = [
    { name: 'Honeybee', why: 'Colony counts exist, but worker births per colony per year vary by orders of magnitude; no defensible range yet.' },
    { name: 'Ant (all species)', why: 'Roughly 20 quadrillion individuals, but thousands of species with unknown turnover; the number would swamp every other species.' },
    { name: 'Great white shark', why: 'No reliable global abundance estimate.' },
    { name: 'Octopus', why: 'Hundreds of species with unknown populations; single-species data are too sparse.' },
    { name: 'Snow leopard, red panda, axolotl', why: 'Reliable data exist for population size, but no gameplay module is built yet. They join when their lives are playable.' },
    { name: 'Farmed animals (chickens, pigs, cattle)', why: 'Tens of billions are born each year, so in an honest lottery nearly every draw would be a farmed animal. They would need an opt-in scope, not a default.' },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
