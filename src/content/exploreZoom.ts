/**
 * Text for the /explore zoom chains (3D-1 … 3D-4, 3D-7, 3D-10, 3D-11). Plain data — no three.js here.
 *
 * Order of the levels: "กล้ามเนื้อถูกจำแนกออกเป็น 3 ประเภทหลัก" (team document, 18 Oct 2026) — outer layer → cell →
 * inside the cell → contractile unit → myofilaments, for each of the three muscle types.
 * Wording: lecture sheet "Muscular tissues I" / src/content/lessons.ts (rule R6). Statements that appear only in the
 * team document go into `pending` and are shown with an "awaiting review" badge until the lecturer confirms them.
 *
 * `anchor` = node name in the level's .glb (mesh → bounding box, empty → its position); code-built scenes place
 * their own markers by hotspot id. `meshes` = meshes that select the hotspot when tapped.
 */
import { BANDS, partById, type PartId } from "./explore";

export type LevelId =
  // skeletal
  | "muscle"
  | "fascicle"
  | "fiber"
  | "myofibril"
  | "sarcomere"
  | "filaments"
  // cardiac
  | "heartwall"
  | "cardiactissue"
  | "cardiomyocyte"
  | "discs"
  | "cardiacmyofibril"
  // smooth
  | "gutwall"
  | "smoothtissue"
  | "smoothcell"
  | "densebodies"
  | "smoothfilaments";
export type TopicId = "skeletal" | "cardiac" | "smooth";
export type CodeScene = "filaments" | "discs" | "smoothfilaments";

export type Hotspot = {
  id: string;
  name: string;
  /** Small eyebrow above the name. */
  group: string;
  points: string[];
  /** Statements from the team document that the lecture sheet does not state — shown with an "awaiting review" badge. */
  pending?: string[];
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
  /** Connective tissue wrapping this level. */
  wrap?: string;
  /** glTF file in /public/models ("" when the level is built in code — see `scene`). */
  model: string;
  /** Built in code instead of loaded from a .glb. */
  scene?: CodeScene;
  /** A second, code-built view of the same level (real protein structures), switched with a button. */
  molecular?: CodeScene;
  credit?: string;
  /** Call to action under the viewer. */
  cta?: { to: string; label: string };
  hotspots: Hotspot[];
};

const TISSUE = { slug: "skeletal-muscle-tissue", label: "Skeletal muscle tissue and the muscle fiber" };
const PROPERTIES = { slug: "overview-functions-properties", label: "Overview, functions and properties" };
const NMJ = { slug: "motor-unit-and-nmj", label: "Motor unit and neuromuscular junction" };
const CARDIAC = { slug: "cardiac-and-smooth-muscle", label: "Cardiac and smooth muscle tissue" };
const CONTRACTION = { slug: "contraction-and-relaxation", label: "Contraction and relaxation" };
const SARCOMERE = { slug: "sarcomere-and-myofilaments", label: "Myofilaments and the sarcomere" };
const INTERACTIVE = { to: "/explore/sarcomere", label: "Contract it: interactive sarcomere" };

const Z_ANATOMY = "Z-Anatomy (CC BY-SA 4.0), based on BodyParts3D © DBCLS (CC BY-SA 2.1 JP)";
// Sketchfab models (full list with links on /credits)
const MYOCYTE = "“Myocyte model” by rgmz2015 (CC BY 4.0, Sketchfab)";
const FIBRE = "“Skeletal Muscle Fibre Anatomy” by _Bonehead14 (CC BY 4.0, Sketchfab)";
const FILAMENTS = "“Sarcomere Model” by rgmz2015 (CC BY-NC 4.0, Sketchfab)";
const CARDIAC_CELL = "“Cardiac Muscle Cell Anatomy” by _Bonehead14 (CC BY 4.0, Sketchfab)";
const SMOOTH_CELL = "“Smooth Muscle Cell” by _Bonehead14 (CC BY 4.0, Sketchfab)";

const band = (id: "aband" | "iband" | "hzone", anchor: string, meshes?: string[]): Hotspot => ({
  id,
  name: `${BANDS[id].name}${id === "aband" ? " (dark)" : id === "iband" ? " (light)" : ""}`,
  group: "Band",
  points: [...BANDS[id].points, `During contraction: ${BANDS[id].change.toLowerCase()}`],
  lesson: { slug: "sarcomere-and-myofilaments", label: "Myofilaments and the sarcomere" },
  anchor,
  meshes,
});

/** Sarcomere / myofilament hotspots reuse the part texts of the interactive sarcomere page. */
const part = (id: PartId, anchor: string, mesh?: string, extra: Partial<Hotspot> = {}): Hotspot => {
  const p = partById(id);
  return { id, name: p.name, group: p.group, points: p.points, lesson: p.lesson, anchor, meshes: mesh ? [mesh] : undefined, link: INTERACTIVE, ...extra };
};

export const LEVELS: ZoomLevel[] = [
  // ───────────────────────── 1. Skeletal muscle ─────────────────────────
  {
    id: "muscle",
    crumb: "Whole muscle",
    title: "Whole muscle — biceps brachii",
    subtitle: "Epimysium → whole muscle. A skeletal muscle is an organ: fibers, connective tissue, blood vessels and nerves.",
    wrap: "Epimysium",
    model: "/models/arm.glb",
    credit: `Arm: ${Z_ANATOMY}. Epimysium shell and elbow rig: MedicSync team.`,
    hotspots: [
      {
        id: "epimysium",
        name: "Epimysium",
        group: "Outermost connective tissue",
        points: [
          "The outer layer around the entire muscle.",
          "Mainly dense connective tissue; it may merge with surrounding connective tissue, including the deep fascia of neighbouring muscles.",
          "Connective tissue gives support and helps transmit the force of contraction.",
        ],
        lesson: TISSUE,
        anchor: "Epimysium",
        at: [0.6, 0.35, 1],
        meshes: ["Epimysium"],
      },
      {
        id: "biceps",
        name: "Biceps brachii — whole muscle",
        group: "Organ",
        points: [
          "A skeletal muscle is a complex organ, not just muscle cells: it also contains connective tissue, blood vessels and nerves.",
          "Skeletal muscles produce movement by exerting force on bones and joints — here, bending the elbow.",
          "Hierarchy: whole muscle → fascicle → muscle fiber → myofibril → sarcomere → myofilaments.",
        ],
        lesson: TISSUE,
        anchor: "Long head of biceps brachii",
        at: [0.5, 0.6, 1],
        meshes: ["Long head of biceps brachii", "Short head of biceps brachii"],
        zoomTo: "fascicle",
      },
      {
        id: "triceps",
        name: "Triceps brachii",
        group: "Opposing muscle",
        points: [
          "Muscles frequently act in opposing groups.",
          "During elbow extension the triceps brachii contracts while the biceps brachii must lengthen enough to permit the movement (extensibility).",
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
    subtitle: "Perimysium → fascicle → endomysium. Muscle fibers are grouped into bundles called fascicles.",
    wrap: "Perimysium",
    model: "/models/fascicle.glb",
    credit: `Muscle fibers: ${FIBRE}. Bundle, connective tissue, vessel and nerve: MedicSync team.`,
    hotspots: [
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
        id: "fascicle",
        name: "Fascicle",
        group: "Bundle of fibers",
        points: ["A bundle of muscle fibers.", "Each fascicle is enclosed by the perimysium."],
        lesson: TISSUE,
        anchor: "hs_fascicle",
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
          "Each fiber receives input from only one motor neuron.",
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
    subtitle: "A long, cylindrical cell with many nuclei at its edge — the membrane is cut back to show the myofibrils, T-tubules and SR.",
    wrap: "Endomysium",
    model: "/models/fiber.glb",
    credit: `Fiber, sarcolemma and endomysium: ${MYOCYTE}. Myofilament layout to lecture proportions, NMJ, T-tubules, SR, nuclei: MedicSync team.`,
    hotspots: [
      {
        id: "endomysium",
        name: "Endomysium",
        group: "Connective tissue",
        points: ["A delicate layer around each muscle fiber.", "Supports individual muscle cells and helps transmit force between fibers."],
        lesson: TISSUE,
        anchor: "hs_endomysium",
        meshes: ["Endomysium"],
      },
      {
        id: "sarcolemma",
        name: "Sarcolemma",
        group: "Cell membrane",
        points: ["The plasma membrane of the muscle fiber.", "Maintains the ionic environment of the cell and conducts electrical excitation along the fiber surface."],
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
          "The axon terminal releases acetylcholine (ACh); ACh crosses the synaptic cleft and binds receptors on the sarcolemma.",
          "Junctional folds under the terminal hold a high density of ACh receptors.",
        ],
        lesson: NMJ,
        anchor: "hs_nmj",
        meshes: ["Motor neuron axon", "Axon terminal"],
      },
      {
        id: "nuclei",
        name: "Nuclei",
        group: "Many, at the edge",
        points: ["A skeletal muscle fiber is multinucleated.", "Its nuclei usually lie close to the sarcolemma."],
        lesson: TISSUE,
        anchor: "hs_nuclei",
        meshes: ["Nuclei"],
      },
      {
        id: "ttubule",
        name: "T-tubule",
        group: "Transverse tubule",
        points: ["Inward extensions of the sarcolemma.", "Carry electrical excitation deep into the fiber so it reaches the contractile apparatus throughout the cell."],
        lesson: TISSUE,
        anchor: "hs_ttubule",
        meshes: ["T-tubules"],
      },
      {
        id: "sarcoplasm",
        name: "Sarcoplasm",
        group: "Cytoplasm of the fiber",
        points: [
          "Contains the organelles for energy production, calcium handling and contraction.",
          "Holds large glycogen reserves and myoglobin, which helps store and transport oxygen.",
        ],
        lesson: TISSUE,
        anchor: "hs_mitochondria",
        meshes: ["Mitochondria"],
      },
      {
        id: "sr",
        name: "Sarcoplasmic reticulum (SR)",
        group: "Ca²⁺ store",
        points: ["A specialised smooth endoplasmic reticulum around the myofibrils.", "Stores Ca²⁺ and releases it in a regulated way."],
        lesson: TISSUE,
        anchor: "hs_sr",
        meshes: ["Sarcoplasmic reticulum"],
      },
      {
        id: "cisternae",
        name: "Terminal cisternae",
        group: "Part of the SR",
        points: ["Enlarged regions of the SR next to the T-tubules.", "Sites for the storage and rapid release of Ca²⁺ during excitation–contraction coupling."],
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
        id: "myofibril",
        name: "Myofibril",
        group: "Contractile structure",
        points: ["Long contractile structures that fill much of the sarcoplasm.", "Made of repeating sarcomeres."],
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
    subtitle: "Sarcomeres repeat end-to-end: thick filaments (myosin, red) make the dark A band, thin filaments (actin, blue) the light I band.",
    model: "/models/myofibril.glb",
    credit: `Filament arrangement from ${MYOCYTE}, rebuilt to lecture proportions (sarcomere 2.5 µm, A band 1.6 µm, thin filament 1.0 µm) by the MedicSync team.`,
    hotspots: [
      {
        id: "myofibril",
        name: "Myofibril",
        group: "Contractile structure",
        points: [
          "Long contractile structures that fill much of the sarcoplasm.",
          "Repeating sarcomeres with thick (mainly myosin) and thin (mainly actin) filaments.",
          "Their regular arrangement gives skeletal and cardiac muscle a striated appearance.",
        ],
        lesson: SARCOMERE,
        anchor: "hs_myofibril",
      },
      {
        id: "aband",
        name: "A band (dark)",
        group: "Band",
        points: ["The whole length of the thick filaments, including where thick and thin filaments overlap."],
        lesson: SARCOMERE,
        anchor: "hs_aband",
        meshes: ["Thick filaments"],
      },
      {
        id: "iband",
        name: "I band (light)",
        group: "Band",
        points: ["Thin filaments only, with no thick filaments; a Z disc runs through about its centre."],
        lesson: SARCOMERE,
        anchor: "hs_iband",
        meshes: ["Thin filaments"],
      },
      {
        id: "zdisc",
        name: "Z disc",
        group: "Sarcomere boundary",
        points: ["Marks the boundary between neighbouring sarcomeres.", "Thin filaments are anchored here."],
        lesson: SARCOMERE,
        anchor: "hs_zdisc",
        meshes: ["Z discs"],
      },
      {
        id: "sarcomere",
        name: "Sarcomere",
        group: "Repeating unit",
        points: ["One sarcomere extends from one Z disc to the next Z disc."],
        lesson: SARCOMERE,
        anchor: "hs_sarcomere",
        zoomTo: "sarcomere",
      },
    ],
  },
  {
    id: "sarcomere",
    crumb: "Sarcomere",
    title: "Sarcomere — Z disc to Z disc",
    subtitle: "The contractile unit: thick filaments (with myosin heads) in the middle, thin filaments anchored at the Z discs. Relaxed, 2.5 µm.",
    model: "/models/sarcomere.glb",
    credit: `Filament arrangement from ${MYOCYTE}, rebuilt to lecture proportions; myosin heads and titin: MedicSync team.`,
    cta: INTERACTIVE,
    hotspots: [
      part("zdisc", "hs_zdisc", "Z discs"),
      part("mline", "hs_mline", "M lines"),
      band("aband", "hs_aband"),
      band("iband", "hs_iband"),
      band("hzone", "hs_hzone"),
      part("myosin", "hs_myosin", "Thick filaments", { zoomTo: "filaments" }),
      part("actin", "hs_actin", "Thin filaments", { zoomTo: "filaments" }),
      part("titin", "hs_titin", "Titin"),
    ],
  },
  {
    id: "filaments",
    crumb: "Myofilaments",
    title: "Myofilaments — thick and thin",
    subtitle: "Six thin filaments (actin + tropomyosin + troponin) around one thick filament (myosin). Switch to “Molecular view” for real protein structures.",
    model: "/models/filaments.glb",
    molecular: "filaments",
    credit: `Filaments: ${FILAMENTS}; troponin complexes and extra myosin heads: MedicSync team. Molecular view: PDB 6KN7 / 6KN8 (Yamada, Namba & Fujii 2020) and PDB 5H53 (Fujii & Namba 2017).`,
    cta: INTERACTIVE,
    hotspots: [
      part("actin", "hs_actin", "Actin"),
      part("tropomyosin", "hs_tropomyosin", "Tropomyosin"),
      part("troponin", "hs_troponin", "Troponin C", { meshes: ["Troponin C", "Troponin I", "Troponin T"] }),
      {
        id: "myosin",
        name: "Myosin head (cross-bridge)",
        group: "Thick filament",
        points: [
          "Myosin is a motor protein that converts the chemical energy of ATP into mechanical work.",
          "Its globular heads bind actin, change position and pull the thin filament toward the centre of the sarcomere (power stroke).",
          "Heads repeatedly attach, generate force, detach and repeat while Ca²⁺ and ATP are available.",
        ],
        lesson: CONTRACTION,
        anchor: "hs_myosin",
        meshes: ["Myosin head", "Thick filament"],
        link: INTERACTIVE,
      },
    ],
  },

  // ───────────────────────── 2. Cardiac muscle ─────────────────────────
  {
    id: "heartwall",
    crumb: "Heart wall",
    title: "Heart and its wall",
    subtitle: "Epicardium → myocardium: the thick muscular layer of the heart wall is cardiac muscle.",
    model: "/models/heart.glb",
    credit: `Heart: ${Z_ANATOMY}. Wall section: MedicSync team.`,
    hotspots: [
      {
        id: "heart",
        name: "Heart",
        group: "Organ",
        points: ["Cardiac muscle forms the muscular component of the heart.", "It is specialised for continuous rhythmic contraction — pumping blood."],
        lesson: CARDIAC,
        anchor: "Right ventricle",
        at: [0.45, 0.55, 1],
        meshes: ["Left ventricle", "Right ventricle", "Left atrium", "Right atrium"],
      },
      {
        id: "epicardium",
        name: "Epicardium / pericardium",
        group: "Outer layer of the heart wall",
        points: [],
        pending: ["The outermost tissue layer covering the heart wall (team document)."],
        lesson: CARDIAC,
        anchor: "hs_epicardium",
        meshes: ["Epicardium"],
      },
      {
        id: "myocardium",
        name: "Myocardium",
        group: "Muscle layer",
        points: ["Cardiac muscle: striated, generally branched cells; controlled through involuntary mechanisms."],
        pending: ["The thick muscle layer of the heart wall, made of cardiac muscle cells working together (team document)."],
        lesson: CARDIAC,
        anchor: "hs_myocardium",
        meshes: ["Myocardium"],
        zoomTo: "cardiactissue",
      },
      {
        id: "endocardium",
        name: "Endocardium",
        group: "Inner lining",
        points: [],
        pending: ["Thin inner lining of the heart wall — shown for completeness, not described in the lecture sheet."],
        lesson: CARDIAC,
        anchor: "hs_endocardium",
        meshes: ["Endocardium"],
      },
    ],
  },
  {
    id: "cardiactissue",
    crumb: "Cardiac tissue",
    title: "Cardiac muscle tissue",
    subtitle: "Branched cells joined end-to-end into a network, each wrapped by endomysium with capillaries around it.",
    wrap: "Endomysium",
    model: "/models/cardiac.glb",
    credit: `Cells: ${CARDIAC_CELL}, cut into cells with intercalated discs, striations and one central nucleus each by the MedicSync team; endomysium and capillaries: MedicSync team.`,
    hotspots: [
      {
        id: "cell",
        name: "Cardiac muscle cells",
        group: "Branched network",
        points: ["Striated and generally branched; joined end-to-end through intercalated discs.", "Controlled primarily through involuntary mechanisms."],
        lesson: CARDIAC,
        anchor: "hs_cell",
        meshes: ["Cardiac muscle cells"],
        zoomTo: "cardiomyocyte",
      },
      {
        id: "endomysium",
        name: "Endomysium",
        group: "Connective tissue",
        points: [],
        pending: ["Connective tissue around each cardiac muscle cell (team document)."],
        lesson: CARDIAC,
        anchor: "hs_endomysium",
        meshes: ["Endomysium"],
      },
      {
        id: "capillaries",
        name: "Capillaries",
        group: "Blood supply",
        points: [],
        pending: ["Capillaries are dense in the endomysium of cardiac muscle (team document)."],
        lesson: CARDIAC,
        anchor: "hs_capillaries",
        meshes: ["Capillaries"],
      },
      {
        id: "disc",
        name: "Intercalated disc",
        group: "Cell-to-cell junction",
        points: ["Specialised regions where adjacent cardiac muscle cells connect — mechanical and electrical coupling."],
        lesson: CARDIAC,
        anchor: "hs_disc",
        meshes: ["Intercalated discs"],
        zoomTo: "discs",
      },
      {
        id: "branch",
        name: "Branching",
        group: "Cell shape",
        points: ["Cardiac muscle cells are short and generally branched."],
        lesson: CARDIAC,
        anchor: "hs_branch",
      },
    ],
  },
  {
    id: "cardiomyocyte",
    crumb: "Cardiomyocyte",
    title: "Cardiomyocyte — one cardiac muscle cell",
    subtitle: "Short and branched, with a central nucleus, intercalated discs at its ends and striated myofibrils inside (cut open).",
    model: "/models/cardiomyocyte.glb",
    credit: `Myofibril bundle: ${CARDIAC_CELL}. Membrane, nucleus, T-tubules, SR and discs: MedicSync team.`,
    hotspots: [
      {
        id: "nucleus",
        name: "Nucleus",
        group: "Central",
        points: ["Usually a single, centrally located nucleus (skeletal fibers: many nuclei at the edge)."],
        pending: ["The team document says 1–2 nuclei."],
        lesson: CARDIAC,
        anchor: "hs_nucleus",
        meshes: ["Nucleus"],
      },
      {
        id: "disc",
        name: "Intercalated disc",
        group: "Cell-to-cell junction",
        points: [
          "Desmosomes strengthen the connection and help prevent cells from separating during contraction.",
          "Gap junctions let ions and electrical signals pass to neighbouring cells.",
        ],
        lesson: CARDIAC,
        anchor: "hs_disc",
        meshes: ["Intercalated discs"],
        zoomTo: "discs",
      },
      {
        id: "sarcolemma",
        name: "Sarcolemma",
        group: "Cell membrane",
        points: ["The plasma membrane of the muscle cell; conducts electrical excitation along its surface."],
        lesson: TISSUE,
        anchor: "hs_sarcolemma",
        meshes: ["Sarcolemma", "Branch"],
      },
      {
        id: "ttubule",
        name: "T-tubules",
        group: "Transverse tubules",
        points: ["Cardiac muscle has T-tubules (skeletal: present; smooth: absent)."],
        pending: ["Cardiac T-tubules are larger than those of skeletal muscle (team document)."],
        lesson: CARDIAC,
        anchor: "hs_ttubule",
        meshes: ["T-tubules"],
      },
      {
        id: "myofibril",
        name: "Myofibrils",
        group: "Contractile structure",
        points: ["Cardiac muscle cells have sarcomeres and striations like skeletal muscle.", "Troponin is the major Ca²⁺ regulatory protein, as in skeletal muscle."],
        lesson: CARDIAC,
        anchor: "hs_myofibril",
        meshes: ["Myofibrils", "Sarcoplasmic reticulum"],
        zoomTo: "cardiacmyofibril",
      },
    ],
  },
  {
    id: "discs",
    crumb: "Intercalated disc",
    title: "Intercalated disc — where two cells meet",
    subtitle: "Two cardiac muscle cells joined end-to-end, cut open at the intercalated disc: desmosomes and gap junctions. Switch to “Molecular view” for real protein structures.",
    model: "/models/discs.glb",
    molecular: "discs",
    credit:
      "Model: MedicSync team (schematic). Molecular view: PDB 2ZW3 connexin-26 channel (Maeda et al. 2009), PDB 5J5J desmocollin-2/desmoglein-2 (Harrison et al. 2016).",
    hotspots: [
      {
        id: "disc",
        name: "Intercalated disc",
        group: "Cell-to-cell junction",
        points: [
          "Intercalated discs are specialized regions where adjacent cardiac muscle cells connect.",
          "They contain desmosomes (strengthen the connection) and gap junctions (pass ions and electrical signals).",
        ],
        lesson: CARDIAC,
        anchor: "hs_disc",
        meshes: ["Cell membranes"],
      },
      {
        id: "desmosome",
        name: "Desmosome",
        group: "Mechanical coupling",
        points: ["Desmosomes strengthen the connection between neighboring cells and help prevent the cells from separating during contraction."],
        lesson: CARDIAC,
        anchor: "hs_desmosome",
        meshes: ["Desmosomes"],
      },
      {
        id: "gap",
        name: "Gap junction",
        group: "Electrical coupling",
        points: ["Gap junctions allow ions and electrical signals to pass between adjacent cells.", "This facilitates coordinated electrical activation of cardiac muscle tissue."],
        lesson: CARDIAC,
        anchor: "hs_gap",
        meshes: ["Gap junctions"],
      },
      {
        id: "membrane",
        name: "Cell membranes",
        group: "Two neighbouring cells",
        points: ["Cardiac muscle cells are joined end-to-end through specialized intercalated discs."],
        lesson: CARDIAC,
        anchor: "hs_membrane",
        meshes: ["Sarcolemma"],
      },
      {
        id: "myofibril",
        name: "Myofibrils",
        group: "Sarcomeres and striations",
        points: ["Cardiac muscle cells share several features with skeletal muscle cells, including the presence of sarcomeres and striations."],
        lesson: CARDIAC,
        anchor: "hs_myofibril",
        meshes: ["Myofibrils"],
        zoomTo: "cardiacmyofibril",
      },
    ],
  },

  {
    id: "cardiacmyofibril",
    crumb: "Myofibril",
    title: "Myofibril — cardiac muscle",
    subtitle: "Orderly bundles of filaments inside the cell: sarcomeres in series give cardiac muscle its striations, as in skeletal muscle.",
    model: "/models/myofibril.glb",
    credit: `Filament arrangement from ${MYOCYTE}, rebuilt to lecture proportions by the MedicSync team.`,
    hotspots: [
      {
        id: "myofibril",
        name: "Myofibril",
        group: "Contractile structure",
        points: ["Cardiac muscle cells have sarcomeres and striations like skeletal muscle.", "Thick (mainly myosin) and thin (mainly actin) filaments repeat in sarcomeres."],
        lesson: CARDIAC,
        anchor: "hs_myofibril",
      },
      band("aband", "hs_aband", ["Thick filaments"]),
      band("iband", "hs_iband", ["Thin filaments"]),
      {
        id: "zdisc",
        name: "Z disc",
        group: "Sarcomere boundary",
        points: ["Marks the boundary between neighbouring sarcomeres.", "Thin filaments are anchored here."],
        lesson: SARCOMERE,
        anchor: "hs_zdisc",
        meshes: ["Z discs"],
      },
      {
        id: "sarcomere",
        name: "Sarcomere",
        group: "Repeating unit",
        points: ["One sarcomere extends from one Z disc to the next.", "Troponin is the major Ca²⁺ regulatory protein in cardiac muscle, as in skeletal muscle."],
        lesson: CARDIAC,
        anchor: "hs_sarcomere",
        zoomTo: "sarcomere",
      },
    ],
  },

  // ───────────────────────── 3. Smooth muscle ─────────────────────────
  {
    id: "gutwall",
    crumb: "Organ wall",
    title: "Wall of a hollow organ — intestine",
    subtitle: "Smooth muscle in layers: one layer runs around the tube, the other along it.",
    model: "/models/gutwall.glb",
    hotspots: [
      {
        id: "lumen",
        name: "Hollow organ",
        group: "Where smooth muscle is",
        points: [
          "Single-unit (visceral) smooth muscle lines hollow organs and tubes: gastrointestinal tract, urinary bladder, uterus, small blood vessels.",
          "Its cells communicate and contract in a coordinated manner; smooth muscle moves substances through the digestive, urinary and reproductive systems.",
          "Multiunit smooth muscle (large blood vessels, airways, iris, ciliary body, arrector pili) gives fibers more independent neural control.",
        ],
        lesson: CARDIAC,
        anchor: "hs_lumen",
      },
      {
        id: "circular",
        name: "Circular layer",
        group: "Smooth muscle layer",
        points: [],
        pending: ["Cells run around the tube; contraction narrows it (team document: longitudinal and circular layers in the intestine)."],
        lesson: CARDIAC,
        anchor: "hs_circular",
        meshes: ["Circular muscle layer"],
      },
      {
        id: "longitudinal",
        name: "Longitudinal layer",
        group: "Smooth muscle layer",
        points: [],
        pending: ["Cells run along the tube; contraction shortens it (team document)."],
        lesson: CARDIAC,
        anchor: "hs_longitudinal",
        meshes: ["Longitudinal muscle layer"],
        zoomTo: "smoothtissue",
      },
      {
        id: "mucosa",
        name: "Inner lining",
        group: "Not smooth muscle",
        points: ["The lining of the tube — shown for context; it is not part of this lesson."],
        lesson: CARDIAC,
        anchor: "hs_mucosa",
        meshes: ["Mucosa"],
      },
    ],
  },
  {
    id: "smoothtissue",
    crumb: "Smooth muscle tissue",
    title: "Smooth muscle tissue",
    subtitle: "Spindle-shaped cells packed side by side, each with one central nucleus, in a thin extracellular matrix; gap junctions link them.",
    model: "/models/smoothtissue.glb",
    credit: `Cells: ${SMOOTH_CELL}. Layout, gap junctions, nerve and matrix: MedicSync team.`,
    hotspots: [
      {
        id: "cells",
        name: "Smooth muscle cells",
        group: "Single-unit sheet",
        points: ["Generally controlled involuntarily.", "Cells communicate and contract in a coordinated manner."],
        lesson: CARDIAC,
        anchor: "hs_cells",
        meshes: ["Smooth muscle cells"],
      },
      {
        id: "ecm",
        name: "Extracellular matrix",
        group: "Around the cells",
        points: [],
        pending: ["Extracellular matrix and a thin, endomysium-like connective tissue surround each cell (team document)."],
        lesson: CARDIAC,
        anchor: "hs_ecm",
        meshes: ["Extracellular matrix"],
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
        id: "varicosity",
        name: "Varicosities",
        group: "Autonomic nerve fiber",
        points: [
          "Smooth muscle is innervated by the autonomic nervous system.",
          "Neurotransmitter is released from swellings called varicosities and acts on several nearby cells (norepinephrine — sympathetic, acetylcholine — parasympathetic).",
        ],
        lesson: CARDIAC,
        anchor: "hs_varicosity",
        meshes: ["Varicosities", "Autonomic nerve fiber"],
      },
      {
        id: "cell",
        name: "One smooth muscle cell",
        group: "Zoom in",
        points: ["Spindle-shaped with a single, central nucleus."],
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
    subtitle: "Spindle-shaped, one central nucleus; no sarcomeres (not striated) and no T-tubules — membrane shown see-through.",
    model: "/models/smoothcell.glb",
    credit: `Cell and nucleus: ${SMOOTH_CELL}. Dense bodies, filaments, intermediate filaments and caveolae: MedicSync team.`,
    hotspots: [
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
        id: "membrane",
        name: "Sarcolemma — no T-tubules",
        group: "Cell membrane",
        points: ["Smooth muscle cells lack T-tubules.", "Ca²⁺ enters from the extracellular fluid and is also released from intracellular stores."],
        lesson: CARDIAC,
        anchor: "hs_membrane",
        meshes: ["Plasma membrane"],
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
        id: "dense",
        name: "Dense bodies",
        group: "Anchoring points",
        points: ["Dense bodies play a role broadly comparable to the Z discs of striated muscle."],
        lesson: CARDIAC,
        anchor: "hs_dense",
        meshes: ["Dense bodies", "Intermediate filaments"],
        zoomTo: "densebodies",
      },
      {
        id: "filaments",
        name: "Thick and thin filaments",
        group: "Contractile network",
        points: ["Present but arranged in a less regular network throughout the cell — no sarcomeres, so not striated."],
        lesson: CARDIAC,
        anchor: "hs_filaments",
        meshes: ["Contractile filaments"],
      },
    ],
  },
  {
    id: "densebodies",
    crumb: "Dense bodies",
    title: "Dense bodies and intermediate filaments",
    subtitle: "Inside the cell (membrane see-through): thick and thin filaments run obliquely between dense bodies; intermediate filaments link them into a network.",
    model: "/models/densebodies.glb",
    credit: `Cell and nucleus: ${SMOOTH_CELL}. Dense bodies, filaments and intermediate filaments: MedicSync team.`,
    hotspots: [
      {
        id: "dense",
        name: "Dense body",
        group: "Anchoring point",
        points: ["Contractile filaments attach to dense bodies.", "Dense bodies play a role broadly comparable to the Z discs of striated muscle."],
        lesson: CARDIAC,
        anchor: "hs_dense",
        meshes: ["Dense bodies"],
      },
      {
        id: "intermediate",
        name: "Intermediate filaments",
        group: "Force-spreading network",
        points: ["With dense bodies they form a network that allows force to be distributed throughout the cell."],
        pending: ["Intermediate filaments such as desmin (team document)."],
        lesson: CARDIAC,
        anchor: "hs_intermediate",
        meshes: ["Intermediate filaments"],
      },
      {
        id: "thin",
        name: "Thin filaments",
        group: "Actin",
        points: ["Smooth muscle contains thin filaments, arranged in a less regular network.", "They are anchored on the dense bodies."],
        lesson: CARDIAC,
        anchor: "hs_thin",
        meshes: ["Thin filaments"],
        zoomTo: "smoothfilaments",
      },
      {
        id: "thick",
        name: "Thick filaments",
        group: "Myosin",
        points: ["Smooth muscle contains thick filaments too — but no organised sarcomeres.", "Myosin heads on them pull the thin filaments, so the dense bodies come closer."],
        lesson: CARDIAC,
        anchor: "hs_thick",
        meshes: ["Thick filaments"],
      },
      {
        id: "plaque",
        name: "Dense bodies on the membrane",
        group: "Anchoring to the cell surface",
        points: ["Dense bodies are spread through the cytoplasm and on the cell membrane, so force reaches the whole cell."],
        lesson: CARDIAC,
        anchor: "hs_plaque",
        meshes: ["Membrane dense bodies"],
      },
    ],
  },
  {
    id: "smoothfilaments",
    crumb: "Myofilaments",
    title: "Smooth muscle myofilaments",
    subtitle: "Thin filaments (actin + tropomyosin, no troponin) anchored on dense bodies, around a thick filament with myosin heads along its whole length; calmodulin senses Ca²⁺. Switch to “Molecular view” for real protein structures.",
    model: "/models/smoothfilaments.glb",
    molecular: "smoothfilaments",
    credit:
      "Model: MedicSync team (schematic). Molecular view: PDB 5JLF F-actin–tropomyosin (von der Ecken et al.), PDB 1BR2 smooth muscle myosin motor domain (Dominguez et al. 1998), PDB 1EXR Ca²⁺-calmodulin (Wilson & Brunger 2000).",
    hotspots: [
      {
        id: "actin",
        name: "Thin filament: actin + tropomyosin",
        group: "Thin filament",
        points: ["Smooth muscle has thin filaments of actin with tropomyosin."],
        pending: ["Smooth muscle thin filaments have no troponin (team document)."],
        lesson: CARDIAC,
        anchor: "hs_actin",
        meshes: ["Actin", "Tropomyosin"],
      },
      {
        id: "myosin",
        name: "Myosin (smooth muscle)",
        group: "Thick filament",
        points: ["Thick filaments of myosin interact with the thin filaments — the filaments slide, the cell shortens."],
        lesson: CARDIAC,
        anchor: "hs_myosin",
        meshes: ["Myosin head", "Thick filament"],
      },
      {
        id: "calmodulin",
        name: "Calmodulin",
        group: "Ca²⁺ sensor",
        points: ["A calcium-binding protein — the calcium sensor in smooth muscle instead of troponin."],
        lesson: CARDIAC,
        anchor: "hs_calmodulin",
        meshes: ["Calmodulin"],
      },
      {
        id: "ca",
        name: "Ca²⁺",
        group: "Trigger",
        points: ["Ca²⁺ enters from the extracellular fluid and is also released from intracellular stores (no T-tubules)."],
        lesson: CARDIAC,
        anchor: "hs_ca",
        meshes: ["Ca ions"],
      },
    ],
  },
];

export const levelById = (id: string | null | undefined) => LEVELS.find((l) => l.id === id);

export const TOPICS: { id: TopicId; name: string; status: "open" | "Future"; chain: LevelId[] }[] = [
  { id: "skeletal", name: "Skeletal muscle", status: "open", chain: ["muscle", "fascicle", "fiber", "myofibril", "sarcomere", "filaments"] },
  { id: "cardiac", name: "Cardiac muscle", status: "open", chain: ["heartwall", "cardiactissue", "cardiomyocyte", "discs", "cardiacmyofibril", "sarcomere", "filaments"] },
  { id: "smooth", name: "Smooth muscle", status: "open", chain: ["gutwall", "smoothtissue", "smoothcell", "densebodies", "smoothfilaments"] },
];

export const topicById = (id: string | null | undefined) => TOPICS.find((t) => t.id === id && t.status === "open") ?? TOPICS[0];
