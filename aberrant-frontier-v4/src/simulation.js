function updateEnemies(dt){
 for(const e of enemies){const p=e.avatar.group.position;if(e.avatar.chargeMarks)e.avatar.chargeMarks.visible=false;if(!e.dead&&e.charge&&e.windup>0)chargedOutline(e.avatar);e.recoil=Math.max(0,(e.recoil||0)-dt);if(e.dead){p.y=lerp(p.y,-1.8,dt);continue;}e.cooldown-=dt;e.aggro=Math.max(0,e.aggro-dt);e.stagger=Math.max(0,e.stagger-dt);e.guard=Math.max(0,e.guard-dt);e.dodgeCooldown-=dt;e.frozen=Math.max(0,e.frozen-dt);e.slow=Math.max(0,e.slow-dt);e.burn=Math.max(0,e.burn-dt);if(e.burn>0){e.burnTick-=dt;if(e.burnTick<=0){e.burnTick=.7;damageEnemy(e,8,'fire');}}
 const pd=p.distanceTo(player.group.position);if(e.avatar.distant){const far=pd>(e.avatar.distant.visible?35:40);e.avatar.distant.visible=far;e.avatar.rig.visible=!far;}let target=null,distance=26;if(time>4&&((pd<(input.ControlLeft?12:24)&&!obstructed(p,player.group.position))||(e.aggro>0&&pd<70))){target='player';distance=pd;e.aggro=Math.max(e.aggro,1);}
 if(!target)for(const rival of enemies){if(rival===e||rival.dead||rival.avatar.type===e.avatar.type)continue;const d=p.distanceTo(rival.avatar.group.position);if(d<distance&&d<10){target=rival;distance=d;}}
 const targetPos=target==='player'?player.group.position:target?.avatar.group.position;let moving=false;const w=WEAPONS[e.weapon],ranged=w.type==='ranged';
 if(e.frozen>0){e.windup=0;e.charge=false;e.avatar.skin.emissive.setHex(0x70bdd1);e.avatar.skin.emissiveIntensity=.7;}
 else if(e.stagger<=0&&targetPos){let direction=targetPos.clone().sub(p);direction.y=0;direction.normalize();const range=ranged?24:(e.weapon==='spear'?4.2:2.8);if(e.windup<=0)e.avatar.group.rotation.y=Math.atan2(direction.x,direction.z);
  if(target==='player'&&ranged&&e.dodgeCooldown<=0&&meleeCd>.1&&pd<24){e.dodgeTime=.25;e.dodgeDir.set(direction.z,0,-direction.x).multiplyScalar(visualRoll()>.5?1:-1);e.dodgeCooldown=4.5;particlesAt(p.clone().add(new THREE.Vector3(0,.5,0)),0xb9b7a0,7,2);}
  if(e.dodgeTime>0){e.dodgeTime-=dt;move(e.avatar.group,e.dodgeDir.x*12*dt,e.dodgeDir.z*12*dt);moving=true;}
  else if(e.windup<=0){
   const blocked=obstructed(p,targetPos);if(distance>range||blocked||Math.abs(p.y-targetPos.y)>2.3){const old=p.clone();const speed=(ranged?3.1:e.weapon==='hammer'?3.6:4.5)*(e.slow>0?.5:1);move(e.avatar.group,direction.x*speed*dt,direction.z*speed*dt,.55);if(p.distanceTo(old)<dt*.5)move(e.avatar.group,-direction.z*speed*dt,direction.x*speed*dt,.55);moving=true;if(targetPos.y-p.y>1.5&&distance<8&&e.cooldown<0){e.vy=9;e.cooldown=.9;}}
   else if(ranged){const side=Math.sin(time*.7+e.wander)>0?1:-1,retreat=distance<11?-3:0;move(e.avatar.group,(direction.x*retreat+direction.z*side*2)*dt,(direction.z*retreat-direction.x*side*2)*dt,.55);moving=true;}
   if(target==='player'&&!ranged&&chargeTime>.4&&distance<5&&e.cooldown<.3&&e.guard<=0){e.guard=.5;e.cooldown=1.5;ringAt(p.clone().add(new THREE.Vector3(0,1.1,0)),0xff9279,1.8,.4,true);}
   if(distance<range+.4&&e.cooldown<=0&&!blocked&&Math.abs(p.y-targetPos.y)<3){e.charge=!ranged&&(e.combatCombo%3===2||e.weapon==='hammer');e.windup=ranged?.7:e.charge?.9:.4;e.attackDir.copy(direction);e.avatar.attack=e.windup;if(!ranged)telegraphAttack(e,range,e.charge);}
  }
  if(e.windup>0){e.windup-=dt;e.avatar.chest.material.emissiveIntensity=e.charge?4:2.4;if(e.charge&&Math.floor(time*12)%3===0)particlesAt(p.clone().add(new THREE.Vector3(0,1.4,0)),0x78c9ff,1,1);
   if(e.windup<=0){if(ranged){const origin=p.clone().add(new THREE.Vector3(0,1.65,0));const end=targetPos.clone().add(new THREE.Vector3(0,1.35,0));if(target==='player')end.addScaledVector(playerMotion,Math.min(.35,distance/50));const dir=end.sub(origin).normalize();createProjectile(origin,dir,e,e.weapon==='rifle'?31:19,0xe69d87);const shot=projectiles.at(-1);shot.v.copy(dir).multiplyScalar(e.weapon==='rifle'?43:29);shot.life=2;e.avatar.attack=.25;drawTrail(origin,origin.clone().addScaledVector(dir,1),0xefbb8e,.1);e.cooldown=e.weapon==='rifle'?2.1:1.35;}
   else{e.avatar.attack=.35;const toward=targetPos.clone().sub(p);const hit=toward.length()<range+1&&Math.abs(toward.y)<2.4&&toward.normalize().dot(e.attackDir)>.1&&!obstructed(p,targetPos);ringAt(p.clone().add(new THREE.Vector3(0,1.2,0)),e.charge?0x7ecbff:0xf2b390,range,.22,true);if(e.charge)move(e.avatar.group,e.attackDir.x*1.1,e.attackDir.z*1.1);if(hit){const amount=e.charge?(e.weapon==='hammer'?49:37):e.weapon==='dual'?17:23;if(target==='player')damagePlayer(amount,e,e.charge);else damageEnemy(target,amount,'ai',null,{heavy:e.charge});}e.combatCombo++;e.cooldown=e.charge?1.7:e.combatCombo%3===0?1.25:.48;}
   e.charge=false;}
  }
 }else if(e.stagger<=0&&e.frozen<=0){e.wander+=dt*.35;const d=e.home.clone().sub(p);if(d.length()>5)move(e.avatar.group,d.normalize().x*dt*1.2,d.z*dt*1.2);else move(e.avatar.group,Math.sin(e.wander)*dt*.6,Math.cos(e.wander)*dt*.6);moving=true;}
 const floor=floorAt(p.x,p.z,p.y);if((e.vy||0)>0||p.y>floor+.02){e.vy=(e.vy||0)-dt*22;p.y+=e.vy*dt;if(p.y<=floor){p.y=floor;e.vy=0;}}else p.y=floor;
 for(const other of enemies){if(other===e||other.dead)continue;const diff=p.clone().sub(other.avatar.group.position),d=diff.length();if(d>.01&&d<1.15){diff.normalize();move(e.avatar.group,diff.x*dt*1.3,diff.z*dt*1.3);}}
 if(e.frozen<=0&&e.avatar.rig.visible)animateMutant(e.avatar,dt,moving);if(e.recoil>0)e.avatar.rig.rotation.x=-Math.sin(e.recoil/.26*Math.PI)*.42;e.avatar.hpFill.scale.x=Math.max(.001,e.hp/e.maxHp)*.96;e.avatar.hpGroup.quaternion.copy(camera.quaternion);e.avatar.hpGroup.rotation.y-=e.avatar.group.rotation.y;e.avatar.hpGroup.visible=pd<30;
 }
}
function updateProjectiles(dt){for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];p.life-=dt;
 if(p.homing&&p.owner==='player'){
  let best=null,bd=14;
  for(const e of enemies){if(e.dead)continue;const d=e.avatar.group.position.distanceTo(p.m.position);if(d<bd){bd=d;best=e;}}
  if(best){const aim=best.avatar.group.position.clone().add(new THREE.Vector3(0,1.2,0)).sub(p.m.position).normalize();const spd=p.v.length();p.v.normalize().lerp(aim,Math.min(1,dt*7)).normalize().multiplyScalar(spd);}
 }
 const from=p.m.position.clone(),travel=p.v.length()*dt,to=from.clone().addScaledVector(p.v,dt),direction=p.v.clone().normalize();let hit=false,hitPoint=to;
 // Swept segment collision prevents fast projectiles from tunnelling through actors or cover.
 let closest=travel;const ray=new THREE.Ray(from,direction),intersection=new THREE.Vector3();for(const c of colliders){const b=new THREE.Box3(new THREE.Vector3(c.x-c.w,0,c.z-c.d),new THREE.Vector3(c.x+c.w,c.h,c.z+c.d));if(ray.intersectBox(b,intersection)){const d=intersection.distanceTo(from);if(d<closest){closest=d;hit=true;hitPoint=intersection.clone();}}}
 cameraAimRay.set(from,direction);cameraAimRay.far=closest;const cover=cameraAimRay.intersectObjects(cameraMeshes,false)[0];if(cover&&cover.distance<closest){closest=cover.distance;hit=true;hitPoint=cover.point.clone();}
 let target=null;if(p.owner!=='player'){const c=player.group.position.clone().add(new THREE.Vector3(0,1.35,0));if(ray.intersectSphere(new THREE.Sphere(c,.72),intersection)){const d=intersection.distanceTo(from);if(d<closest){closest=d;target='player';hit=true;hitPoint=intersection.clone();}}}
 const crossings=p.pierced?[]:null;
 for(const e of enemies){
  if(e.dead||e===p.owner||p.pierced?.has(e)||(rogueMode&&p.owner!=='player'))continue;
  const center=e.avatar.group.position.clone().add(new THREE.Vector3(0,e.hitHeight??1.4,0));
  if(!ray.intersectSphere(new THREE.Sphere(center,e.hitRadius??.83),intersection))continue;
  const distance=intersection.distanceTo(from);
  if(distance>=closest)continue;
  if(crossings)crossings.push({enemy:e,point:intersection.clone(),distance});
  else{closest=distance;target=e;hit=true;hitPoint=intersection.clone();}
 }
 if(crossings)for(const crossing of crossings.sort((a,b)=>a.distance-b.distance)){
  p.pierced.add(crossing.enemy);projectileImpact(p,crossing.enemy,crossing.point);
  if(p.pierced.size===(p.pierceLimit||3)){hit=true;hitPoint=crossing.point;break;}
 }
 p.m.position.copy(hitPoint);if(target==='player')damagePlayer(p.damage,p.owner,false);else if(target)projectileImpact(p,target,hitPoint);
 if(p.form)drawTrail(from,p.m.position,p.form.colour,p.form.right?.14:.085,p.form.width);
 else if(p.crystalColor)drawTrail(from,p.m.position,p.crystalColor,.13,.072);
 else drawTrail(from,p.m.position,p.owner==='player'?(prismColors[p.weapon]??0xffdaae):0xee9878,.07,p.heavy?.045:.018);
 if(hit||p.life<=0||p.m.position.y<.05){particlesAt(p.m.position,p.crystalColor??(p.owner==='player'?0xeed6a8:0xe8a386),hit?8:2,3);p.pool.release(p.m);projectiles.splice(i,1);}}
}
function projectileImpact(p,target,point){
 if(p.form)formImpact(p.form,point,p.v.clone().normalize());
 damageEnemy(target,p.damage,p.owner==='player'?'player':'ai',p.knockback?p.v.clone().setY(0).normalize().multiplyScalar(p.knockback/.65):null,{heavy:p.heavy,stagger:p.heavy?.6:.15,weapon:p.weapon,distance:p.origin?.distanceTo(point)??0});
 if(rogueMode&&p.owner==='player'&&p.weapon==='rifle'&&p.heavy&&rank('rifle-burst')){
  blast(point,4.2,45,0xb99aff);calloutAt(point,'超载爆裂','arc');cue('thunder',point);
 }
 if(p.element==='frost'){
  target.frozen=target.boss?.3:1.5;target.slow=4;
  if(rogueMode){
   impactSpray(point,0xa8efff,!!p.frostBurst);cue('ice',point);
   if(p.frostBurst){
    pulseAt(point.clone().setY(.10),3.3,0x80ddf0);
    for(const e of enemies){
     const pos=e.avatar.group.position;
     if(e===target||e.dead||pos.distanceTo(point)>3.3||obstructed(point,pos))continue;
     frostStack(e,2);queueEcho(e,24);impactSpray(pos.clone().setY(.8),0xa8efff);
    }
   }
  }
 }
 if(p.owner==='player'){hitstop=Math.max(hitstop,.025);shake=Math.max(shake,p.heavy?.13:.04);comboHits++;comboTimer=3;impactSound(p.heavy);}
}
function updatePlayer(dt){

 meleeCd=Math.max(0,meleeCd-dt);spikeCd=Math.max(0,spikeCd-dt);dodgeCd=Math.max(0,dodgeCd-dt);invulnerable=Math.max(0,invulnerable-dt);comboWindow=Math.max(0,comboWindow-dt);skillCd=Math.max(0,skillCd-dt);ultimateCd=Math.max(0,ultimateCd-dt);parryTime=Math.max(0,parryTime-dt);parryCd=Math.max(0,parryCd-dt);shieldTime=Math.max(0,shieldTime-dt);buffTime=Math.max(0,buffTime-dt);empowered=Math.max(0,empowered-dt);grappleCd=Math.max(0,grappleCd-dt);comboTimer=Math.max(0,comboTimer-dt);if(comboTimer<=0)comboHits=0;stamina=Math.min(100,stamina+dt*(raid.sprinting?0:24));
 if(rogueMode){
  dashStrikeWindow=Math.max(0,dashStrikeWindow-dt);
  const maxC=maxDashCharges();
  if(dashCharges<maxC){dashRecharge-=dt;if(dashRecharge<=0){dashCharges++;dashRecharge=dashCharges<maxC?.78:0;}}
  if(inputBuffer){
   if(time>inputBuffer.until)inputBuffer=null;
   else if(inputBuffer.action==='dodge'&&dodgeTime<=.08&&dashCharges>=1){inputBuffer=null;dodge();}
   else if(inputBuffer.action==='parry'&&dodgeTime<=0&&parryCd<=0){inputBuffer=null;parry();}
   else if(inputBuffer.action==='melee'&&meleeCd<=0&&(dodgeTime<=.12)){inputBuffer=null;melee();}
   else if(inputBuffer.action==='heavy'&&meleeCd<=0&&dodgeTime<=0){inputBuffer=null;alternateAttack();}
  }
  if(lockTarget&&!lockTarget.dead&&state==='playing'&&!freeLook){
   const lp=lockTarget.avatar.group.position,p=player.group.position;
   const targetYaw=Math.atan2(lp.x-p.x,-(lp.z-p.z));
   const diff=Math.atan2(Math.sin(targetYaw-yaw),Math.cos(targetYaw-yaw));
   yaw+=diff*Math.min(1,dt*8);
  }else if(lockTarget?.dead)lockTarget=null;
  if(midDown&&!freeLook&&performance.now()-midPressAt>140){
   freeLook=true;freeLookYaw=yaw;freeLookPitch=pitch;
  }
 }
 if(input.ArrowLeft)yaw-=dt*1.8;if(input.ArrowRight)yaw+=dt*1.8;if(input.ArrowUp)pitch=clamp(pitch-dt*.7,-.22,1.05);if(input.ArrowDown)pitch=clamp(pitch+dt*.7,-.22,1.05);
 const ix=(input.KeyD?1:0)-(input.KeyA?1:0),iz=(input.KeyW?1:0)-(input.KeyS?1:0);vec2.set(ix*Math.cos(yaw)+iz*Math.sin(yaw),0,ix*Math.sin(yaw)-iz*Math.cos(yaw));const moving=vec2.lengthSq()>.1;
 const previous=player.group.position.clone();raid.sprinting=moving&&(input.AltLeft||input.AltRight)&&stamina>4&&!mouseRight&&!raid.strike&&!input.ControlLeft;if(raid.sprinting){stamina=Math.max(0,stamina-dt*12);emitNoise(10);}if(!moving){raid.velocity.multiplyScalar(Math.exp(-dt*16));if(dodgeTime<=0&&!grappleTarget)move(player.group,raid.velocity.x*dt,raid.velocity.z*dt);}
 if(grappleTarget){const delta=grappleTarget.clone().sub(player.group.position);if(delta.length()<.4){player.group.position.copy(grappleTarget);grappleTarget=null;grounded=true;velocityY=0;}else{player.group.position.addScaledVector(delta.normalize(),Math.min(24*dt,delta.length()));player.group.rotation.y=Math.atan2(delta.x,delta.z);}}
 else{if(dodgeTime>0){dodgeTime-=dt;move(player.group,dodgeDir.x*22*dt,dodgeDir.z*22*dt);player.rig.rotation.z=Math.sin(dodgeTime/.26*Math.PI)*.35;}else{player.rig.rotation.z=0;if(moving){vec2.normalize();const speed=(input.ControlLeft?3.1:!rogueMode&&mouseRight?3.1:raid.heal>0?3:raid.strike?4.2:raid.sprinting?12:8.4)*burdenMultiplier(bagWeight(raid.bag));raid.velocity.lerp(vec2.clone().multiplyScalar(speed),1-Math.exp(-dt*12));move(player.group,raid.velocity.x*dt,raid.velocity.z*dt);if(!rogueMode){const target=mouseRight||weaponNow().type==='ranged'?Math.atan2(Math.sin(yaw),-Math.cos(yaw)):Math.atan2(vec2.x,vec2.z);const delta=Math.atan2(Math.sin(target-player.group.rotation.y),Math.cos(target-player.group.rotation.y));player.group.rotation.y+=delta*Math.min(1,dt*15);}}}
 const floor=floorAt(player.group.position.x,player.group.position.z,player.group.position.y);if(grounded&&Math.abs(floor-player.group.position.y)<.7)player.group.position.y=floor;else if(grounded&&player.group.position.y>floor+.05)grounded=false;if(!grounded){velocityY-=dt*22;player.group.position.y+=velocityY*dt;if(player.group.position.y<=floor&&velocityY<=0){player.group.position.y=floor;velocityY=0;grounded=true;particlesAt(player.group.position,0xa3b59f,7,2);}}}
 playerMotion.copy(player.group.position).sub(previous).divideScalar(Math.max(dt,.001));if(playerMotion.length()>20)playerMotion.setLength(20);
 if(!rogueMode&&mouseRight){chargeTime=Math.min(chargeTime+dt,2);player.group.rotation.y=Math.atan2(Math.sin(yaw),-Math.cos(yaw));if(chargeTime>=weaponNow().charge&&Math.floor(time*20)%3===0)particlesAt(player.group.position.clone().add(new THREE.Vector3(0,1.4,0)),0x8cd4ff,1,1);}
 if(rogueMode&&mouseRight)alternateAttack();
 if(mouseDown&&!mouseRight)melee();animateMutant(player,dt,moving||dodgeTime>0);
 animateAction(dt);if(player.chargeMarks)player.chargeMarks.visible=false;if(mouseRight&&chargeTime>=weaponNow().charge&&weaponNow().type==="melee")chargedOutline(player);if(shieldTime>0&&Math.floor(time*10)%3===0)particlesAt(player.group.position.clone().add(new THREE.Vector3(0,1.4,0)),heroNow().color,1,1);if(buffTime>0&&Math.floor(time*10)%3===0)particlesAt(player.group.position.clone().add(new THREE.Vector3(0,.5,0)),heroNow().color,1,2);
 nearestLoot=null;let best=2.4;for(const loot of loots){if(loot.collected)continue;const d=loot.group.position.distanceTo(player.group.position);if(d<best){best=d;nearestLoot=loot;}}
 updateRaidInteractions(dt);
}
function toggleSoftLock(){
 if(lockTarget&&!lockTarget.dead){lockTarget=null;toast('解除目标锁定');return;}
 const cand=enemies.filter(e=>!e.dead).sort((a,b)=>a.avatar.group.position.distanceToSquared(player.group.position)-b.avatar.group.position.distanceToSquared(player.group.position))[0];
 if(cand){lockTarget=cand;toast('锁定目标 · '+cand.name);}
}
function updateCamera(dt){
 if(state==='menu'){
  menuOrbit+=dt*.14;
  if(rogueMode){
   if(typeof updateSanctuaryHubCamera==='function'&&updateSanctuaryHubCamera(dt))return;
   let goalPos,goalLook;
   if(sanctuaryView==='mirror'){goalPos=new THREE.Vector3(-2.6,3.2,28.8);goalLook=new THREE.Vector3(-7.4,2.5,22.0);}
   else if(sanctuaryView==='panorama'){goalPos=new THREE.Vector3(Math.sin(menuOrbit*.55)*12,26.0,22.0);goalLook=new THREE.Vector3(0,-6.0,-60);}
   else{goalPos=new THREE.Vector3(3.2+Math.sin(menuOrbit)*1.5,4.0,31.4);goalLook=new THREE.Vector3(-.8,1.6,8.0);}
   camera.position.lerp(goalPos,1-Math.exp(-dt*3.5));
   camera.lookAt(goalLook);camera.fov=lerp(camera.fov,sanctuaryView==='panorama'?62:54,dt*4);camera.updateProjectionMatrix();return;
  }
  camera.position.set(6+Math.sin(menuOrbit),3.2,30.5);camera.lookAt(.1,1.7,22);return;
 }
 if(rogueMode&&bossIntroTime>0&&bossIntroTarget){
  const bp=bossIntroTarget.avatar.group.position;
  const focus=new THREE.Vector3(bp.x+Math.sin(bossIntroTime*1.8)*3.5,bp.y+3.9,bp.z+7.6);
  camera.position.lerp(focus,1-Math.exp(-dt*7));
  camera.lookAt(bp.x,bp.y+2.1,bp.z);camera.fov=lerp(camera.fov,48,dt*6);camera.updateProjectionMatrix();return;
 }
 const p=player.group.position;cameraTarget.set(p.x,p.y+1.65,p.z);
 if(freeLook&&state==='playing'){
  const orbitDist=5.4,h=Math.cos(freeLookPitch)*orbitDist;
  cameraDesired.set(p.x-Math.sin(freeLookYaw)*h,Math.max(.55,p.y+1.55+Math.sin(freeLookPitch)*orbitDist),p.z+Math.cos(freeLookYaw)*h);
  const delta=cameraDesired.clone().sub(cameraTarget);raycaster.set(cameraTarget,delta.clone().normalize());raycaster.far=delta.length();
  const hit=raycaster.intersectObjects(cameraMeshes,false)[0];
  if(hit)cameraDesired.copy(cameraTarget).addScaledVector(delta.normalize(),Math.max(.75,hit.distance-.35));
  camera.position.lerp(cameraDesired,1-Math.exp(-dt*18));
  camera.lookAt(p.x,p.y+1.45,p.z);
  camera.fov=lerp(camera.fov,52,dt*8);camera.updateProjectionMatrix();
  return;
 }
 const bossRoom=rogueMode&&roomNow()?.type==='boss';
 const dist=!rogueMode&&mouseRight&&weaponNow().type==='ranged'?4.5:rogueMode?(bossRoom?9.2:8.1):6.35;
 cameraDesired.set(p.x-Math.sin(yaw)*dist+Math.cos(yaw)*(rogueMode?1.05:1.63),p.y+(rogueMode?3.55:2.3)+Math.sin(pitch)*5.5,p.z+Math.cos(yaw)*dist+Math.sin(yaw)*(rogueMode?1.05:1.63));cameraDesired.y=Math.max(.55,cameraDesired.y);const delta=cameraDesired.clone().sub(cameraTarget);raycaster.set(cameraTarget,delta.clone().normalize());raycaster.far=delta.length();const hit=raycaster.intersectObjects(cameraMeshes,false)[0];if(hit)cameraDesired.copy(cameraTarget).addScaledVector(delta.normalize(),Math.max(.55,hit.distance-.35));if(rogueMode&&hit)camera.position.copy(cameraDesired);else camera.position.lerp(cameraDesired,1-Math.exp(-dt*18));if(shake>0){camera.position.x+=(visualRoll()-.5)*shake;camera.position.y+=(visualRoll()-.5)*shake*(rogueMode?.58:1);}const target=cameraTarget.clone().add(new THREE.Vector3(Math.sin(yaw)*5+Math.cos(yaw)*.35,-pitch*3,-Math.cos(yaw)*5+Math.sin(yaw)*.35));camera.lookAt(target);camera.fov=lerp(camera.fov,!rogueMode&&mouseRight&&weaponNow().type==='ranged'?49:slowMo>0?52:dodgeTime>0?66:raid.sprinting?65:59,dt*9);camera.updateProjectionMatrix();if(rogueMode&&state==='playing'&&!raid.strike)faceReticle();
}
function updateHUD(){updateBaseHUD();updateRaidHUD();updateLookState();const w=weaponNow(),h=heroNow();$('skill-melee').querySelector('span').textContent=w.short+'普攻';$('skill-melee').querySelector('strong').textContent=w.symbol;cooldownUI('skill-melee',meleeCd,w.cooldown[combo]||.5);cooldownUI('skill-spike',0,1);cooldownUI('skill-hero',skillCd,h.eCd);cooldownUI('skill-burst',ultimateCd,h.qCd);$('skill-hero').querySelector('strong').textContent=h.symbol;$('skill-burst').querySelector('strong').textContent='✺';
 if(rogueMode){
  setSkillArt('skill-melee','echo-item-'+loadout[activeWeapon]+'.webp');
  loadout.forEach((id,i)=>{const slot=$('weapon-slot-'+(i+1));if(slot.dataset.item!==id){slot.dataset.item=id;slot.style.backgroundImage='url("'+assetURL('echo-item-'+id+'.webp')+'")';}});
 }
 if(rogueMode){
  const id=loadout[0],forms=attackForms[id];$('weapon-slot-1').textContent=WEAPONS[id].short+'\n左 · '+forms[0][0]+'\n右 · '+forms[1][0];
  $('skill-melee').querySelector('span').textContent=forms[0][0];$('skill-spike').querySelector('span').textContent=forms[1][0];
 }else{$('weapon-slot-1').textContent='1 '+WEAPONS[loadout[0]].short;$('weapon-slot-2').textContent='2 '+WEAPONS[loadout[1]].short;$('weapon-slot-1').className=activeWeapon===0?'active':'';$('weapon-slot-2').className=activeWeapon===1?'active':'';}
 $('charge-meter').classList.toggle('visible',!rogueMode&&mouseRight);$('charge-meter').classList.toggle('charged',chargeTime>=w.charge);$('charge-meter').querySelector('i').style.width=Math.min(100,chargeTime/w.charge*100)+'%';$('combo-counter').innerHTML=comboHits>1?'<b>'+comboHits+'</b><span>连击 / COMBO</span>':'';
 $('buff-label').textContent=freeLook?'自由观察视角 · 松开中键回正':parryTime>0?'反制窗口':shieldTime>0?'骨盾 '+shieldTime.toFixed(1)+'s':buffTime>0?h.ultimate+' '+buffTime.toFixed(1)+'s':empowered>0?'下一击强化 +35':'';
 const solution=aimSolution();combatReadout(solution);$('crosshair').classList.toggle('on-target',solution.kind==='enemy');$('target-label').textContent=solution.enemy?solution.enemy.name+' · '+Math.ceil(solution.enemy.hp)+' HP':'';
 if(w.type==='ranged'){const origin=muzzlePosition(),dir=solution.point.clone().sub(origin).normalize(),block=sceneIntersection(origin,dir,Math.max(.1,origin.distanceTo(solution.point)-.2));aimBlocked=block.kind==='wall';if(aimBlocked)$('target-label').textContent='枪口受阻 · 移出掩体再射击';$('crosshair').classList.toggle('blocked',aimBlocked);}else $('crosshair').classList.remove('blocked');
}
