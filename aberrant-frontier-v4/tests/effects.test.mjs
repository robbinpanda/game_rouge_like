import test from 'node:test';
import assert from 'node:assert/strict';
import {gameHarness} from './harness.mjs';

test('trail overflow recycles the oldest mesh and preserves enemy warnings',()=>{
 const g=gameHarness();
 g.run(`const a=new THREE.Vector3(),b=new THREE.Vector3(0,0,2);
  telegraphAttack({avatar:player,attackDir:b,windup:.8},2.8,false);
  const warning=attackTelegraphs[0].m;
  drawTrail(a,b);const oldest=trails[0].m;
  for(let i=1;i<=1082;i++)drawTrail(a,b.clone().setY(i),0xffff00,1,.02);`);
 assert.equal(g.run('trails.length'),80);
 assert.equal(g.run('new Set(trails.map(t=>t.m)).size'),80);
 assert.equal(g.run('new Set(trails.map(t=>t.m.geometry)).size'),1);
 assert.ok(g.run('trails.some(t=>t.m===oldest) && warning.parent===effects'));
 assert.ok(g.run('effects.children.every(m=>!m.castShadow)'));
 assert.ok(g.run('Math.abs(trails.at(-1).m.scale.y-Math.hypot(1082,2))<1e-8'));
 g.run('updateEffects(.81)');
 assert.ok(g.run('warning.parent===null && trails.length===80'));
 g.run('updateEffects(.2)');
 assert.equal(g.run('effects.children.length'),0);
});

test('effect reuse keeps simultaneous fades independent and shared geometry alive across rooms',()=>{
 const g=gameHarness(true);
 g.run(`const at=new THREE.Vector3(),dir=new THREE.Vector3(0,0,1);
  ringAt(at,0xff0000,4,1);ringAt(at,0xffffff,6,2);
  const first=rings[0].m,second=rings[1].m;
  let disposals=0;first.geometry.addEventListener('dispose',()=>disposals++);
  updateEffects(.25);particlesAt(at,0xff0000,4);createProjectile(at,dir,'player',1,0xffffff);
  const shot=projectiles[0].m;shot.scale.setScalar(2);
  shot.geometry.addEventListener('dispose',()=>disposals++);`);
 assert.ok(g.run('first.geometry===second.geometry && first.material!==second.material'));
 assert.equal(g.run('first.material.opacity'),.75);
 assert.equal(g.run('second.material.opacity'),.875);
 assert.ok(g.run('effects.children.every(m=>!m.castShadow)'));
 g.run(`enterChamber();ringAt(at,0x00ff00);createProjectile(at,dir,'player',1,0xffffff);`);
 assert.equal(g.run('particles.length'),0);
 assert.equal(g.run('disposals'),0);
 assert.ok(g.run('rings[0].m===second && second.material.opacity===.9 && second.material.color.getHex()===0x00ff00'));
 assert.ok(g.run('projectiles[0].m===shot && shot.scale.equals(new THREE.Vector3(1,1,1))'));
});
