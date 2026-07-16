/* Stage "outofband" - Pocket. Two paths, drawn literally, kept apart:
   the money path on top (fleet -> gateway -> provider, amber burn sparks)
   and the kill path below it (cloud -> phone -> watch, cyan), separated by
   a dashed divider labeled "out of band". A run runs hot, the gateway
   pushes an over-cap warning down to the phone, the watch fills a
   hold-to-confirm ring, the phone signs a kill with the Secure Enclave and
   sends it back up, and the breaker snaps onto the top wire at the
   gateway. Deterministic in t (scrub-safe): every position is a pure
   function of t, no Math.random in draw.
   opts: {burn:[[t,v],...], hotT, pushT, confirmT, signT, killT, calmT} */
(function(){
"use strict";
const U=Sim.util, P=U.PAL;

function quadBezier(p0,c,p1,t){
  const mt=1-t;
  return {x:mt*mt*p0.x+2*mt*t*c.x+t*t*p1.x, y:mt*mt*p0.y+2*mt*t*c.y+t*t*p1.y};
}

Sim.registerStage("outofband",function(o){
  const burn=o.burn||[[0,.42],[60,.42]];
  const baseline=burn[0][1]||.42;
  const hotT=o.hotT, pushT=o.pushT, confirmT=o.confirmT, signT=o.signT, killT=o.killT, calmT=o.calmT;
  const pushDur=3.2, killDur=3.2;
  const rnd=U.rng(53);
  const SN=9, sparkPhase=Array.from({length:SN},()=>rnd());
  const sparkJit=Array.from({length:SN},()=>rnd()*2-1);
  const idlePhase=[rnd(),rnd()];

  let topY=0,divY=0,botY=0,xL=0,xM=0,xR=0,bw=0,bh=0;

  function layout(w,h){
    topY=h*0.20; divY=h*0.47; botY=h*0.745;
    const padL=22,padR=22;
    xL=padL+42; xR=w-padR-42; xM=w/2;
    bw=76; bh=34;
  }

  function node(ctx,cx,cy,label,sub,col,glowA){
    if(glowA>0) U.glow(ctx,cx,cy,3,col,Math.min(1,glowA));
    U.rr(ctx,cx-bw/2,cy-bh/2,bw,bh,9);
    ctx.fillStyle="rgba(16,22,31,1)";ctx.fill();
    ctx.strokeStyle="rgba("+col+","+(0.35+0.5*Math.min(1,glowA||0.28))+")";ctx.lineWidth=1.3;ctx.stroke();
    ctx.fillStyle="rgba("+P.fg+",.92)";ctx.font="11px ui-monospace,Menlo,monospace";
    ctx.fillText(label,cx,cy-2);
    ctx.fillStyle="rgba("+P.faint+",.9)";ctx.font="8.5px ui-monospace,Menlo,monospace";
    ctx.fillText(sub,cx,cy+11);
  }

  function hex(ctx,cx,cy,r){
    ctx.beginPath();
    for(let i=0;i<6;i++){
      const a=Math.PI/6+i*Math.PI/3;
      const x=cx+r*Math.cos(a), y=cy+r*Math.sin(a);
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    ctx.closePath();
  }

  return{
    minHeight:320,
    init(w,h){ layout(w,h); },
    draw(ctx,w,h,t){
      ctx.textAlign="center";

      /* ---------------- divider ---------------- */
      ctx.save();
      ctx.setLineDash([3,5]);
      ctx.strokeStyle="rgba("+P.faint+",.35)";ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(18,divY);ctx.lineTo(w-18,divY);ctx.stroke();
      ctx.restore();
      ctx.fillStyle="rgba("+P.faint+",.75)";ctx.font="9px ui-monospace,Menlo,monospace";
      ctx.fillText("out of band",xM,divY+3.5);

      /* ---------------- bottom path: cloud -> phone -> watch ---------------- */
      const cloud={x:xL,y:botY}, phone={x:xM,y:botY}, watch={x:xR,y:botY};
      const ctrlCP={x:(cloud.x+phone.x)/2,y:botY-24};
      const ctrlPW={x:(phone.x+watch.x)/2,y:botY-24};
      ctx.strokeStyle="rgba("+P.cyan+",.28)";ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(cloud.x,cloud.y);ctx.quadraticCurveTo(ctrlCP.x,ctrlCP.y,phone.x,phone.y);ctx.stroke();
      ctx.beginPath();ctx.moveTo(phone.x,phone.y);ctx.quadraticCurveTo(ctrlPW.x,ctrlPW.y,watch.x,watch.y);ctx.stroke();

      /* faint idle heartbeat along the bottom links, always on: it's a live channel */
      [[cloud,ctrlCP,phone,0],[phone,ctrlPW,watch,1]].forEach(([a,c,b,ph])=>{
        const p=((t*0.11+idlePhase[ph])%1);
        const pt=quadBezier(a,c,b,p);
        U.glow(ctx,pt.x,pt.y,1.2,P.cyan,.35);
      });

      /* ---------------- top path: fleet -> gateway -> provider ---------------- */
      const fleet={x:xL,y:topY}, gateway={x:xM,y:topY}, provider={x:xR,y:topY};
      const tripped=t>=killT;
      const burnNow=U.interp(burn,t);
      const rateMul=U.clamp(burnNow/baseline,0.4,6);
      const wireY=x=>topY+Math.sin(x*0.012+0.7)*5;

      function wireSeg(x0,x1,alpha){
        ctx.beginPath();
        for(let x=x0;x<=x1;x+=8){
          const y=wireY(x);
          x===x0?ctx.moveTo(x,y):ctx.lineTo(x,y);
        }
        ctx.strokeStyle="rgba("+P.amber+","+alpha+")";ctx.lineWidth=1.6;ctx.stroke();
      }
      if(!tripped){
        wireSeg(fleet.x+bw/2,provider.x-bw/2,.55);
      }else{
        wireSeg(fleet.x+bw/2,gateway.x-14,.5);
        ctx.beginPath();
        for(let x=gateway.x+14;x<=provider.x-bw/2;x+=8){
          const y=wireY(x);
          x===gateway.x+14?ctx.moveTo(x,y):ctx.lineTo(x,y);
        }
        ctx.strokeStyle="rgba("+P.faint+",.3)";ctx.lineWidth=1.4;ctx.stroke();
      }

      /* sparks: rate and glow follow the burn series, die at the breaker once tripped */
      const baseCyc=1.15;
      const cyc=baseCyc/rateMul;
      const sparkX1=tripped?gateway.x-14:provider.x-bw/2;
      for(let i=0;i<SN;i++){
        const p=((t/cyc)+sparkPhase[i])%1;
        const x=(fleet.x+bw/2)+(sparkX1-(fleet.x+bw/2))*p;
        if(x>sparkX1) continue;
        const y=wireY(x)+sparkJit[i]*1.6;
        const glowA=U.clamp(0.35+0.5*Math.min(1,rateMul/2.4),0.3,.95);
        U.glow(ctx,x,y,1.9,P.amber,glowA);
      }

      /* gateway runs hot from hotT until the kill lands */
      const hotIn=U.clamp(U.between(t,hotT,hotT+0.6),0,1);
      const hotOut=tripped?U.clamp(1-U.between(t,killT,killT+1.8),0,1):1;
      const hotA=hotIn*hotOut;
      node(ctx,fleet.x,fleet.y,"fleet","the runs",P.amber,.22);
      node(ctx,gateway.x,gateway.y,"gateway","budget gate",P.amber,.22+.55*hotA);
      node(ctx,provider.x,provider.y,"provider","model API",P.amber,.22);
      if(hotA>0.02){
        ctx.fillStyle="rgba("+P.amber+","+(hotA*.95)+")";
        ctx.font="9.5px ui-monospace,Menlo,monospace";
        ctx.fillText("burn 2.4x baseline",gateway.x,gateway.y-bh/2-8);
      }

      /* breaker: snaps onto the top wire right at the gateway */
      if(tripped){
        const bx=gateway.x-14, by=wireY(bx);
        const flash=1+U.pulse(t,killT,1.2)*.7;
        ctx.strokeStyle="rgba("+P.mint+",.95)";ctx.lineWidth=2*flash;
        ctx.beginPath();ctx.moveTo(bx-7,by-7);ctx.lineTo(bx+7,by+7);
        ctx.moveTo(bx+7,by-7);ctx.lineTo(bx-7,by+7);ctx.stroke();
        ctx.fillStyle="rgba("+P.mint+",.9)";ctx.font="9px ui-monospace,Menlo,monospace";
        ctx.fillText("breaker open",bx,by-13);
      }

      /* ---------------- push: gateway -> cloud -> phone, dashed ---------------- */
      const pushCtrl1={x:(gateway.x+cloud.x)/2,y:divY+6};
      if(t>=pushT){
        const routeA=U.clamp(U.between(t,pushT,pushT+.5),0,1);
        ctx.save();ctx.setLineDash([4,4]);
        ctx.strokeStyle="rgba("+P.cyan+","+(.4*routeA)+")";ctx.lineWidth=1.4;
        ctx.beginPath();ctx.moveTo(gateway.x,gateway.y);ctx.quadraticCurveTo(pushCtrl1.x,pushCtrl1.y,cloud.x,cloud.y);ctx.stroke();
        ctx.beginPath();ctx.moveTo(cloud.x,cloud.y);ctx.quadraticCurveTo(ctrlCP.x,ctrlCP.y,phone.x,phone.y);ctx.stroke();
        ctx.restore();

        const prog=U.between(t,pushT,pushT+pushDur);
        if(prog>0&&prog<1){
          const pt=prog<0.5
            ? quadBezier(gateway,pushCtrl1,cloud,U.ease.inOutCubic(prog/0.5))
            : quadBezier(cloud,ctrlCP,phone,U.ease.inOutCubic((prog-0.5)/0.5));
          const edge=Math.min(1,prog*8,(1-prog)*8);
          U.glow(ctx,pt.x,pt.y,3.4,P.cyan,.9*edge+.3);
        }
      }
      /* OVER CAP chip at the phone once the push lands */
      const arriveT=pushT+pushDur;
      if(t>=arriveT){
        const popIn=U.ease.outBack(U.clamp(U.between(t,arriveT,arriveT+.4),0,1));
        const fadeOut=tripped?U.clamp(1-U.between(t,killT,calmT),0,1):1;
        const a=popIn*Math.max(.15,fadeOut);
        const cw2=64,ch2=16,cx2=phone.x,cy2=phone.y-bh/2-16;
        U.rr(ctx,cx2-cw2/2*popIn,cy2-ch2/2,cw2*popIn,ch2,7);
        ctx.fillStyle="rgba(20,10,10,"+a+")";ctx.fill();
        ctx.strokeStyle="rgba("+P.ember+","+a+")";ctx.lineWidth=1;ctx.stroke();
        if(popIn>0.6){
          ctx.fillStyle="rgba("+P.ember+","+a+")";ctx.font="9px ui-monospace,Menlo,monospace";
          ctx.fillText("OVER CAP",cx2,cy2+3);
        }
      }

      /* ---------------- watch: hold-to-confirm ring ---------------- */
      const ringP=U.clamp(U.between(t,confirmT,signT),0,1);
      const ringDone=t>=signT;
      node(ctx,watch.x,watch.y,"watch","crown to confirm",P.cyan,ringDone?.6:.22);
      if(t>=confirmT-0.3){
        const r=24;
        ctx.strokeStyle="rgba("+P.dim+",.25)";ctx.lineWidth=3;
        ctx.beginPath();ctx.arc(watch.x,watch.y,r,0,Math.PI*2);ctx.stroke();
        if(ringP>0){
          ctx.strokeStyle=ringDone?"rgba("+P.mint+",.9)":"rgba("+P.cyan+",.9)";
          ctx.lineWidth=3;
          ctx.beginPath();
          ctx.arc(watch.x,watch.y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*ringP);
          ctx.stroke();
        }
        if(ringP>0&&!ringDone){
          ctx.fillStyle="rgba("+P.cyan+",.9)";ctx.font="8.5px ui-monospace,Menlo,monospace";
          ctx.fillText("hold to confirm",watch.x,watch.y+40);
        }
      }

      /* ---------------- Enclave-signed hexagon ---------------- */
      if(t>=signT){
        const pop=U.ease.outBack(U.clamp(U.between(t,signT,signT+.5),0,1));
        const hx=watch.x, hy=watch.y-bh/2-20;
        ctx.save();
        ctx.translate(hx,hy);ctx.scale(pop,pop);ctx.translate(-hx,-hy);
        hex(ctx,hx,hy,9);
        ctx.fillStyle="rgba(10,26,28,.9)";ctx.fill();
        ctx.strokeStyle="rgba("+P.cyan+",.95)";ctx.lineWidth=1.3;ctx.stroke();
        ctx.restore();
        ctx.fillStyle="rgba("+P.cyan+","+pop+")";ctx.font="8.5px ui-monospace,Menlo,monospace";
        ctx.fillText("Enclave-signed",hx,hy-16);
      }

      /* ---------------- kill: phone -> cloud -> gateway, solid ---------------- */
      if(t>=signT){
        ctx.strokeStyle="rgba("+P.cyan+",.55)";ctx.lineWidth=1.7;
        ctx.beginPath();ctx.moveTo(phone.x,phone.y);ctx.quadraticCurveTo(ctrlCP.x,ctrlCP.y,cloud.x,cloud.y);ctx.stroke();
        ctx.beginPath();ctx.moveTo(cloud.x,cloud.y);ctx.quadraticCurveTo(pushCtrl1.x,pushCtrl1.y,gateway.x,gateway.y);ctx.stroke();

        const prog=U.between(t,signT,signT+killDur);
        if(prog>0&&prog<1){
          const pt=prog<0.5
            ? quadBezier(phone,ctrlCP,cloud,U.ease.inOutCubic(prog/0.5))
            : quadBezier(cloud,pushCtrl1,gateway,U.ease.inOutCubic((prog-0.5)/0.5));
          const edge=Math.min(1,prog*8,(1-prog)*8);
          U.glow(ctx,pt.x,pt.y,4,P.cyan,.95*edge+.4);
        }
      }

      node(ctx,cloud.x,cloud.y,"cloud","pairing · fleet API",P.cyan,.25);
      node(ctx,phone.x,phone.y,"phone","Dynamic Island",P.cyan,.25);

      /* ---------------- calm caption ---------------- */
      if(t>=calmT){
        const a=U.clamp(U.between(t,calmT,calmT+2),0,1);
        ctx.fillStyle="rgba("+P.mint+","+(a*.95)+")";
        ctx.font="10px ui-monospace,Menlo,monospace";
        ctx.fillText("run killed · breaker open",xM,h-8);
      }
    }
  };
});
})();
