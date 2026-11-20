import * as THREE from 'three';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';

export async function mount(el,url){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#e8ece3');
 const camera=new THREE.PerspectiveCamera(40,1,.01,10000),renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;el.appendChild(renderer.domElement);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
 scene.add(new THREE.HemisphereLight(0xffffff,0x64745a,2.8));const light=new THREE.DirectionalLight(0xfff5e5,3);light.position.set(4,8,5);scene.add(light);
 const loader=new GLTFLoader();let model,mixer,skeleton,frame,disposed=false;
 const resize=()=>{if(!el.isConnected)return;const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(el);resize();
 const cleanup=()=>{if(disposed)return;disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();mixer?.stopAllAction();scene.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}});renderer.dispose();};
 const removal=new MutationObserver(()=>{if(!el.isConnected){cleanup();removal.disconnect();}});removal.observe(document.body,{childList:true,subtree:true});
 try{
   // Self-contained GLB only. External references stay in Blender, avoiding hidden URL loads.
   const array=await fetch(url).then(r=>{if(!r.ok)throw new Error('模型读取失败');return r.arrayBuffer();});
   const view=new DataView(array);if(array.byteLength<20||view.getUint32(0,true)!==0x46546c67)throw new Error('文件不是有效 GLB');
   const jsonLength=view.getUint32(12,true);const metadata=JSON.parse(new TextDecoder().decode(new Uint8Array(array,20,jsonLength)).trim());
   if([...(metadata.images||[]),...(metadata.buffers||[])].some(x=>x.uri&&!x.uri.startsWith('data:')))throw new Error('此 GLB 包含外部资源，请在 Blender 打包为单文件 GLB 后预览');
   if(metadata.extensionsRequired?.some(x=>['KHR_draco_mesh_compression','EXT_meshopt_compression','KHR_texture_basisu'].includes(x)))throw new Error('该模型使用压缩扩展，请导出未压缩 GLB 进行预览');
   const gltf=await loader.parseAsync(array,'');if(disposed){gltf.scene.traverse(o=>o.geometry?.dispose());return cleanup;}
   model=gltf.scene;scene.add(model);
   const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()).length()||2,center=box.getCenter(new THREE.Vector3());controls.target.copy(center);camera.position.copy(center).add(new THREE.Vector3(size*.8,size*.45,size*1.1));camera.near=size/1000;camera.far=size*100;camera.updateProjectionMatrix();
   skeleton=new THREE.SkeletonHelper(model);skeleton.visible=false;scene.add(skeleton);
   mixer=new THREE.AnimationMixer(model);
   const bar=document.createElement('div');bar.className='model-controls';
   const select=document.createElement('select');select.setAttribute('aria-label','动画片段');select.append(new Option('静止 / Rest pose',''));gltf.animations.forEach((a,i)=>select.append(new Option(a.name||`动作 ${i+1}`,String(i))));
   select.onchange=()=>{mixer.stopAllAction();if(select.value!=='')mixer.clipAction(gltf.animations[Number(select.value)]).reset().play();};bar.append(select);
   for(const [label,action] of [['骨架',()=>skeleton.visible=!skeleton.visible],['线框',()=>model.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])m.wireframe=!m.wireframe;})]]){const b=document.createElement('button');b.type='button';b.className='button small';b.textContent=label;b.onclick=action;bar.append(b);}
   el.append(bar);el.querySelector('.model-message').textContent=`鼠标拖动旋转 · 滚轮缩放 · ${gltf.animations.length} 个动作片段`;
   const clock=new THREE.Clock();function render(){if(disposed)return;mixer.update(Math.min(clock.getDelta(),.1));controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(render);}render();
 }catch(err){cleanup();el.querySelector('.model-message').textContent='预览提示：'+err.message;}
 return ()=>{cleanup();removal.disconnect();};
}
