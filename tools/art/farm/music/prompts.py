"""Music prompts for Sato's Harvest (ACE-Step v1 3.5B, instrumental only).

No composer, game, film or artist is named or imitated. Every track asks for
instrumental music with no vocals; the lyric is the [instrumental] tag.
"""

COMMON = "instrumental, no vocals, no singing, loopable background music, cosy slice-of-life, gentle, warm"

TRACKS = {
    "title":    ("wistful hopeful title theme, soft piano melody, acoustic guitar arpeggios, light strings, glockenspiel accents, "
                 "slow tempo, 80 bpm, major key, nostalgic, calm"),
    "spring":   ("bright light spring morning, acoustic guitar strumming, soft flute melody, glockenspiel, pizzicato strings, "
                 "cheerful, 100 bpm, major key, pastoral farm life"),
    "summer":   ("warm lazy summer afternoon, ukulele, acoustic guitar, soft flute, light shaker, relaxed, 90 bpm, major key, "
                 "sunny, easygoing"),
    "autumn":   ("mellow autumn harvest, fingerpicked acoustic guitar, warm piano, soft cello, clarinet melody, 85 bpm, "
                 "gentle, golden, content"),
    "winter":   ("quiet winter, music box melody, soft celesta, gentle piano, light sustained strings, 70 bpm, calm, "
                 "snowy, tender, lullaby"),
    "night":    ("soft solo piano, sleepy night, slow, 60 bpm, quiet, peaceful, sparse, warm reverb, lullaby"),
    "village":  ("lively village market, accordion melody, ukulele, acoustic guitar, light hand percussion, tambourine, "
                 "112 bpm, major key, cheerful, bustling, folk"),
    "central":  ("airy bright concourse, warm soft synth pads, gentle piano melody, light sparkling arpeggio, spacious, "
                 "major key, uplifting, peaceful, a hint of outer space, 90 bpm, hopeful, lounge"),
    "ruins":    ("mysterious gentle ambient, sparse, soft low strings, warm analog synth, gentle steady pulse, "
                 "exploration, curious, wonder, calm, dreamy, 80 bpm"),
    "festival": ("cheerful japanese festival, taiko drums, bamboo flutes, shamisen, hand claps, 116 bpm, festive, joyful, "
                 "traditional folk"),
    "lantern":  ("tender slow ballad, soft bamboo flute melody, koto, gentle piano, warm light strings, 66 bpm, "
                 "bittersweet, peaceful, major key, remembrance"),
    "wedding":  ("warm celebratory, simple, piano melody, acoustic guitar, light strings, glockenspiel, 92 bpm, major key, "
                 "happy, heartfelt, gentle waltz, instrumental only"),
    "belt":     ("calm space ambient, drifting, warm synth pads, soft piano notes, gentle sparkling arpeggio, slow pulse, "
                 "wonder, peaceful, starlight, 76 bpm, major key"),
    "undercroft": ("gentle mysterious underground ambient, soft warm synth pads, delicate music box melody, sparse dripping water "
                   "plinks, soft marimba, warm low drone, slow, 72 bpm, curious, cosy, calm wonder, not scary"),
}

SECONDS = {"undercroft": 95, "night": 80, "ruins": 90, "lantern": 80, "wedding": 70, "festival": 80}
DEFAULT_SECONDS = 95
TWO = ("title", "spring", "village")   # two candidates each, the better one is kept


def tags(name):
    return TRACKS[name] + ", " + COMMON


LYRICS = "[instrumental]"
