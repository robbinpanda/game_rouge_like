import bpy,json
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;LIB=HERE.parent.parent
rig=bpy.data.objects['EMBER_RIG'];meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.parent==rig]
exec((HERE/'portable_cel.py').read_text(encoding='utf8'))
saved_materials=prepare_portable_cel()
bpy.ops.object.select_all(action='DESELECT')
for o in meshes+[rig]:o.select_set(True)
bpy.context.view_layer.objects.active=rig
target=LIB/'exports'/'EMBER_v3.glb'
bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_anim_single_armature=True,export_force_sampling=True,export_skins=True,export_yup=True,export_extras=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
finalize_unlit_glb(target)
audit=json.loads((HERE/'model_audit.json').read_text(encoding='utf8'));audit['glb_bytes']=target.stat().st_size
(HERE/'model_audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf8')
print('CEL_REEXPORTED',target.stat().st_size,flush=True)
