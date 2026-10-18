import * as THREE from "three";
import { createBrushStroke, disposeMark } from "../engine/brushes.js";
import { createWatercolorTexture } from "../engine/createWatercolorTexture.js";
import { LEARNING_TOPICS } from "./learningContent.js";

export const PAINT_BUDGET = {
  strokes: 12,
  lifetime: 44,
  sampleRate: 10,
  chunkSeconds: 4,
};
export function createAutomaticPainter(parent, mobile = false) {
  const sampleRate = mobile ? 6 : PAINT_BUDGET.sampleRate;
  const group = new THREE.Group();
  parent.add(group);
  const bindings = new Map(),
    strokes = [];
  let current = null,
    topic = null,
    clock = 0,
    time = 0,
    samples = 0;
  const position = new THREE.Vector3(),
    direction = new THREE.Vector3(),
    side = new THREE.Vector3(),
    up = new THREE.Vector3(),
    velocity = new THREE.Vector3();
  function close() {
    current?.stroke.finish();
    current = null;
    clock = 0;
  }
  function activate(id) {
    close();
    topic = LEARNING_TOPICS.find((t) => t.id === id) || null;
  }
  function collect(item) {
    item.uniforms.length = 0;
    item.stroke.group.traverse((node) => {
      if (node.material?.uniforms) item.uniforms.push(node.material.uniforms);
    });
  }
  function remove(item) {
    disposeMark(item.stroke.group);
  }
  return {
    group,
    activate,
    close,
    get stats() {
      return {
        strokes: strokes.length,
        textures: bindings.size,
        samples,
        brush: topic?.id || null,
      };
    },
    update(dt, pose, audio, painting = true) {
      time += dt;
      if (topic && painting && dt > 0) {
        clock += dt;
        if (
          !current ||
          current.stroke.full ||
          time - current.born > PAINT_BUDGET.chunkSeconds
        ) {
          close();
          if (!bindings.has(topic.id))
            bindings.set(
              topic.id,
              createWatercolorTexture(
                {
                  color: topic.color,
                  kind: ["wash", "dry", "fiber", "stamp"][topic.index % 4],
                  watercolor: true,
                  continuous: true,
                },
                313 + topic.index * 91,
                128,
              ),
            );
          const stroke = createBrushStroke(topic.brush, {
            seed: 313 + topic.index * 19,
            color: new THREE.Color(topic.color),
            texture: bindings.get(topic.id),
            dynamics: {
              materialMode: 1,
              width: [0.46, 0.3, 0.65, 0.27][topic.index % 4],
              opacity: 0.58,
              particleCount: 2,
              sampleStride: mobile ? 7 : 5,
              dispersion: 0.65,
            },
          });
          group.add(stroke.group);
          current = { stroke, born: time, uniforms: [] };
          strokes.push(current);
          collect(current);
          while (strokes.length > PAINT_BUDGET.strokes) remove(strokes.shift());
          clock = 1 / sampleRate;
        }
        if (clock >= 1 / sampleRate) {
          clock %= 1 / sampleRate;
          position.copy(pose.position);
          direction.copy(pose.direction);
          side.copy(pose.side);
          up.copy(pose.up);
          velocity.copy(direction).multiplyScalar(0.8);
          current.stroke.append({
            position,
            direction,
            side,
            up,
            velocity,
            time,
            energy: 0.3 + (audio.energy || 0) * 0.5,
            low: audio.low || 0.1,
            high: audio.high || 0.1,
            motion: 0.4,
            density: 0.6,
            accent: audio.pulse || 0.2,
            width: 0.6,
            seed: topic.index,
          });
          samples++;
          collect(current);
        }
      } else if (current) close();
      for (let i = strokes.length - 1; i >= 0; i--) {
        const item = strokes[i],
          age = time - item.born;
        if (age > PAINT_BUDGET.lifetime) {
          remove(item);
          strokes.splice(i, 1);
          continue;
        }
        for (const u of item.uniforms) {
          if (u.uFade)
            u.uFade.value =
              1 - THREE.MathUtils.smoothstep(age, 14, PAINT_BUDGET.lifetime);
          if (u.uTime) u.uTime.value = time;
          if (u.uParticleTime) u.uParticleTime.value = time;
          if (u.uAge) u.uAge.value = age;
          if (u.uMoisture)
            u.uMoisture.value = Math.max(0.12, 0.8 - age * 0.012);
          if (u.uAudioEnergy)
            u.uAudioEnergy.value +=
              ((audio.energy || 0) - u.uAudioEnergy.value) *
              (1 - Math.exp(-dt * 3));
          if (u.uAudioLow) u.uAudioLow.value = audio.low || 0;
          if (u.uAudioPulse) u.uAudioPulse.value = audio.pulse || 0;
        }
      }
    },
    dispose() {
      close();
      strokes.forEach(remove);
      strokes.length = 0;
      bindings.forEach((b) => b.texture.dispose());
      bindings.clear();
      group.removeFromParent();
    },
  };
}
