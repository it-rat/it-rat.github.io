/* tiles.js: the proof tiles on the home page come alive under the cursor.
 * They carry `card hover`, so the site's own spotlight and lift apply, the
 * same as the people cards; this adds a short count-up when the cursor finds
 * a tile, so a number that has finished counting still answers. */
(function(){
"use strict";
const still=matchMedia("(prefers-reduced-motion: reduce)");
document.querySelectorAll("#proof .stat [data-count]").forEach(el=>{
  const tile=el.closest(".stat"); let last=0;
  tile.addEventListener("pointerenter",()=>{
    if(still.matches) return;
    const now=performance.now(); if(now-last<1400) return; last=now;
    const target=parseFloat(el.dataset.count), dec=+(el.dataset.decimals||0), pre=el.dataset.prefix||"", suf=el.dataset.suffix||"";
    const t0=now, dur=650;
    (function tick(t){
      const p=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-p,3);
      el.textContent=pre+(target*(.55+.45*e)).toFixed(dec)+suf;
      if(p<1) requestAnimationFrame(tick); else el.textContent=pre+target.toFixed(dec)+suf;
    })(t0);
  });
});
})();
