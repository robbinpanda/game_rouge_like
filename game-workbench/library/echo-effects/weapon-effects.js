// Local +Z follows the attack. Left and right use separate palettes and silhouettes.
const formColours={
 katana:[['#88433b','#f07645','#ffc57a','#fff5ce'],['#3a4577','#6c99ed','#a8e3ff','#f2fcff']],
 spear:[['#705528','#bf932f','#ffe293','#fff6d5'],['#18655e','#24aca4','#91f6d4','#f0fff1']],
 dual:[['#644080','#b66ce1','#ffc7f6','#fff3fd'],['#3c3788','#7968f1','#b5a2ff','#f3ecff']],
 hammer:[['#573e35','#94674e','#efae60','#fff0b3'],['#44384b','#9b5240','#ff9147','#ffe2a0']],
 crossbow:[['#234e54','#37978a','#98e1b4','#eaffdc'],['#733342','#bf6442','#ffc56a','#fff4c4']],
 rifle:[['#254962','#458fba','#91deff','#f1ffff'],['#483675','#8d5bc9','#e2a5ff','#fff1ff']]
};
const formForward=point3(0,0,1),boltPool=effectMeshPool({vertexColors:true},40);
const boltShapes=new Map();

function curvePoints(count,point){
 return Array.from({length:count+1},(_,i)=>point(i/count));
}
function coilZ(length,radius,turn,offset){
 return curvePoints(14,t=>point3(radius*Math.cos(offset+t*turn),radius*Math.sin(offset+t*turn),t*length));
}
function sculptForm(id,right,shot=false,level=2){
 const colours=formColours[id][Number(right)];
 return sculptGeometry(colours,({shard,ribbon,helix})=>{
  const v=point3;
  if(shot&&id==='katana'){
   for(let i=0;i<3;i++)ribbon([v(-1.12-i*.12,-.48,0),v(-.48,.05,.55-i*.22),v(.25,.38,.64-i*.22),v(1.05+i*.12,.92,0)],.19-i*.026,.09,i,i===2);
  }else if(shot&&id==='crossbow'){
   shard(v(0,0,-.58),v(0,0,right?.92:1.18),right?.16:.082);
   for(const side of [-1,1]){
    shard(v(0,0,right?.68:-.28),v(side*(right?.30:.18),.05,right?.02:-.62),.065);
    shard(v(0,0,-.22),v(side*.27,.1,-.75),.065,1,true);
    ribbon([v(0,0,.32),v(side*.25,.05,-.25),v(side*.14,.18,-.68)],.065,.035,2,true);
   }
  }else if(shot&&id==='rifle'){
   shard(v(0,0,-1.2),v(0,0,right?1.55:.96),right?.21:.10,0,true);
   if(right)for(let i=0;i<4;i++){
    const path=coilZ(2.35,.19+i*.035,Math.PI*2.6,i*1.7);
    for(const p of path)p.z-=1.2;
    ribbon(path,.085,.052,[0,0,1,2][i]);
   }else for(let i=0;i<2;i++)shard(v((i?1:-1)*.17,0,-.82),v(0,.04,.5),.07,i+1);
  }else if(id==='katana'){
   if(right){
    for(let i=0;i<3;i++)ribbon([v(-.9,.58,.6),v(-.74,1.45,1.65),v(-.15,2.45,2.25),v(.70,3.02,2.0+i*.23)],.28-i*.035,.10,i);
   }else for(let i=0;i<3;i++){
    const arc=curvePoints(12,t=>polar3(2.75+i*.19,-1.15+t*2.44,.73+1.15*t+i*.12));
    ribbon(arc,i===0?.20:.085,.085,i,i===2);
   }
  }else if(id==='spear'){
   shard(v(0,1.33,.5),v(0,1.38,right?5.8:4.6),right?.27:.14,0,true);
   if(right){
    for(let i=0;i<4;i++){
     const path=coilZ(4.65,.37+.09*i,Math.PI*3.1,i*2.18);
     for(const p of path){p.y+=1.38;p.z+=.6;}
     ribbon(path,.12,.064,[0,0,1,2][i]);
    }
   }else for(let i=0;i<3;i++)for(const side of [-1,1]){
    const z=2.4+.55*i;
    ribbon([v(side*(.54+i*.09),1.5,z-.7),v(side*.18,1.36,z),v(0,1.36,z+.55)],.09,.046,i);
   }
  }else if(id==='dual'){
   if(right){
    for(let i=0;i<4;i++)helix(2.75,.99+i*.34,4.9,i*2.34,[0,0,1,2][i],.145,v(0,.4,0));
   }else for(let i=0;i<3;i++)for(const side of [-1,1]){
    const z=1.12+i*.27;
    ribbon([v(side*(1.4+.18*i),2.38,z-.55),v(side*.68,1.82,z+.54),v(-side*.16,1.18,z+.91),v(-side*.92,.76,z+.55)],i?.085:.145,.07,i,i===2);
   }
  }else if(id==='hammer'){
   if(right){
    ribbon([v(0,2.95,.45),v(0,2.38,1.33),v(0,1.43,2.03),v(0,.19,2.62)],.33,.19);
    for(let i=0;i<11;i++){const a=(i-5)*.33,r=1.6+(i%3)*.4;
     const base=polar3(r*.5,a,-.04).add(v(0,0,1.6)),tip=polar3(r,a,.82+(i%3)*.33).add(v(0,0,1.6));
     shard(base,tip,.27,[0,1,2,0][i%4]);
    }
   }else{
    for(let i=0;i<3;i++)ribbon(curvePoints(8,t=>polar3(2.75+i*.12,-1.16+t*2.36,1.58-.38*t+i*.18)),i?.09:.31,.15,i);
    for(let i=0;i<7;i++)shard(v(.7+i*.17,1.05+i%2*.26,2.25),v(1.31+i*.22,1.42+i%3*.24,2.45),.16,i%3);
   }
  }else if(id==='crossbow'){
   const spread=right?[-1,0,1]:[0];
   for(const side of spread){
    const x=side*.85;
    ribbon([v(side*.20,-.09,.08),v(x*.5,.03,.74),v(x,.07,1.65)],.102,.06,0,true);
    for(let i=1;i<=2;i++)shard(v(x*.35,.08,.35),v(x+.16*i,.25*i,1.3+i*.16),.08,i);
   }
  }else if(id==='rifle'){
   if(right)for(let i=0;i<4;i++)ribbon(coilZ(2.28,.43+.06*i,Math.PI*2.2,i*2.2),.122,.065,[0,0,1,2][i]);
   else for(let i=0;i<7;i++){const a=i*2.4;
    shard(v(0,0,0),v(Math.sin(a)*.48,Math.cos(a)*.48,.67+i%2*.28),.095,i%3);}
   shard(v(0,0,-.1),v(0,0,right?2.5:1.65),right?.205:.125,0,true);
  }
 },level);
}
function weaponSwing(a){
 const level=attackRank(a.id,a.heavy),key='swing/'+a.id+'/'+Number(a.heavy);
 const m=sculptedEffect(key,()=>sculptForm(a.id,a.heavy),player.group.position,a.heavy?.47:.31,level);
 m.rotation.y=Math.atan2(a.forward.x,a.forward.z);
 m.material.uniforms.stroke.value=a.id==='spear'?2:a.id==='hammer'&&a.heavy||a.id==='dual'&&!a.heavy?3:1;
 const base=weaponSpecs[a.id],reach=a.heavy?base.heavyReach:base.reach;
 const size=1+formReach(a.id,a.heavy)/reach;
 m.scale.set(size,1,size);
 if(!a.heavy&&a.step===1&&['katana','dual','hammer'].includes(a.id))m.scale.x*=-1;
 if(a.id==='dual'&&a.heavy)m.material.uniforms.spin.value=1.85;
}
function weaponFlash(id,right,level,origin,dir){
 const key='muzzle/'+id+'/'+Number(right);
 const m=sculptedEffect(key,()=>sculptForm(id,right),origin,right?.26:.17,level);
 m.material.uniforms.stroke.value=2;
 m.quaternion.setFromUnitVectors(formForward,dir);
}
function formShot(id,right){
 const level=attackRank(id,right),key=id+'/'+Number(right)+'/'+level;
 if(!boltShapes.has(key)){const g=sculptForm(id,right,true,level);g.name='bolt/'+key;boltShapes.set(key,g);}
 const colours=formColours[id][Number(right)];
 return {level,right,id,geometry:boltShapes.get(key),colour:colours[2],width:(right?.052:.023)*(1+level*.32)};
}
function formImpact(shot,pos,dir){
 const {id,right,level}=shot,key='impact/'+id+'/'+Number(right);
 const m=sculptedEffect(key,()=>sculptGeometry(formColours[id][Number(right)],({shard,ribbon})=>{
  for(let i=0;i<9;i++){
   const a=i*2.4,r=(right?.82:.51)*(1+.12*(i%3)),tier=[0,0,0,1,2,1,2,1,2][i];
   if(id==='crossbow'){
    const fork=point3(Math.cos(a)*r,Math.sin(a)*r,-.48);
    ribbon([point3(0,0,.14),fork, fork.clone().multiplyScalar(1.38).add(point3(0,0,right?.26:-.26))],.078,.04,tier);
   }else shard(point3(0,0,-.09),point3(r*Math.cos(a),r*Math.sin(a),right?.65:-.52),right?.125:.073,tier,i%2===0);
  }
 }),pos,right?.33:.22,level);
 m.quaternion.setFromUnitVectors(formForward,dir);
}
