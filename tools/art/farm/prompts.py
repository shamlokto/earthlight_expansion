"""Every prompt for the farm art set, keyed by slot.  jobs(group) expands them into
ComfyUI jobs for comfy.py.  All art is original: no existing game, film or brand is
referenced or imitated."""
import os

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
PORTRAITS = os.path.join(REPO, "art", "colony", "portrait")

# ------------------------------------------------------------------ style paragraphs
# One look for the whole game: pretty hand-painted Japanese anime background art for the world,
# cute clean anime character art for people.  No studio, artist, film or game is named or imitated.
STYLE = ("Beautiful hand-painted Japanese anime background art style: lush and pretty, bright clear colours, soft warm light, gentle painterly brushwork with clean confident shapes, "
         "rounded friendly forms, lovingly detailed and full of charm, smooth high-resolution painting. No text, no lettering, no logos.")
CHARA = ("Cute appealing Japanese anime character art: clean line work, soft cel shading with gentle gradients, large expressive eyes, slightly youthful proportions about five and a half heads tall, "
         "charming but not super-deformed, warm friendly expression.")
COLONY = ("The setting is the inside of a huge rotating cylindrical space colony: the green land curves upward in the hazy far distance on both sides "
          "and arches overhead, with tiny patchwork fields, woods and silver rivers visible on the far side of the cylinder high above, "
          "and one long thin bright straight line of light, the sun-line, running along the axis of the sky instead of a sun. ")
PHOTO = STYLE + " A calm pastoral world of ordinary earthy things: wood, soil, crops, tin roofs, with small traces of salvaged spacecraft parts."
TEX = ("Hand-painted Japanese anime background art, an extreme close-up looking straight down at the ground from directly above (bird's-eye flat lay). "
       "The entire image from edge to edge is evenly covered by one continuous surface, like an all-over pattern: the same size and density at the top, bottom, left and right, "
       "flat, even soft light, bright clear colours, gentle painterly brushwork, smooth high-resolution painting. The surface is: ")
WALL = ("Hand-painted Japanese anime background art, an extreme close-up looking flat-on at a surface, exactly square to it. "
        "The entire image from edge to edge is evenly covered by one continuous surface, like an all-over pattern: the same size and density at the top, bottom, left and right, "
        "flat, even soft light, bright clear colours, gentle painterly brushwork, smooth high-resolution painting. The surface is: ")
CUT = (" " + STYLE + " Isolated on a plain flat uniform light grey background, soft even light, no cast shadow, "
       "the entire subject fully inside the frame with a clear margin all round, centred, upright.")
CROP = "Anime illustration, three-quarter view from slightly above, of a single {x}, growing out of one small round mound of dark brown garden soil. Plump, fresh and appealing."
ICON = ("Game item icon illustration of {x}. One single object, centred, seen from a slight three-quarter angle, plump and appealing with a soft highlight. " + STYLE +
        " Isolated on a plain flat uniform light grey background, no cast shadow, the whole object inside the frame with a margin.")
BLDG = ("Straight-on orthographic front elevation illustration of {x}. Flat frontal view exactly facing the front wall, no perspective, no side walls visible, "
        "the whole building inside the frame from the ground line to the roof top with a small margin, the door at ground level in the centre of the facade, "
        "even soft light, no cast shadows, standing on a thin strip of bare ground, isolated against a plain flat uniform light grey background, no people, no signs with lettering. Cosy and charming. " + STYLE)
PERSON = (" Full-body character illustration. Standing relaxed and upright, {view}, arms hanging loosely at the sides, "
          "empty hands, the whole body visible from the top of the head to the soles of the boots with a clear margin above and below, centred. " + CHARA +
          " Plain flat uniform light grey background, soft even light, no cast shadow, no text.")

# ------------------------------------------------------------------ A. textures (1024x1024, tiled in post)
# mode: how post.py makes it tile.  "quilt" = min-error seam over a wrapped overlap, "mirror" = mirror-tile
TEXTURES = {
    "grass_spring": (TEX + "a fresh spring meadow lawn, short dense bright green grass blades with a few tiny clover leaves and a scattering of very small white daisies.", "quilt"),
    "grass_summer": (TEX + "a summer pasture lawn, dense deep green grass blades, slightly longer, lush and uniform.", "quilt"),
    "grass_autumn": (TEX + "an autumn lawn, dry gold-green grass with scattered small fallen leaves in ochre, rust and brown.", "quilt"),
    "grass_winter": (TEX + "fresh smooth white snow, soft powdery surface with very subtle gentle undulation and fine sparkle, almost uniform.", "quilt"),
    "soil_dry": (TEX + "bare dry untilled garden dirt, pale brown crumbly earth with small clods, fine cracks and a few tiny pebbles, no rows, no furrows.", "quilt"),
    "soil_tilled": (TEX + "freshly hoed garden soil: about eight straight parallel furrows and rounded ridges of loose crumbly medium brown earth, running exactly horizontally from the left edge to the right edge, equally spaced and equally wide from top to bottom.", "mirror"),
    "soil_wet": (TEX + "freshly watered hoed garden soil: about eight straight parallel furrows and rounded ridges of very dark brown wet glistening earth, running exactly horizontally from the left edge to the right edge, equally spaced and equally wide from top to bottom.", "mirror"),
    "path_dirt": (TEX + "hard-packed trodden light brown earth with fine gravel and small stones pressed in, uniform all over, no grass, no edges, no wheel tracks.", "quilt"),
    "cobble": (TEX + "an old village cobblestone pavement, rounded grey and warm brown river stones closely set with earth and a little moss in the joints.", "quilt"),
    "sand": (TEX + "fine pale river sand with very soft small ripples and a few tiny pebbles.", "quilt"),
    "cliff_rock": (WALL + "a natural cliff face of rough layered grey-brown rock with cracks, ledges and a few patches of lichen.", "quilt"),
    "wood_floor": (TEX + "an old farmhouse floor of wide worn honey-brown wooden floorboards running left to right, visible grain, knots and narrow dark gaps.", "mirror"),
    "plank_wall": (WALL + "weathered pale grey-white painted vertical wood siding boards of a farmhouse wall, peeling paint, visible grain, narrow gaps between boards.", "mirror"),
    "barn_red": (WALL + "vertical barn boards painted faded barn red, weathered, with visible grain, nail heads and narrow dark gaps between boards.", "mirror"),
    "plaster_wall": (WALL + "an old cream-white lime plaster wall, slightly uneven trowel marks, hairline cracks and faint stains.", "quilt"),
    "roof_shingle": (WALL + "a roof covered in weathered silver-grey split wooden shingles laid in regular horizontal overlapping rows.", "mirror"),
    "roof_red": (WALL + "a roof covered in old red terracotta clay roof tiles laid in regular horizontal overlapping rows, slightly varied in colour.", "mirror"),
    "roof_tin": (WALL + "a roof of corrugated galvanised metal sheets with vertical corrugation ridges, dull grey with light rust streaks and a few screw heads.", "mirror"),
    "metal_hull": (WALL + "worn spacecraft hull plating, large blue-grey painted metal panels with panel seams, rows of flush rivets, scratches, scorch marks and chipped paint.", "mirror"),
    "concrete_ruin": (WALL + "old ruined concrete, grey, pitted and stained, with cracks, exposed aggregate and faint rust streaks.", "quilt"),
    "brick_ruin": (WALL + "an old ruined brick wall of dark red and brown bricks in regular horizontal courses, crumbling mortar, soot stains and a few chipped bricks.", "mirror"),
    "ash_ground": (TEX + "grey poisoned dead earth covered in ash and pale rubble dust, with small fragments of broken concrete and cinders.", "quilt"),
    "hay": (TEX + "a thick layer of loose golden hay and straw, tangled dry stalks.", "quilt"),
    "water": (TEX + "the surface of a dark clear pond, deep green-blue water with subtle small ripples and soft faint sky reflections, nothing floating on it.", "quilt"),
}

# ------------------------------------------------------------------ B. sky panoramas (2048x1024, wrapped in post)
SKYP = ("Extremely wide 360 degree panoramic anime background painting of the sky only, looking out and up from the ground, no foreground objects, a low flat horizon line near the bottom of the frame, no text. ")
SKIES = {
    "sky_day": SKYP + ("Inside a huge rotating cylindrical space colony by day: soft blue atmospheric haze, a few thin white clouds, and high overhead across the top of the frame "
                       "the far side of the cylinder seen faintly through the blue haze as a pale band of tiny patchwork fields, woods and thin silver rivers; "
                       "one long thin straight brilliant white line of light, the sun-line, runs horizontally across the whole width of the sky. Bright, gentle, natural, beautiful hand-painted anime background art."),
    "sky_dusk": SKYP + ("Inside a huge rotating cylindrical space colony at dusk: warm amber and rose light, the long thin straight sun-line glowing dim orange horizontally across the whole sky, "
                        "and a vast band of window running across the upper sky through which the huge blue and white planet Earth is visible against black space; "
                        "the far side of the cylinder is a faint dusky band of land. Beautiful anime film still, quiet, beautiful."),
    "sky_night": SKYP + ("Inside a huge rotating cylindrical space colony at night: deep dark blue, the long thin straight sun-line reduced to a faint dim silver-blue thread horizontally across the whole sky, "
                         "tiny warm clusters of village and city lights scattered on the far side of the cylinder overhead, and a wide band of window showing black space full of sharp stars. Beautiful anime film still, quiet."),
    "sky_storm": SKYP + ("Inside a huge rotating cylindrical space colony in a rainstorm: heavy layered grey rain clouds and rain haze filling the whole sky, dim flat light, "
                         "the long thin straight sun-line only a pale diffuse streak behind the cloud horizontally across the sky. Beautiful anime film still, moody, soft."),
    "sky_ruins": SKYP + ("The poisoned surface of Earth: a sickly amber and ochre overcast sky, thick dust haze, a dim pale sun disc behind the murk, "
                         "and along the low horizon the far-off dark silhouettes of a dead ruined city skyline with broken towers. Beautiful anime film still, desolate, still."),
}

# ------------------------------------------------------------------ C. scenes (1344x768)
SATO = "a slim woman in her early thirties with a short navy-black bob haircut, in a pale work shirt with rolled sleeves and navy dungarees"
FARMVIEW = ("A wide view of a small farm: a tilled field with crop rows in the foreground, a small weathered pale wooden farmhouse with a tin roof and a hull-plate patch on one wall to the left, "
            "a small red barn to the right, one big broadleaf tree beside the house, a wooden fence, a dirt path. ")
SCENES = {
    "title": "Wide cinematic anime film still at dawn. " + COLONY + "In the foreground, seen from behind, " + SATO + " stands at the edge of her field holding a hoe upright at her side, looking out over the land. "
             "A tilled field with young green rows, a small weathered wooden farmhouse with a tin roof, morning mist, golden pink dawn light along the sun-line. Empty calm sky area in the upper part of the frame. " + PHOTO,
    "intro1": "Wide cinematic anime film still in deep space. The enormous wrecked hull of a giant dark grey warship drifts dead and silent, torn open, scorched, with slow clouds of debris around it; "
              "far behind it, lines of small silent warships hang motionless; the blue curve of Earth at one edge of the frame, cold sunlight, black space, stars. Original spacecraft design, beautiful anime film still, sombre, no text.",
    "intro2": "Wide cinematic anime film still in orbit. Decommissioned grey warships held in scaffold frames are being cut apart for salvage, tiny sparks of welding torches, hull plates floating free, small tugs carrying parts "
              "toward a huge damaged cylindrical space colony in the background with a broken end and repair gantries; Earth below, warm sunlight. Original spacecraft design, beautiful anime film still, hopeful, no text.",
    "intro3": "Wide cinematic anime film still of the inside of a vast empty carrier hangar deck, bare steel floor with faded painted lines, tall ribbed walls, cold light falling from high panels, empty docking cradles. "
              "Two small figures stand facing each other far away in the middle of the huge space: a woman officer in a navy blue uniform with a short dark bob haircut, and an older man, an officer in a dark greatcoat with dark hair. "
              "Quiet, still, a farewell. Beautiful anime film still, muted colours, no text.",
    "intro4": "Wide cinematic aerial anime film still of a river valley. " + COLONY + "A calm river winds through green meadows and small fields to a little village of weathered wooden houses with tin and red tile roofs, "
              "a stone bridge, a village hall with a small bell tower, willows along the banks, orchards, a few roofs patched with spacecraft hull plates. Late morning light. " + PHOTO,
    "intro5": "Anime illustration of an abandoned overgrown farm field, tall weeds, brambles, field stones and fallen branches, a small weathered wooden farmhouse with a tin roof and one broken shutter hanging askew, "
              "and in the grass in the foreground a worn dark blue military kit bag set down beside a rusty gate. " + COLONY + "Soft afternoon light. " + PHOTO,
    "festival_planting": "Anime illustration of a small village square on a spring morning, a planting festival: villagers in simple work clothes carrying trays of green seedlings, long tables with seed baskets and bread, "
                         "plain coloured cloth bunting without lettering strung between weathered wooden houses, blossom on the trees, children running. " + COLONY + PHOTO,
    "festival_lantern": "Anime illustration at night of a calm river under an old stone bridge, dozens of small glowing warm paper lanterns floating on the dark water, their reflections trembling, "
                        "villagers standing quietly on the banks and the bridge as dark silhouettes holding lanterns, willows, " 
                        "and overhead the dim sky of a huge cylindrical space colony with tiny lights on its far side and a faint thin sun-line. Still, tender, remembrance. Beautiful anime film still, no text.",
    "festival_harvest": "Anime illustration of a small village square on a bright autumn day, a harvest fair: wooden stalls piled with pumpkins, corn, carrots, eggplants and bread, hay bales, villagers in work clothes laughing, "
                        "trees in gold and red leaf, plain coloured cloth bunting without lettering. " + COLONY + PHOTO,
    "festival_yearend": "Anime illustration of a small village square on a winter evening with snow on the ground and roofs, a year's end gathering: a bonfire in an iron brazier, strings of small warm lights between the houses, "
                        "villagers in coats holding steaming mugs, gentle snowfall, " "overhead the dim evening sky of a huge cylindrical space colony with tiny lights on its far side and a faint thin sun-line. Warm, quiet, beautiful anime film still, no text.",
    "season_spring": "Anime illustration in spring. " + FARMVIEW + "Fresh bright green grass, the tree in pale pink-white blossom, young seedlings in the field, soft clear morning light. " + COLONY + PHOTO,
    "season_summer": "Anime illustration in high summer. " + FARMVIEW + "Deep green grass, the tree in full dark green leaf, tall tomato plants and corn in the field, strong warm light, a few white clouds. " + COLONY + PHOTO,
    "season_autumn": "Anime illustration in autumn. " + FARMVIEW + "Gold-green dry grass, the tree in orange and red leaf with leaves on the ground, pumpkins in the field, low amber light. " + COLONY + PHOTO,
    "season_winter": "Anime illustration in winter. " + FARMVIEW + "Everything under a blanket of white snow, the tree bare, smoke rising from the farmhouse chimney, the field empty and white, pale cold soft light. " + COLONY + PHOTO,
    "morning": "Anime illustration of the inside of a small plain wooden farmhouse bedroom at sunrise: warm golden light streaming through a simple four-pane window onto a wooden floor and the corner of a bed with a patchwork quilt, "
               "dust motes in the light, an old radio receiver and a tin mug on the windowsill, a straw hat on a peg, through the window a green field in morning mist. Quiet, warm, beautiful anime film still, no text.",
    "descent": "Wide cinematic anime film still. An open industrial cargo lift platform with steel railings descends on heavy cables through thick amber-grey clouds; standing on the platform, seen small from behind and above, "
               "a compact four metre tall humanoid utility robot painted navy blue with rose-pink trim, with a salvage claw arm and a cargo basket on its back. "
               "Far below through gaps in the cloud, the broken towers of a ruined overgrown city under a sickly amber sky. Original design, beautiful anime film still, vast, quiet, no text.",
    "ruins": "Anime illustration at street level of an overgrown ruined city street on a dead Earth: cracked asphalt, collapsed concrete buildings, rusted vehicle shells, pale dry vines and grey ash drifts, "
             "broken towers fading into thick haze, a sickly amber overcast sky, dim flat light. Silent, desolate, beautiful anime film still, no people, no text, no signs.",
    "heart10": "Anime illustration at dusk from behind of two people sitting close side by side on the wooden steps of a farmhouse porch, seen from behind: " + SATO + ", and beside her another person in a plain dark coat. "
               "Beyond them a field of crops and a fence in warm amber dusk light, two mugs on the step, a lantern glowing. " + COLONY + "Earth is visible through a vast window band in the dusk sky. Tender, quiet. " + PHOTO,
    "shop_store": "Anime illustration of the interior of a small village seed and general store: a worn wooden counter, shelves of plain seed tins, cloth seed bags, jars, loaves of bread, trays of green seedlings by the window, "
                  "coiled rope, rucksacks hanging, a fishing rod on the wall, warm daylight through the window. Tidy, homely, beautiful anime film still, nobody present, no readable text, no labels with lettering.",
    "shop_ranch": "Anime illustration of the interior of a ranch barn office: a rough wooden counter, sacks of feed, hay bales, milk churns, a brush and a hand milker on hooks, a stable half-door open onto a sunny paddock with a black-and-white cow and white hens. "
                  "Warm light, dust in the air, beautiful anime film still, nobody present, no readable text.",
    "shop_workshop": "Anime illustration of the interior of an engineer's workshop in a village: a heavy steel workbench with vices and hand tools, hoes, axes and hammers hung on a pegboard wall, a small forge glowing, "
                     "shelves of salvaged spacecraft parts and scrap metal, a big sliding door half open to daylight. Warm practical clutter, beautiful anime film still, nobody present, no readable text.",
    "shop_cafe": "Anime illustration of the interior of a cosy cafe built inside an old shuttle hangar: a curved ribbed metal ceiling, a counter made from a salvaged hull panel, a few wooden tables and mismatched chairs, "
                 "hanging warm lamps, a steaming pot on a stove, pies on the counter, a big hangar door window with green hills outside. Beautiful anime film still, inviting, nobody present, no readable text.",
    "shop_barge": "Anime illustration of the deck of a small flat river trading barge moored at a village dock: a striped dark red cloth awning, low tables with rare seeds in little tins, glass bottles of tonic, bolts of cloth, brass lamps, "
                  "rich dark red cushions, calm river and willows behind. Late afternoon light, beautiful anime film still, nobody present, no readable text.",
    "hall_memory": "Anime illustration of a quiet room in a village hall: rows of simple glass display cases on wooden tables, each holding one small old-world object: a pocket watch, a teacup, a tin toy robot, a medal, a worn book, a music box, a photograph in a frame. "
                   "Soft daylight from a tall window, pale plaster walls, wooden floor, still and respectful. Beautiful anime film still, nobody present, no readable text.",
}

# ------------------------------------------------------------------ D. cut-out sprites
CROPS = {  # id: (half-grown, ripe)
    "turnip": ("young turnip plant with a rosette of fresh green leaves and the top of a small white root just showing", "ripe turnip plant with broad green leaves and a big round white-and-purple turnip root half out of the soil"),
    "potato": ("young bushy potato plant with dark green leaves", "mature potato plant with dark green leaves and several pale brown potatoes showing at the surface of the soil at its base"),
    "cucumber": ("young cucumber vine climbing a short bamboo stake, with green leaves and yellow flowers", "cucumber vine on a short bamboo stake with big leaves and several long ripe green cucumbers hanging"),
    "strawberry": ("young low strawberry plant with green leaves and small white flowers", "low strawberry plant with green leaves and many ripe bright red strawberries hanging around it"),
    "tomato": ("young tomato plant tied to a short wooden stake, green leaves, small green tomatoes", "tomato plant tied to a wooden stake, heavy with clusters of ripe red tomatoes"),
    "corn": ("young corn plant, knee high, long green leaves, no cobs yet", "tall mature corn stalk with long leaves, a tassel on top and two ripe golden corn cobs with husks partly open"),
    "onion": ("young onion plant with thin upright green shoots", "ripe onion plant with tall green tops bending over and a big golden-brown onion bulb half out of the soil"),
    "pumpkin": ("young pumpkin vine with large green leaves, a yellow flower and a small green pumpkin", "pumpkin vine with large leaves and one big ripe orange pumpkin sitting on the soil"),
    "carrot": ("young carrot plant with a small tuft of feathery green leaves", "ripe carrot plant with a full tuft of feathery green leaves and the orange shoulder of a big carrot showing above the soil"),
    "eggplant": ("young eggplant bush with green leaves and pale purple flowers", "eggplant bush with green leaves and several glossy dark purple eggplants hanging"),
    "sweetpotato": ("young sweet potato vine with heart-shaped green leaves spreading low", "sweet potato plant with heart-shaped leaves and several reddish-purple sweet potatoes showing at the surface of the soil at its base"),
    "spinach": ("young spinach plant, a small rosette of dark green leaves", "full grown spinach plant, a big lush rosette of crinkled dark green leaves"),
    "moonflower": ("young unknown plant with silvery blue-green leaves and one closed pale blue-white flower bud", "strange beautiful plant with silvery blue-green leaves and three open pale luminous blue-white star-shaped flowers that glow softly from within"),
}
SPRITES = {
    "sprout": CROP.format(x="tiny generic green seedling with two small round leaves"),
    "dead": CROP.format(x="withered dead crop plant, brown dry shrivelled leaves and a bent dry stalk"),
    "grass_1": "Anime illustration, side view, of a single small short tuft of fresh green fodder grass, ankle high, with a little soil at its base.",
    "grass_2": "Anime illustration, side view, of a single medium tuft of green fodder grass, shin high, with a little soil at its base.",
    "grass_3": "Anime illustration, side view, of a single tall dense tuft of green fodder meadow grass with seed heads, knee high, with a little soil at its base.",
    "weed": "Anime illustration, three-quarter view from slightly above, of a single scruffy field weed, a dandelion-like plant with jagged leaves and a spent seed head, with a little soil at its base.",
    "rock": "Anime illustration, three-quarter view from slightly above, of a single small rounded grey field stone the size of a loaf of bread.",
    "branch": "Anime illustration, three-quarter view from slightly above, of a single fallen dead tree branch with a few twigs and no leaves, lying flat.",
    "stump": "Anime illustration, three-quarter view from slightly above, of a single old weathered tree stump with roots spreading at its base and growth rings on the cut top.",
    "boulder": "Anime illustration, three-quarter view from slightly above, of a single large rough grey granite boulder, waist high, with a little moss.",
    "tree_spring": "Anime illustration, side view, of one single mature broadleaf oak-like tree with a short thick trunk and a wide rounded crown, in spring with fresh light green leaves and pale blossom.",
    "tree_summer": "Anime illustration, side view, of one single mature broadleaf oak-like tree with a short thick trunk and a wide rounded crown, in summer with dense dark green leaves.",
    "tree_autumn": "Anime illustration, side view, of one single mature broadleaf oak-like tree with a short thick trunk and a wide rounded crown, in autumn with orange, red and gold leaves.",
    "tree_winter": "Anime illustration, side view, of one single mature broadleaf oak-like tree with a short thick trunk and a wide rounded crown, in winter, bare branches with snow lying on them, no leaves.",
    "pine": "Anime illustration, side view, of one single tall conical pine tree, dark green needles, straight trunk.",
    "bush": "Anime illustration, side view, of one single round leafy green garden bush, waist high.",
    "flowers": "Anime illustration, side view, of one small clump of wild meadow flowers, red poppies, white daisies and blue cornflowers with green stems and leaves.",
    "reeds": "Anime illustration, side view, of one clump of tall green river reeds and brown bulrushes.",
    "rubble": "Anime illustration, three-quarter view from slightly above, of a single heap of broken grey concrete chunks with bent rusty rebar and small glints of bright salvageable metal among the pieces.",
    "rubble_done": "Anime illustration, three-quarter view from slightly above, of a single low flattened scattered patch of small broken grey concrete fragments and dust, already dug through, almost flat.",
    "pillar": "Anime illustration, side view, of a single broken grey concrete column, snapped off jaggedly at twice the height of a person, with rusty rebar sticking out of the top and a square base.",
    "crawler": "Anime illustration, three-quarter side view, of a strange dog-sized beetle-like creature, rust-coloured domed shell, six jointed legs, two short feelers, small dark eyes; round, odd and endearing, a bit comical, not scary. Original creature design.",
    "drone": "Anime illustration, three-quarter view, of an old stray spherical maintenance drone hovering, a dented grey metal ball the size of a football with scratched paint, small thrusters, a short antenna and one single round glowing red camera eye that makes it look curious and a little lost. Original design.",
    "hydra": "Anime illustration, three-quarter view, of a small knee-high automatic sentry turret on three splayed tripod legs, with twin short barrels and a small sensor, painted worn military grey, small and stubby, almost cute. Original design.",
    "stairs": "Anime illustration, three-quarter view from above, of a dark concrete stairwell opening going down into the ground, steps descending into blackness, framed by a broken concrete rim and rubble.",
    "pallas_front": "Anime illustration, straight front view, of a compact four metre tall humanoid utility robot standing upright, feet together: rounded armour plates painted navy blue with rose-pink trim lines, "
                    "a smooth head with one horizontal visor sensor, no weapons, the right forearm replaced by a three-fingered steel salvage claw, a wire-mesh cargo basket mounted on its back visible over the shoulders, "
                    "a toy-like but cool little working mecha with chunky rounded proportions, slightly scuffed. Original mecha design.",
    "chicken_side": "Anime illustration, exact side view facing left, of a single cute round plump white hen standing, small red comb, yellow legs, bright friendly eyes.",
    "chicken_front": "Anime illustration, front view facing the camera, of a single cute round plump white hen standing, small red comb, yellow legs, bright friendly eyes.",
    "cow_side": "Anime illustration, exact side view facing left, of a single sweet-faced gentle black-and-white dairy cow standing calmly on all four legs, big soft eyes, a small bell on a collar.",
    "cow_front": "Anime illustration, front view facing the camera, of a single sweet-faced gentle black-and-white dairy cow standing calmly, big soft eyes, a small bell on a collar.",
    "fish_float": "Anime illustration, side view, of a single small red-and-white round fishing float bobber with a short stem.",
    "bin": "Anime illustration, three-quarter front view, of a single large sturdy wooden shipping crate bin with a hinged plank lid, iron corner straps, waist high, weathered wood.",
    "signpost": "Anime illustration, front view, of a single rustic wooden signpost, a post with one blank weathered wooden arrow board, no lettering.",
    "mailbox": "Anime illustration, three-quarter front view, of a single old metal rural mailbox on a wooden post, faded blue paint, small red flag.",
    "well": "Anime illustration, three-quarter front view, of a single round stone farm well with a small wooden roof, a winch with rope and a wooden bucket.",
    "lantern": "Anime illustration, front view, of a single wooden post with an iron bracket holding an old glass oil lantern, glowing warmly.",
    "scarecrow": "Anime illustration, front view, of a single friendly farm scarecrow on a wooden cross pole, straw-stuffed old shirt, patched trousers, burlap sack head with stitched smile, battered straw hat.",
    "bed": "Anime illustration, three-quarter view from slightly above, of a single simple wooden single bed with a white pillow and a colourful patchwork quilt.",
    "radio": "Anime illustration, three-quarter front view, of a single old boxy radio receiver with a wooden case, a cloth speaker grille, two round knobs and a telescopic antenna, no lettering.",
    "table": "Anime illustration, three-quarter view from slightly above, of a single plain sturdy wooden farmhouse table.",
    "counter": "Anime illustration, three-quarter front view, of a single old wooden shop counter with a panelled front and a worn top, a small brass bell on it.",
    "shelf": "Anime illustration, front view, of a single tall wooden shop shelf unit fully stocked with plain jars, tins, cloth bags, bottles and boxes, no labels with lettering.",
    "trough": "Anime illustration, three-quarter view from slightly above, of a single long wooden animal feeding trough filled with hay.",
    "nestbox": "Anime illustration, three-quarter front view, of a single wooden hen nest box filled with straw, with two white eggs in the straw.",
    "memorial": "Anime illustration, front view, of a single simple rough-cut grey standing stone memorial, chest high, with a small blank polished brass plate fixed to it and a few wild flowers laid at its base, no lettering.",
    "barge": "Anime illustration, exact side view, of a single small flat wooden river trading barge with a dark red striped cloth awning on poles over the deck, crates and jars on deck, a brass lamp, a tiller at the stern.",
    "lift": "Anime illustration, three-quarter front view, of a single open industrial cargo lift: a square steel platform with yellow-painted safety railings forming an open cage, a mesh gate, and a control post with a big lever and two buttons, worn and rusty.",
}
for _id, (_a, _b) in CROPS.items():
    SPRITES["crop_%s_1" % _id] = CROP.format(x=_a)
    SPRITES["crop_%s_2" % _id] = CROP.format(x=_b)
SPRITE_SMALL = {"sprout", "dead", "grass_1", "grass_2", "grass_3", "weed", "rock", "branch", "fish_float", "radio", "nestbox", "rubble_done"} | {k for k in SPRITES if k.startswith("crop_")}

PALLAS_VIEWS = {
    "pallas_back": "Show this exact same robot from directly behind, rotated 180 degrees, back view: the wire-mesh cargo basket mounted on its back is now facing the camera, same navy blue and rose-pink paint, same proportions, same standing pose, the steel salvage claw arm now on the left side of the picture. Plain flat uniform light grey background, soft even light, no shadow, whole robot in frame.",
    "pallas_side": "Show this exact same robot in exact side profile view facing left, rotated 90 degrees: the cargo basket on its back to the right, the visor head facing left, same navy blue and rose-pink paint, same proportions, standing upright. Plain flat uniform light grey background, soft even light, no shadow, whole robot in frame.",
}

# ------------------------------------------------------------------ E. building facades
BUILDINGS = {  # name: (description, w, h)
    "house": ("a small weathered single-storey wooden farmhouse with pale grey-white plank siding, a corrugated tin gable roof, a short brick chimney, a plain wooden front door in the centre with one step, a four-pane window on each side, and one square patch of blue-grey spacecraft hull plate riveted over a corner of the wall", 1024, 1024),
    "barn": ("a classic red-painted wooden farm barn with a gambrel roof of grey shingles, big white-trimmed double doors in the centre and a small hay loft hatch above them", 1024, 1024),
    "coop": ("a small low wooden hen house on short legs with a mono-pitch tin roof, a little hen door with a ramp in the centre and a wire mesh window", 1024, 768),
    "silo": ("a tall cylindrical farm grain silo of weathered galvanised corrugated metal with a domed cap, a small access door at ground level in the centre and a ladder up the front", 768, 1344),
    "greenhouse_ruin": ("a derelict small glasshouse, a rusty iron frame with a gabled roof, most glass panes broken or missing, weeds growing inside, a doorway in the centre with the door gone", 1216, 896),
    "greenhouse": ("a small repaired working glasshouse with a white-painted iron frame, a gabled glass roof, clean glass panes, green plants visible inside, a glazed door in the centre", 1216, 896),
    "store": ("a village seed and general shop, a two-storey wooden building with pale plank siding and a red tile roof, a striped cloth awning without lettering over a big shop window, wooden crates of green seedlings stacked at the front, a glazed shop door in the centre", 1024, 1024),
    "ranch": ("a wide wooden ranch house with brown plank walls and a tin roof, a hay loft door with a hoist beam above the central front door, hay bales and milk churns beside the door", 1216, 896),
    "workshop": ("an engineer's workshop, a wide shed of corrugated metal and wood patched with spacecraft hull plates, one big sliding steel door in the centre standing half open, a small chimney pipe, heaps of scrap metal and gears stacked along the front wall", 1216, 896),
    "cafe": ("a cafe built into an old shuttle hangar, a wide low semicircular arched hangar front of ribbed blue-grey metal filled in with a wooden wall, big windows glowing warmly, a wooden door in the centre, two small tables with chairs outside, strings of small lamps", 1216, 896),
    "hall": ("a village hall, a dignified plain building of cream plaster and timber with a grey shingle roof and a small square bell tower with a bronze bell on top in the centre, wide double doors in the centre up two stone steps, tall windows either side", 1024, 1216),
    "cottage_a": ("a small village cottage with cream plaster walls, a red clay tile roof, a blue front door in the centre, two shuttered windows and flower boxes", 1024, 1024),
    "cottage_b": ("a small village house with weathered grey vertical plank walls, a grey wood shingle roof, a green front door in the centre, one window on each side, and a solar panel salvaged from a spacecraft fixed on the roof", 1024, 1024),
    "lift_tower": ("a tall rusty steel cargo lift head-frame tower, an open lattice of riveted girders with two large cable wheels at the top, heavy cables running down, and an open gateway at ground level in the centre", 768, 1344),
}

# ------------------------------------------------------------------ F. people
# front views: Qwen-Edit from the existing portrait (identity only), redrawn as full-body anime characters
PEOPLE = {  # id: (portrait file or None, description)
    "sato": ("sato.webp", "The woman from the reference picture redrawn as a polished, beautiful, cute full-body anime character: Mira Sato, a young Japanese woman, adorable but capable, slim, "
                          "short glossy navy-black bob haircut with a side-swept fringe, big warm brown eyes, a calm small smile, no headset, no uniform. "
                          "She is a farmer now: a pale cream work shirt with the sleeves neatly rolled to the elbows, navy blue denim dungarees with brass buttons, sturdy brown leather work boots, "
                          "and a round straw hat hanging on her back by a thin cord around her neck, its brim showing behind her shoulders. Tidy hands with five fingers, tidy feet, clean confident line work, flawless finish."),
    "general": ("general.webp", "The man from the reference picture as a cute anime character: mid forties, short dark hair, light stubble, kind tired eyes, a slight smile. "
                                "He wears a plain long dark charcoal civilian wool coat, open over a dark navy scarf and a grey shirt, dark trousers and black boots; no insignia, no medals."),
    "ruess": ("ruess.webp", "The man from the reference picture as a cute anime character: an engineer in his sixties, swept-back grey hair, grey stubble, brass welding goggles pushed up on his forehead, gruff kindly face. "
                            "He wears an oil-stained olive canvas work jacket over a dark shirt, a leather tool belt, grey work trousers and heavy boots."),
    "marrow": ("marrow.webp", "The woman from the reference picture as a cute anime character: a village warden in her seventies, silver-white hair in a loose bun, sharp kind lined face, upright posture. "
                              "She wears a long moss-green wool coat with a grey knitted shawl over the shoulders, a long dark skirt and sturdy brown boots."),
    "seln": ("w_seln.webp", "The woman from the reference picture as a cute anime character: a Black woman in her forties with short natural curly hair, small gold earrings, a warm broad smile. "
                            "She wears a cream linen shirt with rolled sleeves under a green canvas gardening apron with a pocket, brown trousers and garden boots."),
    "corran": ("w_corran.webp", "The man from the reference picture as a cute anime character: a stout retired gunnery chief in his late sixties, bald with a fringe of white hair, a big white moustache, ruddy cheerful face. "
                                "He wears a dark navy work shirt with rolled sleeves, brown braces, tan work trousers tucked into rubber farm boots."),
    "oduya": ("w_oduya.webp", "The man from the reference picture as a cute anime character: a Black man in his forties with a short beard and round wire glasses, a small headlamp on a band around his forehead, calm friendly face. "
                              "He wears orange work overalls with grey reflective bands, the sleeves rolled, a white cook's apron tied at the waist, and work boots."),
    "maris": ("w_maris.webp", "The woman from the reference picture as a cute anime character: a cheerful courier pilot in her mid twenties with curly dark brown hair tied back, an orange headband, freckles, a big smile, no headset. "
                              "She wears a short tan and orange flight jacket over a teal neckerchief, khaki cargo trousers, brown boots, a canvas courier satchel across her body."),
    "vashti": ("w_vashti.webp", "The woman from the reference picture as a cute anime character: a lean salvage hunter in her thirties, tanned, a red bandana over black hair in a long braid over one shoulder, a serious quiet face, a smudge of dirt on her cheek. "
                                "She wears a worn brown leather jacket with one scuffed metal shoulder plate, goggles hanging at her neck, dark canvas trousers, heavy boots, fingerless gloves."),
    "moraine": (None, "A regal woman in her fifties: sharp elegant face, a knowing half-smile, sleek black hair in an asymmetric bob with one bold red streak, dark red lipstick. "
                      "She wears a long tailored dark red coat with a high collar, black gloves, black trousers and polished black boots; the bearing of a queen who is now a trader."),
}
PEOPLE_VIEWS = {
    "back": "Show this exact same anime character from directly behind, rotated 180 degrees, back view, we see the back of the head and the back of the clothes, the face is not visible. Same outfit, same colours, same body, same hair, same relaxed standing pose with arms at the sides, same full-body framing from head to boots. Plain flat uniform light grey studio background, soft even light, no shadow.",
    "side": "Show this exact same anime character in exact side profile view, the whole body turned 90 degrees to face the left edge of the picture, standing upright, arms at the sides. Same outfit, same colours, same body, same hair, same full-body framing from head to boots. Plain flat uniform light grey studio background, soft even light, no shadow.",
}
PEOPLE_BACK_EXTRA = {"sato": " The round straw hat hangs on her back by its cord, between the shoulder blades, fully visible from behind."}

# ------------------------------------------------------------------ G. video (WAN 2.2 I2V)
VSTYLE = " The camera is almost perfectly still, locked off. Slow, calm, gentle natural motion, beautiful hand-painted anime background art."
VIDEOS = {  # name: (scene slot, prompt)
    "title": ("title", "Dawn on a small farm. A light breeze moves the young crops and the grass, thin morning mist drifts slowly over the field, the woman stands still, her hair and shirt stirring slightly in the breeze, the light brightens very gently." + VSTYLE),
    "intro1": ("intro1", "The huge wrecked warship drifts and turns extremely slowly in space, small pieces of debris float slowly past, distant ships hang motionless, the stars are fixed. Silent." + VSTYLE),
    "intro2": ("intro2", "Tiny welding sparks flicker on the ship hulls, a cut hull plate drifts slowly away, a small tug moves slowly across the frame, the planet below turns very slowly." + VSTYLE),
    "intro3": ("intro3", "Two small distant figures stand facing each other in the vast empty hangar, almost motionless; dust drifts in the shafts of cold light; after a moment the woman slowly salutes." + VSTYLE),
    "intro4": ("intro4", "The river flows gently and glitters, the trees sway slightly in the breeze, thin smoke rises from a few chimneys, small cloud shadows drift slowly across the valley." + VSTYLE),
    "intro5": ("intro5", "Tall weeds and grass sway in a light breeze, the broken shutter on the farmhouse swings slowly on its hinge, a few seeds drift through the air." + VSTYLE),
    "festival_lantern": ("festival_lantern", "The glowing paper lanterns float slowly downstream on the dark river, their reflections tremble on the water, the people stand quietly, lantern flames flicker softly." + VSTYLE),
    "descent": ("descent", "The open cargo lift platform descends slowly and steadily, clouds drift upward past it, the cables tremble slightly, the robot stands still on the platform, the ruined city below slowly comes closer through the haze." + VSTYLE),
    "morning": ("morning", "Golden morning sunlight slowly brightens through the window, dust motes drift in the beam of light, mist moves gently over the field outside." + VSTYLE),
    "season_spring": ("season_spring", "A soft spring breeze: blossom petals drift down from the tree, grass and seedlings sway gently, small clouds move slowly." + VSTYLE),
    "season_summer": ("season_summer", "A warm summer day: the leaves of the tree and the tall crops sway gently in a light breeze, heat shimmer, small clouds move slowly." + VSTYLE),
    "season_autumn": ("season_autumn", "An autumn afternoon: orange leaves fall slowly from the tree and drift across the field, the dry grass sways gently." + VSTYLE),
    "season_winter": ("season_winter", "A quiet winter day: snowflakes fall slowly and softly, smoke rises gently from the farmhouse chimney, everything else is still." + VSTYLE),
    "heart10": ("heart10", "Two people sit quietly side by side on the porch steps at dusk, seen from behind; one leans very slightly toward the other; the crops sway gently in the evening breeze, the lantern flame flickers, steam rises from the mugs." + VSTYLE),
}
WALKSTYLE = (" She stays exactly in the centre of the frame, the whole body from head to boots always visible, steady even rhythm, natural arm swing. "
             "Static locked camera, no camera movement, no zoom. Plain flat uniform grey background, flat even light, no shadow, consistent character design in every frame.")
WALKS = {  # name: (ref slot under people/, prompt)
    "sato_walk_front": ("sato_front", "Anime character animation, 2D animation: a cute anime woman walks on the spot toward the camera, as if on a treadmill, front view, walking in place at a relaxed steady pace." + WALKSTYLE),
    "sato_walk_back": ("sato_back", "Anime character animation, 2D animation: a cute anime woman seen from behind walks on the spot away from the camera, as if on a treadmill, back view, walking in place at a relaxed steady pace." + WALKSTYLE),
    "sato_walk_side": ("sato_side", "Anime character animation, 2D animation: a cute anime woman in side profile facing left walks on the spot toward the left, as if on a treadmill, side view, walking in place at a relaxed steady pace, legs striding clearly." + WALKSTYLE),
}

# ------------------------------------------------------------------ Sato extras (portraits, action poses)
SAME = "this exact same anime character (same face, same short navy-black bob, same cream shirt with rolled sleeves, same navy dungarees, same brown boots, straw hat hanging on her back), same art style, clean confident line work, soft cel shading, polished flawless finish"
SATO_PORTRAITS = {  # slot: (ref, prompt)   ref "front" = picked people/sato_front, "portrait" = picked sato_portrait
    "sato_portrait": ("front", "A close-up bust portrait of " + SAME + ": head and shoulders down to the chest, facing the camera with her head tilted very slightly, "
                               "a warm small smile, big warm brown eyes with bright highlights. Soft plain pale warm cream background with a very gentle gradient, nothing else. Beautiful, cute, appealing."),
    "sato_portrait_happy": ("portrait", "Keep everything exactly the same (same character, same framing, same clothes, same background), change only her expression: a big bright delighted smile with her mouth open and her eyes happily closed in arcs, a light blush."),
    "sato_portrait_tired": ("portrait", "Keep everything exactly the same (same character, same framing, same clothes, same background), change only her expression: tired and worn out, eyelids half closed, a small weary smile, a little sweat drop on her temple, slightly messy hair."),
}
POSE_BG = " Full body from head to boots inside the frame with a clear margin, centred. Plain flat uniform light grey background, soft even light, no cast shadow, no text."
SATO_POSES = {  # start frames for the action loops (Qwen-Edit from the picked front view)
    "sato_hoe": "Show " + SAME + " in a three-quarter front view, standing with feet apart, holding a wooden-handled garden hoe with both hands, the hoe raised in front of her ready to strike the ground." + POSE_BG,
    "sato_water": "Show " + SAME + " in a three-quarter front view, standing and leaning forward slightly, holding a galvanised metal watering can with both hands, tilted so the spout points down at the ground in front of her." + POSE_BG,
    "sato_fish": "Show " + SAME + " in a three-quarter front view, standing relaxed, holding a simple bamboo fishing rod with both hands, the rod angled up and forward, a thin line hanging from its tip." + POSE_BG,
}
ACT = " She stays in the same place in the centre of the frame, whole body always visible. Anime character animation, 2D animation, consistent character design in every frame. Static locked camera, no zoom. Plain flat uniform grey background, flat even light, no shadow."
ACTIONS = {  # name: (ref path kind, prompt, w, h)
    "sato_idle_front": ("walkref:sato_front", "A cute anime woman stands still facing the camera and breathes gently: her shoulders rise and fall slightly, she blinks, her hair moves a little; a calm idle loop, feet do not move." + ACT, 480, 832),
    "sato_hoe": ("pose:sato_hoe", "A cute anime woman swings a garden hoe: she lifts the hoe over her shoulder, then chops it down into the ground in front of her, then lifts it again, a steady repeating farm work motion, feet planted." + ACT, 640, 640),
    "sato_water": ("pose:sato_water", "A cute anime woman waters the ground with a watering can: she tips the can and a gentle shower of water drops falls from the spout, she sways the can slowly left and right, a steady repeating motion, feet planted." + ACT, 640, 640),
    "sato_fish": ("pose:sato_fish", "A cute anime woman fishing: she holds the fishing rod steady, the rod tip bobs gently, she gives a small tug on the rod and settles again, a calm repeating motion, feet planted." + ACT, 640, 640),
}

# ------------------------------------------------------------------ H. icons (256x256 cut-outs)
ICONS = {
    "turnip": "one fresh white-and-purple turnip with its green leaves", "potato": "one brown potato", "cucumber": "one green cucumber", "strawberry": "one ripe red strawberry with its green cap",
    "tomato": "one ripe red tomato with its green stalk", "corn": "one golden corn cob with the green husk peeled half back", "onion": "one golden-brown onion", "pumpkin": "one round orange pumpkin",
    "carrot": "one orange carrot with its green leafy top", "eggplant": "one glossy dark purple eggplant", "sweetpotato": "one reddish-purple sweet potato", "spinach": "one bunch of fresh dark green spinach leaves tied with string",
    "moonflower": "one cut pale luminous blue-white star-shaped flower with a silvery stem, softly glowing",
    "egg": "one white hen's egg", "milk_s": "one small glass bottle of fresh milk with a paper cap, plain, no label", "milk_m": "one medium tall glass bottle of fresh milk with a cork stopper, plain, no label",
    "milk_l": "one large wide glass jug bottle of fresh milk with a wire swing-top, plain, no label",
    "fish_s": "one small silver minnow fish, side view facing left", "fish_m": "one speckled brown trout fish, side view facing left", "fish_l": "one large olive-bronze carp fish, side view facing left",
    "fish_spring": "one slender river fish with pale green back and pink flanks, side view facing left", "fish_summer": "one deep-bodied river fish with bright blue and yellow scales, side view facing left",
    "fish_autumn": "one river fish with deep red and orange flanks and a hooked jaw, side view facing left", "fish_winter": "one long pale silver-white river fish with icy blue fins, side view facing left",
    "fish_king": "one huge old golden carp fish with large shining gold scales and long whiskers, side view facing left",
    "herb": "one small bunch of fresh green wild herbs tied with twine", "berry": "one small cluster of dark blue-purple wild berries on a twig with two leaves", "mushroom": "one brown forest mushroom with a round cap",
    "frostcap": "one pale icy-blue winter mushroom with a frosted cap", "scrap": "one small pile of rusty scrap metal pieces, gears and bent plate", "alloy": "one bright polished silver metal ingot bar",
    "crystal": "one clear pale violet natural crystal cluster", "photo": "one old faded photograph of a seaside landscape in a small worn wooden frame", "teacup": "one old porcelain teacup with a faded blue rim and a small chip",
    "book": "one old worn cloth-bound book with a blank faded green cover", "watch": "one old brass pocket watch with a chain, cracked glass", "toy": "one old tin wind-up toy robot, red and silver, scratched",
    "medal": "one old bronze military medal on a faded blue ribbon, plain star shape", "seedtin": "one small old round metal tin of seeds, dented, lid slightly open showing seeds, no label",
    "musicbox": "one small old wooden music box with a brass crank and open lid", "datachip": "one small translucent blue data chip with gold contacts", "ring": "one plain old gold ring",
    "bread": "one round crusty loaf of country bread", "soup": "one earthenware bowl of vegetable soup with a wooden spoon", "pie": "one golden baked fruit pie in a tin dish", "tea": "one steaming mug of tea, plain enamel mug",
    "tonic": "one small corked glass bottle of amber tonic, plain, no label", "hoe": "one garden hoe with a wooden handle and steel blade, lying diagonally", "can": "one galvanised metal watering can with a long spout",
    "sickle": "one hand sickle with a curved steel blade and wooden handle", "hammer": "one heavy sledgehammer with a wooden handle, lying diagonally", "axe": "one wood axe with a wooden handle and steel head, lying diagonally",
    "rod": "one simple bamboo fishing rod with a reel and line, lying diagonally", "milker": "one small hand milking pail of stainless steel with a lid and a short rubber tube", "brush": "one wooden animal grooming brush with stiff bristles and a leather strap",
    "seedbag": "one small plain cloth seed pouch of undyed burlap tied at the neck with twine, no printing",
}


# ------------------------------------------------------------------ job expansion
def jobs(group, work="/tmp/farm-art"):
    sel = lambda g, s: os.path.join(work, "sel", g, s + ".png")
    out = []
    add = lambda slot, kind, prompt, w, h, **kw: out.append(dict(group=group, slot=slot, kind=kind, prompt=prompt, w=w, h=h, **kw))
    if group == "textures":
        for k, (p, _mode) in TEXTURES.items():
            add(k, "t2i", p, 1328, 1328)
    elif group == "sky":
        for k, p in SKIES.items():
            add(k, "t2i", p, 2048, 1024)
    elif group == "scenes":
        for k, p in SCENES.items():
            add(k, "t2i", p, 1344, 768)
    elif group == "sprites":
        for k, p in SPRITES.items():
            s = 768 if k in SPRITE_SMALL else 1024
            add(k, "t2i", p + CUT, s, s)
    elif group == "pallas":
        for k, p in PALLAS_VIEWS.items():
            add(k, "edit", p, 1024, 1024, refs=[sel("sprites", "pallas_front")])
    elif group == "buildings":
        for k, (d, w, h) in BUILDINGS.items():
            add(k, "t2i", BLDG.format(x=d), w, h)
    elif group == "people":
        for k, (ref, d) in PEOPLE.items():
            p = d + PERSON.format(view="facing the camera, front view")
            if ref:
                add(k + "_front", "edit", p, 896, 1344, refs=[os.path.join(PORTRAITS, ref)])
            else:
                add(k + "_front", "t2i", p, 896, 1344)
    elif group == "people_views":
        for k in PEOPLE:
            for v, p in PEOPLE_VIEWS.items():
                add("%s_%s" % (k, v), "edit", p + (PEOPLE_BACK_EXTRA.get(k, "") if v == "back" else ""), 896, 1344, refs=[sel("people", k + "_front")])
    elif group == "icons":
        for k, d in ICONS.items():
            add(k, "t2i", ICON.format(x=d), 768, 768)
    elif group == "video":
        for k, (scene, p) in VIDEOS.items():
            add(k, "i2v", p, 832, 480, refs=[sel("scenes", scene)], length=81)
    elif group == "walk":
        for k, (ref, p) in WALKS.items():
            add(k, "i2v", p, 480, 832, refs=[os.path.join(work, "walkref", ref + ".png")], length=81)
    elif group == "sato_portraits":
        for k, (ref, p) in SATO_PORTRAITS.items():
            add(k, "edit", p, 832, 1040, refs=[sel("people", "sato_front") if ref == "front" else sel("sato_portraits", "sato_portrait")])
    elif group == "sato_poses":
        for k, p in SATO_POSES.items():
            add(k, "edit", p, 1024, 1024, refs=[sel("people", "sato_front")])
    elif group == "action":
        for k, (ref, p, w, h) in ACTIONS.items():
            kind, name = ref.split(":")
            add(k, "i2v", p, w, h, refs=[os.path.join(work, "walkref" if kind == "walkref" else "poseref", name + ".png")], length=81)
    else:
        raise SystemExit("unknown group " + group)
    return out


GROUPS = ["sato_portraits", "sato_poses", "action", "textures", "sky", "scenes", "sprites", "pallas", "buildings", "people", "people_views", "icons", "video", "walk"]
