#!/usr/bin/env python3
"""Notify OneSignal on new posts, high-impact calendar events and ICT windows.
Runs only in GitHub Actions with secret credentials; never in a public browser.
"""
import os,json,sys,uuid,datetime,subprocess,urllib.request,urllib.error,hashlib
from pathlib import Path
from zoneinfo import ZoneInfo
BASE='https://ismaeilmoh.github.io/ictbelaraby/'
APP=os.getenv('ONESIGNAL_APP_ID','').strip(); KEY=os.getenv('ONESIGNAL_REST_API_KEY','').strip()

def send(title,body,url,tag,key):
    if not APP or not KEY:
        print('OneSignal secrets not configured; skipping push.');return False
    # OneSignal tag filters respect individually opted-in audience categories.
    data={'app_id':APP,'headings':{'en':title},'contents':{'en':body[:240]},'url':url,
          'filters':[{'field':'tag','key':tag,'relation':'=','value':'1'}],
          'idempotency_key':str(uuid.uuid5(uuid.NAMESPACE_URL,key)),'isAnyWeb':True}
    req=urllib.request.Request('https://api.onesignal.com/notifications',data=json.dumps(data,ensure_ascii=False).encode(),headers={'Content-Type':'application/json','Authorization':'Key '+KEY},method='POST')
    try:
        with urllib.request.urlopen(req,timeout=22) as response:
            payload=json.load(response)
        if not payload.get('id'): print('No push ID',payload);return False
        print('Push delivered to OneSignal:',title,payload['id']);return True
    except urllib.error.HTTPError as error:
        print('OneSignal error:',error.code,error.read()[:700].decode(errors='replace'));return False
    except Exception as error:
        print('Notification error:',error);return False

def read_json(filename):
    try:
        data=json.loads(Path(filename).read_text(encoding='utf-8'))
        return data if isinstance(data,list) else []
    except Exception:return []

def old_json(revision,path):
    try:
        data=subprocess.check_output(['git','show',f'{revision}:{path}'],stderr=subprocess.DEVNULL)
        val=json.loads(data)
        return val if isinstance(val,list) else []
    except Exception:return None

def identify(post,kind):
    return str(post.get('id') or '|'.join(str(post.get(k,'')) for k in (('pair','date','entry') if kind=='signal' else ('asset','published_at','title'))))

def new_posts():
    before=os.getenv('BEFORE_REV','')
    for kind,path in [('signal','recs.json'),('analysis','analyses.json')]:
        current=read_json(path);older=old_json(before,path) if before and before!='0'*40 else []
        # Avoid notifying on initial repository upload, which may contain old content.
        if older is None: print('No prior file in',path,'— skipping initial seed');continue
        known={identify(p,kind) for p in older}
        for post in current:
            if post.get('sample') or not post.get('notify',False) or identify(post,kind) in known:continue
            name=post.get('title') or post.get('pair') or post.get('asset','')
            title=('تحليل جديد: ' if kind=='analysis' else 'توصية جديدة: ')+str(name)[:80]
            body=(post.get('summary') or post.get('note') or 'شاهد التفاصيل على ICT بالعربي')
            send(title,str(body),BASE+'#recs','ict_posts','post-'+kind+'-'+identify(post,kind))

def scheduled():
    now=datetime.datetime.now(datetime.timezone.utc)
    ny=now.astimezone(ZoneInfo('America/New_York'))
    # Exact windows configured in site code; scheduled workflow runs every 5 min, and can run late.
    windows=[('Asian Session','20:00'),('London Kill Zone','02:00'),('New York Kill Zone','07:00'),('London Close','10:00'),('London Silver Bullet','03:00'),('New York AM Silver Bullet','10:00'),('New York PM Silver Bullet','14:00')]
    for name,clock in windows:
        # Forex market is closed on Saturday and most of Sunday (New York time).
        if ny.weekday()==5 or (ny.weekday()==6 and ny.hour<17) or (ny.weekday()==4 and ny.hour>=17): continue
        h,m=map(int,clock.split(':'))
        start=ny.replace(hour=h,minute=m,second=0,microsecond=0)
        delta=(ny-start).total_seconds()
        if 0<=delta<11*60: # Gate late scheduled executions; idempotency key deduplicates sends
            send('بدأت نافذة '+name,'الوقت المرجعي نيويورك '+clock+' — تحقق من شروط التداول',BASE+'#ict','ict_sessions','session-'+name+'-'+start.isoformat())
    try: events=json.loads(Path('calendar-live.json').read_text(encoding='utf-8')).get('events',[])
    except Exception: events=[]
    for event in events:
        if str(event.get('impact','')).lower()!='high':continue
        try:when=datetime.datetime.fromisoformat(str(event['date']).replace('Z','+00:00'));when=when.astimezone(datetime.timezone.utc)
        except Exception:continue
        # 15-minute warning; does not claim second-accurate delivery.
        distance=(when-now).total_seconds()
        if 14*60<=distance<=20*60:
            title=str(event.get('title','خبر اقتصادي مرتفع التأثير'))
            currency=str(event.get('country') or event.get('currency') or '')
            ident=str(event.get('id') or when.isoformat()+'-'+currency+'-'+title)
            send('خبر قوي بعد 15 دقيقة: '+currency,title,BASE+'#agenda','ict_news','news-'+ident+'-15')

if __name__=='__main__':
    mode=sys.argv[1] if len(sys.argv)>1 else 'posts'
    (scheduled if mode=='schedule' else new_posts)()
