import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils } from "three";
import { createLivingRibbons } from "./createLivingRibbons.js";
import { createResonanceDust } from "./squibbleUniverse.js";
import { LAND_BRUSHES } from "./landscapeModel.js";
import { createImageVeils } from "./createImageVeils.js";
import WatercolorPaper from "./WatercolorPaper.jsx";

/** Shared drawing -> spatial ink; no terrain, no procedural replacement of the gesture. */
export function spatializeInk(strokes) {
  return strokes.map((stroke, i) => {
    const brush =
      LAND_BRUSHES.find((b) => b.emoji === stroke.emoji) || LAND_BRUSHES[0];
    const points = stroke.points;
    const first = points[0] || { x: 0, z: 0 };
    const path =
      points.length > 1
        ? points
        : Array.from({ length: 9 }, (_, k) => ({
            x: first.x + Math.cos((k * Math.PI) / 4) * 0.5,
            z: first.z + Math.sin((k * Math.PI) / 4) * 0.5,
          }));
    return {
      id: i + 1,
      emotionId: stroke.emoji,
      color: brush.color,
      opacity: stroke.opacity,
      radius: 6,
      ribbonWidth: (stroke.size || 1) * 0.72,
      points: [{ x: first.x / 28 + 0.5, y: (first.z / 28 + 0.5) * 0.8 + 0.1 }],
      worldPoints: path.map((p) => ({
        x: p.x * 0.68,
        y:
          Math.sin(p.x * 0.25 + p.z * 0.18 + i * 0.8) * 1.7 +
          Math.sin(i * 2.4) * 1.3,
        z: p.z * 0.68,
      })),
    };
  });
}
const inkBrushes = LAND_BRUSHES.map((b) => ({ id: b.emoji }));
const flatSpace = { heightAt: () => 0 };
export default function AudioInkUniverse({
  strokes,
  materials,
  onCapture,
  audioRef,
  paused,
  Navigator,
  ...props
}) {
  const { gl, scene, camera } = useThree();
  const items = useMemo(() => spatializeInk(strokes), [strokes]);
  const ribbons = useMemo(
    () =>
      createLivingRibbons({
        mobile: innerWidth < 600,
        maxRibbons: 80,
        spatialInk: true,
        brushes: inkBrushes,
      }),
    [],
  );
  const dust = useMemo(
    () => createResonanceDust(items, innerWidth < 600),
    [items],
  );
  const images = useMemo(() => createImageVeils(), []);
  useEffect(() => () => images.dispose(), [images]);
  useEffect(() => images.setMaterials(materials), [images, materials]);
  const clock = useRef(0),
    reaction = useRef({ energy: 0, bass: 0, mid: 0, treble: 0, pulse: 0 });
  useEffect(() => () => ribbons.dispose(), [ribbons]);
  useEffect(() => () => dust.dispose(), [dust]);
  useEffect(() => ribbons.setDocument(items), [items, ribbons]);
  useEffect(() => ribbons.setMaterials(materials), [materials, ribbons]);
  useEffect(() => {
    onCapture?.(
      () =>
        new Promise((resolve, reject) => {
          gl.render(scene, camera);
          gl.domElement.toBlob((b) =>
            b ? resolve(b) : reject(Error("Capture indisponible.")),
          );
        }),
    );
    return () => onCapture?.(null);
  }, [onCapture, gl, scene, camera]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (!paused) {
      clock.current += dt;
      const features = audioRef?.current?.getFeatures() || {};
      for (const key in reaction.current) {
        const target = features[key] || 0;
        reaction.current[key] = MathUtils.damp(
          reaction.current[key],
          target,
          key === "pulse" ? 3 : 4,
          dt,
        );
      }
    }
    ribbons.update(clock.current, reaction.current);
    dust.update(clock.current, reaction.current);
    images.update(clock.current, camera, reaction.current);
    gl.domElement.dataset.imageVeils = String(images.count);
    gl.domElement.dataset.landscapeMode = "360";
    gl.domElement.dataset.universeStyle = "spatial-watercolor-audiovisualizer";
    gl.domElement.dataset.landscapeStrokes = String(strokes.length);
    gl.domElement.dataset.audioBass = reaction.current.bass.toFixed(3);
    gl.domElement.dataset.audioTreble = reaction.current.treble.toFixed(3);
    gl.domElement.dataset.animationTime = clock.current.toFixed(3);
  });
  return (
    <>
      <color attach="background" args={["#f3ecdc"]} />
      <WatercolorPaper />
      <primitive object={ribbons.group} />
      <primitive object={dust.points} />
      <primitive object={images.group} />
      <Navigator land={flatSpace} volume paused={paused} {...props} />
    </>
  );
}
