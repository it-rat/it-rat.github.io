/* Stage "gate" - Wardryx. Policy as a physical thing: requests fall into a
   deterministic decision gate and get sorted into allow / hold / deny lanes.
   A hold waits, amber and pulsing, until a human mints an approval token,
   then it re-enters and lands in allow. Deterministic in t (scrub-safe).
   opts: {chips:[{t,v:"allow"|"deny"|"hold",id,resolve?}]} */
(function(){
"use strict";
const U=Sim.util, P=U.PAL;

Sim.registerStage("gate",function(o){
  const chips=o.chips||[];
  const LANES={allow:{col:P.mint,label:"allow · 200"},
               hold: {col:P.amber,label:"hold · human"},
               deny: {col:P.ember,label:"deny · 403"}};
  /* precompute lane slots chronologically, including the hold→allow move */
  const entries=[];
  chips.forEach((c,i)=>{
    entries.push({t:c.t,lane:c.v,chip:i,leave:c.v==="hold"?c.resolve:null});
    if(c.v==="hold"&&c.resolve!=null) entries.push({t:c.resolve,lane:"allow",chip:i,resolved:true});
  });
  entries.sort((a,b)=>a.t-b.t);
  const slotOf={};                       /* chip -> {lane:slot} */
  const counts={allow:0,hold:0,deny:0};
  entries.forEach(e=>{
    slotOf[e.chip]=slotOf[e.chip]||{};
    slotOf[e.chip][e.lane]=counts[e.lane]++;
  });
  const rnd=U.rng(31), jx=chips.map(()=>rnd()*2-1);
  let W2=0,H2=0,gateY=0,laneX={},laneTop=0;

  return{
    minHeight:300,
    init(w,h){
      W2=w;H2=h;gateY=h*0.30;laneTop=gateY+46;
      laneX={allow:w*0.20,hold:w*0.50,deny:w*0.80};
    },
    draw(ctx,w,h,t){
      ctx.font="9.5px ui-monospace,Menlo,monospace";ctx.textAlign="center";

      /* the gate bar */
      const gx0=w*0.10,gx1=w*0.90;
      U.rr(ctx,gx0,gateY-11,gx1-gx0,22,9);
      ctx.fillStyle="rgba(16,22,31,1)";ctx.fill();
      ctx.strokeStyle="rgba("+P.teal+",.55)";ctx.lineWidth=1.2;ctx.stroke();
      ctx.fillStyle="rgba("+P.teal+",.95)";
      ctx.fillText("wardryx PDP · deterministic · no model in the decision path",(gx0+gx1)/2,gateY+3);

      /* lanes */
      Object.keys(LANES).forEach(k=>{
        const L=LANES[k],x=laneX[k];
        ctx.strokeStyle="rgba("+L.col+",.16)";ctx.lineWidth=1;
        ctx.setLineDash([3,5]);
        ctx.beginPath();ctx.moveTo(x,laneTop-8);ctx.lineTo(x,h-30);ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle="rgba("+L.col+",.9)";
        ctx.fillText(L.label,x,h-14);
      });

      const slotY=i=>laneTop+8+i*19;
      const chipW=64,chipH=14;

      function drawChip(x,y,c,alpha,lane){
        const col=LANES[lane||c.v].col;
        U.rr(ctx,x-chipW/2,y-chipH/2,chipW,chipH,7);
        ctx.fillStyle="rgba(20,28,39,"+alpha+")";ctx.fill();
        ctx.strokeStyle="rgba("+col+","+(.75*alpha)+")";ctx.lineWidth=1;ctx.stroke();
        ctx.fillStyle="rgba("+P.fg+","+(.85*alpha)+")";
        ctx.font="8.5px ui-monospace,Menlo,monospace";
        ctx.fillText(c.id,x,y+2.8);
      }

      chips.forEach((c,i)=>{
        const born=c.t-2.1, scanA=c.t-0.5;
        if(t<born) return;
        const cx=(gx0+gx1)/2+jx[i]*w*0.26;
        if(t<scanA){                       /* falling toward the gate */
          const p=U.ease.inOutCubic(U.between(t,born,scanA));
          drawChip(cx,-10+(gateY-14+10)*p,c,.9,null);
          return;
        }
        if(t<c.t){                          /* under the scanner */
          drawChip(cx,gateY-14,c,1,null);
          const f=.4+.6*Math.abs(Math.sin(t*9));
          ctx.strokeStyle="rgba("+P.teal+","+f+")";ctx.lineWidth=1;
          ctx.beginPath();ctx.moveTo(cx-chipW/2,gateY-24);ctx.lineTo(cx+chipW/2,gateY-24);ctx.stroke();
          return;
        }
        /* decided: ease from the gate into its lane slot */
        const decideFlash=U.pulse(t,c.t,1.2);
        if(decideFlash>0){
          ctx.fillStyle="rgba("+LANES[c.v].col+","+decideFlash*.9+")";
          ctx.font="8.5px ui-monospace,Menlo,monospace";
          ctx.fillText(c.v==="allow"?"200 · 0.4 ms":c.v==="deny"?"403 · 0.4 ms":"hold",cx,gateY-30);
        }
        const inHold=c.v==="hold"&&c.resolve!=null;
        const moved=inHold&&t>=c.resolve;
        const lane=moved?"allow":c.v;
        const slot=slotOf[i][lane];
        const tx=laneX[lane], ty=slotY(slot);
        if(!moved){
          const p=U.ease.outCubic(U.between(t,c.t,c.t+0.9));
          const x=cx+(tx-cx)*p, y=(gateY-14)+(ty-(gateY-14))*p;
          let a=1;
          if(inHold&&p>=1) a=.72+.28*Math.abs(Math.sin(t*3));  /* waiting pulse */
          drawChip(x,y,c,a,c.v);
          if(inHold&&p>=1){
            ctx.fillStyle="rgba("+P.amber+",.85)";
            ctx.font="8px ui-monospace,Menlo,monospace";
            ctx.fillText("needs a human",tx,ty+15);
          }
        }else{
          /* re-admitted with an approval token */
          const from={x:laneX.hold,y:slotY(slotOf[i].hold)};
          const p=U.ease.inOutCubic(U.between(t,c.resolve,c.resolve+1.1));
          const x=from.x+(tx-from.x)*p, y=from.y+(ty-from.y)*p;
          drawChip(x,y,c,1,"allow");
          const tokenFlash=U.pulse(t,c.resolve,1.6);
          if(tokenFlash>0){
            ctx.fillStyle="rgba("+P.mint+","+tokenFlash*.95+")";
            ctx.font="8px ui-monospace,Menlo,monospace";
            ctx.fillText("approval token · bound to max_cost_usd",x,y-12);
          }
        }
      });

      /* footnote: this is a representative dozen of the 34 */
      ctx.fillStyle="rgba("+P.faint+",.8)";
      ctx.font="8.5px ui-monospace,Menlo,monospace";
      ctx.textAlign="left";
      ctx.fillText("a representative sample of the 34 concurrent requests",gx0,h-4);
      ctx.textAlign="center";
    }
  };
});
})();
