"""Build the seven portrait-based, skinned expedition characters in Blender."""
import bpy
import bmesh
import json
import math
import sys
from mathutils import Vector, Quaternion
from pathlib import Path

LIB = Path(__file__).resolve().parents[1] / "library"
ART = LIB / "echo-art"
SOURCES = LIB / "models" / "回响远征"
EXPORTS = LIB / "exports" / "回响远征"
PI = math.pi
INK, BONE, LIGHT = "253746", "E5D9B5", "FFF0D0"
TEAL, MINT, PINE = "248F85", "86E3CF", "204C4E"
NAVY, SLATE, GOLD = "253955", "506D84", "E8AE45"
PLUM, VIOLET, LILAC = "513457", "965ABD", "D89ADB"
CORAL, RUST = "DC785F", "823F3F"

def linear(v):
    v = int(v, 16) / 255
    return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4

class Figure:
    def __init__(self, scale):
        self.scale = scale
        self.bones = {}
        self.verts, self.faces, self.colors, self.weights = [], [], [], []

    def bone(self, name, head, tail, parent="body"):
        self.bones[name] = (Vector(head), Vector(tail), parent)
        return name

    def vertex(self, p, owner):
        self.verts.append(Vector(p) * self.scale)
        self.weights.append({owner:1} if isinstance(owner,str) else owner)
        return len(self.verts)-1

    def face(self, ids, color):
        self.faces.append(tuple(ids))
        self.colors.append(color)

    def loft(self, points, radii, color, owner, sides=8, axis=None, weights=None):
        """Articulated, closed cross-sections along a bent spine or limb."""
        pts = list(map(Vector,points))
        ref = Vector(axis or (1,0,0))
        if abs((pts[-1]-pts[0]).normalized().dot(ref))>.92:
            ref = Vector((0,1,0))
        rows=[]
        for i,(p,(w,h)) in enumerate(zip(pts,radii)):
            tangent=(pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)]).normalized()
            u=(ref-tangent*tangent.dot(ref)).normalized()
            if u.length_squared<.01: u=tangent.orthogonal().normalized()
            v=tangent.cross(u).normalized()
            rows.append([self.vertex(p+u*(math.cos(2*PI*k/sides)*w)+v*(math.sin(2*PI*k/sides)*h),weights[i] if weights else owner) for k in range(sides)])
        self.face(reversed(rows[0]),color)
        for r,s in zip(rows,rows[1:]):
            for j in range(sides):
                k=(j+1)%sides
                self.face((r[j],r[k],s[k],s[j]),color)
        self.face(rows[-1],color)

    def shell(self,c,extent,color,bone,n=12):
        x,y,z=c;w,d,h=extent
        self.loft([(x,y+d*t,z) for t in [-.98,-.75,-.22,.36,.78,.98]],
                  [(w*k,h*k) for k in [.13,.69,.99,.94,.65,.12]],color,bone,n)

    def blade(self,start,middle,tip,width,thick,color,bone,axis=None):
        self.loft([start,middle,tip],[(width*.52,thick*.62),(width,thick),(.009,.008)],color,bone,6,axis)

    def segment(self,p,q,w,h,color,bone):
        p,q=Vector(p),Vector(q)
        self.loft([p,p.lerp(q,.28),p.lerp(q,.76),q],[(w*.58,h*.58),(w,h),(w*.72,h*.73),(w*.43,h*.46)],color,bone)

    def panel(self,outline,keel,thickness,color,bone,weights=None):
        # Two skins enclose the wing or plate so both sides retain a faceted profile.
        rim=[self.vertex(p,weights[i] if weights else bone) for i,p in enumerate(outline)]
        top=self.vertex(keel,bone);bottom=self.vertex(Vector(keel)-Vector((0,0,thickness)),bone)
        for i,j in zip(rim,rim[1:]+rim[:1]):
            self.face((i,j,top),color);self.face((j,i,bottom),color)

def eyes(f,x,y,z,bone,color=GOLD):
    for s in [-1,1]:
        f.shell((s*x,y,z),(.115,.095,.084),INK,bone)
        f.shell((s*(x+.027),y-.052,z+.014),(.093,.064,.048),color,bone)

def hound(f):
    f.bone("body",(0,.65,.99),(0,-.30,1.27),None)
    f.bone("neck",(0,-.32,1.29),(0,-.79,1.55))
    f.bone("head",(0,-.76,1.57),(0,-1.42,1.38),"neck")
    f.loft([(0,-.74,1.34),(0,-.46,1.29),(0,-.04,1.15),(0,.47,1.12),(0,.88,1.06)],
           [(.34,.35),(.47,.50),(.42,.45),(.28,.28),(.35,.33)],PINE,"body",12)
    f.segment((0,-.45,1.32),(0,-.89,1.64),.33,.33,TEAL,"neck")
    f.shell((0,-.93,1.64),(.33,.44,.30),PINE,"head")
    f.loft([(0,-.66,1.80),(0,-.94,1.87),(0,-1.20,1.71),(0,-1.55,1.50)],[(.22,.18),(.35,.20),(.25,.15),(.10,.075)],BONE,"head")
    f.segment((0,-1.03,1.47),(0,-1.46,1.40),.17,.072,INK,"head")
    eyes(f,.225,-1.16,1.63,"head")
    for s in [-1,1]:
        f.blade((s*.19,-.81,1.76),(s*.28,-.68,1.93),(s*.43,-.39,2.14),.15,.11,BONE,"head")
        f.blade((s*.15,-1.28,1.48),(s*.16,-1.30,1.43),(s*.15,-1.31,1.34),.034,.03,LIGHT,"head")
        f.blade((s*.25,-.56,1.58),(s*.42,-.51,1.39),(s*.42,-.34,1.04),.17,.12,BONE,"body")
        f.blade((s*.27,-.76,1.68),(s*.40,-.60,1.56),(s*.42,-.41,1.29),.16,.084,LIGHT,"neck")
        for i in range(3):
            y=-.46+i*.38
            f.blade((s*.24,y,1.47),(s*.39,y+.07,1.57),(s*.46,y+.35,1.62),.16,.10,TEAL,"body")
        for hind in [False,True]:
            tag=("rear" if hind else "fore")+("_L" if s>0 else "_R")
            a=(s*.31,.67 if hind else -.44,1.26)
            b=(s*.42,.22 if hind else -.31,.70)
            c=(s*.43,.76 if hind else -.55,.30)
            foot=(s*.45,c[1]-.19,.12)
            upper=f.bone(tag,a,b);lower=f.bone(tag+"_shin",b,c,upper);paw=f.bone(tag+"_paw",c,foot,lower)
            f.segment(a,b,.22 if hind else .16,.22,TEAL,upper)
            f.segment(b,c,.12,.13,PINE,lower)
            f.blade(b,Vector(b).lerp(Vector(c),.37),c,.14,.105,BONE,lower)
            f.segment(c,foot,.105,.11,TEAL,paw)
            f.shell(foot,(.15,.21,.115),TEAL,paw)
            for dx in [-.068,.051]:
                x=foot[0]+dx; y=foot[1]
                f.blade((x,y-.06,.12),(x,y-.14,.105),(x,y-.26,.055),.041,.035,LIGHT,paw)
    for i in range(4):
        y=-.45+i*.35; z=1.66-i*.065
        f.blade((0,y,z),(0,y+.11,z+.21),(0,y+.30,z+.43),.135,.14,BONE,"body")
    tail=[(0,.83,1.15),(.07,1.39,1.21),(.24,1.79,1.64),(.46,1.43,1.88)]
    owner="body";bones=[]
    for i in range(3):
        owner=f.bone("tail"+str(i),tail[i],tail[i+1],owner);bones.append(owner)
    f.loft(tail,[(.15,.16),(.115,.105),(.087,.077),(.013,.016)],PINE,bones[0],weights=[bones[0],{bones[0]:.45,bones[1]:.55},{bones[1]:.45,bones[2]:.55},bones[2]])
    f.blade(tail[2],(.34,1.68,1.79),(.50,1.33,1.90),.09,.07,BONE,bones[2])

def crab(f,boss):
    f.bone("body",(0,.25,.73),(0,-.44,.91),None)
    shell=CORAL if boss else SLATE
    f.shell((0,.07,.79),(.73,.87,.39),INK,"body")
    f.shell((0,.10,1.00),(.79,.90,.38),shell,"body")
    # Overlapping dorsal plates and a distinct locomotive cab on the guard.
    for i in range(3):
        y=-.37+i*.40
        f.shell((0,y,1.15),(.73-i*.055,.34,.24),shell,"body")
        for s in [-1,1]:
            f.blade((s*.50,y,1.11),(s*.72,y+.11,1.20),(s*.91,y+.28,1.12),.15,.1,RUST if boss else NAVY,"body")
            f.shell((s*.55,y-.12,1.29),(.06,.059,.045),BONE,"body",8)
    eyes(f,.30,-.74,.98,"body",MINT if boss else GOLD)
    for s in [-1,1]:
        side="L" if s>0 else "R"
        for i in range(3):
            y=-.07+i*.32
            a=(s*.54,y,.80);b=(s*(.97+i*.04),y+.12,.67);c=(s*(1.08+i*.07),y-.05,.05)
            upper=f.bone("leg"+str(i)+side,a,b);lower=f.bone("shin"+str(i)+side,b,c,upper)
            f.segment(a,b,.14,.13,shell,upper)
            f.blade(b,(s*(1.09+i*.05),y+.12,.46),c,.135,.095,BONE if boss else SLATE,lower)
        a=(s*.53,-.42,.94);b=(s*1.07,-.70,1.09);c=(s*1.22,-1.18,1.18)
        arm=f.bone("arm"+side,a,b);claw=f.bone("claw"+side,b,c,arm)
        f.segment(a,b,.22,.19,INK,arm)
        f.shell(b,(.235,.24,.24),shell,claw)
        f.shell((s*1.22,-.96,1.15),(.32,.34,.32),BONE,claw)
        for n in [-1,1]:
            # One opposing jaw above the other keeps the crescent readable from the arena camera.
            x=s*(1.22+n*.09)
            f.loft([(x,-1.04,1.15+n*.13),(s*(1.27+n*.14),-1.33,1.16+n*.32),(s*(1.30+n*.10),-1.58,1.15+n*.24),(s*1.30,-1.73,1.16+n*.095)],
                  [(.18,.16),(.16,.14),(.10,.09),(.012,.01)],BONE,claw)
            f.blade((x,-1.30,1.15+n*.28),(x,-1.38,1.15+n*.23),(x,-1.43,1.15+n*.13),.056,.045,LIGHT,claw)
        f.shell((s*1.40,-.91,1.32),(.063,.068,.055),SLATE,claw)
    if boss:
        f.loft([(0,-.88,1.32),(0,-.56,1.50),(0,.04,1.62),(0,.68,1.44)],[(.42,.19),(.56,.34),(.53,.32),(.38,.22)],CORAL,"body")
        f.segment((0,-.72,1.86),(0,.48,1.92),.13,.065,RUST,"body")
        # Glowing furnace core & rail bumper on the prow
        f.shell((0,-.90,1.22),(.34,.14,.14),INK,"body")
        f.shell((0,-.98,1.22),(.22,.07,.08),MINT,"body")
        for s in [-1,1]:
            f.segment((s*.50,-.68,1.44),(s*.49,.56,1.46),.045,.048,LIGHT,"body")
            f.blade((s*.52,.13,1.35),(s*.82,.25,1.66),(s*.98,.58,1.98),.16,.11,RUST,"body")
            f.blade((s*.74,.27,1.60),(s*.92,.24,1.74),(s*1.08,.18,1.82),.08,.07,CORAL,"body")
            f.blade((s*.44,-.18,1.58),(s*.68,-.08,1.88),(s*.78,.12,2.16),.12,.08,CORAL,"body")
            for i in range(3):
                y=-.34+i*.27
                f.panel([(s*.49,y-.10,1.54),(s*.51,y+.10,1.54),(s*.49,y+.10,1.72),(s*.48,y-.10,1.72)],(s*.53,y,1.63),.03,MINT if i==1 else NAVY,"body")
            f.blade((s*.36,.36,1.58),(s*.48,.52,1.90),(s*.60,.72,2.24),.16,.12,CORAL,"body")
            f.segment((s*.27,.43,1.55),(s*.27,.44,2.04),.15,.15,INK,"body")
            f.shell((s*.27,.44,2.04),(.16,.16,.07),BONE,"body")
            # Glowing energy ridge on boss claws
            f.blade((s*1.28,-1.10,1.34),(s*1.36,-1.40,1.46),(s*1.34,-1.68,1.30),.07,.05,MINT,"claw"+("L" if s>0 else "R"))
        f.shell((0,-.74,1.58),(.21,.10,.20),INK,"body")
        f.shell((0,-.82,1.59),(.14,.055,.14),MINT,"body")

def ray(f,boss):
    f.bone("body",(0,.45,1.35),(0,-.65,1.42),None)
    top=GOLD if boss else "29A5A2";under=NAVY if boss else PINE
    f.loft([(0,-1.28,1.35),(0,-.81,1.43),(0,-.20,1.42),(0,.56,1.36),(0,1.05,1.36)],[(.075,.07),(.34,.22),(.41,.28),(.27,.20),(.10,.10)],under,"body",12)
    f.shell((0,-.35,1.56),(.27,.78,.17),top if boss else BONE,"body")
    eyes(f,.24,-.86,1.44,"body",MINT if boss else GOLD)
    for s in [-1,1]:
        side="L" if s>0 else "R"
        joint=(s*1.10,-.02,1.53);end=(s*2.02,.38,1.68)
        wing=f.bone("wing"+side,(s*.20,-.16,1.44),joint)
        tip=f.bone("tip"+side,joint,end,wing)
        wingpts=[(s*.22,-.82,1.42),(s*.86,-.64,1.54),joint,(s*1.13,.66,1.40),(s*.60,.99,1.27),(s*.22,.49,1.31)]
        f.panel(wingpts,(s*.70,-.05,1.63),.25,top,wing,[{"body":.55,wing:.45},wing,wing,wing,wing,{"body":.55,wing:.45}])
        f.panel([wingpts[1],(s*1.65,-.34,1.62),(s*2.20,.34,1.77),(s*1.74,.22,1.54),wingpts[3],joint],(s*1.43,.02,1.59),.13,top,tip,[wing,tip,tip,tip,wing,wing])
        f.blade((s*.33,-.60,1.58),(s*.69,-.57,1.63),(s*1.56,-.29,1.65),.095,.062,LIGHT,wing)
        f.blade((s*.21,-.69,1.55),(s*.34,-.97,1.48),(s*.41,-1.28,1.24),.10,.082,LIGHT if boss else TEAL,"body")
        f.blade((s*.30,.22,1.55),(s*.52,.37,1.75),(s*.66,.68,2.00),.15,.08,BONE if not boss else GOLD,wing)
        if boss:
            f.segment((s*.64,-.84,1.40),(s*.68,.70,1.36),.17,.16,NAVY,wing)
            f.shell((s*.64,-.90,1.40),(.13,.11,.10),MINT,wing)
            f.shell((s*.68,.72,1.36),(.11,.10,.09),MINT,wing)
            f.panel([(s*.37,-.68,1.63),(s*.89,-.54,1.66),(s*1.16,-.06,1.56),(s*.80,-.18,1.69)],(s*.82,-.34,1.74),.06,NAVY,wing)
            f.blade((s*1.55,-.28,1.63),(s*1.98,-.03,1.74),(s*2.38,.36,1.84),.11,.065,NAVY,tip)
            f.blade((s*1.98,.18,1.70),(s*2.24,.24,1.94),(s*2.18,.14,2.22),.12,.095,GOLD,tip)
            f.blade((s*1.25,-.23,1.63),(s*1.54,-.14,1.69),(s*2.08,.22,1.75),.09,.05,MINT,tip)
            f.blade((s*.20,.14,1.72),(s*.38,.38,1.98),(s*.54,.82,2.42),.20,.11,GOLD,"body")
    tail=[(0,.68,1.37),(0,1.26,1.38),(.04,1.91,1.46),(.10,2.49,1.70)]
    a=f.bone("tail0",tail[0],tail[1]);b=f.bone("tail1",tail[1],tail[2],a);c=f.bone("tail2",tail[2],tail[3],b)
    f.loft(tail,[(.16,.12),(.10,.08),(.05,.044),(.008,.009)],under,a,weights=[a,{a:.5,b:.5},{b:.5,c:.5},c])
    f.blade(tail[2],(.08,2.29,1.60),tail[3],.084,.05,BONE if not boss else GOLD,c)
    if boss:
        f.shell((0,-.35,1.78),(.20,.32,.12),MINT,"body")
        f.blade((0,.08,1.78),(0,.38,2.14),(0,.68,2.52),.14,.10,GOLD,"body")
        for s in [-1,1]:
            f.blade((s*.04,-.92,1.64),(s*.20,-.68,1.75),(s*.30,-.38,1.70),.085,.048,LIGHT,"body")
            f.blade(tail[2],(s*.28,2.20,1.68),(s*.14,2.62,1.80),.11,.06,GOLD,c)

def flower(f,boss):
    h=2.24 if boss else .52
    f.bone("body",(0,0,.30),(0,0,h+.15),None)
    f.bone("flower",(0,0,h),(0,-.03,h+.85))
    f.shell((0,0,.42),(.62 if boss else .49,.58 if boss else .47,.34 if boss else .30),PLUM,"body")
    if not boss:eyes(f,.20,-.38,.45,"body",MINT)
    for i in range(6):
        a=i*PI/3+.2;u=Vector((math.cos(a),math.sin(a),0));v=Vector((-u.y,u.x,0))
        def radial(r,z,shift=0):return u*r+v*shift+Vector((0,0,z))
        root=f.bone("rootlet"+str(i),radial(.30,.44),radial(1.12 if boss else .82,.06))
        f.loft([radial(.22,.50),radial(.56 if boss else .45,.36,.10),radial(.88 if boss else .69,.21),radial(1.18 if boss else .87,.045,.16)],
               [(.26 if boss else .21,.18 if boss else .14),(.19 if boss else .15,.16 if boss else .13),(.12 if boss else .09,.09 if boss else .07),(.02,.02)],PLUM,root,7)
    if boss:
        f.loft([(0,.06,.40),(.05,.08,.92),(-.12,0,1.42),(.02,.05,1.88),(0,0,2.42)],[(.38,.30),(.52,.36),(.30,.32),(.46,.34),(.34,.32)],PLUM,"body",10)
        for s in [-1,1]:
            side="L" if s>0 else "R";a=(s*.34,0,1.96);b=(s*1.04,-.06,2.14);c=(s*1.46,-.38,1.82)
            arm=f.bone("arm"+side,a,b);hand=f.bone("hand"+side,b,c,arm)
            f.segment(a,b,.21,.19,BONE,arm);f.segment(b,c,.16,.15,PLUM,hand)
            for n in range(3):
                f.blade(c,(s*(1.52+n*.06),-.48,1.86-n*.12),(s*(1.62+n*.06),-.72,1.64-n*.12),.085,.065,BONE,hand)
            f.blade((s*.20,-.02,2.12),(s*.58,-.04,2.24),(s*1.24,.06,2.44),.28,.16,LILAC,arm)
            f.blade((s*.34,-.10,2.02),(s*.66,.02,1.88),(s*1.16,.15,1.62),.34,.18,VIOLET,arm)
            f.blade((s*.26,-.18,2.04),(s*.36,-.28,1.84),(s*.14,-.34,1.60),.13,.08,BONE,"body")
        # Glowing crystalline heart
        f.shell((0,-.30,1.88),(.21,.13,.26),MINT,"body")
        # Dramatic wide multi-tier crystal petal mantle
        for i in range(10):
            angle=i*2*PI/10;u=Vector((math.cos(angle),math.sin(angle),0));t=Vector((-u.y,u.x,0))
            base=u*.28+Vector((0,0,1.84));mid=u*.76+Vector((0,0,1.26));end=u*1.28+Vector((0,0,.58+(i%2)*.24))
            f.blade(base,mid,end+u*.24,.44,.19,LILAC if i%2 else VIOLET,"body",t)
            f.blade(base+Vector((0,0,.22)),mid+u*.24+Vector((0,0,.26)),end+u*.36+Vector((0,0,.44)),.36,.15,VIOLET if i%2 else LILAC,"body",t)
    for i in range(7 if boss else 5):
        a=2*PI*i/(7 if boss else 5);u=Vector((math.cos(a),math.sin(a),0));t=Vector((-u.y,u.x,0))
        base=u*.20+Vector((0,0,h));mid=u*(.84 if boss else .48)+Vector((0,0,h+.44));end=u*(1.44 if boss else .82)+Vector((0,0,h+.74+(i%2)*.14))
        petal=f.bone("petal"+str(i),base,end,"flower")
        f.blade(base,mid,end,.44 if boss else .30,.21 if boss else .17,LILAC if boss else BONE,petal,t)
        f.blade(base+u*.12,mid+u*.12,end+u*.005,.11 if boss else .077,.07 if boss else .053,MINT if boss and i%2==0 else (VIOLET if boss else LIGHT),petal,t)
    f.loft([(0,0,h+.01),(0,0,h+.52),(0,0,h+1.04),(0,0,h+1.58 if boss else h+1.30)],[(.13,.13),(.34 if boss else .27,.29 if boss else .23),(.22 if boss else .18,.18 if boss else .15),(.012,.012)],MINT,"flower",5)
    if boss:
        for i in range(6):
            a=i*PI/3;u=Vector((math.cos(a),math.sin(a),0));t=Vector((-u.y,u.x,0))
            f.blade(u*.12+Vector((0,0,h+.80)),u*.36+Vector((0,0,h+1.26)),u*.66+Vector((0,0,h+1.88)),.19,.12,VIOLET,"flower",t)
            # Floating halo crystal shards orbiting the crown
            shard_base=u*1.05+Vector((0,0,h+1.05+(i%2)*.28))
            f.blade(shard_base,shard_base+u*.08+Vector((0,0,.22)),shard_base+u*.16+Vector((0,0,.52)),.11,.09,MINT if i%2 else LILAC,"flower",t)
        f.loft([(0,-.42,h+.44),(0,-.48,h+.72),(0,-.34,h+.92)],[(.095,.08),(.27,.16),(.18,.10)],BONE,"flower",6)
        for s in [-1,1]:
            f.blade((s*.045,-.58,h+.68),(s*.14,-.58,h+.70),(s*.24,-.54,h+.75),.045,.03,MINT,"flower")
            f.blade((s*.17,-.34,h+.76),(s*.40,-.28,h+.98),(s*.56,-.20,h+1.22),.15,.085,LIGHT,"flower")
        for i in range(5):
            a=i*2*PI/5;u=Vector((math.cos(a),math.sin(a),0));t=Vector((-u.y,u.x,0))
            f.blade(u*.38+Vector((0,0,h+1.28)),u*.56+Vector((0,0,h+1.64)),u*.78+Vector((0,0,h+2.08)),.14,.08,LILAC,"flower",t)

CLIPS={
    "hound":["Pounce"],"crab":["ClawSweep"],"ray":["NeedleFan"],"bloom":["CrystalFall"],
    "warden":["RailCharge","BreakerSweep"],"carrier":["DepthBomb","Broadside"],"crown":["MirrorRing","PetalVolley"],
}
def bind(f,name):
    arm=bpy.data.armatures.new(name+" Skeleton");rig=bpy.data.objects.new(name+" Rig",arm)
    bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    for key,(start,end,parent) in f.bones.items():
        bone=arm.edit_bones.new(key);bone.head=start*f.scale;bone.tail=end*f.scale
        if parent:bone.parent=arm.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT");arm.display_type="STICK"
    mesh=bpy.data.meshes.new(name+" Facets");mesh.from_pydata(f.verts,[],f.faces);mesh.update()
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(mesh);bm.free()
    color=mesh.color_attributes.new(name="Pigment",type="BYTE_COLOR",domain="CORNER")
    palette={s:(linear(s[:2]),linear(s[2:4]),linear(s[4:]),1) for s in set(f.colors)}
    for poly,swatch in zip(mesh.polygons,f.colors):
        for i in poly.loop_indices:color.data[i].color=palette[swatch]
    material=bpy.data.materials.new("Cel • pigment");material.use_nodes=True
    shader=material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Roughness"].default_value=.86
    attr=material.node_tree.nodes.new("ShaderNodeVertexColor");attr.layer_name="Pigment"
    material.node_tree.links.new(attr.outputs["Color"],shader.inputs["Base Color"])
    mesh.materials.append(material)
    body=bpy.data.objects.new(name+" Mesh",mesh);bpy.context.collection.objects.link(body)
    groups={k:body.vertex_groups.new(name=k) for k in f.bones}
    for i,weights in enumerate(f.weights):
        assert abs(sum(weights.values())-1)<1e-5
        for k,w in weights.items():groups[k].add([i],w,"REPLACE")
    body.parent=rig;mod=body.modifiers.new("Skeleton","ARMATURE");mod.object=rig
    return rig,body

def animate(rig,f,identity,kind,clip):
    action=bpy.data.actions.new(clip);action.use_fake_user=True;rig.animation_data_create();rig.animation_data.action=action
    bones=rig.pose.bones;rest={p.name:p.bone.matrix_local.to_quaternion().inverted() for p in bones}
    frames=48 if clip=="Idle" else 24 if clip=="Move" else 15 if clip=="Hit" else 30
    loop=clip in ("Idle","Move")
    timeline=[0,.125,.25,.375,.5,.625,.75,.875,1] if loop else [0,.20,.45,.58,.70,.78,.90,1]
    for index,t in enumerate(timeline):
        wave=math.sin(2*PI*t);beat=math.sin(2*PI*t+PI/3)
        wind=[0,.32,.94,1,.04,0,0,0][index] if not loop else 0
        snap=[0,0,0,.05,1,.80,.29,0][index] if not loop else 0
        recoil=[0,1,.68,.42,.24,.15,.06,0][index] if not loop else 0
        frame=1+round(t*frames)
        def rotate(key,x=0,y=0,z=0):
            pb=bones[key];q=rest[key]
            pb.rotation_quaternion=(Quaternion(q@Vector((0,0,1)),math.radians(z)) @
                                    Quaternion(q@Vector((0,1,0)),math.radians(y)) @
                                    Quaternion(q@Vector((1,0,0)),math.radians(x)))
            pb.keyframe_insert(data_path="rotation_quaternion",frame=frame,group=key)
        # Movement is in place. The encounter controller owns world travel and impact timing.
        offset=0
        if loop:offset=(.025 if clip=="Idle" else .055)*(1-math.cos(2*PI*t))*(1.5 if kind=="ray" else 1)
        elif clip=="Hit":offset=-.075*recoil
        elif clip=="Pounce":offset=-.23*wind+.26*snap
        else:offset=-.09*wind+.08*snap
        root=bones["body"];root.location=rest["body"]@Vector((0,0,offset*f.scale))
        root.keyframe_insert(data_path="location",frame=frame,group="body")
        if clip=="Hit":rotate("body",-17*recoil,7*recoil)
        elif clip=="Awaken":rotate("body",12*wind-15*snap,0,10*snap)
        elif loop:rotate("body",(2.5 if clip=="Idle" else 5)*wave,beat*(1.2 if kind=="ray" else .5))
        else:rotate("body",14*wind-16*snap,0,(-22*wind+28*snap) if "Sweep" in clip else 0)
        if kind=="hound":
            rotate("neck",-4*wave if loop else 18*wind-21*snap)
            rotate("head",2*wave if loop else -5*wind+8*snap)
            for side,sign in [("L",1),("R",-1)]:
                for tag,phase in [("fore",sign),("rear",-sign)]:
                    n=tag+"_"+side;amplitude=24 if clip=="Move" else 2
                    rotate(n,phase*wave*amplitude if loop else (28*wind-42*snap)*(1 if tag=="fore" else -.85))
                    rotate(n+"_shin",max(0,-phase*wave)*28 if clip=="Move" else -31*wind+13*snap)
                    rotate(n+"_paw",phase*wave*10 if clip=="Move" else 17*wind-12*snap)
        if kind=="crab":
            for side,s in [("L",1),("R",-1)]:
                for i in range(3):
                    stride=math.sin(2*PI*t+i*2.1+(0 if s>0 else PI))
                    rotate("leg"+str(i)+side,0,s*(14*stride if clip=="Move" else 4*wind),stride*13 if clip=="Move" else 0)
                    rotate("shin"+str(i)+side,0,-s*(16*max(stride,0) if clip=="Move" else 6*wind))
                cross=clip in ("ClawSweep","BreakerSweep")
                rotate("arm"+side,-4*wave if loop else 10*wind-7*snap,s*(1.6*wave if loop else 27*wind-10*snap),
                       s*(4*wave if loop else (35*wind-48*snap) if cross else -14*wind+18*snap))
                rotate("claw"+side,2*beat if loop else -15*wind+18*snap,0,s*(8*wave if loop else 15*wind-24*snap))
        if kind=="ray":
            for side,s in [("L",1),("R",-1)]:
                bank=(12 if clip=="Idle" else 21)*wave if loop else (34*wind-24*snap)
                rotate("wing"+side,0,-s*bank, s*(7*wind-9*snap))
                rotate("tip"+side,0,-s*(8*beat if loop else 14*wind-17*snap))
                if clip=="Broadside":rotate("body",0,-19*wind+13*snap)
                if clip=="DepthBomb":rotate("body",-19*wind+16*snap)
        if kind in ("ray","hound"):
            for i in range(3):
                rotate("tail"+str(i),4*math.sin(2*PI*t-i*.5) if loop else 7*wind-13*snap,
                       0,8*math.sin(2*PI*t-i*.6) if loop else 5*wind-12*snap)
        if kind=="bloom":
            rotate("flower",3*wave if loop else 7*wind-12*snap,0,3*beat if loop else -20*wind+31*snap)
            count=7 if identity=="crown" else 5
            for i in range(count):
                a=2*PI*i/count
                fan=4*wave if loop else -17*wind+(44 if clip=="MirrorRing" else 30)*snap
                rotate("petal"+str(i),-math.sin(a)*fan,math.cos(a)*fan)
            for i in range(6):
                a=i*PI/3+.2
                rotate("rootlet"+str(i),5*math.sin(t*2*PI+a) if clip=="Move" else 0,0,4*wave if loop else 6*wind-10*snap)
            if identity=="crown":
                for side,s in [("L",1),("R",-1)]:
                    rotate("arm"+side,3*wave if loop else 17*wind-26*snap,-s*(4*beat if loop else 30*wind-38*snap))
                    rotate("hand"+side,5*wave if loop else -22*wind+33*snap,0,s*(18*snap))
    return action

def build(spec):
    key,name=spec["id"],spec["name"]
    boss=spec["group"]=="bosses"
    kind={"warden":"crab","carrier":"ray","crown":"bloom"}.get(key,key)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    f=Figure({"warden":1.74,"carrier":1.66,"crown":1.52,"hound":1.06,"crab":1.08,"ray":1.06,"bloom":1.08}.get(key,1))
    if kind=="hound":hound(f)
    elif kind=="crab":crab(f,boss)
    elif kind=="ray":ray(f,boss)
    else:flower(f,boss)
    rig,body=bind(f,name)
    clips=["Idle","Move",*CLIPS[key],"Hit"]+(["Awaken"] if boss else [])
    actions=[]
    for clip in clips:
        rig.animation_data_create();rig.animation_data.action=None
        for pb in rig.pose.bones:pb.matrix_basis.identity();pb.rotation_quaternion=(1,0,0,0);pb.location=(0,0,0)
        actions.append(animate(rig,f,key,kind,clip))
    rig.animation_data.action=actions[0];rig.animation_data.action_slot=actions[0].slots[0]
    scene=bpy.context.scene;scene.render.fps=30;scene.frame_start=1;scene.frame_end=49;scene.frame_set(1)
    reference=bpy.data.images.load(str(ART/spec["source"]));reference.name=name+" • 立绘";reference.pack();reference.use_fake_user=True
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=="VIEW_3D":
                space=area.spaces.active;space.shading.color_type="VERTEX";space.overlay.show_overlays=False
                space.region_3d.view_distance=8 if boss else 5.8;space.region_3d.view_location=(0,0,1.45 if boss else 1.0)
                space.region_3d.view_rotation=Vector((-.60,.92,-.40)).to_track_quat("-Z","Y")
    rig["portrait_id"]=key;rig["combat_clips"]=", ".join(CLIPS[key])
    bpy.context.preferences.filepaths.save_version=0
    folder="区域首领" if boss else "小怪"
    blend=SOURCES/folder/(name+".blend");glb=EXPORTS/folder/(name+".glb")
    blend.parent.mkdir(parents=True,exist_ok=True);glb.parent.mkdir(parents=True,exist_ok=True)
    body.select_set(True);rig.select_set(True)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)
    bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",use_selection=True,
        export_animations=True,export_animation_mode="ACTIONS",export_anim_single_armature=True,
        export_force_sampling=True,export_skins=True,export_yup=True,export_extras=True)
    print("BUILT",key,len(f.verts),len(f.bones),clips,flush=True)

specs=json.loads((ART/"manifest.json").read_text(encoding="utf-8"))["assets"]
only=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
for spec in specs:
    if spec["group"] in ("creatures","bosses") and (not only or spec["id"] in only):build(spec)
