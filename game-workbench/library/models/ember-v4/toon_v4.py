"""Illustrated stepped lighting with narrow soft transitions and local occlusion."""
exec(compile((HERE/'cel_palette.py').read_text(encoding='utf8'),'cel_palette.py','exec'))
def install_toon():
    for m in set(m for o in meshes for m in o.data.materials if m):
        if 'emissive gold' in m.name:continue
        nt=m.node_tree;base=tuple(m.diffuse_color[:3]);knots=palette_knots(m.name,base)
        geom=nt.nodes.new('ShaderNodeNewGeometry')
        dot=nt.nodes.new('ShaderNodeVectorMath');dot.operation='DOT_PRODUCT';dot.inputs[1].default_value=Vector((-.62,-.58,.60)).normalized()
        nt.links.new(geom.outputs['Normal'],dot.inputs[0])
        ramp=nt.nodes.new('ShaderNodeValToRGB');ramp.label='Painted plane lighting';cr=ramp.color_ramp;cr.interpolation='LINEAR'
        cr.elements.remove(cr.elements[1]);cr.elements[0].position=knots[0][0];cr.elements[0].color=(*knots[0][1],1)
        for p,col in knots[1:]:cr.elements.new(p).color=(*col,1)
        nt.links.new(dot.outputs['Value'],ramp.inputs[0])
        source=ramp.outputs['Color']
        stable=m.name.startswith(('V4 Ink','V4 Eyes','V4 Iris','V4 Eye','V4 Mouth'))
        if not stable:
            ao=nt.nodes.new('ShaderNodeAmbientOcclusion');ao.inputs['Distance'].default_value=.028;ao.samples=16
            mix=nt.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=.33
            nt.links.new(source,mix.inputs[1]);nt.links.new(ao.outputs['Color'],mix.inputs[2]);source=mix.outputs[0]
        em=nt.nodes.new('ShaderNodeEmission');em.label='Illustrated material';nt.links.new(source,em.inputs['Color'])
        out=next(n for n in nt.nodes if n.type=='OUTPUT_MATERIAL' and n.is_active_output);nt.links.new(em.outputs[0],out.inputs['Surface'])
    scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=0
    scene['shader_note']='Editable illustrated plane lighting with local AO. GLB keeps baked color bands via unlit vertex colors; dynamic lighting and AO need an engine shader.'
install_toon()
