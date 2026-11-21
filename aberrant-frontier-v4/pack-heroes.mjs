import fs from 'node:fs';

// Pack all 5 rigged Tripo retopo hero GLBs (ember, frost, shade, bastion, reaper)
// into compact quantized streams for offline file:// builds.
function packRiggedHero(file){
 const glb=fs.readFileSync(file), end=20+glb.readUInt32LE(12);
 const model=JSON.parse(glb.subarray(20,end)), data=glb.subarray(end+8);
 const types={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
 const sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
 function stream(id){
  const a=model.accessors[id], view=model.bufferViews[a.bufferView];
  if(view.byteStride||a.sparse)throw new Error('Unexpected interleaved hero export: '+file);
  return new types[a.componentType](data.buffer,data.byteOffset+(view.byteOffset||0)+(a.byteOffset||0),a.count*sizes[a.type]);
 }
 const encode=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength).toString('base64');
 const primitive=model.meshes[0].primitives[0], a=primitive.attributes, skin=model.skins[0];
 if(model.accessors[a.POSITION].count>65535||model.meshes.length!==1||model.meshes[0].primitives.length!==1)
  throw new Error('Unsupported hero export layout: '+file);
 const weights=Uint8Array.from(stream(a.WEIGHTS_0),n=>Math.round(n*255));
 for(let i=0;i<weights.length;i+=4){
  const w=weights.subarray(i,i+4);w[w.indexOf(Math.max(...w))]+=255-w.reduce((s,n)=>s+n,0);
 }
 return {
  positions:encode(Int16Array.from(stream(a.POSITION),n=>Math.round(Math.max(-32767,Math.min(32767,n*10000))))),
  normals:encode(Int16Array.from(stream(a.NORMAL),n=>Math.round(Math.max(-32767,Math.min(32767,n*32767))))),
  uv:encode(Uint16Array.from(stream(a.TEXCOORD_0),n=>Math.round(Math.max(0,Math.min(1,n))*65535))),
  joints:encode(Uint8Array.from(stream(a.JOINTS_0))),
  weights:encode(weights),
  indices:encode(Uint16Array.from(stream(primitive.indices))),
  inverseBind:encode(stream(skin.inverseBindMatrices)),
  bones:skin.joints.map(id=>{
   const n=model.nodes[id];
   return {name:n.name,children:(n.children||[]).map(j=>skin.joints.indexOf(j)).filter(j=>j>=0),position:n.translation,rotation:n.rotation,scale:n.scale};
  })
 };
}

export function packHeroes(){
 const base=new URL('../game-workbench/library/exports/回响远征/异变者/',import.meta.url);
 const map={ember:'烬刃',frost:'霜序',shade:'岚影',bastion:'玄岩',reaper:'裂爪'};
 const out={};
 for(const [id,name] of Object.entries(map)){
  out[id]=packRiggedHero(new URL(name+'.glb',base));
 }
 return out;
}
