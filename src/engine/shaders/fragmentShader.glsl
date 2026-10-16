uniform float uAudioEnergy,uAudioLow,uAudioPulse;
uniform sampler2D uBrushMask;
uniform float uPhotograph;
uniform float uHasMask,uMaskAspect,uMaskRepeat;
uniform float uAge,uSurprise;
uniform float uTime,uPigment,uOpacity,uLayer,uSeed,uFade,uStyle;
varying vec2 vUv;varying vec3 vColor,vNormal,vView,vWorld;
float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1.,0.)),f.x),mix(hash21(i+vec2(0.,1.)),hash21(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.52;for(int i=0;i<3;i++){v+=a*noise2(p);p=p*2.07+vec2(13.1,7.7);a*=.49;}return v;}
void main(){
vec2 uv=vUv;
uv+=vec2(sin(uTime*.075+uSeed+uv.y*3.),cos(uTime*.053+uSeed+uv.x*4.))*(.009+.012*uAudioEnergy);
float across=abs(uv.x*2.-1.);
float dryingRate=uStyle>19.5?.035:(uStyle<.5?.028:(uStyle<4.? .055:(uStyle<11.? .038:.085)));
float wet=exp(-uAge*dryingRate);
float settled=1.-wet;
uv+=vec2(sin(uv.y*13.+uSeed+uAge*.22),cos(uv.x*11.+uSeed+uAge*.17))*.018*wet;
vec2 q=uv*vec2(3.7,2.9)+vec2(uSeed*1.71,uSeed*.37);
float macro=fbm(q),middle=noise2(q*3.4+9.7),micro=noise2(q*18.3+2.3);
float fibres=noise2(vec2(q.x*62.,q.y*4.))*.55+noise2(q*vec2(16.,130.))*.45;
float vein=pow(1.-abs(sin(uv.x*(22.+uStyle*8.)+middle*5.+uv.y*(3.+uStyle))),14.);
float threads=pow(1.-abs(sin(uv.x*105.+uv.y*12.+middle*4.)),22.);
float tidepool=noise2(q*vec2(2.1,5.7)+vec2(middle*3.,0.));
float wobble=(macro-.5)*(.17+.025*uStyle)+(middle-.5)*.13+sin(uv.y*(6.+uStyle*2.)+macro*7.)*.035;
float edge=across+wobble;
float body=1.-smoothstep(.79,1.04,edge);
float tide=smoothstep(.58,.98,edge)*body;
float pool=smoothstep(.40,.79,macro*.50+middle*.25+tidepool*.25);
float sediment=pow(max(0.,micro*.65+fibres*.35),2.2);
float reserve=smoothstep(.14,.32,middle+.12*micro);
float stripes=pow(abs(sin(uv.x*(8.+uStyle*6.)+uv.y*(1.2+uStyle*.8)+macro*4.)),3.);
float mottling=macro*.6+middle*.4;
// Motifs organiques discrets : cellules végétales, nervures, membranes, mycélium.
float cells=abs(sin(q.x*8.+middle*5.)*cos(q.y*9.+middle*7.));
float cellular=pow(1.-cells,5.);
float veins=pow(1.-abs(sin(q.x*12.+q.y*3.+middle*8.)),16.);
float organic=mix(cellular,veins,step(2.5,mod(floor(uStyle+0.5),5.)));
// Matières spécifiques : Botanique nervures ramifiées, Gravure traits fins encre.
float botanical=step(5.5,uStyle)*(1.-step(11.5,uStyle));
float engraving=step(11.5,uStyle)*(1.-step(15.5,uStyle));
float midrib=pow(1.-abs(uv.x*2.-1.),18.);
float sideVeins=pow(1.-abs(sin(uv.y*18.+abs(uv.x-.5)*21.+middle*2.)),24.);
float etching=pow(1.-abs(sin(uv.x*88.+uv.y*7.+middle*1.8)),30.);

organic*=smoothstep(.28,.7,macro);
float pigment=(.38+.52*pool+.40*sediment+.48*tide+.20*vein+.16*stripes+.20*mottling+.22*organic)*(1.-.32*reserve);
float dry=1.-smoothstep(.10,.32,micro*.55+middle*.45);
float granules=step(.84,hash21(floor(q*vec2(125.,150.))))*micro;
vec3 base=vColor;
vec3 dark=base*mix(vec3(.30,.39,.49),vec3(.53,.33,.38),clamp(uStyle/5.,0.,1.));
vec3 col=mix(base,dark,clamp(.38*pool+.52*tide+.25*sediment+.18*granules+.19*vein+.09*threads+.21*organic,0.,.92));
col=mix(col,vec3(.97,.95,.89),.18*dry+.09*(1.-reserve));
col*=1.-botanical*(.24*midrib+.14*sideVeins);
col*=1.-engraving*(.22*etching+.12*threads);
col=mix(col,vec3(.075,.065,.055),engraving*.65);
col*=.94+.10*micro;
float light=.86+.14*abs(dot(normalize(vNormal),normalize(vView)));
col*=light;
float alpha=body*clamp((.27+.49*pool+.31*sediment+.23*tide+.08*vein-.18*dry)*uPigment,0.,1.)*uOpacity;
alpha*=mix(1.,.86,botanical);alpha*=mix(1.,.95,engraving);
if(uLayer>0.5){alpha*=.42;col=mix(col,vec3(.95,.92,.86),.34);}
// Brush-specific transparency, independent from the geometric silhouette.
if(abs(uStyle-1.)<.1){float mist=length((uv-.5)*vec2(1.7,1.8));alpha*=1.-smoothstep(.15,.65,mist);col=mix(col,vec3(.94,.92,.88),.22);}
if(abs(uStyle-2.)<.1){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),2.);alpha*=.28+rim*.9;col=mix(col,vec3(.72,.88,.84),.25+rim*.2);}
if(abs(uStyle-3.)<.1){alpha*=.75+.25*sediment;col*=.91+.09*sin(uv.y*45.+middle*4.);}
// Broken pigment, dark pools and paper reserves evolve as each deposit dries.
float bloom=noise2(q*7.+vec2((1.-wet)*1.3));
alpha*=mix(.38,1.35,smoothstep(.22,.7,bloom));
col*=mix(.62,1.12,middle);
// Wet diffusion settles into dark tide lines and dry granular deposits.
float dryPigment=clamp(tide*.65+sediment*.55+granules*.3,0.,1.);
col=mix(col,col*(.65+.3*micro),settled*dryPigment);
alpha*=mix(1.,.85+dryPigment*.3,settled);
col=mix(col,base,.12*wet*(1.-pool));
if(uStyle>13.5 && uStyle<15.5){
  float stain=length((uv-.5)*2.);
  float silhouette=1.-smoothstep(.48+macro*.35,.72+macro*.3,stain);
  alpha*=silhouette;
  col=mix(vec3(.018,.016,.023),vec3(.19,.16,.19),sediment*.6+dry*.2);
}
if(abs(uStyle-16.)<.1){
  float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),2.);
  vec3 spectrum=.5+.5*cos(6.283*(uv.y+uv.x*.3+uSeed*.11)+vec3(0.,2.1,4.2));
  col=mix(base,spectrum,.85);alpha=(.045+rim*.95)*uOpacity;
}else if(abs(uStyle-17.)<.1){
  vec3 spectrum=.5+.5*cos(uv.x*4.+uv.y*7.+uSeed+vec3(0.,2.,4.));
  col=mix(base,spectrum,.55);alpha*=.6+.4*sin(uv.x*35.+middle*3.)*sin(uv.x*35.+middle*3.);
}else if(abs(uStyle-18.)<.1){
  col=mix(base*.24,base,.35+sediment*.3);alpha*=1.15;
}else if(abs(uStyle-19.)<.1){
  col=mix(base*.32,base,.5+.3*micro);alpha=uOpacity*(.68+.25*micro);
}else if(abs(uStyle-20.)<.1){
  float diffusion=1.-smoothstep(.2,.98,across+(macro-.5)*.15);
  float bloomRing=exp(-pow((across-.55-middle*.12)/.1,2.));
  col=mix(base*.65,base,.35+.4*macro);alpha*=diffusion*(.65+bloomRing*.55);
}else if(abs(uStyle-21.)<.1){
  col=mix(base*.5,base,.4+.35*middle);alpha*=.72+.28*pow(abs(sin(uv.y*24.+uSeed)),2.);
}
// Strengthen translucent pigment before fading; preserve bubble centers.
if(abs(uStyle-16.)>.1)alpha=1.-pow(1.-pow(clamp(alpha,0.,1.),.8),1.65);
alpha*=uFade*(1.-smoothstep(40.,90.,length(vView))*.28);
// Brief, localized botanical lace, pigment halos and amber constellations.
float window=1.-smoothstep(.12,.3,abs(vUv.y-.55));
if(uSurprise>.5 && uSurprise<1.5){
  float halo=exp(-pow((length((vUv-.5)*vec2(1.2,2.))-.22)/.025,2.))*window;
  col=mix(col,vec3(.65,.38,.12),halo*.65);alpha=max(alpha,halo*.22*uFade*uOpacity);
}else if(uSurprise>1.5 && uSurprise<2.5){
  float stars=step(.985,hash21(floor(vUv*vec2(29.,53.))+uSeed))*window;
  col=mix(col,vec3(.8,.54,.2),stars*.85);alpha=max(alpha,stars*.45*uFade*uOpacity);
}else if(uSurprise>2.5){
  float lace=pow(1.-abs(sin(vUv.x*32.+vUv.y*17.+middle*3.)),18.)*window;
  alpha*=1.-lace*.75;col=mix(col,vec3(.85,.79,.64),lace*.45);
}
if(uHasMask>.5){
  vec2 maskUv=uPhotograph>.5 ? clamp(vUv,vec2(.001),vec2(.999)) : vec2(uv.x,uv.y*uMaskRepeat*uMaskAspect);
  vec4 photograph=texture2D(uBrushMask,maskUv);
  float imageAlpha=photograph.a;
  if(uPhotograph>.5)col=mix(col,photograph.rgb,.9);
  // Preserve empty mask areas while giving semi-transparent grain more body.
  alpha*=1.-pow(1.-imageAlpha,1.9);
  col*=.88+.12*imageAlpha;
}
col*=1.-uAudioLow*.16;
col=mix(col,base,.12*uAudioPulse);
alpha*=.8+uAudioEnergy*.42+uAudioPulse*.22;
if(alpha<.012)discard;
gl_FragColor=vec4(col,alpha);
#include <colorspace_fragment>
}
