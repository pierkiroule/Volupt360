import * as THREE from "three";

/** Shared low-poly spheres, opaque pigment and one selected atmospheric rim. */
export function createCelestialBrushes(brushes, textures, onSelect) {
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(1, 24, 16);
  const vertexShader = `varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
    void main(){vUv=uv;vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=-p.xyz;gl_Position=projectionMatrix*p;}`;
  const haloMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    vertexShader,
    fragmentShader: `varying vec3 vNormal;varying vec3 vView;
      void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),2.);gl_FragColor=vec4(.22,.53,.95,rim*.24);\n#include <colorspace_fragment>\n}`,
  });
  const halo = new THREE.Mesh(geometry, haloMaterial);
  halo.visible = false;
  halo.renderOrder = 1;
  group.add(halo);
  let time = 0,
    selected = brushes[0]?.id;
  const bodies = brushes.map((brush, i) => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPigment: { value: textures.get(brush.id).texture },
        uBase: { value: new THREE.Color(brush.color || "#8babb7") },
      },
      vertexShader,
      fragmentShader: `uniform sampler2D uPigment;uniform vec3 uBase;varying vec2 vUv;varying vec3 vNormal;varying vec3 vView;
        void main(){vec2 uv=vec2(abs(vUv.x*2.-1.),vUv.y);vec4 wash=texture2D(uPigment,uv);vec3 pigment=mix(uBase*.82+vec3(.12),wash.rgb,smoothstep(.02,.35,wash.a));
        float light=max(0.,dot(normalize(vNormal),normalize(vec3(-.5,.7,1.))));
        gl_FragColor=vec4(pigment*(.62+.48*light),1.);\n#include <colorspace_fragment>\n}`,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(1.6 + (i % 3) * 0.15);
    mesh.name = `celestial-${brush.id}`;
    mesh.userData.brushId = brush.id;
    group.add(mesh);
    return { brush, mesh, index: i };
  });
  const pickable = [],
    raycaster = new THREE.Raycaster(),
    pointer = new THREE.Vector2(),
    intersections = [];
  function syncHalo() {
    const body = bodies.find(
      (body) => body.brush.id === selected && body.mesh.visible,
    );
    halo.visible = Boolean(body);
    if (body) {
      halo.position.copy(body.mesh.position);
      halo.scale.copy(body.mesh.scale).multiplyScalar(1.1);
    }
  }
  function place(body) {
    const i = body.index,
      phase = 0.5 + i * 2.399963 + time * (0.018 + (i % 4) * 0.002);
    const radius = 25 + 10 * Math.sin(time * 0.026 + i * 1.7);
    body.mesh.position.set(
      Math.cos(phase) * radius,
      Math.sin(phase * 1.7 + i) * 12,
      Math.sin(phase) * radius,
    );
    body.mesh.rotation.y = time * 0.035 + i;
  }
  return {
    group,
    select(id) {
      if (!bodies.some((body) => body.brush.id === id)) return;
      selected = id;
      syncHalo();
    },
    setBrushes(ids) {
      const allowed = new Set(ids);
      pickable.length = 0;
      for (const body of bodies) {
        body.mesh.visible = allowed.has(body.brush.id);
        place(body);
        if (body.mesh.visible) pickable.push(body.mesh);
      }
      syncHalo();
    },
    update(dt) {
      time += dt;
      for (const body of bodies) if (body.mesh.visible) place(body);
      syncHalo();
    },
    bindInput(canvas, camera, enabled = () => true) {
      let down = null,
        lastTap = null;
      function start(event) {
        if (!enabled() || !event.isPrimary || event.button > 0) {
          down = null;
          lastTap = null;
          return;
        }
        down = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          time: event.timeStamp,
          moved: false,
        };
      }
      function move(event) {
        if (
          down &&
          down.id === event.pointerId &&
          Math.hypot(event.clientX - down.x, event.clientY - down.y) > 8
        )
          down.moved = true;
      }
      function end(event) {
        if (!down || down.id !== event.pointerId) return;
        const tap = down;
        down = null;
        const now = event.timeStamp;
        if (!enabled() || tap.moved || now - tap.time > 320) {
          lastTap = null;
          return;
        }
        const rect = canvas.getBoundingClientRect();
        pointer.set(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          (-(event.clientY - rect.top) / rect.height) * 2 + 1,
        );
        group.updateWorldMatrix(true, true);
        camera.updateWorldMatrix(true, false);
        raycaster.setFromCamera(pointer, camera);
        intersections.length = 0;
        raycaster.intersectObjects(pickable, false, intersections);
        const id = intersections[0]?.object.userData.brushId;
        if (
          id &&
          lastTap?.id === id &&
          now - lastTap.time < 420 &&
          Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 24
        ) {
          lastTap = null;
          selected = id;
          syncHalo();
          onSelect(id);
          event.preventDefault();
        } else
          lastTap = id
            ? { id, time: now, x: event.clientX, y: event.clientY }
            : null;
      }
      function cancel() {
        down = lastTap = null;
      }
      const listeners = [
        ["pointerdown", start],
        ["pointermove", move],
        ["pointerup", end],
        ["pointercancel", cancel],
      ];
      listeners.forEach(([name, handler]) =>
        canvas.addEventListener(name, handler),
      );
      return () =>
        listeners.forEach(([name, handler]) =>
          canvas.removeEventListener(name, handler),
        );
    },
    dispose() {
      geometry.dispose();
      haloMaterial.dispose();
      bodies.forEach((body) => body.mesh.material.dispose());
      group.clear();
    },
  };
}
