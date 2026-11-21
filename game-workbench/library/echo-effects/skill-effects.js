const skillGeometry=new Map(),skillMaterials=[];
const skillPalettes={
 ember:['#ab3225','#ff702a','#ffb345','#fff2bc'],
 frost:['#163959','#4e8db9','#7be5f4','#e6fff9'],
 shade:['#2a1d4a','#6846a8','#b98cff','#f5e6ff'],
 reaper:['#173c4b','#298980','#92e1bf','#e1fff0'],
 bastion:['#293340','#526277','#bc9066','#ffe3a0']
};
const point3=(x,y,z)=>new THREE.Vector3(x,y,z);
const polar3=(r,a,y)=>point3(r*Math.sin(a),y,r*Math.cos(a));

// Build closed, faceted volumes in cast-local space. Bands mark successive study tiers.
function sculptGeometry(colours,draw,maxTier=Infinity){
 const palette=colours.map(hex=>new THREE.Color(hex));
 const positions=[],colors=[],motion=[],levels=[];
 function face(a,b,c,tone,tier,drift){
  if(tier>maxTier)return;
  for(const p of [a,b,c]){
   positions.push(p.x,p.y,p.z);colors.push(palette[tone].r,palette[tone].g,palette[tone].b);
   motion.push(drift.x,drift.y,drift.z);levels.push(tier);
  }
 }
 function ribbon(path,width,thickness,tier=0,bright=false,drift=point3(0,.35,0)){
  const curve=new THREE.CatmullRomCurve3(path);
  const count=Math.max(14,path.length*3),sides=5;let previous;
  let frame;
  for(let i=0;i<=count;i++){
   const t=i/count,center=curve.getPoint(t),tangent=curve.getTangent(t).normalize();
   if(!frame)frame=Math.abs(tangent.y)<.85?point3(0,1,0):point3(1,0,0);
   frame.addScaledVector(tangent,-frame.dot(tangent)).normalize();
   const across=new THREE.Vector3().crossVectors(tangent,frame).normalize();
   const taper=.012+Math.pow(Math.sin(Math.PI*t),.68),ring=[];
   for(let j=0;j<sides;j++){
    const a=j*2*Math.PI/sides;
    ring.push(center.clone().addScaledVector(frame,width*taper*Math.cos(a))
     .addScaledVector(across,thickness*taper*Math.sin(a)));
   }
   if(previous)for(let j=0;j<sides;j++){
    const k=(j+1)%sides,tone=bright?(j===2?2:3):[3,2,1,0,1][j];
    face(previous[j],ring[j],ring[k],tone,tier,drift);face(previous[j],ring[k],previous[k],tone,tier,drift);
   }
   previous=ring;
  }
 }
 function shard(base,tip,r,tier=0,hot=false){
  const direction=tip.clone().sub(base),axis=direction.clone().normalize();
  const u=axis.clone().cross(Math.abs(axis.y)>.9?point3(1,0,0):point3(0,1,0)).normalize();
  const v=axis.clone().cross(u),belly=base.clone().addScaledVector(direction,.42);
  const drift=direction.clone().multiplyScalar(hot?.30:.13),rim=[];
  for(let i=0;i<5;i++){
   const a=i*2*Math.PI/5;rim.push(belly.clone().addScaledVector(u,Math.cos(a)*r).addScaledVector(v,Math.sin(a)*r*.72));
  }
  for(let i=0;i<5;i++){const j=(i+1)%5;
   face(base,rim[i],rim[j],hot?2:i%2,tier,drift);
   face(rim[i],tip,rim[j],hot?3:[0,1,2,1,0][i],tier,drift);
  }
  if(!hot&&r>.28)ribbon([base.clone().lerp(rim[1],.6),rim[1],rim[1].clone().lerp(tip,.75)],.055,.035,tier,true,drift);
 }
 function helix(radius,height,turn,offset,tier,width,base=point3(0,0,0)){
  const path=[];
  for(let i=0;i<=12;i++){const t=i/12,a=offset+t*turn;
   path.push(polar3(radius*(.65+.42*Math.sin(t*Math.PI)),a,.22+t*height).add(base));
  }
  ribbon(path,width,width*.56,tier);
 }
 draw({ribbon,shard,helix});
 const g=new THREE.BufferGeometry();
 for(const [key,values,size] of [['position',positions,3],['color',colors,3],['drift',motion,3],['tier',levels,1]]){
  g.setAttribute(key,new THREE.Float32BufferAttribute(values,size));
 }
 g.computeVertexNormals();return g;
}
function skillSculpture(hero,slot){
 return sculptGeometry(skillPalettes[hero],({ribbon,shard,helix})=>{
 if(hero==='ember'){
  if(slot==='skill'){
   // The strands run from the old footprint to a crest above the arrival point.
   for(let i=0;i<5;i++){
    const offset=i*2.14,tier=[0,0,1,2,3][i],path=[];
    for(let j=0;j<=12;j++){const t=j/12,a=t*5.8+offset;
     path.push(point3(Math.cos(a)*(.38+.58*t),1+.48*Math.sin(a)+1.9*t*t,7*t));}
    ribbon(path,.19+(i===0?.13:0),.13,tier);
   }
   for(let i=0;i<13;i++){const z=.5+i*.49,x=Math.sin(i*2.4)*.92,y=.55+(i%4)*.26;
    shard(point3(x,y,z),point3(x+.16,y+.65,z-.45),.09,i%4,true);}
  }else if(slot==='utility'){
   for(let i=-4;i<=4;i++){
    const x=i*.87,offset=Math.sin(i*2.4)*.68;
    ribbon([point3(x,.06,offset+.6),point3(x-.24,.43,offset+.3),point3(x+.16,1.22,offset-.2),point3(x+.08,2.15-Math.abs(i)*.18,offset-.7)],.33,.18,0,true);
    shard(point3(x,.05,offset+.9),point3(x+.36,.69,offset-.89),.16,i%2===0?1:2,true);
   }
  }else{
   for(let i=0;i<11;i++){
    const a=i*Math.PI*2/11;
    ribbon([polar3(1.0,a,.45),polar3(2.1,a+.16,1.3),polar3(4.6,a+.26,2.1),
     polar3(7.8,a+.30,.23)],.45,.28,i%4===0?1:0,i%3===0,polar3(1.2,a,.6));
    shard(polar3(1.3,a,.1),polar3(4+i%4,a+.21,2.8),.16,i%4,true);
   }
  }
 }else if(hero==='frost'){
  if(slot==='skill'){
   for(let i=0;i<4;i++){
    const x=(i-1.5)*.28,y=1.4+i*.12;
    shard(point3(x,y,-.35),point3(x*.35,1.54,2.5+i*.22),.22,i<2?0:i-1,true);
    ribbon([point3(x*.8,y,-.5),point3(x*2,y-.2,.35),point3(x,1.54,1.55)],.065,.038,0,true);
   }
  }else if(slot==='utility'){
   for(let i=0;i<12;i++){
    const a=i*Math.PI/6;
    shard(polar3(2.2,a,.03),polar3(3.2,a+.09,1.45+(i%3)*.27),.30,0);
    shard(polar3(2.7,a+.15,.03),polar3(3.6,a+.16,.72),.18,1);
   }
  }else{
   for(let i=0;i<18;i++){
    const a=i*Math.PI/9,r=2.8+i%4*1.25;
    shard(polar3(r-1.4,a,-.22),polar3(r+.95,a,1.25+(i%4)*.48),.49,0);
    shard(polar3(r,a+.12,.05),polar3(r+1.25,a+.15,.86),.19,i%4,true);
   }
  }
 }else if(hero==='shade'){
  if(slot==='skill'){
   for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5;
    ribbon([polar3(.4,a,.4),polar3(1.1,a+.6,1.1),polar3(.7,a+1.4,1.9),point3(0,1.2,7.5)],.14,.09,i%3,true);
   }
  }else if(slot==='utility'){
   for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    shard(polar3(1.6,a,.08),polar3(2.2,a+.2,1.65),.18,i%2,true);
   }
  }else{
   for(let i=0;i<14;i++){
    const a=i*Math.PI/7;
    ribbon([polar3(1.2,a,.7),polar3(3.8,a+.45,1.5),polar3(7.2,a+.85,.6)],.26,.14,i%3,true,polar3(1.4,a,.5));
    shard(polar3(2.0,a,.2),polar3(5.4,a+.25,2.2),.15,i%4,true);
   }
  }
 }else if(hero==='reaper'){
  if(slot==='skill'){
   for(let i=0;i<3;i++){
    const x=(i-1)*.48;
    ribbon([point3(-1.55+x,3.4,1.9),point3(-.72+x,2.85,2.55),point3(.12+x,1.8,2.85),point3(1.2+x,.7,2.25)],.19,.11);
    ribbon([point3(1.8+x,3.25,2.25),point3(.71+x,2.5,3),point3(-.64+x,.92,2.55)],.14,.09,i+1,true);
   }
  }else{
   const ultimate=slot==='ultimate',radius=ultimate?2.45:3.1;
   // Upright crescent blades and their inward-curving tips.
   for(let i=0;i<8;i++){const a=i*Math.PI/4,tier=i%2?1+i%3:0;
    ribbon([polar3(radius*.72,a,.36),polar3(radius,a+.18,1.4),
     polar3(radius*.90,a+.48,2.65),polar3(radius*.43,a+.68,ultimate?3.85:3.15)],ultimate?.31:.18,.13,tier);
   }
  }
 }else if(slot==='skill'){
  // An open shell in front of the character leaves the camera side readable.
  for(let i=-2;i<=2;i++){
   const a=i*.49,outer=1.06+.12*Math.abs(i);
   shard(polar3(.72,a,.38),polar3(outer,a,2.8-.16*Math.abs(i)),.50,0);
   shard(polar3(outer,a,1.22),polar3(1.44,a,3.17),.27,1+Math.abs(i)%3);
  }
 }else{
  const ultimate=slot==='ultimate',count=ultimate?10:7;
  for(let i=0;i<count;i++){
   const a=i*Math.PI*2/count,r=ultimate?2.8:1.95,tier=i%3===1?1:0;
   shard(polar3(r*.65,a,-.38),polar3(r*1.25,a+.08,2.1+(i%3)*.57+(ultimate?.72:0)),ultimate?.65:.48,tier);
   shard(polar3(r*1.17,a+.22,1.35),polar3(r*1.47,a+.27,2.43),.24,2);
   shard(polar3(r*1.08,a-.18,2.3),polar3(r*1.3,a-.24,3.1),.15,3,true);
  }
 }
 });
}
function newSkillMaterial(){
 return new THREE.ShaderMaterial({transparent:true,vertexColors:true,side:THREE.DoubleSide,depthWrite:true,
  uniforms:{phase:{value:0},level:{value:0},rock:{value:0},sweep:{value:0},flame:{value:0},spin:{value:0},stroke:{value:0}},
  vertexShader:`attribute vec3 drift;attribute float tier;uniform float phase,rock,sweep,flame,spin;
   varying vec3 pigment;varying float band;varying float along;varying vec3 local;varying float rim;varying float eyeDepth;
   void main(){
    float distanceFromCast=length(position.xz);
    float rise=smoothstep(0.,.24,phase+(spin<0.?-.025*distanceFromCast:0.));
    vec3 p=position;
    p.y*=mix(.35,1.,rise);
    p.xz*=mix(.78,1.,rise);
    p+=drift*phase*phase*2.;
    local=position;
    float twist=max(0.,spin)*phase*(.4+.18*p.y);
    p.xz=mat2(cos(twist),-sin(twist),sin(twist),cos(twist))*p.xz;
    p.x+=flame*.09*p.y*sin(phase*12.+p.y*2.6+p.z);
    p.y-=rock*max(0.,phase-.78)*2.;
    vec3 n=normalize(mat3(modelMatrix)*normal);
    float light=mix(.75,.98,smoothstep(.35,.47,abs(dot(n,normalize(vec3(-.5,.82,.35))))));
    pigment=color*light;band=tier;along=position.z/7.;
    vec4 view=modelViewMatrix*vec4(p,1.);
    rim=pow(1.-abs(dot(normalize(normalMatrix*normal),normalize(-view.xyz))),2.5);
    eyeDepth=-view.z;gl_Position=projectionMatrix*view;
   }`,
  fragmentShader:`uniform float phase,level,sweep,rock,flame,stroke;varying vec3 pigment;varying float band,along;varying vec3 local;varying float rim;varying float eyeDepth;
   void main(){
    if(band>level+.1 || (sweep>.5 && along>min(1.1,.4+phase*4.)))discard;
    if(sweep<-.5 && length(local.xz)>1.6+phase*25.)discard;
    float a=smoothstep(0.,.07,phase)*(1.-smoothstep(.55,1.,phase));
    if(stroke>.5){
     float path=stroke<1.5?clamp(.5+local.x*.15,0.,1.):stroke<2.5?clamp(local.z/5.,0.,1.):clamp(1.-local.y/3.,0.,1.);
     float head=.23+phase*3.5;
     if(path>head)discard;
     a*=1.-smoothstep(.35,1.10,phase-path*.38);
    }
    float pulse=.5+.5*sin(local.y*4.-local.z*1.8-phase*15.);
    vec3 heat=flame<0.?vec3(.16,.52,1.):mix(vec3(.35,1.,.82),vec3(1.,.64,.24),flame);
    vec3 colour=pigment+(1.-rock)*heat*(.035+.19*rim+.04*pulse);
    a*=smoothstep(1.1,3.8,eyeDepth);
    if(a<.035)discard;
    gl_FragColor=vec4(colour,a*mix(.88,.97,rock));
    #include <colorspace_fragment>
   }`
 });
}
function sculptedEffect(key,build,position,duration,level){
 if(!skillGeometry.has(key))skillGeometry.set(key,build());
 const material=skillMaterials.pop()||newSkillMaterial(),u=material.uniforms;
 u.phase.value=0;u.level.value=level;u.rock.value=1;u.stroke.value=0;u.sweep.value=0;u.flame.value=0;u.spin.value=0;
 const m=addBattleEffect(skillGeometry.get(key),material,position,duration,true);
 m.name=key;
 return m;
}
function showSkillCast(slot,origin=player.group.position){
 const role=chosenClass,key=role+'/'+slot;
 const upgrades=castStudyIds(role,slot).reduce((sum,id)=>sum+rank(id),0)+(hp<=maxHp*.6?rank('engine'):0);
 const dash=slot==='skill'&&role==='ember',shield=slot==='skill'&&role==='bastion';
 const p=player.group.position;
 const center=dash||slot==='utility'?origin:p;
 if(role==='ember'){
  const tint=slot==='utility'?0xff962e:0xff6540;
  impactSpray(center.clone().setY(.55),tint,slot!=='skill');
 }
 const object=sculptedEffect(key,()=>skillSculpture(role,slot),center,shield?Math.max(.6,shieldTime):slot==='ultimate'?1.15:dash?.64:.86,Math.min(3,upgrades));
 const u=object.material.uniforms;
 u.flame.value=role==='ember'?1:role==='frost'?-1:0;
 u.spin.value=slot==='ultimate'?(role==='reaper'?1.4:role==='frost'?-1:0):0;
 u.rock.value=role==='bastion'?1:0;
 u.sweep.value=dash?1:slot==='ultimate'&&(role==='frost'||role==='ember')?-1:0;
 object.rotation.y=player.group.rotation.y;
 if(dash){
  const dx=p.x-origin.x,dz=p.z-origin.z,length=Math.hypot(dx,dz);
  if(length>.02)object.rotation.y=Math.atan2(dx,dz);
  object.scale.z=Math.max(.12,length/7);
 }else if(shield||(slot==='ultimate'&&role==='reaper')){object.userData.follow=player.group;}
 return object;
}
