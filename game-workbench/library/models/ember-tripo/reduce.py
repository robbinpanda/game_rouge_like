"""Reduce the supplied Tripo mesh in Blender, keeping its UV layout."""
import bpy, sys
from pathlib import Path
source=Path(sys.argv[-1])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source),merge_vertices=True)
body=next(o for o in bpy.context.scene.objects if o.type=="MESH")
bpy.context.view_layer.objects.active=body
mod=body.modifiers.new('Game surface','DECIMATE')
mod.ratio=34000/len(body.data.polygons)
bpy.ops.object.modifier_apply(modifier=mod.name)
body.name='Ember_Tripo'
bpy.ops.wm.save_as_mainfile(filepath=str(Path.cwd()/'tmp/tripo-reduced.blend'))
import numpy as np
mesh=body.data
verts=np.array([tuple(v.co) for v in mesh.vertices]);faces=np.array([tuple(f.vertices) for f in mesh.polygons])
np.savez(str(Path.cwd()/'tmp/tripo-reduced.npz'),v=verts,f=faces)
print('MODEL',len(verts),len(faces),body.matrix_world,flush=True)
