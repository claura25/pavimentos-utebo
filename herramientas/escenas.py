import json, math, sys, os
from PIL import Image, ImageDraw, ImageFilter
P="/Users/lauracebollada/web pavimentos utebo"
S=os.path.join(P,"herramientas","revision"); os.makedirs(S,exist_ok=True)
k=1/0.5625
def esc(pts,f=k): return [(round(x*f),round(y*f)) for x,y in pts]
ESC={
 'calle':{'src':'src/assets/trabajos/lerida/2.jpg','f':1156,'altura':1.6,'vp':(400,160),
   'poly':esc([(0,900),(0,420),(40,300),(95,200),(150,160),(200,112),(250,110),(300,135),(350,160),(400,190),(470,230),(548,272),(610,300),(675,345),(675,900)]),
   'huecos':[esc([(300,240),(328,240),(328,251),(300,251)]),esc([(470,262),(505,262),(505,271),(470,271)])]},
 'patio':{'src':'src/assets/trabajos/cadrete/1.jpg','f':1156,'altura':1.6,'vp':(779,52),
   'poly':esc([(0,370),(352,100),(608,100),(900,262),(900,675),(0,675)]),
   'huecos':[esc([(583,435),(735,433),(793,528),(612,530)]),esc([(705,150),(748,150),(748,238),(705,238)]),esc([(580,95),(602,95),(602,142),(580,142)]),esc([(478,148),(527,148),(527,162),(478,162)])]},
 'nave':{'src':'src/assets/servicios/nave-pulida.jpg','f':722,'altura':1.3,'vp':(555,405),
   'poly':esc([(0,378),(900,378),(900,675),(0,675)],1/0.9),'huecos':[]},
}
def mat(a,b): return [[sum(a[i][t]*b[t][j] for t in range(3)) for j in range(3)] for i in range(3)]
def rot(pitch,yaw):
    c,s=math.cos(-pitch),math.sin(-pitch); cy,sy=math.cos(yaw),math.sin(yaw)
    return mat([[cy,0,sy],[0,1,0],[-sy,0,cy]],[[1,0,0],[0,c,-s],[0,s,c]])
def proyectar(X,Z,e,R):
    p=(X,-e['altura'],-Z); c=[sum(R[i][j]*p[i] for i in range(3)) for j in range(3)]  # R^T p
    if c[2]>=-1e-6: return None
    return (e['cx']+e['f']*c[0]/-c[2], e['cy']-e['f']*c[1]/-c[2])
def resolver(e):
    pitch=math.atan((e["cy"]-e["vp"][1])/e["f"])
    yaw=math.atan((e["vp"][0]-e["cx"])*math.cos(pitch)/e["f"])
    return pitch,yaw
modo=sys.argv[1]
out={}
for nombre,e in ESC.items():
    im=Image.open(os.path.join(P,e['src'])).convert('RGB'); W,H=im.size
    e['cx'],e['cy']=W/2,H/2
    pitch,yaw=resolver(e); R=rot(pitch,yaw)
    print(nombre,W,H,'cabeceo',round(pitch,4),'guinada',round(yaw,4),'vp',[round(v) for v in proyectar(0,1e5,e,R)])
    out[nombre]={'ancho':W,'alto':H,'f':e['f'],'cx':W/2,'cy':H/2,'cabeceo':round(pitch,5),'guinada':round(yaw,5),'altura':e['altura']}
    if modo=='overlay':
        d=ImageDraw.Draw(im)
        for X10 in range(-60,61,5):
            pts=[proyectar(X10/10,Z/10,e,R) for Z in range(3,400,2)]
            pts=[p for p in pts if p and -500<p[0]<W+500 and -500<p[1]<H+500]
            if len(pts)>1: d.line(pts,fill=(0,255,255),width=2)
        for Z10 in range(5,301,5):
            pts=[proyectar(X/10,Z10/10,e,R) for X in range(-80,81,4)]
            pts=[p for p in pts if p]
            if len(pts)>1: d.line(pts,fill=(255,255,0) if Z10%10 else (255,0,255),width=2)
        d.line(e['poly']+[e['poly'][0]],fill=(255,0,0),width=4)
        for h in e['huecos']: d.line(h+[h[0]],fill=(255,0,0),width=3)
        s=900/max(W,H); im.resize((round(W*s),round(H*s))).save(f"{S}/{nombre}-overlay.jpg",quality=85)
json.dump(out,open(f"{S}/camaras.json",'w'),indent=1)
