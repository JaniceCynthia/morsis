// Species and Eavesdrop pairs. Shared by the browser and the Decode-3 proxy, so
// keep this file free of DOM and Node APIs.

export type SpeciesKey = "raven" | "starling" | "elephant" | "prairie" | "humpback" | "dolphin";
export type Zone = "Sky" | "Land" | "Sea";

export interface Species {
  key: SpeciesKey;
  name: string;
  short: string;
  latin: string;
  zone: Zone;
  /** Hearing band of the species' calls in Hz, for the Console readout. */
  band: [number, number];
  /** Default Hearing shift in octaves, so out-of-range calls start audible. */
  shift: number;
  line: string;
  traits: string[];
  facts: string;
  chips: string[];
}

export const SPECIES: Record<SpeciesKey, Species> = {
  raven: {
    key: "raven",
    name: "Common raven",
    short: "Raven",
    latin: "Corvus corax",
    zone: "Sky",
    band: [300, 4000],
    shift: 0,
    line: "Recruits allies to food with a dedicated yell, and remembers who was watching.",
    traits: ["Recruitment yells at carcasses", "Recognises individual humans", "Caches food, tracks observers"],
    facts:
      'Ravens are highly social corvids. Juvenile ravens give loud "yells" at large carcasses to recruit other ravens so they can overpower territorial adult pairs. They remember individual humans and hold grudges, cache food and watch who sees them cache.',
    chips: ["Is there food nearby?", "Who is watching you?", "Will you remember me?"],
  },
  starling: {
    key: "starling",
    name: "Common starling",
    short: "Starling",
    latin: "Sturnus vulgaris",
    zone: "Sky",
    band: [1000, 8000],
    shift: 0,
    line: "Never stops learning new sounds, machines and other birds included.",
    traits: ["Open-ended song learner", "Murmurations track ~7 neighbours", "Mimics its surroundings"],
    facts:
      "European starlings are open-ended song learners: they keep adding new elements, including mimicked sounds of other birds and machines, throughout life. They roost and fly in vast murmurations where each bird tracks about seven neighbours.",
    chips: ["What does the flock feel like?", "Which sounds do you collect?", "Where do you sleep tonight?"],
  },
  elephant: {
    key: "elephant",
    name: "African elephant",
    short: "Elephant",
    latin: "Loxodonta africana",
    zone: "Land",
    band: [14, 1000],
    shift: 2,
    line: "Calls family members by name-like rumbles that travel through the ground.",
    traits: ["Infrasonic rumbles, 10 to 35 Hz", "Name-like calls for individuals", "Matriarchs remember water for decades"],
    facts:
      "African elephants communicate with low-frequency rumbles (fundamentals around 10 to 35 Hz) that carry kilometres through air and ground; they can detect seismic vibrations with their feet and trunks. A 2024 study found wild elephants use name-like calls to address specific individuals. Matriarchs lead family groups and remember water sources for decades.",
    chips: ["Where is the water this year?", "What is your name for me?", "Who leads your family?"],
  },
  prairie: {
    key: "prairie",
    name: "Gunnison’s prairie dog",
    short: "Prairie dog",
    latin: "Cynomys gunnisoni",
    zone: "Land",
    band: [2000, 10000],
    shift: 0,
    line: "Packs an intruder’s size, shape and colour into a single alarm call.",
    traits: ["Predator-specific alarm calls", "Encodes clothing colour", "Colonies with sentries"],
    facts:
      "Gunnison’s prairie dogs give alarm calls that differ by predator type (hawk, human, coyote, dog) and, for humans, encode size, shape and the colour of clothing. They live in colonies of burrow systems with sentries.",
    chips: ["Am I a danger to you?", "What colour is my shirt?", "What did the hawk look like?"],
  },
  humpback: {
    key: "humpback",
    name: "Humpback whale",
    short: "Humpback",
    latin: "Megaptera novaeangliae",
    zone: "Sea",
    band: [30, 8000],
    shift: 0,
    line: "Sings structured songs that spread between populations like culture.",
    traits: ["Hierarchical song: units, phrases, themes", "Songs travel between oceans", "Bubble-net feeding"],
    facts:
      "Male humpback whales sing long, hierarchically structured songs (units, phrases, themes) that all males in a population share and change over time; new songs have spread across the South Pacific from population to population. They migrate thousands of kilometres between polar feeding grounds and tropical breeding grounds and feed with bubble nets.",
    chips: ["Can you teach me your song?", "Where are you travelling?", "Is the ocean loud today?"],
  },
  dolphin: {
    key: "dolphin",
    name: "Bottlenose dolphin",
    short: "Dolphin",
    latin: "Tursiops truncatus",
    zone: "Sea",
    band: [2000, 150000],
    shift: 0,
    line: "Answers to the signature whistle that works as its name.",
    traits: ["Signature whistles as names", "Echolocation clicks", "Long-term alliances"],
    facts:
      "Bottlenose dolphins develop individual signature whistles that work like names; they respond when they hear copies of their own whistle. They echolocate with high-frequency clicks, live in fission-fusion societies and form long-term alliances.",
    chips: ["Do you have a name?", "What do you see with sound?", "Who is in your alliance?"],
  },
};

export const ORDER: SpeciesKey[] = ["raven", "starling", "elephant", "prairie", "humpback", "dolphin"];

export interface Individual {
  species: SpeciesKey;
  label: string;
  /** Voiceprint seed: fixed per Individual so two of a kind never sound alike. */
  print: number;
}

export interface Pair {
  id: string;
  title: string;
  zone: Zone;
  a: Individual;
  b: Individual;
  situation: string;
  topics: string[];
}

/** Eavesdrop pairs: only animals that could plausibly hear each other. */
export const PAIRS: Pair[] = [
  {
    id: "humpbacks",
    title: "Two singers",
    zone: "Sea",
    a: { species: "humpback", label: "Singer from the western population", print: 11 },
    b: { species: "humpback", label: "Local singer", print: 47 },
    situation: "Breeding grounds, night. A visiting male is singing a newer song than the local one.",
    topics: ["the new song", "the route south", "a ship passing overhead"],
  },
  {
    id: "dolphins",
    title: "Naming whistles",
    zone: "Sea",
    a: { species: "dolphin", label: "Adult female", print: 23 },
    b: { species: "dolphin", label: "Her ally, returning after days apart", print: 71 },
    situation: "Two allied dolphins reunite in a shallow bay and exchange signature whistles.",
    topics: ["where they have been", "a school of mullet", "a stranger in the bay"],
  },
  {
    id: "elephants",
    title: "Matriarch and calf",
    zone: "Land",
    a: { species: "elephant", label: "Matriarch", print: 5 },
    b: { species: "elephant", label: "Young calf, fallen behind", print: 88 },
    situation: "Dry season. The family is walking to a remembered waterhole and the calf has lagged.",
    topics: ["the waterhole", "lions on the ridge", "the calf's name"],
  },
  {
    id: "prairie",
    title: "Sentry and colony",
    zone: "Land",
    a: { species: "prairie", label: "Sentry on the mound", print: 31 },
    b: { species: "prairie", label: "Neighbour at the next burrow", print: 64 },
    situation: "A human in a yellow jacket is walking slowly across the colony.",
    topics: ["the walker", "a hawk overhead", "the coyote from last night"],
  },
  {
    id: "ravens",
    title: "The yell",
    zone: "Sky",
    a: { species: "raven", label: "Juvenile that found food", print: 17 },
    b: { species: "raven", label: "Juvenile arriving from the roost", print: 52 },
    situation: "A carcass in the snow, guarded by a territorial adult pair.",
    topics: ["the guards", "who else is coming", "a hiker watching"],
  },
  {
    id: "mixed-sky",
    title: "Borrowed alarm",
    zone: "Sky",
    a: { species: "starling", label: "Starling at the roost edge", print: 39 },
    b: { species: "raven", label: "Raven on the wire", print: 76 },
    situation: "Dusk at a roost. A hawk passes; the starling's alarm reaches a raven nearby.",
    topics: ["the hawk", "the roost", "the noise of the city"],
  },
];
