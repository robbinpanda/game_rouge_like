"""Compact overlapping locks following the original swept, broken silhouette."""
hv=[];H=20;N=64
for k in range(H):
    t=k/(H-1)
    for j in range(N):
        a=2*pi*j/N
        bottom=1.770+.073*max(0,cos(a))-.009*max(0,-cos(a))+.006*sin(3*a)
        z=bottom+(1.924-bottom)*sin(t*pi/2)
        rx,fr,bk,cy=section_at(min(z,1.919));x=rx*sin(a)
        y=face_y(x,min(z,1.919)) if cos(a)>=0 else cy-bk*cos(a)
        hv.append((x*1.055,cy+(y-cy)*1.055,z+.003))
cap=mesh('Hair_AnimeCap',hv,[(k*N+j,k*N+(j+1)%N,(k+1)*N+(j+1)%N,(k+1)*N+j) for k in range(H-1) for j in range(N)],hair,'head')
bm=bmesh.new();bm.from_mesh(cap.data);bmesh.ops.holes_fill(bm,edges=[e for e in bm.edges if e.is_boundary],sides=0);bm.to_mesh(cap.data);bm.free()
for p in cap.data.polygons:p.use_smooth=True

def natural_lock(name,control,width,depth,twist=0):
    cps=[Vector(v) for v in control];verts=[];steps=15;K=8
    def at(t):return (1-t)**3*cps[0]+3*(1-t)**2*t*cps[1]+3*(1-t)*t*t*cps[2]+t**3*cps[3]
    for k in range(steps):
        t=k/(steps-1);pos=at(t)
        tangent=(at(min(1,t+.004))-at(max(0,t-.004))).normalized()
        radial=(pos-Vector((0,.022,1.80))).normalized()
        u=tangent.cross(radial).normalized();v=u.cross(tangent).normalized()
        w=width*(.82+.38*sin(pi*t))*(1-t)**.72 if k<steps-1 else .00025
        for j in range(K):
            a=2*pi*j/K+twist*t
            verts.append(pos+u*cos(a)*w+v*sin(a)*depth*(w/width))
    faces=[(k*K+j,k*K+(j+1)%K,(k+1)*K+(j+1)%K,(k+1)*K+j) for k in range(steps-1) for j in range(K)]
    faces.extend([tuple(reversed(range(K))),tuple((steps-1)*K+j for j in range(K))])
    o=mesh(name,verts,faces,[hair,hairlight,hairdeep],'head')
    for p in o.data.polygons:
        j=p.index%K;p.material_index=1 if j in (0,1) else (2 if j in (4,5) else 0)
        p.use_smooth=True
    return o

# Broad rooted masses overlap so no individual arch floats above a bald cap.
locks=[
 ([(.055,-.002,1.871),(.048,-.065,1.955),(-.004,-.104,1.954),(-.018,-.113,1.805)],.035,.024,.16),
 ([(.040,.015,1.890),(.003,-.015,1.958),(-.067,-.055,1.936),(-.109,-.080,1.861)],.039,.026,-.12),
 ([(.030,.045,1.890),(-.018,.022,1.955),(-.088,-.002,1.937),(-.137,-.035,1.905)],.036,.024,-.10),
 ([(.016,.073,1.871),(-.025,.067,1.937),(-.097,.041,1.924),(-.140,.025,1.895)],.038,.025,.13),
 ([(.014,.101,1.848),(-.031,.118,1.906),(-.107,.105,1.899),(-.141,.072,1.866)],.033,.022,.12),
 ([(-.034,-.027,1.879),(-.064,-.064,1.919),(-.096,-.091,1.875),(-.092,-.087,1.795)],.026,.019,.13),
 ([(.070,-.010,1.861),(.074,-.054,1.912),(.056,-.094,1.889),(.056,-.104,1.823)],.029,.020,-.12),
 ([(.080,.026,1.840),(.104,-.013,1.881),(.106,-.049,1.853),(.085,-.048,1.768)],.024,.019,-.16),
 ([(.076,.064,1.859),(.116,.040,1.905),(.123,-.001,1.874),(.131,-.005,1.844)],.027,.021,.16),
 ([(-.076,.012,1.827),(-.113,-.005,1.870),(-.125,-.038,1.837),(-.102,-.039,1.754)],.027,.018,.13),
]
for i,(p,w,d,tw) in enumerate(locks):natural_lock('Hair_AnimePrimary_%02d'%i,p,w,d,tw)

# Shorter secondary locks interleave along the side/back, in a shared sweep.
rng=random.Random(811)
for tier in range(2):
    for j in range(8):
        a=1.30+(2*pi-2.60)*j/7+rng.uniform(-.06,.06)
        z=1.837-tier*.041+rng.uniform(-.009,.009)
        rr=.091 if tier==0 else .089
        root=Vector((rr*sin(a),.022-.105*cos(a),z))
        radial=Vector((sin(a),-cos(a),.12))
        sweep=Vector((-.018,.040,-.015-tier*.009))
        p1=root+radial*.008+Vector((-.004,.013,.015))
        p2=root+radial*.016+sweep*.7+Vector((0,0,.008))
        tip=root+radial*rng.uniform(.018,.026)+sweep
        natural_lock('Hair_AnimeSecondary_%02d_%02d'%(tier,j),[root,p1,p2,tip],rng.uniform(.024,.030),.014,rng.uniform(-.22,.22))

# Two loose forelock tips break the edge without hiding the eyebrows.
natural_lock('Hair_AnimeFringeB',[(.019,-.078,1.887),(.017,-.105,1.895),(.005,-.111,1.862),(.012,-.106,1.838)],.015,.012,-.2)

# Fuse roots into one sculpted hair mass; the long tips retain their silhouette.
unify('Hair_AnimeSculptedSweep',[o for o in parts if o.name.startswith('Hair_Anime')],.00165,.12,hair)
