import bpy,math
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;LIB=HERE.parent.parent;OUT=LIB/'previews'/'ember-v4';OUT.mkdir(exist_ok=True)
s=bpy.context.scene;rig=bpy.data.objects['EMBER_RIG'];camera=s.camera
idle=bpy.data.actions['EMBER_Idle_Loop'];rig.animation_data.action=idle;rig.animation_data.action_slot=idle.slots[0];s.frame_set(1)
def render(name,pos,target,scale,w,h,samples=32):
    camera.location=pos;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=scale
    s.render.resolution_x=w;s.render.resolution_y=h;s.render.resolution_percentage=100;s.cycles.samples=samples
    s.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
render('01_hero',(-2,-6,2.25),(0,0,1),2.4,1300,1500)
render('02_face',(-2,-6,1.94),(0,-.02,1.75),.53,1200,1200,48)
render('03_face_front',(0,-6,1.76),(0,-.02,1.75),.53,1000,1000)
render('04_face_profile',(-6,-.15,1.80),(0,0,1.75),.53,1000,1000)
render('05_back',(0,6,1.4),(0,0,1),2.22,900,1100)
test=bpy.data.actions['EMBER_Joint_Range_Test'];rig.animation_data.action=test;rig.animation_data.action_slot=test.slots[0];s.frame_set(31)
render('06_joint_test',(-2,-6,2.25),(0,0,1),2.5,1000,1200)
rig.animation_data.action=idle;rig.animation_data.action_slot=idle.slots[0];s.frame_set(1)

# One true 3D render with three duplicated and rotated character assemblies.
originals=[o for o in s.objects if o.type=='MESH' and o.parent==rig]
rig.location.x=-.40
for x,angle in [(0,30),(.40,80)]:
    rr=rig.copy();rr.data=rig.data.copy();s.collection.objects.link(rr)
    rr.location.x=x;rr.rotation_euler.z=math.radians(angle)
    for ob in originals:
        oo=ob.copy();s.collection.objects.link(oo);oo.parent=rr
        for mod in oo.modifiers:
            if mod.type=='ARMATURE':mod.object=rr
textmat=bpy.data.materials.new('Sheet / labels');textmat.use_nodes=True
bs=textmat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.45,.5,.53,1);bs.inputs['Emission Color'].default_value=(.45,.5,.53,1);bs.inputs['Emission Strength'].default_value=1
for x,caption in [(-.40,'FRONT'),(0,'THREE QUARTER'),(.40,'PROFILE')]:
    d=bpy.data.curves.new(caption,'FONT');d.body=caption;d.align_x='CENTER';d.size=.018;d.space_character=1.2
    o=bpy.data.objects.new(caption,d);s.collection.objects.link(o);o.location=(x,-.70,1.439);o.rotation_euler=(math.pi/2,0,0);d.materials.append(textmat)
render('07_head_turnaround',(0,-7,1.75),(0,0,1.75),1.36,2100,1000,48)
print('V3_DELIVERY_RENDERS_COMPLETE',flush=True)

