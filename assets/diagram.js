/* IT-RAT v2 - diagram.js: two fixes for the architecture schematics.
   1) Every .diagram svg gets an "enlarge" control and a full-screen
      lightbox with wheel / pinch zoom, drag pan, double-click toggle.
      Vector text, so at full screen every label is crisp and readable.
   2) Staggered draw-in: shapes and labels fade-rise one after another
      when the diagram scrolls into view.
   Vanilla, no deps. */
(function(){
"use strict";
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll(".diagram").forEach(box=>{
  const svg=box.querySelector("svg");
  if(!svg) return;

  /* ---- staggered reveal ---- */
  if(!reduce){
    let i=0;
    svg.querySelectorAll("rect,circle,text,line,path,ellipse").forEach(el=>{
      if(el.closest("defs")) return;
      el.classList.add("dg-el");
      el.style.setProperty("--i",Math.min(i++,30));
    });
    /* insurance: if animation frames never run (throttled webviews,
       paused timelines), snap everything visible shortly after reveal */
    const arm=()=>setTimeout(()=>box.classList.add("dg-done"),2200);
    if(box.classList.contains("in")) arm();
    else new MutationObserver((m,o)=>{
      if(box.classList.contains("in")){o.disconnect();arm();}
    }).observe(box,{attributes:true,attributeFilter:["class"]});
  }

  /* ---- enlarge control ---- */
  const btn=document.createElement("button");
  btn.type="button";btn.className="dg-btn";
  btn.innerHTML="&#8689; enlarge";
  btn.setAttribute("aria-label","Enlarge diagram");
  box.appendChild(btn);
  btn.addEventListener("click",()=>openLB(svg));
  svg.style.cursor="zoom-in";
  svg.addEventListener("click",()=>openLB(svg));
});

function openLB(svg){
  const prevFocus=document.activeElement;
  const vb=svg.viewBox.baseVal;
  const ov=document.createElement("div");
  ov.className="dg-ov";ov.setAttribute("role","dialog");ov.setAttribute("aria-label","Diagram, enlarged");
  ov.innerHTML=
    `<div class="dg-bar">
       <span class="dg-hint">drag to pan &#183; scroll or pinch to zoom &#183; double-click to reset</span>
       <span class="dg-sp"></span>
       <button class="dg-z" data-z="out" aria-label="Zoom out">&#8722;</button>
       <span class="dg-pct mono">100%</span>
       <button class="dg-z" data-z="in" aria-label="Zoom in">+</button>
       <button class="dg-x" aria-label="Close">esc &#215;</button>
     </div>
     <div class="dg-stage"><div class="dg-inner"></div></div>`;
  document.body.appendChild(ov);
  document.documentElement.classList.add("dg-lock");

  const stage=ov.querySelector(".dg-stage");
  const inner=ov.querySelector(".dg-inner");
  const pct=ov.querySelector(".dg-pct");
  const clone=svg.cloneNode(true);
  clone.classList.remove("dg-el");
  clone.querySelectorAll(".dg-el").forEach(el=>{el.classList.remove("dg-el");el.style.removeProperty("--i");});
  clone.removeAttribute("style");
  clone.removeAttribute("width");clone.removeAttribute("height");
  inner.appendChild(clone);

  /* centering is pure CSS: the stage is a flexbox that centers .dg-inner,
     and the svg's own viewBox (xMidYMid meet) centers the drawing inside
     it. The transform below only ADDS pan and zoom around the center, so
     the fitted state is centered no matter when layout settles. */
  let s=1,tx=0,ty=0;
  function apply(){
    inner.style.transform=`translate(${tx}px,${ty}px) scale(${s})`;
    pct.textContent=Math.round(s*100)+"%";
  }
  function fit(){ s=1;tx=0;ty=0;apply(); }
  function zoomAt(f,cx,cy){
    const ns=Math.min(6,Math.max(0.5,s*f));
    const r=inner.getBoundingClientRect();
    /* untransformed center of the fitted element */
    const c0x=r.left+r.width/2-tx, c0y=r.top+r.height/2-ty;
    const ux=(cx-c0x-tx)/s, uy=(cy-c0y-ty)/s;
    tx=cx-c0x-ns*ux; ty=cy-c0y-ns*uy; s=ns;
    apply();
  }
  fit();
  addEventListener("resize",fit);

  stage.addEventListener("wheel",e=>{
    e.preventDefault();
    zoomAt(Math.exp(-e.deltaY*0.0016),e.clientX,e.clientY);
  },{passive:false});
  stage.addEventListener("dblclick",e=>{
    if(s>1.05){fit();} else zoomAt(2.2,e.clientX,e.clientY);
  });
  ov.querySelectorAll(".dg-z").forEach(b=>b.addEventListener("click",()=>{
    const r=stage.getBoundingClientRect();
    zoomAt(b.dataset.z==="in"?1.35:1/1.35,r.left+r.width/2,r.top+r.height/2);
  }));

  /* drag pan + two-pointer pinch */
  const ptrs=new Map();
  let panStart=null,pinchStart=null;
  stage.addEventListener("pointerdown",e=>{
    stage.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(ptrs.size===1){panStart={x:e.clientX,y:e.clientY,tx,ty};stage.classList.add("grab");}
    if(ptrs.size===2){
      const [a,b]=[...ptrs.values()];
      pinchStart={d:Math.hypot(a.x-b.x,a.y-b.y),s};
      panStart=null;
    }
  });
  stage.addEventListener("pointermove",e=>{
    if(!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(ptrs.size===1&&panStart){
      tx=panStart.tx+(e.clientX-panStart.x);
      ty=panStart.ty+(e.clientY-panStart.y);
      apply();
    }else if(ptrs.size===2&&pinchStart){
      const [a,b]=[...ptrs.values()];
      const d=Math.hypot(a.x-b.x,a.y-b.y);
      const cx=(a.x+b.x)/2, cy=(a.y+b.y)/2;
      const target=pinchStart.s*(d/pinchStart.d);
      zoomAt(target/s,cx,cy);
    }
  });
  function lift(e){
    ptrs.delete(e.pointerId);
    if(ptrs.size<2) pinchStart=null;
    if(ptrs.size===0){panStart=null;stage.classList.remove("grab");}
    else if(ptrs.size===1){const [a]=[...ptrs.values()];panStart={x:a.x,y:a.y,tx,ty};}
  }
  stage.addEventListener("pointerup",lift);
  stage.addEventListener("pointercancel",lift);

  function close(){
    removeEventListener("resize",fit);
    removeEventListener("keydown",onKey);
    document.documentElement.classList.remove("dg-lock");
    ov.remove();
    if(prevFocus&&prevFocus.focus) prevFocus.focus();
  }
  function onKey(e){
    if(e.key==="Escape") close();
    if(e.key==="+"||e.key==="=") zoomAt(1.35,innerWidth/2,innerHeight/2);
    if(e.key==="-") zoomAt(1/1.35,innerWidth/2,innerHeight/2);
  }
  addEventListener("keydown",onKey);
  ov.querySelector(".dg-x").addEventListener("click",close);
  ov.addEventListener("click",e=>{if(e.target===ov) close();});
  ov.querySelector(".dg-x").focus();
}
})();
