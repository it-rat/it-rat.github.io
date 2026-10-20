/* proofrec.js: the record behind each proof figure (home page).
 *
 * Each of the eight figures under the panel is drawn from the run it came
 * from: the measured points, counts and costs as the validation records hold
 * them, and nothing in between. Pointing at a figure opens its record; left
 * alone the panel walks the eight and ends on what happened to the machines.
 * Every number drawn here is in a public VALIDATION.md or evidence file, and
 * the footer links the one each chart was read from.
 *
 * Plain Canvas 2D: hairlines, monospace figures, ease-out and nothing that
 * bounces. Reduced motion draws each record finished and does not walk.
 */
(function(){
"use strict";
const sec=document.getElementById("proof"), box=sec&&sec.querySelector(".proof-rec");
if(!box) return;
const cv=box.querySelector("canvas"), ctx=cv.getContext&&cv.getContext("2d");
if(!ctx) return;
box.classList.add("on");
const tiles=[...sec.querySelectorAll(".stat")];
const head={k:box.querySelector(".pr-k"),t:box.querySelector(".pr-t"),m:box.querySelector(".pr-m")};
const srcEl=box.querySelector(".pr-src"), srEl=box.querySelector(".pr-sr"), stepsEl=box.querySelector(".pr-steps");
const css=getComputedStyle(document.documentElement);
const FM=css.getPropertyValue("--font-m").trim()||"ui-monospace,monospace";
const FT=css.getPropertyValue("--font-t").trim()||"system-ui,sans-serif";
const C={fg:"#E9EFF6",dim:"#8A97A6",faint:"rgba(255,255,255,.07)",line:"rgba(255,255,255,.13)",mint:"#34D399",ember:"#FF574B",steel:"#9FB3C8",ink:"#0A0E13"};
const AC=["#F4B23E","#FF7AA2","#B48CFF","#2DD4BF","#34D399","#A3E635","#6C7BFF","#FF8A5B","#E9EFF6"];
const reduceMQ=matchMedia("(prefers-reduced-motion: reduce)");
const GH="https://github.com/TAIPANBOX/";

/* ---------- drawing helpers, all in CSS pixels ---------- */
const clamp=(x,a,b)=>x<a?a:x>b?b:x;
const k=(t,s,d)=>clamp((t-s)/d,0,1);
const out=x=>1-Math.pow(1-x,3);
const fmt=(v,dp)=>v.toLocaleString("en-US",{minimumFractionDigits:dp||0,maximumFractionDigits:dp||0});
function T(s,x,y,o){o=o||{};ctx.font=`${o.w||500} ${o.s||11}px ${o.f==="t"?FT:FM}`;ctx.fillStyle=o.c||C.dim;
  ctx.globalAlpha=o.a==null?1:o.a;ctx.textAlign=o.al||"left";ctx.textBaseline=o.b||"alphabetic";ctx.fillText(s,x,y);ctx.globalAlpha=1;return ctx.measureText(s).width;}
function TW(s,o){o=o||{};ctx.font=`${o.w||500} ${o.s||11}px ${o.f==="t"?FT:FM}`;return ctx.measureText(s).width;}
const px=v=>Math.round(v)+.5;
function HL(x1,x2,y,c,a,d){ctx.globalAlpha=a==null?1:a;ctx.strokeStyle=c;ctx.lineWidth=1;ctx.setLineDash(d||[]);ctx.beginPath();ctx.moveTo(x1,px(y));ctx.lineTo(x2,px(y));ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;}
function VL(x,y1,y2,c,a,d){ctx.globalAlpha=a==null?1:a;ctx.strokeStyle=c;ctx.lineWidth=1;ctx.setLineDash(d||[]);ctx.beginPath();ctx.moveTo(px(x),y1);ctx.lineTo(px(x),y2);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;}
function LN(x1,y1,x2,y2,c,w,a,d){ctx.globalAlpha=a==null?1:a;ctx.strokeStyle=c;ctx.lineWidth=w||1;ctx.setLineDash(d||[]);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;}
function R(x,y,w,h,c,a){ctx.globalAlpha=a==null?1:a;ctx.fillStyle=c;ctx.fillRect(x,y,w,h);ctx.globalAlpha=1;}
function SR(x,y,w,h,c,a){ctx.globalAlpha=a==null?1:a;ctx.strokeStyle=c;ctx.lineWidth=1;ctx.strokeRect(px(x),px(y),Math.round(w)-1,Math.round(h)-1);ctx.globalAlpha=1;}
function DOT(x,y,r,c,a,ring){ctx.globalAlpha=a==null?1:a;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
  if(ring){ctx.strokeStyle=c;ctx.lineWidth=1;ctx.stroke();}else{ctx.fillStyle=c;ctx.fill();}ctx.globalAlpha=1;}
function PILL(x,y,s,c,a){const w=TW(s,{s:10.5,w:600})+14;ctx.globalAlpha=a;ctx.strokeStyle=c;ctx.lineWidth=1;
  ctx.beginPath();ctx.roundRect?ctx.roundRect(px(x),px(y-9),w,18,9):ctx.rect(px(x),px(y-9),w,18);ctx.stroke();ctx.globalAlpha=1;
  T(s,x+7,y+.5,{s:10.5,w:600,c,a,b:"middle"});return w;}
function rng(seed){let s=seed>>>0||1;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return ((s>>>0)%100000)/100000;};}
function shuffle(n,seed){const r=rng(seed),a=[...Array(n).keys()];for(let i=n-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

/* ---------- the records ---------- */
const ADM100=shuffle(100,7).slice(0,20), ADM500=shuffle(500,11).slice(0,50);
const AWS=[[1,521.2],[8,2389.1],[16,2418.9],[32,2445.2],[64,2449.1],[128,2397.4],[256,2330.6]];
const GCP=[[1,994.2],[8,2348.9],[16,2357.4],[32,2478.6],[64,2416.9],[128,2306.3],[256,2353.0]];
/* the burst, as the records state it: three counted groups and the attestation
   pair (no count given). The shared-cap race is the same campaign, drawn apart,
   because no record says it was part of the 34. */
const BURST=[
  {who:"good agents",ans:"served, 200",cells:"gggggg",res:"6 / 6"},
  {who:"money-oversteppers",ans:"blocked, 402",cells:"bbbbbbbbbb",res:"10 / 10"},
  {who:"permission-oversteppers",ans:"denied, 403",cells:"bbbbbb",res:"6 / 6"},
  {who:"unattested calls, attested calls",short:"unattested, attested",ans:"unattested 403, attested 200",ansShort:"403 and 200",cells:"",res:"held"},
];
const RACE={who:"10 agents, one $0.0010 cap",short:"10 agents, $0.0010 cap",ans:"3 admitted, 7 blocked",cells:"gggbbbbbbb",res:"exactly 3"};
const N_ELF=25586;

const FIGS=[
{kicker:"Money, under load",
 title:"Concurrent agents against one budget: admitted exactly what it allowed",
 meta:"TokenFuse gateway, stub provider, so only the governance path is timed",
 src:[["tokenfuse / VALIDATION.md",GH+"tokenfuse/blob/main/VALIDATION.md"]],
 sr:"100 concurrent reservations against a 20-unit budget admitted exactly 20; 500 against a 50-unit budget admitted exactly 50. Through the full gateway 8,000 of 8,000 requests were served and none dropped: 216 requests a second at 100 concurrent, 397 at 500.",
 draw(W,H,t,cmp,ac){
  const mx=cmp?12:22, top=cmp?30:34, bot=H-(cmp?52:20);
  const grid=(x0,x1,n,cols,adm,t0,label,budget)=>{
    const rows=n/cols, cs=Math.min((x1-x0)/cols,(bot-top-26)/rows), r=Math.max(1,cs*.3);
    T(label,x0,top-12,{s:cmp?10:11,c:C.dim});
    const fired=k(t,t0,.25), fill=k(t,t0+.4,1.3), done=fill>=1;
    const picked=new Set(adm.slice(0,Math.round(out(fill)*adm.length)));
    for(let i=0;i<n;i++){const x=x0+(i%cols+.5)*cs, y=top+(Math.floor(i/cols)+.5)*cs;
      if(picked.has(i)) DOT(x,y,r*1.15,ac,1);
      else DOT(x,y,r,C.fg,fired*(done?.16:.42),cs>5);}
    const gy=top+rows*cs+16, got=picked.size;
    T("admitted",x0,gy,{s:10.5});
    const w1=TW("admitted ",{s:10.5});
    T(`${got} of ${budget}`,x0+w1,gy,{s:10.5,w:700,c:got?ac:C.dim});
    if(done&&!cmp){const w2=TW(`admitted ${got} of ${budget}   `,{s:10.5});T("over budget 0",x0+w2,gy,{s:10.5,c:C.mint,a:k(t,t0+1.75,.3)});}
  };
  if(!cmp){
    grid(mx,W*.24,100,10,ADM100,.15,"100 at once, budget 20",20);
    grid(W*.29,W*.64,500,25,ADM500,.55,"500 at once, budget 50",50);
    const x0=W*.7, x1=W-mx, a=k(t,.35,.3), n=Math.round(out(k(t,.4,2.2))*8000);
    T("the full gateway",x0,top-12,{s:11});
    const w=T(fmt(n),x0,top+40,{s:38,w:600,c:C.fg,a});T(" / 8,000 served",x0+w,top+40,{s:13,a});
    T("dropped",x0,top+66,{s:11,a});T("0",x0+TW("dropped ",{s:11}),top+66,{s:11,w:700,c:C.mint,a:k(t,2.6,.3)});
    const bw=x1-x0-92, ry=top+104;
    [[100,216],[500,397]].forEach(([c,v],i)=>{const y=ry+i*30, f=out(k(t,1+i*.5,1));
      T(`${c} at once`,x0,y+4,{s:10.5});R(x0+92,y-4,bw*v/397*f,8,ac,.85);HL(x0+92,x1,y+6,C.faint);
      T(`${v} req/s`,x0+92+bw*v/397*f+(f<1?0:0),y-8,{s:10.5,w:600,c:C.fg,a:k(t,1.6+i*.5,.3),al:v===397?"right":"left"});});
  } else {
    grid(mx,W*.36,100,10,ADM100,.15,"100, budget 20",20);
    grid(W*.44,W-mx,500,25,ADM500,.55,"500, budget 50",50);
    const n=Math.round(out(k(t,.4,2.2))*8000), y=H-24;
    const w=T(fmt(n)+" / 8,000",mx,y,{s:13,w:700,c:C.fg});T("  served, 0 dropped",mx+w,y,{s:10.5,a:k(t,2.6,.3)});
    T("over budget: 0 at both scales",mx,y+16,{s:10.5,c:C.mint,a:k(t,2.4,.3)});
  }
 }},
{kicker:"Money, per unit of work",
 title:"What a correctly resolved case cost, beside what the abandoned ones spent for nothing",
 meta:"Verdryx over a live support-agent run, its cases tagged with their real outcomes",
 src:[["verdryx / VALIDATION.md",GH+"verdryx/blob/main/VALIDATION.md"]],
 sr:"60% of cases were resolved, at $0.00042 per correctly resolved case; 20% were abandoned, at $0.00025 spent for nothing; 20% were escalated to a person. Quality drift across the run was stable.",
 draw(W,H,t,cmp,ac){
  const mx=cmp?12:22, y=(cmp?40:66), bh=cmp?24:40, x0=mx, x1=W-mx, gap=3, span=x1-x0-2*gap;
  const segs=[{f:.6,c:ac,lab:"resolved",v:"$0.00042",d:"per correctly resolved case"},
    {f:.2,c:"#FF8F86",lab:"abandoned",v:"$0.00025",d:"spent for nothing"},
    {f:.2,c:"#7E8A99",lab:"escalated",v:"to a person",d:"not priced here"}];
  T("share of cases",x0,y-14,{s:10.5});
  let x=x0;
  segs.forEach((s,i)=>{const w=span*s.f, g=out(k(t,.25+i*.45,.6));
    R(x,y,w*g,bh,s.c,i===2?.55:.88);
    if(g>.98&&w>70) T(`${s.lab} ${Math.round(s.f*100)}%`,x+8,y+bh/2+.5,{s:cmp?10:11,w:600,c:C.ink,b:"middle"});
    else if(g>.98) T(`${Math.round(s.f*100)}%`,x+6,y+bh/2+.5,{s:10,w:600,c:C.ink,b:"middle"});
    s.x=x;s.w=w;x+=w+gap;});
  HL(x0,x1,y+bh+8,C.faint);
  if(!cmp){
    segs.forEach((s,i)=>{const a=k(t,.8+i*.45,.4), vy=y+bh+64;
      let v=s.v; if(i===0) v="$"+(0.00042*out(k(t,.8,1.2))).toFixed(5);
      T(v,s.x,vy,{s:i===2?18:26,w:600,c:i===2?C.fg:s.c,a});
      T(i===2?"escalated":s.lab,s.x,vy+22,{s:11,c:C.fg,a});T(s.d,s.x,vy+38,{s:11,a});});
  } else {
    segs.forEach((s,i)=>{const a=k(t,.8+i*.45,.4), ry=y+bh+34+i*34;
      R(mx,ry-9,8,8,s.c,i===2?.55:.88);
      let v=s.v; if(i===0) v="$"+(0.00042*out(k(t,.8,1.2))).toFixed(5);
      T(v,mx+16,ry,{s:15,w:600,c:i===2?C.fg:s.c,a});
      T(`${i===2?"escalated":s.lab}, ${s.d}`,mx+16,ry+14,{s:10,a});});
  }
  const a=k(t,2.3,.4), fy=H-(cmp?10:18);
  DOT(mx+4,fy-4,3.5,C.mint,a);T("quality drift across the run: stable",mx+14,fy,{s:cmp?10:11,c:C.fg,a});
 }},
{kicker:"Policy, throughput",
 title:"Decisions per second from one pod, as concurrent callers rise",
 meta:"Wardryx on five-node k3s clusters, 8 vCPU AMD EPYC Milan on both clouds, both sweeps on 26 July 2026",
 src:[["stack-k8s / aws-run-verified.md",GH+"stack-k8s/blob/main/cloud/aws/evidence/aws-run-verified.md#third-run-2026-07-26-2307-to-2340-the-same-silicon-as-gcp"],["gcp-run-verified.md",GH+"stack-k8s/blob/main/cloud/gcp/evidence/gcp-run-verified.md"]],
 sr:"AWS c6a.2xlarge: 521 decisions a second at 1 caller, 2,389 at 8, 2,419 at 16, 2,445 at 32, 2,449 at 64, 2,397 at 128 and 2,331 at 256. GCP c2d-highcpu-8: 994, 2,349, 2,357, 2,479, 2,417, 2,306 and 2,353. No cliff out to 256 callers. An earlier run on Hetzner's shared cores fell from 2,344 at 64 to 1,059 at 128, a conclusion since withdrawn.",
 draw(W,H,t,cmp,ac){
  const mx=cmp?12:22, x0=mx+(cmp?30:44), x1=W-mx-(cmp?6:170), y0=cmp?24:22, y1=H-(cmp?30:34);
  const xv=c=>x0+Math.log2(c)/8*(x1-x0), yv=v=>y1-v/3000*(y1-y0);
  for(let v=0;v<=3000;v+=500){HL(x0,x1,yv(v),v?C.faint:C.line);if(v<3000) T(cmp?(v?v/1000+"k":"0"):fmt(v),x0-8,yv(v)+3.5,{s:10,al:"right"});}
  T(cmp?"per s":"decisions / s",mx,yv(3000)+3.5,{s:10});
  [1,8,16,32,64,128,256].forEach(c=>{VL(xv(c),y1,y1+4,C.line);T(String(c),xv(c),y1+16,{s:10,al:"center"});});
  T("concurrent callers",x1,y1+(cmp?28:30),{s:10,al:"right"});
  const rev=out(k(t,.3,2.3)), xm=x0+rev*(x1-x0)+.5;
  const series=(pts,col,w)=>{ctx.save();ctx.beginPath();ctx.rect(x0-4,0,xm-x0+4,H);ctx.clip();
    ctx.strokeStyle=col;ctx.lineWidth=w;ctx.lineJoin="round";ctx.beginPath();pts.forEach(([c,v],i)=>i?ctx.lineTo(xv(c),yv(v)):ctx.moveTo(xv(c),yv(v)));ctx.stroke();ctx.restore();
    pts.forEach(([c,v])=>{if(xv(c)<=xm){DOT(xv(c),yv(v),3.6,"#0B1118",1);DOT(xv(c),yv(v),2.4,col,1);}});};
  series(GCP,C.steel,1.4);series(AWS,ac,2);
  if(rev<1){VL(xm,y0,y1,C.fg,.28);}
  /* the peak, and what it is */
  const pa=k(t,.3+.75*2.3*.9,.4);
  if(pa>0){const x=xv(64),y=yv(2449.1);VL(x,y-16,y-5,ac,.6*pa);T("2,449/s",x+(cmp?0:4),y-20,{s:cmp?11:13,w:700,c:ac,a:pa,al:cmp?"right":"left"});
    if(!cmp) T("AWS peak, 64 callers",x+4+TW("2,449/s ",{s:13,w:700}),y-20,{s:10,a:pa});}
  if(!cmp){const ga=k(t,.3+.625*2.3*.9,.4),x=xv(32),y=yv(2478.6);
    if(ga>0){VL(x,y-16,y-5,C.steel,.5*ga);T("2,479/s",x-4,y-20,{s:12,w:600,c:C.steel,a:ga,al:"right"});T("GCP peak, 32 callers",x-8-TW("2,479/s",{s:12,w:600}),y-20,{s:10,a:ga,al:"right"});}
    const pa8=k(t,1.3,.4);T("p50 3.21 ms at 8",xv(8)+8,yv(2389)+20,{s:10,a:pa8});}
  /* the shared-core run, drawn apart: the cliff that was the hypervisor */
  const ha=k(t,2.8,.6);
  if(ha>0){const hx0=xv(64),hy0=yv(2344),hx1=xv(128),hy1=yv(1059), e=out(ha);
    LN(hx0,hy0,hx0+(hx1-hx0)*e,hy0+(hy1-hy0)*e,"#FF8F86",1.2,.9,[4,4]);DOT(hx0,hy0,2.4,"#FF8F86",ha);if(ha>=1) DOT(hx1,hy1,2.4,"#FF8F86",1);
    if(cmp) T("shared vCPU, withdrawn",hx1-4,hy1+16,{s:10,c:"#FF8F86",a:ha,al:"right"});
    else {T("Hetzner CPX42, shared vCPU: 2,344 to 1,059",hx1+10,hy1+4,{s:10,c:"#FF8F86",a:ha});T("a cliff we published, then withdrew",hx1+10,hy1+18,{s:10,a:ha});}}
  if(!cmp){const gx=x1+18, a=k(t,2.5,.4);
    T("at 256 callers",gx,yv(2340)-14,{s:10,a});T("2,331",gx,yv(2340)+4,{s:12,w:700,c:ac,a});T("AWS",gx+46,yv(2340)+4,{s:10,a});
    T("2,353",gx,yv(2340)+20,{s:12,w:600,c:C.steel,a});T("GCP",gx+46,yv(2340)+20,{s:10,a});
    T("no cliff",gx,yv(2340)+40,{s:11,w:600,c:C.mint,a});
    const ly=y1-40;[[ac,"AWS c6a.2xlarge",0],[C.steel,"GCP c2d-highcpu-8",0],["#FF8F86","Hetzner, shared",1]].forEach(([c,s,d],i)=>{
      LN(gx,ly+i*15-3,gx+16,ly+i*15-3,c,d?1.2:2,1,d?[3,3]:null);T(s,gx+22,ly+i*15,{s:10});});}
  else {const a=1;LN(x0,H-8,x0+12,H-8,ac,2,a);T("AWS",x0+16,H-4,{s:10});LN(x0+50,H-8,x0+62,H-8,C.steel,1.4,a);T("GCP",x0+66,H-4,{s:10});}
 }},
{kicker:"Policy, under concurrency",
 title:"34 requests fired in the same instant, each answered by its own rule",
 meta:"TokenFuse gateway and the Wardryx decision point, different agents, credentials, budgets and policies",
 src:[["tokenfuse / VALIDATION.md",GH+"tokenfuse/blob/main/VALIDATION.md"],["wardryx",GH+"wardryx/blob/main/VALIDATION.md"]],
 sr:"34 requests from different agents, with different credentials, budgets and policies, fired at once. Good agents: 6 of 6 served, 200. Money-oversteppers: 10 of 10 blocked, 402. Permission-oversteppers: 6 of 6 denied, 403. Unattested calls denied, 403, and attested calls served, 200. In the same campaign, ten agents racing one $0.0010 cap: exactly 3 admitted, 7 blocked.",
 draw(W,H,t,cmp,ac){
  const mx=cmp?12:22, top=cmp?30:32, n=34, rows=BURST.length+1.35, rh=(H-top-8)/rows;
  const cs=Math.min((BURST.length*rh-6)/n,6.4), sx=mx+(cmp?2:30), sy=top;
  const xc=cmp?W*.3:W*.4, csz=cmp?6:9, lx=xc+10*(csz+3)+(cmp?5:22);
  T(cmp?"34 at once":"34 at the same instant",mx,top-12,{s:10.5,c:C.fg});
  const lit=k(t,.15,.2), go=out(k(t,.7,1));
  for(let i=0;i<n;i++) R(sx,sy+i*cs+.75,cs*1.3,cs-1.5,C.fg,lit*(go>.98?.28:.8));
  const ex=sx+cs*1.3+2;
  BURST.forEach((g,gi)=>{const y=top+gi*rh+rh*.42, tx=xc-6, nC=g.cells.length;
    /* one band per group, as wide as its count; the pair with no count is a dashed hairline */
    const fy=sy+(gi+.5)/BURST.length*n*cs, ux=ex+(tx-ex)*go, uy=fy+(y-fy)*go;
    ctx.save();ctx.globalAlpha=(nC?.2:.35)*Math.min(1,go*2);ctx.strokeStyle=C.fg;ctx.lineWidth=nC?Math.max(1,nC*.9):1;ctx.setLineDash(nC?[]:[3,3]);
    ctx.beginPath();ctx.moveTo(ex,fy);ctx.bezierCurveTo(ex+(ux-ex)*.5,fy,ux-(ux-ex)*.5,uy,ux,uy);ctx.stroke();ctx.restore();
    const settle=k(t,1.6,.25+gi*.1);
    [...g.cells].forEach((c,ci)=>{const x=xc+ci*(csz+3);SR(x,y-csz/2,csz,csz,C.line,.8);
      if(settle>0) R(x+1,y-csz/2+1,csz-2,csz-2,c==="g"?C.mint:C.ember,.85*settle);});
    if(!nC&&settle>0){const w=TW("403",{s:10,w:700});T("403",xc,y+4,{s:10,w:700,c:C.ember,a:settle});T("200",xc+w+10,y+4,{s:10,w:700,c:C.mint,a:settle});}
    const a=k(t,1.7+gi*.12,.35);
    if(cmp){T(g.short||g.who,lx,y-3,{s:10,c:C.fg,a});T(g.ansShort||g.ans,lx,y+10,{s:9.5,a});}
    else{T(g.who,lx,y-2,{s:12,f:"t",c:C.fg,a});T(g.ans,lx,y+13,{s:10.5,a});
      T(g.res,W-mx,y+4,{s:13,w:700,c:!nC?C.fg:g.cells[0]==="g"?C.mint:C.ember,a,al:"right"});}
  });
  /* the same campaign, a separate test: ten agents racing one shared cap */
  const dy=top+BURST.length*rh+rh*.05, ry=dy+rh*.62, ra=k(t,2.3,.4);
  HL(xc,W-mx,dy,C.line,ra);T(cmp?"same campaign, separate test":"the same campaign, a separate test",xc,dy+12,{s:9.5,a:ra});
  [...RACE.cells].forEach((c,ci)=>{const x=xc+ci*(csz+3), f=k(t,2.5+ci*.06,.2);SR(x,ry-csz/2+4,csz,csz,C.line,.8*ra);
    if(f>0) R(x+1,ry-csz/2+5,csz-2,csz-2,c==="g"?C.mint:C.ember,.85*f);});
  if(cmp){T(RACE.short,lx,ry+1,{s:10,c:C.fg,a:ra});T(RACE.ans,lx,ry+14,{s:9.5,a:ra});}
  else{T(RACE.who,lx,ry+2,{s:12,f:"t",c:C.fg,a:ra});T(RACE.ans,lx,ry+17,{s:10.5,a:ra});T(RACE.res,W-mx,ry+8,{s:13,w:700,c:C.fg,a:k(t,3,.3),al:"right"});}
 }},
{kicker:"Evidence, per decision",
 title:"Every decision writes a hash-linked record, and the disk fills before the processor does",
 meta:"Wardryx audit on the k3s clusters; on GCP, 23,700 decisions wrote 23,700 records, none sampled",
 src:[["wardryx / VALIDATION.md",GH+"wardryx/blob/main/VALIDATION.md"]],
 sr:"Bytes of audit per decision: 393 on Hetzner, 427.6 on AWS, 426.4 on GCP. On the GCP cluster 23,700 decisions wrote 23,700 hash-linked records. At a thousand calls a minute that is 614 MB a day, and a 5 GiB volume fills in nine days.",
 draw(W,H,t,cmp,ac){
  const mx=cmp?12:22, top=cmp?26:34;
  const bx0=mx, bx1=cmp?W-mx:W*.34, bars=[["Hetzner",393],["AWS",427.6],["GCP",426.4]];
  T("audit bytes per decision",bx0,top-12,{s:10.5,c:C.fg});
  const lw=cmp?52:62, bw=bx1-bx0-lw-62, bh=cmp?7:9, gap=cmp?17:26;
  bars.forEach(([n,v],i)=>{const y=top+8+i*gap, f=out(k(t,.2+i*.2,.8));T(n,bx0,y+bh-1,{s:10.5});
    HL(bx0+lw,bx0+lw+bw,y+bh+3,C.faint);R(bx0+lw,y,bw*v/450*f,bh,ac,.85);
    T(`${v} B`,bx0+lw+bw*v/450*f+8,y+bh-1,{s:11,w:700,c:C.fg,a:k(t,.6+i*.2,.3)});});
  if(!cmp){const a=k(t,1.2,.4),y=top+8+3*gap+18;T("on the GCP cluster, 23,700",bx0,y,{s:11,c:C.fg,a});T("decisions wrote 23,700 records,",bx0,y+16,{s:11,c:C.fg,a});T("each linked to the last",bx0,y+32,{s:11,a});
    /* a short stretch of the chain itself */
    const cy=y+58, n=Math.floor((bx1-bx0)/22);for(let i=0;i<n;i++){const x=bx0+i*22, s=k(t,1.4+i*.05,.3);if(s<=0) break;
      SR(x,cy-5,11,11,ac,.7*s);if(i) LN(x-11,cy+.5,x,cy+.5,ac,1,.45*s);}}
  /* the projection: one number, a straight line */
  const x0=cmp?mx+28:W*.43, x1=W-mx-(cmp?4:10), y0=cmp?top+3*gap+26:top+4, y1=H-(cmp?24:28), dmax=10, gmax=7;
  const xv=d=>x0+d/dmax*(x1-x0), yv=g=>y1-g/gmax*(y1-y0);
  for(let g=0;g<=6;g+=2){HL(x0,x1,yv(g),g?C.faint:C.line);T(g?g+" GB":"0",x0-6,yv(g)+3.5,{s:10,al:"right"});}
  for(let d=0;d<=10;d+=2){VL(xv(d),y1,y1+4,C.line);T(cmp?String(d):"day "+d,xv(d),y1+15,{s:10,al:"center"});}
  const vol=5*1.073741824, full=vol/.614, r=out(k(t,.7,2));
  HL(x0,x1,yv(vol),"#FF8F86",.75,[5,4]);T("a 5 GiB volume",x0+6,yv(vol)-6,{s:10.5,c:"#FF8F86",a:k(t,.6,.4)});
  const de=r*dmax;LN(xv(0),yv(0),xv(de),yv(Math.min(gmax,de*.614)),ac,2,1);
  if(!cmp) T("614 MB a day at 1,000 calls a minute",xv(3.3)+6,yv(3.3*.614)+20,{s:11,c:C.fg,a:k(t,1.4,.4)});
  else T("614 MB a day",xv(3)+6,yv(3*.614)+16,{s:10,c:C.fg,a:k(t,1.4,.4)});
  if(de>=full){const a=k(t,.7+2*(full/dmax),.4);DOT(xv(full),yv(vol),4,ac,a);VL(xv(full),yv(vol)+5,y1,ac,.5*a,[2,3]);
    T("full in nine days",xv(full)-8,yv(vol)-12,{s:cmp?10.5:12,w:700,c:ac,a,al:"right"});}
 }},
{kicker:"Portability",
 title:"The same 12 deliberate overruns, refused the same way on three clouds",
 meta:"TokenFuse gateway with real model calls: Hetzner, AWS t3.medium in eu-central-1, GCP e2-medium in europe-west3",
 src:[["tokenfuse / VALIDATION.md",GH+"tokenfuse/blob/main/VALIDATION.md"]],
 sr:"Each cloud ran 176 real allowed calls and 12 deliberate budget overruns. The breaker blocked 12 of 12 on Hetzner, on AWS and on GCP.",
 draw(W,H,t,cmp,ac){
  const mx=cmp?12:22, top=cmp?30:40, rows=[["Hetzner"],["AWS"],["GCP"]];
  const lw=cmp?0:110, xs=mx+lw, sw=cmp?W*.42:W*.38, bs=cmp?7:10, bx=xs+sw+(cmp?10:22), rx=bx+12*(bs+3)+(cmp?8:20);
  const rh=(H-top-(cmp?6:26))/3;
  if(!cmp){T("176 real calls",xs,top-14,{s:10.5});T("12 overruns",bx,top-14,{s:10.5});T("breaker",rx,top-14,{s:10.5});}
  const run=k(t,.3,1.5);
  rows.forEach(([n],i)=>{const y=top+i*rh+(cmp?16:8), a=1;
    if(cmp) T(n,mx,y-8,{s:11,c:C.fg});else T(n,mx,y+7,{s:13,f:"t",w:600,c:C.fg});
    for(let j=0;j<176;j++){const x=xs+j/176*sw, on=j/176<run;VL(x,y-2,y+12,C.fg,on?.42:.08);}
    for(let j=0;j<12;j++){const x=bx+j*(bs+3), s=k(t,1.9+j*.09,.15);SR(x,y-1,bs,bs+2,C.line,.8);if(s>0) R(x+1,y,bs-2,bs,ac,.9*s);}
    const ra=k(t,3,.4);
    if(cmp){T("12/12",W-mx,y+10,{s:11,w:700,c:ac,a:ra,al:"right"});}
    else{T("12 / 12",rx,y+6,{s:15,w:700,c:ac,a:ra});T("blocked",rx,y+22,{s:10.5,a:ra});}
  });
  if(!cmp) T("The breaker behaved identically on all three.",mx,H-12,{s:11,c:C.fg,a:k(t,3.4,.5)});
 }},
{kicker:"Crypto inventory",
 title:"A live filesystem's Linux binaries, scanned without one crash",
 meta:"Qryx on 25,586 real ELF files, stripped, static, PIE and truncated among them",
 src:[["qryx / VALIDATION.md",GH+"qryx/blob/main/VALIDATION.md"]],
 sr:"Qryx scanned 25,586 real Linux ELF files from a live filesystem, stripped, static, PIE and truncated binaries included, with zero crashes.",
 draw(W,H,t,cmp,ac){
  const mx=cmp?12:22, top=cmp?14:22, rx0=mx, rx1=cmp?W-mx:W*.68, ry0=top, ry1=H-(cmp?48:22);
  const L=raster(rx1-rx0,ry1-ry0,ac);
  const f=out(k(t,.2,2.8)), cols=L.cols, sc=Math.round(f*N_ELF);
  L.paint(sc);
  ctx.drawImage(L.cv,rx0,ry0,L.w,L.h);
  if(f<1){const col=Math.floor(sc/L.rows), x=rx0+col*L.p;VL(x,ry0-4,ry0+L.h+4,ac,.9);}
  if(!cmp){const x=W*.72, a=k(t,.2,.3);
    T("files scanned",x,top+10,{s:11,a});T(fmt(sc),x,top+46,{s:34,w:600,c:C.fg,a});
    T("crashes",x,top+82,{s:11,a});T("0",x,top+112,{s:28,w:700,c:C.mint,a:k(t,3,.3)});
    ["stripped","static","PIE","truncated"].forEach((s,i)=>{const b=k(t,3.1+i*.12,.3);T("included",W-mx,top+150+i*17,{s:10.5,a:b,al:"right"});T(s,x,top+150+i*17,{s:11,c:C.fg,a:b});});}
  else{const y=H-24;T(fmt(sc),mx,y,{s:16,w:700,c:C.fg});T("files scanned",mx+TW(fmt(sc)+" ",{s:16,w:700}),y,{s:10.5});
    T("0 crashes",W-mx,y,{s:13,w:700,c:C.mint,a:k(t,3,.3),al:"right"});T("stripped, static, PIE and truncated included",mx,H-8,{s:9.5,a:k(t,3.1,.3)});}
 }},
{kicker:"Rehearsal",
 title:"Three hostile drills, fired twice at a real gateway",
 meta:"Mockryx: live guardrails in front of a stub provider, two separate campaigns",
 src:[["mockryx / VALIDATION.md",GH+"mockryx/blob/main/VALIDATION.md"]],
 sr:"dlp-secret-leak: the DLP guardrail must block the secret. runaway-budget: the breaker must trip, 402. wardryx-denied-tool: the enforcement point must deny it, 403. Held in both campaigns: 0 gaps, $0 real spend.",
 draw(W,H,t,cmp,ac){
  const mx=cmp?12:22, top=cmp?30:38;
  const rows=[["dlp-secret-leak","an agent leaks a secret","blocked"],["runaway-budget","an agent overspends","402"],["wardryx-denied-tool","a forbidden tool call","403"]];
  const c1=cmp?W*.56:W*.58, c2=cmp?W*.79:W*.79, cw=cmp?W*.19:W*.17, rh=cmp?38:44;
  T("drill",mx,top-14,{s:10});if(!cmp) T("what it tries",W*.3,top-14,{s:10});T("campaign 1",c1,top-14,{s:10});T("campaign 2",c2,top-14,{s:10});
  HL(mx,W-mx,top-6,C.line);
  rows.forEach(([d,w,code],i)=>{const y=top+12+i*rh;
    T(d,mx,y+4,{s:cmp?10.5:12,w:600,c:C.fg});if(!cmp) T(w,W*.3,y+4,{s:12,f:"t"});
    [c1,c2].forEach((cx,ci)=>{const t0=.3+ci*1.4+i*.3, f=k(t,t0,.55), h=k(t,t0+.6,.25);
      if(f<1){HL(cx,cx+cw*.8,y,C.faint);HL(cx,cx+cw*.8*out(f),y,"#FF8F86",.9);}
      if(h>0) PILL(cx,y,cmp?"held":"held, "+code,C.mint,h);});
    HL(mx,W-mx,y+rh/2+2,C.faint);});
  const a=k(t,3.6,.4), y=H-(cmp?12:16);
  const w=T("0",mx,y,{s:cmp?18:24,w:700,c:ac,a});T("gaps",mx+w+8,y,{s:cmp?11:12,c:C.fg,a});
  const w2=TW("0",{s:cmp?18:24,w:700})+8+TW("gaps",{s:12})+28;
  const w3=T("$0",mx+w2,y,{s:cmp?18:24,w:700,c:C.fg,a});T("real spend",mx+w2+w3+8,y,{s:cmp?11:12,a});
 }},
{kicker:"Then torn down",
 title:"Nothing from the campaign is still standing",
 meta:"Disposable machines on three clouds, and the real model key behind the campaign's paid calls",
 src:[["How these numbers were produced","stack-guide.html#proof"]],
 sr:"Afterwards the machines on Hetzner, AWS and GCP were deleted and the campaign's model key was revoked. The records stay public.",
 draw(W,H,t,cmp,ac){
  const mx=cmp?12:22, top=cmp?34:44, rh=cmp?38:42;
  const rows=[["Hetzner","machines and a k3s cluster","deleted"],["AWS","machines and k3s clusters","deleted"],["GCP","machines and k3s clusters","deleted"],["Model key","the real key behind the paid calls","revoked"]];
  rows.forEach(([n,d,end],i)=>{const y=top+i*rh, s=k(t,.6+i*.45,.5), sx=cmp?W*.62:W*.6;
    const nw=T(n,mx,y,{s:cmp?13:15,f:"t",w:600,c:C.fg,a:1-.55*s});if(!cmp) T(d,mx+170,y,{s:12,f:"t",a:1-.5*s});
    if(s>0) LN(mx,y-5,mx+(cmp?nw:170+TW(d,{s:12,f:"t"}))*out(s),y-5,C.fg,1,.6);
    if(s<1) PILL(sx,y-5,"running",C.mint,1-s);else PILL(sx,y-5,end,C.dim,1);
    HL(mx,W-mx,y+rh/2-4,C.faint);});
  const a=k(t,2.6,.5);T("The machines are gone. The records are public.",mx,H-(cmp?12:18),{s:cmp?12:14,f:"t",w:600,c:C.fg,a});
 }},
];

/* the binaries raster lives in its own canvas and only paints what is new */
let RAS=null;
function raster(w,h,ac){
  const dpr=Math.min(2,devicePixelRatio||1), wd=Math.floor(w*dpr), hd=Math.floor(h*dpr), key=`${wd}x${hd}`;
  if(RAS&&RAS.key===key) return RAS;
  /* whole device pixels per cell, the pitch chosen to fill the most of the area */
  let best=null;
  for(let px=2;px<=8;px++){const cols=Math.floor(wd/px), rows=Math.ceil(N_ELF/cols), py=Math.min(Math.floor(hd/rows),Math.ceil(px*1.5));
    if(py<2) continue;const used=cols*px*rows*py;if(!best||used>best.used) best={px,py,cols,rows,used};}
  if(!best){const cols=Math.floor(wd/2);best={px:2,py:2,cols,rows:Math.ceil(N_ELF/cols)};}
  const {px,py,cols,rows}=best, c=document.createElement("canvas");c.width=cols*px;c.height=rows*py;const g=c.getContext("2d");
  const cell=(i)=>g.fillRect(Math.floor(i/rows)*px,(i%rows)*py,px-1,py-1);
  const base=()=>{g.clearRect(0,0,c.width,c.height);g.fillStyle="rgba(255,255,255,.07)";for(let i=0;i<N_ELF;i++) cell(i);};
  base();
  RAS={key,cv:c,w:c.width/dpr,h:c.height/dpr,p:px/dpr,cols,rows,done:0,
    paint(n){if(n<this.done){this.done=0;base();}
      g.fillStyle=ac;for(let i=this.done;i<n;i++){g.globalAlpha=.55+.4*((i*7919)%13)/13;cell(i);}g.globalAlpha=1;this.done=n;}};
  return RAS;
}

/* ---------- which record shows ---------- */
const DUR=9.5, LAST=FIGS.length-1;
let cur=0, t0=null, now=0, hold=false, resumeAt=0, visible=true, raf=0, W=0, H=0, dpr=1;
const steps=FIGS.map((f,i)=>{const b=document.createElement("button");b.type="button";b.setAttribute("aria-label","Show "+f.kicker.toLowerCase());
  b.addEventListener("click",()=>{show(i);hold=false;resumeAt=now+6;});stepsEl.appendChild(b);return b;});
let shown=-1;
function show(i){
  if(i===shown) return;
  cur=shown=i;t0=null;box.classList.add("swap");
  setTimeout(()=>{const f=FIGS[cur];head.k.textContent=f.kicker;head.t.textContent=f.title;head.m.textContent=f.meta;srEl.textContent=f.sr;
    srcEl.innerHTML="";const lab=document.createElement("span");lab.textContent="Record ";srcEl.appendChild(lab);
    f.src.forEach(([s,h],j)=>{if(j){srcEl.appendChild(document.createTextNode(", "));}const a=document.createElement("a");a.href=h;a.textContent=s;
      if(/^https:/.test(h)){a.target="_blank";a.rel="noopener";}srcEl.appendChild(a);});
    box.style.setProperty("--acc",AC[cur]);box.classList.remove("swap");},reduceMQ.matches?0:180);
  tiles.forEach((el,j)=>el.classList.toggle("playing",j===cur));
  steps.forEach((b,j)=>{b.classList.toggle("on",j===cur);b.setAttribute("aria-current",j===cur?"true":"false");});
  if(RAS) RAS.done=N_ELF+1; /* repaint the raster from empty */
  kick();
}
tiles.forEach((el,i)=>{
  const on=()=>{hold=true;show(i);}, off=()=>{hold=false;resumeAt=now+2.5;};
  el.addEventListener("pointerenter",on);el.addEventListener("focusin",on);
  el.addEventListener("pointerleave",off);el.addEventListener("focusout",off);
});
box.addEventListener("pointerenter",()=>{hold=true;});
box.addEventListener("pointerleave",()=>{hold=false;resumeAt=now+2.5;});

/* the head keeps the height of its tallest record, so nothing under the panel moves */
function fitHead(){
  const h=box.querySelector(".pr-head"), probe=h.cloneNode(true);
  probe.style.cssText=`position:absolute;visibility:hidden;left:0;top:0;width:${h.getBoundingClientRect().width}px;min-height:0`;
  box.appendChild(probe);let mh=0;
  FIGS.forEach(f=>{probe.querySelector(".pr-k").textContent=f.kicker;probe.querySelector(".pr-t").textContent=f.title;probe.querySelector(".pr-m").textContent=f.meta;mh=Math.max(mh,probe.offsetHeight);});
  probe.remove();h.style.minHeight=mh+"px";
  const fo=srcEl.parentNode, fs=getComputedStyle(fo), fw=fo.clientWidth-parseFloat(fs.paddingLeft)-parseFloat(fs.paddingRight)-(W<640?0:stepsEl.offsetWidth+18);
  const sp=srcEl.cloneNode(true);sp.style.cssText=`position:absolute;visibility:hidden;left:0;top:0;width:${fw}px;min-height:0`;box.appendChild(sp);let sh=0;
  FIGS.forEach(f=>{sp.textContent="Record "+f.src.map(x=>x[0]).join(", ");sh=Math.max(sh,sp.offsetHeight);});sp.remove();srcEl.style.minHeight=sh+"px";
}
function size(){fitHead();const r=cv.getBoundingClientRect();dpr=Math.min(2,devicePixelRatio||1);W=Math.max(1,r.width);H=Math.max(1,r.height);
  const w=Math.round(W*dpr),h=Math.round(H*dpr);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}kick();}
function frame(ms){
  raf=0;
  now=ms/1000;if(t0===null) t0=now;
  const still=reduceMQ.matches, u=still?99:now-t0, f=FIGS[cur];
  const dur=cur===LAST?7:DUR;
  if(!still&&!hold&&now>=resumeAt&&u>dur) show(cur===LAST?0:cur+1);
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
  f.draw(W,H,still?99:Math.max(0,now-t0),W<640,AC[cur]);
  const p=still?1:clamp((now-t0)/dur,0,1);
  steps.forEach((b,j)=>b.style.setProperty("--p",j===cur?p.toFixed(3):j<cur?"1":"0"));
  if(tiles[cur]) tiles[cur].style.setProperty("--p",p.toFixed(3));
  if(!still&&visible&&!document.hidden) raf=requestAnimationFrame(frame);
}
function kick(){if(!raf) raf=requestAnimationFrame(frame);}
if("IntersectionObserver" in window) new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible) kick();},{rootMargin:"80px"}).observe(box);
document.addEventListener("visibilitychange",kick);
reduceMQ.addEventListener&&reduceMQ.addEventListener("change",kick);
if("ResizeObserver" in window) new ResizeObserver(size).observe(cv); else addEventListener("resize",size);
show(0);size();
/* read-only, for the page's own tests */
cv.recordProbe=()=>({cur,age:now-(t0||now),hold});
})();
