import fs from 'node:fs';

// Pack the Blender-authored Sanctuary Overlook & Three-Act Grand Panorama GLB for offline file:// builds.
export function packSanctuary(){
 const file=fs.readFileSync(new URL('../game-workbench/library/exports/回响远征/圣所全景/晴湾圣所全景.glb',import.meta.url));
 const end=20+file.readUInt32LE(12);
 const gltf=JSON.parse(file.subarray(20,end));
 if(!gltf.meshes?.length||gltf.images?.length||gltf.bufferViews.some(v=>v.byteStride)||gltf.accessors.some(a=>a.sparse)){
  throw Error('Unsupported sanctuary panorama export');
 }
 // Blender splits vertices at each hard edge. Rebuild flat normals once at load
 // and store the baked pigment in normalized RGBA8 for the offline panorama.
 const binary=file.subarray(end+8), chunks=[], views=[], accessors=[];
 let offset=0;
 function append(accessor,data,target){
  const padding=(4-offset%4)%4;
  if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}
  const bufferView=views.push({buffer:0,byteOffset:offset,byteLength:data.length,target})-1;
  chunks.push(data);offset+=data.length;
  return accessors.push({...accessor,bufferView,byteOffset:0})-1;
 }
 function stream(index){
  const a=gltf.accessors[index],view=gltf.bufferViews[a.bufferView];
  const start=(view.byteOffset||0)+(a.byteOffset||0);
  const bytes={5121:1,5123:2,5125:4,5126:4}[a.componentType];
  const width={SCALAR:1,VEC3:3,VEC4:4}[a.type];
  if(!bytes||!width)throw Error('Unsupported sanctuary attribute');
  return binary.subarray(start,start+a.count*width*bytes);
 }
 const meshes=gltf.meshes.map(mesh=>({...mesh,primitives:mesh.primitives.map(prim=>{
  const {POSITION,COLOR_0}=prim.attributes,colors=gltf.accessors[COLOR_0];
  if(colors.type!=='VEC3'||colors.componentType!==5126)throw Error('Expected linear RGB vertex colors');
  const rgb=stream(COLOR_0),rgba=Buffer.alloc(colors.count*4,255);
  for(let i=0;i<colors.count;i++)for(let c=0;c<3;c++){
   const value=rgb.readFloatLE((i*3+c)*4);
   rgba[i*4+c]=Math.round(255*Math.max(0,Math.min(1,value)));
  }
  return {...prim,attributes:{
   POSITION:append(gltf.accessors[POSITION],stream(POSITION),34962),
   COLOR_0:append({componentType:5121,normalized:true,count:colors.count,type:'VEC4'},rgba,34962)
  },indices:append(gltf.accessors[prim.indices],stream(prim.indices),34963)};
 })}));
 return {gltf:{...gltf,meshes,buffers:[{byteLength:offset}],bufferViews:views,accessors},bin:Buffer.concat(chunks).toString('base64')};
}
