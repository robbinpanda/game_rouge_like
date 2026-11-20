function expeditionRegalia(avatar){
 const {type,rig,arms}=avatar;
 const materials={
  ember:[0x2e1e2b,0xc94f3d,0xf2c272,0xff7f4d],
  frost:[0x182b47,0x3c91b8,0xeaf6fa,0x7ceeff],
  shade:[0x1c1633,0x674ba3,0xdfd0fa,0xc996ff],
  reaper:[0x1e3836,0x438067,0xe3cca8,0xa6f092],
  bastion:[0x253242,0x5a6b7d,0xe2b76d,0xffd685]
 };
 if(!materials[type])return avatar;
 const [dark,armor,trim]=materials[type].map(color=>mat(color));
 const crystal=mat(materials[type][3],{roughness:.22,metalness:.28,emissive:materials[type][3],emissiveIntensity:.75});
 const owned=avatar.regaliaResources=[dark,armor,trim,crystal];
 function facet(parent,x,y,z,w,h,d,material,tilt=0){
  const piece=mesh(icoGeo,material,x,y,z,parent);
  piece.scale.set(w,h,d);piece.rotation.z=tilt;return piece;
 }
 function panel(parent,points,position,material,thickness=.022){
  const shape=new THREE.Shape();
  points.forEach(([x,y],i)=>i===0?shape.moveTo(x,y):shape.lineTo(x,y));
  shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:true,bevelSize:.009,bevelThickness:.008,bevelSegments:1});
  owned.push(g);
  return mesh(g,material,...position,parent);
 }
 // Clean anime upper-collar anchor (NO split twin butt-lobes!)
 const scarf=new THREE.Group();scarf.position.set(0,1.98,-.17);rig.add(scarf);avatar.regalia=scarf;

 if(type==='ember'){
  // Sleek single asymmetric crimson-gold scarf tail flowing from collar — jacket back stays crisp & unobstructed!
  const tail=panel(scarf,[[-.07,0],[.11,0],[.18,-.46],[.07,-.86],[-.01,-.74],[-.04,-.36]],[.09,.02,-.02],armor,.018);
  tail.rotation.y=-.16;tail.rotation.z=.09;
  const stripe=panel(scarf,[[.01,-.08],[.08,-.08],[.12,-.48],[.05,-.72]],[.09,.02,-.042],trim,.012);
  stripe.rotation.y=-.16;stripe.rotation.z=.09;
  // Subtle glowing collar pin + sleek shoulder edge
  facet(scarf,.09,.02,-.05,.048,.078,.032,crystal,0);
 }else if(type==='frost'){
  // Ethereal floating crystalline prism halo behind upper shoulders + frost crystal bracer
  for(const [x,y,z,s,tilt] of [[-.26,.18,-.10,.095,.36],[0,.29,-.14,.115,0],[.26,.18,-.10,.095,-.36]]){
   const shard=facet(scarf,x,y,z,s*.68,s*1.65,s*.55,crystal,tilt);
   shard.rotation.x=-.12;
  }
  // Delicate short translucent-feeling silver-ice shoulder mantle (stops above mid-back!)
  const mantle=panel(scarf,[[-.22,.02],[.22,.02],[.14,-.34],[0,-.44],[-.14,-.34]],[0,.01,-.02],trim,.016);
  mantle.rotation.x=-.08;
  for(let i=0;i<3;i++){
   const c=facet(arms[0],-.06,-.18-i*.085,-.04,.045,.11,.05,crystal,-.32);
   c.rotation.x=.22;
  }
 }else if(type==='shade'){
  // Sleek single midnight-violet ninja scarf streamer + glowing amethyst nape diamond
  const ribbon=panel(scarf,[[-.05,0],[.09,0],[.15,-.52],[.03,-.96],[-.06,-.76],[-.02,-.38]],[-.06,.02,-.02],armor,.015);
  ribbon.rotation.y=.18;ribbon.rotation.z=-.12;
  const edge=panel(scarf,[[-.01,-.08],[.05,-.08],[.09,-.54],[.02,-.84]],[-.06,.02,-.038],crystal,.01);
  edge.rotation.y=.18;edge.rotation.z=-.12;
  for(const side of [-1,1]){
   const fin=facet(rig,side*.24,2.04,-.06,.11,.045,.15,dark,side*.32);
   fin.rotation.y=-side*.22;
  }
  facet(scarf,0,.04,-.05,.05,.09,.035,crystal,0);
 }else if(type==='bastion'){
  // Clean armored hexagonal pauldrons + compact upper-back amber reactor core (strictly above waist!)
  for(const side of [-1,1]){
   const arm=arms[side===1?1:0];
   facet(arm,side*.08,.04,0,.16,.13,.17,armor,side*.28);
   facet(arm,side*.11,.08,0,.13,.055,.15,trim,side*.28);
  }
  const pack=box(0,-.18,-.08,.34,.36,.18,dark,scarf);pack.castShadow=true;
  box(0,-.18,-.17,.22,.24,.04,trim,scarf);
  facet(scarf,0,-.18,-.21,.075,.12,.04,crystal,0);
 }else{
  // Reaper: clean glowing dorsal crystal ridge & forearm energy claws (zero hip lobes!)
  for(let i=0;i<3;i++){
   facet(scarf,0,-.06-i*.16,-.14-i*.03,.05,.12,.08,crystal,0);
  }
  for(const side of [-1,1]){
   facet(arms[side===1?1:0],side*.17,-.56,-.08,.11,.24,.12,crystal,side*.2);
  }
 }
 return avatar;
}
function releasePlayer(avatar){
 avatar.skeleton?.dispose();
 if(avatar.body?.material&&typeof emberMaterials!=='undefined'){
  const idx=emberMaterials.indexOf(avatar.body.material);
  if(idx>=0)emberMaterials.splice(idx,1);
  if(avatar.body.material!==emberMaterial)avatar.body.material.dispose();
 }
 for(const resource of avatar.regaliaResources||[])resource.dispose();
 actors.remove(avatar.group);
}
function createHumanoid(type){
 const h=HEROES[type],group=new THREE.Group(),rig=new THREE.Group();group.add(rig);actors.add(group);
 const skin=mat(h.skin),armor=mat(h.armor),dark=mat(0x273535),light=glow(h.color),bodyScale=type==='bastion'?1.2:type==='frost'?.88:1;
 const torso=mesh(new THREE.DodecahedronGeometry(.57,0),armor,0,1.55,0,rig);torso.scale.set(bodyScale,1.05,.56);
 box(0,1.12,0,.48*bodyScale,.25,.36,dark,rig);box(0,1.14,.22,.16,.15,.07,light,rig);
 box(-.32,1.94,.1,.29,.16,.5,mats.lightConcrete,rig);box(.3,1.5,.26,.15,.5,.12,mats.lightConcrete,rig);
 const chest=mesh(icoGeo,light,0,1.65,.33,rig);chest.scale.set(.075,.2,.025);
 const head=mesh(new THREE.DodecahedronGeometry(.28,0),skin,0,2.25,.015,rig);head.scale.set(.85,1.18,.88);
 const hair=mesh(new THREE.DodecahedronGeometry(.285,0),type==='frost'?mats.lightConcrete:dark,0,2.39,-.025,rig);hair.scale.set(.95,.66,1.02);
 box(0,2.12,.235,.18,.035,.035,skin,rig);for(const side of [-1,1])box(side*.1,2.28,.267,.085,.024,.02,light,rig);
 const arms=[],legs=[];
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.49*bodyScale,1.94,0);rig.add(arm);arms.push(arm);const shoulder=mesh(icoGeo,armor,0,-.05,0,arm);shoulder.scale.set(.23*bodyScale,.21,.25);box(0,-.33,0,.17*bodyScale,.43,.19,skin,arm);const fore=mesh(icoGeo,side===-1?light:armor,0,-.68,.025,arm);fore.scale.set(.14*bodyScale,.28,.17);box(0,-.92,.03,.14,.17,.16,skin,arm);
 const leg=new THREE.Group();leg.position.set(side*.23,.99,0);rig.add(leg);legs.push(leg);box(0,-.25,0,.21,.5,.24,dark,leg);box(0,-.65,0,.18,.37,.2,armor,leg);box(0,-.9,.1,.22,.15,.37,dark,leg);
 if(type==='bastion'){rock(side*.55,1.92,-.03,.29,armor,rig);box(side*.36,1.61,.25,.2,.5,.1,armor,rig);}}
 if(type==='shade'||type==='frost'&&!rogueMode){const cape=mesh(new THREE.ConeGeometry(.57,1.25,5,1,true),armor,0,.85,-.16,rig);cape.scale.z=.6;cape.rotation.y=Math.PI/5;}
 if(type==='ember'){box(.23,1.52,.32,.1,.75,.05,light,rig).rotation.z=-.3;box(.12,1.98,-.25,.23,.09,.65,armor,rig).rotation.x=.18;}
 const hpGroup=new THREE.Group(),hpFill=box(0,3.05,0,.96,.045,.01,light,hpGroup);group.add(hpGroup);hpGroup.visible=false;group.rotation.y=Math.PI;
 return augmentHero({group,rig,arms,legs,skin,head,chest,hpGroup,hpFill,type,phase:0,attack:0,hurt:0,human:true,weaponGroup:null,weaponId:null});
}
// Bake each far enemy silhouette once, including its equipped weapon, into one
// indexed mesh in rig space. Nearby enemies retain the articulated model.
const raiderSilhouettes=new Map();
const distantRaiderMaterial=new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.9});
function buildRaiderSilhouette(avatar,weapon){
 const key=avatar.type+'/'+weapon;
 if(!raiderSilhouettes.has(key)){
  const positions=[],colours=[],indices=[];
  avatar.rig.updateWorldMatrix(true,true);
  const inverse=avatar.rig.matrixWorld.clone().invert();
  const point=new THREE.Vector3(), transform=new THREE.Matrix4();
  avatar.rig.traverse(part=>{
   if(!part.isMesh)return;
   transform.multiplyMatrices(inverse,part.matrixWorld);
   const vertices=part.geometry.attributes.position,base=positions.length/3;
   for(let i=0;i<vertices.count;i++){
    point.fromBufferAttribute(vertices,i).applyMatrix4(transform);
    positions.push(point.x,point.y,point.z);
    colours.push(part.material.color.r,part.material.color.g,part.material.color.b);
   }
   const index=part.geometry.index;
   for(let i=0;i<(index?.count??vertices.count);i++)indices.push(base+(index?index.getX(i):i));
  });
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));
  geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingSphere();
  raiderSilhouettes.set(key,geo);
 }
 const proxy=new THREE.Mesh(raiderSilhouettes.get(key),distantRaiderMaterial);
 proxy.castShadow=true;proxy.receiveShadow=true;proxy.visible=false;
 avatar.group.add(proxy);avatar.distant=proxy;
}
function initializeV2(){
 $('loadout-menu').innerHTML='<div class="eyebrow"><span></span> CHAPTER IV / 晴湾远征</div><h1>畸变<span>前线</span><i>搜寻遗物 · 争夺资源 · 活着撤离</i></h1><div class="selection-label">01 / 选择异变者 <small>角色决定异能 · 武器决定攻击</small></div><div id="heroes" class="heroes"></div><div id="hero-detail"></div><div class="selection-label">'+(rogueMode?'选择武器':'02 / 配置武器 <div class="slot-tabs"><button data-slot="0" class="active">主武器 [1]</button><button data-slot="1">副武器 [2]</button></div>')+'</div><div id="weapons" class="weapon-grid"></div><button id="start" class="primary">进入猎场 <span>DEPLOY ↗</span></button><div id="stash-note">巢穴基因储备 <b id="stash">'+stash+'</b><span> · 第四版独立存档</span></div>';
 const roster=rogueMode?Object.keys(expeditionRoles).map(id=>[id,HEROES[id]]):Object.entries(HEROES);
 $('heroes').innerHTML=roster.map(([id,h])=>'<button class="hero-choice '+(id===chosenClass?'selected':'')+'" data-hero="'+id+'"><strong>'+h.symbol+'</strong><b>'+h.name+'</b><small>'+h.tag+'</small></button>').join('');
 document.querySelectorAll('[data-hero]').forEach(el=>el.addEventListener('click',()=>{chosenClass=el.dataset.hero;releasePlayer(player);player=createMutant(chosenClass,true);equipWeapon(player,loadout[activeWeapon]);if(rogueMode){player.group.position.set(.4,0,22.5);player.group.rotation.y=Math.PI+.28;}else{player.group.position.set(3,0,24);player.group.rotation.y=-.25;}refreshLoadout();refreshPortrait();audioTone(220,.1,'sine',.025,1.4);}));
 document.querySelectorAll('[data-slot]').forEach(el=>el.addEventListener('click',()=>{selectedSlot=Number(el.dataset.slot);refreshLoadout();}));
 $('start').addEventListener('click',startGame);equipWeapon(player,loadout[activeWeapon]);if(rogueMode){player.group.position.set(.4,0,22.5);player.group.rotation.y=Math.PI+.28;}else player.group.position.set(3,0,24);refreshLoadout();
}
function expeditionSkillStrip(){
 const role=expeditionRoles[chosenClass];

 return '<div class="rg-skill-strip">'+role.skills.split('　·　').map((entry,i)=>{
  const key=entry[0],label=entry.slice(2).trim();
  return '<div><img src="'+assetURL(skillIcon(chosenClass,key))+'" alt=""><span><kbd>'+key+'</kbd> '+label+'</span></div>';
 }).join('')+'</div>';
}
function refreshLoadout(){const h=heroNow();document.querySelectorAll('[data-hero]').forEach(el=>el.classList.toggle('selected',el.dataset.hero===chosenClass));document.querySelectorAll('[data-slot]').forEach(el=>el.classList.toggle('active',Number(el.dataset.slot)===selectedSlot));$('hero-detail').innerHTML='<div><b>'+h.name+' <small>'+h.en+'</small></b><em>'+h.hp+' HP</em></div><p>'+(rogueMode?expeditionRoles[chosenClass].brief:h.brief)+'</p>'+(rogueMode?expeditionSkillStrip():'<span><kbd>E</kbd> '+h.skill+' <i>·</i> <kbd>Q</kbd> '+h.ultimate+'</span>');$('weapons').innerHTML=Object.entries(weaponSpecs).map(([id,w])=>'<button class="weapon-choice '+(loadout[selectedSlot]===id?'selected':'')+'" data-weapon="'+id+'">'+(rogueMode?'<img class="rg-item-art" src="'+assetURL('echo-item-'+id+'.webp')+'" alt="">':'<strong>'+w.symbol+'</strong>')+'<span><b>'+w.short+'</b><small>'+(rogueMode?'左 '+attackForms[id][0][0]+' · 右 '+attackForms[id][1][0]:w.description)+'</small></span><em>'+(rogueMode?(loadout[0]===id?'✓':''):loadout[0]===id?'1':loadout[1]===id?'2':'')+'</em></button>').join('');document.querySelectorAll('[data-weapon]').forEach(el=>el.addEventListener('click',()=>{const other=selectedSlot===0?1:0;if(loadout[other]===el.dataset.weapon)loadout[other]=loadout[selectedSlot];loadout[selectedSlot]=el.dataset.weapon;activeWeapon=selectedSlot;equipWeapon(player,loadout[activeWeapon]);refreshLoadout();audioTone(160,.1,'triangle',.03,1.8);}));}
