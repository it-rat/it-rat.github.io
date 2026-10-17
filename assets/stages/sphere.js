/* Stage "spheres" - Sphere. Twelve life-agents drawn as a constellation
   inside an on-device boundary: memory dots accrete near each sphere as the
   week passes, cross-sphere insights light a chord between two spheres with
   a small label chip, and the weekly review appears as a card near the
   center. The ring precesses very slowly. Deterministic in t (scrub-safe).
   opts: {mem:[[t,v],...], insights:[{t,a,b,label}], reviewT} */
(function(){
"use strict";
const U=Sim.util, P=U.PAL;

Sim.registerStage("spheres",function(o,cfg){
  const LABELS=["health","finance","habits","work","social","mood","sleep","food","travel","learning","home","play"];
  const N=LABELS.length;
  const mem=o.mem||[[0,0],[60,0]];
  const insights=o.insights||[];
  const reviewT=o.reviewT!=null?o.reviewT:52;
  const idx=name=>{const i=LABELS.indexOf(name);return i<0?0:i;};
  const END=(cfg&&cfg.window)||60;

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

  let cx=0,cy=0,ring=0,bound=0,laidOut="",chipAt=[];

  function nodePos(i,t,radius){
    const rot=t*0.0026;
    const a=-Math.PI/2+i*(2*Math.PI/N)+rot;
    return {a,x:cx+Math.cos(a)*radius,y:cy+Math.sin(a)*radius};
  }
  function bez(A,C,B,p){
    const q=1-p;
    return {x:q*q*A.x+2*q*p*C.x+p*p*B.x, y:q*q*A.y+2*q*p*C.y+p*p*B.y};
  }

  /* where a sphere's name is drawn at time t, and the box its glyphs fill */
  function labelAt(ctx,i,t){
    const P0=nodePos(i,t,ring), a=P0.a, c=Math.cos(a), s=Math.sin(a);
    let lx=P0.x+c*13, ly=P0.y+s*13, align;
    if(c>0.25) align="left";
    else if(c<-0.25) align="right";
    else{ align="center"; ly+= s>0?9:-6; }
    if(align==="left") lx+=2; else if(align==="right") lx-=2;
    const tw=ctx.measureText(LABELS[i]).width;
    const x0=align==="left"?lx:align==="right"?lx-tw:lx-tw/2;
    return {align,x:lx,y:ly+3,box:[x0,ly-4,x0+tw,ly+5]};
  }
  function chord(ins,t){
    const A=nodePos(idx(ins.a),t,ring), B=nodePos(idx(ins.b),t,ring);
    const mx=(A.x+B.x)/2, my=(A.y+B.y)/2;
    return {A,B,C:{x:cx+(mx-cx)*0.3, y:cy+(my-cy)*0.3}};
  }
  const hit=(a,b,m)=>a[0]<b[2]+m&&b[0]<a[2]+m&&a[1]<b[3]+m&&b[1]<a[3]+m;

  /* Laid out once per canvas size, with a context to measure in.
     The ring leaves room for the longest sphere name beside it, so on a
     phone-width canvas the names on the left and right stay inside the edge.
     Each insight chip is wrapped to fit the canvas, then placed as close to
     its chord's midpoint as it can sit clear of the review card, the sphere
     names and dots, the two captions and the chips before it, checked at the
     moment it appears, midway and at the end of the week; it then rides its
     chord at that offset as the ring turns. Midpoint-only, the three chips
     and the review card landed on top of each other in the middle. When no
     clear place is near enough (a phone-width ring is small), the oldest
     chip still showing yields: it fades out as the new one arrives, and its
     chord stays as the record. */
  function layout(ctx,w,h){
    laidOut=w+"x"+h;
    ctx.font="9px ui-monospace,Menlo,monospace";
    const longest=Math.max(...LABELS.map(l=>ctx.measureText(l).width));
    ring=Math.min(Math.min(w,h)*0.36, w/2-15-longest-6);
    bound=Math.min(ring+30,Math.min(w,h)*0.475);
    const review=[cx-75,cy-20,cx+75,cy+20];
    ctx.font="9.5px ui-monospace,Menlo,monospace";
    const capTop=Math.max(cy-bound-13,13), capBot=cy+bound+13;
    const capW=ctx.measureText("0 crossings · sent off-device").width;
    const botW=ctx.measureText("on-device · nothing leaves").width;
    const fixed=[[cx-capW/2,capTop-7,cx+capW/2,capTop+2],[cx-botW/2,capBot-7,cx+botW/2,capBot+2]];
    const obst=new Map();
    const obstaclesAt=t=>{
      if(obst.has(t)) return obst.get(t);
      ctx.font="9px ui-monospace,Menlo,monospace";
      const o=fixed.slice();
      if(t>=reviewT) o.push(review);
      for(let i=0;i<N;i++){
        o.push(labelAt(ctx,i,t).box);
        const n=nodePos(i,t,ring); o.push([n.x-6,n.y-6,n.x+6,n.y+6]);
      }
      obst.set(t,o); return o;
    };
    const offs=[], R=Math.round(ring*0.6);
    for(let oy=-R;oy<=R;oy+=4) for(let ox=-R;ox<=R;ox+=4) if(ox*ox+oy*oy<=R*R) offs.push([ox,oy]);
    offs.sort((u,v)=>(u[0]*u[0]+u[1]*u[1])-(v[0]*v[0]+v[1]*v[1]));
    const specs=insights.map(ins=>{
      ctx.font="9.5px ui-monospace,Menlo,monospace";
      const lines=ins.label?U.wrap(ctx,ins.label,Math.min(w*0.36,ctx.measureText(ins.label).width),true):[];
      const tw=Math.max(0,...lines.map(l=>ctx.measureText(l).width));
      const cw2=tw+12, ch2=16+12*(lines.length-1);
      const rectAt=(o,t)=>{
        const q=chord(ins,t), m=bez(q.A,q.C,q.B,0.5);
        return [m.x+o[0]-cw2/2,m.y+o[1]-ch2/2,m.x+o[0]+cw2/2,m.y+o[1]+ch2/2];
      };
      const appear=ins.t+1.4;
      return {lines,cw2,ch2,rectAt,appear,times:[appear,Math.max(appear,reviewT+1),(appear+END)/2,END]};
    });
    const showing=(c,t)=>t>=c.appear&&(c.until==null||t<c.until);
    const clearFor=(sp,o,placed)=>sp.times.every(t=>{
      const r=sp.rectAt(o,t);
      if(r[0]<4||r[2]>w-4||r[1]<4||r[3]>h-4) return false;
      /* inside the dashed on-device boundary: a chip across it would read
         as something leaving */
      const far=Math.max(...[[r[0],r[1]],[r[2],r[1]],[r[0],r[3]],[r[2],r[3]]].map(([x,y])=>Math.hypot(x-cx,y-cy)));
      if(far>bound-4) return false;
      if(obstaclesAt(t).some(f=>hit(r,f,3))) return false;
      return placed.every(c=>!showing(c,t)||!hit(r,c.rectAt(c.off,t),3));
    });
    /* placing the chips in their own order can let an early one take the
       only spot a wider later one fits; every order is tried, and the one
       that keeps all of them nearest their chords wins */
    const perms=a=>a.length<2?[a]:a.flatMap((x,i)=>perms(a.slice(0,i).concat(a.slice(i+1))).map(r=>[x].concat(r)));
    let best=null;
    if(specs.length<=5) perms(specs.map((_,k)=>k)).forEach(order=>{
      const placed=[]; let cost=0;
      for(const k of order){
        const off=offs.find(o=>clearFor(specs[k],o,placed));
        if(!off) return;
        placed.push(Object.assign({off,until:null,k},specs[k]));
        cost+=off[0]*off[0]+off[1]*off[1];
      }
      if(!best||cost<best.cost) best={cost,placed};
    });
    if(best){
      chipAt=best.placed.slice().sort((p,q)=>p.k-q.k);
    }else{
      /* no order fits them all: in time order, and when a chip finds no
         clear place the oldest one still showing yields to it, fading out
         as it arrives, until there is room or none is left */
      chipAt=[];
      specs.forEach((sp,k)=>{
        let off=offs.find(o=>clearFor(sp,o,chipAt));
        while(!off){
          const old=chipAt.find(c=>c.until==null);
          if(!old) break;
          old.until=sp.appear;
          off=offs.find(o=>clearFor(sp,o,chipAt));
        }
        chipAt.push(Object.assign({off:off||[0,0],until:null,k},sp));
      });
    }
  }

  return{
    minHeight:340,
    init(w,h){
      cx=w/2;cy=h/2;
      ring=Math.min(w,h)*0.36;
      bound=Math.min(ring+30,Math.min(w,h)*0.475);
      laidOut="";
    },
    draw(ctx,w,h,t){
      ctx.clearRect(0,0,w,h);
      if(laidOut!==w+"x"+h) layout(ctx,w,h);
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
        const {A,B,C}=chord(ins,t);
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

      /* insight chips, on their chords where the layout put them, over the
         memory dots so the dots never speckle the text */
      insights.forEach((ins,k)=>{
        const since=t-(ins.t+1.4);
        if(since<0 || !ins.label) return;
        const c=chipAt[k];
        const fadeIn=U.clamp(since/0.5,0,1);
        const settle=1-U.clamp((since-3.4)/1.8,0,1)*0.55;
        /* a yielding chip is gone by the time the new one starts to show */
        const gone=c.until!=null?U.clamp((t-c.until+0.6)/0.6,0,1):0;
        if(gone>=1) return;
        const r=c.rectAt(c.off,t);
        ctx.save();
        ctx.globalAlpha=fadeIn*settle*(1-gone);
        U.rr(ctx,r[0],r[1],c.cw2,c.ch2,7);
        ctx.fillStyle="rgba(16,22,31,.88)";ctx.fill();
        ctx.strokeStyle="rgba("+P.lime+",.7)";ctx.lineWidth=1;ctx.stroke();
        ctx.font="9.5px ui-monospace,Menlo,monospace";
        ctx.fillStyle="rgba("+P.lime+",.95)";ctx.textAlign="center";
        c.lines.forEach((ln,j)=>ctx.fillText(ln,(r[0]+r[2])/2,r[1]+11.3+12*j));
        ctx.restore();
      });

      ctx.font="9px ui-monospace,Menlo,monospace";
      for(let i=0;i<N;i++){
        const L=labelAt(ctx,i,t);
        ctx.textAlign=L.align;
        ctx.fillStyle="rgba("+P.faint+",.85)";
        ctx.fillText(LABELS[i],L.x,L.y);
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
        /* never above the canvas top: at full width the boundary nearly
           touches it, and the line's tops were cut */
        ctx.fillText("0 crossings · sent off-device",cx,Math.max(cy-bound-13,13));
        ctx.restore();
      }
    }
  };
});
})();
