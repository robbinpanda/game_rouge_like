"""Render the actual imported GLB, without replacing its exported materials."""
import bpy,json,struct
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;LIB=HERE.parent.parent
target=LIB/'exports'/'EMBER_v3.glb';b=target.read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n])
assert all('COLOR_0' in p['attributes'] for m in g['meshes'] for p in m['primitives'])
assert all('KHR_materials_unlit' in m.get('extensions',{}) for m in g['materials'])
s=bpy.context.scene
before=set(s.objects)
for o in before:
    if o.name.startswith('EMBER_'):o.hide_render=True
bpy.ops.import_scene.gltf(filepath=str(target))
new=set(s.objects)-before
for o in new:
    if o.type=='MESH' and o.data.color_attributes:
        colors=[tuple(v.color[:3]) for v in o.data.color_attributes[0].data]
        assert min(min(c) for c in colors)<.8,'Exported color attribute unexpectedly white'
    if o.type=='ARMATURE':
        for t in o.animation_data.nla_tracks:t.mute=True
        o.animation_data.action=None
s.frame_set(1)
camera=s.camera;camera.location=(-2,-6,1.94);camera.rotation_euler=(Vector((0,-.02,1.75))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=.53
s.render.resolution_x=1100;s.render.resolution_y=1100;s.render.resolution_percentage=100;s.cycles.samples=32
s.render.filepath=str(LIB/'previews'/'ember-v3'/'08_actual_glb.png');bpy.ops.render.render(write_still=True)
print('EXPORTED_CEL_COLOR_AND_UNLIT_VERIFIED',flush=True)
