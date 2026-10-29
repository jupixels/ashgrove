# Blender script: render front / side / back previews of a model.
# Run: blender --background --python tools/preview_model.py -- MODEL.glb OUT_PREFIX
import bpy, math, os, sys
from mathutils import Vector

model, prefix = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=model)
meshes = [o for o in scene.objects if o.type == 'MESH']
pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector([min(p[i] for p in pts) for i in range(3)])
hi = Vector([max(p[i] for p in pts) for i in range(3)])
center, size = (lo + hi) / 2, hi - lo
print('BOUNDS', tuple(round(v, 3) for v in lo), tuple(round(v, 3) for v in hi))

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
cam.data.type = 'ORTHO'
cam.data.ortho_scale = max(size.z, size.x, size.y) * 1.1
scene.collection.objects.link(cam)
scene.camera = cam
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
sun.rotation_euler = (math.radians(45), 0, math.radians(30))
scene.collection.objects.link(sun)
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.render.resolution_x, scene.render.resolution_y = 500, 700
for name, ang in (('front', 0), ('side', 90), ('back', 180), ('q', 35)):
    a = math.radians(ang)
    cam.location = center + Vector((math.sin(a) * 5, -math.cos(a) * 5, 0))
    cam.rotation_euler = (math.radians(90), 0, a)
    scene.render.filepath = f'{prefix}_{name}.png'
    bpy.ops.render.render(write_still=True)
