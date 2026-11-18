# Pallas redesign (successor of the Athena Kai)

Concepts: Qwen-Image-Edit 2509 from the Athena Kai robot / jet pictures (js/art/athenakai.js, decoded to PNG),
prompts `_edit_pallasA`..`D` and `_edit_pallasJA`/`JC` in prompts.json; contact sheet of the 8 robot + 2 jet candidates
was reviewed on 2026-11-18 (seeds 81/82).

**Pick 1 - `pallasCe_81` (white + crimson-magenta + gold, cyan visor)** - keeps the Athena family's colour logic and
silhouette (canopy chest, tail fins), but has its own head (rounded helmet, single swept crest, visor band, no V-fin,
no face grille) and big round shoulder thruster binders instead of wings. Reads as the Athena's upgrade, not as a
famous existing robot. Chosen for the farm figurine and the expansion concept art.

**Pick 2 - `pallasBe_82` (navy + silver + amber)** - the most distinct of the set: heavy shoulder binder pods, short
blade crest, amber accents. A good alternative if the owner wants a clean break from the Athena's colours.

Rejected: `pallasAe_82`, `pallasDe_82` (V-shaped horns came back), `pallasAe_81`, `pallasDe_81`, `pallasCe_82`,
`pallasBe_81` (weaker heads / busier silhouettes). Jets: `pallasJAe_81` (pearl, teal, coral) and `pallasJCe_81`
(white, crimson) both keep the twin tail fins and canopy; JC matches pick 1.

Files for the expansion: `tools/art/pallas/redesign/` - `pallas_robot_front34.png` (clean robot, 3/4 front, rifle and sabre;
`_alt` is a second seed), `pallas_jet_34.png` (jet form, 3/4 side), the pixel-art picks they came from, the figurine
concept used for the farm model, and the contact sheet. Qwen-Image-Edit only dropped the pixel look when the
reference picture was first softened (downscale, bicubic upscale, blur); the robot still has a few hard edges on
the shoulder binders.
