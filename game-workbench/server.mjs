import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { APP, ROOT, Catalog, safeExisting, TYPES } from './lib/catalog.mjs';
import { blenderStatus, auditScene, importReference, exportSelection, blenderCommand } from './lib/blender.mjs';

const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.mp4':'video/mp4','.mp3':'audio/mpeg','.wav':'audio/wav','.pdf':'application/pdf'};
function json(res,code,data){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>1024*1024)throw new Error('请求内容过大');}return JSON.parse(text||'{}');}
function serve(req,res,file,{download=false,untrusted=false}={}){
  const stat=fs.statSync(file);if(!stat.isFile())throw new Error('文件不存在');
  const headers={'Content-Type':MIME[path.extname(file).toLowerCase()]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'};
  if(download)headers['Content-Disposition']=`attachment; filename*=UTF-8''${encodeURIComponent(path.basename(file))}`;
  if(untrusted)headers['Content-Security-Policy']="sandbox; default-src 'none'; img-src data:; style-src 'unsafe-inline'";
  let start=0,end=stat.size-1,status=200;
  if(req.headers.range){const m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!m)return res.writeHead(416).end();start=Number(m[1]);end=m[2]?Number(m[2]):end;if(start>end||end>=stat.size)return res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end();status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;}
  headers['Accept-Ranges']='bytes';headers['Content-Length']=stat.size===0?0:end-start+1;res.writeHead(status,headers);
  if(req.method==='HEAD'||stat.size===0)return res.end();
  fs.createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);
}

export function createServer({root=ROOT,dataDir=path.join(APP,'data'),library=path.join(APP,'library'),allowPython=false}={}){
  const catalog=new Catalog({root,dataDir,library});
  const server=http.createServer(async(req,res)=>{
    try{
      const host=req.headers.host||'';
      if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host))return json(res,403,{error:'仅允许本机访问'});
      const url=new URL(req.url,`http://${host}`);const route=decodeURIComponent(url.pathname);
      const mutating=!['GET','HEAD'].includes(req.method);
      if(mutating && (req.headers['x-workbench-request']!=='1'||(req.headers.origin&&req.headers.origin!==`http://${host}`)))return json(res,403,{error:'请求来源无效'});
      if(route==='/api/health'&&req.method==='GET')return json(res,200,{ok:true,app:'aberrant-workbench',schemaVersion:1});
      if(route==='/api/catalog'&&req.method==='GET')return json(res,200,catalog.snapshot());
      if(route==='/api/scan'&&req.method==='POST')return json(res,200,catalog.scan());
      if(route==='/api/manifest'&&req.method==='GET'){res.setHeader('Content-Disposition',`attachment; filename="${(url.searchParams.get('version')||'').replace(/[^a-z0-9-]/g,'')}-manifest.json"`);return json(res,200,catalog.manifest(url.searchParams.get('version')));}
      if(route==='/api/backup'&&req.method==='GET'){res.setHeader('Content-Disposition','attachment; filename="workbench-catalog.json"');return json(res,200,catalog.snapshot());}
      if(route.startsWith('/api/assets/')&&req.method==='PATCH')return json(res,200,catalog.updateAsset(route.split('/').at(-1),await body(req)));
      if(route.startsWith('/api/versions/')&&req.method==='PUT')return json(res,200,catalog.upsertVersion(route.split('/').at(-1),await body(req)));
      if(route==='/api/tasks'&&req.method==='POST')return json(res,201,catalog.upsertTask(null,await body(req)));
      if(route.startsWith('/api/tasks/')&&req.method==='PATCH')return json(res,200,catalog.upsertTask(route.split('/').at(-1),await body(req)));
      if(route==='/api/import'&&req.method==='POST'){
        const raw=url.searchParams.get('name')||'',ext=path.extname(raw).toLowerCase();
        if(!TYPES[ext]||ext==='.html')throw new Error('不支持此文件类型');
        const category=['.blend','.glb','.gltf','.fbx','.obj'].includes(ext)?'models':['.bvh','.abc'].includes(ext)?'animations':'references';
        const dir=path.join(library,category);fs.mkdirSync(dir,{recursive:true});
        const name=path.basename(raw.replaceAll('\\','/')).replace(/[<>:"/\\|?*\x00-\x1F]/g,'_').slice(-180);
        if(!name||name.startsWith('.'))throw new Error('文件名无效');
        let file=path.join(dir,name);if(fs.existsSync(file))file=path.join(dir,`${crypto.randomUUID().slice(0,8)}-${name}`);
        const temp=file+'.upload';let size=0;
        try {await pipeline(req,new Transform({transform(chunk,enc,cb){size+=chunk.length;cb(size>256*1024*1024?new Error('单文件上限 256 MB'):null,chunk);}}),fs.createWriteStream(temp,{flags:'wx'}));if(!size)throw new Error('文件为空');fs.renameSync(temp,file);}catch(e){if(fs.existsSync(temp))fs.unlinkSync(temp);throw e;}
        catalog.scan();return json(res,201,{ok:true,path:path.relative(root,file).split(path.sep).join('/')});
      }
      if(route==='/api/blender/status'&&req.method==='GET')return json(res,200,await blenderStatus());
      if(route==='/api/blender/audit'&&req.method==='POST')return json(res,200,await auditScene());
      if(route==='/api/blender/reference'&&req.method==='POST'){const p=await body(req);return json(res,200,await importReference(catalog.fileForAsset(p.assetId)));}
      if(route==='/api/blender/export'&&req.method==='POST'){
        const p=await body(req),file=await exportSelection(p.format);catalog.scan();catalog.log(`Blender 导出：${path.basename(file)}`);catalog.save();return json(res,200,{path:path.relative(root,file).split(path.sep).join('/')});
      }
      if(route==='/api/blender/python'&&req.method==='POST'){
        if(!allowPython)return json(res,403,{error:'网页端不开放任意脚本执行；请通过本地 MCP 使用 Blender Python 工具'});
        const p=await body(req);return json(res,200,await blenderCommand('execute_code',{code:String(p.code)},{timeout:60000}));
      }
      if(route==='/api/blender/last-audit'&&req.method==='GET') {const f=path.join(APP,'data/blender-audit.json');return json(res,200,fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):null);}
      if(route.startsWith('/api/'))return json(res,404,{error:'接口不存在'});
      if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'方法不允许'});
      if(route.startsWith('/asset/'))return serve(req,res,catalog.fileForAsset(route.slice(7)),{download:url.searchParams.has('download'),untrusted:true});
      if(route.startsWith('/games/')) {
        const [, ,id,...parts]=route.split('/'),v=catalog.data.versions.find(v=>v.id===id);
        if(!v?.directory)throw new Error('此版本尚未关联可玩构建');
        return serve(req,res,safeExisting(path.join(root,v.directory,'dist'),parts.join('/')||'index.html'));
      }
      if(route.startsWith('/version-doc/')){const v=catalog.data.versions.find(v=>v.id===route.slice(13));if(!v?.directory)throw new Error('无原始说明');return serve(req,res,safeExisting(path.join(root,v.directory),'README.md'));}
      if(route==='/downloads/blender-addon.py')return serve(req,res,path.join(APP,'integrations/blender/addon.py'),{download:true});
      return serve(req,res,safeExisting(path.join(APP,'public'),route==='/'?'index.html':'.'+route));
    }catch(e){if(!res.headersSent)json(res,e.code==='ENOENT'?404:400,{error:e.message});else res.destroy();}
  });
  server.requestTimeout=120000;return {server,catalog};
}
if(process.argv[1]&&fs.existsSync(process.argv[1])&&import.meta.url===pathToFileURL(fs.realpathSync(process.argv[1])).href){
  const port=Number(process.env.PORT||4180);const {server,catalog}=createServer();
  server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`端口 ${port} 已占用；如已启动，请打开 http://127.0.0.1:${port}`:e);process.exitCode=1;});
  server.listen(port,'127.0.0.1',()=>console.log(`畸变前线制作工作台 http://127.0.0.1:${port} | ${catalog.data.assets.length} 项资产`));
}
