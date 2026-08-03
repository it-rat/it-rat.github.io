/* Stage "proof" - trailryx. Records arrive and chain, an auditor asks two
   questions, and the two answers are not the same kind of answer.

   The first predicate lands on one of the five provable dimensions, so it
   becomes a contiguous range of the authenticated index and the answer carries
   a completeness proof. The second does not, so the rows are still right and
   the answer is marked partial with the reason named. That contiguity IS the
   mechanism, which is why the sorted grid is the picture rather than decoration.

   Last, one subject is erased. Its payload goes, the record's commitment to it
   stays, and the chain still verifies: the thing most audit stores cannot do.

   Deterministic in t. opts: {fillTo, q1, q2, forget} times in the window. */
(function(){
"use strict";
const U=Sim.util, P=U.PAL;

const CORAL="228,98,111";    /* trailryx accent */
const COLS=24;

Sim.registerStage("proof",function(o){
  const FILL=(o&&o.fillTo)||30;      /* records keep arriving until here */
  const Q1=(o&&o.q1)||36;            /* the provable question */
  const Q2=(o&&o.q2)||46;            /* the one that cannot be proved */
  const FORGET=(o&&o.forget)||54;
  const N=COLS*5;

  /* which cells the two queries match. The first is a contiguous run because
     it is sorted on the dimension asked about; the second is scattered
     because nothing sorts by it. */
  const R1=[42,78];
  const rnd=U.rng(1312);
  const scattered=[];
  for(let i=0;i<N;i++) if(rnd()<0.14) scattered.push(i);
  const ERASED=[63,64,65];

  let gx=0,gy=0,cw=0,ch=0;

  return{
    minHeight:340,
    init(w,h){ gx=26; gy=64; cw=(w-52)/COLS; ch=Math.min(17,(h-210)/5); },

    draw(ctx,w,h,t){
      const grown=Math.round(N*U.between(t,2,FILL));
      const q1=t>=Q1, q2=t>=Q2, forgotten=t>=FORGET;

      ctx.textAlign="left";
      ctx.font="9.5px ui-monospace,Menlo,monospace";
      ctx.fillStyle="rgba("+P.dim+",.95)";
      ctx.fillText("the journal, sorted by the dimension asked about",gx,gy-40);
      ctx.fillStyle="rgba("+P.faint+",.9)";
      ctx.fillText("one record per event, each hashed onto the one before it",gx,gy-26);

      /* the records */
      for(let i=0;i<N;i++){
        const c=i%COLS, r=Math.floor(i/COLS);
        const x=gx+c*cw, y=gy+r*(ch+5);
        if(i>=grown){
          ctx.fillStyle="rgba(255,255,255,.05)";
          ctx.fillRect(x,y,cw-3,ch); continue;
        }
        const inR1=i>=R1[0]&&i<=R1[1];
        const inR2=scattered.indexOf(i)>=0;
        let col="147,168,196", a=.30;
        if(q1&&inR1){ col=P.mint; a=.20+.62*U.between(t,Q1,Q1+1.4); }
        if(q2&&inR2){ col=P.amber; a=.20+.62*U.between(t,Q2,Q2+1.4); }
        if(forgotten&&ERASED.indexOf(i)>=0){ col=CORAL; a=.75; }
        ctx.fillStyle="rgba("+col+","+a+")";
        ctx.fillRect(x,y,cw-3,ch);
        /* the erased ones keep their outline: the record is still there */
        if(forgotten&&ERASED.indexOf(i)>=0){
          ctx.strokeStyle="rgba("+CORAL+",.95)";ctx.lineWidth=1.1;
          ctx.strokeRect(x+.5,y+.5,cw-4,ch-1);
          ctx.fillStyle="rgba(10,14,19,.85)";
          ctx.fillRect(x+2,y+2,cw-7,ch-4);
        }
      }

      /* the bracket over the proved range */
      if(q1){
        const p=U.ease.outCubic(U.between(t,Q1,Q1+1.2));
        const c0=R1[0]%COLS, r0=Math.floor(R1[0]/COLS);
        const c1=R1[1]%COLS, r1=Math.floor(R1[1]/COLS);
        ctx.strokeStyle="rgba("+P.mint+","+(.85*p)+")";ctx.lineWidth=1.4;
        for(let r=r0;r<=r1;r++){
          const a=r===r0?c0:0, b=r===r1?c1:COLS-1;
          U.rr(ctx,gx+a*cw-2,gy+r*(ch+5)-2,(b-a+1)*cw-1,ch+4,4);
          ctx.stroke();
        }
      }

      /* the three answers, stacked full width. Side by side they had about 34
         characters each and ran into one another, which a render caught. */
      const cardY=gy+5*(ch+5)+14;
      const cw2=w-52;
      function card(row,on,col,head,body){
        const p=on?U.ease.outCubic(U.between(t,on,on+1)):0;
        if(p<=0) return;
        const y=cardY+row*46;
        ctx.globalAlpha=p;
        ctx.strokeStyle="rgba("+col+",.9)";ctx.lineWidth=1.2;
        U.rr(ctx,gx,y,cw2,40,9);ctx.stroke();
        ctx.textAlign="left";
        ctx.font="700 10.5px ui-monospace,Menlo,monospace";
        ctx.fillStyle="rgba("+col+",.95)";
        ctx.fillText(head,gx+14,y+17);
        ctx.font="9.5px ui-monospace,Menlo,monospace";
        ctx.fillStyle="rgba("+P.dim+",.95)";
        ctx.fillText(body,gx+14,y+32);
        ctx.globalAlpha=1;
      }
      card(0,q1?Q1:0,P.mint,"ProofStatus::Full",
           "every record about run-b, and a proof it is all of them");
      card(1,q2?Q2:0,P.amber,"ProofStatus::Partial",
           "the rows are right, the set is not proved: nothing sorts by severity, and the answer says so");
      card(2,forgotten?FORGET:0,CORAL,"one subject erased",
           "the payload is gone, the record is not, and the chain still verifies around it");

      ctx.textAlign="center";
    }
  };
});
})();
