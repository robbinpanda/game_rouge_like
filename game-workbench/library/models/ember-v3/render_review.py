import bpy
from mathutils import Vector
from pathlib import Path
OUT=Path(__file__).resolve().parent/'review'
OUT.mkdir(exist_ok=True)
s=bpy.context.scene;rig=bpy.data.objects['EMBER_RIG'];camera=s.camera
idle=bpy.data.actions['EMBER_Idle_Loop'];rig.animation_data.action=idle;rig.animation_data.action_slot=idle.slots[0];s.frame_set(1)
s.cycles.samples=16
def render(name,pos,target,scale,w=900,h=900):
    camera.location=pos;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=scale
    s.render.resolution_x=w;s.render.resolution_y=h;s.render.resolution_percentage=100
    s.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
render('face',(0,-6,1.76),(0,-.02,1.77),.54)
render('three_quarter',(-3,-6,1.95),(0,-.02,1.77),.54)
render('side',(-6,-.6,1.9),(0,0,1.76),.54)
print('REVIEW_COMPLETE')
