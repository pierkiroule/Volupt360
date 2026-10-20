import { createSkyTexture } from "./skyModel.js";
import { useEffect, useRef } from "react";
import * as THREE from "three";
/** Touch rotation and precise UV placement use the same sphere as the painted surface. */
export function OrbEditor({ tags, onPlace, active, rotation }) {
  const host = useRef(null),
    state = useRef({ tags, onPlace, active });
  state.current = { tags, onPlace, active };
  const owner = useRef(null);
  useEffect(() => {
    const container = host.current,
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
    container.append(renderer.domElement);
    renderer.domElement.setAttribute(
      "aria-label",
      "Bulle émotionnelle : glisser pour tourner, toucher pour déposer",
    );
    renderer.domElement.setAttribute("role", "img");
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50),
      geometry = new THREE.SphereGeometry(1.8, 96, 64);
    const uniforms = { map: { value: null }, time: { value: 0 } };
    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      vertexShader: `varying vec2 U;varying vec3 N,V;void main(){U=uv;vec4 p=modelViewMatrix*vec4(position,1.);N=normalize(normalMatrix*normal);V=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
      fragmentShader: `uniform sampler2D map;uniform float time;varying vec2 U;varying vec3 N,V;void main(){vec4 ink=texture2D(map,U);float rim=pow(1.-max(0.,dot(normalize(N),normalize(V))),2.5);float cloud=sin(U.x*15.+time*.12)*sin(U.y*11.-time*.09);vec3 color=ink.rgb*(.94+cloud*.035)+vec3(.07,.09,.12)*rim;float glint=pow(max(0.,dot(reflect(-normalize(V),normalize(N)),normalize(vec3(-.5,.8,1.)))),28.);gl_FragColor=vec4(mix(color,vec3(1.),glint*.52),.98);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.quaternion.copy(rotation.current);
    scene.add(mesh);
    const ray = new THREE.Raycaster(),
      pointer = new THREE.Vector2();
    let held = null,
      frame = 0,
      last = 0,
      texture = null;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    function resize() {
      const r = container.getBoundingClientRect();
      if (!r.width || !r.height) return;
      renderer.setSize(r.width, r.height);
      camera.aspect = r.width / r.height;
      camera.position.z = Math.max(
        5.9,
        2.05 / (Math.tan((camera.fov * Math.PI) / 360) * camera.aspect),
      );
      camera.updateProjectionMatrix();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    function down(e) {
      if (!e.isPrimary || e.button > 0) return;
      renderer.domElement.setPointerCapture(e.pointerId);
      held = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        moved: 0,
      };
    }
    function move(e) {
      if (held?.id !== e.pointerId) return;
      const dx = e.clientX - held.lastX,
        dy = e.clientY - held.lastY;
      held.moved += Math.hypot(dx, dy);
      mesh.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), dx * 0.006);
      mesh.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), dy * 0.006);
      held.lastX = e.clientX;
      held.lastY = e.clientY;
      rotation.current.copy(mesh.quaternion);
    }
    function end(e) {
      if (held?.id !== e.pointerId) return;
      const gesture = held;
      held = null;
      if (e.type !== "pointerup" || gesture.moved > 8) return;
      const r = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      mesh.updateMatrixWorld();
      camera.updateMatrixWorld();
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObject(mesh)[0];
      if (hit) state.current.onPlace({ u: hit.uv.x, v: 1 - hit.uv.y });
    }
    const el = renderer.domElement;
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      el.addEventListener(type, end);
    function tick(now) {
      if (state.current.active && !document.hidden && now - last > 25) {
        last = now;
        uniforms.time.value = reduced.matches ? 0 : now / 1000;
        renderer.render(scene, camera);
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    owner.current = {
      setCanvas(canvas) {
        if (!texture) {
          texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          uniforms.map.value = texture;
        } else texture.image = canvas;
        texture.needsUpdate = true;
        el.dataset.tags = String(state.current.tags.length);
      },
    };
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
        el.removeEventListener(type, end);
      texture?.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      el.remove();
      owner.current = null;
    };
  }, []);
  useEffect(() => {
    owner.current?.setCanvas(createSkyTexture(tags));
  }, [tags]);
  return <div className="orb-editor" ref={host} hidden={!active} />;
}
