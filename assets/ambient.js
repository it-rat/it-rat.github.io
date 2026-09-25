/* IT-RAT v2 - ambient.js: quiet, AI-flavored canvas backdrops for service
   hero sections. Each service gets a motif drawn from its own domain,
   rendered in the language of machine learning: gradient descent, decision
   boundaries, memory graphs, lattices, training curves, attention heads.
   Auto-mounts into .svc-hero based on <body data-service>. No deps. */
(function(){
"use strict";
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU=Math.PI*2;
function U_clamp(v,a,b){return v<a?a:v>b?b:v;}
function rng(seed){let a=seed>>>0||1;return function(){a|=0;a=a+0x6D2B79F5|0;let x=Math.imul(a^a>>>15,1|a);x=x+Math.imul(x^x>>>7,61|x)^x;return((x^x>>>14)>>>0)/4294967296;};}
function dot(ctx,x,y,r,col,a){
  const g=ctx.createRadialGradient(x,y,0,x,y,r*3.2);
  g.addColorStop(0,`rgba(${col},${a})`);g.addColorStop(1,`rgba(${col},0)`);
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*3.2,0,TAU);ctx.fill();
  ctx.fillStyle=`rgba(${col},${Math.min(1,a*1.6)})`;
  ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
}

const C={mint:"52,211,153",amber:"244,178,62",ember:"255,87,75",iris:"108,123,255",
  teal:"45,212,191",violet:"180,140,255",rose:"255,122,162",coral:"255,138,91",
  steel:"147,168,196",cyan:"34,211,238",lime:"163,230,53",dim:"138,151,166"};

const MOTIFS={

/* vouchryx - the delegation plane: a right that travels, proves itself, and
   can be cut mid-flight.

   Each lane is one delegation chain: a person on the left, an agent, then
   whoever that agent delegates to. Tokens travel it as small capsules, and
   each carries a thumbprint mark, because the token is bound to a key rather
   than to a bearer. They dim as they go: these are short-lived by design, and
   an expiry is not a failure.

   Twice a cycle a revocation sweeps back from the right, against the traffic.
   Anything it touches turns ember and stops at the next node rather than at
   its own expiry, which is the difference this service exists to draw. The
   chain behind it stays lit: revoking one delegation is not tearing down the
   graph.

   Written 2026-08-29. */
delegate(ctx,w,h,t){
  const lanes=3, rr=rng(913);
  const revoke=((t*0.085)%1);                 /* the sweep, right to left */
  const sweepX=w*(1.05-revoke*1.15);
  for(let l=0;l<lanes;l++){
    const y=h*(0.30+l*0.17)+Math.sin(t*0.25+l)*3;
    const nodes=4+((l+1)%2);
    /* the chain itself, hairline, always there */
    ctx.strokeStyle=`rgba(${C.dim},.10)`;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(w*0.08,y);ctx.lineTo(w*0.93,y);ctx.stroke();
    for(let n=0;n<nodes;n++){
      const x=w*(0.08+n*(0.85/(nodes-1)));
      dot(ctx,x,y,n===0?2.4:1.9,n===0?C.steel:C.iris,n===0?0.30:0.22);
    }
    /* tokens in flight, staggered so the lanes never march together */
    for(let k=0;k<3;k++){
      const ph=rr(), speed=0.10+ph*0.05;
      const u=((t*speed+ph+l*0.27)%1);
      const x=w*(0.08+u*0.85);
      const ttl=1-u*0.75;                     /* short-lived: it fades as it goes */
      const cut=x>sweepX-6&&x<sweepX+34&&((l+k)%2===0);
      const col=cut?C.ember:C.iris;
      const a=(cut?0.42:0.30)*ttl;
      ctx.fillStyle=`rgba(${col},${a})`;
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(x-9,y-3.5,18,7,3.5); else ctx.rect(x-9,y-3.5,18,7);
      ctx.fill();
      /* the thumbprint the token is bound to: two short arcs, never a bearer dot */
      ctx.strokeStyle=`rgba(${col},${a*1.5})`;ctx.lineWidth=1;
      for(let r=2;r<=4;r+=2){
        ctx.beginPath();ctx.arc(x+13,y,r,-0.9,0.9);ctx.stroke();
      }
      if(cut){ /* stopped here, not at its own expiry */
        ctx.strokeStyle=`rgba(${C.ember},.5)`;ctx.lineWidth=1.4;
        ctx.beginPath();ctx.moveTo(x+19,y-6);ctx.lineTo(x+25,y+6);ctx.stroke();
      }
    }
  }
  /* the sweep, drawn faintly and only while it is crossing */
  if(revoke>0.04&&revoke<0.96){
    const g=ctx.createLinearGradient(sweepX-30,0,sweepX+8,0);
    g.addColorStop(0,`rgba(${C.ember},0)`);g.addColorStop(1,`rgba(${C.ember},.16)`);
    ctx.fillStyle=g;ctx.fillRect(sweepX-30,h*0.20,38,h*0.52);
    ctx.strokeStyle=`rgba(${C.ember},.24)`;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(sweepX,h*0.20);ctx.lineTo(sweepX,h*0.72);ctx.stroke();
  }
  /* signed segments drifting: header, payload, signature, never parsed here */
  ctx.font="10px ui-monospace,Menlo,monospace";
  for(let i=0;i<7;i++){
    const ph=i*0.9, x=w*(0.05+((t*0.02+i*0.14)%0.92)), y=h*(0.12+((i*0.37)%0.78));
    ctx.fillStyle=`rgba(${C.dim},${0.08+0.05*Math.abs(Math.sin(t*0.4+ph))})`;
    ctx.fillText("eyJ...·...·sig",x,y);
  }
},

/* costcrew - the finops plane: a bill taken apart by hand.

   A daily cost series runs across, with the baseline it is judged against
   drawn under it as a dashed median and a soft band of robust deviation. One
   day at a time steps outside the band and gets a mark; the mark is sized by
   MONEY rather than by how far out the day sits, which is the whole ranking
   argument of the product.

   Under it, the part of the bill that arrived with nobody's name on it splits
   into slices and drifts toward owners. Nothing here is red: this plane
   reports, it never stops anything.

   Written 2026-08-29. */
ledger(ctx,w,h,t){
  const n=64, base=h*0.42, amp=h*0.055;
  const rr=rng(4210);
  const days=[];
  for(let i=0;i<n;i++) days.push(rr());
  /* the band the median allows */
  ctx.fillStyle=`rgba(${C.dim},.05)`;
  ctx.fillRect(w*0.06,base-amp*0.9,w*0.88,amp*1.8);
  ctx.strokeStyle=`rgba(${C.dim},.14)`;ctx.lineWidth=1;ctx.setLineDash([4,5]);
  ctx.beginPath();ctx.moveTo(w*0.06,base);ctx.lineTo(w*0.94,base);ctx.stroke();
  ctx.setLineDash([]);
  /* the series */
  ctx.strokeStyle=`rgba(${C.mint},.22)`;ctx.lineWidth=1.4;ctx.beginPath();
  const spike=Math.floor(((t*0.05)%1)*n);
  for(let i=0;i<n;i++){
    const x=w*(0.06+i/(n-1)*0.88);
    let y=base-(days[i]-0.5)*amp*1.1-Math.sin(t*0.3+i*0.4)*2;
    if(i===spike) y-=amp*2.6;
    i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  }
  ctx.stroke();
  /* the day in question, marked, and sized by the money rather than the sigma */
  const sx=w*(0.06+spike/(n-1)*0.88), sy=base-amp*3.0;
  dot(ctx,sx,sy,3.1,C.amber,0.34);
  ctx.strokeStyle=`rgba(${C.amber},.22)`;ctx.lineWidth=1;ctx.setLineDash([2,4]);
  ctx.beginPath();ctx.moveTo(sx,sy+6);ctx.lineTo(sx,base);ctx.stroke();ctx.setLineDash([]);
  /* shared cost finding an owner */
  const ty=h*0.72;
  ctx.fillStyle=`rgba(${C.dim},.07)`;ctx.fillRect(w*0.10,ty-7,w*0.24,14);
  for(let k=0;k<4;k++){
    const u=((t*0.09+k*0.25)%1);
    const x=w*(0.34+u*0.52), y=ty+Math.sin(t*0.5+k*1.7)*7;
    ctx.fillStyle=`rgba(${C.mint},${0.20*(1-u*0.5)})`;
    ctx.fillRect(x,y-3,11,6);
    if(u>0.9) dot(ctx,w*0.90,y,2.2,C.mint,0.26);
  }
},

/* trailryx - the record plane: a question is answered by a CONTIGUOUS range.
   Records arrive and chain, drawn as a dense run of ticks joined hairline to
   hairline. A question sweeps along and encloses a span with hard bracket
   edges; every tick inside it lights as one block. That contiguity IS the
   proof of completeness, which is this service's whole claim, so the figure is
   the unbroken span rather than the ticks.

   The contrast is drawn too, faintly: an ordinary store answers the same
   question with scattered rows and no way to show nothing is missing. Those
   appear as amber ticks with gaps, and they never get a bracket.

   Written 2026-08-11. It hand-declared `web`, which is engram's motif, so two
   rooms drew one graph. Third and last such collision on the site. */
contiguity(ctx,w,h,t){
  const rows=3, per=54, top=h*0.30, gap=h*0.16;
  const rr=rng(71);
  const scatter=[];
  for(let i=0;i<rows*per;i++) scatter.push(rr()<0.10);

  for(let r=0;r<rows;r++){
    const y=top+r*gap;
    /* The chain: every record joined to the next, hairline thin. */
    ctx.strokeStyle=`rgba(${C.dim},.10)`;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(w*0.06,y);ctx.lineTo(w*0.94,y);ctx.stroke();

    /* One question per row, offset in time so the three do not march. */
    const speed=0.055+r*0.012, phase=r*0.31;
    const u=((t*speed+phase)%1);
    const span=0.13+0.05*Math.sin(t*0.4+r);
    const a=u*(1-span), b=a+span;                 /* the proved range, 0..1 */

    for(let i=0;i<per;i++){
      const f=i/(per-1), x=w*(0.06+f*0.88);
      const inside=f>=a&&f<=b;
      if(inside){
        dot(ctx,x,y,1.7,C.rose,0.34);
      }else if(scatter[r*per+i]){
        /* What an ordinary store would have handed back: rows, with gaps. */
        dot(ctx,x,y,1.3,C.amber,0.13);
      }else{
        dot(ctx,x,y,1.1,C.dim,0.08);
      }
    }

    /* Hard bracket edges. The proof is that nothing between them is missing,
       so the edges are drawn sharp and the fill is not drawn at all. */
    const bx0=w*(0.06+a*0.88), bx1=w*(0.06+b*0.88), lip=7;
    ctx.strokeStyle=`rgba(${C.rose},.42)`;ctx.lineWidth=1.4;
    ctx.beginPath();
    ctx.moveTo(bx0,y-lip);ctx.lineTo(bx0,y+lip);
    ctx.moveTo(bx1,y-lip);ctx.lineTo(bx1,y+lip);
    ctx.moveTo(bx0,y-lip);ctx.lineTo(bx0+6,y-lip);
    ctx.moveTo(bx1,y-lip);ctx.lineTo(bx1-6,y-lip);
    ctx.stroke();
  }
},

/* heraldyx - the alerts plane: a log streams past, one line is worth a human.
   Events run left to right along the shared log, dim and unremarked. Now and
   then one is lifted out, brightens, arcs up to a recipient and lands as a
   single pulse. The STILLNESS between dispatches is the figure: this service's
   own rule is what is worth a human tonight, and a motif that fired constantly
   would be drawing a firehose, which is the thing it exists not to be.

   Written 2026-08-11. It shared `boundary` with wardryx and scopyx, so three
   rooms in the corridor drew one figure. */
dispatch(ctx,w,h,t){
  const rr=rng(53), baseY=h*0.66, n=34;
  /* The shared log: a faint rule with events running along it. */
  ctx.strokeStyle=`rgba(${C.steel},.10)`;ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(0,baseY);ctx.lineTo(w,baseY);ctx.stroke();

  /* Recipients: a few fixed marks up and to the right. Somebody's evening. */
  const rec=[[w*0.78,h*0.20],[w*0.88,h*0.30],[w*0.70,h*0.13]];
  rec.forEach((r,i)=>dot(ctx,r[0],r[1],2.0,C.cyan,0.10+0.05*Math.sin(t*0.6+i*2)));

  for(let i=0;i<n;i++){
    const sp=0.045+rr()*0.05, ph=rr(), u=((t*sp+ph)%1);
    const x=u*w, y=baseY+Math.sin(i*1.7)*3;
    /* One in eight is worth telling somebody about, chosen by the seed rather
       than at random so the same events are the notable ones every render. */
    const notable=(i%8)===3;
    if(!notable||u<0.42){
      dot(ctx,x,y,1.3,C.steel,0.10);
      continue;
    }
    /* Lifted out of the log and arced to a recipient. */
    const k=Math.min(1,(u-0.42)/0.46);
    const to=rec[i%rec.length];
    const lift=x+(to[0]-x)*k, ly=y+(to[1]-y)*k-Math.sin(k*Math.PI)*h*0.13;
    ctx.strokeStyle=`rgba(${C.cyan},${0.16*(1-k*0.5)})`;ctx.lineWidth=1;
    ctx.setLineDash([2,5]);
    ctx.beginPath();
    for(let j=0;j<=12;j++){
      const kk=k*j/12, px=x+(to[0]-x)*kk, py=y+(to[1]-y)*kk-Math.sin(kk*Math.PI)*h*0.13;
      j?ctx.lineTo(px,py):ctx.moveTo(px,py);
    }
    ctx.stroke();ctx.setLineDash([]);
    dot(ctx,lift,ly,1.8,C.cyan,0.30);
    /* It landed: one ring at the recipient, then quiet. Never a second. */
    if(k>0.93){
      const a=(k-0.93)/0.07;
      ctx.strokeStyle=`rgba(${C.mint},${0.34*(1-a)})`;ctx.lineWidth=1.2;
      ctx.beginPath();ctx.arc(to[0],to[1],3+a*13,0,TAU);ctx.stroke();
    }
  }
},

/* scopyx - the egress plane: outbound reaches that must pass a decision.
   Requests leave the fleet on the left, converge on a gate, and either pass
   through its aperture and continue to a destination or are turned back at it.
   The gate breathes, so the aperture is sometimes narrow and sometimes wide,
   which is what a policy that actually decides looks like over time.

   Written 2026-08-11 because scopyx and heraldyx both declared `boundary` by
   hand, so two rooms in the corridor drew the same waves in different colours.
   A motif is supposed to say which room you are in. */
egress(ctx,w,h,t){
  const rr=rng(29), gx=w*0.58, n=26;
  /* The gate: a vertical bar with an aperture that opens and closes. */
  const open=0.16+0.13*(0.5+0.5*Math.sin(t*0.55));
  const ay0=h*(0.5-open), ay1=h*(0.5+open);
  ctx.strokeStyle=`rgba(${C.violet},.26)`;ctx.lineWidth=1.6;
  ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,ay0);ctx.moveTo(gx,ay1);ctx.lineTo(gx,h);ctx.stroke();
  /* Aperture lips, brighter, so the opening reads as the decision it is. */
  ctx.strokeStyle=`rgba(${C.violet},.5)`;ctx.lineWidth=2.4;
  ctx.beginPath();ctx.moveTo(gx,ay0-9);ctx.lineTo(gx,ay0);ctx.moveTo(gx,ay1);ctx.lineTo(gx,ay1+9);ctx.stroke();

  for(let i=0;i<n;i++){
    const y0=rr()*h, sp=0.10+rr()*0.16, ph=rr();
    const u=((t*sp+ph)%1);                    /* 0..1 along its journey */
    const x=u*w;
    /* Aimed at a point on the gate line; passes only if that point is open. */
    const aim=h*0.5+(y0-h*0.5)*0.35;
    const passes=aim>ay0&&aim<ay1;
    const yAt=(xx)=>{
      const k=Math.min(1,xx/gx);
      return y0+(aim-y0)*k;
    };
    if(x<gx||passes){
      /* Still approaching, or through and continuing to a destination. */
      const col=x<gx?C.steel:C.mint;
      ctx.strokeStyle=`rgba(${col},${x<gx?0.13:0.22})`;ctx.lineWidth=1;
      ctx.beginPath();
      const tail=Math.max(0,x-w*0.10);
      for(let xx=tail;xx<=x;xx+=6){const yy=xx<=gx?yAt(xx):aim;xx===tail?ctx.moveTo(xx,yy):ctx.lineTo(xx,yy);}
      ctx.stroke();
      dot(ctx,x,x<=gx?yAt(x):aim,1.5,col,x<gx?0.16:0.26);
    }else{
      /* Turned back AT the gate: the reach that did not happen. */
      const back=(u-gx/w)/(1-gx/w);            /* 0..1 after the refusal */
      const bx=gx-back*w*0.22, by=aim+Math.sin(back*3.1)*10;
      ctx.strokeStyle=`rgba(${C.ember},${0.20*(1-back)})`;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(gx,aim);ctx.lineTo(bx,by);ctx.stroke();
      dot(ctx,bx,by,1.5,C.ember,0.24*(1-back));
    }
  }
  /* Destinations beyond the gate, faint and fixed: the web it may reach. */
  for(let i=0;i<5;i++){
    const dy=h*(0.14+0.18*i), dx=w*(0.82+0.06*((i*7)%3)/2);
    dot(ctx,dx,dy,1.8,C.violet,0.10+0.05*Math.sin(t*0.7+i));
  }
},

/* tokenfuse - gradient descent on a cost surface: the burn optimizer.
   A loss valley, an SGD ball stepping down it, step ticks fading behind. */
descent(ctx,w,h,t){
  const y0=h*0.62, depth=h*0.34, cx=w*0.60, wd=w*0.30;
  const yOf=x=>y0-depth*Math.exp(-((x-cx)*(x-cx))/(2*wd*wd));
  for(let k=2;k>=0;k--){
    ctx.strokeStyle=`rgba(${C.amber},${0.05+0.05*(2-k)})`;ctx.lineWidth=1;
    ctx.beginPath();
    for(let x=0;x<=w;x+=10){
      const y=yOf(x)+k*26-((k*13)%17);
      x?ctx.lineTo(x,y):ctx.moveTo(x,y);
    }
    ctx.stroke();
  }
  /* SGD steps: geometric approach to the minimum, restart each 14 s */
  const loop=(t%14)/14, steps=10, r0=w*0.44;
  let px=cx-r0;
  ctx.setLineDash([2,4]);
  for(let i=0;i<steps;i++){
    const reach=(i+1)/steps;
    if(loop<reach*0.86){break;}
    const nx=cx-r0*Math.pow(0.55,i+1);
    ctx.strokeStyle=`rgba(${C.amber},.20)`;
    ctx.beginPath();ctx.moveTo(px,yOf(px));ctx.lineTo(nx,yOf(nx));ctx.stroke();
    px=nx;
  }
  ctx.setLineDash([]);
  dot(ctx,px,yOf(px)-3,2.6,C.amber,.7);
  /* sparse $-ticks drifting like a cost tape */
  const rr=rng(5);
  for(let i=0;i<14;i++){
    const x=((rr()*w)+t*9*(0.4+rr()*0.8))%w;
    const y=h*0.12+rr()*h*0.25, len=4+rr()*10;
    ctx.strokeStyle=`rgba(${C.amber},.10)`;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+len);ctx.stroke();
  }
},

/* wardryx - a decision boundary being learned: two classes of points,
   the separating curve annealing from wobble to confidence. */
boundary(ctx,w,h,t){
  const rr=rng(11), pts=[];
  for(let i=0;i<46;i++){
    const side=i%2, x=rr()*w, y=rr()*h;
    pts.push({x,y,side});
  }
  const anneal=0.5+0.5*Math.cos((t%12)/12*TAU);   /* 1 → 0 → 1 */
  const bY=x=>h*0.52+Math.sin(x*0.012+t*0.25)*h*0.10*anneal+Math.sin(x*0.004)*h*0.06;
  ctx.strokeStyle=`rgba(${C.teal},.30)`;ctx.lineWidth=1.4;
  ctx.beginPath();
  for(let x=0;x<=w;x+=8){const y=bY(x);x?ctx.lineTo(x,y):ctx.moveTo(x,y);}
  ctx.stroke();
  ctx.strokeStyle=`rgba(${C.teal},.08)`;ctx.setLineDash([3,6]);
  [18,-18].forEach(off=>{
    ctx.beginPath();
    for(let x=0;x<=w;x+=8){const y=bY(x)+off;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}
    ctx.stroke();
  });
  ctx.setLineDash([]);
  pts.forEach(p=>{
    const above=p.y<bY(p.x);
    const good=(p.side===0)===above;
    const col=good?(p.side===0?C.mint:C.ember):C.amber;
    const flick=good?0.16:0.10+0.16*Math.abs(Math.sin(t*3+p.x));
    dot(ctx,p.x,p.y,1.6,col,flick);
  });
},

/* engram - a memory graph with decay: nodes drift, edges bind by
   proximity, and a spreading-activation pulse re-lights a chain. */
web(ctx,w,h,t){
  const rr=rng(23), N=26, nodes=[];
  for(let i=0;i<N;i++){
    const bx=rr()*w, by=rr()*h, ax=20+rr()*26, sp=0.14+rr()*0.2, ph=rr()*TAU;
    nodes.push({x:bx+Math.sin(t*sp+ph)*ax, y:by+Math.cos(t*sp*0.8+ph)*ax*0.7});
  }
  const R=Math.min(w,h)*0.26;
  for(let i=0;i<N;i++)for(let j=i+1;j<N;j++){
    const a=nodes[i],b=nodes[j],d=Math.hypot(a.x-b.x,a.y-b.y);
    if(d<R){
      ctx.strokeStyle=`rgba(${C.iris},${0.13*(1-d/R)})`;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
  }
  /* spreading activation: every 6 s a chain of 5 nodes re-fires in order */
  const seq=Math.floor(t/6), rs=rng(seq*7+3), chain=[];
  for(let k=0;k<5;k++) chain.push(Math.floor(rs()*N));
  const ph=(t%6)/6*5;
  chain.forEach((ni,k)=>{
    const glow2=Math.max(0,1-Math.abs(ph-k)*1.4);
    if(glow2>0) dot(ctx,nodes[ni].x,nodes[ni].y,2.4,C.iris,.25+glow2*.5);
    if(k&&glow2>0.15){
      const a=nodes[chain[k-1]],b=nodes[ni];
      ctx.strokeStyle=`rgba(${C.iris},${glow2*.5})`;ctx.lineWidth=1.3;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
  });
  nodes.forEach(n=>dot(ctx,n.x,n.y,1.5,C.iris,.16));
},

/* idryx - one identity graph: humans, keys, agents in three bands,
   ownership edges linking across; an orphaned key blinks until adopted. */
graphid(ctx,w,h,t){
  const rr=rng(41);
  const bands=[{y:h*0.22,n:6,shape:"circle"},{y:h*0.52,n:8,shape:"diamond"},{y:h*0.80,n:6,shape:"tri"}];
  const nodes=[];
  bands.forEach((b,bi)=>{
    for(let i=0;i<b.n;i++){
      const x=w*(0.08+0.84*(i+0.5)/b.n)+Math.sin(t*0.3+bi+i)*8;
      const y=b.y+Math.cos(t*0.24+i*1.7)*7;
      nodes.push({x,y,shape:b.shape,band:bi});
    }
  });
  /* edges: deterministic subset across neighbouring bands, phasing in/out */
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
    const a=nodes[i],b=nodes[j];
    if(Math.abs(a.band-b.band)!==1) continue;
    const gate=Math.sin(t*0.35+i*2.1+j*1.3);
    if(rr()>0.24||gate<0.1) continue;
    ctx.strokeStyle=`rgba(${C.mint},${0.10*gate})`;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  function shape(n,col,a){
    ctx.strokeStyle=`rgba(${col},${a})`;ctx.lineWidth=1.2;ctx.beginPath();
    if(n.shape==="circle") ctx.arc(n.x,n.y,4,0,TAU);
    else if(n.shape==="diamond"){ctx.moveTo(n.x,n.y-5);ctx.lineTo(n.x+5,n.y);ctx.lineTo(n.x,n.y+5);ctx.lineTo(n.x-5,n.y);ctx.closePath();}
    else{ctx.moveTo(n.x,n.y-5);ctx.lineTo(n.x+5,n.y+4);ctx.lineTo(n.x-5,n.y+4);ctx.closePath();}
    ctx.stroke();
  }
  nodes.forEach((n,i)=>{
    /* one key is periodically an orphan: no owner, blinking ember */
    const orphan=n.shape==="diamond"&&i%8===3&&(t%10)<4.5;
    shape(n,orphan?C.ember:C.mint,orphan?0.3+0.3*Math.abs(Math.sin(t*4)):0.30);
  });
},

/* qryx - a rotating point lattice with basis vectors: the geometry
   post-quantum cryptography lives in. */
lattice(ctx,w,h,t){
  const cx=w*0.68, cy=h*0.5, S=Math.min(w,h)*0.052;
  const ry=t*0.10, rx=0.42;
  const cosY=Math.cos(ry),sinY=Math.sin(ry),cosX=Math.cos(rx),sinX=Math.sin(rx);
  function proj(x,y,z){
    let X=x*cosY+z*sinY, Z=-x*sinY+z*cosY;
    let Y=y*cosX-Z*sinX; Z=y*sinX+Z*cosX;
    const p=3.4/(3.4+Z*0.16);
    return[cx+X*S*p,cy+Y*S*p,p];
  }
  for(let x=-2;x<=2;x++)for(let y=-2;y<=2;y++)for(let z=-2;z<=2;z++){
    const[px,py,p]=proj(x*2,y*2,z*2);
    ctx.fillStyle=`rgba(${C.violet},${0.06+0.10*p*p})`;
    ctx.beginPath();ctx.arc(px,py,1.3*p,0,TAU);ctx.fill();
  }
  /* two basis vectors from the origin */
  const o=proj(0,0,0);
  [[2,0,0],[0,2,0]].forEach((v,i)=>{
    const e=proj(v[0]*2,v[1]*2,v[2]*2);
    ctx.strokeStyle=`rgba(${C.violet},.45)`;ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(o[0],o[1]);ctx.lineTo(e[0],e[1]);ctx.stroke();
    dot(ctx,e[0],e[1],1.8,C.violet,.5);
  });
  /* faint scan sheet passing through the lattice */
  const sx=((t*30)%(w*0.7))+w*0.3;
  const g=ctx.createLinearGradient(sx-40,0,sx,0);
  g.addColorStop(0,`rgba(${C.violet},0)`);g.addColorStop(1,`rgba(${C.violet},.06)`);
  ctx.fillStyle=g;ctx.fillRect(sx-40,0,40,h);
},

/* verdryx - a training run: loss falls, pass-rate climbs, eval samples
   scatter around the curves, checkpoints tick along. */
train(ctx,w,h,t){
  const loop=(t%13)/13, X=w*(0.06+0.88*Math.min(1,loop*1.12));
  const loss=x=>h*0.30+h*0.34*Math.exp(-x/(w*0.30))+Math.sin(x*0.05)*4;
  const acc =x=>h*0.72-h*0.30*(1-Math.exp(-x/(w*0.34)))+Math.sin(x*0.04+2)*3;
  [[loss,C.rose],[acc,C.mint]].forEach(([f,col])=>{
    ctx.strokeStyle=`rgba(${col},.35)`;ctx.lineWidth=1.4;
    ctx.beginPath();
    for(let x=w*0.06;x<=X;x+=7){const y=f(x);x<=w*0.06+1?ctx.moveTo(x,y):ctx.lineTo(x,y);}
    ctx.stroke();
  });
  const rr=rng(17);
  for(let i=0;i<34;i++){
    const x=w*(0.06+0.88*rr()), noisy=rr();
    if(x>X) {rr();continue;}
    const y=(i%2?loss(x):acc(x))+(noisy-0.5)*26;
    dot(ctx,x,y,1.2,i%2?C.rose:C.mint,.12);
  }
  for(let k=1;k<=4;k++){
    const x=w*(0.06+0.88*k/5);
    if(x>X) break;
    ctx.strokeStyle=`rgba(${C.dim},.14)`;ctx.setLineDash([2,5]);
    ctx.beginPath();ctx.moveTo(x,h*0.12);ctx.lineTo(x,h*0.88);ctx.stroke();
    ctx.setLineDash([]);
  }
  dot(ctx,X,loss(X),2.2,C.rose,.55);
  dot(ctx,X,acc(X),2.2,C.mint,.55);
},

/* mockryx - adversarial pressure: noise bursts fly at a guardrail
   boundary and shatter against it; the boundary ripples and holds. */
adversary(ctx,w,h,t){
  const bx=w*0.72;
  const cycle=3.2, k=Math.floor(t/cycle), p=(t%cycle)/cycle;
  const rr=rng(k*13+7), by=h*(0.25+rr()*0.5);
  /* the guardrail: a vertical boundary with a ripple where the burst hits */
  ctx.strokeStyle=`rgba(${C.coral},.30)`;ctx.lineWidth=1.4;
  ctx.beginPath();
  for(let y=0;y<=h;y+=7){
    const ripple=p>0.5?Math.exp(-Math.abs(y-by)/34)*Math.sin((p-0.5)*22)*7*(1-p):0;
    const x=bx+Math.sin(y*0.02+t*0.4)*3+ripple;
    y?ctx.lineTo(x,y):ctx.moveTo(x,y);
  }
  ctx.stroke();
  /* incoming burst: a cluster of perturbation points */
  for(let i=0;i<12;i++){
    const ox=(rr()-0.5)*40, oy=(rr()-0.5)*30;
    if(p<0.5){
      const x=-30+(bx+ox+30)*(p/0.5);
      dot(ctx,x,by+oy,1.3,C.coral,.30);
    }else{
      const q=(p-0.5)/0.5;   /* deflected: scatter back and fade */
      const x=bx+ox-q*(46+rr()*46), y=by+oy+(rr()-0.5)*70*q;
      dot(ctx,x,y,1.1,C.coral,.30*(1-q));
    }
  }
  if(p>0.5&&p<0.72){
    ctx.fillStyle=`rgba(${C.mint},${(0.72-p)*2.4})`;
    ctx.font="9px ui-monospace,Menlo,monospace";ctx.textAlign="left";
    ctx.fillText("held",bx+10,by-8);
  }
},

/* typryx - what one ask does inside the box, left to right: a state arrives
   as five field capsules; a vertical sieve, the egress filter, lets only the
   template's named fields (task, final_answer) through its two lit slots,
   the rest hit the comb, turn ember and fall away, and a faint tally counts
   them; the fields that passed converge and fan into a probability
   distribution, cycling the three template types typryx actually has (noul,
   2 bars; choice, 4 bars, cheap/default/hard/reasoning; score, 4 ordered
   bars); the bars settle and the argmax locks with an outline, never a
   backend's own claim; a small mark then drops into an append-only ledger
   chain scrolling along the bottom. Now and then a later truth flies in from
   the right and colours an earlier tick mint or ember: the calibration loop.
   Very faint in a back corner: the eight measured calibration groups
   (stated confidence, accuracy) under the "stated = actual" diagonal, the
   same points the calibration section plots, here only as texture.

   Pointer: capsules near the cursor lean toward it, as if it were the agent
   asking; an unnamed field still cannot pass the sieve and bounces off
   regardless. `ptr` is `{x,y}` in hero-local pixels, or null off-hero;
   everything else here is a pure function of t.

   Drawn inside one region of the hero rather than across it: the first
   version sat behind the headline and the fact rail and could not be seen.

   Written 2026-09-25. */
typed(ctx,w,h,t,ptr){
  /* Everything is drawn inside one region, so the motif lives where the hero
     has room: on a wide hero the empty upper right, above the fact rail and
     beside the headline; on a narrow one a band across the top, behind the
     kicker and the first lines, where it stays faint. */
  const wide=w>=900;
  const R=wide?{x0:w*0.55,x1:w*0.97,y0:h*0.07,y1:h*0.50}
              :{x0:w*0.04,x1:w*0.96,y0:h*0.03,y1:h*0.34};
  const RW=R.x1-R.x0, RH=R.y1-R.y0;
  const X=u=>R.x0+RW*u, Y=v=>R.y0+RH*v;
  const sieveX=X(0.40), fanU=0.78, ledgerY=Y(1.0);
  const FIELDS=[
    {name:"task",named:true},{name:"final_answer",named:true},
    {name:"user_email",named:false},{name:"customer_iban",named:false},{name:"api_token",named:false}
  ];
  const PERIOD=2.6, TRAVEL=2.2;
  const slotY=[Y(0.34),Y(0.48)];
  const font=(px)=>ctx.font=px+"px ui-monospace,Menlo,monospace";

  /* a running tally: every unnamed capsule that has reached the comb so far */
  let heldBack=0;
  FIELDS.forEach((f,fi)=>{
    if(!f.named) heldBack+=Math.max(0,Math.floor((t-TRAVEL)/PERIOD-fi*0.63)+1);
  });

  /* ---- the state: five named capsules drifting toward the sieve ---- */
  FIELDS.forEach((f,fi)=>{
    const ph=fi*0.63, cyc=Math.floor(t/PERIOD-ph);
    for(let c=cyc-1;c<=cyc;c++){
      const spawn=(c+ph)*PERIOD, age=t-spawn;
      if(age<0||age>TRAVEL+1.0) continue;
      const u=U_clamp(age/TRAVEL,0,1);
      const x0=X(0.16), y0=Y(0.14+0.17*fi)+Math.sin(t*0.4+fi)*3;
      let x=x0+(sieveX-x0)*u, y=y0;
      /* the pointer is the agent asking: it pulls the state its way */
      if(ptr){
        const d=Math.hypot(x-ptr.x,y-ptr.y);
        if(d<180&&u<0.92){ const k=(1-d/180)*0.35; x+=(ptr.x-x)*k*0.4; y+=(ptr.y-y)*k*0.4; }
      }
      /* however hard it pulls, a field the template does not name stops at
         the comb: the one thing this service is for */
      if(!f.named&&x>sieveX-8){
        x=sieveX-8;
        ctx.fillStyle=`rgba(${C.ember},.35)`;ctx.beginPath();ctx.arc(sieveX-2,y,2.2,0,7);ctx.fill();
      }
      if(age<=TRAVEL){
        font(10);ctx.textAlign="right";
        ctx.fillStyle=`rgba(${f.named?C.mint:C.dim},${0.30+0.08*Math.sin(t*2+fi)})`;
        ctx.fillText(f.name,x,y+3);
        continue;
      }
      const post=U_clamp(age-TRAVEL,0,1);
      if(f.named){
        /* through its lit slot and on to the question */
        const sy=slotY[fi], x2=sieveX+(X(fanU-0.14)-sieveX)*post;
        font(10);ctx.textAlign="left";
        ctx.fillStyle=`rgba(${C.mint},${0.36*(1-post*0.7)})`;
        ctx.fillText(f.name,x2+4,sy+3);
      }else{
        /* held back: turns ember and falls away from the comb */
        const fx=sieveX-6-post*10, fy=y0+post*post*RH*0.3;
        ctx.fillStyle=`rgba(${C.ember},${0.34*(1-post)})`;
        ctx.beginPath();ctx.arc(fx,fy,2,0,7);ctx.fill();
      }
    }
  });

  /* the sieve: a comb with two lit slots, and its tally */
  ctx.strokeStyle=`rgba(${C.dim},.24)`;ctx.lineWidth=1.3;
  ctx.beginPath();ctx.moveTo(sieveX,Y(0.06));ctx.lineTo(sieveX,Y(0.90));ctx.stroke();
  for(let k=0;k<9;k++){ /* comb teeth */
    const ty=Y(0.08+k*0.1);
    if(slotY.some(sy=>Math.abs(ty-sy)<10)) continue;
    ctx.beginPath();ctx.moveTo(sieveX-4,ty);ctx.lineTo(sieveX,ty);ctx.stroke();
  }
  slotY.forEach(sy=>{
    ctx.strokeStyle=`rgba(${C.mint},.50)`;ctx.lineWidth=2.6;
    ctx.beginPath();ctx.moveTo(sieveX,sy-9);ctx.lineTo(sieveX,sy+9);ctx.stroke();
  });
  font(10);ctx.textAlign="center";ctx.fillStyle=`rgba(${C.dim},.34)`;
  ctx.fillText("egress filter",sieveX,Y(0.0));
  ctx.fillStyle=`rgba(${C.ember},.34)`;
  ctx.fillText("held back "+heldBack,sieveX,Y(0.97)-6);

  /* ---- the question resolving: one template type at a time ---- */
  const TYPES=[
    {kind:"noul",labels:["true","false"]},
    {kind:"choice",labels:["cheap","default","hard","reasoning"]},
    {kind:"score",labels:["1","2","3","4"]}
  ];
  const cycle=6.0, cy=Math.floor(t/cycle), cp=(t%cycle)/cycle;
  const type=TYPES[cy%TYPES.length], n=type.labels.length;
  const rr=rng(cy*97+11);
  const raw=[]; let sum=0;
  for(let i=0;i<n;i++){ const v=0.4+rr()*1.6; raw.push(v); sum+=Math.exp(v); }
  const probs=raw.map(v=>Math.exp(v)/sum);
  const winner=probs.indexOf(Math.max(...probs));
  const settle=U_clamp(cp/0.5,0,1);
  const baseY=Y(0.80), maxH=RH*0.58;
  const bw=Math.min(28,RW*0.07), gap=Math.max(6,RW*0.03), cx=X(fanU);
  for(let i=0;i<n;i++){
    const x=cx-((n-1)/2-i)*(bw+gap);
    const wob=Math.sin(t*1.7+i*1.3)*0.05*(1-settle);
    const shown=probs[i]*(0.55+0.45*settle)+wob*(1-settle);
    const bh=Math.max(2,shown*maxH);
    const win=i===winner&&settle>0.7;
    ctx.fillStyle=`rgba(${win?C.amber:C.dim},${win?0.42:0.16+0.06*(1-settle)})`;
    if(ctx.roundRect){ctx.beginPath();ctx.roundRect(x-bw/2,baseY-bh,bw,bh,3);ctx.fill();}
    else ctx.fillRect(x-bw/2,baseY-bh,bw,bh);
    if(i===winner&&settle>0.85){
      ctx.strokeStyle=`rgba(${C.amber},${0.6*(settle-0.85)/0.15})`;ctx.lineWidth=1.3;
      ctx.strokeRect(x-bw/2-2,baseY-bh-2,bw+4,bh+2);
    }
    font(9);
    if(settle>0.5&&ctx.measureText(type.labels[i]).width+4<bw+gap){
      ctx.textAlign="center";ctx.fillStyle=`rgba(${C.dim},${0.30*settle})`;
      ctx.fillText(type.labels[i],x,baseY+12);
    }
  }
  font(10);ctx.textAlign="center";ctx.fillStyle=`rgba(${C.dim},.34)`;
  ctx.fillText(type.kind+(settle>0.85?" · argmax locked":" · resolving"),cx,baseY+26);

  /* ---- the ledger: an append-only chain along the bottom of the region ---- */
  const lx0=X(0.0), lspan=RW, tickGap=Math.max(7,lspan/42);
  const nTicks=Math.floor(t/cycle)+1;
  if(settle>0.9){ /* the answer's mark drops into it */
    const fall=U_clamp((cp-0.9)/0.1,0,1), top=baseY-maxH*0.6;
    ctx.fillStyle=`rgba(${C.amber},${0.55*(1-fall)})`;
    ctx.beginPath();ctx.arc(cx,top+fall*(ledgerY-top),2,0,7);ctx.fill();
  }
  ctx.strokeStyle=`rgba(${C.dim},.16)`;ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(lx0,ledgerY);ctx.lineTo(lx0+lspan,ledgerY);ctx.stroke();
  const scroll=(t*3)%tickGap;
  for(let i=0;i<60;i++){
    const x=lx0+lspan-scroll-i*tickGap;
    if(x<lx0) break;
    const idx=nTicks-1-i; if(idx<0) break;
    /* a later truth lands on some ticks and colours them */
    const judged=(idx%3===0)&&(t-((idx+2)*cycle))>1.4;
    const good=idx%2===0;
    ctx.strokeStyle=`rgba(${!judged?C.dim:good?C.mint:C.ember},${judged?0.5:0.22})`;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(x,ledgerY-5);ctx.lineTo(x,ledgerY+5);ctx.stroke();
  }
  /* the truth itself, flying in from the right toward an earlier tick */
  const fl=t%cycle;
  if(fl>1.0&&fl<1.7){
    const fp=(fl-1.0)/0.7, targetIdx=nTicks-1-6;
    const tx=lx0+lspan-scroll-6*tickGap, sx=R.x1+18, sy=ledgerY-34;
    const x=sx+(tx-sx)*fp, y=sy+(ledgerY-sy)*fp, good=targetIdx%2===0;
    ctx.strokeStyle=`rgba(${good?C.mint:C.ember},${0.7*(1-Math.abs(fp-0.5)*0.6)})`;ctx.lineWidth=1.6;
    ctx.beginPath();
    if(good){ctx.moveTo(x-4,y);ctx.lineTo(x-1,y+3);ctx.lineTo(x+5,y-5);}
    else{ctx.moveTo(x-3,y-3);ctx.lineTo(x+3,y+3);ctx.moveTo(x+3,y-3);ctx.lineTo(x-3,y+3);}
    ctx.stroke();
  }
  font(9);ctx.textAlign="left";ctx.fillStyle=`rgba(${C.dim},.28)`;
  ctx.fillText("ledger · a later truth scores each answer",lx0,ledgerY+16);

  /* ---- the eight measured calibration groups (stated, accuracy), from the
     calibration section's own table, under the "stated = actual" line.
     Texture, bottom left of the whole hero, not a chart. ---- */
  const ox=w*0.03,oy=h*0.97,S=Math.min(w,h)*0.14;
  ctx.strokeStyle=`rgba(${C.dim},.12)`;ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(ox+S,oy-S);ctx.stroke();
  [[0.990,0.733],[0.958,0.733],[0.987,0.583],[0.983,0.633],
   [0.99999,0.500],[0.9995,0.500],[0.998,0.500],[0.965,0.667]].forEach(([cf,ac])=>{
    dot(ctx,ox+S*cf,oy-S*ac,1.4,C.rose,0.14);
  });
},

/* platform - tiled matrix multiply: activation waves sweep a grid of
   cells diagonally, the tensor language every event speaks. */
tensor(ctx,w,h,t){
  const s=26, cols=Math.ceil(w/s), rows=Math.ceil(h/s);
  for(let c=0;c<cols;c++)for(let r=0;r<rows;r++){
    const ph1=Math.sin((c+r)*0.55-t*1.6);
    const ph2=Math.sin((c-r)*0.38+t*1.1);
    const a=Math.max(0,ph1)*0.10+Math.max(0,ph2)*0.06;
    if(a<0.02) continue;
    ctx.fillStyle=`rgba(${C.steel},${a})`;
    ctx.fillRect(c*s+3,r*s+3,s-6,s-6);
  }
  const rr=rng(3);
  ctx.font="10px ui-monospace,Menlo,monospace";ctx.textAlign="left";
  for(let i=0;i<10;i++){
    const y=rr()*h, sp=12+rr()*20, x=w-((t*sp+rr()*w)%(w+60))+30;
    ctx.fillStyle=`rgba(${C.steel},.14)`;
    ctx.fillText(["{","}",'":"',"[","]","0.92","v0.2","::"][i%8],x,y);
  }
}
};

/* motif per service */
const MAP={tokenfuse:"descent",wardryx:"boundary",engram:"web",idryx:"graphid",
  scopyx:"egress",heraldyx:"dispatch",trailryx:"contiguity",
  qryx:"lattice",verdryx:"train",mockryx:"adversary",platform:"tensor",
  vouchryx:"delegate",costcrew:"ledger",typryx:"typed"};

/* ---- the deep field: a page-length backdrop that keeps the dark canvas
   alive below the hero. One fixed layer behind all content, evolving with
   scroll depth: a drifting node graph near the top, math glyphs (gradients,
   parameters) joining mid-page, slow scan sweeps near the bottom. Tinted
   with the page accent, faint enough to never fight the content. ---- */
function deepField(){
  const cv=document.createElement("canvas");
  cv.className="ambient-deep";cv.setAttribute("aria-hidden","true");
  document.body.prepend(cv);
  const ctx=cv.getContext("2d");
  const hex=(getComputedStyle(document.documentElement).getPropertyValue("--accent")||"").trim();
  const m=/^#?([0-9a-f]{6})$/i.exec(hex);
  const col=m?[parseInt(m[1].slice(0,2),16),parseInt(m[1].slice(2,4),16),parseInt(m[1].slice(4,6),16)].join(","):"147,168,196";
  let w=0,h=0;
  function resize(){
    const dpr=Math.min(2,devicePixelRatio||1);
    w=innerWidth;h=innerHeight;
    cv.width=w*dpr;cv.height=h*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if(reduce){ctx.clearRect(0,0,w,h);paint(9,0.5);}
  }
  const R=rng(77);
  const N=innerWidth<700?36:60;
  const pts=Array.from({length:N},()=>({x:R(),y:R(),vx:(R()-.5)*.026,vy:(R()-.5)*.02,r:.9+R()*1.6,ph:R()*TAU}));
  const GL=["\u2207","\u03B8","\u03BB","\u03A3","\u2202","\u03B5","::","[ ]","softmax","argmax"];
  const gl=Array.from({length:12},(_,i)=>({x:R(),y:R(),v:.012+R()*.02,g:GL[i%GL.length],ph:R()*TAU}));
  /* formula tickers: whole expressions drifting across the screen */
  const S=" \u2190 ", SIG="\u03C3", TH="\u03B8", ETA="\u03B7", NAB="\u2207", SUM="\u03A3", YH="\u0177";
  /* each formula is a free body: its own drift direction, a slow
     Lissajous wander on top, and a gentle tilt or a very slow full spin */
  const TR=rng(913);
  const TICKERS=[
    {txt:()=>"y = "+SIG+"(Wx + b)"},
    {txt:t=>TH+S+TH+" - "+ETA+NAB+"L   "+ETA+" = "+(1e-4*(1+.5*Math.sin(t*.7))).toExponential(1)},
    {txt:t=>"L = "+SUM+"(y - "+YH+")\u00B2 = "+(0.42*Math.exp(-((t%36))/12)+0.021+0.004*Math.sin(t*2.2)).toFixed(4)},
    {txt:t=>"acc = "+(97.9-2.1*Math.exp(-((t%36))/12)+0.15*Math.sin(t*1.7)).toFixed(1)+"%"},
    {txt:t=>"epoch "+(Math.floor(t/1.8)%128)+" / 128 \u00B7 batch "+(Math.floor(t*3.3)%512)}
  ].map((k,i)=>{
    const a=TR()*TAU, s=.009+TR()*.008;      /* direction + speed, fractions/s */
    return Object.assign(k,{
      x0:TR(),y0:TR(),vx:Math.cos(a)*s,vy:Math.sin(a)*s*.8,
      wA:.03+TR()*.04,w1:.14+TR()*.12,w2:.11+TR()*.1,ph:TR()*TAU,
      spin:i%3===1,rs:(TR()<.5?1:-1)*(.035+TR()*.03)
    });
  });
  const mouse={x:-1e4,y:-1e4};
  addEventListener("pointermove",e=>{mouse.x=e.clientX;mouse.y=e.clientY;},{passive:true});
  addEventListener("pointerleave",()=>{mouse.x=-1e4;mouse.y=-1e4;},{passive:true});
  function paint(t,depth){
    const par=0.16, syn=scrollY*par;
    const frac=v=>v-Math.floor(v);
    /* node graph, wrapped in a scroll-parallax world */
    const P=pts.map(p=>({
      x:frac(p.x+t*p.vx)*w,
      y:frac(p.y+t*p.vy-syn/(h*3))*h,
      r:p.r,ph:p.ph
    }));
    const baseA=.22+.12*depth;
    const RAD=Math.min(w,h)*.17;
    for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){
      const a=P[i],b=P[j];
      const dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);
      if(d<RAD){
        ctx.strokeStyle=`rgba(${col},${(1-d/RAD)*baseA*.75})`;ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      }
    }
    /* a node fires every couple of seconds: expanding activation ring */
    const fireSeq=Math.floor(t/1.9), fp=(t%1.9)/1.9;
    const fi=Math.floor(rng(fireSeq*13+5)()*P.length);
    const F=P[fi];
    if(F){
      ctx.strokeStyle=`rgba(${col},${(1-fp)*.5})`;ctx.lineWidth=1.4;
      ctx.beginPath();ctx.arc(F.x,F.y,4+fp*34,0,TAU);ctx.stroke();
    }
    P.forEach((p,i)=>{
      const tw=.6+.4*Math.sin(t*1.3+p.ph);
      const hot=i===fi?1.6:1;
      ctx.fillStyle=`rgba(${col},${Math.min(1,baseA*tw*hot)})`;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r*hot,0,TAU);ctx.fill();
    });
    /* the pointer joins the graph: nearby nodes link to the cursor */
    if(mouse.x>-1e3){
      let linked=0;
      for(const p of P){
        const d=Math.hypot(p.x-mouse.x,p.y-mouse.y);
        if(d<150&&linked<7){
          linked++;
          ctx.strokeStyle=`rgba(${col},${(1-d/150)*.55})`;ctx.lineWidth=1;
          ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(mouse.x,mouse.y);ctx.stroke();
        }
      }
      if(linked){
        ctx.strokeStyle=`rgba(${col},.45)`;ctx.lineWidth=1;
        ctx.beginPath();ctx.arc(mouse.x,mouse.y,4+Math.sin(t*3)*1.5,0,TAU);ctx.stroke();
      }
    }
    /* live formula tickers: free-floating expressions with training values.
       Each drifts along its own random bearing with a slow Lissajous wander;
       most sway a few degrees, every third one slowly spins full circle. */
    const ta=.16+.30*Math.min(1,depth*1.6+.25);
    ctx.font="12px ui-monospace,Menlo,monospace";ctx.textAlign="center";
    TICKERS.forEach((k,i)=>{
      const txt=k.txt(t);
      /* wrap with a margin so entry and exit stay smooth */
      const mx=.12,my=.10;
      const x=(frac(k.x0+t*k.vx)*(1+2*mx)-mx)*w + Math.sin(t*k.w1+k.ph)*k.wA*w;
      const y=(frac(k.y0+t*k.vy-syn/(h*4))*(1+2*my)-my)*h + Math.cos(t*k.w2+k.ph)*k.wA*h*.7;
      const rot=k.spin ? t*k.rs : Math.sin(t*k.w1*.9+k.ph)*.21;
      ctx.save();
      ctx.translate(x,y);ctx.rotate(rot);
      ctx.fillStyle=`rgba(${col},${ta*(.55+.45*Math.sin(t*.9+i*2.1))})`;
      ctx.fillText(txt,0,0);
      ctx.restore();
    });
    ctx.textAlign="left";
    /* loose math glyphs drift throughout */
    const ga=.14+Math.max(0,Math.min(1,depth*2.2-.18))*.4;
    ctx.font="11px ui-monospace,Menlo,monospace";
    gl.forEach(g=>{
      const x=frac(g.x+Math.sin(t*.14+g.ph)*.015)*w;
      const y=frac(g.y-t*g.v*.12-syn/(h*3))*h;
      ctx.fillStyle=`rgba(${col},${ga*(.4+.6*Math.abs(Math.sin(t*.6+g.ph)))})`;
      ctx.fillText(g.g,x,y);
    });
    /* slow scan sweeps join near the bottom of the page */
    if(depth>.4){
      const sa=(depth-.4)*.5;
      const yline=frac(t*.06)*h;
      const grad=ctx.createLinearGradient(0,yline-40,0,yline);
      grad.addColorStop(0,`rgba(${col},0)`);grad.addColorStop(1,`rgba(${col},${sa*.5})`);
      ctx.fillStyle=grad;ctx.fillRect(0,yline-40,w,40);
      ctx.strokeStyle=`rgba(${col},${sa})`;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(0,yline);ctx.lineTo(w,yline);ctx.stroke();
    }
  }
  resize();addEventListener("resize",resize);
  if(reduce) return;
  const t0=performance.now();
  (function frame(now){
    const t=(now-t0)/1000;
    const doc=document.documentElement;
    const depth=Math.min(1,scrollY/Math.max(1,doc.scrollHeight-innerHeight));
    ctx.clearRect(0,0,w,h);
    paint(t,depth);
    requestAnimationFrame(frame);
  })(t0);
}

function mount(){
  deepField();
  const hero=document.querySelector(".svc-hero");
  const svc=(document.body.dataset.service||"").trim();
  const motif=MOTIFS[(hero&&hero.dataset.motif)||MAP[svc]];
  if(!hero||!motif) return;
  const cv=document.createElement("canvas");
  cv.className="ambient";cv.setAttribute("aria-hidden","true");
  hero.prepend(cv);
  const ctx=cv.getContext("2d");
  let w=0,h=0,seen=!1,raf=null;
  /* the pointer, in hero-local pixels; null off-hero or untouched. Passed as
     a 5th argument to every motif so one of them (typryx's "typed") can lean
     its state capsules toward it; every other motif's signature is
     (ctx,w,h,t) and simply ignores the extra argument. */
  const heroPtr={x:null,y:null};
  function trackPtr(e){
    const r=hero.getBoundingClientRect();
    if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom){
      heroPtr.x=e.clientX-r.left; heroPtr.y=e.clientY-r.top;
    }else{ heroPtr.x=null; heroPtr.y=null; }
  }
  if(!reduce){
    addEventListener("pointermove",trackPtr,{passive:true});
    addEventListener("pointerleave",()=>{heroPtr.x=null;heroPtr.y=null;},{passive:true});
  }
  function resize(){
    const dpr=Math.min(2,devicePixelRatio||1);
    w=hero.clientWidth;h=hero.clientHeight;
    cv.width=w*dpr;cv.height=h*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if(reduce){ctx.clearRect(0,0,w,h);motif(ctx,w,h,8,null);}
  }
  resize();addEventListener("resize",resize);
  if(reduce) return;
  const t0=performance.now();
  function frame(now){
    raf=null;
    if(!seen) return;
    ctx.clearRect(0,0,w,h);
    const ptr=heroPtr.x==null?null:{x:heroPtr.x,y:heroPtr.y};
    motif(ctx,w,h,(now-t0)/1000,ptr);
    raf=requestAnimationFrame(frame);
  }
  /* only animate while the hero is on screen */
  new IntersectionObserver(es=>{
    es.forEach(en=>{
      seen=en.isIntersecting;
      if(seen&&!raf) raf=requestAnimationFrame(frame);
    });
  },{threshold:.05}).observe(hero);
}
document.readyState==="loading"?addEventListener("DOMContentLoaded",mount):mount();
window.Ambient={motifs:MOTIFS};
})();
