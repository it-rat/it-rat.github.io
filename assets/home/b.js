/* The live floor (home page, "Try it").
 *
 * Sixteen agents work a round floor. Four gates sit on its edge (model
 * providers, the web, your systems, people), an unlisted site waits outside,
 * and the record stands in the middle, a ring added for every decision.
 *
 * The visitor can act in two ways. The buttons make one agent misbehave. Or
 * the visitor takes an agent by the hand: click it, then click a door, and the
 * gate decides by that agent's passport, so the passport is something you can
 * test rather than read. Every refusal lands with a shockwave, a flare in the
 * wall where it struck, and a verdict beside the gate. Switching the governance
 * off drops the wall and scatters the record; switching it on raises the wall
 * again in a sweep. A scoreboard keeps both runs side by side.
 *
 * It keeps state (packets, bursts, fires are events in time) and it is a
 * simulation, which the section says.
 */
(function(){
"use strict";
const {V,rgb,mix,clamp,smooth}=GL3;
const cv=document.getElementById("floor");
const C={steel:rgb("#93A8C4"),agent:rgb("#CFE3FF"),white:rgb("#F2F6FB"),ember:rgb("#FF574B"),amber:rgb("#F4B23E"),mint:rgb("#34D399"),
  teal:rgb("#2DD4BF"),orchid:rgb("#F0ABFC"),record:rgb("#E4626F"),grey:rgb("#5A6675"),iris:rgb("#6C7BFF")};

const R=4.2, EXT=6.2, WALL=.75;
const deg=d=>d*Math.PI/180;
const onRing=(th,r,y)=>[Math.cos(th)*r,y||0,Math.sin(th)*r];
const angDist=(a,b)=>{let d=Math.abs(a-b)%(Math.PI*2);return d>Math.PI?Math.PI*2-d:d;};
/* gates: angle on the boundary, colour, and where the outside thing sits */
const GATES={
  models:{th:deg(-90),c:C.amber,  label:"model providers", door:true},
  people:{th:deg(-38),c:C.mint,   label:"people"},
  web:   {th:deg(14), c:C.orchid, label:"the web", door:true},
  systems:{th:deg(196),c:C.teal,  label:"your systems", door:true},
  unknown:{th:deg(-138),c:C.ember, label:"unlisted site", door:true},   /* back left: in front it fell below the canvas */
};
for(const k in GATES){const g=GATES[k];g.gate=onRing(g.th,R,.35);g.ext=onRing(g.th,EXT,.55);g.flash=-9;}
const DOOR_NAME={models:"the model",web:"the web",systems:"your systems",unknown:"an unlisted site"};

/* agents, each with a passport: an owner, a budget and the doors it may use */
const OWNERS=["finance team","support desk","dev platform","sales ops","security team","data team","legal","ops on call"];
const rnd=GL3.rng(23), AG=[];
for(let i=0;i<16;i++){
  const th=i/16*Math.PI*2+rnd()*.3, r=1.45+(i%3)*.75+rnd()*.3;
  const allowed=["models"];if(i%3!==0) allowed.push("systems");if(i%2===0) allowed.push("web");
  AG.push({i,name:"agent-"+String(i+1).padStart(2,"0"),home:[Math.cos(th)*r,.38,Math.sin(th)*r],ph:rnd()*6,sp:.3+rnd()*.4,
    next:1+rnd()*4,state:null,col:null,fire:-1,paused:-1,
    owner:OWNERS[i%OWNERS.length],limit:24+(i*7)%30,spent:2+rnd()*8,recs:Math.floor(20+rnd()*60),allowed});
}
const agentPos=(a,t)=>{const o=a.ph+t*a.sp;return [a.home[0]+Math.cos(o)*.16,.38+.04*Math.sin(t*1.7+a.ph),a.home[2]+Math.sin(o)*.16];};

/* ---- simulation state ---- */
let gov=true, govT=-9, t0=null, now=0;
const packets=[], bursts=[], pops=[], records=[], holds=[], impacts=[];
let recCount=0, noCount=0, spendLog=[], tamper=null, leak=null, sysFlash=-9, scatter=null;
const meters={spend:document.getElementById("m-spend"),no:document.getElementById("m-no"),hold:document.getElementById("m-hold"),rec:document.getElementById("m-rec")};
const logEl=document.getElementById("log"), clockEl=document.getElementById("clock");
const clock=t=>{const s=2400+Math.floor(t);return [9+Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(n=>String(n).padStart(2,"0")).join(":");};
/* every event goes to the log behind the "log" button, and shows for a few
   seconds as a toast under the meters, two at most: the stage stays clear */
const toastsEl=document.querySelector(".floor .toasts");
function log(html,color){
  const li=document.createElement("li");li.style.setProperty("--k",color||"var(--faint)");
  li.innerHTML=`<time>${clock(now)}</time>${html}`;
  logEl.prepend(li);while(logEl.children.length>30) logEl.lastChild.remove();
  if(!toastsEl) return;
  const d=document.createElement("div");d.className="toast";d.style.setProperty("--k",color||"var(--faint)");d.innerHTML=html;
  toastsEl.prepend(d);while(toastsEl.children.length>2) toastsEl.lastChild.remove();
  setTimeout(()=>{d.classList.add("out");setTimeout(()=>d.remove(),480);},5200);
}
function record(a){recCount++;if(a) a.recs++;records.push({t:now,id:1200+recCount});if(records.length>40) records.shift();}

/* ---- the scoreboard: this visit, governance on beside governance off ---- */
const S={on:{spent:0,stopped:0,leaked:0,unrec:0},off:{spent:0,stopped:0,leaked:0,unrec:0}};
const score=document.createElement("div");score.className="hud-box score";
score.innerHTML=`<div class="sc-h"><span>this visit</span><span>simulated</span></div>
<table><thead><tr><th></th><th class="on">governance on</th><th class="off">off</th></tr></thead><tbody>
<tr><td>spent</td><td data-s="on.spent"></td><td data-s="off.spent"></td></tr>
<tr><td>stopped before harm</td><td data-s="on.stopped"></td><td data-s="off.stopped"></td></tr>
<tr><td>data leaked</td><td data-s="on.leaked"></td><td data-s="off.leaked"></td></tr>
<tr><td>actions with no record</td><td data-s="on.unrec"></td><td data-s="off.unrec"></td></tr></tbody></table>`;
const scoreHome=document.getElementById("pop-score"); if(scoreHome) scoreHome.appendChild(score);

/* the two panels behind the deck's buttons: this visit, and the log. A click
   opens one and keeps it; switching the governance shows this visit on its own
   for a few seconds, because that is when the comparison means something. */
const panels={score:document.getElementById("pop-score"),log:document.getElementById("pop-log")};
const tools=[...document.querySelectorAll(".floor .tool")];
let keptPop=null, popTimer=0;
function hidePops(){for(const k in panels) if(panels[k]) panels[k].hidden=true;tools.forEach(b=>b.setAttribute("aria-expanded","false"));keptPop=null;}
function showPop(name,how){
  const p=panels[name]; if(!p) return;
  if(how==="toggle"&&!p.hidden&&keptPop===name){hidePops();return;}
  hidePops(); p.hidden=false; tools.forEach(b=>b.setAttribute("aria-expanded",String(b.dataset.pop===name)));
  clearTimeout(popTimer);
  if(how==="toggle") keptPop=name; else popTimer=setTimeout(()=>{if(!keptPop) hidePops();},5500);
}
tools.forEach(b=>b.addEventListener("click",()=>showPop(b.dataset.pop,"toggle")));
addEventListener("keydown",e=>{if(e.key==="Escape") hidePops();});
document.addEventListener("pointerdown",e=>{const t=e.target;if(keptPop&&!(t.closest&&t.closest(".pop-panel,.tool"))) hidePops();});
const cells=[...score.querySelectorAll("[data-s]")];
let scoreKey="";
function paintScore(){
  const key=JSON.stringify(S); if(key===scoreKey) return; scoreKey=key;
  for(const c of cells){const [m,f]=c.dataset.s.split(".");const v=S[m][f];
    c.textContent=f==="spent"?"$"+v.toFixed(2):String(v);
    c.classList.toggle("bad",m==="off"&&v>0&&f!=="stopped");c.classList.toggle("good",m==="on"&&f==="stopped"&&v>0);}
}
const mode=()=>gov?S.on:S.off;

/* a packet goes agent -> gate, then gate -> outside, unless the gate says otherwise */
function send(a,gate,opt){
  opt=opt||{};
  packets.push({a,gate,t0:now,p0:agentPos(a,now),d1:opt.d1||1.05,d2:opt.d2||.8,fate:opt.fate||"pass",verdict:opt.verdict,
    c:opt.c||mix(GATES[gate].c,C.white,.35),cost:opt.cost||0,at:false,done:false,onGate:opt.onGate,onEnd:opt.onEnd,big:opt.big});
}
function burst(p,c,n){bursts.push({p,c,t0:now,n:n||9});}
function pop(text,p,cls,dur){pops.push({text,p,cls,t0:now,dur:dur||1.6,id:"pop"+Math.random().toString(36).slice(2,7)});}
/* a refusal lands: a shockwave on the floor, a flare in the wall where it struck, a verdict beside the gate */
function impact(gate,c,verdict,cls){
  const g=GATES[gate]; impacts.push({th:g.th,t0:now,c,at:g.gate});
  if(verdict) pop(verdict,g.gate,cls||"verdict",2.4);
}

/* ---- the five things a visitor can make an agent do ---- */
const busy={};
const pick=(()=>{let k=3;return ()=>{k=(k+5)%16;return AG[k];};})();
const ACTS={
  spend(){
    const a=pick(); a.state="spend"; let n=0, spent=0; const LINE=6;
    log(`<b>${a.name}</b> starts calling the model in a loop.`,"#F4B23E");
    const iv=setInterval(()=>{
      if(++n>(gov?14:22)){clearInterval(iv);busy.spend=false;a.state=null;
        if(gov){log(`<b>${a.name}</b> hit its budget after ${LINE} calls. ${n-1-LINE} more answered 402, never sent.`,"#F4B23E");a.paused=now;}
        else{log(`<b>${a.name}</b> made ${n-1} calls. Nobody stopped it: $${spent.toFixed(2)} gone.`,"#FF574B");a.fire=now;}
        return;}
      const over=gov&&n>LINE;
      if(!over) spent+=3.4;
      send(a,"models",{d1:.75,fate:over?"block":"pass",verdict:"402 · never sent",cost:over?0:3.4,c:over?mix(C.amber,C.ember,.4):mix(C.amber,C.white,.3)});
    },130);
  },
  site(){
    const a=pick(); a.state="site";
    log(`<b>${a.name}</b> tries a site nobody listed.`,"#F0ABFC");
    send(a,"unknown",{fate:gov?"block":"pass",verdict:"denied: nobody listed it",c:mix(C.orchid,C.white,.3),onEnd:()=>{
      if(!gov){leakNow(a);log(`<b>${a.name}</b> sent your data to it. Nothing recorded, nobody told.`,"#FF574B");}
    },onGate:()=>{ if(gov){log(`<b>${a.name}</b>: denied at the checkpoint, nothing left the floor.`,"#F0ABFC");} }});
    setTimeout(()=>{busy.site=false;a.state=null;},3800);
  },
  key(){
    const a=pick(), other=AG[(a.i+7)%16]; a.state="key"; a.col=C.iris;
    log(`<b>${a.name}</b> presents <b>${other.name}</b>'s key.`,"#34D399");
    send(a,"systems",{fate:gov?"block":"pass",verdict:"refused: not its key",c:mix(C.iris,C.white,.3),onGate:()=>{
      if(gov) log(`<b>${a.name}</b> refused: the key belongs to someone else.`,"#34D399");
    },onEnd:()=>{ if(!gov){sysFlash=now;a.fire=now;log(`<b>${a.name}</b> got in as <b>${other.name}</b>. Your systems could not tell.`,"#FF574B");} }});
    setTimeout(()=>{busy.key=false;a.state=null;a.col=null;},3200);
  },
  pay(){
    const a=pick(); a.state="pay";
    log(`<b>${a.name}</b> wants to send <b>&#8364;48,000</b>.`,"#2DD4BF");
    if(gov){
      send(a,"systems",{fate:"hold",c:mix(C.teal,C.white,.3),onGate:p=>{
        holds.push({t0:now,dur:2.4,from:GATES.systems.gate,to:GATES.people.gate,a});
        impact("systems",C.amber,"held for a person","hold");
        log(`Above the line: held for a person.`,"#2DD4BF");
      }});
    } else {
      send(a,"systems",{fate:"pass",c:mix(C.teal,C.white,.3),onEnd:()=>{sysFlash=now;a.fire=now;log(`<b>${a.name}</b> sent &#8364;48,000. Nobody was asked.`,"#FF574B");}});
    }
    setTimeout(()=>{busy.pay=false;a.state=null;},gov?5200:3000);
  },
  edit(){
    const a=pick(); a.state="edit";
    if(gov&&records.length>8){
      const target=records[records.length-6];
      log(`<b>${a.name}</b> rewrites record <b>${target.id.toLocaleString("en")}</b>.`,"#E4626F");
      packets.push({a,gate:"tower",t0:now,p0:agentPos(a,now),d1:.8,d2:0,fate:"tamper",c:C.ember,at:false,done:false,onGate:()=>{
        tamper={t:now,id:target.id};S.on.stopped++;
        log(`The chain no longer verifies after <b>${target.id.toLocaleString("en")}</b>. A link went to a person.`,"#E4626F");
        packets.push({a:null,gate:"people",t0:now,p0:[0,1.05,0],d1:1.1,d2:0,fate:"alert",c:C.mint,at:false,done:false});
      }});
    } else {
      log(`<b>${a.name}</b> covers its tracks. There is no record to check.`,"#FF574B");
      a.fire=now; if(!gov) S.off.unrec++;
    }
    setTimeout(()=>{busy.edit=false;a.state=null;},4200);
  },
};
function leakNow(a){leak={t:now,from:GATES.systems.ext,to:GATES.unknown.ext};a.fire=now;S.off.leaked++;
  impacts.push({th:GATES.unknown.th,t0:now,c:C.ember,at:GATES.unknown.ext});pop("data leaked",GATES.unknown.ext,"verdict",2.4);}

/* ---- the visitor takes an agent to a door: the gate decides by its passport ---- */
function sendTo(a,door){
  lastUser=now;
  const allowed=door!=="unknown"&&a.allowed.includes(door);
  const who=`<b>${a.name}</b>`, where=DOOR_NAME[door];
  if(gov){
    if(door==="models"&&a.spent>=a.limit){
      send(a,"models",{fate:"block",verdict:"402 · over its budget",c:mix(C.amber,C.ember,.4)});
      log(`${who} asks ${where}: over its budget, answered 402, never sent.`,"#F4B23E");
    } else if(door==="unknown"){
      send(a,"unknown",{fate:"block",verdict:"denied: nobody listed it",c:mix(C.orchid,C.white,.3)});
      log(`${who} tries ${where}: denied at the checkpoint.`,"#F0ABFC");
    } else if(!allowed){
      send(a,door,{fate:"block",verdict:"refused: not in its passport",c:mix(GATES[door].c,C.ember,.35)});
      log(`${who} tries ${where}: not in its passport, refused.`,"#FF8A80");
    } else {
      send(a,door,{fate:"pass",cost:door==="models"?.4:0});
      log(`${who} goes to ${where}: allowed by its passport, and recorded.`,"#34D399");
    }
  } else {
    send(a,door,{fate:"pass",cost:door==="models"?3.4:0,onEnd:()=>{
      if(door==="unknown"){leakNow(a);log(`${who} reached ${where} and sent your data. Nobody saw it.`,"#FF574B");}
      else if(!allowed){a.fire=now;log(`${who} walked into ${where} unchecked. Its passport would have said no.`,"#FF574B");}
      else log(`${who} reached ${where}. Nothing was checked, nothing was written down.`,"#FF8A80");
    }});
  }
  if(st) st.invalidate();
}

function act(name,auto){
  if(busy[name]) return; busy[name]=true;
  document.querySelectorAll(".act").forEach(b=>b.classList.toggle("busy",!!busy[b.dataset.act]));
  ACTS[name]();
  if(!auto) lastUser=now;
  setTimeout(()=>document.querySelectorAll(".act").forEach(b=>b.classList.toggle("busy",!!busy[b.dataset.act])),5400);
  if(st) st.invalidate();
}
function setGov(on){
  if(gov===on) return; gov=on; govT=now;
  if(!keptPop) showPop("score","auto");
  document.querySelectorAll(".gov button").forEach(b=>b.setAttribute("aria-pressed",String((b.dataset.gov==="on")===on)));
  if(on){AG.forEach(a=>{if(a.fire>=0){a.fire=-1;burst(agentPos(a,now),C.mint,10);}});log(`Governance <b>on</b>. The wall is back, the fires are out, every gate answers again.`,"#2DD4BF");}
  else{scatter={t:now,rings:records.slice(-13).map((r,k)=>({k,dx:(Math.random()-.5)*2.4,dz:(Math.random()-.5)*2.4,sp:.6+Math.random()*.8}))};
    log(`Governance <b>off</b>. The wall is down and the record is gone. Try the same things.`,"#FF574B");}
  lastUser=now; if(st) st.invalidate();
}
document.querySelectorAll(".act").forEach(b=>b.addEventListener("click",()=>act(b.dataset.act)));
document.querySelectorAll(".gov button").forEach(b=>b.addEventListener("click",()=>setGov(b.dataset.gov==="on")));

/* autoplay: the floor shows itself until someone touches it */
let lastUser=-99, autoNext=2.5, autoK=0;
const AUTO=["spend","site","pay","key","edit"];

/* the cursor: drag turns the floor; hover shows a passport; a click pins it,
   and with an agent pinned a click on a door sends it there */
let yaw=0, drag=null, hx=-1, hy=-1, movedAt=0, hoverA=null, hoverDoor=null, pinned=null, ripples=[], lastRip=0;
function doorAt(x,y){let best=null,bd=46;for(const k in GATES){const g=GATES[k];if(!g.door||g.sx==null) continue;
  for(const [sx,sy] of [[g.sx,g.sy],[g.gx,g.gy]]){const d=Math.hypot(sx-x,sy-y);if(d<bd){bd=d;best=k;}}}return best;}
cv.addEventListener("pointerdown",e=>{drag={x:e.clientX,y0:yaw,moved:false};cv.setPointerCapture(e.pointerId);});
cv.addEventListener("pointermove",e=>{
  const r=cv.getBoundingClientRect();hx=e.clientX-r.left;hy=e.clientY-r.top;movedAt=performance.now();
  if(drag){if(Math.abs(e.clientX-drag.x)>5) drag.moved=true;if(drag.moved){yaw=clamp(drag.y0+(e.clientX-drag.x)*.006,-1.1,1.1);}}
  if(st) st.invalidate();
});
cv.addEventListener("pointerup",e=>{
  if(drag&&!drag.moved){
    /* pick from where things were last drawn, so a tap works without a hover first */
    const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;let hit=null,bd=34;
    for(const a of AG){if(a.sx==null) continue;const d=Math.hypot(a.sx-x,a.sy-y);if(d<bd){bd=d;hit=a;}}
    const door=hit?null:doorAt(x,y);
    if(door){ if(pinned) sendTo(pinned,door); else pop("click an agent first",GATES[door].ext,"ok",1.8); }
    else pinned=hit&&hit!==pinned?hit:null;
  }
  drag=null;lastUser=now;});
cv.addEventListener("pointerleave",()=>{hx=-1;});
cv.addEventListener("pointercancel",()=>{drag=null;});

const pp=document.createElement("div");pp.className="passport";pp.setAttribute("aria-hidden","true");
pp.innerHTML=`<div class="pp-h"><b></b><span class="pp-state"></span></div><dl>
<div><dt>owner</dt><dd class="pp-owner"></dd></div>
<div><dt>budget today</dt><dd><span class="pp-bar"><i></i></span><span class="pp-spent"></span></dd></div>
<div><dt>may reach</dt><dd class="pp-reach"></dd></div>
<div><dt>on record</dt><dd class="pp-recs"></dd></div></dl><div class="pp-foot"></div>`;
cv.parentNode.appendChild(pp);
const PPN={models:"models",systems:"your systems",web:"the web"};
const hudBox=matchMedia("(max-width:860px)").matches?null:document.querySelector(".floor .hud");
let ppKey="";
function passport(st,a){
  if(!a){pp.classList.remove("on");return;}
  const p=agentPos(a,now), s=st.project(p);
  let x=s.x+26, y=s.y-80;
  if(x+260>st.W-8) x=s.x-26-252;
  y=clamp(y,8,st.H-210);
  /* and not under the panel on the right: if it would cover it, it goes to the agent's left */
  if(hudBox){const c=cv.getBoundingClientRect(), h=hudBox.getBoundingClientRect();
    const L=h.left-c.left, T=h.top-c.top, B=h.bottom-c.top;
    if(x+252>L-8&&x<h.right-c.left&&y<B&&y+200>T) x=Math.max(8,s.x-26-252);}
  pp.style.transform=`translate3d(${x.toFixed(0)}px,${y.toFixed(0)}px,0)`;
  pp.classList.add("on");pp.classList.toggle("pinned",a===pinned);
  const burning=a.fire>=0&&!gov, paused=a.paused>=0&&now-a.paused<3;
  const key=a.name+gov+burning+paused+a.state+(a===pinned)+Math.floor(now*4);
  if(key===ppKey) return; ppKey=key;
  pp.querySelector("b").textContent=a.name;
  const stt=pp.querySelector(".pp-state");
  const label=burning?"out of control":paused?"budget hit":a.state==="spend"?"looping":a.state?"acting":"working";
  stt.textContent=label;stt.className="pp-state "+(burning||paused||a.state?"hot":"ok");
  const bar=pp.querySelector(".pp-bar");
  if(gov){
    pp.querySelector(".pp-owner").textContent=a.owner;
    const f=Math.min(1,a.spent/a.limit);bar.firstChild.style.width=(f*100).toFixed(0)+"%";bar.classList.toggle("full",f>=1);
    pp.querySelector(".pp-spent").textContent=`$${Math.min(a.spent,a.limit).toFixed(2)} of $${a.limit}`;
    pp.querySelector(".pp-reach").innerHTML=["models","systems","web"].map(g=>`<span class="${a.allowed.includes(g)?"y":"n"}">${PPN[g]}</span>`).join("");
    pp.querySelector(".pp-recs").textContent=a.recs+" decisions";
  } else {
    pp.querySelector(".pp-owner").textContent="nobody";
    bar.firstChild.style.width="100%";bar.classList.add("full");
    pp.querySelector(".pp-spent").textContent="no limit";
    pp.querySelector(".pp-reach").innerHTML=`<span class="n" style="text-decoration:none">anything it finds</span>`;
    pp.querySelector(".pp-recs").textContent="nothing";
  }
  pp.querySelector(".pp-foot").textContent=a===pinned?"pinned · now click a door to send it there":"click to pin, then click a door";
}

/* ---- drawing ---- */
let lab=null;
function draw(st,t){
  if(t0===null) t0=t;
  const dt=Math.min(.1,t-t0-now); now=t-t0;
  const mobile=st.W<860;
  const sway=st.reduce?0:.06*Math.sin(now*.12);
  /* a refusal pulls the camera in a touch, so the moment registers */
  let punch=0;for(const im of impacts) punch=Math.max(punch,Math.exp(-(now-im.t0)*3.5));
  const ang=yaw+sway, dist=(mobile?16.2:11.6)-punch*.45, h=mobile?9.4:6.3;
  st.cam.eye=[Math.sin(ang)*dist,h,Math.cos(ang)*dist];
  st.cam.target=[0,.2,mobile?-.4:-.3];
  st.cam.fov=mobile?44:40;
  st.cam.shiftX=mobile?0:-.02; st.cam.shiftY=mobile?-.2:-.34;
  st.fog=[7,17];
  lab.begin();

  /* autoplay */
  if(now-lastUser>14&&now>autoNext){act(AUTO[autoK++%AUTO.length],true);autoNext=now+5.2;}

  /* floor grid, fading toward the edge */
  const tint=gov?C.steel:mix(C.steel,C.ember,.35);
  for(let k=-10;k<=10;k++){const v=k*.6;
    for(let s=-10;s<10;s++){const u0=s*.6,u1=u0+.6;
      const d0=Math.hypot(u0,v),d1=Math.hypot(u1,v);if(d0>6.4&&d1>6.4) continue;
      const a0=.13*clamp(1-d0/6.4,0,1),a1=.13*clamp(1-d1/6.4,0,1);
      st.line([u0,0,v],[u1,0,v],tint,a0,tint,a1);st.line([v,0,u0],[v,0,u1],tint,a0,tint,a1);}}

  /* the wall: it rises in a sweep from the model gate when governance comes on,
     falls when it goes off, and flares and bulges where a refusal struck it */
  const since=now-govT;
  let topSum=0;
  for(let k=0;k<120;k++){
    const th=k/120*Math.PI*2, b=onRing(th,R,0), delay=angDist(th,GATES.models.th)/Math.PI;
    const up=gov?smooth(0,.45,since-delay*.6):1-smooth(0,.35,since-delay*.3);
    let fl=0,fc=C.teal;
    for(const im of impacts){const a=Math.exp(-Math.pow(angDist(th,im.th)/.22,2))*Math.exp(-(now-im.t0)*2.2);if(a>fl){fl=a;fc=im.c;}}
    const hgt=WALL*up*(1+fl*1.1);
    topSum+=hgt;
    if(hgt<.02) continue;
    const col=mix(gov?C.teal:C.grey,fc,fl);
    st.line(b,[b[0],hgt,b[2]],col,(.22+fl*.7)*(gov?1:.5),col,fl*.3);
  }
  const wa=gov?smooth(0,.6,since):1-smooth(0,.5,since);
  st.circle([0,0,0],R,[1,0,0],[0,0,1],gov?C.teal:C.grey,.5*Math.max(wa,.25),160);
  if(wa>.02) st.circle([0,topSum/120,0],R,[1,0,0],[0,0,1],C.teal,.08*wa,160);

  /* shockwaves where refusals landed */
  for(let i=impacts.length-1;i>=0;i--){
    const im=impacts[i], age=now-im.t0; if(age>1.6){impacts.splice(i,1);continue;}
    const f=age/1.6, c=[im.at[0],.03,im.at[2]];
    st.circle(c,.15+f*1.7,[1,0,0],[0,0,1],im.c,(1-f)*.9,48);
    if(age<.8) st.circle(c,.1+f*.9,[1,0,0],[0,0,1],C.white,(1-age/.8)*.5,36);
  }

  /* gates and what lies beyond them; with an agent pinned, the doors call for a click */
  for(const k in GATES){
    const g=GATES[k];
    const fl=Math.exp(-(now-g.flash)*3);
    if(k!=="unknown"&&wa>.02){
      for(let s=-1;s<=1;s+=2){const b=onRing(g.th+s*deg(5),R,0);st.line(b,[b[0],.95*wa,b[2]],g.c,(.7+.3*fl)*wa);}
      const arc=[];for(let s=0;s<=8;s++) arc.push(onRing(g.th+deg(-5+s*10/8),R,.95*wa));
      for(let s=0;s<8;s++) st.line(arc[s],arc[s+1],g.c,.8*wa);
      st.point(g.gate,mix(g.c,C.white,.4),(.35+.65*fl)*wa,.3+.25*fl);
    }
    const ec=k==="unknown"?C.ember:g.c, ext=g.ext;
    st.point(ext,mix(ec,C.white,.45),1,.22);st.point(ext,ec,.2,.8);
    st.circle([ext[0],.02,ext[2]],.32,[1,0,0],[0,0,1],ec,.45,40);
    st.dashed(onRing(g.th,R+.15,.3),onRing(g.th,EXT-.3,.5),ec,.25,10,now*.6);
    if(g.door&&(pinned||hoverDoor===k)){
      const pl=(now*1.2)%1, on=hoverDoor===k;
      st.circle([ext[0],.04,ext[2]],.4+pl*.5,[1,0,0],[0,0,1],ec,(1-pl)*(on?1:.6),40);
      if(on) st.circle([ext[0],.04,ext[2]],.38,[1,0,0],[0,0,1],C.white,.9,40);
    }
    lab.set("g-"+k,g.label,ext,1,{dy:-26,cls:k==="unknown"?"pop":""});
    const s1=st.project(ext), s2=st.project(g.gate);g.sx=s1.x;g.sy=s1.y;g.gx=s2.x;g.gy=s2.y;
  }
  if(sysFlash>0&&now-sysFlash<1.6){const e=GATES.systems.ext;const f=(now-sysFlash)/1.6;st.circle([e[0],.05,e[2]],.3+f*1.2,[1,0,0],[0,0,1],C.ember,(1-f),48);}

  /* the record, a tower of rings in the middle: it builds back from the floor
     when governance comes on, and its rings scatter when it goes off */
  if(gov){
    const build=smooth(0,1,since);
    st.line([0,0,0],[0,1.15*build,0],C.record,.45);
    const show=Math.min(records.length,13), visible=Math.ceil(show*build);
    for(let k=0;k<show;k++){
      if(show-1-k>=visible) continue;
      const r=records[records.length-1-k], age=now-r.t, drop=clamp(1-age/.35,0,1);
      const y=1.05-k*.075+drop*.25;
      const bad=tamper&&now-tamper.t<5&&r.id>=tamper.id;
      const hit=tamper&&now-tamper.t<5&&r.id===tamper.id;
      const col=hit?C.ember:bad?mix(C.record,C.ember,.6+.4*Math.sin(now*20)):C.record;
      st.circle([0,y,0],.34,[1,0,0],[0,0,1],col,(hit?1:(k===0?.95:.6))*(1-drop*.6)*clamp(1-k/14,0,1),28);
      if(hit) lab.set("tamper","edit detected",[0,y,0],1,{dx:84,cls:"pop"});
    }
    st.point([0,1.2*build,0],C.record,.6*build,.18);
    if(build>.9) lab.set("tower","the record",[0,1.2,0],.9,{dy:-20});
  } else if(scatter&&now-scatter.t<1.6){
    const age=now-scatter.t;
    for(const r of scatter.rings){
      const y=1.05-r.k*.075+age*.4-age*age*1.8*r.sp;
      if(y<-.2) continue;
      st.circle([r.dx*age,y,r.dz*age],.34*(1-age*.3),[1,0,0],[0,0,1],C.ember,(1-age/1.6)*.8,22);
    }
    if(age<.6) lab.set("tower","the record is gone",[0,1.2,0],1-age/.6,{dy:-20,cls:"pop"});
  }

  /* agents: routine work, plus whatever the visitor asked for */
  for(const a of AG){
    const p=agentPos(a,now);
    if(!a.state&&now>a.next&&(a.paused<0||now-a.paused>3)){
      const r=Math.random(), want=r<.58?"models":r<.8?"systems":"web", gate=a.allowed.includes(want)?want:"models";
      send(a,gate,{cost:.03+Math.random()*.06});
      a.next=now+2.6+Math.random()*3.4;
    }
    /* wildfire: with the governance off a burning agent sets its neighbours alight */
    if(a.fire>=0&&!gov&&now-a.fire>2.2&&Math.random()<dt*.35){
      const nb=AG.filter(b=>b!==a&&b.fire<0).sort((x,y)=>V.len(V.sub(x.home,a.home))-V.len(V.sub(y.home,a.home)))[0];
      if(nb){nb.fire=now;}
    }
    const burning=a.fire>=0&&!gov, paused=a.paused>=0&&now-a.paused<3;
    let col=a.col||C.agent;
    if(a.state==="spend") col=mix(C.amber,C.white,.3);
    if(paused) col=C.grey;
    if(burning) col=mix(C.ember,C.amber,.5+.5*Math.sin(now*9+a.i));
    st.line([p[0],0,p[2]],p,col,.35,col,.05);
    st.circle([p[0],.01,p[2]],.17,[1,0,0],[0,0,1],col,.55,22);
    st.point(p,col,1,.13);st.point(p,col,.2,.5);
    /* its budget, as a ring round its feet: it fills as it spends and turns red at the line */
    if(gov){
      const f=clamp(a.spent/a.limit,0,1), segs=Math.max(1,Math.round(28*f)), bc=f>=1?C.ember:mix(C.amber,C.ember,Math.max(0,f-.7)/.3);
      let prev=null;for(let s=0;s<=segs;s++){const an=-Math.PI/2+s/28*Math.PI*2;const q=[p[0]+Math.cos(an)*.25,.015,p[2]+Math.sin(an)*.25];if(prev) st.line(prev,q,bc,.85);prev=q;}
    }
    if(burning){
      for(let s=0;s<10;s++){const f=((now*.9+s/10+a.i*.13)%1);st.point([p[0]+Math.sin(s*2.1+a.i)*.16*f,p[1]+f*.9,p[2]+Math.cos(s*1.7)*.16*f],mix(C.amber,C.ember,f),.95*(1-f),.11);}
      const pl=(now*.8+a.i*.1)%1;st.circle([p[0],.02,p[2]],.2+pl*.55,[1,0,0],[0,0,1],C.ember,(1-pl)*.8,28);
      st.point([p[0],.05,p[2]],C.ember,.35,1.1);
    }
    if(a.state||burning||paused) lab.set("a"+a.i,paused?a.name+" · paused":a.name,p,1,{dy:-24,cls:burning?"pop":""});
  }

  /* the cursor on the floor: nearest agent on screen, a door under it, and a ripple where it passes */
  hoverA=null;hoverDoor=null;
  for(const a of AG){const s=st.project(agentPos(a,now));a.sx=s.x;a.sy=s.y;}
  if(hx>=0){
    let bd=30;
    for(const a of AG){const d=Math.hypot(a.sx-hx,a.sy-hy);if(d<bd){bd=d;hoverA=a;}}
    if(!hoverA) hoverDoor=doorAt(hx,hy);
    const {o,d}=st.ray(hx,hy);
    if(d[1]<0){const hit=V.add(o,V.mul(d,-o[1]/d[1]));
      if(Math.hypot(hit[0],hit[2])<R-.1&&performance.now()-movedAt<120&&now-lastRip>.18){ripples.push({p:[hit[0],.01,hit[2]],t0:now});lastRip=now;}}
  }
  cv.classList.toggle("on-agent",!!hoverA||!!hoverDoor);
  for(let i=ripples.length-1;i>=0;i--){const q=ripples[i],age=now-q.t0;if(age>1){ripples.splice(i,1);continue;}
    st.circle(q.p,.06+age*.6,[1,0,0],[0,0,1],gov?C.teal:C.ember,(1-age)*.5,32);}
  const sel=pinned||hoverA;
  if(sel){
    const p=agentPos(sel,now), f=[p[0],.04,p[2]];
    st.circle(f,.3+.04*Math.sin(now*4),[1,0,0],[0,0,1],C.white,.85,36);
    for(const g of ["models","systems","web"]){
      const G=GATES[g], to=[G.gate[0],.04,G.gate[2]], ok=!gov||sel.allowed.includes(g);
      if(ok) st.dashed(f,to,gov?C.mint:C.ember,.6,16,now*.9);
      else{const end=V.lerp(f,to,.5);st.dashed(f,end,C.ember,.35,8,0);const k=.09;
        st.line(V.add(end,[-k,0,-k]),V.add(end,[k,0,k]),C.ember,1);st.line(V.add(end,[-k,0,k]),V.add(end,[k,0,-k]),C.ember,1);}
    }
    if(pinned&&hoverDoor){const G=GATES[hoverDoor];st.dashed(f,[G.ext[0],.06,G.ext[2]],C.white,.7,20,now*1.6);
      lab.set("aim","send "+pinned.name+" to "+DOOR_NAME[hoverDoor],G.ext,1,{dy:30,cls:"ok"});}
  }
  passport(st,sel);

  /* packets */
  for(const pk of packets){
    if(pk.done) continue;
    const age=now-pk.t0;
    const target=pk.gate==="tower"?[0,.8,0]:pk.gate==="people"&&pk.fate==="alert"?GATES.people.gate:GATES[pk.gate].gate;
    if(age<pk.d1){
      const f=age/pk.d1, mid=V.add(V.lerp(pk.p0,target,.5),[0,.9,0]);
      st.trail(k=>V.bez(pk.p0,mid,target,clamp(k,0,1)),f,.09,pk.c,1,pk.big?.11:.08,6);
      continue;
    }
    if(!pk.at){
      pk.at=true;
      const g=GATES[pk.gate];
      if(g) g.flash=now;
      if(pk.onGate) pk.onGate(target);
      if(pk.fate==="tamper"){burst(target,C.ember,14);pk.done=true;continue;}
      if(pk.fate==="alert"){burst(target,C.mint,10);pop("link sent to a person",target,"ok",2.2);pk.done=true;continue;}
      if(gov&&pk.gate!=="unknown") record(pk.a);
      if(!gov&&pk.a) S.off.unrec++;
      if(pk.fate==="block"){
        burst(target,C.ember,12);noCount++;S.on.stopped++;
        if(pk.a&&pk.gate==="models") pk.a.spent=Math.max(pk.a.spent,pk.a.limit);
        impact(pk.gate,pk.gate==="models"?C.amber:C.ember,pk.verdict||(pk.gate==="models"?"402 · never sent":"refused"));
        pk.done=true;continue;
      }
      if(pk.fate==="hold"){pk.done=true;continue;}
      if(pk.cost){spendLog.push({t:now,v:pk.cost});if(pk.a) pk.a.spent+=pk.cost;mode().spent+=pk.cost;}
    }
    const f=(age-pk.d1)/pk.d2;
    if(f>=1){pk.done=true;if(pk.onEnd) pk.onEnd();continue;}
    const g=GATES[pk.gate];
    st.trail(k=>V.lerp(g.gate,g.ext,clamp(k,0,1)),f,.12,pk.c,1,.075,6);
  }
  for(let i=packets.length-1;i>=0;i--) if(packets[i].done) packets.splice(i,1);

  /* a payment held for a person, then declined */
  for(let i=holds.length-1;i>=0;i--){
    const h=holds[i], age=now-h.t0;
    if(age<.7){const f=age/.7;st.trail(k=>V.bez(h.from,[ (h.from[0]+h.to[0])/2,1.6,(h.from[2]+h.to[2])/2],h.to,clamp(k,0,1)),f,.1,C.teal,1,.09,6);}
    else if(age<.7+h.dur){const pl=((age-.7)%.7)/.7;st.point(h.to,C.amber,1,.12);st.circle(h.to,.18+pl*.4,[1,0,0],[0,0,1],C.amber,(1-pl)*.9,32);
      lab.set("hold","waiting for a person",h.to,1,{dy:28});}
    else {burst(h.to,C.ember,10);pop("declined by a person",h.to,"verdict",2);noCount++;S.on.stopped++;record();holds.splice(i,1);log(`A person declined it. The payment never left.`,"#2DD4BF");}
  }

  /* a leak, with the governance off */
  if(leak){const age=now-leak.t;if(age>4) leak=null; else for(let s=0;s<8;s++){const f=((age*.8+s/8)%1);st.point(V.bez(leak.from,[ (leak.from[0]+leak.to[0])/2,2.2,(leak.from[2]+leak.to[2])/2],leak.to,f),C.ember,.9,.07);}}

  /* bursts and pop labels */
  for(let i=bursts.length-1;i>=0;i--){
    const b=bursts[i], age=now-b.t0; if(age>.7){bursts.splice(i,1);continue;}
    for(let s=0;s<b.n;s++){const an=s/b.n*Math.PI*2;st.point(V.add(b.p,[Math.cos(an)*age*.9,Math.sin(an*2)*age*.3+age*.3,Math.sin(an)*age*.9]),b.c,1-age/.7,.07);}
  }
  for(let i=pops.length-1;i>=0;i--){
    const q=pops[i], age=now-q.t0; if(age>q.dur){pops.splice(i,1);continue;}
    lab.set(q.id,q.text,V.add(q.p,[0,.45+age*.2,0]),Math.min(1,(q.dur-age)*3,age*8),{cls:q.cls});
  }
  lab.end();

  /* meters and the scoreboard */
  spendLog=spendLog.filter(e=>now-e.t<60);
  const spend=spendLog.reduce((s,e)=>s+e.v,0);
  meters.spend.textContent="$"+spend.toFixed(2);meters.spend.classList.toggle("hot",spend>30);
  meters.no.textContent=noCount;
  meters.hold.textContent=holds.length;
  meters.rec.textContent=gov?recCount.toLocaleString("en"):"none";
  meters.rec.classList.toggle("hot",!gov);
  clockEl.textContent=clock(now);
  paintScore();
}

/* A read-only probe for tests: where each agent and door was last drawn, in
   canvas pixels. Software-rendered WebGL makes hunting for them with a mouse
   sweep too slow to be a check; this reads, and changes nothing. */
cv.floorProbe=()=>({agents:AG.map(a=>({name:a.name,x:a.sx,y:a.sy})),
  doors:Object.keys(GATES).filter(k=>GATES[k].door).map(k=>({door:k,x:GATES[k].sx,y:GATES[k].sy}))});

const st=GL3.stage(cv,{draw,live:true});
if(st){lab=GL3.labels(document.querySelector(".floor-stage .gl-labels"),st);log("The floor is working. Click an agent, then a door; or press a button below.","#2DD4BF");}
})();
