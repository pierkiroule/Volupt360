uniform float uFade;varying vec3 vNormal,vWorld,vTint;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
void main(){vec3 n=normalize(vNormal);float facing=abs(dot(n,normalize(-vWorld)));
float grain=hash(floor(n*63.0));float wash=hash(floor(n*13.0));
float rim=pow(1.0-facing,2.1);float highlight=pow(max(0.0,dot(n,normalize(vec3(-.6,.8,.5)))),5.0);
vec3 col=mix(vTint,vec3(1.0,.87,.72),.19*wash+.22*highlight);
col*=.78+.22*grain-.22*rim;
float alpha=(.17+.19*wash+.21*rim+.10*highlight)*uFade;
gl_FragColor=vec4(col,clamp(alpha,0.0,.83));
#include <colorspace_fragment>}
