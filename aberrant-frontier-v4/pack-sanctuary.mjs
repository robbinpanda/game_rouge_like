import fs from 'node:fs';

// Pack the Blender-authored Sanctuary Overlook & Three-Act Grand Panorama GLB for offline file:// builds.
export function packSanctuary(){
 const file=fs.readFileSync(new URL('../game-workbench/library/exports/回响远征/圣所全景/晴湾圣所全景.glb',import.meta.url));
 const end=20+file.readUInt32LE(12);
 const gltf=JSON.parse(file.subarray(20,end));
 if(!gltf.meshes?.length||gltf.images?.length||gltf.bufferViews.some(v=>v.byteStride)||gltf.accessors.some(a=>a.sparse)){
  throw Error('Unsupported sanctuary panorama export');
 }
 return {gltf,bin:file.subarray(end+8).toString('base64')};
}
