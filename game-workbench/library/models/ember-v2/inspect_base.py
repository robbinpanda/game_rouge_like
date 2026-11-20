import bpy,json
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent
base=next((HERE.parent.parent/'references'/'human-base'/'bundle').rglob('*.blend'))
bpy.ops.wm.read_factory_settings(use_empty=True)
names=['GEO-head_stylized','GEO-head_stylized.eye.L','GEO-head_stylized.eye.R','GEO-head_animation_realistic','GEO-head_sculpting_realistic','GEO-body_male_stylized','GEO-body_male_realistic']
with bpy.data.libraries.load(str(base),link=False) as (a,b): b.objects=names
for o in b.objects:
    bpy.context.collection.objects.link(o)
bpy.context.view_layer.update()
for o in b.objects:
    verts=[v.co for v in o.data.vertices]
    print('BASE_OBJECT',json.dumps({'name':o.name,'loc':list(o.location),'scale':list(o.scale),'rotation':list(o.rotation_euler),'parent':o.parent.name if o.parent else None,'world':list(o.matrix_world.translation),'range':[[min(v[i] for v in verts),max(v[i] for v in verts)] for i in range(3)],'verts':len(verts),'mods':[(m.name,m.type) for m in o.modifiers]}),flush=True)
# Three candidate heads from the actual CC0 meshes, rendered to judge facial anatomy.
for o in list(bpy.context.scene.objects):o.hide_render=True
heads=['GEO-head_stylized','GEO-head_animation_realistic','GEO-head_sculpting_realistic']
for i,name in enumerate(heads):
    o=bpy.data.objects[name];o.hide_render=False;o.parent=None;o.location=(i*.6,0,0);o.rotation_euler=(0,0,0);o.scale=(1,1,1)
    for m in list(o.modifiers):
        if m.type in ['MULTIRES','SUBSURF']:m.levels=1;m.render_levels=1
    vs=[v.co for v in o.data.vertices];low=min(v.z for v in vs);high=max(v.z for v in vs)
    scale=.5/(high-low);o.scale=(scale,)*3;o.location.z=-low*scale
    mat=bpy.data.materials.new(name);mat.diffuse_color=(.44,.26,.18,1);o.data.materials.clear();o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
world=bpy.data.worlds.new('World');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[1].default_value=.5;bpy.context.scene.world=world
for loc,power,size in [((-2,-3,4),400,4),((3,-1,3),250,3)]:
    d=bpy.data.lights.new('Area','AREA');d.energy=power;d.size=size;o=bpy.data.objects.new('Area',d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((.6,0,.25))-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('camera');cam=bpy.data.objects.new('camera',d);bpy.context.collection.objects.link(cam);cam.location=(.6,-4,.6);cam.rotation_euler=(Vector((.6,0,.25))-cam.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=1.9
s=bpy.context.scene;s.camera=cam;s.render.engine='CYCLES';s.cycles.samples=16;s.cycles.use_denoising=True;s.render.resolution_x=1400;s.render.resolution_y=600;s.render.resolution_percentage=100;s.render.filepath=str(HERE/'base_heads.png');bpy.ops.render.render(write_still=True)
