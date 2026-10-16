uniform float uTime,uSeed,uAudioEnergy,uAudioLow,uAudioPulse;
varying vec2 vUv;varying vec3 vColor;varying vec3 vNormal;varying vec3 vView;varying vec3 vWorld;
void main(){
  vUv=uv;vColor=color;
  float phase=position.y*.85+position.x*.55+uSeed+uTime*(.16+mod(uSeed,3.)*.025);
  float breath=sin(phase)*(.045+uAudioLow*.3)+sin(phase*2.1-uTime*.22)*uAudioPulse*.13;
  vec3 p=position+normal*breath;
  vec4 mv=modelViewMatrix*vec4(p,1.);
  vView=-mv.xyz;vNormal=normalize(normalMatrix*normal);vWorld=(modelMatrix*vec4(p,1.)).xyz;
  gl_Position=projectionMatrix*mv;
}
