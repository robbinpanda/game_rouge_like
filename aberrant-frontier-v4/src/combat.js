function impactSound(heavy=false){if(!sound)return;if(rogueMode){cue(heavy?'heavy':'light');return;}audioTone(heavy?54:92,heavy?.24:.12,'triangle',heavy?.13:.07,.15);audioTone(heavy?230:420,.06,'square',.02,.3);try{audio??=new(window.AudioContext||window.webkitAudioContext)();const buffer=audio.createBuffer(1,audio.sampleRate*.09,audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(noiseRoll()*2-1)*(1-i/data.length);const source=audio.createBufferSource(),gain=audio.createGain(),filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=heavy?1400:3500;gain.gain.value=heavy?.17:.08;source.buffer=buffer;source.connect(filter);filter.connect(gain);gain.connect(audio.destination);source.start();}catch{}}
function sceneIntersection(origin,dir,maxDistance,includeEnemies=true){let closest=maxDistance,point=origin.clone().addScaledVector(dir,maxDistance),kind='sky',enemy=null;const ray=new THREE.Ray(origin,dir),hit=new THREE.Vector3();
 for(const c of colliders){const bounds=new THREE.Box3(new THREE.Vector3(c.x-c.w,0,c.z-c.d),new THREE.Vector3(c.x+c.w,c.h,c.z+c.d));if(ray.intersectBox(bounds,hit)){const d=hit.distanceTo(origin);if(d<closest&&d>.03){closest=d;point.copy(hit);kind='wall';}}}
 cameraAimRay.set(origin,dir);cameraAimRay.far=closest;const meshHit=cameraAimRay.intersectObjects(cameraMeshes,false)[0];if(meshHit&&meshHit.distance<closest){closest=meshHit.distance;point.copy(meshHit.point);kind='wall';}
 if(dir.y<-.0001){const t=-origin.y/dir.y;if(t>0&&t<closest){closest=t;point.copy(origin).addScaledVector(dir,t);kind='ground';}}
 if(includeEnemies)for(const e of enemies){if(e.dead)continue;const center=e.avatar.group.position.clone().add(new THREE.Vector3(0,e.hitHeight??1.4,0));if(ray.intersectSphere(new THREE.Sphere(center,e.hitRadius??.83),hit)){const d=hit.distanceTo(origin);if(d<closest){closest=d;point.copy(hit);kind='enemy';enemy=e;}}}
 return{point,kind,enemy,distance:closest};
}
function aimSolution(){camera.updateMatrixWorld();cameraAimRay.setFromCamera(new THREE.Vector2(0,.06),camera);const origin=cameraAimRay.ray.origin.clone(),dir=cameraAimRay.ray.direction.clone();const solution=sceneIntersection(origin,dir,90);aimPoint.copy(solution.point);return solution;}
function muzzlePosition(){if(player.weaponGroup&&weaponNow().type==='ranged'){player.group.updateMatrixWorld(true);return player.weaponGroup.localToWorld(new THREE.Vector3(0,.03,1.12));}return player.group.position.clone().add(new THREE.Vector3(Math.cos(yaw)*.35,1.65,Math.sin(yaw)*.35));}
function shoot(power=1,spread=0,element=null,damageScale=1,feedback=true){
 emitNoise(power>1?65:loadout[activeWeapon]==='rifle'?52:30);const w=weaponNow(),aim=aimSolution(),flat=aim.point.clone().sub(player.group.position);if(rogueMode)flat.copy(aimFacing(aim.point));player.group.rotation.y=Math.atan2(flat.x,flat.z);player.group.updateMatrixWorld(true);const origin=muzzlePosition();let dir=aim.point.clone().sub(origin).normalize();if(rogueMode&&dir.x*flat.x+dir.z*flat.z<=0)dir.copy(flat);
 if(spread){const axis=new THREE.Vector3(0,1,0);dir.applyAxisAngle(axis,spread);}const damage=Math.round((power>1?w.heavy:w.damage[0])*damageScale*(1+evolution*.18));
 const form=rogueMode?formShot(loadout[activeWeapon],power>1):null;
 createProjectile(origin,dir,'player',damage,w.color,form);const p=projectiles.at(-1);p.v.copy(dir).multiplyScalar(w.speed||55);p.life=w.reach/(w.speed||55);p.weapon=loadout[activeWeapon];p.element=element;p.heavy=power>1;if(rogueMode&&p.heavy&&p.weapon==='rifle')p.pierced=new Set();p.origin=origin.clone();p.traveled=0;if(rogueMode){p.knockback=formPush(p.weapon,p.heavy);p.pierceLimit=3+(p.heavy?attackRank(p.weapon,true):0);}if(!feedback)return;if(form)weaponFlash(form.id,form.right,form.level,origin,dir);else drawTrail(origin,origin.clone().addScaledVector(dir,.8),w.color,.1,.045);particlesAt(origin,w.color,5,1);player.attack=.16;shake=power>1?.12:.045;if(rogueMode)cue('shot');else audioTone(w===weaponSpecs.rifle?75:190,.12,w===weaponSpecs.rifle?'sawtooth':'triangle',.065,.2);
}
function attackArea(forward,reach,arc,damage,heavy=false,stagger=.3,id=null,extraPush=0,dashStrike=false){let count=0;for(const e of enemies){if(e.dead)continue;const delta=e.avatar.group.position.clone().sub(player.group.position),distance=delta.length();if(distance<reach&&Math.abs(delta.y)<2.6&&delta.normalize().dot(forward)>arc&&!obstructed(player.group.position,e.avatar.group.position)){damageEnemy(e,damage,'player',delta.clone().multiplyScalar((heavy?1.6:.5)+extraPush/.65),{heavy,dashStrike,stagger,focus:heavy,weapon:id,distance});count++;}}
 if(count){hitstop=Math.max(hitstop,heavy?.105:.055);shake=Math.max(shake,id==='hammer'?.32:heavy?.2:.1);if(rogueMode&&id==='hammer')cue('hammer');else impactSound(heavy||id==='hammer');comboHits+=count;comboTimer=3.2;if(rogueMode&&comboHits>=20&&typeof unlockProphecy==='function')unlockProphecy('combo_20');}return count;}
function parry(){if(parryCd>0||dodgeTime>0||state!=='playing')return;cancelStrike();raid.heal=0;raid.search=null;parryTime=.36;parryCd=1.15;chargeTime=0;mouseRight=false;player.attack=.25;ringAt(player.group.position.clone().add(new THREE.Vector3(0,1.1,0)),0xff8d70,2.1,.35,true);audioTone(500,.1,'triangle',.035,.6);}
function damageEnemy(e,amount,source='player',push=null,options={}){if(e.dead||rogueMode&&e.transition>0)return;
 if(source==='player'&&e.guard>0&&options.focus){toast('敌方反制了你的蓄力 · 改用普攻破势');e.guard=0;player.hurt=.35;meleeCd=.8;damagePlayer(18);ringAt(e.avatar.group.position.clone().add(new THREE.Vector3(0,1,0)),0xff8070,2,.3);return;}
 if(rogueMode&&source==='player')amount=giftHit(e,amount,options);let heavy=options.heavy||amount>65;
 if(source==='player'){if(empowered>0&&!options.echo){amount+=35;empowered=0;}if(chosenClass==='ember'&&buffTime>0&&!options.echo){amount+=12;e.burn=4;}if(chosenClass==='frost'&&(e.frozen>0||e.slow>0))amount=Math.round(amount*1.2);if(chosenClass==='reaper'&&buffTime>0)hp=Math.min(maxHp,hp+amount*.15);amount=Math.round(amount);}
 if(e.charge&&!heavy)amount=Math.round(amount*.7);
 if(rogueMode&&e.recovery>0&&!options.echo&&source==='player')amount=Math.round(amount*1.14);
 e.avatar.hurt=.22;e.recoil=.26;
 if(!rogueMode||!options.echo)e.poise=Math.max(0,(e.poise??100)-amount*(heavy?1.3:.65)*(rogueMode&&e.boss?.86:1));
 const broken=e.poise<=0;
 if(broken){e.poise=100;e.stagger=1.4;options.stagger=1.4;heavy=true;if(source==='player'){toast('破势 · 目标失衡');raid.staggers++;}}
 const interrupt=rogueMode?(broken||options.counter||(!options.echo&&source!=='fire'&&e.flinchLock<=0&&(!e.boss||e.windup<=0)&&(!e.charge||heavy))):(!e.charge||heavy);
 if(interrupt){
  e.stagger=Math.max(e.stagger||0,options.stagger??(heavy?.65:.25));
  if(rogueMode){
   if(e.stagger>.12)e.flinchLock=e.stagger+(e.boss?.55:e.elite?.72:.44);
   if(e.windup>0||broken||options.counter)for(const h of run.marks)if(h.owner===e)h.cancelled=true;
   if(e.hp>amount&&e.stagger>.12)playCreatureClip(e.avatar,'Hit',Math.min(.45,e.stagger));
   e.rush=0;e.action=null;
  }
  e.windup=0;
 }
 if(push&&!e.charge&&(!rogueMode||!e.boss)){
  const p=e.avatar.group.position,old=p.clone();
  move(e.avatar.group,push.x*.65,push.z*.65,.55);
  if(rogueMode&&heavy&&options.weapon&&old.distanceTo(p)+.34<Math.hypot(push.x,push.z)*.65){
   amount+=14;e.stagger=Math.max(e.stagger,.44);
   pulseAt(p,1.4,0xffbd79);cue('slam',p);
  }
 }
 if(rogueMode&&e.boss&&!e.phaseShift)amount=Math.min(amount,Math.max(0,e.hp-e.maxHp*.5));
 e.hp-=amount;
 const center=e.avatar.group.position.clone().add(new THREE.Vector3(0,e.hitHeight??1.5,0));
 if(source==='player'){
  e.aggro=10;
  if(!options.echo||!rogueMode){impactSpray(center,heavy?0xffaa48:0xffcf83,heavy);showHit();}
  if(rogueMode&&!options.echo)enemyHitAccent(e,heavy,broken);
  const dmgTone=options.dashStrike?'dash':e.frozen>0?'frost':(e.heat>0||e.burn>0)?'ember':'';
  floatingDamage(e.avatar.group.position,amount,heavy,dmgTone);
 }
 if(!rogueMode||!options.echo)particlesAt(center,heavy?0xffdba1:0xe2ad87,heavy?18:7,heavy?6:3);
 if(e.hp>0)return;
 onEnemyKilled(e,source);e.dead=true;e.avatar.hpGroup.visible=false;e.avatar.group.rotation.z=rogueMode?.52:.9;
 if(lockTarget===e)lockTarget=null;
 if(rogueMode&&typeof crystalShatterDeath==='function')crystalShatterDeath(e);
 else particlesAt(center,0xf4be80,24,6);
 spawnLoot(e.avatar.group.position.x,e.avatar.group.position.z,e.weapon==='hammer'?5:3);
 if(source==='player'){
  kills++;hp=Math.min(maxHp,hp+(rogueMode?2:12));hitstop=.11;shake=.24;
  if(rogueMode){
   const remaining=enemies.filter(other=>!other.dead).length;
   const wavesLeft=(run.waves&&run.waves.length)||0;
   if(remaining===0&&wavesLeft===0){slowMo=e.boss?.65:.38;cue('slowmo');}
  }
  toast('猎杀 '+e.name+(rogueMode?'':' · 基因掉落'));impactSound(true);
 }
}
function damagePlayer(amount,attacker=null,charged=false){if(state!=='playing')return;
 if(rogueMode&&rank('ashguard')&&(attacker?.heat>0||attacker?.burn>0))amount*=.8;
 if(rogueMode&&rank('rimeguard')&&attacker?.slow>0)amount*=.82;
 if(rogueMode&&rank('brace')&&stamina>60)amount*=.88;
 if(invulnerable>0){
  if(dodgeTime>.12&&attacker?.avatar&&!(raid.opening?.until>time)){
   raid.opening={enemy:attacker,until:time+1.25,label:'极限闪避'};impactSpray(player.group.position.clone().add(new THREE.Vector3(0,1.25,0)),0x66d5ed);
   if(rogueMode)calloutAt(player.group.position,'极限闪避','frost');
  }return;
 }if(parryTime>0&&charged&&attacker){
  if(rogueMode&&chosenClass==='bastion')run.power=Math.min(4,run.power+2);
  raid.parries++;attacker.windup=0;attacker.stagger=1.7;attacker.charge=false;stamina=Math.min(100,stamina+25);
  if(rogueMode&&typeof noteProphecyMetric==='function')noteProphecyMetric('parry');
  counterFlash(attacker.avatar.group.position.clone().add(new THREE.Vector3(0,1.7,0)));
  if(rogueMode&&rank('kilnGuard')){
   comboFeedback('kilnGuard');blast(player.group.position,5,32,schools.ember.hex,true);hp=Math.min(maxHp,hp+8);
  }
  damageEnemy(attacker,48,'player',null,{heavy:true,stagger:1.7,counter:true});hitstop=.13;shake=.18;
  ringAt(player.group.position.clone().add(new THREE.Vector3(0,1.3,0)),0xff8f86,2.2,.28);
  raid.opening={enemy:attacker,until:time+1.35,label:'完美反制'};impactSpray(player.group.position.clone().add(new THREE.Vector3(0,1.5,0)),0xff796c,true);toast('完美反制 · 敌人失衡');if(rogueMode){calloutAt(player.group.position,'完美反制！','gold');cue('parry');}else impactSound(true);return;
 }
 if(rogueMode&&run.contracts.includes('clock'))amount*=1.25;
 if(shieldTime>0){
  if(rogueMode&&chosenClass==='bastion'&&attacker)run.power=Math.min(4,run.power+1);
  amount*=.35;
 }else if(!rogueMode&&mouseRight&&chargeTime>.3)amount*=.75;cancelStrike();raid.search=null;raid.heal=0;hp=Math.max(0,hp-Math.round(amount));invulnerable=.3;player.hurt=.25;damageFlash=.55;shake=.16;if(extracting>0)toast('受到攻击 · 撤离连接中断');extracting=0;comboHits=0;if(rogueMode)cue('hurt',attacker?.avatar.group.position);else impactSound(false);
 if(hp<=0){
  if(rogueMode&&run.revives>0){
   run.revives--;hp=Math.max(1,Math.round(maxHp*.5));invulnerable=2.2;slowMo=.38;shake=.32;
   pulseAt(player.group.position,7.5,0xffb162);
   for(const e of enemies)if(!e.dead&&e.avatar.group.position.distanceTo(player.group.position)<7.5){
    const away=e.avatar.group.position.clone().sub(player.group.position).setY(0).normalize();
    damageEnemy(e,40,'player',away.multiplyScalar(4),{heavy:true,stagger:1.2});
   }
   calloutAt(player.group.position,'残火续命！','gold');toast('残火续命发动 · 剩余 '+run.revives+' 次');cue('revive');
   return;
  }
  finish(false);
 }}
function useAbility(){if(skillCd>0||state!=='playing')return;const h=heroNow();cancelStrike();raid.heal=0;raid.search=null;emitNoise(24);skillCd=h.eCd;const castOrigin=rogueMode?player.group.position.clone():null;if(rogueMode)castGift('skill');chargeTime=0;mouseRight=false;player.attack=.3;const forward=new THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw));
 if(chosenClass==='ember'){
  const power=rogueMode?run.power:0;if(rogueMode)run.power=0;
  for(let i=0;i<10;i++){move(player.group,forward.x*.7,forward.z*.7);particlesAt(player.group.position.clone().add(new THREE.Vector3(0,.5,0)),h.color,3,2);}
  attackArea(forward,4.5,-.5,48,false,.6);
  if(rogueMode){
   const scorch={kind:'line',from:castOrigin,to:player.group.position,width:1.08};
   if(scorch.from.distanceToSquared(scorch.to)>.04)for(const e of enemies){
    if(!e.dead&&hitFootprint(scorch,e.avatar.group.position)){e.burn=Math.max(e.burn,2.7);queueEcho(e,18);}
   }
   ventBlade(power);
  }
  invulnerable=.35;
 }
 if(chosenClass==='frost'){
  const aim=aimSolution(),origin=player.group.position.clone().add(new THREE.Vector3(0,1.7,0)),dir=aim.point.clone().sub(origin).normalize();
  const charged=rogueMode&&run.power>=4;
  if(charged){run.power=0;roleFeedback('满霜压 · 冰矛碎晶');}
  createProjectile(origin,dir,'player',charged?58:38,h.color);
  const p=projectiles.at(-1);p.element='frost';p.v.multiplyScalar(1.2);
  if(rogueMode){
   p.m.geometry=crystalGeo;p.m.scale.set(.23,charged?.98:.64,.23);
   p.crystalColor=0x91eaff;p.heavy=charged;p.frostBurst=charged;p.life=.85;
   if(charged&&rank('fracture')){p.pierced=new Set();p.pierceLimit=2;}
  }else p.m.scale.setScalar(1.8);
 }
 if(chosenClass==='shade'){
  const x=(input.KeyD?1:0)-(input.KeyA?1:0),z=(input.KeyW?1:0)-(input.KeyS?1:0);let d=new THREE.Vector3(x*Math.cos(yaw)+z*Math.sin(yaw),0,x*Math.sin(yaw)-z*Math.cos(yaw));if(d.length()<.1)d=forward;d.normalize();const from=player.group.position.clone();for(let i=0;i<12;i++)move(player.group,d.x*.7,d.z*.7);drawTrail(from.add(new THREE.Vector3(0,1,0)),player.group.position.clone().add(new THREE.Vector3(0,1,0)),h.color,.4,.12);invulnerable=.8;empowered=5;
  if(rogueMode){
   if(run.power>=5){
    run.power=0;const dmg=rank('eclipse')?72:46;
    blast(player.group.position,5.5,dmg,0xc394ff);calloutAt(player.group.position,rank('eclipse')?'蚀月终幕！':'满影引爆！','arc');
    if(rank('eclipse'))skillCd*=.5;
   }else run.power=Math.min(5,run.power+2);
  }
 }
 if(chosenClass==='bastion'){shieldTime=4;if(!rogueMode)ringAt(player.group.position.clone().add(new THREE.Vector3(0,1,0)),h.color,2,.6);hp=Math.min(maxHp,hp+15);}
 if(chosenClass==='reaper'){const e=nearestEnemy(14,.15);if(e){const d=e.avatar.group.position.clone().sub(player.group.position).normalize();for(let i=0;i<12;i++){if(player.group.position.distanceTo(e.avatar.group.position)<2)break;move(player.group,d.x*.7,d.z*.7);}if(rogueMode)rendPrey(e);else damageEnemy(e,52,'player',null,{stagger:.8});}else for(let i=0;i<10;i++)move(player.group,forward.x*.6,forward.z*.6);invulnerable=.5;velocityY=3;grounded=false;}
 if(rogueMode)showSkillCast('skill',castOrigin);
 particlesAt(player.group.position.clone().add(new THREE.Vector3(0,1,0)),h.color,16,3);toast(rogueMode&&chosenClass==='reaper'&&skillCd===0?'猎扑刷新 · 转向下一只猎物':h.skill+' · '+h.eText);
 if(rogueMode)cue(chosenClass==='frost'?'ice':chosenClass==='ember'?'fire':chosenClass==='bastion'?'break':'pounce');
 else audioTone(230,.25,'triangle',.05,chosenClass==='frost'?2:.3);
}
function burst(){if(ultimateCd>0||state!=='playing')return;const h=heroNow();cancelStrike();raid.heal=0;raid.search=null;emitNoise(55);ultimateCd=h.qCd;if(rogueMode)castGift('ultimate');chargeTime=0;mouseRight=false;player.attack=.5;shake=.22;invulnerable=.6;if(!rogueMode)ringAt(player.group.position.clone().add(new THREE.Vector3(0,.2,0)),h.color,10,.8);particlesAt(player.group.position.clone().add(new THREE.Vector3(0,1,0)),h.color,40,7);
 if(chosenClass==='ember'){buffTime=10;if(rogueMode)elementalBurst('ember',8);else for(const e of enemies)if(!e.dead&&e.avatar.group.position.distanceTo(player.group.position)<8){damageEnemy(e,65,'player',null,{heavy:true});e.burn=5;}}
 if(chosenClass==='frost'){hp=Math.min(maxHp,hp+(rogueMode?29:45));if(rogueMode)elementalBurst('frost',8.5);else for(const e of enemies)if(!e.dead&&e.avatar.group.position.distanceTo(player.group.position)<10){damageEnemy(e,42,'player');e.frozen=e.boss?.6:3.2;e.slow=6;}}
 if(chosenClass==='shade'){let n=0;for(const e of enemies){if(e.dead||e.avatar.group.position.distanceTo(player.group.position)>12||n>=4)continue;drawTrail(player.group.position.clone().add(new THREE.Vector3(0,1.5,0)),e.avatar.group.position.clone().add(new THREE.Vector3(0,1.5,0)),h.color,.5,.15);damageEnemy(e,100,'player',null,{heavy:true,stagger:1});n++;}invulnerable=1.5;empowered=6;}
 if(chosenClass==='bastion'){shieldTime=3;stamina=100;for(const e of enemies)if(!e.dead&&e.avatar.group.position.distanceTo(player.group.position)<9){const d=e.avatar.group.position.clone().sub(player.group.position).normalize();damageEnemy(e,95,'player',d.multiplyScalar(3),{heavy:true,stagger:1.7});e.avatar.group.position.y=1.4;}}
 if(chosenClass==='reaper'){buffTime=10;hp=Math.min(maxHp,hp+35);for(const e of enemies)if(!e.dead&&e.avatar.group.position.distanceTo(player.group.position)<6)damageEnemy(e,45,'player',null,{stagger:1});}
 toast(rogueMode&&chosenClass==='frost'?'静寂之境 · 冻结浪潮 · 恢复 29 生命':h.ultimate+' · '+h.qText);
 if(!rogueMode||chosenClass!=='ember'&&chosenClass!=='frost')impactSound(true);
 if(!rogueMode)audioTone(90,.6,'sawtooth',.07,2);
}
