/* IT-RAT v2 - sheet.js: a disclosure that opens as a panel, not inline.
   The markup is a plain <details class="sheet">, so with no JS at all the
   detail still opens where it stands. With JS the summary opens the same
   content in a centred panel instead, which keeps long commands and long
   explanations off the page until someone asks for them.
   Vanilla, no deps. */
(function(){
"use strict";

const sheets=[...document.querySelectorAll("details.sheet")].filter(d=>d.querySelector(".sheet-in"));

sheets.forEach(d=>{
  const sum=d.querySelector("summary");
  if(!sum) return;
  sum.setAttribute("aria-haspopup","dialog");
  sum.addEventListener("click",e=>{ e.preventDefault(); openSheet(d,sum); });
});

function openSheet(d,sum){
  const title=d.dataset.sheetTitle||sum.textContent.trim();
  const kicker=d.dataset.sheetKicker||"";

  const ov=document.createElement("div");
  ov.className="sh-ov";
  ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");ov.setAttribute("aria-label",title);
  ov.innerHTML=
    `<div class="sh-veil"></div>
     <div class="sh-box">
       <div class="sh-head">
         <div class="sh-ttl">${kicker?`<div class="kicker"></div>`:""}<h3></h3></div>
         <button class="sh-x" type="button" aria-label="Close">Esc &#215;</button>
       </div>
       <div class="sh-body"></div>
     </div>`;
  if(kicker) ov.querySelector(".sh-head .kicker").textContent=kicker;
  ov.querySelector(".sh-head h3").textContent=title;
  ov.querySelector(".sh-body").append(...d.querySelector(".sheet-in").cloneNode(true).childNodes);

  document.body.appendChild(ov);
  document.documentElement.classList.add("dg-lock");
  const box=ov.querySelector(".sh-box");
  box.setAttribute("tabindex","-1"); box.focus({preventScroll:true});

  function close(){
    document.documentElement.classList.remove("dg-lock");
    window.removeEventListener("keydown",keys,true);
    ov.remove();
    sum.focus({preventScroll:true});
  }
  ov.querySelector(".sh-x").addEventListener("click",close);
  ov.querySelector(".sh-veil").addEventListener("click",close);

  /* capture, because site.js pages the whole stack on the arrow keys and an
     open panel must not have the page slide out from under it */
  function keys(e){
    if(e.metaKey||e.ctrlKey||e.altKey) return;
    if(e.key==="Escape"){e.preventDefault();close();return;}
    if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();e.stopPropagation();return;}
    if(e.key==="Tab") trap(e);
  }
  /* keep tabbing inside the panel while it is the only thing on screen */
  function trap(e){
    const f=[...box.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')]
      .filter(el=>el.offsetParent!==null);
    if(!f.length) return;
    const first=f[0], last=f[f.length-1];
    if(e.shiftKey && (document.activeElement===first||document.activeElement===box)){e.preventDefault();last.focus();}
    else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
  }
  window.addEventListener("keydown",keys,true);
}
})();
