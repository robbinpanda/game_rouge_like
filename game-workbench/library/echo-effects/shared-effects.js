// Each live effect owns its fading material. Detached meshes can be recolored and reused.
function effectMeshPool(materialOptions, maxIdle){
 const idle=[];
 return {
  acquire(geometry,position,color,opacity=1){
   const m=idle.pop() || new THREE.Mesh(geometry,new THREE.MeshBasicMaterial(materialOptions));
   m.geometry=geometry;
   m.material.color.set(color);
   m.material.opacity=opacity;
   m.position.copy(position);
   m.rotation.set(0,0,0,'XYZ');
   m.scale.set(1,1,1);
   effects.add(m);
   return m;
  },
  release(m){
   m.removeFromParent();
   if(idle.length<maxIdle)idle.push(m);
   else m.material.dispose();
  }
 };
}
const particlePool=effectMeshPool({transparent:true},128);
const ringPool=effectMeshPool({transparent:true,side:THREE.DoubleSide,depthWrite:false},32);
const projectilePool=effectMeshPool({},32);
const fullRingGeometry=new THREE.RingGeometry(.78,1,48);
const arcGeometry=new THREE.RingGeometry(.78,1,48,1,-.6,Math.PI*1.3);
const projectileGeometry=new THREE.ConeGeometry(.12,.8,5);
const effectUp=new THREE.Vector3(0,1,0);

function particlesAt(position,color,count=12,force=4){
 for(let i=0;i<count;i++){
  const m=particlePool.acquire(icoGeo,position,color);
  m.scale.setScalar(visualRange(.025,.09));
  particles.push({m,v:new THREE.Vector3(visualRange(-force,force),visualRange(.5,force),visualRange(-force,force)),life:visualRange(.2,.55),max:.55});
 }
}
function ringAt(pos,color,radius=4,life=.45,vertical=false){
 const m=ringPool.acquire(vertical?arcGeometry:fullRingGeometry,pos,color,.9);
 m.rotation.x=-Math.PI/2;
 if(vertical)m.rotation.z=player.group.rotation.y;
 rings.push({m,life,max:life,radius,vertical});
}

const trails=[],attackTelegraphs=[];
const maxTrails=80;
const trailPool=effectMeshPool({transparent:true,depthWrite:false},maxTrails);
const trailGeometry=new THREE.CylinderGeometry(1,1,1,5);
const trailDelta=new THREE.Vector3();

function drawTrail(from,to,color=0xffd8aa,life=.1,width=.025){
 trailDelta.subVectors(to,from);
 const length=trailDelta.length();
 if(!length)return;
 if(trails.length===maxTrails)trailPool.release(trails.shift().m);
 const m=trailPool.acquire(trailGeometry,from,color,.9);
 m.position.addScaledVector(trailDelta,.5);
 m.scale.set(width,length,width);
 m.quaternion.setFromUnitVectors(effectUp,trailDelta.divideScalar(length));
 trails.push({m,life,max:life});
}
function updateTrailFades(list,pool,dt){
 for(let i=list.length-1;i>=0;i--){
  const t=list[i];t.life-=dt;
  if(t.life<=0){pool.release(t.m);list.splice(i,1);}
  else t.m.material.opacity=.8*t.life/t.max;
 }
}

const battleEffects=[];
function addBattleEffect(geometry,shader,position,duration,skillCast=false){
 const object=new THREE.Mesh(geometry,shader);object.position.copy(position);object.frustumCulled=false;
 object.renderOrder=4;effects.add(object);battleEffects.push({object,duration,age:0,skillCast});return object;
}
function advanceBattleEffects(dt){
 for(let i=battleEffects.length-1;i>=0;i--){
  const f=battleEffects[i];f.age+=dt;
  const delay=f.object.userData.delay;
  if(delay){if(f.age<delay)continue;f.age-=delay;f.object.userData.delay=0;f.object.visible=true;}
  if(f.age>=f.duration){f.object.removeFromParent();if(f.skillCast){if(skillMaterials.length<12)skillMaterials.push(f.object.material);else f.object.material.dispose();}
   else{f.object.geometry.dispose();f.object.material.dispose();}battleEffects.splice(i,1);continue;}
  if(f.skillCast&&f.object.userData.follow){
   const actor=f.object.userData.follow;f.object.position.copy(actor.position);f.object.rotation.y=actor.rotation.y;
  }
  f.object.material.uniforms.phase.value=f.age/f.duration;
 }
}
function slashRibbon(a){
 const {id,heavy,step,forward}=a,reverse=step===1?-1:1;
 const reach=(heavy?a.w.heavyReach:a.w.reach)*.91;
 const side=new THREE.Vector3(forward.z,0,-forward.x),pos=[],uv=[],idx=[];
 for(let i=0;i<=42;i++){
  const t=i/42,angle=reverse*(-1.28+t*2.72),envelope=Math.sin(t*Math.PI)**.78;
  const y=id==='hammer'?2.6-t*2.32:.84+.88*(reverse>0?1-t:t)+Math.sin(t*Math.PI)*.32;
  for(let j=0;j<2;j++){
   const radius=reach*(.93-Math.cos(t*Math.PI)*.06)-j*(.014+envelope*(heavy?.85:.55));
   const off=side.clone().multiplyScalar(Math.sin(angle)*radius).addScaledVector(forward,Math.cos(angle)*radius);
   pos.push(off.x,y+j*.22*envelope,off.z);uv.push(t,j);
  }
  if(i){const n=i*2;idx.push(n-2,n-1,n,n,n-1,n+1);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);
 const m=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,uniforms:{phase:{value:0},colour:{value:new THREE.Color(a.riposte?0xfa796c:heavy?0x69bdff:a.id==='katana'?0xff955b:a.w.color)}},
 vertexShader:'varying vec2 coords;void main(){coords=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`varying vec2 coords;uniform float phase;uniform vec3 colour;
 void main(){float x=coords.x,y=coords.y;float head=min(1.16,.58+phase*3.3);
 float visible=(1.-smoothstep(head-.12,head,x))*smoothstep(-.02,.19,x)*smoothstep(-.08,.10,x-(phase*.94-.28));
 float core=1.-smoothstep(.17,.39,y);float filament=.6*(1.-smoothstep(.015,.045,abs(y-.63)));
 float opacity=visible*(1.-phase)*(.46+.52*core+.30*filament)*(1.-smoothstep(.5,1.,y));
 gl_FragColor=vec4(mix(colour,vec3(1.,.96,.82),core),opacity);
 #include <colorspace_fragment>
 }`});
 addBattleEffect(g,m,player.group.position,a.riposte?.43:heavy?.36:.26);
}
function impactSpray(pos,colour,heavy=false){
 const positions=[],velocities=[],seeds=[],tri=[[-1,0],[1,0],[0,1]];
 const count=heavy?30:16;
 const visibleCount=Math.min(8,Math.ceil(count*.55));
 for(let i=0;i<visibleCount;i++){
  const angle=visualRoll()*6.28,s=(heavy?6:4)*(.35+visualRoll()),speed=[Math.cos(angle)*s,(visualRoll()-.24)*s*1.35,Math.sin(angle)*s];
  const seed=visualRoll();for(const [x,y] of tri){positions.push(x,y,0);velocities.push(...speed);seeds.push(seed);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('velocity',new THREE.Float32BufferAttribute(velocities,3));g.setAttribute('seed',new THREE.Float32BufferAttribute(seeds,1));
 const m=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,uniforms:{phase:{value:0},colour:{value:new THREE.Color(colour)}},
 vertexShader:`attribute vec3 velocity;attribute float seed;uniform float phase;varying float heat;
 void main(){float t=.014+phase*.47;vec3 p=velocity*t;p.y-=4.6*t*t;
 vec4 view=modelViewMatrix*vec4(p,1.);vec2 v=(mat3(viewMatrix)*velocity).xy;
 vec2 d=normalize(v+vec2(.0001));float alive=1.-phase;
 view.xy+=vec2(-d.y,d.x)*position.x*(.012+.020*seed)*alive-d*position.y*(.06+.28*seed)*alive;
 heat=position.y;gl_Position=projectionMatrix*view;}`,
 fragmentShader:`varying float heat;uniform float phase;uniform vec3 colour;void main(){gl_FragColor=vec4(mix(vec3(1.,.98,.85),colour,heat+phase*.3),(1.-phase)*(1.-.65*heat));
 #include <colorspace_fragment>
 }`});
 addBattleEffect(g,m,pos,heavy?.53:.38);
}

function counterFlash(position){
 const shader=new THREE.ShaderMaterial({depthWrite:false,transparent:true,uniforms:{phase:{value:0}},
 vertexShader:`varying vec2 coords;uniform float phase;void main(){coords=uv*2.-1.;
 vec4 centre=modelViewMatrix*vec4(0.,0.,0.,1.);
 centre.xy+=position.xy*(.7+min(phase*5.,1.)*.48);gl_Position=projectionMatrix*centre;}`,
 fragmentShader:`varying vec2 coords;uniform float phase;void main(){
 vec2 v=mat2(.94,-.34,.34,.94)*coords;vec2 p=abs(v);
 float edge=pow(p.x,.43)+pow(p.y,.43);
 float star=1.-smoothstep(.97,1.03,edge);float core=1.-smoothstep(.58,.63,edge);
 float outer=1.-smoothstep(.036,.063,abs(length(v)-(.4+phase*.40)));
 gl_FragColor=vec4(mix(vec3(.97,.16,.16),vec3(1.,.95,.85),core),max(star,outer*.7)*(1.-phase));
 #include <colorspace_fragment>
 }`});
 addBattleEffect(new THREE.PlaneGeometry(3.6,3.6),shader,position,.34);
}
function chargedOutline(avatar){
 if(!avatar.chargeMarks){
  const geo=new THREE.BufferGeometry(),points=[];
  for(const side of [-1,1]){
   const path=[[side*.47,2.57,0],[side*.86,2.32,.05],[side*.79,2.08,.09],[side*1.0,1.8,.13],[side*.9,1.53,.12]];
   for(let i=1;i<path.length;i++)points.push(...path[i-1],...path[i]);
  }
  geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  const line=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0x80dcff,transparent:true,depthWrite:false}));avatar.group.add(line);avatar.chargeMarks=line;
 }
 avatar.chargeMarks.visible=true;const k=1+.055*Math.sin(time*32);avatar.chargeMarks.scale.set(k,k,1);
}

function updateEffects(dt){
 advanceBattleEffects(dt);
 updateTrailFades(trails,trailPool,dt);
 updateTrailFades(attackTelegraphs,ringPool,dt);
 for(let i=particles.length-1;i>=0;i--){
  const p=particles[i];p.life-=dt;
  if(p.life<=0){particlePool.release(p.m);particles.splice(i,1);continue;}
  p.v.y-=dt*8;p.m.position.addScaledVector(p.v,dt);
  p.m.material.opacity=p.life/p.max;
 }
 for(let i=rings.length-1;i>=0;i--){
  const r=rings[i];r.life-=dt;
  if(r.life<=0){ringPool.release(r.m);rings.splice(i,1);continue;}
  const t=1-r.life/r.max;
  r.m.scale.setScalar(r.radius*(.35+t*.65));r.m.material.opacity=1-t;
  if(r.vertical){r.m.rotation.z+=dt*10;r.m.rotation.x=-Math.PI/2+.2;}
 }
}

function drawWeaponSlash(w,step,heavy){const p=player.group.position.clone().add(new THREE.Vector3(0,1.35,0));const color=heavy?0x91d5ff:w.color;
 if(loadout[activeWeapon]==='spear'){const d=new THREE.Vector3(Math.sin(player.group.rotation.y),0,Math.cos(player.group.rotation.y));drawTrail(p,p.clone().addScaledVector(d,w.reach),color,.16,.06);}
 else{ringAt(p,color,w.reach*.8,.18,true);if(loadout[activeWeapon]==='dual')ringAt(p.clone().add(new THREE.Vector3(0,.3,0)),0xe0c6f6,w.reach*.7,.24,true);if(loadout[activeWeapon]==='hammer'&&heavy)ringAt(player.group.position.clone().add(new THREE.Vector3(0,.12,0)),color,5,.4);}
}

function drawActionArc(a){
 if(rogueMode){weaponSwing(a);return;}
 const pos=player.group.position.clone().add(new THREE.Vector3(0,1.35,0)),reach=a.heavy?a.w.heavyReach:a.w.reach;
 if(a.id==='spear'){drawTrail(pos,pos.clone().addScaledVector(a.forward,reach),a.w.color,.16,.065);return;}
 slashRibbon(a);if(a.id==='dual')slashRibbon({...a,step:a.step===1?0:1});
}
const telegraphGeometries=new Map();
function telegraphAttack(enemy,range,heavy){
 if(!telegraphGeometries.has(range))telegraphGeometries.set(range,new THREE.RingGeometry(.3,range,24,1,-.65,1.3));
 const m=ringPool.acquire(telegraphGeometries.get(range),enemy.avatar.group.position,heavy?0x70c7ee:0xf1b786,.23);
 m.position.y+=.07;
 m.rotation.set(Math.PI/2,0,Math.atan2(enemy.attackDir.z,enemy.attackDir.x));
 attackTelegraphs.push({m,life:enemy.windup,max:enemy.windup});
}

const zoneGeometries=new Map();
function zoneMarker(center,radius,color){
 if(!zoneGeometries.has(radius))zoneGeometries.set(radius,new THREE.RingGeometry(.3,radius,36));
 const m=ringPool.acquire(zoneGeometries.get(radius),center,color,.3);
 m.rotation.x=-Math.PI/2;
 return m;
}

function floatingDamage(position,amount,crit=false,tone=''){vec.copy(position);vec.y+=2.7;vec.project(camera);if(vec.z>1)return;const el=document.createElement('div');el.className='damage-number'+(crit?' crit':'')+(tone?' '+tone:'');el.textContent=amount;el.style.left=((vec.x*.5+.5)*innerWidth)+'px';el.style.top=((-vec.y*.5+.5)*innerHeight)+'px';$('floats').appendChild(el);setTimeout(()=>el.remove(),850);}
