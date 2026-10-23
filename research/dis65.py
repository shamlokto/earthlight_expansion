# Minimal 65816 disassembler for LoROM
import sys
sys.path.insert(0,__file__.rsplit('/',1)[0])
from snes import rom, lorom
OPS = {}
def reg(ops, mode):
    for i,m in enumerate(ops.split()):
        pass
# mnemonic table by opcode
T = """BRK s,ORA dxi,COP s,ORA sr,TSB d,ORA d,ASL d,ORA dil,PHP i,ORA im,ASL a,PHD i,TSB ab,ORA ab,ASL ab,ORA al,
BPL r,ORA dix,ORA di,ORA srix,TRB d,ORA dx,ASL dx,ORA dily,CLC i,ORA aby,INC a,TCS i,TRB ab,ORA abx,ASL abx,ORA alx,
JSR ab,AND dxi,JSL al,AND sr,BIT d,AND d,ROL d,AND dil,PLP i,AND im,ROL a,PLD i,BIT ab,AND ab,ROL ab,AND al,
BMI r,AND dix,AND di,AND srix,BIT dx,AND dx,ROL dx,AND dily,SEC i,AND aby,DEC a,TSC i,BIT abx,AND abx,ROL abx,AND alx,
RTI i,EOR dxi,WDM b,EOR sr,MVP bm,EOR d,LSR d,EOR dil,PHA i,EOR im,LSR a,PHK i,JMP ab,EOR ab,LSR ab,EOR al,
BVC r,EOR dix,EOR di,EOR srix,MVN bm,EOR dx,LSR dx,EOR dily,CLI i,EOR aby,PHY i,TCD i,JML al,EOR abx,LSR abx,EOR alx,
RTS i,ADC dxi,PER rl,ADC sr,STZ d,ADC d,ROR d,ADC dil,PLA i,ADC im,ROR a,RTL i,JMP abi,ADC ab,ROR ab,ADC al,
BVS r,ADC dix,ADC di,ADC srix,STZ dx,ADC dx,ROR dx,ADC dily,SEI i,ADC aby,PLY i,TDC i,JMP abxi,ADC abx,ROR abx,ADC alx,
BRA r,STA dxi,BRL rl,STA sr,STY d,STA d,STX d,STA dil,DEY i,BIT im,TXA i,PHB i,STY ab,STA ab,STX ab,STA al,
BCC r,STA dix,STA di,STA srix,STY dx,STA dx,STX dy,STA dily,TYA i,STA aby,TXS i,TXY i,STZ ab,STA abx,STZ abx,STA alx,
LDY imx,LDA dxi,LDX imx,LDA sr,LDY d,LDA d,LDX d,LDA dil,TAY i,LDA im,TAX i,PLB i,LDY ab,LDA ab,LDX ab,LDA al,
BCS r,LDA dix,LDA di,LDA srix,LDY dx,LDA dx,LDX dy,LDA dily,CLV i,LDA aby,TSX i,TYX i,LDY abx,LDA abx,LDX aby,LDA alx,
CPY imx,CMP dxi,REP b,CMP sr,CPY d,CMP d,DEC d,CMP dil,INY i,CMP im,DEX i,WAI i,CPY ab,CMP ab,DEC ab,CMP al,
BNE r,CMP dix,CMP di,CMP srix,PEI d,CMP dx,DEC dx,CMP dily,CLD i,CMP aby,PHX i,STP i,JML abil,CMP abx,DEC abx,CMP alx,
CPX imx,SBC dxi,SEP b,SBC sr,CPX d,SBC d,INC d,SBC dil,INX i,SBC im,NOP i,XBA i,CPX ab,SBC ab,INC ab,SBC al,
BEQ r,SBC dix,SBC di,SBC srix,PEA ab,SBC dx,INC dx,SBC dily,SED i,SBC aby,PLX i,XCE i,JSR abxi,SBC abx,INC abx,SBC alx"""
TAB=[x.strip().split() for x in T.replace('\n','').split(',')]
assert len(TAB)==256
FMT={'i':(0,'{}'),'a':(0,'A'),'s':(1,'#${:02X}'),'b':(1,'#${:02X}'),'d':(1,'${:02X}'),'dx':(1,'${:02X},X'),'dy':(1,'${:02X},Y'),
'di':(1,'(${:02X})'),'dxi':(1,'(${:02X},X)'),'dix':(1,'(${:02X}),Y'),'dil':(1,'[${:02X}]'),'dily':(1,'[${:02X}],Y'),
'sr':(1,'${:02X},S'),'srix':(1,'(${:02X},S),Y'),'ab':(2,'${:04X}'),'abx':(2,'${:04X},X'),'aby':(2,'${:04X},Y'),
'abi':(2,'(${:04X})'),'abxi':(2,'(${:04X},X)'),'abil':(2,'[${:04X}]'),'al':(3,'${:06X}'),'alx':(3,'${:06X},X'),
'r':(1,None),'rl':(2,None),'bm':(2,None),'im':(None,None),'imx':(None,None)}
def dis(d,addr,n=40,m=1,x=1,stop=True):
    out=[]
    for _ in range(n):
        o=lorom(addr); op=d[o]; mn,mode=TAB[op]
        if mode=='im': sz=1 if m else 2
        elif mode=='imx': sz=1 if x else 2
        else: sz=FMT[mode][0]
        v=int.from_bytes(d[o+1:o+1+sz],'little')
        if mode in('im','imx'): s='#${:0{}X}'.format(v,sz*2)
        elif mode=='r': s='${:04X}'.format((addr+2+(v-256 if v>127 else v))&0xffff)
        elif mode=='rl': s='${:04X}'.format((addr+3+(v-65536 if v>32767 else v))&0xffff)
        elif mode=='bm': s='${:02X},${:02X}'.format(v&255,v>>8)
        else: s=FMT[mode][1].format(v) if '{}' not in FMT[mode][1] or mode!='i' else ''
        if mode=='i': s=''
        if mn=='REP':
            if v&0x20: m=0
            if v&0x10: x=0
        if mn=='SEP':
            if v&0x20: m=1
            if v&0x10: x=1
        out.append(f"{addr:06X}: {' '.join(f'{b:02X}' for b in d[o:o+1+sz]):12s} {mn} {s}   [m{m}x{x}]")
        addr=(addr&0xff0000)|((addr+1+sz)&0xffff)
        if stop and mn in('RTS','RTL','RTI','JMP','JML','BRA','BRL','STP'): break
    return '\n'.join(out)
if __name__=='__main__':
    d=rom(); a=int(sys.argv[1],16); n=int(sys.argv[2]) if len(sys.argv)>2 else 40
    m=int(sys.argv[3]) if len(sys.argv)>3 else 1; x=int(sys.argv[4]) if len(sys.argv)>4 else 1
    print(dis(d,a,n,m,x,stop=len(sys.argv)<=5))
