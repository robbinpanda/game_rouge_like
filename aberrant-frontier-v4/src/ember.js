let emberGeometry, emberMaterial;
function unpackEmber(encoded, Type) {
 const binary = atob(encoded);
 const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
 return new Type(bytes.buffer);
}

function createEmber() {
 if (!emberGeometry) {
  const a = emberAsset;
  emberGeometry = new THREE.BufferGeometry();
  const coordinates = Float32Array.from(unpackEmber(a.positions, Int16Array), n => n * .0001);
  emberGeometry.setAttribute('position', new THREE.BufferAttribute(coordinates, 3));
  emberGeometry.setAttribute('normal', new THREE.BufferAttribute(unpackEmber(a.normals, Int16Array), 3, true));
  emberGeometry.setAttribute('uv',new THREE.BufferAttribute(unpackEmber(a.uv,Float32Array),2));
  emberGeometry.setAttribute('skinIndex', new THREE.BufferAttribute(unpackEmber(a.joints, Uint8Array), 4));
  emberGeometry.setAttribute('skinWeight', new THREE.BufferAttribute(unpackEmber(a.weights, Uint8Array), 4, true));
  emberGeometry.setIndex(new THREE.BufferAttribute(unpackEmber(a.indices, Uint16Array), 1));
  const steps=new THREE.DataTexture(new Uint8Array([135,135,135,255,176,176,176,255,224,224,224,255,248,248,248,255]),4,1);
  steps.minFilter=steps.magFilter=THREE.NearestFilter;steps.needsUpdate=true;
  emberMaterial = new THREE.MeshToonMaterial({gradientMap:steps});
 }
 const group = new THREE.Group(), rig = new THREE.Group(), model = new THREE.Group();
 group.add(rig); rig.add(model);
 const bones = emberAsset.bones.map(def => {
  const b = new THREE.Bone(); b.name = def.name;
  if (def.position) b.position.fromArray(def.position);
  if (def.rotation) b.quaternion.fromArray(def.rotation);
  if (def.scale) b.scale.fromArray(def.scale);
  return b;
 });
 emberAsset.bones.forEach((def,i) => def.children.forEach(child => bones[i].add(bones[child])));
 model.add(...bones.filter(b => !b.parent));
 const inverses = unpackEmber(emberAsset.inverseBind, Float32Array);
 const skeleton = new THREE.Skeleton(bones,bones.map((_,i) => new THREE.Matrix4().fromArray(inverses,i*16)));
 const body = new THREE.SkinnedMesh(emberGeometry, emberMaterial);
 body.name = '烬刃 · 远征装'; body.castShadow = true; body.receiveShadow = true; body.frustumCulled = false;
 model.add(body); body.bind(skeleton,new THREE.Matrix4());
 if(typeof getCelOutlineMaterial==='function'){
  const outline=new THREE.SkinnedMesh(emberGeometry,getCelOutlineMaterial(.012));
  outline.castShadow=false;outline.receiveShadow=false;outline.frustumCulled=false;
  model.add(outline);outline.bind(skeleton,new THREE.Matrix4());
 }
 // Game animations rotate upright pivots. Keep the artist's bind transforms
 // below them, so a shoulder swing deforms the elbow, fingers and sleeve too.
 function jointPivot(name, parent=model) {
  const bone = bones.find(b => b.name === name), pivot = new THREE.Group();
  const rest=new THREE.Group();bone.getWorldPosition(rest.position);model.add(rest);
  if(parent!==model)parent.attach(rest);rest.add(pivot);pivot.attach(bone);
  return pivot;
 }
 const arms = ['upper_arm.L','upper_arm.R'].map(name => jointPivot(name));
 const legs = ['thigh.L','thigh.R'].map(name => jointPivot(name));
 const elbows = ['forearm.L','forearm.R'].map((name,i)=>jointPivot(name,arms[i]));
 const knees = ['shin.L','shin.R'].map((name,i)=>jointPivot(name,legs[i]));
 // An upright grip socket in each palm takes all six interchangeable weapons.
 const grips = ['hand.L','hand.R'].map(name => {
  const hand = bones.find(b => b.name === name), socket = new THREE.Group();
  hand.getWorldPosition(socket.position); socket.position.y -= .055;
  model.add(socket); hand.attach(socket); return socket;
 });
 model.scale.setScalar(1.34);
 group.rotation.y = Math.PI; actors.add(group);
 return {type:'ember', human:true, group,rig,arms,legs,elbows,knees,grips,skeleton,body,
  phase:0, attack:0,hurt:0,weaponGroup:null,weaponId:null};
}

function loadEmberTextures(){
 if(typeof Image==='undefined')return;
 const loader=new THREE.TextureLoader();
 const load=(name,srgb=false)=>{
  const map=loader.load(assetURL('tripo-'+name+'.webp'));
  map.flipY=false;if(srgb)map.colorSpace=THREE.SRGBColorSpace;return map;
 };
 emberMaterial.map=load('basecolor',true);
 emberMaterial.needsUpdate=true;
}
