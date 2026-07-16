/* Stage "sweep" - Qryx. A wall of tiny cells (binaries, certs, keys) and a
   scan beam moving through it: scanned cells classify into ok / legacy /
   quantum-vulnerable, named findings pulse where the beam caught them, and
   the run ends with a post-quantum-signed evidence seal.
   Deterministic in t (scrub-safe).
   opts: {sweep:[t0,t1], findings:[{t,label,cls:"vuln"|"legacy"}], signT} */
(function(){
"use strict";
const U=Sim.util, P=U.PAL;

Sim.registerStage("sweep",function(o){
  const [S0,S1]=o.sweep||[2,46];
  const rnd=U.rng(99);
  let cols=0,rows=0,cell=9,gx=0,gy=0,gw=0,gh=0,cls=[];

  function classify(){
    cls=[];
    for(let i=0;i<cols*rows;i++){
      const r=rnd();
      cls.push(r<0.045?2:r<0.16?1:0);      /* 2 vuln · 1 legacy · 0 ok */
    }
  }
  const CCOL=["147,168,196","244,178,62","180,140,255"];  /* steel amber violet */

  return{
    minHeight:300,
    init(w,h){
      gx=24;gy=16;gw=w-48;gh=h-78;
      cols=Math.max(24,Math.floor(gw/ cell /1.28));
      rows=Math.max(10,Math.floor(gh/ cell /1.28));
      const seeded=U.rng(99); let tmp=[];
      for(let i=0;i<cols*rows;i++){const r=seeded();tmp.push(r<0.045?2:r<0.16?1:0);}
      cls=tmp;
    },
    draw(ctx,w,h,t){
      const sx=gw/cols, sy=gh/rows;
      const prog=U.between(t,S0,S1);
      const beamX=gx+gw*prog;

      /* cells */
      for(let c=0;c<cols;c++){
        const x=gx+c*sx;
        const scanned=x+sx*0.5<beamX;
        for(let r=0;r<rows;r++){
          const y=gy+r*sy, k=cls[r*cols+c];
          if(!scanned){
            ctx.fillStyle="rgba(255,255,255,.045)";
            ctx.fillRect(x,y,sx-2,sy-2);
            continue;
          }
          const near=Math.max(0,1-Math.abs(beamX-x)/60);
          const base=k===2?.75:k===1?.5:.22;
          ctx.fillStyle="rgba("+CCOL[k]+","+(base+near*.35)+")";
          ctx.fillRect(x,y,sx-2,sy-2);
        }
      }
      /* the beam */
      if(prog>0&&prog<1){
        const g=ctx.createLinearGradient(beamX-46,0,beamX,0);
        g.addColorStop(0,"rgba("+P.violet+",0)");g.addColorStop(1,"rgba("+P.violet+",.30)");
        ctx.fillStyle=g;ctx.fillRect(beamX-46,gy,46,gh);
        ctx.strokeStyle="rgba("+P.violet+",.9)";ctx.lineWidth=1.6;
        ctx.beginPath();ctx.moveTo(beamX,gy-4);ctx.lineTo(beamX,gy+gh+4);ctx.stroke();
      }

      /* named findings pulse where the beam caught them */
      (o.findings||[]).forEach((f,i)=>{
        if(t<f.t) return;
        const fp=U.between(f.t,S0,S1);
        const fx=gx+gw*fp, fy=gy+gh*(0.22+((i*0.31)%0.56));
        const p=U.pulse(t,f.t,2.4);
        const col=f.cls==="legacy"?P.amber:P.violet;
        ctx.fillStyle="rgba("+col+",.95)";
        ctx.fillRect(fx-3,fy-3,6,6);
        if(p>0){
          ctx.strokeStyle="rgba("+col+","+p+")";ctx.lineWidth=1.4;
          ctx.beginPath();ctx.arc(fx,fy,6+26*(1-p),0,7);ctx.stroke();
        }
        ctx.textAlign=fp>0.6?"right":"left";
        ctx.font="9.5px ui-monospace,Menlo,monospace";
        ctx.fillStyle="rgba("+col+",.95)";
        ctx.fillText(f.label,fx+(fp>0.6?-10:10),fy+3);
      });

      /* footer strip: progress + legend + evidence seal */
      const fy=h-40;
      ctx.textAlign="left";ctx.font="9.5px ui-monospace,Menlo,monospace";
      ctx.fillStyle="rgba("+P.dim+",.95)";
      const scanned=Math.round(25586*prog);
      ctx.fillText("scanned "+U.fmt(scanned,0)+" / 25 586 assets · symbol-level",gx,fy+6);
      const leg=[["ok",CCOL[0]],["legacy",CCOL[1]],["quantum-vulnerable",CCOL[2]]];
      let lx=gx;
      leg.forEach(([name,col])=>{
        ctx.fillStyle="rgba("+col+",.9)";ctx.fillRect(lx,fy+16,8,8);
        ctx.fillStyle="rgba("+P.faint+",.95)";ctx.fillText(name,lx+13,fy+23);
        lx+=ctx.measureText(name).width+34;
      });
      /* evidence seal after signT */
      if(o.signT!=null&&t>=o.signT){
        const p=U.ease.outBack(U.between(t,o.signT,o.signT+0.8));
        const cx2=w-92, cy2=fy+12, R=15*p;
        ctx.strokeStyle="rgba("+P.mint+",.9)";ctx.lineWidth=1.6;
        ctx.beginPath();
        for(let k=0;k<=6;k++){
          const a=k/6*6.283-1.57;
          const px2=cx2+Math.cos(a)*R, py2=cy2+Math.sin(a)*R;
          k?ctx.lineTo(px2,py2):ctx.moveTo(px2,py2);
        }
        ctx.stroke();
        ctx.fillStyle="rgba("+P.mint+",.95)";ctx.textAlign="center";
        ctx.font="8px ui-monospace,Menlo,monospace";
        ctx.fillText("ML-DSA",cx2,cy2+2.5);
        ctx.textAlign="left";ctx.font="9.5px ui-monospace,Menlo,monospace";
        ctx.fillText("evidence signed",cx2+22,cy2+3);
      }
      ctx.textAlign="center";
    }
  };
});
})();
