"""Create the playable expedition mesh from the editable R4 studio file."""
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

OUT = Path(__file__).resolve().parent
HERE = OUT.parent / "ember-v4"
rig = bpy.data.objects["EMBER_RIG"]
meshes = [o for o in rig.children if o.type == "MESH"]
bpy.context.preferences.filepaths.save_version = 0
rig.data.pose_position = 'REST'

# The original face, hairline and single shoulder guard define the silhouette.
ratios = {"Body": .49, "Boot": .53, "Glove": .72, "Hair": .78,
          "Gear": .65, "Pants": .74, "Jacket": .83}
for obj in meshes:
    ratio = ratios.get(obj.name.removeprefix("EMBER_"))
    if ratio is None:
        continue
    bpy.context.view_layer.objects.active = obj
    modifier = obj.modifiers.new("Field mesh reduction", 'DECIMATE')
    modifier.ratio = ratio
    bpy.ops.object.modifier_move_to_index(modifier=modifier.name, index=0)
    bpy.ops.object.modifier_apply(modifier=modifier.name)

coat = bpy.data.objects["EMBER_Jacket"]
surface = BVHTree.FromPolygons([v.co for v in coat.data.vertices],
                               [p.vertices[:] for p in coat.data.polygons])
vertices, faces, colours = [], [], []
def ribbon(path, width, depth, material):
    """Folded strip fitted to the coat; raycast every row to follow its back."""
    start = len(vertices)
    for i, (x,z) in enumerate(path):
        dx, dz = Vector(path[min(i+1,len(path)-1)]) - Vector(path[max(0,i-1)])
        side = Vector((-dz,dx)).normalized()
        for fraction in (-1,0,1):
            u, v = Vector((x,z)) + side * (fraction * width/2)
            hit = surface.ray_cast(Vector((u,.5,v)), Vector((0,-1,0)))[0]
            y = hit.y if hit else .118
            vertices.append((u,y+depth+(.003 if fraction == 0 else 0),v))
        if i:
            k = start + 3*i
            for j in (0,1):
                faces.append((k+j-3,k+j,k+j+1,k+j-2))
                colours.append(material)

# Cross-body webbing, two brass keepers and an ivory split-chevron unit device.
ribbon([(-.185,1.504),(-.145,1.47),(-.08,1.402),(0,1.32),(.087,1.227),(.148,1.142)],.044,.009,0)
for x,z in [(-.123,1.444),(.095,1.219)]:
    ribbon([(x-.020,z-.016),(x+.020,z+.016)],.011,.018,1)
for side in (-1,1):
    ribbon([(side*.136,1.47),(side*.098,1.438),(side*.065,1.423),(side*.02,1.38)],.021,.022,2)
    ribbon([(side*.086,1.466),(side*.050,1.442),(side*.022,1.413)],.011,.024,1)
mesh = bpy.data.meshes.new("Fitted back insignia")
mesh.from_pydata(vertices, [], faces); mesh.update()
detail = bpy.data.objects.new("EMBER_FieldHarness", mesh)
coat.users_collection[0].objects.link(detail)
detail.parent = rig
for name, rgb in [("Field graphite",(.048,.055,.068)),("Field brass",(.95,.49,.095)),
                  ("Field enamel",(.93,.84,.67))]:
    mat = bpy.data.materials.new(name); mat.diffuse_color = (*rgb,1)
    mesh.materials.append(mat)
for face, index in zip(mesh.polygons,colours):
    face.material_index = index
group = detail.vertex_groups.new(name="chest")
group.add(list(range(len(vertices))),1,'REPLACE')
detail.modifiers.new("Suit binding","ARMATURE").object = rig
meshes.append(detail)
rig.data.pose_position = 'POSE'
bpy.ops.object.select_all(action='DESELECT')
for obj in [*meshes,rig]:
    obj.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "EMBER_Field.blend"))

exec(compile((HERE / 'portable_cel.py').read_text(encoding='utf8'),'portable_cel.py','exec'))
prepare_portable_cel()
target = OUT.parent.parent / "exports" / "EMBER_Field.glb"
bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,
                          export_animations=True,export_animation_mode='ACTIONS',
                          export_anim_single_armature=True,export_force_sampling=True,
                          export_skins=True,export_yup=True,export_cameras=False,export_lights=False)
finalize_unlit_glb(target)
