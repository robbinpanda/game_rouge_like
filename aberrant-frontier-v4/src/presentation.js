function assetURL(name){return 'assets/'+name;}
function cancelStrike(){raid.strike=null;player.attack=0;}
function beginStrike(heavy=false){
 const id=loadout[activeWeapon],base=weaponNow(),bonus=rogueMode?formReach(id,heavy):0;
 const dashStrike=rogueMode&&!heavy&&dashStrikeWindow>0&&dodgeTime<=.12;
 const w=bonus||dashStrike?{...base,reach:base.reach+bonus+(dashStrike?1.35:0),heavyReach:base.heavyReach+bonus}:base;
 if(meleeCd>0||(!dashStrike&&dodgeTime>0)||raid.map||raid.search||raid.heal>0||state!=='playing'||grappleTarget)return;
 if(dashStrike){dashStrikeWindow=0;dodgeTime=0;}
 combo=heavy?2:dashStrike?1:comboWindow>0?(combo+1)%3:0;comboWindow=1.45;
 const frenzy=rogueMode&&rank('dual-frenzy')?Math.max(.6,1-Math.min(10,comboHits)*.04):1;
 const slow=loadout[activeWeapon]==='hammer',duration=(heavy?slow?.92:.68:dashStrike?.26:w.cooldown[combo])*(chosenClass==='reaper'&&buffTime>0?.73:1)*(rogueMode?giftTempo():1)*frenzy;
 const opportunity=raid.opening;
 const riposte=opportunity&&opportunity.until>=time&&!opportunity.enemy.dead&&nearestEnemy(w.heavyReach+1,.12)===opportunity.enemy;
 const target=rogueMode?null:riposte?opportunity.enemy:nearestEnemy((heavy?w.heavyReach:w.reach)+1,.25),forward=new THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw));if(rogueMode)forward.copy(faceReticle());if(target){const d=target.avatar.group.position.clone().sub(player.group.position);forward.copy(d).setY(0).normalize();}
 if(rogueMode){
  const assistance=riposte?opportunity.enemy:(lockTarget&&!lockTarget.dead?lockTarget:nearestEnemy(Math.min(6.4,(heavy?w.heavyReach:w.reach)+.65),.92));
  if(assistance)forward.copy(assistance.avatar.group.position).sub(player.group.position).setY(0).normalize();
 }
 player.group.rotation.y=Math.atan2(forward.x,forward.z);meleeCd=duration;player.attack=duration;
 if(riposte)raid.opening=null;
 raid.strike={elapsed:0,duration,windup:duration*(riposte?.18:dashStrike?.22:heavy?.38:slow?.41:.28),riposte,dashStrike,heavy,step:combo,w,id:loadout[activeWeapon],forward,hit:false,lunged:false};
 if(rogueMode&&heavy&&id==='hammer'&&rank('hammer-meteor')&&grounded){velocityY=6.8;grounded=false;}
 raid.search=null;emitNoise(heavy?33:16);if(!rogueMode)audioTone(slow?90:210,.12,'triangle',.026,.35);
}
function melee(){if(raid.map||raid.heal>0||raid.search||mouseRight)return;const w=weaponNow();if(w.type==='ranged'){if(meleeCd>0||(dodgeTime>.12)||state!=='playing'||grappleTarget)return;if(rogueMode){fireForm(false);return;}meleeCd=w.cooldown[0]*(chosenClass==='reaper'&&buffTime>0?.7:1);shoot();return;}beginStrike();}
function releaseHeavy(){
 if(rogueMode){alternateAttack();return;}
 if(raid.map||raid.heal>0||raid.search||state!=='playing'||meleeCd>0)return;const w=weaponNow(),charged=chargeTime>=w.charge;mouseRight=false;
 if(w.type==='ranged'){meleeCd=(charged?.9:w.cooldown[0])*(rogueMode?giftTempo():1);shoot(charged?2:1);if(charged&&loadout[activeWeapon]==='crossbow'){shoot(2,.035);shoot(2,-.035);}return;}beginStrike(charged);
}
function updateStrikes(dt){
 const a=raid.strike;if(!a)return;a.elapsed+=dt;
 if(a.elapsed>=a.windup&&!a.hit){a.hit=true;
  const reach=a.heavy||a.riposte?a.w.heavyReach:a.w.reach;
  const baseDmg=a.riposte?a.w.heavy*1.3:a.heavy?a.w.heavy:a.dashStrike?Math.round(a.w.damage[1]*1.28):a.w.damage[a.step];
  const damage=Math.round(baseDmg*(1+evolution*.18));
  move(player.group,a.forward.x*(a.dashStrike?1.55:a.heavy?.95:.45),a.forward.z*(a.dashStrike?1.55:a.heavy?.95:.45));
  const arc=a.dashStrike?-.35:rogueMode&&a.heavy&&a.id==='dual'?-1.01:a.heavy&&a.id==='hammer'?-.7:a.w.arc;
  const contacts=attackArea(a.forward,reach,arc,damage,a.heavy||a.riposte||a.step===2||a.dashStrike,a.heavy?.8:a.w.stagger,a.id,rogueMode?formPush(a.id,a.heavy):0,a.dashStrike);
  drawActionArc(a);
  if(a.dashStrike){
   cue('dashStrike');
   if(contacts){calloutAt(player.group.position,'冲刺斩！','dash');if(typeof noteProphecyMetric==='function')noteProphecyMetric('dashStrike');}
   if(chosenClass==='shade'&&rank('shadowStep')){run.power=Math.min(5,run.power+2);empowered=Math.max(empowered,3);}
  }else if(rogueMode){if(!contacts)cue('swing');}
  else audioTone(a.id==='hammer'?65:130+a.step*50,.12,'sawtooth',.03,.16);
  if(a.heavy&&a.id==='katana'){
   const spreads=rogueMode&&rank('katana-fan')?[-.24,0,.24]:[0];
   const origin=player.group.position.clone().add(new THREE.Vector3(0,1.4,0));
   for(const sp of spreads){
    const dir=a.forward.clone().applyAxisAngle(effectUp,sp);
    createProjectile(origin,dir,'player',38,0xffb97e,rogueMode?formShot('katana',true):null);
    const p=projectiles.at(-1);p.weapon=a.id;p.heavy=true;p.life=.5+(rogueMode?4*attackRank(a.id,true)/36:0);
    if(!rogueMode)p.m.scale.set(2.5,.6,1);
   }
  }
  if(rogueMode&&a.id==='katana'&&rank('katana-nova')&&(a.step===2||a.dashStrike)){
   blast(player.group.position,4.8,32,0xff8b4d,true);calloutAt(player.group.position,'回旋炎环','ember');cue('fire',player.group.position);
  }
  if(rogueMode&&a.heavy&&a.id==='spear'&&rank('spear-flurry')){
   const origin=player.group.position.clone().add(new THREE.Vector3(0,1.35,0));
   for(const sp of [-.10,.10]){
    const dir=a.forward.clone().applyAxisAngle(effectUp,sp);
    createProjectile(origin,dir,'player',34,0x71d8c2,formShot('spear',true));
    const p=projectiles.at(-1);p.weapon='spear';p.heavy=true;p.life=.28;p.pierced=new Set();p.pierceLimit=4;
   }
  }
  if(a.heavy&&a.id==='hammer'){
   if(!rogueMode)ringAt(player.group.position.clone().add(new THREE.Vector3(0,.13,0)),0xffc293,6,.55);
   particlesAt(player.group.position,0xe6c3a2,25,6);shake=Math.max(shake,.26);
   if(rogueMode&&rank('hammer-meteor')){blast(player.group.position,6.5,42,0xffbf56);calloutAt(player.group.position,'陨星跳砸','gold');cue('hammer',player.group.position);}
  }
  if(rogueMode&&a.id==='hammer'&&rank('hammer-wave')&&(a.heavy||a.step===2)){
   const origin=player.group.position.clone().add(new THREE.Vector3(0,.65,0));
   createProjectile(origin,a.forward,'player',48,0xffbf56,formShot('katana',true));
   const p=projectiles.at(-1);p.weapon='hammer';p.heavy=true;p.life=.38;p.pierced=new Set();p.pierceLimit=6;
  }
 }
 if(a.elapsed>=a.duration)raid.strike=null;
}
function animateAction(dt){
 const a=raid.strike;
 poseWeapon(player,a);
 if(a){
  const weight=Math.sin(Math.PI*Math.min(1,a.elapsed/a.duration));
  player.legs[0].rotation.x=-.33*weight;player.legs[1].rotation.x=.24*weight;
  if(player.knees)player.knees[0].rotation.x+=.42*weight;
  if(rogueMode){player.rig.rotation.x+=weight*(a.heavy?.30:.14);player.rig.position.y-=weight*(a.heavy?.22:.12);}
 }
 if(player.regalia)player.regalia.rotation.x=-.06-.22*Math.min(1,playerMotion.length()/8)+Math.sin(player.phase*.8)*.045;
 if(dodgeTime>0){const t=1-dodgeTime/.26;player.rig.position.y=-Math.sin(t*Math.PI)*.48;player.rig.rotation.x=Math.sin(t*Math.PI)*.7;player.legs[0].rotation.x=-.8;player.legs[1].rotation.x=1.1;}
 if(!grounded&&!grappleTarget){player.legs[0].rotation.x=-.6;player.legs[1].rotation.x=.3;player.arms[0].rotation.z=.6;}
 if(input.ControlLeft){player.rig.position.y-=.42;player.rig.rotation.x=.3;player.legs[0].rotation.x=-.4;player.legs[1].rotation.x=.4;}
 if(raid.sprinting){player.rig.rotation.x=.24;player.rig.position.y+=Math.sin(player.phase*2)*.04;}
 raid.ghostTimer-=dt;if((dodgeTime>0||raid.sprinting)&&raid.ghostTimer<=0){raid.ghostTimer=.07;const p=player.group.position;drawTrail(new THREE.Vector3(p.x,p.y+.7,p.z),new THREE.Vector3(p.x-playerMotion.x*.07,p.y+1.4,p.z-playerMotion.z*.07),heroNow().color,.16,.12);}
}
function augmentHero(avatar){
 const {type,rig,arms}=avatar,h=HEROES[type],dark=mat(0x263e46),ivory=mat(0xeee6d2),accent=mat(h.armor),light=glow(h.color);
 if(type==='ember'){
  const shoulder=mesh(icoGeo,ivory,0,-.06,0,arms[1]);shoulder.scale.set(.32,.24,.34);box(.05,-.67,.19,.05,.35,.035,light,arms[1]);
  for(const side of [-1,1]){const panel=box(side*.3,1.15,-.09,.35,.65,.17,accent,rig);panel.rotation.z=-side*.16;box(side*.21,1.94,-.23,.24,.22,.19,accent,rig).rotation.x=-.4;}
  box(-.39,1.02,.1,.25,.32,.25,ivory,rig);
 }else if(type==='frost'){
  for(let i=0;i<4;i++){const crystal=mesh(icoGeo,light,-.08+(i%2)*.13,-.2-i*.21,.05,arms[0]);crystal.scale.set(.16,.22,.19);}
  if(!rogueMode)for(const side of [-1,1]){const tail=box(side*.25,.86,-.2,.35,.86,.1,ivory,rig);tail.rotation.z=side*.16;}
  box(-.1,2.45,.19,.12,.3,.1,light,rig);
 }else if(type==='shade'){
  for(const side of [-1,1]){const scarf=box(side*.23,1.35,-.3,.18,1.2,.08,accent,rig);scarf.rotation.x=.2;}
  box(0,2.2,.23,.4,.18,.06,dark,rig);box(0,2.33,.27,.3,.035,.03,light,rig);
 }else if(type==='bastion'){
  for(const side of [-1,1]){const pad=mesh(icoGeo,ivory,0,-.12,0,arms[side===1?1:0]);pad.scale.set(.38,.32,.4);for(let i=0;i<3;i++)box(side*.29,1.25+i*.18,.32,.42,.13,.13,ivory,rig);}
 }
 if(type!=='frost'&&type!=='bastion')for(let i=0;i<5;i++){const hair=mesh(icoGeo,dark,-.2+i*.1,2.53+Math.sin(i)*.06,-.05,rig);hair.scale.set(.1,.16,.15);hair.rotation.z=-.3;}
 return avatar;
}
function initializeV4(){
 const panel=document.createElement('div');panel.id='expedition-brief';panel.innerHTML='<div class="brief-image"></div><div><small>OPERATION / 04</small><h3>晴湾远征</h3><p>六片街区，一场取舍。<br>带上能带走的，放下不值得的。</p><span>6 探索区域 <i>／</i> 5 撤离路线</span></div><div class="brief-stat"><small>仓库资产</small><b>¤ <span id="credit-value">'+raid.credits+'</span></b><em>物资成功撤离后自动结算</em></div>';$('menu').appendChild(panel);
 const route=document.createElement('section');route.id='raid-route';route.innerHTML='<small>撤离导航 <span>T 切换 / M 地图</span></small><b id="route-name"></b><p id="route-status"></p><div id="route-distance"></div>';$('hud').appendChild(route);
 const bag=document.createElement('div');bag.id='cargo-strip';bag.innerHTML='<b>¤ <span id="cargo-value">0</span></b><span id="cargo-weight">0 / 28 KG</span><span id="med-count">急救 × 2</span><i id="noise-meter"></i>';$('hud').appendChild(bag);
 const task=document.createElement('div');task.id='contract-line';$('hud').appendChild(task);
 const banner=document.createElement('div');banner.id='area-banner';$('hud').appendChild(banner);
 const prog=document.createElement('div');prog.id='search-progress';prog.className='hidden';prog.innerHTML='<span></span><div><i></i></div>';$('hud').appendChild(prog);
 const tactical=document.createElement('div');tactical.id='tactical-map';tactical.className='hidden';tactical.innerHTML='<section class="tactical-shell"><header><div><small>QUARANTINE ZONE 07 / TACTICAL VIEW</small><h2>晴湾 · 战术地图</h2></div><span>M / TAB 关闭　·　世界继续运行</span></header><div class="tactical-body"><div class="map-wrap"><canvas id="large-map" width="680" height="680"></canvas><div class="map-note">T 切换撤离目标 · 绿色开放 / 灰色未满足条件<br>◇ 物资箱　△ 撤离点　+ 通讯终端　● 已发现敌人</div></div><aside><small class="section-title">撤离方案 / EXTRACTIONS</small><div id="exit-list"></div><small class="section-title">随身物资 / CARGO</small><div id="bag-list"></div><p id="bag-total"></p><p class="bag-help">Z 丢弃最后一件物资 · H 使用治疗<br>死亡遗失背包；成功撤离后结算价值。</p></aside></div></section>';$('hud').appendChild(tactical);
 const results=document.createElement('div');results.id='raid-result';$('result').querySelector('.result-stats').after(results);
 document.querySelectorAll('[data-hero]').forEach(el=>{const img=document.createElement('img');img.src=assetURL(el.dataset.hero+'.webp');img.alt=HEROES[el.dataset.hero].name;el.querySelector('strong').replaceWith(img);});
 $('mouse-tip').textContent='M 战术地图 · T 切换撤离 · ALT 奔跑 · CTRL 潜行 · H 急救';
 $('collect-count').parentElement.querySelector('b').textContent='回收有价值的物资';$('collect-count').parentElement.querySelector('small').textContent='按住 F 搜箱 · 带出才属于你';
 document.querySelector('.game-footer>span').textContent='WASD 移动 · ALT 奔跑 · SHIFT 闪避 · SPACE 跳跃 · C 反制 · E/X/Q 异能 · F 交互 · H 治疗 · M 地图 · ESC 暂停';
 window.addEventListener('keydown',event=>{if(state==='playing'&&raid.map&&event.code==='KeyZ'&&!event.repeat&&raid.bag.length){const id=raid.bag.pop();spawnContainer(player.group.position.x+1.6,player.group.position.z,'supply',[id],player.group.position.y).opened=true;renderTacticalDetails();toast('已丢下 '+ITEM_DEFS[id].name+' · 可重新拾取');}});
 refreshPortrait();
}
function setSkillArt(slot, file){
 const icon=$(slot).querySelector('strong');
 if(icon.dataset.file===file)return;
 icon.style.backgroundImage='url("'+assetURL(file)+'")';
 icon.classList.add('art-skill');
 icon.dataset.file=file;
}
function refreshPortrait(){
 if(!$('operator-portrait'))return;const h=heroNow();$('operator-portrait').src=assetURL(chosenClass+'.webp');$('field-portrait').src=assetURL(chosenClass+'.webp');$('portrait-name').textContent=h.name;$('portrait-role').textContent=h.tag+' / '+h.en;
 for(const [slot,name,key] of [['skill-hero',h.skill,'E'],['skill-burst',h.ultimate,'Q'],['skill-utility',UTILITY[chosenClass].name,'X']]){
  setSkillArt(slot,rogueMode?skillIcon(chosenClass,key):name+'.svg');
 }
 if(rogueMode){
  setSkillArt('skill-spike','echo-action-charge.webp');
  setSkillArt('skill-counter','echo-action-counter.webp');
  setSkillArt('skill-dodge','echo-action-dodge.webp');
 }
 $('skill-utility').querySelector('span').textContent=UTILITY[chosenClass].name;
}
function updateRaidHUD(){if(rogueMode)return expeditionHUD();
 const p=player.group.position,d=districtAt(p.x,p.z),e=EXIT_DEFS[raid.selectedExit],s=contextExit(e),distance=Math.round(Math.hypot(p.x-e.x,p.z-e.z));
 $('district-name').textContent=d.name;$('district-risk').textContent=['','低度危险 · 边缘搜刮','中度危险 · 混战区域','高度危险 · 稀有物资'][d.risk];
 $('route-name').textContent=e.code+' / '+e.name;$('route-status').textContent=s.label;$('route-status').style.color=s.open?'#a5e3c6':'#e9b58a';
 const angle=Math.atan2(e.x-p.x,-(e.z-p.z))-yaw;$('route-distance').innerHTML='<i style="transform:rotate('+angle+'rad)">↑</i><b>'+distance+'</b> m <span>'+e.hold+' 秒撤离</span>';
 $('cargo-value').textContent=bagValue(raid.bag);$('cargo-weight').textContent=bagWeight(raid.bag)+' / 28 KG'+(bagWeight(raid.bag)>20?' · 负重减速':'');$('med-count').textContent='急救 × '+(raid.meds+raid.bag.filter(i=>i==='med').length);$('noise-meter').style.width=raid.noise*100+'%';
 $('collect-count').textContent=raid.opened+' 箱';$('collect-check').textContent=raid.opened?'◆':'◇';
 const contract=CONTRACTS[raid.contract],progress=Math.min(contract.target,contract.progress());$('contract-line').innerHTML='<small>本局委托 · '+contract.name+'</small><b>'+contract.desc+'　'+progress+'/'+contract.target+'</b><span>'+(progress>=contract.target?'已达成，撤离领取':'撤离奖励')+' ¤ '+contract.reward+'</span>';
 cooldownUI('skill-utility',raid.utilityCd,UTILITY[chosenClass].cd);
 if(raid.map){drawTacticalMap();if(time>raid.hudAt){raid.hudAt=time+.3;renderTacticalDetails();}}
}
function drawMap(){if(rogueMode)return;drawFieldMap(map,180,false);}
function drawTacticalMap(){drawFieldMap($('large-map').getContext('2d'),680,true);}
function drawFieldMap(ctx,size,full){
 const p=player.group.position,span=full?326:125,scale=size/span,cx=full?0:p.x,cz=full?0:p.z;const xy=(x,z)=>[size/2+(x-cx)*scale,size/2+(z-cz)*scale];
 ctx.clearRect(0,0,size,size);ctx.fillStyle='#173d45';ctx.fillRect(0,0,size,size);
 ctx.strokeStyle='#c4d9c211';ctx.lineWidth=1;for(let i=-160;i<=160;i+=20){let[a,b]=xy(i,-160),[c,d]=xy(i,160);ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.stroke();[a,b]=xy(-160,i);[c,d]=xy(160,i);ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.stroke();}
 for(const d of DISTRICTS){const[x,z]=xy(d.x,d.z);ctx.fillStyle=d.color+'12';ctx.beginPath();ctx.arc(x,z,d.r*scale,0,Math.PI*2);ctx.fill();if(full){ctx.fillStyle=d.color;ctx.font='bold 17px "Microsoft YaHei"';ctx.fillText(d.name,x-36,z-28);ctx.font='10px monospace';ctx.fillText(d.en,x-36,z-10);}}
 ctx.fillStyle='#a8c3bd44';for(const c of colliders){const[x,z]=xy(c.x,c.z);ctx.fillRect(x-c.w*scale,z-c.d*scale,c.w*2*scale,c.d*2*scale);}
 ctx.fillStyle='#efd39d';for(const c of raid.containers){if(!c.items.length)continue;const[x,z]=xy(c.group.position.x,c.group.position.z);ctx.save();ctx.translate(x,z);ctx.rotate(Math.PI/4);ctx.fillRect(-1.8,-1.8,3.6,3.6);ctx.restore();}
 for(const e of enemies){if(e.dead||e.avatar.group.position.distanceTo(p)>(raid.scan>0?80:23))continue;const[x,z]=xy(e.avatar.group.position.x,e.avatar.group.position.z);ctx.fillStyle=e.elite?'#fa9d5c':'#e88679';ctx.beginPath();ctx.arc(x,z,full?3.5:2.6,0,7);ctx.fill();}
 const dest=EXIT_DEFS[raid.selectedExit],a=xy(p.x,p.z),b=xy(dest.x,dest.z);ctx.strokeStyle='#f8e1b68f';ctx.setLineDash([5,6]);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();ctx.setLineDash([]);
 for(const e of EXIT_DEFS){const[x,z]=xy(e.x,e.z);ctx.fillStyle=contextExit(e).open?'#a8efd1':'#9aa6a5';ctx.beginPath();ctx.moveTo(x,z-6);ctx.lineTo(x+5,z+4);ctx.lineTo(x-5,z+4);ctx.closePath();ctx.fill();if(e===dest){ctx.strokeStyle='#ffe2af';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,z,10,0,7);ctx.stroke();}if(full){ctx.font='bold 12px monospace';ctx.fillText(e.code,x+10,z+3);}}
 const [tx,tz]=xy(-87,-8);ctx.fillStyle=raid.signal?'#bcead0':'#e4c493';ctx.font='bold 18px monospace';ctx.fillText('+',tx-5,tz+5);
 if(raid.dropSpawned){const[x,z]=xy(35,68);ctx.strokeStyle='#f3c879';ctx.strokeRect(x-5,z-5,10,10);}
 if(gameTime-time<150){const[x,z]=xy(0,0);ctx.strokeStyle='#e2a183';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,z,(95+(gameTime-time)/150*115)*scale,0,7);ctx.stroke();}
 ctx.save();ctx.translate(...a);ctx.rotate(yaw);ctx.fillStyle='#fff2d7';ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(4.5,5);ctx.lineTo(0,2);ctx.lineTo(-4.5,5);ctx.closePath();ctx.fill();ctx.restore();
}
function renderTacticalDetails(){
 $('exit-list').innerHTML=EXIT_DEFS.map((e,i)=>{const s=contextExit(e);return'<div class="exit-row '+(i===raid.selectedExit?'selected':'')+'"><span>'+e.code+'</span><div><b>'+e.name+'</b><small>'+s.label+'</small></div><em>'+Math.round(Math.hypot(e.x-player.group.position.x,e.z-player.group.position.z))+'m</em></div>';}).join('');
 const counts={};for(const i of raid.bag)counts[i]=(counts[i]||0)+1;$('bag-list').innerHTML=Object.entries(counts).map(([id,count])=>'<div style="border-left-color:'+ITEM_DEFS[id].color+'"><b>'+ITEM_DEFS[id].name+'</b><span>×'+count+'</span><small>¤ '+ITEM_DEFS[id].value*count+'</small></div>').join('')||'<p class="empty-bag">背包还是空的。<br>先搜索附近的物资箱。</p>';
 $('bag-total').textContent='¤ '+bagValue(raid.bag)+'　/　'+bagWeight(raid.bag)+' / 28 KG';
}
function updatePresentation(dt){
 if(player.contactShadow){
  player.contactShadow.visible=grounded&&!grappleTarget;
 }
 for(const e of enemies)if(e.avatar.contactShadow)e.avatar.contactShadow.visible=!e.dead&&e.vy<=0&&Math.abs(e.avatar.group.position.y-floorAt(e.avatar.group.position.x,e.avatar.group.position.z,e.avatar.group.position.y))<.12;

 if(state==='playing')for(let i=0;i<environment.beams.length;i++){const b=environment.beams[i];b.material.opacity=contextExit(EXIT_DEFS[i]).open?.075+Math.sin(time*2)*.02:.018;}
}
