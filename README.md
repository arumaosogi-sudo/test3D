# Digital Muscle — ส่วน 3D Explore (สำหรับนำไปใส่เว็บจริง)

Repo นี้เก็บ **เฉพาะไฟล์ส่วน 3D** ของเว็บ Digital Muscle (Seminar_Projest) — วางทับที่ path เดิมในโปรเจกต์เว็บจริงได้เลย
โค้ดทั้งเว็บ (ฉบับที่ใช้พัฒนาและทดสอบส่วน 3D) อยู่ใน branch [`full-app`](../../tree/full-app)

## มีอะไรบ้าง

| Path | เนื้อหา |
|---|---|
| `src/pages/explore/` | หน้า `/explore` (Explore3D) และ `/explore/sarcomere`, ฉาก 3D, แอนิเมชัน, ฉากโมเลกุล PDB |
| `src/content/explore.ts` | ชิ้นส่วน sarcomere (ข้อความ) |
| `src/content/exploreZoom.ts` | ลำดับระดับของกล้ามเนื้อ 3 ชนิด, จุดหมายเลข (hotspots), เครดิตแต่ละระดับ |
| `src/content/exploreAnims.ts` | คำบรรยายแอนิเมชันแต่ละขั้น (อ้างอิง lecture sheet §) |
| `src/content/exploreParts.ts` | ชื่อ + คำอธิบายของทุกชิ้นส่วนที่คลิกได้ |
| `public/models/` | โมเดล `.glb` (บีบด้วย meshopt) และข้อมูลโปรตีน `.json` |
| `src/pages/Credits.tsx` | หน้า `/credits` ที่เพิ่มเครดิตโมเดล 3D ทุกตัว (ต้องใช้แทนของเดิม — license กำหนด) |

ไม่มีไฟล์ไหนในเว็บจริงที่ต้องลบ (เทียบกับ Seminar_Projest `main` ที่ commit `2dc542e`)

## วิธีใส่เข้าเว็บจริง

### แบบที่ 1 — ใช้ git (แนะนำ)
ในโฟลเดอร์โปรเจกต์เว็บจริง:
```bash
git remote add test3d https://github.com/arumaosogi-sudo/test3D.git
git fetch test3d
git checkout test3d/main -- src/pages/explore src/content/explore.ts src/content/exploreZoom.ts src/content/exploreAnims.ts src/content/exploreParts.ts public/models src/pages/Credits.tsx
npm install -D r3f-perf@^7.2.3
```

### แบบที่ 2 — คัดลอกไฟล์
ดาวน์โหลด ZIP ของ repo นี้ แล้วคัดลอกโฟลเดอร์ `src/` และ `public/` ทับลงในโปรเจกต์เว็บจริง (path ตรงกัน) จากนั้น
```bash
npm install -D r3f-perf@^7.2.3
```

### ตรวจหลังใส่
```bash
npm run lint
npm test
npm run build
npm run dev
```
เปิด `http://localhost:5173/explore` — ลองทั้ง 3 ชนิด (Skeletal / Cardiac / Smooth), กด Play, คลิกชิ้นส่วน, แท็บ All parts

## สิ่งที่เว็บจริงต้องมีอยู่แล้ว (มีใน Seminar_Projest)
- route `explore` และ `explore/sarcomere` ใน `src/router.tsx`
- `three ^0.186.1`, `@react-three/fiber ^9.8.1`, `@react-three/drei ^10.7.9`, `@types/three ^0.186.0`
- `@/components/student/icons`, `StudentPageHeader`, `useDocumentTitle`, `@/components/ui` (Spinner) และ CSS class `coast-*`
- **เพิ่มใหม่:** `r3f-perf ^7.2.3` (devDependency — ใช้วัด fps ด้วย `?perf` ตอน dev เท่านั้น ไม่เข้า production bundle
  แต่ต้องติดตั้งไว้ ไม่งั้น `npm run dev` จะหา import ไม่เจอ)

## License ของโมเดล
เครดิตแสดงใต้โมเดลทุกระดับ และในหน้า `/credits`
- Sketchfab (CC BY 4.0): Myocyte model (rgmz2015), Skeletal Muscle Fibre Anatomy / Cardiac Muscle Cell Anatomy / Smooth Muscle Cell (_Bonehead14)
- Sketchfab **CC BY-NC 4.0**: Sarcomere Model (rgmz2015) — ใช้ได้เฉพาะงานที่ไม่ใช่เชิงพาณิชย์
- Z-Anatomy (CC BY-SA 4.0) — แขนและหัวใจ
- RCSB PDB (CC0) — ฉาก Molecular view
- โมเดลที่ทีมสร้างเอง: gut wall, intercalated disc, dense bodies, smooth muscle myofilaments และทุกอย่างที่เติมลงในโมเดลข้างต้น

ไฟล์ต้นฉบับ Blender และสคริปต์สร้างโมเดล (`build_v3.py`) ไม่ได้อยู่ใน repo นี้ (อยู่ในเครื่องที่พัฒนา: `3d-source/`)
