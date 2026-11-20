const acts=[
 {name:'晴湾断轨',zone:'旧城高架',en:'DAYBREAK LINE',sky:0x84d0e6,skyTop:0x2f86bf,skyMid:0x84d0e6,skyBot:0xf4ecd6,fog:0xa6d8e3,phaseSky:[0x143832,0x2f7d6e,0xc9f2b8],floor:0xebe0ce,trim:0x1e544a,accent:0x4ca896,stone:0xe6dac5,dark:0x1a3833,boss:'断轨镇守者',crest:'轨',rooms:['断轨前庭','检票回廊','折返站台','调度中庭'],bossRoom:'终点换乘台',trap:'通电轨道'},
 {name:'鸣潮船坞',zone:'潮汐港池',en:'TIDAL DOCK',sky:0xd98a6c,skyTop:0x3b5f8f,skyMid:0xd98a6c,skyBot:0xffd7ad,fog:0xd99e82,phaseSky:[0x4a1c1a,0xc74b32,0xffb35c],floor:0xd4b6a4,trim:0xc95440,accent:0xf3b93b,stone:0xdba58d,dark:0x243b55,boss:'潮鸣母舰',crest:'潮',rooms:['吊装甲板','浮箱栈桥','潮汐泊位','缆索货场'],bossRoom:'三号干船坞',trap:'泄压喷口'},
 {name:'紫晶温室',zone:'回响穹顶',en:'PRISM GARDEN',sky:0xc2d5f0,skyTop:0x7690c7,skyMid:0xc2d5f0,skyBot:0xf8f5fc,fog:0xd5dff0,phaseSky:[0x2a184f,0x7a48b8,0xf0c2ff],floor:0xeeeaf5,trim:0xa6b8cc,accent:0x9e52f0,stone:0xf3f0f8,dark:0x4b4a66,boss:'镜冠花王',crest:'晶',rooms:['育晶花圃','双翼回廊','折光苗床','繁花中庭'],bossRoom:'镜冠穹庭',trap:'爆裂晶床'}
];
const roomGroup=new THREE.Group(),sanctuaryGroup=new THREE.Group(),chamberMaterials=new Map();
const crystalGeo=new THREE.OctahedronGeometry(1),canopyGeo=new THREE.IcosahedronGeometry(1,1);
let exitGroup,exitBase,exitTop,exitSeal,exitBands,skyDome=null,ambientPoints=null,sanctuaryMotes=null,sanctuaryBeam=null,sanctuaryMirror=null,sanctuaryBuilt=false,branchGates=[];
const exitPoint=new THREE.Vector3(0,0,-12.7);
const roomTraps=[];
let terrainClock=0;
const deckSurfaces=new Map();
function chamberMat(color){
 if(!chamberMaterials.has(color)){
  const ramp=typeof getCreatureToonRamp==='function'?getCreatureToonRamp():null;
  chamberMaterials.set(color,ramp?new THREE.MeshToonMaterial({color,gradientMap:ramp}):mat(color));
 }
 return chamberMaterials.get(color);
}
function setSkyPalette(topHex,midHex,botHex,fogHex){
 if(!skyDome){
  const g=new THREE.SphereGeometry(280,24,16);
  const m=new THREE.ShaderMaterial({
   side:THREE.BackSide,depthWrite:false,fog:false,toneMapped:false,
   uniforms:{top:{value:new THREE.Color(topHex)},mid:{value:new THREE.Color(midHex)},bot:{value:new THREE.Color(botHex)}},
   vertexShader:'varying vec3 vPos;void main(){vPos=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:`uniform vec3 top,mid,bot;varying vec3 vPos;
   void main(){
    float h=vPos.y;
    vec3 col=h>0.?mix(mid,top,smoothstep(0.,.65,h)):mix(mid,bot,smoothstep(0.,-.22,h));
    col=mix(bot,col,smoothstep(-.04,.16,h));
    gl_FragColor=vec4(col,1.);
    #include <colorspace_fragment>
   }`
  });
  skyDome=new THREE.Mesh(g,m);skyDome.renderOrder=-10;scene.add(skyDome);
 }
 skyDome.material.uniforms.top.value.setHex(topHex);
 skyDome.material.uniforms.mid.value.setHex(midHex);
 skyDome.material.uniforms.bot.value.setHex(botHex);
 scene.background=new THREE.Color(midHex);
 scene.fog=new THREE.Fog(fogHex,42,175);
}
function applyBossPhaseAtmosphere(act){
 const a=acts[act];if(!a?.phaseSky)return;
 setSkyPalette(a.phaseSky[0],a.phaseSky[1],a.phaseSky[2],a.phaseSky[1]);
 sun.color.setHex(act===0?0xa8ffcf:act===1?0xff8c52:0xe4a8ff);
 sun.intensity=2.85;
}
function spawnAmbientMotes(act,parent,spread=22,count=130,yMin=.5,yMax=10.5){
 const pos=new Float32Array(count*3),col=new Float32Array(count*3);
 const c1=new THREE.Color(act===0?0x9ee066:act===1?0xff9d47:0xd69eff);
 const c2=new THREE.Color(act===0?0xfff0c2:act===1?0xffe09e:0xffffff);
 for(let i=0;i<count;i++){
  const sx=Math.sin(i*12.9898)*43758.5453,sy=Math.sin(i*78.233)*43758.5453,sz=Math.cos(i*45.164)*43758.5453;
  pos[i*3]=((sx-Math.floor(sx))*2-1)*spread;
  pos[i*3+1]=yMin+(sy-Math.floor(sy))*(yMax-yMin);
  pos[i*3+2]=((sz-Math.floor(sz))*2-1)*spread;
  const c=i%2?c1:c2;col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.BufferAttribute(pos,3));
 g.setAttribute('color',new THREE.BufferAttribute(col,3));
 const pts=new THREE.Points(g,new THREE.PointsMaterial({size:.2,vertexColors:true,transparent:true,opacity:.84,depthWrite:false}));
 pts.userData={act,yMin,yMax};parent.add(pts);return pts;
}
function updateAmbientMotes(dt){
 const pts=sanctuaryGroup.visible?sanctuaryMotes:ambientPoints;
 if(pts){
  const pos=pts.geometry.attributes.position,arr=pos.array,{act,yMin,yMax}=pts.userData;
  for(let i=0;i<arr.length;i+=3){
   arr[i]+=Math.sin(time*.8+i)*.35*dt;
   arr[i+1]+=(act===0?-.30:.48)*dt;
   if(arr[i+1]<yMin)arr[i+1]=yMax;
   if(arr[i+1]>yMax)arr[i+1]=yMin;
  }
  pos.needsUpdate=true;
 }
 if(sanctuaryGroup.visible){
  if(sanctuaryBeam)sanctuaryBeam.material.opacity=.15+.05*Math.sin(time*1.6);
  if(sanctuaryMirror)sanctuaryMirror.rotation.y+=dt*1.1;
 }
 for(const g of branchGates){
  if(g.emblem){g.emblem.rotation.y+=dt*2.1;g.emblem.position.y=5.45+Math.sin(time*2.8+g.x)*.22;}
  if(g.beam)g.beam.material.opacity=.11+.05*Math.sin(time*3.2+g.x);
 }
}
function roomBox(x,y,z,w,h,d,color){return box(x,y,z,w,h,d,chamberMat(color),roomGroup);}
function cover(x,z,w,h,d,color){
 const m=roomBox(x,h/2,z,w,h,d,color);solid(x,z,w,d,h);cameraMeshes.push(m);surfaces.push({x,z,w:w*.5,d:d*.5,h});
}
function raisedPassage(x,z,width,a){
 const height=.60,length=3;
 const ramp=roomBox(x,height*.5-.05,z,width,.12,Math.hypot(length,height),a.trim);
 ramp.rotation.x=Math.atan2(height,length);
 surfaces.push({x,z,w:width*.5,d:length*.5,h:height,ramp:true});
 roomBox(x,height*.5-.05,z-2.8,width,height,2.6,a.dark);
 surfaces.push({x,z:z-2.8,w:width*.5,d:1.3,h:height});
 for(const side of [-1,1]){
  const stripe=roomBox(x+side*(width*.5-.12),height*.5+.025,z,.11,.025,length,a.accent);
  stripe.rotation.x=ramp.rotation.x;
 }
}
function deckSurface(act){
 if(deckSurfaces.has(act))return deckSurfaces.get(act);
 const art=document.createElement('canvas'),size=1024;
 art.width=art.height=size;const ctx=art.getContext('2d'),random=seededRoll('deck-'+act);
 const colors=[['#cfc1aa','#e5dac6','#8d8272'],['#967367','#b58d7c','#6e4e47'],['#dbd9e6','#f2eff9','#b2b6c9']][act];
 const count=act===1?8:12,tile=size/count;
 ctx.fillStyle=colors[2];ctx.fillRect(0,0,size,size);
 for(let row=0;row<count;row++)for(let col=-1;col<=count;col++){
  const x=(col+(act===0&&row%2?.5:0))*tile,y=row*tile;
  ctx.fillStyle=colors[0];ctx.fillRect(x+1,y+1,tile-2,tile-2);
  ctx.globalAlpha=.12+random()*.4;ctx.fillStyle=colors[1];ctx.fillRect(x+2,y+2,tile-4,tile-4);ctx.globalAlpha=1;
  ctx.fillStyle='#ffffff13';ctx.fillRect(x+2,y+2,tile-4,1.5);ctx.fillRect(x+2,y+3,1.5,tile-5);
  ctx.fillStyle='#1c223d2c';ctx.fillRect(x+tile-3,y+4,1.5,tile-6);ctx.fillRect(x+4,y+tile-3,tile-6,1.5);
  if(act===1){
   for(const u of [6,tile-6])for(const v of [6,tile-6]){
    ctx.fillStyle='#1a303ab0';ctx.fillRect(x+u-1,y+v-1,3,3);ctx.fillStyle='#b7c5bc88';ctx.fillRect(x+u,y+v,2,1);
   }
  }else if(random()>.55){
   ctx.beginPath();ctx.moveTo(x+2,y+tile*.22);ctx.lineTo(x+tile*.31,y+tile*.39);
   ctx.lineTo(x+tile*.70,y+tile*.31);ctx.lineTo(x+tile*.99,y+tile*.62);
   ctx.strokeStyle=act===2?'#d4b8d448':'#59433935';ctx.lineWidth=1.5;ctx.stroke();
  }
 }
 for(let i=0;i<9500;i++){
  ctx.fillStyle=random()>.47?'#fff4d51a':'#2923341c';
  ctx.fillRect(random()*size,random()*size,random()*2.7+1,random()*1.8+.5);
 }
 const texture=new THREE.CanvasTexture(art);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 const material=new THREE.MeshStandardMaterial({map:texture,roughness:.93});
 deckSurfaces.set(act,material);return material;
}
function addTrap(kind,x,z,width,length,phase=0,act=0){
 const from=new THREE.Vector3(x,.068,z-length/2),to=new THREE.Vector3(x,.068,z+length/2);
 const trap={kind,from,to,width,phase,cycle:-1,mark:null,continuousFloor:true};
 roomTraps.push(trap);
 if(kind==='line'){
  roomBox(x,.012,z,width*2,.025,length,0x313944);
  for(const side of [-1,1])roomBox(x+side*(width-.09),.030,z,.11,.029,length,0xb68155);
  for(let t=-length/2+.4;t<length/2;t+=.9)roomBox(x,.031,z+t,width*2-.2,.028,.18,0x80756c);
 }else{
  const base=cylinder(x,.005,z,width*.78,width*.78,.06,chamberMat(act===2?0x4d385c:0x38374a),roomGroup,12);
  base.castShadow=false;roundel(x,z,width*.78,0xc5a47b);
  if(act===1){
   for(let i=-2;i<=2;i++)roomBox(x+i*.39,.047,z,.14,.05,width,0x72818d);
  }else for(let i=0;i<7;i++){
   const angle=i*Math.PI*2/7,r=width*.56;
   const bud=mesh(crystalGeo,chamberMat(i%2?0x9475b9:0x715a9a),x+Math.sin(angle)*r,.18,z+Math.cos(angle)*r,roomGroup);
   bud.scale.set(.21,.29+i%3*.09,.21);bud.rotation.z=Math.cos(angle)*.3;
  }
 }
}
function clearRoomTraps(){
 for(const trap of roomTraps)if(trap.mark)releaseFootprint(trap.mark);
 roomTraps.length=0;terrainClock=0;
}
function stepTerrain(dt){
 terrainClock+=dt;
 for(const trap of roomTraps){
  const total=terrainClock+trap.phase,cycle=Math.floor(total/6.4),phase=total%6.4;
  if(phase>=4.18&&phase<5.30){
   if(!trap.mark){
    trap.mark=floorFootprint(trap.kind,trap.from,trap.to,trap.width,0xffa239);
    cue('warning',trap.from);
   }
   trap.mark.material.uniforms.amount.value=(phase-4.18)/1.12;continue;
  }
  if(trap.mark){releaseFootprint(trap.mark);trap.mark=null;}
  if(phase<5.30||trap.cycle===cycle)continue;
  trap.cycle=cycle;floorImpact(trap);
  const tint=[0xffc36b,0xa0eaff,0xeabfff][run.act],mid=trap.from.clone().lerp(trap.to,.5);
  if(trap.kind==='line')drawTrail(trap.from.clone().setY(.18),trap.to.clone().setY(.18),tint,.34,.16);
  else pulseAt(mid,trap.width,tint);
  impactSpray(mid.setY(.5),tint,true);cue(run.act===2?'crystal':run.act===1?'laser':'rail',mid);
  const p=player.group.position;
  if(p.y<.65&&hitFootprint(trap,p)){
   const before=hp;damagePlayer(12+run.act*2);
   if(before>hp&&run.act===1)move(player.group,1.65*Math.sign(p.x-mid.x||1),.62*Math.sign(p.z-mid.z||1));
  }
  for(const e of enemies)if(!e.dead&&!e.boss&&e.avatar.group.position.y<.65&&hitFootprint(trap,e.avatar.group.position)){
   damageEnemy(e,22+run.act*4,'terrain',null,{heavy:true,stagger:.48});
  }
 }
}
function beamBetween(x,y,z,u,v,w,size,color){
 const delta=new THREE.Vector3(u-x,v-y,w-z);const bar=roomBox((x+u)/2,(y+v)/2,(z+w)/2,size,delta.length(),size,color);
 bar.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
}
const yardRing=new THREE.RingGeometry(.93,1,48),archRing=new THREE.RingGeometry(.84,1,32,1,0,Math.PI);
const yardSignMaterials=new Map();
function yardSign(label,x,y,z,w,h,ink,paper){
 const key=label+ink+paper;
 if(!yardSignMaterials.has(key)){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d');
  ctx.fillStyle=paper;ctx.fillRect(0,0,512,96);ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='bold 45px "Microsoft YaHei",sans-serif';ctx.fillText(label,256,49,476);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  yardSignMaterials.set(key,new THREE.MeshBasicMaterial({map}));
 }
 const m=mesh(yardSignPlane,yardSignMaterials.get(key),x,y,z,roomGroup);m.scale.set(w,h,1);m.castShadow=false;
}
const yardSignPlane=new THREE.PlaneGeometry(1,1);
function roundel(x,z,r,color){
 const m=mesh(yardRing,chamberMat(color),x,.015,z,roomGroup);m.scale.set(r,r,1);m.rotation.x=-Math.PI/2;m.castShadow=false;
}
function treeAt(x,z,size,leaves){
 const dark=0x755d64;
 cylinder(x,size*1.05,z,size*.15,size*.23,size*2.1,chamberMat(dark),roomGroup);
 for(const side of [-1,1]){
  beamBetween(x,size*1.1,z,x+side*size*.8,size*2.2,z+.13,size*.22,dark);
  const crown=mesh(canopyGeo,chamberMat(leaves[side>0?1:0]),x+side*size*.73,size*(side>0?2.52:2.35),z,roomGroup);
  crown.scale.set(size*1.16,size*.76,size);
 }
 const crown=mesh(canopyGeo,chamberMat(leaves[0]),x,size*2.97,z-.24,roomGroup);crown.scale.set(size*1.28,size*.81,size*1.13);
}
function cargoAt(x,z,color){
 roomBox(x,1.1,z,3.9,2.2,2.3,color);
 for(const d of [-1.84,-1.21,-.6,0,.6,1.21,1.84])roomBox(x+d,1.1,z+1.17,.085,2.04,.07,0xdae1ce);
 for(const y of [.12,2.15])roomBox(x,y,z+1.2,4,.12,.1,0x647e83);
}
function dressYard(act,layout,safe,boss){
 const a=acts[act],pavement=[0x2e6e62,0xbc5a46,0x99b3cc][act];
 for(const x of [-12,-6,0,6,12])roomBox(x,-.009,0,.045,.018,30,pavement);
 for(const z of [-10,-5,0,5,10])roomBox(0,-.008,z,32,.018,.045,pavement);
 roundel(0,1,boss?6.7:4.2,act===2?0x9e52f0:a.trim);
 for(const x of [-14,14])for(let z=-12;z<13;z+=3){roomBox(x,.013,z,.22,.035,1.6,a.trim);}
 const sign=safe?'服务站':boss?'首领区':a.zone;
 const signStyle=[['#f4ecd6','#1e544a'],['#fff2da','#9c3a2c'],['#3e3659','#f2eff9']][act];
 yardSign(sign+'　/　'+String(layout+1).padStart(2,'0'),0,4.71,-12.13,4.9,.53,signStyle[0],signStyle[1]);
 for(const side of [-1,1]){
  const x=side*14.2;
  for(const z of [-10,5]){
   roomBox(x,1.95,z,.16,3.9,.18,a.dark);roomBox(x+side*.35,3.9,z,.85,.17,.22,a.dark);
   roomBox(x+side*.57,3.78,z,.64,.12,.36,act===0?0xcffae4:act===1?0xffc966:0xe3b8ff);
  }
 }
 if(act===0){
  // Act 1: Daybreak Line — Cream Travertine + Deep Pine-Mint Viaduct & Emerald Ginkgo Foliage!
  roomBox(0,2.5,-20.6,13,5,2.8,0x49a69d);
  for(let x=-6;x<=6;x+=2){roomBox(x,2.5,-19.14,.15,5,.16,a.dark);}
  roomBox(0,3.0,-19.08,13,.13,.15,a.dark);
  const arch=mesh(archRing,chamberMat(0x286b5e),0,3.0,-18.5,roomGroup);arch.scale.set(8.3,4,1);
  for(const side of [-1,1]){roomBox(side*7.65,1.5,-18.5,1.25,3,1,0xebe0ce);
   for(let i=0;i<6;i++)roomBox(side*(14+i*1.55),11.1,-17.62,.18,.75,.17,0x286b5e);
   for(const z of [-15,-3,10])treeAt(side*(17.4+Math.abs(z)%3),z,1.5+(z===-15?.55:0),[0x4f9946,0x99d152]);
   for(let i=0;i<6;i++){const x=side*(7+i*4.4),height=6+(i*7%12);
    roomBox(x,height/2+3,-39-i%3*3,3.3,height,4,0xe0d4c0);roomBox(x,height+3,-39-i%3*3,3.6,.45,4.4,0x2f7769);}
  }
  yardSign('晴 湾　/　DAYBREAK',0,4.15,-18.96,5.2,.84,'#f7f1de','#1e544a');
  for(let i=-2;i<=2;i++)roomBox(i*.95,.021,8.0,.54,.02,2.3,0xf7f0df);
 }else if(act===1){
  // Act 2: Tidal Dock — Coral-Brick Shipyard, Molten-Gold Gantry Cranes & Deep Cobalt Cargo Hulls!
  for(const s of [-1,1]){cargoAt(s*14,-15.8,s>0?0xcc5e4a:0x285c99);cargoAt(s*18.7,-9.6,s>0?0x285c99:0xe07c60);
   for(const z of [-16,-7,1,9]){roomBox(s*16.8,1.73,z,.15,1.4,.15,a.dark);roomBox(s*16.8,2.23,z+3.9,.12,.1,7.9,0xf3b93b);}
   for(let j=0;j<5;j++){const m=roomBox(s*(6+j*1.1),.024,-9,.52,.02,1.52,0xf3b93b);m.rotation.y=.52;}
  }
  // Moored Cobalt & Brick Freighter prow framing the rear harbor!
  roomBox(15,1.2,-33,18,5.5,7.2,0x285c99);roomBox(15,-1.2,-33,17.2,1.6,7.0,0xcc5e4a);
  roomBox(19,5.4,-33,6.2,3.4,5.6,0xebe0ce);roomBox(20,7.8,-33,1.6,2.2,1.6,0xcc5e4a);
  yardSign('03　/　TIDAL DOCK',-11,3,-18,6.4,1.1,'#243b55','#f3b93b');
  for(let i=0;i<9;i++)roomBox(-34+i*7,-1.55,-33-i%3*3,3,.08,.15,0xffdfad);
 }else{
  // Act 3: Prism Glasshouse — Pearl-White Marble Cathedral, Ice-Blue Glass & Radiant Amethyst Spires!
  for(const side of [-1,1]){for(const z of [-11,0,10]){
   treeAt(side*18.7,z,1.6,[0xdce8f5,0xf7f5fc]);
   const panel=mesh(yardSignPlane,chamberMat(0x9ad8f0),side*17.75,2.3,z,roomGroup);panel.scale.set(6.5,4.6,1);panel.rotation.y=-side*Math.PI/2;
  }for(let j=0;j<6;j++){const m=roomBox(side*(4+j*.95),.023,8.8-j*.67,.32,.024,.96,0x9e52f0);m.rotation.y=side*.65;}}
  const arch=mesh(archRing,chamberMat(0xf2eff7),0,1,-17.3,roomGroup);arch.scale.set(9.5,8,1);
  const innerArch=mesh(archRing,chamberMat(0x9ad8f0),0,1,-17.0,roomGroup);innerArch.scale.set(8.2,6.9,1);
  yardSign('镜 冠　/　GLASSHOUSE',0,6.4,-17,6.4,1,'#423561','#f5f2fa');
 }
}
function instanceYard(){
 const batches=new Map(),fixed=new Set(cameraMeshes);
 for(const m of [...roomGroup.children]){
  if(!m.isMesh||fixed.has(m))continue;
  const key=m.geometry.uuid+m.material.uuid;
  if(!batches.has(key))batches.set(key,[]);batches.get(key).push(m);
 }
 for(const list of batches.values()){
  if(list.length<3)continue;const first=list[0],batch=new THREE.InstancedMesh(first.geometry,first.material,list.length);
  list.forEach((m,i)=>{m.updateMatrix();batch.setMatrixAt(i,m.matrix);roomGroup.remove(m);});
  batch.castShadow=first.castShadow;batch.receiveShadow=true;roomGroup.add(batch);
 }
}
function clearBranchGates(){
 for(const g of branchGates)g.group.removeFromParent();
 branchGates.length=0;
}
function buildBranchGates(choices){
 clearBranchGates();
 if(!choices||!choices.length)return;
 const xs=choices.length===1?[0]:choices.length===2?[-6.2,6.2]:[-7.6,0,7.6];
 if(exitGroup)exitGroup.visible=choices.length===1;
 const a=acts[run.act];
 choices.forEach((choice,i)=>{
  const x=xs[i],z=-12.7,group=new THREE.Group();
  group.position.set(x,0,z);roomGroup.add(group);
  const tint=choice.hex||0x8cecac,glowMat=glow(tint);
  if(choices.length>1){
   for(const px of [-2.05,2.05]){
    box(px,2.2,0,.52,4.4,.75,chamberMat(a.stone),group);
    box(px,3.6,0,.64,.2,.84,glowMat,group);
    box(px,2.2,.4,.18,3.1,.06,glowMat,group);
   }
   box(0,4.55,0,5.0,.46,.9,glowMat,group);
   box(0,.02,1,4.2,.045,2.4,chamberMat(tint),group);
  }
  const emblem=mesh(crystalGeo,glowMat,0,5.45,0,group);
  emblem.scale.set(.42,.68,.42);emblem.castShadow=false;
  const beam=mesh(new THREE.CylinderGeometry(.35,1.8,14,12,1,true),new THREE.MeshBasicMaterial({color:tint,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide}),0,7,0,group);
  beam.castShadow=false;
  // Floating 3D reward sign above each door
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=112;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#163038';ctx.fillRect(0,0,512,112);
  ctx.strokeStyle=choice.color||'#95f0cf';ctx.lineWidth=8;ctx.strokeRect(4,4,504,104);
  ctx.fillStyle='#fff3dc';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='bold 42px "Microsoft YaHei",sans-serif';ctx.fillText(choice.label,256,42,470);
  ctx.fillStyle=choice.color||'#a5ebd2';ctx.font='600 24px "Microsoft YaHei",sans-serif';ctx.fillText(choice.sub||'',256,82,470);
  const signTex=new THREE.CanvasTexture(canvas);signTex.colorSpace=THREE.SRGBColorSpace;
  const signMesh=mesh(yardSignPlane,new THREE.MeshBasicMaterial({map:signTex}),0,6.65,.2,group);
  signMesh.scale.set(4.1,.9,1);signMesh.castShadow=false;
  branchGates.push({x,z,pos:new THREE.Vector3(x,0,z),choice,group,emblem,beam});
 });
}
function buildBlenderStaticModel(asset,targetGroup){
 const {gltf,bin}=asset,buffer=unpackEmber(bin,Uint8Array).buffer;
 const types={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
 const sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
 function attribute(i){
  const a=gltf.accessors[i],v=gltf.bufferViews[a.bufferView],size=sizes[a.type];
  const data=new types[a.componentType](buffer,(v.byteOffset||0)+(a.byteOffset||0),a.count*size);
  return new THREE.BufferAttribute(data,size,!!a.normalized);
 }
 const ramp=typeof getCreatureToonRamp==='function'?getCreatureToonRamp():null;
 for(const meshDef of gltf.meshes){
  const isGlow=/glow/i.test(meshDef.name||'');
  for(const prim of meshDef.primitives){
   const geo=new THREE.BufferGeometry();
   if(prim.attributes.POSITION!==undefined)geo.setAttribute('position',attribute(prim.attributes.POSITION));
   if(prim.attributes.NORMAL!==undefined)geo.setAttribute('normal',attribute(prim.attributes.NORMAL));
   if(prim.attributes.COLOR_0!==undefined)geo.setAttribute('color',attribute(prim.attributes.COLOR_0));
   if(prim.indices!==undefined)geo.setIndex(attribute(prim.indices));
   const material=isGlow
    ?new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide})
    :ramp
     ?new THREE.MeshToonMaterial({vertexColors:true,gradientMap:ramp,side:THREE.DoubleSide})
     :new THREE.MeshStandardMaterial({vertexColors:true,roughness:.76,side:THREE.DoubleSide});
   const m=new THREE.Mesh(geo,material);
   m.castShadow=!isGlow;m.receiveShadow=!isGlow;
   targetGroup.add(m);
  }
 }
}
function buildSanctuaryWorld(){
 if(sanctuaryBuilt)return;
 sanctuaryBuilt=true;
 if(typeof sanctuaryFile!=='undefined'&&sanctuaryFile?.gltf){
  buildBlenderStaticModel(sanctuaryFile,sanctuaryGroup);
 }
 // Animated floating Mirror of Echoes crystal crest (aligns with Blender shrine at -7.4, 22.0)
 sanctuaryMirror=mesh(crystalGeo,glow(0xd49eff),-7.4,5.4,22.0,sanctuaryGroup);
 sanctuaryMirror.scale.set(.38,.66,.38);sanctuaryMirror.castShadow=false;
 // Ethereal Amethyst Sky Beam piercing the heavens from Act III Prism Glasshouse Crown (z = -148)
 sanctuaryBeam=mesh(new THREE.CylinderGeometry(1.1,4.8,145,16,1,true),new THREE.MeshBasicMaterial({color:0xc396ff,transparent:true,opacity:.17,depthWrite:false,side:THREE.DoubleSide}),0,88,-148,sanctuaryGroup);
 sanctuaryBeam.castShadow=false;
 sanctuaryMotes=spawnAmbientMotes(0,sanctuaryGroup,26,120,.5,18);
 sanctuaryMotes.position.set(0,0,22);
 scene.add(sanctuaryGroup);
}
function showSanctuaryMode(on){
 buildSanctuaryWorld();
 sanctuaryGroup.visible=on;
 roomGroup.visible=!on;
 if(on){
  setSkyPalette(0x3082c4,0x85cce8,0xffe8cc,0x9bcce3);
  scene.fog=new THREE.Fog(0x9bcce3,95,295);
  sun.color.setHex(0xffe9cf);sun.intensity=2.65;
 }
}
function setChamber(act,layout,safe=false,boss=false){
 const a=acts[act];clearRoomTraps();clearBranchGates();updateGroundFlashes(Infinity);
 if(sanctuaryGroup)sanctuaryGroup.visible=false;roomGroup.visible=true;
 for(const m of roomGroup.children)if(m.isInstancedMesh)m.dispose();roomGroup.clear();colliders.length=cameraMeshes.length=surfaces.length=anchors.length=0;
 setSkyPalette(a.skyTop,a.skyMid,a.skyBot,a.fog);
 sun.color.setHex(act===0?0xfff1dc:act===1?0xffd9b0:0xf6f0ff);sun.intensity=act===2?2.75:2.58;
 box(0,-.55,0,34,1,31,chamberMat(a.floor),roomGroup);roomBox(0,-1.25,0,34.8,.5,31.7,a.trim);
 const paving=mesh(footprintPlane,deckSurface(act),0,-.018,0,roomGroup);
 paving.rotation.x=-Math.PI/2;paving.scale.set(17,15.5,1);paving.castShadow=false;
 for(const x of [-16.6,16.6]){cover(x,0,.65,1.15,31,a.stone);roomBox(x,1.18,0,.78,.13,31,a.trim);solid(x,0,.65,31,25);}
 for(const z of [-15.2,15.2]){cover(0,z,34,1.15,.65,a.stone);roomBox(0,1.18,z,34,.13,.78,a.trim);solid(0,z,34,.65,25);}
 for(let z=-12;z<=12;z+=4)roomBox(0,-.035,z,32,.018,.026,a.stone);
 for(const x of [-13,13])roomBox(x,-.031,0,.12,.025,28,a.accent);
 if(act===0){
  for(let i=0;i<9;i++){
   const x=i*9-36,h=5+((i*7)%9);roomBox(x,h/2,-28,7,h,6,a.stone);roomBox(x,h,-28,7.5,.32,6.4,a.trim);
   for(let y=2;y<h;y+=2.8)roomBox(x,y,-24.94,5.4,.95,.12,a.dark);
  }
  for(const side of [-1,1]){
   roomBox(side*16,9.6,-19,26,.8,3,a.stone);roomBox(side*16,9.5,-17.46,26,.28,.12,a.trim);
   roomBox(side*18,4.5,-19,1.1,9,1.25,a.stone);
   for(const dx of [-1,1])beamBetween(side*18,7.4,-19,side*18+1.7*dx,9.35,-19,.6,a.trim);
   const x=side*20;roomBox(x,10.9,-19,9,1.75,2.4,0xf5efe2);roomBox(x,11.05,-17.77,8,.65,.08,a.dark);
   roomBox(x,10.35,-17.77,8.9,.23,.09,a.trim);
  }
 }else if(act===1){
  roomBox(0,-1.8,0,160,.4,150,0x2c6f8c);
  for(const x of [-22.5,22.5]){
   for(const z of [-19,4]){roomBox(x,6.5,z,.95,13,.95,0xf3b93b);roomBox(x,12.8,z,11,.78,1.1,0xf3b93b);
    for(const d of [-1,1])beamBetween(x,9.0,z,x+d*4.1,12.5,z,.36,0xc98924);
    roomBox(x-3,9.0,z,.09,6.5,.09,a.dark);roomBox(x-3,5.8,z,3.0,1.4,1.8,0xcc5e4a);}
  }
  for(let i=0;i<7;i++){const x=-24+i*8;roomBox(x,1.4,-24,6.9,2.8,4,i%2?0xcc5e4a:0x285c99);
   for(let j=0;j<6;j++)roomBox(x-2.6+j,1.4,-21.96,.085,2.52,.08,0xf2e4d5);}
 }else{
  for(const x of [-17.5,17.5])for(const z of [-13,-3,8]){roomBox(x,3.2,z,.52,6.4,.52,0xf3f0f8);
   beamBetween(x,6.4,z,x*.48,11,z,.46,0xf3f0f8);beamBetween(x*.48,11,z,0,12,z,.34,0xa6b8cc);}
  for(let i=0;i<24;i++){
   const angle=i*2.4,x=Math.cos(angle)*(21+i%5),z=Math.sin(angle)*(20+i%4);
   const gem=mesh(crystalGeo,i%3?glow(0x9e52f0):glow(0xd89eff),x,2.4+i%3,z,roomGroup);
   gem.scale.set(1.25,3.2+i%4,1.25);gem.rotation.z=Math.sin(i)*.35;
  }
  // Soft luminous Pearl-Lavender Prism Glasshouse God Rays
  const rayMat=new THREE.MeshBasicMaterial({color:0xf4e8ff,transparent:true,opacity:.09,depthWrite:false,side:THREE.DoubleSide});
  for(const [rx,rz] of [[-7,-6],[6,-4],[0,3]]){
   const ray=mesh(new THREE.CylinderGeometry(1.2,3.4,16,10,1,true),rayMat,rx,7.5,rz,roomGroup);
   ray.rotation.z=-.18;ray.castShadow=false;
  }
 }
 const footprints=[[[-8,-3,4,3],[6,2,2.6,5.4],[-1,-6,2.1,2.1]], [[-5,1,2,8],[7,-4,6,2],[10,5,3,3]], [[-8,4,4,2],[0,-3,7,2],[8,4,4,2]], [[-8,-4,5,3],[6,4,4,4],[2,-7,2,3]]];
 const dock=[[[0,0,7,2.6],[-9,-5,2,5],[9,5,4,4]], [[-5,0,2,9],[5,-3,2,7],[10,5,3,2]], [[-7,3,6,2],[5,-4,7,2],[-7,-6,3,3]], [[-7,-5,2,6],[0,1,4,4],[8,4,2,6]]];
 const garden=[[[0,-4,5,3],[-6,2,3,3],[6,2,3,3]], [[-7,-3,4,4],[0,3,2,2],[7,-3,4,4]], [[-5,-5,2,5],[5,-5,2,5],[0,1,5,2]], [[-7,3,5,2],[-2,-2,2,4],[5,-6,4,3],[9,3,3,3]]];
 const obstacles=[footprints,dock,garden][act][layout];
 if(!safe)for(const [x,z,w,d] of (boss?[[-10,-2,2.6,2.6],[10,-2,2.6,2.6]]:obstacles)){
  const h=act===1?2.3:act===0?1.75:2.05;cover(x,z,w,h,d,act===1?a.trim:a.stone);roomBox(x,h+.02,z,w+.06,.09,d+.06,a.accent);
  for(const s of [-1,1]){
   roomBox(x+s*(w/2-.19),h*.54,z+d/2+.019,.17,h*.91,.06,a.dark);
   roomBox(x,h*.22,z+s*d/2,w+.12,.19,.09,a.dark);
  }
  if(act===2){const m=mesh(crystalGeo,glow(a.accent),x,h+.6,z,roomGroup);m.scale.set(.5,.8,.52);}
 }
 if(!safe){
  if(!boss)raisedPassage(layout%2?-12:12,8.5,3.15,a);
  if(act===0)addTrap('line',layout%2?3:-3,0,1.1,boss?17:14);
  else for(const [x,z,phase] of [[-4,-5,0],[5,3,2.15],[0,-1,3.82]].slice(0,boss?3:2)){
   const spot=findSpawnPoint(x,z);addTrap('disc',spot.x,spot.z,act===2?2.05:1.72,0,phase,act);
  }
 }
 // A single gate on the far side stays in the same place for the whole encounter (and expands to branch doors on clear).
 exitGroup=new THREE.Group();exitGroup.position.copy(exitPoint);roomGroup.add(exitGroup);
 for(const x of [-2.5,2.5]){box(x,2.3,0,.58,4.6,.85,chamberMat(a.stone),exitGroup);box(x,3.8,0,.72,.22,.95,chamberMat(a.accent),exitGroup);}
 exitTop=box(0,4.7,0,5.9,.48,1,chamberMat(a.trim),exitGroup);
 exitBase=box(0,.018,1,4.9,.045,2.7,chamberMat(a.trim),exitGroup);
 exitSeal=new THREE.Group();exitGroup.add(exitSeal);
 for(const h of [.72,1.04])box(0,h,0,4.6,.08,.06,chamberMat(a.accent),exitSeal);
 exitBands=[-2.5,2.5].map(x=>box(x,2.35,.45,.19,3.28,.065,chamberMat(a.dark),exitGroup));
 dressYard(act,layout,safe,boss);instanceYard();
 ambientPoints=spawnAmbientMotes(act,roomGroup,18,120,.5,10.5);
 roomGroup.updateMatrixWorld(true);
}
function createExpeditionWorld(){
 scene.add(roomGroup);buildSanctuaryWorld();showSanctuaryMode(true);
 return {ash:new THREE.Group(),beam:{material:{opacity:0}},beams:[]};
}
