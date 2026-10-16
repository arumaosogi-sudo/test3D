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
const MODELS: { model: string; author: string; source: { label: string; url: string }; licence: string; note?: string }[] = [
  {
    model: "Arm · biceps brachii (16 bones and muscles of the right arm)",
    author: "Z-Anatomy — Gauthier Kervyn et al., based on BodyParts3D by Kousaku Okubo (DBCLS)",
    source: { label: "github.com/Z-Anatomy", url: "https://github.com/Z-Anatomy/Models-of-human-anatomy" },
    licence: "CC BY-SA 4.0 (BodyParts3D: CC BY-SA 2.1 JP)",
    note: "Cut from the Z-Anatomy atlas and compressed by the MedicSync team; this adapted model is shared under CC BY-SA 4.0.",
  },
  {
    model: "Heart with the great vessels (atria, ventricles, aorta, pulmonary trunk, superior vena cava, left coronary artery)",
    author: "Z-Anatomy — Gauthier Kervyn et al., based on BodyParts3D by Kousaku Okubo (DBCLS)",
    source: { label: "github.com/Z-Anatomy", url: "https://github.com/Z-Anatomy/Models-of-human-anatomy" },
    licence: "CC BY-SA 4.0 (BodyParts3D: CC BY-SA 2.1 JP)",
    note: "Cut from the Z-Anatomy atlas and compressed by the MedicSync team; this adapted model is shared under CC BY-SA 4.0.",
  },
  {
    model:
      "Fascicle (with a motor unit), muscle fiber (cutaway, with neuromuscular junction), myofibril, sarcomere, cardiac muscle tissue, smooth muscle tissue and cell; the elbow rig and all animations",
    author: "MedicSync team (built with a Blender script)",
    source: { label: "This project", url: "https://github.com/arumaosogi-sudo/Seminar_Projest" },
    licence: "Made by the team",
  },
  {
    model: "Thin filament in the cross-bridge view (actin, tropomyosin, troponin C · I · T — one bead per amino acid, Ca²⁺-free and Ca²⁺-bound states)",
    author: "Yamada Y., Namba K., Fujii T. — Cardiac muscle thin filament structures reveal calcium regulatory mechanism, Nat Commun 11:153 (2020)",
    source: { label: "RCSB PDB 6KN7 / 6KN8", url: "https://www.rcsb.org/structure/6KN8" },
    licence: "PDB data: free of all copyright restrictions (CC0)",
    note: "Actin in these entries is alpha skeletal actin; troponin is the cardiac isoform. Myosin heads in that view are schematic.",
  },
  {
    model: "Interactive sarcomere",
    author: "MedicSync team (built in code with three.js)",
    source: { label: "This project", url: "https://github.com/arumaosogi-sudo/Seminar_Projest" },
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
