# combine PNGs (same size) in a grid, scaled 1x; pure python PNG decode for our own files
import sys, zlib, struct
sys.path.insert(0, __file__.rsplit('/',1)[0]); from snes import png
def readpng(p):
    d=open(p,'rb').read(); i=8; idat=b''
    while i<len(d):
        n=struct.unpack('>I',d[i:i+4])[0]; t=d[i+4:i+8]; c=d[i+8:i+8+n]
        if t==b'IHDR': w,h=struct.unpack('>II',c[:8])
        if t==b'IDAT': idat+=c
        i+=12+n
    raw=zlib.decompress(idat); rows=[raw[y*(w*3+1)+1:(y+1)*(w*3+1)] for y in range(h)]
    return w,h,rows
out=sys.argv[1]; files=sys.argv[3:]; cols=int(sys.argv[2])
ims=[readpng(f) for f in files]; w,h=ims[0][0],ims[0][1]; rows=(len(ims)+cols-1)//cols
W,H=cols*(w+4),rows*(h+4); img=bytearray(W*H*3)
for k,(iw,ih,r) in enumerate(ims):
    ox,oy=(k%cols)*(w+4),(k//cols)*(h+4)
    for y in range(min(ih,h)):
        img[((oy+y)*W+ox)*3:((oy+y)*W+ox)*3+min(iw,w)*3]=r[y][:min(iw,w)*3]
png(out,W,H,img)
