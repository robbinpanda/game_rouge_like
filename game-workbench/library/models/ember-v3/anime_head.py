"""Original stylized head: authored silhouette, graphic eyes and simplified nose/mouth.
Coordinates are rig space, front is -Y. No realistic base head is used.
"""
from mathutils.geometry import tessellate_polygon

skin=mat('V3 Skin / peach flat','#F3BF96',.95)
skinshade=mat('V3 Skin / warm shadow','#D78F70',1)
earinner=mat('V3 Ear / inner plane','#C77B60',1)
ink=mat('V3 Ink / warm charcoal','#25232C',1)
mouthink=mat('V3 Mouth / muted sienna','#985A4E',1)
eye_white=mat('V3 Eyes / ivory','#FFF6E3',1,emission=.22)
eye_amber=mat('V3 Iris / amber','#B66B32',1,emission=.15)
eye_gold=mat('V3 Iris / lower amber','#F1BC66',1,emission=.2)
eye_glint=mat('V3 Eye / catchlight','#FFFFFF',1,emission=.75)
hair=mat('V3 Hair / ink blue','#252936',1)
hairlight=mat('V3 Hair / ridge plane','#414858',1)
hairdeep=mat('V3 Hair / dark plane','#191F2B',1)

# Cross sections specify a deliberate jaw/chin silhouette, not human anatomy.
# z, half-width, front depth, back depth, section center y
sections=[
 (1.637,.022,.058,.028,-.012),
 (1.646,.041,.073,.043,-.004),
 (1.665,.062,.082,.065,.002),
 (1.695,.080,.088,.082,.008),
 (1.725,.091,.092,.096,.012),
 (1.762,.096,.096,.105,.015),
 (1.800,.098,.099,.108,.016),
 (1.835,.097,.099,.108,.018),
 (1.866,.091,.094,.102,.021),
 (1.892,.074,.078,.087,.024),
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
    # Simple narrow bridge and triangular tip. No nostrils, philtrum or lip anatomy.
    ridge=max(0,1-abs(z-1.744)/.035)*max(0,1-abs(x)/.009)*.010
    tip=max(0,1-abs(z-1.727)/.014)*max(0,1-abs(x)/.012)*.020
    return max(ridge,tip)

def face_y(x,z):
    rx,front,back,cy=section_at(z)
    u=min(.9999,abs(x)/rx)
    # A squarer front gives broad cheek planes instead of a round doll's face.
    y=cy-front*(1-u**3.3)**(1/3.3)
    socket=.0035*math.exp(-((abs(x)-.049)/.028)**4-((z-1.769)/.021)**4)
    return y-nose_depth(x,z)+socket

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

def patch(name,outline,material,offset=.0015):
    """Tessellated graphic decal with real geometry hugging the curved face."""
    v2=[Vector((x,z,0)) for x,z in outline]
    tris=tessellate_polygon([v2]);verts=[];faces=[]
    for ids in tris:
        tri=[v2[i] for i in ids]
        # Subdivide each triangle so graphic features follow the face in profile.
        start=len(verts);n=4;idx={}
        for i in range(n+1):
            for j in range(n+1-i):
                p=tri[0]+(tri[1]-tri[0])*i/n+(tri[2]-tri[0])*j/n
                idx[i,j]=len(verts);verts.append((p.x,face_y(p.x,p.y)-offset,p.y))
        for i in range(n):
            for j in range(n-i):
                faces.append((idx[i,j],idx[i+1,j],idx[i,j+1]))
                if j<n-i-1:faces.append((idx[i+1,j],idx[i+1,j+1],idx[i,j+1]))
    o=mesh(name,verts,faces,material,'head')
    for p in o.data.polygons:p.use_smooth=True
    return o

def graphic_line(name,coords,radius,material,offset=.003):
    # Tapered ink ribbon, not a rounded lip or a tube.
    verts=[]
    for i,(x,z) in enumerate(coords):
        w=radius*(.3+.7*sin(pi*i/(len(coords)-1))**.4)
        for zz in [z-w,z+w]:verts.append((x,face_y(x,zz)-offset,zz))
    return mesh(name,verts,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(coords)-1)],material,'head')

def eye_limits(x):
    t=max(0,min(1,(x-.017)/.067))
    a=sin(pi*t)**.9
    return (1.759+.012*t-.009*a,1.759+.012*t+.011*a)

for s,label in [(-1,'R'),(1,'L')]:
    # Almond white: larger iris, angled outer corner, deliberate dark upper lid.
    outline=[]
    for i in range(25):
        x=.017+.067*i/24;lo,hi=eye_limits(x);outline.append((s*x,hi))
    for i in range(24,-1,-1):
        x=.017+.067*i/24;lo,hi=eye_limits(x);outline.append((s*x,lo))
    patch('Face_AnimeWhite.'+label,outline,eye_white,.0022)
    for ring,rx,rz,material in [('Iris',.012,.016,eye_amber),('Pupil',.0057,.013,ink)]:
        ov=[]
        for j in range(64):
            a=2*pi*j/64;x=.048+rx*cos(a);z=1.768+rz*sin(a)
            lo,hi=eye_limits(x);z=max(lo+.0005,min(hi-.0005,z))
            ov.append((s*x,z))
        patch('Face_'+ring+'.'+label,ov,material,.0031 if ring=='Iris' else .0038)
    ov=[(s*(.048+.009*cos(a)),1.760+.004*sin(a)) for a in [pi+pi*j/24 for j in range(25)]]
    patch('Face_IrisGold.'+label,ov,eye_gold,.0040)
    for cx,cz,r in [(.044,1.772,.0027),(.054,1.759,.00125)]:
        ov=[(s*(cx+r*cos(2*pi*j/24)),cz+r*sin(2*pi*j/24)) for j in range(24)]
        patch('Face_Glint.'+label,ov,eye_glint,.0048)
    top=[];bottom=[]
    for j in range(33):
        x=.016+.071*j/32;lo,hi=eye_limits(x)
        z=hi+(max(0,x-.084)*.65)
        top.append((s*x,z))
        if j>=4:bottom.append((s*x,lo))
    graphic_line('Face_UpperInk.'+label,top,.00165,ink,.0053)
    graphic_line('Face_LowerInk.'+label,bottom,.0006,mouthink,.0049)
    # Thick graphic eyebrows lift outward; no realistic brow ridge.
    brow=[(.016,1.792),(.024,1.792),(.063,1.808),(.088,1.803),(.074,1.813),(.057,1.817),(.018,1.801)]
    patch('Face_AnimeBrow.'+label,[(s*x,z) for x,z in brow],ink,.004)
    # Simple outer and inner ear forms, with one graphic inner notch.
    outline=[(s*.091,-.010,1.778),(s*.107,-.007,1.780),(s*.118,-.005,1.766),
             (s*.115,-.006,1.738),(s*.102,-.008,1.720),(s*.089,-.010,1.727)]
    ear=panel('Body_AnimeEar.'+label,outline,skin,'head',.020,ridge=(s*.103,-.019,1.751))
    inner=panel('Face_EarPlane.'+label,[(s*.099,-.021,1.767),(s*.109,-.021,1.766),(s*.109,-.023,1.749),(s*.101,-.023,1.738)],skinshade,'head',.002)

graphic_line('Face_MouthInk',[(-.025+i*.05/24,1.686+.0015*math.sin(pi*i/24)+.002*(i/24)**3) for i in range(25)],.00085,mouthink,.002)
graphic_line('Face_NoseAccent',[(.005,1.724),(.008,1.722),(.011,1.723)],.00048,skinshade,.0017)

# Head-fitting hair cap, then distinct angular locks with planar ridges.
hv=[];H=18;N=64
for k in range(H):
    t=k/(H-1)
    for j in range(N):
        a=2*pi*j/N
        bottom=1.774+.069*max(0,cos(a))-.014*max(0,-cos(a))
        z=bottom+(1.925-bottom)*sin(t*pi/2)
        rx,fr,bk,cy=section_at(min(z,1.919))
        x=rx*sin(a)
        y=face_y(x,min(z,1.919)) if cos(a)>=0 else cy-bk*cos(a)
        hv.append((x*1.065,cy+(y-cy)*1.065,z+.004))
cap=mesh('Hair_AnimeCap',hv,[(k*N+j,k*N+(j+1)%N,(k+1)*N+(j+1)%N,(k+1)*N+j) for k in range(H-1) for j in range(N)],hair,'head')
for p in cap.data.polygons:p.use_smooth=True

def sharp_lock(name,control,width,depth):
    cps=[Vector(v) for v in control];verts=[];steps=12
    def at(t):return (1-t)**3*cps[0]+3*(1-t)**2*t*cps[1]+3*(1-t)*t*t*cps[2]+t**3*cps[3]
    for k in range(steps):
        t=k/(steps-1);pos=at(t)
        tangent=(at(min(1,t+.005))-at(max(0,t-.005))).normalized()
        radial=(pos-Vector((0,.025,1.80))).normalized()
        u=tangent.cross(radial).normalized();v=u.cross(tangent).normalized()
        w=width*(.70+.48*sin(pi*t))*(1-t)**.65 if k<steps-1 else .00025
        # Four vertices around a diamond section produce explicit graphic planes.
        for offset in [u*w,v*depth*(w/width),-u*w,-v*depth*.55*(w/width)]:verts.append(pos+offset)
    faces=[(k*4+j,k*4+(j+1)%4,(k+1)*4+(j+1)%4,(k+1)*4+j) for k in range(steps-1) for j in range(4)]
    faces.extend([tuple(reversed(range(4))),tuple((steps-1)*4+j for j in range(4))])
    o=mesh(name,verts,faces,[hair,hairlight,hairdeep],'head')
    for p in o.data.polygons:
        p.material_index=[1,0,2,0][p.index%4] if p.index<len(faces)-2 else 0
        p.use_smooth=True
    return o

locks=[
 ([(.065,.010,1.895),(.036,-.035,1.986),(-.043,-.089,1.974),(-.048,-.113,1.822)],.031,.018),
 ([(.066,.037,1.890),(.012,.008,1.989),(-.084,-.023,1.981),(-.147,-.061,1.911)],.033,.019),
 ([(.049,.072,1.881),(-.008,.070,1.979),(-.105,.038,1.957),(-.157,.013,1.936)],.035,.018),
 ([(.083,-.004,1.872),(.072,-.077,1.930),(.027,-.114,1.913),(.023,-.115,1.840)],.024,.013),
 ([(.091,.012,1.859),(.109,-.030,1.900),(.095,-.063,1.878),(.082,-.065,1.783)],.020,.012),
 ([(.028,.100,1.864),(-.016,.148,1.950),(-.095,.132,1.931),(-.151,.096,1.918)],.032,.018),
 ([(-.039,.113,1.843),(-.073,.142,1.901),(-.133,.138,1.880),(-.155,.104,1.868)],.028,.015),
 ([(.078,.079,1.843),(.112,.058,1.907),(.130,.011,1.889),(.123,-.020,1.850)],.025,.014),
 ([(-.080,.024,1.824),(-.113,-.009,1.874),(-.126,-.046,1.848),(-.098,-.058,1.767)],.024,.012),
 ([(.037,.112,1.825),(.060,.145,1.855),(.037,.157,1.839),(.025,.137,1.752)],.027,.015),
 ([(-.052,.088,1.822),(-.088,.126,1.839),(-.104,.122,1.801),(-.080,.095,1.739)],.025,.013),
]
for i,(p,w,d) in enumerate(locks):sharp_lock('Hair_AnimeLock_%02d'%i,p,w,d)

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
