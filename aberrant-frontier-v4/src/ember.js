let emberGeometry, emberMaterial, emberToonSteps, emberBaseTexture;
const emberMaterials = [];
const heroBodyStyles = {
 ember:   { tint: 0xffffff, emissive: 0x240c08, scale: [1.34, 1.34, 1.34] },
 frost:   { tint: 0xbfeaff, emissive: 0x0b2638, scale: [1.28, 1.33, 1.28] },
 shade:   { tint: 0xcab6ff, emissive: 0x1d0f3d, scale: [1.29, 1.34, 1.29] },
 bastion: { tint: 0xf2dbb8, emissive: 0x24190c, scale: [1.46, 1.38, 1.42] },
 reaper:  { tint: 0xc2f0cf, emissive: 0x0c281c, scale: [1.34, 1.34, 1.34] }
};
function unpackEmber(encoded, Type) {
 const binary = atob(encoded);
 const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
 return new Type(bytes.buffer);
}

function createEmber(type = 'ember') {
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
  emberToonSteps = new THREE.DataTexture(new Uint8Array([135,135,135,255,176,176,176,255,224,224,224,255,248,248,248,255]),4,1);
  emberToonSteps.minFilter = emberToonSteps.magFilter = THREE.NearestFilter; emberToonSteps.needsUpdate = true;
  emberMaterial = new THREE.MeshToonMaterial({gradientMap:emberToonSteps});
 }
 const style = heroBodyStyles[type] || heroBodyStyles.ember;
 const bodyMat = new THREE.MeshToonMaterial({
  color: style.tint,
  emissive: style.emissive,
  emissiveIntensity: .32,
  gradientMap: emberToonSteps,
  map: emberBaseTexture || null
 });
 emberMaterials.push(bodyMat);
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
 const body = new THREE.SkinnedMesh(emberGeometry, bodyMat);
 body.name = (HEROES[type]?.name || '烬刃') + ' · 远征装'; body.castShadow = true; body.receiveShadow = true; body.frustumCulled = false;
 model.add(body); body.bind(skeleton,new THREE.Matrix4());
 if(typeof getCelOutlineMaterial==='function'){
  const outline=new THREE.SkinnedMesh(emberGeometry,getCelOutlineMaterial(.011));
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
 model.scale.set(...style.scale);
 group.rotation.y = Math.PI; actors.add(group);
 return {type, human:true, group,rig,arms,legs,elbows,knees,grips,skeleton,body,baseTint:style.tint,
  phase:0, attack:0,hurt:0,weaponGroup:null,weaponId:null};
}

const heroGeometryCache = new Map();
const heroTextureCache = new Map();
const heroBodyBindings = [];
function getHeroBaseTexture(type) {
 if (typeof Image === 'undefined') return null;
 if (!heroTextureCache.has(type)) {
  let url = null;
  try { url = assetURL('hero-' + type + '.webp'); } catch { return null; }
  if (!url) return null;
  const map = new THREE.TextureLoader().load(url);
  map.flipY = false;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  heroTextureCache.set(type, map);
 }
 return heroTextureCache.get(type);
}
function createHeroModel(type) {
 const asset = typeof heroFiles !== 'undefined' ? heroFiles[type] : null;
 if (!asset) return createEmber(type);
 let cached = heroGeometryCache.get(type);
 if (!cached) {
  const geo = new THREE.BufferGeometry();
  const coordinates = Float32Array.from(unpackEmber(asset.positions, Int16Array), n => n * .0001);
  geo.setAttribute('position', new THREE.BufferAttribute(coordinates, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(unpackEmber(asset.normals, Int16Array), 3, true));
  if (asset.uv) geo.setAttribute('uv', new THREE.BufferAttribute(unpackEmber(asset.uv, Uint16Array), 2, true));
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(unpackEmber(asset.joints, Uint8Array), 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(unpackEmber(asset.weights, Uint8Array), 4, true));
  geo.setIndex(new THREE.BufferAttribute(unpackEmber(asset.indices, Uint16Array), 1));
  const invArr = unpackEmber(asset.inverseBind, Float32Array);
  const inverses = asset.bones.map((_, i) => new THREE.Matrix4().fromArray(invArr, i * 16));
  cached = { geo, inverses, bones: asset.bones };
  heroGeometryCache.set(type, cached);
 }
 if (!emberToonSteps) {
  emberToonSteps = new THREE.DataTexture(new Uint8Array([145,145,145,255,186,186,186,255,228,228,228,255,250,250,250,255]),4,1);
  emberToonSteps.minFilter = emberToonSteps.magFilter = THREE.NearestFilter; emberToonSteps.needsUpdate = true;
 }
 const { geo, inverses, bones: boneDefs } = cached;
 const bodyMat = new THREE.MeshToonMaterial({
  color: 0xffffff,
  map: getHeroBaseTexture(type),
  emissive: 0x16141a,
  emissiveIntensity: .14,
  gradientMap: emberToonSteps,
  side: THREE.DoubleSide
 });
 heroBodyBindings.push({ type, mat: bodyMat });
 const group = new THREE.Group(), rig = new THREE.Group(), model = new THREE.Group();
 group.add(rig); rig.add(model);
 const bones = boneDefs.map(def => {
  const b = new THREE.Bone();
  b.name = def.name;
  if (def.position) b.position.fromArray(def.position);
  if (def.rotation) b.quaternion.fromArray(def.rotation);
  if (def.scale) b.scale.fromArray(def.scale);
  return b;
 });
 boneDefs.forEach((def, i) => {
  for (const ch of (def.children || [])) bones[i].add(bones[ch]);
 });
 model.add(...bones.filter(b => !b.parent));
 const skeleton = new THREE.Skeleton(bones, inverses);
 const body = new THREE.SkinnedMesh(geo, bodyMat);
 body.name = (HEROES[type]?.name || type) + ' · Tripo 精修骨骼';
 body.castShadow = true; body.receiveShadow = true; body.frustumCulled = false;
 model.add(body); body.bind(skeleton, new THREE.Matrix4());
 if (typeof getCelOutlineMaterial === 'function') {
  const outline = new THREE.SkinnedMesh(geo, getCelOutlineMaterial(.0095));
  outline.castShadow = false; outline.receiveShadow = false; outline.frustumCulled = false;
  model.add(outline); outline.bind(skeleton, new THREE.Matrix4());
 }
 function jointPivot(name, parent = model) {
  const bone = bones.find(b => b.name === name), pivot = new THREE.Group();
  const rest = new THREE.Group(); bone.getWorldPosition(rest.position); model.add(rest);
  if (parent !== model) parent.attach(rest); rest.add(pivot); pivot.attach(bone);
  return pivot;
 }
 const arms = ['upper_arm.L', 'upper_arm.R'].map(name => jointPivot(name));
 const legs = ['thigh.L', 'thigh.R'].map(name => jointPivot(name));
 const elbows = ['forearm.L', 'forearm.R'].map((name, i) => jointPivot(name, arms[i]));
 const knees = ['shin.L', 'shin.R'].map((name, i) => jointPivot(name, legs[i]));
 const grips = ['hand.L', 'hand.R'].map(name => {
  const hand = bones.find(b => b.name === name), socket = new THREE.Group();
  hand.getWorldPosition(socket.position); socket.position.y -= .055;
  model.add(socket); hand.attach(socket); return socket;
 });
 const heroScale = type === 'bastion' ? 1.36 : type === 'reaper' ? 1.34 : 1.32;
 model.scale.setScalar(heroScale);
 const regalia = new THREE.Group(); regalia.position.set(0, 1.98, -.16); rig.add(regalia);
 group.rotation.y = Math.PI; actors.add(group);
 return { type, human: true, group, rig, arms, legs, elbows, knees, grips, skeleton, body, baseTint: 0xffffff,
  regalia, regaliaResources: [bodyMat], phase: 0, attack: 0, hurt: 0, weaponGroup: null, weaponId: null };
}

function loadEmberTextures(){
 if(typeof Image==='undefined')return;
 const loader=new THREE.TextureLoader();
 const load=(name,srgb=false)=>{
  const map=loader.load(assetURL('tripo-'+name+'.webp'));
  map.flipY=false;if(srgb)map.colorSpace=THREE.SRGBColorSpace;return map;
 };
 emberBaseTexture = load('basecolor',true);
 if (emberMaterial) { emberMaterial.map = emberBaseTexture; emberMaterial.needsUpdate = true; }
 for(const m of emberMaterials){m.map = emberBaseTexture; m.needsUpdate = true;}
 for(const b of heroBodyBindings){
  if(!b.mat.map){b.mat.map = getHeroBaseTexture(b.type); b.mat.needsUpdate = true;}
 }
}
