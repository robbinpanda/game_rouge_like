import bpy
from mathutils import Vector
from pathlib import Path
OUT=Path(__file__).resolve().parent/'review';OUT.mkdir(exist_ok=True)
s=bpy.context.scene;rig=bpy.data.objects['EMBER_RIG'];camera=s.camera
idle=bpy.data.actions['EMBER_Idle_Loop'];rig.animation_data.action=idle;rig.animation_data.action_slot=idle.slots[0];s.frame_set(1)
def render(name,pos,target,scale,w=950,h=950):
    camera.location=pos;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=scale
    s.render.resolution_x=w;s.render.resolution_y=h;s.render.resolution_percentage=100;s.cycles.samples=20
    s.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
render('face',(-2,-6,1.93),(0,-.02,1.75),.52)
render('side',(-6,-.2,1.84),(0,0,1.75),.52)
render('body',(-2,-6,2.3),(0,0,1),2.36,900,1150)
print('REVIEW_COMPLETE',flush=True)
