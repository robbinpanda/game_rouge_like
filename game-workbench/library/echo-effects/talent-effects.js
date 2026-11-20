const talentPalettes={
 fire:['#a74025','#ed6c38','#ffae4c','#fff5bc'],
 ice:['#295d88','#62adcf','#adf3ff','#faffff'],
 arc:['#563478','#9976e7','#d6b9ff','#fff8ff'],
 metal:['#4c5066','#8892ac','#efbd71','#fff2b5'],
 prey:['#3a4157','#458979','#8bd5ab','#edffe7'],
 emberice:['#a05671','#f89667','#a5e8ff','#fff8cf']
};
// Each motif is placed at the actual source, recipient or impact of its proc.
function talentSculpture(id){
 const [family,shape]=talentMotifs[id];
 return sculptGeometry(talentPalettes[family],({ribbon,shard,helix})=>{
  const v=point3;
  if(shape==='return'){
   for(let i=0;i<3;i++)ribbon([polar3(1.7,i*2.1,.35),polar3(1.35,i*2.1+.65,1.8),polar3(.62,i*2.1+1.4,2.05),v(0,1.52,0)],.09,.055);
  }else if(shape==='cage'||shape==='citadel'||shape==='plates'){
   const n=shape==='cage'?7:shape==='citadel'?6:3;
   for(let i=0;i<n;i++){
    const a=shape==='plates'?(i-1)*.62:i*6.283/n;
    const top=polar3(shape==='cage'?.44:1.38,a+.24,shape==='citadel'?3.7:2.55);
    shard(polar3(1.35,a,.25),top,shape==='cage'?.19:.37);
    if(shape==='citadel')ribbon([polar3(1.32,a,1.45),polar3(1.55,a+.43,2.25),polar3(1.32,a+1,1.45)],.14,.07);
   }
  }else if(shape==='hooks'||shape==='pack'||shape==='wings'||shape==='phoenix'){
   for(const side of [-1,1])for(let i=0;i<(shape==='hooks'?2:3);i++){
    const span=shape==='phoenix'?2.22:shape==='wings'?1.72:1.18;
    ribbon([v(side*.13,.94,.12),v(side*.58,1.44+i*.1,.52),v(side*span,2.48-i*.23,.12),
     v(side*(span+.14-i*.22),shape==='hooks'?.96:2.86-i*.48,-.5)],.125+i*.018,.07);
   }
   if(shape==='pack')for(const side of [-1,1])shard(v(side*.64,2.17,-.2),v(side*.47,.57,.72),.22);
   if(shape==='phoenix')helix(.73,2.85,5.1,0,0,.20);
  }else if(shape==='fork'||shape==='storm'||shape==='fault'||shape==='needle'){
   for(let i=0;i<(shape==='needle'?1:shape==='storm'?6:3);i++){
    const a=i*2.4,r=shape==='fault'?2.05:.92;
    ribbon([polar3(r,a,shape==='fault'?.12:3.05),polar3(.55*r,a+.4,1.97),polar3(r,a-.25,1.68),v(0,.65,0)],.09,.056);
   }
   if(shape==='needle')shard(v(0,3.35,0),v(0,1.05,0),.18,0,true);
   if(shape==='storm')helix(1.34,2.9,5.1,1,0,.13);
  }else if(shape==='gears'){
   for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    ribbon([v(Math.cos(a)*.8,1.7+Math.sin(a)*.8,.15),v(Math.cos(a+.25)*1.04,1.7+Math.sin(a+.25)*1.04,.25),
     v(Math.cos(a+.58)*.8,1.7+Math.sin(a+.58)*.8,.15)],.105,.08);
   }
  }else if(shape==='meteor'){
   for(let i=0;i<3;i++)shard(v(1+i*.36,3.9+i*.32,-.65),v(0,.92,0),.23-i*.04,0,true);
  }else if(shape==='lantern'){
   for(const side of [-1,1])shard(v(side*.77,1.28,0),v(side*.67,2.58,.22),.23,0,true);
  }else{
   for(let i=0;i<4;i++)helix(1.08,2.7+i%2*.4,2.86,i*1.59,0,.18);
  }
  // Rare and legendary procs gain an airborne halo of separate facets.
  for(let i=0;i<10;i++){
   const a=i*2.4,y=.65+i%4*.48;
   shard(polar3(1.1,a,y),polar3(1.67,a+.15,y+.42),.11,i%2+1,true);
  }
 });
}
function talentLink(from,to,colour){
 const start=from.clone().add(point3(0,1.25,0)),end=to.clone().add(point3(0,1.45,0));
 const crest=start.clone().lerp(end,.42);crest.y+=.66;
 drawTrail(start,crest,colour,.22,.054);drawTrail(crest,end,colour,.30,.039);
}
function talentEffect(id,position,delay=0){
 const gift=giftById[id],rarity=giftRarity(gift);
 const level=rarity==='legendary'?2:rarity==='resonant'||rank(id)>1?1:0;
 const key='gift/'+id;
 // Multiple contacts in the same frame may trigger an identical proc at the same point.
 if(battleEffects.some(f=>f.age<=0&&(f.object.userData.delay||0)===delay&&f.object.name===key&&f.object.position.distanceToSquared(position)<.08))return;
 const duration=level===2?.85:level===1?.65:.48;
 const m=sculptedEffect(key,()=>talentSculpture(id),position,duration,level);
 m.rotation.y=player.group.rotation.y;
 if(level===2)m.scale.setScalar(1.16);
 if(delay){m.visible=false;m.userData.delay=delay;}
}

function pulseAt(p,r,colour){ringAt(p.clone().add(new THREE.Vector3(0,.17,0)),colour,r,.32);}

function showDischarge(from,to,level){
 const start=from.clone().setY(1.7),end=to.clone().setY(1.4);
 const bend=start.clone().lerp(end,.48).add(new THREE.Vector3(.35,.65,-.32));
 drawTrail(start,bend,schools.arc.hex,.22,.065);
 drawTrail(bend,end,schools.arc.hex,.22,.065);
 if(level===2){
  const fork=bend.clone().lerp(end,.48).add(new THREE.Vector3(-.65,.42,.5));
  drawTrail(bend,fork,0xded8ff,.28,.045);
  drawTrail(fork,end,0xded8ff,.28,.045);
  impactSpray(end,schools.arc.hex);
 }
}

function showChainArc(from,to){
 const start=from.clone().setY(1.45),end=to.clone().setY(1.4);
 const bend=start.clone().lerp(end,.5).add(new THREE.Vector3(.3,.5,-.2));
 drawTrail(start,bend,schools.arc.hex,.2,.052);
 drawTrail(bend,end,schools.arc.hex,.2,.052);
}
