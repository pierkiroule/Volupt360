import { useEffect, useRef } from "react";
import {
  WEATHER,
  pigment,
  random,
  constrain,
  type Zone,
  type WeatherId,
} from "./weatherModel";
interface Props {
  zones: Zone[];
  selected: string | null;
  kind: WeatherId;
  paused: boolean;
  onPlace: (x: number, y: number) => void;
  onMove: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
}
export function WeatherDisk({
  zones,
  selected,
  paused,
  onPlace,
  onMove,
  onSelect,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null),
    state = useRef({ zones, selected, paused, onPlace, onMove, onSelect }),
    drag = useRef<{ id: string; pointer: number } | null>(null);
  state.current = { zones, selected, paused, onPlace, onMove, onSelect };
  useEffect(() => {
    const c = canvas.current!,
      ctx = c.getContext("2d")!,
      cache = new Map<string, HTMLCanvasElement>();
    let frame = 0,
      time = 0,
      last = performance.now(),
      side = 1;
    const resize = () => {
      side = c.clientWidth;
      const dpr = Math.min(devicePixelRatio, 2);
      c.width = c.height = side * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(c);
    resize();
    const paint = (now: number) => {
      const s = state.current;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!s.paused && !document.hidden) time += dt;
      ctx.clearRect(0, 0, side, side);
      ctx.save();
      ctx.beginPath();
      ctx.arc(side / 2, side / 2, side * 0.493, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "#f9f5eb";
      ctx.fillRect(0, 0, side, side);
      for (const z of s.zones) {
        const type = WEATHER.find((w) => w.id === z.kind)!;
        let stamp = cache.get(z.id);
        if (!stamp) {
          stamp = pigment(z.seed, type.color);
          cache.set(z.id, stamp);
        }
        const x = side * (0.5 + z.x * 0.5),
          y = side * (0.5 + z.y * 0.5),
          radius = side * z.size;
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = z.opacity;
        const breath = 1 + Math.sin(time * 0.35 + z.seed) * 0.025;
        ctx.drawImage(
          stamp,
          -radius * breath,
          -radius * breath,
          radius * 2 * breath,
          radius * 2 * breath,
        );
        const r = random(z.seed);
        ctx.strokeStyle = type.color;
        ctx.fillStyle = type.secondary;
        ctx.lineWidth = Math.max(1, side * 0.002);
        ctx.lineCap = "round";
        for (let n = 0; n < 22; n++) {
          let px = (r() - 0.5) * radius * 1.45,
            py = (r() - 0.5) * radius * 1.35;
          const phase = r() * 6.28;
          if (z.kind === "rain") {
            py =
              ((py + radius + time * (12 + r() * 10)) % (radius * 2)) - radius;
            ctx.globalAlpha = z.opacity * 0.6;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px - 3, py + 7);
            ctx.stroke();
          } else if (z.kind === "wind") {
            ctx.globalAlpha = z.opacity * 0.4;
            ctx.beginPath();
            for (let k = 0; k < 12; k++) {
              const xx = px + k * radius * 0.035,
                yy =
                  py + Math.sin(k * 0.4 + time * 0.7 + phase) * radius * 0.06;
              k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
            }
            ctx.stroke();
          } else if (z.kind === "aurora" || z.kind === "prism") {
            ctx.globalAlpha = z.opacity * 0.24;
            ctx.strokeStyle = n % 2 ? type.secondary : type.color;
            ctx.lineWidth = 1.3 + (n % 3);
            ctx.beginPath();
            for (let k = 0; k <= 25; k++) {
              const xx = (k / 25 - 0.5) * radius * 1.7,
                yy =
                  py * 0.65 +
                  Math.sin(k * 0.14 + time * 0.2 + phase) * radius * 0.18;
              k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
            }
            ctx.stroke();
          } else if (z.kind === "dream") {
            ctx.globalAlpha = z.opacity * 0.4;
            ctx.beginPath();
            ctx.ellipse(
              px + Math.sin(time * 0.2 + phase) * 7,
              py + Math.cos(time * 0.15 + phase) * 8,
              3 + r() * 6,
              2 + r() * 5,
              phase,
              0,
              6.28,
            );
            ctx.stroke();
          } else if (z.kind === "snow") {
            ctx.globalAlpha = z.opacity * 0.65;
            py = ((py + radius + time * 5) % (radius * 2)) - radius;
            ctx.beginPath();
            ctx.arc(px + Math.sin(time * 0.4 + phase) * 4, py, 1.4, 0, 6.28);
            ctx.fill();
          } else if (z.kind === "storm" && n < 3) {
            ctx.globalAlpha =
              z.opacity * (0.3 + 0.13 * Math.sin(time * 0.8 + phase));
            ctx.beginPath();
            ctx.moveTo(px, py - 15);
            ctx.lineTo(px - 6, py);
            ctx.lineTo(px + 3, py - 2);
            ctx.lineTo(px - 3, py + 14);
            ctx.stroke();
          } else {
            ctx.globalAlpha = z.opacity * 0.18;
            ctx.beginPath();
            ctx.ellipse(
              px + Math.sin(time * 0.3 + phase) * 4,
              py,
              4 + r() * 12,
              2 + r() * 6,
              phase,
              0,
              6.28,
            );
            ctx.stroke();
          }
        }
        ctx.restore();
        ctx.save();
        ctx.translate(x, y);
        ctx.font = `${Math.max(17, side * 0.045)}px system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = 0.8;
        ctx.fillText(type.emoji, 0, 0);
        if (z.id === s.selected) {
          ctx.strokeStyle = "#3b686c";
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 5]);
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.8, 0, 6.28);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
      for (const [id] of cache)
        if (!s.zones.some((z) => z.id === id)) cache.delete(id);
      c.dataset.zones = String(s.zones.length);
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      for (const stamp of cache.values()) stamp.width = 1;
      cache.clear();
    };
  }, []);
  const position = (e: React.PointerEvent) => {
    const b = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - b.left) / b.width) * 2 - 1,
      y: ((e.clientY - b.top) / b.height) * 2 - 1,
    };
  };
  return (
    <canvas
      className="weather-disk"
      ref={canvas}
      aria-label="Disque de sensations"
      onPointerDown={(e) => {
        if (!e.isPrimary || drag.current) return;
        const p = position(e);
        if (Math.hypot(p.x, p.y) > 1) return;
        const hit = [...zones]
          .reverse()
          .find((z) => Math.hypot(z.x - p.x, z.y - p.y) < 0.11);
        if (hit) {
          onSelect(hit.id);
          drag.current = { id: hit.id, pointer: e.pointerId };
          e.currentTarget.setPointerCapture(e.pointerId);
        } else {
          const q = constrain(p.x, p.y);
          onPlace(q.x, q.y);
        }
      }}
      onPointerMove={(e) => {
        if (drag.current?.pointer !== e.pointerId) return;
        const p = position(e),
          q = constrain(p.x, p.y);
        onMove(drag.current.id, q.x, q.y);
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onLostPointerCapture={() => (drag.current = null)}
    />
  );
}
