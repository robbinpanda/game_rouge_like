import test from 'node:test';
import assert from 'node:assert/strict';
import {gameHarness} from './harness.mjs';

test('sanctuary companions unlock keepsakes on first talk, never repeat seen dialogues, and react to last-run defeat',()=>{
 const {run,storage}=gameHarness(true);
 assert.equal(run('narrative.keepsake'),null);
 assert.ok(run('countUnreadCompanions()>=4'));

 // Talking to Frost unlocks her keepsake and marks her intro dialogue seen
 const res=run("talkToCompanion('frost')");
 assert.equal(res.justUnlockedKeepsake,true);
 assert.equal(run("narrative.bonds.frost"),1);
 assert.equal(run("hasUnreadDialogue('frost')"),false);
 assert.ok(JSON.parse(storage.get('aberrant-echo-narrative')).seen.includes('intro_frost'));

 // Simulate defeat in Act 2 (Tidal Dock): Bastion should prioritize his Act 2 defeat reaction
 run("run.act=1;finishExpedition(false,'生命耗尽')");
 assert.equal(run("narrative.lastRun.won"),false);
 assert.equal(run("narrative.lastRun.act"),1);
 assert.equal(run("hasUnreadDialogue('bastion')"),true);
 assert.equal(run("pickCompanionDialogue('bastion').entry.id"),'die_act2_bastion');
});

test('equipped keepsakes apply real gameplay effects in combat and meta rewards',()=>{
 const {run}=gameHarness(true);
 // Bastion keepsake: +20 maxHp on start and +12 hp on perfect parry
 run("talkToCompanion('bastion');equipKeepsake('bastion');startExpedition();state='playing'");
 assert.equal(run('maxHp'),run('heroNow().hp + 20'));
 run("hp=50;noteProphecyMetric('parry')");
 assert.equal(run('hp'),62);

 // Frost keepsake: +6 heal on chamber entry & halves first two trap hits (source === null)
 run("talkToCompanion('frost');equipKeepsake('frost');startExpedition();state='playing'");
 run("hp=100;enterChamber()");
 assert.equal(run('hp'),106);
 run("hp=100;damagePlayer(20,null,true)");
 assert.equal(run('hp'),90);

 // Ember keepsake: starts with 2 power and deals +15% damage in first room of act
 run("talkToCompanion('ember');equipKeepsake('ember');startExpedition();state='playing'");
 assert.equal(run('run.power'),2);
 run("enemies[0].hp=enemies[0].maxHp=500;damageEnemy(enemies[0],100,{})");
 assert.equal(run('enemies[0].hp'),385);
});

test('boon draft and weapon hammer panels render Echo Persona voice banners',()=>{
 const {run}=gameHarness(true);
 run("run.roomSchool='arc';openDraft()");
 const draftHtml=run("$('rg-panel').innerHTML");
 assert.match(draftHtml,/rg-voice-banner/);
 assert.match(draftHtml,/跳闸/);

 run("openHammerDraft()");
 const hammerHtml=run("$('rg-panel').innerHTML");
 assert.match(hammerHtml,/铁砧/);
});

test('in-combat floating barks fire on act entry, boss phase 2, and death defiance revive',()=>{
 const {run}=gameHarness(true);
 assert.ok(run("$('rg-bark').querySelector('p').textContent.length>0"));

 run("run.act=2;const b=summon('bloom',0,-5,{boss:true});awakenBoss(b)");
 assert.match(run("$('rg-bark').querySelector('.rg-bark-head b').textContent"),/沈岚/);

 run("cue('revive')");
 assert.equal(run('narrativeRuntime.usedRevive'),true);
 assert.ok(run("$('rg-bark').querySelector('p').textContent.length>0"));
});

test('five victories unlock all five Blackout Chronicle memories without altering record schema',()=>{
 const {run,storage}=gameHarness(true);
 for(let step=1;step<=5;step++){
  run("state='playing';run.act=2;run.index=run.deck.length-1;finishExpedition(true)");
  assert.equal(run('narrative.chronicle'),step);
  assert.match(run("$('rg-result-story').innerHTML"),new RegExp('ECHO RECORD 0'+step));
 }
 assert.equal(run('narrative.wins'),5);
 assert.match(run("$('rg-result-story').innerHTML"),/晴湾黎明/);
 // Existing record storage format stays untouched
 const rec=JSON.parse(storage.get('aberrant-echo-record'));
 assert.deepEqual(Object.keys(rec).sort(),['best','depth','wins']);
});
