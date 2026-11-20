import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT = path.resolve(APP, '..');
export const STAGES = ['concept', 'modeling', 'rigging', 'animation', 'export'];
export const STATUSES = ['todo', 'doing', 'review', 'done', 'blocked'];
export const TYPES = {'.png':'image','.jpg':'image','.jpeg':'image','.webp':'image','.svg':'vector','.blend':'blender','.glb':'model','.gltf':'model','.fbx':'model','.obj':'model','.bvh':'animation','.abc':'animation','.usd':'model','.usdz':'model','.wav':'audio','.mp3':'audio','.ogg':'audio','.mp4':'video','.mov':'video','.txt':'document','.md':'document','.json':'document','.pdf':'document','.html':'document','.zip':'archive'};
export function inside(base, candidate) { const r = path.relative(base, candidate); return r === '' || (!r.startsWith('..' + path.sep) && r !== '..' && !path.isAbsolute(r)); }
export function safeExisting(base, relative) {
  const full = path.resolve(base, relative);
  if (!inside(base, full) || !fs.existsSync(full) || !inside(fs.realpathSync(base), fs.realpathSync(full))) throw new Error('文件不存在或路径不允许');
  return full;
}
export const assetId = p => crypto.createHash('sha256').update(p).digest('hex').slice(0, 18);
const now = () => new Date().toISOString();
const clean = (v, max=4000) => typeof v === 'string' ? v.trim().slice(0,max) : '';
function required(v, label, max) { const s=clean(v,max); if(!s) throw new Error(`${label}不能为空`); return s; }
function initial(root) {
  const roleFile=path.join(root,'output/aberrant-character-kit-v3/角色与技能设定.json');
  const roles=fs.existsSync(roleFile)?JSON.parse(fs.readFileSync(roleFile,'utf8').replace(/^\uFEFF/, '')).roles:[];
  const versions=[
    {id:'v1',title:'畸变前线',subtitle:'最初的猎场',directory:'aberrant-frontier',cover:'aberrant-frontier-preview.jpg',status:'archived',summary:'第三人称末世变异体动作搜打撤原型。选择裂爪或棘骨，在污染区搜集基因、战斗进化，再携带资源撤回巢穴。',features:['2 位变异体 · 12 个 AI','三段近战 / 骨刺 / 范围异能','8 分钟搜集与撤离循环'],limits:'单人 AI 原型，程序化简模与节点驱动动作，无多人联网。'},
    {id:'v2',title:'异能与兵器',subtitle:'角色与武器解耦',directory:'aberrant-frontier-v2',cover:'aberrant-frontier-v2-preview.jpg',status:'archived',summary:'五位角色自由搭配六类武器，加入双武器切换、蓄力反制、钩索移动与垂直探索。角色异能和武器系统独立组合。',features:['5 位角色 · 6 类武器','双武器 / 蓄力 / 反制 / 钩索','6 个强化 AI · 10 分钟撤离'],limits:'单人原型；AI 为轻量避障，美术和动作仍为程序生成。'},
    {id:'v3',title:'晴昼遗城',subtitle:'当前可玩版本',directory:'aberrant-frontier-v3',cover:'aberrant-frontier-v3-preview.jpg',status:'current',summary:'奶油色建筑、青绿构件与紫色植被构成晴昼旧城。延续五角色、六武器的搜打撤玩法，改善鼠标锁定与场景渲染，为后续正式资产制作提供原型基线。',features:['晴昼旧城 · 港区与高架列车','标准鼠标锁定 / 灵敏度调节','静态场景实例化合批'],limits:'静态角色概念图和新增技能方案尚未接入运行时；当前游戏仍使用程序化模型。'}
  ].map(v=>({...v,createdAt:now(),updatedAt:now()}));
  const tasks=[];
  for (const r of roles) {
    const common={character:r.name,versionId:'v3',status:'todo',priority:'normal',notes:'',deliverables:[],createdAt:now(),updatedAt:now()};
    tasks.push({...common,id:`${r.id}-model`,title:`${r.name} · 角色建模与拓扑`,stage:'modeling',dependsOn:[],description:'以三视图和独立立绘统一比例；制作低模、UV 与材质，保留可编辑 .blend。'});
    tasks.push({...common,id:`${r.id}-rig`,title:`${r.name} · 骨骼绑定与蒙皮`,stage:'rigging',dependsOn:[`${r.id}-model`],description:'根骨 / 骨盆分层，统一左右命名，检查未加权顶点与关节极限姿势；异变部位单独校验。'});
    for(const s of r.skills) tasks.push({...common,id:`${r.id}-${s.id}`,title:`${r.name} · ${s.name}动作`,stage:'animation',dependsOn:[`${r.id}-rig`],description:`${s.action}\n表现：${s.visual}\n玩法状态：美术方案，需游戏端验证。`});
    tasks.push({...common,id:`${r.id}-export`,title:`${r.name} · GLB / FBX 交付`,stage:'export',dependsOn:r.skills.map(s=>`${r.id}-${s.id}`),description:'校验单位、缩放、贴图、蒙皮与动作命名，导出 GLB / FBX，并在目标引擎复核。'});
  }
  return {schemaVersion:1,project:{name:'畸变前线',en:'ABERRANT FRONTIER',description:'从玩法原型到可交付资产的制作工作台',engine:'generic',formats:['blend','glb','fbx']},versions,roles,tasks,assetMeta:{},assets:[],activity:[],updatedAt:now()};
}

export class Catalog {
  constructor({root=ROOT, dataDir=path.join(APP,'data'), library=path.join(APP,'library')}={}) {
    this.root=path.resolve(root); this.dataDir=dataDir; this.library=library;
    fs.mkdirSync(dataDir,{recursive:true}); fs.mkdirSync(library,{recursive:true});
    this.file=path.join(dataDir,'catalog.json');
    this.data=fs.existsSync(this.file)?JSON.parse(fs.readFileSync(this.file,'utf8')):initial(this.root);
    this.registerLocalV4();
    this.scan();
  }
  registerLocalV4() {
    if(!fs.existsSync(path.join(this.root,'aberrant-frontier-v4/dist/game.js')))return;
    let version=this.data.versions.find(v=>v.id==='v4');
    if(!version){
      for(const v of this.data.versions)if(v.status==='current')v.status='archived';
      version={id:'v4',title:'晴湾远征',subtitle:'多区探索与条件撤离',directory:'aberrant-frontier-v4',cover:'',status:'current',summary:'五角色立绘与技能图标接入，六片相连街区、五种条件撤离、38 处物资箱与动态增援。攻击采用前摇、命中帧和收势，新增战术异能、负重、治疗、委托及物资结算。',features:['六个区域 · 五种条件撤离 · 14 分钟远征','五角色三异能 · 命中帧 / 闪避取消 / 破势','搜箱 / 负重 / 治疗 / 空投 / 委托 / 仓库结算'],limits:'单人对 AI 原型。角色与建筑仍为程序化模型，未使用 Blender 骨骼动画；本轮完成代码与碰撞通路测试，未完成实机视觉验收。',createdAt:now(),updatedAt:now()};
      this.data.versions.push(version);this.log('注册可玩版本 V4 · 晴湾远征');
    }
    for(const a of this.data.assets){
      if(a.path.includes('aberrant-character-kit-v3')&&(/独立立绘|技能图标/.test(a.path))||a.path.endsWith('12_大场景_晴湾港区全景.png')){
        const versionIds=[...new Set([...(a.versionIds||[]),'v4'])];
        this.data.assetMeta[a.id]={...this.data.assetMeta[a.id],versionIds};
      }
    }
  }
  save() {
    this.data.updatedAt=now(); const temp=this.file+'.tmp';
    fs.writeFileSync(temp,JSON.stringify(this.data,null,2));
    if(fs.existsSync(this.file)) fs.copyFileSync(this.file,this.file+'.bak');
    fs.renameSync(temp,this.file);
  }
  log(message) { this.data.activity.unshift({id:crypto.randomUUID(),message,at:now()}); this.data.activity=this.data.activity.slice(0,100); }
  scan() {
    const found=[];
    const walk=folder=>{
      if(!fs.existsSync(folder)) return;
      for(const e of fs.readdirSync(folder,{withFileTypes:true})) {
        if(e.isSymbolicLink() || e.name.startsWith('.'))continue;
        const full=path.join(folder,e.name);
        if(e.isDirectory()) {if(!['node_modules','__pycache__'].includes(e.name))walk(full); continue;}
        const ext=path.extname(e.name).toLowerCase();
        const effectAsset=inside(path.join(this.library,'echo-effects'),full);
        const type=TYPES[ext]||(effectAsset&&['.js','.mjs'].includes(ext)?'document':null);
        if(!type)continue;
        const relative=path.relative(this.root,full).split(path.sep).join('/');
        if(!inside(this.root,fs.realpathSync(full)))continue;
        const stat=fs.statSync(full), id=assetId(relative), role=this.data.roles.find(r=>relative.includes('/'+r.name+'/'));
        let category='reference', stage='concept';
        if(relative.includes('aberrant-character-kit'))category=relative.includes('技能图标')?'icon':relative.includes('三视图')?'turnaround':relative.includes('三个技能动作')?'action':relative.includes('独立立绘')?'portrait':'character';
        else if(relative.includes('aberrant-art-direction'))category=/场景|全景|大厅/.test(relative)?'scene':relative.includes('动作')?'action':'concept';
        if(['model','blender'].includes(type)){category='model';stage='modeling';}
        if(type==='animation'){category='animation';stage='animation';}
        if(type==='document'||type==='archive')category=type;
        found.push({id,name:e.name.replace(/\.[^.]+$/,''),path:relative,ext:ext.slice(1),type,category,stage,character:role?.name||'',versionIds:effectAsset?['v4']:relative.includes('aberrant')?['v3']:[],tags:effectAsset?['回响远征','战斗特效']:[],notes:'',size:stat.size,modifiedAt:stat.mtime.toISOString(),...this.data.assetMeta[id]});
      }
    };
    walk(path.join(this.root,'output'));
    walk(this.library);
    for(const f of fs.readdirSync(this.root))if(/^aberrant-frontier.*\.(jpg|png)$/.test(f)){
      const stat=fs.statSync(path.join(this.root,f)),id=assetId(f);
      found.push({id,name:f.replace(/\.[^.]+$/,''),path:f,ext:path.extname(f).slice(1),type:'image',category:'prototype',stage:'concept',character:'',versionIds:[f.includes('v3')?'v3':f.includes('v2')?'v2':'v1'],tags:[],notes:'游戏实机截图',size:stat.size,modifiedAt:stat.mtime.toISOString(),...this.data.assetMeta[id]});
    }
    const previous=new Set(this.data.assets.map(a=>a.id));
    const added=found.filter(a=>!previous.has(a.id)).length;
    this.data.assets=found.sort((a,b)=>a.path.localeCompare(b.path,'zh-CN'));
    if(added) this.log(`索引新增 ${added} 项资产`);
    this.save(); return {count:found.length,added};
  }
  snapshot(){return this.data;}
  fileForAsset(id) { const a=this.data.assets.find(a=>a.id===id); if(!a)throw new Error('找不到资产');return safeExisting(this.root,a.path); }
  updateAsset(id, patch) {
    const a=this.data.assets.find(a=>a.id===id);if(!a)throw new Error('找不到资产');
    const m={};
    if('name'in patch)m.name=required(patch.name,'名称',200);
    if('notes'in patch)m.notes=clean(patch.notes,10000);
    if('character'in patch)m.character=clean(patch.character,100);
    if('stage'in patch){if(!STAGES.includes(patch.stage))throw new Error('制作阶段无效');m.stage=patch.stage;}
    for(const k of ['tags','versionIds'])if(k in patch){if(!Array.isArray(patch[k])||patch[k].some(x=>typeof x!=='string'))throw new Error('列表无效');m[k]=[...new Set(patch[k].map(x=>clean(x,100)).filter(Boolean))].slice(0,30);}
    if(m.versionIds?.some(id=>!this.data.versions.some(v=>v.id===id)))throw new Error('版本不存在');
    this.data.assetMeta[id]={...this.data.assetMeta[id],...m};Object.assign(a,m);this.log(`更新资产：${a.name}`);this.save();return a;
  }
  upsertVersion(id, p) {
    let v=this.data.versions.find(x=>x.id===id);
    if(!v && !/^[a-z0-9][a-z0-9-]{0,30}$/.test(id))throw new Error('版本 ID 只能包含小写字母、数字和短横线');
    const update={title:required(p.title,'版本名称',100),subtitle:clean(p.subtitle,150),summary:required(p.summary,'简介',10000),limits:clean(p.limits,10000),features:Array.isArray(p.features)?p.features.map(x=>clean(x,300)).filter(Boolean).slice(0,20):[],status:p.status||'planned',updatedAt:now()};
    if(!['current','archived','planned'].includes(update.status))throw new Error('版本状态无效');
    if(update.status==='current')for(const x of this.data.versions)if(x.id!==id && x.status==='current')x.status='archived';
    if(v)Object.assign(v,update);else{v={id,...update,createdAt:now()};this.data.versions.push(v);}
    this.log(`保存版本：${id.toUpperCase()} ${v.title}`);this.save();return v;
  }
  upsertTask(id,p) {
    const existing=id?this.data.tasks.find(t=>t.id===id):null;if(id&&!existing)throw new Error('任务不存在');
    const t={...(existing||{id:crypto.randomUUID(),status:'todo',priority:'normal',dependsOn:[],deliverables:[],createdAt:now()}),...p};
    t.id=existing?.id||t.id;t.title=required(t.title,'任务名称',200);t.description=clean(t.description,10000);t.notes=clean(t.notes,10000);t.character=clean(t.character,100);
    if(!STAGES.includes(t.stage)||!STATUSES.includes(t.status))throw new Error('任务阶段或状态无效');
    if(!this.data.versions.some(v=>v.id===t.versionId))throw new Error('请选择有效版本');
    if(!Array.isArray(t.dependsOn)||t.dependsOn.some(x=>x===t.id||!this.data.tasks.some(y=>y.id===x)))throw new Error('前置任务无效');
    const reaches=(cur,seen=new Set())=>{if(cur===t.id)return true;if(seen.has(cur))return false;seen.add(cur);return (this.data.tasks.find(x=>x.id===cur)?.dependsOn||[]).some(x=>reaches(x,seen));};
    if(t.dependsOn.some(x=>reaches(x)))throw new Error('前置任务形成循环');
    if(!Array.isArray(t.deliverables)||t.deliverables.some(x=>!this.data.assets.some(a=>a.id===x)))throw new Error('交付资产无效');
    if(t.status==='done'&&t.dependsOn.some(x=>this.data.tasks.find(y=>y.id===x)?.status!=='done'))throw new Error('请先完成前置任务');
    t.updatedAt=now();if(existing)Object.assign(existing,t);else this.data.tasks.push(t);
    this.log(`更新任务：${t.title}`);this.save();return t;
  }
  manifest(versionId) {
    const version=this.data.versions.find(v=>v.id===versionId);if(!version)throw new Error('版本不存在');
    return {schemaVersion:1,exportedAt:now(),project:this.data.project,version,assets:this.data.assets.filter(a=>a.versionIds.includes(versionId)),tasks:this.data.tasks.filter(t=>t.versionId===versionId),pathBase:'workspace-relative',conventions:{units:'meters',source:'blend',runtime:['glb','fbx'],skeleton:'root > pelvis; left/right suffix .L/.R',animation:'character_action_variant; 30 fps suggested; root motion documented per clip'},note:'索引与制作计划；不表示资产已接入游戏运行时。'};
  }
}
