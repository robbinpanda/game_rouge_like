import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../../',import.meta.url);
const kit='game-workbench/library/echo-art/';
const {assets}=JSON.parse(fs.readFileSync(new URL(kit+'manifest.json',root),'utf8'));
const gifts=fs.readFileSync(new URL('game-workbench/library/echo-effects/studies.js',root),'utf8');
const {talents,schools}=vm.runInNewContext(gifts+'\n;({talents,schools})');
const byId=new Map(talents.map(t=>[t.id,t]));
const kind={weapons:'武器图标',skills:'技能图标',talents:'天赋图标',creatures:'小怪立绘',bosses:'首领立绘',regions:'场景示意图'};
async function api(route,method='GET',body){
 const res=await fetch('http://127.0.0.1:4180/api/'+route,{method,headers:{'X-Workbench-Request':'1','Content-Type':'application/json'},body:body&&JSON.stringify(body)});
 if(!res.ok)throw Error(await res.text());
 return res.json();
}
await api('scan','POST');
const catalog=await api('catalog');
for(const a of assets){
 const entry=catalog.assets.find(x=>x.path===kit+a.source);
 if(!entry)throw Error('Missing source '+a.source);
 const t=byId.get(a.id),labels=['回响远征',kind[a.group]];
 if(t){labels.push(schools[t.school].name);if(t.needs.length===2)labels.push('双系共鸣');}
 const tags=[...new Set([...entry.tags,...labels])];
 const versionIds=[...new Set([...entry.versionIds.filter(id=>id!=='v3'), 'v4'])];
 const notes=entry.notes||('内置图像生成原画。运行时资源 echo-'+a.id+'.webp。'+(t?t.desc:''));
 if(notes!==entry.notes||JSON.stringify(tags)!==JSON.stringify(entry.tags)||JSON.stringify(versionIds)!==JSON.stringify(entry.versionIds))
  await api('assets/'+entry.id,'PATCH',{tags,versionIds,notes});
}
const result=await api('manifest?version=v4');
const linked=result.assets.filter(a=>a.tags.includes('回响远征')&&a.type==='image'&&a.path.startsWith(kit));
if(linked.length!==assets.length)throw Error('Incomplete asset registration');
console.log('Registered',linked.length,'images',Object.fromEntries(['icon','scene','portrait'].map(c=>[c,linked.filter(a=>a.category===c).length])));
