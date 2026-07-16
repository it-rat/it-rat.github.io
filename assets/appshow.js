/* IT-RAT v2 - appshow.js: an animated tour of a real app.
   Renders a CSS iPhone frame (and optionally an Apple Watch frame) filled
   with real screenshots, plus a column of step cards explaining each screen.
   Screens auto-advance with a soft crossfade; clicking a step (or a frame)
   drives the tour manually. Reduced-motion users get instant swaps and no
   autoplay. No deps.

   AppShow.mount(el, {
     phone:[{img,t,d}, ...],      // screenshot url + title + description
     watch:[{img,t,d}, ...],      // optional
     interval: 4600               // autoplay ms per screen
   })
*/
(function(){
"use strict";
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;

function mount(root,cfg){
  const phone=cfg.phone||[], watch=cfg.watch||[];
  root.classList.add("appshow");
  root.innerHTML=
    `<div class="as-device">
       <figure class="as-phone" role="group" aria-label="App screens">
         <span class="as-island"></span>
         ${phone.map((s,i)=>`<img src="${s.img}" alt="${s.t}" ${i?'loading="lazy"':""} class="${i===0?"on":""}">`).join("")}
       </figure>
       ${watch.length?`
       <figure class="as-watch" role="group" aria-label="Watch screens">
         <span class="as-crown"></span>
         ${watch.map((s,i)=>`<img src="${s.img}" alt="${s.t}" loading="lazy" class="${i===0?"on":""}">`).join("")}
         <figcaption class="as-wcap mono">${watch[0].t}</figcaption>
       </figure>`:""}
     </div>
     <div class="as-steps">
       ${phone.map((s,i)=>`
         <button type="button" class="as-step${i===0?" on":""}" data-i="${i}">
           <span class="as-n mono">${String(i+1).padStart(2,"0")}</span>
           <span class="as-body"><b>${s.t}</b><span>${s.d}</span></span>
         </button>`).join("")}
       ${watch.length?`<div class="as-note mono">and on the wrist: ${watch.map(w=>w.t.toLowerCase()).join(" · ")}</div>`:""}
     </div>`;

  const imgs=[...root.querySelectorAll(".as-phone img")];
  const steps=[...root.querySelectorAll(".as-step")];
  const wimgs=[...root.querySelectorAll(".as-watch img")];
  const wcap=root.querySelector(".as-wcap");
  let cur=0, wcur=0, timer=null, holdUntil=0;

  function show(i){
    cur=(i+phone.length)%phone.length;
    imgs.forEach((im,k)=>im.classList.toggle("on",k===cur));
    steps.forEach((st,k)=>st.classList.toggle("on",k===cur));
  }
  function wshow(i){
    if(!wimgs.length) return;
    wcur=(i+wimgs.length)%wimgs.length;
    wimgs.forEach((im,k)=>im.classList.toggle("on",k===wcur));
    if(wcap) wcap.textContent=watch[wcur].t;
  }
  steps.forEach(st=>st.addEventListener("click",()=>{
    show(+st.dataset.i); holdUntil=Date.now()+12000;
  }));
  root.querySelector(".as-phone").addEventListener("click",()=>{
    show(cur+1); holdUntil=Date.now()+12000;
  });
  const wfig=root.querySelector(".as-watch");
  wfig&&wfig.addEventListener("click",()=>{wshow(wcur+1); holdUntil=Date.now()+12000;});

  if(!reduce){
    /* autoplay only while on screen */
    let seen=false;
    new IntersectionObserver(es=>{
      es.forEach(en=>{
        seen=en.isIntersecting;
        clearInterval(timer);
        if(seen) timer=setInterval(()=>{
          if(Date.now()<holdUntil) return;
          show(cur+1);
          if(wimgs.length&&cur%2===0) wshow(wcur+1);
        },cfg.interval||4600);
      });
    },{threshold:.25}).observe(root);
  }
}
window.AppShow={mount};
})();
