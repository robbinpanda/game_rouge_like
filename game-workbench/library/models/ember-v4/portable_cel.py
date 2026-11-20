"""Bake the illustrated bands to vertex colors for a portable unlit GLB.
The .blend keeps editable normal-driven cel nodes; exported shadow bands move
with the mesh and need a game-engine cel shader for dynamic scene lighting.
"""
exec(compile((HERE/'cel_palette.py').read_text(encoding='utf8'),'cel_palette.py','exec'))
def prepare_portable_cel():
    saved=[]
    unlit=bpy.data.materials.new('EMBER / portable painted cel');unlit.use_nodes=True
    nt=unlit.node_tree;nt.nodes.clear()
    vc=nt.nodes.new('ShaderNodeVertexColor');vc.layer_name='CelColor'
    em=nt.nodes.new('ShaderNodeBsdfPrincipled');em.inputs['Roughness'].default_value=1
    out=nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(vc.outputs['Color'],em.inputs['Base Color']);nt.links.new(em.outputs[0],out.inputs['Surface'])
    light=Vector((-.62,-.58,.60)).normalized()
    for o in meshes:
        oldm=list(o.data.materials);oldi=[p.material_index for p in o.data.polygons];saved.append((o,oldm,oldi))
        smooth_normals=[v.vector.copy() for v in o.data.corner_normals]
        flat_normals=[p.normal.copy() for p in o.data.polygons]
        ca=o.data.color_attributes.get('CelColor') or o.data.color_attributes.new(name='CelColor',type='FLOAT_COLOR',domain='CORNER')
        for p in o.data.polygons:
            m=oldm[p.material_index];base=list(m.diffuse_color[:3]);name=m.name
            stable=name.startswith(('V4 Ink','V4 Eyes','V4 Iris','V4 Eye','V4 Mouth')) or 'emissive gold' in name
            for li in p.loop_indices:
                n=smooth_normals[li] if p.use_smooth else flat_normals[p.index]
                v=n.dot(light)
                rgb=palette_sample(name,base,v)
                ca.data[li].color=(*rgb,1)
        o.data.color_attributes.active_color=ca
        o.data.materials.clear();o.data.materials.append(unlit)
        for p in o.data.polygons:p.material_index=0
    return saved

def restore_editable_materials(saved):
    for o,mats,indices in saved:
        o.data.materials.clear()
        for m in mats:o.data.materials.append(m)
        for p,i in zip(o.data.polygons,indices):p.material_index=i

def finalize_unlit_glb(path):
    # Export the color attribute through the supported PBR base-color path,
    # then declare the standard glTF unlit material while preserving BIN.
    import struct,json
    raw=path.read_bytes();length,kind=struct.unpack_from('<II',raw,12)
    doc=json.loads(raw[20:20+length]);rest=raw[20+length:]
    assert all('COLOR_0' in p['attributes'] for m in doc['meshes'] for p in m['primitives'])
    for m in doc['materials']:
        m['extensions']={'KHR_materials_unlit':{}}
        m['pbrMetallicRoughness']={'baseColorFactor':[1,1,1,1],'metallicFactor':0,'roughnessFactor':1}
        m.pop('emissiveFactor',None);m.pop('emissiveTexture',None)
    doc['extensionsUsed']=sorted(set(doc.get('extensionsUsed',[])+['KHR_materials_unlit']))
    chunk=json.dumps(doc,ensure_ascii=False,separators=(',',':')).encode('utf8')
    chunk+=b' '*((-len(chunk))%4)
    out=struct.pack('<III',0x46546C67,2,20+len(chunk)+len(rest))+struct.pack('<II',len(chunk),kind)+chunk+rest
    path.write_bytes(out)

