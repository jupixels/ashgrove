# Blender script: Mixamo monster (Ch25) + the downloaded Mixamo animations -> assets/models/monster.glb
# Run: blender --background --python tools/convert_monster.py
# The animation FBXs only need matching "mixamorig:" bone names, so any Mixamo character works here.
import bpy, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'raw', 'characters', 'mixamo')
CHARACTER = 'Ch25_nonPBR.fbx'
OUT = os.path.join(ROOT, 'assets', 'models', 'monster.glb')
ANIMS = ['idle', 'walk', 'run', 'roar', 'attack', 'crawl', 'search']
TEXTURE_SIZE = 512   # the source ships 4096px maps; the game renders at 240p

bpy.ops.wm.read_factory_settings(use_empty=True)

bpy.ops.import_scene.fbx(filepath=os.path.join(SRC, CHARACTER), automatic_bone_orientation=False)
rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
rig.name = 'Monster'
if rig.animation_data and rig.animation_data.action:
    bpy.data.actions.remove(rig.animation_data.action)

# Only colour maps go to the game (it uses simple lit materials): unhook everything but Base Color
# so normal/specular/gloss maps aren't exported, then shrink what is left.
for mat in bpy.data.materials:
    if not mat.use_nodes:
        continue
    for node in mat.node_tree.nodes:
        if node.type == 'BSDF_PRINCIPLED':
            for inp in node.inputs:
                if inp.name != 'Base Color':
                    for link in list(inp.links):
                        mat.node_tree.links.remove(link)
for im in bpy.data.images:
    if im.size[0] > TEXTURE_SIZE:
        im.scale(TEXTURE_SIZE, TEXTURE_SIZE)

actions = {}
for name in ANIMS:
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.fbx(filepath=os.path.join(SRC, name + '.fbx'), automatic_bone_orientation=False)
    new = [o for o in bpy.context.scene.objects if o not in before]
    arm = next(o for o in new if o.type == 'ARMATURE')
    act = arm.animation_data.action
    act.name = name
    act.use_fake_user = True
    actions[name] = act
    for o in new:
        bpy.data.objects.remove(o, do_unlink=True)
    print('ANIM', name, act.frame_range[:])

rig.animation_data_create()
ad = rig.animation_data
for name, act in actions.items():
    ad.action = act
    if hasattr(ad, 'action_slot') and len(act.slots):
        ad.action_slot = act.slots[0]
    track = ad.nla_tracks.new()
    track.name = name
    track.strips.new(name, int(act.frame_range[0]), act)
    track.mute = True
    ad.action = None

bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format='GLB',
    export_animation_mode='NLA_TRACKS',
    export_image_format='JPEG',
    export_jpeg_quality=80,
)
print('WROTE', OUT, os.path.getsize(OUT))
