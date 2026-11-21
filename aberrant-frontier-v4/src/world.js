function enrichWorld(){
 const darkConcrete=mats.concrete,tealSteel=mats.metal,orangeSteel=mats.rust;
 function wall(x,y,z,w,h,d,m=darkConcrete){const b=box(x,y,z,w,h,d,m);cameraMeshes.push(b);solid(x,z,w,d,y+h/2);return b;}
 wall(-23,2.15,12,.5,4.3,14);wall(-11,2.15,12,.5,4.3,14);wall(-17,2.15,5,12,4.3,.5);wall(-21,2.15,19,4,4.3,.5);wall(-13,2.15,19,4,4.3,.5);
 for(const x of [-21,-13])for(const z of [7,17])wall(x,2.2,z,.35,4.4,.35,mats.rust);
 const roof=box(-17,4.55,12,12,.25,14,mats.dark);cameraMeshes.push(roof);surfaces.push({x:-17,z:12,w:6,d:7,h:4.7});wall(-19,.65,11,2.5,1.3,1.2,tealSteel);wall(-14,.55,15,2,1.1,1.4,mats.rust);
 const ramp=box(-9,2.35,15,4,.22,Math.hypot(14,4.7),mats.metal);ramp.rotation.x=Math.atan2(4.7,14);cameraMeshes.push(ramp);surfaces.push({x:-9,z:15,w:2,d:7,h:4.7,ramp:true});
 const bridge=box(-3.5,4.55,9,15,.25,3.2,mats.metal);cameraMeshes.push(bridge);surfaces.push({x:-3.5,z:9,w:7.5,d:1.6,h:4.7});for(const z of [7.5,10.5]){box(-3.5,5.2,z,15,.12,.1,mats.rust);for(let x=-10;x<4;x+=2)box(x,4.95,z,.07,.8,.07,mats.rust);cylinder(3.5,2.3,z,.12,.12,4.6,mats.rust);}
 for(const[x,z,rotation,color]of [[17,12,0,tealSteel],[25,12,0,orangeSteel],[20,22,Math.PI/2,tealSteel],[32,20,Math.PI/2,orangeSteel]]){const width=rotation?7:2.8,depth=rotation?2.8:7;wall(x,1.4,z,width,2.8,depth,color);for(let i=-3;i<=3;i++){if(rotation)box(x+i,1.4,z+1.42,.035,2.65,.03,mats.dark);else box(x+1.42,1.4,z+i,.03,2.65,.035,mats.dark);}surfaces.push({x,z,w:width/2,d:depth/2,h:2.81});}
 for(const[x,z,w,d]of [[-25,-21,4,.4],[-22,-24,.4,6],[23,-19,4,.4],[23,-15,.4,5],[10,-45,.4,8]])wall(x,1.15,z,w,2.3,d);
 box(-17,3.3,-3,5,.25,3,mats.metal);for(const x of [-19.3,-14.7])box(x,1.6,-3,.12,3.2,.12,mats.rust);wall(-18,.5,-3,1.5,1,1,mats.dark);
 for(const[x,z]of [[-26,22],[14,-11],[28,-5],[-13,-16]]){wall(x,.55,z,1.5,1.1,1.5,mats.rust);cylinder(x+1.5,.55,z,.4,.45,1.1,tealSteel);}
 for(const[x,y,z]of [[-17,4.7,12],[2,4.7,9],[17,2.81,12],[25,2.81,12],[20,2.81,22]]){const m=mesh(new THREE.OctahedronGeometry(.18),mint,x,y+.5,z);anchors.push({x,y,z,m});}
 // The first junction is identifiable from spawn and from the roof route.
 // Keep the deck centre and the ramp landing clear for vaulting and grapples.
 const iron=mat(0x37545b), ochre=mat(0xeab666);
 for(const z of [7.42,10.58]){
  box(-3.5,5.95,z,15.2,.16,.16,iron);
  for(let i=0;i<10;i++){
   const strut=box(-10.25+i*1.5,5.28,z,.13,2.03,.13,iron);
   strut.rotation.z=(i%2?1:-1)*.83;
  }
 }
 for(let i=0;i<15;i++){
  const z=8.45+i*.91,y=4.7*(22-z)/14+.16;
  box(-9,y,z,3.83,.055,.12,i%4===0?ochre:mats.dark).rotation.x=Math.atan2(4.7,14);
 }
 // Louvered service panels and a numbered canopy give the research bay a front.
 for(const x of [-21.25,-12.85]){
  box(x,1.82,19.31,2.25,1.62,.12,iron);
  for(let i=0;i<6;i++)box(x,1.17+i*.245,19.42,2.08,.085,.14,mats.metal).rotation.x=-.24;
 }
 const board=document.createElement('canvas');board.width=768;board.height=112;
 const paint=board.getContext('2d');paint.fillStyle='#173d42';paint.fillRect(0,0,768,112);
 paint.fillStyle='#dca958';paint.fillRect(0,0,115,112);paint.fillStyle='#19383c';
 paint.font='bold 60px sans-serif';paint.fillText('07',20,76);
 paint.fillStyle='#fbedd2';paint.font='bold 39px "Microsoft YaHei",sans-serif';paint.fillText('中央换乘站',141,49);
 paint.font='21px monospace';paint.fillText('CENTRAL TERMINAL    ↑    NORTH LINE',141,85);
 for(const x of [-4.8,1.4])box(x,5.05,10.67,.12,1.8,.12,iron);
 box(-1.7,5.35,10.69,7.6,1.12,.16,iron);
 const wayfinding=new THREE.CanvasTexture(board);wayfinding.colorSpace=THREE.SRGBColorSpace;
 mesh(new THREE.PlaneGeometry(7.44,1.075),new THREE.MeshBasicMaterial({map:wayfinding}),-1.7,5.35,10.79).castShadow=false;
 const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#377e7c';ctx.fillRect(0,0,512,128);ctx.fillStyle='#fff0d9';ctx.font='bold 40px sans-serif';ctx.fillText('GENETIC RESEARCH',25,60);ctx.fillStyle='#ffd4b5';ctx.font='22px sans-serif';ctx.fillText('SECTOR 07 / KEEP OUT',25,105);mesh(new THREE.PlaneGeometry(5,1.25),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)}),-17,3,19.3);
}
function floorAt(x,z,y=0){let floor=0;for(const s of surfaces){if(Math.abs(x-s.x)>s.w||Math.abs(z-s.z)>s.d)continue;const h=s.ramp?(.5+(s.slopeX?(x-s.x)*s.slopeX/s.w:(z-s.z)*(s.slopeZ||-1)/s.d)*.5)*s.h:s.h;if(h<=y+.65||s.ramp&&h<y+1)floor=Math.max(floor,h);}return floor;}
function startGame(){clearTransient();releasePlayer(player);player=createMutant(chosenClass,true);contactShadow(player);activeWeapon=0;equipWeapon(player,loadout[activeWeapon]);player.group.position.set(0,0,44);player.group.rotation.y=Math.PI;hp=maxHp=heroNow().hp;stamina=100;time=0;gameTime=RAID_SECONDS;kills=biomass=totalCollected=evolution=0;yaw=0;pitch=.24;velocityY=0;grounded=true;meleeCd=spikeCd=burstCd=dodgeCd=dodgeTime=invulnerable=extracting=hitstop=shake=0;combo=comboWindow=chargeTime=parryTime=parryCd=skillCd=ultimateCd=buffTime=shieldTime=empowered=grappleCd=comboHits=comboTimer=0;grappleTarget=null;input={};mouseDown=mouseRight=false;state='paused';cancelMouseLock();if(rogueMode)startExpedition();else populateRaid();$('menu').classList.add('hidden');$('pause').classList.add('hidden');$('result').classList.add('hidden');$('hud').classList.remove('hidden');$('player-name').textContent=heroNow().name;$('skill-hero').querySelector('span').textContent=heroNow().skill;$('skill-burst').querySelector('span').textContent=heroNow().ultimate;$('extract-progress').classList.add('hidden');if(!rogueMode)camera.position.copy(player.group.position).add(new THREE.Vector3(0,4.5,8));lastPlayerPos.copy(player.group.position);toast(rogueMode?'清除守卫 · T 转向目标 · 绿色门标指引出口':'深入城区搜刮 · 按 M 查看路线与撤离条件');if(rogueMode)cue('deploy');else audioTone(160,.4,'sine',.035,2);lockMouse();updateHUD();}
function returnMenu(){state='menu';cancelMouseLock();clearTransient();document.exitPointerLock?.();$('result').classList.add('hidden');$('pause').classList.add('hidden');$('hud').classList.add('hidden');$('menu').classList.remove('hidden');if(rogueMode&&typeof showSanctuaryMode==='function'){showSanctuaryMode(true);sanctuaryView='hero';player.group.position.set(.4,0,22.5);player.group.rotation.y=Math.PI+.28;}else{player.group.position.set(3,0,24);player.group.rotation.y=-.4;}refreshLoadout();}
function switchWeapon(slot){if(rogueMode||slot===activeWeapon||state!=='playing')return;cancelStrike();activeWeapon=slot;equipWeapon(player,loadout[activeWeapon]);meleeCd=.2;chargeTime=0;mouseRight=false;combo=0;comboWindow=0;toast('切换武器 · '+weaponNow().name);audioTone(180,.13,'triangle',.035,1.8);}
function grapple(){if(grappleCd>0||state!=='playing')return;const forward=new THREE.Vector3(Math.sin(yaw),0,-Math.cos(yaw));let best=null,score=-2;for(const a of anchors){const target=new THREE.Vector3(a.x,a.y+.2,a.z),delta=target.clone().sub(player.group.position),d=delta.length();if(d<4||d>28)continue;const aim=delta.normalize().dot(forward);if(aim>.25&&aim>score){score=aim;best=target;}}if(!best){toast('朝向高台上的绿色锚点再按 G');return;}grappleCd=5;grappleTarget=best;grappleProgress=0;grounded=false;invulnerable=.5;drawTrail(player.group.position.clone().add(new THREE.Vector3(0,1.6,0)),best.clone().add(new THREE.Vector3(0,.5,0)),0xc0e6c2,.5);audioTone(340,.25,'sawtooth',.025,.25);}
