/* IT-RAT v2 - shotbox.js: the diagram lightbox, for raster screenshots.
   Every .shot (a figure holding one <img>) gets the same "enlarge" control
   and the same full-screen overlay the architecture schematics use in
   diagram.js: wheel / pinch zoom, drag pan, double-click toggle, +/- keys,
   Esc to close. One shared overlay, same classes, same feel.
   .gxc-teaser (the Genaryx console stills on enterprise.html) is the same
   thing under another name, so it enlarges too instead of being a link out.
   Frames that sit together stay together: enlarge one and the arrows walk
   the whole set without closing.
   Vanilla, no deps. */
(function(){
"use strict";

const boxes=[...document.querySelectorAll(".shot,.gxc-teaser")].filter(b=>b.querySelector("img"));

boxes.forEach(box=>{
  const img=box.querySelector("img");
  const btn=document.createElement("button");
  btn.type="button";btn.className="dg-btn";
  btn.innerHTML="&#8689; enlarge";
  btn.setAttribute("aria-label","Enlarge screenshot");
  box.appendChild(btn);
  btn.addEventListener("click",()=>openLB(box));
  img.style.cursor="zoom-in";
  img.addEventListener("click",()=>openLB(box));
});

/* the frames sharing one container are one set to page through */
function groupOf(box){
  const sibs=boxes.filter(b=>b.parentElement===box.parentElement);
  return sibs.length>1?sibs:[box];
}
/* the caption's own label, when it carries one */
function labelOf(box){
  const b=box.querySelector("figcaption b");
  return b?b.textContent.trim():"";
}

function openLB(startBox){
  const group=groupOf(startBox);
  const many=group.length>1;
  let i=group.indexOf(startBox);

  const ov=document.createElement("div");
  ov.className="dg-ov";ov.setAttribute("role","dialog");ov.setAttribute("aria-label","Screenshot, enlarged");
  ov.innerHTML=
    `<div class="dg-bar">
       <span class="dg-hint">drag to pan &#183; scroll or pinch to zoom${many?" &#183; &#8592; &#8594; for the next frame":""} &#183; click the image to reset or close</span>
       <span class="dg-sp"></span>
       ${many?`<button class="dg-z" data-go="-1" aria-label="Previous screenshot">&#8592;</button>
       <span class="dg-idx"></span>
       <button class="dg-z" data-go="1" aria-label="Next screenshot">&#8594;</button>
       <span class="dg-gap"></span>`:""}
       <button class="dg-z" data-z="out" aria-label="Zoom out">&#8722;</button>
       <span class="dg-pct">100%</span>
       <button class="dg-z" data-z="in" aria-label="Zoom in">+</button>
       <button class="dg-x" aria-label="Close">Esc &#215;</button>
     </div>
     <div class="dg-stage"><div class="dg-inner sb-inner"></div></div>`;
  const inner=ov.querySelector(".dg-inner");
  const im=document.createElement("img");
  im.draggable=false;
  im.style.cssText="display:block;width:100%;height:100%;object-fit:contain;border-radius:14px;user-select:none;-webkit-user-select:none";
  inner.appendChild(im);
  document.body.appendChild(ov);
  document.documentElement.classList.add("dg-lock");

  const idx=ov.querySelector(".dg-idx");
  const pad=n=>String(n).padStart(2,"0");
  const srcOf=box=>{const g=box.querySelector("img");return g.currentSrc||g.src;};
  function show(n){
    i=(n+group.length)%group.length;
    const box=group[i], g=box.querySelector("img");
    im.src=srcOf(box); im.alt=g.alt||"";
    if(idx){
      const l=labelOf(box);
      idx.textContent=`${pad(i+1)}/${group.length}${l?" · "+l:""}`;
    }
    fit();
    /* keep the page behind the overlay on the frame being read */
    box.scrollIntoView({block:"nearest",inline:"center",behavior:"instant"});
    /* the next one is usually the next click */
    if(many){[1,-1].forEach(d=>{const p=new Image();p.src=srcOf(group[(i+d+group.length)%group.length]);});}
  }
  const step=d=>show(i+d);
  ov.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>step(+b.dataset.go)));

  const stage=ov.querySelector(".dg-stage"), pct=ov.querySelector(".dg-pct");
  let s=1,tx=0,ty=0;
  const apply=()=>{inner.style.transform=`translate(${tx}px,${ty}px) scale(${s})`;pct.textContent=Math.round(s*100)+"%";};
  const fit=()=>{s=1;tx=0;ty=0;apply();};
  function zoomAt(f,cx,cy){
    const r=stage.getBoundingClientRect();
    const ns=Math.min(8,Math.max(1,s*f)); f=ns/s; if(f===1) return;
    const ox=cx-(r.left+r.width/2)-tx, oy=cy-(r.top+r.height/2)-ty;
    tx-=ox*(f-1); ty-=oy*(f-1); s=ns;
    if(s===1){tx=0;ty=0;}
    apply();
  }
  stage.addEventListener("wheel",e=>{e.preventDefault();zoomAt(Math.exp(-e.deltaY*0.0016),e.clientX,e.clientY);},{passive:false});
  stage.addEventListener("dblclick",e=>{ if(s>1.05){fit();} else zoomAt(2.2,e.clientX,e.clientY); });
  im.addEventListener("click",e=>{ if(drag.moved) return; if(s>1.05){fit();} else close(); });
  ov.querySelectorAll("[data-z]").forEach(b=>b.addEventListener("click",()=>{
    const r=stage.getBoundingClientRect();
    zoomAt(b.dataset.z==="in"?1.35:1/1.35,r.left+r.width/2,r.top+r.height/2);
  }));

  /* drag pan (mouse + touch via pointer events) */
  const drag={on:false,x:0,y:0,moved:false};
  stage.addEventListener("pointerdown",e=>{drag.on=true;drag.moved=false;drag.x=e.clientX;drag.y=e.clientY;stage.classList.add("grab");stage.setPointerCapture(e.pointerId);});
  stage.addEventListener("pointermove",e=>{
    if(!drag.on) return;
    const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
    if(Math.abs(dx)+Math.abs(dy)>3) drag.moved=true;
    tx+=dx;ty+=dy;drag.x=e.clientX;drag.y=e.clientY;apply();
  });
  const up=()=>{drag.on=false;stage.classList.remove("grab");};
  stage.addEventListener("pointerup",up);stage.addEventListener("pointercancel",up);

  /* pinch */
  const touches=new Map();let pinchD=0;
  stage.addEventListener("touchstart",e=>{[...e.touches].forEach(t=>touches.set(t.identifier,t));if(e.touches.length===2){const [a,b]=e.touches;pinchD=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);}},{passive:true});
  stage.addEventListener("touchmove",e=>{
    if(e.touches.length===2){
      e.preventDefault();
      const [a,b]=e.touches;
      const d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
      const cx=(a.clientX+b.clientX)/2, cy=(a.clientY+b.clientY)/2;
      if(pinchD) zoomAt(d/pinchD,cx,cy);
      pinchD=d;
    }
  },{passive:false});
  stage.addEventListener("touchend",()=>{pinchD=0;},{passive:true});

  function close(){
    document.documentElement.classList.remove("dg-lock");
    window.removeEventListener("keydown",keys,true);
    ov.remove();
  }
  ov.querySelector(".dg-x").addEventListener("click",close);
  /* capture, so the page's own arrow-key navigation never sees these first */
  function keys(e){
    if(e.metaKey||e.ctrlKey||e.altKey) return;
    if(e.key==="Escape"){e.preventDefault();close();return;}
    if(e.key==="+"||e.key==="="){e.preventDefault();zoomAt(1.35,innerWidth/2,innerHeight/2);return;}
    if(e.key==="-"){e.preventDefault();zoomAt(1/1.35,innerWidth/2,innerHeight/2);return;}
    if(e.key==="ArrowRight"||e.key==="ArrowLeft"){
      /* while a frame is open the arrows belong to it, even a lone one:
         the page must not slide out from under the overlay */
      e.preventDefault(); e.stopPropagation();
      if(many) step(e.key==="ArrowRight"?1:-1);
    }
  }
  window.addEventListener("keydown",keys,true);
  show(i);
}
})();
