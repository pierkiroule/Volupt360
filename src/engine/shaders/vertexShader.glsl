attribute vec3 aTrailCenter;
attribute float aBirth;
uniform float uWakeClock;
uniform vec3 uWakeOffset;
uniform float uTime,uSeed,uAudioEnergy,uAudioLow,uAudioPulse;
varying vec2 vUv;varying vec3 vColor;varying vec3 vNormal;varying vec3 vView;varying vec3 vWorld;
void main(){
  vUv=uv;vColor=color;
  // Broad continuous waves, with a different phase and spectral envelope per deposit.
  float phase=position.y*.14+position.x*.12+position.z*.1+uSeed;
  float travel=uTime*(.42+mod(uSeed,3.)*.045);
  float breath=sin(phase+travel)*(.06+uAudioLow*.65)
    +sin(phase*.63-travel*.71+uSeed)*uAudioPulse*.32;
  vec3 drift=vec3(sin(phase*.8+travel*.7),cos(phase*.61+travel*.58+uSeed),sin(phase*.73-travel*.63));
  float unfold=smoothstep(.08,3.8,max(0.,uWakeClock-aBirth));
  float width=.015+.985*unfold;
  vec3 p=mix(aTrailCenter,position,width)+unfold*(normal*breath+drift*(.04+uAudioEnergy*.72)+uWakeOffset);
  vec4 mv=modelViewMatrix*vec4(p,1.);
  vView=-mv.xyz;vNormal=normalize(normalMatrix*normal);vWorld=(modelMatrix*vec4(p,1.)).xyz;
  gl_Position=projectionMatrix*mv;
}
