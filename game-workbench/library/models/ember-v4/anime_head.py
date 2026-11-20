"""Original stylized head: authored silhouette, graphic eyes and simplified nose/mouth.
Coordinates are rig space, front is -Y. No realistic base head is used.
"""
from mathutils.geometry import tessellate_polygon

skin=mat('V4 Skin / sculpted planes','#EAB394',.9)
skinshade=mat('V4 Skin / warm shadow','#D78F70',1)
earinner=mat('V4 Ear / inner plane','#C77B60',1)
ink=mat('V4 Ink / warm charcoal','#25232C',1)
mouthink=mat('V4 Mouth / muted sienna','#985A4E',1)
eye_white=mat('V4 Eyes / ivory','#FFF6E3',1,emission=.22)
eye_amber=mat('V4 Iris / hazel','#625346',1,emission=.15)
eye_gold=mat('V4 Iris / lower amber','#AD8C60',1,emission=.2)
eye_glint=mat('V4 Eye / catchlight','#FFFFFF',1,emission=.75)
hair=mat('V4 Hair / warm charcoal','#443C48',.9)
hairlight=mat('V4 Hair / ridge plane','#554B59',.9)
hairdeep=mat('V4 Hair / dark plane','#292530',1)

# Cross sections specify a deliberate jaw/chin silhouette, not human anatomy.
# z, half-width, front depth, back depth, section center y
sections=[
 (1.637,.028,.062,.028,-.010),
 (1.646,.046,.076,.043,-.002),
 (1.665,.065,.085,.065,.003),
 (1.695,.077,.087,.082,.008),
 (1.725,.088,.091,.096,.012),
 (1.762,.093,.094,.102,.015),
 (1.800,.091,.096,.106,.016),
 (1.835,.092,.096,.106,.018),
 (1.866,.087,.092,.100,.021),
 (1.892,.071,.076,.085,.024),
 (1.912,.043,.049,.052,.024),
 (1.920,.008,.010,.010,.024),
]
def section_at(z):
    for k,(a,b) in enumerate(zip(sections,sections[1:])):
        if z<=b[0]:
            t=max(0,min(1,(z-a[0])/(b[0]-a[0])))
            before=sections[max(0,k-1)];after=sections[min(len(sections)-1,k+2)]
            dz=b[0]-a[0]
            vals=[]
            for i in range(1,5):
                m0=(b[i]-before[i])/(b[0]-before[0])*dz
                m1=(after[i]-a[i])/(after[0]-a[0])*dz
                vals.append((2*t**3-3*t*t+1)*a[i]+(t**3-2*t*t+t)*m0+(-2*t**3+3*t*t)*b[i]+(t**3-t*t)*m1)
            return vals
    return sections[-1][1:]

def nose_depth(x,z):
    bridge=.017*math.exp(-(x/.012)**2-((z-1.752)/.030)**4)
    tip=.021*math.exp(-(x/.015)**2-((z-1.722)/.012)**2)
    wings=.003*math.exp(-((abs(x)-.013)/.005)**2-((z-1.716)/.006)**2)
    return bridge+tip+wings

def face_y(x,z):
    rx,front,back,cy=section_at(z)
    u=min(.9999,abs(x)/rx)
    y=cy-front*(1-u**2.65)**(1/2.65)
    socket=.008*math.exp(-((abs(x)-.046)/.027)**4-((z-1.768)/.015)**4)
    brow=.006*math.exp(-((abs(x)-.045)/.031)**4-((z-1.790)/.009)**2)
    cheek=.006*math.exp(-((abs(x)-.061)/.026)**4-((z-1.737)/.017)**2)
    muzzle=.004*math.exp(-(x/.035)**4-((z-1.688)/.016)**4)
    chin=.005*math.exp(-(x/.039)**4-((z-1.657)/.010)**2)
    lowerlip=.0025*math.exp(-(x/.022)**4-((z-1.684)/.0038)**2)
    return y-nose_depth(x,z)+socket-brow-cheek-muzzle-chin-lowerlip

def eye_y(x,z):
    # Convex cornea beneath a modeled upper/lower lid, not a flat decal.
    cx=.046;cz=1.767
    dome=max(0,1-((abs(x)-cx)/.031)**2-((z-cz)/.020)**2)
    return face_y(x,z)-.006*dome

# Dense enough around the face for continuous silhouettes; shape remains intentionally simple.
zs=sorted(set([s[0] for s in sections]+[1.637+i*.0025 for i in range(114)]))
zs=[z for z in zs if z<=1.920]
nt=96;vs=[]
for z in zs:
    rx,front,back,cy=section_at(z)
    for j in range(nt):
        a=2*pi*j/nt;x=rx*sin(a)
        y=face_y(x,z) if cos(a)>=0 else cy-back*cos(a)
        vs.append((x,y,z))
fs=[(k*nt+j,k*nt+(j+1)%nt,(k+1)*nt+(j+1)%nt,(k+1)*nt+j) for k in range(len(zs)-1) for j in range(nt)]
fs.extend([tuple(reversed(range(nt))),tuple((len(zs)-1)*nt+j for j in range(nt))])
head=mesh('Body_AnimeHead',vs,fs,skin,'head')
for p in head.data.polygons:p.use_smooth=True

neck=rings('Body_AnimeNeck',[
 ((0,.018,1.545),.058,.052),((0,.020,1.585),.052,.047),
 ((0,.025,1.624),.050,.046),((0,.028,1.675),.055,.054)
],skin,lambda p:blend_z(p.z,1.57,1.66,'neck','head'),n=32,facets=False)
for p in neck.data.polygons:p.use_smooth=True

def patch(name,outline,material,offset=.0015,surface=None):
    """Tessellated graphic decal with real geometry hugging the curved face."""
    surface=surface or face_y
    v2=[Vector((x,z,0)) for x,z in outline]
    tris=tessellate_polygon([v2]);verts=[];faces=[]
    for ids in tris:
        tri=[v2[i] for i in ids]
        # Subdivide each triangle so graphic features follow the face in profile.
        start=len(verts);n=4;idx={}
        for i in range(n+1):
            for j in range(n+1-i):
                p=tri[0]+(tri[1]-tri[0])*i/n+(tri[2]-tri[0])*j/n
                idx[i,j]=len(verts);verts.append((p.x,surface(p.x,p.y)-offset,p.y))
        for i in range(n):
            for j in range(n-i):
                faces.append((idx[i,j],idx[i+1,j],idx[i,j+1]))
                if j<n-i-1:faces.append((idx[i+1,j],idx[i+1,j+1],idx[i,j+1]))
    o=mesh(name,verts,faces,material,'head')
    for p in o.data.polygons:p.use_smooth=True
    return o

def graphic_line(name,coords,radius,material,offset=.003,surface=None):
    # Tapered ink ribbon, not a rounded lip or a tube.
    surface=surface or face_y;verts=[]
    for i,(x,z) in enumerate(coords):
        w=radius*(.3+.7*sin(pi*i/(len(coords)-1))**.4)
        for zz in [z-w,z+w]:verts.append((x,surface(x,zz)-offset,zz))
    return mesh(name,verts,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(coords)-1)],material,'head')

def eye_limits(x):
    t=max(0,min(1,(x-.018)/.057))
    a=sin(pi*t)**.9
    return (1.760+.006*t-.008*a,1.760+.006*t+.009*a)

for s,label in [(-1,'R'),(1,'L')]:
    # Almond white: larger iris, angled outer corner, deliberate dark upper lid.
    outline=[]
    for i in range(25):
        x=.018+.057*i/24;lo,hi=eye_limits(x);outline.append((s*x,hi))
    for i in range(24,-1,-1):
        x=.018+.057*i/24;lo,hi=eye_limits(x);outline.append((s*x,lo))
    patch('Face_AnimeWhite.'+label,outline,eye_white,.0014,eye_y)
    for ring,rx,rz,material in [('Iris',.0102,.0118,eye_amber),('Pupil',.0047,.0067,ink)]:
        ov=[]
        for j in range(64):
            a=2*pi*j/64;x=.0445+rx*cos(a);z=1.767+rz*sin(a)
            lo,hi=eye_limits(x);z=max(lo+.0005,min(hi-.0005,z))
            ov.append((s*x,z))
        patch('Face_'+ring+'.'+label,ov,material,.0022 if ring=='Iris' else .0029,eye_y)
    ov=[(s*(.0445+.007*cos(a)),1.759+.003*sin(a)) for a in [pi+pi*j/24 for j in range(25)]]
    patch('Face_IrisGold.'+label,ov,eye_gold,.0031,eye_y)
    for cx,cz,r in [(.041,1.770,.0023),(.049,1.758,.0008)]:
        ov=[(s*(cx+r*cos(2*pi*j/24)),cz+r*sin(2*pi*j/24)) for j in range(24)]
        patch('Face_Glint.'+label,ov,eye_glint,.0038,eye_y)
    top=[];bottom=[]
    for j in range(33):
        x=.018+.059*j/32;lo,hi=eye_limits(x)
        z=hi+(max(0,x-.075)*.5)
        top.append((s*x,z))
        if j>=4:bottom.append((s*x,lo))
    # Skin lid supports the graphic lash; ridge remains visible in profile.
    graphic_line('Face_UpperLid.'+label,[(x,z+.0014) for x,z in top],.0020,skinshade,.0024,eye_y)
    graphic_line('Face_UpperInk.'+label,top,.00095,ink,.0044,eye_y)
    graphic_line('Face_LowerLid.'+label,[(x,z-.001) for x,z in bottom],.0015,skin,.0018,eye_y)
    graphic_line('Face_LowerInk.'+label,bottom,.00035,mouthink,.0039,eye_y)
    # Concentrated, slightly asymmetric brow pressure follows the portrait.
    brow=[(.017,1.786),(.024,1.7845),(.056,1.795),(.079,1.792),(.065,1.799),(.047,1.801),(.020,1.793)]
    patch('Face_AnimeBrow.'+label,[(s*x,z-.002-.0015*max(0,1-(x-.017)/.03)+(.0013 if s<0 else -.001)*((x-.016)/.065)) for x,z in brow],hairdeep,.0025)
    # Simple outer and inner ear forms, with one graphic inner notch.
    outline=[(s*.091,-.010,1.778),(s*.107,-.007,1.780),(s*.118,-.005,1.766),
             (s*.115,-.006,1.738),(s*.102,-.008,1.720),(s*.089,-.010,1.727)]
    ear=panel('Body_AnimeEar.'+label,outline,skin,'head',.020,ridge=(s*.103,-.019,1.751))
    inner=panel('Face_EarPlane.'+label,[(s*.099,-.021,1.767),(s*.109,-.021,1.766),(s*.109,-.023,1.749),(s*.101,-.023,1.738)],skinshade,'head',.002)

graphic_line('Face_MouthInk',[(-.025+i*.051/32,1.688+.0012*math.exp(-((i/32-.45)/.15)**2)+.0018*i/32) for i in range(33)],.00065,mouthink,.0015)
graphic_line('Face_LowerLipAccent',[(-.015+i*.032/16,1.683-.0014*sin(pi*i/16)) for i in range(17)],.00055,skinshade,.001)
for side in [-1,1]:
    graphic_line('Face_NoseWing',[(side*.010,1.716),(side*.014,1.7148),(side*.017,1.716)],.00035,mouthink,.001)

exec(compile((HERE / 'hair_v4.py').read_text(encoding='utf8'), 'hair_v4.py', 'exec'))

# A shorter lower face and seated neck support the animated proportions.
for o in parts:
    if o.name.startswith(('Body_AnimeHead','Body_AnimeEar','Face_','Hair_Anime')):
        for v in o.data.vertices:
            if v.co.z<1.76:v.co.z=1.76+(v.co.z-1.76)*.92
            v.co.z-=.015
    elif o.name=='Body_AnimeNeck':
        for v in o.data.vertices:v.co.z-=.015*max(0,min(1,(v.co.z-1.56)/.07))

# Matte graphic palette: no skin subsurface or physically shiny hair.
for m in [skin,skinshade,earinner,ink,mouthink,hair,hairlight,hairdeep,eye_white,eye_amber]:
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Subsurface Weight'].default_value=0
    bs.inputs['Specular IOR Level'].default_value=0
    if m not in [eye_white,eye_amber]:
        bs.inputs['Emission Color'].default_value=m.diffuse_color
        bs.inputs['Emission Strength'].default_value=.13
print('ANIME_HEAD_BUILT',len(head.data.vertices),flush=True)


