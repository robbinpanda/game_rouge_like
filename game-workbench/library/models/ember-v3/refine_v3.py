"""V3 anime revision. Executed inside build_ember.py before semantic joins.
Retains V2 garment proportions; head is newly authored stylized geometry.
No external head mesh is loaded.
"""
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree
from mathutils import Matrix

def delete_part(o):
    if o in parts:parts.remove(o)
    bpy.data.objects.remove(o,do_unlink=True)

# Replace the entire previous head assembly, including its primitive neck.
for o in list(parts):
    if o.name.startswith(('Body_Head','Body_Ear','Body_Neck','Face_','Hair_')):delete_part(o)

def remap_z(z):
    knots=[(0,0),(.24,.24),(.58,.60),(.90,.99),(1.075,1.13),(1.31,1.335),(1.49,1.50),(1.56,1.56),(2,2)]
    for (a,b),(c,d) in zip(knots,knots[1:]):
        if z<=c:return b+(z-a)/(c-a)*(d-b)
    return z

for o in parts:
    exempt=o.name.startswith(('Body_Arm','Body_Finger','Glove_','FX_','Weapon_','Boot_','Jacket_Sleeve','Jacket_Cuff'))
    if not exempt:
        for v in o.data.vertices:v.co.z=remap_z(v.co.z)
    # Slender, tailored sleeves, with the existing arm inside.
    if o.name.startswith(('Jacket_Sleeve','Jacket_Cuff')):
        side=-1 if '.R' in o.name else 1
        for v in o.data.vertices:
            t=(1.49-v.co.z)/.26;cx=side*(.235+.14*t)
            v.co.x=cx+(v.co.x-cx)*.86;v.co.y*=.90
    if o.name.startswith('Jacket_Lapel'):
        for v in o.data.vertices:
            if v.co.z<1.51:v.co.z+=.055*(1.51-v.co.z)/.105
    if o.name.startswith('Boot_'):
        for v in o.data.vertices:
            v.co.y*=.86
            v.co.z=max(0,v.co.z-.018*max(0,1-abs(v.co.z-.06)/.12))
    # Remove random patchwork colors; shape and lighting should describe cloth.
    if o.name.startswith(('Jacket_','Armor_')):
        for p in o.data.polygons:p.material_index=0

bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for b in rig.data.edit_bones:
    if b.name in ['pelvis','spine','chest'] or b.name.startswith(('thigh.','shin.')):
        b.head.z=remap_z(b.head.z);b.tail.z=remap_z(b.tail.z)
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)

def unify(name,chosen,voxel,ratio,material):
    """Union intersecting garment pieces; transfer original skin weights locally."""
    kd=KDTree(sum(len(o.data.vertices) for o in chosen));weights=[];idx=0
    for o in chosen:
        for v in o.data.vertices:
            kd.insert(v.co,idx);idx+=1
            weights.append({o.vertex_groups[g.group].name:g.weight for g in v.groups})
    kd.balance()
    bpy.ops.object.select_all(action='DESELECT')
    for o in chosen:o.select_set(True);parts.remove(o)
    bpy.context.view_layer.objects.active=chosen[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
    o.vertex_groups.clear();o.data.materials.clear();o.data.materials.append(material)
    r=o.modifiers.new('Sewn continuous volume','REMESH');r.mode='VOXEL';r.voxel_size=voxel;r.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=r.name)
    sm=o.modifiers.new('Relax cloth transitions','SMOOTH');sm.factor=.78;sm.iterations=12;bpy.ops.object.modifier_apply(modifier=sm.name)
    dec=o.modifiers.new('Curvature driven mesh reduction','DECIMATE');dec.ratio=ratio;bpy.ops.object.modifier_apply(modifier=dec.name)
    for v in o.data.vertices:
        _,near,_=kd.find(v.co)
        for name,w in weights[near].items():
            vg=o.vertex_groups.get(name) or o.vertex_groups.new(name=name);vg.add([v.index],w,'REPLACE')
    for p in o.data.polygons:p.use_smooth=True
    parts.append(o)
    return o

for o in list(parts):
    if o.name.startswith('Jacket_Main'):delete_part(o)
# Use a closed tailoring volume so the shoulder unions cannot perforate thin cloth.
rings('Jacket_MainSolid',[((0,0,remap_z(z)),rx,ry) for z,rx,ry in [(1.075,.17,.112),(1.13,.167,.112),(1.31,.205,.133),(1.46,.23,.144),(1.515,.212,.124),(1.555,.086,.078)]],coral,torso_weight,n=32,facets=False)
coat=unify('Jacket_TailoredShell',[o for o in parts if o.name.startswith(('Jacket_Main','Jacket_Sleeve','Jacket_ShoulderSeam'))],.0045,.065,coral)
coat_bvh=BVHTree.FromPolygons([v.co for v in coat.data.vertices],[p.vertices[:] for p in coat.data.polygons])
shirtverts=[];shirtrows=48;shirtcols=16
for k in range(shirtrows):
    z=1.129+(.419*k/(shirtrows-1));w=.055+.016*max(0,(z-1.39)/.158)
    for j in range(shirtcols):
        x=w*(j/(shirtcols-1)*2-1)
        hit=coat_bvh.ray_cast(Vector((x,-.5,z)),Vector((0,1,0)))
        y=hit[0].y-.006 if hit[0] is not None else -.096
        shirtverts.append((x,y,z))
shirt=mesh('Body_FittedInnerPanel',shirtverts,[(k*shirtcols+j,k*shirtcols+j+1,(k+1)*shirtcols+j+1,(k+1)*shirtcols+j) for k in range(shirtrows-1) for j in range(shirtcols-1)],dark,torso_weight)
for p in shirt.data.polygons:p.use_smooth=True
for o in list(parts):
    if o.name.startswith('Body_ChestHarness'):delete_part(o)
strapverts=[]
for j in range(21):
    t=j/20;x=-.095+.23*t;z=1.385+.097*min(1,t/.66)
    for zz in [z-.013,z+.013]:
        hit=coat_bvh.ray_cast(Vector((x,-.5,zz)),Vector((0,1,0)))
        y=hit[0].y-.012 if hit[0] is not None else -.145
        strapverts.append((x,y,zz))
mesh('Gear_ChestStrap',strapverts,[(2*j,2*j+1,2*j+3,2*j+2) for j in range(20)],strap,'chest')

# The stand collar joins the lapels around the back of the neck.
cv=[];cn=32
for z,rx,ry in [(1.545,.096,.088),(1.587,.09,.08),(1.612,.084,.074)]:
    for j in range(cn):
        a=.72+(2*pi-1.44)*j/(cn-1);cv.append((rx*sin(a),.012-ry*cos(a),z))
collar=mesh('Jacket_StandCollar',cv,[(k*cn+j,k*cn+j+1,(k+1)*cn+j+1,(k+1)*cn+j) for k in range(2) for j in range(cn-1)],corallight,'chest')
bpy.context.view_layer.objects.active=collar
th=collar.modifiers.new('Collar thickness','SOLIDIFY');th.thickness=.006;bpy.ops.object.modifier_apply(modifier=th.name)
unify('Pants_Continuous',[o for o in parts if o.name.startswith('Pants_')],.0045,.065,teal)

# Smooth exposed skin, soften crafted armor edges; keep readable broad planes.
for o in list(parts):
    bpy.context.view_layer.objects.active=o
    if o.name.startswith(('Body_Arm','Body_Finger','Glove_Palm','Glove_Finger')):
        # Triangles can be joined back into quads before subdivision.
        bm=bmesh.new();bm.from_mesh(o.data)
        if o.name.startswith('Body_Arm'):
            bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=(0,0,1.205),plane_no=(0,0,1),clear_outer=True,clear_inner=False)
        bmesh.ops.join_triangles(bm,faces=list(bm.faces),angle_face_threshold=.8,angle_shape_threshold=.8)
        bm.to_mesh(o.data);bm.free()
        sub=o.modifiers.new('Anatomical contour','SUBSURF');sub.levels=1;sub.render_levels=1;bpy.ops.object.modifier_apply(modifier=sub.name)
        for p in o.data.polygons:p.use_smooth=True
    if o.name.startswith(('Armor_','Boot_','Gear_','Jacket_Lapel','Jacket_Cuff','Jacket_Hem','Jacket_BackTail','Jacket_Asymmetric')):
        bevel=o.modifiers.new('Soft crafted edge','BEVEL');bevel.width=.0035;bevel.segments=2;bevel.limit_method='ANGLE';bevel.angle_limit=.45
        bpy.ops.object.modifier_apply(modifier=bevel.name)
        for p in o.data.polygons:p.use_smooth=False


exec(compile((HERE / 'anime_head.py').read_text(encoding='utf8'), 'anime_head.py', 'exec'))
