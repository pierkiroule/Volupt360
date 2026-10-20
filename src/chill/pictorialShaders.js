/** Local fields keep the drawing anchored; the water and pigment move within it. */
export const pictorialVertex = `
attribute vec3 data,centerLine; attribute float motif; uniform float time; uniform float bands[6];uniform float accent;
varying vec3 C;varying vec2 U;varying float A,M,E,P;
float band(float index){float e=0.;for(int i=0;i<6;i++){if(abs(float(i)-index)<.1)e=bands[i];}return e;}
void main(){float e=band(data.x);float phase=uv.x*22.+data.z*1.71;vec3 offset=position-centerLine;
float crest=.5+.5*sin(phase-time*(.8+e*.9));
float swell=1.+e*(.2+crest*.75)+accent*e*.22;
vec3 p=centerLine+offset*swell;
float motion=sin(phase-time*.8)*.06;
if(motif<.5){motion=sin(phase+time*.6)*.12;}
else if(motif<1.5){motion=sin(phase-time*1.8)*(.1+e*.5);}
else if(motif<2.5){motion=(.5+.5*sin(phase-time*2.8))*(.12+e*.7);}
else if(motif<3.5){motion=sin(phase+time*.35)*.045;}
else if(motif<4.5){motion=sin(phase+time*.25)*.025;}
else if(motif<5.5){motion=sin(phase+time*.75)*(.12+e*.3);}
else if(motif<6.5){motion=sin(phase*.3+time*.25)*(.12+e*.4);}
else if(motif<7.5){motion=sin(phase*3.-time*2.)*(.04+e*.25);}
else if(motif<8.5){p.x+=cos(phase+time*.6)*e*.25;motion=sin(phase+time*.6)*.13;}
else if(motif<9.5){motion=sin(phase*2.-time*1.5)*(.05+e*.25);}
else if(motif<10.5){motion=sin(phase+time*.5)*.1;}
else{motion=sin(phase*.5+time*.6)*.07;}
p.y+=motion;C=color;U=uv;A=data.y;M=motif;E=e;P=data.z;
gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;

export const pictorialFragment = `
uniform sampler2D wetPlate,dryPlate;uniform float time,accent;
varying vec3 C;varying vec2 U;varying float A,M,E,P;
void main(){
float stream=.5+.5*sin(U.x*25.-time*(.65+E));
vec2 flow=vec2(U.y,fract(U.x*5.+P*.173));
flow.x+=sin(U.x*15.-time*.3+P)*(.012+E*.023);
vec4 wet=texture2D(wetPlate,flow),dry=texture2D(dryPlate,flow);
float wetness=.25+E*.4+stream*.15;
vec4 pigment=mix(dry,wet,wetness);
float edge=1.-abs(U.y*2.-1.);
float tooth=.6+.4*pigment.g;
float rim=pow(1.-edge,3.)*pigment.b;
vec3 tint=C*mix(1.06,.46,pigment.r*.55+rim*.45);
if(M>1.5&&M<2.5){float heat=.5+.5*sin(U.x*25.-time*2.8);tint=mix(tint,vec3(.88,.29,.055),heat*.65);}
if(M>.5&&M<1.5){tint=mix(tint,vec3(.26,.59,.72),stream*.3);}
float capillary=1.-smoothstep(.015,.065,abs(pigment.r-(.43+sin(time*.16+P)*.04)));
float coverage=pigment.a*(.65+.35*edge)*tooth;
float alpha=A*coverage*(1.18+E*.35+stream*.15)+capillary*A*.055;
gl_FragColor=vec4(tint,clamp(alpha,0.,.9));}`;

export const pigmentParticleVertex = `
attribute vec3 particleData;attribute float motif,seed;uniform float time,accent,pixelRatio;uniform float bands[6];
varying vec3 C;varying float A,M;
void main(){float e=0.;for(int i=0;i<6;i++){if(abs(float(i)-particleData.x)<.1)e=bands[i];}
float age=fract(time*(.06+seed*.045)+seed),envelope=sin(age*3.14159);
float radius=(.1+age*.7)*(.4+e*1.1);vec3 p=position;
vec3 drift=vec3(cos(seed*45.+time*.5),sin(seed*19.+time*.4),sin(seed*31.+time*.3));
if(motif>1.5&&motif<2.5){drift.y=age*2.;}
else if(motif<.5){drift.y=age*1.2;}
else if(motif>.5&&motif<1.5){drift.y=sin(seed*9.-time*1.3)*.3;}
else if(motif>7.5&&motif<8.5){drift=vec3(cos(age*6.28+seed*12.),sin(age*6.28+seed*12.),sin(seed*19.));}
p+=drift*radius;vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
gl_PointSize=clamp(particleData.z*(.8+e*.8+accent*.25)*pixelRatio*180./max(1.,-view.z),1.,16.);
C=color;A=particleData.y*envelope*(.3+e*.55);M=motif;}`;
export const pigmentParticleFragment = `
varying vec3 C;varying float A,M;
void main(){float r=length(gl_PointCoord-.5)*2.;float shape=1.-smoothstep(.15,1.,r);
if(M<.5)shape=exp(-pow((r-.65)*8.,2.));
gl_FragColor=vec4(C,A*shape);}`;
