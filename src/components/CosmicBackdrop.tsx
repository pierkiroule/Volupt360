import { useEffect, useRef } from "react";
import { seededRandom } from "../transduction/engine.ts";
import { useSensoryStore } from "../store/useSensoryStore.ts";
/** One modest 2D star layer outside the miniature; no extra WebGL context. */
export default function CosmicBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null),
    seed = useSensoryStore((s) => s.composition.seed);
  useEffect(() => {
    const canvas = ref.current!,
      ctx = canvas.getContext("2d");
    if (!ctx) return;
    const random = seededRandom(seed ^ 0x7ac4),
      stars = Array.from({ length: 210 }, () => ({
        x: random(),
        y: random(),
        r: 0.35 + random() * 0.95,
        a: 0.2 + random() * 0.55,
        p: random() * 6,
      }));
    let frame = 0,
      last = 0,
      time = 0;
    const resize = () => {
      canvas.width = innerWidth * Math.min(devicePixelRatio, 1.5);
      canvas.height = innerHeight * Math.min(devicePixelRatio, 1.5);
    };
    resize();
    const draw = (now: number) => {
      const state = useSensoryStore.getState();
      if (now - last > 65) {
        if (!state.paused && !state.reduced) time += (now - last) / 1000;
        last = now;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const s of stars) {
          ctx.fillStyle = `rgba(210,224,248,${s.a * (0.88 + Math.sin(time * 0.14 + s.p) * 0.12)})`;
          ctx.beginPath();
          ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [seed]);
  return <canvas ref={ref} className="cosmo-backdrop" aria-hidden="true" />;
}
