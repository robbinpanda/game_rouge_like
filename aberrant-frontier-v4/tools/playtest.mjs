import {gameHarness} from '../tests/harness.mjs';

// Fixed-timestep combat, with the usual input, collision, damage and reward paths.
// Travel between cleared rooms and reading menus are excluded from combat time.
function play(seed,pact,depth,g,ranged=false){
 const {run}=g;
 run(`$('rg-seed').value=${JSON.stringify(seed)};$('rg-depth').value='${depth}';
  chosenClass='${ranged?'ember':'bastion'}';loadout=['${ranged?'crossbow':'hammer'}'];startGame();`);
 return run(`(()=>{
  const fights=[0,0,0],bosses=[0,0,0],dt=.04,counts={},forms={left:0,right:0};
  let roomKey='',frame=0,elapsed=0,observedAffixes=new Set(),damageTaken=0,lastHealth=hp;
  while(state!=='result'&&frame++<24000){
   state='playing';document.pointerLockElement=canvas;
   if(run.status==='exit'){
    player.group.position.copy(exitPoint);useGate();
    if(run.panel==='camp')chooseExpedition('visit-shop');
    if(run.panel==='event'){
     if('${pact}'&&!run.contracts.includes('${pact}'))chooseExpedition('pact-${pact}');
     else chooseExpedition('offer');
    }
    if(run.panel==='shop'&&hp<maxHp*.80&&run.coins>=18)chooseExpedition('heal');
    if(run.panel==='shop'&&run.coins>=40)chooseExpedition('buy');
    if(run.panel==='draft'){
     const priority=[loadout[0]+'-left',loadout[0]+'-right','edge','brand','plate','tempo','hammer-1'];
     const pick=priority.map(id=>run.offers.find(t=>t.id===id)).find(Boolean)||run.offers[0];
     chooseExpedition(pick.id);
    }
    if(run.panel==='shop')chooseExpedition('pass');
    continue;
   }
   const k=run.act+'/'+run.index;
   if(k!==roomKey){roomKey=k;elapsed=0;lastHealth=hp;counts[k]=0;}
   if((elapsed+=dt)>100)break;
   const foe=enemies.filter(e=>!e.dead).sort((a,b)=>a.avatar.group.position.distanceToSquared(player.group.position)-b.avatar.group.position.distanceToSquared(player.group.position))[0];
   if(!foe){stepEncounter(dt);continue;}
   for(const e of enemies)for(const a of e.affixes||[])observedAffixes.add(a);
   const p=player.group.position,q=foe.avatar.group.position,d=p.distanceTo(q);
   let goal=q;
   if(obstructed(p,q,0,.65)){
    const nav=walkField(Math.round(q.x),Math.round(q.z));
    goal=visibleWaypoint(p,closestCell(nav,p))||q;
   }
   yaw=Math.atan2(goal.x-p.x,p.z-goal.z);pitch=.22;
   input.KeyW=d>3||goal!==q;mouseDown=d<4.6&&frame%40<16;mouseRight=d<5.7&&!mouseDown;
   if(${ranged}){
    input.KeyW=d>9||goal!==q;mouseDown=goal===q&&frame%55<30;mouseRight=goal===q&&!mouseDown;
    updateCamera(.4);
    const screen=q.clone().add(new THREE.Vector3(0,foe.hitHeight,0)).project(camera);
    if(goal===q){yaw+=Math.atan(screen.x*Math.tan(camera.fov*Math.PI/360)*camera.aspect);
     pitch=clamp(pitch-(screen.y-.06)*.7,-.65,1.15);}
   }
   updateCamera(.4);
   if(d<7){if(skillCd<=0)useAbility();if(raid.utilityCd<=0)useUtility();if(ultimateCd<=0)burst();}
   if(hp<maxHp*.55&&raid.meds>0&&!raid.heal)heal();
   if(raid.heal){input.KeyW=false;mouseDown=mouseRight=false;}
   if(foe.charge&&foe.windup>0&&foe.windup<.2)parry();
   let step=dt;time+=dt;updateRaid(dt);if(hitstop>0){hitstop-=dt;step*=.045;}
   const previous=raid.strike;updatePlayer(step);
   if(${ranged})for(const shot of projectiles){if(shot.owner==='player'&&shot.weapon&&!shot.counted){forms[shot.heavy?'right':'left']++;shot.counted=true;}}
   if(raid.strike&&previous!==raid.strike)forms[raid.strike.heavy?'right':'left']++;
   updateStrikes(step);stepEncounter(step);updateProjectiles(step);updateEffects(step);
   fights[run.act]+=dt;counts[k]+=dt;if(roomNow().type==='boss')bosses[run.act]+=dt;
   damageTaken+=Math.max(0,lastHealth-hp);lastHealth=hp;
  }
  return {seed:run.seed,weapon:loadout[0],pact:'${pact}'||'none',depth:run.depth,outcome:state==='result'?(hp>0?'won':'lost'):'timeout',rooms:run.roomsCleared,
   fights:fights.map(Math.round),bosses:bosses.map(Math.round),damageTaken,affixes:[...observedAffixes],forms,unlock:record.depth,book:roleBook().length};
 })()`);
}
const seeds=process.argv.slice(2);
for(const seed of seeds.length?seeds:['湾岸','回声']){
 for(const ranged of [false,true])for(const pact of ['','glass','clock']){
  const g=gameHarness(true);
  for(let tier=0;tier<=(pact||ranged?0:3);tier++){
   const result=play(seed,pact,tier,g,ranged);console.log(JSON.stringify(result));
   if(result.outcome!=='won')break;
  }
 }
}
