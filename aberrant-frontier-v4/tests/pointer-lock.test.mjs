import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { MouseLook } from '../dist/mouse-look.js';
const code=fs.readFileSync(new URL('../src/input.js',import.meta.url),'utf8');
const core=fs.readFileSync(new URL('../src/core.js',import.meta.url),'utf8');
function setup(){
 const nodes=new Map(),timers=[];
 class Node extends EventTarget{constructor(){super();this.textContent='';this.disabled=false;this.classes=new Set();this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};}}
 const document=new EventTarget();document.hidden=false;document.pointerLockElement=null;
 const canvas=new Node(),window=new EventTarget();canvas.requestPointerLock=()=>undefined;
 document.exitPointerLock=()=>{if(!document.pointerLockElement)return;document.pointerLockElement=null;document.dispatchEvent(new Event('pointerlockchange'));};
 const ctx=vm.createContext({MouseLook,canvas,document,window,rogueMode:false,state:'paused',yaw:0,pitch:0,input:{},mouseDown:false,mouseRight:false,chargeTime:0,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),setTimeout:fn=>timers.push(fn),$:id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);}});
 vm.runInContext(core.match(/^function pauseGame\(\).*$/m)[0]+'\n'+code+'\n'+core.match(/^window.addEventListener\('keydown'.*$/m)[0],ctx);
 const acquire=()=>{document.pointerLockElement=canvas;document.dispatchEvent(new Event('pointerlockchange'));};
 return{ctx,canvas,document,window,timers,acquire,nodes};
}
test('the round stays paused until the browser confirms actual pointer lock',()=>{
 const s=setup();s.ctx.lockMouse();assert.equal(s.ctx.state,'paused');assert.equal(s.nodes.get('resume').disabled,true);
 s.acquire();assert.equal(s.ctx.state,'playing');assert.equal(s.nodes.get('resume').disabled,false);
 s.ctx.input.KeyW=true;s.timers.forEach(fn=>fn());assert.equal(s.ctx.input.KeyW,true,'settled request must not clear movement later');
});
test('denied and unsupported pointer lock keep gameplay paused without fallback motion',async()=>{
 for(const unsupported of [false,true]){
  const s=setup();s.canvas.requestPointerLock=unsupported?undefined:()=>Promise.reject(new Error('Denied'));
  s.ctx.lockMouse();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(s.ctx.state,'paused');assert.equal(s.nodes.get('resume').disabled,false);
  assert.match(s.nodes.get('look-status').textContent,/未锁定/);
  const event=new Event('mousemove');Object.assign(event,{movementX:100,movementY:100,clientX:5000});s.window.dispatchEvent(event);assert.equal(s.ctx.yaw,0);
 }
});
test('Escape releases the cursor and pauses; a second Escape never resumes automatically',()=>{
 const s=setup();s.ctx.lockMouse();s.acquire();s.ctx.mouseDown=true;
 const esc=new Event('keydown');Object.assign(esc,{code:'Escape'});s.window.dispatchEvent(esc);
 assert.equal(s.ctx.state,'paused');assert.equal(s.document.pointerLockElement,null);assert.equal(s.ctx.mouseDown,false);
 s.window.dispatchEvent(esc);assert.equal(s.ctx.state,'paused');assert.equal(s.document.pointerLockElement,null);
 s.ctx.lockMouse();s.acquire();assert.equal(s.ctx.state,'playing');
});
test('a late lock after cancellation is released instead of silently resuming',()=>{
 const s=setup();s.ctx.lockMouse();s.ctx.pauseGame();s.acquire();
 assert.equal(s.ctx.state,'paused');assert.equal(s.document.pointerLockElement,null);
});
test('browser lock loss freezes gameplay and clears held attacks',()=>{
 const s=setup();s.ctx.lockMouse();s.acquire();s.ctx.mouseDown=true;s.ctx.mouseRight=true;
 s.document.exitPointerLock();assert.equal(s.ctx.state,'paused');assert.equal(s.ctx.mouseDown,false);assert.equal(s.ctx.mouseRight,false);
});
