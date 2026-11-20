const chapterSizes=[7,8,8],expeditionLength=chapterSizes.reduce((sum,n)=>sum+n,0);
const run={marks:[],gifts:{},random:seededRoll('menu')};
const roomTypes={fight:'交战',elite:'精英',trial:'双系试炼',event:'回响祭坛',camp:'行商营地',shop:'整备站',boss:'区域首领'};
const regionArt=['daybreak','dock','garden'],bossArt=['warden','carrier','crown'];
const echoImage=id=>assetURL('echo-'+(giftById[id]?.art||id)+'.webp');
function echoIllustration(id,label,css){
 return '<img class="'+css+'" src="'+echoImage(id)+'" alt="'+label+'">';
}
function updateFoePortrait(foe){
 const id=foe.boss?bossArt[run.act]:foe.kind,img=$('rg-foe-portrait');
 if(img.dataset.art!==id){img.dataset.art=id;img.src=echoImage(id);img.alt=foe.name;}
}
const roomNow=()=>run.deck[run.index];
const distanceToGate=()=>{
 if(branchGates.length){
  const g=nearestGate();if(g)return Math.hypot(player.group.position.x-g.x,player.group.position.z-g.z);
 }
 return Math.hypot(player.group.position.x-exitPoint.x,player.group.position.z-exitPoint.z);
};
function nearestGate(){
 if(!branchGates.length)return null;
 let best=null,bd=Infinity;
 for(const g of branchGates){
  const d=Math.hypot(player.group.position.x-g.x,player.group.position.z-g.z);
  if(d<bd){bd=d;best=g;}
 }
 return best;
}
const record={best:0,wins:0,depth:0};
try{
 const saved=JSON.parse(localStorage.getItem('aberrant-echo-record')||'{}');
 const valid=n=>Number.isSafeInteger(n)&&n>=0;
 record.best=valid(saved.best)?Math.min(expeditionLength,saved.best):0;
 record.wins=valid(saved.wins)?saved.wins:0;
 record.depth=valid(saved.depth)?Math.min(3,saved.depth):record.wins?1:0;
}catch{}
const meta={shards:0,mirror:{},completed:[],claimed:[],metrics:{dashStrike:0,parry:0}};
try{
 const savedMeta=JSON.parse(localStorage.getItem('aberrant-echo-meta')||'{}');
 if(Number.isFinite(savedMeta.shards)&&savedMeta.shards>=0)meta.shards=Math.trunc(savedMeta.shards);
 if(savedMeta.mirror&&typeof savedMeta.mirror==='object')meta.mirror=savedMeta.mirror;
 if(Array.isArray(savedMeta.completed))meta.completed=savedMeta.completed;
 if(Array.isArray(savedMeta.claimed))meta.claimed=savedMeta.claimed;
 if(savedMeta.metrics&&typeof savedMeta.metrics==='object')Object.assign(meta.metrics,savedMeta.metrics);
}catch{}
function saveMeta(){try{localStorage.setItem('aberrant-echo-meta',JSON.stringify(meta));}catch{}}
function mirrorLevel(id){return Math.max(0,Number(meta.mirror[id])||0);}
function awardShards(n){
 if(!n)return;
 meta.shards+=n;run.shardsEarned=(run.shardsEarned||0)+n;saveMeta();
 if($('rg-shard-count'))$('rg-shard-count').textContent=String(meta.shards);
}
function unlockProphecy(id){
 if(meta.completed.includes(id))return;
 const p=prophecies.find(x=>x.id===id);if(!p)return;
 meta.completed.push(id);saveMeta();
 cue('prophecy');
 toast('预言达成 · '+p.name+'（可在圣所领取 '+p.reward+' 残片）');
 if(typeof calloutAt==='function'&&state==='playing')calloutAt(player.group.position,'预言达成 · '+p.name,'gold');
 updateSanctuaryBadges();
}
function noteProphecyMetric(metric){
 meta.metrics[metric]=(meta.metrics[metric]||0)+1;saveMeta();
 if(metric==='dashStrike'&&meta.metrics.dashStrike>=10)unlockProphecy('dash_strike_10');
 if(metric==='parry'&&meta.metrics.parry>=3)unlockProphecy('parry_3');
}
function updateSanctuaryBadges(){
 if($('rg-shard-count'))$('rg-shard-count').textContent=String(meta.shards);
 const pending=meta.completed.filter(id=>!meta.claimed.includes(id)).length;
 if($('rg-prophecy-badge'))$('rg-prophecy-badge').textContent=pending?' ('+pending+' 可领)':'';
}
function seededRoll(seed){
 let value=2166136261;
 for(const letter of seed)value=Math.imul(value^letter.charCodeAt(0),16777619);
 return ()=>{
  value=(value+0x6d2b79f5)>>>0;
  let mix=Math.imul(value^(value>>>15),value|1);
  mix^=mix+Math.imul(mix^(mix>>>7),mix|61);
  return ((mix^(mix>>>14))>>>0)/4294967296;
 };
}
const contracts={
 glass:{name:'薄壳誓约',desc:'本局直接伤害提高 30%，立即失去 35 点最大生命。'},
 clock:{name:'逆时誓约',desc:'本局技能冷却缩短 25%，受到的伤害提高 25%。'},
};
function buildChapter(){
 run.random=seededRoll(run.seed+'/chapter/'+run.act);
 const middle=shuffled(['fight','elite','event']);if(run.act>0)middle.splice(2,0,'camp');middle.push('fight');
 const layouts=shuffled([0,1,2,3]);let fight=0;
 return ['fight',...middle,'shop','boss'].map(type=>{
  const layout=type==='fight'||type==='elite'?layouts[fight++]:0;
  return {type,layout,name:type==='camp'?'行商营地':type==='boss'?acts[run.act].bossRoom:type==='shop'?'首领前哨':type==='event'?'回响祭坛':acts[run.act].rooms[layout]};
 });
}
function startExpedition(){
 clearMarks();clearMagnetOrbs();
 run.seed=$('rg-seed').value.trim().slice(0,32)||Math.random().toString(36).slice(2,10);
 run.unlockedDepth=record.depth;run.depth=clamp(Math.trunc($('rg-depth').value)||0,0,record.depth);
 run.startLoadout=[...loadout];run.contracts=[];run.mods={};run.comboTime=-1;
 const bonusHp=mirrorLevel('vitality')*15;
 maxHp=heroNow().hp+bonusHp;hp=maxHp;
 dashCharges=maxDashCharges();dashRecharge=0;dashStrikeWindow=0;inputBuffer=null;slowMo=0;lockTarget=null;bossIntroTime=0;
 Object.assign(run,{act:0,index:0,roomsCleared:0,shadeClears:0,gifts:{},coins:[0,25,55][mirrorLevel('startCoins')]||0,shardsEarned:0,focus:null,charge:0,primed:false,echoes:[],offers:[],panel:'',redraw:1+mirrorLevel('extraRedraw'),bountyPending:false,revives:mirrorLevel('revive'),roomReward:'boon',roomSchool:null,draftsLeft:0,pendingBranch:null,waves:[],trialSchool:null});
 Object.assign(run,{trackedGift:null,treeTab:'routes',bolts:0,twinTarget:null,armedStudy:null,treeFromDraft:false,power:0,roleNote:'',roleNoteUntil:0,glideAt:0,quenchAt:0});
 Object.assign(raid,{bag:[],meds:2,utilityCd:0,scan:0,noise:0,parries:0,staggers:0});run.deck=buildChapter();
 $('rg-panel').classList.add('hidden');enterChamber();
}
function enterChamber(){
 run.random=seededRoll(run.seed+'/room/'+run.act+'/'+run.index);
 const roomSeed=run.seed+'/room/'+run.act+'/'+run.index;
 visualRoll=seededRoll(roomSeed+'/visual');noiseRoll=seededRoll(roomSeed+'/audio');
 run.drawNumber=0;run.tabRolls={};
 const room=roomNow(),safe=['event','shop','camp'].includes(room.type);
 clearTransient();clearMagnetOrbs();run.echoes=[];run.offers=[];run.twinTarget=null;run.panel='';run.chaseKey=null;run.status=safe?'exit':'combat';
 run.bountyTarget=null;run.bountyReward=0;run.shopBought=false;run.shopDraft=false;run.retraining=null;run.pendingBranch=null;run.draftsLeft=0;
 lockTarget=null;dashCharges=maxDashCharges();dashRecharge=0;dashStrikeWindow=0;
 if(room.reward)run.roomReward=room.reward;else run.roomReward=room.type==='boss'?'boss':room.type==='elite'?'elite':room.type==='trial'?'trial':'boon';
 run.roomSchool=room.school||null;
 setChamber(run.act,room.layout,safe,room.type==='boss');
 player.group.position.set(0,0,9);player.group.rotation.y=Math.PI;yaw=0;pitch=.22;grounded=true;
 velocityY=dodgeTime=chargeTime=0;damageFlash=0;$('damage-flash').style.opacity=0;input={};mouseDown=mouseRight=false;grappleTarget=null;raid.velocity.set(0,0,0);
 camera.position.copy(player.group.position).add(new THREE.Vector3(1.05,3.55,8.1));
 hp=Math.min(maxHp,hp+[0,7,12][rank('spring')]);if(safe)lightGate();else spawnRoomEnemies(room);
 if(run.bountyPending&&(room.type==='fight'||room.type==='elite'||room.type==='trial')){
  run.bountyPending=false;
  const kind=['hound','ray','bloom'][run.act];
  const target=summon(kind,0,-11,{elite:true});
  target.name='悬赏 · '+target.name;
  run.bountyTarget=target;
 }
 scene.updateMatrixWorld(true);updateCamera(1/60);
 $('area-banner').innerHTML='<small>'+acts[run.act].en+'　/　'+(run.index+1)+' · '+run.deck.length+'</small><b>'+room.name+'</b><span>'+roomTypes[room.type]+(room.label?' · '+room.label:'')+'</span>';
 $('area-banner').classList.remove('show');void $('area-banner').offsetWidth;$('area-banner').classList.add('show');
 if(room.type==='boss'&&$('rg-boss-intro')){
  const intro=$('rg-boss-intro');
  intro.innerHTML='<small>ACT '+(run.act+1)+' · AREA GUARDIAN</small><b>'+acts[run.act].boss+'</b><span>'+acts[run.act].name+' · '+acts[run.act].bossRoom+'</span>';
  intro.classList.remove('show');void intro.offsetWidth;intro.classList.add('show');
 }
 expeditionHUD();expeditionPrompt();
}
function buildBranchOptions(){
 if(run.index>=run.deck.length-1){
  return [{kind:'advance',label:run.act===2?'穿越回响 · 终章':'下一幕 · '+acts[run.act+1].name,sub:'区域首领已击败',color:'#ffe29a',hex:0xffd878}];
 }
 const next=run.deck[run.index+1];
 if(next.type==='boss')return [{kind:'boss',label:'👑 '+acts[run.act].boss,sub:'区域首领决战',color:'#ff9678',hex:0xff6d4d}];
 if(next.type==='shop')return [{kind:'shop',label:'🛒 首领前整备站',sub:'商店 · 武器改装 · 补给',color:'#f0cb86',hex:0xf0cb86}];
 // Offer 2 or 3 Hades-style branching doors for the upcoming chamber!
 const roll=seededRoll(run.seed+'/doors/'+run.act+'/'+run.index);
 const schoolKeys=shuffled(Object.keys(schools),roll);
 const candidates=[
  {kind:'school',school:schoolKeys[0],type:next.type,label:schools[schoolKeys[0]].mark+' · '+schools[schoolKeys[0]].name+'回响',sub:'通关必出'+schools[schoolKeys[0]].name+'流派',color:schools[schoolKeys[0]].color,hex:schools[schoolKeys[0]].hex},
  {kind:'school',school:schoolKeys[1],type:next.type,label:schools[schoolKeys[1]].mark+' · '+schools[schoolKeys[1]].name+'回响',sub:'通关必出'+schools[schoolKeys[1]].name+'流派',color:schools[schoolKeys[1]].color,hex:schools[schoolKeys[1]].hex},
  hammerBook().length?{kind:'hammer',type:'fight',label:'⚒ 武器质变锻炉',sub:'重塑武器招式形态',color:'#ffcf75',hex:0xffb84d}:{kind:'vitality',type:'fight',label:'♥ 生命圣泉',sub:'最大生命 +25 并回复',color:'#9df0c3',hex:0x7ae8b2},
  {kind:'trial',type:'trial',label:'⚖ 双系试炼房',sub:'高危挑战 · 双倍高稀有回响',color:'#d8a8ff',hex:0xc388ff},
  {kind:'coins',type:'fight',label:'◈ 晶片宝库',sub:'通关额外 +55 晶片与残片',color:'#f5d484',hex:0xf0c869},
  {kind:'event',type:'event',label:'✧ 回响祭坛',sub:'随机奇遇 · 契约与熔炉',color:'#d6b3f0',hex:0xc59be8}
 ];
 const picks=[candidates[0]];
 if(next.type==='event')picks.push(candidates[5]);
 else if(next.type==='elite')picks.push({kind:'elite',type:'elite',label:'☠ 精英双赏房',sub:'强敌压阵 · 连抽两次回响',color:'#ffb27d',hex:0xff9659});
 else picks.push(candidates[2]);
 picks.push(roll()<.5?candidates[1]:candidates[3]);
 return picks.slice(0,3);
}
function lightGate(){
 exitTop.material=mint;exitBase.material=chamberMat(0x69d5b5);
 exitSeal.visible=false;for(const band of exitBands)band.material=mint;
 if(!gateChevronGeometry){
  const shape=new THREE.Shape();shape.moveTo(0,-.54);shape.lineTo(.66,.18);shape.lineTo(.46,.39);shape.lineTo(0,-.05);shape.lineTo(-.46,.39);shape.lineTo(-.66,.18);shape.closePath();
  gateChevronGeometry=new THREE.ShapeGeometry(shape);
 }
 buildBranchGates(buildBranchOptions());
 buildExitTrail();updateExitTrail();
 if(branchGates.length<=1){
  const badge=mesh(crystalGeo,mint,0,5.5,0,exitGroup);badge.scale.set(.34,.55,.34);
 }
}
let gateChevronGeometry;
const gateArrowMaterial=new THREE.MeshBasicMaterial({color:0x228e74,side:THREE.DoubleSide});
function walkField(goalX,goalZ){
 const key=(x,z)=>x+','+z;
 const open=(x,z)=>Math.abs(x)<=15&&Math.abs(z)<=14&&!colliders.some(c=>Math.abs(c.x-x)<c.w+.72&&Math.abs(c.z-z)<c.d+.72);
 let goal={x:goalX,z:goalZ,next:null};
 if(!open(goalX,goalZ)){let best=Infinity;for(let x=-15;x<=15;x++)for(let z=-14;z<=14;z++){const d=(x-goalX)**2+(z-goalZ)**2;if(d<best&&open(x,z)){goal={x,z,next:null};best=d;}}}
 const queue=[goal],cells=new Map([[key(goal.x,goal.z),goal]]);
 for(let i=0;i<queue.length;i++){
  const next=queue[i];
  for(const [dx,dz] of [[0,1],[1,0],[-1,0],[0,-1]]){
   const x=next.x+dx,z=next.z+dz,k=key(x,z);
   if(cells.has(k)||!open(x,z))continue;
   const cell={x,z,next};cells.set(k,cell);queue.push(cell);
  }
 }
 return cells;
}
function buildExitTrail(){
 run.paths=walkField(0,-13);run.pathArrows=[];
 for(let i=0;i<18;i++){const m=mesh(gateChevronGeometry,gateArrowMaterial,0,.07,0,roomGroup);m.castShadow=false;m.rotation.order='YXZ';m.rotation.x=Math.PI/2;run.pathArrows.push(m);}
}
function closestCell(paths,p){
 let cell=paths.get(Math.round(p.x)+','+Math.round(p.z));
 if(!cell){let best=Infinity;for(const c of paths.values()){const d=(c.x-p.x)**2+(c.z-p.z)**2;if(d<best){best=d;cell=c;}}}
 return cell;
}
function visibleWaypoint(p,cell){
 let aim=cell;
 for(let c=cell?.next;c;c=c.next){if(obstructed(p,c,0,.61))break;aim=c;}
 return aim;
}
function updateExitTrail(){
 let cell=closestCell(run.paths,player.group.position);
 run.pathCell=cell;
 for(const arrow of run.pathArrows){
  cell=cell?.next;arrow.visible=!!cell?.next;if(!arrow.visible)continue;
  arrow.position.set(cell.x,.07,cell.z);arrow.rotation.y=Math.atan2(cell.x-cell.next.x,cell.z-cell.next.z);cell=cell.next;
 }
}
function completeChamber(){
 if(run.status!=='combat')return;
 run.status='exit';run.roomsCleared++;const type=roomNow().type;
 if(chosenClass==='shade'){run.shadeClears=(run.shadeClears||0)+1;if(run.shadeClears>=3)unlockProphecy('shade_run');}
 run.coins+=type==='boss'?45:type==='elite'||type==='trial'?32:18;
 if(run.roomReward==='coins'){run.coins+=55;awardShards(6);}
 if(run.roomReward==='vitality'){maxHp+=25;hp=Math.min(maxHp,hp+40);calloutAt(player.group.position,'生命上限 +25','dash');}
 const mirrorHeal=mirrorLevel('roomHeal')*6;
 if(mirrorHeal)hp=Math.min(maxHp,hp+mirrorHeal);
 if(ordinarySupply())hp=Math.min(maxHp,hp+8);
 run.coins+=run.bountyReward;
 const clearShards=type==='boss'?(20+run.act*10):type==='elite'||type==='trial'?8:3;
 awardShards(clearShards);
 if(type==='boss'){
  hp=Math.min(maxHp,hp+35);
  if(run.act===0)unlockProphecy('first_clear_act1');
  if(run.act===1)unlockProphecy('first_clear_act2');
 }
 if(type==='trial')unlockProphecy('trial_win');
 clearMarks();clearRoomTraps();clearProjectiles();
 lightGate();cue('clear');
 const rewardHint=run.roomReward==='hammer'?'锻炉开启 · 选择下一扇门领取武器质变':run.roomReward==='vitality'?'生命上限 +25 · 选择下一扇门':run.roomReward==='coins'?'宝库 +55 晶片 · 选择下一扇门':'清场完成 · 残片 +'+clearShards+' · 选择下一扇门';
 toast((run.bountyReward?'悬赏 +'+run.bountyReward+' 晶片　·　':'')+rewardHint);expeditionHUD();expeditionPrompt();
}
function ordinarySupply(){return false;}
function currentTarget(){
 if(run.status==='exit'){
  const g=nearestGate();
  return g?{pos:g.pos,name:g.choice.label,exit:true,height:5.4}:{pos:exitPoint,name:'出口',exit:true,height:4.8};
 }
 if(run.bountyTarget&&!run.bountyTarget.dead)return {pos:run.bountyTarget.avatar.group.position,name:run.bountyTarget.name,exit:false,height:3.1};
 let target=null,dist=Infinity;
 for(const enemy of enemies){if(enemy.dead)continue;const d=enemy.avatar.group.position.distanceToSquared(player.group.position);
  if(d<dist){target=enemy;dist=d;}}
 return target?{pos:target.avatar.group.position,name:target.name,exit:false,height:target.boss?5:2.65}:null;
}
function expeditionPrompt(){
 const near=run.status==='exit'&&distanceToGate()<3.55;
 $('prompt').classList.toggle('hidden',!near);
 if(near){
  const type=roomNow().type,g=nearestGate();
  const nextLabel=g?g.choice.label:'下一室';
  $('prompt-title').textContent=type==='camp'?'拜访行商营地':type==='shop'?'进入整备站':type==='event'?'触碰祭坛':run.act===2&&type==='boss'?'穿越终章之门':'前往 · '+nextLabel;
  $('prompt-detail').textContent='F　'+(run.roomReward==='hammer'?'领取武器质变并进入':type==='boss'&&run.act<2?'领取回响并进入下一幕':(g?.choice?.sub||'领取回响并进入'));
 }
}
function markerPosition(target){
 camera.updateMatrixWorld();const p=target.pos.clone();p.y+=target.height;
 const pos=player.group.position,bearing=Math.atan2(target.pos.x-pos.x,-(target.pos.z-pos.z))-yaw;
 const local=p.clone().applyMatrix4(camera.matrixWorldInverse),v=p.project(camera);
 if(Math.cos(bearing)>0&&local.z<0&&Math.abs(v.x)<.92&&v.y>-.66&&v.y<.69)return {x:clamp(50+50*v.x,7,93),y:49-50*v.y,edge:false,angle:0};
 const dx=Math.sin(bearing),dy=-Math.cos(bearing),scale=1/Math.max(Math.abs(dx),Math.abs(dy),.001);
 const x=50+dx*scale*40;
 let y=47+dy*scale*28;
 if(x<25||x>75)y=Math.max(y,Math.min(44,100*245/innerHeight));
 return {x,y,edge:true,angle:Math.atan2(dx,-dy)};
}
function drawChamberMap(){
 const s=4.5,at=n=>90+n*s;map.clearRect(0,0,180,180);map.fillStyle='#203d48';map.fillRect(0,0,180,180);
 map.fillStyle='#91a6a0';for(const c of colliders)map.fillRect(at(c.x-c.w),at(c.z-c.d),2*c.w*s,2*c.d*s);
 for(const trap of roomTraps){
  map.fillStyle=trap.mark?'#ffd079':'#9e805f';
  if(trap.kind==='line')map.fillRect(at(trap.from.x-trap.width),at(trap.from.z),trap.width*2*s,(trap.to.z-trap.from.z)*s);
  else{map.beginPath();map.arc(at(trap.from.x),at(trap.from.z),trap.width*s,0,2*Math.PI);map.fill();}
 }
 map.fillStyle=run.status==='exit'?'#95ffcf':'#8d9294';map.fillRect(at(exitPoint.x)-8,at(exitPoint.z)-3,16,6);
 for(const e of enemies){if(e.dead)continue;const p=e.avatar.group.position;map.beginPath();map.arc(at(p.x),at(p.z),e.boss?6:3.7,0,Math.PI*2);map.fillStyle=e.elite||e.boss?'#ffd27a':'#ff907c';map.fill();}
 const p=player.group.position;map.save();map.translate(at(p.x),at(p.z));map.rotate(yaw);map.beginPath();map.moveTo(0,-7);map.lineTo(4.5,5);map.lineTo(0,3);map.lineTo(-4.5,5);map.closePath();map.fillStyle='#fff4dc';map.fill();map.restore();
}
function expeditionHUD(){
 if(!run.deck)return;
 const room=roomNow(),count=enemies.filter(e=>!e.dead).length,exit=run.status==='exit',target=currentTarget(),marker=$('rg-marker');
 $('district-name').textContent=acts[run.act].name+' / '+room.name;$('district-risk').textContent='第 '+(run.act+1)+' 幕　·　第 '+(run.index+1)+' / '+run.deck.length+' 室　·　'+roomTypes[room.type];
 $('timer').textContent=formatTime(time);$('timer').style.color='';$('enemy-count').textContent=count?'敌人 '+count:'出口开放';
 $('route-name').textContent=exit?(room.type==='camp'?'前往行商营地':room.type==='shop'?'前往整备站':room.type==='event'?'前往祭坛':'前往出口'):'剩余敌人　'+count;
 $('route-status').textContent=exit?(room.type==='boss'?(run.act===2?'穿过终点门':'下一幕 · '+acts[run.act+1].name):'跟随绿色门标，靠近后按 F'):acts[run.act].trap+' · 橙色预警　/　T 转向';
 if(run.bountyTarget){
  const first=enemies.every(e=>!e.dead);
  $('route-status').textContent=exit?'悬赏 +'+run.bountyReward+' 晶片　·　前往出口':run.bountyTarget.dead?'悬赏 '+run.bountyReward+' 晶片待结　·　清除余敌':(first?'优先击败标记目标可得 48 晶片':'击败标记目标并清场可得 20 晶片')+'　·　T 转向';
 }
 if(exit)updateExitTrail();
 $('rg-room-nav').dataset.mode=exit?'exit':'combat';marker.classList.toggle('hidden',!target);
 if(target){const m=markerPosition(target),p=player.group.position,d=Math.round(Math.hypot(target.pos.x-p.x,target.pos.z-p.z));
  marker.style.left=m.x+'%';marker.style.top=m.y+'%';marker.dataset.mode=exit?'exit':'combat';marker.dataset.edge=m.edge?'yes':'no';
  marker.querySelector('i').textContent=m.edge?'➤':exit?'◇':'⌄';marker.querySelector('i').style.transform=m.edge?'rotate('+(m.angle-Math.PI/2)+'rad)':'';
  marker.querySelector('b').textContent=(exit?'出口':target.name)+'　'+d+' m';}
 $('rg-pocket').textContent='晶片 '+run.coins+'　·　残片 '+meta.shards+'　·　急救 '+raid.meds;cooldownUI('skill-utility',raid.utilityCd,UTILITY[chosenClass].cd);
 $('rg-schools').textContent=(run.focus?'主修 '+schools[run.focus].name+'　':'')+schoolCounts();
 if($('rg-progress')){
  const icons={fight:'⚔',elite:'☠',trial:'⚖',event:'✧',camp:'⛺',shop:'🛒',boss:'👑'};
  $('rg-progress').innerHTML=run.deck.map((r,i)=>'<span class="'+(i<run.index?'done':i===run.index?'now':'')+'" title="'+r.name+'">'+(icons[r.type]||'◆')+'</span>').join('<i></i>');
 }
 if($('rg-dashes')){
  const maxC=maxDashCharges();
  $('rg-dashes').innerHTML=Array.from({length:maxC},(_,i)=>'<i class="'+(i<dashCharges?'on':'')+'"></i>').join('');
 }
 if($('rg-revives')){
  const maxR=mirrorLevel('revive');
  $('rg-revives').innerHTML=maxR?Array.from({length:maxR},(_,i)=>'<span class="'+(i<run.revives?'on':'')+'" title="残火续命">🔥</span>').join(''):'';
 }
 const role=expeditionRoles[chosenClass],prey=chosenClass==='reaper'?nearestEnemy(14,.15):null;
 const power=chosenClass==='reaper'?(prey?.wounds||0):run.power;
 const meter=$('rg-power');meter.style.setProperty?.('--role-color','#'+heroNow().color.toString(16).padStart(6,'0'));
 $('rg-gauge-label').textContent=(prey?prey.name+' · ':'')+role.resource+'　'+power+' / '+role.max;
 $('rg-gauge-fill').style.width=(100*power/role.max)+'%';
 const action={reaper:'X 标记群敌 · E 撕开裂伤',ember:'命中蓄热 · E 落点引爆',frost:'武器命中积霜压 · 满格 E 碎晶',shade:'冲刺斩 / 相位闪积影印 · 满格 E / 重击引爆',bastion:'盾下承击 / C 反制蓄势 · X 释放'};
 $('rg-gauge-action').textContent=run.roleNoteUntil>time?run.roleNote:action[chosenClass];
 meter.dataset.ready=power===role.max?'yes':'no';meter.style.setProperty?.('--segments',role.max);
 $('hud').classList.toggle('rg-hp-low',hp<maxHp*.3);
 drawChamberMap();
}
function presentPanel(title,subtitle,content,panel){
 const box=$('rg-panel'),previousPick=document.activeElement?.dataset?.pick;
 run.panel=panel;state='choice';input={};mouseDown=mouseRight=false;chargeTime=0;cancelMouseLock();document.exitPointerLock?.();
 const hero=heroNow();
 const portrait=panel==='draft'?'<aside class="rg-boon-art" aria-hidden="true">'+echoIllustration(regionArt[run.act],'','rg-boon-scene')+'<img class="rg-boon-hero" src="'+assetURL(chosenClass+'.webp')+'" alt=""><div><small>'+hero.en+'</small><h3>'+hero.name+'</h3><span>'+hero.tag+'</span></div></aside>':'';
 box.dataset.view=panel;
 box.innerHTML='<section>'+portrait+'<div class="rg-panel-content"><small class="rg-location">'+acts[run.act].name+'　/　第 '+(run.index+1)+' 室</small><h2 id="rg-panel-title">'+title+'</h2><p>'+subtitle+'</p>'+content+'</div></section>';
 box.classList.remove('hidden');
 const buttons=Array.from(box.querySelectorAll('button:not(:disabled)'));
 (buttons.find(b=>b.dataset.pick===previousPick)||buttons[0])?.focus({preventScroll:true});
}
function continuePlay(){run.panel='';$('rg-panel').classList.add('hidden');state='paused';lockMouse();}
function advanceChamber(){
 const type=roomNow().type;
 if(['shop','event','camp'].includes(type))run.roomsCleared++;
 if(run.index===run.deck.length-1&&run.act===2){finishExpedition(true);return;}
 if(run.index===run.deck.length-1){run.act++;run.index=0;run.redraw=1+mirrorLevel('extraRedraw');run.deck=buildChapter();}
 else{
  run.index++;
  const b=run.pendingBranch;
  if(b&&run.deck[run.index]&&run.deck[run.index].type!=='boss'&&run.deck[run.index].type!=='shop'){
   const next=run.deck[run.index];
   if(b.type)next.type=b.type;
   next.reward=b.kind==='school'?'boon':b.kind==='hammer'?'hammer':b.kind==='vitality'?'vitality':b.kind==='coins'?'coins':b.kind==='elite'?'elite':b.kind==='trial'?'trial':'boon';
   next.school=b.school||null;
   next.label=b.label;
   if(next.type==='event')next.name='回响祭坛';
   else if(next.type==='trial')next.name='双系试炼庭';
  }
 }
 run.pendingBranch=null;
 enterChamber();continuePlay();
}
function openHammerDraft(){
 const pool=hammerBook();
 if(!pool.length){openDraft();return;}
 const cards=pool.map(t=>card(t.id,t.name,t.desc,WEAPONS[t.weapon].short+' · 质变改造','#ffcf75'));
 presentPanel('锻炉质变','选择一项改变武器核心形态的质变改造。','<div class="rg-cards">'+cards.join('')+'</div>','hammer');
}
const studyLabels={all:'推荐',skill:'技能',weapon:'武器',common:'通用'};
function studyTabs(prefix,current,keys){
 return '<nav class="rg-tree-tabs rg-study-tabs" aria-label="天赋方向">'+keys.map(key=>'<button data-pick="'+prefix+key+'" aria-pressed="'+(key===current)+'">'+studyLabels[key]+'</button>').join('')+'</nav>';
}
function studyPool(key){return availableGifts().filter(t=>t.id!==run.retraining&&(key==='all'||giftCategory(t)===key));}
function giftOptions(previous=[],key='all'){
 const roll=seededRoll(JSON.stringify([run.seed,run.act,run.index,'draft',run.drawNumber,key,run.tabRolls[key]||0]));
 const shuffle=list=>shuffled(list,roll);
 const school=run.roomSchool||(run.focus&&roll()<.8?run.focus:shuffle(Object.keys(schools))[0]);
 const available=studyPool(key).filter(t=>!previous.includes(t));
 const route=giftRoute(run.trackedGift);
 const next=available.find(t=>route.includes(t.id)) || (run.roomsCleared===1?shuffle(available.filter(signatureGift))[0]:null);
 const elite=['elite','boss'].includes(roomNow().type);
 const ordered=weightedGifts(available,elite,roll);
 const family=ordered.filter(t=>t.school===school||t.needs.some(id=>giftById[id].school===school));
 const same=family.find(t=>t.school===school)||family[0];
 const other=ordered.find(t=>t.school!==school);
 return [...new Set([next,same,other,...ordered,...previous].filter(Boolean))].slice(0,3);
}
function card(action,title,desc,label,color='#98d5bd',disabled=false){
 const talent=giftById[action],icon=talent?echoIllustration(action,'','rg-talent-art'):'';
 const rarity=talent?giftRarity(talent):'';
 return '<button class="rg-card" data-rarity="'+rarity+'" data-pick="'+action+'" style="--ink:'+color+'" '+(disabled?'disabled':'')+'>'+icon+'<small>'+(rarity?giftGrades[rarity].name+' · ':'')+label+'</small><strong>'+title+'</strong><span>'+desc+'</span></button>';
}
const paidRedrawCost=16;
function openDraft(previous=[]){
 run.drawNumber++;run.tabRolls={};run.study='all';run.drawCache={all:giftOptions(previous)};run.offers=run.drawCache.all;renderDraft();
}
function renderDraft(){
 const route=giftRoute(run.trackedGift);
 const cards=run.offers.map(t=>{
  let detail=giftDetail(t);
  if(t.needs.length)detail+='<em>前置　'+t.needs.map(id=>giftById[id].name).join(' + ')+'</em>';
  const opens=buildBook().filter(other=>!rank(t.id)&&!rank(other.id)&&other.needs.includes(t.id)&&other.needs.every(id=>id===t.id||rank(id))).map(other=>other.name);
  if(opens.length)detail+='<em>选后可抽　'+opens.join('、')+'</em>';
  const label=route.includes(t.id)?'追踪 · '+giftById[run.trackedGift].name:resonanceTier(t)||(rank(t.id)?'升至 '+(rank(t.id)+1)+' 级':'新天赋');
  return card(t.id,t.name,detail,(t.weapon?WEAPONS[t.weapon].short:studyLabels[giftCategory(t)])+'　/　'+label,schools[t.school].color);
 }).join('');
 const price=run.redraw?'本幕免费':paidRedrawCost+' 晶片';
 const canRedraw=(run.redraw||run.coins>=paidRedrawCost)&&studyPool(run.study).length>run.offers.length;
 const focus=run.focus?'主修 '+schools[run.focus].name+' · 可在图谱更改':'首张天赋决定主修流派';
 presentPanel('选择回响',focus+'　｜　'+(schoolCounts()||'尚未取得天赋'),studyTabs('study-',run.study,Object.keys(studyLabels))+'<div class="rg-cards">'+(cards||'<p>这个方向的天赋已经点满。可切换其他方向。</p>')+'</div><footer><button data-pick="tree">查看天赋路线</button><span>持有 '+run.coins+' 晶片</span><button data-pick="redraw" '+(canRedraw?'':'disabled')+'>重抽 · '+price+'</button></footer>','draft');
}
function useGate(){
 if(run.status!=='exit'||distanceToGate()>=3.55)return;
 const g=nearestGate();
 if(g&&!run.pendingBranch)run.pendingBranch=g.choice;
 const type=roomNow().type;
 if(type==='boss'&&run.act===2){finishExpedition(true);return;}
 if(type==='camp'){
  servicePanel('行商营地','选择一处停留。离开后继续本幕。',[
   card('visit-shop','拜访行商','刻印、换武器、装芯片或修复护甲。','整备'),
   card('visit-altar','触碰祭坛','领取馈赠、接下悬赏或签订契约。','祭坛')
  ],'camp');return;
 }
 if(type==='shop'){openStation();return;}
 if(type==='event'){openAltar();return;}
 if(run.roomReward==='hammer'&&hammerBook().length){openHammerDraft();return;}
 if((run.roomReward==='vitality'||run.roomReward==='coins')||!availableGifts().length){advanceChamber();return;}
 if(run.roomReward==='elite'||run.roomReward==='trial')run.draftsLeft=1;
 openDraft();
}
const servicePrices={buy:40,heal:18,remove:20,swap:22,mod:28};
function servicePanel(title,subtitle,cards,panel,back=false){
 const footer=back?'<footer><button data-pick="station">返回整备站</button></footer>':'';
 presentPanel(title,subtitle,'<div class="rg-cards">'+cards.join('')+'</div>'+footer,panel);
}
function shopCard(action,title,desc,extraDisabled=false){
 const price=servicePrices[action];
 return card(action,title,desc,price+' 晶片','#e9bf82',extraDisabled||run.coins<price);
}
function canRetrain(id){
 return canRemoveGift(id)&&availableGifts().some(t=>t.id!==id&&(rank(id)>1||!t.needs.includes(id)));
}
function openStation(){
 const cards=[
  shopCard('buy','刻印天赋',run.shopBought?'本站刻印已领取。':'本站可额外挑选一次天赋。',run.shopBought||!availableGifts().length),
  card('forge-hammer','锻炉质变','花费 46 晶片，为当前武器铭刻一项招式质变改造。','46 晶片','#ffcf75',run.coins<46||!hammerBook().length),
  shopCard('heal','修复护甲','回复 60 生命，并补充一个急救包。'),
  shopCard('swap','更换武器','从武器库选择一把替换当前武器。原武器的刻印保留。'),
  shopCard('mod','加装破势芯片','为当前武器改装，对失衡或冻结目标的武器直接伤害提高 25%。',loadout.every(id=>run.mods[id])),
  shopCard('remove','重刻天赋','拆除一阶，重新挑选其他天赋。已学天赋所需的前置会保留。',!Object.keys(run.gifts).some(canRetrain)),
  card('pass','整装出发','结束整备，前往下一室。','离站')
 ];
 servicePanel(roomNow().type==='camp'?'行商整备':'首领前整备','持有 '+run.coins+' 晶片　·　整备后可继续交易。',cards,'shop');
}
function stationServices(panel){
 const balance='持有 '+run.coins+' 晶片';
 if(panel==='remove'){
  const cards=Object.keys(run.gifts).filter(canRetrain).map(id=>card('remove-'+id,giftById[id].name,'移除第 '+rank(id)+' 阶，随后改选其他天赋。'+(id==='plate'?'最大生命随之减少 20。':''),'20 晶片'));
  servicePanel('拆除哪项刻印',balance,cards,panel,true);return;
 }
 if(panel==='mod'){
  const id=loadout[0];
  servicePanel('改装'+WEAPONS[id].name,balance,[card('install-chip','破势芯片','失衡或冻结时追加 25% 武器伤害。','28 晶片','#e9bf82',!!run.mods[id])],panel,true);return;
 }
 const cards=Object.entries(weaponSpecs).filter(([id])=>id!==loadout[0]).map(([id,w])=>card('equip-'+id,w.name,'左键 '+attackForms[id][0][0]+' · 右键 '+attackForms[id][1][0],'22 晶片'));
 servicePanel('替换'+WEAPONS[loadout[0]].name,balance,cards,'equip',true);
}
function transact(panel,action){
 if(action==='station'){openStation();return;}
 if(panel==='shop'){
  if(action==='pass'){advanceChamber();return;}
  if(action==='forge-hammer'&&run.coins>=46&&hammerBook().length){
   run.coins-=46;run.shopDraft=true;openHammerDraft();return;
  }
  if(!Object.hasOwn(servicePrices,action)||run.coins<servicePrices[action])return;
  if(action==='buy'){
   if(run.shopBought||!availableGifts().length)return;
   run.coins-=servicePrices.buy;run.shopBought=run.shopDraft=true;openDraft();return;
  }
  if(action==='heal'){run.coins-=servicePrices.heal;hp=Math.min(maxHp,hp+60);raid.meds++;openStation();return;}
  stationServices(action);return;
 }
 if(panel==='remove'&&action.startsWith('remove-')){
  const id=action.slice(7);
  if(run.coins<servicePrices.remove||!canRetrain(id)||!removeGift(id))return;
  run.coins-=servicePrices.remove;run.shopDraft=true;run.retraining=id;openDraft();return;
 }else if(panel==='mod'&&action==='install-chip'){
  const id=loadout[0];
  if(run.mods[id]||run.coins<servicePrices.mod)return;
  run.mods[id]=true;run.coins-=servicePrices.mod;
 }else if(panel==='equip'&&action.startsWith('equip-')){
  const id=action.slice(6);
  if(!Object.hasOwn(WEAPONS,id)||loadout.includes(id)||run.coins<servicePrices.swap)return;
  loadout[0]=id;run.coins-=servicePrices.swap;run.armedStudy=null;run.twinTarget=null;
  equipWeapon(player,id);
  if(run.trackedGift&&!buildBook().includes(giftById[run.trackedGift]))run.trackedGift=null;
 }else return;
 openStation();
}
function openAltar(){
 const deal=['kit','broker','distill'][run.act];
 const options={
  kit:card('kit','交付急救包','交出一个急救包，获得 32 晶片。','旧城委托','#e9bf82',raid.meds<1),
  broker:card('broker','打捞刻印','支付 24 晶片，挑选一项天赋。','船坞打捞','#9bdabf',run.coins<24||!availableGifts().length),
  distill:card('distill','温室萃取','支付 22 晶片，永久提高本局生命上限 16 并回复 16。','温室培育','#9bdabf',run.coins<22)
 };
 const cards=[card('offer','献祭回响','消耗当前生命的 20%，挑选一项天赋。','祭坛交换','#ddacdc',!availableGifts().length),
  card('rest','汲取泉水','回复 45 生命。','祭坛馈赠'),card('cash','收取晶片','获得 30 晶片。','祭坛馈赠','#e9bf82'),
  card('bounty','签下悬赏','下一战增援精英。优先击败它得 48 晶片，否则得 20。','追猎委托','#f1ac82'),options[deal]];
 for(const [id,c] of Object.entries(contracts))if(!run.contracts.includes(id))cards.push(card('pact-'+id,c.name,c.desc,'契约 · 持续至本局结束','#e59997'));
 servicePanel('回响祭坛','持有 '+run.coins+' 晶片 · 选择一项后继续前进。',cards,'event');
}
function showTree(){
 if(run.panel!=='tree')run.treeFromDraft=run.panel==='draft';
 const routes=run.treeTab==='routes';
 const tabs='<nav class="rg-tree-tabs" aria-label="图谱视图">'+[['routes','共鸣路线'],['all','全部'],['skill','技能'],['weapon','武器'],['common','通用']].map(([key,label])=>'<button aria-pressed="'+(run.treeTab===key)+'" data-pick="tab-'+key+'">'+label+'</button>').join('')+'</nav>';
 let content;
 if(routes){
  const nodes=buildBook().filter(t=>t.needs.length===2);
  const priority=t=>t.id===run.trackedGift?-2:rank(t.id)?50:signatureGift(t)?-1:giftRoute(t.id).length;
  nodes.sort((a,b)=>priority(a)-priority(b));
  content='<div class="rg-routes">'+nodes.map(t=>{
   const tracked=t.id===run.trackedGift;
   const steps=giftRoute(t.id).filter(id=>id!==t.id);
   const recipe=t.needs.map(id=>'<span class="'+(rank(id)?'owned':'')+'">'+(rank(id)?'✓ ':'')+giftById[id].name+'</span>').join(' + ');
   const status=rank(t.id)?'已获得':!steps.length?'已解锁 · 可抽取':'待取得 '+steps.length+' 项前置';
   return '<article style="--ink:'+schools[t.school].color+'">'+echoIllustration(t.id,'','rg-tree-icon')+'<small>'+giftGrades[giftRarity(t)].name+' · '+resonanceTier(t)+' · '+status+'</small><h3>'+t.name+'</h3><div class="rg-recipe">'+recipe+'</div><p>'+giftDetail(t)+'</p>'+(rank(t.id)?'':'<button aria-pressed="'+tracked+'" data-pick="track-'+t.id+'">'+(tracked?'取消追踪':'追踪路线')+'</button>')+'</article>';
  }).join('')+'</div>';
 }else{
  const book=buildBook().filter(t=>run.treeTab==='all'||giftCategory(t)===run.treeTab);
  const byWeapon=run.treeTab==='weapon';
  const groups=byWeapon?loadout.map(id=>[id,{name:WEAPONS[id].name,color:schools.forge.color}]):Object.entries(schools);
  const family=(id,t)=>byWeapon?t.weapon===id:t.school===id;
  content='<div class="rg-tree">'+groups.filter(([id])=>book.some(t=>family(id,t))).map(([id,s])=>'<article style="--ink:'+s.color+'"><h3>'+s.name+'</h3>'+(byWeapon?'':'<button data-pick="focus-'+id+'">'+(run.focus===id?'已设为偏好':'提高下次出现率')+'</button>')+book.filter(t=>family(id,t)).map(t=>'<p>'+echoIllustration(t.id,'','rg-tree-icon')+'<b>'+giftGrades[giftRarity(t)].name+' · '+t.name+'　'+rank(t.id)+'/'+t.max+'</b><span>'+giftDetail(t)+'</span>'+(t.needs.length?'<em>需要 '+t.needs.map(k=>giftById[k].name).join(' + ')+'</em>':'')+'</p>').join('')+'</article>').join('')+'</div>';
 }
 const path=giftRoute(run.trackedGift);
 const hint=path.length?'追踪 '+giftById[run.trackedGift].name+'　·　下一步可选 '+path.filter(id=>giftById[id].needs.every(k=>rank(k))).map(id=>giftById[id].name).join('、'):routes?'追踪一条共鸣路线，后续选牌会优先给出缺少的前置或共鸣本身。':run.treeTab==='weapon'?'左右键专精可各升两阶。武器共鸣另需「开刃」与角色专属天赋。':'选择偏好流派，可提高该流派的出牌率。';
 const pacts=run.contracts.map(id=>contracts[id].name+' · '+contracts[id].desc).join('　');
 presentPanel(heroNow().name+' · 天赋图谱',hint+(pacts?'　｜　'+pacts:''),tabs+content+'<footer><button data-pick="back">'+(run.treeFromDraft?'返回选牌':'返回房间')+'　M</button></footer>','tree');
}
function closeGiftTree(){
 if(run.treeFromDraft)renderDraft();else continuePlay();
}
function chooseExpedition(action){
 if(state!=='choice')return;const panel=run.panel;
 if(panel==='camp'){if(action==='visit-shop')openStation();else if(action==='visit-altar')openAltar();return;}
 if(panel==='tree'){
  if(action==='back'){closeGiftTree();return;}
  if(['tab-all','tab-routes','tab-skill','tab-weapon','tab-common'].includes(action))run.treeTab=action.slice(4);
  else if(action.startsWith('focus-')&&schools[action.slice(6)])run.focus=action.slice(6);
  else if(action.startsWith('track-')){
   const id=action.slice(6);
   if(!buildBook().includes(giftById[id])||giftById[id].needs.length!==2||rank(id))return;
   run.trackedGift=run.trackedGift===id?null:id;
  }else return;
  showTree();return;
 }
 if(panel==='hammer'){
  if(giftById[action]?.hammer&&acquireGift(action)){
   cue('prophecy');toast('质变完成 · '+giftById[action].name);
   if(run.shopDraft){run.shopDraft=false;openStation();}else advanceChamber();
  }return;
 }
 if(panel==='draft'){
  if(action.startsWith('study-')&&Object.hasOwn(studyLabels,action.slice(6))){
   run.study=action.slice(6);run.drawCache[run.study]??=giftOptions([],run.study);
   run.offers=run.drawCache[run.study];renderDraft();return;
  }
  if(action==='tree'){showTree();return;}
  if(action==='redraw'){
   if(studyPool(run.study).length<=run.offers.length)return;
   if(run.redraw)run.redraw--;
   else if(run.coins>=paidRedrawCost)run.coins-=paidRedrawCost;
   else return;
   run.tabRolls[run.study]=(run.tabRolls[run.study]||0)+1;
   run.offers=giftOptions(run.offers,run.study);run.drawCache[run.study]=run.offers;renderDraft();return;
  }
  if(run.offers.some(t=>t.id===action)&&acquireGift(action)){
   run.focus??=giftById[action].school;
   toast('获得 '+giftById[action].name);
   if(run.shopDraft){run.shopDraft=false;run.retraining=null;openStation();}
   else if(run.draftsLeft>0&&availableGifts().length){run.draftsLeft--;openDraft();}
   else advanceChamber();
  }return;
 }
 if(['shop','mod','swap','equip','remove'].includes(panel)){transact(panel,action);return;}
 if(panel!=='event')return;
 if(action==='offer'&&availableGifts().length){hp=Math.max(1,Math.ceil(hp*.8));openDraft();return;}
 if(action==='rest')hp=Math.min(maxHp,hp+45);
 else if(action==='cash')run.coins+=30;
 else if(action==='bounty')run.bountyPending=true;
 else if(action==='kit'&&run.act===0&&raid.meds>0){raid.meds--;run.coins+=32;}
 else if(action==='broker'&&run.act===1&&run.coins>=24&&availableGifts().length){run.coins-=24;openDraft();return;}
 else if(action==='distill'&&run.act===2&&run.coins>=22){run.coins-=22;maxHp+=16;hp+=16;}
 else if(action.startsWith('pact-')){
  const id=action.slice(5);if(!Object.hasOwn(contracts,id)||run.contracts.includes(id))return;
  run.contracts.push(id);if(id==='glass'){maxHp-=35;hp=Math.min(hp,maxHp);}
 }else return;
 advanceChamber();
}
function expeditionKey(e){
 if(!['KeyF','KeyT','KeyM','KeyB','Tab','KeyR'].includes(e.code))return false;
 if(e.repeat)return true;
 if(state==='choice'&&['KeyM','KeyB','Tab'].includes(e.code)){
  if(run.panel==='tree')closeGiftTree();else if(run.panel==='draft')showTree();
  return true;
 }
 if(state!=='playing')return true;
 if(e.code==='KeyF')useGate();else if(e.code==='KeyT'){const t=currentTarget(),p=player.group.position;if(t){
  let aim=t.pos;
  if(t.exit&&obstructed(p,exitPoint,0,.56)){
   updateExitTrail();aim=visibleWaypoint(p,run.pathCell)||exitPoint;
  }
  yaw=Math.atan2(aim.x-p.x,-(aim.z-p.z));pitch=.18;
 }}
 else if(e.code!=='KeyR')showTree();return true;
}
function finishExpedition(success,reason=''){
 if(state==='result')return;
 state='result';run.status='finished';cancelMouseLock();document.exitPointerLock?.();input={};mouseDown=mouseRight=false;
 for(const id of ['hud','rg-panel','pause'])$(id).classList.add('hidden');$('result').classList.remove('hidden');
 const previousDepth=record.depth;
 record.best=Math.max(record.best,run.roomsCleared);
 if(success){record.wins++;record.depth=Math.max(record.depth,Math.min(3,run.depth+1));unlockProphecy('first_clear_run');awardShards(30);}
 loadout=[...run.startLoadout];equipWeapon(player,loadout[activeWeapon]);
 try{localStorage.setItem('aberrant-echo-record',JSON.stringify(record));}catch{}
 $('result-eyebrow').textContent=success?'EXPEDITION COMPLETE':'EXPEDITION ENDED';
 $('result-title').textContent=success?'穿越回响':'远征结束';$('result-desc').textContent=acts[run.act].name+' · '+roomNow().name+'　|　'+(success?'三名区域首领已击败':reason?'本次远征已放弃':'生命耗尽')+'　·　带回回响残片 +'+(run.shardsEarned||0)+'（可在圣所回响之镜永久强化）';
 $('result-loot').textContent=run.roomsCleared+' / '+expeditionLength;$('result-kills').textContent=kills;$('result-time').textContent=formatTime(time);
 const unlock=record.depth>previousDepth?'　｜　解锁阶梯 '+record.depth+'。'+heroNow().name+' 新增可抽取天赋：'+unlockedStudies[chosenClass][record.depth-1].map(id=>giftById[id].name).join('、'):'';
 $('raid-result').textContent='阶梯 '+run.depth+' · 种子 '+run.seed+'　｜　'+(talents.filter(t=>t.needs.length===2&&rank(t.id)).map(t=>t.name).join(' / ')||'尚未激活共鸣')+unlock;updateRecord();updateSanctuaryBadges();
}
function updateRecord(){
 $('stash-note').textContent='最佳 '+record.best+' / '+expeditionLength+' 室　·　通关 '+record.wins+' 次　·　回响残片 '+meta.shards;
 const select=$('rg-depth'),chosen=Number(select.value)||0;
 select.innerHTML=Array.from({length:record.depth+1},(_,i)=>'<option value="'+i+'">'+(i?'阶梯 '+i+' · 敌人额外 '+i+' 词缀':'标准远征')+'</option>').join('');
 select.value=String(Math.min(record.depth,chosen));
 updateSanctuaryBadges();
}
function showMirrorDialog(){
 sanctuaryView='mirror';
 const guide=$('rg-guide');
 const rows=mirrorUpgrades.map(u=>{
  const lv=mirrorLevel(u.id),maxed=lv>=u.max,cost=maxed?0:u.costs[lv],can=!maxed&&meta.shards>=cost;
  const pips=Array.from({length:u.max},(_,i)=>'<i class="'+(i<lv?'on':'')+'"></i>').join('');
  return '<article class="rg-mirror-item"><div><small>'+u.en+'</small><h3>'+u.name+' <span class="rg-pips">'+pips+'</span></h3><p>'+u.desc+'</p></div><button data-mirror="'+u.id+'" '+(can?'':'disabled')+'>'+(maxed?'已满级':'强化 · '+cost+' 残片')+'</button></article>';
 }).join('');
 guide.innerHTML='<section class="rg-sanctuary-modal"><header><div><small>MIRROR OF ECHOES · 永久成长</small><h2>回响之镜</h2></div><div class="rg-shard-pill">◈ 持有残片 <b>'+meta.shards+'</b></div><button data-close>返回圣所</button></header><p class="rg-modal-sub">无论胜败，远征中收集的回响残片都会带回圣所，在此铭刻为永久生效的异变潜能。</p><div class="rg-mirror-list">'+rows+'</div></section>';
 guide.classList.remove('hidden');
}
function showProphecyDialog(){
 sanctuaryView='panorama';
 const guide=$('rg-guide');
 const rows=prophecies.map(p=>{
  const done=meta.completed.includes(p.id),claimed=meta.claimed.includes(p.id);
  const btn=claimed?'<button disabled>已领取</button>':done?'<button class="rg-claim" data-claim="'+p.id+'">领取 +'+p.reward+' 残片</button>':'<button disabled>进行中</button>';
  return '<article class="rg-mirror-item '+(done?'done':'')+'"><div><small>'+(claimed?'已完成':done?'可领取奖励':'命运预言')+'</small><h3>'+p.name+'</h3><p>'+p.desc+'</p></div>'+btn+'</article>';
 }).join('');
 guide.innerHTML='<section class="rg-sanctuary-modal"><header><div><small>FATED LIST · 远征目标</small><h2>共鸣预言碑</h2></div><div class="rg-shard-pill">◈ 持有残片 <b>'+meta.shards+'</b></div><button data-close>返回圣所</button></header><p class="rg-modal-sub">达成任意命运预言即可在圣所领取丰厚回响残片，哪怕中途折戟也能收获满满。</p><div class="rg-mirror-list">'+rows+'</div></section>';
 guide.classList.remove('hidden');
}
function startOpeningCinematic(){
 if(!rogueMode||!$('rg-cinematic'))return;
 showSanctuaryMode(true);
 player.group.position.set(0,0,17.2);player.group.rotation.y=Math.PI;
 state='cinematic';cinematicTime=0;
 $('menu').classList.add('hidden');
 $('rg-cinematic').classList.remove('hidden');
 $('rg-cinematic').dataset.stage='1';
 cue('cinematic');
}
function stepOpeningCinematic(dt){
 const t=cinematicTime;
 const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
 const pos=new THREE.Vector3(),look=new THREE.Vector3();
 if(t<2.3){
  // Stage 1: Intimate push behind hero on the Sanctuary cliff edge
  const k=smooth(t/2.3);
  pos.set(lerp(1.6,.2,k),lerp(2.1,3.2,k),lerp(24.5,19.8,k));
  look.set(0,lerp(1.9,2.8,k),lerp(12,-28,k));
  $('rg-cinematic').dataset.stage='1';
 }else if(t<6.0){
  // Stage 2: Zelda BotW Cliff Leap Reveal — soaring over the edge into the vast 3-Act Panorama!
  const k=smooth((t-2.3)/3.7);
  pos.set(lerp(.2,22,k),lerp(3.2,21.5,Math.pow(k,.78)),lerp(19.8,4,k));
  look.set(lerp(0,-2,k),lerp(2.8,-4,k),lerp(-28,-74,k));
  $('rg-cinematic').dataset.stage='2';
 }else if(t<8.4){
  // Stage 3: Majestic sweeping descent back to Sanctuary Overlook Hub
  const k=smooth((t-6.0)/2.4);
  pos.set(lerp(22,3.4,k),lerp(21.5,3.7,k),lerp(4,31.2,k));
  look.set(lerp(-2,-1.2,k),lerp(-4,1.6,k),lerp(-74,10,k));
  $('rg-cinematic').dataset.stage='3';
 }else{
  finishOpeningCinematic();return;
 }
 camera.position.copy(pos);camera.lookAt(look);camera.fov=lerp(50,62,smooth((t-2)/3.5));camera.updateProjectionMatrix();
}
function finishOpeningCinematic(){
 if(state!=='cinematic')return;
 state='menu';sanctuaryView='hero';
 player.group.position.set(.4,0,22.5);player.group.rotation.y=Math.PI+.28;
 $('rg-cinematic')?.classList.add('hidden');
 $('menu').classList.remove('hidden');
}
function showFieldGuide(act=0){
 const a=acts[act],guide=$('rg-guide');
 const tabs=acts.map((v,i)=>'<button data-region="'+i+'" aria-pressed="'+(i===act)+'">'+v.name+'</button>').join('');
 const traits=regionAffixes[act].map(id=>'<p><b>'+affixes[id].name+'</b>　'+affixes[id].rule+'</p>').join('');
 const small=Object.entries(monsters).map(([id,v])=>'<figure>'+echoIllustration(id,v.name,'')+'<figcaption>'+v.name+'<small>'+v.role+'</small></figcaption></figure>').join('');
 guide.innerHTML='<section><header><h2>远征图鉴</h2><button data-close>返回圣所</button></header><nav aria-label="选择区域">'+tabs+'</nav><div class="rg-guide-lead"><figure>'+echoIllustration(regionArt[act],a.name+'场景示意','rg-region-art')+'<figcaption>'+a.name+'<small>'+a.zone+'</small></figcaption></figure><figure>'+echoIllustration(bossArt[act],a.boss,'rg-boss-art')+'<figcaption>'+a.boss+'<small>区域首领</small></figcaption></figure></div><div class="rg-guide-creatures">'+small+'</div><section class="rg-affixes"><h3>区域词缀</h3>'+traits+'</section></section>';
 guide.classList.remove('hidden');guide.querySelector('[data-region="'+act+'"]').focus?.();
}
function closeFieldGuide(){
 sanctuaryView='hero';
 $('rg-guide').classList.add('hidden');$('rg-open-guide')?.focus?.();
}
function initializeExpedition(){
 mouseHelp='M 天赋图谱 · T 转向 · V 锁定 · F 门 · H 急救';
 const panel=document.createElement('div');panel.id='rg-panel';panel.className='hidden';$('hud').after(panel);
 panel.setAttribute?.('role','dialog');panel.setAttribute?.('aria-labelledby','rg-panel-title');panel.setAttribute?.('aria-modal','true');
 panel.addEventListener('keydown',e=>{
  const buttons=Array.from(panel.querySelectorAll('button:not(:disabled)'));
  if(!buttons.length)return;
  const index=buttons.indexOf(document.activeElement);
  const step=e.key==='Tab'?(e.shiftKey?-1:1):e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0;
  if(step){e.preventDefault();e.stopPropagation();buttons[(index+step+buttons.length)%buttons.length].focus();}
 });
 panel.addEventListener('click',e=>{const b=e.target.closest('button[data-pick]');if(b&&!b.disabled)chooseExpedition(b.dataset.pick);});
 const nav=document.createElement('section');nav.id='rg-room-nav';nav.innerHTML='<b id="route-name"></b><span id="route-status"></span><small id="rg-pocket"></small><small id="rg-schools"></small><div id="rg-power"><label id="rg-gauge-label"></label><div class="rg-gauge"><i id="rg-gauge-fill"></i></div><small id="rg-gauge-action"></small></div>';
 $('raid-route').replaceWith(nav);
 const vitalsMeta=document.createElement('div');vitalsMeta.className='rg-vitals-meta';vitalsMeta.innerHTML='<span class="rg-dash-bar">闪避 <span id="rg-dashes"></span></span><span id="rg-revives"></span>';
 document.querySelector('.vitals').appendChild(vitalsMeta);
 document.querySelector('.vitals').appendChild($('rg-power'));
 const progress=document.createElement('nav');progress.id='rg-progress';progress.setAttribute?.('aria-label','本幕进度');
 document.querySelector('.hud-top')?.appendChild(progress);
 const bossBanner=document.createElement('div');bossBanner.id='rg-boss-intro';$('hud').appendChild(bossBanner);
 const mark=document.createElement('div');mark.id='rg-marker';mark.innerHTML='<i></i><b></b>';$('hud').appendChild(mark);
 $('expedition-brief').innerHTML='<div><small>ECHO EXPEDITION · SANCTUARY OVERLOOK</small><h1>回响远征</h1><p>晴湾断轨 <i>◆</i> 鸣潮船坞 <i>◆</i> 紫晶温室</p></div>';
 const scenery=document.createElement('img');scenery.id='rg-menu-scene';scenery.alt='';scenery.src=echoImage(regionArt[0]);$('menu').appendChild(scenery);
 const guide=document.createElement('div');guide.id='rg-guide';guide.className='hidden';guide.setAttribute?.('role','dialog');guide.setAttribute?.('aria-label','圣所设施');guide.setAttribute?.('aria-modal','true');$('menu').after(guide);
 const settings=document.createElement('div');settings.className='rg-run-settings';
 settings.innerHTML='<label>难度 <select id="rg-depth"></select></label><label>种子 <input id="rg-seed" maxlength="32" placeholder="留空随机" autocomplete="off"></label>';
 settings.addEventListener('keydown',e=>e.stopPropagation());
 $('stash-note').after(settings);
 const hubBar=document.createElement('div');hubBar.className='rg-hub-actions';
 hubBar.innerHTML='<button id="rg-open-mirror">🪞 回响之镜 · ◈ <b id="rg-shard-count">'+meta.shards+'</b></button><button id="rg-open-prophecy">📜 共鸣预言<span id="rg-prophecy-badge"></span></button><button id="rg-open-guide">📖 远征图鉴</button><button id="rg-toggle-vista">🌄 俯瞰世界</button><button id="rg-replay-intro">🎬 重播开场</button>';
 settings.after(hubBar);
 $('rg-open-mirror').addEventListener('click',showMirrorDialog);
 $('rg-open-prophecy').addEventListener('click',showProphecyDialog);
 $('rg-open-guide').addEventListener('click',()=>showFieldGuide());
 $('rg-toggle-vista').addEventListener('click',()=>{
  sanctuaryView=sanctuaryView==='panorama'?'hero':'panorama';
  $('menu').classList.toggle('rg-vista-mode',sanctuaryView==='panorama');
  $('rg-toggle-vista').textContent=sanctuaryView==='panorama'?'↩ 返回整备':'🌄 俯瞰世界';
 });
 $('rg-replay-intro').addEventListener('click',startOpeningCinematic);
 // Zelda BotW-inspired Opening Cinematic Overlay
 const cine=document.createElement('div');cine.id='rg-cinematic';cine.className='hidden';
 cine.innerHTML='<div class="rg-cine-bar top"></div><div class="rg-cine-title"><small>ABERRANT FRONTIER · ECHO EXPEDITION</small><h1>畸变前线 · 回响远征</h1><p>晴湾断轨 <i>◆</i> 鸣潮船坞 <i>◆</i> 紫晶温室</p></div><button id="rg-cine-skip">跳过开场 · SPACE / 点击任意处</button><div class="rg-cine-bar bottom"></div>';
 $('menu').after(cine);
 cine.addEventListener('click',finishOpeningCinematic);
 guide.addEventListener('click',e=>{
  const button=e.target.closest('button');
  if(button?.hasAttribute('data-region'))showFieldGuide(Number(button.dataset.region));
  else if(button?.hasAttribute('data-mirror')){
   const id=button.dataset.mirror,u=mirrorUpgrades.find(x=>x.id===id),lv=mirrorLevel(id);
   if(u&&lv<u.max&&meta.shards>=u.costs[lv]){meta.shards-=u.costs[lv];meta.mirror[id]=lv+1;saveMeta();cue('prophecy');updateRecord();showMirrorDialog();}
  }else if(button?.hasAttribute('data-claim')){
   const id=button.dataset.claim,p=prophecies.find(x=>x.id===id);
   if(p&&meta.completed.includes(id)&&!meta.claimed.includes(id)){meta.claimed.push(id);meta.shards+=p.reward;saveMeta();cue('prophecy');updateRecord();showProphecyDialog();}
  }else if(button?.hasAttribute('data-close')||e.target===guide)closeFieldGuide();
 });
 window.addEventListener('keydown',e=>{if(e.code==='Escape'&&!guide.classList.contains('hidden'))closeFieldGuide();});
 const portrait=document.createElement('img');portrait.id='rg-foe-portrait';$('duel-target').appendChild(portrait);
 $('loadout-menu').querySelector('h1').textContent='远征圣所';
 $('loadout-menu').querySelector('.selection-label').textContent='选择异变者';
 document.querySelector('.operator-title > span').textContent='';document.querySelector('.menu-top .build').textContent='圣所高台　／　三幕 '+expeditionLength+' 室　／　3 位首领';
 $('start').innerHTML='踏入回响 <span aria-hidden="true">⟶</span>';updateRecord();$('quit').textContent='结束本次远征';$('again').innerHTML='再次远征 <span aria-hidden="true">⟶</span>';
 document.querySelector('.timer small').textContent='远征用时';document.querySelector('.result-stats small').textContent='通过房间';
 document.querySelector('.game-footer span').textContent='WASD 移动 · SHIFT 冲刺 / 冲刺斩 · 左右键双招式 · V/中键 锁定 · C 反制 · F 门 · M 图谱 · H 急救';
 $('weapon-slot-2').style.display='none';
 document.querySelector('.menu-footer span:nth-child(2)').textContent='SHIFT 冲刺斩 · 左/右键招式 · C 反制 · E/X/Q 异能';
 document.querySelector('.help-grid span:nth-child(4)').textContent='右键 · 第二普攻';
 document.querySelector('.help-grid span:nth-child(8)').textContent='X · 战术异能';
 document.querySelector('.menu-footer span').textContent='单人肉鸽 · 回响远征';document.querySelector('.help-grid span:last-child').textContent='F · 选择下一扇门';
 // Automatically play the Zelda-style Grand Overlook Opening Cinematic in real browser sessions!
 if(typeof window!=='undefined'&&typeof document.body?.appendChild==='function'&&window.innerWidth>0){
  setTimeout(()=>{if(state==='menu')startOpeningCinematic();},60);
 }
}
