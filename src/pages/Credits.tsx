import { ProseCard, PublicPage } from "@/components/student/PublicPage";

const LIBRARIES: { name: string; licence: string; url: string }[] = [
  { name: "React", licence: "MIT", url: "https://react.dev" },
  { name: "React Router", licence: "MIT", url: "https://reactrouter.com" },
  { name: "TanStack Query", licence: "MIT", url: "https://tanstack.com/query" },
  { name: "Tailwind CSS", licence: "MIT", url: "https://tailwindcss.com" },
  { name: "Vite", licence: "MIT", url: "https://vite.dev" },
  { name: "Hono", licence: "MIT", url: "https://hono.dev" },
  { name: "Zod", licence: "MIT", url: "https://zod.dev" },
  { name: "jose", licence: "MIT", url: "https://github.com/panva/jose" },
  { name: "dnd kit", licence: "MIT", url: "https://dndkit.com" },
  { name: "three.js", licence: "MIT", url: "https://threejs.org" },
  { name: "React Three Fiber & drei", licence: "MIT", url: "https://r3f.docs.pmnd.rs" },
  { name: "camera-controls", licence: "MIT", url: "https://github.com/yomotsu/camera-controls" },
  { name: "Inter typeface (Fontsource)", licence: "SIL Open Font License 1.1", url: "https://rsms.me/inter/" },
];

// 3D models in 3D Explore (requirement 3D-14, rule R7). Derivatives of CC BY-SA work are shared under the same licence.
const PDB = "PDB data: free of all copyright restrictions (CC0)";
const TEAM = { label: "This project", url: "https://github.com/arumaosogi-sudo/Seminar_Projest" };
const pdb = (id: string) => ({ label: `RCSB PDB ${id}`, url: `https://www.rcsb.org/structure/${id}` });
const MODELS: { model: string; author: string; source: { label: string; url: string }; licence: string; note?: string }[] = [
  {
    model: "Whole muscle — right arm with biceps and triceps brachii",
    author: "Z-Anatomy — Gauthier Kervyn et al., based on BodyParts3D by Kousaku Okubo (DBCLS)",
    source: { label: "github.com/Z-Anatomy", url: "https://github.com/Z-Anatomy/Models-of-human-anatomy" },
    licence: "CC BY-SA 4.0 (BodyParts3D: CC BY-SA 2.1 JP)",
    note: "Cut from the Z-Anatomy atlas, rigged for the elbow and given an epimysium layer by the MedicSync team; this adapted model is shared under CC BY-SA 4.0.",
  },
  {
    model: "Heart wall — heart with the great vessels",
    author: "Z-Anatomy — Gauthier Kervyn et al., based on BodyParts3D by Kousaku Okubo (DBCLS)",
    source: { label: "github.com/Z-Anatomy", url: "https://github.com/Z-Anatomy/Models-of-human-anatomy" },
    licence: "CC BY-SA 4.0 (BodyParts3D: CC BY-SA 2.1 JP)",
    note: "Cut from the Z-Anatomy atlas and compressed by the MedicSync team, who added the layered block (endocardium · myocardium · epicardium); this adapted model is shared under CC BY-SA 4.0.",
  },
  {
    model: "Muscle fiber, myofibril and sarcomere — sarcolemma, endomysium and the arrangement of thick and thin filaments",
    author: "“Myocyte model” by rgmz2015",
    source: { label: "Sketchfab", url: "https://sketchfab.com/3d-models/5e18a4489dae49918f156b8c4e13751b" },
    licence: "CC BY 4.0",
    note: "Filaments rebuilt to the lecture's proportions (sarcomere 2.5 µm, A band 1.6 µm, thin filament 1.0 µm); NMJ, T-tubules, SR, nuclei, mitochondria, myosin heads and titin added by the MedicSync team.",
  },
  {
    model: "Fascicle — the muscle fibers",
    author: "“Skeletal Muscle Fibre Anatomy” by _Bonehead14",
    source: { label: "Sketchfab", url: "https://sketchfab.com/3d-models/a491668e5891445e8e29d6ac4abf41bd" },
    licence: "CC BY 4.0",
    note: "Fibers resized and bundled; endomysium, perimysium, blood vessel, nerve and motor unit added by the MedicSync team.",
  },
  {
    model: "Myofilaments (skeletal / cardiac and smooth) — actin, tropomyosin, thick filament and myosin heads",
    author: "“Sarcomere Model” by rgmz2015",
    source: { label: "Sketchfab", url: "https://sketchfab.com/3d-models/a0f57ca1a44f4658b515fca5bf2131e5" },
    licence: "CC BY-NC 4.0 (non-commercial — this is a non-commercial educational project)",
    note: "Troponin complexes (TnC · TnI · TnT, skeletal/cardiac only), calmodulin with Ca²⁺ (smooth, from PDB 1EXR) and additional myosin heads added by the MedicSync team.",
  },
  {
    model: "Cardiac muscle tissue and cardiomyocyte — branched cell bundles",
    author: "“Cardiac Muscle Cell Anatomy” by _Bonehead14",
    source: { label: "Sketchfab", url: "https://sketchfab.com/3d-models/16e33d3b0be74b4c800cb7601fb51dd2" },
    licence: "CC BY 4.0",
    note: "Cut into cells with intercalated discs, striations and one central nucleus each; endomysium, capillaries, T-tubules and SR added by the MedicSync team.",
  },
  {
    model: "Smooth muscle tissue, cell, and dense bodies — spindle-shaped cells with their nuclei",
    author: "“Smooth Muscle Cell” by _Bonehead14",
    source: { label: "Sketchfab", url: "https://sketchfab.com/3d-models/1525fe1477e34d578836236c6a14f5cf" },
    licence: "CC BY 4.0",
    note: "Cells rearranged into a sheet; the dense-body network (dense bodies, thick and thin filaments, intermediate filaments), caveolae, gap junctions, nerve and matrix added by the MedicSync team.",
  },
  {
    model: "Gut wall, heart-wall layers, intercalated disc (desmosomes, gap junctions), smooth muscle myofilaments (with calmodulin); the elbow rig, everything added to the models above, and all animations",
    author: "MedicSync team (built with Blender scripts and in code with three.js)",
    source: TEAM,
    licence: "Made by the team",
  },
  {
    model: "Skeletal / cardiac myofilaments — thin filament (actin, tropomyosin, troponin C · I · T), Ca²⁺-free and Ca²⁺-bound",
    author: "Yamada Y., Namba K., Fujii T. — Cardiac muscle thin filament structures reveal calcium regulatory mechanism, Nat Commun 11:153 (2020)",
    source: { label: "RCSB PDB 6KN7 / 6KN8", url: "https://www.rcsb.org/structure/6KN8" },
    licence: PDB,
    note: "Actin in these entries is alpha skeletal actin; troponin is the cardiac isoform.",
  },
  {
    model: "Skeletal / cardiac myofilaments — myosin heads (motor domain, lever arm and light chains)",
    author: "Fujii T., Namba K. — Structure of actomyosin rigour complex at 5.2 Å resolution and insights into the ATPase cycle mechanism, Nat Commun 8:13969 (2017)",
    source: pdb("5H53"),
    licence: PDB,
    note: "Rabbit skeletal actomyosin; the heads are fitted onto the thin filament by the team. The thick-filament backbone is schematic.",
  },
  {
    model: "Intercalated disc — gap junction channel (connexin-26, two docked connexons)",
    author: "Maeda S. et al. — Structure of the connexin 26 gap junction channel at 3.5 Å resolution, Nature 458:597 (2009)",
    source: pdb("2ZW3"),
    licence: PDB,
    note: "Membranes and gap widths are schematic.",
  },
  {
    model: "Intercalated disc — desmosomal cadherin (desmocollin-2 / desmoglein-2)",
    author: "Harrison O.J. et al. — Structural basis of adhesive binding by desmocollins and desmogleins, PNAS 113:7160 (2016)",
    source: pdb("5J5J"),
    licence: PDB,
  },
  {
    model: "Smooth muscle myofilaments — F-actin with tropomyosin",
    author: "von der Ecken J. et al. — Structure of the F-actin–tropomyosin complex, Nature 519:114 (2015); reprocessed in Nature 534:724 (2016)",
    source: pdb("5JLF"),
    licence: PDB,
    note: "Five subunits, repeated along the helix by the team.",
  },
  {
    model: "Smooth muscle myofilaments — smooth muscle myosin motor domain",
    author: "Dominguez R. et al. — Crystal structure of a vertebrate smooth muscle myosin motor domain and its complex with the essential light chain, Cell 94:559 (1998)",
    source: pdb("1BR2"),
    licence: PDB,
  },
  {
    model: "Smooth muscle myofilaments — calmodulin with Ca²⁺",
    author: "Wilson M.A., Brunger A.T. — The 1.0 Å crystal structure of Ca²⁺-bound calmodulin, J Mol Biol 301:1237 (2000)",
    source: pdb("1EXR"),
    licence: PDB,
    note: "Positions of the molecules relative to each other are schematic.",
  },
  {
    model: "Interactive sarcomere",
    author: "MedicSync team (built in code with three.js)",
    source: TEAM,
    licence: "Made by the team",
  },
];

export default function Credits() {
  return (
    <PublicPage title="Credits" intro="The people, content and open-source software behind Digital Muscle.">
      <ProseCard heading="Content">
        <p>
          Learning content is based on the <strong>Key Point Book</strong> by Asst. Prof. Dr. Keerakarn Somsuan, School of Medicine, Mae Fah Luang University.
        </p>
        <p>Digital Muscle is a seminar project built for MFU anatomy students.</p>
      </ProseCard>

      <ProseCard heading="Images & 3D models">
        <figure className="overflow-hidden rounded-2xl border border-line bg-white">
          <img
            src="/images/login-hero-tablet-834.webp"
            srcSet="/images/login-hero-tablet-834.webp 834w, /images/login-hero-tablet-1668.webp 1668w"
            sizes="(min-width: 768px) 640px, 100vw"
            width={834}
            height={440}
            loading="lazy"
            decoding="async"
            alt="Three anatomical figures running: muscles, muscles over the skeleton, and the skeleton"
            className="mx-auto h-auto max-h-72 w-auto"
          />
          <figcaption className="border-t border-line px-4 py-3 text-sm text-muted">
            Login hero and app logo — taken from the team's Figma design. Original source and licence to be confirmed.
          </figcaption>
        </figure>
        <ul className="space-y-3">
          {MODELS.map((m) => (
            <li key={m.model} className="rounded-2xl border border-line p-4 text-sm">
              <p className="font-semibold text-ink">{m.model}</p>
              <p className="text-muted">{m.author}</p>
              <p className="mt-1 flex flex-wrap gap-x-3">
                <a href={m.source.url} target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline">
                  {m.source.label}
                </a>
                <span className="text-muted">{m.licence}</span>
              </p>
              {m.note && <p className="mt-1 text-muted">{m.note}</p>}
            </li>
          ))}
        </ul>
      </ProseCard>

      <ProseCard heading="Open-source software">
        <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {LIBRARIES.map((l) => (
            <li key={l.name} className="flex items-baseline justify-between gap-3 border-b border-dashed border-line pb-2 text-sm">
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-medium text-ink hover:underline">
                {l.name}
              </a>
              <span className="shrink-0 text-muted">{l.licence}</span>
            </li>
          ))}
        </ul>
      </ProseCard>
    </PublicPage>
  );
}
