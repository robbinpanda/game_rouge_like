import bpy,sys
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;OUT=HERE.parent.parent/'previews'/'ember-v2'
s=bpy.context.scene;r=bpy.data.objects['EMBER_RIG'];a=bpy.data.actions['EMBER_Idle_Loop'];r.animation_data.action=a;r.animation_data.action_slot=a.slots[0];s.frame_set(1)
def render(name,pos,target,scale,w=1100,h=1100):
    c=s.camera;c.location=pos;c.rotation_euler=(Vector(target)-c.location).to_track_quat('-Z','Y').to_euler();c.data.ortho_scale=scale
    s.render.resolution_x=w;s.render.resolution_y=h;s.render.resolution_percentage=100;s.cycles.samples=32
    s.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
render('face_draft',(-2,-6,2.2),(0,-.02,1.77),.65,1100,1100)
render('draft',(-3,-6,2.5),(0,0,1),2.55,1300,1500)
