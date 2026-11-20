import test from 'node:test';
import assert from 'node:assert/strict';
import {gameHarness} from './harness.mjs';
test('a charged parry opens one timed follow-up and replay clears the opening and effects',()=>{
 const g=gameHarness();
 g.run(`for(const e of enemies)e.dead=true;
  const foe=spawnRaider(0,41,'reaper','katana');
  player.group.position.set(0,0,44);yaw=0;invulnerable=0;parry();damagePlayer(35,foe,true);`);
 assert.equal(g.run('raid.opening.enemy===foe && raid.parries===1'),true);
 g.run('meleeCd=0;melee()');
 assert.equal(g.run('raid.strike.riposte'),true);
 assert.equal(g.run('raid.opening'),null);
 g.run('updateStrikes(1);startGame()');
 assert.equal(g.run('battleEffects.length'),0);
 assert.equal(g.run('raid.opening'),null);
});
test('an early dodge opens a punish window that expires on simulation time',()=>{
 const g=gameHarness();
 g.run(`for(const e of enemies)e.dead=true;const foe=spawnRaider(0,41,'reaper','katana');
  player.group.position.set(0,0,44);yaw=0;dodge();const healthBefore=hp;damagePlayer(30,foe);
  time+=1.4;dodgeTime=0;meleeCd=0;melee();`);
 assert.equal(g.run('hp'),g.run('healthBefore'));
 assert.equal(g.run('raid.opening.enemy===foe'),true);
 assert.equal(g.run('raid.strike.riposte'),false);
});
test('field skin follows the combat joints and equipment stays attached through a loadout swap',()=>{
 const g=gameHarness();
 g.run(`const skin=player.body, geometry=skin.geometry, hand=player.grips[1];
  const bindPoint=hand.getWorldPosition(new THREE.Vector3());
  const bindVertices=[];
  for(let i=0;i<geometry.attributes.position.count;i+=40)bindVertices.push(skin.getVertexPosition(i,new THREE.Vector3()));
  player.arms[1].rotation.x=-1.2;scene.updateMatrixWorld(true);`);
 assert.equal(g.run('skin.skeleton.bones.length'),19);
 assert.ok(g.run('bindPoint.distanceTo(hand.getWorldPosition(new THREE.Vector3()))>.3'));
 assert.ok(g.run('bindVertices.some((v,i)=>v.distanceTo(skin.getVertexPosition(i*40,new THREE.Vector3()))>.1)'));
 assert.ok(g.run("equipWeapon(player,'dual');player.weaponGroup.parent===hand && player.secondBlade.parent===player.grips[0]"));
 assert.ok(g.run("equipWeapon(player,'rifle');player.weaponGroup.parent===hand && player.secondBlade===null"));
});
test('runtime initializes real Three geometry, six districts, 38 supply containers and 20 AI',()=>{
 const g=gameHarness();assert.equal(g.run('DISTRICTS.length'),6);assert.equal(g.run('EXIT_DEFS.length'),5);assert.equal(g.run('raid.containers.length'),38);assert.equal(g.run('enemies.length'),20);assert.ok(g.run('colliders.length')>100);assert.ok(g.run('Number(canvas.dataset.staticDraws)<150'));g.run('updatePlayer(.016);updateEnemies(.016);updateProjectiles(.016);updateEffects(.016);updateHUD();updateCamera(.016);updatePresentation(.016);');
});
test('melee lands on its hit frame, hits only once, and dodge cancels a windup',()=>{
 const g=gameHarness();g.run("for(const e of enemies)e.dead=true;player.group.position.set(0,0,40);yaw=0;meleeCd=0;const foe=spawnRaider(0,37,'reaper','katana');const before=foe.hp;melee();");assert.equal(g.run('foe.hp'),g.run('before'));g.run('updateStrikes(.04)');assert.equal(g.run('foe.hp'),g.run('before'));g.run('updateStrikes(.1)');assert.ok(g.run('foe.hp<before'));const hp=g.run('foe.hp');g.run('updateStrikes(.04)');assert.equal(g.run('foe.hp'),hp);
 g.run('meleeCd=0;raid.strike=null;melee();dodge();updateStrikes(1)');assert.equal(g.run('foe.hp'),hp);assert.equal(g.run('raid.strike'),null);
});
test('searching requires holding still, preserves overflow, and medicine heals only on completion',()=>{
 const g=gameHarness();g.run('player.group.position.set(-3,0,39);input.KeyF=true;interact();updateRaidInteractions(.7);');assert.ok(g.run('raid.search.progress')>.6);g.run('input.KeyF=false;updateRaidInteractions(.1)');assert.equal(g.run('raid.search'),null);
 g.run("raid.bag=Array(7).fill('core');input.KeyF=true;interact();updateRaidInteractions(2);");assert.equal(g.run('raid.opened'),1);assert.equal(g.run('raid.bag.length'),7);assert.ok(g.run('raid.containers[0].items.length')>0);g.run('raid.bag=[];interact()');assert.ok(g.run('raid.bag.length')>0);assert.equal(g.run('raid.containers[0].items.length'),0);
 g.run('hp=80;raid.bag=[];raid.meds=1;heal();updateRaid(1)');assert.equal(g.run('hp'),80);g.run('updateRaid(1.5)');assert.equal(g.run('hp'),160);assert.equal(g.run('raid.meds'),0);
});
test('fuel is consumed only by successful boat extraction and death loses all cargo',()=>{
 const g=gameHarness();g.run("player.group.position.set(85,0,139);raid.bag=['fuel','relic'];interact();updateRaidInteractions(3);player.group.position.x+=5;updateRaidInteractions(.1);");assert.equal(g.run('extracting'),0);assert.equal(g.run("raid.bag.includes('fuel')"),true);
 g.run('player.group.position.set(85,0,139);interact();updateRaidInteractions(10)');assert.equal(g.run('state'),'result');assert.equal(g.run('raid.credits'),420);assert.equal(g.storage.get('aberrant-v4-credits'),'420');assert.equal(g.run("raid.bag.includes('fuel')"),false);
 g.run("startGame();state='playing';raid.bag=['core'];finish(false);");assert.equal(g.run('raid.credits'),420);
});
test('closed railway window interrupts extraction; terminal unlocks the alternate rescue pad',()=>{
 const g=gameHarness();g.run('player.group.position.set(6,0,-139);time=176;interact();updateRaidInteractions(2);time=180;updateRaidInteractions(.1)');assert.equal(g.run('extracting'),0);assert.equal(g.run('state'),'playing');
 g.run('player.group.position.set(-87,0,-8);input.KeyF=true;interact();updateRaidInteractions(4.1)');assert.equal(g.run('raid.signal'),true);assert.equal(g.run('contextExit(EXIT_DEFS[3]).open'),true);
});
test('every extraction and district is reachable through the authored collision layout',()=>{
 const g=gameHarness();const result=g.run(`(()=>{
 const step=2,min=-152,max=152,n=153,key=(i,j)=>i*n+j,visited=new Set(),queue=[];
 const blocked=(x,z)=>colliders.some(c=>c.h>.65&&x>c.x-c.w-.55&&x<c.x+c.w+.55&&z>c.z-c.d-.55&&z<c.z+c.d+.55);
 const start=[76,98];queue.push(start);visited.add(key(...start));
 for(let h=0;h<queue.length;h++){const[i,j]=queue[h];for(const[di,dj]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=i+di,b=j+dj;if(a<0||b<0||a>=n||b>=n||visited.has(key(a,b))||blocked(min+a*step,min+b*step))continue;visited.add(key(a,b));queue.push([a,b]);}}
 const reachable=(x,z,r)=>queue.some(([i,j])=>Math.hypot(min+i*step-x,min+j*step-z)<r);
 return {visited:visited.size,exits:EXIT_DEFS.map(e=>({id:e.id,ok:reachable(e.x,e.z,3)})),containers:raid.containers.filter(c=>c.group.position.y<1).map(c=>({x:c.group.position.x,z:c.group.position.z,ok:reachable(c.group.position.x,c.group.position.z,2.5)})),terminal:reachable(-87,-8,2.5)};
 })()`);assert.ok(result.visited>10000);assert.ok(result.exits.every(e=>e.ok),JSON.stringify(result.exits));assert.equal(result.terminal,true);assert.ok(result.containers.every(c=>c.ok),JSON.stringify(result.containers.filter(c=>!c.ok)));
});
test('all characters, both active skills and all six weapons run without errors',()=>{
 const g=gameHarness();g.run(`for(const id of Object.keys(HEROES)){chosenClass=id;startGame();state='playing';document.pointerLockElement=canvas;useAbility();useUtility();burst();updateRaid(.1);updatePlayer(.016);updateHUD();for(const weapon of Object.keys(WEAPONS)){loadout[0]=weapon;activeWeapon=0;equipWeapon(player,weapon);meleeCd=0;mouseRight=false;raid.strike=null;melee();updateStrikes(1);meleeCd=0;chargeTime=2;releaseHeavy();updateStrikes(1);updateProjectiles(.016);}}`);
});
test('enemy deployment avoids buildings and airborne shots are stopped by cover',()=>{
 const g=gameHarness();assert.equal(g.run('enemies.some(e=>colliders.some(c=>Math.abs(e.avatar.group.position.x-c.x)<c.w+.5&&Math.abs(e.avatar.group.position.z-c.z)<c.d+.5))'),false);
 g.run("for(const e of enemies)e.dead=true;player.group.position.set(0,0,40);const target=spawnRaider(0,30,'reaper','katana');const health=target.hp;colliders.push({x:0,z:35,w:2,d:.3,h:4});createProjectile(new THREE.Vector3(0,1.4,40),new THREE.Vector3(0,0,-1),'player',100,0xffffff);projectiles.at(-1).v.set(0,0,-100);updateProjectiles(.2);");assert.equal(g.run('target.hp'),g.run('health'));assert.equal(g.run('projectiles.length'),0);
});
test('supply events and reinforcements trigger once and simulation keeps finite positions',()=>{
 const g=gameHarness();g.run('time=86;updateRaid(.1);');assert.equal(g.run('raid.containers.filter(c=>c.kind===\'drop\').length'),1);assert.equal(g.run('enemies.length'),22);g.run('updateRaid(.1);');assert.equal(g.run('enemies.length'),22);
 g.run('time=121;updateRaid(.1)');assert.equal(g.run('enemies.length'),23);
 g.run("for(let i=0;i<360;i++){time+=1/60;updateRaid(1/60);if(state!=='playing')break;updatePlayer(1/60);updateStrikes(1/60);updateEnemies(1/60);updateProjectiles(1/60);updateEffects(1/60);updateCamera(1/60);updateHUD();} ");assert.equal(g.run('enemies.every(e=>e.avatar.group.position.toArray().every(Number.isFinite))'),true);assert.equal(g.run('player.group.position.toArray().every(Number.isFinite)'),true);
});
test('damage interrupts active searches, healing and extraction without consuming resources',()=>{
 const g=gameHarness();g.run("raid.meds=2;hp=100;heal();player.group.position.set(-142,0,48);interact();invulnerable=0;damagePlayer(10);");assert.equal(g.run('extracting'),0);assert.equal(g.run('raid.heal'),0);assert.equal(g.run('raid.meds'),2);
 g.run('player.group.position.set(-3,0,39);input.KeyF=true;interact();invulnerable=0;damagePlayer(10)');assert.equal(g.run('raid.search'),null);assert.equal(g.run('raid.opened'),0);
});
