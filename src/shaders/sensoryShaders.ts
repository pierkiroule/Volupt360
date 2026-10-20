export const field = /* glsl */ `
uniform float uTime; uniform vec4 uA; uniform vec4 uB;
uniform vec3 uColor0; uniform vec3 uColor1; uniform vec3 uColor2;
uniform float uSoftness; uniform float uStretch; uniform float uDensity;
uniform vec3 uTouch; uniform float uTouchTime;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
vec3 flow(vec3 p){
 float t=uTime; float wave=sin(p.x*.6+t)*cos(p.z*.4-t*.7);
 float irregularity=(uB.w+1.)*.5;
 float weave=sin(p.y*.8+t*.31)*cos(p.x*.5-p.z*.2+t*.17);
 float rigidity=max(0.,-uA.z);
 p.x*=1.+uA.y*.22; p.y*=uStretch;
 p+=vec3(sin(p.y*.7+t*.8),wave,cos(p.x*.6-t*.6))*(.22+(uA.z+1.)*.35);
 p.y+=sin(t*.45+p.z*.2)*.25-uA.x*.45;
 p+=vec3(weave,wave,-weave)*irregularity*.32;
 p.x+=sin(p.y*2.+t)*max(0.,-uB.y)*.12;
 p.z*=1.+uB.z*.3;
 p+=vec3(wave,sin(p.z+t*2.),0.)*rigidity*.08;
 float age=max(0.,t-uTouchTime);float ring=exp(-pow(length(p-uTouch)-age*1.2,2.)*2.)*exp(-age*.65);
 p+=normalize(p-uTouch+vec3(.001))*ring*.35;
 return p;
}
`;
export const veilVertex = /* glsl */ `${field}
varying vec2 vUv; varying float vLayer;
void main(){vUv=uv;vec4 p=instanceMatrix*vec4(position,1.);vLayer=fract(instanceMatrix[3].z*.137);p.xyz=flow(p.xyz);gl_Position=projectionMatrix*modelViewMatrix*p;}`;
export const veilFragment = /* glsl */ `${field}
varying vec2 vUv;varying float vLayer;
void main(){
 vec2 q=(vUv-.5)*2.; float n=noise(vec3(q*3.,vLayer*9.+uTime*.06));
 float edge=1.-smoothstep(mix(.6,.12,uSoftness),.97,length(q*vec2(.92,1.05))+(n-.5)*.23);
 edge*=smoothstep(0.,.18,vUv.x)*smoothstep(0.,.18,1.-vUv.x)*smoothstep(0.,.18,vUv.y)*smoothstep(0.,.18,1.-vUv.y);
 float folds=sin(q.x*7.+q.y*2.+n*5.+uTime*.12)*.5+.5;
 float pigment=noise(vec3(q*14.,vLayer*18.));float grain=noise(vec3(gl_FragCoord.xy*.55,vLayer));
 float tide=exp(-pow(length(q)+n*.11-.72,2.)*180.);
 float alpha=edge*(.18+folds*.24+pigment*.14+tide*.09)*( .55+uDensity)*(.8+grain*.2);
 alpha*=mix(.9,1.2,1.-uSoftness);
 alpha*=smoothstep(.15,.65,pigment+(uB.y+1.)*.32);
 vec3 color=mix(uColor0,uColor1,n);color=mix(color,uColor2,folds*.35);
 color*=1.-tide*.13-pigment*.07;
 gl_FragColor=vec4(color,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
export const pointVertex = /* glsl */ `${field}
attribute float aSeed; varying float vSeed;
void main(){vSeed=aSeed;vec3 p=flow(position);p+=vec3(sin(uTime+aSeed*40.),cos(uTime*.7+aSeed*21.),sin(uTime*.5+aSeed*30.))*.15;
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=min(7.,(.5+aSeed*1.2)*48./max(1.,-mv.z));gl_Position=projectionMatrix*mv;}`;
export const pointFragment = /* glsl */ `${field}
varying float vSeed;
void main(){float d=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.05,1.,d))*(.12+vSeed*.1);gl_FragColor=vec4(mix(uColor0,uColor2,vSeed),a);}`;
export const lineVertex = /* glsl */ `${field}
void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(flow(position),1.);}`;
export const lineFragment = /* glsl */ `${field}
void main(){gl_FragColor=vec4(uColor0,.12+uDensity*.1);}`;
