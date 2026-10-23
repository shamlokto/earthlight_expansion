# Shared helpers for the research scripts: ROM loading, LoROM mapping, PNG output.
# Set EARTHLIGHT_ROM to your ROM (.sfc) and EARTHLIGHT_OUT to an output folder.
import os, struct, zlib

ROM_PATH = os.environ.get('EARTHLIGHT_ROM', 'Earth Light (Japan).sfc')
OUT = os.environ.get('EARTHLIGHT_OUT', 'out') + '/'


def rom():
    d = open(ROM_PATH, 'rb').read()
    return d[512:] if len(d) % 0x8000 == 512 else d


def lorom(addr):  # SNES address -> file offset
    return ((addr >> 16) & 0x7f) * 0x8000 + (addr & 0x7fff)


def png(path, w, h, rgb):  # rgb: bytes of length w*h*3
    raw = b''.join(b'\0' + bytes(rgb[y * w * 3:(y + 1) * w * 3]) for y in range(h))
    def ch(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + ch(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
                           + ch(b'IDAT', zlib.compress(raw, 6)) + ch(b'IEND', b''))


def bgr555(v):
    return ((v & 31) * 255 // 31, ((v >> 5) & 31) * 255 // 31, ((v >> 10) & 31) * 255 // 31)
