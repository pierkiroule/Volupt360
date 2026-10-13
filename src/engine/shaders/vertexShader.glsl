uniform float uAudioEnergy,uAudioLow;
varying vec2 vUv;varying vec3 vColor;varying vec3 vNormal;varying vec3 vView;varying vec3 vWorld;
void main(){vUv=uv;vColor=color;vec4 mv=modelViewMatrix*vec4(position+normal*sin(position.y*1.3+position.x*.7)*uAudioLow*.16,1.);vView=-mv.xyz;vNormal=normalize(normalMatrix*normal);vWorld=(modelMatrix*vec4(position+normal*sin(position.y*1.3+position.x*.7)*uAudioLow*.16,1.)).xyz;gl_Position=projectionMatrix*mv;}
