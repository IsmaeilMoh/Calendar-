#!/usr/bin/env python3
"""Fetch real Bybit USDT linear 24h movers; fail without overwriting good data."""
import json, datetime, pathlib, urllib.request, re, math
URL='https://api.bybit.com/v5/market/tickers?category=linear'
req=urllib.request.Request(URL, headers={'User-Agent':'ICTArabicMarketDashboard/2.2','Accept':'application/json'})
with urllib.request.urlopen(req, timeout=25) as response:
    payload=json.load(response)
if payload.get('retCode')!=0 or not isinstance(payload.get('result',{}).get('list'),list):
    raise RuntimeError('Unexpected response from Bybit')
items=[]
for t in payload['result']['list']:
    s=t.get('symbol','')
    if not re.fullmatch(r'[A-Z0-9]+USDT',s) or re.fullmatch(r'(USDC|USDE|FDUSD|TUSD|DAI|USDD|PYUSD|EUR|USD)USDT',s):continue
    try: pct=float(t['price24hPcnt'])*100;vol=float(t['turnover24h'])
    except (KeyError,ValueError,TypeError):continue
    if not math.isfinite(pct) or not math.isfinite(vol) or vol<1000000 or abs(pct)>=10000:continue
    items.append({'symbol':s,'change':round(pct,4),'turnover':round(vol,2)})
if len(items)<10:raise RuntimeError('Insufficient valid instruments; refusing overwrite')
items.sort(key=lambda x:x['turnover'],reverse=True)
out={'updatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z'),'source':'bybit','items':items}
path=pathlib.Path(__file__).resolve().parent.parent/'market-movers.json'
path.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n')
print(f'Updated {len(items)} real USDT perpetual contracts')
