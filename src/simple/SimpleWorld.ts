import { universeIdentity } from "./UniverseIdentity";
import { FlightSteering } from "./FlightSteering";
import { CameraPoetics } from "./CameraPoetics";
import { PigmentMusic } from "./PigmentMusic";
import { SILENT_SIGNAL, type MusicSignal } from "./MusicSignal";
import { sampleTravel } from "./TravelPath";
import * as THREE from "three";
import { composeWeather, PHENOMENA } from "./composition";
import { Atmosphere } from "./Atmosphere";
import { CalligraphicInk } from "./CalligraphicInk";
import {
  MonumentalStudy,
  MONUMENTAL_STUDY,
  STUDY_PALETTE,
  sampleStudyTravel,
} from "./MonumentalStudy";
import { ReactionDiffusion } from "./ReactionDiffusion";
import { AbstractResonances } from "./AbstractResonances";
import { ResonantWords } from "./ResonantWords";
import { WeatherAccents } from "./WeatherAccents";
import { PigmentDynamics } from "./PigmentDynamics";
import { MATERIAL_IDENTITIES } from "./materialIdentity";
import { makeWatercolorAtlas } from "./WatercolorAtlas";
import { DistantBirds } from "./DistantBirds";
import { HorizonGyro, smoothGyroHeading } from "../weather/HorizonGyro";
import { deviceQuaternion } from "../scene/gyroOrientation";

/** Four translucent sheets, a surrounding sky and one bounded particle draw. */
export class SimpleWorld {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(56, 1, 0.1, 80);
  private mobile = matchMedia("(pointer: coarse)").matches || innerWidth < 700;
  private geometry = new THREE.PlaneGeometry(
    10,
    6,
    this.mobile ? 24 : 32,
    this.mobile ? 12 : 16,
  );
  private pigment = new PigmentMusic(this.mobile);
  private reaction = new ReactionDiffusion(this.mobile);
  private audioSource: (() => Readonly<MusicSignal> | undefined) | null = null;
  setAudioSource(source: () => Readonly<MusicSignal> | undefined) {
    this.audioSource = source;
  }
  private texture = makeWatercolorAtlas();
  private study = MONUMENTAL_STUDY
    ? new MonumentalStudy(this.texture, this.mobile)
    : null;
  private cloudLayer = new THREE.Group();
  private birds = new DistantBirds();
  private ink = new CalligraphicInk(this.texture, this.mobile);
  private resonances = new AbstractResonances(this.texture, this.mobile);
  private words = new ResonantWords();
  private sheets: THREE.InstancedMesh<
    THREE.PlaneGeometry,
    THREE.ShaderMaterial
  >[] = [];
  private dynamics = new PigmentDynamics();
  private contact = 0;
  private atmosphere: Atmosphere;
  private accents: WeatherAccents;
  private observer: ResizeObserver;
  private frame = 0;
  private last = 0;
  private time = 0;
  private steering = new FlightSteering();
  private flightForward = new THREE.Vector3();
  private journey = 0;
  private worldSpeed = 1;
  private travelSpeed = 0;
  private cameraPoetics = new CameraPoetics();
  private tour = new Float64Array(6);
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
    this.geometry.setAttribute(
      "island",
      new THREE.InstancedBufferAttribute(new Float32Array([0, 1, 2]), 1),
    );
    for (let i = 0; i < 4; i++) {
      const material = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        uniforms: {
          paper: { value: this.texture },
          time: { value: 0 },
          phase: { value: i * 1.73 },
          reaction: { value: new THREE.Vector3() },
          meetingWeather: { value: new THREE.Vector4() },
          neighbor0: { value: new THREE.Color() },
          neighbor1: { value: new THREE.Color() },
          neighbor2: { value: new THREE.Color() },
          musicMotion: { value: new THREE.Vector3() },
          beat: { value: 0 },
          motion: { value: new THREE.Vector4(0.5, 0.5, 0.5, 0.1) },
          presence: { value: 0.6 },
          identity: { value: new THREE.Vector4(0, 1, 0.6, 0) },
          encounter: { value: new THREE.Vector3() },
          tile: { value: new THREE.Vector2(i % 2, Math.floor(i / 2)) },
          tint: { value: new THREE.Color() },
          accent: { value: new THREE.Color() },
        },
        vertexShader: `uniform float time,phase,beat;uniform vec3 musicMotion;uniform vec4 motion;attribute float island;varying vec2 vUv;varying float fold,islet,detail;
        void main(){vUv=uv;islet=island;vec3 p=position;float seed=phase+island*1.37;float t=time*.19*motion.x+seed;
          float a=p.x*(.25+motion.z*.7)+t,b=p.y*.6-t*.63;
          p.z+=sin(a)*(.4+motion.z)+cos(b)*.45;
          p.z+=sin(p.x*.7+p.y*.6+beat*.22)*musicMotion.x*.9;p.y+=sin(a*.7)*(.25+motion.w*.8);p.x+=sin(b+t*.3)*(.25+motion.w);
          fold=.5+.5*cos(a)*cos(b);p=(instanceMatrix*vec4(p,1.)).xyz;
          p+=vec3(sin(time*.031+seed),cos(time*.023+seed*.8),sin(time*.019+seed*1.1))*.65;
          vec4 view=modelViewMatrix*vec4(p,1.);detail=1.-smoothstep(5.,20.,-view.z);gl_Position=projectionMatrix*view;}`,

        fragmentShader: `uniform sampler2D paper;uniform vec3 tint,accent,reaction,neighbor0,neighbor1,neighbor2;uniform vec4 motion,identity,meetingWeather;uniform vec3 encounter,musicMotion;uniform float presence,time,phase,beat;uniform vec2 tile;varying vec2 vUv;varying float fold,islet,detail;
        vec4 ink(vec2 p){return texture2D(paper,(clamp(p,.005,.995)+tile)*.5);}
        void main(){float seed=phase+islet*1.37;float contact=islet<.5?reaction.x:islet<1.5?reaction.y:reaction.z;vec3 other=islet<.5?neighbor0:islet<1.5?neighbor1:neighbor2;float t=time*.018*motion.x+seed;
          vec2 drift=vec2(sin(vUv.y*3.+t),cos(vUv.x*4.-t*.61))*(.035+musicMotion.x*.045+contact*(.035+meetingWeather.y*.03));
          float symmetry=step(.5,islet)*(1.-step(1.5,islet))*.86;
          vec2 folded=vec2(.5+abs(vUv.x-.5+sin(vUv.y*3.+seed)*.015),vUv.y);
          vec2 pigmentUV=mix(vUv,folded,symmetry);
          pigmentUV.x+=sin(vUv.y*5.+t)*meetingWeather.z*contact*.045;
          vec4 p=ink(pigmentUV+drift),q=ink(pigmentUV*.73+.12-drift),r=ink(vUv*(1.3+detail*1.2)-.3+drift*.4);
          vec2 center=vUv-.5;float shape=identity.x;
          float contour=length(center*vec2(1.7,1.85));
          if(shape>.5&&shape<1.5)contour=length(center*vec2(2.6,1.25))+(q.b-.5)*.27;
          else if(shape>1.5&&shape<2.5)contour=abs(center.y+sin(vUv.x*6.+t)*.12)*3.4+abs(center.x)*.55;
          else if(shape>2.5&&shape<3.5)contour=length(center*vec2(1.4,1.5))*.9;
          else if(shape>3.5&&shape<4.5)contour=length(center*vec2(1.9,1.8))+(q.b-.5)*.55;
          else if(shape>4.5)contour=length(center*vec2(1.8,1.5))+sin(vUv.y*6.+t)*.15+(q.b-.5)*.2;
          float tide=.5+.5*sin(time*.011+seed);
          contour+=(q.b-.5)*(.32+tide*.12)+(p.b-.5)*.18;
          float edge=1.-smoothstep(.25,1.,contour);
          // A slow, local reserve opens then closes, without a scene-wide pulse.
          float cycle=fract(time/(39.+islet*7.)+fract(seed*.173));
          float event=smoothstep(.24,.43,cycle)*(1.-smoothstep(.57,.78,cycle));
          vec2 well=vec2(.5+sin(seed*2.)*.17,.5+cos(seed*1.3)*.14);
          float opening=(1.-smoothstep(.025,.18,length((vUv-well)*vec2(1.,1.4))))*event;
          edge*=1.-opening*.72;
          edge*=smoothstep(0.,.12,vUv.x)*smoothstep(0.,.12,1.-vUv.x)*smoothstep(0.,.12,vUv.y)*smoothstep(0.,.12,1.-vUv.y);
          float pool=smoothstep(.18,.7,p.a*.5+q.a*.35+r.a*.15);
          float drying=exp(-abs(p.b-.47-sin(t*.21)*.025)*32.)*identity.z;
          float granule=(r.g-.5)*.18;
          float gradient=smoothstep(.1,.9,vUv.y*.55+q.b*.45+fold*.18);
          vec3 c=mix(tint,accent,gradient*.75);
          // Pair-specific washes: golden rain openings, wind-combed snow, silver moon fog.
          float window=smoothstep(.32,.76,q.b+sin(vUv.y*4.+t)*.12);
          c=mix(c,vec3(.83,.62,.32),encounter.x*window*.38);
          c=mix(c,vec3(.83,.89,.91),encounter.y*smoothstep(.48,.7,r.g)*.42);
          c=mix(c,vec3(.67,.72,.83),encounter.z*window*.48);
          edge*=1.-encounter.x*window*.2;
          edge*=1.-encounter.y*(.5+.5*sin(vUv.x*24.+vUv.y*3.+t))*.18;
          float meeting=contact*smoothstep(.2,.75,q.b)*.32;
          c=mix(c,other,meeting);
          float deposit=clamp(pool*identity.y+drying*.3+contact*.15,0.,1.);
          float luma=dot(c,vec3(.2126,.7152,.0722));c=max(vec3(.01),mix(vec3(luma),c,1.25+musicMotion.x*.3));
          c*=1.-deposit*.35-drying*.1+granule;
          float sumi=smoothstep(.48,.8,p.a)*smoothstep(.3,.75,q.b)*min(1.,identity.y);
          c=mix(c,mix(tint*.24,vec3(.07,.09,.12),.35),sumi*.6);
          c=mix(c,vec3(.94,.91,.84),smoothstep(.66,.92,r.g)*.16);
          float alpha=edge*(.18+pool*.55+drying*.12)*presence*.72;
          gl_FragColor=vec4(c,alpha);\n#include <colorspace_fragment>\n}`,
      });
      material.forceSinglePass = true;
      const sheet = new THREE.InstancedMesh(this.geometry, material, 3);
      const matrix = new THREE.Matrix4();
      const positions = [
        [-3.4, 0.7, -1.5],
        [0.8, -0.8, -3.5],
        [3.6, 0.9, 1.5],
      ];
      for (let slot = 0; slot < 3; slot++) {
        const size = [0.46, 0.57, 0.38][slot];
        matrix.makeScale(size, size, size);
        matrix.setPosition(...(positions[slot] as [number, number, number]));
        sheet.setMatrixAt(slot, matrix);
      }
      sheet.instanceMatrix.needsUpdate = true;
      sheet.position.set(
        Math.sin(i * 2.2) * 3,
        Math.cos(i * 1.9) * 1.8,
        -3 - i * 2.7,
      );
      sheet.rotation.set(i * 0.16, (i - 1.5) * 0.4, Math.sin(i * 2) * 0.4);
      sheet.frustumCulled = false;
      this.cloudLayer.add(sheet);
      this.sheets.push(sheet);
    }
    this.atmosphere = new Atmosphere(
      this.texture,
      matchMedia("(max-width: 700px), (pointer: coarse)").matches,
    );
    this.accents = new WeatherAccents(
      this.texture,
      matchMedia("(max-width: 700px), (pointer: coarse)").matches,
    );
    this.cloudLayer.add(
      this.atmosphere.particles,
      this.accents.ribbons,
      this.accents.seeds,
    );
    this.cloudLayer.position.y = 18;
    this.scene.add(
      this.atmosphere.sky,
      this.cloudLayer,
      this.birds.mesh,
      this.words.mesh,
      this.resonances.mesh,
      this.ink.group,
      ...(this.study ? [this.study.group] : []),
    );
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
    const score = composeWeather(ids),
      identity = universeIdentity(ids);
    this.worldSpeed = MONUMENTAL_STUDY ? 1 : identity.speed;
    this.renderer.domElement.dataset.universe = MONUMENTAL_STUDY
      ? "indigo-terre"
      : identity.name;
    this.renderer.domElement.dataset.sequence = identity.key;
    this.atmosphere.setPalette(ids);
    this.accents.setPalette(ids);
    this.words.setPalette(ids);
    this.resonances.setPalette(ids);
    this.ink.setPalette(ids);
    this.pigment.setPalette(ids);
    this.reaction.setPalette(MONUMENTAL_STUDY ? STUDY_PALETTE : ids);
    this.renderer.domElement.dataset.composition = score.entries.join(",");
    this.renderer.domElement.dataset.interaction = score.rainbow
      ? "sun-rain"
      : score.slant
        ? "wind-rain"
        : "layered";
    this.sheets.forEach((sheet, i) => {
      const index = i % score.entries.length,
        p = score.palettes[index];
      sheet.material.uniforms.tint.value.set(identity.colors[index % 3]);
      sheet.material.uniforms.accent.value.set(
        identity.colors[(index + 1) % 3],
      );
      sheet.material.uniforms.meetingWeather.value.fromArray(score.weather);
      sheet.material.uniforms.encounter.value.fromArray(score.encounters);
      sheet.material.uniforms.motion.value.fromArray(
        PHENOMENA[identity.sequence[index]].motion,
      );
      const veil = PHENOMENA[identity.sequence[index]].veil;
      const material = MATERIAL_IDENTITIES[identity.sequence[index]];
      const family = (material.family + (i === 3 ? 1 : 0)) % 4;
      sheet.material.uniforms.tile.value.set(
        family % 2,
        Math.floor(family / 2),
      );
      sheet.material.uniforms.identity.value.set(
        material.shape,
        material.contrast,
        material.pooling,
        0,
      );
      sheet.material.uniforms.presence.value = Math.min(
        0.88,
        (veil[2] * 1.2 + 0.1) * identity.opacity,
      );
      sheet.scale.set(veil[0] * identity.mass, veil[1] * identity.mass, 1);
      sheet.position.set(
        Math.sin(i * 2.2 + material.twist + identity.rotation) *
          3.6 *
          material.spread *
          identity.space[0],
        Math.cos(i * 1.9 + identity.rotation) * 1.5 * identity.space[1] +
          material.lift,
        -5 + Math.cos(i * 1.7 + identity.rotation) * 4.2 * identity.space[2],
      );
      sheet.rotation.y = (i - 1.5) * 0.35 + material.twist * 0.3;
      sheet.rotation.z =
        veil[3] +
        material.twist * 0.2 +
        (score.kinds[index] === 1
          ? -0.35 * score.slant
          : Math.sin(i * 2) * 0.08);
    });
    this.dynamics.configure(this.sheets, identity.sequence);
  }

  setGyro(active: boolean) {
    this.gyro = active;
    if (active) this.travelSpeed = 0;
    this.horizon.reset();
    this.source = "";
    this.lastRelative = -Infinity;
    this.sensorAt = 0;
    this.gyroStarted = performance.now();
    this.sensorScreen = screen.orientation?.angle || 0;
  }
  private resize = () => {
    const { width, height } = this.host.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    this.renderer.setSize(width, height, false);
    this.cameraPoetics.resize(
      width * this.pixelRatio,
      height * this.pixelRatio,
    );
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
    this.reaction.reset();
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
    if (!this.inside) {
      this.travelSpeed = 0;
      this.steering.reset();
    }
    if (!this.paused) {
      this.time += dt;
      this.travelSpeed = THREE.MathUtils.damp(
        this.travelSpeed,
        this.inside && this.travel ? 1 : 0,
        1.7,
        dt,
      );
      // End the infinitesimal damping tail: contemplation must truly stop.
      if (!this.travel && this.travelSpeed < 0.01) this.travelSpeed = 0;
      if (this.inside) this.journey += dt * this.travelSpeed * this.worldSpeed;
    }
    // Drop fill cost once on sustained slow frames; never oscillate quality each frame.
    if (raw > 0.028 && raw < 0.5) this.slow += raw > 0.06 ? 3 : 1;
    else this.slow = Math.max(0, this.slow - 1);
    if (this.slow > 90 && this.pixelRatio > 0.8) {
      this.pigment.setReducedQuality();
      this.reaction.setReducedQuality();
      this.cameraPoetics.setReducedQuality();
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
    const opticalBreath = this.gyro
      ? 0
      : Math.sin(this.journey * 0.15) * 1.4 * this.travelSpeed;
    const fov = 40 + blend * (28 + opticalBreath);
    if (this.camera.fov !== fov) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    if (this.inside) {
      // A bounded discovery route through the work, alternating distance and detail.
      const tour = MONUMENTAL_STUDY
        ? sampleStudyTravel(this.journey, this.tour)
        : sampleTravel(this.journey, this.tour);
      this.camera.getWorldDirection(this.flightForward);
      const detour = this.steering.update(
        this.paused ? 0 : dt,
        this.flightForward,
        !!this.pointer && this.travel && !this.gyro,
        this.travelSpeed,
      );
      this.camera.position.set(
        (tour[0] + detour.x) * blend,
        THREE.MathUtils.lerp(18, tour[1] + detour.y, blend),
        THREE.MathUtils.lerp(12, tour[2] + detour.z, blend),
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
      this.camera.lookAt(
        this.look.set(
          tour[3] * blend,
          THREE.MathUtils.lerp(18, tour[4], blend),
          THREE.MathUtils.lerp(-5, tour[5], blend),
        ),
      );
      this.rotation.setFromQuaternion(this.camera.quaternion, "YXZ");
      this.rotation.set(
        this.rotation.x + this.viewPitch,
        this.rotation.y + this.viewYaw,
        0,
        "YXZ",
      );
      this.camera.quaternion.setFromEuler(this.rotation);
      // Allow the full sensor wait after entry, even on a slow first GPU frame.
      if (this.gyro && !this.sensorAt && this.entry < 1) this.gyroStarted = now;
      if (this.gyro && !this.sensorAt && now - this.gyroStarted > 4000) {
        this.setGyro(false);
        this.notify(
          "Pas de signal gyroscope. Glisse pour regarder autour de toi.",
        );
      }
    } else {
      this.camera.position.set(0, 18, 12);
      this.camera.lookAt(0, 18, -5);
    }
    const audio = this.audioSource?.() ?? SILENT_SIGNAL;
    const musicResponse = this.resonances.setMusic(
      audio,
      this.paused || !this.inside ? 0 : dt,
    );
    for (const sheet of this.sheets) {
      sheet.material.uniforms.musicMotion.value.copy(musicResponse);
      if (audio.energy > 0.005 && !this.paused)
        sheet.material.uniforms.beat.value = audio.beat ?? 0;
    }
    if (!this.paused)
      this.cameraPoetics.setMusic(
        audio.energy > 0.005 ? audio.beat : undefined,
        musicResponse.x,
      );
    if (!MONUMENTAL_STUDY) {
      this.contact = this.dynamics.update(this.time, this.paused ? 0 : dt);
      this.atmosphere.sky.material.uniforms.electro.value
        .copy(musicResponse)
        .multiplyScalar(this.inside ? 1 : 0);
      this.atmosphere.update(this.time, this.camera, this.pixelRatio);
      this.atmosphere.particles.material.uniforms.resonance.value =
        this.contact;
      this.accents.update(
        this.time,
        this.pixelRatio,
        this.contact,
        musicResponse,
        !this.paused && audio.energy > 0.005 ? audio.beat : undefined,
      );
      this.birds.update(this.time);
      this.words.update(this.time, dt, this.camera, this.paused, this.inside);
      if (!MONUMENTAL_STUDY)
        this.pigment.update(dt, audio, this.paused || !this.inside);
    }
    this.reaction.update(this.renderer, dt, audio, this.paused || !this.inside);
    if (!MONUMENTAL_STUDY) {
      this.resonances.setReactionTexture(this.reaction.texture);
      this.resonances.setLivingTexture(
        this.pigment.texture,
        this.pigment.previousTexture,
        this.pigment.blend,
      );
      this.resonances.update(this.time, dt, this.paused, this.inside);
      if (!MONUMENTAL_STUDY && this.inside && !this.paused)
        this.reaction.suggestEncounter(this.resonances.encounterSeed);
      this.ink.update(this.time, musicResponse, this.pixelRatio, this.inside);
    }
    if (this.study) this.study.group.visible = MONUMENTAL_STUDY;
    if (MONUMENTAL_STUDY) {
      this.study?.update(
        this.time,
        this.paused ? 0 : dt,
        audio,
        this.reaction.texture,
      );
      this.cloudLayer.visible = false;
      this.atmosphere.sky.visible = false;
      this.resonances.mesh.visible = false;
      this.ink.group.visible = false;
      this.words.mesh.visible = false;
      this.birds.mesh.visible = false;
    }
    if (MONUMENTAL_STUDY || !this.inside || this.gyro)
      this.cameraPoetics.reset();
    this.cameraPoetics.update(
      this.time,
      dt,
      !MONUMENTAL_STUDY && this.inside && this.travel && !this.gyro,
      this.paused,
    );
    this.cameraPoetics.render(this.renderer, this.scene, this.camera);
    if (now - this.debugAt > 120) {
      this.debugAt = now;
      const d = this.renderer.domElement.dataset;
      d.particles = MONUMENTAL_STUDY
        ? "0"
        : String(this.atmosphere.particles.geometry.drawRange.count);
      d.sky = "watercolor";
      d.study = MONUMENTAL_STUDY ? "monumental-ink" : "emoji-universes";
      const pigment = this.pigment.inspect();
      const reaction = this.reaction.inspect();
      d.reaction = reaction.state;
      d.reactionSteps = String(reaction.steps);
      d.reactionEncounters = String(reaction.encounters);
      d.reactionPaused = String(this.paused || !this.inside);
      d.pigment = pigment.state;
      d.pigmentSize = String(pigment.size);
      d.pigmentDeposits = String(pigment.deposits);
      d.resonances = !MONUMENTAL_STUDY && this.inside ? "6" : "0";
      const reading = this.words.inspect();
      d.word = reading.focused ?? "";
      d.wordApproach = reading.approach.toFixed(3);
      d.accents = MONUMENTAL_STUDY
        ? "0"
        : String(this.accents.seeds.geometry.drawRange.count);
      d.streams = MONUMENTAL_STUDY ? "0" : "12";
      d.islands = MONUMENTAL_STUDY ? "0" : "12";
      d.contact = this.contact.toFixed(4);
      d.altitude = this.camera.position.y.toFixed(2);
      d.horizon = "painted-landscape";
      d.birdTime = this.time.toFixed(3);
      d.renderer = "simple-silk";
      d.time = this.time.toFixed(3);
      d.calls = String(this.cameraPoetics.calls);
      d.cameraFx = this.cameraPoetics.inspect().amount.toFixed(3);
      d.travelSpeed = this.travelSpeed.toFixed(3);
      d.steering = `${this.steering.offset.x.toFixed(3)},${this.steering.offset.y.toFixed(3)},${this.steering.offset.z.toFixed(3)}`;
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
    this.birds.dispose();
    this.resonances.dispose();
    this.ink.dispose();
    this.cameraPoetics.dispose();
    this.pigment.dispose();
    this.reaction.dispose();
    this.study?.dispose();
    this.words.dispose();
    this.accents.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    c.remove();
  }
}
