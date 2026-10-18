import sys, numpy as np, cv2
from PIL import Image, ImageOps
S=sys.argv[1]; K=S+'/kit'
wm=ImageOps.invert(Image.open(S+'/logo/wordmark_bw.png').convert('L')); wm=np.array(wm.crop(wm.getbbox()),np.float32)/255
LIME=np.array([212,245,63],np.float32); INK=np.array([16,17,13],np.float32); PAPER=np.array([241,241,234],np.float32)
def run(name, box, select, color, grow=1.0, minArea=40, maxArea=10**9, grain=0.8, minH=0, dil=7, flatfill=False):
    img=np.array(Image.open(f'{K}/{name}-new.png').convert('RGB'))
    x0,y0,x1,y1=box; reg=img[y0:y1,x0:x1].astype(np.float32)
    m=select(reg).astype(np.uint8)
    n,lab,stats,_=cv2.connectedComponentsWithStats(m,8)
    keep=np.zeros_like(m); fitm=np.zeros_like(m); cands=[]
    for i in range(1,n):
        x,y,w_,h_,ar=stats[i]
        touches=x==0 or y==0 or x+w_>=m.shape[1] or y+h_>=m.shape[0]
        thin=ar/(w_*h_)<0.08
        if minArea<=ar<=maxArea and not touches and not thin:
            if h_>=minH: fitm[lab==i]=1
            cands.append(i)
    ys,xs=np.nonzero(fitm); pts=np.c_[xs,ys].astype(np.float32)
    c=pts.mean(0); cov=np.cov((pts-c).T); ev,evec=np.linalg.eigh(cov)
    u=evec[:,1];
    if u[0]<0: u=-u
    v=np.array([-u[1],u[0]])  # points "down" in image space
    pu=(pts-c)@u; pv=(pts-c)@v
    lo_u,hi_u=np.percentile(pu,[0.5,99.5]); lo_v,hi_v=np.percentile(pv,[1,99])
    centre=c+u*(lo_u+hi_u)/2+v*(lo_v+hi_v)/2+np.array([x0,y0],np.float32)
    h=(hi_v-lo_v)*grow; w=h*wm.shape[1]/wm.shape[0]
    # Erase every piece of the old logo: anything whose centre sits inside the
    # fitted logo band, which leaves nearby small print alone.
    cl=centre-np.array([x0,y0],np.float32)
    for i in cands:
        yy,xx=np.nonzero(lab==i); q=np.array([xx.mean(),yy.mean()])-cl
        if abs(q@v)<h*0.75 and -(hi_u-lo_u)*0.62<q@u<(hi_u-lo_u)*0.62: keep[lab==i]=1
    print(name,'angle',round(np.degrees(np.arctan2(u[1],u[0])),1),'h',round(h,1),'w',round(w,1),'ai width',round(hi_u-lo_u,1))
    # erase the generated logo
    full=np.zeros(img.shape[:2],np.uint8); full[y0:y1,x0:x1]=cv2.dilate(keep,np.ones((dil,dil),np.uint8))
    if flatfill:
        # Normalised convolution: average only the unmasked card around each hole.
        keepw=(full==0).astype(np.float32)
        num=cv2.GaussianBlur(img.astype(np.float32)*keepw[...,None],(0,0),18)
        den=cv2.GaussianBlur(keepw,(0,0),18)[...,None]+1e-4
        fill=num/den+np.random.default_rng(3).normal(0,2.2,img.shape)
        soft=cv2.GaussianBlur(full.astype(np.float32),(0,0),1.5)[...,None]
        clean=(img*(1-soft)+fill*soft).astype(np.uint8)
    else:
        clean=cv2.inpaint(img,full*255,9,cv2.INPAINT_TELEA)
    # surface grain from the original neighbourhood, so the fill is not a smear
    g=img.astype(np.float32); hi=g-cv2.GaussianBlur(g,(0,0),3)
    shift=np.roll(hi,int(h*1.6),axis=0)
    clean=np.clip(clean.astype(np.float32)+shift*(full[...,None]>0)*grain,0,255)
    # place the real wordmark: resize with area filtering first, then rotate.
    small=cv2.resize(wm,(max(1,round(w)),max(1,round(h))),interpolation=cv2.INTER_AREA)
    A=np.c_[u, v].astype(np.float32)
    t=centre-A@np.array([small.shape[1]/2,small.shape[0]/2],np.float32)
    M=np.c_[A,t]
    a=cv2.warpAffine(small,M,(img.shape[1],img.shape[0]),flags=cv2.INTER_LINEAR)
    a=cv2.GaussianBlur(a,(0,0),0.45)[...,None]
    lum=clean.mean(2,keepdims=True); shade=np.clip(lum/(cv2.GaussianBlur(lum,(0,0),6)[...,None]+1e-3),0.92,1.08)
    out=clean*(1-a)+ (color*shade)*a
    Image.fromarray(np.clip(out,0,255).astype(np.uint8)).save(f'{K}/{name}-fixed.png')
only=sys.argv[2:] or None
_run=run
def run(name,*a,**k):
    if only is None or name in only: _run(name,*a,**k)
lime=lambda r:(r[...,1]>130)&(r[...,1]>r[...,2]+60)&(r[...,0]>90)
run('TP-01',(860,280,1250,430),lime,LIME*0.92)
run('TP-02',(1290,520,1530,620),lime,LIME*0.86)
run('TP-03',(1020,395,1280,450),lambda r:r.mean(2)>165,PAPER*0.93)
def on_card(r):
    l=r.mean(2); bright=cv2.GaussianBlur((l>170).astype(np.float32),(0,0),14)
    return (l<95)&(bright>0.45)
run("TP-04",(1000,440,1580,700),on_card,INK,minArea=120,maxArea=9000,grain=0.0,minH=40,dil=17,flatfill=True)
