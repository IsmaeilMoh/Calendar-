"""Validation and revision-aware comparison for Forex Factory release values.

No inference of missing numbers. The core module is independent of network/HTML.
The calendar page is the data source; this module only validates and derives.
"""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import hashlib
import re

MISSING = {'', '-', '—', '–', 'n/a', 'na', 'null', 'none', 'tba', 'tentative', 'pending'}
# Avoid interpreting 1.2 / 3.4, yields / bid-to-cover or qualitative values.
NUMBER = re.compile(r'^\s*([+\-−]?)(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?\s*([%KMBTkmbt]?)\s*$', re.ASCII)
SCALE = {'': Decimal(1), '%': Decimal(1), 'K': Decimal(1000),
         'M': Decimal(1000000), 'B': Decimal(1000000000), 'T': Decimal(1000000000000)}


def normalized_value(value):
    text = str(value if value is not None else '').strip()
    return None if text.casefold() in MISSING else text[:120]


def parse_numeric(value):
    """Return normalized Decimal and unit or None for an uncomparable value.

    Both magnitudes are normalized to absolute units; percentages are retained
    as percentage values, so the difference is measured in percentage points.
    """
    text = normalized_value(value)
    if text is None:
        return None
    match = NUMBER.fullmatch(text)
    if not match:
        return None
    sign, whole, decimal, suffix = match.groups()
    unit = suffix.upper()
    try:
        magnitude = Decimal(whole.replace(',', '') + ('.' + decimal if decimal else ''))
        if sign in ('-', '−'):
            magnitude = -magnitude
        return magnitude * SCALE[unit], ('percent' if unit == '%' else 'number')
    except (InvalidOperation, KeyError):
        return None


def surprise(actual, forecast):
    a, f = parse_numeric(actual), parse_numeric(forecast)
    if not a or not f or a[1] != f[1]:
        return {'comparable': False, 'reason': 'missing-or-incompatible-units'}
    difference = a[0] - f[0]
    return {'comparable': True, 'difference': format(difference, 'f'),
            'unit': 'percentage-points' if a[1] == 'percent' else 'absolute',
            'direction': 'above' if difference > 0 else 'below' if difference < 0 else 'equal'}


def stable_id(event):
    # Forex Factory stable ID is best; don't invent one when missing.
    ff_id = str(event.get('ffEventId') or '').strip()
    if ff_id and re.fullmatch(r'[A-Za-z0-9_-]{1,80}', ff_id):
        return 'ff-' + ff_id
    # Match despite changes in published release TIME; avoid encoding time in ID.
    date = datetime.fromisoformat(str(event['date']).replace('Z', '+00:00')).date().isoformat()
    title = re.sub(r'\s+', ' ', str(event['title']).casefold()).strip()
    currency = str(event.get('country') or '').strip().upper()
    payload = '\x1f'.join([date, currency, title])
    return 'ff-hash-' + hashlib.sha256(payload.encode('utf-8')).hexdigest()[:22]


def _utc(value):
    time = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
    if time.tzinfo is None:
        raise ValueError('event timestamp must include timezone')
    return time.astimezone(timezone.utc)


def ingest(events, old=None, *, now=None):
    """Only ingest real released actuals; preserve earlier values and revisions.

    Stored events are snapshots of the original source. The workflow publishes
    only diagnostic artifacts at the proof-of-concept stage.
    """
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        raise ValueError('now must be timezone-aware')
    now = now.astimezone(timezone.utc)
    result = {entry['id']: dict(entry) for entry in (old or []) if isinstance(entry, dict) and entry.get('id')}
    changed = 0
    valid = 0
    for event in events:
        if not isinstance(event, dict):
            continue
        actual = normalized_value(event.get('actual'))
        if actual is None:
            continue
        try:
            event_time = _utc(event['date'])
        except (ValueError, KeyError, TypeError):
            continue
        # Don't accept premature / future actual figures.
        if event_time > now:
            continue
        if not str(event.get('title') or '').strip() or not str(event.get('country') or '').strip():
            continue
        valid += 1
        ident = stable_id(event)
        snapshot = {'actual': actual,
                    'forecast': normalized_value(event.get('forecast')),
                    'previous': normalized_value(event.get('previous'))}
        earlier = result.get(ident)
        if earlier is None:
            result[ident] = {
                'id': ident, 'ffEventId': event.get('ffEventId') or None,
                'date': event['date'], 'title': event['title'], 'country': event['country'],
                'impact': event.get('impact') or 'Unknown', 'source': 'Forex Factory',
                'firstSeenAt': now.isoformat(), 'lastSeenAt': now.isoformat(),
                'values': snapshot, 'comparison': surprise(actual, snapshot['forecast']),
                'revisions': []}
            changed += 1
            continue
        earlier['lastSeenAt'] = now.isoformat()
        if earlier.get('values') != snapshot:
            earlier.setdefault('revisions', []).append({
                'seenAt': now.isoformat(), 'previousValues': earlier.get('values'),
                'newValues': snapshot})
            earlier['values'] = snapshot
            earlier['comparison'] = surprise(actual, snapshot['forecast'])
            changed += 1
        # Keep earliest event date, but record time change separately if needed.
    return sorted(result.values(), key=lambda x: x.get('date', ''), reverse=True), {'releasedWithActual': valid, 'newOrRevised': changed}
