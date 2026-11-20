"""Blender cel preview material. PBR game fallback is exported before applying this.
Uses normal-based three-band color lighting to keep the drawn planes readable.
"""
def install_toon():
    mats=set(m for o in meshes for m in o.data.materials if m)
    for m in mats:
        if 'emissive gold' in m.name:continue
        nt=m.node_tree;bs=nt.nodes.get('Principled BSDF')
        base=tuple(m.diffuse_color[:3])
        geom=nt.nodes.new('ShaderNodeNewGeometry');geom.label='World-space planes'
        dot=nt.nodes.new('ShaderNodeVectorMath');dot.operation='DOT_PRODUCT'
        dot.inputs[1].default_value=Vector((-.55,-.75,.65)).normalized()
        nt.links.new(geom.outputs['Normal'],dot.inputs[0])
        ramp=nt.nodes.new('ShaderNodeValToRGB');ramp.label='Three graphic shadow bands'
        cr=ramp.color_ramp;cr.interpolation='CONSTANT'
        cr.elements.remove(cr.elements[1]);e=cr.elements[0];e.position=0
        e.color=(*(max(0,c*f) for c,f in zip(base,(.60,.50,.52))),1)
        e=cr.elements.new(.18);e.color=(*(c*.84 for c in base),1)
        e=cr.elements.new(.53);e.color=(*base,1)
        if m.name.startswith('V3 Skin'):
            cr.elements[0].color=(*(c*f for c,f in zip(base,(.70,.60,.61))),1)
            cr.elements[1].position=.07
            cr.elements[1].color=(*base,1)
            cr.elements[2].color=(*base,1)
        # Graphic ink, eyeballs and iris colors remain stable as the face rotates.
        if any(n in m.name for n in ['/ Eyes','/ Iris','/ Eye','/ Ink','/ Mouth']) or m.name.startswith(('V3 Ink','V3 Eyes','V3 Iris','V3 Eye','V3 Mouth')):
            for e in cr.elements:e.color=(*base,1)
        nt.links.new(dot.outputs['Value'],ramp.inputs[0])
        em=nt.nodes.new('ShaderNodeEmission');em.label='CEL / illustration preview'
        nt.links.new(ramp.outputs['Color'],em.inputs['Color'])
        out=next(n for n in nt.nodes if n.type=='OUTPUT_MATERIAL' and n.is_active_output)
        nt.links.new(em.outputs[0],out.inputs['Surface'])
    scene.view_settings.view_transform='Standard'
    scene.view_settings.look='None'
    scene.view_settings.exposure=0
    scene['shader_note']='BLEND has editable normal-driven cel materials. GLB contains baked cel vertex colors and unlit material for portable illustrated appearance; dynamic scene lighting requires an engine cel shader.'
install_toon()
