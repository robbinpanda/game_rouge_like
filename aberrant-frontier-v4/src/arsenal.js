// Sculpted sections share one ridge. Each face gets a hard cel colour.
const weaponModels=new Map();
const prismColors={katana:0xff744a,spear:0x71d8c2,dual:0xcb68ed,hammer:0xffbf56,crossbow:0x64e7cb,rifle:0xb99aff};
function sculptWeapon(id){
 const group=new THREE.Group(),metal=mat(0x263247),brass=mat(0xdcb68c),bone=mat(0xe5d6b2),wrap=mat(0x435168),light=glow(prismColors[id]);
 const base=new THREE.Color(prismColors[id]);
 function facet(parent,rows,tone=base){
  const pos=[],colors=[];
  const loops=rows.map(([y,x,width,depth])=>[[x-width,y,0],[x,y,depth],[x+width,y,0],[x,y,-depth]]);
  function tri(a,b,c,k){pos.push(...a,...b,...c);for(let i=0;i<3;i++)colors.push(tone.r*k,tone.g*k,tone.b*k);}
  for(let i=1;i<loops.length;i++)for(let j=0;j<4;j++){
   const a=loops[i-1],b=loops[i],n=(j+1)%4,k=[.94,.48,.72,.32][j];
   tri(a[j],b[j],a[n],k);tri(a[n],b[j],b[n],k*.71);
  }
  for(const loop of [loops[0],loops.at(-1)]){tri(loop[0],loop[1],loop[2],.6);tri(loop[2],loop[3],loop[0],.6);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
  return mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}),0,0,0,parent);
 }
 // Chamfered octagonal sections continue through the hand, stock and fittings.
 function shell(x,y,z,sx,sy,sz,tone){
  const points=[],colors=[],outline=[[-.6,-1],[.6,-1],[1,-.58],[1,.58],[.6,1],[-.6,1],[-1,.58],[-1,-.58]];
  const rings=[[-.5,.68],[-.32,1],[.29,.91],[.5,.64]].map(([h,r])=>outline.map(([u,v])=>[u*sx*.5*r,h*sy,v*sz*.5*r]));
  const c=tone.color;
  function face(a,b,d,k){points.push(...a,...b,...d);for(let i=0;i<3;i++)colors.push(c.r*k,c.g*k,c.b*k);}
  for(let j=0;j<8;j++){const n=(j+1)%8;
   for(let i=0;i<3;i++){const lo=rings[i],hi=rings[i+1],k=[.62,.82,1,.89,.73,.56,.45,.51][j]*[.77,1,1.08][i];face(lo[j],hi[j],lo[n],k);face(lo[n],hi[j],hi[n],k*.82);}
   face([0,-sy*.5,0],rings[0][j],rings[0][n],.55);face([0,sy*.5,0],rings[3][n],rings[3][j],1);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();return mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}),x,y,z,group);
 }
 function shaft(y,len,r){
  const core=id==='spear'?new THREE.Color(0x6c9e90):new THREE.Color(id==='dual'?0x49364f:0x5b6179);
  const rows=[[-.50,.68],[-.34,1.05],[-.09,.93],[.17,1.06],[.34,.88],[.5,.7]];
  const handle=facet(group,rows.map(([h,width],i)=>[y+h*len,r*(i%2?.16:-.16),r*1.5*width,r*width]),core);
  handle.name='棱面握柄';
  shell(0,y+len*.46,0,r*3.1,len*.14,r*2.5,bone);
  shell(0,y-len*.44,0,r*3.25,len*.15,r*2.5,brass);
 }
 function crystal(x,y,z,sx,sy,sz){const m=facet(group,[[sy,0,.001,.001],[0,0,sx,sz],[-sy,0,.001,.001]]);m.position.set(x,y,z);return m;}
 if(id==='katana'){
  shaft(.12,.43,.057);shell(0,-.105,0,.39,.12,.21,bone).rotation.z=-.13;
  const blade=[[-.12,0,.09,.039],[-.55,.014,.107,.049],[-1.23,.08,.09,.045],[-1.54,.15,.067,.032],[-1.71,.26,.002,.002]];
  facet(group,blade,new THREE.Color(0x64708a));facet(group,blade.map(([y,x,w,d])=>[y,x+w*.78,w*.32,d*.51]));
  crystal(0,.35,0,.067,.105,.055);
 }else if(id==='dual'){
  shaft(.064,.26,.034);
  // A continuous curved blade, with the same silver cutting edge on both faces.
  const sections=[[-.066,0,.040,.024],[-.19,.004,.048,.027],[-.39,.012,.054,.029],
   [-.62,.029,.056,.028],[-.81,.061,.050,.024],[-.98,.111,.036,.019],[-1.09,.165,.019,.011],[-1.17,.218,0,0]];
  const positions=[],colors=[];
  const tones=[0x5b448b,0xc9a9f2,0xf3eaff].map(hex=>new THREE.Color(hex));
  for(const side of [-1,1]){
   const rings=sections.map(([y,x,w,d])=>[[x-w,y,0],[x-w*.56,y,d*side],[x+w*.53,y,d*.70*side],[x+w,y,0]]);
   for(let i=1;i<rings.length;i++)for(let j=0;j<tones.length;j++){
    const a=rings[i-1],b=rings[i],c=tones[j];
    const vertices=[a[j],a[j+1],b[j]];
    if(i<rings.length-1)vertices.push(a[j+1],b[j+1],b[j]);
    if(side>0)vertices.reverse();
    for(const vertex of vertices){positions.push(...vertex);colors.push(c.r,c.g,c.b);}
   }
  }
  const blade=new THREE.BufferGeometry();
  blade.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  blade.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));blade.computeVertexNormals();
  mesh(blade,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}),0,0,0,group).name='银缘紫晶弧刃';
  const wing=new THREE.Color(0xb397df);
  facet(group,[[-.065,-.017,.043,.031],[-.118,-.059,.041,.027],[-.18,-.106,.026,.018],[-.219,-.142,.002,.002]],wing);
  facet(group,[[-.066,.017,.029,.025],[-.107,.052,.028,.022],[-.144,.081,.002,.002]],wing);
  shell(0,-.063,0,.12,.084,.085,brass);
  for(const z of [-.043,.043])crystal(0,-.064,z,.024,.034,.010);
  crystal(0,.226,0,.041,.057,.035);
 }else if(id==='spear'){
  // Balanced spear proportions: shorter rear pommel so the butt never clips back through the hero's chest!
  shaft(-.42,1.56,.042);facet(group,[[-1.12,0,.065,.05],[-1.42,0,.17,.082],[-1.62,.012,.11,.052],[-2.14,0,.004,.004]],new THREE.Color(0xe3e3cd));
  for(const s of [-1,1])facet(group,[[-1.16,s*.02,.032,.036],[-1.34,s*.115,.058,.048],[-1.54,s*.19,.003,.004]]);
  crystal(0,.39,0,.058,.11,.058);
 }else if(id==='hammer'){
  shaft(-.28,1.38,.062);shell(0,-1.02,0,.68,.38,.44,metal);
  for(const side of [-1,1]){const cap=facet(group,[[0,0,.27,.26],[-.12,0,.35,.30],[-.24,0,.27,.22]]);cap.rotation.z=side*Math.PI/2;cap.position.set(side*.29,-1.02,0);}
  for(const z of [-.22,.22])shell(0,-1.02,z,.39,.26,.082,bone).rotation.z=.12;
  for(const z of [-.27,.27])crystal(0,-1.02,z,.19,.20,.06);
 }else{
  const bow=id==='crossbow';shell(0,0,.21,.19,.20,.64,metal);shell(0,-.15,0,.12,.25,.14,wrap);
  shell(0,.035,.68,.105,.11,.68,brass);crystal(0,.105,.38,.11,.10,.26);
  if(bow){
   shell(0,0,.44,.31,.24,.54,bone);shell(0,-.04,-.18,.17,.22,.34,wrap).rotation.x=-.11;
   crystal(0,.08,.86,.078,.065,.18);shell(0,-.02,-.12,.15,.13,.24,bone);
   for(const side of [-1,1]){const wing=facet(group,[[0,0,.08,.06],[-.26,.11,.128,.07],[-.52,.20,.095,.04],[-.69,.11,.005,.005]]);wing.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0,0,-1),new THREE.Vector3(-side,0,0),new THREE.Vector3(0,side,0)));wing.position.set(0,.04,.52);
    const feather=facet(group,[[0,0,.074,.05],[-.17,.065,.085,.04],[-.36,.115,.003,.003]],new THREE.Color(0x76b6a5));feather.quaternion.copy(wing.quaternion);feather.position.set(side*.20,.016,.37);
    const start=new THREE.Vector3(side*.69,.04,.40),end=new THREE.Vector3(0,.04,.04),dir=end.clone().sub(start);const string=cylinder(0,0,0,.011,.011,dir.length(),bone,group,5);string.position.copy(start).lerp(end,.5);string.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());}
  }else{
   shell(0,-.03,-.18,.21,.26,.34,wrap).rotation.x=-.14;
   shell(0,.04,.58,.205,.23,.78,metal);shell(0,.145,.47,.135,.115,.47,light);shell(0,-.20,0,.14,.28,.18,wrap).rotation.x=-.24;for(const z of [.60,.75,.90])shell(0,.055,z,.20,.19,.07,metal);
   for(const side of [-1,1]){
    const inlay=facet(group,[[0,0,.014,.014],[-.12,.032,.048,.02],[-.44,.016,.024,.016],[-.68,-.035,.003,.002]],new THREE.Color(0xb398e8));
    inlay.rotation.set(-Math.PI/2,0,Math.PI/2,'ZYX');inlay.position.set(side*.098,.04,.06);
   }
   const muzzle=shell(0,.04,1.02,.27,.145,.25,brass);muzzle.rotation.x=Math.PI/2;crystal(0,.04,1.09,.074,.074,.032);
  }
 }
 group.name=WEAPONS[id].name;return group;
}
function equipWeapon(avatar,id){
 avatar.weaponGroup?.removeFromParent();avatar.secondBlade?.removeFromParent();avatar.secondBlade=null;
 if(!weaponModels.has(id))weaponModels.set(id,sculptWeapon(id));
 if(!avatar.grips){
  avatar.elbows=avatar.arms.map(arm=>{
   const joint=new THREE.Group();joint.position.set(0,-.46,.014);const lower=arm.children.filter(part=>part.position.y<-.45);arm.add(joint);for(const part of lower)joint.attach(part);return joint;
  });
  avatar.grips=avatar.arms.map((arm,i)=>{const socket=new THREE.Group();socket.position.set(avatar.human?0:(i?1:-1)*.13,avatar.human?-.92:-.99,avatar.human?.03:.13);arm.add(socket);avatar.elbows[i].attach(socket);return socket;});
 }
 const weaponBodyScale={katana:.66,spear:.62,dual:.58,hammer:.56,crossbow:.62,rifle:.60};
 const attach=i=>{const m=weaponModels.get(id).clone();avatar.grips[i].add(m);if(avatar.body)m.scale.setScalar(weaponBodyScale[id]||.64);return m;};
 avatar.weaponId=id;avatar.weaponGroup=attach(1);if(id==='dual'){avatar.secondBlade=attach(0);avatar.secondBlade.rotation.y=Math.PI;avatar.secondBlade.rotation.z=.18;}
 avatar.weaponGroup.rotation.set(WEAPONS[id].type==='ranged'?1.22:id==='spear'?-1.18:-.42,0,id==='katana'||id==='dual'?-.16:0);
}


// Right-hand poses are sampled at rest, wind-up, contact and recovery.
const weaponPoses={
 katana:[[-.62,-.44],[-1.92,-.96],[-.87,1.03]],
 spear:[[-.78,-.18],[-.59,-.34],[-1.72,.19]],
 dual:[[-.72,-.58],[-1.51,-.87],[-.84,.84]],
 hammer:[[-.86,-.46],[-2.88,-.26],[-.91,.28]],
 crossbow:[[-1.39,.15],[-1.44,.21],[-1.37,.14]],
 rifle:[[-1.17,.25],[-1.39,.17],[-1.01,.31]]
};
const supportSocket={spear:[0,-.38,0],hammer:[0,-.30,0],crossbow:[0,-.04,.34],rifle:[0,-.09,.38]};
const handGoal=new THREE.Vector3(),elbowGoal=new THREE.Vector3(),shoulderPos=new THREE.Vector3(),elbowPos=new THREE.Vector3(),palmPos=new THREE.Vector3();
const reachAxis=new THREE.Vector3(),pole=new THREE.Vector3(),boneAxis=new THREE.Vector3(),targetAxis=new THREE.Vector3(),jointRot=new THREE.Quaternion(),turnHand=new THREE.Quaternion();
function pointJoint(joint,end,target){
 joint.getWorldPosition(boneAxis);targetAxis.copy(target).sub(boneAxis).normalize();
 end.getWorldPosition(palmPos);boneAxis.sub(palmPos).negate().normalize();
 joint.parent.getWorldQuaternion(jointRot).invert();boneAxis.applyQuaternion(jointRot);targetAxis.applyQuaternion(jointRot);
 joint.quaternion.premultiply(turnHand.setFromUnitVectors(boneAxis,targetAxis));
}
function solvePalm(a,i,target){
 const shoulder=a.arms[i],elbow=a.elbows[i],palm=a.grips[i];
 shoulder.getWorldPosition(shoulderPos);elbow.getWorldPosition(elbowPos);palm.getWorldPosition(palmPos);
 const upper=elbowPos.distanceTo(shoulderPos),lower=palmPos.distanceTo(elbowPos);
 reachAxis.copy(target).sub(shoulderPos);const distance=clamp(reachAxis.length(),Math.abs(upper-lower)+.001,upper+lower-.001);reachAxis.normalize();
 const along=(upper*upper-lower*lower+distance*distance)/(2*distance);
 const side=(i===1?1:-1)*(a.body?-1:1);
 a.rig.getWorldQuaternion(jointRot);pole.set(side*.8,-1,-.5).applyQuaternion(jointRot);pole.addScaledVector(reachAxis,-pole.dot(reachAxis)).normalize();
 elbowGoal.copy(shoulderPos).addScaledVector(reachAxis,along).addScaledVector(pole,Math.sqrt(Math.max(0,upper*upper-along*along)));
 pointJoint(shoulder,elbow,elbowGoal);pointJoint(elbow,palm,target);
}
function holdTwoHanded(a,id,wind,drive,recoil,elevation){
 const side=a.body?-1:1;
 // +side is ALWAYS the right arm's own flank (-X for Tripo rigs, +X for legacy rigs), preventing crossed arms & torso clipping!
 let x=side*.18,y=a.body?1.48:1.54,z=.36,angle=elevation,yawOff=0,rollOff=0;
 if(id==='hammer'){x=side*.28;y=a.body?1.24:1.34;y+=wind*.32+drive*.06;z=.34+drive*.14;angle=-2.44-wind*.60+drive*1.48;yawOff=-side*.14;rollOff=side*(.24-.14*drive);}
 if(id==='spear'){x=side*.30;y=a.body?1.26:1.34;z=.24+drive*.22-wind*.14;angle=-2.04+wind*.18+drive*.48;yawOff=-side*.20;rollOff=side*.14;}
 if(id==='rifle'){x=side*.18;y=(a.body?1.48:1.56);z=.36-recoil*.15;angle-=recoil*.13;}
 if(id==='crossbow'){x=side*.18;y=(a.body?1.42:1.50);z=.36-recoil*.06;angle-=recoil*.045;}
 handGoal.set(x,y,z);a.rig.localToWorld(handGoal);solvePalm(a,1,handGoal);
 a.rig.getWorldQuaternion(jointRot);turnHand.setFromEuler(new THREE.Euler(angle,yawOff,rollOff));jointRot.multiply(turnHand);
 a.grips[1].getWorldQuaternion(turnHand).invert();a.weaponGroup.quaternion.copy(turnHand.multiply(jointRot));
 handGoal.fromArray(supportSocket[id]);a.weaponGroup.localToWorld(handGoal);solvePalm(a,0,handGoal);
}
function holdOneHandedRig(a,id,wind,drive,mirror,guard){
 const side=-1,step=Math.sin(a.phase)*.032;
 if(id==='katana'){
  const rx=guard?-.08:side*(.35-drive*.24+wind*.12)*mirror;
  const ry=guard?1.44:1.06+wind*.40-drive*.12+step;
  const rz=guard?.46:.28+drive*.28-wind*.14;
  handGoal.set(rx,ry,rz);a.rig.localToWorld(handGoal);solvePalm(a,1,handGoal);
  a.rig.getWorldQuaternion(jointRot);
  const wRx=guard?-1.45:-1.90-wind*.80+drive*1.22;
  const wRy=guard?.55:-side*(.24-drive*.52)*mirror;
  const wRz=guard?-.65:side*(.22+wind*.16)*mirror;
  turnHand.setFromEuler(new THREE.Euler(wRx,wRy,wRz));jointRot.multiply(turnHand);
  a.grips[1].getWorldQuaternion(turnHand).invert();a.weaponGroup.quaternion.copy(turnHand.multiply(jointRot));
  handGoal.set(-side*.32,1.02-step*.6,.18+wind*.10);a.rig.localToWorld(handGoal);solvePalm(a,0,handGoal);
 }else if(id==='dual'){
  const rx=side*(.37-drive*.22+wind*.10)*mirror,ry=1.06+wind*.26-drive*.08+step,rz=.30+drive*.24-wind*.10;
  handGoal.set(rx,ry,rz);a.rig.localToWorld(handGoal);solvePalm(a,1,handGoal);
  a.rig.getWorldQuaternion(jointRot);
  turnHand.setFromEuler(new THREE.Euler(-1.74-wind*.55+drive*.95,-side*.30*mirror,side*.26*mirror));jointRot.multiply(turnHand);
  a.grips[1].getWorldQuaternion(turnHand).invert();a.weaponGroup.quaternion.copy(turnHand.multiply(jointRot));
  const lx=-side*(.37-drive*.18+wind*.10)*mirror,ly=1.08+drive*.22-step,lz=.32+wind*.18-drive*.08;
  handGoal.set(lx,ly,lz);a.rig.localToWorld(handGoal);solvePalm(a,0,handGoal);
  if(a.secondBlade){
   a.rig.getWorldQuaternion(jointRot);
   turnHand.setFromEuler(new THREE.Euler(-1.74+wind*.40-drive*.65,side*.30*mirror,-side*.26*mirror));jointRot.multiply(turnHand);
   a.grips[0].getWorldQuaternion(turnHand).invert();a.secondBlade.quaternion.copy(turnHand.multiply(jointRot));
  }
 }
}
function poseWeapon(a,strike,preview=false){
 const id=a.weaponId;if(!id)return;
 const melee=WEAPONS[id].type==='melee',poses=weaponPoses[id],right=a.arms[1],left=a.arms[0];
 const held=!preview&&mouseRight,guard=!preview&&parryTime>0;
 a.rig.rotation.y=0;right.position.z=0;right.rotation.y=0;left.rotation.y=0;
 let [x,z]=poses[0],twist=0,drive=0,wind=0;
 if(strike){
  const pre=strike.windup,contact=Math.max(.02,pre*.5),end=strike.duration,t=strike.elapsed;
  if(t<pre-contact){wind=clamp(t/(pre-contact),0,1);}
  else if(t<pre){drive=clamp((t-pre+contact)/contact,0,1);wind=1-drive;}
  else drive=1-clamp((t-pre)/(end-pre),0,1);
 }else if(held){wind=clamp(chargeTime/weaponSpecs[id].charge,0,1);}
 const mirror=strike?.step===1&&['katana','dual'].includes(id)?-1:1;
 x+=(poses[1][0]-x)*wind+(poses[2][0]-x)*drive;
 z+=(poses[1][1]-z)*wind*mirror+(poses[2][1]-z)*drive*mirror;
 const step=Math.sin(a.phase)*.055;
 left.rotation.set(-.36+step,0,.27);right.rotation.set(x+step*.45,0,z);
 if(a.elbows){a.elbows[0].rotation.set(-.52,0,0);a.elbows[1].rotation.set(-.32-.32*wind,0,0);}
 if(!melee){
  const recoil=preview?0:clamp(a.attack/.16,0,1);right.rotation.x-=recoil*(id==='rifle'?.36:.12);right.position.z=-recoil*(id==='rifle'?.18:.055);
 }else{
  a.weaponGroup.rotation.set(id==='spear'?-1.07-wind*.43+drive*.94:id==='hammer'?-.58: -.4,0,0);
  if(id==='dual'){left.rotation.set(-.68-step-.79*drive,0,.57+mirror*(wind*.55-drive*1.35));twist=mirror*(wind*-.45+drive*.66);}
  if(id==='katana')twist=mirror*(wind*-.57+drive*.84);
  if(id==='spear'){twist=.14+wind*.25-drive*.44;}
  if(id==='hammer'){a.rig.rotation.x+=drive*.37-wind*.23;a.rig.position.y-=drive*.15;}
  a.rig.rotation.y=twist;
  if(guard){right.rotation.set(-1.55,0,-.8);a.weaponGroup.rotation.z=.68;}
 }
 if(supportSocket[id])holdTwoHanded(a,id,wind,drive,preview?0:clamp(a.attack/.16,0,1),preview?0:pitch*.52);
 else if(a.body)holdOneHandedRig(a,id,wind,drive,mirror,guard);
}



