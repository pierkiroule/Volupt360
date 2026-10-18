attribute float aPigmentSeed,aStrokeExtent;
uniform float uStrokeExtent;
uniform float uNarrativeSpiral,uNarrativeTime;
uniform vec3 uNarrativeCenter;
varying float vPigmentSeed,vStrokeExtent;
attribute vec3 aTrailCenter;
attribute float aBirth;
uniform float uWakeClock,uMaterialMode;
varying float vMaterialAge;
uniform vec3 uWakeOffset;
uniform float uTime,uSeed,uAudioEnergy,uAudioLow,uAudioPulse;
varying vec2 vUv;varying vec3 vColor;varying vec3 vNormal;varying vec3 vView;varying vec3 vWorld;
void main(){
  float pigmentSeed=aPigmentSeed>=0.?aPigmentSeed:uSeed;vPigmentSeed=pigmentSeed;vStrokeExtent=aStrokeExtent>=0.?aStrokeExtent:uStrokeExtent;
  vUv=uv;vColor=color;
  // Broad continuous waves, with a different phase and spectral envelope per deposit.
  float phase=position.y*.14+position.x*.12+position.z*.1+pigmentSeed;
  float travel=uTime*(.42+mod(pigmentSeed,3.)*.045);
  float breath=sin(phase+travel)*(.06+uAudioLow*.65)
    +sin(phase*.63-travel*.71+pigmentSeed)*uAudioPulse*.32;
  vec3 drift=vec3(sin(phase*.8+travel*.7),cos(phase*.61+travel*.58+pigmentSeed),sin(phase*.73-travel*.63));
  vMaterialAge=max(0.,uWakeClock-aBirth);
  float unfold=smoothstep(.02,mix(3.8,1.7,uMaterialMode),vMaterialAge);
  float width=.015+.985*unfold;
  vec3 deformation=normal*breath+drift*(.04+uAudioEnergy*.72);
  if(uMaterialMode>.5){
    float localPhase=uv.y*37.+uv.x*8.+pigmentSeed;
    deformation=normal*(sin(localPhase+uTime*.7)*uAudioLow*.055+sin(localPhase*1.7-uTime)*uAudioPulse*.035);
  }
  vec3 p=mix(aTrailCenter,position,width)+unfold*(deformation+uWakeOffset);
  vec4 world=modelMatrix*vec4(p,1.);
  if(uNarrativeSpiral>.001){
    vec3 q=world.xyz-uNarrativeCenter;
    float nearby=exp(-dot(q,q)/80.);
    world.xyz+=vec3(-q.z,sin(uNarrativeTime*.3+pigmentSeed)*.2,q.x)*(.025*uNarrativeSpiral*nearby*sin(uNarrativeTime*.23));
  }
  vec4 mv=viewMatrix*world;
  vView=-mv.xyz;vNormal=normalize(normalMatrix*normal);vWorld=world.xyz;
  gl_Position=projectionMatrix*mv;
}
