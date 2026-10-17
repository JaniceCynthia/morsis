// Offline Decode-3. Used when the proxy is unreachable, rate-limited or has no
// key, and for the hero's instant first exchange. Each entry is shaped exactly
// like a live reply so the voice engine cannot tell the difference.
import type { SpeciesKey } from "./species";
import type { Signal, Turn } from "./types";

type Scripted = Signal & { note: string };

export const SCRIPT: Record<SpeciesKey, Scripted[]> = {
  raven: [
    { signal: "2 harsh yells, 0.9 s", units: 2, durationSec: 0.9, mood: "alarm", contour: [0.7, 0.9, 0.6, 0.8, 0.5, 0.6], confidence: 0.71,
      decoded: "Carcass by the ridge. Too many guards. Bring the young ones and we eat.",
      note: "Juvenile ravens yell at food to recruit others and outnumber territorial pairs." },
    { signal: "low knock + 3 rasps, 1.4 s", units: 4, durationSec: 1.4, mood: "curious", contour: [0.2, 0.6, 0.65, 0.55, 0.3, 0.4], confidence: 0.58,
      decoded: "I saw where you hid your hand. I will remember your face.",
      note: "Ravens recognise individual humans and track who watched them cache food." },
    { signal: "soft contact croak, 0.6 s", units: 1, durationSec: 0.6, mood: "affiliative", contour: [0.4, 0.45, 0.5, 0.42, 0.38, 0.35], confidence: 0.55,
      decoded: "You stand still, so you are not hunting. Stay where the wind can see you.",
      note: "Raven pairs keep in touch with quiet contact calls distinct from loud yells." },
  ],
  starling: [
    { signal: "whistle run + mimic phrase, 3.2 s", units: 8, durationSec: 3.2, mood: "curious", contour: [0.3, 0.8, 0.5, 0.9, 0.4, 0.7, 0.6, 0.85], confidence: 0.62,
      decoded: "Seven of us turn as one. Today the wind tastes like the river and the car alarm.",
      note: "Starlings keep learning new song elements, mimicry included, throughout life." },
    { signal: "rapid chatter, 1.8 s", units: 6, durationSec: 1.8, mood: "affiliative", contour: [0.6, 0.7, 0.65, 0.8, 0.55, 0.75], confidence: 0.57,
      decoded: "The reed bed is warm with bodies. Come before the light goes flat.",
      note: "Starlings gather in huge winter roosts, often in reed beds, at dusk." },
  ],
  elephant: [
    { signal: "3 rumbles, 18 Hz fundamental, 7 s", units: 3, durationSec: 7, mood: "calm", contour: [0.4, 0.55, 0.3, 0.35, 0.45, 0.3], confidence: 0.66,
      decoded: "The old one remembers the river bend. We walk at first light. You walk behind.",
      note: "Matriarchs lead families to water sources they remember for decades." },
    { signal: "rising contact rumble, 4 s", units: 2, durationSec: 4, mood: "curious", contour: [0.3, 0.4, 0.55, 0.6, 0.5, 0.4], confidence: 0.6,
      decoded: "Your feet are loud and your call has no ground in it. Who sent you?",
      note: "Elephants can detect rumbles as ground vibrations through their feet." },
  ],
  prairie: [
    { signal: "alarm chirp series, 12 units", units: 12, durationSec: 2.4, mood: "alarm", contour: [0.8, 0.7, 0.8, 0.75, 0.8, 0.7], confidence: 0.74,
      decoded: "Tall one. Blue on top. Slow. Not a hawk. Everybody up, but do not run yet.",
      note: "Prairie dog alarm calls encode an intruder’s size, shape and clothing colour." },
    { signal: "jump-yip, 2 units", units: 2, durationSec: 0.8, mood: "affiliative", contour: [0.5, 0.9, 0.7, 0.85, 0.6, 0.5], confidence: 0.61,
      decoded: "It passed. Everyone up. Eat now, the grass is safe again.",
      note: "The jump-yip spreads through a colony like a wave once danger has passed." },
  ],
  humpback: [
    { signal: "4-unit descending moan, 11 s", units: 4, durationSec: 11, mood: "calm", contour: [0.8, 0.6, 0.45, 0.3, 0.5, 0.25], confidence: 0.63,
      decoded: "This song came from the west two winters ago. Now it is ours. Sing it back slower.",
      note: "Humpback songs pass between populations and change year to year." },
    { signal: "upsweep + grunt, 3 s", units: 2, durationSec: 3, mood: "curious", contour: [0.2, 0.4, 0.7, 0.9, 0.3, 0.2], confidence: 0.56,
      decoded: "Your voice is thin and close to the surface. The cold water is south of the light.",
      note: "Humpbacks migrate thousands of kilometres between feeding and breeding grounds." },
  ],
  dolphin: [
    { signal: "signature whistle + click train, 1.6 s", units: 3, durationSec: 1.6, mood: "affiliative", contour: [0.2, 0.7, 0.4, 0.9, 0.6, 0.5], confidence: 0.77,
      decoded: "This is my shape. Say it back and I will know you mean me.",
      note: "Dolphins respond when they hear copies of their own signature whistle." },
    { signal: "echolocation buzz, 0.9 s", units: 5, durationSec: 0.9, mood: "curious", contour: [0.6, 0.65, 0.7, 0.8, 0.85, 0.9], confidence: 0.6,
      decoded: "I looked inside you with sound. Your middle is full of air and something ticking.",
      note: "Dolphin echolocation clicks can reveal internal structure, such as air spaces." },
  ],
};

const idx: Partial<Record<SpeciesKey, number>> = {};
export function scriptedReply(k: SpeciesKey): Scripted {
  const arr = SCRIPT[k];
  const i = ((idx[k] ?? -1) + 1) % arr.length;
  idx[k] = i;
  return arr[i];
}

const t = (individual: "A" | "B", s: Omit<Turn, "individual">): Turn => ({ individual, ...s });

export const EXCHANGES: Record<string, { turns: Turn[]; note: string }> = {
  humpbacks: {
    note: "New humpback song types have spread eastward across the South Pacific within a few years (Garland et al., 2011).",
    turns: [
      t("A", { signal: "rising moan phrase, 6 s", units: 3, durationSec: 6, mood: "calm", contour: [0.3, 0.5, 0.7, 0.6, 0.4, 0.5], confidence: 0.62, decoded: "I carry the song from the west. Listen to the third part. It turns upward." }),
      t("B", { signal: "low grunt pair, 3 s", units: 2, durationSec: 3, mood: "curious", contour: [0.25, 0.2, 0.3, 0.25, 0.2, 0.22], confidence: 0.55, decoded: "Ours goes down there. Ours has always gone down there." }),
      t("A", { signal: "upsweep repeated, 5 s", units: 4, durationSec: 5, mood: "affiliative", contour: [0.2, 0.6, 0.3, 0.7, 0.35, 0.8], confidence: 0.6, decoded: "Always is two winters. Try it. Up, then hold." }),
      t("B", { signal: "hesitant upsweep, 4 s", units: 2, durationSec: 4, mood: "curious", contour: [0.25, 0.45, 0.5, 0.55, 0.5, 0.45], confidence: 0.53, decoded: "Up. Hold. It feels like cold water in the throat." }),
    ],
  },
  dolphins: {
    note: "Bottlenose dolphins copy an absent ally's signature whistle, using it like a name (King & Janik, PNAS, 2013).",
    turns: [
      t("A", { signal: "signature whistle, 0.9 s", units: 1, durationSec: 0.9, mood: "affiliative", contour: [0.3, 0.8, 0.5, 0.9, 0.6, 0.4], confidence: 0.78, decoded: "This is me. The shape that bends twice." }),
      t("B", { signal: "her whistle copied, then his own, 1.6 s", units: 2, durationSec: 1.6, mood: "affiliative", contour: [0.3, 0.8, 0.5, 0.2, 0.7, 0.35], confidence: 0.74, decoded: "Bends twice. I kept it. Here is mine, still the same." }),
      t("A", { signal: "click train + whistle, 1.2 s", units: 3, durationSec: 1.2, mood: "curious", contour: [0.6, 0.65, 0.7, 0.5, 0.8, 0.6], confidence: 0.6, decoded: "You taste of the outer reef. Did the big ones follow you?" }),
      t("B", { signal: "short burst pulse, 0.5 s", units: 2, durationSec: 0.5, mood: "alarm", contour: [0.8, 0.9, 0.85, 0.7, 0.9, 0.8], confidence: 0.58, decoded: "One did. Stay shallow tonight." }),
    ],
  },
  elephants: {
    note: "Wild African elephants respond more to calls originally addressed to them, suggesting name-like labels (Pardo et al., 2024).",
    turns: [
      t("A", { signal: "let's-go rumble, 18 Hz, 6 s", units: 2, durationSec: 6, mood: "calm", contour: [0.4, 0.5, 0.45, 0.35, 0.3, 0.3], confidence: 0.67, decoded: "Water is past the two dead trees. Your name, little one. Close the gap." }),
      t("B", { signal: "rising contact rumble, 3 s", units: 1, durationSec: 3, mood: "alarm", contour: [0.4, 0.5, 0.65, 0.75, 0.7, 0.6], confidence: 0.59, decoded: "I hear you through my feet but I cannot see you." }),
      t("A", { signal: "answering rumble, 5 s", units: 2, durationSec: 5, mood: "affiliative", contour: [0.35, 0.4, 0.38, 0.42, 0.36, 0.34], confidence: 0.64, decoded: "Follow the ground. I will keep calling until your shadow touches mine." }),
      t("B", { signal: "short rumble + trumpet, 2 s", units: 2, durationSec: 2, mood: "affiliative", contour: [0.4, 0.45, 0.9, 0.85, 0.5, 0.4], confidence: 0.6, decoded: "Coming. The dust is in my mouth." }),
    ],
  },
  prairie: {
    note: "Gunnison's prairie dogs vary alarm calls with a human's clothing colour, shape and size (Slobodchikoff et al., 2009).",
    turns: [
      t("A", { signal: "alarm chirp series, 10 units", units: 10, durationSec: 2, mood: "alarm", contour: [0.8, 0.75, 0.85, 0.8, 0.78, 0.82], confidence: 0.75, decoded: "Tall one. Yellow on top. Walking slow, straight through." }),
      t("B", { signal: "3 chirps, 0.6 s", units: 3, durationSec: 0.6, mood: "curious", contour: [0.7, 0.75, 0.7, 0.72, 0.7, 0.68], confidence: 0.6, decoded: "The yellow one from before?" }),
      t("A", { signal: "chirp series, faster, 8 units", units: 8, durationSec: 1.4, mood: "alarm", contour: [0.85, 0.8, 0.9, 0.85, 0.88, 0.9], confidence: 0.7, decoded: "New one. Carrying something long. Down if it turns." }),
      t("B", { signal: "jump-yip, 2 units", units: 2, durationSec: 0.8, mood: "affiliative", contour: [0.5, 0.9, 0.7, 0.85, 0.6, 0.5], confidence: 0.57, decoded: "It is past the third mound. Everyone up." }),
    ],
  },
  ravens: {
    note: "Juvenile ravens yell at carcasses to recruit others and overwhelm territorial adults (Heinrich, 1988).",
    turns: [
      t("A", { signal: "loud yell series, 1.5 s", units: 3, durationSec: 1.5, mood: "alarm", contour: [0.7, 0.9, 0.75, 0.85, 0.7, 0.8], confidence: 0.72, decoded: "Meat in the snow. Two old ones guarding. Come now, all of you." }),
      t("B", { signal: "2 answering yells, 0.9 s", units: 2, durationSec: 0.9, mood: "curious", contour: [0.6, 0.8, 0.7, 0.75, 0.6, 0.65], confidence: 0.63, decoded: "How many of us are needed?" }),
      t("A", { signal: "yell + knock, 1.1 s", units: 3, durationSec: 1.1, mood: "alarm", contour: [0.8, 0.85, 0.3, 0.75, 0.8, 0.5], confidence: 0.66, decoded: "More than they can chase. Bring the loud ones from the roost." }),
      t("B", { signal: "low rasp, 0.7 s", units: 1, durationSec: 0.7, mood: "curious", contour: [0.3, 0.35, 0.3, 0.28, 0.3, 0.32], confidence: 0.54, decoded: "A walker is watching from the trees. Do not let it see where we hide the rest." }),
    ],
  },
  "mixed-sky": {
    note: "Many birds respond to the alarm calls of other species, eavesdropping across the species line (Magrath et al., 2015).",
    turns: [
      t("A", { signal: "sharp alarm, 3 units", units: 3, durationSec: 0.5, mood: "alarm", contour: [0.9, 0.85, 0.9, 0.88, 0.9, 0.87], confidence: 0.69, decoded: "Hawk. Low over the roof line. Everybody in." }),
      t("B", { signal: "low knock, 0.4 s", units: 1, durationSec: 0.4, mood: "curious", contour: [0.25, 0.3, 0.25, 0.22, 0.25, 0.24], confidence: 0.52, decoded: "Small ones are loud. Where?" }),
      t("A", { signal: "alarm, repeated, 5 units", units: 5, durationSec: 0.9, mood: "alarm", contour: [0.9, 0.88, 0.92, 0.9, 0.91, 0.89], confidence: 0.64, decoded: "Toward the tall light. Turning back." }),
      t("B", { signal: "harsh yell, 0.8 s", units: 2, durationSec: 0.8, mood: "alarm", contour: [0.7, 0.85, 0.75, 0.8, 0.7, 0.75], confidence: 0.6, decoded: "I see it. I will chase it off my wire." }),
    ],
  },
};
