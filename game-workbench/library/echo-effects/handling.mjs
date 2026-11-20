// Art direction notes for the catalogue. Keys match the runtime's attack, cast and proc IDs.
export const forms={
 'katana-left':'由腰侧向上横扫的橙金刀弧，第二段反向。每阶多一层平行刀光，扇面随攻击距离延伸。',
 'katana-right':'冰蓝刀光从前方向上挑起，斜月形剑气从胸口飞出。每阶多一层拔刀光和剑气，飞行距离增加，命中碎片增多。',
 'spear-left':'胸前伸出一线金色枪尖，两侧倒 V 形气流向枪尖聚拢。每阶多一对气流折线，枪影随刺击距离伸长。',
 'spear-right':'青绿色粗枪芯向前贯刺，双螺旋缠在枪身周围。一阶添加第三股，二阶添加第四股，同时加大击退。',
 'dual-left':'两束粉紫刀光由肩部交叉下切，连击换侧。每阶额外叠一对交叉刃，斩击距离同步增长。',
 'dual-right':'蓝紫刀带从脚边盘旋至腰胸，绕自身旋转。一阶出现第三股，二阶出现第四股，旋斩半径逐阶扩大。',
 'hammer-left':'铜金色厚弧横掠，细碎岩屑沿打击方向崩出。每阶多一层锤风与一组岩屑，目标被推得更远。',
 'hammer-right':'橙红重锤从头顶落下，前方扇面朝上喷出岩柱。每阶补一组不同高度的柱尖，崩裂范围随半径扩大。',
 'crossbow-left':'青绿色细箭沿准星发射。一阶增加一支侧箭和亮尾羽，二阶再加另一侧箭和翼状光带。每阶加粗拖尾，命中分叉碎线增多。',
 'crossbow-right':'金橙宽头三矢同时扇射，弩口三个方向各有一道闪光。一阶箭尾生出亮羽，二阶增添翼带；每阶击退加深，命中处的分叉更密。',
 'rifle-left':'冰蓝星芒在枪口短促炸开，弹芯细直。一、二阶分别亮起一侧弹翼，枪口与命中碎光增加，击退增强。',
 'rifle-right':'紫色粗弹芯缠着螺旋，从枪口钻出。每阶多一股螺旋，飞行拖尾更宽，多贯穿一个目标，每次命中都留下前冲的碎晶。'
};
export const casts={
 ember:{
  skill:'炎步｜火流从起步位置沿实际突进方向卷向落点，随位移拉伸。升阶增加螺旋火带和向上逸散的火屑。',
  utility:'灰烬封线｜前方横向升起火墙，火星沿长方形灼烧区域继续喷发。升阶增加低位飞火。',
  ultimate:'焚身领域｜十一道火舌从立足点向外甩开，圆形冲击随火舌向外扫过。'},
 frost:{
  skill:'霜锁｜离手的多棱冰矛拖着蓝白尾迹。满霜压时，命中后向目标周围打出碎晶。',
  utility:'冰棱陷阱｜十二道冰棱围出陷阱，首次冻结时在被困目标身上迸出冰屑。',
  ultimate:'静寂之境｜冷锋从施法点向外扩散，错落冰簇随冷锋升起。'},
 shade:{
  skill:'相位闪｜紫电相位流丝随瞬移方向拉出残影，满影印时在落点引爆暗影冲击。',
  utility:'留影诱饵｜原地升起八棱相位晶锥干扰敌人仇恨，留下持续扰敌区域。',
  ultimate:'幽影乱舞｜十四道紫芒影弧绕身高速连斩，对范围内敌人造成重创与失衡。'},
 reaper:{
  skill:'猎扑｜角色扑出后，青绿爪痕从高处交叉撕下。升阶依次显出反向爪痕。',
  utility:'脉冲嗅猎｜原地展开一圈朝内弯的直立月刃，另有扩张脉冲标记扫描范围。升阶补齐刃列。',
  ultimate:'狂猎｜高举的月刃围拢角色，随身旋转。升阶依次添刃，加密轮廓。'},
 bastion:{
  skill:'骨盾｜骨甲在身前叠成开口的盾壳，跟随角色移动和转身。升阶增加上缘外伸的骨刺。',
  utility:'骨垒｜施法处破土而出一簇岩柱，前方的持续防区另有范围标记。升阶增加柱身、侧棱与顶端亮片。',
  ultimate:'地裂震荡｜粗高岩柱环绕施法位置升起，末段下沉。升阶增加外侧柱尖和飞出的亮石。'}
};
export const shapes={plume:'四股竖向旋流',cage:'七棱尖刺向内合拢',fork:'三束分岔折电',gears:'竖立的八齿光轮',return:'三条弧带从外侧收回',lantern:'两簇悬空火芯',phoenix:'展翼火羽与中央上升旋流',hooks:'成对下扣的弯钩',pack:'伸展翼刃与两颗下刺獠牙',plates:'三面扇形护甲',fault:'从外向内折起的断层光线',citadel:'六根高柱与柱间连接的拱棱',needle:'单束折线与一枚垂直长针',storm:'六束折电与外围旋流',wings:'成对张开的三层翼羽',meteor:'三枚斜坠的流星尖晶'};
export const palettes={fire:'焰橙',ice:'冰蓝',arc:'电紫',metal:'铁灰与铸金',prey:'猎绿',emberice:'暖橙与冰蓝'};
export const placements={
 flare:'施法者周围，叠加火浪范围圈。',rime:'每个实际受到寒意的敌人。',surge:'被选中的目标，电弧从施法者胸前连到目标；二阶再分叉并溅出电火花。',engine:'低血量施法者身前。',
 backdraft:'炎步落点。',pilotLight:'施法者身边。',afterburn:'满刃温的落点，延迟 0.40 秒和 0.72 秒各显现一次。',
 serrated:'重击命中的敌人。',bloodMeal:'绿色弧线从猎物回到角色，收束在角色身上。',packHunt:'金色弧线从倒下的猎物连向每个追猎目标，獠牙出现在接收者身上。',
 bedrock:'开盾者身前。',fault:'消耗岩势的施法位置。',mountain:'满岩势释放的施法位置。',
 shadowStep:'相位冲刺穿过敌人或冲刺斩瞬间在角色身周显现。',phantomMark:'背刺或命中受控目标时在敌人身周显现。',eclipse:'满影印引爆时在目标中心扩散出紫电暗影风暴。',
 arcPin:'短路命中时在目标身上插针，下一次直接命中标记时再次显现并扩出电场。',feedback:'放出弧光的角色身上。',stormVent:'蒸汽爆心连到次级目标，在受击端成形；单目标时从上方落回爆心。',
 steam:'发生冷热反应的敌人身上，叠加爆炸范围圈。',firewire:'每个被弧光跳到的敌人。',icewire:'每个被弧光冻结的跳跃目标。',
 hotEdge:'重击引爆的燃烧目标身上。',iceEdge:'重击命中的冻结目标身上。',liveEdge:'弧光的起始目标身上。',
 thermalStep:'冰径中实际受寒意的燃烧目标。',kilnGuard:'完美反制者身边。',glideEdge:'命中减速目标的角色身上。',quench:'赤炼爆心，叠加寒意范围圈。'
};
// Entries without a proc sculpture deliberately describe the feedback that the player actually sees.
export const treatments={
 brand:'后续灼烧以周期伤害和通用命中反馈呈现。',cinder:'闪避起点扩出橙色火环，圈内敌人受到点燃。',wildfire:'从死亡目标脚下扩出火环，显示传播半径。',furnace:'伤害直接计入命中数字。',
 chill:'积满三层时在目标胸口溅出冰蓝碎片。',iceStep:'脚边扩出冰蓝范围圈，圈内敌人减速。',spring:'取得和进房时更新生命条。',
 fracture:'强化冰矛穿过首个敌人时保留拖尾，再命中一名敌人。',whiteout:'陷阱留地时间变长，冰棱首次结晶时跳出伤害数字。',stillpoint:'冰浪击中冻结目标时打出额外碎晶。',
 shatter:'冻结目标身边扩出冰蓝爆圈，圈内目标显示伤害。',spark:'电弧在相邻敌人胸口之间折线跳跃。',capacitor:'闪避更新充能计数，下次额外伤害并入命中数字。',relay:'复用弧光的折线，延长每跳距离并增加可见跳数。',
 edge:'提高重击或第三段的命中数字。',tempo:'缩短攻击间隔，表现在出手频率。',plate:'立即更新当前和最大生命。',echo:'在原目标上延迟结算，出现第二次受击与伤害数字。',
 'katana-1':'给重击目标附加持续燃烧，后续伤害沿用通用受击反馈。','katana-2':'额外伤害并入同一击。','spear-1':'远端刺击的加伤并入命中数字。','spear-2':'复用寒意叠层，达到冻结阈值时发出冰蓝碎片。',
 'dual-1':'连续命中同一目标时更新第二击伤害。','dual-2':'触发双蝶时更新耐力条和闪避冷却。','hammer-1':'重击在命中点扩出武器色震波。','hammer-2':'沿用沉钟震波，更新 E 冷却。',
 'crossbow-1':'将额外伤害并入第三支命中箭的数字。','crossbow-2':'从命中目标向最多两名邻敌拉出弹射线，并触发受击反馈。','rifle-1':'远距离命中的加伤并入同一击。','rifle-2':'沿用远星命中，更新耐力条并令目标减速。',
 'katana-fan':'右键拔刀释放三道扇形火浪剑气。','katana-nova':'三段斩与冲刺斩扩出 360° 烈焰环斩与灼烧脉冲。',
 'spear-flurry':'右键贯刺追射两道贯穿能量枪芒。','spear-spire':'远距命中在目标脚下引爆青绿穿刺震波。',
 'dual-clone':'闪避留下相位残像，延迟爆发范围紫芒环斩。','dual-frenzy':'连击叠层持续加速挥刃节奏。',
 'hammer-meteor':'右键跃空砸地并释放超大金橙震波。','hammer-wave':'重锤挥击向前推出穿透地裂冲击波。',
 'crossbow-scatter':'右键散射升级为五矢高爆扇面弩雨。','crossbow-homing':'弩矢在空中平滑偏转追踪邻敌并触发暴击。',
 'rifle-burst':'贯甲弹每次穿透都在目标位置引爆紫电范围冲击。','rifle-twin':'左键同步发射两道交错脉冲弹道。'
};
export const shared={
 hit:['命中火花与伤害数字','impactSpray · floatingDamage','命中点放射 16 或 30 枚火花，同时在目标上方显示伤害。延迟追击在伤害结算时复用。'],
 pulse:['范围脉冲','pulseAt · ringAt','从范围中心向外扩张，0.32 秒渐隐。颜色和半径由触发者传入。'],
 frost:['冻结碎片','frostStack → impactSpray','寒意累计到冻结阈值时，从目标上方 1.1 米喷出冰蓝碎片。'],
 chain:['弧光跳跃','showChainArc → drawTrail','在相邻敌人的胸口之间连接两段折线，持续 0.20 秒。'],
 discharge:['短路放电','showDischarge → drawTrail','从角色连到最近敌人。二阶增添浅紫分叉和终点火花。'],
 link:['返流与追猎连线','talentLink → drawTrail','两段线在空中起拱。啜血朝角色返流，追腥从被击杀目标连向其他猎物。'],
 trail:['弹道与弹射拖尾','drawTrail','一段轨迹用一根共享几何体绘制，全场最多 80 段，到期或超限回收。'],
 particles:['碎屑粒子','particlesAt','出膛、落地、受击或技能释放时，低多面体粒子弹起，随重力下落、淡出并回池。'],
 zone:['持续技能区域','zoneMarker','贴地轮廓标示持续判定区域，时间结束后回收。'],
 scan:['嗅猎扫描圈','ringAt','以施法者为中心扩张至 16 米，持续 1 秒。'],
 counter:['反制闪光','counterFlash','立体场景中的朝镜头星芒，0.34 秒淡出。'],
 hud:['属性与状态读数','updateHUD · combatReadout','生命、耐力、冷却或命中数字随结算更新。纯数值天赋沿用这些读数。']
};
export const sharedByGift={
 brand:['hit'],cinder:['pulse'],wildfire:['pulse'],furnace:['hit'],chill:['frost'],iceStep:['pulse'],spring:['hud'],shatter:['pulse'],spark:['chain'],capacitor:['hit'],relay:['chain'],edge:['hit'],tempo:['hud'],plate:['hud'],echo:['hit'],
 flare:['pulse'],rime:['frost'],surge:['discharge'],feedback:['chain'],steam:['pulse'],firewire:['chain'],icewire:['chain'],hotEdge:['pulse'],liveEdge:['chain'],thermalStep:['frost'],arcPin:['pulse'],kilnGuard:['counter','pulse'],quench:['pulse','frost'],stormVent:['trail'],bloodMeal:['link'],packHunt:['link'],
 'katana-1':['hit'],'katana-2':['hit'],'katana-3':['pulse','hit'],'spear-1':['hit'],'spear-2':['frost'],'spear-3':['frost','hit'],'dual-1':['hit'],'dual-2':['hud'],'dual-3':['hit'],'hammer-1':['pulse'],'hammer-2':['pulse','hud'],'hammer-3':['pulse','hit'],'crossbow-1':['hit'],'crossbow-2':['trail'],'crossbow-3':['hit','hud'],'rifle-1':['hit'],'rifle-2':['hud'],'rifle-3':['hit'],
 'katana-fan':['trail'],'katana-nova':['pulse'],'spear-flurry':['trail'],'spear-spire':['pulse'],'dual-clone':['pulse'],'dual-frenzy':['hud'],'hammer-meteor':['pulse'],'hammer-wave':['trail'],'crossbow-scatter':['trail'],'crossbow-homing':['trail'],'rifle-burst':['pulse'],'rifle-twin':['trail']
};
