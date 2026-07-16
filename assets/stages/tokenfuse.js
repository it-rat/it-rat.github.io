/* Stage "fuse" - TokenFuse. What the service does, drawn literally:
   calls travel a fuse wire from the agent to the provider; every admitted
   call settles money into the budget bar below; when the next reserve would
   cross the cap, the breaker opens mid-wire and later calls burst against
   it with a 402. Deterministic in t (scrub-safe).
   opts: {cap, trip, calls:[{t,cost}], blocked:[t,...], settled(t)=>$} */
(function(){
"use strict";
const U=Sim.util, P=U.PAL;

Sim.registerStage("fuse",function(o){
  const FLY=4.5;             /* seconds a spark spends on the wire */
  const rnd=U.rng(7);
  const jitter=Array.from({length:64},()=>rnd()*2-1);
  let W2=0,H2=0, wireY=0, brX=0;

  function wirePath(ctx,w,x0,x1){
    ctx.beginPath();
    for(let x=x0;x<=x1;x+=8){
      const y=wireY+Math.sin(x*0.014+1.3)*7;
      x===x0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
  }
  const yAt=x=>wireY+Math.sin(x*0.014+1.3)*7;

  return{
    minHeight:280,
    init(w,h){W2=w;H2=h;wireY=h*0.40;brX=w*0.60;},
    draw(ctx,w,h,t){
      const tripped=t>=o.trip;
      const padL=26,padR=26, x0=padL+64, x1=w-padR-64;

      /* endpoints */
      ctx.font="11px ui-monospace,Menlo,monospace";ctx.textAlign="center";
      U.rr(ctx,padL,wireY-24,64,48,10);
      ctx.fillStyle="rgba(20,28,39,1)";ctx.fill();ctx.strokeStyle="rgba(255,255,255,.13)";ctx.stroke();
      ctx.fillStyle="rgba("+P.fg+",.9)";ctx.fillText("agent",padL+32,wireY-2);
      ctx.fillStyle="rgba("+P.faint+",.9)";ctx.font="9px ui-monospace,Menlo,monospace";
      ctx.fillText("passport",padL+32,wireY+12);
      U.rr(ctx,w-padR-64,wireY-24,64,48,10);
      ctx.fillStyle="rgba(20,28,39,1)";ctx.fill();ctx.strokeStyle="rgba(255,255,255,.13)";ctx.stroke();
      ctx.fillStyle="rgba("+P.fg+",.9)";ctx.font="11px ui-monospace,Menlo,monospace";
      ctx.fillText("provider",w-padR-32,wireY+4);

      /* the wire: amber while live; after the trip the provider side cools mint */
      ctx.lineWidth=1.6;
      if(!tripped){
        wirePath(ctx,w,x0,x1);ctx.strokeStyle="rgba("+P.amber+",.5)";ctx.stroke();
      }else{
        wirePath(ctx,w,x0,brX-14);ctx.strokeStyle="rgba("+P.amber+",.35)";ctx.stroke();
        wirePath(ctx,w,brX+14,x1);ctx.strokeStyle="rgba("+P.mint+",.45)";ctx.stroke();
        /* open breaker: an X where the circuit was cut */
        const flash=1+U.pulse(t,o.trip,1.2)*0.6;
        ctx.strokeStyle="rgba("+P.mint+",.95)";ctx.lineWidth=2*flash;
        const y=yAt(brX);
        ctx.beginPath();ctx.moveTo(brX-8,y-8);ctx.lineTo(brX+8,y+8);
        ctx.moveTo(brX+8,y-8);ctx.lineTo(brX-8,y+8);ctx.stroke();
        ctx.fillStyle="rgba("+P.mint+",.9)";ctx.font="9.5px ui-monospace,Menlo,monospace";
        ctx.fillText("CIRCUIT OPEN",brX,y-16);
      }
      /* breaker box */
      const bw=54;
      U.rr(ctx,brX-bw/2,wireY+22,bw,22,7);
      ctx.fillStyle="rgba(16,22,31,1)";ctx.fill();
      ctx.strokeStyle=tripped?"rgba("+P.mint+",.8)":"rgba("+P.amber+",.8)";ctx.lineWidth=1.2;ctx.stroke();
      ctx.fillStyle=tripped?"rgba("+P.mint+",.95)":"rgba("+P.amber+",.95)";
      ctx.font="9px ui-monospace,Menlo,monospace";
      ctx.fillText("breaker",brX,wireY+37);

      /* admitted calls: sparks fly the whole wire, then settle */
      (o.calls||[]).forEach((c,i)=>{
        const p=U.between(t,c.t-FLY,c.t);
        if(p<=0) return;
        if(p<1){
          const x=x0+(x1-x0)*U.ease.inOutCubic(p);
          U.glow(ctx,x,yAt(x)+jitter[i%64]*1.5,2.2,P.amber);
        }else{
          const gl=U.pulse(t,c.t,1.6);
          if(gl>0) U.glow(ctx,x1,yAt(x1),2.5+3*gl,P.mint,.9);
        }
      });
      /* blocked calls: sparks reach the open breaker and burst red */
      (o.blocked||[]).forEach((bt,i)=>{
        const p=U.between(t,bt-FLY,bt);
        if(p<=0) return;
        if(p<1){
          const x=x0+(brX-16-x0)*U.ease.inOutCubic(p);
          U.glow(ctx,x,yAt(x)+jitter[(i+9)%64]*1.5,2.2,P.ember);
        }else{
          const b=U.pulse(t,bt,1.5);
          if(b>0){
            const y=yAt(brX-16);
            for(let k=0;k<6;k++){
              const a=k/6*6.28+i, r=6+16*(1-b);
              U.glow(ctx,brX-16+Math.cos(a)*r,y+Math.sin(a)*r*.6,1.4,P.ember,b);
            }
            ctx.fillStyle="rgba("+P.ember+","+(b*.95)+")";
            ctx.font="10px ui-monospace,Menlo,monospace";
            ctx.fillText("402",brX-16,y-14);
          }
        }
      });

      /* budget bar: reserve-then-settle against the cap */
      const bx=padL, bw2=w-padL-padR, by=h-64, bh=16;
      const spent=o.settled(t), ratio=Math.min(1,spent/o.cap);
      U.rr(ctx,bx,by,bw2,bh,8);ctx.fillStyle="rgba(24,34,49,.9)";ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,.10)";ctx.lineWidth=1;ctx.stroke();
      if(ratio>0){
        U.rr(ctx,bx,by,bw2*ratio,bh,8);
        const g=ctx.createLinearGradient(bx,0,bx+bw2,0);
        g.addColorStop(0,"rgba("+P.amber+",.85)");g.addColorStop(1,"rgba("+P.ember+",.85)");
        ctx.fillStyle=g;ctx.fill();
      }
      /* cap tick at 100% */
      ctx.strokeStyle="rgba("+P.ember+",.9)";ctx.lineWidth=1.6;
      ctx.beginPath();ctx.moveTo(bx+bw2,by-5);ctx.lineTo(bx+bw2,by+bh+5);ctx.stroke();
      ctx.textAlign="left";ctx.font="9.5px ui-monospace,Menlo,monospace";
      ctx.fillStyle="rgba("+P.dim+",.95)";
      ctx.fillText("run budget · $"+spent.toFixed(5)+" settled of $"+o.cap.toFixed(3)+" cap",bx,by-8);
      ctx.textAlign="right";
      ctx.fillStyle=tripped?"rgba("+P.mint+",.95)":"rgba("+P.faint+",.95)";
      ctx.fillText(tripped?"held: the 5th reserve would cross the cap":"reserve → settle, every call priced first",bx+bw2,by+bh+16);
      ctx.textAlign="center";

      /* raft ledger: three nodes agreeing, bottom left */
      const ly=h-22;
      [0,1,2].forEach(i=>{
        const x=bx+12+i*26, on=tripped||spent>0;
        ctx.beginPath();ctx.arc(x,ly,7,0,7);
        ctx.fillStyle="rgba(20,28,39,1)";ctx.fill();
        ctx.strokeStyle=on?"rgba("+P.mint+",.8)":"rgba(255,255,255,.15)";ctx.stroke();
        ctx.fillStyle="rgba("+P.dim+",.9)";ctx.font="8px ui-monospace,Menlo,monospace";
        ctx.fillText("n"+(i+1),x,ly+2.5);
      });
      ctx.textAlign="left";ctx.font="9px ui-monospace,Menlo,monospace";
      ctx.fillStyle="rgba("+P.faint+",.9)";
      ctx.fillText(tripped?"ledger byte-identical on n1 n2 n3":"raft ledger: one truth, three nodes",bx+92,ly+3);
      ctx.textAlign="center";
    }
  };
});
})();
