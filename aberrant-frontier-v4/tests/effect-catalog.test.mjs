import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gameHarness} from './harness.mjs';

test('the workbench lists every playable study, attack and proc with reciprocal links',()=>{
 const {run}=gameHarness(true);
 const book=JSON.parse(fs.readFileSync(new URL('../../game-workbench/library/echo-effects/回响远征-特效索引.json',import.meta.url),'utf8'));
 const talents=new Map(book.talents.map(t=>[t.id,t])),effects=new Map(book.effects.map(f=>[f.id,f]));
 const ids=expr=>Array.from(run(expr)).sort();
 assert.deepEqual([...talents.keys()].sort(),ids('Object.keys(giftById)'));
 const actual=kind=>book.effects.filter(f=>f.kind===kind).map(f=>f.id).sort();
 assert.deepEqual(actual('天赋触发'),ids("Object.keys(talentMotifs).map(id=>'gift/'+id)"));
 assert.deepEqual(actual('普攻'),ids("Object.keys(attackForms).flatMap(w=>['form/'+w+'-left','form/'+w+'-right'])"));
 assert.deepEqual(actual('技能'),ids("Object.entries(castStudies).flatMap(([r,slots])=>Object.keys(slots).map(s=>'cast/'+r+'/'+s))"));
 for(const t of talents.values()){
  assert.ok(t.rule&&t.handling&&t.requires&&t.rarity,t.id);
  assert.ok(t.effects.length,t.id);
  for(const id of t.effects)assert.ok(effects.get(id)?.talents.includes(t.id),id+' / '+t.id);
 }
 for(const f of effects.values()){
  for(const id of f.talents)assert.ok(talents.get(id)?.effects.includes(f.id),id+' / '+f.id);
 }
 assert.ok(effects.get('form/rifle-right').keys.includes('bolt/rifle/1/2'));
 assert.ok(!effects.get('cast/reaper/ultimate').talents.includes('engine'));
});
