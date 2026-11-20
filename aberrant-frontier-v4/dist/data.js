export const HEROES={
 ember:{name:'烬刃',en:'EMBER',tag:'炎脉剑客',symbol:'焱',color:0xf59b65,skin:0xe2b5a0,armor:0xd87d70,hp:190,human:true,skill:'炎步',ultimate:'焚身领域',passive:'领域内攻击附带持续灼烧',brief:'保留人形的火脉异变者。突入战场，以燃烧压制对手。',eText:'向前炎步突进，灼伤路径敌人',qText:'释放火焰冲击，10 秒内攻击附带额外伤害',eCd:7,qCd:24},
 frost:{name:'霜序',en:'RIME',tag:'霜晶行者',symbol:'❄',color:0x9de2e7,skin:0xe5c3b2,armor:0xeee5cd,hp:165,human:true,skill:'霜锁',ultimate:'静寂之境',passive:'霜锁减速目标，攻击受控敌人伤害提高',brief:'侵蚀只留下晶化的左臂。用冻结和减速控制交战距离。',eText:'射出霜晶，命中造成伤害与冻结',qText:'范围冻结并恢复 45 生命',eCd:8,qCd:24},
 shade:{name:'岚影',en:'SHADE',tag:'虚相游猎者',symbol:'影',color:0xbca9ed,skin:0x9e7769,armor:0x9984b8,hp:160,human:true,skill:'相位闪',ultimate:'幽影乱舞',passive:'位移技能后下一次攻击额外造成 35 伤害',brief:'人形之下是失控的相位组织。绕后、反击，然后消失。',eText:'向移动方向闪现，短暂无敌',qText:'连续跃击附近目标，期间无敌',eCd:6,qCd:23},
 bastion:{name:'玄岩',en:'BASTION',tag:'重甲守卫',symbol:'岩',color:0xd6c78c,skin:0xbba48a,armor:0xb5b89e,hp:250,human:true,skill:'骨盾',ultimate:'地裂震荡',passive:'生命更高；骨盾持续时减少 65% 伤害',brief:'骨甲覆盖了半副躯体，仍然以人的意志守住战线。',eText:'展开持续 4 秒的骨质护盾',qText:'地裂击飞周围敌人，恢复耐力',eCd:10,qCd:25},
 reaper:{name:'裂爪',en:'REAPER',tag:'完全异变体',symbol:'爪',color:0xbadb91,skin:0x526657,armor:0xaaa58a,hp:210,human:false,skill:'猎扑',ultimate:'狂猎',passive:'狂猎期间攻击吸血；猎扑可快速近身',brief:'失去人形，却学会了使用武器。嗅到猎物，就不再停下。',eText:'扑向准心附近敌人并造成冲击',qText:'进入 10 秒狂猎状态，攻击加速并吸血',eCd:7,qCd:26}
};
export const WEAPONS={
 katana:{name:'余烬长刀',short:'长刀',en:'KATANA',symbol:'╱',type:'melee',damage:[27,31,48],cooldown:[.32,.35,.59],reach:3.5,arc:.15,heavy:83,heavyReach:5.2,charge:.72,stagger:.28,color:0xf3d1a1,description:'三段斩击 · 蓄力剑气'},
 spear:{name:'脊骨长枪',short:'长枪',en:'SPEAR',symbol:'↟',type:'melee',damage:[25,29,43],cooldown:[.39,.36,.58],reach:5.1,arc:.72,heavy:78,heavyReach:7,charge:.8,stagger:.3,color:0xd6ddbf,description:'长距突刺 · 蓄力贯穿'},
 dual:{name:'蝶影双刃',short:'双刃',en:'DUAL BLADES',symbol:'〆',type:'melee',damage:[18,20,30],cooldown:[.21,.23,.39],reach:2.8,arc:-.15,heavy:64,heavyReach:4.2,charge:.57,stagger:.2,color:0xcab9e8,description:'高速连斩 · 蓄力旋舞'},
 hammer:{name:'断层重锤',short:'重锤',en:'WAR HAMMER',symbol:'⊥',type:'melee',damage:[42,48,70],cooldown:[.64,.69,.92],reach:3.9,arc:-.3,heavy:119,heavyReach:6,charge:1.05,stagger:.55,color:0xe7bd87,description:'重击破势 · 蓄力震地'},
 crossbow:{name:'猎隼连弩',short:'连弩',en:'REPEATER',symbol:'⋈',type:'ranged',damage:[24,24,24],cooldown:[.24,.24,.24],reach:55,heavy:67,charge:.7,speed:52,stagger:.12,color:0xdfd49e,description:'快速连射 · 蓄力三箭'},
 rifle:{name:'蚀能长铳',short:'长铳',en:'PULSE RIFLE',symbol:'⌁',type:'ranged',damage:[55,55,55],cooldown:[.78,.78,.78],reach:75,heavy:118,charge:1.1,speed:75,stagger:.3,color:0x9fe3d2,description:'精准重射 · 蓄力穿甲'}
};
