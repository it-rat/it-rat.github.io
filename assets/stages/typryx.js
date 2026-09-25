/* Stage "typed" - Typryx. An exact replay of one real run: 60 arithmetic
   judgements, local 7B, wording v2, backend openai-logprobs, measured
   2026-09-25 (services/typryx.html, the calibration section: the "local 7B"
   row, n=60, stated 0.965, accuracy 0.667). The real run took 9.44s; this
   replay spreads the same 60 items one per unit across the 60-unit sim
   window, played over 19 seconds, so it runs about 2x slower than it
   really did, and says so on the canvas rather than only in a caption.

   Deterministic in t (scrub-safe): every item's probability, truth and
   correctness is fixed data from the run itself, not a seeded illustration,
   and draw() only ever reads t. The reliability inset is the run's own 10
   confidence bins, computed here the same way typryx bins them: by
   max(p, 1-p), not by which class won.

   opts: {rows:[[p,truth],...], doorX, gateX} */
(function(){
"use strict";
const U=Sim.util, P=U.PAL;

Sim.registerStage("typed",function(o,cfg){
  const W=cfg.window||60;
  const doorX=o.doorX!=null?o.doorX:0.10;
  const gateX=o.gateX!=null?o.gateX:0.20;

  /* The 60 real judgements: [p(true), truth]. One ask per unit of the sim
     window (item i spawns at t=i), matching the html's counters, which walk
     this same data by index. Source: that run's own ledger (answers.ndjson with
     outcomes.ndjson), read back with typryx calibration on 2026-09-25. */
  const ROWS=o.rows||[
    [0.0124,1],[0.0,0],[0.9986,1],[0.0,0],[0.0003,1],[0.0,0],[0.0343,1],[0.0,0],
    [0.0001,1],[0.0,0],[0.9465,1],[0.0,0],[0.1517,1],[0.0,0],[0.0,1],[0.0,0],
    [0.0001,1],[0.0,0],[0.0419,1],[0.0,0],[0.9983,1],[0.0,0],[0.0,1],[0.0,0],
    [0.06,1],[0.0513,0],[0.5651,1],[0.0,0],[0.0265,1],[0.0,0],[0.9978,1],[0.0001,0],
    [0.0004,1],[0.0,0],[0.0395,1],[0.0,0],[0.2438,1],[0.0,0],[0.0,1],[0.0,0],
    [0.4532,1],[0.0363,0],[0.0012,1],[0.0,0],[0.0001,1],[0.0,0],[0.0811,1],[0.0,0],
    [0.9003,1],[0.0,0],[0.9543,1],[0.0205,0],[0.9926,1],[0.0,0],[0.9678,1],[0.0,0],
    [0.1617,1],[0.0,0],[0.9978,1],[0.0,0]
  ];
  const N=ROWS.length;
  const items=ROWS.map((r,i)=>{
    const p=r[0], truth=r[1], pred=p>=0.5?1:0, correct=pred===truth;
    return {spawn:i, p, truth, pred, correct};
  });

  /* the run's own 10 confidence bins, binned exactly as typryx does: by
     max(p, 1-p), never by which class the argmax picked */
  const bins=Array.from({length:10},()=>({n:0,c:0}));
  items.forEach(it=>{
    const conf=Math.max(it.p,1-it.p);
    const idx=Math.min(9,Math.floor(conf*10));
    bins[idx].n++; if(it.correct) bins[idx].c++;
  });

  const SETTLE=0.74;   /* fraction of a unit spent crossing door+filter+resolving */

  return{
    minHeight:400,
    draw(ctx,w,h,t){
      const padL=16,padR=16,padT=34,padB=100, iw=w-padL-padR, ih=h-padT-padB;
      const doorPx=padL+iw*doorX, gatePx=padL+iw*gateX;
      const histX0=padL+iw*0.28, histX1=w-padR;
      const Y=v=>padT+ih*(1-U.clamp(v,0,1));

      /* caption: what this is, and the real-time compression, in the canvas
         itself since the mount title above it is fixed text */
      ctx.textAlign="left";ctx.font="10px ui-monospace,Menlo,monospace";
      ctx.fillStyle="rgba("+P.dim+",.7)";
      ctx.fillText("60 judgements · local 7B · openai-logprobs · 2026-09-25 · real run 9.44 s, replayed about 2× slower",padL,16);

      /* door and egress filter, near the left where new asks arrive */
      [[doorPx,"door",P.steel],[gatePx,"egress filter",P.violet]].forEach(([gx,label,col])=>{
        ctx.strokeStyle="rgba("+col+",.28)";ctx.lineWidth=1.4;ctx.setLineDash([3,4]);
        ctx.beginPath();ctx.moveTo(gx,padT);ctx.lineTo(gx,padT+ih);ctx.stroke();ctx.setLineDash([]);
        ctx.fillStyle="rgba("+col+",.8)";ctx.font="9px ui-monospace,Menlo,monospace";ctx.textAlign="center";
        ctx.fillText(label,gx,padT-6);
      });

      /* grid + 0/1 axis for the history strip */
      ctx.strokeStyle="rgba(255,255,255,.05)";ctx.lineWidth=1;ctx.beginPath();
      [0,0.5,1].forEach(v=>{const y=Y(v);ctx.moveTo(histX0,y);ctx.lineTo(histX1,y);});
      ctx.stroke();
      ctx.textAlign="right";ctx.font="9px ui-monospace,Menlo,monospace";ctx.fillStyle="rgba("+P.dim+",.7)";
      [1,0.5,0].forEach(v=>ctx.fillText(v.toFixed(1),histX0-6,Y(v)+3));
      ctx.textAlign="right";ctx.fillText("p(true), one mark per ask",histX1,padT-6);

      let right=0, strict=0, lenient=0, arrived=0;
      let cur=null;
      items.forEach(it=>{
        if(t<it.spawn) return;
        arrived++;
        const u=U.clamp((t-it.spawn)/SETTLE,0,1);
        const settled=u>=1;
        if(settled){ if(it.correct) right++; else if(it.truth===0&&it.pred===1) lenient++; else strict++; }
        else cur=it;
        /* history mark at its fixed slot */
        const hx=histX0+(histX1-histX0)*((it.spawn+0.5)/N);
        const p=U.ease.outCubic(u);
        const shownP=settled?it.p:it.p*p+0.5*(1-p);
        const col=!settled?P.steel:it.correct?P.mint:P.ember;
        const a=settled?0.7:0.35;
        if(settled){
          ctx.strokeStyle="rgba("+col+",.20)";ctx.lineWidth=1.1;
          ctx.beginPath();ctx.moveTo(hx,Y(0.5));ctx.lineTo(hx,Y(shownP));ctx.stroke();
        }
        ctx.fillStyle="rgba("+col+","+a+")";
        ctx.beginPath();ctx.arc(hx,Y(shownP),settled?2.2:1.8,0,7);ctx.fill();
      });

      /* the item currently crossing door -> filter -> resolving, drawn large
         as a two-bar noul distribution, then a verdict chip */
      if(cur){
        const u=U.clamp((t-cur.spawn)/SETTLE,0,1);
        const travel=U.ease.outCubic(Math.min(1,u/0.55));
        const tx=padL+ (doorPx-padL)*Math.min(1,travel/0.5) + Math.max(0,travel-0.5)*2*(gatePx-doorPx);
        const bx=Math.min(tx,gatePx+34);
        const by=padT+ih*0.5;
        const flash=U.pulse(t,cur.spawn,0.5);
        if(flash>0) U.glow(ctx,bx,by,3+5*flash,P.iris,0.5*flash);
        ctx.fillStyle="rgba("+P.iris+",.7)";
        ctx.beginPath();ctx.arc(bx,by,3,0,7);ctx.fill();

        if(u>0.55){
          const rp=U.clamp((u-0.55)/0.35,0,1);
          const bw=46,bh=70,gx0=Math.min(bx+16,w-padR-2*bw-8),by0=padT+8;
          const barH=(v)=>Math.max(2,v*bh*rp);
          ["true","false"].forEach((lab,i)=>{
            const v=i===0?cur.p:1-cur.p;
            const x=gx0+i*(bw+8);
            ctx.fillStyle="rgba("+P.dim+",.12)";ctx.fillRect(x,by0,bw,bh);
            ctx.fillStyle="rgba("+(i===0?P.iris:P.dim)+",.45)";
            ctx.fillRect(x,by0+bh-barH(v),bw,barH(v));
            ctx.textAlign="center";ctx.font="9px ui-monospace,Menlo,monospace";ctx.fillStyle="rgba("+P.fg+",.8)";
            ctx.fillText(lab,x+bw/2,by0+bh+12);
            if(rp>0.9) ctx.fillText(v.toFixed(3),x+bw/2,by0+bh-barH(v)-5>by0+8?by0+bh-barH(v)-5:by0+8);
          });
          if(u>0.92){
            const verdict=cur.pred===1?"true":"false";
            ctx.textAlign="left";ctx.font="10.5px ui-monospace,Menlo,monospace";
            ctx.fillStyle="rgba("+P.fg+",.85)";
            ctx.fillText("verdict: "+verdict,gx0,by0-8);
          }
        }
      }

      /* running readout */
      const meanConf = arrived? items.slice(0,arrived).reduce((s,it)=>s+Math.max(it.p,1-it.p),0)/arrived : 0;
      ctx.textAlign="left";ctx.font="10.5px ui-monospace,Menlo,monospace";
      ctx.fillStyle="rgba("+P.fg+",.85)";
      ctx.fillText("asked "+arrived+"/"+N+"   right "+right+"   failed-a-right-answer "+strict+"   stated conf (avg) "+meanConf.toFixed(3),padL,h-padB+16);

      /* reliability inset: this run's own 10 bins, filling in as items land */
      const iy=h-padB+30, ih2=padB-38, ix=padL, iw2=w-padL-padR;
      ctx.strokeStyle="rgba(255,255,255,.08)";ctx.lineWidth=1;
      ctx.strokeRect(ix,iy,iw2,Math.max(0,ih2));
      ctx.fillStyle="rgba("+P.dim+",.75)";ctx.font="9px ui-monospace,Menlo,monospace";ctx.textAlign="left";
      ctx.fillText("this run's own 10 bins, by max(p,1-p)",ix+6,iy-3);
      const bx2=v=>ix+10+(iw2-46)*v, by2=v=>iy+ih2-6-(ih2-14)*v;
      ctx.strokeStyle="rgba("+P.dim+",.35)";ctx.setLineDash([2,3]);
      ctx.beginPath();ctx.moveTo(bx2(0),by2(0));ctx.lineTo(bx2(1),by2(1));ctx.stroke();ctx.setLineDash([]);
      const seen=Math.min(N,arrived);
      bins.forEach((b,i)=>{
        if(!b.n) return;
        const conf=(i+0.5)/10;
        /* only draw once every item in this bin has actually arrived; since
           bins are sparse the bin's own item indices decide when */
        const itemsInBin=items.filter(it=>Math.min(9,Math.floor(Math.max(it.p,1-it.p)*10))===i);
        const lastSpawn=Math.max(...itemsInBin.map(it=>it.spawn));
        if(t<lastSpawn+SETTLE) return;
        const r=Math.max(2.5,Math.min(9,Math.sqrt(b.n)*1.6));
        ctx.fillStyle="rgba("+P.rose+",.6)";
        ctx.beginPath();ctx.arc(bx2(conf),by2(b.c/b.n),r,0,7);ctx.fill();
      });

      /* playhead */
      const px=padL+iw*Math.min(t,W)/W;
      ctx.strokeStyle="rgba("+P.fg+",.35)";ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(px,4);ctx.lineTo(px,padT-2);ctx.stroke();
    }
  };
});
})();
