#!/usr/bin/env python3
"""Curated FX, indices, futures proxies and crypto snapshots for GitHub Pages.
No fabricated fallback. Yahoo Finance chart is an unofficial public endpoint;
if insufficient assets respond, do not overwrite the last successful file.
"""
import concurrent.futures
import datetime as dt
import json
import math
from pathlib import Path
import urllib.parse
import urllib.request

# (display symbol, Yahoo symbol, name, group, TradingView link, whether futures proxy)
INSTRUMENTS = [
 ('EURUSD','EURUSD=X','يورو / دولار','forex','EURUSD',False),
 ('GBPUSD','GBPUSD=X','جنيه / دولار','forex','GBPUSD',False),
 ('USDJPY','JPY=X','دولار / ين','forex','USDJPY',False),
 ('USDCHF','CHF=X','دولار / فرنك','forex','USDCHF',False),
 ('USDCAD','CAD=X','دولار / كندي','forex','USDCAD',False),
 ('AUDUSD','AUDUSD=X','أسترالي / دولار','forex','AUDUSD',False),
 ('NZDUSD','NZDUSD=X','نيوزيلندي / دولار','forex','NZDUSD',False),
 ('XAUUSD','GC=F','الذهب — عقود COMEX الآجلة','metals','XAUUSD',True),
 ('XAGUSD','SI=F','الفضة — عقود COMEX الآجلة','metals','XAGUSD',True),
 ('NAS100','^NDX','NASDAQ 100','index','NDX',False),
 ('SP500','^GSPC','S&P 500','index','SPX',False),
 ('DJ30','^DJI','Dow Jones','index','DJI',False),
 ('WTI','CL=F','خام WTI — عقد آجل','energy','USOIL',True),
 ('BTCUSD','BTC-USD','Bitcoin','crypto','BTCUSD',False),
 ('ETHUSD','ETH-USD','Ethereum','crypto','ETHUSD',False),
]

def get_one(inst):
    symbol, yahoo, label, group, tv, proxy = inst
    url='https://query1.finance.yahoo.com/v8/finance/chart/'+urllib.parse.quote(yahoo,safe='')+'?interval=1d&range=5d'
    payload=None
    errors=[]
    for domain in ('query1.finance.yahoo.com','query2.finance.yahoo.com'):
        endpoint=url.replace('query1.finance.yahoo.com',domain)
        req=urllib.request.Request(endpoint,headers={'User-Agent':'Mozilla/5.0 (compatible; ICTArabic/2.7)','Accept':'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=18) as resp:
                payload=json.load(resp)
            break
        except Exception as exc:
            errors.append(f'{domain}: {exc}')
    if payload is None: raise RuntimeError('; '.join(errors))
    chart=(payload.get('chart',{}).get('result') or [None])[0]
    if not chart: raise ValueError('No chart for '+yahoo)
    meta=chart.get('meta') or {}
    price=float(meta['regularMarketPrice'])
    prev=meta.get('chartPreviousClose') or meta.get('previousClose')
    if not prev:
        vals=((chart.get('indicators') or {}).get('quote') or [{}])[0].get('close') or []
        vals=[float(v) for v in vals if v is not None and math.isfinite(float(v))]
        if len(vals)>=2: prev=vals[-2]
    prev=float(prev)
    if not all(math.isfinite(v) and v>0 for v in (price,prev)):
        raise ValueError('Invalid price or comparison baseline for '+yahoo)
    ts=meta.get('regularMarketTime')
    if not ts: raise ValueError('Missing quote timestamp')
    quote_at=dt.datetime.fromtimestamp(int(ts), dt.timezone.utc)
    if abs((dt.datetime.now(dt.timezone.utc)-quote_at).total_seconds())>7*86400:
        raise ValueError('Quote older than 7 days: '+yahoo)
    change=(price/prev-1)*100
    if abs(change)>99:raise ValueError('Unreasonable change: '+yahoo)
    return {'symbol':symbol,'label':label,'category':group,'change':round(change,4),
            'price':round(price,8),'quotedAt':quote_at.isoformat().replace('+00:00','Z'),'proxy':proxy,
            'url':'https://www.tradingview.com/symbols/'+tv+'/'}

if __name__=='__main__':
    items=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        futures={pool.submit(get_one,x):x[0] for x in INSTRUMENTS}
        for f in concurrent.futures.as_completed(futures):
            try: items.append(f.result())
            except Exception as exc:print('WARNING: quote unavailable for',futures[f],':',str(exc))
    if len(items)<4: raise RuntimeError(f'Only {len(items)} of {len(INSTRUMENTS)} instruments returned valid quotes; refusing to overwrite feed')
    order={x[0]:i for i,x in enumerate(INSTRUMENTS)}
    items.sort(key=lambda x:order[x['symbol']])
    output={'updatedAt':dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00','Z'),
            'source':'Yahoo Finance public chart feed (unofficial)','changeBasis':'Yahoo chart previous close; not uniform 24h',
            'items':items}
    out=Path(__file__).resolve().parents[1]/'market-movers.json'
    out.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print('Updated',len(items),'curated instruments')
