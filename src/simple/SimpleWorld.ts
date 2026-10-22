import * as THREE from "three";
import { composeWeather, PHENOMENA } from "./composition";
import { Atmosphere } from "./Atmosphere";
import { HorizonGyro, smoothGyroHeading } from "../weather/HorizonGyro";
import { deviceQuaternion } from "../scene/gyroOrientation";

/** Four translucent sheets, a surrounding sky and one bounded particle draw. */
export class SimpleWorld {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(56, 1, 0.1, 80);
  private geometry = new THREE.PlaneGeometry(10, 6, 32, 16);
  private texture = this.makeTexture();
  private sheets: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = [];
  private atmosphere: Atmosphere;
  private observer: ResizeObserver;
  private frame = 0;
  private last = 0;
  private time = 0;
  private journey = 0;
  private entry = 0;
  private debugAt = 0;
  private yaw = 0;
  private pitch = 0;
  private viewYaw = 0;
  private viewPitch = 0;
  private look = new THREE.Vector3();
  private rotation = new THREE.Euler(0, 0, 0, "YXZ");
  private sensorQuaternion = new THREE.Quaternion();
  private horizon = new HorizonGyro();
  private sensorScreen = 0;
  private lastRelative = -Infinity;
  private source = "";
  private sensorAt = 0;
  private gyroStarted = 0;
  private pointer: { id: number; x: number; y: number } | null = null;
  private disposed = false;
  private slow = 0;
  private pixelRatio = 1;
  private lost = false;
  inside = false;
  travel = false;
  paused = false;
  gyro = false;
  constructor(
    private host: HTMLElement,
    private notify: (message: string) => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: "low-power",
    });
    this.renderer.setClearColor("#f3efe6", 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.pixelRatio = Math.min(devicePixelRatio || 1, 1.25);
    this.renderer.setPixelRatio(this.pixelRatio);
    const canvas = this.renderer.domElement;
    canvas.setAttribute("aria-label", "Voiles aquarellés en mouvement");
    host.appendChild(canvas);
    for (let i = 0; i < 4; i++) {
      const material = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        uniforms: {
          paper: { value: this.texture },
          time: { value: 0 },
          phase: { value: i * 1.73 },
          motion: { value: new THREE.Vector4(0.5, 0.5, 0.5, 0.1) },
          presence: { value: 0.6 },
          tint: { value: new THREE.Color() },
          accent: { value: new THREE.Color() },
        },
        vertexShader: `uniform float time,phase;uniform vec4 motion;varying vec2 vUv;varying float fold;void main(){vUv=uv;vec3 p=position;float t=time*.19*motion.x+phase;float a=p.x*(.25+motion.z*.7)+t,b=p.y*.6-t*.63;p.z+=sin(a)*(0.4+motion.z)+cos(b)*.45;p.y+=sin(a*.7)*(.25+motion.w*.8);p.x+=sin(b+t*.3)*(.25+motion.w);fold=.5+.5*cos(a)*cos(b);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
        fragmentShader: `uniform sampler2D paper;uniform vec3 tint,accent;uniform vec4 motion;uniform float presence;varying vec2 vUv;varying float fold;void main(){vec4 p=texture2D(paper,vUv);float edge=smoothstep(0.,.18,vUv.x)*smoothstep(0.,.18,1.-vUv.x)*smoothstep(0.,.2,vUv.y)*smoothstep(0.,.2,1.-vUv.y);vec3 c=mix(tint,accent,fold*.55+p.r*.2);c*=.78+p.r*.22;gl_FragColor=vec4(c,p.a*edge*presence);\n#include <colorspace_fragment>\n}`,
      });
      material.forceSinglePass = true;
      const sheet = new THREE.Mesh(this.geometry, material);
      sheet.position.set(
        Math.sin(i * 2.2) * 3,
        Math.cos(i * 1.9) * 1.8,
        -3 - i * 2.7,
      );
      sheet.rotation.set(i * 0.16, (i - 1.5) * 0.4, Math.sin(i * 2) * 0.4);
      sheet.frustumCulled = false;
      this.scene.add(sheet);
      this.sheets.push(sheet);
    }
    this.atmosphere = new Atmosphere(
      this.texture,
      matchMedia("(max-width: 700px), (pointer: coarse)").matches,
    );
    this.scene.add(this.atmosphere.sky, this.atmosphere.particles);
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(host);
    this.resize();
    canvas.addEventListener("pointerdown", this.down);
    canvas.addEventListener("pointermove", this.move);
    canvas.addEventListener("pointerup", this.up);
    canvas.addEventListener("pointercancel", this.up);
    canvas.addEventListener("lostpointercapture", this.up);
    canvas.addEventListener("webglcontextlost", this.contextLost);
    canvas.addEventListener("webglcontextrestored", this.contextRestored);
    window.addEventListener("deviceorientation", this.orientation);
    window.addEventListener(
      "deviceorientationabsolute",
      this.orientation as EventListener,
    );
    document.addEventListener("visibilitychange", this.visibility);
    window.addEventListener("blur", this.blur);
    this.frame = requestAnimationFrame(this.tick);
  }
  setPalette(ids: string[]) {
    const score = composeWeather(ids);
    this.atmosphere.setPalette(ids);
    this.renderer.domElement.dataset.composition = score.entries.join(",");
    this.renderer.domElement.dataset.interaction = score.rainbow
      ? "sun-rain"
      : score.slant
        ? "wind-rain"
        : "layered";
    this.sheets.forEach((sheet, i) => {
      const index = i % score.entries.length,
        p = score.palettes[index];
      sheet.material.uniforms.tint.value.set(p.color);
      sheet.material.uniforms.accent.value.set(p.secondary);
      sheet.material.uniforms.motion.value.fromArray(
        PHENOMENA[score.entries[index]].motion,
      );
      const veil = PHENOMENA[score.entries[index]].veil;
      sheet.material.uniforms.presence.value = veil[2];
      sheet.scale.set(veil[0], veil[1], 1);
      sheet.rotation.z =
        veil[3] +
        (score.kinds[index] === 1
          ? -0.35 * score.slant
          : Math.sin(i * 2) * 0.08);
    });
  }

  setGyro(active: boolean) {
    this.gyro = active;
    this.horizon.reset();
    this.source = "";
    this.lastRelative = -Infinity;
    this.sensorAt = 0;
    this.gyroStarted = performance.now();
    this.sensorScreen = screen.orientation?.angle || 0;
  }
  private makeTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const data = ctx.createImageData(256, 256);
    let seed = 9182;
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const grain = seed / 4294967296;
        const wave =
          0.5 +
          0.25 * Math.sin(x * 0.043 + Math.sin(y * 0.037) * 2) +
          0.25 * Math.cos(y * 0.071 + x * 0.014);
        const ring = Math.abs(Math.sin(wave * 19 + Math.sin(x * 0.02))) ** 12;
        const index = (y * 256 + x) * 4;
        data.data[index] =
          data.data[index + 1] =
          data.data[index + 2] =
            150 + grain * 105;
        data.data[index + 3] = Math.min(
          225,
          55 + wave * 92 + grain * 22 + ring * 56,
        );
      }
    ctx.putImageData(data, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }
  private resize = () => {
    const { width, height } = this.host.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };
  private down = (event: PointerEvent) => {
    if (!this.inside || !event.isPrimary || this.paused || this.pointer) return;
    this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    this.renderer.domElement.setPointerCapture(event.pointerId);
    this.horizon.reset();
  };
  private move = (event: PointerEvent) => {
    const p = this.pointer;
    if (!p || event.pointerId !== p.id) return;
    this.yaw -=
      ((event.clientX - p.x) / Math.max(240, this.host.clientWidth)) * 2.5;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch -
        ((event.clientY - p.y) / Math.max(240, this.host.clientHeight)) * 2.2,
      -1.05,
      1.05,
    );
    p.x = event.clientX;
    p.y = event.clientY;
  };
  private up = () => {
    this.pointer = null;
    this.horizon.reset();
  };
  private blur = () => {
    this.up();
    this.last = 0;
  };
  private visibility = () => {
    this.up();
    this.last = 0;
    if (document.hidden) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    } else if (!this.frame && !this.disposed && !this.lost)
      this.frame = requestAnimationFrame(this.tick);
  };
  private contextLost = (event: Event) => {
    event.preventDefault();
    this.lost = true;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.notify("Le rendu se repose. Restauration en cours…");
  };
  private contextRestored = () => {
    this.lost = false;
    this.last = 0;
    this.notify("");
    if (!this.disposed && !document.hidden)
      this.frame = requestAnimationFrame(this.tick);
  };
  private orientation = (event: DeviceOrientationEvent) => {
    if (
      !this.gyro ||
      !this.inside ||
      this.paused ||
      this.pointer ||
      document.hidden
    )
      return;
    if (
      ![event.alpha, event.beta, event.gamma].every(
        (v) => typeof v === "number" && Number.isFinite(v),
      )
    )
      return;
    const now = performance.now(),
      source = event.type;
    if (
      source === "deviceorientationabsolute" &&
      now - this.lastRelative < 1000
    )
      return;
    if (source === "deviceorientation") this.lastRelative = now;
    const angle = screen.orientation?.angle || 0;
    if (source !== this.source || angle !== this.sensorScreen) {
      this.horizon.reset();
      this.source = source;
      this.sensorScreen = angle;
    }
    deviceQuaternion(
      event.alpha!,
      event.beta!,
      event.gamma!,
      angle,
      this.sensorQuaternion,
    );
    this.horizon.update(
      this.sensorQuaternion,
      this.viewYaw,
      this.viewPitch,
      now,
    );
    this.yaw = this.horizon.yaw;
    this.pitch = this.horizon.pitch;
    this.sensorAt = now;
  };
  private tick = (now: number) => {
    if (this.disposed || this.lost) return;
    this.frame = requestAnimationFrame(this.tick);
    const raw = this.last ? (now - this.last) / 1000 : 0;
    const dt = Math.min(0.04, Math.max(0, raw));
    this.last = now;
    if (!this.paused) {
      this.time += dt;
      if (this.inside && this.travel) this.journey += dt;
    }
    // Drop fill cost once on sustained slow frames; never oscillate quality each frame.
    if (raw > 0.028 && raw < 0.2) this.slow++;
    else this.slow = Math.max(0, this.slow - 1);
    if (this.slow > 90 && this.pixelRatio > 0.8) {
      this.pixelRatio = 0.8;
      this.renderer.setPixelRatio(0.8);
      this.resize();
    }
    for (const sheet of this.sheets)
      sheet.material.uniforms.time.value = this.time;

    this.entry = THREE.MathUtils.clamp(
      this.entry + (this.inside ? dt : -dt) / 1.1,
      0,
      1,
    );
    const blend = this.entry * this.entry * (3 - 2 * this.entry);
    const fov = 40 + blend * 28;
    if (this.camera.fov !== fov) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    if (this.inside) {
      // A closed, continuous ellipse through the work. Never a flight into empty space.
      const t = this.journey * 0.065;
      this.camera.position.set(
        Math.sin(t) * 6 * blend,
        Math.sin(t * 2) * 1.2 * blend,
        THREE.MathUtils.lerp(12, 2 + (Math.cos(t) - 1) * 5, blend),
      );
      if (!this.paused) {
        this.viewYaw = smoothGyroHeading(this.viewYaw, this.yaw, dt);
        this.viewPitch = THREE.MathUtils.damp(
          this.viewPitch,
          this.pitch,
          7,
          dt,
        );
      }
      // Relative gaze stays separate from the gentle travel direction.
      this.camera.lookAt(this.look.set(0, 0, -5));
      this.rotation.setFromQuaternion(this.camera.quaternion, "YXZ");
      this.rotation.set(
        this.rotation.x + this.viewPitch,
        this.rotation.y + this.viewYaw,
        0,
        "YXZ",
      );
      this.camera.quaternion.setFromEuler(this.rotation);
      if (this.gyro && !this.sensorAt && now - this.gyroStarted > 4000) {
        this.setGyro(false);
        this.notify(
          "Pas de signal gyroscope. Glisse pour regarder autour de toi.",
        );
      }
    } else {
      this.camera.position.set(0, 0, 12);
      this.camera.lookAt(0, 0, -5);
    }
    this.atmosphere.update(this.time, this.camera, this.pixelRatio);
    this.renderer.render(this.scene, this.camera);
    if (now - this.debugAt > 120) {
      this.debugAt = now;
      const d = this.renderer.domElement.dataset;
      d.particles = String(this.atmosphere.particles.geometry.drawRange.count);
      d.sky = "watercolor";
      d.renderer = "simple-silk";
      d.time = this.time.toFixed(3);
      d.calls = String(this.renderer.info.render.calls);
      d.position = `${this.camera.position.x.toFixed(4)},${this.camera.position.y.toFixed(4)},${this.camera.position.z.toFixed(4)}`;
      const q = this.camera.quaternion;
      d.heading = `${q.x.toFixed(6)},${q.y.toFixed(6)},${q.z.toFixed(6)},${q.w.toFixed(6)}`;
      d.gyro = this.gyro ? (this.sensorAt ? "tracking" : "waiting") : "off";
      d.ready = this.inside && this.entry === 1 ? "inside" : "preview";
    }
  };
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    const c = this.renderer.domElement;
    c.removeEventListener("pointerdown", this.down);
    c.removeEventListener("pointermove", this.move);
    c.removeEventListener("pointerup", this.up);
    c.removeEventListener("pointercancel", this.up);
    c.removeEventListener("lostpointercapture", this.up);
    c.removeEventListener("webglcontextlost", this.contextLost);
    c.removeEventListener("webglcontextrestored", this.contextRestored);
    window.removeEventListener("deviceorientation", this.orientation);
    window.removeEventListener(
      "deviceorientationabsolute",
      this.orientation as EventListener,
    );
    document.removeEventListener("visibilitychange", this.visibility);
    window.removeEventListener("blur", this.blur);
    this.geometry.dispose();
    this.texture.dispose();
    this.sheets.forEach((s) => s.material.dispose());
    this.atmosphere.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    c.remove();
  }
}
