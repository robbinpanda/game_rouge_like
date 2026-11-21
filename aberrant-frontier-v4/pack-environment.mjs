import fs from 'node:fs';

const library=new URL('../game-workbench/library/exports/回响远征/',import.meta.url);

function packProp(folder,name,atlasKey){
 const glb=fs.readFileSync(new URL(folder+'/'+name+'.glb',library));
 const end=20+glb.readUInt32LE(12),doc=JSON.parse(glb.toString('utf8',20,end)),binary=glb.subarray(end+8);
 const primitive=doc.meshes[0].primitives[0];
 if(doc.nodes.length!==1||doc.nodes[0].mesh!==0||doc.meshes.length!==1||doc.meshes[0].primitives.length!==1)
  throw Error('Expected one standalone environment mesh: '+name);
 function readTyped(index,type,component,Typed){
  const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],offset=(v.byteOffset||0)+(a.byteOffset||0);
  const k={SCALAR:1,VEC2:2,VEC3:3}[type];
  if(a.type!==type||a.componentType!==component||a.sparse||(v.byteStride&&v.byteStride!==k*Typed.BYTES_PER_ELEMENT))
   throw Error('Unsupported environment attribute: '+name+'/'+type);
  return new Typed(binary.buffer,binary.byteOffset+offset,a.count*k);
 }
 const encode=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength).toString('base64');
 const {POSITION,NORMAL,TEXCOORD_0,COLOR_0}=primitive.attributes;
 const posF=readTyped(POSITION,'VEC3',5126,Float32Array);
 let maxAbs=1e-4;
 for(let i=0;i<posF.length;i++)if(Math.abs(posF[i])>maxAbs)maxAbs=Math.abs(posF[i]);
 const posScale=maxAbs/32767;
 const posQ=Int16Array.from(posF,v=>Math.round(v/posScale));
 const norQ=Int16Array.from(readTyped(NORMAL,'VEC3',5126,Float32Array),v=>Math.round(Math.max(-1,Math.min(1,v))*32767));
 const asset={
  name,atlas:atlasKey,posScale,
  position:encode(posQ),
  normal:encode(norQ),
  index:encode(readTyped(primitive.indices,'SCALAR',5123,Uint16Array))
 };
 if(TEXCOORD_0!==undefined){
  asset.uv=encode(Uint16Array.from(readTyped(TEXCOORD_0,'VEC2',5126,Float32Array),v=>Math.round(Math.max(0,Math.min(1,v))*65535)));
 }
 if(COLOR_0!==undefined)asset.color=encode(readTyped(COLOR_0,'VEC3',5126,Float32Array));
 return asset;
}

export function packEnvironment(){
 const props={};
 const sets=[
  ['环境与技能物件','twelve',{stele:'共鸣预言碑',armory:'军械展示台',rail:'通电轨道单节',vent:'泄压喷口',crystals:'爆裂晶床'}],
  ['圣所交互物','sanctuary3',{mirror:'回响之镜',dummy:'试刃靶偶',chronicle:'晴湾纪事台'}],
  ['晴湾环境模块','arch3',{station:'车站门厅',winch:'码头绞盘',arbor:'温室拱廊'}],
  ['晴湾环境模块','street3',{clock:'晴湾站台钟',railing:'蓝漆海湾栏杆',planter:'绣球花槽'}]
 ];
 for(const [folder,atlasKey,entries] of sets){
  for(const [key,name] of Object.entries(entries))props[key]=packProp(folder,name,atlasKey);
 }
 const atlasFiles={
  twelve:'环境与技能物件/十二件共用底色.webp',
  sanctuary3:'圣所交互物/圣所三件共用底色.webp',
  arch3:'晴湾环境模块/建筑三件共用底色.webp',
  street3:'晴湾环境模块/街景三件共用底色.webp'
 };
 const atlases={};
 for(const [key,rel] of Object.entries(atlasFiles)){
  const bytes=fs.readFileSync(new URL(rel,library));
  atlases[key]='data:image/webp;base64,'+bytes.toString('base64');
 }
 return {props,atlas:atlases.twelve,atlases};
}
