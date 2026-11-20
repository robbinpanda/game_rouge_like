"""Preserve the original illustration's hard plane language, not smooth clay volumes."""
def decimate_planes(o,ratio):
    bpy.context.view_layer.objects.active=o
    dec=o.modifiers.new('Illustration / broad geometric planes','DECIMATE');dec.ratio=ratio
    bpy.ops.object.modifier_apply(modifier=dec.name)
    for p in o.data.polygons:p.use_smooth=False

for o in parts:
    if o.name=='Hair_AnimeSculptedSweep':
        decimate_planes(o,.16)
        # One coherent hair color; lighting describes the large planes without
        # assigning unrelated bright triangles across a single lock.
        for p in o.data.polygons:p.material_index=0
    elif o.name=='Pants_TailoredContinuous':decimate_planes(o,.095)
    elif o.name.startswith('Body_Arm'):decimate_planes(o,.48)
    elif o.name.startswith(('Body_FittedUndershirt','Body_AnimeNeck','Jacket_','Armor_','Boot_','Gear_')):
        for p in o.data.polygons:p.use_smooth=False

# Retain the facial expression loops; give cheek and jaw a stronger broad turn.
head=bpy.data.objects.get('Body_AnimeHead')
if head:
    # The jaw silhouette is authored in cross-sections. Keep stable face normals
    # rather than introducing tiny collapse triangles over the expression.
    for p in head.data.polygons:
        p.use_smooth=True
print('ANGULAR_STYLE_APPLIED',flush=True)
