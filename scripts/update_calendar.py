#!/usr/bin/env python3
"""Fetch current-week Forex Factory export, validate and atomically write data.
This feed is third-party, unofficial, rate-limited and may be unavailable.
"""
import json
import os
import pathlib
import urllib.request
from datetime import datetime, timezone

URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json'
TARGET = pathlib.Path(__file__).resolve().parent.parent / 'calendar-live.json'
request = urllib.request.Request(URL,headers={'User-Agent':'ICT-Belaraby-Calendar/2.1 (+github pages)','Accept':'application/json'})
with urllib.request.urlopen(request,timeout=25) as response:
    if response.status != 200:
        raise RuntimeError(f'Feed returned HTTP {response.status}')
    raw = response.read(2_000_001)
    if len(raw) > 2_000_000:
        raise ValueError('Feed payload too large')
    events = json.loads(raw)
if not isinstance(events,list) or not events:
    raise ValueError('Feed empty or invalid; preserving previous file')
valid=[]
for event in events:
    if not isinstance(event,dict): continue
    title=str(event.get('title') or '').strip()
    date=str(event.get('date') or '').strip()
    country=str(event.get('country') or '').upper().strip()
    try:
        dt=datetime.fromisoformat(date.replace('Z','+00:00'))
        if dt.tzinfo is None: continue
    except ValueError: continue
    if not title or len(title)>240 or len(country)>5:continue
    impact=str(event.get('impact') or '').title()
    record={'id':f'{dt.isoformat()}-{country}-{title}','title':title,'date':dt.astimezone(timezone.utc).isoformat().replace('+00:00','Z'),'country':country,'impact':impact}
    for key in ('forecast','previous','actual'):
        val=event.get(key)
        record[key]=str(val)[:120] if val is not None and str(val).strip() else '—'
    valid.append(record)
if len(valid)<5:
    raise ValueError(f'Only {len(valid)} valid events; preserving previous file')
valid.sort(key=lambda e:e['date'])
payload={'updatedAt':datetime.now(timezone.utc).isoformat().replace('+00:00','Z'),'source':'Forex Factory weekly public JSON feed (unofficial)','events':valid}
tmp=TARGET.with_suffix('.tmp')
tmp.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
os.replace(tmp,TARGET)
print(f'Updated {len(valid)} economic events')
