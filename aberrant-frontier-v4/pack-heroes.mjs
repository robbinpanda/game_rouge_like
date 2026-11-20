import fs from 'node:fs';

// Pack the 4 Blender-authored rigged hero GLBs (frost, shade, bastion, reaper) for offline file:// builds.
export function packHeroes(){
 const base=new URL('../game-workbench/library/exports/回响远征/异变者/',import.meta.url);
 const map={frost:'霜序',shade:'岚影',bastion:'玄岩',reaper:'裂爪'};
 const out={};
 for(const [id,name] of Object.entries(map)){
  const file=fs.readFileSync(new URL(name+'.glb',base));
  const end=20+file.readUInt32LE(12);
  const gltf=JSON.parse(file.subarray(20,end));
  if(gltf.meshes.length!==1||gltf.meshes[0].primitives.length!==1||gltf.skins.length!==1||
    gltf.bufferViews.some(v=>v.byteStride)||gltf.accessors.some(a=>a.sparse)){
   throw Error('Unsupported hero export: '+name);
  }
  out[id]={gltf,bin:file.subarray(end+8).toString('base64')};
 }
 return out;
}
