"""Read-only Blender audit. Run through MCP or Blender's text editor."""
import bpy
import json
import math

report = {"scene": bpy.context.scene.name, "blender_version": bpy.app.version_string,
          "units": bpy.context.scene.unit_settings.system,
          "unit_scale": bpy.context.scene.unit_settings.scale_length,
          "fps": bpy.context.scene.render.fps / bpy.context.scene.render.fps_base,
          "meshes": [], "rigs": [], "actions": [], "warnings": []}
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        mesh = obj.data
        rigs = [m.object for m in obj.modifiers if m.type == 'ARMATURE' and m.object]
        bones = {b.name for rig in rigs for b in rig.data.bones if b.use_deform}
        groups = {g.index for g in obj.vertex_groups if g.name in bones}
        unweighted = sum(1 for v in mesh.vertices if sum(g.weight for g in v.groups if g.group in groups) < 0.0001) if rigs else None
        over_four = sum(1 for v in mesh.vertices if sum(1 for g in v.groups if g.group in groups and g.weight > 0.0001) > 4) if rigs else None
        issues = []
        if not mesh.uv_layers:
            issues.append('缺少 UV')
        if any(abs(s - 1.0) > 0.0001 for s in obj.scale):
            issues.append('对象缩放未归一（绑定前处理）')
        if not mesh.materials or any(m is None for m in mesh.materials):
            issues.append('材质槽缺失')
        if unweighted:
            issues.append(f'{unweighted} 个顶点未绑定到形变骨骼')
        if over_four:
            issues.append(f'{over_four} 个顶点超过 4 根骨骼影响（按目标平台复核）')
        ngons = sum(1 for p in mesh.polygons if len(p.vertices) > 4)
        if ngons:
            issues.append(f'{ngons} 个 N 边面，需复核三角化及变形')
        report['meshes'].append({'name': obj.name, 'vertices': len(mesh.vertices),
            'triangles': sum(max(0, len(p.vertices)-2) for p in mesh.polygons),
            'uv_layers': len(mesh.uv_layers), 'materials': len(mesh.materials),
            'armatures': [r.name for r in rigs], 'unweighted': unweighted,
            'over_four_weights': over_four, 'warnings': issues})
    elif obj.type == 'ARMATURE':
        report['rigs'].append({'name': obj.name, 'bones': len(obj.data.bones),
            'roots': [b.name for b in obj.data.bones if not b.parent],
            'deform_bones': sum(1 for b in obj.data.bones if b.use_deform)})
for action in bpy.data.actions:
    report['actions'].append({'name': action.name, 'frames': list(action.frame_range),
                              'users': action.users})
if not report['meshes']:
    report['warnings'].append('当前场景没有网格模型')
if not report['rigs']:
    report['warnings'].append('当前场景没有骨架；静态场景资产可忽略')
if report['units'] != 'METRIC' or abs(report['unit_scale'] - 1) > 0.0001:
    report['warnings'].append('请确认单位换算；工作台建议 1 单位 = 1 米')
report['note'] = '基于原始网格的只读检查，不含修改器求值、非流形检测、动画穿插与运行时性能验收。'
print('WORKBENCH_REPORT:' + json.dumps(report, ensure_ascii=False))
