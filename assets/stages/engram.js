/* Stage "reflect" (Engram): what reflect() does, drawn literally:
   episodes slide in on the left and stack, reflect() breathes in the
   center while it reasons over them, and subject-predicate-object facts
   crystallize on the right in staggered waves, each with a tiny
   confidence bar and a thin provenance edge that runs back through
   reflect() to its source episode(s). Near the end a mint sweep checks
   the facts for contradictions and finds none. Deterministic in t
   (scrub-safe): draw() is a pure function of t, jitter comes from
   Sim.util.rng, never Math.random.
   opts: {episodes:[t,...], reflectT, facts:[{t,from:[epIdx,...],conf}], checkT} */
(function(){
"use strict";
const U=Sim.util, P=U.PAL;

Sim.registerStage("reflect",function(o){
  const episodes=o.episodes||[4,10,16,22,28];
  const facts=o.facts||[];
  const reflectT=o.reflectT==null?34:o.reflectT;
  const checkT=o.checkT==null?56:o.checkT;
  const SWEEP=2.2;

  const rnd=U.rng(53);
  const ej=episodes.map(()=>rnd()*2-1);   /* per-episode vertical jitter */
  const fj=facts.map(()=>rnd()*2-1);      /* per-fact vertical jitter */
  const factCols=Math.max(1,Math.ceil(facts.length/2));

  let chipW=0,chipH=0, epX=0, epY0=0, epGap=0;
  let rfX=0, rfY=0, rfR=0;
  let fx0=0, fx1=0, frY0=0, frY1=0;

  function epSlot(i){ return {x:epX, y:epY0+i*epGap+ej[i]*1.5}; }
  function factSlot(i){
    const col=Math.floor(i/2), row=i%2;
    const x=fx0+(fx1-fx0)*(col+0.5)/factCols;
    const y=(row===0?frY0:frY1)+fj[i]*3;
    return {x,y};
  }

  return{
    minHeight:300,
    init(w,h){
      chipW=68; chipH=22;
      epX=24+chipW/2+6;
      const totalH=episodes.length*chipH+(episodes.length-1)*10;
      epY0=h*0.5-totalH/2+chipH/2; epGap=chipH+10;
      rfX=w*0.44; rfY=h*0.5; rfR=Math.min(30,h*0.16);
      fx0=w*0.62; fx1=w-22;
      frY0=h*0.40; frY1=h*0.64;
    },
    draw(ctx,w,h,t){
      ctx.textAlign="center";

      /* zone headers */
      ctx.font="9px ui-monospace,Menlo,monospace";
      ctx.fillStyle="rgba("+P.faint+",.85)";
      ctx.fillText("episodes",epX,18);
      ctx.fillText("reflect()",rfX,18);
      ctx.fillText("facts · confidence",(fx0+fx1)/2,18);

      /* feed line: episodes -> reflect(), once the first one is in */
      if(t>=episodes[0]){
        ctx.strokeStyle="rgba("+P.iris+",.20)";ctx.lineWidth=1.2;
        ctx.beginPath();ctx.moveTo(epX+chipW/2,rfY);ctx.lineTo(rfX-rfR,rfY);ctx.stroke();
      }

      /* episodes: slide in from off-canvas left, then sit in their slot */
      episodes.forEach((at,i)=>{
        if(t<at-0.9) return;
        const slot=epSlot(i);
        const p=U.ease.outCubic(U.between(t,at-0.9,at));
        const startX=-chipW;
        const x=startX+(slot.x-startX)*p;
        const y=slot.y;
        U.rr(ctx,x-chipW/2,y-chipH/2,chipW,chipH,7);
        ctx.fillStyle="rgba(20,28,39,.92)";ctx.fill();
        ctx.strokeStyle="rgba("+P.iris+",.7)";ctx.lineWidth=1.1;ctx.stroke();
        ctx.fillStyle="rgba("+P.fg+",.92)";ctx.font="9.5px ui-monospace,Menlo,monospace";
        ctx.fillText("ep-"+(i+1),x,y+3.3);
      });

      /* reflect(): idle before reflectT, breathing while it runs, settled after */
      const active=t>=reflectT && t<checkT+SWEEP+0.6;
      const breathe=active?1+0.12*Math.sin((t-reflectT)*2.6):1;
      const glowA=active?0.55+0.25*Math.sin((t-reflectT)*2.6):0.28;
      U.glow(ctx,rfX,rfY,rfR*0.7*breathe,P.iris,Math.max(0,Math.min(1,glowA)));
      ctx.beginPath();ctx.arc(rfX,rfY,rfR*breathe,0,Math.PI*2);
      ctx.fillStyle="rgba(16,20,31,.95)";ctx.fill();
      ctx.strokeStyle="rgba("+P.iris+","+(active?.85:.4)+")";ctx.lineWidth=1.4;ctx.stroke();
      ctx.fillStyle="rgba("+P.fg+",.95)";ctx.font="10.5px ui-monospace,Menlo,monospace";
      ctx.fillText("reflect()",rfX,rfY-1);
      ctx.font="8px ui-monospace,Menlo,monospace";
      ctx.fillStyle="rgba("+P.dim+",.85)";
      ctx.fillText(t<reflectT?"armed":t<checkT?"distilling":"done",rfX,rfY+12);

      /* facts: staggered pop-in, provenance edge through reflect() back to
         source episode(s), tiny confidence bar underneath */
      facts.forEach((f,i)=>{
        const p=U.between(t,f.t-0.6,f.t);
        if(p<=0) return;
        const slot=factSlot(i);
        const pop=U.ease.outBack(Math.min(1,p));
        (f.from||[]).forEach(epi=>{
          if(epi<0||epi>=episodes.length) return;
          const es=epSlot(epi);
          ctx.strokeStyle="rgba("+P.iris+","+(0.08+0.10*p)+")";
          ctx.lineWidth=1;
          ctx.beginPath();
          ctx.moveTo(slot.x,slot.y);
          ctx.quadraticCurveTo(rfX,rfY,es.x+chipW/2,es.y);
          ctx.stroke();
        });
        const r=Math.max(0,4.2*pop);
        ctx.beginPath();
        for(let k=0;k<6;k++){
          const a=Math.PI/6+k*Math.PI/3, px=slot.x+Math.cos(a)*r, py=slot.y+Math.sin(a)*r;
          k?ctx.lineTo(px,py):ctx.moveTo(px,py);
        }
        ctx.closePath();
        const conf=f.conf==null?0.85:f.conf;
        ctx.fillStyle="rgba("+P.violet+","+(0.22*pop)+")";ctx.fill();
        ctx.strokeStyle="rgba("+P.violet+","+((0.45+0.4*conf)*pop)+")";
        ctx.lineWidth=1.1;ctx.stroke();
        /* confidence bar */
        const bw=Math.max(0,22*pop), bh=3;
        U.rr(ctx,slot.x-bw/2,slot.y+7,bw,bh,1.5);
        ctx.fillStyle="rgba("+P.faint+",.5)";ctx.fill();
        const fillW=bw*conf;
        U.rr(ctx,slot.x-bw/2,slot.y+7,Math.max(0,fillW),bh,1.5);
        ctx.fillStyle="rgba("+P.teal+","+(0.85*pop)+")";ctx.fill();
      });

      /* contradiction check: a mint sweep crosses the facts, then a mint
         check mark + "0 contradictions" lands and stays */
      if(t>=checkT){
        const sp=U.between(t,checkT,checkT+SWEEP);
        const sx=fx0+(fx1-fx0)*sp;
        if(sp<1){
          ctx.strokeStyle="rgba("+P.mint+",.55)";ctx.lineWidth=1.6;
          ctx.beginPath();ctx.moveTo(sx,frY0-16);ctx.lineTo(sx,frY1+16);ctx.stroke();
          facts.forEach((f,i)=>{
            const slot=factSlot(i);
            if(Math.abs(slot.x-sx)<10) U.glow(ctx,slot.x,slot.y,3,P.mint,.7);
          });
        }
        if(t>=checkT+SWEEP){
          const a=Math.min(1,U.between(t,checkT+SWEEP,checkT+SWEEP+0.6));
          const cx=(fx0+fx1)/2, cy=frY0-26;
          ctx.strokeStyle="rgba("+P.mint+","+a+")";ctx.lineWidth=1.8;
          ctx.beginPath();
          ctx.moveTo(cx-22,cy);ctx.lineTo(cx-16,cy+6);ctx.lineTo(cx-4,cy-9);
          ctx.stroke();
          ctx.textAlign="left";
          ctx.fillStyle="rgba("+P.mint+","+a+")";
          ctx.font="9.5px ui-monospace,Menlo,monospace";
          ctx.fillText("0 contradictions",cx+2,cy+3);
          ctx.textAlign="center";
        }
      }
    }
  };
});
})();
