// Dependency-free MCP stdio adapter. All catalog writes go through the single local HTTP owner.
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { APP } from './lib/catalog.mjs';
import { blenderCommand } from './lib/blender.mjs';
import path from 'node:path';

const base='http://127.0.0.1:4180';
let starting;
async function ensureServer(){
  const healthy=async()=>{try{const r=await fetch(base+'/api/health',{signal:AbortSignal.timeout(1000)});return r.ok&&(await r.json()).app==='aberrant-workbench';}catch{return false;}};
  if(await healthy())return;
  if(!starting)starting=(async()=>{const child=spawn(process.execPath,[path.join(APP,'server.mjs')],{cwd:APP,detached:true,windowsHide:true,stdio:'ignore',env:{...process.env,PORT:'4180'}});child.on('error',()=>{});child.unref();for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,150));if(await healthy())return;}throw new Error('工作台服务启动失败，请运行启动脚本并检查 4180 端口');})().finally(()=>starting=null);
  await starting;
}
async function request(route,method='GET',body){await ensureServer();const res=await fetch(base+route,{method,headers:{'X-Workbench-Request':'1','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(70000)});const result=await res.json();if(!res.ok)throw new Error(result.error);return result;}
const str={type:'string'};
const definition=(name,description,properties={},required=[],readOnly=true)=>({name,description,inputSchema:{type:'object',properties,required,additionalProperties:false},annotations:{readOnlyHint:readOnly,destructiveHint:!readOnly,idempotentHint:readOnly,openWorldHint:false}});
const tools=[
 definition('project_overview','读取畸变前线工作台概况、角色设定与资产/制作统计。'),
 definition('list_versions','读取所有游戏版本的简介、功能与当前边界。'),
 definition('list_assets','按关键词、角色、版本或类型查询本地资产。返回工作区相对路径。',{query:str,character:str,versionId:str,type:str,limit:{type:'integer',minimum:1,maximum:200}}),
 definition('list_tasks','读取建模、骨骼、动画、导出任务及前置依赖。',{character:str,stage:str,status:str}),
 definition('create_task','新增制作任务。',{title:str,description:str,stage:{type:'string',enum:['concept','modeling','rigging','animation','export']},character:str,versionId:str},['title','stage','versionId'],false),
 definition('update_task','更新任务状态、备注和交付资产，已完成任务需满足前置依赖。',{id:str,status:{type:'string',enum:['todo','doing','review','done','blocked']},notes:str,deliverables:{type:'array',items:str}},['id'],false),
 definition('update_asset','更新资产备注、角色、标签、阶段和关联版本。',{id:str,name:str,notes:str,character:str,stage:{type:'string',enum:['concept','modeling','rigging','animation','export']},tags:{type:'array',items:str},versionIds:{type:'array',items:str}},['id'],false),
 definition('rescan_assets','重新扫描游戏产出目录 output、游戏预览图和工作台 library，将新文件收录索引。',{},[],false),
 definition('version_manifest','生成指定游戏版本的资产与任务交付清单。',{versionId:str},['versionId']),
 definition('blender_scene','检测本机 Blender MCP 插件并读取当前场景。'),
 definition('blender_audit','在 Blender 进行只读检查：原始面数、UV、缩放、骨架、权重与动作，保存报告。'),
 definition('blender_reference','将资产库中的图片添加到当前 Blender 场景作为参考对象。',{assetId:str},['assetId'],false),
 definition('blender_export','把 Blender 选中的模型、骨架与动画导出到 library/exports 并重新索引。',{format:{type:'string',enum:['glb','fbx']}},['format'],false),
 definition('blender_execute_python','在 Blender 执行 Python 制作操作，可用于建模、材质、绑骨、动画和优化。操作会修改场景；先检查场景并保存副本，不得超出用户授权。此工具不自动保存或标记任务完成。',{code:str},['code'],false)
];
async function call(name,a){
 if(name==='blender_execute_python'){if(typeof a.code!=='string'||!a.code.trim()||a.code.length>100000)throw new Error('Python 脚本为空或过长');return blenderCommand('execute_code',{code:a.code},{timeout:60000});}
 if(name==='blender_scene')return request('/api/blender/status');
 if(name==='blender_audit')return request('/api/blender/audit','POST',{});
 if(name==='blender_reference')return request('/api/blender/reference','POST',a);
 if(name==='blender_export')return request('/api/blender/export','POST',a);
 if(name==='rescan_assets')return request('/api/scan','POST',{});
 if(name==='version_manifest')return request('/api/manifest?version='+encodeURIComponent(a.versionId));
 if(name==='create_task')return request('/api/tasks','POST',a);
 if(name==='update_task'||name==='update_asset'){const {id,...patch}=a;return request(`/api/${name==='update_task'?'tasks':'assets'}/${encodeURIComponent(id)}`,'PATCH',patch);}
 const d=await request('/api/catalog');
 if(name==='project_overview')return {project:d.project,roles:d.roles,versions:d.versions.map(v=>({id:v.id,title:v.title,status:v.status})),assetCount:d.assets.length,taskCount:d.tasks.length,completedTasks:d.tasks.filter(t=>t.status==='done').length,workspace:APP,conventions:'Source .blend; exports .glb/.fbx. Static concepts are not production models.'};
 if(name==='list_versions')return d.versions;
 if(name==='list_assets'){const q=(a.query||'').toLowerCase(),matches=d.assets.filter(x=>(!a.character||x.character===a.character)&&(!a.versionId||x.versionIds.includes(a.versionId))&&(!a.type||x.type===a.type)&&(!q||[x.name,x.path,x.notes,...x.tags].join(' ').toLowerCase().includes(q)));return {total:matches.length,assets:matches.slice(0,Math.min(200,Math.max(1,a.limit||60)))};}
 if(name==='list_tasks')return d.tasks.filter(t=>(!a.character||a.character===t.character)&&(!a.stage||a.stage===t.stage)&&(!a.status||a.status===t.status));
 throw new Error('未知工具');
}
const output=value=>process.stdout.write(JSON.stringify(value)+'\n');
async function handle(message){
 if(!message||typeof message!=='object'||message.jsonrpc!=='2.0'||typeof message.method!=='string'){output({jsonrpc:'2.0',id:message?.id??null,error:{code:-32600,message:'Invalid Request'}});return;}
 if(!('id'in message))return;
 const response={jsonrpc:'2.0',id:message.id};
 try{
  if(message.method==='initialize')response.result={protocolVersion:['2024-11-05','2025-03-26','2025-06-18'].includes(message.params?.protocolVersion)?message.params.protocolVersion:'2025-06-18',capabilities:{tools:{listChanged:false}},serverInfo:{name:'frontier-studio',version:'1.0.0'},instructions:'Local game production workbench. Query asset and version context first. Blender commands require the local addon on 127.0.0.1:9876. Never confuse art concepts with completed models.'};
  else if(message.method==='ping')response.result={};
  else if(message.method==='tools/list')response.result={tools};
  else if(message.method==='tools/call'){
   const name=message.params?.name,a=message.params?.arguments||{},def=tools.find(t=>t.name===name);
   try{if(!def)throw new Error('未知工具');for(const k of def.inputSchema.required)if(!(k in a))throw new Error('缺少参数：'+k);response.result={content:[{type:'text',text:JSON.stringify(await call(name,a))}]};}
   catch(err){response.result={isError:true,content:[{type:'text',text:err.message}]};}
  }else{response.error={code:-32601,message:'Method not found'};}
 }catch(err){response.error={code:-32603,message:err.message};}output(response);
}
const lines=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
let queue=Promise.resolve();lines.on('line',line=>{if(!line.trim())return;queue=queue.then(async()=>{if(line.length>1024*1024){output({jsonrpc:'2.0',id:null,error:{code:-32600,message:'Request too large'}});return;}let message;try{message=JSON.parse(line);}catch{output({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});return;}await handle(message);}).catch(err=>process.stderr.write(err.message+'\n'));});
