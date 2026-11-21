function arsenalHit(e,amount,o){
 const id=o.weapon;if(!id)return amount;
 const p=e.avatar.group.position;
 if(id==='spear'&&o.distance>=2.8&&rank('spear-spire')){blast(p,3.6,28,0x71d8c2);calloutAt(p,'雷霜枪阵','frost');}
 if(id==='crossbow'&&rank('crossbow-homing')&&visualRoll()<.25){amount=Math.round(amount*1.5);calloutAt(p,'精准暴击','gold');}
 if(!rank(id+'-1'))return amount;
 const mastery=rank(id+'-2');
 if(id==='katana'){if(o.heavy)e.heat=3;if(mastery&&e.heat>0)amount+=18;}
 if(id==='spear'&&o.distance>=2.8){amount+=16;if(mastery)frostStack(e,1);}
 if(id==='dual'){if(run.twinTarget===e){amount+=14;run.twinTarget=null;if(mastery){stamina=Math.min(100,stamina+7);dodgeCd=Math.max(0,dodgeCd-.25);}}else run.twinTarget=e;}
 if(id==='hammer'&&o.heavy){
  blast(p,3.4,18,prismColors.hammer);
  if(mastery&&raid.strike&&!raid.strike.bell){skillCd=Math.max(0,skillCd-1);raid.strike.bell=true;}
 }
 if(id==='crossbow'&&++run.bolts%3===0){
  amount+=15;if(mastery){const nearby=enemies.filter(other=>other!==e&&!other.dead&&other.avatar.group.position.distanceTo(p)<=7);
   nearby.sort((a,b)=>a.avatar.group.position.distanceToSquared(p)-b.avatar.group.position.distanceToSquared(p));
   for(const target of nearby.slice(0,2)){queueEcho(target,18);drawTrail(p,target.avatar.group.position,prismColors.crossbow,.16,.04);}
  }
 }
 if(id==='rifle'&&o.distance>=8){amount+=24;if(mastery){stamina=Math.min(100,stamina+9);e.slow=Math.max(e.slow||0,2);}}
 if(run.armedStudy===id&&rank(id+'-3')){
  queueEcho(e,24,.48);
  run.armedStudy=null;roleFeedback(giftById[id+'-3'].name);talentEffect(id+'-3',p,id==='rifle'?.3:0);
  if(id==='katana')blast(p,4,38,prismColors[id],true);
  if(id==='spear')for(const other of enemies){if(!other.dead&&other.avatar.group.position.distanceTo(p)<=4)frostStack(other,2);}
  if(id==='dual')for(const delay of [.12,.24,.36])queueEcho(e,14,delay);
  if(id==='hammer')blast(p,5,48,prismColors[id]);
  if(id==='crossbow'){raid.utilityCd=Math.max(0,raid.utilityCd-2);amount+=22;}
  if(id==='rifle')queueEcho(e,55,.3);
 }
 return amount;
}


const GIFT_PATRONS={
 ember:{id:'ember',kind:'companion',name:'烬刃助力',en:'EMBER BOON',tag:'烬火 · 灼烧爆燃',mark:'炎',color:'#f39a78',hex:0xff9367},
 frost:{id:'frost',kind:'companion',name:'霜序助力',en:'FROST BOON',tag:'潮霜 · 减速冻结',mark:'霜',color:'#91dce3',hex:0x8adbeb},
 shade:{id:'shade',kind:'companion',name:'岚影助力',en:'SHADE BOON',tag:'脉电 · 连锁充能',mark:'雷',color:'#cfb3ed',hex:0xc4a0ff},
 bastion:{id:'bastion',kind:'companion',name:'玄岩助力',en:'BASTION BOON',tag:'重锋 · 护甲破势',mark:'岩',color:'#e8c882',hex:0xe8c882},
 reaper:{id:'reaper',kind:'companion',name:'裂爪助力',en:'REAPER BOON',tag:'疾锋 · 连斩撕裂',mark:'爪',color:'#b8e08e',hex:0xb8e08e}
};
const BASTION_FORGE_IDS=new Set(['brace','ballast','molt','plate','bedrock','fault','mountain','kilnGuard','iceEdge','quench']);
function giftPatron(t){
 if(!t)return GIFT_PATRONS.ember;
 if(t.hammer)return {id:chosenClass,kind:'hammer',name:'武器质变',en:'WEAPON ASPECT',tag:'重塑「'+WEAPONS[t.weapon].short+'」招式',mark:'锻',color:'#ffcf75',hex:0xffb84d};
 if(t.weapon)return {id:chosenClass,kind:'weapon',name:'武器强化',en:'WEAPON UPGRADE',tag:'强化「'+WEAPONS[t.weapon].short+'」',mark:'刃',color:'#f5c869',hex:0xf0c869};
 if(signatureGift(t)){
  const h=heroNow();
  return {id:chosenClass,kind:'skill',name:'技能强化',en:'SKILL UPGRADE',tag:'强化「'+h.name+'」专属技能',mark:h.symbol||'技',color:'#'+h.color.toString(16).padStart(6,'0'),hex:h.color};
 }
 if(t.school==='ember')return {...GIFT_PATRONS.ember,kind:'companion'};
 if(t.school==='frost')return {...GIFT_PATRONS.frost,kind:'companion'};
 if(t.school==='arc')return {...GIFT_PATRONS.shade,kind:'companion'};
 return {...(BASTION_FORGE_IDS.has(t.id)?GIFT_PATRONS.bastion:GIFT_PATRONS.reaper),kind:'companion'};
}
const SHORT_GIFT_DESC={
 brand:'普攻点燃敌人，造成持续灼烧伤害',
 cinder:'闪避在起点引爆火环并点燃周围',
 flare:'增强「E/X 技能」：施放时引爆周围火浪',
 wildfire:'燃烧敌人阵亡时爆炸并传染火焰',
 furnace:'对燃烧目标造成大幅额外伤害',
 chill:'普攻叠加寒意，满三层冻结敌人',
 iceStep:'闪避减速周围敌人 2~3 秒',
 spring:'每次进入新房间回复生命值',
 shatter:'击中冻结敌人引发大范围碎冰爆破',
 rime:'增强「E/X 技能」：大范围叠加寒意',
 spark:'每三次命中放出连锁闪电弹射群敌',
 capacitor:'闪避为下次攻击蓄电增伤',
 surge:'增强「E/X 技能」：对近敌劈落强雷',
 relay:'闪电链弹射增至 4 目标且距离更远',
 feedback:'触发闪电链时缩短 E/X 技能冷却',
 edge:'重击与三段终结斩伤害提高 20%',
 tempo:'高耐力时攻速提升 16%',
 plate:'最大生命 +20 并立刻回复 20 生命',
 echo:'重击命中后追加一次延迟回响斩',
 engine:'低血量时所有技能冷却缩短 25%',
 steam:'火+冰共鸣：引发大范围蒸汽爆炸',
 firewire:'雷+火共鸣：闪电链点燃并引爆灼烧',
 icewire:'雷+冰共鸣：闪电链直接冻结敌人',
 hotEdge:'重击燃烧敌人引爆大范围烈焰',
 iceEdge:'重击冻结敌人追加巨额破冰伤害',
 liveEdge:'重击直接触发连锁闪电',
 thermalStep:'火+冰共鸣：闪避引燃并急速冻结周围',
 arcPin:'技能雷击标记目标，命中引爆电场',
 kilnGuard:'完美反制爆发火环灼烧敌人并回血',
 glideEdge:'击中减速目标回耐力并减闪避冷却',
 stormVent:'三系共鸣：蒸汽爆炸追加高压落雷',
 quench:'三系共鸣：赤炼爆燃同时冻结周围',
 backdraft:'增强「炎步」：高刃温返还 3 秒冷却',
 pilotLight:'增强「灰烬封线」：立刻获得 2 格刃温',
 afterburn:'增强「炎步」：满刃温触发双重延迟爆燃',
 serrated:'增强「重击」：额外叠加 2 层裂伤',
 bloodMeal:'增强「猎扑」：撕开裂伤按层数吸血',
 packHunt:'增强「猎扑」：击杀传染裂伤并刷新冷却',
 bedrock:'增强「骨盾」：展开盾立刻获得 1 格岩势',
 fault:'增强「骨垒」：消耗岩势缩短骨盾冷却',
 mountain:'增强「骨垒」：满岩势回血回耐减大招冷却',
 fracture:'增强「霜锁」：满霜压冰矛贯穿双目标',
 whiteout:'增强「冰棱陷阱」：持续更久且额外伤敌',
 stillpoint:'增强「静寂之境」：击碎冻结目标引爆',
 shadowStep:'增强「冲刺斩」：立刻叠 2 影印并增伤',
 phantomMark:'增强「背刺/控场」：伤害 +32% 并叠影印',
 eclipse:'增强「相位闪」：满影印引爆大范围暗影',
 'katana-left':'增强「长刀左键」：斩击范围更大',
 'katana-right':'增强「拔刀剑气」：剑气射程更远',
 'spear-left':'增强「长枪左键」：突刺距离更长',
 'spear-right':'增强「破阵贯刺」：强力击退敌人',
 'dual-left':'增强「双刃左键」：连斩范围变大',
 'dual-right':'增强「环身旋刃」：旋斩范围变大',
 'hammer-left':'增强「重锤左键」：挥击强力击退',
 'hammer-right':'增强「断层砸地」：震地范围变大',
 'crossbow-left':'增强「连弩左键」：多射一枚侧箭',
 'crossbow-right':'增强「扇面三矢」：散射强力击退',
 'rifle-left':'增强「长铳左键」：点射强力击退',
 'rifle-right':'增强「贯甲弹」：穿透目标数 +1',
 'katana-1':'长刀重击命中点燃敌人 3 秒',
 'katana-2':'长刀击中燃烧敌人追加额外伤害',
 'katana-3':'放技能后下次长刀命中爆开大范围火环',
 'spear-1':'长枪中远距离刺击伤害大幅提高',
 'spear-2':'长枪远距刺击附带寒意并可冻结',
 'spear-3':'放技能后下次长枪命中大范围叠寒意',
 'dual-1':'双刃连击同一目标追加爆发伤害',
 'dual-2':'双刃连击回耐力并缩短闪避冷却',
 'dual-3':'放技能后下次双刃命中追加三连斩',
 'hammer-1':'重锤重击命中爆发大范围震荡波',
 'hammer-2':'重锤震波命中缩短 E 技能冷却',
 'hammer-3':'放技能后下次重锤命中震裂地面',
 'crossbow-1':'连弩每第三发弩矢追加爆发伤害',
 'crossbow-2':'连弩爆发箭向附近双敌弹射伤害',
 'crossbow-3':'放技能后下发弩矢增伤并减 X 冷却',
 'rifle-1':'长铳远距离狙击伤害大幅提高',
 'rifle-2':'长铳远距命中回耐力并减速敌人',
 'rifle-3':'放技能后下发长铳命中延迟引爆高伤',
 'katana-fan':'右键剑气变为三道扇形火浪',
 'katana-nova':'终结斩与冲刺斩爆发 360° 炎环',
 'spear-flurry':'右键贯刺连续追射两道穿透枪芒',
 'spear-spire':'远距刺击在目标脚下召唤雷霜震波',
 'dual-clone':'闪避与冲刺斩留下延时爆炸残像',
 'dual-frenzy':'连续命中叠加攻速，最高 +40%',
 'hammer-meteor':'右键变为大范围跃起陨星砸地',
 'hammer-wave':'挥锤向前推出 11 米穿透地裂波',
 'crossbow-scatter':'右键扇射强化为 5 枚高爆散射矢',
 'crossbow-homing':'弩矢自动追踪且暴击率 +25%',
 'rifle-burst':'贯甲弹每次穿透都在体内引爆冲击',
 'rifle-twin':'左键点射变为瞬发双连脉冲弹'
};
function giftShortDesc(t){
 if(!t)return '';
 return SHORT_GIFT_DESC[t.id]||t.desc.split('。')[0];
}

function giftRoute(id){
 const missing=new Set();
 function visit(key){
  if(rank(key)||missing.has(key))return;
  for(const need of giftById[key].needs)visit(need);
  missing.add(key);
 }
 if(id)visit(id);
 return [...missing];
}
function resonanceTier(talent){
 if(talent.weapon&&talent.art)return talent.id.endsWith('-right')?'右键专精':'左键专精';
 if(talent.weapon)return WEAPONS[talent.weapon].short+' · '+(talent.id.endsWith('-3')?'技能共鸣':talent.id.endsWith('-2')?'通用联动':'入门');
 if(signatureGift(talent))return talent.needs.length?'专属进阶':'专属天赋';
 if(talent.needs.length<2)return '';
 return talent.needs.some(id=>giftById[id].needs.length>=2)?'三系共鸣':'双系共鸣';
}
function weightedGifts(list,elite,roll){
 const boost=1+(typeof mirrorLevel==='function'?mirrorLevel('rarityBoost')*.35:0);
 // Exponential-race ordering samples without replacement and uses only the draft stream.
 return list.map(t=>{
  const r=giftRarity(t),grade=giftGrades[r];
  let weight=elite?grade.eliteWeight:grade.weight;
  if(r==='resonant'||r==='legendary')weight*=boost;
  return {t,key:-Math.log(1-roll())/weight};
 }).sort((a,b)=>a.key-b.key).map(entry=>entry.t);
}
function shuffled(list,roll=run.random){const copy=[...list];for(let i=copy.length-1;i>0;i--){const j=Math.floor(roll()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
function availableGifts(){return buildBook().filter(t=>rank(t.id)<t.max&&t.needs.every(id=>rank(id)));}
function acquireGift(id){
 const g=giftById[id];if(!g||(!g.hammer&&!buildBook().includes(g))||rank(id)>=g.max||!g.needs.every(n=>rank(n)))return false;
 const first=!rank(id);
 run.gifts[id]=rank(id)+1;
 if(first)maxHp+=giftGrades[giftRarity(g)].health;
 if(run.trackedGift===id)run.trackedGift=null;
 if(id==='plate'){maxHp+=20;hp=Math.min(hp+20,maxHp);}
 if(id==='spring')hp=Math.min(maxHp,hp+(rank(id)===1?7:12));
 if(g.hammer&&typeof unlockProphecy==='function')unlockProphecy('hammer_any');
 if(g.needs.length>=2&&typeof unlockProphecy==='function')unlockProphecy('resonance_any');
 return true;
}
function giftTempo(){return rank('tempo')&&(rogueMode||stamina>=60)?.84:1;}
function schoolCounts(){
 const counts={ember:0,frost:0,arc:0,forge:0};
 for(const [id,level] of Object.entries(run.gifts))counts[giftById[id].school]+=level;
 return Object.entries(counts).filter(([,level])=>level).map(([id,level])=>schools[id].name+' '+level).join(' · ');
}
function canRemoveGift(id){
 return rank(id)>0&&(rank(id)>1||!Object.keys(run.gifts).some(other=>giftById[other].needs.includes(id)));
}
function removeGift(id){
 if(!canRemoveGift(id))return false;
 if(--run.gifts[id]===0){
  delete run.gifts[id];maxHp-=giftGrades[giftRarity(giftById[id])].health;hp=Math.min(hp,maxHp);
 }
 if(id==='plate'){maxHp-=20;hp=Math.min(hp,maxHp);}
 if(id==='capacitor')run.primed=false;
 if(id==='spark')run.charge=0;
 if(id===run.armedStudy+'-3')run.armedStudy=null;
 return true;
}
function blast(p,r,damage,colour,ignite=false){
 pulseAt(p,r,colour);
 for(const e of enemies){if(e.dead||e.avatar.group.position.distanceTo(p)>r)continue;
  if(ignite)e.heat=3;queueEcho(e,damage);}
}
function queueEcho(enemy,amount,delay=0){run.echoes.push({enemy,amount,due:time+delay});}
function frostStack(e,n){
 e.cold=(e.cold||0)+n+(hasAffix(e,'wet')?1:0);e.slow=Math.max(e.slow,1.7);
 if(e.cold>=3){e.cold=0;e.frozen=e.boss?.3:1.1;impactSpray(e.avatar.group.position.clone().add(new THREE.Vector3(0,1.1,0)),schools.frost.hex);}
 if(e.heat>0&&rank('steam')&&time>=(e.steamAt||0)){
  e.steamAt=time+2;const origin=e.avatar.group.position;
  comboFeedback('steam',origin);blast(origin,4.8,45,0xe1eeed);
  if(rank('stormVent')){
   let target=e,range=8;
   for(const other of enemies){
    if(other===e||other.dead)continue;
    const dist=other.avatar.group.position.distanceTo(origin);
    if(dist<=range){target=other;range=dist;}
   }
   const start=origin.clone().setY(target===e?3.6:1.8);
   drawTrail(start,target.avatar.group.position.clone().setY(1.2),schools.arc.hex,.23,.08);
   comboFeedback('stormVent',target.avatar.group.position);queueEcho(target,30*conductivity(target));
  }
 }
}
function chainLightning(first){
 const visited=new Set([first]);let from=first;
 for(let i=0;i<(rank('relay')?4:2);i++){
  let nearest=null,dist=rank('relay')?10:7;
  for(const e of enemies){const d=e.avatar.group.position.distanceTo(from.avatar.group.position);if(!e.dead&&!visited.has(e)&&d<=dist){nearest=e;dist=d;}}
  if(!nearest)break;visited.add(nearest);
  showChainArc(from.avatar.group.position,nearest.avatar.group.position);
  queueEcho(nearest,(8+8*rank('spark')+(rank('firewire')&&nearest.heat>0?22:0))*conductivity(nearest));
  if(rank('firewire')){nearest.heat=3;comboFeedback('firewire',nearest.avatar.group.position);}
  if(rank('icewire')){nearest.frozen=nearest.boss?.25:.8;comboFeedback('icewire',nearest.avatar.group.position);}
  from=nearest;
 }
 if(rank('liveEdge')){comboFeedback('liveEdge',first.avatar.group.position);queueEcho(first,18*conductivity(first),.15);}
 if(rank('feedback')){talentEffect('feedback',player.group.position);skillCd=Math.max(0,skillCd-1.2);raid.utilityCd=Math.max(0,raid.utilityCd-1.2);}
}
function giftHit(e,amount,options){
 if(options.echo)return amount;
 if(hasAffix(e,'armored')&&!options.heavy&&e.heat<=0&&e.burn<=0&&e.frozen<=0)amount*=.75;
 if(run.contracts.includes('glass'))amount*=1.3;
 if(run.mods[options.weapon]&&(e.stagger>0||e.frozen>0))amount*=1.25;
 amount=arsenalHit(e,amount,options);
 if(chosenClass==='ember')run.power=Math.min(6,run.power+(e.heat>0||e.burn>0?2:1));
 if(chosenClass==='frost'&&options.weapon)run.power=Math.min(4,run.power+1);
 if(chosenClass==='shade'){
  const controlled=e.stagger>0||e.slow>0||e.frozen>0;
  if(rank('phantomMark')&&controlled){amount=Math.round(amount*1.32);run.power=Math.min(5,run.power+1);}
  if(options.heavy&&run.power>=5){
   run.power=0;const dmg=rank('eclipse')?72:44;
   blast(e.avatar.group.position,5.5,dmg,0xc394ff);calloutAt(e.avatar.group.position,rank('eclipse')?'蚀月终幕！':'满影引爆！','arc');
   if(rank('eclipse'))skillCd*=.5;
  }else if(options.weapon)run.power=Math.min(5,run.power+1);
 }
 if(chosenClass==='reaper'&&!options.pounce){
  if(options.heavy&&rank('serrated'))talentEffect('serrated',e.avatar.group.position);
  const cuts=(buffTime>0?2:1)+(options.heavy&&rank('serrated')?2:0);
  e.wounds=Math.min(5,(e.wounds||0)+cuts);
 }
 const burning=e.heat>0,iced=e.frozen>0;
 if(e.arcPinUntil>time){
  comboFeedback('arcPin',e.avatar.group.position);e.arcPinUntil=0;blast(e.avatar.group.position,5,26,schools.arc.hex);stamina=Math.min(100,stamina+10);
 }
 if(rank('glideEdge')&&e.slow>0&&time>=run.glideAt){
  comboFeedback('glideEdge',player.group.position);run.glideAt=time+1.5;stamina=Math.min(100,stamina+8);dodgeCd=Math.max(0,dodgeCd-.25);
 }
 if(run.firebellReady&&rank('firebell')){amount+=15;run.firebellReady=false;}
 if(options.heavy&&rank('sparkRush'))raid.utilityCd=Math.max(0,raid.utilityCd-.3);
 if(options.heavy&&rank('finisher')&&e.hp<e.maxHp*.5)hp=Math.min(maxHp,hp+2);
 if(rank('stalk')&&e.hp===e.maxHp)amount+=16;
 if(options.heavy&&burning&&rank('hearth'))stamina=Math.min(100,stamina+3);
 if(e.slow>0)amount+=[0,6,10][rank('brine')];
 if(options.heavy&&e.stagger>0&&rank('ballast'))amount+=14;
 if(e.hp<e.maxHp*.5&&rank('pursuit'))amount*=1.12;
 if(options.heavy&&rank('edge'))amount*=1.2;
 if(burning)amount*=1+[0,.2,.35][rank('furnace')];
 if(run.primed){amount+=18;run.primed=false;}
 if(options.heavy&&iced&&rank('iceEdge')){comboFeedback('iceEdge',e.avatar.group.position);amount+=80;stamina=Math.min(100,stamina+10);}
 if(iced&&rank('shatter')){e.frozen=0;blast(e.avatar.group.position,5,rank('shatter')===1?35:52,schools.frost.hex);}
 if(burning&&options.heavy&&rank('hotEdge')){
  comboFeedback('hotEdge',e.avatar.group.position);const origin=e.avatar.group.position;blast(origin,3.8,55,schools.ember.hex);
  if(rank('quench')&&time>=run.quenchAt){
   comboFeedback('quench',origin);run.quenchAt=time+2;pulseAt(origin,4,schools.frost.hex);
   for(const other of enemies)if(!other.dead&&other.avatar.group.position.distanceTo(origin)<=4)frostStack(other,2);
  }
 }
 if(rank('brand'))e.heat=3;
 if(rank('chill'))frostStack(e,1);
 if(rank('spark')&&(++run.charge>=3||options.heavy&&rank('liveEdge'))){run.charge=0;chainLightning(e);}
 if(options.heavy&&rank('echo'))queueEcho(e,Math.min(75,amount*.45),.22);
 return amount;
}
function dashGift(){
 if(rank('floe'))stamina=Math.min(100,stamina+4);
 if(rank('cinder'))blast(player.group.position,3.8,16,schools.ember.hex,true);
 if(rank('iceStep')){
  pulseAt(player.group.position,4,schools.frost.hex);
  for(const e of enemies)if(!e.dead&&e.avatar.group.position.distanceTo(player.group.position)<=4){
   e.slow=Math.max(e.slow,1+rank('iceStep'));
   if(rank('thermalStep')&&e.heat>0){frostStack(e,2);comboFeedback('thermalStep',e.avatar.group.position);}
  }
 }
 if(rank('capacitor')){if(rank('spark'))run.charge=Math.min(2,run.charge+1);else run.primed=true;}
}
function ventBlade(power){
 if(!power)return;
 const pos=player.group.position,radius=3+power*.45;
 blast(pos,radius,power*9,schools.ember.hex,true);
 roleFeedback(power+' 格刃温引爆'+(power===6&&rank('afterburn')?' · 二重焰':''));
 if(power>=4&&rank('backdraft')){skillCd=Math.max(0,skillCd-3);talentEffect('backdraft',pos);}
 if(power===6&&rank('afterburn')){
  talentEffect('afterburn',pos,.4);talentEffect('afterburn',pos,.72);
  for(const enemy of enemies)if(!enemy.dead&&enemy.avatar.group.position.distanceTo(pos)<=radius){queueEcho(enemy,40,.4);queueEcho(enemy,20,.72);}
 }
}
function rendPrey(target){
 const wounds=target.wounds||0;target.wounds=0;
 damageEnemy(target,52+12*wounds,'player',null,{pounce:true,stagger:.8});
 if(wounds&&rank('bloodMeal')){hp=Math.min(maxHp,hp+3*wounds);talentLink(target.avatar.group.position,player.group.position,0x9aeaaf);talentEffect('bloodMeal',player.group.position);}
 roleFeedback(target.dead?'收割成功 · 猎扑已刷新':'撕开 '+wounds+' 层裂伤');
 if(!target.dead)return;
 skillCd=0;pulseAt(target.avatar.group.position,2.5,heroNow().color);
 if(rank('packHunt'))markPrey(target.avatar.group.position,9,3,true);
}
function markPrey(pos,radius,stacks,pack=false){
 for(const e of enemies)if(!e.dead&&e.avatar.group.position.distanceTo(pos)<=radius){
  e.wounds=Math.min(5,(e.wounds||0)+stacks);
  if(pack){talentLink(pos,e.avatar.group.position,0xe9d08f);talentEffect('packHunt',e.avatar.group.position);queueEcho(e,18,.25);}
 }
}
function releaseBastion(){
 const power=run.power;run.power=0;
 if(!power)return;
 blast(player.group.position,4+power*.6,power*17,heroNow().color);
 shake=Math.max(shake,.04*power);roleFeedback(power+' 格岩势释放 · 骨垒震地');
 if(power>=2&&rank('fault')){skillCd=Math.max(0,skillCd-4);talentEffect('fault',player.group.position);}
 if(power===4&&rank('mountain')){talentEffect('mountain',player.group.position);stamina=Math.min(100,stamina+25);hp=Math.min(maxHp,hp+16);ultimateCd=Math.max(0,ultimateCd-6);}
}
function roleFeedback(text){run.roleNote=text;run.roleNoteUntil=time+2.2;}
function comboFeedback(id,position=player.group.position){
 talentEffect(id,position);
 if(run.comboTime!==time){run.comboTime=time;run.comboNames=[];}
 const name=giftById[id].name;
 if(!run.comboNames.includes(name))run.comboNames.push(name);
 roleFeedback(run.comboNames.join(' · ')+'！');
 if(typeof calloutAt==='function')calloutAt(position,name+'！',giftById[id].school==='frost'?'frost':giftById[id].school==='arc'?'arc':'ember');
 if(giftById[id].school==='arc'&&typeof cue==='function')cue('thunder',position);
}
function castGift(slot){
 if(slot==='ultimate')showSkillCast(slot);
 const weapon=loadout[activeWeapon];if(rank(weapon+'-3'))run.armedStudy=weapon;
 if(slot==='utility'&&chosenClass==='ember'&&rank('pilotLight')){run.power=Math.min(6,run.power+2);talentEffect('pilotLight',player.group.position);}
 if(chosenClass==='bastion'){
  if(slot==='skill'&&rank('bedrock')){run.power=Math.min(4,run.power+1);talentEffect('bedrock',player.group.position);}
  if(slot==='ultimate')run.power=Math.min(4,run.power+2);
  if(slot==='utility')releaseBastion();
 }
 if(rank('engine')&&hp<=maxHp*.6)talentEffect('engine',player.group.position);
 const rate=(rank('engine')&&hp<=maxHp*.6?.75:1)*(run.contracts.includes('clock')?.75:1);
 if(slot==='skill')skillCd*=rate;else if(slot==='utility')raid.utilityCd*=rate;else{ultimateCd*=rate;return;}
 if(rank('firebell'))run.firebellReady=true;
 if(slot==='utility'&&rank('returnArc'))skillCd=Math.max(0,skillCd-1);
 if(rank('coil'))stamina=Math.min(100,stamina+6);
 const p=player.group.position;
 if(rank('flare')){blast(p,5,rank('flare')===1?20:32,schools.ember.hex,true);talentEffect('flare',p);}
 if(rank('rime'))for(const e of enemies){if(!e.dead&&e.avatar.group.position.distanceTo(p)<6){frostStack(e,2);talentEffect('rime',e.avatar.group.position);}}
 if(rank('surge')){
  const target=enemies.filter(e=>!e.dead&&e.avatar.group.position.distanceTo(p)<16).sort((a,b)=>a.avatar.group.position.distanceToSquared(p)-b.avatar.group.position.distanceToSquared(p))[0];
  if(target){
   talentEffect('surge',target.avatar.group.position);
   showDischarge(p,target.avatar.group.position,rank('surge'));
   queueEcho(target,(rank('surge')===1?22:35)*conductivity(target));
   if(rank('arcPin')){target.arcPinUntil=time+4;talentEffect('arcPin',target.avatar.group.position);}
  }
 }
}
function tickGifts(dt){
 for(const e of enemies){
  if(e.dead){if(!e.deathGift){e.deathGift=true;if(rank('wildfire')&&e.heat>0)blast(e.avatar.group.position,6,24,schools.ember.hex,true);}continue;}
  if(e.heat>0||e.burn>0){e.heat=Math.max(0,e.heat-dt);e.burn=Math.max(0,e.burn-dt);e.heatClock-=dt;
   if(e.heatClock<=0){e.heatClock=1;queueEcho(e,Math.max(6,2+rank('brand')*4));}}
 }
 const ready=run.echoes.filter(x=>x.due<=time);run.echoes=run.echoes.filter(x=>x.due>time);
 for(const hit of ready)if(!hit.enemy.dead)damageEnemy(hit.enemy,Math.round(hit.amount),'player',null,{echo:true,stagger:.04});
}
