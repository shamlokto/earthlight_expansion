import sys,pickle;sys.path.insert(0,__file__.rsplit('/',1)[0])
from decomp import *; from snes import *
def palette(d):
    cg=bytearray(512)
    p,_=decode(d,110); cg[0:32]=p[:32]
    p,_=decode(d,193); cg[32:32+224]=p[:224]
    return [bgr555(cg[i*2]|cg[i*2+1]<<8) for i in range(256)]
def cell_gfx(d,gid):
    b,_=decode(d,485+gid); px=[[0]*24 for _ in range(16)]
    for t in range(6):
        o=t*48; tx,ty=t%3,t//3
        for y in range(8):
            for x in range(8):
                sh=7-x
                v=((b[o+y*2]>>sh)&1)|(((b[o+y*2+1]>>sh)&1)<<1)|(((b[o+16+y*2]>>sh)&1)<<2)|(((b[o+17+y*2]>>sh)&1)<<3)
                v|=((b[o+32+y]>>sh)&1)<<5; v|=((b[o+40+y]>>sh)&1)<<6
                px[ty*8+y][tx*8+x]=v
    return px
def render_map(d,m):
    hdr,_=decode(d,732+3*m); g,_=decode(d,733+3*m)
    cells={}
    W,H=62*16+8,41*16+8; img=[[0]*W for _ in range(H)]
    for cy in range(41):
        for cx in range(62):
            v=g[cy*62+cx]
            if v not in cells: cells[v]=cell_gfx(d,hdr[v])
            P=cells[v]; X,Y=cx*16,cy*16+(cx&1)*8
            for y in range(16):
                for x in range(24):
                    if X+x<W and Y+y<H: img[Y+y][X+x]|=P[y][x]
    return img,g,hdr
if __name__ == "__main__":
    d=rom(); fb=pickle.load(open(OUT+'fb.pkl','rb'))
    img,g,hdr=render_map(d,0)
    # framebuffer pixel (x,y) == cell(1,1) origin at (0,0) -> img offset (16,16)
    m=sum(img[y+16][x+16]==fb[y][x] for y in range(168) for x in range(240)); print('match',round(m/(240*168),4))
    P=palette(d); w,h=16*20,16*14
    out=bytearray(w*h*3)
    for y in range(h):
        for x in range(w): out[(y*w+x)*3:(y*w+x)*3+3]=bytes(P[img[y][x]])
    png(OUT+'map0.png',w,h,out)
