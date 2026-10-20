import * as THREE from "three";

/** Shared, bounded GPU field: drifting pigment seeds and unfurling ink streamers. */
export function createSensoryCurrents() {
  const group = new THREE.Group();
  let hosts = [], meshes = [];
  const uniforms = { time: { value: 0 } };
  const deformation = `
    attribute vec3 anchor; attribute float energy; attribute float seed;
    varying vec3 tint; varying float alpha;
    uniform float time;
    vec3 drift(float age, float s) {
      float a=s*6.283+age*2.8;
      return vec3(cos(a)*(.5+age*3.), sin(age*4.+s*9.)*(.4+age*2.), sin(a*.8)*(.5+age*3.));
    }
  `;
  function clear() {
    for (const mesh of meshes) { mesh.geometry.dispose(); mesh.material.dispose(); }
    meshes = []; hosts = []; group.clear();
  }
  function build(particles) {
    const perHost = particles ? 144 : 6 * 33 * 2;
    const count = hosts.length * perHost;
    const geometry = new THREE.BufferGeometry();
    for (const [name, size] of [["position",3],["anchor",3],["color",3],["energy",1],["seed",1]])
      geometry.setAttribute(name, new THREE.BufferAttribute(new Float32Array(count * size), size));
    const indices = [], color = new THREE.Color();
    for (let h=0; h<hosts.length; h++) {
      color.set(hosts[h].entry.color).multiplyScalar(.72);
      for (let j=0; j<perHost; j++) {
        const k=h*perHost+j;
        geometry.attributes.color.setXYZ(k,color.r,color.g,color.b);
        geometry.attributes.seed.setX(k, particles ? ((j*.618034+h*.137)%1) : (Math.floor(j/66)*.167+h*.137)%1);
        geometry.attributes.position.setXYZ(k,particles ? j/144 : Math.floor((j%66)/2)/32,particles ? 0 : j%2,0);
        if (!particles && j%66<64 && j%2===0) indices.push(k,k+1,k+2,k+1,k+3,k+2);
      }
    }
    if (!particles) geometry.setIndex(indices);
    const material = new THREE.ShaderMaterial({
      transparent:true, depthWrite:false, vertexColors:true, side:THREE.DoubleSide,
      uniforms,
      vertexShader: deformation + (particles ? `
        void main(){
          float age=fract(time*.045+seed+position.x*.19);
          float envelope=sin(age*3.14159);
          vec3 p=anchor+drift(age,seed)*(1.+energy*.55);
          vec4 view=modelViewMatrix*vec4(p,1.);
          gl_Position=projectionMatrix*view;
          gl_PointSize=clamp((24.+energy*15.)*envelope/max(1.,-view.z),1.,14.);
          tint=color; alpha=envelope*(.42+energy*.35);
        }` : `
        varying vec2 uvTrail;
        void main(){
          float age=fract(time*.035+seed);
          float t=position.x;
          float path=max(0.,age-t*.32);
          vec3 p=anchor+drift(path,seed)*(1.+energy*.45);
          float width=sin(t*3.14159)*sin(age*3.14159)*(.08+energy*.09);
          p+=vec3(position.y*2.-1.,sin(seed*12.),cos(seed*8.)) * width;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
          tint=color; alpha=smoothstep(0.,.15,age)*(1.-smoothstep(.75,1.,age))*sin(t*3.14159)*.42;
          uvTrail=vec2(t,position.y);
        }`),
      fragmentShader: particles ? `varying vec3 tint; varying float alpha;
        void main(){float r=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.15,1.,r))*alpha;gl_FragColor=vec4(tint,a);}` :
        `varying vec3 tint; varying float alpha; varying vec2 uvTrail;
        void main(){float edge=1.-abs(uvTrail.y*2.-1.);float grain=.65+.35*sin(uvTrail.x*173.+sin(uvTrail.y*21.));gl_FragColor=vec4(tint,alpha*edge*grain);}`,
    });
    const mesh = particles ? new THREE.Points(geometry,material) : new THREE.Mesh(geometry,material);
    mesh.frustumCulled=false; mesh.userData.sensoryCurrent=particles?"seeds":"streamers";
    group.add(mesh);meshes.push(mesh);
  }
  return {
    group,
    get stats(){return {hosts:hosts.length,particles:hosts.length*144,filaments:hosts.length*6,drawCalls:meshes.length};},
    setNodes(nodes){clear();hosts=nodes.filter((_,i)=>i%Math.max(1,Math.ceil(nodes.length/24))===0).slice(0,24);if(hosts.length){build(true);build(false);}},
    update(time){
      uniforms.time.value=time;
      for(const mesh of meshes){
        const a=mesh.geometry.attributes, perHost=a.energy.count/hosts.length;
        for(let h=0;h<hosts.length;h++){
          const n=hosts[h],p=n.object.position;
          for(let j=0;j<perHost;j++){const k=h*perHost+j;a.anchor.setXYZ(k,p.x,p.y,p.z);a.energy.setX(k,n.energy);}
        }
        a.anchor.needsUpdate=a.energy.needsUpdate=true;
      }
    },
    clear, dispose:clear,
  };
}
