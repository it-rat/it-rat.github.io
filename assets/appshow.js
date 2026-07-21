/* IT-RAT v2 - appshow.js: an animated tour of a real app.
   Renders a CSS iPhone frame (and optionally an Apple Watch frame) filled
   with real screenshots, plus a column of step cards explaining each screen.
   Screens auto-advance with a soft crossfade; clicking a step (or a frame)
   drives the tour manually. Reduced-motion users get instant swaps and no
   autoplay. No deps.

   A step may carry ONE screenshot or SEVERAL. That is what `imgs` is for: a
   screen is usually a short story rather than a single frame (open the tab,
   drill into a row, watch the state change), and tying one card to one frame
   forces a bad choice between burying the reader in twenty near-identical
   cards and throwing away the frames that show what the app can actually do.
   Autoplay walks every frame in order; the card that highlights is the one
   that owns the frame currently showing; clicking a card jumps to that card's
   FIRST frame. So the number of cards and the number of screenshots are free
   to differ. A step given plain `img` still behaves exactly as before.

   AppShow.mount(el, {
     phone:[{img,t,d}, {imgs:[a,b,c],t,d}, ...],   // one frame or several
     watch:[{img,t}, {imgs:[a,b],t}, ...],         // optional, same rule
     interval: 4600                                // autoplay ms per FRAME
   })
*/
(function(){
"use strict";
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Flatten the steps into the frame list the <img> tags actually render,
   remembering which step owns each frame and where each step begins. */
function flatten(steps){
  const frames=[], firstOf=[];
  steps.forEach((s,si)=>{
    const list=(s.imgs&&s.imgs.length)?s.imgs:(s.img?[s.img]:[]);
    firstOf[si]=frames.length;
    list.forEach(src=>frames.push({src,step:si}));
  });
  return {frames,firstOf};
}

function mount(root,cfg){
  const phone=cfg.phone||[], watch=cfg.watch||[];
  const P=flatten(phone), W=flatten(watch);
  root.classList.add("appshow");
  root.innerHTML=
    `<div class="as-device">
       <figure class="as-phone" role="group" aria-label="App screens">
         <span class="as-island"></span>
         ${P.frames.map((f,i)=>`<img src="${f.src}" alt="${phone[f.step].t}" ${i?'loading="lazy"':""} class="${i===0?"on":""}">`).join("")}
       </figure>
       ${W.frames.length?`
       <figure class="as-watch" role="group" aria-label="Watch screens">
         <span class="as-crown"></span>
         ${W.frames.map((f,i)=>`<img src="${f.src}" alt="${watch[f.step].t}" loading="lazy" class="${i===0?"on":""}">`).join("")}
         <figcaption class="as-wcap mono">${watch[0].t}</figcaption>
       </figure>`:""}
     </div>
     <div class="as-steps">
       ${phone.map((s,i)=>`
         <button type="button" class="as-step${i===0?" on":""}" data-i="${i}">
           <span class="as-n mono">${String(i+1).padStart(2,"0")}</span>
           <span class="as-body"><b>${s.t}</b><span>${s.d}</span></span>
         </button>`).join("")}
       ${watch.length?`<div class="as-note mono">and on the wrist: ${watch.map(w=>w.t.toLowerCase()).join(" &#183; ")}</div>`:""}
     </div>`;

  const imgs=[...root.querySelectorAll(".as-phone img")];
  const steps=[...root.querySelectorAll(".as-step")];
  const wimgs=[...root.querySelectorAll(".as-watch img")];
  const wcap=root.querySelector(".as-wcap");
  let cur=0, wcur=0, timer=null, holdUntil=0;

  /* A frame that is about to be shown must not depend on the lazy-loading
     heuristic. Every frame after the first is stacked at opacity 0, and a
     backgrounded or embedded view reports the document as hidden, so the
     browser never decides those frames are worth fetching and the device
     shows an empty screen when their turn comes. Flipping the attribute to
     eager starts the fetch immediately, even while hidden, so warm the frame
     being shown and the one after it and let the rest stay lazy. */
  function warm(list,i){
    if(!list.length) return;
    const im=list[((i%list.length)+list.length)%list.length];
    if(im&&im.loading==="lazy") im.loading="eager";
  }

  function show(i){
    if(!P.frames.length) return;
    cur=(i+P.frames.length)%P.frames.length;
    const owner=P.frames[cur].step;
    warm(imgs,cur); warm(imgs,cur+1);
    imgs.forEach((im,k)=>im.classList.toggle("on",k===cur));
    steps.forEach((st,k)=>st.classList.toggle("on",k===owner));
  }
  function wshow(i){
    if(!W.frames.length) return;
    wcur=(i+W.frames.length)%W.frames.length;
    warm(wimgs,wcur); warm(wimgs,wcur+1);
    wimgs.forEach((im,k)=>im.classList.toggle("on",k===wcur));
    if(wcap) wcap.textContent=watch[W.frames[wcur].step].t;
  }
  warm(imgs,1); warm(wimgs,0);
  /* A card click lands on that card's FIRST frame, never on whichever frame
     happened to be showing: the words and the picture have to agree the
     instant the reader asks for them. */
  steps.forEach(st=>st.addEventListener("click",()=>{
    show(P.firstOf[+st.dataset.i]); holdUntil=Date.now()+12000;
  }));
  root.querySelector(".as-phone").addEventListener("click",()=>{
    show(cur+1); holdUntil=Date.now()+12000;
  });
  const wfig=root.querySelector(".as-watch");
  wfig&&wfig.addEventListener("click",()=>{wshow(wcur+1); holdUntil=Date.now()+12000;});

  if(!reduce){
    /* Autoplay pauses off screen, but it must not WAIT for the observer to
       grant permission: an embedded or backgrounded view never reports an
       intersection, and the tour would sit on frame one forever. Start it, let
       the observer stop and restart it once it has an opinion. */
    const tick=()=>{
      if(Date.now()<holdUntil) return;
      show(cur+1);
      if(W.frames.length&&cur%2===0) wshow(wcur+1);
    };
    const start=()=>{clearInterval(timer); timer=setInterval(tick,cfg.interval||4600)};
    start();
    new IntersectionObserver(es=>{
      /* A view that is not being rendered answers "not intersecting" to its
         very first callback, which would kill the tour it just started.
         Only a document that can actually see itself gets a vote. */
      if(document.visibilityState!=="visible") return;
      es.forEach(en=>en.isIntersecting?start():clearInterval(timer));
    },{threshold:.25}).observe(root);
  }
}
window.AppShow={mount};
})();
