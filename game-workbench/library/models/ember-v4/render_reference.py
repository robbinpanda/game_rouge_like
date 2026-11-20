"""Show the provided original portrait next to the actual R4 mesh, with clear labels."""
import bpy,math
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;LIB=HERE.parent.parent;ROOT=LIB.parent.parent
s=bpy.context.scene;rig=bpy.data.objects['EMBER_RIG'];cam=s.camera
a=bpy.data.actions['EMBER_Idle_Loop'];rig.animation_data.action=a;rig.animation_data.action_slot=a.slots[0];s.frame_set(1)
rig.location.x=.68;rig.rotation_euler.z=math.radians(12)
bpy.data.objects['Studio_Plinth'].hide_render=True;bpy.data.objects['Studio_Floor'].location.z=0
w=1.32;h=1.98;cx=-.77;bottom=.015
me=bpy.data.meshes.new('Reference art panel');me.from_pydata([(cx-w/2,.35,bottom),(cx+w/2,.35,bottom),(cx+w/2,.35,bottom+h),(cx-w/2,.35,bottom+h)],[],[(0,1,2,3)])
uv=me.uv_layers.new()
for l,co in zip(uv.data,[(0,0),(1,0),(1,1),(0,1)]):l.uv=co
o=bpy.data.objects.new('REFERENCE / original illustration, not model',me);s.collection.objects.link(o);o.visible_shadow=False
m=bpy.data.materials.new('Reference art / unchanged colors');m.use_nodes=True;nt=m.node_tree;nt.nodes.clear()
tex=nt.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(ROOT/'output'/'aberrant-character-kit-v3'/'烬刃'/'03_独立立绘.png'),check_existing=True)
em=nt.nodes.new('ShaderNodeEmission');out=nt.nodes.new('ShaderNodeOutputMaterial');nt.links.new(tex.outputs['Color'],em.inputs['Color']);nt.links.new(em.outputs[0],out.inputs['Surface']);me.materials.append(m)
textmat=bpy.data.materials.new('Reference sheet / captions');textmat.use_nodes=True
bs=textmat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(0,0,0,1);bs.inputs['Emission Color'].default_value=(.8,.8,.8,1);bs.inputs['Emission Strength'].default_value=1
for x,text in [(-.77,'ORIGINAL ART'),(.68,'MODEL  /  R4')]:
    d=bpy.data.curves.new(text,'FONT');d.body=text;d.align_x='CENTER';d.size=.036
    ob=bpy.data.objects.new(text,d);s.collection.objects.link(ob);ob.location=(x,-.75,2.13);ob.rotation_euler=(math.pi/2,0,0);d.materials.append(textmat)
cam.location=(0,-7,1.02);cam.rotation_euler=(Vector((0,0,1.02))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=3.20
s.render.resolution_x=1900;s.render.resolution_y=1500;s.render.resolution_percentage=100;s.cycles.samples=40
s.render.filepath=str(LIB/'previews'/'ember-v4'/'09_original_art_and_model.png');bpy.ops.render.render(write_still=True)
print('REFERENCE_COMPARISON_COMPLETE',flush=True)
