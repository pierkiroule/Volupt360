/** A bounded, living core along the pigment. Each tool keeps its own rhythm. */
export function drawAccents(ctx, strokes, time, width = 768, height = 768) {
  for (const s of strokes) {
    if (!s.points.length) continue;
    ctx.save();
    ctx.globalAlpha = s.opacity * 0.65;
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.strokeStyle = s.color || "#bd603e";
    ctx.lineWidth = Math.max(1, s.size * 0.055);
    const step = Math.max(
      1,
      Math.ceil(
        s.points.length / Math.max(8, 450 / Math.max(1, strokes.length)),
      ),
    );
    ctx.beginPath();
    for (let i = 0; i < s.points.length; i += step) {
      const p = s.points[i],
        phase = i * 0.47 + s.id;
      const amplitude =
        s.emotionId === "peace" ? s.size * 0.12 : s.size * 0.035;
      const x = p.x * width,
        y = p.y * height + Math.sin(phase - time * 1.5) * amplitude;
      if (!i) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (s.emotionId === "anger") {
      for (let i = 0; i < s.points.length; i += step) {
        const p = s.points[i],
          phase = time * 2 + i * 0.7 + s.id;
        const x = p.x * width,
          y = p.y * height;
        const h = s.size * (0.2 + 0.14 * Math.sin(phase));
        const bend = Math.sin(phase * 0.8) * h * 0.5;
        ctx.fillStyle = "#ee5b20";
        ctx.beginPath();
        ctx.moveTo(x - h * 0.22, y);
        ctx.bezierCurveTo(
          x - h * 0.5,
          y - h * 0.45,
          x + bend,
          y - h,
          x + bend * 0.5,
          y - h * 1.35,
        );
        ctx.bezierCurveTo(
          x + h * 0.45,
          y - h * 0.7,
          x + h * 0.5,
          y - h * 0.25,
          x + h * 0.22,
          y,
        );
        ctx.fill();
        ctx.fillStyle = "#ffd26a";
        ctx.beginPath();
        ctx.ellipse(x, y - h * 0.25, h * 0.09, h * 0.27, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
