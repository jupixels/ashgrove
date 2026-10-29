# Blender script: a Mixamo character + its Mixamo animation FBXs -> one web-ready GLB.
# Run: blender --background --python tools/convert_mixamo.py -- monster|maya
# Animation FBXs only need matching "mixamorig:" bone names, so any Mixamo character works.
import bpy, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'assets', 'raw', 'characters')
CHARACTERS = {
    # the Ch25 creature with the downloaded mutant/zombie animations
    'monster': dict(folder='mixamo', character='Ch25_nonPBR.fbx', out='monster.glb', slim=0.62,
                    anims=['idle', 'walk', 'run', 'roar', 'attack', 'crawl', 'search']),
    # Maya (Ch02): walking, breathing idle, and scared idle for when it's close
    'maya': dict(folder='maya', character='Ch02_nonPBR.fbx', out='maya.glb',
                 anims=['walk', 'idle', 'scared']),
}
TEXTURE_SIZE = 512   # the source ships 2048-4096px maps; the game renders at 240p

name = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'monster'
cfg = CHARACTERS[name]
src = os.path.join(RAW, cfg['folder'])
out = os.path.join(ROOT, 'assets', 'models', cfg['out'])

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=os.path.join(src, cfg['character']), automatic_bone_orientation=False)
rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
rig.name = name.capitalize()
if rig.animation_data and rig.animation_data.action:
    bpy.data.actions.remove(rig.animation_data.action)

# Slim the body: pull every vertex in toward the bone it follows, across the bone only (never along it), so
# limbs and torso get thinner but keep their length and still fit every animation. The head, hands and feet
# are thinned less so the face and claws keep their shape.
def slim(rig, amount):
    bones = rig.data.bones
    keep = lambda n: 0.85 if any(k in n for k in ('Head', 'Neck')) else 0.8 if any(k in n for k in ('Hand', 'Foot', 'Toe')) else 0.0
    for ob in [o for o in bpy.data.objects if o.type == 'MESH']:
        to_rig = rig.matrix_world.inverted() @ ob.matrix_world
        back = to_rig.inverted()
        names = {g.index: g.name for g in ob.vertex_groups}
        for v in ob.data.vertices:
            p = to_rig @ v.co
            moved, total = None, 0.0
            for g in v.groups:
                b = bones.get(names.get(g.group, ''))
                if not b or g.weight <= 0:
                    continue
                axis = (b.tail_local - b.head_local).normalized()
                on_axis = b.head_local + axis * (p - b.head_local).dot(axis)
                f = amount + (1 - amount) * keep(b.name)
                q = (on_axis + (p - on_axis) * f) * g.weight
                moved = q if moved is None else moved + q
                total += g.weight
            if total > 0:
                v.co = back @ (moved / total)


if cfg.get('slim'):
    slim(rig, cfg['slim'])

# Only colour maps go to the game (it uses simple lit materials): unhook everything but Base Color
# (and Alpha, for hair) so normal/specular/gloss maps aren't exported, then shrink what is left.
for mat in bpy.data.materials:
    if not mat.use_nodes:
        continue
    for node in mat.node_tree.nodes:
        if node.type == 'BSDF_PRINCIPLED':
            for inp in node.inputs:
                if inp.name not in ('Base Color', 'Alpha'):
                    for link in list(inp.links):
                        mat.node_tree.links.remove(link)
for im in bpy.data.images:
    if im.size[0] > TEXTURE_SIZE:
        im.scale(TEXTURE_SIZE, TEXTURE_SIZE)

actions = {}
for anim in cfg['anims']:
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.fbx(filepath=os.path.join(src, anim + '.fbx'), automatic_bone_orientation=False)
    new = [o for o in bpy.context.scene.objects if o not in before]
    arm = next(o for o in new if o.type == 'ARMATURE')
    act = arm.animation_data.action
    act.name = anim
    act.use_fake_user = True
    actions[anim] = act
    for o in new:
        bpy.data.objects.remove(o, do_unlink=True)
    print('ANIM', anim, act.frame_range[:])

rig.animation_data_create()
ad = rig.animation_data
for anim, act in actions.items():
    ad.action = act
    if hasattr(ad, 'action_slot') and len(act.slots):
        ad.action_slot = act.slots[0]
    track = ad.nla_tracks.new()
    track.name = anim
    track.strips.new(anim, int(act.frame_range[0]), act)
    track.mute = True
    ad.action = None

bpy.ops.export_scene.gltf(
    filepath=out,
    export_format='GLB',
    export_animation_mode='NLA_TRACKS',
    export_image_format='AUTO',   # keeps PNG (with alpha) for hair, JPEG otherwise
    export_jpeg_quality=80,
)
print('WROTE', out, os.path.getsize(out))
