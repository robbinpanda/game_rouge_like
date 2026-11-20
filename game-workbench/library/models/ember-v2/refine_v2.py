"""V2 art revision. Executed inside build_ember.py before semantic joins.
Face base: Blender Studio/community CC0 Human Base Meshes 1.4.1.
Original source is kept under library/references/human-base.
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

# Continuous facial geometry, lip volume and eyelids from the official CC0 base.
base=next((LIB.parent/'sources'/'human-base'/'bundle').rglob('*.blend'))
names=['GEO-head_sculpting_realistic','GEO-head_sculpting_realistic.sclera.L','GEO-head_sculpting_realistic.sclera.R']
with bpy.data.libraries.load(str(base),link=False) as (src,dst):dst.objects=names
for o in dst.objects:char.objects.link(o)
bpy.context.view_layer.update()
sourcehead=dst.objects[0];head_inverse=sourcehead.matrix_world.inverted()
source_matrices=[head_inverse@o.matrix_world.copy() for o in dst.objects]
def face_map(p):
    # Slim cheek plane, subtly wider jaw; retain original facial loops.
    jaw=math.exp(-((p.z-.185)/.045)**2)
    v=Vector((p.x*(1.06+.065*jaw),p.y*.94+.037,1.49+p.z*.98))
    return v

head_objects=[]
for i,o in enumerate(dst.objects):
    # Strip external drivers and multires, keeping the clean editable base topology.
    mx=source_matrices[i]
    o.animation_data_clear()
    for m in list(o.modifiers):o.modifiers.remove(m)
    o.parent=None;o.matrix_world=Matrix.Identity(4)
    for v in o.data.vertices:v.co=face_map(mx@v.co)
    if i==0:
        # Remove the source bust below the neck; its trapezius belonged to a different torso.
        bm=bmesh.new();bm.from_mesh(o.data)
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=(0,0,1.625),plane_no=(0,0,1),clear_inner=True,clear_outer=False)
        boundary=[e for e in bm.edges if e.is_boundary and all(abs(v.co.z-1.625)<.0001 for v in e.verts)]
        for v in set(v for e in boundary for v in e.verts):
            a=math.atan2(v.co.x,v.co.y-.015);v.co.x=.058*sin(a);v.co.y=.015+.060*cos(a)
        ext=bmesh.ops.extrude_edge_only(bm,edges=boundary)
        for v in [g for g in ext['geom'] if isinstance(g,bmesh.types.BMVert)]:v.co.z=1.548;v.co.x*=1.08
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
    o.vertex_groups.clear();assign_weights(o,'head' if i else lambda p:blend_z(p.z,1.56,1.66,'neck','head'))
    o.data.materials.clear();o.data.materials.append(skin if i==0 else white)
    for p in o.data.polygons:p.material_index=0;p.use_smooth=True
    o.name='Body_AnatomicalHead' if i==0 else 'Face_Eyeball.'+('L' if i==1 else 'R')
    parts.append(o);head_objects.append(o)
    if i==0:
        # One subdivision only; the authored facial loops determine the form.
        bpy.context.view_layer.objects.active=o
        sub=o.modifiers.new('Facial curvature','SUBSURF');sub.levels=1;bpy.ops.object.modifier_apply(modifier=sub.name)

head=head_objects[0]
bvh=BVHTree.FromPolygons([v.co for v in head.data.vertices],[p.vertices[:] for p in head.data.polygons])
def surface_y(x,z,offset=.001):
    hit=bvh.ray_cast(Vector((x,-.5,z)),Vector((0,1,0)))
    return hit[0].y-offset if hit[0] is not None else -.085

# Eye discs sit on actual spheres, recessed behind the eyelids.
for o,s in zip(head_objects[1:],[1,-1]):
    vs=[v.co for v in o.data.vertices];center=sum(vs,Vector())/len(vs)
    cx,cy,cz=center;radius=max(v.y for v in vs)-cy
    # A moderate iris, pupil and single small catchlight.
    def eye_disc(name,r,material,depth):
        verts=[(cx,cy-radius-depth,cz)]
        for j in range(33):
            a=2*pi*j/32;x=sin(a)*r;z=cos(a)*r
            verts.append((cx+x,cy-math.sqrt(max(.00001,radius*radius-x*x-z*z))-depth,cz+z))
        return mesh(name,verts,[(0,j+1,j+2) for j in range(32)],material,'head')
    eye_disc('Face_Iris',.0077,iris,.0006);eye_disc('Face_Pupil',.0035,black,.001)
    # Small specular accents augment the real studio reflection.
    box('Face_Catchlight',(cx-.002,cy-radius-.0013,cz+.002),(.0016,.0005,.0016),white,'head',.0006)
    # Eyebrows conform to the continuous brow ridge.
    shape=[(.015,1.799,.0055),(.031,1.805,.0075),(.047,1.807,.0065),(.063,1.804,.0035),(.074,1.799,.0008)]
    dense=[]
    for a,b in zip(shape,shape[1:]):
        for k in range(5):dense.append(tuple(a[j]+(b[j]-a[j])*k/5 for j in range(3)))
    shape=dense+[shape[-1]]
    verts=[]
    for x,z,w in shape:
        for zz in [z-w/2,z+w/2]:verts.append((s*x,surface_y(s*x,zz,.0023),zz))
    mesh('Face_Brow',verts,[(j*2,j*2+1,j*2+3,j*2+2) for j in range(len(shape)-1)],hair,'head')

# Soft lip tint on the existing skin, with no floating surface or rectangular mask.
headskin=skin.copy();headskin.name='21 Face / subtle vertex tint'
head.data.materials.clear();head.data.materials.append(headskin)
for p in head.data.polygons:p.material_index=0
colorlayer=head.data.color_attributes.new(name='FaceTint',type='FLOAT_COLOR',domain='CORNER')
skinrgb=tuple(linear(int('D5A284'[i:i+2],16)/255) for i in (0,2,4))
liprgb=tuple(linear(int('BA8171'[i:i+2],16)/255) for i in (0,2,4))
for loop in head.data.loops:
    p=head.data.vertices[loop.vertex_index].co
    w=.4*math.exp(-(p.x/.025)**6-((p.z-1.703)/.0075)**4) if p.y<-.09 else 0
    colorlayer.data[loop.index].color=tuple(a*(1-w)+b*w for a,b in zip(skinrgb,liprgb))+(1,)
node=headskin.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='FaceTint'
headskin.node_tree.links.new(node.outputs['Color'],headskin.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
headskin.node_tree.nodes['Principled BSDF'].inputs['Subsurface Weight'].default_value=.025
headskin.node_tree.nodes['Principled BSDF'].inputs['Subsurface Scale'].default_value=.008
headskin.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=.28

# Hair shell follows the skull; varied swept locks form one directional silhouette.
verts=[];nt=40;nl=12
for k in range(nl):
    t=(k+.05)/(nl-1+.05)
    for j in range(nt):
        a=2*pi*j/nt;bottom=1.80+.055*cos(a);phi=math.acos(max(-1,min(1,(bottom-1.81)/.122)))*t
        raw=Vector((.099*sin(phi)*sin(a),.038-.131*sin(phi)*cos(a),1.81+.122*cos(phi)))
        center=Vector((0,.01,1.79));direction=(raw-center).normalized()
        hit=bvh.ray_cast(center,direction)
        verts.append(hit[0]+direction*.005 if hit[0] is not None else raw)
faces=[(k*nt+j,k*nt+(j+1)%nt,(k+1)*nt+(j+1)%nt,(k+1)*nt+j) for k in range(nl-1) for j in range(nt)]
cap=mesh('Hair_Scalp',verts,faces,hair,'head')
for p in cap.data.polygons:p.use_smooth=True

def swept_lock(name,control,width,thickness):
    cps=[Vector(v) for v in control];verts=[];N=12;K=8
    def at(t):return (1-t)**3*cps[0]+3*(1-t)**2*t*cps[1]+3*(1-t)*t*t*cps[2]+t**3*cps[3]
    for k in range(N):
        t=k/(N-1);pos=at(t);tangent=(at(min(1,t+.005))-at(max(0,t-.005))).normalized()
        radial=pos-Vector((0,.035,1.81));radial.normalize()
        u=tangent.cross(radial).normalized();v=u.cross(tangent).normalized()
        w=width*(.65+.65*sin(pi*t))*(1-t)**.4 if k<N-1 else .0006
        for j in range(K):
            a=2*pi*j/K;verts.append(pos+u*cos(a)*w+v*sin(a)*thickness*(w/width))
    faces=[(k*K+j,k*K+(j+1)%K,(k+1)*K+(j+1)%K,(k+1)*K+j) for k in range(N-1) for j in range(K)]
    faces.extend([tuple(reversed(range(K))),tuple((N-1)*K+j for j in range(K))])
    ob=mesh(name,verts,faces,hair,'head')
    for p in ob.data.polygons:p.use_smooth=True
    return ob

locks=[
([(.065,.015,1.899),(.035,-.025,1.995),(-.071,-.069,1.949),(-.096,-.103,1.833)],.032,.013),
([(.073,.048,1.887),(.018,.004,1.994),(-.095,-.033,1.966),(-.126,-.044,1.871)],.034,.016),
([(.046,.08,1.886),(-.005,.063,1.978),(-.105,.022,1.951),(-.142,.005,1.895)],.034,.015),
([(.074,-.017,1.877),(.034,-.074,1.955),(-.029,-.114,1.909),(-.032,-.124,1.815)],.024,.012),
([(.09,-.006,1.86),(.082,-.073,1.92),(.037,-.116,1.885),(.022,-.125,1.827)],.02,.011),
([(.042,.10,1.865),(.005,.128,1.945),(-.079,.123,1.945),(-.13,.101,1.889)],.033,.016),
([(-.035,.128,1.836),(-.077,.145,1.901),(-.112,.145,1.904),(-.137,.137,1.852)],.026,.014),
([(.081,.086,1.84),(.11,.071,1.902),(.10,.019,1.894),(.111,-.02,1.83)],.024,.012),
([(-.085,.028,1.82),(-.117,.014,1.875),(-.127,-.024,1.86),(-.117,-.067,1.784)],.022,.009),
([(.081,.025,1.824),(.102,.007,1.858),(.107,-.029,1.833),(.084,-.056,1.772)],.018,.009),
]
for i,(p,w,d) in enumerate(locks):swept_lock('Hair_Sweep_%02d'%i,p,w,d)

# Seat the head closer to the collar and slightly broaden the adult face.
for o in head_objects+[o for o in parts if o.name.startswith(('Face_','Hair_'))]:
    # Eye objects are included once through head_objects.
    if o in head_objects[1:]:continue
    for v in o.data.vertices:
        t=max(0,min(1,(v.co.z-1.55)/.085));v.co.z-=.027*t;v.co.x*=1.035
for o in head_objects[1:]:
    for v in o.data.vertices:v.co.z-=.027;v.co.x*=1.035

# Color and material finish: readable orange jacket and less plastic skin.
def recolor(m,h):
    rgb=tuple(linear(int(h[i:i+2],16)/255) for i in (0,2,4));m.diffuse_color=(*rgb,1);m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*rgb,1)
recolor(coral,'D66542');recolor(coraldark,'B34A30');recolor(corallight,'EC7A53')
recolor(skin,'D5A284');recolor(lip,'BA8171');recolor(hair,'272934');recolor(hairlight,'3C3D48')
skin.node_tree.nodes['Principled BSDF'].inputs['Subsurface Weight'].default_value=.06
skin.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.6
white.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.24
hair.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.76
hair.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=.28

# Stitch lines and double seams make the tailored silhouette intentional.
for s in [-1,1]:
    line('Jacket_EdgeStitch',[(s*.063,-.119,1.14),(s*.064,-.128,1.25),(s*.071,-.139,1.40)],.0013,coraldark,torso_weight)
    label='R' if s<0 else 'L'
    line('Pants_OuterSeam',[(s*.205,.009,1.025),(s*.215,.01,.91),(s*.224,.016,.78),(s*.211,.022,.61),(s*.221,.035,.45),(s*.209,.026,.29)],.0014,teallight,lambda p,label=label:blend_z(p.z,.55,.66,'shin.'+label,'thigh.'+label))
print('V2_REBUILT',len(parts),flush=True)

