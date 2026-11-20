"""Shared illustrated lighting palette for Blender nodes and GLB vertex baking."""
def palette_knots(name,base):
    if name.startswith(('V4 Ink','V4 Eyes','V4 Iris','V4 Eye','V4 Mouth')) or 'emissive gold' in name:
        return [(0,base),(1,base)]
    if name.startswith('V4 Skin') or name.startswith('01 Skin'):
        settings=[(0,(.54,.43,.43)),(.18,(.54,.43,.43)),(.24,(.78,.70,.67)),(.48,(.84,.77,.73)),(.56,(.96,.93,.88)),(1,(1,1,1))]
    elif name.startswith('V4 Hair'):
        settings=[(0,(.48,.47,.51)),(.16,(.57,.55,.60)),(.25,(.78,.75,.80)),(.52,(.90,.86,.91)),(.63,(1,1,1)),(1,(1.09,1.06,1.08))]
    else:
        settings=[(0,(.48,.43,.46)),(.16,(.57,.51,.54)),(.23,(.76,.70,.70)),(.48,(.84,.79,.77)),(.56,(1,1,1)),(1,(1,1,1))]
    return [(p,tuple(min(1,c*f) for c,f in zip(base,factors))) for p,factors in settings]

def palette_sample(name,base,value):
    knots=palette_knots(name,base)
    if value<=knots[0][0]:return knots[0][1]
    for (p,a),(q,b) in zip(knots,knots[1:]):
        if value<=q:
            t=(value-p)/(q-p);return tuple(x*(1-t)+y*t for x,y in zip(a,b))
    return knots[-1][1]
