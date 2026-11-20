import * as THREE from './vendor/three.module.js';
import { HEROES, WEAPONS } from './data.js';
import { MouseLook } from './mouse-look.js';
import { WORLD_LIMIT, RAID_SECONDS, DISTRICTS, EXIT_DEFS, ITEM_DEFS, exitStatus, bagWeight, bagValue, canCarry, burdenMultiplier, districtAt, extractAdvance } from './raid-rules.js';

const $=id=>document.getElementById(id), clamp=THREE.MathUtils.clamp, lerp=THREE.MathUtils.lerp;
const canvas=$('world'), scene=new THREE.Scene();
scene.background=new THREE.Color(0xc0ddeb); scene.fog=new THREE.Fog(0xc0ddeb,82,320);
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(error){$('loading').innerHTML='<b>当前浏览器无法启动 3D 场景</b><small>请用开启硬件加速的 Chrome 或 Edge 打开。</small>';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,650);
scene.add(new THREE.HemisphereLight(0xfff4e2,0x676b9c,rogueMode?.96:1.85));
const sun=new THREE.DirectionalLight(0xffe7cc,rogueMode?2.55:2.45);sun.position.set(-28,55,-38);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:1,far:150});sun.shadow.bias=-.001;sun.shadow.normalBias=.025;scene.add(sun,sun.target);
const fill=new THREE.DirectionalLight(0xb9c2fa,rogueMode?.42:.65);fill.position.set(25,12,25);scene.add(fill);
const objects=new THREE.Group(),actors=new THREE.Group(),effects=new THREE.Group();scene.add(objects,actors,effects);
const colliders=[],cameraMeshes=[],enemies=[],loots=[],particles=[],projectiles=[],rings=[],surfaces=[],anchors=[];
let visualRoll=Math.random,noiseRoll=Math.random;
const visualRange=(a,b)=>a+visualRoll()*(b-a);
let seed=976;function rng(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}const rand=(a,b)=>a+rng()*(b-a);
const mat=(c,extra={})=>new THREE.MeshStandardMaterial({color:c,roughness:.88,flatShading:true,...extra});
const mats={ground:mat(0xf0d6c2),road:mat(0xe2cdbf),concrete:mat(0xf0e4cf),lightConcrete:mat(0xffebd6),dark:mat(0x417c80),rust:mat(0xe4806a),metal:mat(0x56aba8,{metalness:.2}),line:mat(0xfff3d4),glass:mat(0x67899e,{metalness:.18}),bone:mat(0xe2d7bd),black:mat(0x293c48),purple:mat(0x9c80bd),leaf:mat(0x79a98b),lavender:mat(0xb69ace)};
const boxGeo=new THREE.BoxGeometry(1,1,1),icoGeo=new THREE.IcosahedronGeometry(1,0),sphereGeo=new THREE.SphereGeometry(1,8,6);
function mesh(geo,material,x=0,y=0,z=0,parent=objects){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(x,y,z,w,h,d,material=mats.concrete,parent=objects){const m=mesh(boxGeo,material,x,y,z,parent);m.scale.set(w,h,d);return m;}
function rock(x,y,z,s,material=mats.concrete,parent=objects){const m=mesh(icoGeo,material,x,y,z,parent);m.scale.set(s,s*.7,s*.8);m.rotation.set(rand(0,3),rand(0,3),rand(0,3));return m;}
const cylinderCache=new Map();
function cylinder(x,y,z,r1,r2,h,material,parent=objects,seg=6){const key=[r1,r2,h,seg].join('/');if(!cylinderCache.has(key))cylinderCache.set(key,new THREE.CylinderGeometry(r1,r2,h,seg));return mesh(cylinderCache.get(key),material,x,y,z,parent);}
function solid(x,z,w,d,h=5){colliders.push({x,z,w:w/2,d:d/2,h});}
function glow(color){return mat(color,{emissive:color,emissiveIntensity:1.8});}
const amber=glow(0xf1a250),mint=glow(0x8cecac),redGlow=glow(0xed715a),purpleGlow=glow(0xc395ee);


let environment;

function createMutant(type='reaper',isPlayer=false){
 if(isPlayer&&HEROES[type]?.human){
  const avatar=(rogueMode||type==='ember')?createEmber(type):createHumanoid(type);
  return rogueMode?expeditionRegalia(avatar):avatar;
 }
 const group=new THREE.Group(),rig=new THREE.Group();group.add(rig);actors.add(group);
 const skin=mat(type==='spitter'?0x625973:0x527767);const armor=mat(0xe9dac2);const emission=isPlayer?amber:(type==='spitter'?purpleGlow:redGlow);
 const torso=mesh(new THREE.DodecahedronGeometry(.72,0),skin,0,1.63,0,rig);torso.scale.set(.9,1.05,.57);torso.rotation.x=.13;
 const waist=mesh(icoGeo,skin,0,1.02,-.03,rig);waist.scale.set(.4,.43,.32);
 const chest=mesh(icoGeo,emission,0,1.75,.38,rig);chest.scale.set(.16,.26,.08);
 for(let i=0;i<3;i++){const rib=box(0,1.43+i*.2,.3,.77-i*.1,.065,.13,armor,rig);rib.rotation.z=i%2?.06:-.06;}
 const head=mesh(new THREE.DodecahedronGeometry(.34,0),skin,0,2.38,.12,rig);head.scale.set(.85,1.1,.9);
 box(0,2.24,.36,.28,.14,.1,mats.dark,rig);for(const side of [-1,1]){box(side*.13,2.43,.39,.13,.045,.045,emission,rig);const horn=cylinder(side*.23,2.69,-.04,.015,.11,.48,armor,rig,4);horn.rotation.z=-side*.35;}
 if(type==='reaper'){
  const crest=mesh(icoGeo,armor,0,2.56,.23,rig);crest.scale.set(.32,.23,.44);crest.rotation.x=.28;
  const muzzle=mesh(icoGeo,armor,0,2.36,.425,rig);muzzle.scale.set(.235,.125,.26);
  for(const side of [-1,1]){
   const plate=mesh(icoGeo,armor,side*.28,1.82,.2,rig);plate.scale.set(.31,.19,.20);plate.rotation.z=side*.34;
  }
 }
 const arms=[],legs=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.62,2.01,0);rig.add(arm);arms.push(arm);
  const shoulder=mesh(icoGeo,armor,side*.04,-.02,-.02,arm);shoulder.scale.set(.3,.27,.35);
  const upper=mesh(icoGeo,skin,side*.07,-.35,0,arm);upper.scale.set(.21,.44,.21);
  const fore=mesh(icoGeo,skin,side*.14,-.78,.08,arm);fore.scale.set(type==='spitter'?.28:.2,.4,.25);
  for(let n=0;n<3;n++){const claw=cylinder(side*(.04+n*.1),-1.1,.21,.01,.05,type==='reaper'?.66:.4,armor,arm,4);claw.rotation.x=-.45;claw.rotation.z=-side*.12;}
  const blade=cylinder(side*.26,-.58,-.08,.01,.12,.75,armor,arm,4);blade.rotation.z=-side*.4;
  const leg=new THREE.Group();leg.position.set(side*.27,1,0);rig.add(leg);legs.push(leg);const thigh=mesh(icoGeo,skin,0,-.3,-.02,leg);thigh.scale.set(.24,.4,.25);const shin=mesh(icoGeo,armor,0,-.68,.04,leg);shin.scale.set(.14,.32,.17);box(0,-.92,.12,.25,.15,.42,skin,leg);
 }
 for(let i=0;i<5;i++){const spike=cylinder(0,1.4+i*.23,-.36,.01,.12,.5+i*.06,armor,rig,4);spike.rotation.x=-1.1;}
 if(type==='spitter'){for(const side of [-1,1]){const sac=mesh(icoGeo,emission,side*.38,1.9,-.3,rig);sac.scale.set(.3,.36,.24);}}
 group.rotation.y=Math.PI;
 const hpGroup=new THREE.Group();const hpBg=box(0,3.05,0,1,.075,.01,mats.dark,hpGroup);const hpFill=box(0,3.05,.015,.96,.045,.012,emission,hpGroup);group.add(hpGroup);hpGroup.visible=!isPlayer;
 const avatar={group,rig,arms,legs,skin,head,chest,hpGroup,hpFill,type,phase:0,attack:0,hurt:0};
 return isPlayer&&rogueMode?expeditionRegalia(avatar):avatar;
}

let chosenClass='ember',player=createMutant('ember',true),state='menu',time=0,gameTime=RAID_SECONDS,kills=0,biomass=0,totalCollected=0,evolution=0,hp=190,maxHp=190,stamina=100;
let yaw=0,pitch=.28,velocityY=0,grounded=true,meleeCd=0,spikeCd=0,burstCd=0,dodgeCd=0,dodgeTime=0,invulnerable=0,combo=0,comboWindow=0,extracting=0,hitstop=0,shake=0,toastTime=0,hitMarker=0,damageFlash=0;
let dashCharges=2,dashRecharge=0,dashStrikeWindow=0,inputBuffer=null,slowMo=0,lockTarget=null,cinematicTime=0,bossIntroTime=0,bossIntroTarget=null,sanctuaryView='hero';
const maxDashCharges=()=>rogueMode?1+(typeof mirrorLevel==='function'?mirrorLevel('extraDash'):0):1;
function queueInput(action){inputBuffer={action,until:time+.18};}
let input={},mouseDown=false,mouseRight=false,menuOrbit=0,last=performance.now(),frames=0,fpsTime=0,sound=true,audio=null,nearestLoot=null;
let loadout=rogueMode?['katana']:['katana','crossbow'],activeWeapon=0,selectedSlot=0,chargeTime=0,parryTime=0,parryCd=0,skillCd=0,ultimateCd=0,buffTime=0,shieldTime=0,empowered=0,grappleCd=0,grappleTarget=null,grappleProgress=0,airVelocity=0,playerMotion=new THREE.Vector3(),lastPlayerPos=new THREE.Vector3(),comboHits=0,comboTimer=0,aimPoint=new THREE.Vector3(),aimBlocked=false;
const weaponSpecs=rogueMode?{...WEAPONS,rifle:{...WEAPONS.rifle,damage:[62,62,62],heavy:150,charge:.85,description:'蓄力 0.85 秒 · 贯穿三敌'}}:WEAPONS;
const cameraAimRay=new THREE.Raycaster(),weaponNow=()=>weaponSpecs[loadout[activeWeapon]],heroNow=()=>HEROES[chosenClass];
let dodgeDir=new THREE.Vector3(),cameraDesired=new THREE.Vector3(),cameraTarget=new THREE.Vector3(),raycaster=new THREE.Raycaster();
const vec=new THREE.Vector3(),vec2=new THREE.Vector3();
let stash=0;try{stash=Number(localStorage.getItem('aberrant-v4-stash')||0);}catch{}
player.group.position.set(0,0,24);

function audioTone(freq=100,duration=.12,wave='sawtooth',volume=.04,slide=.25){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();const osc=audio.createOscillator(),gain=audio.createGain();osc.type=wave;osc.frequency.setValueAtTime(freq,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(20,freq*slide),audio.currentTime+duration);gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);}catch{}}
function toggleSound(){sound=!sound;$('sound-menu').textContent=$('sound-pause').textContent='声音：'+(sound?'开':'关');if(sound)audioTone(300,.15,'sine');if(rogueMode)syncAmbience();}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');toastTime=3;}
function showHit(){hitMarker=.15;$('crosshair').querySelector('b').style.opacity=1;}
function move(entity,dx,dz,r=.5){const p=entity.position;let nx=clamp(p.x+dx,-WORLD_LIMIT,WORLD_LIMIT),nz=p.z;for(const c of colliders){if(p.y>c.h+.1)continue;if(nx>c.x-c.w-r&&nx<c.x+c.w+r&&nz>c.z-c.d-r&&nz<c.z+c.d+r)nx=dx>0?c.x-c.w-r:c.x+c.w+r;}p.x=nx;nz=clamp(p.z+dz,-WORLD_LIMIT,WORLD_LIMIT);for(const c of colliders){if(p.y>c.h+.1)continue;if(nx>c.x-c.w-r&&nx<c.x+c.w+r&&nz>c.z-c.d-r&&nz<c.z+c.d+r)nz=dz>0?c.z-c.d-r:c.z+c.d+r;}p.z=nz;}
function obstructed(a,b,minHeight=1.5,padding=0){const dx=b.x-a.x,dz=b.z-a.z;for(const c of colliders){if(c.h<minHeight)continue;let low=0,high=1;for(const[key,d,center,half]of [['x',dx,c.x,c.w+padding],['z',dz,c.z,c.d+padding]]){if(Math.abs(d)<.0001){if(a[key]<center-half||a[key]>center+half){low=2;break;}}else{let t1=(center-half-a[key])/d,t2=(center+half-a[key])/d;if(t1>t2)[t1,t2]=[t2,t1];low=Math.max(low,t1);high=Math.min(high,t2);}}if(low<=high&&low<1&&high>0)return true;}return false;}
function nearestEnemy(range=8,cone=.5){let found=null,best=range;const forward=new THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw));for(const enemy of enemies){if(enemy.dead)continue;const delta=enemy.avatar.group.position.clone().sub(player.group.position);const d=delta.length();if(d<best&&delta.normalize().dot(forward)>cone&&!obstructed(player.group.position,enemy.avatar.group.position)){found=enemy;best=d;}}return found;}
function spawnLoot(x,z,value=1){if(rogueMode)return;const group=new THREE.Group();group.position.set(x,0,z);objects.add(group);const body=mesh(new THREE.OctahedronGeometry(.25),amber,0,.65,0,group);const base=cylinder(0,.1,0,.45,.5,.18,mats.dark,group);const light=mesh(new THREE.CylinderGeometry(.04,.17,1.6,5),new THREE.MeshBasicMaterial({color:0xf8c37b,transparent:true,opacity:.3,depthWrite:false}),0,1,0,group);loots.push({group,body,light,value,phase:rand(0,6),collected:false});}
function spawnEnemy(x,z,type){const avatar=createMutant(type);avatar.group.position.set(x,0,z);const hp=type==='spitter'?85:110;enemies.push({avatar,hp,maxHp:hp,dead:false,cooldown:rand(.7,2),aggro:0,wander:rand(0,6),target:null,windup:0,stagger:0});}
function clearProjectiles(){
 for(const p of projectiles)p.pool.release(p.m);
 projectiles.length=0;
}
function clearTransient(){
 clearRaid();
 for(const e of enemies){if(rogueMode)releaseCreature(e.avatar);actors.remove(e.avatar.group);}
 enemies.length=0;
 for(const l of loots)objects.remove(l.group);
 loots.length=0;
 clearProjectiles();
 for(const p of particles)particlePool.release(p.m);
 particles.length=0;
 for(const r of rings)ringPool.release(r.m);
 rings.length=0;
 $('floats').innerHTML='';
}




function finish(success,reason=''){if(rogueMode)return finishExpedition(success,reason);if(state==='result')return;state='result';cancelMouseLock();document.exitPointerLock?.();mouseDown=mouseRight=false;input={};$('hud').classList.add('hidden');$('pause').classList.add('hidden');$('result').classList.remove('hidden');$('result-eyebrow').textContent=success?'EXTRACTION COMPLETE':'SPECIMEN LOST';$('result-title').textContent=success?'成功回巢':'猎场吞噬了你';$('result-desc').textContent=success?'基因已存入巢穴。你活着带回了下一次进化的机会。':reason||'携带的基因遗落在了废土。重新进入猎场，再次争夺进化的机会。';$('result-loot').textContent=success?biomass:0;$('result-kills').textContent=kills;$('result-time').textContent=formatTime(time);settleRaid(success);if(success){stash+=biomass;try{localStorage.setItem('aberrant-v4-stash',String(stash));}catch{}if($('stash'))$('stash').textContent=stash;}audioTone(success?440:80,.7,'sine',.06,success?1.5:.2);}
function pauseGame(){if(!['playing','paused'].includes(state))return;state='paused';if(rogueMode)syncAmbience();cancelMouseLock();chargeTime=0;input={};mouseDown=mouseRight=false;$('pause').classList.remove('hidden');$('lock-message').textContent='已暂停。点击下方按钮锁定鼠标并继续。';$('look-status').textContent='鼠标已释放 · 点击继续后重新锁定';document.exitPointerLock?.();}
function resume(){if(state==='paused')lockMouse();}






function createProjectile(origin,dir,owner,damage,color,form=null){
 const pool=form?boltPool:projectilePool;
 const m=pool.acquire(form?form.geometry:projectileGeometry,origin,form?0xffffff:color);
 m.quaternion.setFromUnitVectors(form?formForward:effectUp,dir);
 projectiles.push({m,pool,form,v:dir.clone().multiplyScalar(owner==='player'?36:14),owner,damage,life:2.7,trail:0});
}

function dodge(){
 if(state!=='playing')return;
 if(rogueMode){
  if(dodgeCd>0&&dodgeTime>.08){queueInput('dodge');return;}
  if(dodgeCd>0&&dashCharges<1)return;
  if(dashCharges>0)dashCharges--;
  if(dashRecharge<=0)dashRecharge=.78;
  stamina=Math.max(0,stamina-22);dodgeCd=.48;
 }else{
  if(dodgeCd>0||stamina<22)return;
  stamina-=22;dodgeCd=.48;
 }
 cancelStrike();raid.search=null;raid.heal=0;dodgeTime=.24;invulnerable=.34;
 const x=(input.KeyD?1:0)-(input.KeyA?1:0),z=(input.KeyW?1:0)-(input.KeyS?1:0);
 dodgeDir.set(x*Math.cos(yaw)+z*Math.sin(yaw),0,x*Math.sin(yaw)-z*Math.cos(yaw));
 if(dodgeDir.length()<.1)dodgeDir.set(Math.sin(yaw),0,-Math.cos(yaw));
 dodgeDir.normalize();
 if(rogueMode){
  dashStrikeWindow=.34;
  dashGift();cue('dodge');
  if(rank('dual-clone')){
   const origin=player.group.position.clone();
   pulseAt(origin,1.6,0xcb68ed);
   setTimeout(()=>{
    if(state==='playing'&&run.status==='combat'){
     blast(origin,4.0,38,0xcb68ed);
     calloutAt(origin,'影舞残像','arc');
    }
   },240);
  }
  if(chosenClass==='shade'&&rank('shadowStep')){
   const near=enemies.some(e=>!e.dead&&e.avatar.group.position.distanceTo(player.group.position)<3.5);
   if(near){run.power=Math.min(5,run.power+2);empowered=Math.max(empowered,3);calloutAt(player.group.position,'影步叠印','arc');}
  }
 }
 particlesAt(player.group.position.clone().add(new THREE.Vector3(0,.5,0)),0xb3d3b6,12,2);
 if(!rogueMode)audioTone(220,.15,'triangle',.035,.1);
}
function evolve(){if(state!=='playing')return;if(biomass<5){toast('进化需要 5 份基因 · 当前 '+biomass+' 份');return;}if(evolution>=3){toast('本局已达到进化上限');return;}biomass-=5;evolution++;maxHp+=25;hp=Math.min(maxHp,hp+60);player.group.scale.setScalar(1+evolution*.035);ringAt(player.group.position.clone().add(new THREE.Vector3(0,.15,0)),0xc8f5af,4,.8);toast('进化完成 · 伤害提升 20% · 生命上限 +25');audioTone(180,.6,'sine',.05,3);}

function animateMutant(avatar,dt,moving){avatar.phase+=dt*(moving?9:2);const swing=moving?Math.sin(avatar.phase)*.65:Math.sin(avatar.phase)*.03;avatar.legs[0].rotation.x=swing;avatar.legs[1].rotation.x=-swing;avatar.rig.position.y=moving?Math.abs(Math.sin(avatar.phase))*.06:Math.sin(avatar.phase)*.025;avatar.rig.rotation.x=moving?.13:.03;avatar.attack=Math.max(0,avatar.attack-dt);avatar.hurt=Math.max(0,avatar.hurt-dt);for(let i=0;i<2;i++){avatar.arms[i].rotation.x=avatar.attack>0?-1.2-Math.sin(avatar.attack*17)*.6:(i===0?-swing:swing)*.7;avatar.arms[i].rotation.z=(i===0?1:-1)*(avatar.attack>0?.7:.13);}if(avatar.body){
 for(let i=0;i<2;i++){
  const stride=(i===0?1:-1)*Math.sin(avatar.phase);
  avatar.knees[i].rotation.x=moving?Math.max(0,stride)*.72:.055;
  avatar.elbows[i].rotation.x=avatar.attack>0?-.58:moving?-.32+stride*.13:-.18;
 }
 avatar.body.material.color.setHex(avatar.hurt>0?0xffbab0:(avatar.baseTint??0xffffff));return;}avatar.skin.emissive.setHex(avatar.hurt>0?0x9f4936:0x000000);avatar.skin.emissiveIntensity=avatar.hurt>0?.8:0;}


function formatTime(t){return String(Math.max(0,Math.floor(t/60))).padStart(2,'0')+':'+String(Math.max(0,Math.floor(t%60))).padStart(2,'0');}
const map=$('minimap').getContext('2d');
function cooldownUI(id,value,max){const el=$(id);el.classList.toggle('cooling',value>.05);el.dataset.cooldown=value>.05?String(Math.ceil(value)):'';el.querySelector('i').style.transform='translateY('+(100-clamp(value/max,0,1)*100)+'%)';}
function updateBaseHUD(){$('hp-text').textContent=Math.ceil(hp)+' / '+maxHp;$('hp-bar').style.width=(hp/maxHp*100)+'%';$('hp-bar').style.background=hp<maxHp*.3?'#e57c61':'#d4e4b3';$('stamina-bar').style.width=stamina+'%';$('biomass').textContent=String(biomass).padStart(2,'0');$('collect-count').textContent=Math.min(biomass,3)+' / 3';$('collect-check').textContent=biomass>=3?'◆':'◇';$('timer').textContent=formatTime(gameTime-time);$('timer').style.color=gameTime-time<60?'#ff9970':'';$('kills').textContent=kills;$('evo').textContent=evolution;$('level').textContent='LV.0'+(1+evolution);$('evolution-note').textContent=evolution>=3?'本局进化已满 · 携带基因尽快撤离':biomass>=5?'按 R 消耗 5 份基因进化 · 提升伤害与生命':'获得 5 份基因可按 R 进化 · 本局保留';$('enemy-count').textContent='威胁 '+enemies.filter(e=>!e.dead).length;let deg=((yaw*180/Math.PI)%360+360)%360;const compass=['N','NE','E','SE','S','SW','W','NW'];$('heading').textContent=compass[Math.round(deg/45)%8]+' · '+String(Math.round(deg)).padStart(3,'0');cooldownUI('skill-melee',meleeCd,.65);cooldownUI('skill-spike',spikeCd,chosenClass==='spitter'?.55:1.1);cooldownUI('skill-burst',burstCd,10);cooldownUI('skill-dodge',dodgeCd,.5);drawMap();}

$('again').addEventListener('click',startGame);$('back-menu').addEventListener('click',returnMenu);$('resume').addEventListener('click',resume);$('quit').addEventListener('click',()=>finish(false,'你放弃了本次猎场，携带的资源未能带回。'));$('sound-menu').addEventListener('click',toggleSound);$('sound-pause').addEventListener('click',toggleSound);
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('mousedown',e=>{if(state!=='playing'||document.pointerLockElement!==canvas)return;if(e.button===0){mouseDown=true;if(rogueMode&&(meleeCd>.02||dodgeTime>.14))queueInput('melee');else melee();}if(e.button===2){mouseRight=true;chargeTime=0;if(rogueMode){if(meleeCd>.02||dodgeTime>.14)queueInput('heavy');else alternateAttack();return;}audioTone(180,.15,'sine',.025,1.3);}if(e.button===1){e.preventDefault();if(rogueMode&&typeof toggleSoftLock==='function')toggleSoftLock();}});
window.addEventListener('mouseup',e=>{if(e.button===0)mouseDown=false;if(e.button===2){if(!rogueMode&&mouseRight&&state==='playing')releaseHeavy();mouseRight=false;chargeTime=0;}});
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab','AltLeft','AltRight'].includes(e.code))e.preventDefault();if(state==='cinematic'&&(e.code==='Escape'||e.code==='Space'||e.code==='Enter')){if(typeof finishOpeningCinematic==='function')finishOpeningCinematic();return;}if(e.code==='Escape'){if(state==='playing'||state==='paused')pauseGame();return;}if(rogueMode&&expeditionKey(e))return;if(state!=='playing')return;input[e.code]=true;if(e.repeat)return;if(e.code==='ShiftLeft'||e.code==='ShiftRight')dodge();if(e.code==='Space'&&grounded){velocityY=9;grounded=false;audioTone(110,.1,'triangle',.02);}if(e.code==='KeyQ')burst();if(e.code==='KeyE')useAbility();if(e.code==='KeyC'){if(rogueMode&&dodgeTime>0)queueInput('parry');else parry();}if(e.code==='KeyV'&&rogueMode&&typeof toggleSoftLock==='function')toggleSoftLock();if(e.code==='KeyG')grapple();if(e.code==='KeyF')interact();if(e.code==='KeyH')heal();if(e.code==='KeyX')useUtility();if(e.code==='KeyM'||e.code==='Tab')toggleTacticalMap();if(e.code==='KeyT')cycleExit();if(e.code==='KeyB')toggleTacticalMap();if(e.code==='KeyR')evolve();if(e.code==='Digit1')switchWeapon(0);if(e.code==='Digit2')switchWeapon(1);});
window.addEventListener('keyup',e=>{input[e.code]=false;});window.addEventListener('blur',()=>{if(state==='playing'||lockPending)pauseGame();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&(state==='playing'||lockPending))pauseGame();});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

let nextHUD=0;
function loop(now){requestAnimationFrame(loop);if(rogueMode)syncAmbience();const frameSeconds=(now-last)/1000;let dt=Math.min(frameSeconds,.04);last=now;frames++;fpsTime+=frameSeconds;if(fpsTime>1){$('fps').textContent=Math.round(frames/fpsTime)+' FPS · '+renderer.info.render.calls+' DRAW';frames=0;fpsTime=0;}
 if(state==='cinematic'){
  cinematicTime+=dt;time+=dt;
  animateMutant(player,dt,false);poseWeapon(player,null,true);
  if(typeof updateAmbientMotes==='function')updateAmbientMotes(dt);
  if(typeof stepOpeningCinematic==='function')stepOpeningCinematic(dt);
  renderer.render(scene,camera);return;
 }
 if(state==='playing'){
  let simDt=dt;
  if(slowMo>0){slowMo=Math.max(0,slowMo-dt);simDt=dt*.2;}
  if(bossIntroTime>0){bossIntroTime=Math.max(0,bossIntroTime-dt);simDt=dt*.15;}
  time+=simDt;updateRaid(simDt);if(state!=='playing')return;if(!rogueMode&&time>=gameTime)finish(false,'污染潮席卷了整个猎场。下次请在倒计时结束前撤离。');if(state!=='playing')return;
  if(hitstop>0){hitstop-=dt;simDt*=.045;}
  updatePlayer(simDt);updateStrikes(simDt);
  if(state==='playing'){if(rogueMode)stepEncounter(simDt);else updateEnemies(simDt);}
  if(state==='playing')updateProjectiles(simDt);
  updateEffects(simDt);
  if(rogueMode){if(typeof updateAmbientMotes==='function')updateAmbientMotes(dt);if(typeof updateMagnetOrbs==='function')updateMagnetOrbs(dt);if(typeof updateThreatIndicators==='function')updateThreatIndicators();}
  shake=Math.max(0,shake-dt*2);damageFlash=Math.max(0,damageFlash-dt*2);$('damage-flash').style.opacity=damageFlash;toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('show');hitMarker-=dt;if(hitMarker<=0)$('crosshair').querySelector('b').style.opacity=0;if(now>=nextHUD){updateHUD();nextHUD=now+80;}
 }else if(state==='menu'){
  time+=dt;
  if(rogueMode&&typeof updateSanctuaryHub==='function')updateSanctuaryHub(dt);
  else{animateMutant(player,dt,false);poseWeapon(player,null,true);}
  if(rogueMode&&typeof updateAmbientMotes==='function')updateAmbientMotes(dt);
 }
 if(state!=='paused'){for(const l of loots){if(l.collected)continue;l.body.rotation.y+=dt;l.body.position.y=.65+Math.sin(now*.002+l.phase)*.12;}environment.ash.rotation.y+=dt*.001;environment.beam.material.opacity=.065+Math.sin(now*.002)*.015;updateCamera(dt);}if(environment)environment.ash.position.copy(player.group.position);updatePresentation(dt);const sx=Math.round(player.group.position.x/4)*4,sz=Math.round(player.group.position.z/4)*4;sun.position.set(sx-42,38,sz+33);sun.target.position.set(sx,0,sz);renderer.render(scene,camera);}
