"""Build the reusable supply case, with a lid origin on its rear hinge."""
import bpy
import json
from pathlib import Path
from mathutils import Vector

out = Path(__file__).resolve().parent
bpy.ops.wm.read_factory_settings(use_empty=True)
palette = [("Powder-coated shell",(.25,.39,.38)),("Rubber bumper",(.045,.075,.08)),
           ("Ivory enamel",(.78,.72,.56)),("Amber latch",(.94,.47,.09)),
           ("Inside",(.09,.12,.13))]
materials = []
for name, rgb in palette:
    material = bpy.data.materials.new(name); material.diffuse_color=(*rgb,1)
    materials.append(material)
verts, polys, slots = [], [], []
def ring(cx,cy,w,d,z,cut):
    x,y=w/2,d/2
    points=[(-x+cut,-y),(x-cut,-y),(x,-y+cut),(x,y-cut),
            (x-cut,y),(-x+cut,y),(-x,y-cut),(-x,-y+cut)]
    start=len(verts)
    verts.extend((cx+a,cy+b,z) for a,b in points)
    return list(range(start,start+8))

def shells(cx,cy,layers,cap):
    previous=None
    for w,d,z,cut,colour in layers:
        current=ring(cx,cy,w,d,z,cut)
        if previous is None:
            polys.append(tuple(reversed(current)));slots.append(colour)
        else:
            for a in range(8):
                b=(a+1)%8;polys.append((previous[a],previous[b],current[b],current[a]));slots.append(colour)
        previous=current
    polys.append(tuple(previous));slots.append(cap)

def block(x,y,z,w,d,h,cut,colour):
    shells(x,y,[(w,d,z,cut,colour),(w,d,z+h,cut,colour)],colour)

def finish(name,pivot):
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata([Vector(v)-Vector(pivot) for v in verts],[],polys);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.location=pivot
    for mat in materials:mesh.materials.append(mat)
    for p,s in zip(mesh.polygons,slots):p.material_index=s
    mesh.calc_loop_triangles()
    result={"positions":[round(n,4) for v in mesh.vertices for n in (v.co.x,v.co.z,-v.co.y)],
            "faces":[[t.material_index,*t.vertices] for t in mesh.loop_triangles]}
    verts.clear();polys.clear();slots.clear()
    return result

shells(0,0,[(1.34,.85,.04,.1,1),(1.46,.95,.14,.12,1),
            (1.43,.92,.22,.12,1),(1.37,.87,.64,.1,0),
            (1.46,.94,.73,.1,0),(1.46,.94,.79,.1,1),
            (1.29,.77,.79,.08,1),(1.24,.72,.27,.07,4)],4)
for x in [-.49,.49]:
    block(x,-.45,.19,.125,.069,.48,.018,2)
    block(x,-.48,.55,.17,.062,.17,.019,1)
    block(x,-.513,.59,.106,.026,.075,.008,3)
block(0,-.447,.44,.42,.027,.13,.008,1)
for k in range(5):block(-.15+k*.058,-.464,.476,.018,.01,.042,.002,2)
body=finish("Field cache - shell",(0,0,0))
shells(0,0,[(1.47,.94,.79,.105,1),(1.48,.95,.84,.11,1),
            (1.39,.86,.91,.1,0),(1.28,.75,.935,.08,0)],0)
for x in [-.49,.49]:
    block(x,0,.927,.122,.73,.023,.023,2)
block(0,.02,.933,.4,.21,.012,.023,1)
for x in [-.105,0,.105]:block(x,.02,.945,.044,.115,.006,.009,3)
lid=finish("Field cache - hinged lid",(0,.45,.79))
bpy.context.preferences.filepaths.save_version=0
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_location=(0,0,.45)
        area.spaces.active.region_3d.view_distance=2.9
        area.spaces.active.shading.color_type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(out/'Field_Cache.blend'))
(out/'cache-mesh.json').write_text(json.dumps({"body":body,"lid":lid},separators=(',',':')))
