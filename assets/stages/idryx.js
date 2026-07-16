/* Stage "graph" - Idryx. One identity graph for humans, service accounts,
   keys and AI agents, grown from ingested events. Nodes pop in and mint
   edges draw progressively during ingest, then three deterministic
   detectors fire in place: runaway_agent (ember, expanding rings),
   attestation_missing (amber), orphaned_nhi (a key with no edges at all,
   dashed ember ring). A steel CycloneDX seal caps the run.
   Deterministic in t (scrub-safe both ways).
   opts: {ingest:[t0,t1], detections:[{t,kind:"runaway"|"attest"|"orphan"}], bomT} */
(function(){
"use strict";
const U=Sim.util, P=U.PAL;

Sim.registerStage("graph",function(o){
  const [ING0,ING1]=o.ingest||[3,10];
  const ingestSpan=Math.max(1e-6,ING1-ING0);
  const detections=o.detections||[
    {t:30,kind:"runaway"},{t:38,kind:"attest"},{t:46,kind:"orphan"}
  ];
  const BOM=o.bomT!=null?o.bomT:54;
  const detOf=k=>{const d=detections.find(x=>x.kind===k);return d?d.t:null;};
  const runawayT=detOf("runaway"), attestT=detOf("attest"), orphanT=detOf("orphan");

  /* ---------------- graph topology (fixed, no Math.random) ---------------- */
  const rnd=U.rng(4177);
  const N=[]; /* {kind, ang, rad, phx, phy, label?} */
  N.push({kind:"org",ang:0,rad:0});                              /* 0: org */
  const HUMANS=5, SERVICE=5, KEYS=6, AGENTS=5;
  const SECT={
    human:  {c:Math.PI*1.25, sp:Math.PI*0.26},
    service:{c:Math.PI*1.75, sp:Math.PI*0.26},
    key:    {c:Math.PI*0.25, sp:Math.PI*0.26},
    agent:  {c:Math.PI*0.75, sp:Math.PI*0.26}
  };
  function place(kind,n){
    const start=N.length, s=SECT[kind];
    for(let j=0;j<n;j++){
      const spread=n>1?(j/(n-1)-0.5)*2:0;
      const ang=s.c+spread*s.sp+(rnd()-0.5)*0.16;
      const rad=0.56+rnd()*0.24;
      N.push({kind,ang,rad,phx:rnd()*6.28,phy:rnd()*6.28});
    }
    return Array.from({length:n},(_,j)=>start+j);
  }
  const humans=place("human",HUMANS);
  const service=place("service",SERVICE);
  const keys=place("key",KEYS);
  const agents=place("agent",AGENTS);

  const runawayIdx=agents[2];
  const attestIdx=agents[4];
  const orphanKeyIdx=keys[KEYS-1];
  N[attestIdx].tag="scraper-7";
  /* push the orphan key out toward the rim so it visibly sits apart */
  N[orphanKeyIdx].rad=0.94;

  /* edges: org -> humans; org/humans -> service; humans/service -> agents;
     service/agents -> keys (orphan key excluded on purpose). */
  const edges=[];
  humans.forEach(h=>edges.push({from:0,to:h}));
  service.forEach((s,i)=>edges.push({from:i<2?0:humans[i%humans.length],to:s}));
  agents.forEach((a,i)=>{
    let from;
    if(a===runawayIdx) from=service[0];
    else if(a===attestIdx) from=service[1];
    else from=(i%2===0)?humans[i%humans.length]:service[i%service.length];
    edges.push({from,to:a});
  });
  const keyPool=service.concat(agents);
  keys.forEach((k,i)=>{ if(k===orphanKeyIdx) return; edges.push({from:keyPool[i%keyPool.length],to:k}); });

  const NN=N.length, NE=edges.length;
  const nodeT=i=>ING0+(i/Math.max(1,NN-1))*ingestSpan*0.58;
  const nodeDur=0.5;
  const edgeT=i=>ING0+ingestSpan*0.26+(i/Math.max(1,NE-1))*ingestSpan*0.66;
  const edgeDur=0.55;

  const KIND_SHAPE={human:"circle",service:"square",key:"diamond",agent:"triangle",org:"circle"};

  let W2=0,H2=0,cxo=0,cyo=0,maxR=0;

  function pos(i,t){
    const n=N[i];
    if(n.kind==="org") return {x:cxo,y:cyo};
    const r=n.rad*maxR;
    let x=cxo+Math.cos(n.ang)*r, y=cyo+Math.sin(n.ang)*r*0.86;
    const drift=2.2;
    x+=Math.sin(t*0.35+n.phx)*drift;
    y+=Math.cos(t*0.31+n.phy)*drift;
    return {x,y};
  }

  function shape(ctx,kind,x,y,r,fillA,strokeA,fillCol,strokeCol){
    ctx.beginPath();
    if(kind==="circle"){ ctx.arc(x,y,r,0,6.283); }
    else if(kind==="square"){ ctx.rect(x-r*0.86,y-r*0.86,r*1.72,r*1.72); }
    else if(kind==="diamond"){ ctx.moveTo(x,y-r*1.15);ctx.lineTo(x+r*1.05,y);ctx.lineTo(x,y+r*1.15);ctx.lineTo(x-r*1.05,y);ctx.closePath(); }
    else if(kind==="triangle"){ ctx.moveTo(x,y-r*1.15);ctx.lineTo(x+r*1.05,y+r*0.78);ctx.lineTo(x-r*1.05,y+r*0.78);ctx.closePath(); }
    if(fillA>0){ ctx.fillStyle="rgba("+fillCol+","+fillA+")"; ctx.fill(); }
    if(strokeA>0){ ctx.strokeStyle="rgba("+strokeCol+","+strokeA+")"; ctx.lineWidth=1.3; ctx.stroke(); }
  }

  function ring(ctx,x,y,r,col,a,dashed){
    ctx.save();
    if(dashed) ctx.setLineDash([3,3]);
    ctx.strokeStyle="rgba("+col+","+a+")"; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.arc(x,y,r,0,6.283); ctx.stroke();
    ctx.restore();
  }

  return{
    minHeight:300,
    init(w,h){ W2=w;H2=h; cxo=w*0.5; cyo=h*0.52; maxR=Math.min(w,h)*0.42; },
    draw(ctx,w,h,t){
      if(w!==W2||h!==H2){ W2=w;H2=h; cxo=w*0.5; cyo=h*0.52; maxR=Math.min(w,h)*0.42; }

      /* ---- edges ---- */
      edges.forEach((e,i)=>{
        const t0=edgeT(i);
        if(t<t0) return;
        const p=U.ease.outCubic(U.between(t,t0,t0+edgeDur));
        const a=pos(e.from,t), b=pos(e.to,t);
        const ex=a.x+(b.x-a.x)*p, ey=a.y+(b.y-a.y)*p;
        const alpha=p>=1?0.30:0.5*p;
        ctx.strokeStyle="rgba("+P.mint+","+alpha+")"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(ex,ey); ctx.stroke();
      });

      /* ---- nodes ---- */
      N.forEach((n,i)=>{
        const t0=nodeT(i);
        if(t<t0) return;
        const p=U.ease.outBack(U.between(t,t0,t0+nodeDur));
        if(p<=0) return;
        const {x,y}=pos(i,t);
        const isOrg=n.kind==="org";
        const r=(isOrg?9.5:5.2)*Math.min(1,Math.max(0,p));
        const kindCol = (n.kind==="service"||n.kind==="agent"||isOrg) ? P.steel : P.mint;
        const fillA = (n.kind==="key") ? 0 : (isOrg?0.32:0.22);
        const strokeA = 0.9;
        shape(ctx,KIND_SHAPE[n.kind],x,y,r,fillA,strokeA,kindCol,kindCol);
        if(isOrg){
          ring(ctx,x,y,r+4,P.steel,0.35,false);
          ctx.fillStyle="rgba("+P.steel+",.85)";
          ctx.font="9px ui-monospace,Menlo,monospace"; ctx.textAlign="center";
          ctx.fillText("org",x,y+r+13);
        }
        if(n.tag && t>=t0+nodeDur){
          ctx.fillStyle="rgba("+P.dim+",.85)";
          ctx.font="8px ui-monospace,Menlo,monospace"; ctx.textAlign=x>cxo?"left":"right";
          ctx.fillText(n.tag,x+(x>cxo?8:-8),y+2.6);
        }
      });

      /* ---- detections ---- */
      function labelSide(x){ return x>cxo?{a:"left",dx:9}:{a:"right",dx:-9}; }

      if(runawayT!=null && t>=runawayT){
        const {x,y}=pos(runawayIdx,t);
        ring(ctx,x,y,9,P.ember,0.6,false);
        const loop=(t-runawayT)%2.2, lp=loop/2.2;
        ring(ctx,x,y,8+24*lp,P.ember,(1-lp)*0.7,false);
        const ls=labelSide(x);
        ctx.textAlign=ls.a; ctx.fillStyle="rgba("+P.ember+",.95)";
        ctx.font="9.5px ui-monospace,Menlo,monospace";
        ctx.fillText("runaway_agent · HIGH",x+ls.dx,y-12);
      }
      if(attestT!=null && t>=attestT){
        const {x,y}=pos(attestIdx,t);
        ring(ctx,x,y,9,P.amber,0.6,false);
        const loop=(t-attestT)%2.6, lp=loop/2.6;
        ring(ctx,x,y,8+22*lp,P.amber,(1-lp)*0.65,false);
        const ls=labelSide(x);
        ctx.textAlign=ls.a; ctx.fillStyle="rgba("+P.amber+",.95)";
        ctx.font="9.5px ui-monospace,Menlo,monospace";
        ctx.fillText("attestation_missing",x+ls.dx,y-12);
      }
      if(orphanT!=null && t>=orphanT){
        const {x,y}=pos(orphanKeyIdx,t);
        const loop=(t-orphanT)%3, lp=loop/3;
        ring(ctx,x,y,10+3*Math.sin(lp*6.283),P.ember,0.7,true);
        const ls=labelSide(x);
        ctx.textAlign=ls.a; ctx.fillStyle="rgba("+P.ember+",.9)";
        ctx.font="9.5px ui-monospace,Menlo,monospace";
        ctx.fillText("orphaned key",x+ls.dx,y+16);
      }

      /* ---- legend ---- */
      ctx.textAlign="left"; ctx.font="9px ui-monospace,Menlo,monospace";
      const legend=[["human",P.mint,"circle"],["service account",P.steel,"square"],
                    ["key",P.mint,"diamond"],["agent",P.steel,"triangle"]];
      let lx=10, ly=h-10;
      legend.forEach(([label,col,kd])=>{
        shape(ctx,kd,lx+5,ly-3,4.2,kd==="key"?0:0.22,0.9,col,col);
        ctx.fillStyle="rgba("+P.faint+",.9)";
        ctx.fillText(label,lx+14,ly);
        lx+=14+ctx.measureText(label).width+16;
      });

      /* ---- CycloneDX Agent-BOM seal ---- */
      if(BOM!=null && t>=BOM){
        const p=U.ease.outBack(U.between(t,BOM,BOM+0.8));
        const sx=w-70, sy=h-38, R=13*p;
        ctx.strokeStyle="rgba("+P.steel+",.9)"; ctx.lineWidth=1.5;
        ctx.beginPath();
        for(let k=0;k<=6;k++){
          const a=k/6*6.283-1.57;
          const px=sx+Math.cos(a)*R, py=sy+Math.sin(a)*R;
          k?ctx.lineTo(px,py):ctx.moveTo(px,py);
        }
        ctx.closePath(); ctx.stroke();
        ctx.fillStyle="rgba("+P.steel+",.35)"; ctx.fill();
        ctx.fillStyle="rgba("+P.steel+",.95)"; ctx.textAlign="left";
        ctx.font="9px ui-monospace,Menlo,monospace";
        ctx.fillText("CycloneDX Agent-BOM",sx+18,sy+3);
      }
    }
  };
});
})();
