#!/usr/bin/env python3
"""Send OneSignal Web Push for *new* opted-in ICT analysis/signal posts.
Run from a push-triggered GitHub Action with the previous commit SHA.
A manual workflow run is diagnostic (dry-run) and NEVER broadcasts.
"""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.error
import urllib.request
import uuid

BASE = 'https://ismaeilmoh.github.io/ictbelaraby/'
POST_FILES = (('analysis', 'analyses.json'), ('signal', 'recs.json'))
MAX_PER_RUN = 5
MAX_AGE_HOURS = 24


def load_array(raw, filename):
    parsed = json.loads(raw)
    if not isinstance(parsed, list):
        raise ValueError(f'{filename} must be a JSON array')
    return parsed


def previous_file(revision, filename):
    proc = subprocess.run(['git', 'cat-file', '-e', f'{revision}:{filename}'], capture_output=True)
    if proc.returncode != 0:
        return None
    data = subprocess.check_output(['git', 'show', f'{revision}:{filename}'])
    return load_array(data.decode('utf-8'), filename)


def identifier(post, kind):
    if post.get('id'):
        return str(post['id'])
    keys = ('pair', 'date', 'entry') if kind == 'signal' else ('asset', 'published_at', 'title')
    return '|'.join(str(post.get(key, '')) for key in keys)


def recent(post, now):
    value = post.get('published_at') or post.get('date')
    if not value:
        return False
    try:
        when = dt.datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        if when.tzinfo is None:
            return False
        seconds = (now - when.astimezone(dt.timezone.utc)).total_seconds()
        return -300 <= seconds <= MAX_AGE_HOURS * 3600
    except (TypeError, ValueError):
        return False


def announcements(before, now):
    result = []
    for kind, path in POST_FILES:
        current = load_array(Path(path).read_text(encoding='utf-8'), path)
        older = previous_file(before, path)
        if older is None:
            print(f'{path}: no previous version; skipping initial import')
            continue
        seen = {identifier(p, kind) for p in older if isinstance(p, dict)}
        for post in current:
            if not isinstance(post, dict):
                continue
            pid = identifier(post, kind)
            if pid in seen or post.get('sample') or post.get('notify') is not True:
                continue
            if not recent(post, now):
                print(f'Skipping old or invalid publication date: {kind}:{pid[:40]}')
                continue
            title = str(post.get('title') or post.get('pair') or post.get('asset') or '').strip()
            if not title:
                continue
            excerpt = str(post.get('summary') or post.get('note') or 'التفاصيل متاحة على موقع ICT بالعربي').strip()
            result.append(dict(kind=kind, pid=pid, title=title, excerpt=excerpt, published_at=str(post.get('published_at') or post.get('date'))))
    # Stable order prevents different sends on retries.
    return sorted(result, key=lambda p: (p['published_at'], p['kind'], p['pid']))


def stable_uuid_v4(key):
    """Reproducible UUID version 4 for OneSignal idempotency across retries."""
    return str(uuid.UUID(bytes=hashlib.sha256(key.encode('utf-8')).digest()[:16], version=4))


def send(post, app_id, api_key):
    kind, pid = post['kind'], post['pid']
    notification = {
        'app_id': app_id,
        'headings': {'en': ('تحليل جديد | ' if kind == 'analysis' else 'توصية جديدة | ') + post['title'][:85]},
        'contents': {'en': post['excerpt'][:220]},
        'url': BASE + '#recs',
        'filters': [{'field': 'tag', 'key': 'ict_posts', 'relation': '=', 'value': '1'}],
        'isAnyWeb': True,
        'idempotency_key': stable_uuid_v4('ictbelaraby-new-post-v1:' + kind + ':' + pid),
    }
    req = urllib.request.Request(
        'https://api.onesignal.com/notifications',
        data=json.dumps(notification, ensure_ascii=False).encode('utf-8'),
        headers={'Content-Type': 'application/json; charset=utf-8', 'Authorization': 'Key ' + api_key},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            result = json.load(response)
    except urllib.error.HTTPError as exc:
        body = exc.read(1000).decode('utf-8', errors='replace')
        raise RuntimeError(f'OneSignal HTTP {exc.code}: {body}') from exc
    if not result.get('id'):
        raise RuntimeError(f'OneSignal did not confirm the request: {result}')
    print(f'OneSignal accepted {kind} notification: {result["id"]}; recipients={result.get("recipients", "unknown")}')


def main():
    before = os.getenv('BEFORE_REV', '')
    diagnostic = os.getenv('GITHUB_EVENT_NAME') != 'push'
    if diagnostic:
        print('Diagnostic only: manual workflow runs do not send notifications.')
        return 0
    if not re.fullmatch(r'[0-9a-fA-F]{40}', before) or before == '0' * 40:
        print('No valid previous commit: skipping first/import run.')
        return 0
    now = dt.datetime.now(dt.timezone.utc)
    posts = announcements(before, now)
    print(f'New opted-in posts: {len(posts)}')
    if not posts:
        return 0
    if len(posts) > MAX_PER_RUN:
        print(f'Refusing bulk send of {len(posts)} posts; max {MAX_PER_RUN}.')
        return 1
    app_id = os.getenv('ONESIGNAL_APP_ID', '').strip()
    api_key = os.getenv('ONESIGNAL_REST_API_KEY', '').strip()
    if not app_id or not api_key:
        print('Missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY in repository Actions secrets.', file=sys.stderr)
        return 1
    for post in posts:
        send(post, app_id, api_key)
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f'Notification job failed: {exc}', file=sys.stderr)
        raise SystemExit(1)
