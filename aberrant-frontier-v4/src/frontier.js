// Authored routes and reusable architecture follow the supplied sunny harbour concept art.
function createStylizedWorld(){
 const sky=new THREE.Mesh(new THREE.SphereGeometry(540,24,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,toneMapped:false,uniforms:{top:{value:new THREE.Color(0x68c7ef)},bottom:{value:new THREE.Color(0xa0dffb)}},vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 top;uniform vec3 bottom;varying vec3 v;void main(){float h=smoothstep(-.1,.7,normalize(v).y);gl_FragColor=vec4(mix(bottom,top,h),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));scene.add(sky);
 const water=mat(0x55b9c9,{roughness:.28,metalness:.18}),sand=mat(0xcda48c),grass=mat(0x9dad94),rail=mat(0x758b89),roof=mat(0xe4a28b);
 box(0,-.28,0,318,.5,318,mats.ground);box(0,-1.25,226,650,.5,140,water);
 for(const x of [-156,156]){box(x,1,0,.7,2,314,mats.lightConcrete);solid(x,0,.7,314,2);}
 for(const z of [-156,156]){box(0,1,z,314,2,.7,mats.lightConcrete);solid(0,z,314,.7,2);}
 for(const x of [-65,0,65]){box(x,.006,0,12,.035,308,mats.road);for(const side of [-1,1])box(x+side*6.5,.08,0,.35,.16,308,mats.lightConcrete);for(let z=-148;z<151;z+=8)box(x,.03,z,.16,.012,2.1,mats.line);}
 for(const z of [-70,0,70]){box(0,.012,z,308,.035,12,mats.road);for(const side of [-1,1])box(0,.08,z+side*6.5,308,.16,.35,mats.lightConcrete);for(let x=-148;x<151;x+=8)box(x,.038,z,2.1,.012,.16,mats.line);}
 function wall(x,y,z,w,h,d,m=mats.concrete){const b=box(x,y,z,w,h,d,m);solid(x,z,w,d,y+h/2);cameraMeshes.push(b);return b;}
 function anchor(x,y,z){const m=mesh(new THREE.OctahedronGeometry(.2),mint,x,y+.6,z);anchors.push({x,y,z,m});}
 function sign(text,x,y,z,w=8,sub='ABERRANT FRONTIER / QUARANTINE 07'){
  const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#296569';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#f8e7cc';ctx.font='600 76px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.fillText(text,512,130);ctx.fillStyle='#d9bd9f';ctx.font='23px sans-serif';ctx.fillText(sub,512,205);const m=mesh(new THREE.PlaneGeometry(w,w/4),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)}),x,y,z);m.castShadow=false;return m;
 }
 // A box aligned between two points gives roof trusses and gantries real depth,
 // while sharing the unit mesh used by the static instance batches.
 function girder(ax,ay,az,bx,by,bz,width,depth,material){
  const axis=new THREE.Vector3(bx-ax,by-ay,bz-az);
  const bar=box((ax+bx)/2,(ay+by)/2,(az+bz)/2,width,axis.length(),depth,material);
  bar.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());
  return bar;
 }
 const canvasRed=mat(0xca7665),cloth=mat(0xf2dfae),slate=mat(0x435c65);
 function shopfront(x,z,w,d){
  const awning=w*.8;
  for(const side of [-1,1]){
   const front=z+side*d/2;
   box(x,1.24,front+side*.14,awning,2.48,.22,slate);
   for(let i=0;i<3;i++){
    const bay=x+(i-1)*awning/3;
    box(bay,1.32,front+side*.28,awning/3-.19,i===1?2.25:1.68,.08,mats.glass);
    box(bay,1.6,front+side*.33,awning/3-.16,.065,.05,cloth);
   }
   for(let i=0;i<9;i++){
    const stripe=x+((i+.5)/9-.5)*awning, fabric=i%2?cloth:canvasRed;
    box(stripe,2.92,front+side*.62,awning/9,.11,1.2,fabric).rotation.x=side*.2;
    box(stripe,2.72,front+side*1.17,awning/9,.21,.07,fabric);
   }
  }
 }
 function house(x,z,w,d,h,color=mats.concrete){
  wall(x,h/2,z,w,h,d,color);box(x,.35,z,w+.5,.7,d+.5,sand);box(x,h+.15,z,w+.7,.3,d+.7,mats.metal);box(x,h+.42,z,w-.3,.25,d-.3,mats.lightConcrete);surfaces.push({x,z,w:w/2,d:d/2,h:h+.55});
  for(let y=2.5;y<h-.5;y+=3){box(x,y-1.12,z+d/2+.12,w,.15,.26,mats.lightConcrete);for(let a=-w/2+1.7;a<w/2-1;a+=2.8)for(const side of [-1,1]){box(x+a,y,z+side*(d/2+.07),1.45,1.65,.15,mats.dark);box(x+a,y,z+side*(d/2+.16),1.2,1.4,.05,mats.glass);box(x+a,y-.87,z+side*(d/2+.18),1.6,.15,.3,mats.lightConcrete);}for(let a=-d/2+2;a<d/2-1;a+=3)for(const side of [-1,1])box(x+side*(w/2+.09),y,z+a,.14,1.6,1.3,mats.glass);}
  box(x,h+.9,z,2.5,.9,1.8,mats.rust);anchor(x,h+.6,z);
  if(Math.abs(x)<50 && Math.abs(z)<80)shopfront(x,z,w,d);
  for(let i=0;i<4;i++){const vine=mesh(icoGeo,i%2?mats.leaf:mats.lavender,x-w/2+.1,h-i*.9,z+d/2+.2);vine.scale.set(.7,.8,.4);}
 }
 function shed(x,z,w,d,h,label){
  wall(x-w/2,h/2,z,.65,h,d);wall(x+w/2,h/2,z,.65,h,d);wall(x,h/2,z-d/2,w,h,.65);
  wall(x-w*.34,h/2,z+d/2,w*.32,h,.65);wall(x+w*.34,h/2,z+d/2,w*.32,h,.65);box(x,h-.6,z+d/2,w,1.2,.65,mats.metal);
  const r=box(x,h+.1,z,w+1,.35,d+1,roof);cameraMeshes.push(r);surfaces.push({x,z,w:w/2,d:d/2,h:h+.3});anchor(x,h+.4,z);sign(label,x,h-1.1,z+d/2+.4,w*.6);
  for(let a=-w/2+2;a<w/2;a+=4){box(x+a,h-.9,z-d/2-.35,2.2,1.1,.06,mats.glass);}
  for(const dx of [-w*.32,w*.32]){wall(x+dx,.65,z,3,1.3,2,mats.metal);}
 }
 function container(x,z,turned=false,stack=0){const w=turned?9:3.5,d=turned?3.5:9,h=3;wall(x,stack+h/2,z,w,h,d,(Math.round(x+z)%2)?mats.metal:mats.rust);for(let a=-4;a<=4;a++)if(turned)box(x+a,stack+1.5,z+d/2+.04,.07,2.8,.06,mats.lightConcrete);else box(x+w/2+.04,stack+1.5,z+a,.06,2.8,.07,mats.lightConcrete);surfaces.push({x,z,w:w/2,d:d/2,h:stack+h+.02});if(!stack)anchor(x,h+.05,z);}
 const bark=mat(0x775f69),crown=new THREE.IcosahedronGeometry(1,1),lilac=mat(0xaf9ad2),violet=mat(0x9985bc),petal=mat(0xc8afe1);
 function tree(x,z,s=1){
  cylinder(x,1.32*s,z,.14*s,.23*s,2.64*s,bark);
  for(let i=0;i<5;i++){
   const a=i*2.4+(x+z)*.08,dx=Math.sin(a)*s,dz=Math.cos(a)*s,top=(3.5+.65*Math.sin(i*1.7))*s;
   girder(x,1.65*s,z,x+dx,top,z+dz,.17*s,.17*s,bark);
   const cluster=mesh(crown,i%2?lilac:violet,x+dx,top,z+dz);
   cluster.rotation.y=a;cluster.scale.set(1.45*s,.9*s,1.25*s);
   const bloom=mesh(icoGeo,petal,x+dx*1.2,top+.63*s,z+dz*1.2);
   bloom.rotation.y=a+.45;bloom.scale.set(1.09*s,.62*s,.97*s);
  }
  solid(x,z,.65,.65,3);
 }
 // Central streets retain the familiar routes, with several paths out of the old arena.
 for(const args of [[-20,-30,13,14,10],[20,-32,12,14,13],[-35,-12,12,12,8],[33,-19,12,13,10],[-34,33,12,14,11],[36,36,14,15,8],[-18,56,11,9,7],[20,55,10,10,9],[-45,-45,10,12,13],[43,-46,13,14,10]])house(...args);
 for(const[x,z]of [[-10,31],[10,32],[-10,-10],[10,-18],[-29,8],[29,30],[-29,-25],[29,-32]])tree(x,z,1.15);
 // Western research compound: enterable bays, elevated observation route and a terminal.
 box(-100,.025,-34,79,.04,66,mats.road);shed(-96,-30,28,26,7,'遗传研究所');shed(-128,-39,17,23,5,'隔离样本库');house(-92,-88,22,15,11);house(-125,-75,16,12,8);
 const ramp=box(-77,3.6,-28,4,.24,Math.hypot(22,7.3),mats.metal);ramp.rotation.x=Math.atan2(7.3,22);cameraMeshes.push(ramp);surfaces.push({x:-77,z:-28,w:2,d:11,h:7.3,ramp:true});
 box(-85,7.2,-39,18,.25,3,mats.metal);surfaces.push({x:-85,z:-39,w:9,d:1.5,h:7.32});anchor(-85,7.4,-39);
 box(-87,.8,-9,1.4,1.6,.8,mats.dark);box(-87,1.65,-8.8,1.2,.7,.15,mint);sign('通讯 / UPLINK',-87,2.7,-8.7,4);
 // Northern rail station has long sightlines and platform cover.
 box(0,.04,-111,102,.08,61,mats.road);for(const x of [-24,24]){box(x,.12,-113,7,.25,60,rail);for(const side of [-1,1])box(x+side*2.2,.28,-113,.15,.16,60,mats.dark);for(let z=-143;z<-80;z+=2.5)box(x,.23,z,6,.14,.3,mats.rust);}
 shed(0,-108,25,29,8,'中央换乘大厅');for(const x of [-44,43])house(x,-104,13,23,11);
 // A raised train shed, clock gable and sawtooth ribs frame the north axis.
 for(const side of [-1,1]){
  box(side*6.8,10.2,-108,14.8,.34,32,slate).rotation.z=-side*.25;
  for(let z=-123;z<=-93;z+=6){
   girder(side*13.6,8.35,z,0,11.9,z,.22,.26,mats.metal);
   girder(side*13.6,8.35,z,side*9.6,8.35,z,.16,.22,mats.rust);
   girder(side*9.6,8.35,z,side*7,10,z,.14,.18,mats.rust);
  }
 }
 box(0,11.9,-93.25,4.8,4.6,.7,mats.concrete);
 box(0,14.3,-93.25,5.25,.28,1,mats.metal);
 const dial=cylinder(0,12.1,-92.82,1.65,1.65,.18,slate,objects,24);dial.rotation.x=Math.PI/2;
 const face=cylinder(0,12.1,-92.69,1.44,1.44,.12,cloth,objects,24);face.rotation.x=Math.PI/2;
 for(let n=0;n<12;n++){const a=n*Math.PI/6;box(Math.sin(a)*1.22,12.1+Math.cos(a)*1.22,-92.6,.085,.22,.06,slate).rotation.z=-a;}
 girder(0,12.1,-92.52,-.58,12.53,-92.52,.12,.08,slate);girder(0,12.1,-92.5,.45,13,-92.5,.08,.08,slate);
 for(const z of [-127,-116,-105]){wall(24,2,z,4.8,4,10,mats.lightConcrete);box(24,1,z,4.85,.8,10,mats.rust);for(let a=-3;a<=3;a+=2)box(26.45,2.6,z+a,.06,1.3,1.4,mats.glass);}
 for(const x of [-122,-90,-58,-26,26,58,90,122]){box(x,14,-149,27,.8,5,mats.concrete);box(x,7,-149,1.4,14,2,mats.concrete);for(const z of [-151,-147])box(x,14.8,z,27,.12,.1,mats.metal);}
 // Eastern freight depot: stacked crates, cranes and traversable container tops.
 box(106,.025,-25,85,.05,82,mats.road);shed(105,-51,32,20,8,'晴湾 / 货运 03');
 for(const[x,z,t]of [[83,-24,0],[98,-23,0],[117,-20,1],[137,-17,0],[88,11,1],[110,9,1],[137,10,0],[96,-4,1],[126,-1,1]])container(x,z,!!t);
 container(98,-23,false,3);container(110,9,true,3);
 // Garden district supplies medicine and quiet routes between the west and south exits.
 box(-99,.015,99,91,.035,78,grass);box(-99,.08,99,80,.13,6,mats.road);box(-99,.08,99,6,.13,70,mats.road);
 for(let x=-137;x<=-65;x+=18)for(let z=78;z<=134;z+=28){tree(x,z,1.25);box(x,.15,z,4,.3,4,mats.lightConcrete);}
 const fountain=cylinder(-99,.3,99,6,6,.6,mats.lightConcrete,objects,32);cylinder(-99,.65,99,4.9,4.9,.12,water,objects,32);cylinder(-99,2,99,.45,.7,2.8,mats.metal);solid(-99,99,11,11,.7);
 shed(-123,59,16,14,5,'野外医疗站');house(-83,121,12,12,8);house(-133,122,10,12,7);
 for(const x of [-125,-73]){box(x,.6,99,3,1.2,.7,mats.metal);solid(x,99,3,.7,1.2);}
 // Harbour apron, warehouses, gantry cranes and a quay with a visible ferry.
 box(87,.03,113,113,.06,76,mats.road);shed(99,91,31,19,8,'晴湾港 · 海运仓储');shed(42,105,19,23,6,'航运物资库');
 for(const[x,z]of [[76,93],[126,107],[119,126],[47,131],[100,119]])container(x,z,true);
 for(const[x,z]of [[132,77],[128,142],[34,143]]){for(const side of [-1,1])box(x+side*5,8,z,.8,16,.8,mats.rust);box(x,16,z,14,.8,1,mats.rust);box(x+5,17,z,23,.55,.55,mats.rust);cylinder(x+13,12,z,.035,.035,10,mats.dark);box(x+13,6.4,z,2.4,1.1,2,mats.metal);}
 box(86,-.15,164,8,2.2,20,mats.dark);box(86,1.25,162,6,1.2,10,mats.lightConcrete);box(86,2.5,166,4,1.6,4,mats.metal);box(86,3.5,166,4.3,.25,4.3,mats.rust);
 for(const [x,z] of [[132,77],[128,142],[34,143]]){
  for(const side of [-1,1]){
   box(x+side*5,8,z+3,.65,16,.65,mats.rust);
   for(let y=1;y<15;y+=4)girder(x+side*5,y,z,x+side*5,y+3.6,z+3,.22,.24,slate);
   girder(x+side*5,15.8,z,x+side*2,19.3,z+1.5,.36,.36,mats.rust);
  }
  box(x+4.8,19.3,z+1.5,23,.28,.38,mats.rust);
  for(let i=-6;i<15;i+=3)girder(x+i,17,z,x+i+2.8,19.3,z+1.5,.19,.23,slate);
  box(x-3,16.8,z+2.1,3.2,2.6,2.2,cloth);box(x-3,17.1,z+3.22,2.8,1.4,.06,mats.glass);
 }
 for(const z of [-70,0,70])for(const x of [-65,0,65]){
  for(const side of [-1,1])for(let i=-4;i<=4;i++){
   box(x+i*1.15,.056,z+side*9,.55,.02,2.7,mats.line);
   box(x+side*9,.056,z+i*1.15,2.7,.02,.55,mats.line);
  }
 }
 // Street-scale details make navigation readable without filling traversal lanes.
 for(const[x,z]of [[-53,18],[-41,61],[40,72],[52,-16],[-62,-77],[63,-77],[-137,16],[13,119],[69,120],[-42,102]]){wall(x,.65,z,3.2,1.3,1,mats.concrete);for(let a=-1;a<=1;a++)box(x+a,.65,z+.52,.2,1,.03,mats.rust).rotation.z=-.4;}
 for(const[x,z]of [[-47,40],[46,20],[-105,28],[116,40],[-45,-72],[48,-132]]){wall(x,.6,z,2,1.2,4,mats.rust);box(x,1.3,z-.2,1.8,.8,1.9,mats.lightConcrete);box(x,1.35,z+.8,1.45,.5,.03,mats.glass);for(const a of [-1,1])for(const b of [-1,1]){const tire=cylinder(x+a,.35,z+b*1.2,.4,.4,.25,mats.black);tire.rotation.z=Math.PI/2;}}
 for(const x of [-7.4,7.4])for(let z=-130;z<146;z+=30){cylinder(x,3,z,.07,.1,6,mats.dark);box(x,6,z,1.5,.14,.3,mats.line);}
 for(let i=0;i<100;i++){const x=rand(-148,148),z=rand(-148,148);if(Math.abs(x)<10||Math.abs(z)<10||Math.abs(z-70)<10||Math.abs(z+70)<10)continue;const p=rock(x,.12,z,rand(.2,.5),i%3?mats.lavender:mats.leaf);p.scale.y=.2;}
 for(let i=0;i<17;i++){rock(-245+i*30,7,270+rand(-12,12),rand(16,27),mats.leaf);}
 const cloud=new THREE.MeshBasicMaterial({color:0xf8f4fa,fog:false});
 for(let i=0;i<16;i++){const a=i*2.4,height=68+Math.sin(i)*18;for(let k=0;k<4;k++){const m=mesh(icoGeo,cloud,Math.sin(a)*310+k*8,height+Math.sin(k)*3,Math.cos(a)*310);m.rotation.y=i+k;m.scale.set(10,6+k%2*3,7);m.castShadow=false;}}
 const beams=[];
 for(const e of EXIT_DEFS){const color=new THREE.Color(e.color),emissive=mat(color,{emissive:color,emissiveIntensity:1.4});cylinder(e.x,.12,e.z,3.5,3.5,.24,mats.dark,objects,32);const torus=mesh(new THREE.TorusGeometry(3.25,.09,6,48),emissive,e.x,.29,e.z);torus.rotation.x=Math.PI/2;
  for(const a of [-1,1]){box(e.x+a*3.6,1.3,e.z,.32,2.6,.32,mats.lightConcrete);box(e.x+a*3.6,2.65,e.z,.5,.16,.5,emissive);}const beam=mesh(new THREE.CylinderGeometry(.6,3.2,24,20,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.09,depthWrite:false,side:THREE.DoubleSide}),e.x,12,e.z);beam.castShadow=false;beams.push(beam);sign(e.code+' / '+e.name,e.x,3.9,e.z-3.7,7,e.brief);}
 const ashGeo=new THREE.BufferGeometry(),positions=new Float32Array(160*3);for(let i=0;i<160;i++){positions[i*3]=rand(-28,28);positions[i*3+1]=rand(1,15);positions[i*3+2]=rand(-28,28);}ashGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));const ash=new THREE.Points(ashGeo,new THREE.PointsMaterial({color:0xffefd1,size:.055,transparent:true,opacity:.45,depthWrite:false}));scene.add(ash);
 return{ash,beam:beams[0],beams};
}
function batchStaticWorld(){
 scene.updateMatrixWorld(true);const batches=new Map();let original=0;
 objects.traverse(node=>{if(!node.isMesh||Array.isArray(node.material)||node.material.transparent)return;original++;const key=node.geometry.uuid+'/'+node.material.uuid+'/'+node.castShadow;let list=batches.get(key);if(!list)batches.set(key,list=[]);list.push(node);});
 let merged=0,draws=0;
 for(const list of batches.values()){if(list.length<3)continue;const first=list[0],batch=new THREE.InstancedMesh(first.geometry,first.material,list.length);batch.castShadow=first.castShadow;batch.receiveShadow=true;for(let i=0;i<list.length;i++)batch.setMatrixAt(i,list[i].matrixWorld);batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();scene.add(batch);for(const node of list)node.removeFromParent();merged+=list.length;draws++;}
 canvas.dataset.staticMeshes=String(original);canvas.dataset.staticDraws=String(original-merged+draws);
}
