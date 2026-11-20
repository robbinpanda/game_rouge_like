// All floor warnings use the same coordinates as their collision tests.
const footprintModes={disc:0,ring:1,line:2,sector:3};
const footprintPlane=new THREE.PlaneGeometry(2,2);
const footprintPool=[];
function floorFootprint(kind,from,to,width,color,arc=.9){
 const m=footprintPool.pop()||new THREE.Mesh(footprintPlane,new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,side:THREE.DoubleSide,
  uniforms:{tint:{value:new THREE.Color()},amount:{value:0},mode:{value:0},halfAngle:{value:0},flare:{value:0}},
  vertexShader:`varying vec2 local;
   void main(){local=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec2 local;uniform vec3 tint;uniform float amount,mode,halfAngle,flare;
   void main(){
    vec2 p=local;float r=length(p),edge=1.-r,flow=r;
    if(mode>1.5&&mode<2.5){edge=min(1.-abs(p.x),1.-abs(p.y));flow=.5-.5*p.y;}
    if(mode>.5&&mode<1.5){edge=min(edge,r-.5);flow=(r-.5)*2.;}
    if(mode>2.5){
     float a=abs(atan(p.x,-p.y+.00001));
     edge=min(edge,(halfAngle-a)*max(.2,r));
    }
    if(edge<0.)discard;
    float stroke=1.-smoothstep(.012,.048,edge);
    float sweep=(1.-smoothstep(.01,.055,abs(flow-amount)))*smoothstep(.02,.14,amount);
    float hatch=step(.77,fract((p.x+p.y)*14.))*.15;
    float fill=1.-smoothstep(amount,amount+.025,flow);
    float alpha=(.10+hatch*.42+fill*.32+max(stroke*.76,sweep*.48))*(1.-flare)+flare*(.37+stroke*.5);
    gl_FragColor=vec4(mix(tint,vec3(1.,.92,.8),max(stroke*.39,flare*.46)),alpha);
    #include <colorspace_fragment>
   }`
 }));
 m.position.copy(from);m.rotation.set(-Math.PI/2,0,0,'YXZ');
 if(kind==='line'||kind==='sector')m.rotation.y=Math.atan2(to.x-from.x,to.z-from.z);
 if(kind==='line'){
  m.position.lerp(to,.5);m.scale.set(width,Math.max(.05,from.distanceTo(to)/2),1);
 }else m.scale.set(width,width,1);
 const u=m.material.uniforms;
 u.tint.value.setHex(color);u.mode.value=footprintModes[kind];u.halfAngle.value=arc;u.amount.value=0;u.flare.value=0;
 m.renderOrder=2;effects.add(m);return m;
}
function releaseFootprint(m){
 m.removeFromParent();
 if(footprintPool.length<24)footprintPool.push(m);else m.material.dispose();
}

const groundFlashes=[];
function floorImpact(h){
 const m=floorFootprint(h.kind,h.from,h.to,h.width,h.charged?0x66cfff:h.owner?0xff6442:0xffa239,h.arc);
 m.material.uniforms.flare.value=1;
 m.position.y+=.015;groundFlashes.push({m,life:.24});
}

const elementalWaves=[];
function elementalBurst(element,radius){
 const center=player.group.position.clone(),color=element==='frost'?0x8cdeff:0xff8d41;
 elementalWaves.push({center,element,radius,elapsed:0,hit:new Set()});
 pulseAt(center,radius,color);impactSpray(center.clone().setY(1),color,true);
 cue(element==='frost'?'ice':'fire',center);
}
function stepElementalWaves(dt){
 for(let i=elementalWaves.length-1;i>=0;i--){
  const wave=elementalWaves[i];wave.elapsed+=dt;
  const radius=wave.radius*Math.min(1,wave.elapsed/.31);
  for(const e of enemies){
   const p=e.avatar.group.position;
   if(e.dead||wave.hit.has(e)||p.distanceTo(wave.center)>radius||obstructed(wave.center,p))continue;
   wave.hit.add(e);
   if(wave.element==='ember'){
    damageEnemy(e,65,'player',null,{heavy:true});e.burn=5;
   }else{
    if(e.frozen>0&&rank('stillpoint')){
     impactSpray(p.clone().add(new THREE.Vector3(0,1.1,0)),0xb7fcff,true);queueEcho(e,32);
    }
    damageEnemy(e,42,'player',null,{heavy:true});e.frozen=e.boss?.48:2.15;e.slow=5;
   }
  }
  if(radius>=wave.radius)elementalWaves.splice(i,1);
 }
}
function updateGroundFlashes(dt){
 for(let i=groundFlashes.length-1;i>=0;i--){
  const flash=groundFlashes[i];flash.life-=dt;
  if(flash.life<=0){releaseFootprint(flash.m);groundFlashes.splice(i,1);}
  else flash.m.material.uniforms.flare.value=flash.life/.24;
 }
}
function monsterImpact(h){
 floorImpact(h);
 const tint=h.charged?0x81ddff:0xff8759,origin=h.from.clone();
 if(h.kind==='line'){
  const end=h.to.clone();
  drawTrail(origin.clone().setY(.45),end.clone().setY(.45),tint,.29,h.width*.27);
  for(const side of [-1,1]){
   const delta=end.clone().sub(origin).normalize(),offset=new THREE.Vector3(delta.z,0,-delta.x).multiplyScalar(side*h.width*.78);
   drawTrail(origin.clone().add(offset).setY(.21),end.clone().add(offset).setY(.21),tint,.36,.062);
  }
  impactSpray(end.setY(.45),tint,true);
 }else if(h.kind==='sector'){
  const heading=Math.atan2(h.to.x-h.from.x,h.to.z-h.from.z),path=[];
  for(let i=0;i<=12;i++){
   const a=heading-h.arc+i*h.arc/6;
   path.push(origin.clone().add(new THREE.Vector3(Math.sin(a)*h.width,.66+Math.sin(i*Math.PI/12)*.83,Math.cos(a)*h.width)));
  }
  for(let i=1;i<path.length;i++)drawTrail(path[i-1],path[i],tint,.22+i*.009,.12);
  impactSpray(path[8],tint,true);
 }else{
  pulseAt(origin,h.width,tint);impactSpray(origin.setY(.38),tint,true);
 }
 if(h.owner.boss)shake=Math.max(shake,.13);
 cue(h.owner.kind==='hound'?'pounce':h.kind==='line'?'rail':'slam',h.from);
}

function enemyHitAccent(e,heavy,broken){
 if(!heavy&&!broken)return;
 const p=e.avatar.group.position,center=p.clone().add(new THREE.Vector3(0,e.hitHeight||1.4,0));
 if(broken){
  counterFlash(center);pulseAt(p,1.9,0xffce82);cue('break',p);
  calloutAt(p,'破势！','gold');
 }else{
  const side=new THREE.Vector3(Math.cos(yaw),0,Math.sin(yaw));
  const from=center.clone().addScaledVector(side,-.85),to=center.clone().addScaledVector(side,.85);
  from.y+=.55;to.y-=.35;drawTrail(from,to,0xffeac9,.16,.09);
 }
}

// 360-degree directional threat arcs around the player's feet (for offscreen attack awareness)
const threatArcs=[],threatArcGeo=new THREE.RingGeometry(1.18,1.52,16,1,-.34,.68);
function updateThreatIndicators(){
 for(const arc of threatArcs)arc.visible=false;
 if(state!=='playing'||run.status!=='combat')return;
 const p=player.group.position;let idx=0;
 for(const e of enemies){
  if(e.dead||e.windup<=0)continue;
  let meshObj=threatArcs[idx];
  if(!meshObj){
   meshObj=new THREE.Mesh(threatArcGeo,new THREE.MeshBasicMaterial({color:0xff7b4d,transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false}));
   meshObj.rotation.x=-Math.PI/2;meshObj.renderOrder=3;effects.add(meshObj);threatArcs.push(meshObj);
  }
  const dx=e.avatar.group.position.x-p.x,dz=e.avatar.group.position.z-p.z;
  meshObj.position.set(p.x,.11,p.z);
  meshObj.rotation.z=Math.atan2(-dz,dx);
  meshObj.material.color.setHex(e.charge?0x4bd2ff:0xff7147);
  meshObj.material.opacity=.62+.32*Math.sin(time*26);
  meshObj.visible=true;idx++;
 }
}

// Magnetic coin/shard orbs + crystalline death shatter
const magnetOrbs=[];
function spawnMagnetOrbs(pos,count=4,color=0xffd978,shardValue=0){
 for(let i=0;i<count;i++){
  const m=particlePool.acquire(crystalGeo,pos.clone().add(new THREE.Vector3(0,1.0,0)),color,1);
  m.scale.set(.14,.22,.14);
  const a=visualRoll()*Math.PI*2,spd=2.5+visualRoll()*3.5;
  magnetOrbs.push({m,v:new THREE.Vector3(Math.cos(a)*spd,3.8+visualRoll()*2.5,Math.sin(a)*spd),age:0,shard:i===0?shardValue:0,color});
 }
}
function updateMagnetOrbs(dt){
 const target=player.group.position.clone().add(new THREE.Vector3(0,1.2,0));
 for(let i=magnetOrbs.length-1;i>=0;i--){
  const o=magnetOrbs[i];o.age+=dt;
  o.m.rotation.y+=dt*6;
  if(o.age<.24){o.v.y-=14*dt;o.m.position.addScaledVector(o.v,dt);}
  else{
   const dir=target.clone().sub(o.m.position),d=dir.length();
   if(d<.65||o.age>2.4){
    if(o.shard&&typeof awardShards==='function')awardShards(o.shard);
    cue('coin');
    particlePool.release(o.m);magnetOrbs.splice(i,1);continue;
   }
   o.m.position.addScaledVector(dir.normalize(),Math.min(d,(14+o.age*16)*dt));
  }
 }
}
function clearMagnetOrbs(){
 for(const o of magnetOrbs)particlePool.release(o.m);
 magnetOrbs.length=0;
}
function crystalShatterDeath(e){
 const p=e.avatar.group.position.clone().add(new THREE.Vector3(0,e.hitHeight||1.2,0));
 const tint=e.boss?acts[run.act].accent:(monsters[e.kind]?.color||0xf4be80);
 particlesAt(p,tint,e.boss?42:22,e.boss?9:6.2);
 particlesAt(p,0xfff3d4,e.boss?24:10,e.boss?7:4.5);
 impactSpray(p,tint,true);
 pulseAt(e.avatar.group.position,e.boss?6.5:2.8,tint);
 const orbCount=e.boss?12:e.elite?6:e.swarmer?1:3;
 const shardDrop=e.boss?(18+run.act*8):e.elite?5:(e.swarmer?0:1);
 spawnMagnetOrbs(e.avatar.group.position,orbCount,e.boss?0xcfa6ff:0xffd878,shardDrop);
}
function calloutAt(position,text,tone='gold'){
 if(typeof document==='undefined'||!$('floats'))return;
 vec.copy(position);vec.y+=3.15;vec.project(camera);if(vec.z>1)return;
 const el=document.createElement('div');
 el.className='damage-number callout '+tone;
 el.textContent=text;
 el.style.left=((vec.x*.5+.5)*innerWidth)+'px';
 el.style.top=((-vec.y*.5+.5)*innerHeight)+'px';
 $('floats').appendChild(el);
 setTimeout(()=>el.remove(),1050);
}
