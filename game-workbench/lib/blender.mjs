import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { APP } from './catalog.mjs';

export function blenderCommand(type, params={}, {port=9876,timeout=12000}={}) {
  return new Promise((resolve,reject)=>{
    const socket=net.createConnection({host:'127.0.0.1',port});let buffer='',settled=false;
    const finish=(error,result)=>{if(settled)return;settled=true;socket.destroy();error?reject(error):resolve(result);};
    socket.setEncoding('utf8');socket.setTimeout(timeout);
    socket.on('connect',()=>socket.write(JSON.stringify({type,params})));
    socket.on('data',chunk=>{
      buffer+=chunk;if(Buffer.byteLength(buffer)>8*1024*1024)return finish(new Error('Blender 返回数据过大'));
      let response;try{response=JSON.parse(buffer);}catch{return;}
      if(response.status!=='success')return finish(new Error(response.message||'Blender 命令失败'));
      if(response.result?.error)return finish(new Error(response.result.error));
      finish(null,response.result);
    });
    socket.on('timeout',()=>finish(new Error('Blender 响应超时；请检查弹窗、编辑状态及插件服务器')));
    socket.on('error',e=>finish(new Error(e.code==='ECONNREFUSED'?'Blender 未连接：请在 Blender 中启用 MCP for Blender，并启动端口 9876 的服务器':e.message)));
    socket.on('end',()=>{if(!settled)finish(new Error('Blender 连接结束，未收到完整响应'));});
  });
}
export async function blenderStatus(){try{return {connected:true,port:9876,scene:await blenderCommand('get_scene_info',{}, {timeout:2500}),checkedAt:new Date().toISOString()};}catch(e){return {connected:false,port:9876,message:e.message,checkedAt:new Date().toISOString()};}}
export async function auditScene(){
  const code=fs.readFileSync(path.join(APP,'integrations/blender/audit_scene.py'),'utf8');
  const result=await blenderCommand('execute_code',{code},{timeout:60000});
  const marker='WORKBENCH_REPORT:';const line=result.result?.split('\n').find(l=>l.startsWith(marker));
  if(!line)throw new Error('Blender 未返回检查报告');
  const report=JSON.parse(line.slice(marker.length));report.checkedAt=new Date().toISOString();
  fs.writeFileSync(path.join(APP,'data/blender-audit.json'),JSON.stringify(report,null,2));return report;
}
export async function importReference(file){
  if(!['.png','.jpg','.jpeg','.webp'].includes(path.extname(file).toLowerCase()))throw new Error('参考图需为 PNG / JPG / WebP');
  const code=`import bpy\nimage = bpy.data.images.load(${JSON.stringify(file)}, check_existing=True)\nobj = bpy.data.objects.new('REF_' + image.name, None)\nobj.empty_display_type = 'IMAGE'\nobj.data = image\nobj.empty_display_size = 2.0\nobj.location = (0, 0, 1)\nobj.rotation_euler = (1.57079632679, 0, 0)\nbpy.context.collection.objects.link(obj)\nprint('参考图已添加：' + obj.name)`;
  return blenderCommand('execute_code',{code});
}
export async function exportSelection(format){
  if(!['glb','fbx'].includes(format))throw new Error('仅支持 GLB / FBX 导出');
  const file=path.join(APP,'library/exports',`selection-${Date.now()}-${crypto.randomUUID().slice(0,8)}.${format}`);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const op=format==='glb'?`bpy.ops.export_scene.gltf(filepath=target, export_format='GLB', use_selection=True, export_animations=True)`:`bpy.ops.export_scene.fbx(filepath=target, use_selection=True, add_leaf_bones=False, bake_anim=True)`;
  const code=`import bpy\nif not bpy.context.selected_objects:\n    raise RuntimeError('请先在 Blender 中选择需要导出的对象及骨架')\ntarget = ${JSON.stringify(file)}\n${op}\nprint(target)`;
  await blenderCommand('execute_code',{code},{timeout:60000});
  if(!fs.existsSync(file)||fs.statSync(file).size===0)throw new Error('导出命令结束，但未发现有效文件');return file;
}
