import sys, os, time
sys.argv=[sys.argv[0],'ninguno']
sys.path.insert(0, os.path.dirname(__file__))
from escenas import ESC, P
from PIL import Image, ImageDraw, ImageFilter, ImageMath, ImageStat, ImageOps
import PIL
OUT=os.path.join(P,'public/simulador')
calc = getattr(ImageMath,'lambda_eval',None)
LIN=[round(((v/255)**2.2)*255) for v in range(256)]
def a_lineal(im): return im.point(LIN*3)
def otsu(hist):
    total=sum(hist); sumB=0; wB=0; mx=0; thr=0; sumT=sum(i*h for i,h in enumerate(hist))
    for i,h in enumerate(hist):
        wB+=h
        if wB==0: continue
        wF=total-wB
        if wF==0: break
        sumB+=i*h; mB=sumB/wB; mF=(sumT-sumB)/wF; v=wB*wF*(mB-mF)**2
        if v>mx: mx=v; thr=i
    return thr
def codificar(lin_rgb):  # razón lineal (0-1.5) -> sRGB/1.5
    return tuple(round(min(1,max(0,c/1.5))**(1/2.2)*255) for c in lin_rgb)
for nombre,e in ESC.items():
    t=time.time()
    im=Image.open(os.path.join(P,e['src'])).convert('RGB'); W,H=im.size
    im.save(f"{OUT}/{nombre}.jpg",quality=86,optimize=True,progressive=True)
    m=Image.new('L',(W,H),0); d=ImageDraw.Draw(m); d.polygon(e['poly'],fill=255)
    for h in e['huecos']: d.polygon(h,fill=0)
    m.filter(ImageFilter.GaussianBlur(2.5)).save(f"{OUT}/{nombre}-mascara.png",optimize=True)
    # versión suavizada sin juntas (a media resolución)
    peq=im.resize((W//2,H//2),Image.BILINEAR).filter(ImageFilter.MedianFilter(11))
    mp=m.resize(peq.size)
    lin=a_lineal(peq)
    if nombre in ('calle','patio'):
        L=peq.convert('L')
        thr=otsu(L.histogram(mask=mp))
        sombra=L.point(lambda v: 255 if v<thr else 0)
        sombra=ImageMath.lambda_eval(lambda a: a['convert'](a['min'](a['s'],a['m']),'L'), s=sombra, m=mp) if calc else sombra
        sombra=sombra.filter(ImageFilter.MedianFilter(5))
        dentro_sol=ImageMath.lambda_eval(lambda a: a['convert'](a['min'](255-a['s'],a['m']),'L'), s=sombra, m=mp) if calc else mp
        sol=ImageStat.Stat(lin,mask=dentro_sol.point(lambda v:255 if v>200 else 0)).mean
        sombra_col=ImageStat.Stat(lin,mask=sombra.point(lambda v:255 if v>200 else 0)).mean
        ref=[max(1,c) for c in sol]
        luz_sol=Image.new('RGB',peq.size,codificar([1,1,1]))
        luz_sombra=Image.new('RGB',peq.size,codificar([sombra_col[i]/ref[i] for i in range(3)]))
        luz=Image.composite(luz_sombra,luz_sol,sombra.filter(ImageFilter.GaussianBlur(2)))
        print(nombre,'umbral',thr,'sol',[round(c) for c in sol],'sombra/sol',[round(sombra_col[i]/ref[i],2) for i in range(3)])
    else:
        ref=[max(1,c) for c in ImageStat.Stat(lin,mask=mp).mean]
        suave=lin.filter(ImageFilter.GaussianBlur(3))
        canales=[c.point(lambda v,r=ref[i]: round(min(1,(v/r)/1.5)**(1/2.2)*255)) for i,c in enumerate(suave.split())]
        luz=Image.merge('RGB',canales)
        print(nombre,'ref',[round(c) for c in ref])
    luz.resize((W,H),Image.BILINEAR).save(f"{OUT}/{nombre}-luz.jpg",quality=90)
    print(nombre,'ok',round(time.time()-t,1),'s')
