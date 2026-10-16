/**
 * Step-by-step captions for the /explore animations. Plain data — no three.js here.
 * Every step is summarised from the lecture sheet "Muscular tissues I" (sections in `ref`) and src/content/lessons.ts;
 * do not add mechanisms the lecture does not teach (rule R6).
 *
 * `from` = where the step starts on the animation's 0 → 1 timeline.
 */
import type { LevelId } from "./exploreZoom";

export type AnimStep = { from: number; title: string; text: string; ref: string };
export type LevelAnim = { title: string; seconds: number; steps: AnimStep[] };

export const ANIMS: Partial<Record<LevelId, LevelAnim>> = {
  arm: {
    title: "Flex and extend the elbow",
    seconds: 5,
    steps: [
      {
        from: 0,
        title: "Biceps brachii contracts",
        text: "Skeletal muscles produce movement by exerting force on bones and joints — here the biceps shortens and the elbow bends.",
        ref: "§1.1",
      },
      { from: 0.5, title: "Triceps brachii contracts", text: "During elbow extension the triceps brachii contracts…", ref: "§2.4" },
      {
        from: 0.6,
        title: "Biceps lengthens",
        text: "…while the biceps brachii must lengthen enough to permit the movement — extensibility. Muscles frequently act in opposing groups; elasticity then helps them return toward their previous length.",
        ref: "§2.4 · §2.5",
      },
    ],
  },
  fascicle: {
    title: "One motor unit",
    seconds: 5,
    steps: [
      {
        from: 0,
        title: "Action potential in the motor neuron",
        text: "A single somatic motor neuron carries the signal toward the muscle; its axon branches near its end.",
        ref: "§8",
      },
      {
        from: 0.35,
        title: "Its muscle fibers respond together",
        text: "A motor unit = one motor neuron + all the muscle fibers it controls. Each fiber receives input from only one motor neuron.",
        ref: "§8",
      },
      {
        from: 0.75,
        title: "Small vs large motor units",
        text: "Small motor units allow fine, precise movements; large motor units produce greater force.",
        ref: "§8",
      },
    ],
  },
  fiber: {
    title: "From nerve signal to Ca²⁺ release",
    seconds: 9,
    steps: [
      { from: 0, title: "1 · Neural stimulation", text: "An action potential arrives at the terminal of the somatic motor neuron.", ref: "§11 step 1" },
      {
        from: 0.2,
        title: "2 · Release of acetylcholine",
        text: "Synaptic vesicles release ACh into the synaptic cleft; ACh diffuses across the cleft.",
        ref: "§9 · §11 step 2",
      },
      {
        from: 0.38,
        title: "3 · Muscle fiber excitation",
        text: "ACh binds receptors on the sarcolemma. The muscle action potential spreads along the sarcolemma and into the fiber through the T-tubules.",
        ref: "§10.1 · §11 step 3",
      },
      {
        from: 0.6,
        title: "4 · Calcium release",
        text: "The signal in the T-tubules triggers the sarcoplasmic reticulum (terminal cisternae) to release Ca²⁺ into the sarcoplasm.",
        ref: "§10.2 · §11 step 4",
      },
      {
        from: 0.85,
        title: "Ca²⁺ reaches the myofibrils",
        text: "The rise in Ca²⁺ lets the thin-filament regulatory proteins expose the myosin-binding sites on actin — zoom in to see it.",
        ref: "§10.2",
      },
    ],
  },
  sarcomere: {
    title: "Sliding filaments",
    seconds: 6,
    steps: [
      {
        from: 0,
        title: "Contraction",
        text: "Myosin heads pull the thin filaments toward the M line: the Z discs move closer, the I band shortens and the H zone narrows or disappears.",
        ref: "§12",
      },
      {
        from: 0.5,
        title: "The A band stays the same",
        text: "Filaments slide past one another — neither actin nor myosin filaments become shorter. The A band keeps its length.",
        ref: "§12 key concept",
      },
      {
        from: 0.7,
        title: "Relaxation",
        text: "Ca²⁺ is pumped back into the SR, cross-bridge cycling decreases, tension falls and the sarcomere returns to rest.",
        ref: "§10.4",
      },
    ],
  },
  crossbridge: {
    title: "Ca²⁺ switch and the cross-bridge cycle",
    seconds: 14,
    steps: [
      { from: 0, title: "At rest", text: "Tropomyosin lies over the myosin-binding sites on actin, so myosin heads cannot attach.", ref: "§6.2 · §10.4" },
      {
        from: 0.1,
        title: "5 · Ca²⁺ binds troponin",
        text: "Ca²⁺ binds troponin C; the regulatory complex changes and moves tropomyosin away from the myosin-binding sites.",
        ref: "§11 step 5",
      },
      { from: 0.26, title: "6 · Cross-bridge formation", text: "Activated myosin heads bind to the exposed sites on actin.", ref: "§11 step 6" },
      {
        from: 0.36,
        title: "7 · Power stroke",
        text: "The myosin head changes position and pulls the thin filament toward the centre of the sarcomere (M line).",
        ref: "§11 step 7",
      },
      {
        from: 0.48,
        title: "8 · Detach and repeat",
        text: "Heads detach, re-cock and attach again. As long as Ca²⁺ and ATP are available, cross-bridge cycling continues and tension develops.",
        ref: "§10.3 · §11 step 8",
      },
      {
        from: 0.8,
        title: "9–10 · Relaxation",
        text: "Nerve stimulation stops, Ca²⁺ is transported back into the SR, tropomyosin covers the binding sites again and cycling stops.",
        ref: "§11 steps 9–10",
      },
    ],
  },
  heart: {
    title: "Continuous rhythmic contraction",
    seconds: 2.4,
    steps: [
      {
        from: 0,
        title: "Contraction",
        text: "Cardiac muscle forms the muscular component of the heart and is specialised for continuous rhythmic contraction.",
        ref: "§14",
      },
      { from: 0.35, title: "Pumping blood", text: "Cardiac muscle drives blood circulation — its major function is pumping blood.", ref: "§1.1 · §20" },
      {
        from: 0.65,
        title: "Relax and repeat",
        text: "Contraction is controlled primarily through involuntary mechanisms and repeats without stopping.",
        ref: "§14",
      },
    ],
  },
  cardiac: {
    title: "Coordinated activation through intercalated discs",
    seconds: 5,
    steps: [
      { from: 0, title: "Electrical signal enters one cell", text: "Cardiac muscle cells are joined end-to-end by intercalated discs.", ref: "§14" },
      {
        from: 0.2,
        title: "Gap junctions pass it on",
        text: "Gap junctions let ions and electrical signals pass to neighbouring cells, so cardiac muscle is activated in a coordinated way.",
        ref: "§14",
      },
      { from: 0.6, title: "Cells contract together", text: "Desmosomes hold the cells together so they do not separate during contraction.", ref: "§14" },
    ],
  },
  smoothtissue: {
    title: "Coordinated contraction of single-unit smooth muscle",
    seconds: 5,
    steps: [
      {
        from: 0,
        title: "Signal from an autonomic nerve",
        text: "Autonomic nerve fibers release neurotransmitter from varicosities that act on several nearby cells (norepinephrine — sympathetic; acetylcholine — parasympathetic).",
        ref: "§15",
      },
      {
        from: 0.3,
        title: "Gap junctions spread it",
        text: "In single-unit smooth muscle, cells communicate through gap junctions and contract in a coordinated manner.",
        ref: "§15.1 · §16",
      },
      { from: 0.7, title: "Relaxation", text: "The wall of the hollow organ relaxes again — contraction is involuntary.", ref: "§15" },
    ],
  },
  smoothcell: {
    title: "One smooth muscle cell contracts",
    seconds: 6,
    steps: [
      {
        from: 0,
        title: "Ca²⁺ enters",
        text: "No T-tubules: Ca²⁺ enters from the extracellular fluid and is also released from intracellular stores.",
        ref: "§16",
      },
      { from: 0.25, title: "Calmodulin, not troponin", text: "Calmodulin is the calcium sensor that starts contraction (instead of troponin).", ref: "§16" },
      {
        from: 0.45,
        title: "Filaments pull on dense bodies",
        text: "Thick and thin filaments attach to dense bodies (comparable to Z discs) and intermediate filaments; the network spreads force through the cell, which shortens.",
        ref: "§16",
      },
      { from: 0.75, title: "Relaxation", text: "No sarcomeres, so the cell is not striated — but it contracts and relaxes like the others.", ref: "§16" },
    ],
  },
};

export const animStarts = (a: LevelAnim) => a.steps.map((s) => s.from);
