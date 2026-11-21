#!/usr/bin/env python3
"""ICT weekly calendar: Forex Factory for full weeks, limited US high-impact fallback.

No invented events. Never label an incomplete backup calendar as comprehensive.
Run in GitHub Actions; diagnostics saved in calendar-sync-status.json.
"""
import json
import os
import pathlib
import urllib.request
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from ff_web_calendar import fetch_week

ROOT = pathlib.Path(__file__).resolve().parent.parent
GAZA = ZoneInfo('Asia/Gaza')
FF = 'https://nfs.faireconomy.media/ff_calendar_{}.json'
US_FALLBACK = 'https://xoomar.com/api/markets/calendar?importance=high'


def current_monday():
    local = datetime.now(timezone.utc).astimezone(GAZA).date()
    return local - timedelta(days=local.weekday())


def request_json(url):
    req = urllib.request.Request(url, headers={
        'User-Agent': 'ICT-Belaraby-PWA-Calendar/6.8.37',
        'Accept': 'application/json',
    })
    with urllib.request.urlopen(req, timeout=25) as res:
        if res.status != 200:
            raise RuntimeError('HTTP ' + str(res.status))
        body = res.read(2_000_001)
    if len(body) > 2_000_000:
        raise ValueError('calendar payload too large')
    return json.loads(body)


def to_utc(s):
    dt = datetime.fromisoformat(str(s).replace('Z', '+00:00'))
    if dt.tzinfo is None:
        raise ValueError('timestamp missing timezone')
    return dt.astimezone(timezone.utc)


def normalize_ff(data, monday):
    if not isinstance(data, list):
        raise ValueError('Forex Factory response must be an array')
    events = []
    # Compare calendar weeks in Gaza, matching the browser's week selector.
    for event in data:
        if not isinstance(event, dict):
            continue
        try:
            when = to_utc(event.get('date', ''))
        except (ValueError, TypeError):
            continue
        if not monday <= when.astimezone(GAZA).date() < monday + timedelta(days=7):
            continue
        title = str(event.get('title') or '').strip()[:240]
        currency = str(event.get('country') or '').strip().upper()[:5]
        if not title or not currency:
            continue
        rec = dict(id=f"{when.isoformat()}-{currency}-{title}", title=title,
                   date=when.isoformat().replace('+00:00', 'Z'), country=currency,
                   impact=str(event.get('impact') or '').title())
        for key in ('forecast', 'previous', 'actual'):
            v = event.get(key)
            rec[key] = str(v)[:120] if v is not None and str(v).strip() else '—'
        events.append(rec)
    if not events:
        raise ValueError('Forex Factory has no events for requested week')
    return sorted(events, key=lambda e: e['date'])


def fallback_us_high(monday):
    """Limited attributed excerpt (at most 4 releases), not a full economic calendar."""
    response = request_json(US_FALLBACK)
    if not isinstance(response, dict) or not isinstance(response.get('data'), list):
        raise ValueError('US fallback response malformed')
    result = []
    for item in response['data']:
        if not isinstance(item, dict) or str(item.get('importance', '')).lower() != 'high':
            continue
        try:
            when = to_utc(item.get('scheduledAt', ''))
        except (ValueError, TypeError):
            continue
        if not monday <= when.astimezone(GAZA).date() < monday + timedelta(days=7):
            continue
        title = str(item.get('eventName') or '').strip()[:240]
        if not title:
            continue
        rec = dict(id=f"us-{when.isoformat()}-{title}", title=title,
                   date=when.isoformat().replace('+00:00', 'Z'), country='USD',
                   impact='High', forecast='—', actual='—')
        previous = item.get('previous')
        rec['previous'] = str(previous)[:120] if previous is not None and str(previous).strip() else '—'
        result.append(rec)
    result.sort(key=lambda e: e['date'])
    # This limited excerpt is deliberately NOT a substitute for the full calendar.
    if not result:
        raise ValueError('No US high-impact fallback events for next week')
    return result[:4]


def atomic_json(path, obj):
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    os.replace(tmp, path)


def snapshot(filename, monday, events, *, source, coverage, source_url):
    atomic_json(ROOT / filename, {
        'updatedAt': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        'weekStart': monday.isoformat(), 'source': source, 'sourceUrl': source_url,
        'coverage': coverage, 'events': events,
    })


def run():
    monday = current_monday()
    status = {'checkedAt': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
              'thisWeek': {'ok': False}, 'nextWeek': {'ok': False}}
    # FF may roll its Sunday-to-Saturday week ahead before Monday in Gaza.
    ff_thisweek_raw = None
    try:
        ff_thisweek_raw = request_json(FF.format('thisweek'))
        events = normalize_ff(ff_thisweek_raw, monday)
        snapshot('calendar-live.json', monday, events, source='Forex Factory',
                 coverage='full', source_url='https://www.forexfactory.com/calendar')
        status['thisWeek'] = {'ok': True, 'count': len(events), 'coverage': 'full'}
    except Exception as exc:
        status['thisWeek'] = {'ok': False, 'error': str(exc)[:240]}

    next_monday = monday + timedelta(days=7)
    # First choice: Forex Factory's week-specific HTML page (not its 404 JSON URL).
    try:
        events, url = fetch_week(next_monday)
        snapshot('calendar-next.json', next_monday, events, source='Forex Factory',
                 coverage='full', source_url=url)
        status['nextWeek'] = {'ok': True, 'count': len(events), 'coverage': 'full',
                              'via': 'forexfactory-week-page', 'sourceUrl': url}
    except Exception as ff_error:
        status['nextWeek']['primaryError'] = str(ff_error)[:240]
        try:
            # On Sunday FF may have already advanced the thisweek feed.
            rolled = normalize_ff(ff_thisweek_raw, next_monday) if ff_thisweek_raw is not None else []
            if not rolled:
                raise ValueError('Current-week Forex Factory feed has not rolled forward')
            snapshot('calendar-next.json', next_monday, rolled, source='Forex Factory',
                     coverage='full', source_url='https://www.forexfactory.com/calendar')
            status['nextWeek'] = {'ok': True, 'count': len(rolled), 'coverage': 'full',
                                  'via': 'current-week rollover'}
        except Exception:
            # Never overwrite a previously saved full FF week with a partial excerpt.
            previous_path = ROOT / 'calendar-next.json'
            try:
                previous = json.loads(previous_path.read_text(encoding='utf-8'))
            except (FileNotFoundError, json.JSONDecodeError):
                previous = {}
            if previous.get('weekStart') == next_monday.isoformat() and previous.get('coverage') == 'full' and previous.get('source') == 'Forex Factory' and previous.get('events'):
                status['nextWeek'] = {'ok': True, 'count': len(previous['events']),
                                      'coverage': 'full', 'retained': True,
                                      'primaryError': str(ff_error)[:240]}
            else:
                try:
                    events = fallback_us_high(next_monday)
                    snapshot('calendar-next.json', next_monday, events, source='XOOMAR (US high-impact excerpt)',
                             coverage='partial', source_url='https://xoomar.com/economic-calendar-api')
                    status['nextWeek'] = {'ok': True, 'count': len(events), 'coverage': 'partial',
                                          'primaryError': str(ff_error)[:240]}
                except Exception as backup_error:
                    status['nextWeek'] = {'ok': False, 'primaryError': str(ff_error)[:240],
                                          'fallbackError': str(backup_error)[:240]}
    atomic_json(ROOT / 'calendar-sync-status.json', status)
    for week in ('thisWeek', 'nextWeek'):
        print(f'{week}: {json.dumps(status[week], ensure_ascii=False)}')
    # Let workflow commit diagnostics even when one source failed, then fail workflow.
    return 0 if status['thisWeek']['ok'] and status['nextWeek']['ok'] else 1


if __name__ == '__main__':
    raise SystemExit(run())
