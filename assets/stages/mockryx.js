/* Stage "drills" - Mockryx. A mission-console board of five fire-drill
   tracks: a coral attack marker runs each hostile scenario down its own
   lane at the scenario's real event time, hits a mint guardrail wall, and
   a "HELD · <code>" verdict chip snaps in on the far side. Deterministic
   in t (scrub-safe): every position is a pure function of t, burst-particle
   angles are precomputed once with Sim.util.rng (no Math.random anywhere).
   opts: {drills:[{t,label,code}], skipNoteT, verdictT} */
(function(){
"use strict";
const U=Sim.util, P=U.PAL;

Sim.registerStage("drills",function(o){
  const drills=o.drills||[];
  const skipNoteT=o.skipNoteT, verdictT=o.verdictT;
  const TRAVEL=3.2;                 /* seconds the attacker spends on the lane */
  const NP=7;                       /* burst particles per impact */
  /* precompute deterministic burst-particle angles, one rng per drill */
  const burstAngles=drills.map((d,i)=>{
    const r=U.rng(4100+i*97);
    return Array.from({length:NP},()=>r()*Math.PI*2);
  });

  let W=0,H=0,x0=0,x1=0,shieldX=0,top=0,bot=0,rowH=0;

  function diamond(ctx,x,y,r,col,a){
    ctx.beginPath();
    ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath();
    ctx.fillStyle="rgba("+col+","+a+")";ctx.fill();
  }

  return{
    minHeight:300,
    init(w,h){
      W=w;H=h;
      x0=112; x1=w-16;
      shieldX=w*0.76;
      top=30; bot=h-72;
      rowH=(bot-top)/Math.max(1,drills.length);
    },
    draw(ctx,w,h,t){
      /* console board backdrop */
      U.rr(ctx,x0-16,top-18,(x1-(x0-16)),bot-top+36,12);
      ctx.fillStyle="rgba(16,22,31,.55)";ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,.07)";ctx.lineWidth=1;ctx.stroke();

      /* row separators */
      ctx.strokeStyle="rgba(255,255,255,.05)";ctx.lineWidth=1;
      for(let i=1;i<drills.length;i++){
        const y=top+rowH*i;
        ctx.beginPath();ctx.moveTo(x0-16,y);ctx.lineTo(x1,y);ctx.stroke();
      }

      /* the guardrail wall: one mint line spanning every track, sine shimmer */
      ctx.beginPath();
      for(let y=top-14;y<=bot+8;y+=6){
        const x=shieldX+Math.sin(y*0.06+t*1.5)*1.4;
        y===top-14?ctx.moveTo(x,y):ctx.lineTo(x,y);
      }
      ctx.strokeStyle="rgba("+P.mint+",.5)";ctx.lineWidth=1.6;ctx.stroke();
      ctx.textAlign="center";ctx.font="9px ui-monospace,Menlo,monospace";
      ctx.fillStyle="rgba("+P.mint+",.8)";
      ctx.fillText("guardrail wall",shieldX,top-22);

      /* five tracks */
      drills.forEach((d,i)=>{
        const rowY=top+rowH*i+rowH*0.5;

        ctx.textAlign="left";ctx.font="9.5px ui-monospace,Menlo,monospace";
        ctx.fillStyle="rgba("+P.dim+",.9)";
        ctx.fillText(d.label,x0-6,rowY+3.2);

        ctx.strokeStyle="rgba("+P.faint+",.25)";ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(x0+64,rowY);ctx.lineTo(shieldX-3,rowY);ctx.stroke();

        /* attack marker: coral diamond travelling toward the wall, with a trailing streak */
        const born=d.t-TRAVEL;
        if(t>=born&&t<d.t){
          const p=U.ease.outCubic(U.between(t,born,d.t));
          const x=x0+64+(shieldX-6-(x0+64))*p;
          const tailX0=Math.max(x0+64,x-42);
          const grad=ctx.createLinearGradient(tailX0,rowY,x,rowY);
          grad.addColorStop(0,"rgba("+P.coral+",0)");
          grad.addColorStop(1,"rgba("+P.coral+",.85)");
          ctx.strokeStyle=grad;ctx.lineWidth=2;
          ctx.beginPath();ctx.moveTo(tailX0,rowY);ctx.lineTo(x,rowY);ctx.stroke();
          U.glow(ctx,x,rowY,2,P.coral,.9);
          diamond(ctx,x,rowY,4.5,P.coral,.95);
        }

        /* impact: coral burst + shield ripple */
        const burst=U.pulse(t,d.t,.9);
        if(burst>0){
          burstAngles[i].forEach(a=>{
            const r=4+20*(1-burst);
            U.glow(ctx,shieldX+Math.cos(a)*r*.55,rowY+Math.sin(a)*r*.5,1.3,P.coral,burst);
          });
          ctx.strokeStyle="rgba("+P.mint+","+(burst*.9)+")";ctx.lineWidth=1+2*burst;
          ctx.beginPath();ctx.moveTo(shieldX,rowY-9-10*burst);ctx.lineTo(shieldX,rowY+9+10*burst);ctx.stroke();
        }

        /* verdict chip: snaps in right of the wall */
        if(t>=d.t){
          const p=U.ease.outBack(U.between(t,d.t,d.t+.7));
          const a=Math.min(1,p*1.3);
          const chipW=60,chipH=16;
          const cx=shieldX+16+chipW/2+(1-p)*10;
          U.rr(ctx,cx-chipW/2,rowY-chipH/2,chipW,chipH,8);
          ctx.fillStyle="rgba(16,22,31,"+(0.92*a)+")";ctx.fill();
          ctx.strokeStyle="rgba("+P.mint+","+(0.85*a)+")";ctx.lineWidth=1.2;ctx.stroke();
          ctx.fillStyle="rgba("+P.mint+","+a+")";
          ctx.font="8.5px ui-monospace,Menlo,monospace";ctx.textAlign="center";
          ctx.fillText("HELD · "+d.code,cx,rowY+3);
        }
      });

      /* the --fail-on-skip note */
      const skipA=U.between(t,skipNoteT,skipNoteT+.6);
      if(skipA>0){
        ctx.textAlign="center";ctx.font="9.5px ui-monospace,Menlo,monospace";
        ctx.fillStyle="rgba("+P.amber+","+(0.92*skipA)+")";
        ctx.fillText("skipped = failed (--fail-on-skip)",(x0+x1)/2,bot+22);
      }

      /* final verdict banner, bottom-center, mint with a slow glow pulse */
      if(t>=verdictT){
        const p=U.ease.outBack(U.between(t,verdictT,verdictT+.6));
        const a=Math.min(1,p*1.2);
        const gp=0.5+0.5*Math.sin((t-verdictT)*2.1);
        const bw=210,bh=27,bx=w/2,by=h-16;
        ctx.save();
        ctx.translate(bx,by);ctx.scale(0.86+0.14*p,0.86+0.14*p);ctx.translate(-bx,-by);
        U.rr(ctx,bx-bw/2,by-bh/2,bw,bh,13);
        ctx.fillStyle="rgba(16,22,31,"+(0.95*a)+")";ctx.fill();
        ctx.strokeStyle="rgba("+P.mint+","+(a*(0.55+0.4*gp))+")";ctx.lineWidth=1.4;ctx.stroke();
        U.glow(ctx,bx-bw/2+16,by,2.5+2.5*gp,P.mint,0.55*a);
        ctx.fillStyle="rgba("+P.mint+","+a+")";
        ctx.font="10.5px ui-monospace,Menlo,monospace";ctx.textAlign="center";
        ctx.fillText("5/5 held · 0 gaps · exit 0",bx,by+3.6);
        ctx.restore();
      }
      ctx.textAlign="left";
    }
  };
});
})();
