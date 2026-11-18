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
    "central":  ("airy city concourse, soft synth pads, gentle electric piano and piano, light arpeggiator, spacious, "
                 "ambient, calm, futuristic, 90 bpm, hopeful"),
    "ruins":    ("mysterious ambient, sparse, low strings drone, soft analog synth, gentle steady pulse, minor key, "
                 "exploration, curious, calm, not scary, 80 bpm"),
    "festival": ("cheerful japanese festival, taiko drums, bamboo flutes, shamisen, hand claps, 116 bpm, festive, joyful, "
                 "traditional folk"),
    "lantern":  ("tender remembrance, slow, bamboo flute melody, soft koto, gentle piano, light strings, 66 bpm, "
                 "bittersweet, peaceful, evening lanterns"),
    "wedding":  ("warm celebratory, simple, acoustic guitar, piano, light strings, glockenspiel, 92 bpm, major key, "
                 "happy, heartfelt, gentle waltz"),
}

SECONDS = {"night": 80, "ruins": 90, "lantern": 80, "wedding": 70, "festival": 80}
DEFAULT_SECONDS = 95
TWO = ("title", "spring", "village")   # two candidates each, the better one is kept


def tags(name):
    return TRACKS[name] + ", " + COMMON


LYRICS = "[instrumental]"
