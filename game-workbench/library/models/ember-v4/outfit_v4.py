"""Tailored short jacket, rolled sleeves and intentional cloth fold profiles."""
for o in list(parts):
    if o.name.startswith(('Jacket_','Body_FittedInnerPanel','Body_Undershirt','Gear_ChestStrap','Pants_')):delete_part(o)

def recolor(m,h):
    rgb=tuple(linear(int(h[i:i+2],16)/255) for i in (0,2,4));m.diffuse_color=(*rgb,1)
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*rgb,1);bs.inputs['Specular IOR Level'].default_value=.1
recolor(coral,'E47350');recolor(coraldark,'AF4938');recolor(corallight,'F28A62')
recolor(teal,'425C58');recolor(teallight,'607773');recolor(skin,'EAB394')
recolor(strap,'67616F');recolor(dark,'34343D')

def smooth(o):
    for p in o.data.polygons:p.use_smooth=True
    return o
def thicken(o,width=.005):
    bpy.context.view_layer.objects.active=o
    m=o.modifiers.new('Cloth thickness','SOLIDIFY');m.thickness=width;m.offset=-1
    bpy.ops.object.modifier_apply(modifier=m.name)
    return o

inner=smooth(rings('Body_FittedUndershirt',[((0,.01,z),rx,ry) for z,rx,ry in [(1.05,.148,.098),(1.16,.157,.107),(1.32,.184,.123),(1.45,.213,.128),(1.51,.178,.112),(1.558,.064,.054)]],dark,torso_weight,n=40,facets=False))
innerbvh=BVHTree.FromPolygons([v.co for v in inner.data.vertices],[p.vertices[:] for p in inner.data.polygons])

# Open front, cropped above the belt. Broad continuous panels create a clean silhouette.
specs=[(1.185,.188,.126,.059),(1.207,.180,.125,.057),(1.24,.171,.121,.056),(1.31,.182,.130,.058),
       (1.39,.201,.140,.066),(1.47,.223,.145,.074),(1.515,.229,.129,.073),(1.545,.182,.111,.065),(1.565,.081,.068,.055)]
vs=[];n=24
for k,(z,rx,ry,opening) in enumerate(specs):
    start=math.asin(opening/rx)
    for j in range(n):
        a=start+(2*pi-2*start)*j/(n-1)
        x=rx*sin(a);y=.008-ry*cos(a)
        # Two tailored vertical side creases, deliberately sparse.
        fold=.0038*sin(3*a+.4)*math.exp(-((z-1.33)/.17)**2)
        vs.append((x+fold*sin(a),y-fold*cos(a),z+.004*sin(a)*sin(pi*k/(len(specs)-1))))
shell=smooth(mesh('Jacket_OpenTailoredShell',vs,[(k*n+j,k*n+j+1,(k+1)*n+j+1,(k+1)*n+j) for k in range(len(specs)-1) for j in range(n-1)],coral,torso_weight))
thicken(shell,.007)
for p in shell.data.polygons:p.use_smooth=False
coatbvh=BVHTree.FromPolygons([v.co for v in shell.data.vertices],[p.vertices[:] for p in shell.data.polygons])

# Structured high collar and two-piece lapel, with an actual fold thickness.
for s,label in [(-1,'R'),(1,'L')]:
    panel('Jacket_CollarWing.'+label,[(s*.057,-.086,1.539),(s*.076,-.076,1.623),(s*.145,-.043,1.640),(s*.173,-.078,1.616),(s*.106,-.142,1.494)],corallight,'chest',.008,(s*.096,-.119,1.588))
    panel('Jacket_FoldedLapel.'+label,[(s*.083,-.140,1.530),(s*.156,-.131,1.492),(s*.097,-.158,1.438),(s*.067,-.144,1.482)],coral,'chest',.006,(s*.107,-.169,1.488))
    line('Jacket_LapelStitch.'+label,[(s*.077,-.079,1.614),(s*.096,-.122,1.580),(s*.106,-.146,1.509)],.0011,coraldark,'chest')
    # Hem edge follows the curved bottom; visible pale zipper tape frames the opening.
    pts=[]
    for z,rx,ry,opening in specs[:6]:
        a=math.asin(opening/rx);pts.append((s*opening,.008-ry*cos(a)-.003,z))
    line('Jacket_ZipperTape.'+label,pts,.0032,ivoryshade,torso_weight)
    line('Jacket_HemSeam.'+label,[(s*.061,-.114,1.194),(s*.123,-.090,1.194),(s*.178,-.028,1.198)],.0021,corallight,torso_weight)

# Back collar follows neck and meets both wings.
cv=[];cn=40
for z,rx,ry in [(1.548,.097,.087),(1.592,.096,.082),(1.629,.107,.086)]:
    for j in range(cn):
        a=.93+(2*pi-1.86)*j/(cn-1);cv.append((rx*sin(a),.017-ry*cos(a),z))
thicken(smooth(mesh('Jacket_BackCollar',cv,[(k*cn+j,k*cn+j+1,(k+1)*cn+j+1,(k+1)*cn+j) for k in range(2) for j in range(cn-1)],coral,'chest')),.006)

for s,label in [(-1,'R'),(1,'L')]:
    sh,el,wr=map(Vector,limbs[label][3:6]);end=el.lerp(wr,.20)
    axis=(end-sh).normalized();u=Vector((0,-1,0));v=axis.cross(u).normalized()
    profiles=[(0,.086),(.12,.102),(.27,.101),(.44,.091),(.58,.084),(.66,.081),(.72,.101),(.78,.096),(.84,.079),(.9,.095),(1,.093)]
    sv=[];ns=12
    for t,r in profiles:
        center=sh.lerp(end,t)
        for j in range(ns):
            a=2*pi*j/ns+.12*t
            # A diagonal compression fold wraps around the bent elbow.
            rr=r+.006*sin(2*a+t*3)*sin(pi*t)
            if t>.6:rr=.084+(r-.084)*(.3+.7*max(0,cos(a-.5)))
            axial=.025*sin(a+.7)*math.exp(-((t-.75)/.2)**2)
            sv.append(center+axis*axial+u*cos(a)*rr+v*sin(a)*rr*.94)
    weight=lambda p,label=label:blend_z(p.z,1.20,1.30,'forearm.'+label,'upper_arm.'+label)
    sleeve=smooth(mesh('Jacket_FoldedSleeve.'+label,sv,[(k*ns+j,k*ns+(j+1)%ns,(k+1)*ns+(j+1)%ns,(k+1)*ns+j) for k in range(len(profiles)-1) for j in range(ns)],coral,weight));thicken(sleeve,.005)
    for p in sleeve.data.polygons:p.use_smooth=False
    # Folded cuff has thickness and an uneven rolled edge.
    cuffpts=[end-axis*.014,end,end+axis*.022]
    cuff=tube('Jacket_RolledCuff.'+label,cuffpts,[(.099,.095),(.103,.098),(.095,.092)],corallight,'forearm.'+label,n=10,facets=False)
    # Dark narrow seam lies on the rear underside of the roll.
    for side in [-1,1]:
        seampts=[]
        for a in [pi*.1+side*.4+i*.05 for i in range(8)]:seampts.append(end+axis*.014+u*cos(a)*.099+v*sin(a)*.097)
        line('Jacket_CuffFold.'+label,seampts,.0012,coraldark,'forearm.'+label)

panel('Jacket_AsymmetricTail',[(-.051,-.120,1.205),(-.169,-.083,1.194),(-.191,-.105,1.025),(-.076,-.149,1.065)],coral,'pelvis',.008,(-.128,-.147,1.141))
for s in [-1,1]:
    panel('Jacket_BackSplitTail',[(s*.014,.134,1.203),(s*.164,.077,1.200),(s*.183,.086,1.140),(s*.028,.143,1.151)],coral,'pelvis',.006,(s*.096,.145,1.183))

# Harness follows the fitted shirt, passing beneath the open lapels.
strapv=[]
for j in range(31):
    t=j/30;x=-.105+.265*t;z=1.395+.105*min(1,t/.72)
    for zz in [z-.016,z+.016]:
        hit=innerbvh.ray_cast(Vector((x,-.5,zz)),Vector((0,1,0)))
        y=hit[0].y-.006 if hit[0] is not None else -.13
        strapv.append((x,y,zz))
mesh('Gear_DiagonalHarness',strapv,[(2*j,2*j+1,2*j+3,2*j+2) for j in range(30)],strap,'chest')

# Room through the thigh, taper below the calf, with a few compression folds.
hips=rings('Pants_WaistVolume',[((0,.009,z),rx,ry) for z,rx,ry in [(1.105,.161,.108),(1.06,.184,.117),(1.0,.196,.113),(.965,.174,.076),(.921,.107,.025)]],teal,'pelvis',n=20,facets=False)
for s,label in [(-1,'R'),(1,'L')]:
    profiles=[(1.04,.105,.103,.107),(.96,.121,.111,.113),(.89,.128,.113,.111),(.79,.141,.108,.105),(.70,.146,.095,.095),(.635,.148,.081,.085),(.60,.150,.083,.084),(.55,.153,.078,.083),(.51,.155,.090,.087),(.46,.158,.082,.083),(.39,.161,.082,.080),(.33,.162,.073,.073),(.295,.162,.079,.072),(.26,.162,.060,.060),(.225,.161,.055,.054)]
    lv=[];nl=12
    for z,cx,rx,ry in profiles:
        for j in range(nl):
            a=2*pi*j/nl
            front=max(0,cos(a));fold=.0045*sin(a*2+.8)*front*math.exp(-((z-.55)/.18)**2)
            zz=z+.012*sin(a+.5)*math.exp(-((z-.50)/.10)**2)+.009*sin(a-.6)*math.exp(-((z-.29)/.045)**2)
            lv.append((s*cx+(rx+fold)*sin(a),.005-(ry+fold)*cos(a),zz))
    weight=lambda p,label=label:blend_z(p.z,.54,.67,'shin.'+label,'thigh.'+label)
    faces=[(k*nl+j,k*nl+(j+1)%nl,(k+1)*nl+(j+1)%nl,(k+1)*nl+j) for k in range(len(profiles)-1) for j in range(nl)]
    faces.extend([tuple(reversed(range(nl))),tuple((len(profiles)-1)*nl+j for j in range(nl))])
    leg=smooth(mesh('Pants_TailoredLeg.'+label,lv,faces,teal,weight))
    # Upper pocket slash and one outer seam, kept subordinate to the silhouette.
    line('Pants_PocketWelt.'+label,[(s*.145,-.113,1.047),(s*.193,-.095,.986),(s*.208,-.077,.956)],.0023,teallight,'thigh.'+label)
    line('Pants_SideSeam.'+label,[(s*.226,.006,.94),(s*.246,.005,.80),(s*.225,.004,.64),(s*.237,.006,.46),(s*.223,.006,.32)],.0013,teallight,weight)
smooth(hips)
pantsbody=unify('Pants_TailoredContinuous',[o for o in parts if o.name.startswith(('Pants_WaistVolume','Pants_TailoredLeg'))],.0045,.22,teal)

def fold_relief(name,bvh,outline,peak,depth,material,weights):
    vertices=[]
    for x,z in outline:
        hit=bvh.ray_cast(Vector((x,-.6,z)),Vector((0,1,0)))
        if hit[0] is None:return
        vertices.append((x,hit[0].y-.0008,z))
    x,z=peak;hit=bvh.ray_cast(Vector((x,-.6,z)),Vector((0,1,0)))
    if hit[0] is None:return
    vertices.append((x,hit[0].y-depth,z));m=len(outline)
    mesh(name,vertices,[(j,(j+1)%m,m) for j in range(m)],material,weights)

pantsbvh=BVHTree.FromPolygons([v.co for v in pantsbody.data.vertices],[p.vertices[:] for p in pantsbody.data.polygons])
for s,label in [(-1,'R'),(1,'L')]:
    weight=lambda p,label=label:blend_z(p.z,.54,.67,'shin.'+label,'thigh.'+label)
    fold_relief('Pants_ThighFold.'+label,pantsbvh,[(s*.085,.955),(s*.202,.897),(s*.213,.795),(s*.126,.849)],(s*.152,.892),.010,teal,weight)
    fold_relief('Pants_ShinFold.'+label,pantsbvh,[(s*.113,.477),(s*.212,.415),(s*.200,.326),(s*.128,.378)],(s*.173,.408),.008,teal,weight)
    fold_relief('Jacket_ChestFold.'+label,coatbvh,[(s*.123,1.433),(s*.187,1.446),(s*.165,1.341),(s*.102,1.300)],(s*.148,1.389),.008,coral,torso_weight)

for o in parts:
    if o.name.startswith(('Gear_Belt','Gear_Buckle')):
        for v in o.data.vertices:v.co.z+=v.co.x*.16
    if o.name.startswith('Armor_Right'):
        # A more compact ceramic pauldron follows the shoulder instead of floating wide.
        for v in o.data.vertices:
            v.co.x=-.247+(v.co.x+.247)*.93;v.co.y*=.96
    if o.name.startswith('Boot_Strap'):
        for v in o.data.vertices:v.co.z+=.025*(v.co.x-(.16 if v.co.x>0 else -.16))/.06
print('V4_TAILORING_COMPLETE',flush=True)
