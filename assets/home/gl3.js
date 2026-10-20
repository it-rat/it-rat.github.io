/* gl3.js: the home page's small WebGL layer, no dependencies.
 *
 * Immediate mode on purpose: a scene is a function of (time, state) that pushes
 * glowing points, lines and triangles into three batches every frame, and the
 * stage flushes them under one perspective camera. Nothing is retained between
 * frames, so a scene can be scrubbed, replayed or frozen (reduced motion) by
 * calling it with a different t, the same contract the room stages follow.
 *
 *   const st = GL3.stage(canvas, {draw(st, t){ st.point(...); st.line(...); }});
 *   st.cam = {eye:[0,2,6], target:[0,0,0], fov:40};   // any time
 *   st.project([x,y,z]) -> {x, y, w, ok}               // CSS px, for HTML labels
 *
 * Without WebGL it adds `no-gl` to <html> and returns null, so the page's CSS
 * decides what stands in for the scene.
 */
(function(){
"use strict";

const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");

/* ---- small vector and matrix kit (column-major, as WebGL wants) ---- */
const V = {
  add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],
  sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
  mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],
  dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
  len:a=>Math.hypot(a[0],a[1],a[2]),
  norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];},
  lerp:(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t],
  /* rotate p about the Y axis, then X */
  rotY:(p,a)=>{const c=Math.cos(a),s=Math.sin(a);return [p[0]*c+p[2]*s,p[1],-p[0]*s+p[2]*c];},
  rotX:(p,a)=>{const c=Math.cos(a),s=Math.sin(a);return [p[0],p[1]*c-p[2]*s,p[1]*s+p[2]*c];},
  rotZ:(p,a)=>{const c=Math.cos(a),s=Math.sin(a);return [p[0]*c-p[1]*s,p[0]*s+p[1]*c,p[2]];},
  /* quadratic bezier */
  bez:(a,c,b,t)=>{const u=1-t;return [u*u*a[0]+2*u*t*c[0]+t*t*b[0],u*u*a[1]+2*u*t*c[1]+t*t*b[1],u*u*a[2]+2*u*t*c[2]+t*t*b[2]];},
};
const M4 = {
  persp(fovy,asp,n,f){const t=1/Math.tan(fovy/2),nf=1/(n-f);
    return new Float32Array([t/asp,0,0,0, 0,t,0,0, 0,0,(f+n)*nf,-1, 0,0,2*f*n*nf,0]);},
  lookAt(e,c,up){const z=V.norm(V.sub(e,c)),x=V.norm(V.cross(up,z)),y=V.cross(z,x);
    return new Float32Array([x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0, -V.dot(x,e),-V.dot(y,e),-V.dot(z,e),1]);},
  mul(a,b){const o=new Float32Array(16);
    for(let i=0;i<4;i++)for(let j=0;j<4;j++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+j]*b[i*4+k];o[i*4+j]=s;}return o;},
};

/* colour: "#F4B23E" -> [r,g,b] in 0..1, cached */
const cc = {};
function rgb(hex){
  if(cc[hex]) return cc[hex];
  const h=hex.replace("#",""); const n=parseInt(h.length===3?h.split("").map(x=>x+x).join(""):h,16);
  return (cc[hex]=[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]);
}
function mix(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}

/* deterministic rng, so a scene is the same scene on every load */
function rng(seed){let s=seed>>>0||1;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return ((s>>>0)%100000)/100000;};}
const clamp=(x,a,b)=>x<a?a:x>b?b:x;
const smooth=(e0,e1,x)=>{const t=clamp((x-e0)/(e1-e0),0,1);return t*t*(3-2*t);};
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;

/* ---- shaders ---- */
const VS_P=`attribute vec3 aPos;attribute vec4 aCol;attribute float aSize;
uniform mat4 uMVP;uniform float uPx;uniform vec2 uFog;varying vec4 vCol;
void main(){vec4 p=uMVP*vec4(aPos,1.0);gl_Position=p;
gl_PointSize=clamp(aSize*uPx/max(p.w,.001),1.0,256.0);
float f=clamp((p.w-uFog.x)/(uFog.y-uFog.x),0.0,1.0);vCol=vec4(aCol.rgb,aCol.a*(1.0-.8*f));}`;
const FS_P=`precision mediump float;varying vec4 vCol;
void main(){vec2 d=gl_PointCoord-.5;float r=length(d)*2.0;if(r>1.0)discard;
float halo=(1.0-r);halo*=halo;float core=smoothstep(.42,.0,r);
float a=vCol.a*(halo*.55+core);gl_FragColor=vec4(vCol.rgb*a,a);}`;
const VS_L=`attribute vec3 aPos;attribute vec4 aCol;uniform mat4 uMVP;uniform vec2 uFog;varying vec4 vCol;
void main(){vec4 p=uMVP*vec4(aPos,1.0);gl_Position=p;
float f=clamp((p.w-uFog.x)/(uFog.y-uFog.x),0.0,1.0);vCol=vec4(aCol.rgb,aCol.a*(1.0-.8*f));}`;
const FS_L=`precision mediump float;varying vec4 vCol;void main(){gl_FragColor=vec4(vCol.rgb*vCol.a,vCol.a);}`;

function compile(gl,vs,fs){
  const p=gl.createProgram();
  for(const [type,src] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){
    const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    gl.attachShader(p,s);
  }
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

/* a growable float batch */
function Batch(stride){ this.s=stride; this.a=new Float32Array(stride*2048); this.n=0; }
Batch.prototype.room=function(k){
  if((this.n+k)*this.s<=this.a.length) return;
  const b=new Float32Array(Math.max(this.a.length*2,(this.n+k)*this.s*1.5|0));b.set(this.a);this.a=b;
};

function stage(canvas, opts){
  let gl=null;
  try{ gl=canvas.getContext("webgl",{antialias:true,alpha:true,premultipliedAlpha:true,powerPreference:"high-performance"}); }catch(e){}
  if(!gl){ document.documentElement.classList.add("no-gl"); return null; }

  const pP=compile(gl,VS_P,FS_P), pL=compile(gl,VS_L,FS_L);
  const loc=(p,n)=>gl.getAttribLocation(p,n), uni=(p,n)=>gl.getUniformLocation(p,n);
  const P={pos:loc(pP,"aPos"),col:loc(pP,"aCol"),size:loc(pP,"aSize"),mvp:uni(pP,"uMVP"),px:uni(pP,"uPx"),fog:uni(pP,"uFog")};
  const L={pos:loc(pL,"aPos"),col:loc(pL,"aCol"),mvp:uni(pL,"uMVP"),fog:uni(pL,"uFog")};
  const buf=gl.createBuffer();

  const st={
    gl, canvas, V, M4, rgb, mix, rng, clamp, smooth, ease,
    W:1,H:1,dpr:1,
    cam:{eye:[0,0,6],target:[0,0,0],up:[0,1,0],fov:40,near:.1,far:60,shiftX:0,shiftY:0},
    fog:[4,16],
    mvp:null, t:0, reduce:reduceMQ.matches, running:true,
    pts:new Batch(8), lin:new Batch(7), tri_:new Batch(7), add:new Batch(7),
    state:opts.state||{},
  };

  /* ---- push API ---- */
  st.point=(p,c,a,size)=>{const b=st.pts;b.room(1);const o=b.n*8,A=b.a;
    A[o]=p[0];A[o+1]=p[1];A[o+2]=p[2];A[o+3]=c[0];A[o+4]=c[1];A[o+5]=c[2];A[o+6]=a;A[o+7]=size;b.n++;};
  st.line=(p,q,c,a,c2,a2)=>{const b=st.lin;b.room(2);const o=b.n*7,A=b.a;
    if(c2===undefined)c2=c; if(a2===undefined)a2=a;
    A[o]=p[0];A[o+1]=p[1];A[o+2]=p[2];A[o+3]=c[0];A[o+4]=c[1];A[o+5]=c[2];A[o+6]=a;
    A[o+7]=q[0];A[o+8]=q[1];A[o+9]=q[2];A[o+10]=c2[0];A[o+11]=c2[1];A[o+12]=c2[2];A[o+13]=a2;b.n+=2;};
  /* a filled triangle, blended normally (for panels and floors), or additively with glow=true */
  st.tri=(p,q,r,c,a,glow)=>{const b=glow?st.add:st.tri_;b.room(3);const A=b.a;let o=b.n*7;
    for(const v of [p,q,r]){A[o]=v[0];A[o+1]=v[1];A[o+2]=v[2];A[o+3]=c[0];A[o+4]=c[1];A[o+5]=c[2];A[o+6]=a;o+=7;}b.n+=3;};
  /* helpers built on the primitives */
  st.circle=(center,radius,axisA,axisB,c,a,seg)=>{seg=seg||64;let prev=null;
    for(let i=0;i<=seg;i++){const t=i/seg*Math.PI*2,ct=Math.cos(t),sn=Math.sin(t);
      const p=[center[0]+(axisA[0]*ct+axisB[0]*sn)*radius,center[1]+(axisA[1]*ct+axisB[1]*sn)*radius,center[2]+(axisA[2]*ct+axisB[2]*sn)*radius];
      if(prev) st.line(prev,p,c,a); prev=p;}};
  st.dashed=(p,q,c,a,n,phase)=>{n=n||14;phase=phase||0;
    for(let i=0;i<n;i++){const t0=(i+phase%1)/n,t1=t0+.5/n;if(t1>1)continue;st.line(V.lerp(p,q,t0),V.lerp(p,q,t1),c,a);}};
  st.trail=(fn,t,len,c,a,size,steps)=>{steps=steps||10;
    for(let i=0;i<steps;i++){const k=i/steps;st.point(fn(t-len*k),c,a*(1-k)*(1-k),size*(1-.6*k));}};

  /* project a world point to CSS pixels, for HTML labels */
  st.project=(p)=>{const m=st.mvp;if(!m) return {x:0,y:0,w:0,ok:false};
    const x=m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12], y=m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13], w=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15];
    if(w<=0) return {x:0,y:0,w,ok:false};
    return {x:(x/w*.5+.5)*st.W, y:(1-(y/w*.5+.5))*st.H, w, ok:true};};

  /* the ray under a CSS pixel, for picking things on a plane */
  st.ray=(x,y)=>{const c=st.cam,f=V.norm(V.sub(c.target,c.eye)),r=V.norm(V.cross(f,c.up||[0,1,0])),u=V.cross(r,f);
    const tn=Math.tan(c.fov*Math.PI/360),asp=st.W/st.H;
    const nx=(x/st.W*2-1)-(c.shiftX||0),ny=(1-y/st.H*2)-(c.shiftY||0);
    return {o:c.eye,d:V.norm(V.add(f,V.add(V.mul(r,nx*tn*asp),V.mul(u,ny*tn))))};};

  function resize(){
    const r=canvas.getBoundingClientRect();
    st.dpr=Math.min(2,window.devicePixelRatio||1);
    st.W=Math.max(1,r.width); st.H=Math.max(1,r.height);
    const w=Math.round(st.W*st.dpr), h=Math.round(st.H*st.dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    if(opts.resize) opts.resize(st);
    st.invalidate();
  }

  function flushPoints(){
    const b=st.pts; if(!b.n) return;
    gl.useProgram(pP);
    gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,b.a.subarray(0,b.n*8),gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(P.pos);gl.vertexAttribPointer(P.pos,3,gl.FLOAT,false,32,0);
    gl.enableVertexAttribArray(P.col);gl.vertexAttribPointer(P.col,4,gl.FLOAT,false,32,12);
    gl.enableVertexAttribArray(P.size);gl.vertexAttribPointer(P.size,1,gl.FLOAT,false,32,28);
    gl.uniformMatrix4fv(P.mvp,false,st.mvp);
    gl.uniform1f(P.px,st.H*st.dpr*.5/Math.tan(st.cam.fov*Math.PI/360));
    gl.uniform2f(P.fog,st.fog[0],st.fog[1]);
    gl.blendFunc(gl.ONE,gl.ONE);
    gl.drawArrays(gl.POINTS,0,b.n);
    gl.disableVertexAttribArray(P.size);
  }
  function flushLin(b,mode,blend){
    if(!b.n) return;
    gl.useProgram(pL);
    gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,b.a.subarray(0,b.n*7),gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(L.pos);gl.vertexAttribPointer(L.pos,3,gl.FLOAT,false,28,0);
    gl.enableVertexAttribArray(L.col);gl.vertexAttribPointer(L.col,4,gl.FLOAT,false,28,12);
    gl.uniformMatrix4fv(L.mvp,false,st.mvp);
    gl.uniform2f(L.fog,st.fog[0],st.fog[1]);
    if(blend==="add") gl.blendFunc(gl.ONE,gl.ONE); else gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(mode,0,b.n);
  }

  function render(now){
    st.t=now/1000;
    const c=st.cam, asp=st.W/st.H;
    const proj=M4.persp(c.fov*Math.PI/180,asp,c.near,c.far);
    proj[8]-=c.shiftX||0; proj[9]-=c.shiftY||0;   // lens shift: move the scene on screen, keep its perspective
    st.mvp=M4.mul(proj,M4.lookAt(c.eye,c.target,c.up||[0,1,0]));
    st.pts.n=st.lin.n=st.tri_.n=st.add.n=0;
    opts.draw(st,st.t);
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);gl.disable(gl.DEPTH_TEST);
    flushLin(st.tri_,gl.TRIANGLES,"alpha");
    flushLin(st.add,gl.TRIANGLES,"add");
    flushLin(st.lin,gl.LINES,"add");
    flushPoints();
    if(opts.after) opts.after(st,st.t);
  }

  /* the loop: runs while the canvas is on screen and the tab is visible; with
     reduced motion it draws only when asked (scroll, click, resize) */
  let raf=0, onScreen=true, frozenT=opts.frozenT!=null?opts.frozenT*1000:4000;
  function loop(now){ raf=0; if(!st.running) return; render(now); schedule(); }
  /* opts.live: an interactive scene keeps running under reduced motion and
     drops its own ambient movement instead (it reads st.reduce) */
  const still=()=>st.reduce&&!opts.live;
  function schedule(){ if(!raf && !still() && onScreen && !document.hidden) raf=requestAnimationFrame(loop); }
  st.invalidate=()=>{ if(still()){ requestAnimationFrame(()=>render(frozenT)); } else schedule(); };
  st.freezeAt=(sec)=>{frozenT=sec*1000;};
  if("IntersectionObserver" in window){
    new IntersectionObserver(es=>{onScreen=es[0].isIntersecting; schedule();},{rootMargin:"120px"}).observe(canvas);
  }
  document.addEventListener("visibilitychange",schedule);
  reduceMQ.addEventListener&&reduceMQ.addEventListener("change",e=>{st.reduce=e.matches;st.invalidate();});
  canvas.addEventListener("webglcontextlost",e=>{e.preventDefault();st.running=false;document.documentElement.classList.add("no-gl");});
  if("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas); else addEventListener("resize",resize);
  resize();
  return st;
}

/* HTML labels that follow world points. Call begin() before a frame's
   set() calls and end() after: a label not set this frame fades out. */
function labels(container, st){
  const map={}; let used={};
  return {
    begin(){used={};},
    set(id,text,p,alpha,opt){
      opt=opt||{};
      let el=map[id];
      if(!el){el=document.createElement("div");el.className="gl-label "+(opt.cls||"");el.textContent=text;container.appendChild(el);map[id]=el;}
      else if(el.textContent!==text) el.textContent=text;
      const s=st.project(p);
      const a=s.ok?clamp(alpha,0,1):0;
      const ax=opt.anchor==="left"?"0":opt.anchor==="right"?"-100%":"-50%";
      el.style.transform=`translate3d(${(s.x+(opt.dx||0)).toFixed(1)}px,${(s.y+(opt.dy||0)).toFixed(1)}px,0) translate(${ax},-50%)`;
      el.style.opacity=a.toFixed(3);
      if(opt.color) el.style.color=opt.color;
      used[id]=1;
    },
    end(){for(const id in map) if(!used[id]) map[id].style.opacity="0";},
    el:id=>map[id],
  };
}

window.GL3={stage,labels,V,M4,rgb,mix,rng,clamp,smooth,ease};
})();
