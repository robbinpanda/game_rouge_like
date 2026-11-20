import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../dist/vendor/three.module.js';
import {HEROES,WEAPONS} from '../dist/data.js';
import {MouseLook} from '../dist/mouse-look.js';
import * as rules from '../dist/raid-rules.js';
class Element extends EventTarget{
 constructor(id=''){super();this.id=id;this.value='1';this.textContent='';this.innerHTML='';this.style={};this.dataset={};this.children=[];this.classes=new Set();this.queries=new Map();this.classList={add:(...xs)=>xs.forEach(x=>this.classes.add(x)),remove:(...xs)=>xs.forEach(x=>this.classes.delete(x)),toggle:(x,on)=>{if(on===undefined)on=!this.classes.has(x);on?this.classes.add(x):this.classes.delete(x);return on;},contains:x=>this.classes.has(x)};}
 querySelector(s){if(!this.queries.has(s))this.queries.set(s,new Element(s));return this.queries.get(s);}
 querySelectorAll(){return[];}
 get parentElement(){return this.querySelector('parent');}
 appendChild(e){this.children.push(e);return e;}
 append(e){this.children.push(e);}
 after(){}
 replaceWith(){}
 remove(){}
 getContext(){return new Proxy({measureText:t=>({width:t.length*10})},{get:(o,k)=>k in o?o[k]:(()=>{})});}
}
class Renderer{constructor(){this.shadowMap={};this.info={render:{calls:0}};}setPixelRatio(){}setSize(){}render(){} }
export function gameHarness(rogue=false){
 const elements=new Map(),storage=new Map();const document=new EventTarget();Object.assign(document,{hidden:false,pointerLockElement:null,createElement:id=>new Element(id),getElementById:id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);},querySelector:s=>document.getElementById(s.startsWith('#')?s.slice(1):s),querySelectorAll:()=>[],exitPointerLock:()=>{document.pointerLockElement=null;document.dispatchEvent(new Event('pointerlockchange'));}});
 const ctx=vm.createContext({atob,Uint8Array,Int16Array,Uint16Array,Float32Array,THREE:{...THREE,WebGLRenderer:Renderer},HEROES,WEAPONS,MouseLook,...rules,document,window:new EventTarget(),performance:{now:()=>0},innerWidth:1440,innerHeight:900,devicePixelRatio:1,requestAnimationFrame:()=>{},setTimeout:()=>{},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},console,URL,Math,Set,Map});
 const code=fs.readFileSync(new URL(rogue?'../dist/rogue-game.js':'../dist/game.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');vm.runInContext(code,ctx);
 const run=code=>vm.runInContext(code,ctx);
 run("sound=false;canvas.requestPointerLock=()=>{};startGame();state='playing';document.pointerLockElement=canvas;wantsLock=true;time=10;scene.updateMatrixWorld(true);");
 return {run,ctx,document,elements,storage};
}
