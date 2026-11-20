import fs from 'node:fs';

// This Blender export has one textured body and one skin. Store compact typed
// streams in the offline module so file:// never needs an external mesh loader.
export function packEmber(){
 const file=new URL('../game-workbench/library/models/ember-tripo/Ember_Tripo.glb',import.meta.url);
 const glb=fs.readFileSync(file), end=20+glb.readUInt32LE(12);
 const model=JSON.parse(glb.subarray(20,end)), data=glb.subarray(end+8);
 const types={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
 const sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
 function stream(id){
  const a=model.accessors[id], view=model.bufferViews[a.bufferView];
  if(view.byteStride||a.sparse)throw new Error('Unexpected interleaved Blender export');
  return new types[a.componentType](data.buffer,data.byteOffset+(view.byteOffset||0)+(a.byteOffset||0),a.count*sizes[a.type]);
 }
 const encode=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength).toString('base64');
 const primitive=model.meshes[0].primitives[0],a=primitive.attributes,skin=model.skins[0];
 if(model.accessors[a.POSITION].count>65535||model.meshes.length!==1||model.meshes[0].primitives.length!==1)throw new Error('Unexpected playable mesh layout');
 const weights=Uint8Array.from(stream(a.WEIGHTS_0),n=>Math.round(n*255));
 for(let i=0;i<weights.length;i+=4){
  const w=weights.subarray(i,i+4);w[w.indexOf(Math.max(...w))]+=255-w.reduce((s,n)=>s+n,0);
 }
 return {positions:encode(Int16Array.from(stream(a.POSITION),n=>Math.round(n*10000))),
  normals:encode(Int16Array.from(stream(a.NORMAL),n=>Math.round(n*32767))),uv:encode(stream(a.TEXCOORD_0)),
  joints:encode(Uint8Array.from(stream(a.JOINTS_0))),weights:encode(weights),
  indices:encode(Uint16Array.from(stream(primitive.indices))),inverseBind:encode(stream(skin.inverseBindMatrices)),
  bones:skin.joints.map(id=>{const n=model.nodes[id];return {name:n.name,children:(n.children||[]).map(j=>skin.joints.indexOf(j)),position:n.translation,rotation:n.rotation,scale:n.scale};})};
}
