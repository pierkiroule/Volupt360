export const field = /* glsl */ `
uniform float uTime; uniform vec4 uA; uniform vec4 uB;
uniform vec3 uColor0; uniform vec3 uColor1; uniform vec3 uColor2;
uniform float uSoftness; uniform float uStretch; uniform float uDensity;
uniform vec3 uTouch; uniform float uTouchTime;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float pigment(vec3 p){return noise(p)*.58+noise(p*2.07)*.28+noise(p*4.13)*.14;}
vec3 flow(vec3 p){
 float t=uTime,irregularity=(uB.w+1.)*.5;
 vec3 drift=vec3(sin(p.y*.31+t*.55)+cos(p.z*.24-t*.28),sin(p.z*.28+t*.4),cos(p.x*.3+t*.38)-sin(p.y*.22-t*.32));
 p.x*=1.+uA.y*.17;p.y*=1.+(uStretch-1.)*.36;p.z*=1.+uB.z*.2;
 p+=drift*(.55+(uA.z+1.)*.4);
 p.y-=uA.x*.35;
 p+=vec3(sin(p.z*.8+t),cos(p.x*.7-t*.8),sin(p.y*.6+t*.7))*irregularity*.22;
 float age=max(0.,t-uTouchTime);float ring=exp(-pow(length(p-uTouch)-age*1.4,2.)*1.2)*exp(-age*.65);
 p+=normalize(p-uTouch+vec3(.001))*ring*.65;return p;
}
vec3 colors(float x){return mix(mix(uColor0,uColor1,smoothstep(.1,.75,x)),uColor2,smoothstep(.58,1.,x)*.72);}
`;
export const cloudVertex = /* glsl */ `${field}
varying vec3 vLocal;varying vec3 vWorld;varying vec3 vNormal;varying float vSeed;
void main(){vLocal=position;vSeed=fract(instanceMatrix[3].x*.137+instanceMatrix[3].z*.271);vec3 p=position*(1.+sin(position.y*4.+uTime*.4+vSeed*8.)*.22+sin(position.x*3.-position.z*4.+uTime*.2)*.16);vec3 world=(instanceMatrix*vec4(p,1.)).xyz;world=flow(world);vWorld=world;vNormal=normalize(mat3(instanceMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`;
export const cloudFragment = /* glsl */ `${field}
varying vec3 vLocal;varying vec3 vWorld;varying vec3 vNormal;varying float vSeed;
void main(){
 float n=pigment(vLocal*2.6+vec3(vSeed*12.,uTime*.07,0.));
 float facing=abs(dot(normalize(vNormal),normalize(cameraPosition-vWorld)));
 float granule=noise(vLocal*38.+vSeed*7.);
 float wash=smoothstep(.34,.72,n)*(.22+.28*facing);
 float tide=exp(-pow(n-.44,2.)*1100.)*.32;
 float dry=sin(uTime*.17+vSeed*6.)*.5+.5;
 vec3 color=colors(clamp(vSeed*.6+n*.45,0.,1.));
 color*=1.-tide*.5-granule*.1*dry;
 float opacity=wash*(.45+uDensity*.4)*smoothstep(.02,.35,facing)*( .82+granule*.18);
 gl_FragColor=vec4(color,opacity);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
export const ribbonVertex = /* glsl */ `${field}
attribute float aSeed;varying vec2 vUv;varying float vSeed;varying vec3 vWorld;
void main(){vUv=uv;vSeed=aSeed;vWorld=flow(position);gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`;
export const ribbonFragment = /* glsl */ `${field}
varying vec2 vUv;varying float vSeed;varying vec3 vWorld;
void main(){
 float n=pigment(vec3(vUv.x*9.,vUv.y*3.,vSeed*12.+uTime*.06));
 float edge=abs(vUv.y-.5)*2.;float irregular=edge+(n-.5)*.24;
 float border=1.-smoothstep(.55,.99,irregular);
 float age=fract(uTime*.025+vSeed),head=age*1.65;
 float painting=1.-smoothstep(head-.13,head+.04,vUv.x);
 float fade=smoothstep(0.,.09,age)*(1.-smoothstep(.83,1.,age));
 float tide=exp(-pow(irregular-.73,2.)*240.);
 float granule=noise(vec3(vUv*vec2(180.,26.),vSeed*20.));
 float alpha=border*(.18+n*.22+tide*.18)*(.5+uDensity)*mix(.2,1.,painting*fade);
 vec3 color=colors(fract(vSeed*.8+vUv.x*.22+n*.18));color*=1.-tide*.4-granule*.1;
 gl_FragColor=vec4(color,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
export const inkFragment = /* glsl */ `${field}
varying vec2 vUv;varying float vSeed;varying vec3 vWorld;
void main(){float edge=1.-smoothstep(.3,1.,abs(vUv.y-.5)*2.);float wet=sin(vUv.x*22.-uTime*.65+vSeed*8.)*.5+.5;vec3 color=colors(vSeed)*.48;gl_FragColor=vec4(color,edge*(.12+wet*.2));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
export const pointVertex = /* glsl */ `${field}
attribute float aSeed;varying float vSeed;
void main(){vSeed=aSeed;vec3 p=flow(position);p+=vec3(sin(uTime*.7+aSeed*40.),cos(uTime*.5+aSeed*21.),sin(uTime*.6+aSeed*30.))*(.4+aSeed*.45);vec4 mv=viewMatrix*vec4(p,1.);gl_PointSize=min(22.,(1.+aSeed*4.)*65./max(1.,-mv.z));gl_Position=projectionMatrix*mv;}`;
export const pointFragment = /* glsl */ `${field}
varying float vSeed;
void main(){vec2 q=gl_PointCoord-.5;float n=noise(vec3(q*9.,vSeed*30.));float d=length(q)*2.+(n-.5)*.28;float alpha=(1.-smoothstep(.3,1.,d))*(.12+vSeed*.18);gl_FragColor=vec4(colors(vSeed),alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
