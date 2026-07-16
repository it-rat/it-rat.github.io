/* IT-RAT v2 - Sim: the "watch it over a time window" engine, v2.
   Shared chrome (clock, counters, event log, play / scrub / speed) plus a
   registry of per-service STAGES, so every service renders its own kind of
   visualization instead of one generic line chart.
   Vanilla, no deps, honest about being a simulation.

   Sim.mount(rootEl, {
     window: 60,                 // simulated seconds in the whole timeline
     duration: 16000,            // real ms for a full pass at 1x
     clock: t => "...",          // format playhead label
     axis:  t => "...",          // format time-axis labels (chart stage)
     series: [{id,label,color,unit,max,fill,points:[[t,v],...]}],
     counters: [{id,label,unit,decimals,prefix,color,from:seriesId|fn}],
     events: [{t,cls:"info|ok|warn|bad",label}],
     stage: {mode:"gate", ...opts} // optional bespoke stage; falls back to "chart"
   })

   Sim.registerStage(name, factory)
     factory(stageOpts, cfg) -> {
       minHeight?: 280,          // css px floor for the canvas
       init?(w,h),               // called on every (re)size, css px
       draw(ctx,w,h,t,dt)        // MUST render as a pure function of t
     }                           // (dt only for cosmetic easing; scrub jumps t)
*/
(function(){
"use strict";
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------- shared utilities (also for stage authors) -------------- */
function interp(points,t){
  if(!points.length) return 0;
  if(t<=points[0][0]) return points[0][1];
  for(let i=1;i<points.length;i++){
    if(t<=points[i][0]){
      const [t0,v0]=points[i-1],[t1,v1]=points[i];
      const p=t1===t0?1:(t-t0)/(t1-t0);
      return v0+(v1-v0)*p;
    }
  }
  return points[points.length-1][1];
}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
/* progress 0..1 while t crosses [a,b] */
const between=(t,a,b)=>clamp((t-a)/Math.max(1e-6,b-a),0,1);
/* one-shot pulse envelope: rises fast at `at`, decays over `dur` */
const pulse=(t,at,dur)=>{const p=(t-at)/(dur||1); return p<0||p>1?0:(p<.18?p/.18:1-(p-.18)/.82);};
const ease={
  outCubic:p=>1-Math.pow(1-p,3),
  inOutCubic:p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2,
  outBack:p=>{const c=1.70158;return 1+(c+1)*Math.pow(p-1,3)+c*Math.pow(p-1,2);}
};
/* deterministic rng (mulberry32) - stages must NOT use Math.random in draw */
function rng(seed){let a=seed>>>0||1;return function(){a|=0;a=a+0x6D2B79F5|0;let x=Math.imul(a^a>>>15,1|a);x=x+Math.imul(x^x>>>7,61|x)^x;return((x^x>>>14)>>>0)/4294967296;};}
function fmt(n,dec){
  const s=(+n).toFixed(dec), i=s.indexOf(".");
  const int=(i<0?s:s.slice(0,i)).replace(/\B(?=(\d{3})+(?!\d))/g," ");
  return i<0?int:int+s.slice(i);
}
function rr(ctx,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
/* soft glowing dot */
function glow(ctx,x,y,r,col,core){
  const g=ctx.createRadialGradient(x,y,0,x,y,r*4);
  g.addColorStop(0,"rgba("+col+",.85)");g.addColorStop(1,"rgba("+col+",0)");
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*4,0,7);ctx.fill();
  ctx.fillStyle="rgba("+col+","+(core==null?1:core)+")";
  ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();
}
const PAL={fg:"233,239,246",dim:"138,151,166",faint:"90,102,117",
  mint:"52,211,153",amber:"244,178,62",ember:"255,87,75",iris:"108,123,255",
  teal:"45,212,191",violet:"180,140,255",rose:"255,122,162",coral:"255,138,91",
  steel:"147,168,196",cyan:"34,211,238",lime:"163,230,53"};

/* ---------------- stage registry ---------------- */
const stages={};
function registerStage(name,factory){stages[name]=factory;}

/* built-in "chart" stage: the original line/area chart, unchanged look */
registerStage("chart",function(opts,cfg){
  const W=cfg.window||60;
  return{
    draw(ctx,w,h,t){
      const padL=44,padR=12,padT=12,padB=22, iw=w-padL-padR, ih=h-padT-padB;
      ctx.strokeStyle="rgba(255,255,255,.055)";ctx.lineWidth=1;ctx.beginPath();
      for(let i=0;i<=4;i++){const y=padT+ih*i/4;ctx.moveTo(padL,y);ctx.lineTo(w-padR,y);}
      ctx.stroke();
      ctx.fillStyle="rgba(138,151,166,.75)";ctx.font="10px ui-monospace,Menlo,monospace";
      const maxAll=Math.max(...cfg.series.map(s=>s.max||Math.max(...s.points.map(p=>p[1]))||1));
      const axDec = maxAll>=10?0 : maxAll>=1?1 : maxAll>=0.1?2 : 4;
      for(let i=0;i<=4;i++){
        const v=maxAll*(1-i/4);
        ctx.fillText(v>=1000?(v/1000).toFixed(1)+"k":v.toFixed(axDec),6,padT+ih*i/4+3.5);
      }
      cfg.series.forEach(s=>{
        const max=s.max||maxAll;
        ctx.beginPath();ctx.lineWidth=2;ctx.strokeStyle=s.color;
        let started=false;const N=140;
        for(let i=0;i<=N;i++){
          const tt=W*i/N; if(tt>t) break;
          const v=interp(s.points,tt);
          const x=padL+iw*tt/W, y=padT+ih*(1-Math.min(1,v/max));
          started?ctx.lineTo(x,y):(ctx.moveTo(x,y),started=true);
        }
        ctx.stroke();
        if(s.fill!==false && started){
          const grad=ctx.createLinearGradient(0,padT,0,padT+ih);
          grad.addColorStop(0,s.color+"33");grad.addColorStop(1,s.color+"00");
          ctx.lineTo(padL+iw*Math.min(t,W)/W,padT+ih);ctx.lineTo(padL,padT+ih);ctx.closePath();
          ctx.fillStyle=grad;ctx.fill();
        }
      });
      (cfg.events||[]).forEach(ev=>{
        if(ev.t>t) return;
        const x=padL+iw*ev.t/W;
        ctx.strokeStyle={info:"#8A97A6",ok:"#34D399",warn:"#F4B23E",bad:"#FF574B"}[ev.cls]||"#8A97A6";
        ctx.globalAlpha=.85;ctx.setLineDash([2,3]);ctx.beginPath();
        ctx.moveTo(x,padT);ctx.lineTo(x,padT+ih);ctx.stroke();
        ctx.setLineDash([]);ctx.globalAlpha=1;
      });
      const px=padL+iw*Math.min(t,W)/W;
      ctx.strokeStyle="rgba(233,239,246,.6)";ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(px,padT-3);ctx.lineTo(px,padT+ih+3);ctx.stroke();
      ctx.fillStyle="rgba(90,102,117,.9)";
      [0,.25,.5,.75,1].forEach(p=>{
        ctx.fillText((cfg.axis?cfg.axis(W*p):(W*p).toFixed(0)+"s"),padL+iw*p-6,h-6);
      });
    }
  };
});

/* ---------------- the engine ---------------- */
function Sim(root,cfg){
  const W=cfg.window||60, DUR=cfg.duration||18000;
  root.classList.add("sim");
  root.innerHTML =
    `<div class="sim-head">
       <span class="sim-title">${cfg.title||"simulated run"}</span>
       ${(cfg.badges||[]).map(b=>`<span class="pill"><span class="dot" style="background:${b.color||"var(--accent)"};box-shadow:0 0 10px ${b.color||"var(--accent)"}"></span>${b.label}</span>`).join("")}
       <span class="sim-clock mono">t = 0.0s</span>
     </div>
     <div class="sim-body">
       <div class="sim-chart"><canvas></canvas></div>
       <div class="sim-side">
         <div class="sim-counters">${cfg.counters.map(c=>
           `<div class="sim-counter"><div class="v" data-c="${c.id}" style="color:${c.color||"var(--fg)"}">0</div><div class="k">${c.label}</div></div>`).join("")}
         </div>
         <div class="sim-log" aria-live="polite"></div>
       </div>
     </div>
     <div class="sim-foot">
       <button class="sim-play" aria-label="Play">&#9654;</button>
       <input class="sim-scrub" type="range" min="0" max="1000" value="0" aria-label="Timeline">
       <button class="sim-speed" data-s="1">1&#215;</button>
     </div>`;

  const cv=root.querySelector("canvas"), ctx=cv.getContext("2d");
  const clockEl=root.querySelector(".sim-clock");
  const logEl=root.querySelector(".sim-log");
  const playBtn=root.querySelector(".sim-play");
  const scrub=root.querySelector(".sim-scrub");
  const speedBtn=root.querySelector(".sim-speed");
  const counterEls={}; root.querySelectorAll("[data-c]").forEach(el=>counterEls[el.dataset.c]=el);

  /* pick the stage */
  const mode=cfg.stage&&cfg.stage.mode;
  const factory=(mode&&stages[mode])||stages.chart;
  const stage=factory(cfg.stage||{},cfg);
  if(stage.minHeight) cv.style.minHeight=stage.minHeight+"px";

  let t=0, playing=false, speed=1, fired=new Set(), cw=0, chh=0;

  function resize(){
    const r=cv.parentElement.getBoundingClientRect();
    const dpr=Math.min(2,devicePixelRatio||1);
    cw=Math.max(300,r.width-8); chh=Math.max(stage.minHeight||220,r.height-8);
    cv.width=cw*dpr; cv.height=chh*dpr;
    cv.style.width=cw+"px"; cv.style.height=chh+"px";
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if(stage.init) stage.init(cw,chh);
    ctx.clearRect(0,0,cw,chh);
    stage.draw(ctx,cw,chh,t,0);
  }
  addEventListener("resize",resize);

  function fmtOut(c,v){return (c.prefix||"")+fmt(v,c.decimals||0)+(c.unit||"");}
  function update(dt){
    clockEl.textContent="t = "+(cfg.clock?cfg.clock(t):t.toFixed(1)+"s");
    scrub.value=Math.round(1000*t/W);
    cfg.counters.forEach(c=>{
      let v;
      if(typeof c.from==="function") v=c.from(t);
      else{const s=cfg.series&&cfg.series.find(x=>x.id===c.from); v=s?interp(s.points,t):0;}
      counterEls[c.id].textContent=fmtOut(c,v);
    });
    (cfg.events||[]).forEach((ev,i)=>{
      if(ev.t<=t && !fired.has(i)){
        fired.add(i);
        const d=document.createElement("div");
        d.className="ev "+(ev.cls||"info");
        d.innerHTML=`<span class="t">${(cfg.clock?cfg.clock(ev.t):ev.t.toFixed(1)+"s")}</span><span>${ev.label}</span>`;
        logEl.appendChild(d); logEl.scrollTop=logEl.scrollHeight;
      }
    });
    ctx.clearRect(0,0,cw,chh);   /* clean frame: stages are pure functions of t */
    stage.draw(ctx,cw,chh,t,dt||0);
  }
  function rebuildLog(){ /* on scrub: rebuild deterministically */
    logEl.innerHTML=""; fired.clear();
    (cfg.events||[]).forEach((ev,i)=>{ if(ev.t<=t){fired.add(i);
      const d=document.createElement("div");d.className="ev "+(ev.cls||"info");d.style.animation="none";d.style.opacity=1;
      d.innerHTML=`<span class="t">${(cfg.clock?cfg.clock(ev.t):ev.t.toFixed(1)+"s")}</span><span>${ev.label}</span>`;
      logEl.appendChild(d);} });
    logEl.scrollTop=logEl.scrollHeight;
  }

  let timer=null,last=0;
  function step(){
    if(!playing) return;
    const now=performance.now();
    const dt=Math.min(1,(now-last)/1000)||0.033; last=now;
    const sdt=dt*speed*(W/(DUR/1000));
    t+=sdt;
    if(t>=W){t=W;update(sdt);pause();return;}
    update(sdt);
  }
  function play(){
    if(t>=W){t=0; rebuildLog();}
    playing=true; playBtn.innerHTML="&#10073;&#10073;"; last=performance.now();
    clearInterval(timer); timer=setInterval(step,33);
  }
  function pause(){playing=false;playBtn.innerHTML="&#9654;";clearInterval(timer);}
  playBtn.addEventListener("click",()=>playing?pause():play());
  scrub.addEventListener("input",()=>{t=W*scrub.value/1000;rebuildLog();update(0);});
  speedBtn.addEventListener("click",()=>{
    speed={1:2,2:4,4:1}[speed]; speedBtn.dataset.s=speed; speedBtn.innerHTML=speed+"&#215;";
  });

  resize(); update(0);
  if(reduce){ t=W; rebuildLog(); update(0); }
  else{
    /* autoplay once when it scrolls into view */
    const io=new IntersectionObserver(es=>{es.forEach(en=>{if(en.isIntersecting){io.disconnect();setTimeout(play,450);}})},{threshold:.35});
    io.observe(root);
  }
  return {play,pause,set:(v)=>{t=v;update(0);}};
}

window.Sim={
  mount:(el,cfg)=>Sim(el,cfg),
  registerStage,
  stages,
  util:{interp,clamp,between,pulse,ease,rng,fmt,rr,glow,PAL}
};
})();
