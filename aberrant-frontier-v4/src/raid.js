const raid={bag:[],credits:0,containers:[],search:null,heal:0,meds:2,signal:false,selectedExit:0,activeExit:null,opened:0,visited:new Set(),utilityCd:0,zones:[],scan:0,noise:0,sprinting:false,velocity:new THREE.Vector3(),strike:null,ghostTimer:0,parries:0,staggers:0,dropSpawned:false,eventAt:120,map:false,hudAt:0,raidNumber:0,extractionWaves:new Set(),contract:0};
try{raid.credits=Math.max(0,Number(localStorage.getItem('aberrant-v4-credits'))||0);}catch{}
const CONTRACTS=[{name:'回收行动',desc:'搜索 4 个物资箱',target:4,reward:380,progress:()=>raid.opened},{name:'区域测绘',desc:'抵达 4 个不同区域',target:4,reward:420,progress:()=>raid.visited.size},{name:'威胁清除',desc:'击败 3 个敌人',target:3,reward:500,progress:()=>kills}];
const UTILITY={ember:{name:'灰烬封线',cd:12},frost:{name:'冰棱陷阱',cd:12},shade:{name:'留影诱饵',cd:14},bastion:{name:'骨垒',cd:14},reaper:{name:'脉冲嗅猎',cd:12}};
function findSpawnPoint(x,z){
 const free=(x,z)=>Math.abs(x)<(rogueMode?15.5:150)&&Math.abs(z)<(rogueMode?14:150)&&!colliders.some(c=>x>c.x-c.w-.7&&x<c.x+c.w+.7&&z>c.z-c.d-.7&&z<c.z+c.d+.7);
 if(free(x,z))return{x,z};
 for(let r=1.5;r<30;r+=1.5)for(let i=0;i<16;i++){const nx=x+Math.cos(i*Math.PI/8)*r,nz=z+Math.sin(i*Math.PI/8)*r;if(free(nx,nz))return{x:nx,z:nz};}
 return{x:0,z:rogueMode?9:40};
}
function clearRaid(){
 advanceBattleEffects(Infinity);raid.opening=null;
 for(const c of raid.containers)c.group.removeFromParent();raid.containers.length=0;
 for(const z of raid.zones)releaseUtilityZone(z);
 raid.zones.length=0;
 if(rogueMode){elementalWaves.length=0;clearMarks();clearRoomTraps();updateGroundFlashes(Infinity);}
 updateTrailFades(trails,trailPool,Infinity);
 updateTrailFades(attackTelegraphs,ringPool,Infinity);
 raid.strike=null;raid.search=null;raid.map=false;raid.heal=0;$('tactical-map')?.classList.add('hidden');$('search-progress')?.classList.add('hidden');
}
function spawnRaider(x,z,type='reaper',weapon='katana',elite=false){
 const safe=findSpawnPoint(x,z);x=safe.x;z=safe.z;spawnEnemy(x,z,type);const e=enemies.at(-1);e.hp=e.maxHp=elite?420:weapon==='hammer'?270:type==='spitter'?135:175;e.weapon=weapon;e.name=elite?'监守者 · 核心携带者':type==='spitter'?'拾荒佣兵 · '+WEAPONS[weapon].short:'游荡异种 · '+WEAPONS[weapon].short;e.elite=elite;e.dodgeCooldown=2;e.dodgeTime=0;e.dodgeDir=new THREE.Vector3();e.guard=0;e.frozen=0;e.slow=0;e.burn=0;e.burnTick=0;e.combatCombo=0;e.charge=false;e.attackDir=new THREE.Vector3();e.home=new THREE.Vector3(x,0,z);e.poise=100;e.recoil=0;equipWeapon(e.avatar,weapon);buildRaiderSilhouette(e.avatar,weapon);contactShadow(e.avatar);if(elite)e.avatar.group.scale.setScalar(1.2);return e;
}
function containerLoot(kind){
 if(kind==='medical')return['med','med','alloy'];
 if(kind==='fuel')return['fuel','circuit'];
 if(kind==='rare')return['relic',rng()>.6?'core':'circuit'];
 if(kind==='drop')return['core','relic','fuel','med'];
 return rng()>.55?['circuit','alloy']:['alloy',rng()>.5?'med':'fuel'];
}
const cacheGeometry=new Map(),cacheMaterial=mat(0xffffff,{vertexColors:true});
function supplyGeometry(part,colour){
 const key=part+colour;
 if(cacheGeometry.has(key))return cacheGeometry.get(key);
 const {positions,faces}=cacheMesh[part];
 const palette=[colour,0x304449,0xf4deb2,0xf4a44b,0x435559].map(hex=>new THREE.Color(hex));
 const xyz=[],rgb=[];
 for(const [slot,a,b,c] of faces){
  const tint=palette[slot];
  for(const index of [a,b,c]){
   xyz.push(positions[index*3],positions[index*3+1],positions[index*3+2]);
   rgb.push(tint.r,tint.g,tint.b);
  }
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(xyz,3));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));geo.computeVertexNormals();
 cacheGeometry.set(key,geo);return geo;
}
function spawnContainer(x,z,kind='supply',contents=null,y=0){
 const group=new THREE.Group();objects.add(group);group.position.set(x,y,z);const color=kind==='rare'||kind==='drop'?0xb3a1dd:kind==='medical'?0x97c1ad:kind==='fuel'?0x80b9c4:0xc99474;
 const body=mesh(supplyGeometry('body',color),cacheMaterial,0,0,0,group);
 const lid=mesh(supplyGeometry('lid',color),cacheMaterial,0,.79,-.45,group);
 const beam=mesh(new THREE.CylinderGeometry(.05,.12,2,5),new THREE.MeshBasicMaterial({color:kind==='rare'?0xc2a9f1:0xf1d4a2,transparent:true,opacity:.22,depthWrite:false}),0,1.5,0,group);beam.castShadow=false;
 const c={group,body,lid,beam,kind,items:contents||containerLoot(kind),opened:false,progress:0,time:kind==='rare'?3.4:kind==='drop'?4.5:1.8};raid.containers.push(c);return c;
}
function populateRaid(){
 Object.assign(raid,{bag:[],search:null,heal:0,meds:2,signal:false,selectedExit:0,activeExit:null,opened:0,utilityCd:0,scan:0,noise:0,sprinting:false,strike:null,opening:null,parries:0,staggers:0,dropSpawned:false,eventAt:120,hudAt:0});raid.velocity.set(0,0,0);raid.visited.clear();raid.extractionWaves.clear();raid.contract=raid.raidNumber++%CONTRACTS.length;
 // Opening supplies teach searching without immediately putting the player in combat.
 for(const [x,z,kind]of [[-3,39,'supply'],[7,32,'medical'],[-20,16,'supply'],[28,17,'supply'],[-34,22,'fuel'],[14,-12,'supply'],[-28,-40,'supply'],[36,-2,'supply'],[-111,60,'medical'],[-127,59,'medical'],[-115,88,'supply'],[-82,99,'supply'],[-113,118,'medical'],[-73,136,'fuel'],[-94,-25,'rare'],[-129,-35,'rare'],[-87,-5,'supply'],[-112,-65,'medical'],[-137,-95,'rare'],[0,-101,'rare'],[-17,-88,'supply'],[12,-122,'fuel'],[38,-82,'rare'],[-38,-125,'supply'],[84,-13,'fuel'],[104,-46,'rare'],[125,-35,'supply'],[138,21,'fuel'],[113,22,'supply'],[104,95,'fuel'],[41,108,'medical'],[72,120,'fuel'],[136,118,'rare'],[89,126,'supply'],[18,92,'supply'],[-23,120,'supply']])spawnContainer(x,z,kind);
 spawnContainer(-96,-30,'rare',['relic','core'],7.3);spawnContainer(110,9,'rare',['relic','circuit'],6.02);
 for(const[x,z,v]of [[2,24,1],[-3,17,1],[2,3,1],[-17,15,2],[7,-9,1],[-3,-20,2],[11,-21,2],[-25,-4,1],[28,4,2],[-21,25,1],[-99,70,2],[-91,-9,2],[5,-83,2],[80,20,2],[73,109,2]])spawnLoot(x,z,v);
 for(const[x,z,t,w,elite]of [[-1,25,'reaper','katana'],[23,-3,'spitter','crossbow'],[-25,-12,'reaper','spear'],[27,-33,'reaper','dual'],[-85,-18,'spitter','rifle'],[-105,-30,'reaper','hammer',1],[-122,-57,'reaper','dual'],[-88,-77,'spitter','crossbow'],[3,-95,'reaper','hammer',1],[-28,-110,'spitter','rifle'],[32,-122,'reaper','spear'],[88,-12,'reaper','katana'],[120,-34,'spitter','crossbow'],[111,23,'reaper','dual'],[101,107,'spitter','rifle'],[73,111,'reaper','spear'],[131,129,'reaper','hammer'],[-111,75,'reaper','katana'],[-77,117,'reaper','dual'],[-37,103,'spitter','crossbow']])spawnRaider(x,z,t,w,!!elite);
 refreshPortrait();
}
function emitNoise(radius){if(state!=='playing')return;raid.noise=Math.max(raid.noise,radius/65);const p=player.group.position;for(const e of enemies)if(!e.dead&&e.avatar.group.position.distanceTo(p)<radius)e.aggro=Math.max(e.aggro,7);}
function onEnemyKilled(e,source){
 if(rogueMode){
  if(e===run.bountyTarget)run.bountyReward=enemies.some(other=>other!==e&&other.dead)?20:48;
  splitCreature(e);
  return;
 }
 if(source==='player'){if(e.elite)spawnContainer(e.avatar.group.position.x,e.avatar.group.position.z,'rare',['core','relic']);else if(rng()>.55)spawnContainer(e.avatar.group.position.x,e.avatar.group.position.z,'supply',[rng()>.5?'circuit':'med']);}
}
function contextExit(e){return exitStatus(e,{time,remaining:gameTime-time,fuel:raid.bag.filter(i=>i==='fuel').length,signal:raid.signal});}
function closestContainer(){let best=null,d=2.6;for(const c of raid.containers){if(!c.items.length)continue;const dist=c.group.position.distanceTo(player.group.position);if(dist<d){best=c;d=dist;}}return best;}
function nearbyExit(){return EXIT_DEFS.find(e=>Math.hypot(e.x-player.group.position.x,e.z-player.group.position.z)<3.5&&player.group.position.y<1.5);}
function atTerminal(){return player.group.position.distanceTo(new THREE.Vector3(-87,0,-8))<3;}
function interact(){
 if(state!=='playing'||raid.map)return;
 const c=closestContainer();
 if(c){if(c.opened){takeContainer(c);return;}raid.search={type:'container',target:c,progress:0,duration:c.time};raid.heal=0;cancelStrike();return;}
 if(atTerminal()&&!raid.signal){raid.search={type:'terminal',progress:0,duration:4};return;}
 if(nearestLoot){nearestLoot.collected=true;objects.remove(nearestLoot.group);biomass+=nearestLoot.value;totalCollected+=nearestLoot.value;particlesAt(nearestLoot.group.position.clone().add(new THREE.Vector3(0,1,0)),0xffd389,12,2);audioTone(500,.2,'sine',.04,1.6);toast('异变基因 +'+nearestLoot.value+' · R 可强化本局战力');nearestLoot=null;return;}
 const e=nearbyExit();if(e){const status=contextExit(e);if(!status.open){toast(e.name+' · '+status.label);return;}raid.activeExit=e;extracting=.01;raid.search=null;emitNoise(52);toast(e.name+' · 撤离信号已暴露，坚持 '+e.hold+' 秒');
  if(!raid.extractionWaves.has(e.id)){raid.extractionWaves.add(e.id);for(const a of [-1,1]){const x=clamp(e.x+a*15,-146,146),z=clamp(e.z+(e.z>100?-21:19),-146,146);const guard=spawnRaider(x,z,'reaper',a<0?'katana':'spear');guard.aggro=25;}}
 }
}
function takeContainer(c){let value=0,count=0;const left=[];for(const id of c.items){if(canCarry(raid.bag,id)){raid.bag.push(id);value+=ITEM_DEFS[id].value;count++;}else left.push(id);}c.items=left;c.beam.visible=left.length>0;raid.search=null;audioTone(620,.14,'sine',.05,1.7);toast(count?'收获 '+count+' 件物资 · 价值 '+value+(left.length?' · 背包已满，余物保留箱内':''):'背包空间不足 · M 查看背包，H 可消耗治疗物资');}
function heal(){if(state!=='playing'||raid.heal>0)return;if(hp>=maxHp){toast('生命已满');return;}if(!raid.bag.includes('med')&&raid.meds<=0){toast('没有治疗物资 · 花园医疗站可补充');return;}raid.heal=2.4;raid.search=null;cancelStrike();toast('正在注射 · 受击会中断');}
function updateRaidInteractions(dt){if(rogueMode)return expeditionPrompt();
 const c=closestContainer(),e=nearbyExit(),terminal=atTerminal()&&!raid.signal;
 $('prompt').classList.toggle('hidden',!c&&!e&&!nearestLoot&&!terminal||extracting>0||raid.map);
 if(c){$('prompt-title').textContent=c.opened?'拾取剩余物资 · '+c.items.length+' 件':'按住 F 搜索 · '+({medical:'医疗补给',fuel:'能源储箱',rare:'封存密匣',drop:'空投补给'}[c.kind]||'废墟物资');$('prompt-detail').textContent=c.opened?'空间不足的物资保留在原处':c.time+' 秒搜寻 · 松开或移动即中断';}
 else if(terminal){$('prompt-title').textContent='按住 F 激活通讯终端';$('prompt-detail').textContent='连接 4 秒 · 解锁西北救援坪';}
 else if(nearestLoot){$('prompt-title').textContent='异变基因 +'+nearestLoot.value;$('prompt-detail').textContent='用于本局进化 · 不占物资背包';}
 else if(e){$('prompt-title').textContent=e.name+' · '+contextExit(e).label;$('prompt-detail').textContent=contextExit(e).open?'F 发起撤离 · '+e.hold+' 秒 · 离开 / 受击中断':e.brief;}
 if(raid.search){const s=raid.search,valid=s.type==='container'?c===s.target:terminal;if(!input.KeyF||!valid||playerMotion.length()>1||mouseDown){raid.search=null;}else{s.progress+=dt;if(s.progress>=s.duration){if(s.type==='terminal'){raid.signal=true;raid.search=null;emitNoise(60);toast('通讯上线 · 研究所救援坪已开放');}else{s.target.opened=true;s.target.lid.rotation.x=-1.15;raid.opened++;takeContainer(s.target);emitNoise(14);}}}}
 if(extracting>0&&raid.activeExit){const active=raid.activeExit,step=extractAdvance(extracting,dt,{inside:e===active,open:contextExit(active).open,damaged:false,hold:active.hold});extracting=step.progress;if(!extracting)toast('撤离中断 · 离开区域或窗口关闭');$('extract-progress').querySelector('i').style.width=Math.min(100,extracting/active.hold*100)+'%';$('extract-progress').querySelector('span').textContent=active.name+' · '+Math.max(0,Math.ceil(active.hold-extracting))+' 秒';if(step.complete){if(active.kind==='fuel'){const i=raid.bag.indexOf('fuel');if(i>=0)raid.bag.splice(i,1);}finish(true);}}
 $('extract-progress').classList.toggle('hidden',extracting<=0);
 const progress=raid.search?raid.search.progress/raid.search.duration:raid.heal>0?1-raid.heal/2.4:0;$('search-progress').classList.toggle('hidden',!raid.search&&raid.heal<=0);$('search-progress').querySelector('i').style.width=progress*100+'%';$('search-progress').querySelector('span').textContent=raid.heal>0?'急救注射中':'正在搜寻 / 保持 F';
}
function updateRaid(dt){
 raid.utilityCd=Math.max(0,raid.utilityCd-dt);raid.scan=Math.max(0,raid.scan-dt);raid.noise=Math.max(0,raid.noise-dt*.4);
 const p=player.group.position,district=districtAt(p.x,p.z);if(!rogueMode&&!raid.visited.has(district.id)){raid.visited.add(district.id);$('area-banner').innerHTML='<small>'+district.en+'</small><b>'+district.name+'</b><span>'+['','安全边缘','交战区域','高价值 · 高风险'][district.risk]+'</span>';$('area-banner').classList.remove('show');void $('area-banner').offsetWidth;$('area-banner').classList.add('show');}
 if(raid.heal>0){raid.heal-=dt;if(raid.heal<=0){const index=raid.bag.indexOf('med');if(index>=0)raid.bag.splice(index,1);else raid.meds--;hp=Math.min(maxHp,hp+80);toast('急救完成 · 恢复 80 生命');audioTone(480,.3,'sine',.04,1.4);}}
 if(!rogueMode&&time>85&&!raid.dropSpawned){raid.dropSpawned=true;spawnContainer(35,68,'drop');toast('补给空投抵达 · 中央南路 [35, 68]');for(const dx of [-12,12]){const e=spawnRaider(35+dx,47,'reaper',dx<0?'hammer':'dual');e.home.set(35,0,68);}ringAt(new THREE.Vector3(35,.1,68),0xe4c071,10,1);}
 if(!rogueMode&&time>raid.eventAt){raid.eventAt+=125;const alive=enemies.filter(e=>!e.dead).length;if(alive<28){const district=DISTRICTS[Math.floor(rng()*DISTRICTS.length)];const e=spawnRaider(district.x+15,district.z+15,'spitter','crossbow');e.home.set(district.x,0,district.z);toast('无线电：'+district.name+' 发现拾荒增援');}}
 const remaining=gameTime-time;if(!rogueMode&&remaining<150){const radius=95+(remaining/150)*115;if(Math.hypot(p.x,p.z)>radius&&Math.floor(time)!==raid.stormTick){raid.stormTick=Math.floor(time);damagePlayer(3);toast('污染正在收拢 · 向内移动或立即撤离');}}
 for(let i=raid.zones.length-1;i>=0;i--){const z=raid.zones[i];z.life-=dt;z.tick-=dt;
  if(z.footprint)updateElementZone(z);
  else{
   z.mesh.material.opacity=Math.min(.32,z.life*.2);
   if(z.tick<=0){z.tick=.55;for(const enemy of enemies){if(enemy.dead||enemy.avatar.group.position.distanceTo(z.pos)>z.radius)continue;if(z.kind==='ember'){damageEnemy(enemy,12,'fire');enemy.burn=2;}if(z.kind==='frost'){enemy.frozen=enemy.boss?.2:.8;enemy.slow=2;}if(z.kind==='shade'){enemy.aggro=0;enemy.stagger=Math.max(enemy.stagger,.6);}if(z.kind==='bastion'){enemy.slow=1;enemy.stagger=Math.max(enemy.stagger,.2);}}}
  }
  if(z.kind==='bastion'&&p.distanceTo(z.pos)<z.radius)shieldTime=Math.max(shieldTime,.18);
  if(z.life<=0){releaseUtilityZone(z);raid.zones.splice(i,1);}
 }
 sun.position.set(p.x-28,55,p.z-38);sun.target.position.set(p.x,0,p.z);sun.target.updateMatrixWorld();
}
function releaseUtilityZone(zone){
 if(zone.footprint)releaseFootprint(zone.mesh);else ringPool.release(zone.mesh);
}
function updateElementZone(z){
 z.mesh.material.uniforms.amount.value=Math.min(.70,Math.max(.06,z.life*.50));
 if(z.tick>0||z.life<=0)return;
 const fire=z.kind==='ember';
 z.tick=fire?.47:.81;
 const at=z.pos.clone().setY(.18);
 if(fire){
  const angle=z.flareIndex++*.618;
  at.copy(z.footprint.from).lerp(z.footprint.to,angle%1);at.y=.22;
  drawTrail(at,at.clone().add(new THREE.Vector3(.25,1.15,-.24)),0xffa34c,.23,.09);
  particlesAt(at,0xff8745,6,2.5);
 }else pulseAt(at,z.radius,0x79d7ee);
 for(const e of enemies){
  const p=e.avatar.group.position;
  if(e.dead||p.y>1.15||!hitFootprint(z.footprint,p)||obstructed(z.pos,p))continue;
  if(fire){damageEnemy(e,10,'fire',null,{stagger:0});e.burn=2.6;continue;}
  if(z.frozen.has(e)){e.slow=Math.max(e.slow,.95);continue;}
  z.frozen.add(e);e.frozen=e.boss?.34:1.35;e.slow=2.8;
  if(rank('whiteout'))damageEnemy(e,18,'player',null,{echo:true,stagger:.05});
  impactSpray(p.clone().setY(.8),0x9beeff,true);cue('ice',p);
 }
}
function useUtility(){
 if(state!=='playing'||raid.utilityCd>0)return;const ability=UTILITY[chosenClass];raid.utilityCd=ability.cd;if(rogueMode)castGift('utility');cancelStrike();emitNoise(18);const p=player.group.position.clone(),forward=new THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw));
 if(chosenClass==='reaper'){raid.scan=10;if(rogueMode)markPrey(p,16,2);
  if(rogueMode)showSkillCast('utility',p);
  toast(rogueMode?'脉冲嗅猎 · 16 米内猎物叠两层裂伤':'脉冲嗅猎 · 10 秒内标出周围敌人与资源');ringAt(p,heroNow().color,16,1);return;}
 const distance=rogueMode?sceneIntersection(p.clone().setY(.45),forward,4.75,false).distance:4;
 const center=p.addScaledVector(forward,chosenClass==='shade'?0:rogueMode?Math.max(0,distance-.65):4);center.y=.08;
 if(rogueMode&&(chosenClass==='ember'||chosenClass==='frost')){
  const fire=chosenClass==='ember',side=new THREE.Vector3(forward.z,0,-forward.x);
  const footprint={kind:fire?'line':'disc',from:center.clone().addScaledVector(side,fire?-3.8:0),
   to:center.clone().addScaledVector(side,fire?3.8:0),width:fire?1.15:3.25,continuousFloor:true};
  const m=floorFootprint(footprint.kind,footprint.from,footprint.to,footprint.width,fire?0xff9a43:0x70d9fa);
  raid.zones.push({pos:center,mesh:m,kind:chosenClass,radius:footprint.width,life:fire?6:5+rank('whiteout')*2,tick:.24,footprint,flareIndex:0,frozen:new Set()});
  showSkillCast('utility',center).rotation.y=Math.atan2(forward.x,forward.z);
  toast(fire?'灰烬封线 · 横向火墙持续灼烧':'冰棱陷阱 · 冻结首次踏入的敌人');cue(fire?'fire':'ice',center);return;
 }
 if(rogueMode)showSkillCast('utility',center);
 const radius=chosenClass==='bastion'?3.2:chosenClass==='shade'?6:4.5;
 const m=zoneMarker(center,radius,heroNow().color);
 raid.zones.push({pos:center,mesh:m,kind:chosenClass,radius,life:chosenClass==='shade'?5:7,tick:0});
 if(chosenClass==='shade'){empowered=5;invulnerable=.4;ringAt(center.clone().add(new THREE.Vector3(0,1,0)),heroNow().color,2,1,true);}
 toast(ability.name+' · '+({ember:'持续灼烧区域',frost:'区域冻结与减速',shade:'相位诱饵干扰附近敌人',bastion:'圈内减伤，阻滞近身敌人'}[chosenClass]));audioTone(260,.25,'triangle',.04,1.7);
}
function cycleExit(){raid.selectedExit=(raid.selectedExit+1)%EXIT_DEFS.length;toast('导航目标 · '+EXIT_DEFS[raid.selectedExit].name);}
function toggleTacticalMap(){raid.map=!raid.map;$('tactical-map').classList.toggle('hidden',!raid.map);if(raid.map){mouseDown=mouseRight=false;chargeTime=0;raid.search=null;cancelStrike();renderTacticalDetails();} }
function settleRaid(success){
 raid.map=false;$('tactical-map').classList.add('hidden');raid.search=null;raid.heal=0;const contract=CONTRACTS[raid.contract],bonus=contract.progress()>=contract.target?contract.reward:0,value=bagValue(raid.bag);
 if(success){raid.credits+=value+bonus;try{localStorage.setItem('aberrant-v4-credits',String(raid.credits));}catch{}}
 $('result-desc').textContent=success?'从'+(raid.activeExit?.name||'猎场')+'撤离。物资已结算进入仓库。':'携带物资与本局基因全部遗失。调整路线，准备下一次远征。';
 $('raid-result').innerHTML='<div><small>'+(success?'物资结算':'遗失物资')+'</small><b>¤ '+value+'</b></div><div><small>委托奖励</small><b>¤ '+(success?bonus:0)+'</b></div><div><small>破势 / 完美反制</small><b>'+raid.staggers+' / '+raid.parries+'</b></div><p>仓库资产 ¤ '+raid.credits+' · 搜索 '+raid.opened+' 箱 · 探索 '+raid.visited.size+' / 6 区域</p>';
 if($('credit-value'))$('credit-value').textContent=raid.credits;
}
