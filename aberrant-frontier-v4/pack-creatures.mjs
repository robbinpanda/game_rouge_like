import fs from 'node:fs';

// Use the same GLBs that the workbench previews. Keep typed streams binary for file://.
export function packCreatures(){
 const library=new URL('../game-workbench/library/',import.meta.url);
 const manifest=JSON.parse(fs.readFileSync(new URL('echo-art/manifest.json',library),'utf8'));
 const assets={};
 for(const a of manifest.assets.filter(a=>a.group==='creatures'||a.group==='bosses')){
  const folder=a.group==='bosses'?'区域首领':'小怪';
  const file=fs.readFileSync(new URL('exports/回响远征/'+folder+'/'+a.name+'.glb',library));
  const end=20+file.readUInt32LE(12);
  const gltf=JSON.parse(file.subarray(20,end));
  if(gltf.meshes.length!==1||gltf.meshes[0].primitives.length!==1||gltf.skins.length!==1||gltf.images?.length||
    gltf.bufferViews.some(v=>v.byteStride)||gltf.accessors.some(a=>a.sparse)||
    gltf.animations.some(a=>a.samplers.some(s=>!['STEP','LINEAR'].includes(s.interpolation))))throw Error('Unsupported creature export: '+a.name);
  assets[a.id]={gltf,bin:file.subarray(end+8).toString('base64')};
 }
 return assets;
}
