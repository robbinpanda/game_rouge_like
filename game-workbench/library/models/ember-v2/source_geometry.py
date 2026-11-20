"""Inspect source meshes only; external .blend Python execution is disabled."""
import bpy,json
from pathlib import Path
HERE=Path(__file__).resolve().parent
base=next((HERE.parent.parent/'references'/'human-base'/'bundle').rglob('*.blend'))
bpy.ops.wm.read_factory_settings(use_empty=True)
with bpy.data.libraries.load(str(base),link=False) as (a,b):b.objects=['GEO-body_male_realistic','GEO-body_male_stylized','GEO-head_sculpting_realistic','GEO-head_sculpting_realistic.sclera.L','GEO-head_sculpting_realistic.sclera.R','GEO-head_sculpting_realistic.iris.L','GEO-head_sculpting_realistic.iris.R']
for o in b.objects:bpy.context.collection.objects.link(o)
bpy.context.view_layer.update()
for o in b.objects:
    print(o.name,'data',len(o.data.vertices),'world',list(o.matrix_world.translation),'local',list(o.location),'modifiers',[(m.name,m.type) for m in o.modifiers],flush=True)
    print('MATERIALS',[(m.name if m else None) for m in o.data.materials],flush=True)
    if 'body_male' in o.name:
        print('Z_SLICES',[(z,[(round(min(getattr(v.co,axis) for v in o.data.vertices if abs(v.co.z-z)<.015),4),round(max(getattr(v.co,axis) for v in o.data.vertices if abs(v.co.z-z)<.015),4)) for axis in ['x','y']]) for z in [.1,.2,.4,.5,.6,.8,.9,1,1.1,1.2,1.3,1.4,1.5,1.6]],flush=True)
    if 'head_sculpting' in o.name:print('BOUNDS',[[min(v.co[i] for v in o.data.vertices),max(v.co[i] for v in o.data.vertices)] for i in range(3)],flush=True)

