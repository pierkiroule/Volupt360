import * as THREE from "three";

/** Directional watercolor twilight; one draw call, no textures or frame allocations. */
export function createSunsetSky() {
  const geometry = new THREE.SphereGeometry(460, 32, 16);
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    vertexShader: `varying vec3 vSky;void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 vSky;uniform float uTime;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      // Cubical direction cells, rather than longitude UVs: no meridian seam.
      float stars(vec3 d){
        vec3 cell=floor(d*145.);
        vec3 center=cell+.18+.64*vec3(hash(cell),hash(cell+7.),hash(cell+19.));
        float radius=length(d*145.-center);
        return (1.-smoothstep(.025,.17,radius))*step(.968,hash(cell+31.));
      }
      void main(){
        vec3 d=normalize(vSky);float h=d.y;
        // A long dusk, then a slow return; no abrupt reset of the atmosphere.
        float night=.5-.5*cos(uTime*.0105);
        float cloud=sin(d.x*9.+sin(d.z*7.+uTime*.0015))*sin(d.z*11.+h*13.);
        float wash=.5+.5*cloud;
        vec3 paper=vec3(.905,.871,.807);
        vec3 blue=vec3(.67,.76,.82);vec3 rose=vec3(.933,.638,.539);vec3 gold=vec3(.978,.748,.477);
        vec3 sky=mix(paper,blue,smoothstep(.02,.85,h)*.32);
        float sunset=exp(-pow((h-.035)/.2,2.));
        sky=mix(sky,mix(rose,gold,.5+.22*d.x),sunset*(.4+wash*.09));
        sky=mix(sky,vec3(.76,.77,.79),(1.-smoothstep(-.8,-.03,h))*.12);
        vec3 dusk=mix(vec3(.40,.38,.47),vec3(.15,.23,.34),smoothstep(-.1,.8,h));
        dusk=mix(dusk,vec3(.65,.42,.40),sunset*.35);
        sky=mix(sky,dusk,night*.82);
        float ridge=-.065+.008*sin(d.x*17.+d.z*8.)+.006*sin(d.z*23.);
        float horizon=exp(-pow((h-ridge)/.012,2.));
        sky=mix(sky,vec3(.66,.65,.66),horizon*.09);
        float sun=smoothstep(.998,.9998,dot(d,normalize(vec3(-.55,.09-night*.14,-1.))));
        sky=mix(sky,vec3(.98,.86,.63),sun*.5*(1.-night));
        float visibility=smoothstep(.18,.7,night)*smoothstep(.08,.38,h);
        float starlight=stars(d);
        sky+=vec3(.65,.72,.80)*starlight*visibility*.58;
        vec3 moonDirection=normalize(vec3(.48,.48,-.72));
        float distanceToMoon=length(d-moonDirection);
        float moon=1.-smoothstep(.017,.021,distanceToMoon);
        float veil=.78+.22*wash;
        sky=mix(sky,vec3(.89,.89,.80),moon*visibility*veil*.62);
        sky+=vec3(.05,.06,.08)*exp(-distanceToMoon*distanceToMoon/ .003)*visibility*.22;
        // Two diffuse northern curtains, confined above the horizon.
        float north=pow(max(0.,dot(vec3(d.x,0.,d.z)/max(.0001,length(d.xz)),normalize(vec3(-.4,0.,.9)))),4.);
        float flow=sin(d.x*5.+d.z*3.+uTime*.007)+.32*sin(d.z*11.-uTime*.004);
        float curtain=exp(-pow((h-(.46+flow*.10))/.075,2.));
        float second=exp(-pow((h-(.64+flow*.055))/.055,2.));
        float breathe=.65+.35*sin(uTime*.008+.8);
        sky+=north*visibility*breathe*(curtain*vec3(.025,.075,.062)+second*vec3(.045,.025,.065));
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
    update(camera, dt = 0) {
      material.uniforms.uTime.value += Math.max(0, Math.min(0.1, dt));
      mesh.position.copy(camera.position);
      mesh.scale.setScalar(Math.min(460, camera.far * 0.85) / 460);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      mesh.removeFromParent();
    },
  };
}
