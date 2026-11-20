"""Read back the delivered GLB in a fresh Blender process; never edits the source."""
import bpy, json, math, struct, hashlib
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent
target=HERE.parent.parent/'exports'/'EMBER_v3.glb'
blob=target.read_bytes();magic,version,total=struct.unpack_from('<III',blob)
assert magic==0x46546C67 and version==2 and total==len(blob)
length,chunk=struct.unpack_from('<II',blob,12)
g=json.loads(blob[20:20+length])
assert not any(x.get('uri') for x in g.get('buffers',[])+g.get('images',[]))
expected={'EMBER_Idle_Loop','EMBER_Walk_Test_InPlace','EMBER_Joint_Range_Test'}
assert {a['name'] for a in g['animations']}==expected
assert all('JOINTS_0' in p['attributes'] and 'WEIGHTS_0' in p['attributes'] for m in g['meshes'] for p in m['primitives'])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps=30
bpy.ops.import_scene.gltf(filepath=str(target))
rigs=[o for o in bpy.context.scene.objects if o.type=='ARMATURE'];assert len(rigs)==1
rig=rigs[0];meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' and m.object==rig for m in o.modifiers)]
assert len(meshes)==11
for t in rig.animation_data.nla_tracks:t.mute=True
report={'file':str(target),'sha256':hashlib.sha256(blob).hexdigest(),'self_contained':True,'meshes':len(meshes),'bones':len(rig.data.bones),'clips':[]}
for a in bpy.data.actions:
    rig.animation_data.action=a
    if a.slots:rig.animation_data.action_slot=a.slots[0]
    states=[]
    for t in [0,.25,.5,.75,1]:
        f=a.frame_range[0]+t*(a.frame_range[1]-a.frame_range[0])
        bpy.context.scene.frame_set(round(f));graph=bpy.context.evaluated_depsgraph_get()
        vertices=[]
        for o in meshes:
            evaluated=o.evaluated_get(graph);m=evaluated.to_mesh()
            vertices.extend(evaluated.matrix_world@v.co for v in m.vertices);evaluated.to_mesh_clear()
        assert all(math.isfinite(x) for v in vertices for x in v)
        low=[min(v[i] for v in vertices) for i in range(3)]
        high=[max(v[i] for v in vertices) for i in range(3)]
        assert max(high[i]-low[i] for i in range(3))<2.5
        states.append({'frame':f,'min':low,'max':high})
    report['clips'].append({'name':a.name,'samples':states})
report['passed']=True
(HERE/'export_verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print('GLB_ROUNDTRIP_OK',json.dumps(report,ensure_ascii=False),flush=True)


