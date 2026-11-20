const mouseLook=new MouseLook((dx,dy)=>{
 if(midDown){
  midMoved+=Math.abs(dx)+Math.abs(dy);
  if(!freeLook&&(midMoved>.045||performance.now()-midPressAt>140)){
   freeLook=true;freeLookYaw=yaw;freeLookPitch=pitch;
  }
 }
 if(freeLook){
  freeLookYaw+=dx;
  freeLookPitch=clamp(freeLookPitch+dy,-.42,1.05);
  return;
 }
 yaw+=dx;pitch=clamp(pitch+dy,-.65,1.15);
});
let lockPending=false,wantsLock=false,lockAttempt=0;
let mouseHelp='M 地图 · T 切换撤离 · ALT 奔跑 · CTRL 潜行 · H 急救';

function updateLookState(){
 const locked=document.pointerLockElement===canvas;
 mouseLook.setLocked(locked);mouseLook.setActive(state==='playing'&&locked);
 canvas.classList.toggle('mouse-follow',locked);
 $('mouse-tip').textContent=mouseHelp;
 $('mouse-tip').classList.toggle('hidden',state!=='playing');
 $('resume').disabled=lockPending;
}
function cancelMouseLock(){
 wantsLock=false;lockPending=false;lockAttempt++;mouseLook.setActive(false);
 updateLookState();
}
function showLockFailure(){
 if(!wantsLock)return;
 pauseGame();
 $('lock-message').textContent='浏览器没有允许鼠标锁定，猎场已暂停。点击下方按钮重试；如果仍失败，请在 Chrome 或 Edge 中打开游戏。';
 $('look-status').textContent='未锁定鼠标 · 不会自动转向';
 updateLookState();
}
function acceptMouseLock(){
 if(document.pointerLockElement!==canvas)return;
 if(!wantsLock||document.hidden||!['paused','playing'].includes(state)){document.exitPointerLock?.();return;}
 lockPending=false;state='playing';input={};mouseDown=mouseRight=false;chargeTime=0;
 $('pause').classList.add('hidden');
 $('lock-message').textContent='已暂停。点击下方按钮锁定鼠标并继续。';
 $('look-status').textContent='标准锁定视角 · ESC 释放鼠标';
 updateLookState();
}
function lockMouse(){
 if(!['paused','playing'].includes(state)||lockPending)return;
 wantsLock=true;
 if(document.pointerLockElement===canvas){acceptMouseLock();return;}
 state='paused';input={};mouseDown=mouseRight=false;chargeTime=0;
 $('pause').classList.remove('hidden');
 $('lock-message').textContent='正在锁定鼠标，成功后进入猎场。';
 $('look-status').textContent='等待浏览器锁定鼠标…';
 lockPending=true;const attempt=++lockAttempt;updateLookState();
 const fail=()=>{if(attempt===lockAttempt&&lockPending)showLockFailure();};
 if(!canvas.requestPointerLock){fail();return;}
 try{
  // Keep the request in the start/resume click's user activation.
  const pending=canvas.requestPointerLock();
  pending?.then(()=>{if(attempt===lockAttempt)acceptMouseLock();}).catch(fail);
  setTimeout(()=>{if(attempt!==lockAttempt||!lockPending)return;if(document.pointerLockElement===canvas)acceptMouseLock();else fail();},1800);
 }catch{fail();}
}
document.addEventListener('pointerlockerror',()=>{if(lockPending)showLockFailure();});
document.addEventListener('pointerlockchange',()=>{
 if(document.pointerLockElement===canvas){acceptMouseLock();return;}
 mouseLook.setLocked(false);
 if(state==='playing')pauseGame();
 updateLookState();
});
window.addEventListener('mousemove',event=>{
 if(state!=='playing'||document.pointerLockElement!==canvas)return;
 mouseLook.move(event);
});
function configureMouseLook(){
 $('look-sensitivity').addEventListener('input',event=>{mouseLook.sensitivity=Number(event.target.value);$('look-value').textContent=mouseLook.sensitivity.toFixed(1)+'×';});
 $('look-invert').addEventListener('change',event=>{mouseLook.invert=event.target.checked;});
 $('look-status').textContent='标准锁定视角 · ESC 释放鼠标';
 updateLookState();
}
