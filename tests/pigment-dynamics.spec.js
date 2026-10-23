import { test, expect } from "@playwright/test";
test("pigment meetings use spatial distance, remain bounded and freeze on pause", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { PigmentDynamics } = await import("/src/simple/PigmentDynamics.ts");
    const geometry = new THREE.PlaneGeometry(1, 1);
    const create = (color) => {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          phase: { value: 0 },
          reaction: { value: new THREE.Vector3() },
          tint: { value: new THREE.Color(color) },
          neighbor0: { value: new THREE.Color() },
          neighbor1: { value: new THREE.Color() },
          neighbor2: { value: new THREE.Color() },
        },
      });
      const mesh = new THREE.InstancedMesh(geometry, material, 3);
      for (let i = 0; i < 3; i++)
        mesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(i * 0.1, 0, 0));
      return mesh;
    };
    const a = create("#d4a059"),
      b = create("#5685ad"),
      field = new PigmentDynamics();
    b.position.z = 30;
    field.configure([a, b], ["warm", "water"]);
    const distant = field.update(0, 1);
    b.position.z = 1;
    field.configure([a, b], ["warm", "water"]);
    const first = field.update(0, 0.016);
    let near = first;
    for (let i = 0; i < 200; i++) near = field.update(i * 0.016, 0.016);
    const color = a.material.uniforms.neighbor0.value.toArray();
    const frozen = field.update(199 * 0.016, 0);
    const sameColor =
      JSON.stringify(color) ===
      JSON.stringify(a.material.uniforms.neighbor0.value.toArray());
    field.configure([a, b], ["warm"]);
    const sameKind = field.update(0, 1);
    geometry.dispose();
    a.material.dispose();
    b.material.dispose();
    return { distant, first, near, frozen, sameColor, sameKind };
  });
  expect(result.distant).toBe(0);
  expect(result.first).toBeGreaterThan(0);
  expect(result.first).toBeLessThan(0.05);
  expect(result.near).toBeGreaterThan(0.5);
  expect(result.near).toBeLessThanOrEqual(1);
  expect(result.frozen).toBe(result.near);
  expect(result.sameColor).toBe(true);
  expect(result.sameKind).toBe(0);
});
