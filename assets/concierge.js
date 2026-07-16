/* IT-RAT v2 - concierge.js: the footer desk agent.
   A deliberately deterministic chat: no LLM, no network, no tracking.
   It listens (free text is always welcome, chips are just shortcuts),
   lets the visitor write several sentences across several messages,
   asks who the note is for (Yurii, Tania, or whoever fits), then drafts
   a structured note and hands off via the visitor's own mail client or
   clipboard. Nothing leaves the page until the visitor chooses to send. */
(function(){
"use strict";
const MAIL="itratmail@gmail.com";
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
const esc=s=>s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

function mount(root){
  root.classList.add("cg");
  root.innerHTML=
    `<div class="cg-head mono"><span class="cg-dot"></span>desk-agent v2 · deterministic · no model in this path</div>
     <div class="cg-log" aria-live="polite"></div>
     <div class="cg-quick"></div>
     <form class="cg-form">
       <input type="text" autocomplete="off" spellcheck="false" placeholder="" aria-label="Your message">
       <button type="submit" class="cg-send" aria-label="Send">&#8594;</button>
     </form>`;
  const log=root.querySelector(".cg-log"), quick=root.querySelector(".cg-quick");
  const form=root.querySelector(".cg-form"), input=form.querySelector("input");
  const note={intent:"",lines:[],to:"",who:"",email:""};
  let step="intent";

  function add(cls,html){
    const d=document.createElement("div");
    d.className="cg-msg "+cls; d.innerHTML=html;
    log.appendChild(d); log.scrollTop=log.scrollHeight;
    return d;
  }
  function agent(html,then){
    const d=add("a","<i></i><i></i><i></i>");
    d.classList.add("typing");
    setTimeout(()=>{
      d.classList.remove("typing"); d.innerHTML=html;
      log.scrollTop=log.scrollHeight;
      if(then) then();
    },reduce?30:520);
  }
  function chips(list){
    quick.innerHTML=list.map(c=>`<button type="button" class="cg-chip" data-v="${esc(c)}">${esc(c)}</button>`).join("");
  }
  function hint(placeholder){ input.placeholder=placeholder; setTimeout(()=>input.focus({preventScroll:true}),80); }

  function draft(){
    return "For: "+(note.to||"whoever fits")+"\n"
      +"Intent: "+note.intent+"\n"
      +"From: "+note.who+"\n"
      +"Reply to: "+note.email+"\n\n"
      +note.lines.join("\n")+"\n\n"
      +"(sent via the it-rat site desk agent)";
  }
  function mailtoHref(){
    return "mailto:"+MAIL
      +"?subject="+encodeURIComponent("IT-RAT inquiry for "+(note.to||"the team")+": "+note.intent)
      +"&body="+encodeURIComponent(draft());
  }

  function askRecipient(){
    step="to";
    agent("Who should read it first? Yurii lives in cloud security and IAM, Tania in FinOps and cost governance. You can also just name a topic.",
      ()=>{chips(["Yurii","Tania","Whoever fits"]);hint("or type a name / topic");});
  }
  function askWho(){
    step="who";
    agent("Who should the reply go to? Name, and company if relevant.",()=>{quick.innerHTML="";hint("name, company");});
  }

  const onText={
    intent(v){ /* free text straight away: the message starts here */
      note.intent="Direct note"; note.lines.push(v); step="details";
      agent("Noted, word for word. Add as much as you like, every message becomes a line of the note. Done? Say so or press the button.",
        ()=>{chips(["That covers it"]);hint("add another sentence, or send the chip");});
    },
    details(v){
      note.lines.push(v);
      chips(["That covers it"]);hint("anything else?");
    },
    to(v){ note.to=v; askWho(); },
    who(v){
      note.who=v; step="email";
      agent("And an email for the answer. It is only used to write back, nothing else.",()=>hint("you@company.com"));
    },
    email(v){
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())){
        agent("That does not parse as an email. One more try?",()=>hint("you@company.com"));
        return;
      }
      note.email=v.trim(); step="done"; input.placeholder="";
      agent("Here is the note, exactly as it will leave this page:"
        +"<pre class='cg-draft'>"+esc(draft())+"</pre>"
        +"Press send and your own mail client opens with this text. This page keeps no copy.",
        ()=>chips(["Send from my mail app","Copy the note","Start over"]));
    }
  };

  quick.addEventListener("click",e=>{
    const b=e.target.closest(".cg-chip"); if(!b) return;
    const v=b.dataset.v;
    if(step==="intent"){
      add("u",esc(v)); note.intent=v; step="details";
      agent("Good. Tell me about it in your own words: your setup, your question, what you want to try. Several messages are fine.",
        ()=>{chips(["That covers it"]);hint("a sentence or two, or a few");});
      return;
    }
    if(step==="details"&&v==="That covers it"){
      if(!note.lines.length){ agent("Give me at least one sentence to carry, otherwise the note travels empty.",()=>hint("a sentence or two")); return; }
      add("u","that covers it"); askRecipient(); return;
    }
    if(step==="to"){ add("u",esc(v)); note.to=v; askWho(); return; }
    if(step==="done"){
      if(v==="Send from my mail app"){ add("u","send"); location.href=mailtoHref(); agent("Handed to your mail client. Thank you, a human reads these: "+(note.to&&note.to!=="Whoever fits"?note.to:"one of the two of us")+"."); }
      else if(v==="Copy the note"){
        add("u","copy");
        (navigator.clipboard?navigator.clipboard.writeText(draft()):Promise.reject())
          .then(()=>agent("Copied. Paste it to "+MAIL+" whenever suits."))
          .catch(()=>agent("Could not reach the clipboard. Select the draft above and copy it, the address is "+MAIL+"."));
      }
      else if(v==="Start over"){
        log.innerHTML=""; quick.innerHTML="";
        note.intent="";note.lines=[];note.to="";note.who="";note.email="";
        step="intent"; boot();
      }
    }
  });
  form.addEventListener("submit",e=>{
    e.preventDefault();
    const v=input.value.trim(); if(!v||step==="done") return;
    add("u",esc(v)); input.value="";
    onText[step](v);
  });

  function boot(){
    agent("Desk agent online. Deterministic on purpose, like the rest of the decision path: no model here, no tracking, and nothing leaves this page until you press send. Pick a shortcut, or just start typing.",
      ()=>{chips(["Deploy the stack","Consulting","Something else"]);hint("write anything, I listen");});
  }
  boot();
}

const el=document.querySelector("[data-concierge]");
if(el) mount(el);
})();
