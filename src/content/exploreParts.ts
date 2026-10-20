/**
 * Every tappable part of the /explore models, by its node name in the .glb (Blender numbering and ".l"/".r" dropped).
 * Shown when a student taps a part, hovers it (name only) or picks it from the "All parts" list. Parts that also belong
 * to a numbered hotspot show the hotspot's text too (src/content/exploreZoom.ts).
 * Muscle wording follows the lecture sheet "Muscular tissues I" / src/content/lessons.ts; bones, heart chambers and
 * vessels use standard gross-anatomy facts (the user asked for them without an "awaiting review" badge, 19 Oct 2026).
 */
import { partById } from "./explore";

export type PartInfo = { name: string; group: string; points: string[] };

const mline = partById("mline");
const titin = partById("titin");

export const PART_INFO: Record<string, PartInfo> = {
  // ── arm (Z-Anatomy) ──
  Humerus: { name: "Humerus", group: "Bone · arm", points: ["The long bone of the arm, from the shoulder to the elbow.", "The brachialis attaches to its front; the biceps and triceps run along its front and back."] },
  Radius: { name: "Radius", group: "Bone · forearm", points: ["The lateral (thumb-side) bone of the forearm.", "The biceps brachii inserts on it, so the biceps bends the elbow and turns the palm up (supination)."] },
  Ulna: { name: "Ulna", group: "Bone · forearm", points: ["The medial (little-finger-side) bone of the forearm; with the humerus it forms the hinge of the elbow.", "The triceps brachii inserts on its olecranon and straightens the elbow."] },
  Scapula: { name: "Scapula", group: "Bone · shoulder blade", points: ["Both heads of the biceps brachii and the long head of the triceps brachii arise from it."] },
  Clavicle: { name: "Clavicle", group: "Bone · collar bone", points: ["Links the upper limb to the trunk.", "The clavicular part of the deltoid arises from it."] },
  "Clavicular part of deltoid muscle": { name: "Deltoid — clavicular (anterior) part", group: "Shoulder muscle", points: ["Raises the arm forward (flexion) and turns it inward."] },
  "Acromial part of deltoid muscle": { name: "Deltoid — acromial (middle) part", group: "Shoulder muscle", points: ["Lifts the arm out to the side (abduction)."] },
  "Scapular spinal part of deltoid muscle": { name: "Deltoid — spinal (posterior) part", group: "Shoulder muscle", points: ["Moves the arm backward (extension) and turns it outward."] },
  "Brachialis muscle": { name: "Brachialis", group: "Arm muscle", points: ["Lies under the biceps and inserts on the ulna.", "A main flexor of the elbow, working with the biceps brachii."] },
  "Brachioradialis muscle": { name: "Brachioradialis", group: "Forearm muscle", points: ["Runs from the humerus to the radius and helps bend the elbow."] },
  "Coracobrachialis muscle": { name: "Coracobrachialis", group: "Arm muscle", points: ["From the scapula (coracoid process) to the humerus; helps raise the arm forward and pull it toward the body."] },
  "Long head of biceps brachii": { name: "Biceps brachii — long head", group: "Arm muscle", points: ["Its tendon arises from the scapula above the shoulder joint.", "Joins the short head to insert on the radius: bends the elbow."] },
  "Short head of biceps brachii": { name: "Biceps brachii — short head", group: "Arm muscle", points: ["Arises from the coracoid process of the scapula.", "Joins the long head to insert on the radius: bends the elbow."] },
  "Long head of triceps brachii": { name: "Triceps brachii — long head", group: "Arm muscle", points: ["Arises from the scapula below the shoulder joint.", "With the other two heads it straightens the elbow — the opposing muscle of the biceps."] },
  "Lateral head of triceps brachii": { name: "Triceps brachii — lateral head", group: "Arm muscle", points: ["Arises from the back of the humerus; straightens the elbow."] },
  "Medial head of triceps brachii": { name: "Triceps brachii — medial head", group: "Arm muscle", points: ["Arises from the back of the humerus, deep to the other heads; straightens the elbow."] },
  Epimysium: { name: "Epimysium", group: "Connective tissue", points: ["The outer layer of dense connective tissue around the whole muscle."] },

  // ── heart (Z-Anatomy) ──
  "Right atrium": { name: "Right atrium", group: "Heart chamber", points: ["Receives oxygen-poor blood returning from the body (venae cavae)."] },
  "Right ventricle": { name: "Right ventricle", group: "Heart chamber", points: ["Pumps blood into the pulmonary trunk, toward the lungs."] },
  "Left atrium": { name: "Left atrium", group: "Heart chamber", points: ["Receives oxygen-rich blood from the lungs (pulmonary veins)."] },
  "Left ventricle": { name: "Left ventricle", group: "Heart chamber", points: ["Pumps blood into the aorta, to the whole body.", "Its wall has the thickest myocardium of the four chambers."] },
  "Ascending aorta": { name: "Ascending aorta", group: "Artery", points: ["The first part of the aorta, leaving the left ventricle; the coronary arteries branch from its root."] },
  "Aortic arch": { name: "Aortic arch", group: "Artery", points: ["Curves over the heart and gives branches to the head, neck and upper limbs."] },
  "Pulmonary trunk": { name: "Pulmonary trunk", group: "Artery", points: ["Carries oxygen-poor blood from the right ventricle toward the lungs."] },
  "Bifurcation of pulmonary trunk": { name: "Bifurcation of the pulmonary trunk", group: "Artery", points: ["Where the pulmonary trunk divides into the right and left pulmonary arteries."] },
  "Superior vena cava": { name: "Superior vena cava", group: "Vein", points: ["Returns oxygen-poor blood from the upper body to the right atrium."] },
  "Left coronary artery": { name: "Left coronary artery", group: "Artery", points: ["Supplies the heart muscle (myocardium) itself with oxygen-rich blood."] },
  Epicardium: { name: "Epicardium / pericardium", group: "Heart wall — outer layer", points: ["The outermost tissue layer covering the heart wall."] },
  Myocardium: { name: "Myocardium", group: "Heart wall — muscle layer", points: ["The thick muscle layer of the heart wall, made of cardiac muscle cells working together."] },
  Endocardium: { name: "Endocardium", group: "Heart wall — inner lining", points: ["The thin inner lining of the heart chambers."] },

  // ── fascicle ──
  Fibers: { name: "Muscle fiber", group: "One muscle cell", points: ["A long, cylindrical, multinucleated cell — its nuclei lie at the edge.", "Filled with myofibrils; wrapped by its own endomysium."] },
  Perimysium: { name: "Perimysium", group: "Connective tissue", points: ["Encloses each fascicle and carries blood vessels and nerves."] },
  Endomysium: { name: "Endomysium", group: "Connective tissue", points: ["A delicate layer around each muscle fiber (in cardiac muscle: around each cell, with dense capillaries)."] },
  "Blood vessel": { name: "Blood vessel", group: "In the perimysium", points: ["Blood vessels run in the perimysium and branch into capillaries around the fibers, bringing oxygen and nutrients."] },
  Nerve: { name: "Nerve", group: "In the perimysium", points: ["Carries the axons of somatic motor neurons to the fibers."] },
  "Motor neuron branches": { name: "Motor neuron branches", group: "One motor unit", points: ["One motor neuron branches to several fibers; the neuron and all the fibers it controls form a motor unit."] },

  // ── muscle fiber ──
  Sarcolemma: { name: "Sarcolemma", group: "Cell membrane", points: ["The plasma membrane of the muscle cell.", "Conducts electrical excitation along the surface; its openings lead into the T-tubules."] },
  Nuclei: { name: "Nuclei", group: "Many, at the edge", points: ["A skeletal muscle fiber has many nuclei, close to the sarcolemma."] },
  "Motor neuron axon": { name: "Motor neuron axon", group: "Nerve", points: ["Carries the action potential from the spinal cord to the neuromuscular junction."] },
  "Axon terminal": { name: "Axon terminal", group: "Neuromuscular junction", points: ["Releases acetylcholine (ACh) into the synaptic cleft; ACh binds receptors on the sarcolemma."] },
  "T-tubules": { name: "T-tubules", group: "Transverse tubules", points: ["Inward extensions of the sarcolemma that carry excitation deep into the cell."] },
  "Terminal cisternae": { name: "Terminal cisternae", group: "Part of the SR", points: ["Enlarged ends of the SR beside each T-tubule; store and rapidly release Ca²⁺.", "T-tubule + two terminal cisternae = a triad."] },
  "Sarcoplasmic reticulum": { name: "Sarcoplasmic reticulum (SR)", group: "Ca²⁺ store", points: ["A network of tubules around each myofibril that stores Ca²⁺ and releases it in a regulated way."] },
  Mitochondria: { name: "Mitochondria", group: "In the sarcoplasm", points: ["Produce the ATP that powers contraction (myosin heads) and Ca²⁺ pumping back into the SR."] },
  Myofibrils: { name: "Myofibrils", group: "Contractile structure", points: ["Long cylinders that fill most of the cell, made of repeating sarcomeres of thick and thin filaments."] },

  // ── myofibril / sarcomere ──
  "Thick filaments": { name: "Thick filaments (myosin)", group: "Myofilament", points: ["Mainly myosin; their length is the A band (1.6 µm).", "They keep their length during contraction."] },
  "Thin filaments": { name: "Thin filaments (actin)", group: "Myofilament", points: ["Mainly actin, with tropomyosin and troponin; anchored at the Z discs.", "They slide toward the M line during contraction — the I band shortens."] },
  "Z discs": { name: "Z discs", group: "Sarcomere boundary", points: ["One sarcomere runs from one Z disc to the next; thin filaments are anchored here."] },
  "M lines": { name: mline.name, group: mline.group, points: mline.points },
  Titin: { name: titin.name, group: titin.group, points: titin.points },

  // ── myofilaments ──
  Actin: { name: "Actin", group: "Thin filament", points: ["G-actin molecules join into F-actin strands arranged as a double helix.", "Each actin has a site where a myosin head can bind."] },
  Tropomyosin: { name: "Tropomyosin", group: "Thin filament — regulatory protein", points: ["A long strand lying along the actin groove; at rest it covers the myosin-binding sites."] },
  "Troponin C": { name: "Troponin C (TnC)", group: "Troponin complex", points: ["Binds Ca²⁺ — the switch that starts contraction."] },
  "Troponin I": { name: "Troponin I (TnI)", group: "Troponin complex", points: ["Helps inhibit the actin–myosin interaction at rest."] },
  "Troponin T": { name: "Troponin T (TnT)", group: "Troponin complex", points: ["Binds tropomyosin and anchors the troponin complex to it."] },
  "Myosin head": { name: "Myosin head (cross-bridge)", group: "Thick filament", points: ["Binds actin, changes position (power stroke) and pulls the thin filament toward the M line, using energy from ATP."] },
  "Thick filament": { name: "Thick filament (myosin)", group: "Myofilament", points: ["Bundle of myosin molecules: long tails in the core, globular heads sticking out toward the thin filaments."] },

  // ── cardiac ──
  "Cardiac muscle cells": { name: "Cardiac muscle cell", group: "Cardiomyocyte", points: ["Striated, short and branched, usually with one central nucleus; joined end-to-end by intercalated discs."] },
  "Intercalated discs": { name: "Intercalated disc", group: "Cell-to-cell junction", points: ["Desmosomes hold the cells together; gap junctions pass ions and electrical signals to the next cell."] },
  Capillaries: { name: "Capillaries", group: "Blood supply", points: ["Run densely in the endomysium between cardiac muscle cells."] },
  Nucleus: { name: "Nucleus", group: "One, central", points: ["Cardiac and smooth muscle cells usually have a single, centrally located nucleus (skeletal fibers: many, at the edge)."] },
  Branch: { name: "Branch", group: "Cell shape", points: ["Cardiac muscle cells branch and connect to several neighbours, forming a network."] },

  // ── smooth ──
  "Smooth muscle cells": { name: "Smooth muscle cell", group: "Spindle-shaped cell", points: ["Spindle-shaped with one central nucleus; no sarcomeres, so not striated.", "Controlled involuntarily."] },
  "Extracellular matrix": { name: "Extracellular matrix", group: "Around the cells", points: ["Extracellular matrix and a thin, endomysium-like connective tissue surround each cell."] },
  "Gap junctions": { name: "Gap junctions", group: "Cell-to-cell coupling", points: ["Link neighbouring cells so the sheet contracts in a coordinated way."] },
  "Autonomic nerve fiber": { name: "Autonomic nerve fiber", group: "Innervation", points: ["Smooth muscle is innervated by the autonomic nervous system."] },
  Varicosities: { name: "Varicosities", group: "Autonomic nerve fiber", points: ["Swellings that release neurotransmitter onto several nearby cells (norepinephrine — sympathetic, acetylcholine — parasympathetic)."] },
  "Plasma membrane": { name: "Sarcolemma (plasma membrane)", group: "Cell membrane", points: ["No T-tubules; Ca²⁺ enters from the extracellular fluid and is also released from intracellular stores."] },
  Caveolae: { name: "Caveolae", group: "Membrane pits", points: ["Small invaginations of the membrane involved in Ca²⁺ handling and signalling."] },
  "Dense bodies": { name: "Dense bodies", group: "Anchoring points", points: ["Anchor the contractile filaments in the cytoplasm and on the membrane — comparable to Z discs."] },
  Calmodulin: { name: "Calmodulin", group: "Ca²⁺ sensor", points: ["A calcium-binding protein in the cytoplasm — the calcium sensor in smooth muscle instead of troponin.", "Ca²⁺–calmodulin switches on the interaction of myosin with actin."] },
  "Ca ions": { name: "Ca²⁺", group: "Trigger", points: ["Enters from the extracellular fluid and is also released from intracellular stores (smooth muscle has no T-tubules).", "Binds calmodulin to start contraction."] },
  "Cell membranes": { name: "Cell membranes at the intercalated disc", group: "Two neighbouring cells", points: ["Where the membranes of two adjacent cardiac muscle cells meet end-to-end."] },
  Desmosomes: { name: "Desmosomes", group: "Mechanical coupling", points: ["Strengthen the connection between neighboring cells and help prevent the cells from separating during contraction."] },
  "Membrane dense bodies": { name: "Dense bodies on the membrane", group: "Anchoring to the cell surface", points: ["Dense bodies attached to the inside of the membrane; filaments pulling on them pass the force to the whole cell."] },
  "Contractile filaments": { name: "Thick and thin filaments", group: "Contractile network", points: ["Run obliquely between dense bodies as a network; Ca²⁺–calmodulin switches them on (no troponin)."] },
  "Intermediate filaments": { name: "Intermediate filaments", group: "Cytoskeleton", points: ["Filaments such as desmin link dense bodies so force spreads through the whole cell."] },

  // ── gut wall ──
  "Circular muscle layer": { name: "Circular layer", group: "Smooth muscle layer", points: ["Cells run around the tube; when they contract the tube narrows."] },
  "Longitudinal muscle layer": { name: "Longitudinal layer", group: "Smooth muscle layer", points: ["Cells run along the tube; when they contract the tube shortens."] },
  Mucosa: { name: "Inner lining (mucosa)", group: "Not smooth muscle", points: ["The lining of the tube, shown for context."] },
};

// a part that means something different on one level (key "<level>:<part>")
const LEVEL_PART_INFO: Record<string, PartInfo> = {
  "smoothfilaments:Tropomyosin": { name: "Tropomyosin", group: "Thin filament", points: ["Lies along the actin strands. Smooth muscle thin filaments have tropomyosin but no troponin."] },
  "smoothfilaments:Thick filament": { name: "Thick filament (myosin)", group: "Myofilament", points: ["Smooth muscle myosin; its heads stick out along the whole length (side-polar), pointing opposite ways on opposite sides.", "So it can pull thin filaments in both directions — toward the dense bodies at both ends."] },
  "smoothfilaments:Myosin head": { name: "Myosin head (cross-bridge)", group: "Thick filament", points: ["Once Ca²⁺–calmodulin has switched contraction on, the heads bind actin and pull; the thin filaments slide and the dense bodies come closer."] },
  "smoothfilaments:Dense bodies": { name: "Dense bodies", group: "Anchoring points", points: ["The thin filaments are anchored here — comparable to the Z discs of striated muscle."] },
  "discs:Sarcolemma": { name: "Sarcolemma", group: "Cell membrane", points: ["The plasma membrane of each cardiac muscle cell; it conducts electrical excitation along the cell surface."] },
  "discs:Myofibrils": { name: "Myofibrils", group: "Sarcomeres and striations", points: ["Cardiac muscle cells have sarcomeres and striations, like skeletal muscle cells."] },
  "discs:Gap junctions": { name: "Gap junctions", group: "Electrical coupling", points: ["Allow ions and electrical signals to pass between adjacent cells — coordinated electrical activation of cardiac muscle."] },
  "densebodies:Thin filaments": { name: "Thin filaments (actin)", group: "Contractile filament", points: ["Actin with tropomyosin (no troponin), anchored on the dense bodies.", "They slide along the thick filaments — the filaments do not shorten."] },
  "densebodies:Thick filaments": { name: "Thick filaments (myosin)", group: "Contractile filament", points: ["Myosin; its heads pull the thin filaments so the dense bodies at both ends come closer.", "Run obliquely through the cell — no sarcomeres."] },
  "densebodies:Plasma membrane": { name: "Sarcolemma (plasma membrane)", group: "Cell membrane", points: ["Shown see-through. Dense bodies attached to it pass the force to the cell surface."] },
};

export const partInfo = (key: string, level?: string): PartInfo =>
  (level && LEVEL_PART_INFO[`${level}:${key}`]) || PART_INFO[key] || { name: key, group: "Part of the model", points: [] };
