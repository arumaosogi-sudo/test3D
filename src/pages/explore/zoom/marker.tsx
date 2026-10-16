import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace, type Vector3 } from "three";

/** Numbered hotspot marker — a sprite with a constant on-screen size, always drawn on top. */
export function Marker({ id, n, pos, active, onClick }: { id: string; n: number; pos: Vector3; active: boolean; onClick: () => void }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 96;
    const g = c.getContext("2d")!;
    g.beginPath();
    g.arc(48, 48, 40, 0, Math.PI * 2);
    g.fillStyle = active ? "#ffffff" : "#8c6117";
    g.fill();
    g.lineWidth = 8;
    g.strokeStyle = active ? "#8c6117" : "#ffffff";
    g.stroke();
    g.fillStyle = active ? "#8c6117" : "#ffffff";
    g.font = "bold 44px system-ui, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(String(n), 48, 51);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [n, active]);
  useEffect(() => () => tex.dispose(), [tex]);
  const s = active ? 0.07 : 0.058;
  return (
    <sprite
      position={pos}
      scale={[s, s, 1]}
      renderOrder={10}
      userData={{ hotspot: id }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <spriteMaterial map={tex} sizeAttenuation={false} depthTest={false} transparent />
    </sprite>
  );
}
