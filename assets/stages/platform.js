/* Stage "envelope" - Platform. The shared contract drawn literally: seven
   emitters feed one envelope shape onto one NDJSON bus, agent-conform gates
   every line with a mint tick, and validated envelopes stack neatly on the
   right. Deterministic in t (scrub-safe).
   opts: {emits:[{t,svc,schema}], validateT} */
(function(){
"use strict";
const U=Sim.util, P=U.PAL;

Sim.registerStage("envelope",function(o){
  const ROWS=[
    {svc:"tokenfuse",col:P.amber},
    {svc:"wardryx",  col:P.teal},
    {svc:"engram",   col:P.iris},
    {svc:"idryx",    col:P.mint},
    {svc:"qryx",     col:P.violet},
    {svc:"verdryx",  col:P.rose},
    {svc:"mockryx",  col:P.coral}
  ];
  const emits=(o.emits||[]).map((e,i)=>({
    svc:e.t!==undefined?e.svc:e.svc, t:e.t, schema:e.schema||"v0.1",
    row:ROWS.findIndex(r=>r.svc===e.svc), i
  }));
  const validateT=o.validateT==null?52:o.validateT;
  const FLY1=1.1, FLY2=3.0, SETTLE=0.9, TICK=0.8;
  const rnd=U.rng(17);
  const jx=emits.map(()=>rnd()*2-1), jy=emits.map(()=>rnd()*2-1);
  const born=emits.map((e,i)=>e.t+i*0.05);
  const busEnd=born.map(b=>b+FLY1);
  const arrive=busEnd.map(b=>b+FLY2);
  const settle=arrive.map(a=>a+SETTLE);
  let W2=0,H2=0, emX=0,emTop=0,emW=0,emH=0,pitch=0, busY=0,busX0=0,busX1=0,
      gateX=0,gateW=0,gateTop=0,gateBot=0, pileX0=0,pileX1=0;

  function layout(w,h){
    W2=w;H2=h;
    const padL=16,padR=16,padT=14,padB=24;
    emW=U.clamp(w*0.13,84,116); emH=20; pitch=26;
    emX=padL;
    const stackH=6*pitch+emH;
    emTop=Math.max(padT,(h-stackH)/2);
    busY=emTop+stackH/2;
    busX0=emX+emW+38;
    gateW=12;
    gateX=w-U.clamp(w*0.18,132,176);
    busX1=gateX-16;
    gateTop=Math.max(padT+2,busY-U.clamp(h*0.32,80,120));
    gateBot=Math.min(h-padB,busY+U.clamp(h*0.32,80,120));
    pileX0=gateX+30;
    pileX1=w-padR;
  }
  function rowY(r){return emTop+r*pitch+emH/2;}
  function pileSlot(i){
    const n=Math.max(1,emits.length-1);
    const y=gateTop+16+(gateBot-gateTop-32)*(i/n);
    const x=pileX0+(pileX1-pileX0)*0.42+jx[i]*10;
    return{x,y:y+jy[i]*3};
  }

  function chip(ctx,x,y,w,h,col,alpha,label,sub){
    U.rr(ctx,x-w/2,y-h/2,w,h,6);
    ctx.fillStyle="rgba(16,22,31,"+(0.92*alpha)+")";ctx.fill();
    ctx.strokeStyle="rgba("+col+","+(0.85*alpha)+")";ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle="rgba("+P.fg+","+(0.9*alpha)+")";
    ctx.font="8px ui-monospace,Menlo,monospace";ctx.textAlign="center";
    ctx.fillText(label,x,y-1);
    if(sub){
      ctx.fillStyle="rgba("+P.dim+","+(0.85*alpha)+")";
      ctx.font="7px ui-monospace,Menlo,monospace";
      ctx.fillText(sub,x,y+8.5);
    }
  }
  function check(ctx,x,y,s,alpha){
    ctx.strokeStyle="rgba("+P.mint+","+alpha+")";ctx.lineWidth=1.8;
    ctx.beginPath();
    ctx.moveTo(x-s,y);ctx.lineTo(x-s*0.25,y+s*0.7);ctx.lineTo(x+s,y-s*0.6);
    ctx.stroke();
  }

  return{
    minHeight:320,
    init:layout,
    draw(ctx,w,h,t){
      if(w!==W2||h!==H2) layout(w,h);
      ctx.textAlign="center";

      /* feeder lines: each emitter's quiet channel into the bus */
      ROWS.forEach((r,ri)=>{
        const y=rowY(ri);
        ctx.setLineDash([2,4]);ctx.lineWidth=1;
        ctx.strokeStyle="rgba("+P.faint+",.35)";
        ctx.beginPath();ctx.moveTo(emX+emW,y);
        ctx.quadraticCurveTo((emX+emW+busX0)/2,y,busX0,busY);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      /* the bus lane */
      U.rr(ctx,busX0,busY-9,busX1-busX0,18,9);
      ctx.fillStyle="rgba(15,21,30,1)";ctx.fill();
      ctx.strokeStyle="rgba("+P.steel+",.4)";ctx.lineWidth=1;ctx.stroke();
      ctx.fillStyle="rgba("+P.faint+",.9)";
      ctx.font="9px ui-monospace,Menlo,monospace";
      ctx.fillText("agent-event bus · NDJSON",(busX0+busX1)/2,busY+3);

      /* emitter nodes */
      ROWS.forEach((r,ri)=>{
        const y=rowY(ri), x=emX;
        const idx=emits.findIndex(e=>e.row===ri);
        const et=idx>=0?emits[idx].t:1e9;
        const active=t>=et, flash=U.pulse(t,et,1.0);
        U.rr(ctx,x,y-emH/2,emW,emH,8);
        ctx.fillStyle="rgba(18,25,35,1)";ctx.fill();
        ctx.strokeStyle="rgba("+r.col+","+(active?0.55+flash*0.4:0.22)+")";
        ctx.lineWidth=active?1.4:1;ctx.stroke();
        if(flash>0){
          ctx.save();ctx.globalAlpha=flash*0.55;
          ctx.strokeStyle="rgba("+r.col+",1)";ctx.lineWidth=2.4;
          U.rr(ctx,x-1.5,y-emH/2-1.5,emW+3,emH+3,9);ctx.stroke();
          ctx.restore();
        }
        ctx.fillStyle="rgba("+r.col+","+(active?0.95:0.55)+")";
        ctx.font="9.5px ui-monospace,Menlo,monospace";
        ctx.fillText(r.svc,x+emW/2,y+3.3);
      });

      /* the gate: agent-conform */
      U.rr(ctx,gateX-gateW/2,gateTop,gateW,gateBot-gateTop,6);
      const tickMax=emits.reduce((m,e,i)=>Math.max(m,U.pulse(t,arrive[i],TICK)),0);
      const bigFlash=U.pulse(t,validateT,2.0);
      const gAlpha=Math.min(1,tickMax*0.9+bigFlash);
      const gCol=gAlpha>0.05?P.mint:P.steel;
      ctx.fillStyle="rgba(14,20,28,1)";ctx.fill();
      ctx.strokeStyle="rgba("+gCol+","+(0.55+gAlpha*0.45)+")";
      ctx.lineWidth=1.4+gAlpha*1.2;ctx.stroke();
      ctx.fillStyle="rgba("+P.steel+",.95)";
      ctx.font="9.5px ui-monospace,Menlo,monospace";
      ctx.fillText("agent-conform",gateX,gateTop-8);
      const validated=emits.filter((e,i)=>t>=arrive[i]).length;
      ctx.fillStyle="rgba("+P.dim+",.9)";
      ctx.font="9px ui-monospace,Menlo,monospace";
      ctx.fillText("validated "+validated+"/"+emits.length,gateX,gateBot+14);

      /* exit-0 chip once the whole stream is checked */
      const exitA=U.between(t,validateT,validateT+0.9);
      if(exitA>0){
        chip(ctx,gateX,gateTop-24,120,18,P.mint,exitA,"stream valid · exit 0",null);
      }

      /* envelopes: converge to bus, ride it, gate-check, then pile */
      emits.forEach((e,i)=>{
        const r=ROWS[e.row];
        if(t<born[i]) return;
        const label=e.svc, sub=e.schema;
        if(t<busEnd[i]){
          const p=U.ease.inOutCubic(U.between(t,born[i],busEnd[i]));
          const sx=emX+emW, sy=rowY(e.row);
          const x=sx+(busX0-sx)*p, y=sy+(busY-sy)*p;
          chip(ctx,x,y,e.schema==="v0.2"?58:56,15,r.col,1,label.slice(0,4),sub);
          return;
        }
        if(t<arrive[i]){
          const p=U.ease.inOutCubic(U.between(t,busEnd[i],arrive[i]));
          const x=busX0+(gateX-gateW/2-6-busX0)*p;
          chip(ctx,x,busY,e.schema==="v0.2"?58:56,15,r.col,1,label.slice(0,4),sub);
          return;
        }
        /* passed the gate: a mint tick flashes right at the bar */
        const tick=U.pulse(t,arrive[i],TICK);
        if(tick>0){
          U.glow(ctx,gateX,busY,2.4+tick*3,P.mint,0.9);
          check(ctx,gateX+16,busY-14,5,tick);
        }
        if(t<settle[i]){
          const p=U.ease.outBack(U.between(t,arrive[i],settle[i]));
          const dst=pileSlot(i);
          const x=(gateX-gateW/2-6)+(dst.x-(gateX-gateW/2-6))*p;
          const y=busY+(dst.y-busY)*p;
          chip(ctx,x,y,52,14,r.col,1,label.slice(0,4),null);
        }else{
          const dst=pileSlot(i);
          chip(ctx,dst.x,dst.y,52,14,r.col,0.95,label.slice(0,4),null);
        }
      });

      /* closing caption */
      const capA=U.between(t,58,59);
      if(capA>0){
        ctx.fillStyle="rgba("+P.faint+","+(0.85*capA)+")";
        ctx.font="10px ui-monospace,Menlo,monospace";
        ctx.fillText("seven sources, one grammar",(busX0+pileX1)/2,H2-8);
      }
      ctx.textAlign="left";
    }
  };
});
})();
