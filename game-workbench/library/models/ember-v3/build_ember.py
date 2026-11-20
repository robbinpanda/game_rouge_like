"""EMBER / first editable stylized character. Run with Blender --background --python.
Geometry is authored here from the project's turnaround; no image-to-mesh service.
Front is -Y, anatomical right is -X, one Blender unit is one metre.
"""
import bpy, bmesh, math, json, random, sys
from pathlib import Path
from mathutils import Vector, Quaternion
from math import sin, cos, pi

HERE = Path(__file__).resolve().parent
LIB = HERE.parent.parent
ROOT = LIB.parent.parent
PREVIEW = LIB / 'previews' / 'ember-v3'
PREVIEW.mkdir(parents=True, exist_ok=True)
random.seed(37)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.name = 'EMBER • Character Study 03'
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1
scene.render.fps = 30
char = bpy.data.collections.new('01 • EMBER / skinned character')
scene.collection.children.link(char)
stage = bpy.data.collections.new('02 • Studio / render only')
scene.collection.children.link(stage)
refs = bpy.data.collections.new('03 • Reference / hidden in render')
scene.collection.children.link(refs)
parts = []

def linear(c):
    return c / 12.92 if c < .04045 else ((c+.055)/1.055)**2.4

def mat(name, hexcode, rough=.65, metal=0, emission=0):
    h=hexcode.lstrip('#'); rgb=tuple(linear(int(h[i:i+2],16)/255) for i in (0,2,4))
    m=bpy.data.materials.new(name); m.diffuse_color=(*rgb,1); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*rgb,1)
    bs.inputs['Roughness'].default_value=rough; bs.inputs['Metallic'].default_value=metal
    if emission:
        bs.inputs['Emission Color'].default_value=(*rgb,1)
        bs.inputs['Emission Strength'].default_value=emission
    return m

skin=mat('01 Skin / warm terracotta','#D89C7C')
skinshade=mat('02 Skin / cheek plane','#C28970')
lip=mat('03 Lips / muted clay','#9D6052')
hair=mat('04 Hair / charcoal','#302F38')
hairlight=mat('05 Hair / graphite planes','#48444E')
dark=mat('06 Undersuit / ink','#34353F')
coral=mat('07 Jacket / ember coral','#E77553')
coraldark=mat('08 Jacket / seams','#CF6044')
corallight=mat('09 Jacket / folded edge','#F28964')
teal=mat('10 Trousers / deep teal','#36585A')
teallight=mat('11 Knee / slate teal','#557578',.48,.12)
ivory=mat('12 Armor / warm porcelain','#E8D8C4',.4,.16)
ivoryshade=mat('13 Armor / edge','#B7AA9D',.5,.12)
strap=mat('14 Straps / smoke violet','#68616F')
glow=mat('15 Ember / emissive gold','#FFAC36',.35,0,3)
steel=mat('16 Blade / tempered metal','#7E8395',.3,.72)
edge=mat('17 Blade / honed edge','#CFD1DE',.24,.8)
white=mat('18 Eyes / warm white','#EDE5D5',.4)
iris=mat('19 Eyes / dark hazel','#51483B',.4)
black=mat('20 Lashes / deep charcoal','#22232A')

def assign_weights(obj, weights):
    if isinstance(weights,str):
        obj.vertex_groups.new(name=weights).add(list(range(len(obj.data.vertices))),1,'REPLACE')
    elif weights:
        for v in obj.data.vertices:
            for bone,w in weights(v.co).items():
                if w>1e-6:
                    g=obj.vertex_groups.get(bone) or obj.vertex_groups.new(name=bone)
                    g.add([v.index],w,'REPLACE')

def mesh(name, verts, faces, material, bone=None, facets=False):
    data=bpy.data.meshes.new(name); data.from_pydata(verts,[],faces); data.update()
    obj=bpy.data.objects.new(name,data); char.objects.link(obj); parts.append(obj)
    mats=material if isinstance(material,list) else [material]
    for m in mats: data.materials.append(m)
    bm=bmesh.new(); bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    if facets: bmesh.ops.triangulate(bm,faces=list(bm.faces),quad_method='BEAUTY')
    bm.to_mesh(data); bm.free()
    if len(mats)>1:
        for p in data.polygons:
            p.material_index=1 if random.random()<.16 else 0
    assign_weights(obj,bone)
    return obj

def rings(name, specs, material, bone=None, n=12, facets=True, caps=True):
    # Each ring is (center, horizontal radius, depth radius); cross-section in XY.
    verts=[]
    for c,rx,ry in specs:
        for j in range(n):
            a=2*pi*j/n
            verts.append((c[0]+rx*sin(a), c[1]-ry*cos(a), c[2]))
    faces=[]
    for i in range(len(specs)-1):
        for j in range(n):
            a=i*n+j;b=i*n+(j+1)%n
            faces.append((a,b,b+n,a+n))
    if caps: faces += [tuple(reversed(range(n))),tuple((len(specs)-1)*n+j for j in range(n))]
    return mesh(name,verts,faces,material,bone,facets)

def tube(name, points, radii, material, bone, n=10, facets=True):
    pts=[Vector(p) for p in points]; verts=[]
    axis=(pts[-1]-pts[0]).normalized()
    u=Vector((0,-1,0));u=(u-axis*u.dot(axis)).normalized(); v=axis.cross(u).normalized()
    for p,r in zip(pts,radii):
        r1,r2=(r,r) if isinstance(r,(int,float)) else r
        for j in range(n):
            a=2*pi*j/n;verts.append(p+u*cos(a)*r1+v*sin(a)*r2)
    faces=[]
    for i in range(len(pts)-1):
        for j in range(n):
            a=i*n+j;b=i*n+(j+1)%n;faces.append((a,b,b+n,a+n))
    faces += [tuple(reversed(range(n))),tuple((len(pts)-1)*n+j for j in range(n))]
    return mesh(name,verts,faces,material,bone,facets)

def panel(name, outline, material, bone, depth=.012, ridge=None):
    verts=[Vector(p) for p in outline]; n=len(verts)
    if ridge is not None:
        verts.append(Vector(ridge));faces=[(j,(j+1)%n,n) for j in range(n)]
    else: faces=[tuple(range(n))]
    back=len(verts);verts += [Vector(p)+Vector((0,depth,0)) for p in outline]
    faces.append(tuple(back+j for j in reversed(range(n))))
    faces += [(j,back+j,back+(j+1)%n,(j+1)%n) for j in range(n)]
    return mesh(name,verts,faces,material,bone,True)

def box(name, center, scale, material, bone, bevel=.008):
    bpy.ops.mesh.primitive_cube_add(size=1,location=center)
    o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for c in list(o.users_collection): c.objects.unlink(o)
    char.objects.link(o);parts.append(o);o.data.materials.append(material)
    if bevel:
        m=o.modifiers.new('Crafted edges','BEVEL');m.width=bevel;m.segments=1
        bpy.ops.object.modifier_apply(modifier=m.name)
    # Bake position so all skinned geometry is in rig space.
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    assign_weights(o,bone)
    return o

def line(name, points, radius, material, bone):
    return tube(name,points,[radius]*len(points),material,bone,n=5,facets=False)

def blend_z(z,a,b,name1,name2):
    t=max(0,min(1,(z-a)/(b-a)));return {name1:1-t,name2:t}

def torso_weight(p):
    if p.z<1.14:return blend_z(p.z,1.00,1.14,'pelvis','spine')
    return blend_z(p.z,1.23,1.40,'spine','chest')

# Root hierarchy and deformation joints.
armdata=bpy.data.armatures.new('EMBER skeleton');rig=bpy.data.objects.new('EMBER_RIG',armdata)
char.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
def bone(name, head, tail, parent=None, deform=True):
    b=armdata.edit_bones.new(name);b.head=head;b.tail=tail;b.use_deform=deform
    if parent:b.parent=armdata.edit_bones[parent]
    return b
bone('root',(0,0,0),(0,0,.16),deform=False)
bone('pelvis',(0,0,.96),(0,0,1.10),'root')
bone('spine',(0,0,1.10),(0,0,1.31),'pelvis')
bone('chest',(0,0,1.31),(0,0,1.53),'spine')
bone('neck',(0,0,1.53),(0,0,1.65),'chest')
bone('head',(0,0,1.65),(0,0,1.88),'neck')
limbs={};digits={}
for s,label in [(-1,'R'),(1,'L')]:
    hip=(s*.125,0,1.0); knee=(s*.147,-.022,.585);ankle=(s*.16,0,.16)
    shoulder=(s*.235,0,1.49);elbow=(s*.375,-.005,1.23);wrist=(s*.495,-.015,.995)
    hand=(s*.527,-.022,.913)
    limbs[label]=(hip,knee,ankle,shoulder,elbow,wrist,hand)
    bone('clavicle.'+label,(s*.045,0,1.49),shoulder,'chest')
    bone('upper_arm.'+label,shoulder,elbow,'clavicle.'+label)
    bone('forearm.'+label,elbow,wrist,'upper_arm.'+label)
    bone('hand.'+label,wrist,hand,'forearm.'+label)
    bone('thigh.'+label,hip,knee,'pelvis')
    bone('shin.'+label,knee,ankle,'thigh.'+label)
    bone('foot.'+label,ankle,(s*.16,-.15,.07),'shin.'+label)
    bone('toe.'+label,(s*.16,-.15,.07),(s*.16,-.23,.07),'foot.'+label)
    d=Vector(hand)-Vector(wrist);d.normalize();u=Vector((.89*s,0,.455))
    for j,name in enumerate(['index','middle','ring','pinky']):
        start=Vector(hand)+u*((j-1.5)*.018)
        length=[.059,.069,.063,.049][j]
        mid=start+d*length*.55+Vector((0,-.006,0));tip=start+d*length+Vector((0,-.017,0))
        digits[(label,name)]=(start,mid,tip)
        bone(name+'_01.'+label,start,mid,'hand.'+label)
        bone(name+'_02.'+label,mid,tip,name+'_01.'+label)
    start=Vector(wrist)+d*.04-u*.038
    mid=start+d*.027-u*.025; tip=mid+d*.026+Vector((0,-.018,0))
    digits[(label,'thumb')]=(start,mid,tip)
    bone('thumb_01.'+label,start,mid,'hand.'+label);bone('thumb_02.'+label,mid,tip,'thumb_01.'+label)
bone('weapon.R',limbs['R'][6],(-.58,-.02,.65),'hand.R',False)
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
rig.show_in_front=True;armdata.display_type='OCTAHEDRAL'

# Fitted inner body; deliberate faceted planes, avoiding stacked primitives.
rings('Body_Undershirt',[( (0,0,z),rx,ry) for z,rx,ry in [(1.0,.145,.094),(1.13,.15,.091),(1.31,.194,.112),(1.46,.22,.125),(1.52,.19,.104),(1.56,.085,.071)]],dark,torso_weight,n=16)
rings('Body_Neck',[((0,.008,1.52),.073,.064),((0,.003,1.585),.068,.063),((0,.0,1.64),.071,.065)],skin,'neck')
rings('Pants_Hips',[((0,0,.90),.156,.096),((0,0,.96),.207,.112),((0,0,1.0),.201,.11),((0,0,1.07),.159,.102)],teal,'pelvis',n=16)

for s,label in [(-1,'R'),(1,'L')]:
    hip,knee,ankle,shoulder,elbow,wrist,hand=limbs[label]
    def leg_weight(p,label=label): return blend_z(p.z,.53,.65,'shin.'+label,'thigh.'+label)
    rings('Pants_Leg.'+label,[((s*x,y,z),rx,ry) for x,y,z,rx,ry in [(.104,0,1.00,.101,.101),(.115,0,.91,.108,.108),(.136,-.004,.77,.102,.10),(.148,-.018,.63,.078,.078),(.148,-.025,.58,.08,.077),(.153,-.01,.52,.079,.078),(.16,.012,.40,.086,.084),(.16,.013,.31,.065,.069),(.16,0,.225,.055,.055),(.16,0,.19,.05,.049)]],teal,leg_weight,n=12)
    panel('Armor_Knee.'+label,[(s*(.147-.059),-.09,.627),(s*(.147+.059),-.09,.627),(s*(.147+.052),-.10,.56),(s*.147,-.115,.50),(s*(.147-.05),-.10,.56)],teallight,leg_weight,.016,(s*.147,-.13,.582))
    rings('Boot_Cuff.'+label,[((s*.16,0,.12),.065,.068),((s*.16,0,.20),.065,.065),((s*.16,.005,.245),.059,.06)],coral,'foot.'+label,n=8)
    # Broad practical boot, toe extends toward front (-Y).
    rings('Boot_Sole.'+label,[((s*.16,-.067,.0),.079,.145),((s*.16,-.075,.056),.084,.151),((s*.16,-.063,.082),.078,.14)],dark,'foot.'+label,n=12)
    rings('Boot_Upper.'+label,[((s*.16,-.065,.065),.077,.14),((s*.16,-.071,.104),.074,.132),((s*.16,-.035,.143),.064,.104),((s*.16,-.005,.184),.058,.068)],ivory,'foot.'+label,n=12)
    panel('Boot_ShinPlate.'+label,[(s*(.16-.047),-.067,.235),(s*(.16+.047),-.067,.235),(s*(.16+.046),-.095,.151),(s*.16,-.12,.13),(s*(.16-.046),-.095,.151)],ivory,'foot.'+label,.014,(s*.16,-.09,.195))
    for z,y in [(.126,-.09),(.185,-.063)]:
        o=box('Boot_Strap.'+label,(s*.16,y,z),(.126,.026,.023),ivoryshade,'foot.'+label,.004)
    # continuous exposed forearm; sleeve covers proximal section.
    sh,el,wr=map(Vector,(shoulder,elbow,wrist))
    def aw(p,label=label,el=el): return blend_z(p.z,el.z-.055,el.z+.055,'forearm.'+label,'upper_arm.'+label)
    tube('Body_Arm.'+label,[sh,sh.lerp(el,.5),el,el.lerp(wr,.4),wr],[.079,.077,.056,.06,.036],skin,aw,n=12)
    tube('Jacket_Sleeve.'+label,[sh+Vector((0,0,.014)),sh.lerp(el,.3),sh.lerp(el,.72),el,el.lerp(wr,.22)],[.093,.101,.084,.087,.081],[coral,coraldark],aw,n=10)
    rings('Jacket_ShoulderSeam.'+label,[((s*.211,0,1.435),.075,.102),((s*.217,0,1.492),.094,.113),((s*.211,0,1.541),.07,.095),((s*.205,0,1.555),.025,.047)],coral,lambda p,label=label:{'chest':.4,'upper_arm.'+label:.6},n=12)
    cuff=el.lerp(wr,.22)
    tube('Jacket_Cuff.'+label,[cuff-((wr-el).normalized()*.018),cuff,cuff+((wr-el).normalized()*.017)],[.085,.087,.08],corallight,'forearm.'+label,n=10)
    tube('Glove_Cuff.'+label,[wr+Vector((-.008*s,0,.024)),wr,wr+Vector((.008*s,0,-.02))],[.043,.047,.042],strap,'hand.'+label,n=10)
    tube('Glove_Palm.'+label,[Vector(wrist)+Vector((s*.012,0,-.026)),Vector(hand)+Vector((-s*.005,0,.014)),hand],[(.03,.038),(.026,.042),(.022,.037)],dark,'hand.'+label,n=10)
    for name in ['index','middle','ring','pinky','thumb']:
        start,mid,tip=digits[(label,name)]
        tube('Glove_Finger_'+name+'.'+label,[start,start.lerp(mid,.7),mid],[.0105,.0102,.0095],dark,name+'_01.'+label,n=6)
        tube('Body_Finger_'+name+'.'+label,[mid,mid.lerp(tip,.75),tip],[.0096,.0085,.006],skin,name+'_02.'+label,n=6)

# Open-front cropped jacket: a 300-degree shell with a tapered center opening.
specs=[(1.075,.17,.112),(1.13,.167,.112),(1.31,.205,.133),(1.46,.23,.144),(1.515,.212,.124),(1.555,.086,.078)]
verts=[];nr=17
for z,rx,ry in specs:
    for j in range(nr):
        a=.34+(2*pi-.68)*j/(nr-1)
        verts.append((rx*sin(a),-ry*cos(a),z))
faces=[(i*nr+j,i*nr+j+1,(i+1)*nr+j+1,(i+1)*nr+j) for i in range(len(specs)-1) for j in range(nr-1)]
jacket=mesh('Jacket_Main',verts,faces,[coral,coraldark],torso_weight,True)
bpy.context.view_layer.objects.active=jacket
sol=jacket.modifiers.new('Tailored thickness','SOLIDIFY');sol.thickness=.009
bpy.ops.object.modifier_apply(modifier=sol.name)
for s in [-1,1]:
    panel('Jacket_Lapel',[(s*.025,-.116,1.405),(s*.073,-.144,1.51),(s*.146,-.092,1.60),(s*.063,-.074,1.62),(s*.052,-.111,1.53)],corallight,'chest',.012,(s*.077,-.149,1.533))
    line('Jacket_Zip',[(s*.057,-.11,1.085),(s*.056,-.116,1.20),(s*.068,-.13,1.39)],.006,ivoryshade,torso_weight)
    panel('Jacket_Hem',[(s*.055,-.115,1.087),(s*.157,-.06,1.087),(s*.172,.01,1.098),(s*.17,.01,1.122),(s*.155,-.065,1.111),(s*.056,-.115,1.11)],corallight,torso_weight,.01)
    # Back split tails follow pelvis.
    panel('Jacket_BackTail',[(s*.017,.113,1.115),(s*.155,.068,1.11),(s*.178,.075,.979),(s*.03,.116,.991)],coral,'pelvis',.009,(s*.092,.127,1.045))
panel('Jacket_AsymmetricFrontTail',[(-.059,-.114,1.105),(-.156,-.075,1.105),(-.185,-.075,.977),(-.064,-.12,.935)],coral,'pelvis',.01,(-.126,-.133,1.025))
panel('Body_ChestHarness',[(-.095,-.119,1.365),(.055,-.136,1.465),(.151,-.115,1.465),(.151,-.12,1.433),(.066,-.141,1.433),(-.095,-.125,1.325)],strap,'chest',.008)
rings('Gear_Belt',[((0,0,1.034),.168,.113),((0,0,1.081),.168,.113)],strap,'pelvis',n=16)
box('Gear_Buckle',(.033,-.122,1.06),(.076,.025,.055),ivory,'pelvis',.006)
box('Gear_BuckleInset',(.033,-.138,1.06),(.049,.006,.035),ivoryshade,'pelvis',.003)
box('Gear_HipPouch',(-.217,-.01,.93),(.12,.135,.175),ivoryshade,'pelvis',.021)
panel('Gear_PouchFlap',[(-.282,-.087,1.015),(-.159,-.087,1.015),(-.163,-.091,.946),(-.223,-.096,.927),(-.277,-.091,.946)],ivory,'pelvis',.012)
box('Gear_PouchTab',(-.222,-.105,.937),(.022,.014,.068),coral,'pelvis',.003)
tube('Gear_ThighStrap',[(-.133,0,.88),(-.136,0,.85)],[ (.114,.119),(.112,.117)],strap,'thigh.R',n=12)

# Right-side ceramic pauldron: sculpted shell with layered edge and coral inlay.
outline=[(-.144,-.055,1.538),(-.196,-.126,1.585),(-.296,-.124,1.585),(-.359,-.078,1.533),(-.365,.044,1.48),(-.316,.115,1.49),(-.223,.118,1.557),(-.148,.06,1.572)]
mesh('Armor_RightPauldron',outline+[(-.218,-.028,1.607),(-.294,-.028,1.608),(-.285,.055,1.593)],[(0,1,8),(1,2,9,8),(2,3,9),(3,4,9),(4,5,10,9),(5,6,10),(6,7,8,10),(7,0,8),(8,9,10),tuple(reversed(range(8)))],[ivory,ivoryshade],'upper_arm.R',True)
panel('Armor_RightRim',[(-.198,-.131,1.57),(-.301,-.13,1.569),(-.366,-.085,1.51),(-.373,-.071,1.47),(-.33,-.088,1.463),(-.286,-.14,1.52),(-.205,-.142,1.526)],ivory,'upper_arm.R',.025,(-.309,-.148,1.525))
panel('Armor_RightLowerPlate',[(-.285,-.091,1.463),(-.371,-.071,1.452),(-.389,-.06,1.409),(-.307,-.092,1.414)],ivory,'upper_arm.R',.032,(-.339,-.117,1.437))
panel('Armor_EmberInlay',[(-.31,-.112,1.58),(-.344,-.082,1.549),(-.337,-.061,1.577),(-.303,-.086,1.608)],coral,'upper_arm.R',.004)

# Thin geometric light channels sit on the front of the right forearm.
def arm_surface(points):
    out=[]
    for x,z in points:
        t=max(0,min(1,(1.23-z)/.235));cx=-.375-.12*t;cy=-.005-.01*t
        r=.056+.004*t/.4 if t<.4 else .06-.024*(t-.4)/.6
        y=cy-math.sqrt(max(.00015,r*r-(x-cx)**2))-.003
        out.append((x,y,z))
    return out
line('FX_ArmBranchA',arm_surface([(-.411,1.158),(-.433,1.129),(-.451,1.083),(-.474,1.027)]),.0034,glow,'forearm.R')
line('FX_ArmBranchB',arm_surface([(-.411,1.158),(-.46,1.119),(-.451,1.083),(-.421,1.102),(-.433,1.129)]),.003,glow,'forearm.R')
line('FX_ArmBranchC',arm_surface([(-.451,1.083),(-.486,1.058)]),.0026,glow,'forearm.R')

# Angular head with explicit jaw, cheek, brow and muzzle planes.
headspec=[(1.633,.034,.048,-.027),(1.65,.055,.063,-.013),(1.685,.070,.076,.0),(1.723,.083,.083,.005),(1.762,.085,.079,.007),(1.798,.079,.077,.011),(1.827,.07,.072,.012),(1.851,.045,.051,.015),(1.86,.016,.023,.016)]
headmesh=rings('Body_Head',[((0,y,z),rx,ry) for z,rx,ry,y in headspec],skin,'head',n=16,facets=False)
# A flatter facial mask supports the eyelids; the back of the cranium stays round.
for i,(z,rx,ry,cy) in enumerate(headspec):
    for j in range(16):
        c=cos(2*pi*j/16)
        if c>0:headmesh.data.vertices[i*16+j].co.y=cy-ry*c**.42
for s in [-1,1]:
    rings('Body_Ear',[((s*.083,.0,1.694),.013,.018),((s*.091,-.003,1.726),.017,.021),((s*.087,0,1.746),.012,.017)],skin,'head',n=8)
    panel('Body_EarInner',[(s*.084,-.018,1.704),(s*.099,-.016,1.724),(s*.086,-.022,1.734)],skinshade,'head',.003)
    # Eye is a narrow almond, upper edge slopes down toward the nose.
    eyepts=[(s*.016,-.0795,1.739),(s*.039,-.0795,1.747),(s*.065,-.065,1.745),(s*.053,-.0745,1.73),(s*.029,-.082,1.731)]
    panel('Face_EyeSocket',[(x,y+.002,z+.001) for x,y,z in eyepts],black,'head',.006)
    center=Vector((s*.04,-.081,1.738))
    panel('Face_EyeWhite',[tuple(center+Vector(((Vector(p)-center).x*.81,(Vector(p)-center).y*.81,(Vector(p)-center).z*.63))+Vector((0,-.002,0))) for p in eyepts],white,'head',.002)
    panel('Face_Iris',[(s*.032,-.0845,1.743),(s*.043,-.084,1.743),(s*.046,-.084,1.734),(s*.037,-.085,1.731),(s*.032,-.085,1.735)],iris,'head',.001)
    line('Face_Pupil',[(s*.038,-.086,1.735),(s*.038,-.086,1.74)],.0025,black,'head')
    panel('Face_Brow',[(s*.014,-.084,1.756),(s*.041,-.081,1.764),(s*.068,-.06,1.756),(s*.065,-.067,1.749),(s*.038,-.086,1.755),(s*.017,-.087,1.747)],hair,'head',.004)
mesh('Face_Nose',[(-.010,-.078,1.75),(.010,-.078,1.75),(-.012,-.09,1.703),(.012,-.09,1.703),(0,-.104,1.709),(0,-.087,1.743),(0,-.092,1.697)],[(0,1,5),(0,5,4,2),(1,3,4,5),(2,4,6),(3,6,4),(0,2,6,3,1)],[skin,skinshade],'head',True)
line('Face_Mouth',[(-.025,-.076,1.684),(-.01,-.078,1.686),(0,-.079,1.684),(.011,-.078,1.686),(.025,-.076,1.684)],.0016,lip,'head')
panel('Face_LowerLip',[(-.016,-.077,1.681),(0,-.079,1.679),(.017,-.077,1.681),(0,-.076,1.676)],skinshade,'head',.002)

# Hair cap, sideburns and individually swept polygon locks.
haircap=rings('Hair_Cap',[((0,.024,1.743),.077,.069),((0,.023,1.795),.09,.085),((0,.024,1.837),.085,.08),((0,.028,1.864),.063,.065),((0,.03,1.877),.02,.024)],hair,'head',n=14)
for j in range(14):haircap.data.vertices[j].co.z+=.04*cos(2*pi*j/14)
def lock(name, points, widths):
    pts=[Vector(p) for p in points];verts=[]
    for i,p in enumerate(pts):
        tangent=(pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)]).normalized()
        u=tangent.cross(Vector((0,1,0))).normalized();v=tangent.cross(u).normalized()
        for a in range(5):verts.append(p+(u*cos(a*2*pi/5)+v*sin(a*2*pi/5)*.52)*widths[i])
    faces=[(i*5+j,i*5+(j+1)%5,(i+1)*5+(j+1)%5,(i+1)*5+j) for i in range(len(pts)-1) for j in range(5)]
    faces += [tuple(reversed(range(5))),tuple((len(pts)-1)*5+j for j in range(5))]
    return mesh(name,verts,faces,[hair,hairlight],'head',True)
for i in range(5):
    x=-.051+i*.031
    lock('Hair_SweptFringe',[(x,-.013,1.827),(x-.015,-.052,1.862+(i%2)*.012),(x-.044,-.08,1.84),(x-.066,-.081,1.773+(i%3)*.015)],[.032,.036,.026,.001])
for i in range(5):
    x=-.051+i*.028;y=.024+(i%2)*.031
    lock('Hair_Crown',[(x,y,1.824),(x-.008,y+.005,1.866),(x-.042,y+.023,1.886+(i%2)*.01),(x-.077,y+.028,1.886+(i%3)*.012)],[.033,.039,.024,.001])
for s in [-1,1]:
    for i in range(3):
        lock('Hair_SideTuft',[(s*.066,.005+i*.026,1.81),(s*.094,.016+i*.028,1.835),(s*(.111+i*.006),.046+i*.028,1.825)],[.026,.022,.001])
    panel('Hair_Sideburn',[(s*.071,-.025,1.794),(s*.085,-.009,1.771),(s*.08,-.018,1.721),(s*.066,-.041,1.757)],hair,'head',.009)

# Head proportions adjusted from the first render against the turnaround.
for o in parts:
    if o.name.startswith(('Body_Head','Body_Ear','Face_','Hair_')):
        for v in o.data.vertices:
            if o.name.startswith(('Face_Eye','Face_Iris','Face_Pupil','Face_Brow')):v.co.y+=.004
            v.co.x*=1.20;v.co.y*=1.10;v.co.z=1.61+(v.co.z-1.633)*1.18

# Long sword is a separate editable and skinned accessory. In rest pose blade points down.
sx=-.552;sy=-.052
blade_outline=[(sx-.031,sy,.849),(sx+.031,sy,.849),(sx+.030,sy,.279),(sx+.016,sy,.162),(sx-.055,sy,.075),(sx-.027,sy,.279)]
panel('Weapon_Blade',blade_outline,steel,'hand.R',.018,(sx+.004,sy-.018,.49))
panel('Weapon_CuttingEdge',[(sx-.031,sy-.003,.845),(sx-.027,sy-.003,.279),(sx-.055,sy-.003,.075),(sx-.037,sy-.021,.283),(sx-.019,sy-.022,.845)],edge,'hand.R',.002)
line('Weapon_EmberEdge',[(sx-.025,sy-.025,.811),(sx-.03,sy-.025,.285),(sx-.051,sy-.011,.104)],.0027,glow,'hand.R')
box('Weapon_Guard',(sx,sy,.855),(.136,.05,.033),ivory,'hand.R',.009)
tube('Weapon_Grip',[(sx,sy,.868),(sx,sy,.99)],[.02,.018],dark,'hand.R',n=8)
for z in [.88,.90,.92,.94,.96,.98]:
    tube('Weapon_Wrap',[(sx,sy,z),(sx,sy,z+.006)],[.0205,.0205],strap,'hand.R',n=8)
box('Weapon_Pommel',(sx,sy,1.002),(.043,.038,.026),ivory,'hand.R',.008)

exec(compile((HERE / 'refine_v3.py').read_text(encoding='utf8'), 'refine_v3.py', 'exec'))
print('GEOMETRY_READY',len(parts),flush=True)

# Join edit-friendly semantic groups; weights survive joins and generated UVs.
groups={}
for o in parts:groups.setdefault(o.name.split('_')[0],[]).append(o)
meshes=[]
for category,objs in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0]
    bpy.ops.object.join();o=bpy.context.object;o.name='EMBER_'+category
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent if hasattr(bpy.ops.mesh,'normals_make_consistent') else None
    bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.016)
    bpy.ops.object.mode_set(mode='OBJECT')
    # Bake triangulation for identical Blender and GLB silhouettes.
    tri=o.modifiers.new('Export triangulation','TRIANGULATE');bpy.ops.object.modifier_apply(modifier=tri.name)
    mod=o.modifiers.new('EMBER / deformation','ARMATURE');mod.object=rig;mod.use_deform_preserve_volume=False
    o.parent=rig;meshes.append(o)
    o['asset_stage']='First-pass stylized character; UV layout is provisional.'

# Keyframe clips are intentionally marked as tests; these are not finished gameplay skills.
def reset_pose():
    for p in rig.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0);p.location=(0,0,0);p.scale=(1,1,1)

def rotate(name,axis,angle):
    p=rig.pose.bones[name];local=p.bone.matrix_local.to_quaternion().inverted() @ Vector(axis)
    p.rotation_quaternion=Quaternion(local,math.radians(angle))

def clip(name,length,fn,step):
    rig.animation_data_create();rig.animation_data.action=None
    reset_pose()
    for frame in sorted(set(list(range(1,length+1,step))+[length])):
        reset_pose();fn((frame-1)/(length-1))
        for p in rig.pose.bones:
            p.keyframe_insert('rotation_quaternion',frame=frame,group=p.name)
            p.keyframe_insert('location',frame=frame,group=p.name)
    a=rig.animation_data.action;a.name=name;a.use_fake_user=True
    return a

def idle(t):
    v=sin(2*pi*t)
    rotate('chest',(1,0,0),1.1*v);rotate('head',(0,0,1),1.2*v)
    for label,s in [('R',-1),('L',1)]:
        rotate('upper_arm.'+label,(0,1,0),s*(10+.8*v))
        rotate('forearm.'+label,(1,0,0),-9-1.4*v)
    for name in ['index','middle','ring','pinky']:
        rotate(name+'_01.R',(1,0,0),35);rotate(name+'_02.R',(1,0,0),45)
    rotate('thumb_01.R',(0,0,1),-22)

def walk(t):
    idle(t);v=sin(2*pi*t)
    for label,phase in [('R',1),('L',-1)]:
        q=v*phase
        rotate('thigh.'+label,(1,0,0),q*23)
        rotate('shin.'+label,(1,0,0),max(0,-q)*38)
        rotate('foot.'+label,(1,0,0),-max(0,-q)*15)
        rotate('upper_arm.'+label,(1,0,0),-q*15)
        rotate('forearm.'+label,(1,0,0),-12-max(0,q)*12)
    rotate('pelvis',(0,0,1),v*3);rotate('chest',(0,0,1),-v*4)
    rig.pose.bones['root'].location.z=.01*(1-cos(4*pi*t))

def rig_test(t):
    v=sin(pi*t)**2
    rotate('chest',(0,0,1),-18*v);rotate('head',(0,0,1),12*v)
    rotate('upper_arm.R',(0,1,0),34*v);rotate('forearm.R',(1,0,0),-65*v)
    rotate('upper_arm.L',(0,1,0),-30*v);rotate('forearm.L',(1,0,0),-50*v)
    rotate('thigh.L',(1,0,0),-26*v);rotate('shin.L',(1,0,0),44*v);rotate('foot.L',(1,0,0),-15*v)

actions=[clip('EMBER_Idle_Loop',91,idle,5),clip('EMBER_Walk_Test_InPlace',31,walk,2),clip('EMBER_Joint_Range_Test',61,rig_test,3)]
rig.animation_data.action=None;reset_pose()
rig['forward']='Blender -Y; glTF +Z';rig['height_m']=1.93
rig['status']='V3 anime face revision; no facial rig; test clips, not finished skill animation.'
rig['root_motion']='All included clips are in place; root motion not authored.'
scene.frame_start=1;scene.frame_end=91;scene.frame_set(1)

# Reference images are packed into .blend and excluded from export/render.
for filename,name,x in [('01_三视图.png','REF / approved turnaround',2.4),('03_独立立绘.png','REF / portrait',-2.4)]:
    p=ROOT/'output'/'aberrant-character-kit-v3'/'烬刃'/filename
    im=bpy.data.images.load(str(p));im.pack()
    o=bpy.data.objects.new(name,None);refs.objects.link(o);o.empty_display_type='IMAGE';o.data=im
    o.empty_display_size=2.5;o.location=(x,.75,1);o.rotation_euler=(pi/2,0,0);o.hide_render=True
refs.hide_viewport=True;refs.hide_render=True

def move_to_stage(o):
    for c in list(o.users_collection):c.objects.unlink(o)
    stage.objects.link(o)

floor_mat=mat('Studio / warm fog','#D0D0C8',.85)
plinth_mat=mat('Studio / mineral charcoal','#313E43',.65)
bpy.ops.mesh.primitive_plane_add(size=2000,location=(0,0,-.061));floor=bpy.context.object;floor.name='Studio_Floor';floor.data.materials.append(floor_mat);move_to_stage(floor)
bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=.85,depth=.06,location=(0,0,-.031));plinth=bpy.context.object;plinth.name='Studio_Plinth';plinth.data.materials.append(plinth_mat);move_to_stage(plinth)
bev=plinth.modifiers.new('Soft rim','BEVEL');bev.width=.016;bev.segments=3
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
def area(name,loc,power,size,color):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color
    o=bpy.data.objects.new(name,d);stage.objects.link(o);o.location=loc;aim(o,(0,0,1))
area('Key / large warm softbox',(-3,-4,5),450,4,(1,.86,.72))
area('Fill / cool front',(3,-2,2.8),260,3,(.73,.86,1))
area('Rim / shoulder separation',(1,3,4),650,3,(1,.80,.61))
world=bpy.data.worlds.new('Studio ambient');scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.34,.39,.43,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.4
camdata=bpy.data.cameras.new('Camera / portrait');camera=bpy.data.objects.new('Camera / portrait',camdata);stage.objects.link(camera);scene.camera=camera
camdata.type='ORTHO';camdata.ortho_scale=2.65;camera.location=(-3.0,-6,2.7);aim(camera,(0,0,1))
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=1400;scene.render.resolution_y=1400;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.render.film_transparent=False

# Save rest-pose source and uncompressed self-contained game export.
bpy.ops.object.select_all(action='DESELECT')
for o in meshes+[rig]:o.select_set(True)
bpy.context.view_layer.objects.active=rig
for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type=='VIEW_3D':
            a.spaces.active.region_3d.view_distance=3.7;a.spaces.active.region_3d.view_location=(0,0,1)
            a.spaces.active.shading.type='MATERIAL'
            a.spaces.active.region_3d.view_rotation=camera.rotation_euler.to_quaternion()
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'EMBER_v3.blend'))
exec(compile((HERE / 'portable_cel.py').read_text(encoding='utf8'), 'portable_cel.py', 'exec'))
saved_materials=prepare_portable_cel()
target=LIB/'exports'/'EMBER_v3.glb'
bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_anim_single_armature=True,export_force_sampling=True,export_skins=True,export_yup=True,export_extras=True,export_materials='EXPORT',export_cameras=False,export_lights=False)

finalize_unlit_glb(target)
restore_editable_materials(saved_materials)

# A targeted structural audit for the actual deliverable geometry.
report={'blender':bpy.app.version_string,'stage':'art_revision_review','meshes':[],'bones':len(armdata.bones),'clips':[], 'limitations':['Face likeness and hair need art review.','Smart-projected UVs; flat color materials, no painted textures.','Joint range / walk clips are tests, not authored skill animations.','No face rig or IK controls; FK skeleton with finger joints.','Not yet integrated into v4 runtime.']}
for o in meshes:
    unweighted=[];badweights=[]
    deform={g.index for g in o.vertex_groups if g.name in armdata.bones and armdata.bones[g.name].use_deform}
    for v in o.data.vertices:
        ws=[g.weight for g in v.groups if g.group in deform]
        if not ws or sum(ws)<.999:unweighted.append(v.index)
        if len(ws)>4:badweights.append(v.index)
    report['meshes'].append({'name':o.name,'vertices':len(o.data.vertices),'triangles':len(o.data.polygons),'uv_layers':len(o.data.uv_layers),'unweighted_vertices':len(unweighted),'over_four_influences':len(badweights),'scale':list(o.scale)})
for a in actions:report['clips'].append({'name':a.name,'frames':list(a.frame_range)})
report['total_triangles']=sum(o['triangles'] for o in report['meshes'])
report['total_vertices']=sum(o['vertices'] for o in report['meshes'])
report['glb_bytes']=target.stat().st_size
(HERE/'model_audit.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf8')
print('EXPORTED',json.dumps(report,ensure_ascii=False),flush=True)

exec(compile((HERE / 'toon_materials.py').read_text(encoding='utf8'), 'toon_materials.py', 'exec'))
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'EMBER_v3.blend'))

if '--no-render' not in sys.argv:
    rig.animation_data.action=actions[0];rig.animation_data.action_slot=actions[0].slots[0];scene.frame_set(1)
    scene.render.filepath=str(PREVIEW/'01_hero.png');bpy.ops.render.render(write_still=True)
    rig.animation_data.action=None;reset_pose();scene.frame_set(1)
    scene.render.resolution_x=900;scene.render.resolution_y=1100;camdata.ortho_scale=2.4
    for name,pos in [('02_front',(0,-6,1.1)),('03_back',(0,6,1.1)),('04_side',(-6,0,1.1))]:
        camera.location=pos;aim(camera,(0,0,.99));scene.render.filepath=str(PREVIEW/(name+'.png'));bpy.ops.render.render(write_still=True)
    rig.animation_data.action=actions[2];rig.animation_data.action_slot=actions[2].slots[0];scene.frame_set(31)
    camera.location=(-3,-6,2.7);aim(camera,(0,0,1));camdata.ortho_scale=2.65
    scene.render.filepath=str(PREVIEW/'05_joint_test.png');bpy.ops.render.render(write_still=True)
print('EMBER_BUILD_COMPLETE',flush=True)





