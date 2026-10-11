varying vec3 vColor;varying float vAlpha;uniform float uFade;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){vec2 q=gl_PointCoord*2.0-1.0;float r=length(q);float grain=hash(floor(gl_PointCoord*17.0));
float ragged=r+(grain-.5)*.15;float edge=1.0-smoothstep(.50,.98,ragged);
float sediment=.72+.28*grain;float ring=smoothstep(.42,.78,r)*.25;
float a=edge*(sediment+ring)*vAlpha*uFade;
if(a<.018)discard;gl_FragColor=vec4(vColor*(.86-.18*ring),a);
#include <colorspace_fragment>}
