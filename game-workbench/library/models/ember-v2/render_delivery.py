import bpy
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;LIB=HERE.parent.parent;OUT=LIB/'previews'/'ember-v2'
s=bpy.context.scene;rig=bpy.data.objects['EMBER_RIG'];camera=s.camera
idle=bpy.data.actions['EMBER_Idle_Loop'];rig.animation_data.action=idle;rig.animation_data.action_slot=idle.slots[0];s.frame_set(1)
def render(name,pos,target,scale,w,h,samples=40):
    camera.location=pos;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=scale
    s.render.resolution_x=w;s.render.resolution_y=h;s.render.resolution_percentage=100;s.cycles.samples=samples;s.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
render('01_hero',(-3,-6,2.5),(0,0,1),2.5,1400,1600)
render('02_face',(-2,-6,2.15),(0,-.02,1.75),.65,1200,1200,64)
render('03_front',(0,-6,1.1),(0,0,.98),2.25,1000,1200)
render('04_side',(-6,0,1.3),(0,0,1),2.25,1000,1200)
render('05_back',(0,6,1.3),(0,0,1),2.25,1000,1200)
test=bpy.data.actions['EMBER_Joint_Range_Test'];rig.animation_data.action=test;rig.animation_data.action_slot=test.slots[0];s.frame_set(31)
render('06_joint_test',(-3,-6,2.5),(0,0,1),2.65,1100,1300)
rig.animation_data.action=idle;rig.animation_data.action_slot=idle.slots[0];s.frame_set(1)

# Compare actual V1 and V2 meshes under the same camera and studio lighting.
source=LIB/'models'/'ember-v1'/'EMBER_v1.blend'
with bpy.data.libraries.load(str(source),link=False) as (a,b):
    b.objects=[n for n in a.objects if n.startswith('EMBER_')];b.actions=['EMBER_Idle_Loop']
for o in b.objects:s.collection.objects.link(o)
oldrig=next(o for o in b.objects if o.type=='ARMATURE')
oldaction=b.actions[0]
oldrig.animation_data.action=oldaction;oldrig.animation_data.action_slot=oldaction.slots[0]
oldrig.location.x=-.65;rig.location.x=.65
bpy.data.objects['Studio_Plinth'].hide_render=True
s.frame_set(1)
render('07_before_after',(0,-7,2.7),(0,0,1),3.35,1800,1300,48)
print('DELIVERY_RENDERS_COMPLETE',flush=True)
