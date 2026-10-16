import * as THREE from "three";

/** A quiet, world-oriented horizon. No animation, textures or frame allocations. */
export function createSunsetSky() {
  const geometry = new THREE.SphereGeometry(460, 32, 16);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    vertexShader: `varying vec3 vSky;void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 vSky;
      void main(){
        vec3 d=normalize(vSky);float h=d.y;
        vec3 paper=vec3(.905,.871,.807);
        vec3 blue=vec3(.67,.76,.82);vec3 rose=vec3(.933,.638,.539);vec3 gold=vec3(.978,.748,.477);
        float cloud=sin(d.x*9.+sin(d.z*7.))*sin(d.z*11.+h*13.);
        float wash=.5+.5*cloud;
        vec3 sky=mix(paper,blue,smoothstep(.02,.85,h)*.32);
        float sunset=exp(-pow((h-.035)/.2,2.));
        sky=mix(sky,mix(rose,gold,.5+.22*d.x),sunset*(.4+wash*.09));
        sky=mix(sky,vec3(.76,.77,.79),(1.-smoothstep(-.8,-.03,h))*.12);
        float ridge=-.065+.008*sin(d.x*17.+d.z*8.)+.006*sin(d.z*23.);
        float horizon=exp(-pow((h-ridge)/.012,2.));
        sky=mix(sky,vec3(.66,.65,.66),horizon*.09);
        float sun=smoothstep(.998,.9998,dot(d,normalize(vec3(-.55,.09,-1.))));
        sky=mix(sky,vec3(.98,.86,.63),sun*.5);
        sky+=(wash-.5)*.008;
        gl_FragColor=vec4(sky,1.);\n#include <colorspace_fragment>\n
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "watercolor-sunset-sky";
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;
  return {
    mesh,
    update(camera) {
      mesh.position.copy(camera.position);
      // The camera rig changes its far plane in FPV/gyro/photo. Keep the dome inside it.
      mesh.scale.setScalar(Math.min(460, camera.far * 0.85) / 460);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
