/* Qingwan's broken viaduct and transit stop follow the project's sunny
   old-town concept. Dark glass reads as one band at combat distance. */
function dressCheckpoint(){
 const cream=mat(0xf4dfc9),coral=mat(0xf07b61),teal=mat(0x60bcb2),slate=mat(0x394d69);
 const glass=mat(0x627d9d,{roughness:.72}),leaf=mat(0x94ae66),shadowLeaf=mat(0x677e58);
 const twig=meshLeafSprig();
 function sprig(x,y,z,s,angle,material=leaf){
  const m=mesh(twig,material,x,y,z);m.scale.setScalar(s);m.rotation.y=angle;return m;
 }
 // Frame the courtyard with a break in the skyline. The jagged ends and short
 // lengths of exposed rail are the only concentrated damage on the pale deck.
 const span=new THREE.Group();span.position.set(0,0,-6);span.rotation.y=-.16;objects.add(span);
 const unit=(x,y,z,w,h,d,m)=>box(x,y,z,w,h,d,m,span);
 for(const [start,end] of [[-63,-2.9],[5.4,65]]){
  const x=(start+end)/2,w=end-start;
  unit(x,12.65,0,w,1.0,3.2,cream);unit(x,12.61,1.62,w,.46,.08,coral);
  for(const side of [-1,1])unit(x,13.24,side*.83,w,.13,.14,slate);
 }
 for(const side of [-1,1]){
  const lip=side<0?-2.9:5.4;
  for(let j=0;j<4;j++){
   const chip=unit(lip-side*.12,12.65-j*.14,-1+j*.69,.66,.72,.66,cream);chip.rotation.z=side*(.26+.11*j);
  }
  for(const z of [-.83,.83]){const rail=unit(lip-side*.52,13.15,z,1.3,.09,.11,slate);rail.rotation.z=side*.15;}
 }
 for(const x of [-47,-22,19,46]){
  unit(x,5.5,0,.92,11,1.7,cream);
  for(const side of [-1,1]){
   const fork=unit(x+side*.78,11.05,0,.63,2.83,1.5,cream);fork.rotation.z=-side*.61;
  }
  const world=new THREE.Vector3(x,0,0);span.localToWorld(world);solid(world.x,world.z,1.05,1.85,10.7);
 }
 // Rounded carriage roof and continuous blue glazing. The camera sees the
 // high line above the square and the running route clearly underneath it.
 for(const x of [-35.4,-26.5,-17.6,33.4,42.3]){
  unit(x,14.29,0,8.5,1.74,2.35,cream);
  unit(x,13.68,1.19,8.49,.38,.04,coral);
  unit(x,15.2,0,8.32,.18,2.14,teal);
  for(let j=0;j<5;j++)for(const side of [-1,1])unit(x-3.25+j*1.61,14.63,1.185*side,1.34,.68,.07,glass);
  for(const offset of [-2.52,2.52])unit(x+offset,13.39,0,1.4,.28,1.5,slate);
 }
 // Broad architectural colour blocks on the first enterable depot.
 for(const x of [-22.65,-11.4]){
  box(x,2.36,19.42,.65,4.74,.44,coral);box(x,4.86,19.4,.9,.23,.63,cream);
 }
 box(-17,4.33,19.51,11.5,.44,.42,teal);
 for(const x of [-20.2,-13.7])box(x,3.75,19.48,2.95,.56,.17,glass);
 for(const x of [-22.4,-20.2,-13.3])for(let i=0;i<4;i++)sprig(x+.08*Math.sin(i),4.65-i*.26,19.67,.34-i*.038,i*1.9);
 // The transit roundel is a local wayfinding graphic.
 const pole=box(-6.96,2.33,27,.19,4.66,.18,slate);cameraMeshes.push(pole);solid(-6.96,27,.22,.22,4.66);
 const c=document.createElement('canvas');c.width=c.height=256;const p=c.getContext('2d');
 p.fillStyle='#ef7158';p.beginPath();p.arc(128,128,124,0,Math.PI*2);p.fill();
 p.lineWidth=12;p.strokeStyle='#fff1dc';p.beginPath();p.arc(128,128,101,0,Math.PI*2);p.stroke();
 p.fillStyle='#fff1dc';p.fillRect(75,78,106,80);p.fillRect(85,157,16,18);p.fillRect(154,157,16,18);
 p.fillStyle='#4a6c7b';p.fillRect(86,89,84,34);p.fillRect(88,136,14,10);p.fillRect(153,136,14,10);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 const disc=cylinder(-6.96,4.55,27,.74,.74,.14,cream,objects,28);disc.rotation.x=Math.PI/2;
 mesh(new THREE.PlaneGeometry(1.42,1.42),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}),-6.96,4.55,27.085).castShadow=false;
 // A handful of succulent clumps and lavender spikes cluster at edges only.
 for(const [cx,cz] of [[-6.9,27],[8.3,34],[-22,20],[10,31],[-10,31],[-23,4],[28,8],[20,-13],[-39,-10],[31,45],[-17,54]]){
  for(let i=0;i<6;i++){const a=i*2.39;sprig(cx+Math.cos(a)*.6,.03,cz+Math.sin(a)*.48,.48+(i%3)*.15,a,i%3?leaf:shadowLeaf);}
 }
 const skyline=[mat(0xb0a9d2),mat(0x9e9bc4),mat(0xbac0db)];
 for(let i=0;i<23;i++){
  const x=-165+i*15,h=12+(1+Math.sin(i*1.71))*(8+10*Math.cos(i*.4)**2);
  box(x,h*.5,-186-i%3*8,5+i%4*1.6,h,6+i%4,skyline[i%3]).castShadow=false;
  if(i%3===0)box(x+.65,h+1.3,-186-i%3*8,3.5,2.6,4,skyline[i%3]).castShadow=false;
 }
}
function meshLeafSprig(){
 const positions=[];
 for(let j=0;j<6;j++){
  const a=j*2.4,x=Math.cos(a),z=Math.sin(a),h=.58+.17*(j%3);
  const root=[0,0,0],tip=[x*.67,h,z*.67],mid=[x*.30,h*.66,z*.30];
  const l=[mid[0]-z*.13,mid[1],mid[2]+x*.13],r=[mid[0]+z*.13,mid[1],mid[2]-x*.13];
  positions.push(...root,...r,...tip,...tip,...l,...root,...root,...l,...tip,...tip,...r,...root);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();return g;
}
function plazaPaving(){
 // Long, widely spaced joints show scale without filling the fighting lane.
 const sand=mat(0xc4aea6),trim=mat(0xe7b6a7);
 for(let z=-46;z<62;z+=4.3){
  const seam=box(0,.042,z,11.85,.009,.022,sand);seam.castShadow=false;
  const row=Math.round((z+46)/4.3);
  for(let x=-4.4+(row%2)*1.65;x<5.5;x+=3.5){
   const joint=box(x,.044,z+2.13,.02,.008,4.18,sand);joint.castShadow=false;
  }
 }
 for(const x of [-5.72,5.72]){
  const strip=box(x,.045,8,.08,.009,108,trim);strip.castShadow=false;
 }
}
let contactGeo,contactMaterial;
function contactShadow(avatar){
 if(!contactGeo){
  contactGeo=new THREE.PlaneGeometry(1,1);
  contactMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
  vertexShader:'varying vec2 v;void main(){v=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec2 v;void main(){float r=dot(v,v);gl_FragColor=vec4(.23,.20,.35,.28*(1.-smoothstep(.05,.98,r)));}'});
 }
 const shadow=new THREE.Mesh(contactGeo,contactMaterial);shadow.rotation.x=-Math.PI/2;shadow.renderOrder=1;
 shadow.position.y=.075;shadow.scale.set(1.34,.83,1);avatar.group.add(shadow);avatar.contactShadow=shadow;
}
