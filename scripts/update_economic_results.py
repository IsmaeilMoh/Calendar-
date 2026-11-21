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


def select_weeks(today, lookback=2):
    """Return complete weeks through the current Gaza-local week (never future)."""
    if not 0 <= lookback <= 4:
        raise ValueError('lookback must be between 0 and 4 weeks')
    current = monday_for(today)
    return [current - timedelta(days=7 * n) for n in range(lookback, -1, -1)]


def main(argv=None):
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--fixture-html', type=Path,
                     help='Offline smoke test with an authorized saved HTML page')
    cli.add_argument('--week-start', type=date.fromisoformat,
                     help='YYYY-MM-DD (Monday), required with --fixture-html')
    cli.add_argument('--output', type=Path, default=Path('economic-results-preview.json'))
    cli.add_argument('--report', type=Path, default=Path('economic-results-status.json'))
    cli.add_argument('--previous', type=Path, help='Optional prior preview JSON to preserve corrections')
    cli.add_argument('--lookback-weeks', type=int, default=2,
                     help='Completed weeks to revisit, before current Gaza week (default: 2; max: 4)')
    args = cli.parse_args(argv)
    if args.fixture_html and args.week_start is None:
        cli.error('--week-start is required with --fixture-html')
    if args.week_start and args.week_start.weekday() != 0:
        cli.error('--week-start must be a Monday')

    if not 0 <= args.lookback_weeks <= 4:
        cli.error('--lookback-weeks must be between 0 and 4')
    now = datetime.now(timezone.utc)
    local_today = now.astimezone(GAZA).date()
    week = monday_for(local_today)
    weeks = [args.week_start] if args.fixture_html else select_weeks(local_today, args.lookback_weeks)
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
    comparable_total = sum(1 for row in rows if row.get('comparison', {}).get('comparable'))
    status = {'checkedAt': now.isoformat(), 'source': 'Forex Factory',
              'mode': 'proof-of-concept-private-artifact', 'currentWeekStart': week.isoformat(),
              'requestedWeekStarts': [d.isoformat() for d in weeks],
              'successfulWeeks': sum(1 for c in checks if c['ok']), 'weeks': checks,
              'parsedTotal': len(all_events), 'archiveTotal': len(rows),
              'comparableTotal': comparable_total, 'previousLoaded': len(prior_rows), **summary,
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
