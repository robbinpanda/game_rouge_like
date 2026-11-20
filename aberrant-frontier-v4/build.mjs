import fs from 'node:fs';
import {packEmber} from './pack-ember.mjs';
import {packCreatures} from './pack-creatures.mjs';
const rogue=process.argv.includes('--rogue');
if(rogue){
 const {writeEffectIndex}=await import('../game-workbench/tools/index-echo-effects.mjs');
 writeEffectIndex();
}
const library='../game-workbench/library/echo-effects/';
const source=name=>'./src/'+name+'.js';
const effect=name=>library+name+'.js';
const files=[source('core'),effect('shared-effects'),...['arsenal','characters','world','combat','simulation','frontier','scenery','raid','presentation','battle','input'].map(source)];
if(rogue){
 files.push(...['studies','skill-effects','weapon-effects','talent-effects'].map(effect),
  ...['expedition-combat','expedition-audio','expedition-fx','gifts','chambers','creature-rigs','encounters','expedition'].map(source));
}
const pieces=files.map(file=>fs.readFileSync(new URL(file,import.meta.url),'utf8'));
const emberRuntime=fs.readFileSync(new URL('./src/ember.js',import.meta.url),'utf8');
const cacheMesh=fs.readFileSync(new URL('../game-workbench/library/models/field-cache/cache-mesh.json',import.meta.url),'utf8');
pieces.unshift('const cacheMesh='+cacheMesh+';');
pieces.unshift('const emberAsset='+JSON.stringify(packEmber())+';\n'+emberRuntime);
pieces.unshift('const rogueMode='+rogue+';');
if(rogue)pieces.unshift('const creatureFiles='+JSON.stringify(packCreatures())+';');
const setup=rogue?'environment=createExpeditionWorld();':'environment=createStylizedWorld();enrichWorld();dressCheckpoint();plazaPaving();batchStaticWorld();';
pieces.push(setup+"initializeV2();initializeV4();if(rogueMode)initializeExpedition();loadEmberTextures();configureMouseLook();$('loading').classList.add('hidden');$('menu').classList.remove('hidden');requestAnimationFrame(loop);");
fs.writeFileSync(new URL(rogue?'./dist/rogue-game.js':'./dist/game.js',import.meta.url),pieces.join('\n\n'));
console.log(rogue?'Built Echo Expedition':'Built Sunny Bay Expedition');
