#!/usr/bin/env python3
"""Finish the raw ACE-Step tracks into art/farm/music/<name>.ogg + .mp3 and add them to art/farm/manifest.json.

  python3 post.py check                 # duration / loudness / peak / silence of every raw file
  python3 post.py make name=raw.flac …  # trim, fade, normalise to -18 LUFS, encode, write manifest entries

Raw files come from gen.py ($FARM_MUSIC_WORK/raw, default /tmp/farm-music/raw).
Loop handling: leading and trailing silence are cut, then the track ends at the last strong onset-free
point before the tail; 0.3 s fade in and 1.5 s fade out so the wrap-around is soft.
"""
import glob, json, os, re, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
OUT = os.path.join(ROOT, "art/farm/music")
MAN = os.path.join(ROOT, "art/farm/manifest.json")
WORK = os.environ.get("FARM_MUSIC_WORK", "/tmp/farm-music")
TARGET = -18.0


def ff(*a):
    return subprocess.run(["ffmpeg", "-hide_banner", "-nostats", *a], capture_output=True, text=True).stderr


def duration(f):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f],
                                capture_output=True, text=True).stdout.strip())


def stats(f):
    e = ff("-i", f, "-af", "ebur128=peak=true,volumedetect", "-f", "null", "-")
    I = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", e)[-1])
    lra = float(re.findall(r"LRA:\s+([\d.]+) LU", e)[-1])
    peak = float(re.findall(r"max_volume: (-?[\d.]+) dB", e)[-1])
    s = ff("-i", f, "-af", "silencedetect=n=-45dB:d=0.4", "-f", "null", "-")
    sil = [(float(a), float(b)) for a, b in re.findall(r"silence_start: (-?[\d.]+)[\s\S]*?silence_end: ([\d.]+)", s)]
    return dict(dur=duration(f), I=I, lra=lra, peak=peak, silences=sil)


def bounds(f, st):
    d = st["dur"]; start, end = 0.0, d
    for a, b in st["silences"]:
        if a <= 0.05: start = b
        if b >= d - 0.1: end = a
    # look for the quietest 50 ms frame in the last 6 s before the tail: a gentle cut point
    e = ff("-ss", "%.2f" % max(start, end - 6), "-to", "%.2f" % end, "-i", f,
           "-af", "asetnsamples=2205,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level", "-f", "null", "-")
    t = [float(x) for x in re.findall(r"pts_time:([\d.]+)", e)]
    v = [float(x) if x not in ("-inf", "inf") else -120.0 for x in re.findall(r"RMS_level=(-?[\w.]+)", e)]
    if t and v and end - start > 40:
        base = max(start, end - 6)
        # prefer the late part (keep most of the music): weight towards the end
        best = min(range(len(v)), key=lambda i: v[i] - 4.0 * (t[i] / 6.0))
        end = base + t[best] + 0.05
    return start, end


def make(name, src):
    os.makedirs(OUT, exist_ok=True)
    st = stats(src); s, e = bounds(src, st); L = e - s
    fade = "afade=t=in:st=0:d=0.3,afade=t=out:st=%.3f:d=1.5" % (L - 1.5)
    trim = "atrim=start=%.3f:end=%.3f,asetpts=PTS-STARTPTS,%s" % (s, e, fade)
    m = ff("-i", src, "-af", trim + ",loudnorm=I=%g:TP=-1.5:LRA=11:print_format=json" % TARGET, "-f", "null", "-")
    j = json.loads(m[m.rindex("{"):m.rindex("}") + 1])
    ln = ("loudnorm=I=%g:TP=-1.5:LRA=11:measured_I=%s:measured_TP=%s:measured_LRA=%s:measured_thresh=%s:offset=%s:linear=true"
          % (TARGET, j["input_i"], j["input_tp"], j["input_lra"], j["input_thresh"], j["target_offset"]))
    af = trim + "," + ln + ",aresample=44100"
    ogg, mp3 = os.path.join(OUT, name + ".ogg"), os.path.join(OUT, name + ".mp3")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-af", af, "-ac", "2", "-c:a", "libvorbis", "-b:a", "80k", ogg], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-af", af, "-ac", "2", "-c:a", "libmp3lame", "-b:a", "96k", mp3], check=True)
    sec = round(duration(ogg), 2)
    o = stats(ogg)
    print("%-9s %6.1fs  %5.1f LUFS  peak %5.1f dB  ogg %4d kB  mp3 %4d kB  (from %s, cut %.1f-%.1f)" % (
        name, sec, o["I"], o["peak"], os.path.getsize(ogg) // 1024, os.path.getsize(mp3) // 1024, os.path.basename(src), s, e))
    return sec


def write_manifest(entries):
    m = json.load(open(MAN))            # read fresh: another tool writes this file too
    for name, sec in entries.items():
        m.setdefault("files", {})["music/" + name] = {"file": "music/%s.mp3" % name, "ogg": "music/%s.ogg" % name, "seconds": sec}
    tmp = MAN + ".tmp"
    with open(tmp, "w") as fh:
        json.dump(m, fh, indent=1); fh.write("\n")
    os.replace(tmp, MAN)


if __name__ == "__main__":
    if sys.argv[1] == "check":
        for f in sorted(glob.glob(WORK + "/raw/*.flac")):
            st = stats(f)
            print("%-34s %6.1fs  I %6.1f  LRA %4.1f  peak %5.1f  silences %s" % (os.path.basename(f), st["dur"], st["I"], st["lra"], st["peak"],
                  [(round(a, 1), round(b, 1)) for a, b in st["silences"]]))
    elif sys.argv[1] == "make":
        ent = {}
        for a in sys.argv[2:]:
            n, f = a.split("=", 1)
            ent[n] = make(n, f if os.path.isabs(f) else os.path.join(WORK, "raw", f))
        write_manifest(ent)
