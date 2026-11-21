const vistaEye=new THREE.Vector3(2,22,46),vistaFocus=new THREE.Vector3(0,5,-76);
function sanctuaryVistaFov(aspect=camera.aspect){
 return clamp(THREE.MathUtils.radToDeg(2*Math.atan(.87/aspect)),48,75);
}
// Matte projection for the coastal city, authored against the 16:9 overlook.
// The depth capture prevents details on the train, crane or courtyard arch
// from being painted a second time on surfaces behind them during the flyover.
function paintSanctuaryVista(city){
 if(typeof Image==='undefined')return;
 const view=new THREE.PerspectiveCamera(sanctuaryVistaFov(16/9),16/9,2,420);
 view.position.copy(vistaEye);view.lookAt(vistaFocus);view.updateMatrixWorld();
 const projection=new THREE.Matrix4().multiplyMatrices(view.projectionMatrix,view.matrixWorldInverse);
 const depth=new THREE.WebGLRenderTarget(1024,576);
 depth.depthTexture=new THREE.DepthTexture(1024,576,THREE.UnsignedShortType);
 const depthScene=new THREE.Scene();
 const opaque=new THREE.MeshBasicMaterial({side:THREE.DoubleSide,colorWrite:false});
 depthScene.overrideMaterial=opaque;
 for(const batch of city.children)depthScene.add(new THREE.Mesh(batch.geometry,opaque));
 function captureDepth(){
  const previous=renderer.getRenderTarget();
  renderer.setRenderTarget(depth);
  renderer.clear();
  renderer.render(depthScene,view);
  renderer.setRenderTarget(previous);
 }
 captureDepth();
 renderer.domElement.addEventListener('webglcontextrestored',()=>requestAnimationFrame(captureDepth));
 const strength={value:0};
 const paint=new THREE.TextureLoader().load(assetURL('echo-sanctuary-city-paint.webp'),()=>{strength.value=.94;});
 paint.colorSpace=THREE.SRGBColorSpace;
 paint.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 for(const batch of city.children){
  batch.material.onBeforeCompile=shader=>{
   shader.uniforms.vistaProjection={value:projection};
   shader.uniforms.vistaDepth={value:depth.depthTexture};
   shader.uniforms.vistaPaint={value:paint};
   shader.uniforms.vistaStrength=strength;
   shader.uniforms.vistaEye={value:view.position};
   shader.vertexShader='uniform mat4 vistaProjection; varying vec4 vistaClip; varying vec3 vistaWorld;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
    #include <project_vertex>
    vistaWorld=(modelMatrix*vec4(transformed,1.)).xyz;
    vistaClip=vistaProjection*vec4(vistaWorld,1.);
   `);
   shader.fragmentShader='uniform sampler2D vistaDepth,vistaPaint; uniform float vistaStrength; uniform vec3 vistaEye; varying vec4 vistaClip; varying vec3 vistaWorld;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <colorspace_fragment>',`
    vec2 vistaUv=vistaClip.xy/vistaClip.w*.5+.5;
    float inside=min(min(vistaUv.x,1.-vistaUv.x),min(vistaUv.y,1.-vistaUv.y));
    float coverage=smoothstep(.0,.025,inside)*(1.-smoothstep(1.,8.,vistaWorld.z));
    if(coverage>0. && vistaClip.w>0.){
     float raw=texture2D(vistaDepth,vistaUv).r;
     float surfaceDepth=840./(420.-raw*418.);
     float visible=1.-smoothstep(.45,1.35,vistaClip.w-surfaceDepth);
     vec3 originalRay=normalize(vistaEye-vistaWorld);
     vec3 currentRay=normalize(cameraPosition-vistaWorld);
     float angleWeight=smoothstep(.83,.985,dot(originalRay,currentRay));
     vec2 paintUv=vistaUv*vec2(.974,.966)+vec2(-.001,.038);
     vec3 pigment=texture2D(vistaPaint,paintUv).rgb;
     gl_FragColor.rgb=mix(gl_FragColor.rgb,pigment,vistaStrength*coverage*visible*angleWeight);
    }
    #include <colorspace_fragment>
   `);
  };
  batch.material.needsUpdate=true;
 }
}
