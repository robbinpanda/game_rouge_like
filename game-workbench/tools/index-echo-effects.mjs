import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {HEROES,WEAPONS} from '../../aberrant-frontier-v4/dist/data.js';
import {forms,casts,shapes,palettes,placements,treatments,shared,sharedByGift} from '../library/echo-effects/handling.mjs';

const folder=new URL('../library/echo-effects/',import.meta.url);
const registry=fs.readFileSync(new URL('studies.js',folder),'utf8');
const buttons={skill:'E',utility:'X',ultimate:'Q'};
function need(value,label){
 if(value==null||value==='')throw new Error('缺少特效档案 '+label);
 return value;
}
export function buildEffectIndex(){
 const context=vm.createContext({WEAPONS});
 vm.runInContext(registry,context);
 const read=code=>vm.runInContext(code,context);
 const {roles,unlocks,attacks,motifs}=read('({roles:expeditionRoles,unlocks:unlockedStudies,attacks:attackForms,motifs:talentMotifs})');
 const talents=read(`Object.values(giftById).map(g=>{
  const owner=Object.keys(expeditionRoles).find(role=>expeditionRoles[role].signature.includes(g.id));
  const needs={};
  for(const role of Object.keys(expeditionRoles)){chosenClass=role;needs[role]=[...g.needs];}
  chosenClass=owner||'ember';
  const grade=giftRarity(g);
  return {id:g.id,name:g.name,school:schools[g.school].name,owner:owner||'',weapon:g.weapon||'',max:g.max,
   rarity:giftGrades[grade].name,grade,rule:giftDetail(g),needs,effects:[]};
 })`);
 const byId=new Map(talents.map(t=>[t.id,t]));
 const effects=[];
 function record(id,kind,name,detail,source,ids,keys=[]){
  if(effects.some(f=>f.id===id))throw new Error('重复特效 '+id);
  const linked=[...new Set(ids)];
  for(const key of linked)need(byId.get(key),key).effects.push(id);
  effects.push({id,kind,name,detail,source,keys,talents:linked});
 }
 for(const [weapon,moves] of Object.entries(attacks)){
  for(const [i,[name]] of moves.entries()){
   const key=weapon+(i?'-right':'-left'),title=WEAPONS[weapon].short+' '+(i?'右键':'左键')+' · '+name;
   const distance=WEAPONS[weapon].type==='ranged',projectile=distance||weapon==='katana'&&i===1;
   const suffix=weapon+'/'+i;
   const keys=[(distance?'muzzle/':'swing/')+suffix];
   if(projectile)keys.push(...[0,1,2].map(level=>'bolt/'+suffix+'/'+level),'impact/'+suffix);
   record('form/'+key,'普攻',title,need(forms[key],key),'weapon-effects.js · '+(distance?'weaponFlash':'weaponSwing')+(projectile?' / formShot / formImpact':''),[key],keys);
  }
 }
 for(const role of Object.keys(roles)){
  const available=new Set([...roles[role].book,...unlocks[role].flat()]);
  for(const [slot,button] of Object.entries(buttons)){
   const [name,detail]=need(casts[role]?.[slot],role+'/'+slot).split('｜');
   const ids=read('castStudyIds('+JSON.stringify(role)+','+JSON.stringify(slot)+')');
   record('cast/'+role+'/'+slot,'技能',HEROES[role].name+' '+button+' · '+name,detail+' 本体最多显示三层强化。'+(available.has('engine')?'过载机芯仅在生命不高于 60% 时计入。':''),
    'skill-effects.js · showSkillCast / skillSculpture',[...ids,'engine'].filter(id=>available.has(id)),[role+'/'+slot]);
  }
 }
 for(const [id,[palette,shape]] of Object.entries(motifs)){
  const t=need(byId.get(id),id);
  const location=placements[id]||(t.weapon&&id.endsWith('-3')?(id==='rifle-3'?'首个命中目标的位置，延迟 0.30 秒落下。':'施放技能后的首次武器命中位置。'):null);
  const level=t.grade==='legendary'?'0.85 秒，显出两层空中碎片，整体放大至 1.16 倍。':
   t.grade==='resonant'?'0.65 秒，增加一层空中碎片。':t.max>1?'一阶 0.48 秒，二阶 0.65 秒并增加一层空中碎片。':'0.48 秒。';
  record('gift/'+id,'天赋触发',t.name+' · '+need(shapes[shape],shape),need(palettes[palette],palette)+'。'+need(location,id)+' '+level,'talent-effects.js · talentEffect / talentSculpture',[id],['gift/'+id]);
 }
 for(const [id,[name,source,detail]] of Object.entries(shared)){
  const ids=Object.entries(sharedByGift).filter(([,keys])=>keys.includes(id)).map(([key])=>key);
  if(id==='trail')ids.push('katana-right','crossbow-left','crossbow-right','rifle-left','rifle-right');
  const file=['pulse','discharge','chain','link'].includes(id)?'talent-effects.js':id==='frost'?'gifts.js → shared-effects.js':id==='hud'?'游戏 HUD':'shared-effects.js';
  record('shared/'+id,'通用反馈',name,detail,file+' · '+source,ids);
 }
 for(const [id,keys] of Object.entries(sharedByGift)){
  need(byId.get(id),id);
  for(const key of keys)need(shared[key],key);
 }
 for(const t of talents){
  const primary=t.effects.find(id=>id.startsWith('gift/')||id.startsWith('form/'));
  t.handling=treatments[t.id]||(primary?effects.find(f=>f.id===primary).detail:null);
  need(t.handling,t.id);
  t.owner=t.owner?HEROES[t.owner].name:t.weapon?WEAPONS[t.weapon].short:'流派';
  const unique=new Set(Object.values(t.needs).map(ids=>ids.join(',')));
  const names=ids=>ids.map(id=>need(byId.get(id),id).name).join('、')||'无';
  t.requires=unique.size===1?names(Object.values(t.needs)[0]):Object.entries(t.needs).map(([r,ids])=>HEROES[r].name+'需'+names(ids)).join(' / ');
  delete t.needs;
 }
 return {version:'回响远征',talents,effects};
}
export function writeEffectIndex(){
 const index=buildEffectIndex(),{talents,effects}=index;
 const talentNames=new Map(talents.map(t=>[t.id,t.name])),effectNames=new Map(effects.map(f=>[f.id,f.name]));
 const lines=['# 回响远征 · 天赋与特效手册','',
  '工作台侧栏的「天赋与特效」可以按名称、按键或编号查询。本手册随回响远征构建生成。','','## 天赋','',
  '| 天赋 | 稀有度 / 阶数 | 前置 | 触发与数值 | 画面处理 | 关联特效 |','|---|---|---|---|---|---|'];
 for(const t of talents)lines.push('| '+[t.owner+' · '+t.name+' `'+t.id+'`',t.rarity+' / '+t.max,t.requires,t.rule,t.handling,t.effects.map(id=>effectNames.get(id)).join('、')].join(' | ')+' |');
 for(const kind of ['普攻','技能','天赋触发','通用反馈']){
  lines.push('','## '+kind,'','| 特效 | 位置、形态与升级 | 关联天赋 | 实现入口 |','|---|---|---|---|');
  for(const f of effects.filter(f=>f.kind===kind))lines.push('| '+[f.name+' `'+f.id+'`',f.detail,f.talents.map(id=>talentNames.get(id)).join('、')||'基础动作反馈',f.source+(f.keys.length?' · '+f.keys.join('、'):'')].join(' | ')+' |');
 }
 lines.push('','## 播放与回收','','游戏在命中、施法或状态结算处调用中间层。角色技能、刀光、枪口光和天赋雕型共用几何缓存，播放进度由独立材质控制。回收时最多保留 12 份空闲技能材质。弩箭和铳弹按武器、按键、阶数缓存几何；拖尾、粒子与范围圈分别回池。普通命中喷溅在播放完毕后释放临时几何和材质。切换房间时清理仍在播放和延迟等待的战斗特效。','');
 for(const [name,body] of [['回响远征-特效索引.json',JSON.stringify(index,null,2)+'\n'],['天赋与特效手册.md',lines.join('\n')]]){
  const file=new URL(name,folder);
  if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==body)fs.writeFileSync(file,body);
 }
 return index;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))writeEffectIndex();
