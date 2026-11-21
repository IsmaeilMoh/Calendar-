#!/usr/bin/env python3
"""Proof-of-concept Forex Factory ACTUAL collector.

Produces a private workflow artifact only (never writes to deployed site).
No fallback source, invented actuals, or automatic public redistribution.
"""
from __future__ import annotations

import argparse
from datetime import date, datetime, timedelta, timezone
import json
from pathlib import Path
import sys
from zoneinfo import ZoneInfo

from economic_results_core import ingest
from ff_web_calendar import fetch_week, parse_html

GAZA = ZoneInfo('Asia/Gaza')


def monday_for(day):
    return day - timedelta(days=day.weekday())


def main(argv=None):
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--fixture-html', type=Path,
                     help='Offline smoke test with an authorized saved HTML page')
    cli.add_argument('--week-start', type=date.fromisoformat,
                     help='YYYY-MM-DD (Monday), required with --fixture-html')
    cli.add_argument('--output', type=Path, default=Path('economic-results-preview.json'))
    cli.add_argument('--report', type=Path, default=Path('economic-results-status.json'))
    cli.add_argument('--previous', type=Path, help='Optional prior preview JSON to preserve corrections')
    args = cli.parse_args(argv)
    if args.fixture_html and args.week_start is None:
        cli.error('--week-start is required with --fixture-html')
    if args.week_start and args.week_start.weekday() != 0:
        cli.error('--week-start must be a Monday')

    now = datetime.now(timezone.utc)
    week = monday_for(now.astimezone(GAZA).date())
    weeks = [args.week_start] if args.fixture_html else [week - timedelta(days=7), week]
    all_events, checks = [], []
    for requested in weeks:
        try:
            if args.fixture_html:
                events = parse_html(args.fixture_html.read_text(encoding='utf-8'), requested)
                url = 'offline-fixture'
            else:
                events, url = fetch_week(requested)
            all_events.extend(events)
            checks.append({'weekStart': requested.isoformat(), 'ok': True,
                           'parsedEvents': len(events), 'sourceUrl': url})
        except Exception as exc:
            checks.append({'weekStart': requested.isoformat(), 'ok': False,
                           'error': f'{type(exc).__name__}: {exc}'[:350]})

    prior_rows = []
    if args.previous and args.previous.is_file():
        try:
            prior_rows = json.loads(args.previous.read_text(encoding='utf-8')).get('events', [])
            if not isinstance(prior_rows, list):
                raise ValueError('previous events must be a list')
        except (ValueError, TypeError) as exc:
            cli.error(f'bad --previous snapshot: {exc}')
    rows, summary = ingest(all_events, old=prior_rows, now=now)
    status = {'checkedAt': now.isoformat(), 'source': 'Forex Factory',
              'mode': 'proof-of-concept-private-artifact', 'weeks': checks,
              'parsedTotal': len(all_events), **summary,
              'warning': 'No live results verified' if not rows else None}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({'updatedAt': now.isoformat(), 'source': 'Forex Factory',
                'events': rows}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    args.report.write_text(json.dumps(status, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(status, ensure_ascii=False, indent=2))
    # Failing both weeks should not be presented as success.
    return 0 if any(x['ok'] for x in checks) and rows else 1


if __name__ == '__main__':
    sys.exit(main())
