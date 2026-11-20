// Pointer Lock is the only camera input mode. Cursor position never drives rotation.
export class MouseLook {
 constructor(apply){this.apply=apply;this.active=false;this.locked=false;this.sensitivity=1;this.invert=false;}
 setActive(value){this.active=value;}
 setLocked(value){this.locked=value;}
 move(event){
  if(!this.active||!this.locked)return;
  const dx=event.movementX||0,dy=event.movementY||0;
  if(!Number.isFinite(dx)||!Number.isFinite(dy))return;
  this.apply(dx*.003*this.sensitivity,dy*.0022*this.sensitivity*(this.invert?-1:1));
 }
}
