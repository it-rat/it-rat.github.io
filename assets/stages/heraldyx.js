/* Stage "night" - heraldyx. One burst of events falls through three limits and
   almost none of it reaches a person. Events rain from the shared log on the
   left, meet the severity floor, the dedup window and the hourly ceiling in
   that order, and the few that survive land in a mailbox on the right.

   Every count on it comes from a real run of scripts/burst-demo.sh in the
   heraldyx repo: 120 events in, 20 alert mails out, 29 dropped as repeats of a
   condition already sent, 65 held for the daily digest, 6 refused by the
   ceiling. The verdict of each dot is assigned once from a seeded rng in the
   same proportions, so the picture is a deterministic function of t.

   opts: {t0, t1} the window the burst falls through. */
(function(){
"use strict";
const U=Sim.util, P=U.PAL;

const SKY="91,200,245";      /* heraldyx accent */
const VERDICT=[              /* colour, lane label, where it stops */
  {k:"notify",  col:P.mint,  y:0.86},
  {k:"drop",    col:P.faint, y:0.52},
  {k:"digest",  col:P.amber, y:0.36},
  {k:"ceiling", col:P.ember, y:0.70}
];

Sim.registerStage("night",function(o){
  const T0=(o&&o.t0)||3, T1=(o&&o.t1)||54;
  const N=120;
  /* 20 notify, 29 drop, 65 digest, 6 suppressed: the measured split */
  const plan=[];
  for(let i=0;i<20;i++) plan.push(0);
  for(let i=0;i<29;i++) plan.push(1);
  for(let i=0;i<65;i++) plan.push(2);
  for(let i=0;i<6;i++)  plan.push(3);
  /* one shuffle, seeded, so arrivals are mixed but identical on every replay */
  const rnd=U.rng(4711);
  for(let i=plan.length-1;i>0;i--){
    const j=Math.floor(rnd()*(i+1)); const s=plan[i]; plan[i]=plan[j]; plan[j]=s;
  }
  const seeds=[]; const r2=U.rng(90210);
  for(let i=0;i<N;i++) seeds.push({at:T0+(T1-T0)*(i/N)+r2()*0.35, lane:r2(), v:plan[i]});

  let gx=0,gy=0,gw=0,gh=0;

  function gateY(h,k){ return gy+gh*[0.36,0.52,0.70][k]; }

  return{
    minHeight:320,
    init(w,h){ gx=26; gy=18; gw=w-52; gh=h-72; },
    draw(ctx,w,h,t){
      const laneX=x=>gx+30+x*(gw*0.54);
      const mailX=gx+gw-118;

      /* the three limits, as bands the events have to cross */
      const bands=[
        {y:0.36,label:"severity floor",sub:"default high"},
        {y:0.52,label:"dedup window",sub:"10 min per condition"},
        {y:0.70,label:"hourly ceiling",sub:"20 messages"}
      ];
      ctx.textAlign="left";
      bands.forEach(b=>{
        const y=gy+gh*b.y;
        ctx.strokeStyle="rgba("+P.amber+",.30)";ctx.lineWidth=1;
        ctx.setLineDash([5,5]);
        ctx.beginPath();ctx.moveTo(gx+8,y);ctx.lineTo(mailX-24,y);ctx.stroke();
        ctx.setLineDash([]);
        ctx.font="9.5px ui-monospace,Menlo,monospace";
        ctx.fillStyle="rgba("+P.amber+",.85)";
        ctx.fillText(b.label,gx+10,y-6);
        /* The qualifier goes when there is no room for it. On a phone it ran
           under the mailbox card, so "10 min per condition" and "your mailbox"
           printed on top of each other. The label alone still names the band,
           and the numbers it repeats are in the badges above the stage. */
        const subX=gx+10+ctx.measureText(b.label).width+10;
        if(subX+ctx.measureText(b.sub).width < mailX-26){
          ctx.fillStyle="rgba("+P.faint+",.9)";
          ctx.fillText(b.sub,subX,y-6);
        }
      });

      /* the log the events come from */
      ctx.fillStyle="rgba("+P.dim+",.9)";
      ctx.font="9.5px ui-monospace,Menlo,monospace";
      ctx.fillText("the shared event log",gx+8,gy+12);
      for(let i=0;i<7;i++){
        ctx.fillStyle="rgba(255,255,255,.055)";
        ctx.fillRect(gx+8,gy+20+i*7,86,4);
      }

      /* the events */
      let arrived=0, out=[0,0,0,0];
      seeds.forEach((s,i)=>{
        if(t<s.at) return;
        arrived++;
        const V=VERDICT[s.v];
        const stopY=gy+gh*V.y;
        const fall=U.between(t,s.at,s.at+3.2);
        const y=gy+34+(stopY-(gy+34))*U.ease.outCubic(fall);
        const x=laneX(s.lane);
        if(fall>=1) out[s.v]++;
        /* a notify keeps going: it leaves the lanes and flies to the mailbox */
        if(s.v===0&&fall>=1){
          const g=U.between(t,s.at+3.2,s.at+4.6);
          const fx=x+(mailX-x)*U.ease.inOutCubic(g);
          const fy=stopY+(gy+gh*0.20+96-stopY)*U.ease.inOutCubic(g);
          U.glow(ctx,fx,fy,2.6,V.col,.95);
          return;
        }
        ctx.fillStyle="rgba("+V.col+","+(fall<1?.9:.42)+")";
        ctx.beginPath();ctx.arc(x,y,fall<1?2.6:2,0,7);ctx.fill();
      });

      /* the mailbox */
      const mails=out[0];
      ctx.strokeStyle="rgba("+SKY+",.75)";ctx.lineWidth=1.3;
      U.rr(ctx,mailX-16,gy+gh*0.20,112,gh*0.46,10);ctx.stroke();
      ctx.textAlign="center";
      ctx.fillStyle="rgba("+SKY+",.95)";ctx.font="10px ui-monospace,Menlo,monospace";
      ctx.fillText("your mailbox",mailX+40,gy+gh*0.20+18);
      ctx.font="700 21px ui-monospace,Menlo,monospace";
      ctx.fillStyle="rgba("+P.mint+",.95)";
      ctx.fillText(String(mails),mailX+40,gy+gh*0.20+48);
      ctx.font="9.5px ui-monospace,Menlo,monospace";
      ctx.fillStyle="rgba("+P.dim+",.9)";
      ctx.fillText("alert mails",mailX+40,gy+gh*0.20+64);
      /* stacked envelopes, one per mail, capped so it stays a shape */
      for(let i=0;i<Math.min(mails,20);i++){
        const ex=mailX-6+(i%5)*22, ey=gy+gh*0.20+76+Math.floor(i/5)*11;
        ctx.fillStyle="rgba("+P.mint+",.55)";
        ctx.fillRect(ex,ey,18,7);
      }

      /* the tallies */
      ctx.textAlign="left";
      const legend=[
        ["mailed now",VERDICT[0].col,out[0]],
        ["held for the digest",VERDICT[2].col,out[2]],
        ["dropped, already said",VERDICT[1].col,out[1]],
        ["over the ceiling",VERDICT[3].col,out[3]]
      ];
      /* One row while it fits, two columns when it does not. On a 393px phone
         the single row ran off the right edge and the last entry was cut at
         "dropped," with its count gone, which reads as a broken number rather
         than a clipped one. Measured rather than assumed: the four entries are
         laid out once, and the row is kept only if the last one ends inside the
         box. */
      /* As many columns as measurably fit, from four down to one. This started
         as one row, which ran off a 393px phone and cut the third entry at
         "dropped," with its count gone. Two columns fixed that width and still
         overflowed at 320 and 393, so the rule is not a breakpoint: it is the
         widest entry against the space there actually is. Nothing here may be
         clipped, because every entry ends in a number and a clipped number is
         not a cramped label, it is a wrong one. */
      ctx.font="9.5px ui-monospace,Menlo,monospace";
      const items=legend.map(([name,col,n])=>({col,s:name+" "+n}));
      /* One row first, packed to each entry's own width, because that is what
         this looked like on a desktop and a uniform grid gave it three columns
         and two rows where four had fitted comfortably. The grid is the
         fallback, not the rule. */
      const natural=items.reduce((x,it)=>x+13+ctx.measureText(it.s).width+22,gx+8);
      const cellW=natural<=gx+gw
        ? 0
        : Math.max(...items.map(it=>ctx.measureText(it.s).width))+13+22;
      const cols=cellW===0
        ? items.length
        : Math.max(1,Math.min(items.length,Math.floor((gw-8)/cellW)));
      const rows=Math.ceil(items.length/cols);
      const dot=(x,y,col)=>{ ctx.fillStyle="rgba("+col+",.9)";
                             ctx.beginPath();ctx.arc(x+4,y-3,3.4,0,7);ctx.fill(); };
      const ly=h-30;
      let flow=gx+8;
      items.forEach((it,i)=>{
        const cx=cellW===0?flow:gx+8+(i%cols)*cellW;
        const cy=ly-(rows-1-Math.floor(i/cols))*13;
        dot(cx,cy,it.col);
        ctx.fillStyle="rgba("+P.dim+",.95)";
        ctx.fillText(it.s,cx+13,cy);
        flow=cx+13+ctx.measureText(it.s).width+22;
      });
      ctx.fillStyle="rgba("+P.faint+",.9)";
      ctx.fillText("events seen "+arrived+" / "+N,gx+8,ly-rows*13-4);
      ctx.textAlign="center";
    }
  };
});
})();
