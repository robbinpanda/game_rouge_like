const monsters={
 hound:{name:'裂脊猎犬',hp:68,speed:5.1,role:'锁定扑击 / 交错追扑',color:0x659989},
 crab:{name:'铆甲钳卫',hp:118,speed:3.15,role:'正面横扫 / 脚下震地',color:0x526e80},
 ray:{name:'浮翼针鳐',hp:54,speed:3.6,role:'扇射 / 锁线激光',color:0x63aabd},
 bloom:{name:'棱镜孢囊',hp:68,speed:1.95,role:'落晶 / 双环晶弹',color:0xa385be}
};
const affixes={
 armored:{name:'披甲',rule:'轻击伤害降低 25%。重击、燃烧或冻结能破甲。'},
 wet:{name:'潮湿',rule:'每次寒意多叠一层，受到弧光与短路的伤害提高 50%。'},
 furious:{name:'狂暴',rule:'半血以下攻击间隔缩短，减速或冻结能压制狂暴。'},
 split:{name:'分裂',rule:'死亡时分裂成两只弱体。燃烧或冻结可阻止分裂。'}
};
const regionAffixes=[['armored','furious'],['wet','armored'],['split','wet','furious']];
const hasAffix=(e,id)=>e.affixes?.includes(id);
const conductivity=e=>hasAffix(e,'wet')?1.5:1;
function summon(kind,x,z,{boss=false,elite=false,affixList=[],swarmer=false}={}){
 const spec=monsters[kind],avatar=makeCreature(kind,boss,elite);
 const spot=findSpawnPoint(x,z);avatar.group.position.set(spot.x,0,spot.z);contactShadow(avatar);
 const maxHp=boss?[820,1120,1450][run.act]:swarmer?Math.round(22+run.act*8):Math.round(spec.hp*(1+run.act*.19)*(elite?1.55:1));
 const e={avatar,kind,boss,elite,swarmer,name:boss?acts[run.act].boss:(swarmer?'晶屑 · ':elite?'精英 · ':'')+spec.name,hp:maxHp,maxHp,dead:false,charge:false,
  attackDir:new THREE.Vector3(),stagger:0,windup:0,guard:0,poise:swarmer?35:100,aggro:0,slow:0,burn:0,frozen:0,recoil:0,heat:0,heatClock:1,
  vy:0,attackIndex:0,cooldown:boss?.75:swarmer?.65:1+run.random(),recovery:0,flinchLock:0,phaseShift:false,transition:0,hitRadius:boss?2.05:swarmer?.65:.88,hitHeight:boss?2.35:swarmer?.85:1.28};
 if(swarmer)avatar.group.scale.multiplyScalar(.66);
 e.affixes=affixList;
 if(affixList.length)e.name=affixList.map(id=>affixes[id].name).join('·')+' · '+e.name;
 enemies.push(e);return e;
}
function splitCreature(e){
 if(!hasAffix(e,'split')||e.heat>0||e.burn>0||e.frozen>0)return;
 const p=e.avatar.group.position;
 for(const dx of [-1.3,1.3]){
  const child=summon(e.kind,p.x+dx,p.z);
  child.hp=child.maxHp=Math.ceil(e.maxHp*.25);
  child.name='幼体 · '+child.name;child.avatar.group.scale.multiplyScalar(.72);
 }
}
function spawnRoomEnemies(room){
 run.waves=[];
 const pools=[['hound','crab','hound','ray'],['ray','crab','bloom','hound'],['bloom','hound','ray','crab']];
 if(room.type==='boss'){
  const b=summon(['crab','ray','bloom'][run.act],0,-5,{boss:true});
  if(typeof window!=='undefined'&&window.innerWidth>0&&typeof document!=='undefined'&&document.pointerLockElement===canvas){
   bossIntroTime=1.15;bossIntroTarget=b;
  }
  return;
 }
 const pts=shuffled([[-6,-7],[6,-7],[-10,1],[10,1],[0,-9],[0,-1]]);
 const count=room.type==='elite'||room.type==='trial'?4+run.act:Math.min(5,2+run.act+(run.index>0?1:0));
 const pack=shuffled(pools[run.act]);
 for(let i=0;i<count;i++){
  const local=shuffled(regionAffixes[run.act]);
  const pool=[...local,...shuffled(Object.keys(affixes).filter(id=>!local.includes(id)))];
  const base=run.roomsCleared>0&&(i===0||room.type==='elite'||room.type==='trial')?1:0;
  const kind=run.act===0&&run.index===0?['hound','crab'][i]:pack[i%pack.length];
  const enemy=summon(kind,...pts[i],{elite:(room.type==='elite'||room.type==='trial')&&i===0,affixList:pool.slice(0,base+run.depth)});
  enemy.flank=i%2===0?-1:1;
 }
 if(run.index>0||run.act>0){
  const wave2=[];
  const swarmPts=[[-8,-6],[8,-6],[0,-9],[-5,2],[5,2]];
  const swarmCount=room.type==='elite'||room.type==='trial'?4:3;
  for(let i=0;i<swarmCount;i++){
   const k=i===0?pack[(i+1)%pack.length]:(run.act===2?'bloom':'hound');
   wave2.push({kind:k,x:swarmPts[i][0],z:swarmPts[i][1],swarmer:i>0,elite:i===0&&room.type==='trial'});
  }
  run.waves.push(wave2);
 }
}
function spawnNextWave(){
 const wave=run.waves.shift();if(!wave)return;
 for(const w of wave){
  const spot=findSpawnPoint(w.x,w.z);
  pulseAt(new THREE.Vector3(spot.x,.1,spot.z),2.6,acts[run.act].accent);
  const e=summon(w.kind,spot.x,spot.z,{swarmer:w.swarmer,elite:w.elite});
  e.cooldown=.9;
 }
 cue('deploy');toast('增援波次抵达 · 连锁收割！');
}
function removeMark(h){if(h.floor)releaseFootprint(h.mesh);else ringPool.release(h.mesh);}
function clearMarks(){for(const h of run.marks)removeMark(h);run.marks=[];}
function warn(e,kind,origin,aim,width,delay,damage,charged=false,arc=.93){
 const from=origin.clone().setY(.075),to=aim.clone().setY(.075);
 if(kind==='line'&&damage){
  const delta=to.clone().sub(from),length=delta.length();
  if(length>.01){
   const dir=delta.divideScalar(length),hit=sceneIntersection(from.clone().setY(.85),dir,length,false);
   to.copy(from).addScaledVector(dir,hit.distance);
  }
 }
 const mesh=floorFootprint(kind,from,to,width,charged?0x3fbdff:0xff653d,arc);
 run.marks.push({owner:e,kind,from,to,width,remain:delay,duration:delay,damage,charged,mesh,floor:true,arc});
}
function prepareLaser(e,angles){
 const origin=e.avatar.group.position.clone();origin.y+=1.35;
 e.windup=e.boss?1.2:1.05;e.charge=true;
 e.attackHint='折光锁线 · 横移或反制';
 for(const angle of angles){
  const dir=e.attackDir.clone().applyAxisAngle(effectUp,angle);
  const end=sceneIntersection(origin,dir,e.boss?24:18,false);
  const radius=e.boss?.42:.3;
  const mesh=ringPool.acquire(trailGeometry,origin,0x40c8ff,.45);
  mesh.position.lerp(end.point,.5);
  mesh.quaternion.setFromUnitVectors(effectUp,dir);
  mesh.scale.set(.035,end.distance,.035);
  run.marks.push({owner:e,kind:'laser',mesh,from:origin,to:end.point,dir,length:end.distance,width:radius,
   duration:e.windup,remain:e.windup,damage:e.boss?25:18});
 }
}
function fireLaser(h){
 drawTrail(h.from,h.to,0x28adff,.32,h.width);
 drawTrail(h.from,h.to,0xf0ffff,.22,h.width*.55);
 particlesAt(h.to,0x80deff,8,3);
 impactSpray(h.to,0xb5edff,true);cue('laser',h.from);
 const center=player.group.position.clone();center.y+=1.35;
 const offset=center.sub(h.from),along=offset.dot(h.dir);
 if(along>=0&&along<=h.length&&offset.addScaledVector(h.dir,-along).length()<=h.width+.48){
  damagePlayer(h.damage,h.owner,true);
 }
}
// A crown of outward-pointing teeth previews the actual openings in each wave.
function crystalCrown(count){
 const vertices=[];
 for(let i=0;i<count;i++){
  const angle=i*2*Math.PI/count;
  for(const [a,r] of [[angle-.11,.78],[angle,1.42],[angle+.11,.78]]){
   vertices.push(Math.sin(a)*r,0,Math.cos(a)*r);
  }
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 return geo;
}
const crystalCrowns=new Map([8,10,12].map(n=>[n,crystalCrown(n)]));
function prepareCrystalWaves(e){
 const count=e.boss?12:e.elite?10:8,spacing=2*Math.PI/count;
 const origin=e.avatar.group.position.clone();origin.y+=1.25;
 const heading=Math.atan2(e.attackDir.x,e.attackDir.z);
 e.attackHint='双环晶弹 · 从弹隙换位';e.windup=1.48;e.charge=false;
 for(let wave=0;wave<2;wave++){
  const angle=heading+wave*spacing/2,delay=wave?e.windup:.86;
  const color=wave?0xff8bc9:0xb567ff;
  const mesh=ringPool.acquire(crystalCrowns.get(count),origin,color,.5);
  mesh.rotation.y=angle;mesh.scale.setScalar(wave?.76:1.15);
  run.marks.push({owner:e,kind:'crystals',mesh,from:origin,count,angle,color,remain:delay,duration:delay});
 }
}
function fireCrystalWave(h){
 const e=h.owner;
 for(let i=0;i<h.count;i++){
  const a=h.angle+i*2*Math.PI/h.count,dir=new THREE.Vector3(Math.sin(a),0,Math.cos(a));
  createProjectile(h.from,dir,e,e.boss?14:10,h.color);
  const shot=projectiles.at(-1);
  shot.m.geometry=crystalGeo;shot.m.scale.set(.18,.42,.18);
  shot.v.multiplyScalar(e.boss?.66:.55);shot.life=2.4;shot.crystalColor=h.color;
 }
 impactSpray(h.from,h.color,h.owner.boss);cue('crystal',h.from);
}
function signatureAttack(e,origin,target,forward){
 const side=new THREE.Vector3(forward.z,0,-forward.x);
 function lane(offset,delay,width){
  const start=target.clone().addScaledVector(side,offset).addScaledVector(forward,-9);
  warn(e,'line',start,start.clone().addScaledVector(forward,18),width,delay,24,true);
 }
 if(run.act===0){
  e.attackHint='夹轨合击 · 移出中线';
  lane(-2.8,.82,1.15);lane(2.8,.82,1.15);lane(0,1.42,1.25);
  e.windup=.82;
 }else if(run.act===1){
  e.attackHint='逐浪扫射 · 穿过已扫区域';
  const sweep=e.attackIndex%2?1:-1;
  for(let i=0;i<3;i++)lane((i-1)*3*sweep,.76+i*.39,1.45);
  e.windup=.76;
 }else{
  e.attackHint='镜花绽放 · 避开花心后折返';
  warn(e,'disc',target,target,2.05,.82,22,true);
  const angle=Math.atan2(target.z-origin.z,target.x-origin.x);
  for(let i=0;i<6;i++){
   const a=angle+i*Math.PI/3;
   const petal=target.clone().add(new THREE.Vector3(Math.cos(a)*3.7,0,Math.sin(a)*3.7));
   warn(e,'disc',petal,petal,2.05,1.55,22,true);
  }
  e.windup=.82;
 }
}
function pattern(e){
 const p=e.avatar.group.position,t=player.group.position.clone().setY(0),dir=t.clone().sub(p).setY(0).normalize();
 const n=e.attackIndex++,angry=e.phaseShift,k=e.kind;
 if(dir.lengthSq()===0)dir.set(Math.sin(e.avatar.group.rotation.y),0,Math.cos(e.avatar.group.rotation.y));
 e.attackDir.copy(dir);e.charge=false;e.action=null;e.attackHint='';
 if(e.boss){
  const mode=n%(angry?3:2);e.charge=true;
  if(mode===2)signatureAttack(e,p,t,dir);
  else if(run.act===0){
   if(mode===0){warn(e,'line',p,p.clone().addScaledVector(dir,12),1.55,.87,30,true);e.action='rush';e.windup=.87;}
   else{warn(e,'ring',p,p,6.2,.85,25,true);if(angry)warn(e,'disc',t,t,2.2,1.45,18);e.windup=.85;}
  }else if(run.act===1){
   if(mode===0){warn(e,'disc',t,t,2.8,.9,22);warn(e,'disc',t.clone().add(new THREE.Vector3(2.6,0,0)),t,2.4,1.32,19);e.windup=.9;}
   else prepareLaser(e,angry?[-.32,0,.32]:[-.18,.18]);
  }else{
   if(mode===0){warn(e,'ring',p,p,7,.78,27,true);warn(e,'disc',p,p,3.4,1.4,25);e.windup=.78;}
   else prepareCrystalWaves(e);
  }
  e.cooldown=angry?.62:.83;
 }else if(k==='hound'){
  e.charge=n%3===2;e.windup=.55;e.action='rush';e.cooldown=.82;
  e.attackHint=n%2===0?'裂脊扑击 · 横移':'扑击接爪波 · 留意第二条线';
  warn(e,'line',p,p.clone().addScaledVector(dir,5.45),.83,e.windup,e.elite?22:15,e.charge);
  if(n%2){
   const side=new THREE.Vector3(dir.z,0,-dir.x).multiplyScalar((e.flank||1)*2.4);
   warn(e,'line',p.clone().add(side),t.clone().addScaledVector(dir,1.2),.73,1.09,e.elite?18:12);
  }
 }
 else if(k==='crab'){
  e.windup=n%2?.98:.73;e.charge=n%2===1;e.cooldown=.94;
  e.attackHint=e.charge?'铆甲震地 · 跳开或反制':'钳刃横扫 · 绕到侧后';
  warn(e,e.charge?'disc':'sector',p,t,e.charge?4.15:4.65,e.windup,e.elite?29:22,e.charge,1.23);
 }
 else if(k==='ray'&&n%2===0){prepareLaser(e,[0]);e.cooldown=2.1;}
 else if(k==='ray'){
  e.windup=.67;e.cooldown=1.35;e.attackHint='针刺散射 · 进入掩体';
  for(const spread of [-.27,0,.27]){
   const shot=dir.clone().applyAxisAngle(effectUp,spread);
   const end=sceneIntersection(p.clone().setY(1.44),shot,15,false).point;
   warn(e,'line',p,end,.34,e.windup,0);
   run.marks.at(-1).projectile=shot;
  }
 }
 else if(n%2===0){prepareCrystalWaves(e);e.cooldown=2.3;}
 else{warn(e,'disc',t,t,e.elite?2.55:1.9,.92,e.elite?21:15);e.windup=.92;e.cooldown=2.0;}
 const clips=strikeClips[e.avatar.id],variant=e.boss&&n%(angry?3:2)!==0?1:0;
 playCreatureClip(e.avatar,clips[variant],e.windup/.70);
 cue('warning',p);
}
function hitFootprint(h,p){
 const dx=p.x-h.from.x,dz=p.z-h.from.z;
 if(h.kind==='line'){
  const sx=h.to.x-h.from.x,sz=h.to.z-h.from.z,length=Math.hypot(sx,sz)||1;
  const along=(dx*sx+dz*sz)/length,across=Math.abs(dx*sz-dz*sx)/length;
  return along>=-.25&&along<=length+.25&&across<=h.width+.25&&(h.continuousFloor||!obstructed(h.from,p));
 }
 const radius=Math.hypot(dx,dz);
 if(radius>h.width+.23||h.kind==='ring'&&radius<h.width*.5-.22)return false;
 if(h.kind!=='sector'||radius<.01)return true;
 const angle=Math.atan2(dx,dz)-Math.atan2(h.to.x-h.from.x,h.to.z-h.from.z);
 return Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))<=h.arc;
}
function awakenBoss(e){
 e.phaseShift=true;e.transition=.66;e.cooldown=.12;e.attackIndex=2;
 e.stagger=0;e.frozen=0;e.windup=0;e.charge=false;e.rush=0;e.recovery=0;
 for(const h of run.marks)if(h.owner===e)h.cancelled=true;
 const p=e.avatar.group.position;
 playCreatureClip(e.avatar,'Awaken',e.transition);
 pulseAt(p,7.5,acts[run.act].accent);shake=Math.max(shake,.3);cue('break',p);
 if(typeof applyBossPhaseAtmosphere==='function')applyBossPhaseAtmosphere(run.act);
 if(typeof calloutAt==='function')calloutAt(p,'第二形态觉醒！','gold');
 toast(e.name+' · 第二形态');
 if(run.act===2)for(const x of [-7,7])summon('bloom',x,-4);
}
function tickWarnings(dt){
 for(let i=run.marks.length-1;i>=0;i--){
  const h=run.marks[i],e=h.owner;h.remain-=dt;
  const progress=1-Math.max(0,h.remain/h.duration);
  if(h.kind==='laser'){
   h.mesh.material.opacity=.55+.4*progress;
   h.mesh.scale.x=h.mesh.scale.z=.035+.055*progress;
  }else if(h.kind==='crystals')h.mesh.material.opacity=.48+.48*progress;
  else h.mesh.material.uniforms.amount.value=progress;
  const cancelled=h.cancelled||e.dead||e.stagger>1.1||e.frozen>0;
  if(cancelled||h.remain<=0){
   if(!cancelled&&h.kind==='laser')fireLaser(h);
   else if(!cancelled&&h.kind==='crystals')fireCrystalWave(h);
   else if(!cancelled&&h.projectile){
    createProjectile(h.from.clone().setY(1.44),h.projectile,e,12,0x84edf6);
    const shot=projectiles.at(-1);shot.v.multiplyScalar(.44);shot.life=1.45;shot.crystalColor=0x84edf6;
    if(h.projectile.angleTo(e.attackDir)<.02)cue('shot',h.from);
   }else if(!cancelled){
    const p=player.group.position;
    monsterImpact(h);
    if(p.y<1.3&&hitFootprint(h,p))damagePlayer(h.damage,e,h.charged);
   }
   removeMark(h);run.marks.splice(i,1);
  }
 }
}
function stepEncounter(dt){
 updateGroundFlashes(dt);
 for(const e of enemies)if(e.dead&&e.avatar.group.visible){
  e.collapse=(e.collapse||0)+dt;
  const s=Math.max(.02,1-e.collapse*3.6);
  e.avatar.rig.scale.setScalar(s);
  e.avatar.group.position.y=e.collapse*.45;e.avatar.group.visible=e.collapse<.28;
 }
 if(run.status!=='combat')return;
 stepElementalWaves(dt);tickGifts(dt);tickWarnings(dt);stepTerrain(dt);if(state!=='playing')return;
 const p=player.group.position;
 for(const e of enemies){
  const a=e.avatar,q=a.group.position;
  if(e.dead)continue;
  if(q.y>0){e.vy-=18*dt;q.y=Math.max(0,q.y+e.vy*dt);if(q.y===0)e.vy=0;}
  tickCreatureAnimation(e,dt,e.walking&&e.stagger<=0&&e.windup<=0);e.walking=false;
  if(e.boss&&!e.phaseShift&&e.hp<=e.maxHp*.5)awakenBoss(e);
  if(e.transition>0){e.transition=Math.max(0,e.transition-dt);continue;}
  const frozen=e.frozen>0;
  e.frozen=Math.max(0,e.frozen-dt);e.slow=Math.max(0,e.slow-dt);e.stagger=Math.max(0,e.stagger-dt);e.recoil=Math.max(0,e.recoil-dt);
  e.flinchLock=Math.max(0,e.flinchLock-dt);
  if(frozen||e.stagger>0){
   if(frozen||!e.boss||e.stagger>1||e.windup<=0){e.action=null;e.windup=0;e.charge=false;e.rush=0;}
   continue;
  }
  if(e.windup>0){e.windup-=dt;if(e.windup<=0){
    if(e.action==='rush')e.rush=e.boss?8:4.5;
    e.action=null;e.charge=false;e.recovery=e.boss?.42:.28;
   }continue;}
  if(e.rush>0){
   const distance=Math.min(e.rush,dt*(e.boss?27:21));
   move(a.group,e.attackDir.x*distance,e.attackDir.z*distance,e.boss?1.1:.6);
   e.rush-=distance;continue;
  }
  if(e.recovery>0){e.recovery-=dt;continue;}
  const delta=p.clone().sub(q).setY(0),dist=delta.length(),dir=delta.normalize();
  a.group.rotation.y=Math.atan2(dir.x,dir.z);
  e.cooldown-=dt*(hasAffix(e,'furious')&&e.hp<=e.maxHp*.5&&e.slow<=0?1.6:1);
  const reach=e.boss?(run.act===0?9:16):e.kind==='hound'?4.6:e.kind==='crab'?3.15:14;
  const blocked=obstructed(q,p);
  const pending=run.marks.some(h=>h.owner===e&&!h.cancelled);
  if(e.cooldown<=0&&dist<=reach&&!blocked&&!pending){pattern(e);continue;}
  const speed=(monsters[e.kind].speed+(e.phaseShift?.65:0))*(e.slow>0?.56:1);
  let dx=dir.x,dz=dir.z;
  if(!e.boss&&!blocked&&dist<reach*.82){
   const flank=e.flank||1;
   if(e.kind==='ray'){dx=dir.z*.7*flank-dir.x*.65;dz=-dir.x*.7*flank-dir.z*.65;}
   else if(e.kind==='hound'){dx=dir.z*.92*flank+dir.x*.27;dz=-dir.x*.92*flank+dir.z*.27;}
   else if(dist<reach*.65){dx=0;dz=0;}
  }else if(e.boss&&dist<reach*.36&&!blocked){dx=0;dz=0;}
  if((dx||dz)&&obstructed(q,p,0,.62)){
   const x=Math.round(p.x),z=Math.round(p.z),key=x+','+z;
   if(run.chaseKey!==key){run.chaseKey=key;run.chasePaths=walkField(x,z);}
   const aim=visibleWaypoint(q,closestCell(run.chasePaths,q));
   if(aim){const l=Math.hypot(aim.x-q.x,aim.z-q.z);if(l>.05){dx=(aim.x-q.x)/l;dz=(aim.z-q.z)/l;}}
  }
  for(const other of enemies){if(other===e||other.dead)continue;const op=other.avatar.group.position,ox=q.x-op.x,oz=q.z-op.z,l=Math.hypot(ox,oz);if(l>.01&&l<1.6){dx+=ox/l*(1.6-l);dz+=oz/l*(1.6-l);}}
  const oldX=q.x,oldZ=q.z;move(a.group,dx*speed*dt,dz*speed*dt,.6);e.walking=Math.hypot(q.x-oldX,q.z-oldZ)>.001;
 }
 const aliveCount=enemies.filter(e=>!e.dead).length;
 if(run.waves&&run.waves.length&&aliveCount<=1)spawnNextWave();
 else if(enemies.length&&aliveCount===0)completeChamber();
}
