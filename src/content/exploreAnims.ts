/**
 * Step-by-step captions for the /explore animations (v2, 18 Oct 2026 — one animation per level of the new order).
 * Every step is summarised from the lecture sheet "Muscular tissues I" (sections in `ref`) and src/content/lessons.ts;
 * steps that rest on the team document only are marked `pending` (shown with an "awaiting review" badge) — rule R6.
 *
 * `from` = where the step starts on the animation's 0 → 1 timeline.
 * `readout` = a live value line the panel shows while the animation runs (computed in the page from t).
 */
import type { LevelId } from "./exploreZoom";

export type AnimStep = { from: number; title: string; text: string; ref: string; pending?: boolean };
export type LevelAnim = { title: string; seconds: number; steps: AnimStep[]; readout?: "sarcomere" };

export const ANIMS: Partial<Record<LevelId, LevelAnim>> = {
  // ── skeletal ──
  muscle: {
    title: "Epimysium, the whole muscle and movement",
    seconds: 7,
    steps: [
      { from: 0, title: "Epimysium wraps the whole muscle", text: "The outer layer of dense connective tissue around the entire muscle.", ref: "§3.2" },
      { from: 0.22, title: "Inside: the whole muscle", text: "A skeletal muscle is an organ — muscle fibers plus connective tissue, blood vessels and nerves.", ref: "§3.1" },
      { from: 0.4, title: "Contraction moves the bone", text: "Skeletal muscles produce movement by exerting force on bones and joints; the connective tissue helps transmit that force.", ref: "§1.1 · §3.1" },
      { from: 0.7, title: "Opposing muscle", text: "During elbow extension the triceps contracts while the biceps must lengthen — extensibility.", ref: "§2.4" },
    ],
  },
  fascicle: {
    title: "Three wrappings, one force",
    seconds: 7,
    steps: [
      { from: 0, title: "Perimysium around the fascicle", text: "Each fascicle is enclosed by the perimysium, a pathway for blood vessels and nerves.", ref: "§3.2" },
      { from: 0.25, title: "Endomysium around each fiber", text: "A delicate layer around each muscle fiber supports it.", ref: "§3.2" },
      { from: 0.5, title: "The fibers contract", text: "The connective tissue layers help transmit force between fibers and to the surrounding tissue.", ref: "§3.2" },
      { from: 0.8, title: "Relaxation", text: "Elasticity helps the muscle return toward its previous length.", ref: "§2.5" },
    ],
  },
  fiber: {
    title: "From nerve signal to Ca²⁺ release",
    seconds: 9,
    steps: [
      { from: 0, title: "Signal at the NMJ", text: "An action potential reaches the motor neuron terminal; ACh is released and binds receptors on the sarcolemma.", ref: "§9 · §11 steps 1–3" },
      { from: 0.25, title: "Along the sarcolemma", text: "The muscle action potential spreads along the sarcolemma.", ref: "§10.1" },
      { from: 0.42, title: "Into the T-tubules", text: "It travels deep into the fiber through the T-tubules.", ref: "§10.1 · §4.2" },
      { from: 0.58, title: "SR releases Ca²⁺", text: "The terminal cisternae of the SR release Ca²⁺ into the sarcoplasm (triad).", ref: "§10.2 · §11 step 4" },
      { from: 0.82, title: "Ca²⁺ reaches the myofibrils", text: "The rise in Ca²⁺ lets the regulatory proteins expose the myosin-binding sites on actin.", ref: "§10.2" },
    ],
  },
  myofibril: {
    title: "Every sarcomere shortens together",
    seconds: 6,
    steps: [
      { from: 0, title: "Relaxed pattern", text: "Dark A bands and light I bands repeat along the myofibril; a Z disc crosses each I band.", ref: "§5.1" },
      { from: 0.2, title: "Contraction", text: "All sarcomeres in series shorten: the Z discs come closer and the I bands narrow — the A bands keep their length.", ref: "§12" },
      { from: 0.7, title: "Relaxation", text: "Ca²⁺ is pumped back into the SR, cross-bridge cycling decreases and the myofibril returns to rest.", ref: "§10.4" },
    ],
  },
  sarcomere: {
    title: "Sliding filaments",
    seconds: 6,
    readout: "sarcomere",
    steps: [
      { from: 0, title: "Contraction", text: "Myosin heads pull the thin filaments toward the M line: the Z discs move closer, the I band shortens and the H zone narrows or disappears.", ref: "§12" },
      { from: 0.5, title: "The A band stays the same", text: "Filaments slide past one another — neither actin nor myosin filaments become shorter.", ref: "§12 key concept" },
      { from: 0.7, title: "Relaxation", text: "Ca²⁺ is transported back into the SR, tension falls and the sarcomere returns to rest.", ref: "§10.4" },
    ],
  },
  filaments: {
    title: "Ca²⁺ switch and the cross-bridge cycle",
    seconds: 14,
    steps: [
      { from: 0, title: "At rest", text: "Tropomyosin lies over the myosin-binding sites on actin; troponin I helps block the actin–myosin interaction.", ref: "§6.2 · §10.4" },
      { from: 0.1, title: "Ca²⁺ binds troponin C", text: "Ca²⁺ binds TnC; the regulatory complex changes and moves tropomyosin away from the binding sites.", ref: "§11 step 5" },
      { from: 0.26, title: "Cross-bridge formation", text: "Activated myosin heads bind to the exposed sites on actin.", ref: "§11 step 6" },
      { from: 0.33, title: "Power stroke", text: "The myosin head changes position and pulls the thin filament toward the centre of the sarcomere — energy from ATP becomes mechanical work.", ref: "§6.1 · §11 step 7" },
      { from: 0.43, title: "Detach and repeat", text: "Heads detach and attach again; as long as Ca²⁺ and ATP are available cycling continues.", ref: "§10.3 · §11 step 8" },
      { from: 0.8, title: "Relaxation", text: "Ca²⁺ is removed, tropomyosin covers the binding sites again and cycling stops.", ref: "§11 steps 9–10" },
    ],
  },

  // ── cardiac ──
  heartwall: {
    title: "The heart beats — the myocardium does the work",
    seconds: 4.8,
    steps: [
      { from: 0, title: "Continuous rhythmic contraction", text: "Cardiac muscle forms the muscular component of the heart and contracts rhythmically without stopping.", ref: "§14" },
      { from: 0.3, title: "Myocardium", text: "The thick muscle layer of the heart wall is where the cardiac muscle cells are.", ref: "team document", pending: true },
      { from: 0.6, title: "Pumping blood", text: "Cardiac muscle drives blood circulation; its control is involuntary.", ref: "§1.1 · §14" },
    ],
  },
  cardiactissue: {
    title: "Coordinated activation of a branched network",
    seconds: 6,
    steps: [
      { from: 0, title: "Signal enters one cell", text: "Cardiac muscle cells are branched and joined end-to-end by intercalated discs.", ref: "§14" },
      { from: 0.2, title: "Through the intercalated discs", text: "Gap junctions pass ions and electrical signals to neighbouring cells, so the tissue is activated in a coordinated way.", ref: "§14" },
      { from: 0.6, title: "Cells contract together", text: "Desmosomes keep the cells from separating during contraction.", ref: "§14" },
      { from: 0.85, title: "Capillaries in the endomysium", text: "Capillaries run densely between the cells.", ref: "team document", pending: true },
    ],
  },
  cardiomyocyte: {
    title: "Excitation inside one cardiac muscle cell",
    seconds: 7,
    steps: [
      { from: 0, title: "Along the sarcolemma", text: "Electrical excitation spreads along the cell membrane (arriving through the intercalated disc).", ref: "§4.1 · §14" },
      { from: 0.3, title: "Into the T-tubules", text: "Cardiac muscle has T-tubules that carry excitation inside.", ref: "§20" },
      { from: 0.5, title: "Ca²⁺ release", text: "Ca²⁺ is released into the sarcoplasm; troponin is the Ca²⁺ regulatory protein, as in skeletal muscle.", ref: "§10.2 · §20" },
      { from: 0.7, title: "Myofibrils contract", text: "Sarcomeres and striations as in skeletal muscle — the cell shortens, then hands the signal on through the next intercalated disc.", ref: "§14" },
    ],
  },
  discs: {
    title: "Electrical and mechanical coupling",
    seconds: 7,
    steps: [
      { from: 0, title: "Two cells meet", text: "Cardiac muscle cells are joined end-to-end through intercalated discs — specialized regions where adjacent cells connect.", ref: "§14" },
      { from: 0.15, title: "Ions pass through gap junctions", text: "Gap junctions allow ions and electrical signals to pass between adjacent cells, so cardiac muscle is activated in a coordinated way.", ref: "§14" },
      { from: 0.55, title: "Desmosomes hold on", text: "Desmosomes strengthen the connection and help prevent the cells from separating during contraction.", ref: "§14" },
    ],
  },

  cardiacmyofibril: {
    title: "Sarcomeres shorten together",
    seconds: 6,
    steps: [
      { from: 0, title: "Striated, like skeletal muscle", text: "Cardiac myofibrils have sarcomeres: thick filaments make the dark A bands, thin filaments the light I bands.", ref: "§14 · §20" },
      { from: 0.2, title: "Contraction", text: "The Z discs come closer and the I bands narrow — the A bands keep their length.", ref: "§12" },
      { from: 0.7, title: "Relaxation", text: "Ca²⁺ is removed, cross-bridge cycling decreases and the myofibril returns to rest.", ref: "§10.4" },
    ],
  },

  // ── smooth ──
  gutwall: {
    title: "Two layers move the contents along",
    seconds: 8,
    steps: [
      { from: 0, title: "Smooth muscle in a hollow organ", text: "Single-unit smooth muscle in the wall of the gastrointestinal tract contracts in a coordinated manner.", ref: "§15.1" },
      { from: 0.15, title: "Circular layer squeezes", text: "Rings of cells around the tube contract one after another — the tube narrows where they contract.", ref: "team document", pending: true },
      { from: 0.6, title: "Longitudinal layer shortens", text: "Cells running along the tube contract and shorten it.", ref: "team document", pending: true },
      { from: 0.85, title: "Moving substances along", text: "Smooth muscle facilitates the movement of substances through the digestive system.", ref: "§1.1" },
    ],
  },
  smoothtissue: {
    title: "One signal, many cells",
    seconds: 6,
    steps: [
      { from: 0, title: "Autonomic nerve fiber", text: "Neurotransmitter is released from varicosities and acts on several nearby cells (NE — sympathetic, ACh — parasympathetic).", ref: "§15" },
      { from: 0.3, title: "Gap junctions spread it", text: "Cells communicate through gap junctions and contract in a coordinated manner.", ref: "§15.1 · §16" },
      { from: 0.55, title: "The sheet contracts", text: "The cells shorten together inside their extracellular matrix.", ref: "§15" },
      { from: 0.8, title: "Relaxation", text: "Contraction is involuntary and relaxes again.", ref: "§15" },
    ],
  },
  smoothcell: {
    title: "One smooth muscle cell contracts",
    seconds: 6,
    steps: [
      { from: 0, title: "Ca²⁺ enters", text: "No T-tubules: Ca²⁺ enters from the extracellular fluid and is also released from intracellular stores; caveolae help with calcium handling.", ref: "§16" },
      { from: 0.3, title: "Calmodulin senses Ca²⁺", text: "Calmodulin, not troponin, is the calcium sensor.", ref: "§16" },
      { from: 0.45, title: "The cell shortens", text: "Filaments pull on dense bodies; the force spreads through the whole cell.", ref: "§16" },
      { from: 0.78, title: "Relaxation", text: "No sarcomeres, so no striations — but it contracts and relaxes all the same.", ref: "§16" },
    ],
  },
  densebodies: {
    title: "Filaments pull dense bodies together",
    seconds: 7,
    steps: [
      { from: 0, title: "The network at rest", text: "Thick and thin filaments run obliquely between dense bodies; intermediate filaments link the dense bodies.", ref: "§16" },
      { from: 0.2, title: "Thick and thin filaments slide", text: "Myosin pulls the thin filaments anchored to the dense bodies — the filaments themselves do not shorten.", ref: "§16 · §10.3" },
      { from: 0.5, title: "Force spreads to the membrane", text: "Dense bodies and intermediate filaments distribute the force throughout the cell.", ref: "§16" },
      { from: 0.8, title: "Relaxation", text: "The network returns to rest.", ref: "§16" },
    ],
  },
  smoothfilaments: {
    title: "Calmodulin switches the filaments on",
    seconds: 10,
    steps: [
      { from: 0, title: "Thin filament: actin + tropomyosin", text: "Smooth muscle thin filaments: actin with tropomyosin.", ref: "§16" },
      { from: 0.15, title: "Ca²⁺ binds calmodulin", text: "Calmodulin is the calcium sensor in smooth muscle instead of troponin.", ref: "§16" },
      { from: 0.4, title: "Myosin binds actin and pulls", text: "Myosin heads interact with actin and the filaments slide past each other.", ref: "§10.3 · §16" },
      { from: 0.8, title: "Relaxation", text: "When Ca²⁺ falls, the filaments relax.", ref: "§16" },
    ],
  },
};

export const animStarts = (a: LevelAnim) => a.steps.map((s) => s.from);
