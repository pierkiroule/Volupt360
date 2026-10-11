attribute float aSize;attribute float aAlpha;varying vec3 vColor;varying float vAlpha;uniform float uScale;
void main(){vColor=color;vAlpha=aAlpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;
gl_PointSize=clamp(aSize*uScale*(25.0/max(1.0,-mv.z)),1.0,32.0);}
