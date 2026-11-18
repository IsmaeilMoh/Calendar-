#!/usr/bin/env python3
"""Pull current economic headlines into a small attributed JSON metadata feed.
No full-text copying, no API keys, independent feed failure handling.
"""
from __future__ import annotations
import datetime as dt
import email.utils
import hashlib
import html
import json
import os
from pathlib import Path
import re
import urllib.parse
import urllib.request
from html.parser import HTMLParser
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'news-live.json'
NOW = dt.datetime.now(dt.timezone.utc)
UTC = dt.timezone.utc
MAX_AGE = dt.timedelta(days=5)

# Source feeds: Arabic headlines from Google News indexing, plus primary-source releases.
# Source names and original publisher links always remain visible in the UI.
SEARCHES = [
    ('أسواق', 'الأسواق العالمية أسهم وول ستريت ناسداك داو جونز S&P 500'),
    ('عملات', 'الدولار اليورو الجنيه الإسترليني الين أسعار الصرف الفوركس'),
    ('معادن', 'الذهب الفضة أسعار المعادن الفائدة'),
    ('طاقة', 'النفط أوبك خام برنت غرب تكساس أسعار الطاقة'),
    ('بنوك مركزية', 'الفيدرالي البنك المركزي الأوروبي أسعار الفائدة التضخم'),
    ('اقتصاد', 'الاقتصاد الأمريكي التضخم الوظائف البطالة الناتج المحلي'),
    ('عملات رقمية', 'بيتكوين إيثيريوم العملات الرقمية الأسواق'),
]
SOURCES = []
for cat, phrase in SEARCHES:
    query = urllib.parse.quote(phrase + ' when:2d')
    SOURCES.append((cat, f'https://news.google.com/rss/search?q={query}&hl=ar&gl=SA&ceid=SA:ar', 'Google News'))
SOURCES.extend([
    # Independent Arabic business RSS; images are used only when embedded as source metadata.
    ('اقتصاد', 'https://cnnbusinessarabic.com/rssFeed/276/205', 'CNN Business Arabic'),
    ('بنوك مركزية', 'https://www.federalreserve.gov/feeds/press_monetary.xml', 'Federal Reserve'),
    ('بنوك مركزية', 'https://www.ecb.europa.eu/rss/press.html', 'European Central Bank'),
    ('اقتصاد', 'https://www.bls.gov/feed/bls_latest.rss', 'BLS'),
])

BLOCK = re.compile(r'(?i)(مباراة|كرة القدم|الممثلة|المطرب|الطقس اليوم|الابراج|زواج|مسلسل|المشاهير|entertainment|sports|celebrity)')
PRIORITY = re.compile(r'(?i)(الفيدرالي|الفائدة|التضخم|الوظائف|الذهب|الدولار|النفط|البيتكوين|بيتكوين|أوبك|الأسهم|وول ستريت|ناسداك|الركود|البنك المركزي|Federal Reserve|interest rate|inflation|monetary policy|employment|CPI|FOMC|GDP)')


def clean(v):
    v = re.sub(r'<[^>]+>', ' ', html.unescape(v or ''))
    return re.sub(r'\s+', ' ', v).strip()


def published(value):
    try:
        value = email.utils.parsedate_to_datetime(value)
        if value.tzinfo is None: value=value.replace(tzinfo=UTC)
        return value.astimezone(UTC)
    except Exception:
        try:
            value = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
            return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)
        except Exception:
            return None


def download(url):
    req=urllib.request.Request(url, headers={'User-Agent':'ICTbelaraby-NewsMonitor/1.0 (+https://github.com/IsmaeilMoh/ictbelaraby)','Accept':'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9'})
    with urllib.request.urlopen(req, timeout=18) as response:
        body=response.read(2_000_001)
        if len(body)>2_000_000: raise ValueError('RSS exceeds size limit')
        return body


def children_text(el, names):
    for n in names:
        hit=el.find(n)
        if hit is not None and hit.text:
            return hit.text.strip()
    return ''


# Image metadata is linked to the original publisher, not downloaded or republished.
# Media RSS / RSS enclosures / HTML content are handled conservatively.
MEDIA_NS='http://search.yahoo.com/mrss/'
CONTENT_NS='http://purl.org/rss/1.0/modules/content/'


def safe_image_url(value, base=''):
    if not value: return ''
    value=html.unescape(str(value).strip())
    url=urllib.parse.urljoin(base, value)
    bits=urllib.parse.urlparse(url)
    if bits.scheme!='https' or not bits.hostname or bits.username or bits.password: return ''
    if len(url)>1800 or any(c in url for c in '<>\\"\''): return ''
    if bits.hostname.lower() in ('localhost', '127.0.0.1', '0.0.0.0'): return ''
    if bits.path.lower().endswith(('.svg','.gif','.pdf')):return ''
    return url


class ImgFinder(HTMLParser):
    def __init__(self): super().__init__();self.src=''
    def handle_starttag(self, tag, attrs):
        if tag.lower()!='img' or self.src:return
        a=dict(attrs)
        for key in ('src','data-src','data-original'):
            if a.get(key):self.src=a[key];return


def find_image(entry, article_url):
    # Prefer editorial preview metadata from the same news item.
    for tag in (f'{{{MEDIA_NS}}}thumbnail',f'{{{MEDIA_NS}}}content','enclosure','image'):
        for node in entry.findall('.//'+tag):
            kind=(node.get('type','')+' '+node.get('medium','')).lower()
            candidate=node.get('url','') or (node.text or '')
            if tag=='enclosure' and 'image/' not in kind:continue
            if tag==f'{{{MEDIA_NS}}}content' and 'image' not in kind and not re.search(r'\.(?:png|jpe?g|webp)(?:\?|$)',candidate,re.I):continue
            result=safe_image_url(candidate,article_url)
            if result:return result
    # Some publisher feeds place an actual image element in CDATA.
    for tag in ('description',f'{{{CONTENT_NS}}}encoded','summary',f'{{{http://www.w3.org/2005/Atom}}}content'):
        node=entry.find(tag)
        if node is None or not node.text:continue
        finder=ImgFinder()
        try:finder.feed(node.text)
        except Exception:pass
        result=safe_image_url(finder.src,article_url)
        if result:return result
    return ''


def parse(raw, category, fallback):
    doc=ET.fromstring(raw)
    items=doc.findall('.//item')
    if not items: items=doc.findall('.//{http://www.w3.org/2005/Atom}entry')
    output=[]
    for entry in items[:35]:
        title=clean(children_text(entry,['title','{http://www.w3.org/2005/Atom}title']))
        url=children_text(entry,['link'])
        if not url:
            link=entry.find('{http://www.w3.org/2005/Atom}link')
            url=link.get('href','') if link is not None else ''
        date=published(children_text(entry,['pubDate','{http://purl.org/dc/elements/1.1/}date','{http://www.w3.org/2005/Atom}updated','{http://www.w3.org/2005/Atom}published']))
        if not title or not url.startswith('https://') or not date: continue
        if date > NOW + dt.timedelta(minutes=15) or NOW-date > MAX_AGE: continue
        if BLOCK.search(title): continue
        publisher=fallback
        source=entry.find('source')
        if source is not None and source.text: publisher=clean(source.text)
        if fallback=='Google News' and ' - ' in title:
            maybe_title,maybe_publisher=title.rsplit(' - ',1)
            if len(maybe_publisher)<70 and len(maybe_title)>12:
                title=maybe_title.strip(); publisher=maybe_publisher.strip()
        score=2 if PRIORITY.search(title) else 0
        if fallback!='Google News':score+=2
        url=html.unescape(url)
        image=find_image(entry,url)
        key=hashlib.sha256(re.sub(r'\W+','',title.lower()).encode('utf-8')).hexdigest()[:20]
        output.append({'id':key,'title':title[:240], 'tag':category,'src':publisher[:75], 'date':date.isoformat().replace('+00:00','Z'), 'url':url[:1800], 'priority':score, 'language':'ar' if re.search('[\u0600-\u06ff]',title) else 'en', 'image':image})
    return output


def main():
    rows=[]; successes=[]; errors=[]
    for category,url,source in SOURCES:
        try:
            parsed=parse(download(url),category,source)
            rows.extend(parsed)
            successes.append(f'{source}/{category}={len(parsed)}')
        except Exception as exc:
            errors.append(f'{source}/{category}: {str(exc)[:90]}')
    if not rows:
        print('No current news returned; keeping previous file.');print('; '.join(errors))
        # A failed sync must not overwrite the last successful snapshot.
        raise SystemExit(1)
    dedup={}
    for row in rows:
        old=dedup.get(row['id'])
        if old is None or row['priority']>old['priority']:dedup[row['id']]=row
    try:
        previous=json.loads(OUTPUT.read_text(encoding='utf-8')) if OUTPUT.exists() else {}
        previous_images={r.get('id'):r.get('image') for r in previous.get('items',[]) if r.get('image')}
        for row in dedup.values():
            if not row.get('image') and row['id'] in previous_images:
                row['image']=safe_image_url(previous_images[row['id']])
    except (OSError,ValueError,TypeError): pass
    ranked=sorted(dedup.values(),key=lambda n:(n['priority'],n['date']),reverse=True)[:80]
    # Across categories preserve an approximately chronological stream with priority tie-break.
    ranked.sort(key=lambda n:n['date'],reverse=True)
    payload={'updated_at':NOW.isoformat(timespec='seconds').replace('+00:00','Z'),'mode':'rss-attributed','items':ranked,'source_count':len(successes),'fetch_errors':len(errors)}
    OUTPUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Wrote {len(ranked)} current headlines from {len(successes)} feeds. Errors: {len(errors)}')
    if errors: print('Source failures: '+'; '.join(errors))

if __name__=='__main__':main()
