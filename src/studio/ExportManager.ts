import { type Project, validateProject } from "./model";
import { Renderer2D } from "./Renderer2D";
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export async function exportPNG(
  project: Project,
  time: number,
  original = false,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1200;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(1600 / 1200, 1200 / 900);
  const renderer = new Renderer2D();
  renderer.render(ctx, project, time, original);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) =>
      b ? resolve(b) : reject(Error("Export PNG indisponible.")),
    ),
  );
  renderer.dispose();
  canvas.width = 1;
  return blob;
}
export function exportJSON(project: Project) {
  return new Blob([JSON.stringify(project)], {
    type: "application/json",
  });
}
export async function importJSON(file: File) {
  if (file.size > 64 * 1024 * 1024) throw Error("Ce projet dépasse 64 Mo.");
  return validateProject(JSON.parse(await file.text()));
}
export function canRecord() {
  return (
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function" &&
    MediaRecorder.isTypeSupported("video/webm")
  );
}
export async function exportWebM(
  project: Project,
  time: number,
  signal: AbortSignal,
) {
  if (!canRecord())
    throw Error("L’export WebM n’est pas pris en charge par ce navigateur.");
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 720;
  const ctx = canvas.getContext("2d")!,
    renderer = new Renderer2D(),
    stream = canvas.captureStream(30),
    recorder = new MediaRecorder(stream, {
      mimeType: "video/webm",
      videoBitsPerSecond: 4_000_000,
    }),
    chunks: Blob[] = [];
  return new Promise<Blob>((resolve, reject) => {
    let frame = 0,
      timer = 0,
      started = performance.now(),
      aborted = false;
    const clean = () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      stream.getTracks().forEach((t) => t.stop());
      renderer.dispose();
      canvas.width = 1;
      signal.removeEventListener("abort", abort);
      document.removeEventListener("visibilitychange", hidden);
    };
    const abort = () => {
      aborted = true;
      if (recorder.state !== "inactive") recorder.stop();
      else {
        clean();
        reject(Error("Export annulé."));
      }
    };
    const hidden = () => {
      if (document.hidden) abort();
    };
    signal.addEventListener("abort", abort);
    document.addEventListener("visibilitychange", hidden);
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onerror = () => {
      clean();
      reject(Error("L’enregistrement vidéo a échoué."));
    };
    recorder.onstop = () => {
      clean();
      aborted
        ? reject(Error("Export annulé."))
        : resolve(new Blob(chunks, { type: "video/webm" }));
    };
    const tick = (now: number) => {
      ctx.setTransform(0.8, 0, 0, 0.8, 0, 0);
      renderer.render(ctx, project, time + (now - started) / 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    recorder.start(250);
    timer = window.setTimeout(() => recorder.stop(), 8000);
    if (signal.aborted) abort();
  });
}
