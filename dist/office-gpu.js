/* Original WebGL room renderer. Local, dependency-free: depth buffer, shadow map,
   procedural wood/stone/leather/fabric materials and linear-light shading. */
(function(root){'use strict';
const VERT=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;attribute float aMaterial;
uniform mat4 uView;uniform mat4 uLight;varying vec3 vP;varying vec3 vN;varying vec3 vC;varying float vM;varying vec4 vS;
void main(){vP=aPosition;vN=aNormal;vC=aColor;vM=aMaterial;vS=uLight*vec4(aPosition,1.0);gl_Position=uView*vec4(aPosition,1.0);}`;
const FRAG=`precision highp float;
varying vec3 vP;varying vec3 vN;varying vec3 vC;varying float vM;varying vec4 vS;
uniform sampler2D uShadow;uniform vec3 uEye;uniform float uMode;uniform float uTime;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float unpack(vec4 c){return dot(c.rgb,vec3(1.0,1.0/255.0,1.0/65025.0));}
float shadow(vec3 n){vec3 q=vS.xyz/vS.w*.5+.5;if(q.x<0.0||q.x>1.0||q.y<0.0||q.y>1.0||q.z>1.0)return 1.0;float s=0.0;float bias=.0015+.003*(1.0-max(0.0,dot(n,normalize(vec3(-3.0,4.3,2.0)-vP))));for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){float d=unpack(texture2D(uShadow,q.xy+vec2(float(x),float(y))/1024.0));s+=q.z-bias<d?1.0:.18;}return s/9.0;}
vec3 light(vec3 n,vec3 p,vec3 color,float power,float rough){vec3 delta=p-vP;float d=length(delta);vec3 l=delta/max(d,.01);vec3 h=normalize(l+normalize(uEye-vP));float diffuse=max(dot(n,l),0.0);float spec=pow(max(dot(n,h),0.0),mix(95.0,9.0,rough))*(1.0-rough)*.45;return color*(diffuse+spec)*power/(1.0+d*d*.23);}
void main(){vec3 n=normalize(vN);vec3 c=pow(vC,vec3(2.2));float rough=.72;float tex=1.0;vec3 p=vP;
 if(vM>.5&&vM<1.5){float grain=noise(vec3(p.x*48.0,p.y*4.0,p.z*2.5));float fine=noise(vec3(p.x*160.0,p.y*5.0,p.z*9.0));tex=.83+.17*grain+.07*fine;rough=.36;n=normalize(n+vec3((fine-.5)*.045,0.0,(grain-.5)*.02));}
 if(vM>1.5&&vM<2.5){tex=.94+.06*noise(p*85.0);rough=.88;}
 if(vM>2.5&&vM<3.5){tex=.75+.25*noise(p*95.0);rough=.5;}
 if(vM>3.5&&vM<4.5){rough=.18;tex=.92+.08*noise(p*30.0);}
 if(vM>4.5&&vM<5.5){tex=.84+.14*noise(p*5.0)+.1*noise(p*70.0);rough=.8;}
 if(vM>5.5&&vM<6.5){vec2 uv=abs(n.y)>.5?p.xz:p.xy;tex=.93+.035*sin(uv.x*420.0)*sin(uv.y*420.0)+.035*noise(p*60.0);rough=.96;}
 c*=tex;
 vec3 ambient=vec3(.18,.22,.26)*(0.62+max(n.y,0.0)*.38);
 vec3 illum=ambient;
 illum+=light(n,vec3(-3,4.3,2),vec3(1.0,.79,.55),2.6,rough)*shadow(n);
 illum+=light(n,vec3(-4.1,2.7,-3.65),vec3(.46,.69,1.0),2.4,rough);
 illum+=light(n,vec3(-1.7,1.43,-.2),vec3(1.0,.67,.27),1.8,rough);
 illum+=light(n,vec3(4.5,.7,-2.8),vec3(1.0,.29,.07),1.3+.12*sin(uTime*5.0),rough);
 float contact=smoothstep(.01,.5,p.y);illum*=mix(.68,1.0,contact);
 if(uMode>.5&&uMode<1.5)illum=illum*vec3(.52,.46,1.1)+vec3(.06,.015,.11);
 if(uMode>1.5)illum+=light(n,vec3(4.4,1.2,-2.5),vec3(1,.31,.045),2.5,rough);
 vec3 col=c*illum;
 if(vM>6.5){col=c*1.5;}
 float fog=1.0-exp(-length(uEye-p)*.013);col=mix(col,vec3(.035,.043,.055),fog);
 col=(col*(2.51*col+.03))/(col*(2.43*col+.59)+.14);col=pow(clamp(col,0.0,1.0),vec3(1.0/2.2));
 gl_FragColor=vec4(col,1.0);}`;
const SHADOW=`precision highp float;void main(){vec3 c=fract(gl_FragCoord.z*vec3(1.0,255.0,65025.0));c-=c.yzz*vec3(1.0/255.0,1.0/255.0,0.0);gl_FragColor=vec4(c,1.0);}`;
const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const d=Math.hypot(...a)||1;return a.map(v=>v/d);};
function matrix(eye,target,sx,sy,ortho=false){const f=norm(sub(target,eye)),r=norm(cross(f,[0,1,0])),u=cross(r,f),n=.08,z=40,A=ortho?2/(z-n):(z+n)/(z-n),B=ortho?-(z+n)/(z-n):-2*z*n/(z-n);const rows=[r.map(v=>v*sx).concat(-dot(r,eye)*sx),u.map((v,i)=>v*sy+(ortho?0:.04*f[i])).concat(-dot(u,eye)*sy-(ortho?0:.04*dot(f,eye))),f.map(v=>v*A).concat(B-dot(f,eye)*A),ortho?[0,0,0,1]:f.concat(-dot(f,eye))];return new Float32Array(Array.from({length:16},(_,i)=>rows[i%4][Math.floor(i/4)]));}
const wood=new Set(['#75604b','#826b52','#6c5948','#49372e','#634b35','#392b25','#816447','#513b2d','#a18360','#513e2e','#3f3026','#795b3d','#75604c','#81684b','#342b23','#8e7047']);
const metal=new Set(['#b49a60','#c0a15c','#99794b','#e0eff0','#b8b5a0','#a7a785']);
const fabric=new Set(['#593e3c','#a58c60','#d5cdb5','#353439','#332e2c']);
function material(c){return wood.has(c)?1:metal.has(c)?4:fabric.has(c)?6:['#4d5144','#555649','#3c3730','#4d4438','#264c43'].includes(c)?3:['#ac846a','#dcc3a0','#434b4a'].includes(c)?5:['#eea34c','#ffbd69','#e5cb82','#c8a4ff'].includes(c)?7:2;}
function program(gl,vs,fs){function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
class OfficeGPU{
 constructor(){this.canvas=document.createElement('canvas');const g=this.gl=this.canvas.getContext('webgl',{alpha:false,antialias:true,preserveDrawingBuffer:true});if(!g)throw Error('WebGL unavailable');this.main=program(g,VERT,FRAG);this.depth=program(g,VERT,SHADOW);this.buffer=g.createBuffer();this.data=[];this.shadow=g.createTexture();g.bindTexture(g.TEXTURE_2D,this.shadow);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,1024,1024,0,g.RGBA,g.UNSIGNED_BYTE,null);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);this.fbo=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,this.fbo);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,this.shadow,0);const rb=g.createRenderbuffer();g.bindRenderbuffer(g.RENDERBUFFER,rb);g.renderbufferStorage(g.RENDERBUFFER,g.DEPTH_COMPONENT16,1024,1024);g.framebufferRenderbuffer(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.RENDERBUFFER,rb);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Shadow target unavailable');g.bindFramebuffer(g.FRAMEBUFFER,null);g.enable(g.DEPTH_TEST);this.light=matrix([-3,4.3,2],[0,0,-1],.135,.17,true);}
 reset(){this.data.length=0;}
 face(poly,color,normal=null,normals=null){if(poly.length<3)return;const n=normal||norm(cross(sub(poly[1],poly[0]),sub(poly[2],poly[0]))),rgb=color.slice(1).match(/../g).map(v=>parseInt(v,16)/255),m=material(color);for(let j=1;j<poly.length-1;j++)for(const i of [0,j,j+1])this.data.push(...poly[i],...(normals?normals[i]:n),...rgb,m);}
 bind(p,view){const g=this.gl;g.useProgram(p);g.bindBuffer(g.ARRAY_BUFFER,this.buffer);for(const [name,n,offset]of [['aPosition',3,0],['aNormal',3,12],['aColor',3,24],['aMaterial',1,36]]){const a=g.getAttribLocation(p,name);if(a>=0){g.enableVertexAttribArray(a);g.vertexAttribPointer(a,n,g.FLOAT,false,40,offset);}}g.uniformMatrix4fv(g.getUniformLocation(p,'uView'),false,view);g.uniformMatrix4fv(g.getUniformLocation(p,'uLight'),false,this.light);}
 draw(w){const g=this.gl;if(g.isContextLost())throw Error('Graphics context lost');const d=Math.min(root.devicePixelRatio||1,1.5),width=Math.round(w.w*d),height=Math.round(w.h*d);if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}g.bindBuffer(g.ARRAY_BUFFER,this.buffer);g.bufferData(g.ARRAY_BUFFER,new Float32Array(this.data),g.DYNAMIC_DRAW);g.bindFramebuffer(g.FRAMEBUFFER,this.fbo);g.viewport(0,0,1024,1024);g.clearColor(1,1,1,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);this.bind(this.depth,this.light);g.drawArrays(g.TRIANGLES,0,this.data.length/10);g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,width,height);g.clearColor(.055,.066,.08,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);const f=Math.min(w.w*1.12,w.h*1.64)*w.zoom;this.bind(this.main,matrix(w.eye,w.target,2*f/w.w,2*f/w.h));g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.shadow);g.uniform1i(g.getUniformLocation(this.main,'uShadow'),0);g.uniform3fv(g.getUniformLocation(this.main,'uEye'),w.eye);g.uniform1f(g.getUniformLocation(this.main,'uMode'),w.mode||0);g.uniform1f(g.getUniformLocation(this.main,'uTime'),w.time||0);g.drawArrays(g.TRIANGLES,0,this.data.length/10);w.ctx.drawImage(this.canvas,0,0,w.w,w.h);}
}
root.OfficeGPU=OfficeGPU;
// Shader sources also support offline compilation and scene verification.
root.OfficeShaders={VERT,FRAG,SHADOW,matrix};
})(window);
