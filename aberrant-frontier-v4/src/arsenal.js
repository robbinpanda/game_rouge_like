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
  const core=id==='spear'?new THREE.Color(0x6c9e90):new THREE.Color(id==='dual'?0x6c587d:0x5b6179);
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
  shaft(.08,.32,.053);facet(group,[[-.08,0,.11,.045],[-.24,-.08,.221,.073],[-.38,.02,.113,.052],[-.57,.17,.165,.063],[-.74,.30,.093,.033],[-.79,.47,.004,.003]]);
  facet(group,[[-.10,-.025,.034,.035],[-.24,-.14,.089,.044],[-.34,-.27,.006,.006]],new THREE.Color(0x9270c5));
  crystal(0,.24,0,.058,.071,.046);
  facet(group,[[.13,-.045,.025,.04],[-.03,-.16,.06,.05],[-.22,-.29,.005,.006]],new THREE.Color(0xdeb67a));
 }else if(id==='spear'){
  shaft(-.04,2.12,.049);facet(group,[[-.93,0,.07,.055],[-1.24,0,.19,.09],[-1.45,.015,.12,.057],[-2.16,0,.004,.004]],new THREE.Color(0xe3e3cd));
  for(const s of [-1,1])facet(group,[[-.99,s*.02,.035,.04],[-1.18,s*.13,.065,.055],[-1.41,s*.21,.003,.004]]);
  crystal(0,1.05,0,.07,.15,.07);
 }else if(id==='hammer'){
  shaft(-.39,1.67,.071);shell(0,-1.17,0,.81,.46,.52,metal);
  for(const side of [-1,1]){const cap=facet(group,[[0,0,.33,.32],[-.14,0,.43,.37],[-.28,0,.33,.27]]);cap.rotation.z=side*Math.PI/2;cap.position.set(side*.34,-1.17,0);}
  for(const z of [-.27,.27])shell(0,-1.17,z,.46,.31,.094,bone).rotation.z=.12;
  for(const z of [-.32,.32])crystal(0,-1.17,z,.23,.24,.07);
 }else{
  const bow=id==='crossbow';shell(0,0,.21,.21,.22,.71,metal);shell(0,-.16,0,.13,.28,.15,wrap);
  shell(0,.035,.72,.115,.12,.75,brass);crystal(0,.112,.41,.12,.11,.29);
  if(bow){
   shell(0,0,.46,.34,.27,.59,bone);shell(0,-.04,-.29,.19,.25,.53,wrap).rotation.x=-.13;
   crystal(0,.085,.92,.085,.07,.20);shell(0,-.02,-.18,.17,.15,.31,bone);
   for(const side of [-1,1]){const wing=facet(group,[[0,0,.09,.065],[-.29,.12,.142,.08],[-.59,.23,.105,.045],[-.78,.13,.005,.005]]);wing.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0,0,-1),new THREE.Vector3(-side,0,0),new THREE.Vector3(0,side,0)));wing.position.set(0,.045,.55);
    const feather=facet(group,[[0,0,.082,.055],[-.19,.07,.095,.044],[-.40,.13,.003,.003]],new THREE.Color(0x76b6a5));feather.quaternion.copy(wing.quaternion);feather.position.set(side*.22,.018,.39);
    const start=new THREE.Vector3(side*.78,.045,.42),end=new THREE.Vector3(0,.045,.04),dir=end.clone().sub(start);const string=cylinder(0,0,0,.012,.012,dir.length(),bone,group,5);string.position.copy(start).lerp(end,.5);string.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());}
  }else{
   shell(0,-.035,-.32,.245,.31,.52,wrap).rotation.x=-.16;
   shell(0,.04,.60,.225,.255,.83,metal);shell(0,.16,.49,.15,.13,.51,light);shell(0,-.22,0,.153,.32,.20,wrap).rotation.x=-.26;for(const z of [.63,.79,.95])shell(0,.06,z,.22,.21,.075,metal);
   for(const side of [-1,1]){
    const inlay=facet(group,[[0,0,.014,.014],[-.13,.036,.052,.022],[-.47,.018,.026,.018],[-.72,-.04,.003,.002]],new THREE.Color(0xb398e8));
    inlay.rotation.set(-Math.PI/2,0,Math.PI/2,'ZYX');inlay.position.set(side*.108,.044,.07);
   }
   const muzzle=shell(0,.04,1.08,.30,.16,.28,brass);muzzle.rotation.x=Math.PI/2;crystal(0,.04,1.15,.081,.08,.035);
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
 const attach=i=>{const m=weaponModels.get(id).clone();avatar.grips[i].add(m);if(avatar.body)m.scale.setScalar(.77);return m;};
 avatar.weaponId=id;avatar.weaponGroup=attach(1);if(id==='dual'){avatar.secondBlade=attach(0);avatar.secondBlade.rotation.y=Math.PI;}
 avatar.weaponGroup.rotation.x=WEAPONS[id].type==='ranged'?1.22:id==='spear'?-1.12:-.38;
}


// Right-hand poses are sampled at rest, wind-up, contact and recovery.
const weaponPoses={
 katana:[[-.57,-.34],[-1.92,-.96],[-.87,1.03]],
 spear:[[-.78,-.12],[-.59,-.34],[-1.72,.19]],
 dual:[[-.68,-.52],[-1.51,-.87],[-.84,.84]],
 hammer:[[-.86,-.46],[-2.88,-.26],[-.91,.28]],
 crossbow:[[-1.39,.15],[-1.44,.21],[-1.37,.14]],
 rifle:[[-1.17,.25],[-1.39,.17],[-1.01,.31]]
};
const supportSocket={spear:[0,-.34,0],hammer:[0,-.30,0],crossbow:[0,-.04,.36],rifle:[0,-.095,.42]};
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
 let y=a.body?1.79:1.64,z=.25,angle=elevation;
 if(id==='hammer'){y+=wind*.31+drive*.025;z+=drive*.045;angle=-2.10-wind*.98+drive*1.21;}
 if(id==='spear'){z+=drive*.095-wind*.14;angle=-1.53+wind*.23-drive*.06;}
 if(id==='rifle'){y+=.10;z-=recoil*.17;angle-=recoil*.13;}
 if(id==='crossbow'){y-=.11;z-=recoil*.06;angle-=recoil*.045;}
 handGoal.set(-side*.07,y,z);a.rig.localToWorld(handGoal);solvePalm(a,1,handGoal);
 a.rig.getWorldQuaternion(jointRot);turnHand.setFromEuler(new THREE.Euler(angle,0,id==='hammer'?side*(.33+.12*wind-.18*drive):0));jointRot.multiply(turnHand);
 a.grips[1].getWorldQuaternion(turnHand).invert();a.weaponGroup.quaternion.copy(turnHand.multiply(jointRot));
 handGoal.fromArray(supportSocket[id]);a.weaponGroup.localToWorld(handGoal);solvePalm(a,0,handGoal);
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
}



