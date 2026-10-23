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
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
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
    geometry.setAttribute(
      "local",
      new THREE.BufferAttribute(
        new Float32Array(
          Array.from({ length: 6 }, () => [0, 0, 1, 0, 0, 1, 1, 1]).flat(),
        ),
        2,
      ),
    );
    geometry.setAttribute(
      "glow",
      new THREE.BufferAttribute(new Float32Array(24), 1).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    geometry.setAttribute(
      "inkTint",
      new THREE.BufferAttribute(new Float32Array(72), 3),
    );
    geometry.setAttribute(
      "wordIndex",
      new THREE.BufferAttribute(
        new Float32Array(
          Array.from({ length: 6 }, (_, i) => [i, i, i, i]).flat(),
        ),
        1,
      ),
    );
    geometry.setAttribute(
      "wordSpan",
      new THREE.BufferAttribute(new Float32Array(24), 1),
    );
    geometry.setIndex(indices);
    this.mesh = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
        opacity: 0,
        uniforms: {
          map: { value: this.texture },
          time: { value: 0 },
          opacity: { value: 0 },
        },
        vertexShader: `attribute vec2 local;attribute float glow,wordIndex,wordSpan;attribute vec3 inkTint;varying vec2 vUv,vLocal;varying float focus,index,span;varying vec3 tint;
        void main(){vUv=uv;vLocal=local;focus=glow;index=wordIndex;span=wordSpan;tint=inkTint;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `uniform sampler2D map;uniform float time,opacity;varying vec2 vUv,vLocal;varying float focus,index,span;varying vec3 tint;
        void main(){vec4 text=texture2D(map,vUv);vec2 p=vLocal-.5;
          float reach=span*.5+.065;float radius=length(p/vec2(reach,.14));
          float halo=exp(-radius*radius*1.8)*(.1+focus*.16);
          halo+=exp(-pow((radius-.85)*5.,2.))*(.05+focus*.12);
          // Evaluate the nearest of six orbiting sparks, instead of a six-pass loop.
          float turn=time*.055+index*.73;
          float angleAt=atan(p.y/.13,p.x/reach+.00001);
          float slot=mod(floor((angleAt-turn)/1.04719755+.5),6.);
          float seed=slot*1.04719755+index*.73;
          float angle=seed+time*.055;
          vec2 star=vec2(cos(angle)*reach,sin(angle)*.13);
          vec2 delta=p-star;float breathe=.3+.7*pow(.5+.5*sin(time*.8+seed*2.3),2.);
          float size=max(.0055,fwidth(vLocal.x)*1.2);
          float core=exp(-dot(delta,delta)/(size*size));
          float cross=exp(-abs(delta.x)/size)*exp(-abs(delta.y)/(size*2.8))+exp(-abs(delta.y)/size)*exp(-abs(delta.x)/(size*2.8));
          float sparkle=(core+cross*.3)*breathe;
          float aura=exp(-dot(delta,delta)/.0008)*breathe;
          float alphaHalo=clamp(halo+aura*(.07+focus*.08)+sparkle*(.4+focus*.35),0.,.85);
          alphaHalo*=smoothstep(0.,.07,vLocal.x)*smoothstep(0.,.07,1.-vLocal.x)*smoothstep(0.,.07,vLocal.y)*smoothstep(0.,.07,1.-vLocal.y);
          vec3 haloColor=mix(tint*.65,vec3(.85,.56,.21),.45);
          haloColor=mix(haloColor,vec3(1.,.94,.72),min(1.,sparkle));
          float alpha=text.a+(1.-text.a)*alphaHalo;
          vec3 color=(text.rgb*text.a+haloColor*alphaHalo*(1.-text.a))/max(alpha,.0001);
          gl_FragColor=vec4(color,alpha*opacity);\n#include <colorspace_fragment>\n}`,
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
      const color = new THREE.Color(
        score.palettes[i % score.palettes.length].color,
      );
      const tint = this.mesh.geometry.attributes
        .inkTint as THREE.BufferAttribute;
      for (let j = 0; j < 4; j++)
        tint.setXYZ(i * 4 + j, color.r, color.g, color.b);
      const x = (((i % 3) + 0.5) * 1024) / 3,
        y = (Math.floor(i / 3) + 0.5) * 256;
      const span = Math.min(300, ctx.measureText(word).width) / (1024 / 3);
      const spanBuffer = this.mesh.geometry.attributes
        .wordSpan as THREE.BufferAttribute;
      for (let j = 0; j < 4; j++) spanBuffer.setX(i * 4 + j, span);
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
    this.mesh.geometry.attributes.inkTint.needsUpdate = true;
    this.mesh.geometry.attributes.wordSpan.needsUpdate = true;
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
    this.mesh.material.uniforms.opacity.value = this.alpha;
    this.mesh.material.uniforms.time.value = time;
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
        (this.mesh.geometry.attributes.glow as THREE.BufferAttribute).setX(
          i * 4 + j,
          this.approach[i],
        );
      }
    }
    buffer.needsUpdate = true;
    this.mesh.geometry.attributes.glow.needsUpdate = true;
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
