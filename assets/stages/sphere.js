/* Stage "spheres" - Sphere. Twelve life-agents drawn as a constellation
   inside an on-device boundary: memory dots accrete near each sphere as the
   week passes, cross-sphere insights light a chord between two spheres with
   a small label chip, and the weekly review appears as a card near the
   center. The ring precesses very slowly. Deterministic in t (scrub-safe).
   opts: {mem:[[t,v],...], insights:[{t,a,b,label}], reviewT} */
(function(){
"use strict";
const U=Sim.util, P=U.PAL;

Sim.registerStage("spheres",function(o){
  const LABELS=["health","finance","habits","work","social","mood","sleep","food","travel","learning","home","play"];
  const N=LABELS.length;
  const mem=o.mem||[[0,0],[60,0]];
  const insights=o.insights||[];
  const reviewT=o.reviewT!=null?o.reviewT:52;
  const idx=name=>{const i=LABELS.indexOf(name);return i<0?0:i;};

  /* seeded memory-dot slots: precomputed once, deterministic (no Math.random) */
  const maxMem=Math.max(1,Math.ceil(mem.reduce((m,p)=>Math.max(m,p[1]),0)));
  const rndDot=U.rng(410);
  const dots=[];
  for(let i=0;i<maxMem+6;i++){
    dots.push({
      node:Math.floor(rndDot()*N),
      angJit:(rndDot()*2-1)*0.85,
      radFrac:rndDot(),
      r:1.0+rndDot()*1.1
    });
  }

  let cx=0,cy=0,ring=0,bound=0;

  function nodePos(i,t,radius){
    const rot=t*0.0026;
    const a=-Math.PI/2+i*(2*Math.PI/N)+rot;
    return {a,x:cx+Math.cos(a)*radius,y:cy+Math.sin(a)*radius};
  }
  function bez(A,C,B,p){
    const q=1-p;
    return {x:q*q*A.x+2*q*p*C.x+p*p*B.x, y:q*q*A.y+2*q*p*C.y+p*p*B.y};
  }

  return{
    minHeight:340,
    init(w,h){
      cx=w/2;cy=h/2;
      ring=Math.min(w,h)*0.36;
      bound=Math.min(ring+30,Math.min(w,h)*0.475);
    },
    draw(ctx,w,h,t){
      ctx.clearRect(0,0,w,h);
      ctx.textAlign="center";

      const pos=[];
      for(let i=0;i<N;i++) pos.push(nodePos(i,t,ring));

      /* boundary: faint dashed ring, the on-device edge nothing crosses */
      ctx.save();
      ctx.strokeStyle="rgba("+P.faint+",.4)";
      ctx.setLineDash([3,6]);ctx.lineWidth=1.2;
      ctx.beginPath();ctx.arc(cx,cy,bound,0,Math.PI*2);ctx.stroke();
      ctx.restore();
      ctx.font="9.5px ui-monospace,Menlo,monospace";
      ctx.fillStyle="rgba("+P.faint+",.85)";
      ctx.fillText("on-device · nothing leaves",cx,cy+bound+13);

      /* cross-sphere chords, drawn under the nodes */
      insights.forEach(ins=>{
        if(t<ins.t) return;
        const A=pos[idx(ins.a)], B=pos[idx(ins.b)];
        const mx=(A.x+B.x)/2, my=(A.y+B.y)/2;
        const C={x:cx+(mx-cx)*0.3, y:cy+(my-cy)*0.3};
        const drawP=U.ease.outCubic(U.between(t,ins.t,ins.t+1.4));
        const steps=26;
        ctx.beginPath();
        for(let k=0;k<=steps;k++){
          const p=drawP*k/steps;
          const pt=bez(A,C,B,p);
          k?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y);
        }
        const glowPulse=U.pulse(t,ins.t+1.4,2.2);
        let alpha;
        if(drawP<1) alpha=0.12+0.55*drawP;
        else alpha=0.22+glowPulse*0.62;
        if(glowPulse>0.04){
          ctx.save();ctx.lineWidth=5+8*glowPulse;
          ctx.strokeStyle="rgba("+P.lime+","+(glowPulse*0.16)+")";ctx.stroke();ctx.restore();
        }
        ctx.lineWidth=1.3+glowPulse*1.3;
        ctx.strokeStyle="rgba("+P.lime+","+alpha+")";
        ctx.stroke();

        /* label chip, mid-chord, once the chord has drawn in */
        const since=t-(ins.t+1.4);
        if(since>=0 && ins.label){
          const fadeIn=U.clamp(since/0.5,0,1);
          const settle=1-U.clamp((since-3.4)/1.8,0,1)*0.55;
          const chipA=fadeIn*settle;
          const mid=bez(A,C,B,0.5);
          ctx.save();
          ctx.font="9.5px ui-monospace,Menlo,monospace";
          const tw=ctx.measureText(ins.label).width;
          const cw2=tw+12, ch2=16;
          ctx.globalAlpha=chipA;
          U.rr(ctx,mid.x-cw2/2,mid.y-ch2/2,cw2,ch2,7);
          ctx.fillStyle="rgba(16,22,31,.88)";ctx.fill();
          ctx.strokeStyle="rgba("+P.lime+",.7)";ctx.lineWidth=1;ctx.stroke();
          ctx.fillStyle="rgba("+P.lime+",.95)";ctx.textAlign="center";
          ctx.fillText(ins.label,mid.x,mid.y+3.3);
          ctx.restore();
        }
      });

      /* memory accretion: small dim dots gathering near their sphere */
      const memCount=U.interp(mem,t);
      const full=Math.floor(memCount), frac=memCount-full;
      for(let i=0;i<dots.length;i++){
        if(i>full || (i===full && frac<=0.02)) break;
        const d=dots[i];
        const growing=(i===full);
        const a=pos[d.node].a+d.angJit;
        const dist=ring*(0.82-0.30*d.radFrac);
        const x=cx+Math.cos(a)*dist, y=cy+Math.sin(a)*dist;
        const al=growing?0.45*frac:0.42;
        const rr2=d.r*(growing?Math.max(0.35,frac):1);
        ctx.beginPath();ctx.fillStyle="rgba("+P.lime+","+al+")";
        ctx.arc(x,y,rr2,0,Math.PI*2);ctx.fill();
      }

      /* the twelve sphere nodes */
      for(let i=0;i<N;i++){
        const P0=pos[i];
        const breathe=0.85+0.15*Math.sin(t*0.5+i*0.7);
        U.glow(ctx,P0.x,P0.y,2.4*breathe,P.lime,.92);
      }
      ctx.font="9px ui-monospace,Menlo,monospace";
      for(let i=0;i<N;i++){
        const P0=pos[i], a=P0.a, c=Math.cos(a), s=Math.sin(a);
        let lx=P0.x+c*13, ly=P0.y+s*13;
        let align;
        if(c>0.25) align="left";
        else if(c<-0.25) align="right";
        else{ align="center"; ly+= s>0?9:-6; }
        if(align==="left") lx+=2; else if(align==="right") lx-=2;
        ctx.textAlign=align;
        ctx.fillStyle="rgba("+P.faint+",.85)";
        ctx.fillText(LABELS[i],lx,ly+3);
      }
      ctx.textAlign="center";

      /* weekly review: a small card drafted from memory, near the center */
      if(reviewT!=null){
        const p=U.clamp(U.ease.outBack(U.between(t,reviewT,reviewT+1.0)),0,1.15);
        const alpha=U.clamp(p,0,1);
        if(alpha>0.01){
          const cw3=150, ch3=40;
          const rx=cx-cw3/2, ry=cy-ch3/2+(1-alpha)*9;
          ctx.save();ctx.globalAlpha=alpha;
          U.rr(ctx,rx,ry,cw3,ch3,10);
          ctx.fillStyle="rgba(16,22,31,.92)";ctx.fill();
          ctx.strokeStyle="rgba("+P.lime+",.85)";ctx.lineWidth=1.3;ctx.stroke();
          ctx.font="9.5px ui-monospace,Menlo,monospace";
          ctx.fillStyle="rgba("+P.lime+",.95)";
          ctx.fillText("weekly review",cx,cy-3);
          ctx.font="8px ui-monospace,Menlo,monospace";
          ctx.fillStyle="rgba("+P.dim+",.9)";
          ctx.fillText("drafted from memory",cx,cy+11);
          ctx.restore();
        }
      }

      /* echo the "sent off-device" counter, near the boundary, at the end */
      const endP=U.between(t,56.5,58);
      if(endP>0){
        ctx.save();ctx.globalAlpha=endP;
        ctx.font="9.5px ui-monospace,Menlo,monospace";
        ctx.fillStyle="rgba("+P.mint+",.9)";
        ctx.fillText("0 crossings · sent off-device",cx,cy-bound-13);
        ctx.restore();
      }
    }
  };
});
})();
