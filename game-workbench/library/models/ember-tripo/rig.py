import bpy, bmesh, math
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix
out=Path(__file__).resolve().parent
body=bpy.data.objects['Ember_Tripo']
# The blade and glove in the supplied scan form one shell. Trim the blade below
# the curled palm, including the guard, then close the cut at the glove.
bm=bmesh.new();bm.from_mesh(body.data)
def flood(start,eligible):
    visited={start};stack=[start]
    while stack:
        v=stack.pop()
        for e in v.link_edges:
            other=e.other_vert(v)
            if other not in visited and eligible(other):
                visited.add(other);stack.append(other)
    return visited
tip=min(bm.verts,key=lambda v:(v.co-Vector((-.29,-.28,.122))).length_squared)
cut=flood(tip,lambda v:v.co.z<.396)
axis=Vector((.48,.69,1)).normalized();centre=Vector((-.142,-.066,.421))
for v in bm.verts:
    d=v.co-centre;t=d.dot(axis)
    if .044<t<.122 and (d-axis*t).length<.022 and v.co.x>-.13:
        cut.add(v)
bmesh.ops.delete(bm,geom=list(cut),context='VERTS')
rim=[e for e in bm.edges if e.is_boundary and all(v.co.x<-.04 and .35<v.co.z<.53 for v in e.verts)]
if rim:bmesh.ops.holes_fill(bm,edges=rim,sides=0)
bm.to_mesh(body.data);bm.free()
# Landmarks in the scan's original stance, in Blender axes.
lines={}
def bone(name,a,b,parent=None,r=.05):
 lines[name]=(np.array(a),np.array(b),parent,r)
pelvis=(.061,-.013,.485);waist=(.06,.002,.561);mid=(.055,.018,.65);neck=(.047,.031,.787);chin=(.05,.031,.833)
bone('pelvis',pelvis,waist,r=.088);bone('spine',waist,mid,'pelvis',.074);bone('chest',mid,neck,'spine',.082);bone('neck',neck,chin,'chest',.035);bone('head',chin,(.045,.04,.97),'neck',.072)
for side,shoulder,elbow,wrist,palm,hip,knee,ankle,toe in [
 ('R',(-.052,.002,.761),(-.113,-.012,.604),(-.139,-.046,.474),(-.14,-.068,.407),(.01,-.033,.474),(-.040,-.091,.247),(-.094,-.11,.088),(-.130,-.197,.034)),
 ('L',(.158,.073,.75),(.213,.103,.603),(.26,.067,.475),(.26,.04,.405),(.117,.018,.472),(.145,.101,.268),(.157,.208,.096),(.184,.139,.032))]:
 def limb(n,a,b,p,r):bone(n+'.'+side,a,b,p,r)
 limb('clavicle',(.05,.03,.744),shoulder,'chest',.04)
 limb('upper_arm',shoulder,elbow,'clavicle.'+side,.056)
 limb('forearm',elbow,wrist,'upper_arm.'+side,.034)
 limb('hand',wrist,palm,'forearm.'+side,.035)
 limb('thigh',hip,knee,'pelvis',.065)
 limb('shin',knee,ankle,'thigh.'+side,.049)
 limb('foot',ankle,toe,'shin.'+side,.05)
# Fit weights to tapered bone envelopes, restricting opposite limbs in the
# separated silhouettes. Vertex groups stay editable in the delivered blend.
verts=np.array([v.co[:] for v in body.data.vertices])
scores=[]
for name,(a,b,parent,r) in lines.items():
 d=b-a;t=np.clip(((verts-a)@d)/(d@d),.055,.94)
 dist=np.linalg.norm(verts-a-t[:,None]*d,axis=1)
 score=np.maximum(.002,dist-.48*r)+.33*dist
 if name.startswith(('upper_arm','forearm','hand','clavicle')):
  wrong=(verts[:,0]>.005) if name.endswith('.R') else (verts[:,0]<.105)
  score[wrong]+=.20
 if name.startswith(('spine','chest','pelvis')):score[(verts[:,0]<-.085)&(verts[:,2]<.64)]+=.16
 scores.append(score)
scores=np.array(scores).T
# Use connected surface regions below the armpits. The right hip pouch
# overlaps the hand's envelope in space, but belongs with the pelvis.
bm=bmesh.new();bm.from_mesh(body.data);bm.verts.ensure_lookup_table()
arm_labels=np.zeros(len(verts),dtype=int)
for label,name in [(1,'hand.R'),(2,'hand.L')]:
    seed=bm.verts[int(np.argmin(np.linalg.norm(verts-lines[name][0],axis=1)))]
    for v in flood(seed,lambda v:v.co.z<.642):arm_labels[v.index]=label
for label,side in [(1,'R'),(2,'L')]:
    columns=[i for i,n in enumerate(lines) if n in [stem+'.'+side for stem in ['upper_arm','forearm','hand','clavicle']]]
    scores[np.ix_((verts[:,2]<.642)&(arm_labels!=label),columns)]+=2.
    scores[np.ix_(arm_labels==label,[i for i in range(len(lines)) if i not in columns])]+=2.
bm.free()
idx=np.argsort(scores,axis=1)[:,:4];ds=np.take_along_axis(scores,idx,axis=1);weights=1/(.014+ds)**5;weights/=weights.sum(1)[:,None]
origin=Vector((.056,.014,0));align=Matrix.Rotation(-.30,3,'Z')
def world(a):return (align@(Vector(a)-origin))*1.985
for v in body.data.vertices:v.co=world(v.co)
arm=bpy.data.armatures.new('Expedition humanoid');rig=bpy.data.objects.new('Ember_Rig',arm);bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for name,(a,b,parent,r) in lines.items():
 e=arm.edit_bones.new(name);e.head=world(a);e.tail=world(b)
 if parent:e.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
groups=[body.vertex_groups.new(name=n) for n in lines]
for i,(bones,ws) in enumerate(zip(idx,weights)):
 for j,w in zip(bones,ws):groups[j].add([i],float(w),'REPLACE')
body.parent=rig;mod=body.modifiers.new('Character skin','ARMATURE');mod.object=rig
# Bring the long stride back to a neutral stance before binding game animation.
for side,sign in [('R',-1),('L',1)]:
 for stem,direction in [('thigh',(sign*.075,-.055,-1)),('shin',(sign*.035,.045,-1)),('foot',(sign*.10,-.86,-.52))]:
  pb=rig.pose.bones[stem+'.'+side];bpy.context.view_layer.update()
  m=pb.matrix.copy();q=(m.to_3x3()@Vector((0,1,0))).rotation_difference(Vector(direction))
  pb.matrix=Matrix.Translation(m.translation)@q.to_matrix().to_4x4()@Matrix.Translation(-m.translation)@m
bpy.context.view_layer.update()
bpy.context.view_layer.objects.active=body;bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='POSE');bpy.ops.pose.armature_apply(selected=False);bpy.ops.object.mode_set(mode='OBJECT')
floor=min(v.co.z for v in body.data.vertices)
for v in body.data.vertices:v.co.z-=floor
bpy.ops.object.mode_set(mode='EDIT')
for e in arm.edit_bones:e.head.z-=floor;e.tail.z-=floor
bpy.ops.object.mode_set(mode='OBJECT')
body.modifiers.new('Game skin','ARMATURE').object=rig
for im in bpy.data.images:
 if im.type=='IMAGE' and im.size[0]>2048:
  im.scale(2048 if 'basecolor' in im.name else 1024,2048 if 'basecolor' in im.name else 1024);im.pack()
bpy.context.preferences.filepaths.save_version=0
for area in bpy.context.screen.areas:
 if area.type=='VIEW_3D':
  area.spaces.active.region_3d.view_distance=3.5;area.spaces.active.region_3d.view_location=(0,0,1)
  area.spaces.active.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(out/'Ember_Tripo.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'Ember_Tripo.glb'),export_format='GLB',export_skins=True,export_animations=False,export_yup=True)
print('SKIN_OK',len(body.data.polygons),len(arm.bones),'height',max(v.co.z for v in body.data.vertices))
