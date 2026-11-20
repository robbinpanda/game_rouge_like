export const WORLD_LIMIT=154;
export const RAID_SECONDS=840;
export const DISTRICTS=[
 {id:'oldtown',name:'晴昼旧城',en:'DAYBREAK QUARTER',x:0,z:25,r:54,risk:1,color:'#dbad87'},
 {id:'garden',name:'紫藤花园',en:'WISTERIA GARDEN',x:-91,z:90,r:57,risk:1,color:'#b79bd7'},
 {id:'lab',name:'封锁研究所',en:'RESEARCH ANNEX',x:-92,z:-33,r:60,risk:3,color:'#98d4d2'},
 {id:'station',name:'断轨枢纽',en:'BROKEN TRANSIT',x:0,z:-102,r:59,risk:3,color:'#e8bd79'},
 {id:'cargo',name:'晴湾货场',en:'FREIGHT YARD',x:98,z:-27,r:65,risk:2,color:'#e69b85'},
 {id:'harbor',name:'远帆港区',en:'SUNLIT HARBOR',x:75,z:101,r:64,risk:2,color:'#8bcbc3'}
];
export const EXIT_DEFS=[
 {id:'sluice',code:'01',name:'西岸排水闸',x:-142,z:48,kind:'free',hold:8,brief:'始终开放 · 无需物资',color:'#a9ebcc'},
 {id:'boat',code:'02',name:'晴湾接驳艇',x:85,z:139,kind:'fuel',hold:9,brief:'需要 1 个燃料电池 · 港区可搜得',color:'#8ddede'},
 {id:'rail',code:'03',name:'北线货运列车',x:6,z:-139,kind:'timed',hold:6,brief:'每 180 秒开放末尾 65 秒',color:'#eec887'},
 {id:'roof',code:'04',name:'研究所救援坪',x:-134,z:-105,kind:'signal',hold:11,brief:'先在研究所激活通讯终端',color:'#c2acee'},
 {id:'last',code:'05',name:'南岸应急通道',x:-4,z:145,kind:'last',hold:6,brief:'最后 150 秒开放 · 高风险',color:'#ed9b7e'}
];
export const ITEM_DEFS={
 alloy:{name:'航空合金',value:70,weight:2,tier:1,color:'#b5c8c6'},
 circuit:{name:'精密电路',value:170,weight:2,tier:2,color:'#92d4cf'},
 relic:{name:'旧世数据匣',value:420,weight:3,tier:3,color:'#beaceb'},
 core:{name:'异变核心',value:850,weight:4,tier:4,color:'#efc173'},
 fuel:{name:'燃料电池',value:110,weight:2,tier:2,color:'#96d4e2'},
 med:{name:'急救注射器',value:60,weight:1,tier:1,color:'#b5dab3'}
};
export function exitStatus(exit,{time=0,remaining=RAID_SECONDS-time,fuel=0,signal=false}={}){
 if(exit.kind==='free')return{open:true,label:'开放 · 无条件'};
 if(exit.kind==='fuel')return{open:fuel>0,label:fuel>0?'开放 · 消耗 1 电池':'缺少燃料电池'};
 if(exit.kind==='signal')return{open:signal,label:signal?'通讯已激活':'先激活研究所终端'};
 if(exit.kind==='last')return{open:remaining<=150,label:remaining<=150?'应急通道已开启':`还需 ${Math.ceil(remaining-150)} 秒`};
 const phase=time%180;
 return{open:phase>=115,label:phase>=115?`列车离站 ${Math.ceil(180-phase)} 秒`:`列车抵达 ${Math.ceil(115-phase)} 秒`};
}
export function bagWeight(items){return items.reduce((n,i)=>n+ITEM_DEFS[i].weight,0);}
export function bagValue(items){return items.reduce((n,i)=>n+ITEM_DEFS[i].value,0);}
export function canCarry(items,item,capacity=28){return bagWeight(items)+ITEM_DEFS[item].weight<=capacity;}
export function burdenMultiplier(weight){return weight>20?Math.max(.76,1-(weight-20)*.03):1;}
export function districtAt(x,z){return DISTRICTS.reduce((a,b)=>Math.hypot(x-a.x,z-a.z)<Math.hypot(x-b.x,z-b.z)?a:b);}
export function extractAdvance(progress,dt,{inside,open,damaged,hold}){return !inside||!open||damaged?{progress:0,complete:false}:{progress:progress+dt,complete:progress+dt>=hold};}
