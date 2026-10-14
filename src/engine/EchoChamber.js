import * as THREE from "three";

export const DEFAULT_ECHO_PRESENCE = 0.55;
const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Matches SphereGeometry's longitude and CanvasTexture's flipped latitude.
export function projectEchoPoint(point) {
  const radius = Math.hypot(point.x, point.y, point.z);
  if (radius < 0.1 || !Number.isFinite(radius)) return null;
  return {
    u: (((Math.atan2(point.z, -point.x) / TAU) % 1) + 1) % 1,
    v: Math.acos(clamp(point.y / radius, -1, 1)) / Math.PI,
  };
}

export function createEchoMemory(limit = 48) {
  const entries = new Map();
  let time = 0;
  return {
    entries,
    record({ id, brush, color, position }) {
      const projected = projectEchoPoint(position);
      if (!projected) return;
      let entry = entries.get(id);
      if (!entry) {
        if (entries.size >= limit) entries.delete(entries.keys().next().value);
        let seed = 0;
        for (const char of id + brush)
          seed = (Math.imul(seed, 31) + char.charCodeAt(0)) >>> 0;
        entry = {
          id,
          brush,
          color,
          createdAt: time,
          updatedAt: time,
          expiredAt: null,
          recallAt: -Infinity,
          resonance: 0,
          dissipation: 0,
          points: [],
          seed: seed / 4294967296,
        };
        entries.set(id, entry);
      }
      const last = entry.points.at(-1);
      const du = last
        ? Math.min(
            Math.abs(last.u - projected.u),
            1 - Math.abs(last.u - projected.u),
          )
        : 1;
      if (!last || Math.hypot(du, last.v - projected.v) > 0.025) {
        if (entry.points.length >= 6) entry.points.splice(1, 1);
        entry.points.push({
          ...projected,
          position: { x: position.x, y: position.y, z: position.z },
        });
      }
      entry.updatedAt = time;
    },
    encounter(id) {
      const entry = entries.get(id);
      if (entry) {
        entry.recallAt = time;
        entry.resonance = Math.min(1, entry.resonance + 0.55);
      }
    },
    expire(id) {
      const entry = entries.get(id);
      if (entry && entry.expiredAt === null) entry.expiredAt = time;
    },
    advance(dt, lifetime) {
      time += Math.max(0, dt);
      for (const [id, entry] of entries) {
        const lastActivity = Math.max(
          entry.updatedAt,
          Number.isFinite(entry.recallAt) ? entry.recallAt : 0,
        );
        const target = clamp((time - lastActivity) / lifetime, 0, 1);
        entry.dissipation +=
          (target - entry.dissipation) * (1 - Math.exp(-dt / 6));
        entry.resonance *= Math.exp(-dt / 50);
        if (time - lastActivity >= lifetime) entries.delete(id);
      }
    },
    clear() {
      entries.clear();
      time = 0;
    },
    get time() {
      return time;
    },
  };
}

export function createEchoChamber({ mobile = false } = {}) {
  const canvas = document.createElement("canvas"),
    context = canvas.getContext("2d");
  canvas.width = mobile ? 512 : 1024;
  canvas.height = canvas.width / 2;
  const memory = createEchoMemory(mobile ? 32 : 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.BackSide,
    uniforms: {
      uMemory: { value: texture },
      uTime: { value: 0 },
      uPresence: { value: DEFAULT_ECHO_PRESENCE },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D uMemory; uniform float uTime; uniform float uPresence; varying vec2 vUv;
      void main(){
        float angle=vUv.x*6.2831853;
        vec2 drift=vec2(sin(angle*2.0+uTime*.013)*.003, sin(angle+vUv.y*5.0+uTime*.009)*.002);
        vec2 uv=vec2(fract(vUv.x+drift.x),clamp(vUv.y+drift.y,.002,.998));
        vec4 pigment=texture2D(uMemory,uv)*.5;
        pigment+=texture2D(uMemory,vec2(fract(uv.x+.0015),uv.y))*.25;
        pigment+=texture2D(uMemory,vec2(fract(uv.x-.0015),uv.y))*.25;
        gl_FragColor=vec4(pigment.rgb,min(.38,pigment.a*uPresence));
        #include <colorspace_fragment>
      }`,
  });
  const geometry = new THREE.SphereGeometry(420, mobile ? 32 : 48, 24);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "ÉCHORÉMANENCE";
  mesh.renderOrder = -100;
  mesh.frustumCulled = false;
  mesh.visible = false;
  let enabled = true,
    presence = DEFAULT_ECHO_PRESENCE,
    persistence = 240,
    clock = 0,
    disposed = false,
    suspended = false,
    slowFrames = 0;
  let uploads = 0,
    hadEntries = false,
    hasInk = false;
  function draw() {
    let painted = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const now = memory.time,
      density = 1 / Math.sqrt(1 + memory.entries.size * 0.075);
    for (const entry of memory.entries.values()) {
      const age = now - entry.createdAt,
        recallAge = now - entry.recallAt;
      const reminiscence =
        recallAge > 0
          ? (1 - Math.exp(-recallAge / 4)) *
            Math.exp(-recallAge / 30) *
            entry.resonance
          : 0;
      for (let layer = 0; layer < 3; layer++) {
        const delay = [0.9, 9.5, 28][layer] * (0.85 + entry.seed * 0.3);
        const echoAge = age - delay;
        if (echoAge <= 0 && reminiscence < 0.001) continue;
        const envelope = Math.max(
          0,
          (1 - Math.exp(-Math.max(0, echoAge) / 3.5)) *
            Math.exp(
              -Math.max(0, echoAge) / [18, 65, persistence * 0.6][layer],
            ),
        );
        const opacity =
          (envelope * 0.38 + reminiscence * 0.36) *
          (1 - entry.dissipation) *
          density;
        if (opacity < 0.0005) continue;
        painted = true;
        for (let i = 0; i < entry.points.length; i += 2) {
          const point = entry.points[i];
          const phase = entry.seed * TAU + layer * 1.71 + i;
          const breathing =
            1 + Math.sin(now * (0.011 + entry.seed * 0.006) + phase) * 0.055;
          const radiusY =
            (0.035 + layer * 0.019 + Math.max(0, echoAge) * 0.00009) *
            breathing;
          const radiusX = Math.min(
            0.23,
            (radiusY * 0.65) / Math.max(0.18, Math.sin(point.v * Math.PI)),
          );
          const u =
            point.u + Math.sin(now * (0.006 + layer * 0.001) + phase) * 0.008;
          const v = point.v + Math.cos(now * 0.007 + phase) * 0.006;
          for (let wrap = -1; wrap <= 1; wrap++) {
            const x = (u + wrap) * canvas.width,
              y = v * canvas.height;
            if (
              x + radiusX * canvas.width < 0 ||
              x - radiusX * canvas.width > canvas.width
            )
              continue;
            context.save();
            context.translate(x, y);
            context.scale(radiusX * canvas.width, radiusY * canvas.height);
            const wash = context.createRadialGradient(0, 0, 0, 0, 0, 1);
            wash.addColorStop(0, entry.color);
            wash.addColorStop(0.35, entry.color);
            wash.addColorStop(1, "transparent");
            context.fillStyle = wash;
            context.globalAlpha = opacity;
            context.fillRect(-1, -1, 2, 2);
            context.restore();
          }
        }
      }
    }
    texture.needsUpdate = true;
    uploads++;
    hadEntries = memory.entries.size > 0;
    hasInk = painted;
    mesh.visible = enabled && !suspended && presence > 0 && hasInk;
  }
  return {
    mesh,
    onTraceCreated(event) {
      if (enabled && !disposed) memory.record(event);
    },
    onTraceEncounter(id) {
      if (enabled && !disposed) memory.encounter(id);
    },
    onTraceExpired(id) {
      memory.expire(id);
    },
    update(dt) {
      if (!enabled || suspended || disposed) return;
      memory.advance(dt, persistence);
      material.uniforms.uTime.value = memory.time;
      slowFrames = dt > 0.045 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      if (slowFrames > 45 && canvas.width > 512) {
        canvas.width = 512;
        canvas.height = 256;
        slowFrames = 0;
      }
      clock += dt;
      if (clock >= (canvas.width <= 512 ? 0.25 : 0.16)) {
        clock = 0;
        if (memory.entries.size || hadEntries) draw();
      }
    },
    configure(options) {
      if (options.enabled !== undefined) enabled = Boolean(options.enabled);
      if (options.presence !== undefined)
        presence = clamp(options.presence, 0, 1);
      if (options.memory !== undefined)
        persistence = clamp(options.memory, 60, 360);
      material.uniforms.uPresence.value = presence;
      mesh.visible = enabled && !suspended && presence > 0 && hasInk;
    },
    suspend(value) {
      suspended = value;
      mesh.visible = enabled && !suspended && presence > 0 && hasInk;
      if (!value) texture.needsUpdate = true;
    },
    clear() {
      memory.clear();
      hasInk = hadEntries = false;
      mesh.visible = false;
      context.clearRect(0, 0, canvas.width, canvas.height);
      texture.needsUpdate = true;
    },
    get stats() {
      return {
        enabled,
        count: memory.entries.size,
        width: canvas.width,
        uploads,
        time: memory.time,
      };
    },
    dispose() {
      disposed = true;
      memory.clear();
      geometry.dispose();
      material.dispose();
      texture.dispose();
      canvas.width = canvas.height = 1;
      mesh.removeFromParent();
    },
  };
}
