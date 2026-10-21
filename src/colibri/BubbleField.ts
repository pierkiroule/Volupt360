import * as THREE from "three";
import { type Resource, type Ingredient, seedFor } from "./resources";
export interface BubbleEntry {
  id: string;
  resource: Resource;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  anchor: THREE.Vector3;
  radius: number;
  phase: number;
  visited: boolean;
  armed: boolean;
}
export class BubbleField {
  group = new THREE.Group();
  entries: BubbleEntry[] = [];
  private geometry: THREE.SphereGeometry;
  private textures: THREE.CanvasTexture[] = [];
  private controllers: AbortController[] = [];
  private alive = true;
  constructor(
    resources: Resource[],
    ingredients: Ingredient[],
    mobile: boolean,
  ) {
    this.geometry = new THREE.SphereGeometry(
      1,
      mobile ? 24 : 32,
      mobile ? 16 : 24,
    );
    let seed = seedFor(ingredients.map((i) => i.emoji));
    const rand = () =>
      (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    resources.forEach((resource, i) => {
      const color = new THREE.Color(
        ingredients[i % ingredients.length]?.color || "#91aca5",
      );
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext("2d")!;
      const wash = ctx.createRadialGradient(112, 100, 5, 128, 128, 170);
      wash.addColorStop(0, "#fff9ed");
      wash.addColorStop(0.55, "#e5eee3");
      wash.addColorStop(1, color.getStyle());
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, 256, 256);
      for (let n = 0; n < 1100; n++) {
        ctx.globalAlpha = 0.03 + rand() * 0.055;
        ctx.fillStyle = n % 2 ? color.getStyle() : "#fff";
        ctx.fillRect(
          rand() * 256,
          rand() * 256,
          1 + rand() * 2,
          1 + rand() * 2,
        );
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#496a68";
      ctx.textAlign = "center";
      ctx.font = "italic 20px Georgia";
      const words = resource.title.split(" "),
        line = words.length > 3 ? words.slice(0, 3).join(" ") : resource.title;
      ctx.fillText(line, 128, 124, 210);
      if (words.length > 3)
        ctx.fillText(words.slice(3).join(" "), 128, 150, 210);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      this.textures.push(texture);
      const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        forceSinglePass: true,
        uniforms: {
          paper: { value: texture },
          tint: { value: color },
          time: { value: 0 },
          phase: { value: i * 2.399 },
          visited: { value: 0 },
          imageMix: { value: resource.kind === "image" ? 1 : 0 },
        },
        vertexShader: `uniform float time,phase;varying vec3 P,N,V;void main(){P=position;vec3 p=position*(1.+sin(time*.4+phase+position.y*2.)*.018);N=normalize(normalMatrix*normal);vec4 v=modelViewMatrix*vec4(p,1.);V=-v.xyz;gl_Position=projectionMatrix*v;}`,
        fragmentShader: `uniform sampler2D paper;uniform vec3 tint;uniform float time,phase,visited,imageMix;varying vec3 P,N,V;
       void main(){float face=max(0.,dot(normalize(N),normalize(V)));float rim=pow(1.-face,2.3);vec2 uv=P.xy*.46+.5;vec4 pigment=texture2D(paper,uv);
       float grain=fract(sin(dot(floor(uv*210.),vec2(127.1,311.7)))*43758.5453);
       vec3 membrane=mix(vec3(.96,.95,.9),tint,.28+rim*.5);vec3 c=mix(membrane,pigment.rgb,mix(.68,.9,imageMix)*(1.-rim*.65));
       c*=.96+grain*.06;float sheen=pow(max(0.,dot(normalize(N),normalize(vec3(-.4,.7,1.)))),30.)*.14;c+=sheen;
       float alpha=(.24+rim*.42+imageMix*.23)*(1.-visited*.28);alpha+=face*.1;
       gl_FragColor=vec4(c,alpha);
       #include <colorspace_fragment>
       }`,
      });
      const angle = i * 2.39996323 + rand() * 0.3,
        y = 1 - 2 * ((i + 0.5) / Math.max(1, resources.length)),
        radius = 5.0 + rand() * 3.8,
        side = Math.sqrt(1 - y * y);
      const anchor =
        i === 0
          ? new THREE.Vector3(0, 0, -4.6)
          : new THREE.Vector3(
              Math.sin(angle) * side * radius,
              y * radius * 0.68,
              Math.cos(angle) * side * radius,
            );
      const bubbleRadius = 0.64 + rand() * 0.36,
        mesh = new THREE.Mesh(this.geometry, material);
      mesh.scale.setScalar(bubbleRadius);
      mesh.position.copy(anchor);
      mesh.name = "Nectar_" + resource.id;
      this.group.add(mesh);
      this.entries.push({
        id: resource.id,
        resource,
        mesh,
        position: mesh.position,
        anchor,
        radius: bubbleRadius,
        phase: i * 2.399,
        visited: false,
        armed: true,
      });
      if (resource.image) this.loadImage(resource.image, ctx, texture);
    });
  }
  private async loadImage(
    url: string,
    ctx: CanvasRenderingContext2D,
    texture: THREE.CanvasTexture,
  ) {
    const controller = new AbortController();
    this.controllers.push(controller);
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw Error("image");
      const blob = await response.blob();
      if (blob.size > 16 * 1024 * 1024) throw Error("size");
      const bitmap = await createImageBitmap(blob);
      try {
        if (!this.alive) return;
        const ratio = Math.max(256 / bitmap.width, 256 / bitmap.height);
        ctx.drawImage(
          bitmap,
          (256 - bitmap.width * ratio) / 2,
          (256 - bitmap.height * ratio) / 2,
          bitmap.width * ratio,
          bitmap.height * ratio,
        );
        texture.needsUpdate = true;
      } finally {
        bitmap.close();
      }
    } catch {
      /* The painted title remains visible if a local image is unavailable. */
    } finally {
      clearTimeout(timeout);
    }
  }
  update(time: number, camera: THREE.Camera, dt = 1 / 60) {
    for (const e of this.entries) {
      e.mesh.position.copy(e.anchor);
      e.mesh.position.y += Math.sin(time * 0.16 + e.phase) * 0.3;
      e.mesh.position.x += Math.sin(time * 0.11 + e.phase) * 0.16;
      e.mesh.lookAt(camera.position);
      const uniforms = (e.mesh.material as THREE.ShaderMaterial).uniforms;
      uniforms.time.value = time;
      uniforms.visited.value = THREE.MathUtils.damp(
        uniforms.visited.value,
        e.visited ? 1 : 0,
        2,
        dt,
      );
    }
  }
  dispose() {
    this.alive = false;
    for (const c of this.controllers) c.abort();
    for (const e of this.entries) (e.mesh.material as THREE.Material).dispose();
    for (const t of this.textures) {
      t.dispose();
      (t.image as HTMLCanvasElement).width = 1;
    }
    this.geometry.dispose();
    this.group.clear();
    this.entries = [];
    this.textures = [];
    this.controllers = [];
  }
}
