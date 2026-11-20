import test from 'node:test';
import assert from 'node:assert/strict';
import { MouseLook } from '../dist/mouse-look.js';
function setup(){let yaw=0,pitch=0;const look=new MouseLook((x,y)=>{yaw+=x;pitch+=y;});look.setActive(true);return{look,angles:()=>({yaw,pitch})};}
test('unlocked input never rotates, including at or beyond all screen edges',()=>{
 const{look,angles}=setup();for(const[x,y]of [[0,360],[1280,360],[640,0],[640,720],[-100,360],[1500,360]])look.move({clientX:x,clientY:y,movementX:100,movementY:80});
 assert.deepEqual(angles(),{yaw:0,pitch:0});
});
test('locked input uses relative motion independently of screen coordinates',()=>{
 const{look,angles}=setup();look.setLocked(true);look.move({movementX:200,movementY:100,clientX:640,clientY:360});assert.deepEqual(angles(),{yaw:.6,pitch:.22});
 look.move({movementX:200,movementY:100,clientX:640,clientY:360});assert.deepEqual(angles(),{yaw:1.2,pitch:.44});
});
test('stationary cursor at an edge causes no automatic rotation',()=>{
 const{look,angles}=setup();look.setLocked(true);
 for(let i=0;i<600;i++)look.move({clientX:1280,clientY:720,movementX:0,movementY:0});assert.deepEqual(angles(),{yaw:0,pitch:0});
 assert.equal(look.step,undefined);assert.equal(look.leave,undefined);
});
test('continued relative mouse movement can rotate multiple full revolutions',()=>{
 const{look,angles}=setup();look.setLocked(true);for(let i=0;i<100;i++)look.move({movementX:100,movementY:0});assert.ok(angles().yaw>Math.PI*4);
});
test('releasing lock or pausing immediately stops input; relock has no stale movement',()=>{
 const{look,angles}=setup();look.setLocked(true);look.move({movementX:100});look.setLocked(false);look.move({movementX:900});assert.equal(angles().yaw,.3);
 look.setLocked(true);look.setActive(false);look.move({movementX:900});assert.equal(angles().yaw,.3);
 look.setActive(true);look.move({movementX:10});assert.ok(Math.abs(angles().yaw-.33)<1e-12);
});
test('sensitivity and vertical inversion apply to relative motion',()=>{
 const{look,angles}=setup();look.setLocked(true);look.sensitivity=2;look.invert=true;look.move({movementX:50,movementY:50});assert.deepEqual(angles(),{yaw:.3,pitch:-.22});
});
