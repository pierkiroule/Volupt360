import * as THREE from "three";
import { composeWeather } from "./composition";

export const WEATHER_WORDS: Record<string, readonly string[]> = {
  warm: ["éclat", "élan", "rayonner", "ouverture", "chaleur", "clarté"],
  water: ["reflet", "passage", "écoute", "ruisseler", "goutte", "courant"],
  air: ["souffle", "espace", "essor", "traversée", "léger", "envol"],
  soft: ["mystère", "nuance", "voile", "lisière", "deviner", "entrevoir"],
  night: [
    "intensité",
    "contraste",
    "mouvement",
    "profondeur",
    "vibration",
    "énergie",
  ],
  spark: ["éclaircie", "lueur", "possible", "intervalle", "trouée", "émerger"],
  wonder: ["rencontre", "horizon", "palette", "résonance", "prisme", "lien"],
  surprise: [
    "silence",
    "dentelle",
    "cristal",
    "délicatesse",
    "flocon",
    "pause",
  ],
  confused: [
    "ondoyer",
    "émergence",
    "ailleurs",
    "variation",
    "danse",
    "murmure",
  ],
  tired: ["veille", "secret", "écho", "infini", "nuit", "étoile"],
  trust: ["rêverie", "flotter", "forme", "suspension", "nuage", "dérive"],
  longing: [
    "sillage",
    "perle",
    "instant",
    "frémissement",
    "averse",
    "scintiller",
  ],
};
/** Six billboards, one atlas and one draw. Gaze moves words, never the camera. */
export class ResonantWords {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private texture: THREE.CanvasTexture;
  private canvas = document.createElement("canvas");
  private labels: string[] = [];
  private anchors = Array.from({ length: 6 }, () => new THREE.Vector3());
  private positions = Array.from({ length: 6 }, () => new THREE.Vector3());
  private approach = new Float32Array(6);
  private forward = new THREE.Vector3();
  private ray = new THREE.Vector3();
  private right = new THREE.Vector3();
  private up = new THREE.Vector3();
  private center = new THREE.Vector3();
  private corner = new THREE.Vector3();
  private focused = -1;
  private candidate = -1;
  private dwell = 0;
  private alpha = 0;
  constructor() {
    this.canvas.width = 1024;
    this.canvas.height = 512;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter;
    const geometry = new THREE.BufferGeometry(),
      uv = new Float32Array(6 * 4 * 2),
      indices: number[] = [];
    for (let i = 0; i < 6; i++) {
      const x = (i % 3) / 3,
        y = Math.floor(i / 3) / 2;
      uv.set(
        [x, 1 - y - 0.5, x + 1 / 3, 1 - y - 0.5, x, 1 - y, x + 1 / 3, 1 - y],
        i * 8,
      );
      const k = i * 4;
      indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(6 * 4 * 3), 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    this.mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
        opacity: 0,
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 20;
    this.mesh.visible = false;
  }
  setPalette(ids: string[]) {
    const score = composeWeather(ids),
      ctx = this.canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 1024, 512);
    ctx.font = "48px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(255,251,239,.82)";
    ctx.fillStyle = "#253d3a";
    this.labels = Array.from({ length: 6 }, (_, i) => {
      const id = score.entries[i % score.entries.length];
      return WEATHER_WORDS[id][
        Math.floor(i / score.entries.length) % WEATHER_WORDS[id].length
      ];
    });
    this.labels.forEach((word, i) => {
      const x = (((i % 3) + 0.5) * 1024) / 3,
        y = (Math.floor(i / 3) + 0.5) * 256;
      ctx.strokeText(word, x, y, 300);
      ctx.fillText(word, x, y, 300);
      const angle = (i * Math.PI) / 3;
      this.anchors[i].set(
        Math.sin(angle) * 10,
        18 + Math.sin(i * 1.7) * 1.4,
        -5 - Math.cos(angle) * 5,
      );
      this.positions[i].copy(this.anchors[i]);
    });
    this.texture.needsUpdate = true;
    this.approach.fill(0);
    this.focused = -1;
    this.candidate = -1;
    this.dwell = 0;
  }
  update(
    time: number,
    dt: number,
    camera: THREE.PerspectiveCamera,
    paused: boolean,
    inside: boolean,
  ) {
    if (!inside) {
      this.mesh.visible = false;
      this.alpha = 0;
      this.focused = -1;
      this.candidate = -1;
      this.dwell = 0;
      this.approach.fill(0);
      return;
    }
    this.mesh.visible = true;
    const step = paused ? 0 : dt;
    if (paused && this.alpha === 0) this.alpha = 0.85;
    this.alpha = THREE.MathUtils.damp(this.alpha, 0.85, 2, step);
    this.mesh.material.opacity = this.alpha;
    camera.getWorldDirection(this.forward);
    let best = -1,
      bestDot = 0.994;
    for (let i = 0; i < 6; i++) {
      this.positions[i].copy(this.anchors[i]);
      this.positions[i].y += Math.sin(time * 0.12 + i * 1.7) * 0.22;
      this.positions[i].x += Math.sin(time * 0.08 + i) * 0.18;
      this.ray.copy(this.positions[i]).sub(camera.position);
      const distance = this.ray.length();
      const dot = this.ray.normalize().dot(this.forward);
      if (distance > 2.3 && dot > bestDot) {
        bestDot = dot;
        best = i;
      }
    }
    // Hold the current word within a wider cone to avoid selection jitter.
    if (this.focused >= 0) {
      const dot = this.ray
        .copy(this.positions[this.focused])
        .sub(camera.position)
        .normalize()
        .dot(this.forward);
      if (dot > 0.982) best = this.focused;
    }
    if (!paused) {
      if (best !== this.candidate) {
        this.candidate = best;
        this.dwell = 0;
      } else this.dwell += step;
      if (best < 0) this.focused = -1;
      else if (this.dwell > 0.32) this.focused = best;
    }
    this.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    this.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const buffer = this.mesh.geometry.attributes
      .position as THREE.BufferAttribute;
    const fov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    for (let i = 0; i < 6; i++) {
      this.approach[i] = THREE.MathUtils.damp(
        this.approach[i],
        i === this.focused ? 1 : 0,
        1.9,
        step,
      );
      this.ray.copy(this.positions[i]).sub(camera.position);
      const distance = this.ray.length();
      const targetDistance = Math.max(
        2.8,
        distance - Math.max(0, distance - 2.8) * this.approach[i],
      );
      this.center
        .copy(camera.position)
        .addScaledVector(this.ray.normalize(), targetDistance);
      const width = Math.min(
          3.1,
          targetDistance * 2 * fov * camera.aspect * 0.74,
        ),
        height = width * 0.75;
      for (let j = 0; j < 4; j++) {
        this.corner
          .copy(this.center)
          .addScaledVector(this.right, ((j % 2) - 0.5) * width)
          .addScaledVector(this.up, (Math.floor(j / 2) - 0.5) * height);
        buffer.setXYZ(i * 4 + j, this.corner.x, this.corner.y, this.corner.z);
      }
    }
    buffer.needsUpdate = true;
  }
  inspect() {
    return {
      focused: this.focused < 0 ? null : this.labels[this.focused],
      approach: this.focused < 0 ? 0 : this.approach[this.focused],
      words: [...this.labels],
    };
  }
  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.texture.dispose();
    this.canvas.width = this.canvas.height = 0;
  }
}
