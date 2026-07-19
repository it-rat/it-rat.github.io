/* IT-RAT v2 - shotbox.js: the diagram lightbox, for raster screenshots.
   Every .shot (a figure holding one <img>) gets the same "enlarge" control
   and the same full-screen overlay the architecture schematics use in
   diagram.js: wheel / pinch zoom, drag pan, double-click toggle, +/- keys,
   Esc to close. One shared overlay, same classes, same feel.
   Vanilla, no deps. */
(function(){
"use strict";

document.querySelectorAll(".shot").forEach(box=>{
  const img=box.querySelector("img");
  if(!img) return;
  const btn=document.createElement("button");
  btn.type="button";btn.className="dg-btn";
  btn.innerHTML="&#8689; enlarge";
  btn.setAttribute("aria-label","Enlarge screenshot");
  box.appendChild(btn);
  btn.addEventListener("click",()=>openLB(img));
  img.style.cursor="zoom-in";
  img.addEventListener("click",()=>openLB(img));
});

function openLB(srcImg){
  const ov=document.createElement("div");
  ov.className="dg-ov";ov.setAttribute("role","dialog");ov.setAttribute("aria-label","Screenshot, enlarged");
  ov.innerHTML=
    `<div class="dg-bar">
       <span class="dg-hint">drag to pan &#183; scroll or pinch to zoom &#183; double-click or click the image to reset / close</span>
       <span class="dg-sp"></span>
       <button class="dg-z" data-z="out" aria-label="Zoom out">&#8722;</button>
       <span class="dg-pct">100%</span>
       <button class="dg-z" data-z="in" aria-label="Zoom in">+</button>
       <button class="dg-x" aria-label="Close">Esc &#215;</button>
     </div>
     <div class="dg-stage"><div class="dg-inner sb-inner"></div></div>`;
  const inner=ov.querySelector(".dg-inner");
  const im=document.createElement("img");
  im.src=srcImg.currentSrc||srcImg.src; im.alt=srcImg.alt||"";
  im.draggable=false;
  im.style.cssText="display:block;width:100%;height:100%;object-fit:contain;border-radius:14px;user-select:none;-webkit-user-select:none";
  inner.appendChild(im);
  document.body.appendChild(ov);
  document.documentElement.classList.add("dg-lock");

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
  ov.querySelectorAll(".dg-z").forEach(b=>b.addEventListener("click",()=>{
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
    window.removeEventListener("keydown",keys);
    ov.remove();
  }
  ov.querySelector(".dg-x").addEventListener("click",close);
  function keys(e){
    if(e.key==="Escape") close();
    if(e.key==="+"||e.key==="=") zoomAt(1.35,innerWidth/2,innerHeight/2);
    if(e.key==="-") zoomAt(1/1.35,innerWidth/2,innerHeight/2);
  }
  window.addEventListener("keydown",keys);
  apply();
}
})();
