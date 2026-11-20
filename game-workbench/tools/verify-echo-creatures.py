"""Reopen each source and reimport each GLB; compare animated, skinned geometry."""
import bpy
import json
import math
from pathlib import Path

library=Path(__file__).resolve().parents[1]/"library"
rows=json.loads((library/"echo-art/manifest.json").read_text(encoding="utf-8"))["assets"]
def inspect():
    rig,=[o for o in bpy.context.scene.objects if o.type=="ARMATURE"]
    mesh,=[o for o in bpy.context.scene.objects if o.type=="MESH" and o.find_armature()==rig]
    for v in mesh.data.vertices:
        assert abs(sum(g.weight for g in v.groups)-1)<.002
    scene=bpy.context.scene
    for track in rig.animation_data.nla_tracks:track.mute=True
    output={}
    for action in bpy.data.actions:
        rig.animation_data.action=action;rig.animation_data.action_slot=action.slots[0]
        low,high=action.frame_range
        samples=[];poses=[]
        for t in [0,.20,.45,.70,1]:
            frame=low+(high-low)*t;scene.frame_set(int(frame),subframe=frame-int(frame))
            ob=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
            verts=[ob.matrix_world@v.co for v in ob.data.vertices]
            poses.append(verts)
            samples.append([func(v[i] for v in verts) for func in [min,max] for i in range(3)])
        delta=max((a-b).length for pose in poses[1:] for a,b in zip(poses[0],pose))
        assert delta>.008,(action.name,delta)
        assert all(math.isfinite(x) for s in samples for x in s)
        output[action.name]=samples
    return len(rig.data.bones),output

for row in rows:
    if row["group"] not in ["creatures","bosses"]:continue
    folder="小怪" if row["group"]=="creatures" else "区域首领"
    name=row["name"]
    bpy.ops.wm.open_mainfile(filepath=str(library/"models/回响远征"/folder/(name+".blend")))
    assert any(im.packed_file and "立绘" in im.name for im in bpy.data.images)
    bones,source=inspect()
    bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.render.fps=30
    bpy.ops.import_scene.gltf(filepath=str(library/"exports/回响远征"/folder/(name+".glb")))
    count,runtime=inspect()
    assert count==bones and source.keys()==runtime.keys(),(name,bones,count,source.keys(),runtime.keys())
    diff=max(abs(a-b) for clip in source for src,dst in zip(source[clip],runtime[clip]) for a,b in zip(src,dst))
    assert diff<.055,(name,diff)
    print("VERIFIED",row["id"],bones,len(source),"maximum sampled extent difference",round(diff,5),flush=True)
