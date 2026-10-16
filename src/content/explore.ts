/**
 * Text for the 3D pages (info panel, legend, steps). Plain data — no three.js here, so any page may import it.
 * Wording is summarised from src/content/lessons.ts ("sarcomere-and-myofilaments", "contraction-and-relaxation")
 * and the lecture sheet "Muscular tissues I" — do not add content that is not in the lessons (rule R6).
 *
 * Colours: real proteins have no colour at this scale, so these follow the common textbook convention
 * (thin filament blue, thick filament red) and are also told apart by shape + label, never by colour alone.
 */
export type PartId = "zdisc" | "mline" | "actin" | "tropomyosin" | "troponin" | "myosin" | "titin" | "nebulin";
export type BandId = "aband" | "iband" | "hzone";

export type PartInfo = {
  id: PartId;
  name: string;
  /** Where it belongs, shown as a small eyebrow above the name. */
  group: "Thin filament" | "Thick filament" | "Structural protein" | "Sarcomere landmark";
  colour: string;
  /** How to recognise it without colour. */
  looks: string;
  points: string[];
  lesson: { slug: string; label: string };
};

const SARCOMERE_LESSON = { slug: "sarcomere-and-myofilaments", label: "Myofilaments and the sarcomere" };

export const PARTS: PartInfo[] = [
  {
    id: "actin",
    name: "Actin",
    group: "Thin filament",
    colour: "#38bdf8",
    looks: "Two twisted strings of beads",
    points: [
      "The main protein of the thin filament.",
      "G-actin molecules join into strands of F-actin arranged in a helix.",
      "Each actin molecule has a site where a myosin head can bind.",
    ],
    lesson: SARCOMERE_LESSON,
  },
  {
    id: "tropomyosin",
    name: "Tropomyosin",
    group: "Thin filament",
    colour: "#eab308",
    looks: "Long thin strand lying along the actin",
    points: [
      "A long, fibrous regulatory protein lying along the actin filament.",
      "In a relaxed fiber it covers the myosin-binding regions on actin, preventing cross-bridge formation.",
    ],
    lesson: SARCOMERE_LESSON,
  },
  {
    id: "troponin",
    name: "Troponin (TnC · TnI · TnT)",
    group: "Thin filament",
    colour: "#16a34a",
    looks: "Small knobs spaced along the thin filament",
    points: [
      "Troponin C (TnC) binds Ca²⁺.",
      "Troponin I (TnI) contributes to inhibition of actin–myosin interaction.",
      "Troponin T (TnT) binds to tropomyosin.",
      "When Ca²⁺ binds TnC, tropomyosin moves away from the myosin-binding sites, so actin and myosin can interact.",
    ],
    lesson: SARCOMERE_LESSON,
  },
  {
    id: "myosin",
    name: "Myosin",
    group: "Thick filament",
    colour: "#e11d48",
    looks: "Thick rods with heads sticking out",
    points: [
      "The main protein of the thick filament — a motor protein that turns the energy of ATP into mechanical work.",
      "Its long tails point toward the centre of the sarcomere; the globular heads project outward and bind actin.",
      "Heads have sites for actin binding and ATP hydrolysis; repeated head–actin interactions pull the thin filaments toward the centre.",
    ],
    lesson: SARCOMERE_LESSON,
  },
  {
    id: "zdisc",
    name: "Z disc",
    group: "Sarcomere landmark",
    colour: "#71717a",
    looks: "The two end plates",
    points: [
      "Marks the boundary between neighbouring sarcomeres — one sarcomere runs from one Z disc to the next.",
      "Thin filaments are anchored here and extend toward the centre.",
      "During contraction the Z discs move closer together.",
    ],
    lesson: SARCOMERE_LESSON,
  },
  {
    id: "mline",
    name: "M line",
    group: "Sarcomere landmark",
    colour: "#7c3aed",
    looks: "The thin plate in the middle",
    points: ["Located at the centre of the sarcomere.", "Its proteins help organise and stabilise the thick filaments."],
    lesson: SARCOMERE_LESSON,
  },
  {
    id: "titin",
    name: "Titin",
    group: "Structural protein",
    colour: "#f472b6",
    looks: "Fine springs from each Z disc to the M line",
    points: [
      "A large elastic protein associated with the thick filament.",
      "Keeps the thick filaments in position and the A band organised.",
      "Gives passive elasticity, resists over-stretching and helps the fiber return to its resting length.",
    ],
    lesson: SARCOMERE_LESSON,
  },
  {
    id: "nebulin",
    name: "Nebulin",
    group: "Structural protein",
    colour: "#94a3b8",
    looks: "Fine thread running along each thin filament",
    points: ["One of the structural proteins that keep the myofilaments precisely arranged."],
    lesson: SARCOMERE_LESSON,
  },
];

export const partById = (id: PartId) => PARTS.find((p) => p.id === id)!;

export const BANDS: Record<BandId, { name: string; colour: string; points: string[]; change: string }> = {
  aband: {
    name: "A band",
    colour: "#e11d48",
    points: ["The whole length of the thick filaments, including where thick and thin filaments overlap."],
    change: "No change — the thick filaments keep their length.",
  },
  iband: {
    name: "I band",
    colour: "#38bdf8",
    points: ["Thin filaments only, with no thick filaments; a Z disc runs through about its centre."],
    change: "Becomes shorter.",
  },
  hzone: {
    name: "H zone",
    colour: "#eab308",
    points: ["The centre of the A band where only thick filaments are present."],
    change: "Gets smaller and may disappear when fully contracted.",
  },
};

export const CONTRACTION_LESSON = { slug: "contraction-and-relaxation", label: "Contraction and relaxation" };

/** Lecture sheet §11 "Sequence of events in skeletal muscle contraction". */
export const CONTRACTION_STEPS: { title: string; text: string }[] = [
  { title: "Neural stimulation", text: "An action potential arrives at the terminal of a somatic motor neuron." },
  { title: "Release of acetylcholine", text: "ACh is released from the motor neuron terminal into the synaptic cleft." },
  {
    title: "Muscle fiber excitation",
    text: "ACh activates receptors on the sarcolemma; the muscle action potential spreads along the membrane and into the T-tubules.",
  },
  { title: "Calcium release", text: "The signal triggers the sarcoplasmic reticulum to release Ca²⁺ into the sarcoplasm." },
  { title: "Activation of the thin filament", text: "Ca²⁺ binds troponin, which moves tropomyosin away from the myosin-binding sites on actin." },
  { title: "Cross-bridge formation", text: "Activated myosin heads bind to the exposed sites on actin." },
  { title: "Power stroke", text: "The myosin head changes position and pulls the thin filament toward the centre of the sarcomere." },
  { title: "Repeated cross-bridge cycling", text: "As long as Ca²⁺ and ATP are available, cycling continues and tension develops." },
  { title: "Cessation of neural stimulation", text: "Motor neuron activity stops and ACh release declines." },
  {
    title: "Calcium removal and relaxation",
    text: "Ca²⁺ is pumped back into the SR, the binding sites are covered again, cycling stops and the fiber relaxes.",
  },
];

export const MOTION_VIDEO = { id: "ousflrOzQHc", title: "Motion video: the sliding filament mechanism of muscle contraction" };
