/* parts.js: the pieces the mixed home variants share, built on GL3.
 *
 *   HP.pointer(canvas)        the cursor in that canvas's pixels, eased, from anywhere on the page
 *   HP.sphere() / drawSphere  the workforce: a sphere of agents; the cursor is a governance lens
 *   HP.RINGS / drawRings      four rings of control around one agent, tilted by the cursor
 *   HP.scene[name]            the scene each ring plays around the agent (money, rules, proof, ground)
 *
 * Scenes are pure functions of t, as in the rooms; the cursor and clicks are
 * the only state, and they live in the pointer and the sphere's pulse list.
 */
(function(){
"use strict";
const {V,rgb,mix,clamp,smooth}=GL3;
const C={steel:rgb("#93A8C4"),white:rgb("#E9EFF6"),ember:rgb("#FF574B"),amber:rgb("#F4B23E"),mint:rgb("#34D399"),
  peri:rgb("#8B9DFF"),teal:rgb("#2DD4BF"),orchid:rgb("#F0ABFC"),iris:rgb("#6C7BFF"),record:rgb("#E4626F"),coral:rgb("#FF8A5B"),
  grey:rgb("#5A6675"),rose:rgb("#FF7AA2"),dust:rgb("#8A97A6")};

/* ---------------- the cursor ---------------- */
function pointer(canvas){
  const p={x:-1e4,y:-1e4,nx:0,ny:0,sx:0,sy:0,on:false,k:0,clicks:[],moved:0,
    coarse:matchMedia("(pointer: coarse)").matches};
  const at=e=>{const r=canvas.getBoundingClientRect();p.x=e.clientX-r.left;p.y=e.clientY-r.top;
    p.nx=clamp(p.x/r.width*2-1,-1.4,1.4);p.ny=clamp(p.y/r.height*2-1,-1.4,1.4);
    p.on=p.x>=0&&p.y>=0&&p.x<=r.width&&p.y<=r.height;};
  addEventListener("pointermove",e=>{at(e);p.moved=performance.now();},{passive:true});
  addEventListener("pointerdown",e=>{
    const tg=e.target; if(tg&&tg.closest&&tg.closest("a,button,input,label,select,textarea,.no-pulse")) return;
    at(e); if(p.on) p.clicks.push({x:p.x,y:p.y});
  });
  document.documentElement.addEventListener("pointerleave",()=>{p.on=false;});
  addEventListener("blur",()=>{p.on=false;});
  /* sx/sy follow the cursor smoothly; k says how present it is (0..1) */
  p.step=dt=>{const a=Math.min(1,dt*3.5);p.sx+=((p.on?p.nx:0)-p.sx)*a;p.sy+=((p.on?p.ny:0)-p.sy)*a;
    p.k+=((p.on&&!p.coarse?1:0)-p.k)*Math.min(1,dt*3);};
  return p;
}

/* ---------------- the workforce sphere ---------------- */
function sphere(N,R,seed){
  N=N||320;R=R||1.55;
  const nodes=[],edges=[],rnd=GL3.rng(seed||11);
  for(let i=0;i<N;i++){
    const y=1-(i+.5)/N*2,rr=Math.sqrt(1-y*y),th=i*2.39996323;
    const p=[Math.cos(th)*rr*R,y*R,Math.sin(th)*rr*R];
    nodes.push({p,n:V.norm(p),ph:rnd(),sp:.55+rnd()*.9,calm:-99});
  }
  const seen=new Set();
  for(let i=0;i<N;i++){
    const d=[];for(let j=0;j<N;j++) if(j!==i) d.push([V.len(V.sub(nodes[i].p,nodes[j].p)),j]);
    d.sort((a,b)=>a[0]-b[0]);
    for(const [,j] of d.slice(0,3)){const k=i<j?i+"-"+j:j+"-"+i;if(!seen.has(k)){seen.add(k);edges.push([i,j]);}}
  }
  let F=0,best=-1e9;for(let i=0;i<N;i++){const q=nodes[i].p;const s=q[0]*.5+q[2]*.8+q[1]*.2;if(s>best){best=s;F=i;}}
  return {N,R,nodes,edges,F,pulses:[],P:null,K:new Float32Array(N)};
}
/* o: {rot, tilt, sc, center, alpha, hero (0..1 flares on), calm (0..1 all mint),
       ptr, lensPx, skip (node index drawn elsewhere), pulse (consume clicks)} */
function drawSphere(st,t,S,o){
  const N=S.N, sc=o.sc||1, cen=o.center||[0,0,0], al=o.alpha==null?1:o.alpha;
  const rot=o.rot||0, tilt=o.tilt||0;
  const base=new Array(N), rn=new Array(N);
  for(let i=0;i<N;i++){
    const a=V.rotY(V.rotX(S.nodes[i].p,tilt),rot);
    base[i]=[cen[0]+a[0]*sc,cen[1]+a[1]*sc,cen[2]+a[2]*sc];
    rn[i]=V.norm(a);
  }
  /* the lens: nodes near the cursor on the near side lean out, turn mint, and stop burning */
  const K=S.K; K.fill(0);
  const ptr=o.ptr, cw=st.project(cen).w;
  let lensW=0, acc=[0,0,0];
  if(ptr&&ptr.k>.02&&al>.05){
    const R=o.lensPx||Math.min(170,st.W*.12);
    for(let i=0;i<N;i++){
      const s=st.project(base[i]); if(!s.ok) continue;
      const d=Math.hypot(s.x-ptr.x,s.y-ptr.y); if(d>R) continue;
      let k=(1-smooth(0,R,d))*ptr.k; if(s.w>cw) k*=.2;
      K[i]=k; if(k>.08){S.nodes[i].calm=Math.max(S.nodes[i].calm,t+2.5);lensW+=k;acc=V.add(acc,V.mul(base[i],k));}
    }
  }
  /* clicks become pulses that travel over the surface and calm everything they cross */
  if(ptr&&o.pulse&&ptr.clicks.length){
    for(const c of ptr.clicks.splice(0)){
      let bi=-1,bd=1e9;
      for(let i=0;i<N;i++){const s=st.project(base[i]);if(!s.ok||s.w>cw) continue;const d=Math.hypot(s.x-c.x,s.y-c.y);if(d<bd){bd=d;bi=i;}}
      if(bi>=0&&bd<260) S.pulses.push({i:bi,t0:t});
    }
  }
  const WAVE=1.7;
  const flash=new Float32Array(N);
  S.pulses=S.pulses.filter(pu=>t-pu.t0<3.2);
  for(const pu of S.pulses){
    const o0=S.nodes[pu.i].n, front=(t-pu.t0)*WAVE;
    for(let i=0;i<N;i++){
      const th=Math.acos(clamp(V.dot(S.nodes[i].n,o0),-1,1));
      const d=Math.abs(th-front); if(d<.22) flash[i]=Math.max(flash[i],1-d/.22);
      if(th<front) S.nodes[i].calm=Math.max(S.nodes[i].calm,pu.t0+th/WAVE+8);
    }
  }
  const P=new Array(N);
  for(let i=0;i<N;i++){const push=(K[i]*.24+flash[i]*.08)*sc;P[i]=V.add(base[i],V.mul(rn[i],push));}
  S.P=P;

  const calmAll=o.calm||0, hero=o.hero||0;
  for(const [i,j] of S.edges){
    const k=Math.max(K[i],K[j]), f=Math.max(flash[i],flash[j]);
    const c=mix(mix(C.steel,C.mint,Math.max(calmAll*.6,k,f)),C.white,f*.3);
    st.line(P[i],P[j],c,(.085+k*.32+f*.4)*al);
  }
  for(let i=0;i<N;i++){
    if(i===o.skip) continue;
    const n=S.nodes[i], calm=t<n.calm, f=((t*.085*n.sp+n.ph)%1+1)%1;
    let col=C.steel,a=.55,size=.045;
    if(hero>0){
      if(f<.05){const k=f/.05;col=calm?C.mint:mix(C.amber,C.ember,k);a=calm?.75:.6+.4*k;size=calm?.055:.05+.05*k;}
      else if(f<.11){col=C.mint;a=.85*(1-(f-.05)/.06)+.4;size=.06;}
      col=mix(C.steel,col,hero);a=a*hero+.55*(1-hero);
    }
    if(calm&&hero>0) col=mix(col,C.mint,.35);
    col=mix(col,C.mint,Math.max(calmAll*.55,K[i]*.9));
    col=mix(col,C.white,flash[i]*.6);
    st.point(P[i],col,Math.min(1,a+K[i]*.4+flash[i]*.5)*al,size+K[i]*.04+flash[i]*.03);
  }
  /* the hand of the control plane: one point in front of the lens, reaching to every node it holds */
  if(lensW>.35){
    const anchor=V.add(cen,V.mul(V.norm(V.sub(V.mul(acc,1/lensW),cen)),S.R*sc*1.3));
    const w=clamp(lensW/3,0,1)*al;
    for(let i=0;i<N;i++) if(K[i]>.22) st.line(anchor,P[i],C.mint,K[i]*.42*w);
    st.point(anchor,C.white,w,.1);st.point(anchor,C.mint,.35*w,.55);
    S.anchor=anchor;S.anchorW=w;
  } else {S.anchorW=0;}
  return P;
}

/* ---------------- four rings of control ---------------- */
const RINGS=[
  {key:"money",desc:"What it may spend, and the switch that stops it.", name:"Money", c:"#F4B23E",r:1.0, tilt:[1.18,.10], spin:.24, fns:["budget checked before each call","a kill switch in the path","cost per resolved case","your cloud bill, read by agents"]},
  {key:"guardrails",desc:"Who it is, what it may do, who signs the big things.", name:"Guardrails", c:"#2DD4BF",r:1.42,tilt:[1.02,.62], spin:-.17,fns:["one identity for people and agents","policy decides, not a model","a person above your limit","the web through a checkpoint","a delegation you can end"]},
  {key:"proof",desc:"What it did, written so nobody can quietly change it.", name:"Proof", c:"#FF7AA2",r:1.84,tilt:[1.36,-.48],spin:.12, fns:["a record that shows any edit","fire drills on the guardrails","signing keys kept apart","post-quantum crypto inventory","typed answers with odds"]},
  {key:"ground",desc:"Memory, alerts and one contract under all of it.",name:"Ground",c:"#6C7BFF",r:2.26,tilt:[.92,-.12],spin:-.09,fns:["memory that keeps the reasons","alerts that carry a link","one passport, one event format","runs on your own machines"]},
];
RINGS.forEach(r=>r.rgb=rgb(r.c));
function ringsState(){return {fw:[0,0,0,0],phase:[0,1.3,2.6,.7],spin:RINGS.map(r=>r.spin),screen:[[],[],[],[]]};}
/* o: {focus (-1..3), show[4] (0..1 assembly), alpha, tiltX, tiltY (cursor), halo (radius a focused
       ring shrinks to), hover, names (lab), dimOthers} */
function drawRings(st,t,dt,S,o){
  const anyFocus=o.focus>=0, al=o.alpha==null?1:o.alpha;
  RINGS.forEach((r,i)=>{
    S.fw[i]+=((o.focus===i?1:0)-S.fw[i])*Math.min(1,dt*3.2);
    S.spin[i]+=((o.focus===i?r.spin*.25:r.spin)-S.spin[i])*Math.min(1,dt*2.5);
    S.phase[i]+=S.spin[i]*dt;
    const show=o.show?o.show[i]:1; if(show<=.002){S.screen[i].length=0;return;}
    const f=smooth(0,1,S.fw[i]);
    let u=[1,0,0],v=[0,0,1];const pre=t*.045+i*1.7;
    const tr=q=>V.rotX(V.rotY(V.rotY(V.rotZ(V.rotX(q,r.tilt[0]),r.tilt[1]),pre),o.tiltX||0),o.tiltY||0);
    u=tr(u);v=tr(v);
    const fu=V.rotX(V.rotY([1,0,0],o.tiltX||0),o.tiltY||0), fv=V.rotX(V.rotY(V.norm([0,.97,-.24]),o.tiltX||0),o.tiltY||0);
    u=V.norm(V.lerp(u,fu,f));v=V.lerp(v,fv,f);v=V.norm(V.sub(v,V.mul(u,V.dot(v,u))));
    const dim=(anyFocus&&o.focus!==i?(o.dimOthers==null?.2:o.dimOthers):1)*(o.hover===i&&!anyFocus?1.6:1)*al*show;
    const halo=o.halo==null?r.r:o.halo;
    const rad=(r.r+(halo-r.r)*f)*(anyFocus&&o.focus!==i?1.08:1)*(.6+.4*show);
    const at=th=>[(u[0]*Math.cos(th)+v[0]*Math.sin(th))*rad,(u[1]*Math.cos(th)+v[1]*Math.sin(th))*rad,(u[2]*Math.cos(th)+v[2]*Math.sin(th))*rad];
    /* assembly: the ring draws itself in */
    const seg=96, upto=Math.round(seg*show);
    let prev=at(S.phase[i]*.2);
    for(let k=1;k<=upto;k++){const q=at(S.phase[i]*.2+k/seg*Math.PI*2);st.line(prev,q,r.rgb,.5*dim+.35*f*al);prev=q;}
    if(show>.98) st.circle([0,0,0],rad*1.035,u,v,r.rgb,.1*dim,seg);
    for(let k=0;k<72;k++) if(k/72<show) st.point(at(S.phase[i]*.6+k/72*Math.PI*2),r.rgb,.32*dim,.025);
    const sp=S.screen[i];sp.length=0;for(let k=0;k<48;k++) sp.push(st.project(at(k/48*Math.PI*2)));
    const n=r.fns.length;
    for(let k=0;k<n;k++){
      const th=S.phase[i]+k/n*Math.PI*2+.4;if(k/n>show) continue;const q=at(th);
      st.point(q,mix(r.rgb,C.white,.45),dim,.11*(1-f*.4));st.point(q,r.rgb,.22*dim,.5*(1-f*.5));
    }
    if(o.names&&!anyFocus&&show>.9){
      let best=null,top=0;for(let k=0;k<48;k++){const s=sp[k];if(s.ok&&(!best||s.y<best.y)){best=s;top=k;}}
      o.names.set("rn"+i,r.name,at(top/48*Math.PI*2),.95*al,{dy:-14,cls:"ring r"+i});
    }
  });
}

/* ---------------- the agent at the centre ---------------- */
const ICO=(()=>{const p=(1+Math.sqrt(5))/2,v=[[-1,p,0],[1,p,0],[-1,-p,0],[1,-p,0],[0,-1,p],[0,1,p],[0,-1,-p],[0,1,-p],[p,0,-1],[p,0,1],[-p,0,-1],[-p,0,1]].map(V.norm);
  const e=[];for(let i=0;i<12;i++)for(let j=i+1;j<12;j++) if(Math.abs(V.len(V.sub(v[i],v[j]))-1.0515)<.02) e.push([i,j]);return {v,e};})();
function agent(st,c,s,t,col,a){
  const v=ICO.v.map(q=>V.add(c,V.mul(V.rotX(V.rotY(q,t*.4),t*.23),s)));
  for(const [i,j] of ICO.e) st.line(v[i],v[j],col,.55*a);
  for(const q of v) st.point(q,col,.7*a,.035);
  st.point(c,C.white,a,.15);st.point(c,col,.25*a,.8);
}
function cube(st,c,s,r,col,a){
  const v=[];for(let i=0;i<8;i++){let q=[(i&1?1:-1)*s,(i&2?1:-1)*s,(i&4?1:-1)*s];q=V.rotX(V.rotY(q,r),.5);v.push(V.add(c,q));}
  const E=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
  for(const [i,j] of E) st.line(v[i],v[j],col,a);
  st.point(c,col,a*.5,.06);
}

/* ---------------- the scene each ring plays around the agent ----------------
   Laid out to the agent's right (+x), the agent at the origin. a is the
   scene's weight (0..1), lab a GL3.labels instance. */
const scene={};
scene.money=(st,t,a,lab)=>{
  if(a<=.01) return;
  const c=C.amber, G=[1.15,0,0], M=[2.15,0,0], per=7, u=((t%per)+per)%per/per, shut=u>=.6&&u<.97;
  const gc=shut?mix(c,C.ember,.75):c;
  st.circle(G,.42,[0,1,0],[0,0,1],gc,.85*a,56);st.circle(G,.35,[0,1,0],[0,0,1],gc,.25*a,56);
  st.dashed([0,0,0],M,c,.16*a,16,t*.8);
  st.point(M,mix(c,C.white,.55),a,.2);st.point(M,c,.22*a,.7);st.circle(M,.24,[0,1,0],[0,0,1],c,.5*a,36);
  const left=u<.6?1-u/.6:(u<.97?0:(u-.97)/.03);
  for(let k=0;k<32;k++){const on=(k+.5)/32<left,an=Math.PI/2-k/32*Math.PI*2;st.point([Math.cos(an)*.46,Math.sin(an)*.46,0],on?c:C.grey,(on?.95:.3)*a,.05);}
  const iv=.32,speed=1.75;
  for(let j=0;j<7;j++){
    const te=Math.floor(t/iv)*iv-j*iv,age=t-te;if(age<0) continue;
    const ue=((te%per)+per)%per/per,blocked=ue>=.6&&ue<.97,x=age*speed;
    if(blocked&&x>=G[0]-.05){const hb=age-(G[0]-.05)/speed;if(hb>.6) continue;
      for(let s=0;s<7;s++){const an=s*.9+te*7;const d=V.norm([-.5,Math.cos(an),Math.sin(an)]);st.point(V.add(G,V.mul(d,hb*.75)),C.ember,(1-hb/.6)*a,.05);}continue;}
    if(x>M[0]-.1) continue;
    const q=[x,.08*Math.sin(x*2.4+te),0];
    st.point(q,mix(c,C.white,.45),a,.075);st.point([x-.09,q[1],0],c,.4*a,.05);st.point([x-.18,q[1],0],c,.18*a,.04);
  }
  lab.set("m-gate",shut?"402 · never sent":"budget",V.add(G,[0,.6,0]),a,{cls:shut?"stop":"r0"});
  lab.set("m-prov","model provider",V.add(M,[0,.42,0]),a);
  lab.set("m-left","budget left",[0,-.46,0],a*.9,{dy:20});
};
scene.rules=(st,t,a,lab)=>{
  if(a<=.01) return;
  const c=C.teal, X=1.0, s=((t%6)+6)%6;
  for(let k=0;k<5;k++){const v=-.7+k*.35;st.line([X,v,-.7],[X,v,.7],c,.3*a);st.line([X,-.7,v],[X,.7,v],c,.3*a);}
  const Y=[2.3,.85,0],Hp=[1.75,-.05,.35],Ld=[X,-.72,0],O=[0,0,0];
  st.point(Y,C.mint,a,.12);st.circle(Y,.15,[0,1,0],[0,0,1],C.mint,.6*a,28);
  st.point(Hp,C.amber,a,.11);st.circle(Hp,.15,[1,0,0],[0,0,1],C.amber,.6*a,28);
  if(s<1.3) st.trail(k=>V.bez(O,[X,.55,0],Y,clamp(k,0,1)),s/1.3,.12,mix(C.mint,C.white,.4),a,.075,6);
  {const g=s-2;
    if(g>=0&&g<.8) st.trail(k=>V.bez(O,[.7,-.15,.1],Hp,clamp(k,0,1)),g/.8,.12,C.amber,a,.075,6);
    else if(g>=.8&&g<2.2){const pl=(g-.8)%.7/.7;st.point(Hp,C.amber,a,.08);st.circle(Hp,.15+pl*.25,[1,0,0],[0,0,1],C.amber,(1-pl)*.7*a,32);}
    else if(g>=2.2&&g<2.9) st.trail(k=>V.bez(Hp,[2.1,.25,.2],Y,clamp(k,0,1)),(g-2.2)/.7,.12,mix(C.mint,C.white,.3),a,.075,6);}
  {const g=s-4;
    if(g>=0&&g<.55) st.trail(k=>V.lerp(O,Ld,clamp(k,0,1)),g/.55,.12,mix(C.ember,C.white,.3),a,.075,6);
    else if(g>=.55&&g<1.2){const hb=g-.55;for(let k=0;k<8;k++){const an=k*.785;st.point(V.add(Ld,[-.1*hb,Math.cos(an)*hb*.6,Math.sin(an)*hb*.6]),C.ember,(1-hb/.65)*a,.05);}}}
  lab.set("r-ok","allowed",Y,a,{dy:-26});
  lab.set("r-hold","held for a person",Hp,a,{dy:28});
  lab.set("r-no","denied",Ld,a,{dy:26,cls:"stop"});
  lab.set("r-pol","same policy, same answer",[X,.72,0],a*.9,{dy:-18});
};
/* proof: a tower of sealed records, a scanner that verifies them, a key kept
   apart, and rehearsed attacks on a shield. Nothing here looks like ground. */
const ATT=(()=>{const r2=GL3.rng(5),o=[];for(let k=0;k<7;k++){o.push({d:V.norm([-1-r2()*.6,r2()*1.4-.6,r2()*1.6-.8]),off:k*.31+r2()*.15});}return o;})();
function plate(st,c,h,col,a,fill){
  const p=[[c[0]-h,c[1],c[2]-h],[c[0]+h,c[1],c[2]-h],[c[0]+h,c[1],c[2]+h],[c[0]-h,c[1],c[2]+h]];
  for(let i=0;i<4;i++) st.line(p[i],p[(i+1)%4],col,a);
  if(fill) {st.tri(p[0],p[1],p[2],col,fill);st.tri(p[0],p[2],p[3],col,fill);}
  return p;
}
scene.proof=(st,t,a,lab)=>{
  if(a<=.01) return;
  const rc=C.record, rose=C.rose, T=[1.75,0,0], gap=.17, base=-.95, H=.28, PER=1.4, N=9;
  const idNow=Math.floor(t/PER), off=(t%PER)/PER, shift=smooth(0,.3,off);
  /* which plate is forged this cycle, and how far the scanner got */
  const cyc=Math.floor(t/6), u=((t%6)+6)%6/6, forged=cyc%2===1, badId=Math.floor((cyc*6)/PER)-3;
  const yOf=id=>{const k=idNow-id;return base+(N-k-shift)*gap;};
  const top=yOf(idNow);
  let scanY=base+clamp((u-.1)/.6,0,1)*(N-1)*gap;
  const badY=yOf(badId), stopped=forged&&scanY>=badY-.01&&u>.1;
  if(stopped) scanY=badY;
  /* the spine every seal hangs on */
  st.line([T[0]+H,base-.05,T[2]+H],[T[0]+H,top,T[2]+H],rc,.35*a);
  for(let k=0;k<=N;k++){
    const id=idNow-k, y=yOf(id), slot=N-k-shift;
    const al=clamp(slot,0,1)*(k===0?smooth(0,.25,off):1);
    if(al<=.01) continue;
    const bad=forged&&id===badId&&u>.05, after=forged&&id>badId&&stopped;
    const near=Math.abs(y-scanY)<.05&&u>.1&&u<.75&&!bad;
    const col=bad?C.ember:near?C.mint:after?mix(rc,C.ember,.5):rc;
    plate(st,[T[0],y,T[2]],H,col,(bad||near?1:.62)*al*a,(bad?.16:near?.12:.05)*al*a);
    st.point([T[0]+H,y,T[2]+H],bad?C.ember:mix(rc,C.white,.4),al*a,.06);
    if(bad) lab.set("p-bad","edit detected",[T[0]-H,y,T[2]],a,{dx:-70,cls:"stop"});
  }
  /* the scanner: a frame climbing the tower, checking every seal on the way */
  if(u>.1&&u<.85){
    const sc=stopped?C.ember:C.mint;
    plate(st,[T[0],scanY,T[2]],H+.07,sc,.95*a,0);
    if(!forged&&u>.66) lab.set("p-ok","verified",[T[0],top+.25,T[2]],a,{cls:"ok"});
  }
  /* a write: the agent hands the next record to the tower */
  if(off<.3) st.trail(k=>V.bez([0,0,0],[1.0,top+.55,0],[T[0],top+.1,T[2]],clamp(k,0,1)),off/.3,.12,mix(rc,C.white,.45),a,.07,6);
  /* the signing key lives apart, in its own box, and only reaches in to seal */
  const K=[T[0]+.15,top+.85,T[2]-.55], ks=.17;
  cube(st,K,ks,.2,rose,.55*a);
  st.circle(V.add(K,[-.05,0,0]),.05,[1,0,0],[0,1,0],C.amber,.95*a,18);
  st.line(V.add(K,[0,0,0]),V.add(K,[.1,0,0]),C.amber,.95*a);
  st.line(V.add(K,[.07,0,0]),V.add(K,[.07,-.04,0]),C.amber,.95*a);st.line(V.add(K,[.1,0,0]),V.add(K,[.1,-.04,0]),C.amber,.95*a);
  st.dashed(V.add(K,[0,-ks,0]),[T[0]+H,top,T[2]+H],off<.3?C.amber:rose,(off<.3?.85:.25)*a,8,t);
  /* rehearsed attacks on a shield at the agent's back */
  const c=C.coral;
  for(let k=1;k<4;k++){const y=-.6+k*.3,r=Math.sqrt(.72*.72-y*y);
    const arc=[];for(let s=0;s<=16;s++){const an=Math.PI/2+s/16*Math.PI;arc.push([Math.cos(an)*r,y,Math.sin(an)*r]);}
    for(let s=0;s<16;s++) st.line(arc[s],arc[s+1],c,.28*a);}
  for(const at of ATT){
    const f=((t+at.off)%2.2+2.2)%2.2/2.2, S=V.mul(at.d,2.1), Hh=V.mul(at.d,.72);
    if(f<.4) st.trail(k=>V.lerp(S,Hh,clamp(k/.4,0,1)),f,.06,mix(c,C.white,.3),a*.9,.05,5);
    else if(f<.75){const hb=(f-.4)/.35,uu=V.norm(V.cross(at.d,[0,1,0])),vv=V.cross(uu,at.d);
      st.circle(Hh,.05+hb*.22,uu,vv,c,(1-hb)*.9*a,6);st.point(Hh,mix(c,C.white,.5),(1-hb)*a,.07);}
  }
  lab.set("p-rec","the record",[T[0],top+.12,T[2]+H],a,{dy:-22,dx:40});
  lab.set("p-key","keys kept apart",K,a,{dy:-24});
  lab.set("p-drill","rehearsed attacks, held",V.mul(ATT[2].d,1.45),a*.9);
};

/* ground: what everything stands on. A floor, your own machines on it, one
   event format riding a bus, memory that grows with its reasons, and a link
   that goes to a person. */
function box(st,c,w,h,d,col,a){
  const v=[];for(let i=0;i<8;i++) v.push([c[0]+(i&1?w:-w)/2,c[1]+(i&2?h:0),c[2]+(i&4?d:-d)/2]);
  const E=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
  for(const [i,j] of E) st.line(v[i],v[j],col,a);
}
const TREE=[[0,0,0],[.7,.55,.2],[1.15,1.0,-.2],[1.3,.4,.45],[1.75,1.2,.1],[1.85,.65,-.35],[2.3,.95,.3]];
const TREE_E=[[0,1],[1,2],[1,3],[2,4],[3,5],[4,6]];
scene.ground=(st,t,a,lab)=>{
  if(a<=.01) return;
  const c=C.iris, Y=-1.05;
  /* the floor */
  for(let k=0;k<=10;k++){const x=-.6+k*.34;const f=.13*(1-Math.abs(k-5)/6);st.line([x,Y,-1.1],[x,Y,1.1],c,f*a);}
  for(let k=0;k<=6;k++){const z=-1.1+k*.367;st.line([-.6,Y,z],[2.8,Y,z],c,.1*a);}
  /* your own machines: three servers on it, lights blinking */
  [[.95,.35],[1.65,.35],[2.35,.35]].forEach(([x,z],i)=>{
    box(st,[x,Y,z],.42,.62,.3,c,.62*a);
    for(let s=1;s<3;s++) st.line([x-.21,Y+s*.2,z+.15],[x+.21,Y+s*.2,z+.15],c,.35*a);
    for(let s=0;s<3;s++){const on=Math.sin(t*(2.2+i*.7+s)+s*1.3+i)>.2;st.point([x+.13,Y+.1+s*.2,z+.16],on?(s===1?C.amber:C.mint):C.grey,(on?.95:.3)*a,.035);}
  });
  /* one event format: the same envelope, whichever ring sent it */
  const bz=-.55, rcol=[RINGS[0].rgb,RINGS[1].rgb,RINGS[2].rgb,RINGS[3].rgb];
  st.line([-.5,Y+.02,bz],[2.8,Y+.02,bz],c,.45*a);
  st.dashed([0,-.25,0],[0,Y+.02,bz],c,.35*a,7,-t);
  for(let k=0;k<6;k++){
    const f=((t*.16+k/6)%1), x=-.5+f*3.3, p=[x,Y+.12,bz], col=rcol[k%4], w=.09, h=.06;
    const al=a*clamp(f*8,0,1)*clamp((1-f)*8,0,1);
    const q=[[p[0]-w,p[1]-h,p[2]],[p[0]+w,p[1]-h,p[2]],[p[0]+w,p[1]+h,p[2]],[p[0]-w,p[1]+h,p[2]]];
    for(let s=0;s<4;s++) st.line(q[s],q[(s+1)%4],col,.95*al);
    st.line(q[3],[p[0],p[1],p[2]],col,.8*al);st.line(q[2],[p[0],p[1],p[2]],col,.8*al);
  }
  /* memory that keeps its reasons: a graph that grows, each fact with its why */
  const g=((t%9)+9)%9, fade=1-smooth(7.8,8.8,g);
  TREE.forEach((n,i)=>{
    if(!i) return;
    const born=smooth(i*.85,i*.85+.4,g)*fade; if(born<=.01) return;
    const [pi]=TREE_E.find(e=>e[1]===i), from=TREE[pi];
    st.line(from,V.lerp(from,n,born),c,.55*a);
    st.point(n,mix(c,C.white,.4),born*a,.09);
    const why=V.add(n,[.16,.13,0]), wb=smooth(i*.85+.35,i*.85+.7,g)*fade;
    if(wb>.01){st.dashed(n,why,C.mint,.5*a*wb,4,0);st.point(why,C.mint,wb*a,.05);}
  });
  /* when something drifts, the owner gets a link, never a button */
  const O=[0,1.55,0], u=((t%5)+5)%5/5;
  st.point(O,C.mint,a,.12);st.circle(O,.14,[1,0,0],[0,0,1],C.mint,.6*a,32);
  if(u<.5){const p=V.lerp([0,.3,0],O,smooth(0,1,u/.5));
    st.circle(V.add(p,[-.035,0,0]),.045,[1,0,0],[0,1,0],C.mint,a,16);st.circle(V.add(p,[.035,0,0]),.045,[1,0,0],[0,1,0],C.mint,a,16);}
  if(u>.45&&u<.95) lab.set("g-alert","a link, never a button",O,a,{dx:104});
  lab.set("g-owner","owner",O,a,{dy:-24});
  lab.set("g-mem","memory, with reasons",TREE[4],a*fade,{dy:-22});
  lab.set("g-srv","your own machines",[1.65,Y+.62,.35],a,{dy:-20});
  lab.set("g-bus","one event format",[2.6,Y+.12,bz],a,{dy:22});
};

window.HP={C,pointer,sphere,drawSphere,RINGS,ringsState,drawRings,agent,cube,scene};
})();
