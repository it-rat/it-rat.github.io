/* IT-RAT v2 - ambient.js: quiet, AI-flavored canvas backdrops for service
   hero sections. Each service gets a motif drawn from its own domain,
   rendered in the language of machine learning: gradient descent, decision
   boundaries, memory graphs, lattices, training curves, attention heads.
   Auto-mounts into .svc-hero based on <body data-service>. No deps. */
(function(){
"use strict";
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU=Math.PI*2;
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
},

/* pocket - the out-of-band path: a pulse rides fleet→gateway→cloud→
   phone→watch over an ECG baseline; the network path stays separate. */
pulsegraph(ctx,w,h,t){
  const N=[[w*0.10,h*0.30],[w*0.34,h*0.44],[w*0.58,h*0.26],[w*0.80,h*0.48],[w*0.90,h*0.34]];
  const names=["fleet","gateway","cloud","phone","watch"];
  ctx.strokeStyle=`rgba(${C.cyan},.16)`;ctx.lineWidth=1;
  for(let i=0;i<N.length-1;i++){
    ctx.beginPath();ctx.moveTo(N[i][0],N[i][1]);
    const mx=(N[i][0]+N[i+1][0])/2, my=Math.min(N[i][1],N[i+1][1])-24;
    ctx.quadraticCurveTo(mx,my,N[i+1][0],N[i+1][1]);ctx.stroke();
  }
  N.forEach((n,i)=>{
    dot(ctx,n[0],n[1],2,C.cyan,.30);
    ctx.fillStyle=`rgba(${C.cyan},.30)`;ctx.font="8.5px ui-monospace,Menlo,monospace";
    ctx.textAlign="center";ctx.fillText(names[i],n[0],n[1]+16);
  });
  /* the traveling pulse */
  const seg=(t*0.5)%(N.length-1), i=Math.floor(seg), p=seg-i;
  const a=N[i],b=N[i+1],mx=(a[0]+b[0])/2,my=Math.min(a[1],b[1])-24;
  const q=1-p;
  const px=q*q*a[0]+2*q*p*mx+p*p*b[0], py=q*q*a[1]+2*q*p*my+p*p*b[1];
  dot(ctx,px,py,2.4,C.cyan,.7);
  /* ECG baseline along the bottom */
  ctx.strokeStyle=`rgba(${C.cyan},.22)`;ctx.lineWidth=1.2;ctx.beginPath();
  const ey=h*0.82;
  for(let x=0;x<=w;x+=4){
    const ph=((x+t*70)%170)/170;
    let y=ey;
    if(ph>0.42&&ph<0.5) y=ey-(ph-0.42)/0.08*22;
    else if(ph>=0.5&&ph<0.58) y=ey-22+(ph-0.5)/0.08*30;
    else if(ph>=0.58&&ph<0.64) y=ey+8-(ph-0.58)/0.06*8;
    x?ctx.lineTo(x,y):ctx.moveTo(x,y);
  }
  ctx.stroke();
},

/* sphere - an attention head over twelve life agents: chords light up
   pairwise with learned weights, the ring slowly precessing. */
attention(ctx,w,h,t){
  const cx=w*0.68, cy=h*0.52, R=Math.min(w,h)*0.34;
  const rot=t*0.06, N=12, pos=[];
  for(let i=0;i<N;i++){
    const a=i/N*TAU+rot;
    pos.push([cx+Math.cos(a)*R,cy+Math.sin(a)*R]);
  }
  ctx.strokeStyle=`rgba(${C.lime},.12)`;ctx.lineWidth=1;
  ctx.beginPath();ctx.arc(cx,cy,R,0,TAU);ctx.stroke();
  /* the active head rotates every 2.4 s; weights are a fixed learned matrix */
  const head=Math.floor(t/2.4)%N, ph=(t%2.4)/2.4;
  const rr=rng(head*19+5);
  for(let j=0;j<N;j++){
    if(j===head) continue;
    const wgt=rr();
    if(wgt<0.35) continue;
    const a=Math.min(1,ph*3)*(1-Math.max(0,ph-0.7)/0.3);
    ctx.strokeStyle=`rgba(${C.lime},${wgt*0.28*a})`;
    ctx.lineWidth=0.8+wgt*1.6;
    ctx.beginPath();ctx.moveTo(pos[head][0],pos[head][1]);
    ctx.quadraticCurveTo(cx,cy,pos[j][0],pos[j][1]);
    ctx.stroke();
  }
  pos.forEach((p,i)=>dot(ctx,p[0],p[1],i===head?2.6:1.7,C.lime,i===head?.6:.25));
}
};

/* motif per service */
const MAP={tokenfuse:"descent",wardryx:"boundary",engram:"web",idryx:"graphid",
  qryx:"lattice",verdryx:"train",mockryx:"adversary",platform:"tensor",
  pocket:"pulsegraph",sphere:"attention"};

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
  function resize(){
    const dpr=Math.min(2,devicePixelRatio||1);
    w=hero.clientWidth;h=hero.clientHeight;
    cv.width=w*dpr;cv.height=h*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if(reduce){ctx.clearRect(0,0,w,h);motif(ctx,w,h,8);}
  }
  resize();addEventListener("resize",resize);
  if(reduce) return;
  const t0=performance.now();
  function frame(now){
    raf=null;
    if(!seen) return;
    ctx.clearRect(0,0,w,h);
    motif(ctx,w,h,(now-t0)/1000);
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
