const acts=[
 {name:'晴湾断轨',zone:'旧城高架',en:'DAYBREAK LINE',sky:0x7ebde0,skyTop:0x3c8bc4,skyMid:0x88cbe6,skyBot:0xffe4c4,fog:0xa5cde0,phaseSky:[0x3b2854,0xc25b58,0xffbc7a],floor:0xd8c6b4,trim:0x397d77,accent:0xde7857,stone:0xd8c6ab,dark:0x2b424d,boss:'断轨镇守者',crest:'轨',rooms:['断轨前庭','检票回廊','折返站台','调度中庭'],bossRoom:'终点换乘台',trap:'通电轨道'},
 {name:'鸣潮船坞',zone:'潮汐港池',en:'TIDAL DOCK',sky:0x5792b5,skyTop:0x235884,skyMid:0x62a4c4,skyBot:0xd6ece8,fog:0x7eaec2,phaseSky:[0x122642,0x2b5a80,0x8ae0ee],floor:0x7d95a1,trim:0x286383,accent:0xe5aa54,stone:0xc4cdb9,dark:0x243b4f,boss:'潮鸣母舰',crest:'潮',rooms:['吊装甲板','浮箱栈桥','潮汐泊位','缆索货场'],bossRoom:'三号干船坞',trap:'泄压喷口'},
 {name:'紫晶温室',zone:'回响穹顶',en:'PRISM GARDEN',sky:0x8072a6,skyTop:0x40336c,skyMid:0x8b7cb3,skyBot:0xf2d9ee,fog:0x9685b8,phaseSky:[0x20133b,0x6d3485,0xde8eeb],floor:0xb7a6c9,trim:0x4b998b,accent:0xa377cd,stone:0xd5c0d6,dark:0x3f3159,boss:'镜冠花王',crest:'晶',rooms:['育晶花圃','双翼回廊','折光苗床','繁花中庭'],bossRoom:'镜冠穹庭',trap:'爆裂晶床'}
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
 sun.color.setHex(act===0?0xff9d6c:act===1?0x94d9ff:0xe099ff);
 sun.intensity=2.85;
}
function spawnAmbientMotes(act,parent,spread=22,count=130,yMin=.5,yMax=10.5){
 const pos=new Float32Array(count*3),col=new Float32Array(count*3);
 const c1=new THREE.Color(act===0?0xe8b5eb:act===1?0x9ef0ff:0xd8a8ff);
 const c2=new THREE.Color(act===0?0xffe8c2:act===1?0xffd282:0x8ff5dc);
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
 const pts=new THREE.Points(g,new THREE.PointsMaterial({size:.18,vertexColors:true,transparent:true,opacity:.8,depthWrite:false}));
 pts.userData={act,yMin,yMax};parent.add(pts);return pts;
}
function updateAmbientMotes(dt){
 const pts=sanctuaryGroup.visible?sanctuaryMotes:ambientPoints;
 if(pts){
  const pos=pts.geometry.attributes.position,arr=pos.array,{act,yMin,yMax}=pts.userData;
  for(let i=0;i<arr.length;i+=3){
   arr[i]+=Math.sin(time*.8+i)*.35*dt;
   arr[i+1]+=(act===2?.45:-.32)*dt;
   if(arr[i+1]<yMin)arr[i+1]=yMax;
   if(arr[i+1]>yMax)arr[i+1]=yMin;
  }
  pos.needsUpdate=true;
 }
 if(sanctuaryGroup.visible){
  if(sanctuaryBeam)sanctuaryBeam.material.opacity=.14+.05*Math.sin(time*1.6);
  if(sanctuaryMirror)sanctuaryMirror.rotation.y+=dt*.9;
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
 const colors=[['#9c8070','#b7977d','#756f6c'],['#536e78','#72909a','#3e535c'],['#86728a','#a98ca6','#685876']][act];
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
 const a=acts[act],pavement=[0xd7aa92,0x7ea2a9,0xbca8c8][act];
 for(const x of [-12,-6,0,6,12])roomBox(x,-.009,0,.045,.018,30,pavement);
 for(const z of [-10,-5,0,5,10])roomBox(0,-.008,z,32,.018,.045,pavement);
 roundel(0,1,boss?6.7:4.2,a.stone);
 for(const x of [-14,14])for(let z=-12;z<13;z+=3){roomBox(x,.013,z,.22,.035,1.6,a.trim);}
 const sign=safe?'服务站':boss?'首领区':a.zone;
 yardSign(sign+'　/　'+String(layout+1).padStart(2,'0'),0,4.71,-12.13,4.9,.53,'#fff1d9','#24515d');
 for(const side of [-1,1]){
  const x=side*14.2;
  for(const z of [-10,5]){
   roomBox(x,1.95,z,.16,3.9,.18,a.dark);roomBox(x+side*.35,3.9,z,.85,.17,.22,a.dark);
   roomBox(x+side*.57,3.78,z,.64,.12,.36,0xffe3a6);
  }
 }
 if(act===0){
  // A glazed terminal and a broken elevated line frame the city gate.
  roomBox(0,2.5,-20.6,13,5,2.8,0x4aabb6);
  for(let x=-6;x<=6;x+=2){roomBox(x,2.5,-19.14,.15,5,.16,a.dark);}
  roomBox(0,3.0,-19.08,13,.13,.15,a.dark);
  const arch=mesh(archRing,chamberMat(0xdf795e),0,3.0,-18.5,roomGroup);arch.scale.set(8.3,4,1);
  for(const side of [-1,1]){roomBox(side*7.65,1.5,-18.5,1.25,3,1,a.accent);
   for(let i=0;i<6;i++)roomBox(side*(14+i*1.55),11.1,-17.62,.18,.75,.17,a.stone);
   for(const z of [-15,-3,10])treeAt(side*(17.4+Math.abs(z)%3),z,1.45+(z===-15?.55:0),[0xae8dc5,0xd7a7db]);
   for(let i=0;i<6;i++){const x=side*(7+i*4.4),height=6+(i*7%12);
    roomBox(x,height/2+3,-39-i%3*3,3.3,height,4,0x97a3bf);roomBox(x,height+3,-39-i%3*3,3.6,.4,4.4,0x8197ac);}
  }
  yardSign('晴 湾　/　DAYBREAK',0,4.15,-18.96,5.2,.84,'#fdf3d8','#397983');
  for(let i=-2;i<=2;i++)roomBox(i*.95,.021,8.0,.54,.02,2.3,0xf9edd5);
 }else if(act===1){
  for(const s of [-1,1]){cargoAt(s*14,-15.8,s>0?0xe48668:0x53a9ab);cargoAt(s*18.7,-9.6,0x539599);
   for(const z of [-16,-7,1,9]){roomBox(s*16.8,1.73,z,.15,1.4,.15,a.dark);roomBox(s*16.8,2.23,z+3.9,.12,.1,7.9,a.accent);}
   for(let j=0;j<5;j++){const m=roomBox(s*(6+j*1.1),.024,-9,.52,.02,1.52,a.accent);m.rotation.y=.52;}
  }
  yardSign('03　/　TIDAL DOCK',-11,3,-18,6.4,1.1,'#254e60','#f5c664');
  for(let i=0;i<9;i++)roomBox(-34+i*7,-1.55,-33-i%3*3,3,.08,.15,0xc6eef0);
 }else{
  for(const side of [-1,1]){for(const z of [-11,0,10]){
   treeAt(side*18.7,z,1.6,[0x77bbad,0xa6dac3]);
   const panel=mesh(yardSignPlane,chamberMat(0xaacbc7),side*17.75,2.3,z,roomGroup);panel.scale.set(6.5,4.6,1);panel.rotation.y=-side*Math.PI/2;
  }for(let j=0;j<6;j++){const m=roomBox(side*(4+j*.95),.023,8.8-j*.67,.32,.024,.96,a.trim);m.rotation.y=side*.65;}}
  const arch=mesh(archRing,chamberMat(a.trim),0,1,-17.3,roomGroup);arch.scale.set(9.5,8,1);
  yardSign('镜 冠　/　GLASSHOUSE',0,6.4,-17,6.4,1,'#fbf1ff','#695c81');
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
function buildSanctuaryWorld(){
 if(sanctuaryBuilt)return;
 sanctuaryBuilt=true;
 const sBox=(x,y,z,w,h,d,c)=>box(x,y,z,w,h,d,chamberMat(c),sanctuaryGroup);
 const sTree=(x,z,y,size,leaves)=>{
  cylinder(x,y+size*1.0,z,size*.16,size*.24,size*2.0,chamberMat(0x6e5660),sanctuaryGroup);
  const c1=mesh(canopyGeo,chamberMat(leaves[0]),x,y+size*2.4,z,sanctuaryGroup);c1.scale.set(size*1.35,size*.85,size*1.2);
  const c2=mesh(canopyGeo,chamberMat(leaves[1]),x+size*.65,y+size*2.05,z+size*.3,sanctuaryGroup);c2.scale.set(size*.95,size*.65,size*.9);
 };
 // --- FOREGROUND: HADES-STYLE SANCTUARY OVERLOOK TERRACE (around z = 24) ---
 sBox(0,-.6,24,22,1.2,18,0xdfd0bc);
 sBox(0,-1.45,24,23.2,.6,19.2,0x397d77);
 sBox(0,-9,25,20,15,17,0x8a7d76); // Cliff base dropping to harbor bay
 // Carved compass medallion on sanctuary floor
 const ring1=mesh(yardRing,chamberMat(0xdcbd80),0,.02,24,sanctuaryGroup);ring1.rotation.x=-Math.PI/2;ring1.scale.set(5.4,5.4,1);ring1.castShadow=false;
 const ring2=mesh(yardRing,chamberMat(0x397d77),0,.022,24,sanctuaryGroup);ring2.rotation.x=-Math.PI/2;ring2.scale.set(3.1,3.1,1);ring2.castShadow=false;
 // Stone balustrades framing the cliff overlook
 for(const side of [-1,1]){
  sBox(side*10.6,.65,24,.7,1.3,17.5,0xe7d9c3);sBox(side*10.6,1.34,24,.9,.16,17.8,0x397d77);
  sBox(side*6.6,.65,15.3,7.6,1.3,.7,0xe7d9c3);sBox(side*6.6,1.34,15.3,7.9,.16,.9,0xde7857);
  // Warm glowing sanctuary braziers
  for(const bz of [16,23,30]){
   cylinder(side*9.4,.95,bz,.34,.45,1.9,chamberMat(0x314a54),sanctuaryGroup,8);
   const flame=mesh(crystalGeo,glow(0xff9f5c),side*9.4,2.25,bz,sanctuaryGroup);flame.scale.set(.32,.52,.32);flame.castShadow=false;
  }
  sTree(side*12.5,27,-.4,1.7,[0xb893d1,0xe2b4e6]);
 }
 // Grand Expedition Departure Arch at cliff edge (z=15.3)
 for(const side of [-1,1]){
  sBox(side*2.8,2.9,15.3,.8,5.8,1.1,0xe8d9c4);
  sBox(side*2.8,4.6,15.3,.98,.25,1.25,0xde7857);
 }
 const arch=mesh(archRing,chamberMat(0xde7857),0,5.2,15.3,sanctuaryGroup);arch.scale.set(3.4,2.2,1);
 sBox(0,5.85,15.3,6.8,.45,1.2,0x397d77);
 // Left Shrine: Mirror of Echoes (回响之镜)
 sBox(-6.4,2.2,22.2,2.6,4.4,.55,0x25424b);sBox(-6.4,2.2,22.52,1.9,3.5,.12,0x8ae8d5);
 sanctuaryMirror=mesh(crystalGeo,glow(0xc59eff),-6.4,4.9,22.2,sanctuaryGroup);sanctuaryMirror.scale.set(.34,.58,.34);sanctuaryMirror.castShadow=false;
 // Right Shrine: Arsenal Pedestal (武器陈列台)
 sBox(6.4,.65,22.2,2.6,1.3,1.5,0x2f4954);sBox(6.4,1.36,22.2,2.8,.14,1.7,0xdcbd80);
 // --- MIDGROUND & FAR PANORAMA: ALL THREE ACTS CONNECTED IN ONE ZELDA-SCALE VISTA ---
 // Sparkling Harbor Sea below the cliffs
 const sea=box(0,-19, -55, 360, .6, 260, mat(0x3a9eb8,{roughness:.35,metalness:.22}), sanctuaryGroup);sea.castShadow=false;
 for(let i=0;i<14;i++){
  const glint=box(-70+i*12,-18.6,-25-(i%4)*22,7,.08,.45,glow(0xbef4f8),sanctuaryGroup);glint.castShadow=false;
 }
 // ACT I VISTA (Left / West): Daybreak Line Viaduct, Train & Sunny Old Town
 for(let i=0;i<7;i++){
  const x=-68+i*9.2,h=9+(i*5%11);
  sBox(x,-14+h/2,-36-(i%3)*8,7.2,h,7.5,0xe6d4be);
  sBox(x,-14+h,-36-(i%3)*8,7.7,.45,8.0,i%2?0xde7857:0x397d77);
 }
 // Iconic sweeping broken elevated viaduct & train
 sBox(-38,-3.5,-24,54,1.3,4.2,0xede0cd);sBox(-38,-3.5,-21.8,54,.45,.25,0xde7857);
 for(const px of [-58,-42,-26,-12])sBox(px,-11,-24,1.6,15,2.2,0xdcc9b3);
 sBox(-34,-1.8,-24,15,2.1,3.0,0xf5ebd9);sBox(-34,-2.5,-22.4,15,.4,.15,0xde7857);sBox(-34,-1.5,-22.4,12.5,.75,.12,0x2c4754);
 for(const [tx,tz] of [[-24,-18],[-46,-16],[-18,-32],[-54,-30]])sTree(tx,tz,-14,2.8,[0xb78fd4,0xe0b5e8]);
 // ACT II VISTA (Right / East): Tidal Dock, Golden Gantry Cranes & Harbor Freighter
 sBox(44,-14.5,-34,58,9,44,0x738e99);sBox(44,-9.8,-12,58,.6,1.2,0xe5aa54);
 for(let i=0;i<5;i++){
  const cx=24+i*10.5,cz=-26-(i%2)*10;
  sBox(cx,-8.2,cz,7.5,3.2,4.2,i%2?0xde7857:0x3f8f94);
 }
 // Towering golden port gantry cranes
 for(const [gx,gz] of [[26,-20],[52,-38],[64,-18]]){
  sBox(gx,-2,gz,1.4,18,1.4,0xe8ae48);sBox(gx+6,-2,gz,1.4,18,1.4,0xe8ae48);
  sBox(gx+3,7.2,gz,18,1.2,1.6,0xe8ae48);sBox(gx-2,1.5,gz,.25,11,.25,0x273e4c);sBox(gx-2,-4,gz,4.5,2.1,2.6,0x397d77);
 }
 // Cargo ship silhouette on the bay
 sBox(26,-16.8,-62,24,4.2,7.5,0x2b4658);sBox(33,-12.6,-62,6.5,4.8,6.0,0xf0e4cf);sBox(33,-9.8,-62,4.2,1.6,3.5,0xde7857);
 // ACT III LANDMARK (Far Center-North Mountain): Colossal Prism Glasshouse Cathedral & Sky Beam!
 sBox(0,-12,-116,54,22,42,0x5f5478);sBox(0,-1,-116,42,10,32,0x7a6c96);
 // Giant arched emerald-teal glasshouse dome
 const dome=mesh(new THREE.SphereGeometry(18,16,12,0,Math.PI*2,0,Math.PI/2),mat(0x6ad6c2,{roughness:.25,metalness:.2,transparent:true,opacity:.78}),0,4,-116,sanctuaryGroup);
 dome.scale.set(1.15,1.0,1.0);dome.castShadow=false;
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3,rad=21;
  const spire=mesh(crystalGeo,glow(i%2?0xb782f0:0x7cf2db),Math.cos(a)*rad,11+(i%3)*4,-116+Math.sin(a)*rad,sanctuaryGroup);
  spire.scale.set(2.8,9+(i%2)*4,2.8);spire.castShadow=false;
 }
 const centralSpire=mesh(crystalGeo,glow(0xd39eff),0,24,-116,sanctuaryGroup);centralSpire.scale.set(4.5,14,4.5);centralSpire.castShadow=false;
 // Ethereal Beacon piercing the heavens (Zelda Hyrule Castle / Light Pillar focal point)
 sanctuaryBeam=mesh(new THREE.CylinderGeometry(1.1,4.2,130,16,1,true),new THREE.MeshBasicMaterial({color:0xb896ff,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide}),0,75,-116,sanctuaryGroup);
 sanctuaryBeam.castShadow=false;
 // Distant atmospheric mountain silhouettes & sunlit clouds
 const mtMat=chamberMat(0x7c97b8);
 for(let i=0;i<11;i++){
  const mx=-140+i*28,mz=-155-(i%3)*18,mh=26+((i*17)%32);
  const peak=mesh(new THREE.ConeGeometry(24+(i%3)*8,mh,5),mtMat,mx,-16+mh/2,mz,sanctuaryGroup);peak.castShadow=false;
 }
 const cloudMat=new THREE.MeshBasicMaterial({color:0xfff7f0,fog:false,transparent:true,opacity:.88});
 for(let i=0;i<14;i++){
  const cx=-110+i*18,cy=36+(i%4)*8,cz=-85-(i%3)*35;
  for(let k=0;k<3;k++){
   const c=mesh(canopyGeo,cloudMat,cx+k*5.5,cy+(k===1?2:0),cz+k*2,sanctuaryGroup);
   c.scale.set(7+k*1.5,3.2,4.5);c.castShadow=false;
  }
 }
 sanctuaryMotes=spawnAmbientMotes(0,sanctuaryGroup,26,110,.5,18);
 sanctuaryMotes.position.set(0,0,22);
 scene.add(sanctuaryGroup);
}
function showSanctuaryMode(on){
 buildSanctuaryWorld();
 sanctuaryGroup.visible=on;
 roomGroup.visible=!on;
 if(on){
  setSkyPalette(0x3a87c4,0x8ccde8,0xffe4c4,0x9bcbe0);
  sun.color.setHex(0xffe8cc);sun.intensity=2.6;
 }
}
function setChamber(act,layout,safe=false,boss=false){
 const a=acts[act];clearRoomTraps();clearBranchGates();updateGroundFlashes(Infinity);
 if(sanctuaryGroup)sanctuaryGroup.visible=false;roomGroup.visible=true;
 for(const m of roomGroup.children)if(m.isInstancedMesh)m.dispose();roomGroup.clear();colliders.length=cameraMeshes.length=surfaces.length=anchors.length=0;
 setSkyPalette(a.skyTop,a.skyMid,a.skyBot,a.fog);
 sun.color.setHex(act===0?0xffe6cc:act===1?0xfff1dc:0xf2e4ff);sun.intensity=2.55;
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
   roomBox(side*16,9.6,-19,26,.8,3,a.stone);roomBox(side*16,9.5,-17.46,26,.28,.12,a.accent);
   roomBox(side*18,4.5,-19,1.1,9,1.25,a.stone);
   for(const dx of [-1,1])beamBetween(side*18,7.4,-19,side*18+1.7*dx,9.35,-19,.6,a.stone);
   const x=side*20;roomBox(x,10.9,-19,9,1.75,2.4,a.stone);roomBox(x,11.05,-17.77,8,.65,.08,a.dark);
   roomBox(x,10.35,-17.77,8.9,.23,.09,a.accent);
  }
 }else if(act===1){
  roomBox(0,-1.8,0,160,.4,150,0x4ab5c7);
  for(const x of [-22.5,22.5]){
   for(const z of [-19,4]){roomBox(x,6,z,.75,12,.75,a.accent);roomBox(x,11.9,z,10,.65,.9,a.accent);
    for(const d of [-1,1])beamBetween(x,8.8,z,x+d*3.8,11.7,z,.3,a.accent);
    roomBox(x-3,8.5,z,.09,6,.09,a.dark);roomBox(x-3,5.4,z,2.8,1.3,1.7,a.trim);}
  }
  for(let i=0;i<7;i++){const x=-24+i*8;roomBox(x,1.4,-24,6.9,2.8,4,i%2?a.trim:a.accent);
   for(let j=0;j<6;j++)roomBox(x-2.6+j,1.4,-21.96,.085,2.52,.08,a.stone);}
 }else{
  for(const x of [-17.5,17.5])for(const z of [-13,-3,8]){roomBox(x,3.2,z,.48,6.4,.48,a.trim);
   beamBetween(x,6.4,z,x*.48,11,z,.42,a.trim);beamBetween(x*.48,11,z,0,12,z,.3,a.trim);}
  for(let i=0;i<24;i++){
   const angle=i*2.4,x=Math.cos(angle)*(21+i%5),z=Math.sin(angle)*(20+i%4);
   const gem=mesh(crystalGeo,chamberMat(i%3?a.accent:a.trim),x,2+i%3,z,roomGroup);
   gem.scale.set(1.2,3+i%4,1.2);gem.rotation.z=Math.sin(i)*.35;
  }
  // Soft volumetric Prism Glasshouse God Rays
  const rayMat=new THREE.MeshBasicMaterial({color:0xf2d9ff,transparent:true,opacity:.075,depthWrite:false,side:THREE.DoubleSide});
  for(const [rx,rz] of [[-7,-6],[6,-4],[0,3]]){
   const ray=mesh(new THREE.CylinderGeometry(1.1,3.2,15,10,1,true),rayMat,rx,7.2,rz,roomGroup);
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
