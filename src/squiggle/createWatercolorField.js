import * as THREE from "three";
import { createPigmentRibbons } from "./createPigmentRibbons.js";
import { pigmentAtlas } from "./pigmentAtlas.js";
import { SQUIGGLE_BRUSHES } from "./brushes.js";
const families = new Map(SQUIGGLE_BRUSHES.map((b, i) => [b.id, i]));
function world(p, r, out) {
  const a = p.x * Math.PI * 2,
    t = (0.04 + p.y * 0.92) * Math.PI;
  return out.set(
    -Math.cos(a) * Math.sin(t) * r,
    Math.cos(t) * r,
    Math.sin(a) * Math.sin(t) * r,
  );
}
/** Two draw calls: layered pigment veils and a volumetric dust field. */
export function createWatercolorField({ mobile = false } = {}) {
  const group = new THREE.Group(),
    capacity = mobile ? 2800 : 6000,
    veilCapacity = mobile ? 160 : 320;
  const texture = new THREE.CanvasTexture(pigmentAtlas());
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  const uniforms = {
    photo: { value: texture },
    hasPhoto: { value: 0 },
    time: { value: 0 },
    pigment: { value: texture },
    pixelRatio: { value: Math.min(devicePixelRatio || 1, 1.5) },
  };
  const create = (limit, veil) => {
    const geometry = new THREE.BufferGeometry();
    const arrays = {
      position: new Float32Array(limit * 3),
      color: new Float32Array(limit * 3),
      flow: new Float32Array(limit * 3),
      matter: new Float32Array(limit * 4),
    };
    for (const [name, array] of Object.entries(arrays))
      geometry.setAttribute(
        name,
        new THREE.BufferAttribute(array, name === "matter" ? 4 : 3).setUsage(
          THREE.DynamicDrawUsage,
        ),
      );
    geometry.setDrawRange(0, 0);
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      vertexShader: `attribute vec3 flow;attribute vec4 matter;uniform float time,pixelRatio;varying vec3 C;varying vec4 D;
      void main(){float seed=matter.x;float speed=${veil ? ".13+matter.w*.02" : ".45+matter.w*.035"};float t=time*speed;
        float age=fract(seed+t*.12);float breath=.5+.5*sin(t+seed*31.);
        vec3 radial=normalize(position); vec3 across=normalize(cross(radial,flow));
        vec3 p=position+flow*sin(t+seed*21.)*matter.y*.7+across*cos(t*.73+seed*17.)*matter.y*.55;
        p+=radial*sin(t*.61+seed*41.)*matter.y*.35;
        ${veil ? "p+=across*sin(t*.31+seed*13.)*.13;" : "p+=flow*(age-.5)*matter.y*2.8;"}
        vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
        float size=${veil ? "matter.y*430.*(.9+breath*.18)" : "(12.+matter.y*18.)*(.75+breath*.5)"};
        gl_PointSize=clamp(size*pixelRatio/max(1.,-view.z),${veil ? "12." : "1."},${veil ? "220." : "13."});
        C=color;D=vec4(seed,${veil ? "matter.z*.42" : "matter.z*(.25+.65*sin(age*3.14159))"},matter.w,t);
      }`,
      fragmentShader: `uniform sampler2D pigment,photo;uniform float hasPhoto;varying vec3 C;varying vec4 D;
      void main(){vec2 q=gl_PointCoord-.5;float angle=D.x*12.+D.w*.11;mat2 rot=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));q=rot*q;
        ${
          veil
            ? `q.x*=.84;q.y*=1.15; if(max(abs(q.x),abs(q.y))>.49)discard;
          float tile=mod(floor(D.z),4.);float ink=texture2D(pigment,vec2((tile+q.x+.5)*.25,q.y+.5)).a;
          float ridge=.68+.32*sin(q.x*13.+q.y*5.+D.w*.4+D.x*17.);
          vec3 photographic=texture2D(photo,vec2((tile+q.x+.5)*.25,q.y+.5)).rgb;
          float alpha=ink*D.y;vec3 tint=mix(C*(.72+ridge*.28),photographic*(.78+ridge*.22),hasPhoto*.8);`
            : `float r=length(q);float alpha=(1.-smoothstep(.06,.5,r))*D.y;
          alpha*=.8+.2*sin(q.x*32.+q.y*29.+D.x*173.);vec3 tint=mix(C,C*.48,.3);`
        }
        if(alpha<.003)discard;gl_FragColor=vec4(tint,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    group.add(points);
    return { geometry, material, arrays, limit };
  };
  const ribbons = createPigmentRibbons(texture, { mobile });
  group.add(ribbons.mesh);
  const veils = create(veilCapacity, true),
    dust = create(capacity, false);
  const v = new THREE.Vector3(),
    next = new THREE.Vector3(),
    tangent = new THREE.Vector3(),
    radial = new THREE.Vector3(),
    across = new THREE.Vector3(),
    color = new THREE.Color();
  function fill(target, strokes, isVeil) {
    let count = 0,
      state = 97;
    const rand = () =>
      (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
    const per = Math.max(
      1,
      Math.floor(target.limit / Math.max(1, strokes.length)),
    );
    for (const s of strokes) {
      if (!s.points.length) continue;
      const family = families.get(s.emotionId) ?? 0;
      color.set(s.color || "#5b738b");
      const amount = Math.min(
        per,
        isVeil
          ? Math.max(3, Math.ceil(s.points.length / 3))
          : Math.max(450, s.points.length * 15),
      );
      for (let i = 0; i < amount && count < target.limit; i++) {
        const progress = rand() * (s.points.length - 1),
          index = Math.floor(progress),
          fraction = progress - index;
        const a = s.points[index],
          b = s.points[Math.min(index + 1, s.points.length - 1)];
        const p = {
          x: a.x + (b.x - a.x) * fraction,
          y: a.y + (b.y - a.y) * fraction,
        };
        // Layers emerge in front of the panorama, providing parallax during FPV.
        world(p, isVeil ? 7.2 + rand() * 1.4 : 4.8 + rand() * 3.7, v);
        world(b, 8, next);
        world(a, 8, radial);
        tangent.subVectors(next, radial);
        radial.copy(v).normalize();
        if (tangent.lengthSq() < 1e-6)
          tangent.crossVectors(radial, new THREE.Vector3(0, 1, 0));
        if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0);
        tangent.normalize();
        across.crossVectors(radial, tangent).normalize();
        const spread = Math.max(0.12, (s.size / 768) * 8);
        v.addScaledVector(across, (rand() - 0.5) * spread).addScaledVector(
          tangent,
          (rand() - 0.5) * spread * 0.5,
        );
        const offset = count * 3;
        target.arrays.position.set([v.x, v.y, v.z], offset);
        target.arrays.flow.set([tangent.x, tangent.y, tangent.z], offset);
        const shade = 0.78 + rand() * 0.24;
        target.arrays.color.set(
          [color.r * shade, color.g * shade, color.b * shade],
          offset,
        );
        target.arrays.matter.set(
          [rand(), spread * (isVeil ? 1.5 : 1), s.opacity, family],
          count * 4,
        );
        count++;
      }
    }
    target.geometry.setDrawRange(0, count);
    for (const a of Object.values(target.geometry.attributes))
      a.needsUpdate = true;
  }
  let photoTexture = null;
  return {
    group,
    setPhotoMatter(value) {
      photoTexture?.dispose();
      photoTexture = value ? new THREE.CanvasTexture(value.canvas) : null;
      if (photoTexture) photoTexture.colorSpace = THREE.SRGBColorSpace;
      uniforms.photo.value = photoTexture || texture;
      uniforms.hasPhoto.value = value ? 1 : 0;
      ribbons.setPhotoTexture(photoTexture);
    },
    setDocument(strokes) {
      ribbons.setDocument(strokes);
      fill(veils, strokes, true);
      fill(dust, strokes, false);
    },
    update(time) {
      uniforms.time.value = time;
      ribbons.update(time);
    },
    get stats() {
      return {
        ribbonVertices: ribbons.vertices,
        particles: dust.geometry.drawRange.count,
        veils: veils.geometry.drawRange.count,
        capacity,
        veilCapacity,
      };
    },
    dispose() {
      photoTexture?.dispose();
      ribbons.dispose();
      texture.dispose();
      for (const layer of [veils, dust]) {
        layer.geometry.dispose();
        layer.material.dispose();
      }
      group.clear();
    },
  };
}
