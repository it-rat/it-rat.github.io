/* Stage "priced" - Verdryx. An outcome-priced scatter that builds over time:
   cases stream in in batches and land at their per-case cost, not their
   token count. A running rose line converges on the measured cost per
   resolved case and locks flat; a baseline band appears once the snapshot
   is taken; a drift check and an OTLP export each stamp in at their event.
   Deterministic in t (scrub-safe).
   opts: {batches:[{t,n}], lockT, lockV, bandT, driftT, otlpT, tol, yMax, seed} */
(function(){
"use strict";
const U=Sim.util, P=U.PAL;

Sim.registerStage("priced",function(o,cfg){
  const W=cfg.window||60;
  const batches=o.batches||[];
  const lockT=o.lockT!=null?o.lockT:30;
  const lockV=o.lockV!=null?o.lockV:0.00042;
  const bandT=o.bandT!=null?o.bandT:38;
  const driftT=o.driftT!=null?o.driftT:48;
  const otlpT=o.otlpT!=null?o.otlpT:56;
  const tol=o.tol!=null?o.tol:0.00007;
  const yMax=o.yMax!=null?o.yMax:0.00095;
  const t0=batches.length?batches[0].t:10;

  /* precompute every dot once, seeded - draw() only ever reads t */
  const rnd=U.rng(o.seed||41);
  const dots=[];
  batches.forEach(b=>{
    const n=b.n||10;
    for(let i=0;i<n;i++){
      const r1=rnd(),r2=rnd(),r3=rnd(),r4=rnd();
      const outcome = r1<0.60?"resolved" : r1<0.90?"abandoned" : "escalated";
      let cost;
      if(outcome==="resolved") cost=lockV*(0.62+r2*0.85);
      else if(outcome==="abandoned") cost=0.00025*(0.55+r2*0.9);
      else cost=0.00072+r2*0.00022;
      const dx=(r3*2-1)*3.2;
      dots.push({x:Math.max(0,Math.min(W,b.t+dx)), cost, outcome, appear:b.t+i*0.11+r4*0.05});
    }
  });

  /* pure function of t: where the running "cost / resolved" line sits */
  function costLine(t){
    if(t<t0) return null;
    if(t>=lockT) return lockV;
    const p=U.ease.outCubic(U.between(t,t0,lockT));
    const start=lockV*1.6;
    const wobble=Math.sin(t*1.9)*0.00006*(1-p);
    return Math.max(0,start+(lockV-start)*p+wobble);
  }

  return{
    minHeight:300,
    draw(ctx,w,h,t){
      const padL=54,padR=14,padT=16,padB=24, iw=w-padL-padR, ih=h-padT-padB;
      const X=tt=>padL+iw*Math.min(tt,W)/W;
      const Y=v=>padT+ih*(1-U.clamp(v/yMax,0,1));

      /* grid */
      ctx.strokeStyle="rgba(255,255,255,.055)";ctx.lineWidth=1;ctx.beginPath();
      for(let i=0;i<=4;i++){const y=padT+ih*i/4;ctx.moveTo(padL,y);ctx.lineTo(w-padR,y);}
      ctx.stroke();
      ctx.textAlign="left";ctx.font="9.5px ui-monospace,Menlo,monospace";
      ctx.fillStyle="rgba("+P.dim+",.75)";
      for(let i=0;i<=4;i++){
        const v=yMax*(1-i/4);
        ctx.fillText("$"+v.toFixed(5),4,padT+ih*i/4+3.5);
      }
      ctx.fillStyle="rgba("+P.faint+",.9)";
      [0,.25,.5,.75,1].forEach(p=>{
        ctx.fillText((cfg.axis?cfg.axis(W*p):(W*p).toFixed(0)+"s"),padL+iw*p-8,h-6);
      });

      /* baseline band, appears after the snapshot */
      if(t>=bandT){
        const bp=U.ease.outCubic(U.between(t,bandT,bandT+1.2));
        const y1=Y(lockV+tol), y2=Y(Math.max(0,lockV-tol));
        ctx.fillStyle="rgba("+P.rose+","+(0.10*bp)+")";
        ctx.fillRect(padL,y1,iw,y2-y1);
        ctx.strokeStyle="rgba("+P.rose+","+(0.28*bp)+")";ctx.setLineDash([3,3]);ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(padL,y1);ctx.lineTo(w-padR,y1);ctx.moveTo(padL,y2);ctx.lineTo(w-padR,y2);ctx.stroke();
        ctx.setLineDash([]);
        if(bp>0.6){
          ctx.fillStyle="rgba("+P.rose+","+(0.7*bp)+")";ctx.font="9px ui-monospace,Menlo,monospace";
          ctx.fillText("baseline &#177; tolerance".replace("&#177;","±"),padL+6,y1-4);
        }
      }

      /* case dots, popping in per batch */
      dots.forEach(d=>{
        if(t<d.appear) return;
        const p=U.ease.outBack(U.clamp((t-d.appear)/0.5,0,1));
        const flash=U.pulse(t,d.appear,0.9);
        const col=d.outcome==="resolved"?P.mint:d.outcome==="abandoned"?P.steel:P.amber;
        const x=X(d.x), y=Y(d.cost);
        const r=(d.outcome==="escalated"?3.1:2.5)*Math.max(0.15,p);
        if(flash>0) U.glow(ctx,x,y,r+5*flash,col,0.55*flash);
        ctx.fillStyle="rgba("+col+","+(0.55+0.4*p)+")";
        ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();
      });

      /* running "cost / resolved" line */
      if(t>=t0){
        ctx.beginPath();ctx.lineWidth=2;ctx.strokeStyle="rgba("+P.rose+",.9)";
        const N=110; let started=false;
        const tEnd=Math.min(t,W);
        for(let i=0;i<=N;i++){
          const tt=t0+(tEnd-t0)*i/N; if(tt>t) break;
          const v=costLine(tt); if(v==null) continue;
          const x=X(tt), y=Y(v);
          started?ctx.lineTo(x,y):(ctx.moveTo(x,y),started=true);
        }
        ctx.stroke();
      }

      /* pinned label once the line locks */
      if(t>=lockT){
        const p=U.ease.outBack(U.clamp((t-lockT)/0.6,0,1));
        const label="cost / resolved = $"+lockV.toFixed(5);
        ctx.font="10px ui-monospace,Menlo,monospace";
        const tw=ctx.measureText(label).width;
        const lx=X(lockT), ly=Y(lockV);
        const cx=Math.min(lx+10,w-padR-tw-16), cy=ly-30;
        ctx.globalAlpha=Math.min(1,p);
        U.rr(ctx,cx,cy,tw+14,18,8);
        ctx.fillStyle="rgba(16,22,31,.92)";ctx.fill();
        ctx.strokeStyle="rgba("+P.rose+",.85)";ctx.lineWidth=1;ctx.stroke();
        ctx.fillStyle="rgba("+P.rose+",.95)";ctx.textAlign="left";
        ctx.fillText(label,cx+7,cy+13);
        ctx.globalAlpha=1;
      }

      /* drift stamp */
      if(t>=driftT){
        const p=U.ease.outBack(U.clamp((t-driftT)/0.7,0,1));
        ctx.font="10.5px ui-monospace,Menlo,monospace";
        const label="drift: stable";
        const tw0=ctx.measureText(label).width;
        const bw=tw0+32;
        ctx.save();
        ctx.translate(w-padR-bw+11,padT+18);ctx.rotate(-0.07);
        ctx.globalAlpha=Math.min(1,p);
        const tw=tw0;
        U.rr(ctx,-11,-12,tw+32,23,8);
        ctx.fillStyle="rgba(16,22,31,.92)";ctx.fill();
        ctx.strokeStyle="rgba("+P.mint+",.85)";ctx.lineWidth=1.3;ctx.stroke();
        ctx.strokeStyle="rgba("+P.mint+",.95)";ctx.lineWidth=1.7;ctx.lineCap="round";
        ctx.beginPath();ctx.moveTo(-4,1);ctx.lineTo(-1,4.5);ctx.lineTo(6,-4);ctx.stroke();
        ctx.lineCap="butt";
        ctx.fillStyle="rgba("+P.mint+",.95)";ctx.textAlign="left";
        ctx.fillText(label,13,4);
        ctx.restore();
        ctx.globalAlpha=1;
      }

      /* OTLP export chip */
      if(t>=otlpT){
        const p=U.ease.outBack(U.clamp((t-otlpT)/0.6,0,1));
        ctx.globalAlpha=Math.min(1,p);
        const label="OTLP span";
        ctx.font="9.5px ui-monospace,Menlo,monospace";
        const tw=ctx.measureText(label).width;
        const cx=w-padR-tw-22, cy=h-42;
        U.rr(ctx,cx,cy,tw+16,17,7);
        ctx.fillStyle="rgba(16,22,31,.9)";ctx.fill();
        ctx.strokeStyle="rgba("+P.steel+",.8)";ctx.lineWidth=1;ctx.stroke();
        ctx.fillStyle="rgba("+P.steel+",.95)";ctx.textAlign="left";
        ctx.fillText(label,cx+8,cy+12);
        ctx.globalAlpha=1;
      }

      /* playhead */
      const px=X(Math.min(t,W));
      ctx.strokeStyle="rgba("+P.fg+",.5)";ctx.lineWidth=1.2;
      ctx.beginPath();ctx.moveTo(px,padT-2);ctx.lineTo(px,padT+ih+2);ctx.stroke();

      ctx.textAlign="center";
    }
  };
});
})();
