// Each column describes one mouse button and its independent two-rank study.
const attackForms={
 katana:[['三段斩','每阶斩击距离 +0.7 米。'],['拔刀剑气','每阶剑气飞行距离 +4 米。']],
 spear:[['连突','每阶刺击距离 +0.9 米。'],['破阵贯刺','每阶额外击退 1.2 米。']],
 dual:[['蝶刃连斩','每阶斩击距离 +0.5 米。'],['环身旋刃','每阶旋斩半径 +0.8 米。']],
 hammer:[['破甲挥击','每阶额外击退 0.8 米。'],['断层砸地','每阶震地半径 +1 米。']],
 crossbow:[['速射','每阶增加一枚侧箭，侧箭造成 45% 伤害。'],['扇面三矢','每阶每箭额外击退 0.7 米。']],
 rifle:[['点射','每阶额外击退 1 米。'],['贯甲弹','每阶可再贯穿一个目标。']]
};

const schools={
 ember:{name:'烬火',mark:'炎',color:'#f39a78',hex:0xff9367},
 frost:{name:'潮霜',mark:'霜',color:'#91dce3',hex:0x8adbeb},
 arc:{name:'脉电',mark:'雷',color:'#cfb3ed',hex:0xc4a0ff},
 forge:{name:'锻锋',mark:'锋',color:'#f0cb86',hex:0xffca78}
};
// [id, family, title, rule, maximum rank, prerequisites]
const talents=[
 ['brand','ember','引燃刃','直接命中点燃目标 3 秒；每秒造成 6 / 10 / 14 伤害。',3],
 ['cinder','ember','炎步','闪避在起点炸出半径 3.5 米的火环，点燃附近敌人。',1],
 ['flare','ember','赤焰回路','施放 E 或 X 时，朝身边 5 米释放 20 / 32 伤害的火浪。',2],
 ['wildfire','ember','飞烬','燃烧的敌人死亡时，向 6 米内的敌人传播引燃并造成 24 伤害。',1,['brand']],
 ['furnace','ember','炉心','击中燃烧目标额外造成 20% / 35% 直接伤害。',2,['brand']],
 ['chill','frost','冷凝','每次直接命中积累寒意，三层冻结目标 1.1 秒。首领冻结 0.3 秒。',1],
 ['iceStep','frost','冰径','闪避令身边 4 米的目标减速 2 / 3 秒。',2],
 ['spring','frost','回潮','每次进房回复 7 / 12 生命，立刻回复同等数值。',2],
 ['shatter','frost','碎冰','击中冻结目标，造成半径 5 米、35 / 52 伤害的碎冰爆发并解除冻结。',2,['chill']],
 ['rime','frost','冻脉','施放 E 或 X 给 6 米内敌人施加两层寒意。',1,['chill']],
 ['spark','arc','弧光','每三次直接命中放出闪电，最多弹到两名其他敌人，每跳 16 / 24 / 32 伤害。',3],
 ['capacitor','arc','蓄能','闪避为弧光积攒一次命中计数；没有弧光时，下次攻击额外造成 12 伤害。',1],
 ['surge','arc','短路','每次施放 E 或 X 对最近一个目标放电，造成 22 / 35 伤害。',2],
 ['relay','arc','中继','弧光的跳跃上限从两名增至四名，跳跃距离从 7 米增至 10 米。',1,['spark']],
 ['feedback','arc','反向充能','每次弧光触发时，E 与 X 的剩余冷却各减少 1.2 秒。',1,['spark']],
 ['edge','forge','开刃','重击或第三段连击的直接伤害提高 20%。每局一阶。',1],
 ['tempo','forge','快切','耐力达到 60 时，武器攻击冷却缩短 16%。每局一阶。',1],
 ['plate','forge','铸甲','最大生命提高 20，取得时回复 20。每局一阶。',1],
 ['echo','forge','回锋','每次重击或第三段连击，0.22 秒后向原命中目标再打出 45% 伤害。',1,['edge']],
 ['engine','forge','过载机芯','生命不高于 60% 时施放 E、X 或 Q，该次冷却缩短 25%。每局一阶。',1,['tempo']],
 ['steam','ember','蒸汽裂解','燃烧目标再受寒意时，产生 45 伤害的蒸汽爆炸。同一目标每 2 秒一次。',1,['brand','chill']],
 ['firewire','arc','电火花','弧光每跳都会点燃目标。命中已燃烧的跳跃目标额外造成 22 伤害。',1,['spark','brand']],
 ['icewire','frost','超导','弧光的每一跳直接冻结目标 0.8 秒，首领冻结 0.25 秒。',1,['spark','chill']],
 ['hotEdge','forge','赤炼','重击命中燃烧目标，会在其脚下额外引爆 55 伤害。',1,['edge','brand']],
 ['iceEdge','forge','冰砧','重击冻结目标额外造成 80 伤害，并回复 10 耐力。',1,['edge','chill']],
 ['liveEdge','arc','磁刃','重击直接触发弧光，即使场上只剩一个目标，也会回击它一次。',1,['edge','spark']],
 ['thermalStep','frost','霜燃步','闪避时，冰径为 4 米内燃烧的敌人叠两层寒意。炎步可以当场点燃它们。',1,['cinder','iceStep']],
 ['arcPin','arc','引雷针','短路标记目标 4 秒。直接命中标记引爆半径 5 米的电场，造成 26 伤害并回复 10 耐力。',1,['surge','tempo']],
 ['kilnGuard','ember','炉壁反震','完美反制时，以自身为中心释放半径 5 米的火环，造成 32 伤害并点燃敌人，回复 8 生命。',1,['plate','flare']],
 ['glideEdge','forge','追霜刃','直接命中减速目标回复 8 耐力，并缩短闪避冷却 0.25 秒。每 1.5 秒可触发一次。',1,['iceStep','tempo']],
 ['stormVent','arc','蒸雷涌','蒸汽裂解时向 8 米内最近的另一名敌人放电，造成 30 伤害。没有其他敌人时回击爆心目标。',1,['steam','surge']],
 ['quench','forge','霜火淬锋','赤炼引爆时，为爆心周围 4 米内的敌人叠两层寒意。每 2 秒可触发一次。',1,['hotEdge','chill']],
 ['backdraft','ember','余烬返流','炎步消耗至少 4 格刃温时，返还 3 秒炎步冷却。',1],
 ['pilotLight','ember','留火','释放灰烬封线时立刻获得 2 格刃温。',1],
 ['afterburn','ember','二重焰','满 6 格刃温发动炎步，爆圈内的目标会在 0.4 和 0.72 秒后再受 40、20 伤害。',1,['backdraft','pilotLight']],
 ['serrated','forge','倒钩','重击额外附加两层裂伤，最多五层。',1],
 ['bloodMeal','frost','啜血','猎扑每撕开一层裂伤，回复 3 生命。',1],
 ['packHunt','forge','追腥','猎扑击杀时，把三层裂伤传给 9 米内的其他敌人，并使其受到 18 点追猎伤害，可立即转扑。',1,['serrated','bloodMeal']],
 ['bedrock','forge','沉肩','展开骨盾时立刻获得 1 格岩势。',1],
 ['fault','arc','断层','骨垒消耗至少 2 格岩势时，缩短骨盾冷却 4 秒。',1],
 ['mountain','forge','不动山','骨垒消耗满 4 格岩势时回复 16 生命与 25 耐力，并缩短地裂震荡冷却 6 秒。',1,['bedrock','fault']],
 ['fracture','frost','贯晶','满 4 格霜压的霜锁可以贯穿两个目标。',1],
 ['whiteout','frost','冰床','冰棱陷阱延长 2 秒，第一次结晶造成额外 18 点伤害。',1],
 ['stillpoint','frost','无声碎裂','静寂之境命中冻结目标时引爆碎晶，额外造成 32 点伤害。',1,['fracture','whiteout']],
 ['shadowStep','arc','影步叠印','闪避穿过敌人或发动冲刺斩时，立即获得 2 格影印并使下次攻击附带 24 点影蚀伤害。',1],
 ['phantomMark','forge','幽刃破绽','背刺或对受控目标的直接伤害提高 32%，并额外叠加 1 格影印。',1],
 ['eclipse','arc','蚀月终幕','满 5 格影印施放 E 或重击时，在目标处引爆半径 5.5 米的 72 伤害影爆，并返还 50% 相位闪冷却。',1,['shadowStep','phantomMark']]
].map(([id,school,name,desc,max,needs=[]])=>({id,school,name,desc,max,needs}));
const giftById=Object.fromEntries(talents.map(t=>[t.id,t]));
Object.assign(giftById.fracture,{art:'spear-2'});
Object.assign(giftById.whiteout,{art:'rime'});
Object.assign(giftById.stillpoint,{art:'shatter'});
Object.assign(giftById.shadowStep,{art:'dual-2'});
Object.assign(giftById.phantomMark,{art:'dual-1'});
Object.assign(giftById.eclipse,{art:'dual-3'});
const rank=id=>run.gifts[id]||0;
const expeditionRoles={
 ember:{resource:'刃温',max:6,brief:'直接命中积刃温，击中燃烧目标积得更快。E 炎步在落点引爆全部刃温。',skills:'E 炎步突进引爆　·　X 铺设火场　·　Q 焚身强化',signature:['backdraft','pilotLight','afterburn'],
  pool:'brand cinder flare wildfire furnace chill iceStep shatter rime edge tempo surge steam thermalStep hotEdge quench stormVent arcPin'},
 frost:{resource:'霜压',max:4,brief:'武器命中积霜压。满四格后，E 霜锁消耗霜压打碎目标周围的冰晶。先布陷阱，再冻结并击破成群敌人。',skills:'E 冰矛破霜　·　X 铺设结晶陷阱　·　Q 冻结浪潮',signature:['fracture','whiteout','stillpoint'],
  pool:'chill iceStep spring shatter rime edge tempo plate brand steam surge arcPin spark icewire iceEdge glideEdge'},
 shade:{resource:'影印',max:5,brief:'冲刺斩、相位闪与连续命中积攒影印。满 5 格影印下一次强击或相位闪爆发高额暗影追击并刷新位移节奏。',skills:'E 相位闪现强化　·　X 留影诱饵扰敌　·　Q 幽影连闪无敌',signature:['shadowStep','phantomMark','eclipse'],
  pool:'spark capacitor surge relay feedback edge tempo echo chill iceStep glideEdge liveEdge arcPin icewire brand firewire'},
 reaper:{resource:'裂伤',max:5,brief:'直接命中叠裂伤。E 猎扑撕开目标全部裂伤，猎扑击杀立即刷新，可连续换目标。',skills:'E 猎扑收割　·　X 嗅猎群体挂伤　·　Q 狂猎加倍叠伤',signature:['serrated','bloodMeal','packHunt'],
  pool:'edge tempo echo iceStep chill spring shatter spark relay feedback capacitor icewire iceEdge liveEdge glideEdge'},
 bastion:{resource:'岩势',max:4,brief:'骨盾承击积 1 格岩势，完美反制积 2 格。X 骨垒将全部岩势化为身边的冲击波。',skills:'E 骨盾承击　·　X 骨垒震地　·　Q 击飞并蓄势',signature:['bedrock','fault','mountain'],
  pool:'plate edge tempo engine echo flare brand surge spark capacitor feedback furnace kilnGuard arcPin firewire liveEdge'}
};
for(const role of Object.values(expeditionRoles))role.book=new Set([...role.pool.split(' '),...role.signature]);
const unlockedStudies={
 ember:[['spark','firewire','capacitor','relay'],['icewire','liveEdge','iceEdge','echo'],['feedback','spring','glideEdge','engine']],
 frost:[['relay','feedback','capacitor','firewire'],['flare','stormVent','thermalStep','cinder'],['hotEdge','quench','furnace','wildfire']],
 shade:[['cinder','thermalStep','flare','furnace'],['shatter','iceEdge','steam','stormVent'],['hotEdge','quench','plate','engine']],
 reaper:[['surge','arcPin','rime','flare'],['brand','firewire','steam','furnace'],['stormVent','hotEdge','quench','wildfire']],
 bastion:[['chill','icewire','iceEdge','shatter'],['steam','stormVent','rime','iceStep'],['hotEdge','quench','glideEdge','spring']]
};
function roleBook(){
 const base=expeditionRoles[chosenClass].book;
 const extra=unlockedStudies[chosenClass].slice(0,run.unlockedDepth||0).flat();
 return talents.filter(t=>base.has(t.id)||extra.includes(t.id));
}
const signatureGift=t=>expeditionRoles[chosenClass].signature.includes(t.id);
const weaponStudies={
 katana:[['余烬刀痕','长刀第三段或右键命中点燃目标 3 秒。'],['煅红','长刀击中燃烧目标追加 18 伤害。'],['返照','施放技能后，下一次长刀命中在目标脚下爆开火环，造成 38 范围伤害。']],
 spear:[['枪尖距','长枪在 2.8 米外命中追加 16 伤害。'],['钉潮','枪尖距命中再积一层寒意，三层冻结。'],['霜贯','施放技能后，下一次长枪命中使目标与周围 4 米敌人积两层寒意。']],
 dual:[['双蝶','双刃连续两次命中同一目标，第二次追加 14 伤害，随后重新计数。'],['掠影','双蝶触发时回复 7 耐力，闪避冷却减少 0.25 秒。'],['蝶群','施放技能后，下一次双刃命中在目标身上连响三次，每响 14 伤害。']],
 hammer:[['沉钟','重锤第三段或右键命中发出震波，造成 18 范围伤害。'],['余震','沉钟命中使 E 的剩余冷却减少 1 秒，每次挥锤触发一次。'],['震心','施放技能后，下一次重锤命中震裂地面，在 5 米内造成 48 伤害。']],
 crossbow:[['隼印','每第三枚连弩命中的弩矢追加 15 伤害。'],['折翼','隼印触发时向最近两名相邻敌人各弹射 18 伤害。'],['群隼','施放技能后，下一枚命中的弩矢将 X 的剩余冷却减少 2 秒，并追加 22 伤害。']],
 rifle:[['远星','长铳弹体飞过 8 米后命中追加 24 伤害。'],['极光','远星命中时回复 9 耐力，同时令目标减速 2 秒。'],['星落','施放技能后，下一发长铳命中引爆能量仓回响，0.3 秒后再造成 55 伤害。']]
};
for(const [weapon,rows] of Object.entries(weaponStudies)){
 rows.forEach(([name,desc],i)=>{
  const id=weapon+'-'+(i+1);
  giftById[id]={id,weapon,name,desc,school:'forge',max:1,get needs(){
   if(i===0)return [];
   return i===1?[weapon+'-1','edge']:[weapon+'-2',expeditionRoles[chosenClass].signature[0]];
  }};
 });
}
for(const [weapon,forms] of Object.entries(attackForms)){
 forms.forEach(([name,desc],i)=>{
  const id=weapon+(i?'-right':'-left'),button=i?'右键':'左键';
  giftById[id]={id,weapon,name:button+' · '+name,desc,school:'forge',max:2,needs:[],art:'item-'+weapon};
 });
}
// Weapon Hammer transformations (Daedalus-style moveset evolutions)
const weaponHammers={
 katana:[
  ['katana-fan','三连烈焰扇','质变改造：右键拔刀剑气分裂为 3 道扇形火浪，覆盖整片正面战场。','hotEdge'],
  ['katana-nova','回旋炎环','质变改造：第三段连斩与冲刺斩爆发 360° 半径 4.8 米的炽焰环斩，额外造成 32 伤害。','flare']
 ],
 spear:[
  ['spear-flurry','万枪穿心','质变改造：右键破阵贯刺额外连续追射 2 道贯穿能量枪芒，伤害暴增。','spear-3'],
  ['spear-spire','雷霜枪阵','质变改造：长枪远距命中在目标脚下召唤半径 3.6 米的能量穿刺震波，造成 28 范围伤害。','stormVent']
 ],
 dual:[
  ['dual-clone','影舞残像','质变改造：闪避与冲刺斩在原地留下能量残像，0.24 秒后爆发半径 4 米 38 伤害的环刃斩。','dual-3'],
  ['dual-frenzy','疾风连舞','质变改造：每次连击使攻击速度提升 4%（最高 +40%），连续命中如疾风骤雨。','tempo']
 ],
 hammer:[
  ['hammer-meteor','陨星跳砸','质变改造：右键断层砸地跃起砸击并爆发半径 6.5 米超大震波，额外造成 42 范围伤害并强力破势。','hammer-3'],
  ['hammer-wave','地裂冲击波','质变改造：重锤挥击向前推出一道 11 米穿透地裂波，沿途造成 48 伤害。','fault']
 ],
 crossbow:[
  ['crossbow-scatter','五矢霰射','质变改造：右键扇面连射强化为 5 枚高爆散射弩矢，贴脸爆发毁天灭地。','crossbow-3'],
  ['crossbow-homing','微导追踪矢','质变改造：连弩弹矢获得自动偏转追踪能力，且命中暴击率提升 25%。','crossbow-2']
 ],
 rifle:[
  ['rifle-burst','超载爆裂弹','质变改造：长铳贯甲弹每穿透一名敌人，都在其体内引爆半径 4.2 米的 45 伤害冲击。','rifle-3'],
  ['rifle-twin','瞬发双连铳','质变改造：左键点射同步发射两枚交错高能脉冲弹，大幅提升压制火力。','rifle-2']
 ]
};
for(const [weapon,rows] of Object.entries(weaponHammers)){
 for(const [id,name,desc,art] of rows){
  giftById[id]={id,weapon,hammer:true,name,desc,school:'forge',max:1,needs:[],art};
 }
}

// Mirror of Echoes — Permanent Hades-style Meta-Progression (spent with 回响残片)
const mirrorUpgrades=[
 {id:'revive',name:'残火续命',en:'DEATH DEFIANCE',max:2,costs:[35,90],desc:'濒死时燃尽残火瞬间复活，回复 50% 生命并震飞周围敌人（每级 +1 次）。'},
 {id:'extraDash',name:'流影步',en:'GREATER REFLEX',max:1,costs:[30],desc:'获得额外 1 格独立闪避充能，实现连续两段高速冲刺与冲刺斩。'},
 {id:'vitality',name:'厚甲体魄',en:'THICK SKIN',max:3,costs:[20,40,70],desc:'每次远征初始最大生命永久提高 +15 / +30 / +45。'},
 {id:'roomHeal',name:'余温汲取',en:'CTHONIC VITALITY',max:3,costs:[20,45,75],desc:'每清除一间战斗房，额外回复 6 / 12 / 18 点生命。'},
 {id:'rarityBoost',name:'回响亲和',en:'GODS PRIDE',max:2,costs:[35,80],desc:'抽牌时稀有与传说回响的出现权重提升 +35% / +70%。'},
 {id:'extraRedraw',name:'命运重骰',en:'FATED PERSUASION',max:2,costs:[25,65],desc:'每一幕开始时额外获得 +1 / +2 次免费重抽机会。'},
 {id:'startCoins',name:'商队信物',en:'DEEP POCKETS',max:2,costs:[20,50],desc:'每次远征开局自带 25 / 55 晶片，便于在首站抢先成型。'}
];

// Fated List of Prophecies — Clear run-to-run mini-goals awarding Shards
const prophecies=[
 {id:'first_clear_act1',name:'跨越断轨',desc:'击败第一幕首领「断轨镇守者」。',reward:35},
 {id:'first_clear_act2',name:'潮汐折翼',desc:'击败第二幕首领「潮鸣母舰」。',reward:50},
 {id:'first_clear_run',name:'穿越回响',desc:'完成全部三幕远征并击败「镜冠花王」。',reward:90},
 {id:'combo_20',name:'行云流水',desc:'在单场战斗中达成 20 连击以上。',reward:25},
 {id:'dash_strike_10',name:'疾影破风',desc:'累计施放 10 次「冲刺斩」。',reward:25},
 {id:'parry_3',name:'铜墙铁壁',desc:'累计触发 3 次完美反制（C 键）。',reward:30},
 {id:'resonance_any',name:'双系初鸣',desc:'在一局中激活任意一项双系或三系共鸣天赋。',reward:35},
 {id:'hammer_any',name:'锻炉质变',desc:'在武器改造门或整备站获得任意一项武器质变改造。',reward:35},
 {id:'trial_win',name:'双派试炼',desc:'完成一次「双系试炼房」并夺取双倍回响。',reward:40},
 {id:'shade_run',name:'幽影行者',desc:'使用异变者「岚影」清除至少 3 间战斗房。',reward:35}
];

function buildBook(){return [...roleBook(),...Object.values(giftById).filter(t=>t.weapon===loadout[0]&&!t.hammer)];}
function hammerBook(){return Object.values(giftById).filter(t=>t.hammer&&t.weapon===loadout[0]&&!rank(t.id));}
function giftCategory(t){
 if(t.weapon)return 'weapon';
 if(signatureGift(t)||['flare','rime','surge','engine','arcPin','stormVent','feedback'].includes(t.id))return 'skill';
 return 'common';
}

function giftRarity(t){
 if(t.hammer)return 'legendary';
 if(t.weapon)return t.id.endsWith('-3')?'legendary':t.id.endsWith('-2')?'resonant':t.art?'advanced':'basic';
 if(t.needs.some(id=>giftById[id].needs.length>=2)||t.needs.length===2&&signatureGift(t))return 'legendary';
 if(t.needs.length>=2)return 'resonant';
 return t.needs.length||signatureGift(t)?'advanced':'basic';
}
const giftGrades={
 basic:{name:'普通',weight:8,eliteWeight:8,health:0},
 advanced:{name:'进阶',weight:5,eliteWeight:5,health:0},
 resonant:{name:'稀有',weight:2,eliteWeight:4,health:8},
 legendary:{name:'传说',weight:1,eliteWeight:2.5,health:18}
};
function giftDetail(t){
 const bonus=giftGrades[giftRarity(t)].health;
 const echo=t.weapon&&t.id.endsWith('-3')?'　共鸣触发后，0.48 秒再追击目标 24 点伤害。':'';
 return t.desc+echo+(bonus?'　持有时最大生命 +'+bonus+'。':'');
}

// Only studies feeding this action change its core silhouette. Conditional procs have their own models.
const castStudies={
 ember:{skill:['backdraft','afterburn'],utility:['pilotLight','brand'],ultimate:['brand','furnace']},
 frost:{skill:['fracture','shatter'],utility:['whiteout','rime'],ultimate:['stillpoint','iceEdge']},
 shade:{skill:['shadowStep','eclipse'],utility:['phantomMark','arcPin'],ultimate:['eclipse','liveEdge']},
 reaper:{skill:['serrated','bloodMeal','packHunt'],utility:['serrated','packHunt'],ultimate:['serrated','bloodMeal']},
 bastion:{skill:['bedrock'],utility:['fault','mountain'],ultimate:['fault','mountain']}
};

const talentMotifs={
 flare:['fire','plume'],rime:['ice','cage'],surge:['arc','fork'],engine:['metal','gears'],
 backdraft:['fire','return'],pilotLight:['fire','lantern'],afterburn:['fire','phoenix'],
 shadowStep:['arc','return'],phantomMark:['prey','hooks'],eclipse:['arc','storm'],
 serrated:['prey','hooks'],bloodMeal:['prey','return'],packHunt:['prey','pack'],
 bedrock:['metal','plates'],fault:['arc','fault'],mountain:['metal','citadel'],
 arcPin:['arc','needle'],feedback:['arc','return'],stormVent:['arc','storm'],
 steam:['emberice','plume'],firewire:['fire','fork'],icewire:['ice','fork'],
 hotEdge:['fire','hooks'],iceEdge:['ice','plates'],liveEdge:['arc','hooks'],
 thermalStep:['emberice','hooks'],kilnGuard:['fire','plates'],glideEdge:['ice','return'],
 quench:['emberice','cage'],
 'katana-3':['fire','phoenix'],'spear-3':['ice','cage'],'dual-3':['prey','pack'],
 'hammer-3':['metal','citadel'],'crossbow-3':['prey','wings'],'rifle-3':['arc','meteor']
};

const commonCastStudies=['flare','surge','rime'];
function castStudyIds(role,slot){
 return slot==='ultimate'?castStudies[role][slot]:[...castStudies[role][slot],...commonCastStudies];
}
