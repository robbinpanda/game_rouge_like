import test from 'node:test';
import assert from 'node:assert/strict';
import {gameHarness} from './harness.mjs';

test('combat uses independently posed Blender skins, and a stopped windup cancels its damage mark',()=>{
 const {run}=gameHarness(true);
 run("const first=summon('hound',0,-2),second=summon('hound',2,-2);");
 assert.ok(run('first.avatar.body.isSkinnedMesh && first.avatar.body.geometry===second.avatar.body.geometry'));
 assert.ok(run('first.avatar.skeleton.bones[0]!==second.avatar.skeleton.bones[0]'));
 run("const pose=a=>a.skeleton.bones.map(b=>b.quaternion.toArray().join(',')).join('/');const still=pose(second.avatar);pattern(first);tickCreatureAnimation(first,.25,false)");
 assert.equal(run('first.avatar.active.getClip().name'),'Pounce');
 assert.equal(run('pose(second.avatar)'),run('still'));assert.notEqual(run('pose(first.avatar)'),run('still'));
 run("damageEnemy(first,4,'player',null,{stagger:.3});tickWarnings(.02)");
 assert.equal(run('first.avatar.active.getClip().name'),'Hit');assert.equal(run('run.marks.some(h=>h.owner===first)'),false);
});
test('both authored boss attacks are selected by the live pattern and aligned with impact',()=>{
 const {run}=gameHarness(true);
 for(const [act,kind,clips] of [[0,'crab',['RailCharge','BreakerSweep']],[1,'ray',['DepthBomb','Broadside']],[2,'bloom',['MirrorRing','PetalVolley']]]){
  run(`run.act=${act};globalThis.testBoss=summon('${kind}',0,-4,{boss:true})`);
  for(const clip of clips){
   run("pattern(testBoss)");assert.equal(run('testBoss.avatar.active.getClip().name'),clip);
   assert.ok(run('Math.abs(testBoss.avatar.oneshot*.70-testBoss.windup)<1e-6'));
  }
 }
});
