// Temporary browser QA fixture, kept outside the production asset index.
import fs from 'node:fs';
import path from 'node:path';
import { APP } from '../lib/catalog.mjs';
const folder=path.join(APP,'public','__preview_test__');
fs.mkdirSync(folder,{recursive:true});
const binary=Buffer.alloc(36+8+24);
[-.8,0,0,.8,0,0,0,1.6,0,0,2,0,0,0,0,.5,0].forEach((n,i)=>binary.writeFloatLE(n,i*4));
const doc={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{name:'Preview test triangle',mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0},material:0}]}],materials:[{doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[.85,.35,.18,1],metallicFactor:0,roughnessFactor:.7}}],buffers:[{byteLength:68}],bufferViews:[{buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:8},{buffer:0,byteOffset:44,byteLength:24}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[-.8,0,0],max:[.8,1.6,0]},{bufferView:1,componentType:5126,count:2,type:'SCALAR',min:[0],max:[2]},{bufferView:2,componentType:5126,count:2,type:'VEC3'}],animations:[{name:'QA_Bounce',samplers:[{input:1,output:2,interpolation:'LINEAR'}],channels:[{sampler:0,target:{node:0,path:'translation'}}]}]};
let text=Buffer.from(JSON.stringify(doc));text=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]);
const total=12+8+text.length+8+binary.length,header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(total,8);jh.writeUInt32LE(text.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(binary.length);bh.writeUInt32LE(0x004e4942,4);
fs.writeFileSync(path.join(folder,'fixture.glb'),Buffer.concat([header,jh,text,bh,binary]));
fs.writeFileSync(path.join(folder,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>GLB 预览验证</title><link rel="stylesheet" href="/style.css"><body style="padding:30px"><h1>GLB 预览验证</h1><p>临时测试模型，不纳入制作资产。</p><div class="model-wrap" id="viewer" style="max-width:750px;height:500px"><div class="model-message">载入中…</div></div><script type="importmap">{"imports":{"three":"/vendor/three.module.js"}}</script><script type="module">import {mount} from '/model-viewer.js';await mount(document.querySelector('#viewer'),'/__preview_test__/fixture.glb');</script></body></html>`);
console.log('Temporary GLB QA fixture: /__preview_test__/index.html');
