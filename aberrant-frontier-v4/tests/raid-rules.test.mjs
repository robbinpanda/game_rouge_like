import test from 'node:test';
import assert from 'node:assert/strict';
import {EXIT_DEFS,RAID_SECONDS,exitStatus,bagWeight,bagValue,canCarry,burdenMultiplier,extractAdvance} from '../dist/raid-rules.js';
test('all five exits have different, deterministic admission conditions',()=>{
 const [free,boat,rail,roof,last]=EXIT_DEFS;assert.equal(exitStatus(free).open,true);assert.equal(exitStatus(boat).open,false);assert.equal(exitStatus(boat,{fuel:1}).open,true);assert.equal(exitStatus(roof).open,false);assert.equal(exitStatus(roof,{signal:true}).open,true);assert.equal(exitStatus(last,{remaining:151}).open,false);assert.equal(exitStatus(last,{remaining:150}).open,true);
 assert.equal(exitStatus(rail,{time:114.99}).open,false);assert.equal(exitStatus(rail,{time:115}).open,true);assert.equal(exitStatus(rail,{time:179.99}).open,true);assert.equal(exitStatus(rail,{time:180}).open,false);assert.equal(exitStatus(rail,{time:295}).open,true);assert.equal(RAID_SECONDS,840);
});
test('leaving, damage and closing windows reset evacuation progress',()=>{
 const valid={inside:true,open:true,damaged:false,hold:8};assert.equal(extractAdvance(7.9,.11,valid).complete,true);
 for(const invalid of [{inside:false},{open:false},{damaged:true}])assert.deepEqual(extractAdvance(7.9,.11,{...valid,...invalid}),{progress:0,complete:false});
});
test('capacity, value and burden are calculated from actual carried items',()=>{
 const bag=Array(7).fill('core');assert.equal(bagWeight(bag),28);assert.equal(bagValue(bag),5950);assert.equal(canCarry(bag,'med'),false);assert.equal(canCarry(bag.slice(1),'core'),true);assert.equal(burdenMultiplier(20),1);assert.equal(burdenMultiplier(28),.76);
});
