import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('standalone delivery embeds every art asset and all runtime dependencies',()=>{
 const html=fs.readFileSync(new URL('../../畸变前线-第四版.html',import.meta.url),'utf8');
 const script=html.match(/<script type="module">([\s\S]*)<\/script>/)[1];assert.ok(!/^import /m.test(script));assert.ok(!/<link rel="stylesheet"/.test(html));assert.ok(!/url\(['"]?assets\//.test(html));assert.match(script,/const EMBEDDED_ASSETS=/);assert.match(script,/data:image\/webp;base64,/);assert.match(script,/data:image\/svg\+xml;base64,/);
 assert.doesNotThrow(()=>new vm.Script('(async()=>{'+script+'})()'));
 for(const id of ['ember','frost','shade','bastion','reaper'])assert.match(script,new RegExp('"'+id+'\\.webp":"data:image/webp;base64,'));
});
