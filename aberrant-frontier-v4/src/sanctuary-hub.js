// Echo Expedition — Hades-Style Walkable 3D Sanctuary Courtyard Hub
// Lets players freely walk, dash, test weapons & skills on a live Training Dummy (Skelly),
// talk to 3D companions standing around the courtyard, inspect Mirror/Armory/Prophecy stations,
// and walk through the Grand Archway to launch their expedition.

const sanctuaryHub={
 built:false,
 roam:false,
 drawerOpen:false,
 yaw:0,
 pitch:.34,
 dragging:false,
 midOrbit:false,
 lastX:0,
 lastY:0,
 dashTime:0,
 dashCd:0,
 dashDir:new THREE.Vector3(0,0,-1),
 dashStrike:0,
 attackCd:0,
 attackAnim:0,
 attackHeavy:false,
 attackKind:'melee',
 skillCd:0,
 parryTime:0,
 nearest:null,
 propGroup:null,
 npcs:[],
 stationRings:[],
 rackWeapons:[],
 riftCurtain:null,
 prophecyGem:null,
 dummy:null,
 dpsLog:[],
 dummyCombo:0,
 dummyComboTimer:0,
 dummyBarkCd:0,
 dummyAttackTimer:0,
 dummyParryWindow:0,
 labelsEl:null,
 hudEl:null,
 promptEl:null
};

const SANCTUARY_NPC_SPOTS=[
 {x:-4.4,z:25.8,yaw:.45},
 {x:4.6,z:25.6,yaw:-.45},
 {x:-7.8,z:17.8,yaw:.72},
 {x:7.8,z:17.8,yaw:-.72}
];
const SANCTUARY_DEFAULT_WEAPONS={ember:'katana',frost:'rifle',shade:'dual',bastion:'hammer',reaper:'spear'};
const DUMMY_BARKS=[
 '漂亮！这记挥砍连断轨镇守者都得退半步！',
 '再来再来！我这副老铁桩专门给你练手感！',
 '试试 SHIFT 闪避后立刻点左键——「冲刺斩」超爽！',
 '右边军械台随时能换 5 个角色和 6 把武器过来揍我！',
 '按 E / X / Q 放异能，或者靠近我按 F 练习完美反制 [C]！',
 '哎哟喂！手感这么热，赶紧从正前方拱门出发吧！'
];

function isElHidden(el){
 return !el||el.classList?.contains('hidden')||String(el.className||'').split(/\s+/).includes('hidden');
}
function isGuideOpen(){
 const el=$('rg-guide');
 return !!(el&&el.innerHTML&&!isElHidden(el));
}
function isSanctuaryRoam(){
 if(!rogueMode||state!=='menu'||!sanctuaryHub.roam||sanctuaryHub.drawerOpen)return false;
 if(sanctuaryView==='panorama')return false;
 if(isGuideOpen())return false;
 return true;
}

function setSanctuaryRoamMode(on){
 sanctuaryHub.roam=!!on;
 sanctuaryHub.drawerOpen=!on;
 $('menu')?.classList.toggle('rg-hub-roam',!!on);
 if(sanctuaryHub.hudEl)sanctuaryHub.hudEl.classList.toggle('hidden',!on);
 if(sanctuaryHub.labelsEl)sanctuaryHub.labelsEl.classList.toggle('hidden',!on);
 if(sanctuaryHub.promptEl&&!on)sanctuaryHub.promptEl.classList.add('hidden');
 if(on){
  sanctuaryView='hero';
  $('menu')?.classList.remove('rg-vista-mode');
  updateSanctuaryHubHUD();
 }
}

function buildSanctuaryHubProps(){
 if(sanctuaryHub.built||!sanctuaryGroup)return;
 sanctuaryHub.built=true;
 const g=new THREE.Group();
 sanctuaryHub.propGroup=g;
 sanctuaryGroup.add(g);

 function floorRing(x,z,r,color){
  const m=mesh(yardRing,glow(color),x,.045,z,g);
  m.scale.set(r,r,1);m.rotation.x=-Math.PI/2;m.castShadow=false;
  sanctuaryHub.stationRings.push({mesh:m,base:r,phase:x*.3+z*.2});
  return m;
 }

 // 1. Grand Expedition Archway Departure Rift (z = 14.1)
 const riftMat=new THREE.MeshBasicMaterial({color:0x7ff5d4,transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide});
 sanctuaryHub.riftCurtain=mesh(new THREE.PlaneGeometry(8.8,6.2),riftMat,0,3.2,13.85,g);
 sanctuaryHub.riftCurtain.castShadow=false;
 floorRing(0,14.5,2.25,0x8ef5cf);

 // 2. Mirror of Echoes floor aura (-7.1, 21.8)
 floorRing(-6.6,21.8,1.75,0xc996ff);

 // 3. Arsenal Weapon Rack display above right pedestal (+7.1, 21.8)
 floorRing(6.6,21.8,1.75,0xf5c869);
 const rackPalette=[0xff8f5e,0x8de6ff,0xc996ff,0xf2c66d,0x8ef5c8,0xffa8c8];
 for(let i=0;i<6;i++){
  const ang=i*Math.PI/3;
  const blade=new THREE.Group();
  blade.position.set(7.4+Math.cos(ang)*1.05,2.35,22.0+Math.sin(ang)*.72);
  box(0,0,0,.09,.92,.04,glow(rackPalette[i]),blade);
  box(0,-.34,0,.26,.07,.08,chamberMat(0x243945),blade);
  blade.rotation.z=.22;
  g.add(blade);
  sanctuaryHub.rackWeapons.push({group:blade,ang,i});
 }

 // 4. Fated List Prophecy Stele (-5.0, 17.5)
 floorRing(-5.0,17.5,1.55,0xf2c45a);
 cylinder(-5.0,.28,17.5,1.0,1.2,.56,chamberMat(0xd6c5ac),g,8);
 box(-5.0,1.55,17.5,.88,2.15,.52,chamberMat(0x213a45),g);
 box(-5.0,1.55,17.78,.54,1.6,.06,glow(0xf5cf74),g);
 sanctuaryHub.prophecyGem=mesh(crystalGeo,glow(0xffd66e),-5.0,3.18,17.5,g);
 sanctuaryHub.prophecyGem.scale.set(.34,.58,.34);sanctuaryHub.prophecyGem.castShadow=false;

 // 5. Chronicle & Field Guide Lectern (-2.8, 27.6)
 floorRing(-2.8,27.6,1.45,0x8be2f0);
 cylinder(-2.8,.62,27.6,.34,.56,1.24,chamberMat(0x27404a),g,8);
 const desk=box(-2.8,1.3,27.6,1.15,.14,.8,chamberMat(0xdcbd80),g);desk.rotation.x=.32;
 const page=box(-2.8,1.42,27.6,.86,.08,.56,glow(0x9ef0ff),g);page.rotation.x=.32;

 // 6. Hades Skelly-Style Training Dummy ("试刃靶偶 · 老铁桩") at (+5.0, 17.5)
 floorRing(5.0,17.5,1.95,0xff9666);
 const dummyRoot=new THREE.Group();
 dummyRoot.position.set(5.0,0,17.5);
 g.add(dummyRoot);
 cylinder(0,.22,0,.95,1.12,.44,chamberMat(0x2e4550),dummyRoot,10);
 cylinder(0,.48,0,.78,.86,.12,chamberMat(0xdcbd80),dummyRoot,10);
 const pivot=new THREE.Group();
 pivot.position.set(0,.52,0);
 dummyRoot.add(pivot);
 const dummyMat=chamberMat(0x9a6d52).clone();
 const dummyArmorMat=chamberMat(0xd99b56).clone();
 const dummyHeadMat=chamberMat(0xf0e4d2).clone();
 cylinder(0,.55,0,.14,.16,1.1,chamberMat(0x4b3b38),pivot,8);
 const torso=mesh(new THREE.CylinderGeometry(.42,.34,.92,10),dummyMat,0,1.18,0,pivot);
 const targetPlate=mesh(new THREE.CylinderGeometry(.30,.30,.08,16),glow(0xff784f),0,1.22,.39,pivot);
 targetPlate.rotation.x=Math.PI/2;
 const shoulderBar=box(0,1.52,0,1.55,.2,.22,dummyArmorMat,pivot);
 for(const s of [-1,1])box(s*.74,1.32,0,.22,.52,.22,dummyMat,pivot);
 const head=mesh(new THREE.DodecahedronGeometry(.32,0),dummyHeadMat,0,1.96,0,pivot);
 head.scale.set(.92,1.08,.92);
 box(0,1.98,.26,.44,.12,.12,glow(0xffcf6e),pivot);
 const crest=mesh(crystalGeo,glow(0xff8c5a),0,2.42,0,pivot);
 crest.scale.set(.18,.34,.18);crest.castShadow=false;
 const parryRing=mesh(yardRing,glow(0x78cfff),0,.08,0,dummyRoot);
 parryRing.rotation.x=-Math.PI/2;parryRing.scale.set(2.4,2.4,1);parryRing.visible=false;
 sanctuaryHub.dummy={
  root:dummyRoot,pivot,torso,head,crest,parryRing,
  mats:[dummyMat,dummyArmorMat,dummyHeadMat],
  pos:new THREE.Vector3(5.0,0,17.5),
  wobble:0,wobbleDir:new THREE.Vector2(0,1),flash:0
 };

 refreshSanctuaryCompanions();
}

function refreshSanctuaryCompanions(){
 if(!sanctuaryHub.propGroup)return;
 for(const npc of sanctuaryHub.npcs){
  if(npc.avatar)releasePlayer(npc.avatar);
  if(npc.ring)npc.ring.removeFromParent();
  if(npc.beacon)npc.beacon.removeFromParent();
 }
 sanctuaryHub.npcs.length=0;
 const others=Object.keys(expeditionRoles).filter(id=>id!==chosenClass);
 others.forEach((id,i)=>{
  const spot=SANCTUARY_NPC_SPOTS[i%SANCTUARY_NPC_SPOTS.length];
  const avatar=createMutant(id,true);
  // Move NPC avatar from actors group into sanctuaryGroup so it hides cleanly when entering combat!
  actors.remove(avatar.group);
  sanctuaryHub.propGroup.add(avatar.group);
  equipWeapon(avatar,SANCTUARY_DEFAULT_WEAPONS[id]||'katana');
  avatar.group.position.set(spot.x,0,spot.z);
  avatar.group.rotation.y=spot.yaw;
  const col=HEROES[id]?.color||0xf0cb86;
  const ring=mesh(yardRing,glow(col),spot.x,.045,spot.z,sanctuaryHub.propGroup);
  ring.scale.set(1.25,1.25,1);ring.rotation.x=-Math.PI/2;ring.castShadow=false;
  const beacon=mesh(crystalGeo,glow(0xffcf54),spot.x,3.15,spot.z,sanctuaryHub.propGroup);
  beacon.scale.set(.18,.36,.18);beacon.castShadow=false;
  sanctuaryHub.npcs.push({
   id,name:HEROES[id]?.name||id,color:HEROES[id]?.hex||'#f0cb86',
   avatar,ring,beacon,pos:new THREE.Vector3(spot.x,0,spot.z),baseYaw:spot.yaw
  });
 });
 updateSanctuaryNpcBeacons();
}

function updateSanctuaryNpcBeacons(){
 for(const npc of sanctuaryHub.npcs){
  const unread=typeof hasUnreadDialogue==='function'?hasUnreadDialogue(npc.id):false;
  npc.beacon.visible=unread;
 }
}

function getSanctuaryStations(){
 const list=[
  {id:'depart',kind:'depart',label:'踏入回响 · 出发拱门',sub:'开启新一轮远征',key:'F',pos:new THREE.Vector3(0,0,14.5),r:3.3,color:'#8ef5cf',height:4.2},
  {id:'mirror',kind:'mirror',label:'回响之镜',sub:'消耗残片永久强化',key:'F',pos:new THREE.Vector3(-6.6,0,21.8),r:3.1,color:'#d4b3ff',height:3.6},
  {id:'arsenal',kind:'arsenal',label:'军械与换装台',sub:'切换角色 · 武器 · 信物 · 难度',key:'F',pos:new THREE.Vector3(6.6,0,21.8),r:3.1,color:'#ffd580',height:3.4},
  {id:'dummy',kind:'dummy',label:'试刃靶偶 · 老铁桩',sub:'左/右键/E/Q 打桩试招 · 按 F 触发蓝光练反制',key:'F',pos:new THREE.Vector3(5.0,0,17.5),r:3.0,color:'#ffa070',height:3.0},
  {id:'prophecy',kind:'prophecy',label:'共鸣预言碑',sub:'查看命运预言与残片奖励',key:'F',pos:new THREE.Vector3(-5.0,0,17.5),r:2.9,color:'#ffe082',height:3.4},
  {id:'chronicle',kind:'chronicle',label:'晴湾纪事台',sub:'失电纪事 · 区域图鉴',key:'F',pos:new THREE.Vector3(-2.8,0,27.6),r:2.7,color:'#9be8f5',height:2.4}
 ];
 for(const npc of sanctuaryHub.npcs){
  const unread=typeof hasUnreadDialogue==='function'?hasUnreadDialogue(npc.id):false;
  list.push({
   id:'npc-'+npc.id,kind:'npc',npcId:npc.id,
   label:(unread?'! ':'')+npc.name,
   sub:unread?'有新对话 · 赠礼解锁信物':'与同伴交谈 · 切换信物',
   key:'F',pos:npc.pos,r:3.0,color:npc.color,height:3.1,unread
  });
 }
 return list;
}

function showArmoryDialog(){
 sanctuaryView='hero';
 const guide=$('rg-guide');
 const roster=Object.keys(expeditionRoles).map(id=>{
  const h=HEROES[id],r=expeditionRoles[id],sel=id===chosenClass;
  return '<button class="rg-armory-hero '+(sel?'selected':'')+'" data-armory-hero="'+id+'" style="--ink:'+h.hex+'"><strong>'+h.symbol+'</strong><div><b>'+h.name+'</b><small>'+h.hp+' HP · '+h.tag+'</small><span>'+r.brief+'</span></div></button>';
 }).join('');
 const weps=Object.entries(weaponSpecs).map(([id,w])=>{
  const sel=loadout[0]===id;
  return '<button class="rg-armory-wep '+(sel?'selected':'')+'" data-armory-weapon="'+id+'"><img src="'+assetURL('echo-item-'+id+'.webp')+'" alt=""><div><b>'+w.short+'</b><small>左 '+attackForms[id][0][0]+' · 右 '+attackForms[id][1][0]+'</small></div>'+(sel?'<em>已装备</em>':'')+'</button>';
 }).join('');
 const ksList=typeof COMPANION_PROFILES!=='undefined'?Object.values(COMPANION_PROFILES).map(p=>{
  const unlocked=typeof isKeepsakeUnlocked==='function'&&isKeepsakeUnlocked(p.id);
  const eq=typeof narrative!=='undefined'&&narrative.keepsake===p.id;
  return '<button class="rg-armory-ks '+(eq?'equipped':'')+'" data-armory-ks="'+p.id+'" '+(unlocked?'':'disabled')+'><b>'+p.keepsake.name+'</b><small>'+(unlocked?p.keepsake.desc:'与圣所中的 '+p.name+' 对话解锁')+'</small></button>';
 }).join(''):'';
 const depthVal=$('rg-depth')?.value||'0';
 const seedVal=$('rg-seed')?.value||'';
 const depthOpts=Array.from({length:record.depth+1},(_,i)=>'<option value="'+i+'" '+(String(i)===String(depthVal)?'selected':'')+'>'+(i?'阶梯 '+i+' · 敌人额外 '+i+' 词缀':'标准远征')+'</option>').join('');
 guide.innerHTML='<section class="rg-sanctuary-modal rg-armory-modal"><header><div><small>SANCTUARY ARMORY · 实时换装</small><h2>军械与换装台</h2></div><div class="rg-shard-pill">换完可直接去打旁边靶偶试手感</div><button data-close>返回圣所</button></header><div class="rg-armory-grid"><div><h4>01 / 异变者</h4><div class="rg-armory-heroes">'+roster+'</div></div><div><h4>02 / 武器</h4><div class="rg-armory-weps">'+weps+'</div><h4 style="margin-top:12px">03 / 同伴信物</h4><div class="rg-armory-ks-list">'+ksList+'</div><div class="rg-armory-run"><span>远征难度 <select id="rg-armory-depth">'+depthOpts+'</select></span><span>种子 <input id="rg-armory-seed" maxlength="32" value="'+seedVal+'" placeholder="留空随机"></span></div></div></div></section>';
 guide.classList.remove('hidden');
}

function triggerSanctuaryInteract(){
 if(!isSanctuaryRoam())return false;
 const st=sanctuaryHub.nearest;
 if(!st)return false;
 if(st.kind==='depart'){
  setSanctuaryRoamMode(false);
  startGame();
  return true;
 }
 if(st.kind==='mirror'){showMirrorDialog();return true;}
 if(st.kind==='arsenal'){showArmoryDialog();return true;}
 if(st.kind==='prophecy'){showProphecyDialog();return true;}
 if(st.kind==='chronicle'){
  if(typeof showChronicleDialog==='function')showChronicleDialog();
  else showFieldGuide();
  return true;
 }
 if(st.kind==='npc'){
  if(typeof showCompanionDialog==='function')showCompanionDialog(st.npcId);
  return true;
 }
 if(st.kind==='dummy'){
  // Trigger a telegraphed blue-flash swing so the player can practice Perfect Parry [C]!
  sanctuaryHub.dummyAttackTimer=.78;
  sanctuaryHub.dummyParryWindow=0;
  if(sanctuaryHub.dummy?.parryRing)sanctuaryHub.dummy.parryRing.visible=true;
  cue('charge',sanctuaryHub.dummy.pos);
  if(typeof showBark==='function'){
   showBark('老铁桩','试刃靶偶 · 蓝光演练','蓝光蓄力来咯！看好时机按 [C] 完美反制！',{color:'#7ce4ff',mark:'桩',duration:2.6,force:true});
  }
  return true;
 }
 return false;
}

function hitSanctuaryDummy(damage,tag='normal',colorHex=0xffcf78){
 const d=sanctuaryHub.dummy;
 if(!d)return;
 const p=player.group.position;
 const dir=d.pos.clone().sub(p).setY(0);
 if(dir.lengthSq()<.001)dir.set(0,0,-1);
 dir.normalize();
 d.wobble=.34;
 d.wobbleDir.set(dir.x,dir.z);
 d.flash=.16;
 hitstop=Math.max(hitstop,tag==='dash'||tag==='heavy'?.045:.022);
 shake=Math.max(shake,tag==='dash'||tag==='heavy'?.12:.05);
 const hitPt=d.pos.clone().add(new THREE.Vector3(0,1.45,0));
 impactSpray(hitPt,colorHex,tag==='dash'||tag==='heavy');
 ringAt(d.pos.clone().add(new THREE.Vector3(0,1.15,0)),colorHex,tag==='heavy'?2.2:1.5,.24,true);
 cue(tag==='heavy'||tag==='dash'?'heavy':'hit',hitPt);
 const cls=tag==='dash'?'dash':tag==='heavy'?'gold':tag==='skill'?'arc':'';
 if(typeof floatNumber==='function')floatNumber(hitPt,damage,cls==='gold',cls);
 if(tag==='dash'&&typeof calloutAt==='function')calloutAt(hitPt.clone().add(new THREE.Vector3(0,.5,0)),'冲刺斩！','dash');
 sanctuaryHub.dummyCombo++;
 sanctuaryHub.dummyComboTimer=3.4;
 sanctuaryHub.dpsLog.push({t:time,dmg:damage});
 if(sanctuaryHub.dummyBarkCd<=0&&typeof showBark==='function'){
  sanctuaryHub.dummyBarkCd=4.8;
  const line=DUMMY_BARKS[sanctuaryHub.dummyCombo%DUMMY_BARKS.length];
  showBark('老铁桩','圣所试刃靶偶',line,{color:'#ffaa72',mark:'桩',duration:3.0,force:true});
 }
 updateSanctuaryHubHUD();
}

function sanctuaryAttack(kind='melee'){
 if(!isSanctuaryRoam())return;
 const w=weaponNow(),d=sanctuaryHub.dummy;
 const p=player.group.position;
 if(kind==='parry'){
  sanctuaryHub.parryTime=.38;
  ringAt(p.clone().add(new THREE.Vector3(0,1.2,0)),0x8beeff,1.8,.28,true);
  cue('parry',p);
  if(sanctuaryHub.dummyParryWindow>0||sanctuaryHub.dummyAttackTimer>0&&sanctuaryHub.dummyAttackTimer<.32){
   sanctuaryHub.dummyAttackTimer=0;sanctuaryHub.dummyParryWindow=0;
   if(d?.parryRing)d.parryRing.visible=false;
   if(typeof calloutAt==='function')calloutAt(p.clone().add(new THREE.Vector3(0,1.9,0)),'完美反制！','gold');
   hitSanctuaryDummy(Math.round((w.damage||32)*2.1),'heavy',0x8beeff);
  }
  return;
 }
 if(kind==='skill'||kind==='utility'||kind==='burst'){
  if(sanctuaryHub.skillCd>0)return;
  sanctuaryHub.skillCd=.48;
  const col=HEROES[chosenClass]?.color||0xf5a66c;
  const dist=d?p.distanceTo(d.pos):99;
  if(d&&dist<9.5){
   player.group.rotation.y=Math.atan2(d.pos.x-p.x,d.pos.z-p.z);
  }
  const fwd=new THREE.Vector3(Math.sin(player.group.rotation.y),0,Math.cos(player.group.rotation.y));
  const fxPos=d&&dist<9.5?d.pos.clone():p.clone().addScaledVector(fwd,3.2);
  pulseAt(fxPos.clone().setY(.18),kind==='burst'?4.2:2.8,col);
  ringAt(p.clone().add(new THREE.Vector3(0,1.1,0)),col,kind==='burst'?3.6:2.2,.35,true);
  cue(kind==='burst'?'burst':'skill',p);
  player.attack=.38;
  sanctuaryHub.attackAnim=.36;sanctuaryHub.attackHeavy=true;
  if(d&&dist<(kind==='burst'?8.5:6.8)){
   hitSanctuaryDummy(kind==='burst'?135:kind==='skill'?72:54,'skill',col);
  }
  return;
 }
 if(sanctuaryHub.attackCd>0)return;
 const heavy=kind==='heavy';
 const isDash=!heavy&&sanctuaryHub.dashStrike>0;
 sanctuaryHub.dashStrike=0;
 sanctuaryHub.attackCd=heavy?.42:.24;
 sanctuaryHub.attackAnim=heavy?.40:.28;
 sanctuaryHub.attackHeavy=heavy||isDash;
 player.attack=sanctuaryHub.attackAnim;
 const dist=d?p.distanceTo(d.pos):99;
 if(d&&dist<(w.type==='ranged'?14:5.2)){
  player.group.rotation.y=Math.atan2(d.pos.x-p.x,d.pos.z-p.z);
 }
 const fwd=new THREE.Vector3(Math.sin(player.group.rotation.y),0,Math.cos(player.group.rotation.y));
 const col=prismColors[loadout[0]]||0xffcf80;
 if(w.type==='ranged'){
  const from=p.clone().add(new THREE.Vector3(0,1.45,0));
  const to=(d&&dist<15)?d.pos.clone().add(new THREE.Vector3(0,1.3,0)):from.clone().addScaledVector(fwd,11);
  drawTrail(from,to,col,heavy?.18:.1,heavy?.09:.05);
  cue('shoot',from);
  if(d&&dist<15){
   hitSanctuaryDummy(Math.round((w.damage||26)*(heavy?1.75:isDash?1.45:1)),isDash?'dash':heavy?'heavy':'normal',col);
  }
 }else{
  const reach=(w.range||3.4)+(isDash?1.1:.6);
  const slashPos=p.clone().addScaledVector(fwd,1.45).add(new THREE.Vector3(0,1.15,0));
  ringAt(slashPos,col,heavy?2.4:1.75,.2,true);
  if(isDash){
   p.x+=fwd.x*1.15;p.z+=fwd.z*1.15;clampSanctuaryPos(p);
  }
  cue('slash',p);
  if(d&&dist<=reach+1.1){
   hitSanctuaryDummy(Math.round((w.damage||28)*(isDash?1.55:heavy?1.65:1)),isDash?'dash':heavy?'heavy':'normal',col);
  }
 }
}

function sanctuaryDash(){
 if(!isSanctuaryRoam()||sanctuaryHub.dashCd>0)return;
 sanctuaryHub.dashTime=.22;
 sanctuaryHub.dashCd=.44;
 sanctuaryHub.dashStrike=.36;
 const ix=(input.KeyD||input.ArrowRight?1:0)-(input.KeyA||input.ArrowLeft?1:0);
 const iz=(input.KeyW||input.ArrowUp?1:0)-(input.KeyS||input.ArrowDown?1:0);
 const y=sanctuaryHub.yaw;
 sanctuaryHub.dashDir.set(ix*Math.cos(y)+iz*Math.sin(y),0,ix*Math.sin(y)-iz*Math.cos(y));
 if(sanctuaryHub.dashDir.lengthSq()<.05){
  sanctuaryHub.dashDir.set(Math.sin(player.group.rotation.y),0,Math.cos(player.group.rotation.y));
 }
 sanctuaryHub.dashDir.normalize();
 player.group.rotation.y=Math.atan2(sanctuaryHub.dashDir.x,sanctuaryHub.dashDir.z);
 particlesAt(player.group.position.clone().add(new THREE.Vector3(0,.45,0)),HEROES[chosenClass]?.color||0x9ff5d4,14,2.4);
 cue('dodge');
}

function clampSanctuaryPos(p){
 // Keep player smoothly inside the Blender Sanctuary Overlook terrace & balustrades
 p.y=0;
 p.z=clamp(p.z,13.6,30.2);
 p.x=clamp(p.x,-9.6,9.6);
 // Curved front cliff edge centered at (0, 21.5) with safe radius 10.7
 const dx=p.x,dz=p.z-21.5;
 if(dz<0){
  const r=Math.hypot(dx,dz);
  if(r>10.5){p.x=dx/r*10.5;p.z=21.5+dz/r*10.5;}
 }
 // Gentle collision around Mirror (-7.4, 22.0), Arsenal (+7.4, 22.0), Dummy (+5.0, 17.5), Prophecy (-5.0, 17.5)
 const blockers=[[-7.4,22.0,1.45],[7.4,22.0,1.45],[5.0,17.5,1.05],[-5.0,17.5,1.05],[-2.8,27.6,.9]];
 for(const [bx,bz,br] of blockers){
  const ox=p.x-bx,oz=p.z-bz,d=Math.hypot(ox,oz);
  if(d<br&&d>.001){p.x=bx+ox/d*br;p.z=bz+oz/d*br;}
 }
}

function updateSanctuaryHubHUD(){
 if(!sanctuaryHub.hudEl)return;
 const h=heroNow(),w=weaponNow();
 const ks=typeof narrative!=='undefined'&&narrative.keepsake&&typeof COMPANION_PROFILES!=='undefined'
  ?COMPANION_PROFILES[narrative.keepsake]?.keepsake.name:'未装备信物';
 const recentDmg=sanctuaryHub.dpsLog.reduce((s,x)=>s+x.dmg,0);
 const dps=Math.round(recentDmg/3);
 const dpsHtml=sanctuaryHub.dummyCombo>0?'<span class="rg-hub-dps">🎯 '+sanctuaryHub.dummyCombo+' 连击 · '+dps+' DPS</span>':'';
 const info=sanctuaryHub.hudEl.querySelector('.rg-hub-status');
 if(info){
  info.innerHTML='<b>'+h.name+'</b><i>·</i><span>'+w.short+'</span><i>·</i><span>'+ks+'</span><i>·</i><em>◈ '+meta.shards+' 残片</em>'+dpsHtml;
 }
}

function updateSanctuaryHub(dt){
 buildSanctuaryHubProps();
 // Animate Sanctuary props (rings, hovering weapons, rift curtain, prophecy gem, NPCs, dummy)
 for(const r of sanctuaryHub.stationRings){
  const s=r.base*(1+.045*Math.sin(time*2.6+r.phase));
  r.mesh.scale.set(s,s,1);
 }
 for(const rw of sanctuaryHub.rackWeapons){
  rw.group.rotation.y+=dt*1.3;
  rw.group.position.y=2.35+Math.sin(time*2.2+rw.i)*.12;
 }
 if(sanctuaryHub.riftCurtain){
  sanctuaryHub.riftCurtain.material.opacity=.18+.09*Math.sin(time*2.4);
 }
 if(sanctuaryHub.prophecyGem){
  const hasClaim=meta.completed.some(id=>!meta.claimed.includes(id));
  sanctuaryHub.prophecyGem.rotation.y+=dt*(hasClaim?3.6:1.2);
  sanctuaryHub.prophecyGem.position.y=3.18+Math.sin(time*(hasClaim?4.5:2.0))*.14;
 }
 // Animate 3D companions standing around the courtyard
 for(const npc of sanctuaryHub.npcs){
  animateMutant(npc.avatar,dt,false);
  poseWeapon(npc.avatar,null,true);
  const dist=npc.pos.distanceTo(player.group.position);
  const goalYaw=dist<5.2?Math.atan2(player.group.position.x-npc.pos.x,player.group.position.z-npc.pos.z):npc.baseYaw;
  const diff=Math.atan2(Math.sin(goalYaw-npc.avatar.group.rotation.y),Math.cos(goalYaw-npc.avatar.group.rotation.y));
  npc.avatar.group.rotation.y+=diff*Math.min(1,dt*5);
  if(npc.beacon.visible){
   npc.beacon.rotation.y+=dt*3.2;
   npc.beacon.position.y=3.15+Math.sin(time*3.8+npc.pos.x)*.14;
  }
 }
 // Animate Training Dummy wobble, flash, parry drill & DPS decay
 const d=sanctuaryHub.dummy;
 if(d){
  if(d.wobble>0){
   d.wobble=Math.max(0,d.wobble-dt*1.1);
   const ang=Math.sin(d.wobble*28)*d.wobble*1.35;
   d.pivot.rotation.x=d.wobbleDir.y*ang;
   d.pivot.rotation.z=-d.wobbleDir.x*ang;
  }else{
   d.pivot.rotation.x=lerp(d.pivot.rotation.x,0,dt*10);
   d.pivot.rotation.z=lerp(d.pivot.rotation.z,0,dt*10);
  }
  if(d.flash>0){
   d.flash=Math.max(0,d.flash-dt);
   for(const m of d.mats){m.emissive.setHex(0xffffff);m.emissiveIntensity=d.flash*6;}
  }else{
   for(const m of d.mats)m.emissiveIntensity=0;
  }
  d.crest.rotation.y+=dt*2.4;
  if(sanctuaryHub.dummyAttackTimer>0){
   sanctuaryHub.dummyAttackTimer-=dt;
   d.parryRing.scale.setScalar(1.2+sanctuaryHub.dummyAttackTimer*2.2);
   if(sanctuaryHub.dummyAttackTimer<=0){
    d.parryRing.visible=false;
    sanctuaryHub.dummyParryWindow=.18;
    ringAt(d.pos.clone().add(new THREE.Vector3(0,1.2,0)),0x78cfff,3.2,.25,true);
    cue('heavy',d.pos);
   }
  }else if(sanctuaryHub.dummyParryWindow>0){
   sanctuaryHub.dummyParryWindow=Math.max(0,sanctuaryHub.dummyParryWindow-dt);
  }
 }
 sanctuaryHub.dummyBarkCd=Math.max(0,sanctuaryHub.dummyBarkCd-dt);
 if(sanctuaryHub.dummyComboTimer>0){
  sanctuaryHub.dummyComboTimer-=dt;
  if(sanctuaryHub.dummyComboTimer<=0){sanctuaryHub.dummyCombo=0;updateSanctuaryHubHUD();}
 }
 while(sanctuaryHub.dpsLog.length&&time-sanctuaryHub.dpsLog[0].t>3){sanctuaryHub.dpsLog.shift();updateSanctuaryHubHUD();}

 // Update Sanctuary player movement & combat practice when roaming!
 sanctuaryHub.dashCd=Math.max(0,sanctuaryHub.dashCd-dt);
 sanctuaryHub.dashStrike=Math.max(0,sanctuaryHub.dashStrike-dt);
 sanctuaryHub.attackCd=Math.max(0,sanctuaryHub.attackCd-dt);
 sanctuaryHub.attackAnim=Math.max(0,sanctuaryHub.attackAnim-dt);
 sanctuaryHub.skillCd=Math.max(0,sanctuaryHub.skillCd-dt);
 sanctuaryHub.parryTime=Math.max(0,sanctuaryHub.parryTime-dt);

 const roaming=isSanctuaryRoam();
 let moving=false;
 if(roaming){
  const p=player.group.position,prev=p.clone();
  if(sanctuaryHub.dashTime>0){
   sanctuaryHub.dashTime=Math.max(0,sanctuaryHub.dashTime-dt);
   p.x+=sanctuaryHub.dashDir.x*21*dt;
   p.z+=sanctuaryHub.dashDir.z*21*dt;
   player.rig.rotation.z=Math.sin(sanctuaryHub.dashTime/.22*Math.PI)*.32;
   moving=true;
  }else{
   player.rig.rotation.z=0;
   const ix=(input.KeyD||input.ArrowRight?1:0)-(input.KeyA||input.ArrowLeft?1:0);
   const iz=(input.KeyW||input.ArrowUp?1:0)-(input.KeyS||input.ArrowDown?1:0);
   const y=sanctuaryHub.yaw;
   const vx=ix*Math.cos(y)+iz*Math.sin(y),vz=ix*Math.sin(y)-iz*Math.cos(y);
   const len=Math.hypot(vx,vz);
   if(len>.05){
    const spd=8.8;
    p.x+=vx/len*spd*dt;p.z+=vz/len*spd*dt;
    const goalYaw=Math.atan2(vx,vz);
    const diff=Math.atan2(Math.sin(goalYaw-player.group.rotation.y),Math.cos(goalYaw-player.group.rotation.y));
    player.group.rotation.y+=diff*Math.min(1,dt*14);
    moving=true;
   }
  }
  clampSanctuaryPos(p);
  playerMotion.copy(p).sub(prev).divideScalar(Math.max(dt,.001));
 }else{
  playerMotion.set(0,0,0);
 }
 animateMutant(player,dt,moving);
 if(sanctuaryHub.attackAnim>0){
  poseWeapon(player,{id:loadout[0],windup:.1,duration:.36,elapsed:.36-sanctuaryHub.attackAnim,step:sanctuaryHub.attackHeavy?2:1},false);
 }else{
  poseWeapon(player,null,true);
 }
 if(typeof updateEffects==='function')updateEffects(dt);

 // Proximity detection & floating 3D world labels
 const stations=getSanctuaryStations();
 let best=null,bestD=Infinity;
 for(const st of stations){
  const dist=player.group.position.distanceTo(st.pos);
  if(dist<st.r&&dist<bestD){bestD=dist;best=st;}
 }
 sanctuaryHub.nearest=best;
 if(sanctuaryHub.promptEl){
  if(roaming&&best){
   sanctuaryHub.promptEl.classList.remove('hidden');
   sanctuaryHub.promptEl.style.setProperty('--ink',best.color);
   sanctuaryHub.promptEl.innerHTML='<kbd>'+best.key+'</kbd><div><b>'+best.label+'</b><small>'+best.sub+'</small></div>';
  }else{
   sanctuaryHub.promptEl.classList.add('hidden');
  }
 }
 // Project crisp floating 3D labels for nearby Sanctuary stations
 if(sanctuaryHub.labelsEl&&roaming&&typeof window!=='undefined'&&window.innerWidth>0){
  let html='';
  const proj=new THREE.Vector3();
  for(const st of stations){
   proj.set(st.pos.x,st.height,st.pos.z).project(camera);
   if(proj.z>1||proj.z<-1)continue;
   const sx=(proj.x*.5+.5)*innerWidth,sy=(-proj.y*.5+.5)*innerHeight;
   if(sx<-40||sx>innerWidth+40||sy<20||sy>innerHeight-20)continue;
   const active=best&&best.id===st.id;
   html+='<div class="rg-world-tag '+(active?'active':'')+(st.unread?' unread':'')+'" style="left:'+sx.toFixed(0)+'px;top:'+sy.toFixed(0)+'px;--ink:'+st.color+'">'+st.label+'</div>';
  }
  sanctuaryHub.labelsEl.innerHTML=html;
 }
}

function updateSanctuaryHubCamera(dt){
 if(!isSanctuaryRoam())return false;
 const p=player.group.position;
 const y=sanctuaryHub.yaw;
 if(sanctuaryHub.midOrbit){
  // Close-up 360° front/portrait inspection orbit while holding Middle Mouse Button!
  const dist=5.2,pitch=clamp(sanctuaryHub.pitch,-.12,.92);
  const h=Math.cos(pitch)*dist;
  const goalPos=new THREE.Vector3(p.x+Math.sin(y)*h,Math.max(.65,p.y+1.65+Math.sin(pitch)*dist),p.z+Math.cos(y)*h);
  camera.position.lerp(goalPos,1-Math.exp(-dt*12));
  camera.lookAt(p.x,p.y+1.42,p.z);
  camera.fov=lerp(camera.fov,50,dt*7);
  camera.updateProjectionMatrix();
  return true;
 }
 // Hades-style elevated courtyard follow camera that always frames the Grand Archway & 3-Act Vista!
 const camDist=9.2,camH=6.1;
 const goalPos=new THREE.Vector3(p.x+Math.sin(y)*camDist,p.y+camH,p.z+Math.cos(y)*camDist);
 const goalLook=new THREE.Vector3(p.x-Math.sin(y)*3.2,p.y+1.65,p.z-Math.cos(y)*3.2);
 camera.position.lerp(goalPos,1-Math.exp(-dt*7.5));
 camera.lookAt(goalLook);
 camera.fov=lerp(camera.fov,55,dt*5);
 camera.updateProjectionMatrix();
 return true;
}

function initSanctuaryHub(){
 if(!rogueMode||typeof document==='undefined'||!document.body?.appendChild)return;
 buildSanctuaryHubProps();

 // Create sleek Hades Sanctuary Live HUD overlay (shown when roaming!)
 const hud=document.createElement('div');
 hud.id='rg-hub-hud';
 hud.className='hidden';
 hud.innerHTML='<div class="rg-hub-top"><div class="rg-hub-brand"><small>SANCTUARY COURTYARD · '+(typeof GAME_VERSION!=='undefined'?GAME_VERSION:'v0.3.1')+'</small><strong>远征圣所</strong><div class="rg-hub-status"></div></div><div class="rg-hub-quick"><button data-hub-act="armory">⚔ 换装 / 难度</button><button data-hub-act="mirror">🪞 回响之镜</button><button data-hub-act="prophecy">📜 预言</button><button data-hub-act="vista">🌄 俯瞰 [V]</button><button data-hub-act="menu">☰ 菜单 [M]</button><button data-hub-act="intro">🎬 重播开场</button></div></div><div class="rg-hub-controls"><span><kbd>WASD</kbd> 自由走动</span><span><kbd>SHIFT</kbd> 冲刺</span><span><kbd>左/右键</kbd> <kbd>E/X/Q</kbd> 打桩试招</span><span><kbd>长按中键</kbd> 360°看正面</span><span><kbd>F</kbd> 交互 / 从正前方拱门出发</span></div>';
 $('menu').after(hud);
 sanctuaryHub.hudEl=hud;

 const labels=document.createElement('div');
 labels.id='rg-hub-labels';
 labels.className='hidden';
 hud.after(labels);
 sanctuaryHub.labelsEl=labels;

 const prompt=document.createElement('div');
 prompt.id='rg-hub-prompt';
 prompt.className='hidden';
 labels.after(prompt);
 sanctuaryHub.promptEl=prompt;

 // Add a button inside classic #menu to return straight into walkable 3D Courtyard
 const hubBar=document.querySelector('.rg-hub-actions');
 if(hubBar){
  const walkBtn=document.createElement('button');
  walkBtn.id='rg-enter-courtyard';
  walkBtn.textContent='🚶 走进圣所大厅';
  hubBar.prepend(walkBtn);
  walkBtn.addEventListener('click',()=>setSanctuaryRoamMode(true));
 }

 hud.addEventListener('click',e=>{
  const btn=e.target.closest('button[data-hub-act]');
  if(!btn)return;
  const act=btn.dataset.hubAct;
  if(act==='armory')showArmoryDialog();
  else if(act==='mirror')showMirrorDialog();
  else if(act==='prophecy')showProphecyDialog();
  else if(act==='vista'){
   sanctuaryView=sanctuaryView==='panorama'?'hero':'panorama';
   hud.classList.toggle('vista',sanctuaryView==='panorama');
   btn.textContent=sanctuaryView==='panorama'?'↩ 返回大厅 [V]':'🌄 俯瞰 [V]';
  }else if(act==='menu'){
   setSanctuaryRoamMode(false);
  }else if(act==='intro'){
   startOpeningCinematic();
  }
 });

 // Hook Armory dialog clicks inside #rg-guide
 $('rg-guide').addEventListener('click',e=>{
  const hBtn=e.target.closest('button[data-armory-hero]');
  if(hBtn){
   chosenClass=hBtn.dataset.armoryHero;
   const prevPos=player.group.position.clone(),prevRot=player.group.rotation.y;
   releasePlayer(player);player=createMutant(chosenClass,true);equipWeapon(player,loadout[activeWeapon]);
   player.group.position.copy(prevPos);player.group.rotation.y=prevRot;
   refreshLoadout();refreshPortrait();refreshSanctuaryCompanions();
   if(typeof updateNarrativeHubUI==='function')updateNarrativeHubUI();
   updateSanctuaryHubHUD();showArmoryDialog();
   cue('clear');return;
  }
  const wBtn=e.target.closest('button[data-armory-weapon]');
  if(wBtn){
   loadout[0]=wBtn.dataset.armoryWeapon;activeWeapon=0;
   equipWeapon(player,loadout[0]);refreshLoadout();updateSanctuaryHubHUD();showArmoryDialog();
   cue('slash');return;
  }
  const kBtn=e.target.closest('button[data-armory-ks]');
  if(kBtn&&!kBtn.disabled&&typeof equipKeepsake==='function'){
   equipKeepsake(kBtn.dataset.armoryKs);updateSanctuaryHubHUD();showArmoryDialog();
   cue('prophecy');return;
  }
 });
 $('rg-guide').addEventListener('change',e=>{
  if(e.target.id==='rg-armory-depth'&&$('rg-depth'))$('rg-depth').value=e.target.value;
  if(e.target.id==='rg-armory-seed'&&$('rg-seed'))$('rg-seed').value=e.target.value;
 });
 $('rg-guide').addEventListener('input',e=>{
  if(e.target.id==='rg-armory-seed'&&$('rg-seed'))$('rg-seed').value=e.target.value;
 });

 // Refresh 3D companions whenever player switches hero via classic #menu
 document.querySelectorAll?.('[data-hero]')?.forEach?.(el=>{
  el.addEventListener('click',()=>{refreshSanctuaryCompanions();updateSanctuaryHubHUD();});
 });
 document.querySelectorAll?.('[data-weapon]')?.forEach?.(el=>{
  el.addEventListener('click',()=>updateSanctuaryHubHUD());
 });

 // Live Sanctuary mouse & keyboard controls (NO pointer lock required!)
 canvas.addEventListener('mousedown',e=>{
  if(!isSanctuaryRoam())return;
  if(e.button===0){sanctuaryAttack('melee');}
  else if(e.button===1){
   e.preventDefault();
   sanctuaryHub.midOrbit=true;sanctuaryHub.lastX=e.clientX;sanctuaryHub.lastY=e.clientY;
  }else if(e.button===2){
   sanctuaryHub.dragging=true;sanctuaryHub.lastX=e.clientX;
   sanctuaryHub._rDownTime=performance.now();sanctuaryHub._rMoved=0;
  }
 });
 window.addEventListener('mousemove',e=>{
  if(!isSanctuaryRoam())return;
  if(sanctuaryHub.midOrbit){
   const dx=e.clientX-sanctuaryHub.lastX,dy=e.clientY-sanctuaryHub.lastY;
   sanctuaryHub.lastX=e.clientX;sanctuaryHub.lastY=e.clientY;
   sanctuaryHub.yaw-=dx*.0075;
   sanctuaryHub.pitch=clamp(sanctuaryHub.pitch+dy*.0055,-.12,.92);
   return;
  }
  if(!sanctuaryHub.dragging)return;
  const dx=e.clientX-sanctuaryHub.lastX;sanctuaryHub.lastX=e.clientX;
  sanctuaryHub._rMoved+=Math.abs(dx);
  sanctuaryHub.yaw-=dx*.006;
 });
 window.addEventListener('mouseup',e=>{
  if(e.button===1&&sanctuaryHub.midOrbit){sanctuaryHub.midOrbit=false;}
  if(e.button===2&&sanctuaryHub.dragging){
   sanctuaryHub.dragging=false;
   if(sanctuaryHub._rMoved<8&&isSanctuaryRoam())sanctuaryAttack('heavy');
  }
 });
 window.addEventListener('keydown',e=>{
  if(!rogueMode||state!=='menu')return;
  if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'))return;
  const modalOpen=$('rg-guide')&&!$('rg-guide').classList.contains('hidden');
  if(e.code==='Escape'&&!modalOpen){
   if(sanctuaryView==='panorama'){
    sanctuaryView='hero';sanctuaryHub.hudEl?.classList.remove('vista');return;
   }
   if(!sanctuaryHub.roam&&typeof window!=='undefined'&&window.innerWidth>0){
    setSanctuaryRoamMode(true);return;
   }
  }
  if(e.code==='KeyV'&&!modalOpen&&sanctuaryHub.roam){
   sanctuaryView=sanctuaryView==='panorama'?'hero':'panorama';
   sanctuaryHub.hudEl?.classList.toggle('vista',sanctuaryView==='panorama');
   return;
  }
  if((e.code==='KeyM'||e.code==='Tab')&&!modalOpen){
   e.preventDefault();
   setSanctuaryRoamMode(!sanctuaryHub.roam);
   return;
  }
  if(!isSanctuaryRoam())return;
  input[e.code]=true;
  if(e.repeat)return;
  if(e.code==='KeyF'||e.code==='Space'){e.preventDefault();triggerSanctuaryInteract();}
  else if(e.code==='ShiftLeft'||e.code==='ShiftRight')sanctuaryDash();
  else if(e.code==='KeyE')sanctuaryAttack('skill');
  else if(e.code==='KeyX')sanctuaryAttack('utility');
  else if(e.code==='KeyQ')sanctuaryAttack('burst');
  else if(e.code==='KeyC')sanctuaryAttack('parry');
 });
}

// Clean hooks into existing Sanctuary lifecycle without breaking headless tests
const _hubInitExpedition=initializeExpedition;
initializeExpedition=function(){
 _hubInitExpedition();
 initSanctuaryHub();
};
const _hubFinishCinematic=finishOpeningCinematic;
finishOpeningCinematic=function(){
 _hubFinishCinematic();
 if(typeof window!=='undefined'&&window.innerWidth>0){
  player.group.position.set(0,0,22.8);player.group.rotation.y=Math.PI;
  sanctuaryHub.yaw=0;
  refreshSanctuaryCompanions();
  setSanctuaryRoamMode(true);
 }
};
const _hubReturnMenu=returnMenu;
returnMenu=function(){
 _hubReturnMenu();
 if(rogueMode){
  if(typeof window!=='undefined'&&window.innerWidth>0){
   player.group.position.set(0,0,22.8);player.group.rotation.y=Math.PI;
   sanctuaryHub.yaw=0;
   refreshSanctuaryCompanions();
   setSanctuaryRoamMode(true);
  }
 }
};
const _hubStartGame=startGame;
startGame=function(){
 if(rogueMode){
  sanctuaryHub.roam=false;
  sanctuaryHub.hudEl?.classList.add('hidden');
  sanctuaryHub.labelsEl?.classList.add('hidden');
  sanctuaryHub.promptEl?.classList.add('hidden');
 }
 return _hubStartGame();
};
const _hubCloseGuide=closeFieldGuide;
closeFieldGuide=function(){
 _hubCloseGuide();
 updateSanctuaryNpcBeacons();
 updateSanctuaryHubHUD();
};
