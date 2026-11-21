"""Parse Forex Factory's explicitly selected weekly HTML calendar.

The public NFS `nextweek` JSON URL is not supported reliably. This module
queries the Forex Factory calendar webpage for a specific week instead.
HTML access is not guaranteed (the site may challenge GitHub runner IPs).
Unknown/tentative times are omitted rather than invented.
"""
import re
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup

GAZA = ZoneInfo('Asia/Gaza')
MONTHS = {m.lower(): i for i, m in enumerate(('Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'), 1)}
IMPACT = {'red': 'High', 'ora': 'Medium', 'orange': 'Medium', 'yel': 'Low', 'yellow': 'Low', 'gry': 'Holiday', 'gray': 'Holiday'}


def week_url(monday):
    return 'https://www.forexfactory.com/calendar?' + urlencode({'week': f'{monday:%b}{monday.day}.{monday.year}'.lower()})


def extract_impact(cell):
    if cell is None:
        return 'Unknown'
    title = ' '.join(str(tag.get('title','')) for tag in cell.select('[title]')).lower()
    classes = ' '.join(' '.join(tag.get('class',[])) for tag in [cell] + cell.select('[class]')).lower()
    for marker, level in IMPACT.items():
        if f'impact-{marker}' in classes:
            return level
    for marker, level in [('high','High'),('medium','Medium'),('low','Low'),('none','Holiday')]:
        if f'--{marker}' in classes or marker + ' impact' in title:
            return level
    return 'Unknown'


def _parse_day(label, monday):
    """Example: 'Mon Nov 23'; constrain to the requested week's 7 dates."""
    m = re.search(r'\b([A-Za-z]{3,9})\s+(\d{1,2})\b', label)
    if not m:
        return None
    month = MONTHS.get(m.group(1)[:3].lower())
    if not month:
        return None
    day = int(m.group(2))
    for i in range(7):
        candidate = monday + timedelta(days=i)
        if candidate.month == month and candidate.day == day:
            return candidate
    return None


def _parse_clock(text):
    val = text.strip().lower().replace(' ', '')
    # All Day / Tentative are deliberately not assigned arbitrary hours.
    if not val or val in ('tentative', 'allday', 'day1', 'day2'):
        return None
    for fmt in ('%H:%M', '%I:%M%p', '%I%p'):
        try:
            t = datetime.strptime(val, fmt)
            return t.hour, t.minute
        except ValueError:
            pass
    return None


def parse_html(html, monday):
    soup = BeautifulSoup(html, 'html.parser')
    table = soup.select_one('table.calendar__table')
    if table is None:
        raise ValueError('Forex Factory calendar table unavailable (possibly blocked or changed)')
    events, seen = [], set()
    day, clock = None, None
    for row in table.select('tr.calendar__row'):
        title_el = row.select_one('td.calendar__event .calendar__event-title') or row.select_one('td.calendar__event')
        if title_el is None:
            continue
        date_el = row.select_one('td.calendar__date')
        if date_el is not None and date_el.get_text(' ', strip=True):
            day = _parse_day(date_el.get_text(' ', strip=True), monday)
            clock = None
        time_el = row.select_one('td.calendar__time')
        if time_el is not None and time_el.get_text(' ', strip=True):
            clock = _parse_clock(time_el.get_text(' ', strip=True))
        if day is None or clock is None:
            continue
        def field(css):
            el = row.select_one(css)
            return el.get_text(' ', strip=True) if el else ''
        currency = field('td.calendar__currency').upper()[:5]
        title = title_el.get_text(' ', strip=True)[:240]
        if not title or not re.fullmatch('[A-Z]{3}', currency):
            continue
        dt = datetime(day.year, day.month, day.day, clock[0], clock[1], tzinfo=timezone.utc)
        # The request uses fftimezone=Etc/GMT. Validate the target *Gaza* week.
        if not monday <= dt.astimezone(GAZA).date() < monday + timedelta(days=7):
            continue
        instant = dt.isoformat().replace('+00:00','Z')
        key = (instant, currency, title)
        if key in seen:
            continue
        seen.add(key)
        record = {'id': f'{instant}-{currency}-{title}', 'date': instant,
                  'country': currency, 'title': title,
                  'impact': extract_impact(row.select_one('td.calendar__impact'))}
        for k in ('actual','forecast','previous'):
            record[k] = field('td.calendar__' + k) or '—'
        events.append(record)
    if not events:
        raise ValueError('Forex Factory HTML yielded no *timed* events for the requested Gaza week')
    return sorted(events, key=lambda e: e['date'])


def fetch_week(monday):
    url = week_url(monday)
    response = requests.get(url, timeout=35, headers={
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
    }, cookies={'fftimezone': 'Etc/GMT', 'fftimeformat': '1'})
    response.raise_for_status()
    return parse_html(response.text, monday), url
