const creatureTemplates=new Map();
const strikeClips={hound:['Pounce'],crab:['ClawSweep'],ray:['NeedleFan'],bloom:['CrystalFall'],
 warden:['RailCharge','BreakerSweep'],carrier:['DepthBomb','Broadside'],crown:['MirrorRing','PetalVolley']};
var creatureToonRamp,creatureOutlineMat;
function getCreatureToonRamp(){
 if(creatureToonRamp)return creatureToonRamp;
 const ramp=new THREE.DataTexture(new Uint8Array([108,116,136,255,168,174,186,255,222,226,232,255,255,255,255,255]),4,1);
 ramp.minFilter=ramp.magFilter=THREE.NearestFilter;ramp.needsUpdate=true;
 creatureToonRamp=ramp;return ramp;
}
function getCelOutlineMaterial(thickness=.028){
 if(creatureOutlineMat&&thickness===.028)return creatureOutlineMat;
 const m=new THREE.MeshBasicMaterial({color:0x1b2d3a,side:THREE.BackSide});
 m.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\ntransformed += objectNormal * ${thickness.toFixed(4)};`);
 };
 if(thickness===.028)creatureOutlineMat=m;
 return m;
}
function getCreatureTemplate(id){
 if(creatureTemplates.has(id))return creatureTemplates.get(id);
 const {gltf,bin}=creatureFiles[id],buffer=unpackEmber(bin,Uint8Array).buffer;
 const types={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
 const sizes={SCALAR:1,VEC3:3,VEC4:4,MAT4:16};
 function attribute(i){
  const a=gltf.accessors[i],v=gltf.bufferViews[a.bufferView],size=sizes[a.type];
  const data=new types[a.componentType](buffer,(v.byteOffset||0)+(a.byteOffset||0),a.count*size);
  return new THREE.BufferAttribute(data,size,!!a.normalized);
 }
 const primitive=gltf.meshes[0].primitives[0],geometry=new THREE.BufferGeometry();
 const names={POSITION:'position',NORMAL:'normal',COLOR_0:'color',JOINTS_0:'skinIndex',WEIGHTS_0:'skinWeight'};
 for(const [name,key] of Object.entries(names))geometry.setAttribute(key,attribute(primitive.attributes[name]));
 geometry.setIndex(attribute(primitive.indices));
 const material=new THREE.MeshToonMaterial({vertexColors:true,gradientMap:getCreatureToonRamp(),side:THREE.DoubleSide,emissive:0x000000,emissiveIntensity:0});
 const skin=gltf.skins[0],matrices=attribute(skin.inverseBindMatrices).array;
 const inverses=skin.joints.map((_,i)=>new THREE.Matrix4().fromArray(matrices,16*i));
 const clips=gltf.animations.map(animation=>{
  const tracks=animation.channels.map(channel=>{
   const sampler=animation.samplers[channel.sampler],target=channel.target,rotation=target.path==='rotation';
   const Track=rotation?THREE.QuaternionKeyframeTrack:THREE.VectorKeyframeTrack;
   const prop=rotation?'quaternion':target.path==='translation'?'position':'scale';
   return new Track('node_'+target.node+'.'+prop,attribute(sampler.input).array,attribute(sampler.output).array,
    sampler.interpolation==='STEP'?THREE.InterpolateDiscrete:THREE.InterpolateLinear);
  });
  return new THREE.AnimationClip(animation.name,-1,tracks);
 });
 const template={gltf,geometry,material,skin,inverses,clips};
 creatureTemplates.set(id,template);return template;
}
function makeCreature(kind,boss,elite){
 const id=boss?bossArt[run.act]:kind;
 const {gltf,geometry,material,skin,inverses,clips}=getCreatureTemplate(id);
 const instMat=material.clone();
 const body=new THREE.SkinnedMesh(geometry,instMat),group=new THREE.Group(),rig=new THREE.Group();
 group.add(rig);body.castShadow=true;body.receiveShadow=true;body.frustumCulled=false;
 const outline=new THREE.SkinnedMesh(geometry,getCelOutlineMaterial(boss?.044:elite?.036:.028));
 outline.castShadow=false;outline.receiveShadow=false;outline.frustumCulled=false;
 const nodes=gltf.nodes.map((def,i)=>{
  const node=def.mesh!==undefined?body:skin.joints.includes(i)?new THREE.Bone():new THREE.Group();
  node.name='node_'+i;node.userData.sourceName=def.name;
  if(def.translation)node.position.fromArray(def.translation);
  if(def.rotation)node.quaternion.fromArray(def.rotation);
  if(def.scale)node.scale.fromArray(def.scale);
  return node;
 });
 gltf.nodes.forEach((def,i)=>(def.children||[]).forEach(child=>nodes[i].add(nodes[child])));
 for(const i of gltf.scenes[gltf.scene??0].nodes)rig.add(nodes[i]);
 body.parent.add(outline);outline.position.copy(body.position);outline.quaternion.copy(body.quaternion);outline.scale.copy(body.scale);
 rig.updateMatrixWorld(true);
 const skeleton=new THREE.Skeleton(skin.joints.map(i=>nodes[i]),inverses);
 body.bind(skeleton,body.matrixWorld.clone());
 outline.bind(skeleton,body.matrixWorld.clone());
 const mixer=new THREE.AnimationMixer(rig),actions=Object.fromEntries(clips.map(c=>[c.name,mixer.clipAction(c)]));
 const avatar={id,type:kind,group,rig,body,outline,instMat,skeleton,mixer,actions,active:null,oneshot:0,hpGroup:new THREE.Group(),hurt:0};
 group.scale.setScalar(elite?1.32:1);actors.add(group);playCreatureClip(avatar,'Idle');
 avatar.active.time=visualRoll()*avatar.active.getClip().duration;
 return avatar;
}
function playCreatureClip(a,name,seconds=0){
 const action=a.actions[name];
 if(!seconds&&action===a.active)return;
 const previous=a.active;action.reset();action.enabled=true;action.clampWhenFinished=!!seconds;
 action.setLoop(seconds?THREE.LoopOnce:THREE.LoopRepeat,seconds?1:Infinity);
 action.setEffectiveTimeScale(seconds?action.getClip().duration/seconds:1);action.setEffectiveWeight(1);
 if(previous&&previous!==action){previous.fadeOut(.08);action.fadeIn(.08);}
 action.play();a.active=action;a.oneshot=seconds;
}
function tickCreatureAnimation(e,dt,moving){
 const a=e.avatar;
 if(a.hurt>0)a.hurt=Math.max(0,a.hurt-dt);
 if(a.instMat){
  if(a.hurt>.08){a.instMat.emissive.setHex(0xffffff);a.instMat.emissiveIntensity=.92;}
  else if(a.hurt>0){a.instMat.emissive.setHex(0xffb574);a.instMat.emissiveIntensity=.45;}
  else if(e.frozen>0){a.instMat.emissive.setHex(0x7be8ff);a.instMat.emissiveIntensity=.55;}
  else if(e.heat>0||e.burn>0){a.instMat.emissive.setHex(0xff6b2e);a.instMat.emissiveIntensity=.28+.12*Math.sin(time*14);}
  else if(e.charge&&e.windup>0){a.instMat.emissive.setHex(0x4bc8ff);a.instMat.emissiveIntensity=.32+.2*Math.sin(time*24);}
  else if(e.phaseShift&&e.boss){a.instMat.emissive.setHex(0xff6f4a);a.instMat.emissiveIntensity=.14+.08*Math.sin(time*8);}
  else if(e.variantGlow){a.instMat.emissive.setHex(e.variantGlow);a.instMat.emissiveIntensity=.10+.05*Math.sin(time*5+e.avatar.group.position.x);}
  else{a.instMat.emissive.setHex(0x000000);a.instMat.emissiveIntensity=0;}
 }
 // Subtle anime squash & stretch hit recoil
 const squash=a.hurt>0?Math.sin(a.hurt/.22*Math.PI)*.13:0;
 a.rig.scale.set(1+squash,1-squash*.72,1+squash);
 if(e.frozen>0)return;
 if(a.oneshot<=0)playCreatureClip(a,moving?'Move':'Idle');
 a.mixer.update(dt);a.oneshot=Math.max(0,a.oneshot-dt);
}
function releaseCreature(a){a.mixer.stopAllAction();a.mixer.uncacheRoot(a.rig);a.skeleton.dispose();a.instMat?.dispose();}
