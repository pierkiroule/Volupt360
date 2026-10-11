uniform sampler2D uBrushMask;
uniform float uHasMask,uMaskAspect;
uniform float uAge;
uniform float uTime,uPigment,uOpacity,uLayer,uSeed,uFade,uStyle;
varying vec2 vUv;varying vec3 vColor,vNormal,vView,vWorld;
float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1.,0.)),f.x),mix(hash21(i+vec2(0.,1.)),hash21(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.52;for(int i=0;i<3;i++){v+=a*noise2(p);p=p*2.07+vec2(13.1,7.7);a*=.49;}return v;}
void main(){
vec2 uv=vUv;float across=abs(uv.x*2.-1.);
float wet=exp(-uAge*.035);
uv+=vec2(sin(uv.y*13.+uSeed+uTime*.22),cos(uv.x*11.+uSeed+uTime*.17))*.018*wet;
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
float engraving=step(11.5,uStyle);
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
float bloom=noise2(q*7.+vec2(uTime*.045*wet));
alpha*=mix(.38,1.35,smoothstep(.22,.7,bloom));
col*=mix(.62,1.12,middle);
if(uStyle>13.5){
  float stain=length((uv-.5)*2.);
  float silhouette=1.-smoothstep(.48+macro*.35,.72+macro*.3,stain);
  alpha*=silhouette;
  col=mix(vec3(.018,.016,.023),vec3(.19,.16,.19),sediment*.6+dry*.2);
}
alpha*=uFade*(1.-smoothstep(40.,90.,length(vView))*.28);
if(uHasMask>.5){
  vec2 maskUv=vec2(uv.x,uv.y*4.*uMaskAspect);
  float imageAlpha=texture2D(uBrushMask,maskUv).a;
  alpha*=imageAlpha;
  col*=.88+.12*imageAlpha;
}
if(alpha<.012)discard;
gl_FragColor=vec4(col,alpha);
#include <colorspace_fragment>
}
