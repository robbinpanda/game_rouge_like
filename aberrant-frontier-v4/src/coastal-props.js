const coastalModels=new Map();
const coastalAtlasMaterials=new Map();
let coastalAtlasMaterial;
function getCoastalAtlasMaterial(atlasKey='twelve'){
 if(!coastalAtlasMaterials.has(atlasKey)){
  let map=null;
  const src=(coastalFiles.atlases&&coastalFiles.atlases[atlasKey])||coastalFiles.atlas;
  if(typeof Image!=='undefined'&&src){
   map=new THREE.TextureLoader().load(src);
   map.flipY=false;
   map.colorSpace=THREE.SRGBColorSpace;
   map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  }
  const m=new THREE.MeshStandardMaterial({map,roughness:.82,metalness:.05});
  coastalAtlasMaterials.set(atlasKey,m);
  if(atlasKey==='twelve'||!coastalAtlasMaterial)coastalAtlasMaterial=m;
 }
 return coastalAtlasMaterials.get(atlasKey);
}
function placeCoastalProp(id,parent,x,y,z,size=null,cloneMaterial=false){
 if(!coastalModels.has(id)){
  const asset=coastalFiles.props[id],geo=new THREE.BufferGeometry();
  const pos=Float32Array.from(unpackEmber(asset.position,Int16Array),v=>v*asset.posScale);
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('normal',new THREE.BufferAttribute(unpackEmber(asset.normal,Int16Array),3,true));
  if(asset.uv)geo.setAttribute('uv',new THREE.BufferAttribute(unpackEmber(asset.uv,Uint16Array),2,true));
  if(asset.color)geo.setAttribute('color',new THREE.BufferAttribute(unpackEmber(asset.color,Float32Array),3));
  geo.setIndex(new THREE.BufferAttribute(unpackEmber(asset.index,Uint16Array),1));
  // The recovered rail segment sits diagonally in the upload. Align its sleepers for tiling.
  if(id==='rail')geo.rotateY(.171);
  geo.computeBoundingBox();
  const bounds=geo.boundingBox,dimensions=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  geo.translate(-center.x,-bounds.min.y,-center.z);
  const material=asset.uv?getCoastalAtlasMaterial(asset.atlas||'twelve'):new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78});
  coastalModels.set(id,{geo,material,dimensions});
 }
 const {geo,material,dimensions}=coastalModels.get(id);
 const useMat=cloneMaterial?material.clone():material;
 const model=mesh(geo,useMat,x,y,z,parent);model.name=coastalFiles.props[id].name;
 if(size)model.scale.set(size[0]/dimensions.x,size[1]/dimensions.y,size[2]/dimensions.z);
 return model;
}
