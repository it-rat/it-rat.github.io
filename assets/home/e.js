/* Home E: the mix as an explorer.
 *
 * One agent, its four rings, and the workforce around it, all on one screen.
 * The cursor touches only the workforce: a governance lens where it passes, a
 * pulse where it clicks. The rings answer to the list alone (point to play a
 * ring's scene, click to keep it); left alone, they walk through by themselves.
 * They used to answer to the cursor on the canvas too, and near the agent,
 * where their lines cross, the focus flipped 23 times in 3 seconds: a focused
 * ring shrinks away from the cursor, loses it, grows back under it.
 */
(function(){
"use strict";
const {V,mix,clamp,smooth}=GL3, C=HP.C;
const cv=document.getElementById("ex");
const btns=[...document.querySelectorAll(".ex .rings button")];
const S=HP.sphere(360,1.55,17);
const RS=HP.ringsState();
const ptr=HP.pointer(cv);
const SCN=["money","rules","proof","ground"];
let locked=-1, preview=-1, auto=-1, autoAt=3, autoK=0, idleAt=0, now=0, t0=null;
const sw=[0,0,0,0];

btns.forEach((b,i)=>{
  b.addEventListener("pointerenter",()=>{preview=i;idleAt=now;});
  b.addEventListener("pointerleave",()=>{preview=-1;});
  b.addEventListener("focus",()=>{preview=i;});
  b.addEventListener("blur",()=>{preview=-1;});
  b.addEventListener("click",()=>{locked=locked===i?-1:i;idleAt=now;if(st) st.invalidate();});
});
addEventListener("pointermove",()=>{idleAt=now;},{passive:true});

/* the box under the list says what the shown ring does */
const box=document.getElementById("ring-detail");
/* with no ring chosen, the box names all four in a line each, so it is never a tall empty frame */
const boxIdle=`<div class="rd-h">four rings around every agent</div><ul class="rd-all">${HP.RINGS.map(r=>`<li style="--c:${r.c}"><b>${r.name}</b> ${r.desc}</li>`).join("")}</ul>`;
box.innerHTML=boxIdle;
let shown="";
const detailHTML=(i,kept)=>i<0?boxIdle:`<div class="rd-h">${HP.RINGS[i].name} &#183; what this ring does${kept?" &#183; kept":""}</div><p class="rd-ds">${HP.RINGS[i].desc}</p><div class="rd-fns">${HP.RINGS[i].fns.map(f=>`<span>${f}</span>`).join("")}</div>`;
function detail(i){
  box.classList.toggle("on",i>=0);
  if(i<0) box.style.removeProperty("--c"); else box.style.setProperty("--c",HP.RINGS[i].c);
  box.innerHTML=detailHTML(i,i>=0&&i===locked);
}
/* Its height is the tallest of its five contents, measured here, in this
   browser, with its fonts and its width. A height fixed in CSS was right in
   one browser and cut the last row of chips in another; a height that
   followed the content moved the copy column every time a ring took focus. */
let fitW=-1;
function fitBox(force){
  const w=box.clientWidth; if(!force&&w===fitW) return; fitW=w;
  const keep=box.innerHTML; box.style.height="auto";
  let h=0; for(let i=-1;i<4;i++){box.innerHTML=detailHTML(i,true);h=Math.max(h,box.offsetHeight);}
  box.innerHTML=keep; box.style.height=Math.ceil(h)+"px";
}
fitBox(true);
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>fitBox(true));
addEventListener("resize",()=>fitBox(false));
addEventListener("load",()=>fitBox(true));

let lab=null;
function draw(st,t){
  if(t0===null) t0=t;
  const dt=Math.min(.1,t-t0-now); now=t-t0;
  ptr.step(dt);
  const mobile=st.W<900;

  /* which ring is shown: the one pointed at in the list, else the one kept, else the walk */
  if(locked<0&&preview<0&&now-idleAt>6&&now>autoAt){auto=[0,1,2,3,-1][autoK++%5];autoAt=now+(auto<0?3:5.5);}
  if(locked>=0||preview>=0) auto=-1;
  const focus=preview>=0?preview:locked>=0?locked:auto;
  btns.forEach((b,i)=>{b.setAttribute("aria-pressed",String(focus===i));b.classList.toggle("locked",locked===i);});
  const key=focus+"/"+locked;
  if(key!==shown){shown=key;detail(focus);}
  cv.style.cursor="crosshair";

  for(let i=0;i<4;i++) sw[i]+=((focus===i?1:0)-sw[i])*Math.min(1,dt*2.6);
  const scene=Math.max(...sw);

  /* camera: square on for the armillary, turned while a scene plays so its gates have depth */
  const yaw=Math.sin(now*.05)*.08-.5*scene, pitch=.12+.1*scene;
  const dist=(mobile?9.4:7.6)+(mobile?scene*1.2:0);
  st.cam.eye=[Math.sin(yaw)*Math.cos(pitch)*dist,Math.sin(pitch)*dist,Math.cos(yaw)*Math.cos(pitch)*dist];
  st.cam.target=[scene*(mobile?1.0:.75),0,0];
  st.cam.fov=40;st.cam.shiftX=mobile?0:.4;st.cam.shiftY=0;
  st.fog=[6,19];

  lab.begin();
  /* the workforce around everything: flares, a lens and pulses */
  HP.drawSphere(st,now,S,{rot:now*.05+ptr.sx*.25,tilt:ptr.sy*.15,sc:2.1,center:[0,0,-1.6],alpha:.95-.35*scene,hero:1,ptr,pulse:true,lensPx:160});
  HP.drawRings(st,now,dt,RS,{focus,alpha:1,halo:.62,dimOthers:.25,names:focus<0?lab:null});
  HP.agent(st,[0,0,0],.38-.12*scene,now,focus>=0?HP.RINGS[focus].rgb:C.white,1);
  SCN.forEach((k,i)=>HP.scene[k](st,now,sw[i],lab));
  lab.set("agent","the agent",[0,-.42,0],(1-scene)*.8,{dy:18});
  lab.end();
}
const st=GL3.stage(cv,{draw,live:true});
if(st) lab=GL3.labels(document.querySelector(".ex-stage .gl-labels"),st);
})();
