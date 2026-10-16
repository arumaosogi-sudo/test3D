/**
 * Text for the /explore zoom chains (3D-1 … 3D-4, 3D-7, 3D-10). Plain data — no three.js here.
 * Wording is summarised from src/content/lessons.ts ("skeletal-muscle-tissue", "overview-functions-properties",
 * "sarcomere-and-myofilaments", "motor-unit-and-nmj", "cardiac-and-smooth-muscle") and src/content/explore.ts —
 * do not add content that is not in the lessons (rule R6).
 *
 * `anchor` = name of a node in the level's .glb (mesh → its bounding-box centre, empty → its position);
 * `meshes` = meshes that select this hotspot when tapped.
 */
import { partById, type PartId } from "./explore";

export type LevelId = "arm" | "fascicle" | "fiber" | "myofibril" | "heart" | "cardiac" | "sarcomere" | "crossbridge" | "smoothtissue" | "smoothcell";
export type TopicId = "skeletal" | "cardiac" | "smooth";

export type Hotspot = {
  id: string;
  name: string;
  /** Small eyebrow above the name. */
  group: string;
  points: string[];
  lesson: { slug: string; label: string };
  anchor: string;
  /** Where on a mesh anchor the marker sits, as a fraction of its bounding box (default: centre of the front face). */
  at?: [number, number, number];
  meshes?: string[];
  /** Tapping "Zoom in" here goes to this level. */
  zoomTo?: LevelId;
  /** Extra button in the info panel (e.g. to the interactive sarcomere). */
  link?: { to: string; label: string };
};

export type ZoomLevel = {
  id: LevelId;
  crumb: string;
  title: string;
  subtitle: string;
  /** Connective tissue wrapping this level (lesson: epimysium → perimysium → endomysium). */
  wrap?: string;
  /** glTF file in /public/models ("" when the level is built in code — see `scene`). */
  model: string;
  /** Built in code instead of loaded from a .glb. */
  scene?: "crossbridge";
  credit?: string;
  /** Call to action under the viewer. */
  cta?: { to: string; label: string };
  hotspots: Hotspot[];
};

const TISSUE = {
  slug: "skeletal-muscle-tissue",
  label: "Skeletal muscle tissue and the muscle fiber",
};
const PROPERTIES = {
  slug: "overview-functions-properties",
  label: "Overview, functions and properties",
};
const NMJ = { slug: "motor-unit-and-nmj", label: "Motor unit and neuromuscular junction" };
const CARDIAC = { slug: "cardiac-and-smooth-muscle", label: "Cardiac and smooth muscle tissue" };
const CONTRACTION = { slug: "contraction-and-relaxation", label: "Contraction and relaxation" };
const INTERACTIVE = { to: "/explore/sarcomere", label: "Contract it: interactive sarcomere" };

/** Sarcomere hotspots reuse the part texts of the interactive sarcomere page. */
const sarcomerePart = (id: PartId, anchor: string, mesh: string): Hotspot => {
  const p = partById(id);
  return { id, name: p.name, group: p.group, points: p.points, lesson: p.lesson, anchor, meshes: [mesh], link: INTERACTIVE };
};

const SARCOMERE = {
  slug: "sarcomere-and-myofilaments",
  label: "Myofilaments and the sarcomere",
};

export const LEVELS: ZoomLevel[] = [
  {
    id: "arm",
    crumb: "Arm · Biceps",
    title: "Whole muscle — biceps brachii",
    subtitle: "A skeletal muscle is an organ: muscle fibers, connective tissue, blood vessels and nerves.",
    wrap: "Epimysium",
    model: "/models/arm.glb",
    credit: "Arm model: Z-Anatomy (CC BY-SA 4.0), based on BodyParts3D © DBCLS (CC BY-SA 2.1 JP)",
    hotspots: [
      {
        id: "biceps",
        name: "Biceps brachii",
        group: "Whole muscle",
        points: [
          "A skeletal muscle is a complex organ, not just muscle cells: it also contains connective tissue, blood vessels and nerves.",
          "The connective tissue framework gives support, lets vessels and nerves reach every fiber and helps transmit the force of contraction.",
          "Hierarchy: whole muscle → fascicle → muscle fiber → myofibril → sarcomere → myofilaments.",
        ],
        lesson: TISSUE,
        anchor: "Long head of biceps brachii",
        at: [0.5, 0.55, 1],
        meshes: ["Long head of biceps brachii", "Short head of biceps brachii"],
        zoomTo: "fascicle",
      },
      {
        id: "epimysium",
        name: "Epimysium",
        group: "Connective tissue",
        points: [
          "The outer layer around the entire muscle.",
          "Mainly dense connective tissue; it may merge with surrounding connective tissue, including the deep fascia of neighbouring muscles.",
        ],
        lesson: TISSUE,
        anchor: "Short head of biceps brachii",
        at: [0.6, 0.2, 1],
      },
      {
        id: "triceps",
        name: "Triceps brachii",
        group: "Opposing muscle",
        points: [
          "Muscles act in opposing groups.",
          "During elbow extension the triceps brachii contracts while the biceps brachii must lengthen enough to allow the movement (extensibility).",
        ],
        lesson: PROPERTIES,
        anchor: "Lateral head of triceps brachii",
        at: [0, 0.4, 0.5],
        meshes: ["Long head of triceps brachii", "Lateral head of triceps brachii", "Medial head of triceps brachii"],
      },
    ],
  },
  {
    id: "fascicle",
    crumb: "Fascicle",
    title: "Fascicle",
    subtitle: "Muscle fibers are grouped into bundles called fascicles.",
    wrap: "Perimysium",
    model: "/models/fascicle.glb",
    hotspots: [
      {
        id: "fascicle",
        name: "Fascicle",
        group: "Bundle of fibers",
        points: ["A bundle of muscle fibers.", "Each fascicle is enclosed by the perimysium."],
        lesson: TISSUE,
        anchor: "hs_fascicle",
      },
      {
        id: "perimysium",
        name: "Perimysium",
        group: "Connective tissue",
        points: ["Encloses each fascicle.", "Organises groups of fibers and provides pathways for blood vessels and nerves."],
        lesson: TISSUE,
        anchor: "hs_perimysium",
        meshes: ["Perimysium"],
      },
      {
        id: "endomysium",
        name: "Endomysium",
        group: "Connective tissue",
        points: [
          "A delicate layer around each muscle fiber — much thinner than the other two layers.",
          "Supports individual muscle cells and helps transmit force between fibers and the surrounding connective tissue.",
        ],
        lesson: TISSUE,
        anchor: "hs_endomysium",
        meshes: ["Endomysium"],
      },
      {
        id: "fiber",
        name: "Muscle fiber",
        group: "One muscle cell",
        points: ["A long, cylindrical, multinucleated cell.", "Each fiber is wrapped by its own endomysium."],
        lesson: TISSUE,
        anchor: "hs_fiber",
        meshes: ["Fibers"],
        zoomTo: "fiber",
      },
      {
        id: "motorunit",
        name: "Motor unit",
        group: "Motor neuron + its fibers",
        points: [
          "A motor unit is a single somatic motor neuron and all the skeletal muscle fibers it controls.",
          "The axon branches near its end, so one neuron reaches many fibers — but each fiber receives input from only one motor neuron.",
          "Small motor units allow fine, precise movements; large motor units produce greater force.",
        ],
        lesson: NMJ,
        anchor: "anim_nerve_end",
        meshes: ["Motor neuron branches", "Nerve"],
      },
    ],
  },
  {
    id: "fiber",
    crumb: "Muscle fiber",
    title: "Muscle fiber",
    subtitle: "A long, cylindrical, multinucleated cell — cut open to show what is inside.",
    wrap: "Endomysium",
    model: "/models/fiber.glb",
    hotspots: [
      {
        id: "sarcolemma",
        name: "Sarcolemma",
        group: "Cell membrane",
        points: [
          "The plasma membrane of the muscle fiber.",
          "Maintains the ionic environment of the cell and conducts electrical excitation along the fiber surface.",
        ],
        lesson: TISSUE,
        anchor: "hs_sarcolemma",
        meshes: ["Sarcolemma"],
      },
      {
        id: "nmj",
        name: "Neuromuscular junction (NMJ)",
        group: "Nerve → muscle synapse",
        points: [
          "The synapse where a somatic motor neuron communicates with a skeletal muscle fiber.",
          "The axon terminal is full of synaptic vesicles containing acetylcholine (ACh); ACh crosses the synaptic cleft and binds receptors on the sarcolemma.",
          "The sarcolemma under the terminal has many junctional folds holding a high density of ACh receptors.",
          "The resulting muscle action potential starts the events leading to contraction.",
        ],
        lesson: NMJ,
        anchor: "hs_nmj",
        meshes: ["Motor neuron axon", "Axon terminal"],
      },
      {
        id: "nuclei",
        name: "Nuclei",
        group: "Multinucleated cell",
        points: ["A skeletal muscle fiber has many nuclei.", "They usually lie close to the sarcolemma (peripheral)."],
        lesson: TISSUE,
        anchor: "hs_nuclei",
        meshes: ["Nuclei"],
      },
      {
        id: "ttubule",
        name: "T-tubule",
        group: "Transverse tubule",
        points: [
          "Inward extensions of the sarcolemma.",
          "Carry electrical excitation deep into the fiber so it reaches the contractile apparatus throughout the cell.",
        ],
        lesson: TISSUE,
        anchor: "hs_ttubule",
        meshes: ["T-tubules"],
      },
      {
        id: "sr",
        name: "Sarcoplasmic reticulum (SR)",
        group: "Ca²⁺ store",
        points: [
          "A specialised smooth endoplasmic reticulum around the myofibrils.",
          "Stores Ca²⁺ and releases it in a regulated way; released Ca²⁺ starts the events that allow actin–myosin interaction.",
        ],
        lesson: TISSUE,
        anchor: "hs_sr",
        meshes: ["Sarcoplasmic reticulum"],
      },
      {
        id: "cisternae",
        name: "Terminal cisternae",
        group: "Part of the SR",
        points: [
          "Enlarged regions of the SR next to the T-tubules.",
          "Sites for the storage and rapid release of Ca²⁺ during excitation–contraction coupling.",
        ],
        lesson: TISSUE,
        anchor: "hs_cisternae",
        meshes: ["Terminal cisternae"],
      },
      {
        id: "triad",
        name: "Triad",
        group: "T-tubule + 2 terminal cisternae",
        points: ["One T-tubule between two terminal cisternae.", "Lets the electrical signal on the sarcolemma rapidly trigger Ca²⁺ release from the SR."],
        lesson: TISSUE,
        anchor: "hs_triad",
      },
      {
        id: "mitochondria",
        name: "Mitochondria",
        group: "In the sarcoplasm",
        points: [
          "The sarcoplasm contains the organelles for energy production, calcium handling and contraction.",
          "Slow oxidative fibers have many mitochondria and a high capacity for aerobic ATP production.",
        ],
        lesson: TISSUE,
        anchor: "hs_mitochondria",
        meshes: ["Mitochondria"],
      },
      {
        id: "myofibril",
        name: "Myofibril",
        group: "Contractile structure",
        points: [
          "Long contractile structures that fill much of the sarcoplasm.",
          "Made of repeating sarcomeres with thick (mainly myosin) and thin (mainly actin) filaments.",
        ],
        lesson: TISSUE,
        anchor: "hs_myofibril",
        meshes: ["Myofibrils"],
        zoomTo: "myofibril",
      },
    ],
  },
  {
    id: "myofibril",
    crumb: "Myofibril",
    title: "Myofibril",
    subtitle: "Sarcomeres lie end-to-end along each myofibril — their regular pattern makes the muscle look striated.",
    model: "/models/myofibril.glb",
    hotspots: [
      {
        id: "sarcomere",
        name: "Sarcomere",
        group: "Repeating unit",
        points: ["One sarcomere extends from one Z disc to the next Z disc.", "Contains thick filaments (mainly myosin) and thin filaments (mainly actin)."],
        lesson: SARCOMERE,
        anchor: "hs_sarcomere",
        zoomTo: "sarcomere",
      },
      {
        id: "zdisc",
        name: "Z disc",
        group: "Sarcomere landmark",
        points: ["Marks the boundary between neighbouring sarcomeres.", "Thin filaments are anchored here."],
        lesson: SARCOMERE,
        anchor: "hs_zdisc",
        meshes: ["Z discs"],
      },
      {
        id: "aband",
        name: "A band (dark)",
        group: "Band",
        points: ["The whole length of the thick filaments, including where thick and thin filaments overlap."],
        lesson: SARCOMERE,
        anchor: "hs_aband",
        meshes: ["A bands"],
      },
      {
        id: "iband",
        name: "I band (light)",
        group: "Band",
        points: ["Thin filaments only, with no thick filaments; a Z disc runs through about its centre."],
        lesson: SARCOMERE,
        anchor: "hs_iband",
        meshes: ["I bands"],
      },
      {
        id: "hzone",
        name: "H zone",
        group: "Band",
        points: ["The centre of the A band where only thick filaments are present."],
        lesson: SARCOMERE,
        anchor: "hs_hzone",
        meshes: ["H zones"],
      },
    ],
  },
  {
    id: "heart",
    crumb: "Heart",
    title: "Heart",
    subtitle: "Cardiac muscle forms the muscular component of the heart.",
    model: "/models/heart.glb",
    credit: "Heart model: Z-Anatomy (CC BY-SA 4.0), based on BodyParts3D © DBCLS (CC BY-SA 2.1 JP)",
    hotspots: [
      {
        id: "heart",
        name: "Heart",
        group: "Organ",
        points: ["Cardiac muscle forms the muscular component of the heart.", "Its major function is pumping blood."],
        lesson: CARDIAC,
        anchor: "Right ventricle",
        at: [0.45, 0.55, 1],
      },
      {
        id: "myocardium",
        name: "Cardiac muscle",
        group: "Muscle tissue",
        points: ["Specialised for continuous rhythmic contraction.", "Striated like skeletal muscle, but controlled primarily through involuntary mechanisms."],
        lesson: CARDIAC,
        anchor: "Left ventricle",
        at: [0.5, 0.35, 1],
        meshes: ["Left ventricle", "Right ventricle", "Left atrium", "Right atrium"],
        zoomTo: "cardiac",
      },
    ],
  },
  {
    id: "cardiac",
    crumb: "Cardiac muscle",
    title: "Cardiac muscle tissue",
    subtitle: "Short, branched, striated cells joined end-to-end by intercalated discs — one cell is cut open.",
    model: "/models/cardiac.glb",
    hotspots: [
      {
        id: "cell",
        name: "Cardiac muscle cell",
        group: "Striated · involuntary",
        points: [
          "Shares sarcomeres and striations with skeletal muscle.",
          "Short and generally branched (skeletal fibers are long and cylindrical).",
          "Controlled primarily through involuntary mechanisms.",
        ],
        lesson: CARDIAC,
        anchor: "hs_cell",
        meshes: ["Cardiac muscle cells"],
      },
      {
        id: "nucleus",
        name: "Nucleus",
        group: "One, central",
        points: ["Usually a single, centrally located nucleus.", "Compare: a skeletal muscle fiber has many nuclei at its edge (peripheral)."],
        lesson: CARDIAC,
        anchor: "hs_nucleus",
        meshes: ["Nucleus"],
      },
      {
        id: "disc",
        name: "Intercalated disc",
        group: "Cell-to-cell junction",
        points: [
          "Specialised regions where adjacent cardiac muscle cells connect end-to-end.",
          "Desmosomes strengthen the connection and help prevent cells from separating during contraction.",
          "Gap junctions let ions and electrical signals pass between cells, so the heart is activated in a coordinated way.",
        ],
        lesson: CARDIAC,
        anchor: "hs_disc",
        meshes: ["Intercalated discs"],
      },
      {
        id: "branch",
        name: "Branching",
        group: "Cell shape",
        points: ["Cardiac muscle cells are generally branched.", "They are joined end-to-end to neighbouring cells through intercalated discs."],
        lesson: CARDIAC,
        anchor: "hs_branch",
      },
      {
        id: "sarcomere",
        name: "Sarcomere",
        group: "Repeating unit",
        points: ["Cardiac muscle has sarcomeres and striations like skeletal muscle.", "Troponin is its major Ca²⁺ regulatory protein, as in skeletal muscle."],
        lesson: CARDIAC,
        anchor: "hs_sarcomere",
        meshes: ["Myofibrils"],
        zoomTo: "sarcomere",
      },
    ],
  },
  {
    id: "sarcomere",
    crumb: "Sarcomere",
    title: "Sarcomere",
    subtitle: "Thin filaments (actin, tropomyosin, troponin) and thick filaments (myosin) between two Z discs — relaxed, 2.5 µm.",
    model: "/models/sarcomere.glb",
    cta: { to: "/explore/sarcomere", label: "Open the interactive sarcomere — contract it" },
    hotspots: [
      sarcomerePart("actin", "hs_actin", "Actin"),
      sarcomerePart("tropomyosin", "hs_tropomyosin", "Tropomyosin"),
      sarcomerePart("troponin", "hs_troponin", "Troponin"),
      { ...sarcomerePart("myosin", "hs_myosin", "Myosin"), zoomTo: "crossbridge" },
      sarcomerePart("zdisc", "hs_zdisc", "Z discs"),
      sarcomerePart("mline", "hs_mline", "M line"),
      sarcomerePart("titin", "hs_titin", "Titin"),
    ],
  },
  {
    id: "crossbridge",
    crumb: "Cross-bridge",
    title: "Thin filament and myosin heads",
    subtitle: "One bead per amino acid of a real thin filament (PDB 6KN7 / 6KN8). Press Play: Ca²⁺ switch, then the cross-bridge cycle.",
    model: "",
    scene: "crossbridge",
    credit: "Thin filament: PDB 6KN7 / 6KN8 (Yamada, Namba & Fujii, Nat Commun 2020) — alpha skeletal actin with cardiac troponin. Myosin heads: schematic.",
    cta: { to: "/explore/sarcomere", label: "Open the interactive sarcomere — contract it" },
    hotspots: [
      { ...sarcomerePart("actin", "", "Actin"), at: undefined },
      { ...sarcomerePart("tropomyosin", "", "Tropomyosin") },
      {
        id: "troponin",
        name: "Troponin (TnC · TnI · TnT)",
        group: "Thin filament",
        points: partById("troponin").points,
        lesson: partById("troponin").lesson,
        anchor: "",
        link: INTERACTIVE,
      },
      {
        id: "myosin",
        name: "Myosin head (cross-bridge)",
        group: "Thick filament",
        points: [
          "Activated myosin heads bind to exposed sites on actin (cross-bridge formation).",
          "The head changes position and pulls the thin filament toward the centre of the sarcomere (power stroke).",
          "Heads repeatedly attach, generate force, detach and repeat while Ca²⁺ and ATP are available.",
        ],
        lesson: CONTRACTION,
        anchor: "",
        link: INTERACTIVE,
      },
      {
        id: "thick",
        name: "Thick filament",
        group: "Myosin tails",
        points: partById("myosin").points.slice(0, 2),
        lesson: SARCOMERE,
        anchor: "",
      },
    ],
  },
  {
    id: "smoothtissue",
    crumb: "Smooth muscle tissue",
    title: "Smooth muscle in the wall of a hollow organ",
    subtitle: "Spindle-shaped cells, no striations; controlled involuntarily by autonomic nerves.",
    model: "/models/smoothtissue.glb",
    hotspots: [
      {
        id: "cells",
        name: "Single-unit (visceral) smooth muscle",
        group: "Smooth muscle tissue",
        points: [
          "Found in the walls of hollow organs and tubes: gastrointestinal tract, urinary bladder, uterus, small blood vessels.",
          "Its cells communicate with one another and contract in a coordinated manner.",
          "Multiunit smooth muscle (large blood vessels, airways, iris, ciliary body, arrector pili) instead gives each fiber more independent neural control.",
        ],
        lesson: CARDIAC,
        anchor: "hs_cells",
        meshes: ["Smooth muscle cells"],
      },
      {
        id: "varicosity",
        name: "Varicosities",
        group: "Autonomic nerve fiber",
        points: [
          "Smooth muscle is innervated by the autonomic nervous system.",
          "Autonomic nerve fibers release neurotransmitter from swellings called varicosities, which act on several nearby cells.",
          "Norepinephrine is released from sympathetic fibers, acetylcholine from parasympathetic fibers.",
        ],
        lesson: CARDIAC,
        anchor: "hs_varicosity",
        meshes: ["Varicosities", "Autonomic nerve fiber"],
      },
      {
        id: "gap",
        name: "Gap junctions",
        group: "Cell-to-cell coupling",
        points: ["In many smooth muscle tissues gap junctions link neighbouring cells and coordinate contraction."],
        lesson: CARDIAC,
        anchor: "hs_gap",
        meshes: ["Gap junctions"],
      },
      {
        id: "cell",
        name: "Smooth muscle cell",
        group: "One cell",
        points: ["Spindle-shaped with a single, central nucleus.", "No organised sarcomeres, so it is not striated."],
        lesson: CARDIAC,
        anchor: "hs_cell",
        zoomTo: "smoothcell",
      },
    ],
  },
  {
    id: "smoothcell",
    crumb: "Smooth muscle cell",
    title: "Smooth muscle cell",
    subtitle: "Cut open: thick and thin filaments form a less regular network anchored to dense bodies — no sarcomeres.",
    model: "/models/smoothcell.glb",
    hotspots: [
      {
        id: "membrane",
        name: "Plasma membrane — no T-tubules",
        group: "Cell membrane",
        points: ["Smooth muscle cells lack T-tubules.", "Ca²⁺ enters from the extracellular fluid and is also released from intracellular stores."],
        lesson: CARDIAC,
        anchor: "hs_membrane",
        meshes: ["Plasma membrane"],
      },
      {
        id: "nucleus",
        name: "Nucleus",
        group: "One, central",
        points: ["A typical smooth muscle cell has a single, centrally located nucleus."],
        lesson: CARDIAC,
        anchor: "hs_nucleus",
        meshes: ["Nucleus"],
      },
      {
        id: "dense",
        name: "Dense bodies",
        group: "Anchoring points",
        points: [
          "Contractile filaments attach to dense bodies and intermediate filaments, a network that spreads force through the cell.",
          "Dense bodies play a role broadly comparable to the Z discs of striated muscle.",
        ],
        lesson: CARDIAC,
        anchor: "hs_dense",
        meshes: ["Dense bodies", "Intermediate filaments"],
      },
      {
        id: "filaments",
        name: "Thick and thin filaments",
        group: "Contractile network",
        points: ["Thick and thin filaments are present but arranged in a less regular network throughout the cell.", "No organised sarcomeres → not striated."],
        lesson: CARDIAC,
        anchor: "hs_filaments",
        meshes: ["Contractile filaments"],
      },
      {
        id: "caveolae",
        name: "Caveolae",
        group: "Membrane pits",
        points: ["Small invaginations of the plasma membrane that contribute to calcium handling and signalling."],
        lesson: CARDIAC,
        anchor: "hs_caveolae",
        meshes: ["Caveolae"],
      },
      {
        id: "calmodulin",
        name: "Calmodulin",
        group: "Ca²⁺ sensor",
        points: ["A calcium-binding protein — the calcium sensor in smooth muscle instead of troponin."],
        lesson: CARDIAC,
        anchor: "hs_calmodulin",
      },
    ],
  },
];

export const levelById = (id: string | null | undefined) => LEVELS.find((l) => l.id === id);

export const TOPICS: { id: TopicId; name: string; status: "open" | "Future"; chain: LevelId[] }[] = [
  { id: "skeletal", name: "Skeletal muscle", status: "open", chain: ["arm", "fascicle", "fiber", "myofibril", "sarcomere", "crossbridge"] },
  { id: "cardiac", name: "Cardiac muscle", status: "open", chain: ["heart", "cardiac", "sarcomere", "crossbridge"] },
  { id: "smooth", name: "Smooth muscle", status: "open", chain: ["smoothtissue", "smoothcell"] },
];

export const topicById = (id: string | null | undefined) => TOPICS.find((t) => t.id === id && t.status === "open") ?? TOPICS[0];
