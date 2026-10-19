import { BRUSH_INKS, brushMotion } from "./emojiBrushMotion.js";

/** A bounded transparent canvas animates deposited matter without React renders. */
export function createEmojiAnimation(canvas) {
  const ctx = canvas.getContext("2d");
  let strokes = [],
    frame = 0,
    time = 0,
    previous = 0,
    running = false,
    lastDraw = 0;
  const sampleCache = new WeakMap();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  function sample(stroke) {
    if (sampleCache.has(stroke)) return sampleCache.get(stroke);
    const source = stroke.points,
      out = [],
      lengths = [0];
    let total = 0;
    for (let i = 1; i < source.length; i++) {
      total += Math.hypot(
        source[i].x - source[i - 1].x,
        source[i].y - source[i - 1].y,
      );
      lengths.push(total);
    }
    const count = Math.min(56, Math.max(2, Math.ceil(total / 0.012)));
    let k = 1;
    for (let i = 0; i < count; i++) {
      const distance = (total * i) / (count - 1);
      while (k < source.length - 1 && lengths[k] < distance) k++;
      const a = source[Math.max(0, k - 1)],
        b = source[Math.min(k, source.length - 1)],
        span =
          lengths[Math.min(k, lengths.length - 1)] -
          lengths[Math.max(0, k - 1)],
        u = span ? (distance - lengths[Math.max(0, k - 1)]) / span : 0;
      const dx = b.x - a.x,
        dy = b.y - a.y,
        len = Math.hypot(dx, dy) || 1;
      out.push({
        x: a.x + (b.x - a.x) * u,
        y: a.y + (b.y - a.y) * u,
        nx: -dy / len,
        ny: dx === 0 && dy === 0 ? 1 : dx / len,
        phase: distance / Math.max(stroke.size, 0.01),
      });
    }
    const sampled = {
      ...stroke,
      samples: out,
      inks: BRUSH_INKS[stroke.emojiId] || BRUSH_INKS.water,
    };
    sampleCache.set(stroke, sampled);
    return sampled;
  }
  function line(points, color, width, alpha) {
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.globalAlpha = alpha;
    ctx.stroke();
  }
  function render() {
    const w = canvas.width;
    ctx.setTransform(w, 0, 0, w, w / 2, w / 2);
    ctx.clearRect(-0.5, -0.5, 1, 1);
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 0.5, 0, Math.PI * 2);
    ctx.clip();
    ctx.lineCap = ctx.lineJoin = "round";
    for (const s of strokes) {
      const id = s.emojiId,
        sz = s.size,
        a = s.opacity,
        inks = s.inks;
      // A moving crest travels along the gesture, rather than scaling the complete drawing.
      if (["water", "thread", "warm", "mist"].includes(id)) {
        for (let i = 1; i < s.samples.length; i++) {
          const p = s.samples[i - 1],
            q = s.samples[i],
            m = brushMotion(id, q.phase * 0.12, time),
            n = brushMotion(id, p.phase * 0.12, time);
          const crest =
            0.5 +
            0.5 * Math.sin(q.phase * 2 - time * (id === "warm" ? 2.5 : 1.7));
          line(
            [
              { x: p.x + p.nx * n.y * sz, y: p.y + p.ny * n.y * sz },
              { x: q.x + q.nx * m.y * sz, y: q.y + q.ny * m.y * sz },
            ],
            inks[id === "warm" ? 1 : 0],
            sz * (id === "mist" ? 0.9 : 0.12 + crest * 0.3),
            a * (id === "mist" ? 0.09 : 0.38),
          );
        }
      }
      // At most 18 details per gesture; old paintings remain alive within a fixed budget.
      const step = Math.max(
        1,
        Math.ceil(
          s.samples.length /
            Math.min(
              18,
              Math.max(3, Math.floor(480 / Math.max(1, strokes.length))),
            ),
        ),
      );
      for (let i = 0; i < s.samples.length; i += step) {
        const p = s.samples[i],
          phase = i * 0.618 + s.index * 0.137,
          m = brushMotion(id, phase, time),
          x = p.x + m.x * sz,
          y = p.y + m.y * sz;
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = a * 0.65;
        ctx.strokeStyle = inks[1];
        ctx.fillStyle = inks[1];
        ctx.lineWidth = sz * 0.045;
        if (id === "warm") {
          const h = sz * (0.35 + 0.3 * (1 + Math.sin(time * 2.6 + phase * 6))),
            bend = Math.sin(time * 2 + phase) * sz * 0.16;
          ctx.beginPath();
          ctx.moveTo(-sz * 0.13, sz * 0.15);
          ctx.bezierCurveTo(
            -sz * 0.28,
            -h * 0.3,
            bend,
            -h,
            bend + sz * 0.08,
            -h,
          );
          ctx.bezierCurveTo(
            sz * 0.03,
            -h * 0.4,
            sz * 0.3,
            -h * 0.25,
            sz * 0.13,
            sz * 0.15,
          );
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = inks[2];
          ctx.globalAlpha = a * 0.7;
          ctx.beginPath();
          ctx.ellipse(0, 0, sz * 0.06, h * 0.28, -0.1, 0, Math.PI * 2);
          ctx.fill();
          const age = (phase + time * 0.24) % 1;
          ctx.globalAlpha = a * Math.sin(age * Math.PI) * 0.7;
          ctx.beginPath();
          ctx.arc(
            Math.sin(phase * 19 + time) * sz * 0.3,
            -age * sz * 1.6,
            sz * 0.027,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        } else if (id === "water") {
          ctx.rotate(Math.atan2(p.ny, p.nx));
          ctx.beginPath();
          ctx.arc(0, 0, sz * (0.18 + 0.12 * m.scale), -0.9, 1.6);
          ctx.stroke();
          ctx.fillStyle = inks[2];
          ctx.beginPath();
          ctx.arc(sz * 0.1, sz * 0.1, sz * 0.025, 0, Math.PI * 2);
          ctx.fill();
        } else if (id === "bubbles") {
          ctx.globalAlpha = a * 0.4;
          ctx.beginPath();
          ctx.arc(0, 0, sz * 0.25 * m.scale, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = inks[2];
          ctx.beginPath();
          ctx.arc(0, 0, sz * 0.18 * m.scale, 3.4, 4.6);
          ctx.stroke();
        } else if (id === "mist") {
          ctx.globalAlpha = a * 0.045;
          ctx.beginPath();
          ctx.ellipse(
            0,
            0,
            sz * 0.8 * m.scale,
            sz * 0.4,
            phase,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        } else if (id === "swirl") {
          ctx.rotate(time * 0.3 + phase);
          ctx.beginPath();
          for (let j = 0; j < 24; j++) {
            const angle = (j / 24) * Math.PI * 3,
              r = (j / 24) * sz * 0.3;
            ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
          }
          ctx.stroke();
        } else if (id === "stone") {
          ctx.globalAlpha = a * 0.3;
          for (let j = 0; j < 4; j++) {
            ctx.beginPath();
            ctx.arc(
              Math.sin(phase + j * 3) * sz * 0.3,
              Math.cos(phase + j * 5) * sz * 0.3,
              sz * (0.035 + j * 0.008) * m.scale,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        } else if (id === "feather" || id === "shoot") {
          ctx.rotate(Math.sin(time * 0.7 + phase) * 0.2);
          ctx.beginPath();
          ctx.moveTo(0, sz * 0.1);
          ctx.quadraticCurveTo(
            sz * 0.15,
            -sz * 0.2,
            sz * 0.35 * m.scale,
            -sz * 0.3,
          );
          ctx.stroke();
          if (id === "shoot") {
            ctx.beginPath();
            ctx.ellipse(
              sz * 0.2,
              -sz * 0.19,
              sz * 0.15 * m.scale,
              sz * 0.045,
              -0.7,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        } else if (id === "thread") {
          for (let j = 0; j < 3; j++) {
            ctx.beginPath();
            ctx.moveTo(-sz * 0.2, (j - 1) * sz * 0.1);
            ctx.quadraticCurveTo(
              0,
              Math.sin(time * 1.5 + phase + j) * sz * 0.2,
              sz * 0.2,
              (j - 1) * sz * 0.1,
            );
            ctx.stroke();
          }
        } else if (id === "spark") {
          ctx.beginPath();
          ctx.moveTo(-sz * 0.2, sz * 0.1);
          ctx.lineTo(0, -sz * 0.2 * m.scale);
          ctx.lineTo(sz * 0.03, sz * 0.07);
          ctx.lineTo(sz * 0.2, -sz * 0.1);
          ctx.stroke();
        } else {
          const rays = id === "cold" ? 6 : id === "sun" ? 8 : 3;
          ctx.rotate(
            id === "cold" ? time * 0.07 : Math.sin(time * 0.8 + phase) * 0.1,
          );
          for (let j = 0; j < rays; j++) {
            const angle = (j / rays) * Math.PI * 2,
              r = sz * 0.22 * m.scale;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    }
    ctx.restore();
    canvas.dataset.animationTime = time.toFixed(3);
  }
  function tick(now) {
    if (!running) return;
    const delta = previous ? Math.min(0.05, (now - previous) / 1000) : 0;
    previous = now;
    if (!document.hidden && !reduced.matches) {
      time += delta;
      if (now - lastDraw >= 32) {
        render();
        lastDraw = now;
      }
    }
    frame = requestAnimationFrame(tick);
  }
  return {
    setDocument(doc) {
      strokes = doc.strokes.map((s, index) => ({ ...sample(s), index }));
      render();
    },
    resize(width) {
      const n = Math.min(
        900,
        Math.max(1, Math.round(width * Math.min(devicePixelRatio || 1, 2))),
      );
      if (canvas.width !== n) {
        canvas.width = canvas.height = n;
        render();
      }
    },
    start() {
      if (running) return;
      running = true;
      previous = 0;
      frame = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(frame);
      previous = 0;
    },
    dispose() {
      this.stop();
      strokes = [];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    get stats() {
      return {
        strokes: strokes.length,
        details: strokes.reduce(
          (n, s) =>
            n +
            Math.ceil(
              s.samples.length /
                Math.max(
                  1,
                  Math.ceil(
                    s.samples.length /
                      Math.min(
                        18,
                        Math.max(
                          3,
                          Math.floor(480 / Math.max(1, strokes.length)),
                        ),
                      ),
                  ),
                ),
            ),
          0,
        ),
        running,
        time,
      };
    },
  };
}
