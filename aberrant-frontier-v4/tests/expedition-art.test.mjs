import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gameHarness} from './harness.mjs';

test('every expedition talent, region and combat portrait resolves to an offline image and workbench original',()=>{
 const {run}=gameHarness(true);
 const library=new URL('../../game-workbench/library/echo-art/',import.meta.url);
 const {assets}=JSON.parse(fs.readFileSync(new URL('manifest.json',library),'utf8'));
 const expected=Array.from(run(`[...Object.values(giftById).filter(t=>!t.art).map(t=>t.id),...Object.keys(WEAPONS).map(id=>'item-'+id),
  ...Object.keys(expeditionRoles).filter(id=>id!=='frost'&&id!=='shade').flatMap(id=>['E','X','Q'].map(key=>'skill-'+id+key)),
  'action-charge','action-counter','action-dodge',...Object.keys(monsters),...bossArt,...regionArt]`));
 assert.ok(run("Object.keys(giftById).every(id=>echoImage(id)===assetURL('echo-'+(giftById[id].art||id)+'.webp'))"));
 assert.deepEqual(assets.map(a=>a.id).sort(),expected.sort());
 const html=fs.readFileSync(new URL('../../畸变前线-回响远征.html',import.meta.url),'utf8');
 for(const hero of ['frost','shade'])for(const name of Array.from(run(`['E','X','Q'].map(k=>skillIcon('${hero}',k))`))){
  assert.ok(html.includes('"'+name+'":"data:image/svg+xml;base64,'));
 }
 for(const a of assets){
  assert.ok(fs.statSync(new URL(a.source,library)).size>0,a.name);
  const bytes=fs.readFileSync(new URL('../dist/assets/echo-'+a.id+'.webp',import.meta.url));
  assert.equal(bytes.subarray(8,12).toString(),'WEBP');
  assert.ok(html.includes('"echo-'+a.id+'.webp":"data:image/webp;base64,'+bytes.toString('base64')+'"'),a.name);
 }
});
