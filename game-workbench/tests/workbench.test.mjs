import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { Catalog, APP, safeExisting } from '../lib/catalog.mjs';
import { createServer } from '../server.mjs';
import { blenderCommand } from '../lib/blender.mjs';

function fixture(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'frontier-test-'));fs.mkdirSync(path.join(root,'output'),{recursive:true});fs.writeFileSync(path.join(root,'output','参考图.png'),Buffer.from([1,2,3]));const args={root,dataDir:path.join(root,'data'),library:path.join(root,'library')};return {root,args,cleanup:()=>fs.rmSync(root,{recursive:true,force:true})};}
test('扫描使用稳定 ID，元数据在重新扫描和重启后保留；删除的文件从索引移除',()=>{const f=fixture();try{const c=new Catalog(f.args),a=c.data.assets[0];c.updateAsset(a.id,{tags:['主角'],notes:'需要修订',versionIds:['v2']});c.scan();assert.equal(c.data.assets[0].id,a.id);assert.deepEqual(c.data.assets[0].tags,['主角']);const next=new Catalog(f.args);assert.equal(next.data.assets[0].notes,'需要修订');fs.unlinkSync(path.join(f.root,a.path));next.scan();assert.equal(next.data.assets.length,0);}finally{f.cleanup();}});
test('版本简介持久保存，当前版本唯一，不能通过编辑档案改变游戏构建路径',()=>{const f=fixture();try{const c=new Catalog(f.args);c.upsertVersion('v4',{title:'制作版',summary:'下一代资产',status:'current',directory:'../../'});assert.equal(c.data.versions.filter(v=>v.status==='current').length,1);assert.equal(c.data.versions.at(-1).directory,undefined);assert.equal(new Catalog(f.args).data.versions.at(-1).summary,'下一代资产');assert.throws(()=>c.upsertVersion('../bad',{title:'bad',summary:'bad'}));}finally{f.cleanup();}});
test('任务遵守前置依赖，禁止循环，完成状态和交付文件可恢复',()=>{const f=fixture();try{const c=new Catalog(f.args);const first=c.upsertTask(null,{title:'建模',stage:'modeling',versionId:'v3'}),second=c.upsertTask(null,{title:'绑骨',stage:'rigging',versionId:'v3',dependsOn:[first.id]});assert.throws(()=>c.upsertTask(second.id,{status:'done'}),/前置/);assert.throws(()=>c.upsertTask(first.id,{dependsOn:[second.id]}),/循环/);c.upsertTask(first.id,{status:'done',deliverables:[c.data.assets[0].id]});c.upsertTask(second.id,{status:'done'});assert.equal(new Catalog(f.args).data.tasks.at(-1).status,'done');}finally{f.cleanup();}});
test('文件读取拒绝越界路径和缺失路径',()=>{const f=fixture();try{assert.throws(()=>safeExisting(f.root,'../outside'));assert.throws(()=>safeExisting(f.root,'missing'));assert.ok(safeExisting(f.root,'output/参考图.png').endsWith('参考图.png'));}finally{f.cleanup();}});
test('HTTP 支持真实导入、检索、数据持久化，拒绝跨站写入和非本地主机',async()=>{const f=fixture();const {server}=createServer(f.args);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;try{
 const health=await fetch(base+'/api/health').then(r=>r.json());assert.equal(health.app,'aberrant-workbench');
 assert.equal((await fetch(base+'/api/scan',{method:'POST'})).status,403);
 assert.equal((await fetch(base+'/api/scan',{method:'POST',headers:{'X-Workbench-Request':'1',Origin:'https://evil.example'}})).status,403);
 const hostileStatus=await new Promise((resolve,reject)=>{const req=http.get(base+'/api/catalog',{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);});assert.equal(hostileStatus,403);
 const upload=await fetch(base+'/api/import?name='+encodeURIComponent('新模型.glb'),{method:'POST',headers:{'X-Workbench-Request':'1'},body:Buffer.from('glTF-test')});assert.equal(upload.status,201);
 const d=await fetch(base+'/api/catalog').then(r=>r.json());const model=d.assets.find(a=>a.ext==='glb');assert.ok(model);assert.equal(await fetch(base+'/asset/'+model.id).then(r=>r.text()),'glTF-test');
 const bad=await fetch(base+'/api/import?name=bad.exe',{method:'POST',headers:{'X-Workbench-Request':'1'},body:'bad'});assert.equal(bad.status,400);
 const patch=await fetch(base+'/api/assets/'+model.id,{method:'PATCH',headers:{'X-Workbench-Request':'1','Content-Type':'application/json'},body:JSON.stringify({notes:'检查过',versionIds:['v3']})});assert.equal(patch.status,200);
 const manifest=await fetch(base+'/api/manifest?version=v3').then(r=>r.json());assert.equal(manifest.assets[0].notes,'检查过');
 assert.equal((await fetch(base+'/api/blender/python',{method:'POST',headers:{'X-Workbench-Request':'1'},body:'{}'})).status,403);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));f.cleanup();}});
test('Blender socket 解析跨数据包的中文响应，并传播插件错误',async()=>{let fail=false;const fake=net.createServer(s=>{s.once('data',chunk=>{const msg=JSON.parse(chunk.toString());assert.equal(msg.type,'get_scene_info');const response=Buffer.from(JSON.stringify(fail?{status:'error',message:'场景不可访问'}:{status:'success',result:{name:'烬刃的场景'}}));s.write(response.subarray(0,44));setTimeout(()=>s.end(response.subarray(44)),15);});});await new Promise(r=>fake.listen(0,'127.0.0.1',r));try{const config={port:fake.address().port};assert.equal((await blenderCommand('get_scene_info',{},config)).name,'烬刃的场景');fail=true;await assert.rejects(blenderCommand('get_scene_info',{},config),/场景不可访问/);}finally{await new Promise(r=>fake.close(r));}});
test('Blender 连接超时不会无限等待',async()=>{const sockets=[];const fake=net.createServer(s=>sockets.push(s));await new Promise(r=>fake.listen(0,'127.0.0.1',r));try{await assert.rejects(blenderCommand('get_scene_info',{},{port:fake.address().port,timeout:40}),/超时/);}finally{sockets.forEach(s=>s.destroy());await new Promise(r=>fake.close(r));}});
test('MCP stdio 正确初始化、列出工具、处理 ping 和解析错误，通知不产生响应',async()=>{const proc=spawn(process.execPath,[path.join(APP,'mcp.mjs')],{stdio:['pipe','pipe','pipe'],windowsHide:true});let out='',err='';proc.stdout.on('data',c=>out+=c);proc.stderr.on('data',c=>err+=c);proc.stdin.end([
 JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18'}}),
 JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'}),
 JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/list'}),
 JSON.stringify({jsonrpc:'2.0',id:3,method:'ping'}),'invalid-json',''
 ].join('\n'));await new Promise((resolve,reject)=>{proc.on('error',reject);proc.on('exit',code=>code===0?resolve():reject(new Error(err)));});const messages=out.trim().split('\n').map(JSON.parse);assert.equal(messages.length,4);assert.equal(messages[0].result.serverInfo.name,'frontier-studio');assert.ok(messages[1].result.tools.some(t=>t.name==='blender_execute_python'));assert.equal(messages[3].error.code,-32700);});
