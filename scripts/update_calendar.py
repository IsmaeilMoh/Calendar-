#!/usr/bin/env python3
"""Refresh this-week and next-week Forex Factory snapshots independently.
Public third-party feeds can be delayed or unavailable; preserve previous valid data.
"""
import json
import os
import pathlib
import urllib.request
from datetime import datetime, timezone, timedelta

ROOT = pathlib.Path(__file__).resolve().parent.parent
FEEDS = (
    ('thisweek', 'calendar-live.json', 0),
    ('nextweek', 'calendar-next.json', 1),
)

def monday_utc(dt):
    date = dt.date() - timedelta(days=dt.weekday())
    return datetime(date.year, date.month, date.day, tzinfo=timezone.utc)

def update(kind, filename, offset):
    url = f'https://nfs.faireconomy.media/ff_calendar_{kind}.json'
    req = urllib.request.Request(url, headers={
        'User-Agent': 'ICT-Belaraby-Calendar/2.2 (+github pages)',
        'Accept': 'application/json',
    })
    with urllib.request.urlopen(req, timeout=25) as response:
        if response.status != 200:
            raise RuntimeError(f'{kind}: HTTP {response.status}')
        raw = response.read(2_000_001)
    if len(raw) > 2_000_000:
        raise ValueError(f'{kind}: oversized payload')
    events = json.loads(raw)
    if not isinstance(events, list) or not events:
        raise ValueError(f'{kind}: empty feed; retaining old snapshot')
    valid = []
    for event in events:
        if not isinstance(event, dict):
            continue
        title = str(event.get('title') or '').strip()
        date = str(event.get('date') or '').strip()
        country = str(event.get('country') or '').upper().strip()
        try:
            dt = datetime.fromisoformat(date.replace('Z', '+00:00'))
            if dt.tzinfo is None:
                continue
            utc = dt.astimezone(timezone.utc)
        except ValueError:
            continue
        if not title or len(title) > 240 or len(country) > 5:
            continue
        record = {
            'id': f'{dt.isoformat()}-{country}-{title}',
            'title': title,
            'date': utc.isoformat().replace('+00:00', 'Z'),
            'country': country,
            'impact': str(event.get('impact') or '').title(),
        }
        for key in ('forecast', 'previous', 'actual'):
            val = event.get(key)
            record[key] = str(val)[:120] if val is not None and str(val).strip() else '—'
        valid.append(record)
    if len(valid) < 5:
        raise ValueError(f'{kind}: only {len(valid)} valid events; preserving previous file')
    valid.sort(key=lambda item: item['date'])
    # FF weeks begin Sunday evening for some currencies; validate the broad
    # window rather than assuming events start at Monday 00:00 UTC.
    now = datetime.now(timezone.utc)
    start = monday_utc(now) + timedelta(weeks=offset)
    lo, hi = start - timedelta(days=2), start + timedelta(days=8)
    within = sum(lo <= datetime.fromisoformat(e['date'].replace('Z', '+00:00')) < hi for e in valid)
    if within < max(3, len(valid)//2):
        raise ValueError(f'{kind}: feed appears to refer to a different week ({within}/{len(valid)}); preserving old file')
    payload = {
        'updatedAt': now.isoformat().replace('+00:00', 'Z'),
        'weekStart': start.date().isoformat(),
        'source': 'Forex Factory weekly public JSON feed (unofficial)',
        'events': valid,
    }
    target = ROOT / filename
    tmp = target.with_suffix('.tmp')
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    os.replace(tmp, target)
    print(f'{kind}: updated {len(valid)} events')

if __name__ == '__main__':
    failed = []
    for kind, filename, offset in FEEDS:
        try:
            update(kind, filename, offset)
        except Exception as exc:
            print(f'WARNING: {kind}: {exc}')
            failed.append(kind)
    # If current week fails, the workflow must report failure, but next-week
    # failures should not stop a successful current-week refresh.
    if 'thisweek' in failed:
        raise SystemExit(1)
