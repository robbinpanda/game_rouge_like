"""Build the Daybreak platform clock and Sunny Bay balustrade as reusable GLBs."""
from math import cos, pi, sin
from pathlib import Path
from runpy import run_path

import bpy

palette = run_path(str(Path(__file__).with_name("build-sanctuary-panorama.py")))
Builder = palette["Builder"]
output = palette["LIB"] / "exports" / "回响远征" / "晴湾环境模块"


def platform_clock(model):
    model.box((0, .09, 0), (.95, .18, .95), "CREAM_DARK")
    model.cyl((0, .39, 0), .56, .43, .45, 8, "CREAM")
    model.cyl((0, .68, 0), .45, .45, .13, 8, "BRASS")
    model.cyl((0, 1.58, 0), .22, .15, 1.8, 12, "TEAL")
    for y, radius in [(.8, .26), (1.02, .23), (2.22, .21), (2.38, .26)]:
        model.cyl((0, y, 0), radius, radius, .07, 12, "BRASS")
    for side in (-1, 1):
        model.beam((side*.12, 2.25, 0), (side*.45, 2.80, 0), .085, "TEAL")
    center = 3.07
    for z, radius, depth, color in [(0, .66, .45, "TEAL"), (.24, .61, .09, "BRASS"),
                                     (-.24, .61, .09, "BRASS")]:
        model.cyl((0, center, z), radius, radius, depth, 32, color, (pi/2, 0, 0))
    for side in (-1, 1):
        model.cyl((0, center, side*.295), .538, .538, .035, 32, "CREAM", (pi/2, 0, 0))
        for tick in range(12):
            a = tick*pi/6
            inner = .40 if tick % 3 == 0 else .445
            model.beam((inner*sin(a), center+inner*cos(a), side*.32),
                       (.495*sin(a), center+.495*cos(a), side*.32), .035, "INK")
        for dx, dy, weight in [(-.22, .13, .058), (.29, .235, .039)]:
            model.beam((0, center, side*.343), (side*dx, center+dy, side*.343), weight, "INK")
        model.ico((0, center, side*.362), (.069, .069, .035), "BRASS", subdiv=1)
    model.cyl((0, 3.68, 0), .4, .34, .095, 12, "BRASS")
    model.ico((0, 3.73, 0), (.34, .225, .25), "CORAL", subdiv=2)
    model.cyl((0, 3.96, 0), .085, .022, .18, 8, "BRASS")


def bay_railing(model):
    model.box((0, .13, 0), (3.8, .26, .55), "CREAM_DARK")
    model.box((0, .275, 0), (3.74, .09, .53), "CREAM")
    for x in (-1.55, 1.55):
        model.box((x, .70, 0), (.52, .92, .48), "CREAM")
        model.box((x, 1.16, 0), (.66, .14, .62), "LIMESTONE")
        model.cyl((x, 1.30, 0), .417, .325, .15, 4, "CORAL", (0, pi/4, 0))
        for side in (-1, 1):
            model.panel([(x-.14,.96,side*.25),(x+.14,.96,side*.25),
                         (x+.105,.67,side*.25),(x,.57,side*.25),(x-.105,.67,side*.25)],"CORAL")
            model.beam((x,.68,side*.266),(x,.86,side*.266),.025,"BRASS")
    for y in (.59, .99):
        model.box((0, y, 0), (2.83, .115, .13), "BLUE_RAIL")
    for x in (-.64, .64):
        model.box((x, .72, 0), (.095, .76, .11), "WINDOW_BLUE")
        for y in (.59, .99):
            model.ico((x,y,.075),(.036,.036,.018),"BRASS",subdiv=1)
    # A single trailing cluster leaves the module ends clear for repeated placement.
    for i in range(8):
        t = i/7
        x, y, z = 1.26+.21*sin(t*5), .98-.72*t, .19+.11*t
        model.ico((x,y,z),(.135,.075,.105),"LEAF" if i%2 else "LEAF_DARK",subdiv=1)
        if i in (1, 3, 6):
            for j in range(3):
                a=j*2*pi/3
                model.ico((x+.07*cos(a),y+.04,z+.06*sin(a)),(.078,.067,.078),
                          "BLOSSOM" if j%2 else "LILAC",subdiv=1)


if __name__ == "__main__":
    output.mkdir(parents=True, exist_ok=True)
    for name, build in [("晴湾站台钟", platform_clock), ("蓝漆海湾栏杆", bay_railing)]:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        model = Builder(name)
        build(model)
        model.finish()
        bpy.ops.export_scene.gltf(filepath=str(output / (name+".glb")), export_format="GLB",
                                  export_yup=True, export_animations=False)
