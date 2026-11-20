function attackRank(id,right){return rank(id+(right?'-right':'-left'));}
function formReach(id,right){
 const amount=right?({dual:.8,hammer:1}[id]||0):({katana:.7,spear:.9,dual:.5}[id]||0);
 return amount*attackRank(id,right);
}
function formPush(id,right){
 const amount=right?({spear:1.2,crossbow:.7}[id]||0):({hammer:.8,rifle:1}[id]||0);
 return amount*attackRank(id,right);
}
function aimFacing(point){
 const p=player.group.position,dx=point.x-p.x,dz=point.z-p.z;
 // A shoulder camera can see a wall between itself and the character.
 if(dx*Math.sin(yaw)-dz*Math.cos(yaw)<=.05)return new THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw));
 return new THREE.Vector3(dx,0,dz).normalize();
}
function faceReticle(){
 const forward=aimFacing(aimSolution().point);
 player.group.rotation.y=Math.atan2(forward.x,forward.z);
 return forward;
}
function fireForm(right){
 const id=loadout[0],level=attackRank(id,right);
 const dashBoost=!right&&dashStrikeWindow>0;
 if(dashBoost)dashStrikeWindow=0;
 const count=id==='crossbow'?(right?(rank('crossbow-scatter')?5:3):1+level):(id==='rifle'&&!right&&rank('rifle-twin')?2:1);
 const interval=right?(id==='rifle'?1.55:.78):weaponNow().cooldown[0];
 meleeCd=interval*giftTempo()*(chosenClass==='reaper'&&buffTime>0?.7:1)*(dashBoost?.82:1);
 for(let i=0;i<count;i++){
  const spread=id==='rifle'&&count===2?(i===0?-.03:.03):right?(i-(count-1)/2)*(count>=5?.095:.085):(i===0?0:i===1?-.052:.052);
  const scale=(id==='crossbow'?(right?.43:i?.45:1):(id==='rifle'&&count===2?.64:1))*(dashBoost?1.2:1);
  shoot(right?2:1,spread,null,scale,i===0);
  if(id==='crossbow'&&rank('crossbow-homing')){const shot=projectiles.at(-1);if(shot)shot.homing=true;}
 }
 if(dashBoost){cue('dashStrike');if(typeof noteProphecyMetric==='function')noteProphecyMetric('dashStrike');}
}
function alternateAttack(){
 if(state!=='playing'||meleeCd>0||dodgeTime>0||grappleTarget||raid.map||raid.heal||raid.search)return;
 if(weaponNow().type==='ranged')fireForm(true);else beginStrike(true);
}

function skillIcon(hero,key){
 const frost={E:'霜锁.svg',X:'冰棱陷阱.svg',Q:'静寂之境.svg'};
 const shade={E:'相位闪.svg',X:'留影诱饵.svg',Q:'幽影乱舞.svg'};
 if(hero==='frost')return frost[key];
 if(hero==='shade')return shade[key];
 return 'echo-skill-'+hero+key+'.webp';
}


