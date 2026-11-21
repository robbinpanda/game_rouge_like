import test from 'node:test';
import assert from 'node:assert/strict';
import {gameHarness} from './harness.mjs';

test('v0.5.1 combat camera vaults cleanly above obstacles instead of getting blocked low',()=>{
 const {run}=gameHarness(true);
 // Place a large tall cover block directly behind the player at z = +4
 run("player.group.position.set(0,0,0);yaw=0;pitch=.18;cover(0,4.2,5.5,3.0,2.4,0x888888);for(let i=0;i<30;i++)updateCamera(.04);");
 // Camera should remain high (clear of the 3.0m obstacle) and far enough behind player
 assert.ok(run('camera.position.y >= 3.2'), 'camera should vault above low cover');
 assert.ok(run('camera.position.z >= 3.5'), 'camera should not collapse inside player');
});

test('v0.5.1 Companion-Patron boon system maps all talents clearly and renders concise <=3 card drafts',()=>{
 const {run}=gameHarness(true);
 const summary=run(`(()=>{
  const missing=[];
  for(const t of Object.values(giftById)){
   const p=giftPatron(t);
   const s=giftShortDesc(t);
   if(!p||!p.name||!p.id)missing.push('patron:'+t.id);
   if(!s||s.length>30)missing.push('desc:'+t.id+'('+s.length+')');
  }
  return missing;
 })()`);
 assert.deepEqual(Array.from(summary),[]);

 run("run.roomSchool='frost';openDraft()");
 const html=run("$('rg-panel').innerHTML");
 assert.ok(run('run.offers.length<=3 && run.offers.length>=1'));
 assert.match(html,/frost\.webp/);
 assert.match(html,/霜序/);
 assert.doesNotMatch(html,/rg-study-tabs/);
 assert.doesNotMatch(html,/选后可抽/);
});

test('v0.5.1 each Act spawns distinct Act-specific monster variants, higher damage scaling, and multi-wave encounters',()=>{
 const {run}=gameHarness(true);
 const seenByAct=[];
 for(let act=0;act<3;act++){
  run(`run.act=${act};run.index=1;enterChamber()`);
  const info=run("({variants:[...new Set(enemies.map(e=>e.variant).filter(Boolean))],count:enemies.length,waves:run.waves.length,scale:enemies[0].dmgScale})");
  assert.ok(info.count>=4, `Act ${act} room 1 should have >=4 initial enemies`);
  assert.ok(info.waves>=1, `Act ${act} room 1 should have reinforcement waves`);
  assert.ok(info.scale>=1.25, `Act ${act} enemies should have elevated damage scaling`);
  assert.ok(info.variants.length>=2, `Act ${act} should field multiple distinct variants`);
  seenByAct.push(new Set(info.variants));
 }
 // Variants across Act 0, Act 1, Act 2 must be completely disjoint sets!
 for(const v of seenByAct[0]){
  assert.equal(seenByAct[1].has(v),false);
  assert.equal(seenByAct[2].has(v),false);
 }
 for(const v of seenByAct[1]){
  assert.equal(seenByAct[2].has(v),false);
 }
});

test('v0.5.1 Sanctuary companion dialogue appears as overhead 3D speech bubbles without full-screen text modal',()=>{
 const {run}=gameHarness(true);
 run("returnMenu();buildSanctuaryHubProps();refreshSanctuaryCompanions();setSanctuaryRoamMode(true);");
 const targetId=run("sanctuaryHub.npcs[0].id");
 run(`const n=sanctuaryHub.npcs[0];player.group.position.set(n.pos.x,0,n.pos.z+1.4);updateSanctuaryHub(.02);triggerSanctuaryInteract();`);
 assert.ok(run('sanctuaryHub.bubbles.size>=1'), 'should spawn an overhead 3D speech bubble');
 assert.equal(run("isGuideOpen()"),false, 'should not interrupt with full-screen text modal');
 // Exhaust lines and verify Keepsake unlocks cleanly
 run(`for(let i=0;i<5;i++)speakSanctuaryNpc('${targetId}');`);
 assert.ok(run(`narrative.bonds['${targetId}']>=1`));
});

test('v0.5.1 combat arenas include walkable elevated terraces and low tactical cover across all 3 Acts',()=>{
 const {run}=gameHarness(true);
 for(let act=0;act<3;act++){
  run(`setChamber(${act},0,false,false)`);
  assert.ok(run('surfaces.some(s=>s.ramp)'), `Act ${act} should include walkable ramps`);
  assert.ok(run('surfaces.length>=6'), `Act ${act} should have rich multi-surface cover & terraces`);
 }
});

test('v0.5.2 opening cinematic and vista overlook hide and clear all floating courtyard labels',()=>{
 const {run}=gameHarness(true);
 run(`
  returnMenu();buildSanctuaryHubProps();refreshSanctuaryCompanions();
  sanctuaryHub.labelsEl=document.createElement('div');
  sanctuaryHub.bubblesEl=document.createElement('div');
  sanctuaryHub.hudEl=document.createElement('div');
  sanctuaryHub.hudEl.innerHTML='<button data-hub-act="vista"></button>';
  sanctuaryHub.promptEl=document.createElement('div');
  setSanctuaryRoamMode(true);
  sanctuaryHub.labelsEl.innerHTML='<div class="rg-world-tag">回响之镜</div>';
 `);
 // 1. Entering Vista Overlook clears & hides floating station labels
 run('setSanctuaryVista(true);updateSanctuaryHub(.02);');
 assert.equal(run("sanctuaryHub.labelsEl.innerHTML"),'');
 assert.equal(run("sanctuaryHub.labelsEl.classList.contains('hidden')"),true);

 // 2. Returning to courtyard then launching Opening Cinematic clears & hides labels + HUD
 run("setSanctuaryVista(false);sanctuaryHub.labelsEl.innerHTML='<div>tag</div>';startOpeningCinematic();");
 assert.equal(run("state"),'cinematic');
 assert.equal(run("sanctuaryHub.labelsEl.innerHTML"),'');
 assert.equal(run("sanctuaryHub.labelsEl.classList.contains('hidden')"),true);
 assert.equal(run("sanctuaryHub.hudEl.classList.contains('hidden')"),true);
});
