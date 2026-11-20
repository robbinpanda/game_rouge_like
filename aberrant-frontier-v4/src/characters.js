function expeditionRegalia(avatar){
 const {type,rig,arms,legs}=avatar;
 const materials={
  ember:[0x301f32,0xb64847,0xf0b66d,0xff784c],
  frost:[0x192b49,0x3689ae,0xe0e9ea,0x6fdded],
  shade:[0x1f1936,0x5f4694,0xd6c3f4,0xc394ff],
  reaper:[0x203a38,0x477e68,0xe0c8a9,0xb2ed9d],
  bastion:[0x273342,0x616e7e,0xd8ad72,0xffd597]
 };
 if(!materials[type])return avatar;
 const [dark,armor,trim]=materials[type].map(color=>mat(color));
 const crystal=mat(materials[type][3],{roughness:.24,metalness:.27,emissive:materials[type][3],emissiveIntensity:.24});
 const owned=avatar.regaliaResources=[dark,armor,trim,crystal];
 function facet(parent,x,y,z,w,h,d,material,tilt=0){
  const piece=mesh(icoGeo,material,x,y,z,parent);
  piece.scale.set(w,h,d);piece.rotation.z=tilt;return piece;
 }
 function panel(parent,points,position,material,thickness=.038){
  const shape=new THREE.Shape();
  points.forEach(([x,y],i)=>i===0?shape.moveTo(x,y):shape.lineTo(x,y));
  shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:true,bevelSize:.016,bevelThickness:.013,bevelSegments:1});
  owned.push(g);
  const m=mesh(g,material,...position,parent);return m;
 }
 const coat=new THREE.Group();coat.position.set(0,1.84,-.28);rig.add(coat);avatar.regalia=coat;
 const width=type==='bastion'?.35:type==='reaper'?.20:.28;
 for(const side of [-1,1]){
  const x=side*(width*.75+.08),size=type==='bastion'?.97:type==='reaper'?.83:1.37;
  panel(coat,[[-width,0],[width,-.03],[width*.79,-size*.58],[side*width*.57,-size],[-width*.8,-size*.74]],[x,0,-.02],dark).rotation.z=side*.11;
  panel(coat,[[-width*.78,-.12],[width*.80,-.1],[width*.54,-size*.57],[side*width*.42,-size*.86],[-width*.48,-size*.60]],[x,0,-.077],armor,.02).rotation.z=side*.11;
  facet(rig,side*.24,1.88,-.34,.18,.16,.11,trim,side*.34);
  if(type!=='ember'){
   const arm=arms[side===1?1:0],leg=legs[side===1?1:0];
   facet(leg,0,-.45,.11,.135,.15,.12,trim);
   facet(leg,0,-.71,.10,.14,.22,.145,dark);
   facet(arm,side*.07,-.08,-.09,.33,.21,.31,armor,side*.25);
   facet(arm,side*.12,-.015,-.14,.29,.095,.30,trim,side*.25);
   facet(arm,side*.18,-.58,-.09,.125,.24,.15,dark);
  }
 }
 if(type==='ember'){
  facet(rig,-.29,2.03,-.19,.20,.18,.22,armor,.24);
  panel(coat,[[0,-.09],[.065,-.21],[0,-.39],[-.065,-.21]],[0,0,-.115],crystal);
 }else if(type==='frost'){
  const pair=[[-.13,2.27,-.18,.24,.37,.22],[.14,2.37,-.12,.19,.28,.22]];
  for(const [x,y,z,w,h,d] of pair)facet(rig,x,y,z,w,h,d,trim,x*2);
  panel(rig,[[-.33,.16],[.19,.13],[.32,-.04],[-.09,-.14],[-.28,-.07]],[0,2.04,.21],armor);
  for(let i=0;i<5;i++){
   const shard=facet(arms[0],-.14-i%2*.09,-.24-i*.115,-.07,.105,.26,.13,crystal,-.38);
   shard.rotation.x=.2+i*.14;
  }
  facet(coat,0,-.24,-.14,.14,.31,.115,crystal);
 }else if(type==='bastion'){
  for(const side of [-1,1]){
   panel(coat,[[-.16,.10],[.16,.06],[.14,-.56],[0,-.72],[-.16,-.47]],[side*.33,.17,-.26],trim).rotation.z=side*.22;
   const arm=arms[side===1?1:0];
   facet(arm,side*.23,.115,-.09,.24,.23,.24,trim,side*.43);
  }
  facet(coat,0,-.27,-.30,.23,.34,.22,dark);facet(coat,0,-.24,-.49,.084,.17,.057,crystal);
 }else{
  for(const side of [-1,1]){
   facet(rig,side*.36,1.64,-.22,.25,.30,.19,armor,-side*.40);
   panel(coat,[[0,.1],[.18,-.20],[.06,-.49],[-.13,-.44]],[side*.24,-.04,-.20],trim).rotation.z=-side*.67;
   facet(arms[side===1?1:0],side*.19,-.55,-.13,.14,.28,.15,crystal,side*.21);
  }
 }
 return avatar;
}
function releasePlayer(avatar){
 avatar.skeleton?.dispose();
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
