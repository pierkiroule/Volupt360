varying vec3 vNormal;varying vec3 vWorld;varying vec3 vTint;
void main(){vNormal=normalize(normalMatrix*normal);vTint=instanceColor;
vec4 p=modelViewMatrix*instanceMatrix*vec4(position,1.0);vWorld=p.xyz;
gl_Position=projectionMatrix*p;}
