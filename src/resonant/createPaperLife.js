/** Two reusable canvases: slow local pigment eddies, with the dry source untouched. */
export function createPaperLife(destination, source, isDrawing = () => false) {
  const ctx = destination.getContext("2d"),
    overlay = document.createElement("canvas");
  overlay.width = source.width;
  overlay.height = source.height;
  const c = overlay.getContext("2d"),
    sample = document.createElement("canvas");
  sample.width = 96;
  sample.height = 64;
  const s = sample.getContext("2d", { willReadFrequently: true });
  let pools = [],
    frame = 0,
    last = 0,
    disposed = false,
    dirty = true;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  function update() {
    dirty = true;
    s.clearRect(0, 0, 96, 64);
    s.drawImage(source, 0, 0, 96, 64);
    const pixels = s.getImageData(0, 0, 96, 64).data;
    pools = [];
    for (let i = 0; i < 96 * 64 && pools.length < 48; i += 43) {
      const k = i * 4;
      if (pixels[k + 3] < 30) continue;
      pools.push({
        x: (((i % 96) + 0.5) / 96) * source.width,
        y: ((Math.floor(i / 96) + 0.5) / 64) * source.height,
        color: `rgb(${pixels[k]},${pixels[k + 1]},${pixels[k + 2]})`,
        phase: i * 0.618,
      });
    }
  }
  function tick(now) {
    if (disposed) return;
    if (
      !document.hidden &&
      !isDrawing() &&
      (!reduced.matches || dirty) &&
      now - last >= 40
    ) {
      last = now;
      dirty = false;
      const t = reduced.matches ? 0 : now / 1000;
      ctx.clearRect(0, 0, destination.width, destination.height);
      ctx.drawImage(source, 0, 0);
      if (pools.length) {
        c.clearRect(0, 0, overlay.width, overlay.height);
        for (const p of pools) {
          const radius = 10 + (Math.sin(t * 0.31 + p.phase) * 0.5 + 0.5) * 22;
          c.globalAlpha =
            0.06 + 0.055 * (0.5 + 0.5 * Math.sin(t * 0.47 + p.phase));
          c.strokeStyle = p.color;
          c.lineWidth = 0.7;
          c.beginPath();
          c.ellipse(
            p.x + Math.sin(t * 0.22 + p.phase) * 3,
            p.y + Math.cos(t * 0.18 + p.phase) * 2,
            radius,
            radius * 0.65,
            p.phase + t * 0.025,
            0.2,
            Math.PI * 1.65,
          );
          c.stroke();
        }
        c.globalAlpha = 1;
        c.globalCompositeOperation = "destination-in";
        c.drawImage(source, 0, 0);
        c.globalCompositeOperation = "source-over";
        ctx.drawImage(overlay, 0, 0);
      }
      destination.dataset.animationTime = t.toFixed(3);
    }
    frame = requestAnimationFrame(tick);
  }
  update();
  frame = requestAnimationFrame(tick);
  return {
    update,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      overlay.width = sample.width = 1;
    },
  };
}
