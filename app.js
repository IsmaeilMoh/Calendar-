'use strict';
const $=x=>document.getElementById(x),S={news:[],newsArchive:[],newsUpdated:null,newsStatus:'loading',recs:[],analyses:[],links:[],agenda:{days:[]},liveEvents:[],liveUpdated:null,liveStatus:'loading',movers:[],moversUpdated:null,moversStatus:'loading'},state={page:'home',nf:'الكل',rf:'all',contentTab:'signals',analysisAsset:'all',country:'ALL',impact:'all',day:'all',search:''};
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=u=>/^https:\/\/[^\s\"'<>]+$/i.test(u||'')?u:'#';
const newsImageURL=u=>{const raw=String(u||'');try{const p=new URL(raw);return p.protocol==='https:'&&!/\.(svg|gif|pdf)$/i.test(p.pathname)&&!/[<>\s]/.test(raw)?raw:''}catch(e){return ''}};
const newsImage=n=>newsImageURL(n?.image||n?.image_url||n?.thumbnail);
const dateFormat=d=>{if(!d)return '';const obj=new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(d))?d+'T12:00:00':d);return Number.isFinite(obj.getTime())?obj.toLocaleString('ar-u-nu-latn',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:typeof currentZone==='function'?currentZone():undefined}):''};
const section=(title,content,link='',more='عرض الكل')=>`<section class="section"><div class="section-heading"><h2>${title}</h2>${link?`<a href="${link}">${more} ←</a>`:''}</div>${content}</section>`;
const empty=m=>`<div class="empty">${m}</div>`;
async function load(file){try{const r=await fetch(file,{cache:'no-store'});if(!r.ok)throw Error(r.status);return await r.json()}catch(e){console.warn('تعذر تحميل',file,e);return null}}
function cardNews(n){const photo=newsImage(n);const artwork=photo?`<div class="news-photo"><img src="${escapeHTML(photo)}" alt="صورة مرفقة من المصدر: ${escapeHTML(n.src||'المصدر')}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.closest('.news-photo').classList.add('image-error')"><span class="news-photo-fallback" aria-hidden="true">${escapeHTML(n.tag||'اقتصاد')}</span></div>`:`<div class="news-photo news-photo-placeholder" aria-hidden="true"><span>${escapeHTML(n.tag||'اقتصاد')}</span></div>`;return `<article class="card news-card">${artwork}<span class="tag">${escapeHTML(n.tag||'اقتصاد')}</span><h3>${escapeHTML(n.title)}</h3><p>${escapeHTML(n.sum||'')}</p><div class="card-meta"><span>${escapeHTML(n.src||'')} · ${dateFormat(n.date)}</span>${safeUrl(n.url)!=='#'?`<a href="${escapeHTML(safeUrl(n.url))}" target="_blank" rel="noopener noreferrer">قراءة الخبر ↗</a>`:''}</div></article>`}
function newsStatusLine(){const date=S.newsUpdated?dateFormat(S.newsUpdated):'';if(S.newsStatus==='fresh')return `آخر تحديث: ${escapeHTML(date)} • أخبار من مصادرها الأصلية`;
if(S.newsStatus==='stale')return `آخر تحديث: ${escapeHTML(date)} • قد تكون بعض الأخبار قديمة؛ تحقق من تاريخ النشر`;
if(S.newsStatus==='archive')return 'أخبار سابقة • الأخبار الجديدة غير متاحة حاليًا';
return 'جارٍ تحميل الأخبار…';}
function newsBadge(){return `<span class="news-live-chip ${S.newsStatus==='fresh'?'is-fresh':S.newsStatus==='stale'?'is-stale':''}">${S.newsStatus==='fresh'?'تحديث تلقائي':S.newsStatus==='stale'?'أخبار سابقة':S.newsStatus==='archive'?'أرشيف':'جارٍ التحديث'}</span>`;}
async function fetchLiveNews(){
 let payload=null;try{const r=await fetch('news-live.json?t='+Date.now(),{cache:'no-store'});if(r.ok)payload=await r.json()}catch(e){console.info('News feed unavailable',e.message)}
 const time=payload?.updated_at?new Date(payload.updated_at):null;
 const records=Array.isArray(payload?.items)?payload.items:[];
 const normalized=records.filter(n=>n&&typeof n.title==='string'&&n.title.trim()&&/^https:\/\/[^\s]+$/i.test(n.url||'')&&Number.isFinite(new Date(n.date).getTime())&&Date.now()-new Date(n.date).getTime()<7*86400000).map(n=>({title:n.title,src:String(n.src||'المصدر'),tag:String(n.tag||'اقتصاد'),date:n.date,url:n.url,sum:'',image:newsImage(n),language:n.language||'ar'})).slice(0,80);
 if(normalized.length){S.news=normalized;S.newsUpdated=time;S.newsStatus=(time&&Number.isFinite(time.getTime())&&Date.now()-time.getTime()<4*3600000)?'fresh':'stale';}
 else {S.news=S.newsArchive;S.newsUpdated=null;S.newsStatus='archive';}
 if(['news','home'].includes(state.page))render();
}
function newsGrid(items){return items.length?`<div class="grid">${items.map(cardNews).join('')}</div>`:empty('لا توجد أخبار في هذا التصنيف.')}
const statusNames={open:'مفتوحة',tp:'تحقق الهدف',sl:'وقف الخسارة',cl:'مغلقة'};
function cardRec(r){const buy=r.dir==='buy',stat=r.status||'open';return `<article class="card"><div class="rec-head"><span class="pair" dir="ltr">${escapeHTML(r.pair)}</span><span class="direction ${buy?'buy':'sell'}">${buy?'BUY • شراء':'SELL • بيع'}</span></div><div class="kv"><div><small>الدخول ENTRY</small><strong dir="ltr">${escapeHTML(r.entry)}</strong></div><div><small>الهدف TP</small><strong dir="ltr">${escapeHTML(r.tp)}</strong></div><div><small>الإيقاف SL</small><strong dir="ltr">${escapeHTML(r.sl)}</strong></div></div><div class="card-meta"><span>${dateFormat(r.date)}</span><span class="status">${escapeHTML(statusNames[stat]||stat)}</span></div>${r.note?`<p style="margin-top:12px">${escapeHTML(r.note)}</p>`:''}${r.sample?'<span class="tag">بيانات تجريبية</span>':''}</article>`}
function recGrid(items){return items.length?`<div class="grid">${items.map(cardRec).join('')}</div>`:empty('لا توجد توصيات في هذه الحالة.')}
// Only same-site uploaded chart images or HTTPS source images are accepted.
function analysisImageURL(value){const raw=String(value||'');if(/^https:\/\/[^\s<>"']+$/.test(raw))return newsImageURL(raw);if(/^analysis-images\/[a-zA-Z0-9_./-]+\.(?:jpg|jpeg|png|webp)$/i.test(raw)&&!raw.includes('..'))return raw;return ''}
// Independent long-form market analysis, not an immediate trade signal.
function analysisCard(a){
 const img=analysisImageURL(a.image),asset=escapeHTML(a.asset||'الأسواق'),heading=escapeHTML(a.title||''),bias=escapeHTML(a.bias||'نظرة محايدة');
 const safeImage=img?`<img class="analysis-image" src="${escapeHTML(img)}" alt="شارت تحليل ${asset}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.hidden=true">`:`<div class="analysis-image analysis-placeholder"><span>CHART / ANALYSIS</span><strong>${asset}</strong></div>`;
 const notes=String(a.body||a.summary||'').split(/\n+/).filter(Boolean).map(x=>`<p>${escapeHTML(x)}</p>`).join('');
 const levels=Array.isArray(a.levels)?a.levels.filter(x=>x&&x.label&&x.value).slice(0,8).map(x=>`<span><small>${escapeHTML(x.label)}</small><b dir="ltr">${escapeHTML(x.value)}</b></span>`).join(''):'';
 const chart=safeUrl(a.chart_url),updated=a.updated_at&&a.updated_at!==a.published_at;
 return `<article class="card analysis-card">${safeImage}<div class="analysis-copy"><div class="analysis-tags"><span class="tag">${asset}</span><span class="tag">${escapeHTML(a.timeframe||'غير محدد')}</span><span class="tag analysis-bias">${bias}</span>${a.status==='invalidated'?'<span class="tag">تم إبطال الفكرة</span>':a.status==='completed'?'<span class="tag">مكتمل</span>':''}</div><h3>${heading}</h3><p class="analysis-summary">${escapeHTML(a.summary||'')}</p><div class="analysis-meta"><span>نُشر: ${escapeHTML(dateFormat(a.published_at))}</span>${updated?`<span>حُدّث: ${escapeHTML(dateFormat(a.updated_at))}</span>`:''}</div><details><summary>قراءة التحليل والمستويات</summary><div class="analysis-body">${notes}${levels?`<div class="analysis-levels">${levels}</div>`:''}${a.invalidation?`<p><b>شرط إبطال السيناريو:</b> ${escapeHTML(a.invalidation)}</p>`:''}${chart!=='#'?`<a class="analysis-chart-link" href="${escapeHTML(chart)}" target="_blank" rel="noopener noreferrer">فتح الرسم البياني ↗</a>`:''}</div></details></div></article>`;
}
function analysesGrid(){const assets=['all',...new Set(S.analyses.map(a=>a.asset).filter(Boolean))];const items=S.analyses.filter(a=>state.analysisAsset==='all'||a.asset===state.analysisAsset).sort((a,b)=>Date.parse(b.published_at||0)-Date.parse(a.published_at||0));return `<div class="analysis-toolbar"><div><strong>التحليلات الفنية والنظرة المستقبلية</strong><p>تحليل فني مصحوب بصورة شارت، ولا يعني بالضرورة وجود نقطة دخول فورية.</p></div><label>الأصل <select id="analysis-asset"><option value="all">كل الأصول</option>${assets.filter(x=>x!=='all').map(x=>`<option value="${escapeHTML(x)}" ${state.analysisAsset===x?'selected':''}>${escapeHTML(x)}</option>`).join('')}</select></label></div>${items.length?`<div class="analysis-grid">${items.map(analysisCard).join('')}</div>`:empty('لم تُنشر تحليلات بعد. أضف أول تحليل في ملف analyses.json مع صورة الشارت والتفاصيل.')}`}
const badges={telegram:'➤',x:'𝕏',youtube:'▶',instagram:'◎',tiktok:'♪',facebook:'f',whatsapp:'◉',email:'✉'};
function linksGrid(items){return items.length?`<div class="grid">${items.map(x=>{const ok=safeUrl(x.url)!=='#';const inside=`<span class="social-icon">${badges[x.icon]||'↗'}</span><span class="social-copy"><b>${escapeHTML(x.name)}</b><small>${escapeHTML(x.desc||'')}</small></span><span style="color:var(--muted)">${ok?'↗':'—'}</span>`;return ok?`<a class="card social-card" href="${safeUrl(x.url)}" target="_blank" rel="noopener noreferrer">${inside}</a>`:`<div class="card social-card disabled" title="الرابط لم يُضف بعد">${inside}</div>`}).join('')}</div>`:empty('لا تتوفر روابط بعد.')}
const navTitle={home:'الرئيسية',markets:'الأسواق',news:'الأخبار الاقتصادية',recs:'التوصيات',agenda:'الأجندة الاقتصادية',ict:'أدوات ICT',links:'تابعنا',more:'المزيد'};
function title(eng,arabic,lead){return `<div class="eyebrow">${eng}</div><h1 class="page-title">${arabic}</h1><p class="lead">${lead}</p>`}
// Featured editorial headlines — same verified feed as the news section, no duplicate source.
let heroSlideIndex=0,heroSlideTimer=null;
function heroNews(){if(!Array.isArray(S.news))return [];const recent=S.news.filter(n=>n&&n.title).slice(0,35);const pictured=recent.filter(n=>newsImage(n)).slice(0,3);const remaining=recent.filter(n=>!pictured.includes(n)).slice(0,5-pictured.length);return [...pictured,...remaining].sort((a,b)=>new Date(b.date)-new Date(a.date));}
function heroSlideMarkup(n,i,total){
 const src=escapeHTML(n.src||'المصدر غير محدد'),tag=escapeHTML(n.tag||'اقتصاد');
 const meta=escapeHTML(dateFormat(n.date));
 const sum=n.sum?`<p class="hero-news-summary">${escapeHTML(n.sum)}</p>`:'';
 const url=safeUrl(n.url);
 const image=newsImage(n);
 const heroPhoto=image?`<div class="hero-news-photo" aria-hidden="true"><img src="${escapeHTML(image)}" alt="" decoding="async" referrerpolicy="no-referrer" onerror="this.parentElement.classList.add('image-error')"></div>`:'';
 return `${heroPhoto}<div class="hero-news-body" aria-live="off"><div class="hero-news-label"><span class="hero-news-indicator" aria-hidden="true"></span><span>${S.newsStatus==='archive'?'من أرشيف الأخبار':S.newsStatus==='stale'?'أخبار سابقة':'أبرز الأخبار الاقتصادية'}</span><span class="hero-news-counter en" dir="ltr">${i+1} / ${total}</span></div><div class="hero-news-tag">${tag}</div><h2 class="hero-news-title">${escapeHTML(n.title)}</h2>${sum}<div class="hero-news-meta"><span>${src}</span><span aria-hidden="true">•</span><span>${meta}</span></div><div class="hero-news-action">${url!=='#'?`<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" class="hero-news-link">اقرأ الخبر من المصدر <span aria-hidden="true">↗</span></a>`:`<a href="#news" class="hero-news-link">استعرض الأخبار <span aria-hidden="true">←</span></a>`}</div></div>`;
}
function heroSlider(){
 const items=heroNews();
 if(!items.length)return `<div class="hero-news-slider hero-news-empty"><span class="eyebrow">HEADLINES</span><h2>أبرز الأخبار الاقتصادية</h2><p>لا توجد أخبار متاحة حاليًا. تصفح قسم الأخبار لاحقًا.</p><a class="hero-news-link" href="#news">قسم الأخبار ←</a></div>`;
 heroSlideIndex=((heroSlideIndex%items.length)+items.length)%items.length;
 const dots=items.map((_,i)=>`<button class="hero-news-dot ${i===heroSlideIndex?'is-active':''}" type="button" data-hero-index="${i}" aria-label="عرض الخبر ${i+1}" aria-pressed="${i===heroSlideIndex}"></button>`).join('');
 return `<section class="hero-news-slider" id="hero-news-slider" aria-roledescription="عارض أخبار" aria-label="أبرز الأخبار الاقتصادية"><div id="hero-slide-content" class="hero-slide-content">${heroSlideMarkup(items[heroSlideIndex],heroSlideIndex,items.length)}</div><div class="hero-news-controls"><div class="hero-news-dots" aria-label="اختيار الخبر">${dots}</div><div class="hero-news-arrows"><button type="button" data-hero-move="-1" aria-label="الخبر السابق">❮</button><button type="button" data-hero-move="1" aria-label="الخبر التالي">❯</button><button type="button" data-hero-pause aria-label="إيقاف التبديل التلقائي" title="إيقاف التبديل التلقائي">Ⅱ</button></div></div></section>`;
}
function showHeroSlide(index){
 const items=heroNews(),host=document.getElementById('hero-slide-content');if(!host||!items.length)return;
 heroSlideIndex=(index+items.length)%items.length;
 host.innerHTML=heroSlideMarkup(items[heroSlideIndex],heroSlideIndex,items.length);
 document.querySelectorAll('.hero-news-dot').forEach((b,i)=>{b.classList.toggle('is-active',i===heroSlideIndex);b.setAttribute('aria-pressed',String(i===heroSlideIndex))});
}
let heroSlidePaused=false;
function initHeroSlider(){
 if(heroSlideTimer){clearInterval(heroSlideTimer);heroSlideTimer=null}
 const slider=document.getElementById('hero-news-slider');
 if(!slider||heroNews().length<2)return;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 if(heroSlidePaused)return;
 heroSlideTimer=setInterval(()=>{
  if(state.page==='home'&&document.visibilityState==='visible'&&!slider.matches(':hover')&&!slider.matches(':focus-within'))showHeroSlide(heroSlideIndex+1)
 },7000);
}
function home(){
 const featuredNews=S.news.slice(0,3),liveRecs=S.recs.filter(r=>!r.sample).slice(0,3);
 return `<section class="welcome welcome-news-layout"><div class="hero-news-column">${heroSlider()}</div><div class="welcome-aside pulse-desk" id="market-pulse" aria-label="ملخص الأسواق والأخبار والجلسات">${marketPulse()}</div></section>
 <div class="section-title"><div><span class="eyebrow">QUICK ACCESS</span><h2>مركز التداول</h2></div><span class="subtle">أهم الأدوات، بضغطة واحدة</span></div><div class="tool-grid"><a class="tool-card" href="#markets"><span class="tool-glyph">▥</span><strong>مراقبة الأسواق</strong><span>خريطة حرارية ومخطط تفاعلي</span><b>استكشف ←</b></a><a class="tool-card" href="#agenda"><span class="tool-glyph">▦</span><strong>الأجندة الاقتصادية</strong><span>بحث وتصفية حسب الأهمية</span><b>استكشف ←</b></a><a class="tool-card" href="#ict"><span class="tool-glyph">◎</span><strong>جلسات ICT</strong><span>أوقات نيويورك وKill Zones</span><b>استكشف ←</b></a><a class="tool-card" href="#recs"><span class="tool-glyph">↗</span><strong>التوصيات</strong><span>المستويات والحالات والأرشيف</span><b>استكشف ←</b></a></div>
 ${notificationCenter('compact')}<div class="two-column"><section class="section flush-section"><div class="section-heading"><div><span class="eyebrow">ECONOMIC BRIEF</span><h2>أحدث الأخبار</h2>${newsBadge()}</div><a href="#news">جميع الأخبار ←</a></div><div class="news-stack"><div class="news-feed-status">${newsStatusLine()}</div>${featuredNews.length?featuredNews.map(n=>`<article class="news-line"><span class="tag">${escapeHTML(n.tag||'اقتصاد')}</span><h3>${escapeHTML(n.title)}</h3><p>${escapeHTML(n.sum||'')}</p><div class="small-meta">${escapeHTML(n.src||'')} • ${dateFormat(n.date)} ${safeUrl(n.url)!=='#'?`<a href="${escapeHTML(safeUrl(n.url))}" target="_blank" rel="noopener noreferrer">المصدر ↗</a>`:''}</div></article>`).join(''):empty('لا توجد أخبار متاحة')}</div></section><section class="section flush-section"><div class="section-heading"><div><span class="eyebrow">TRADE IDEAS</span><h2>التوصيات</h2></div><a href="#recs">كل التوصيات ←</a></div><div class="home-recs">${liveRecs.length?recGrid(liveRecs):`<div class="empty" style="height:100%"><span class="empty-glyph">◎</span><b>لا توجد توصيات حقيقية منشورة حاليًا</b><p>اطلع على آخر الأفكار والتحليلات المنشورة في قسم التوصيات.</p><a href="#recs">عرض صفحة التوصيات ←</a></div>`}</div></section></div>
 <section class="feature-strip"><div><span class="eyebrow">ECONOMIC CALENDAR</span><h2>لا تفوّت الأحداث التي تحرك السوق</h2><p>اطّلع على أهم الأحداث الاقتصادية، ومواعيدها، ونتائجها المتاحة.</p></div><a class="btn" href="#agenda">افتح الأجندة ←</a></section>${section('تابع مجتمعنا',linksGrid(S.links.filter(x=>x.url).slice(0,3)),'#links','كل الحسابات')}`;
}

// Market Pulse: Yahoo snapshot selects periodic movers only. TradingView supplies the displayed quotes.
const moverFreshMs=6*60*60*1000; // Snapshot polling is not a live streaming quote service
const allowedPulseSymbols=new Set(['EURUSD','GBPUSD','USDJPY','USDCHF','USDCAD','AUDUSD','NZDUSD','XAUUSD','XAGUSD','NAS100','SP500','DJ30','WTI','BTCUSD','ETHUSD']);
async function fetchMovers(){
 let payload=null;
 try{const r=await fetch('market-movers.json?t='+Date.now(),{cache:'no-store'});if(r.ok)payload=await r.json()}catch(e){console.info('Market snapshot unavailable',e.message)}
 const when=new Date(payload?.updatedAt||''),age=Date.now()-when.getTime();
 const rows=Array.isArray(payload?.items)?payload.items.filter(x=>allowedPulseSymbols.has(x.symbol)&&Number.isFinite(Number(x.change))&&Math.abs(Number(x.change))<100&&Number.isFinite(Date.parse(x.quotedAt))&&typeof x.url==='string'&&/^https:\/\/www\.tradingview\.com\//.test(x.url)).map(x=>({symbol:x.symbol,label:String(x.label||x.symbol),change:Number(x.change),price:(x.price!==null&&x.price!==undefined&&x.price!==''&&Number.isFinite(Number(x.price))&&Number(x.price)>0)?Number(x.price):null,quotedAt:x.quotedAt,proxy:Boolean(x.proxy),url:x.url,category:String(x.category||'')})):[];
 S.movers=rows;S.moversUpdated=when;
 S.moversStatus=rows.length&&Number.isFinite(age)&&age>=-300000&&age<moverFreshMs?'fresh':rows.length&&Number.isFinite(age)&&age<72*3600000?'stale':'unavailable';refreshPulse();ticker();
}
function compactCountdown(ms){const secs=Math.max(0,Math.floor(ms/1000));const days=Math.floor(secs/86400),hh=Math.floor(secs%86400/3600),mm=Math.floor(secs%3600/60),ss=secs%60;return days?`${days}ي ${String(hh).padStart(2,'0')}س ${String(mm).padStart(2,'0')}د`:`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`}
function currentIctWindow(){
 const now=new Date(),today=nyToday();
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
 const mins=parts.hour*60+parts.minute;
 const windows=ictZones.map(([name,start,end,description])=>{
   const a=Number(start.slice(0,2))*60+Number(start.slice(3)),b=Number(end.slice(0,2))*60+Number(end.slice(3));
   const active=a<b?(mins>=a&&mins<b):(mins>=a||mins<b);
   let startDate=nyLocalToUtc(today,start),endDate=nyLocalToUtc(today,end);
   if(a>=b){if(mins<b)startDate=new Date(startDate.getTime()-86400000);else endDate=new Date(endDate.getTime()+86400000)}
   if(!active&&startDate<=now)startDate=new Date(startDate.getTime()+86400000);
   return {name,start,end,description,active,startDate,endDate};
 });
 const priority=['New York AM Silver Bullet','London Silver Bullet','New York PM Silver Bullet','New York Kill Zone','London Kill Zone','London Close','Asian Session'];
 const active=windows.filter(z=>z.active).sort((a,b)=>priority.indexOf(a.name)-priority.indexOf(b.name));
 const picked=active[0];
 if(!picked){const upcoming=windows.sort((a,b)=>a.startDate-b.startDate)[0];return {active:false,title:'خارج نوافذ ICT المحددة',next:upcoming,others:0}}
 return {...picked,title:picked.name,others:active.length-1};
}
function pulseClock(deadline,klass){return `<b class="en ${klass}" dir="ltr" data-deadline="${Number(deadline)}">${compactCountdown(Number(deadline)-Date.now())}</b>`}
// ICT v3.7: use the actual published quote; never estimate missing prices from percent change.
function marketQuotePrice(x){
 const n=x.price;
 if(typeof n!=='number'||!Number.isFinite(n)||n<=0)return '—';
 const fixed=({EURUSD:5,GBPUSD:5,USDJPY:3,USDCHF:5,USDCAD:5,AUDUSD:5,NZDUSD:5,XAUUSD:2,XAGUSD:3,NAS100:2,SP500:2,DJ30:2,WTI:2,BTCUSD:2,ETHUSD:2})[x.symbol]??2;
 return new Intl.NumberFormat('en-US',{minimumFractionDigits:fixed,maximumFractionDigits:fixed}).format(n);
}
function marketTickerCard(x,icon){
 const trend=x.change>0?'up':x.change<0?'down':'flat';
 const arrow=trend==='up'?'▲':trend==='down'?'▼':'◆';
 const pct=(x.change>0?'+':'')+x.change.toFixed(2)+'%';
 const quote=marketQuotePrice(x);
 const extra=x.proxy?' — سعر عقد آجل مرجعي':'';
 return `<span class="market-ticker-item ticker-${trend==='up'?'rising':trend==='down'?'falling':'flat'}" title="${escapeHTML(x.label)}${extra} — ${quote==='—'?'السعر غير متاح':`السعر ${quote}`} • التغير ${pct}"><span class="ticker-asset-icon ticker-cat-${escapeHTML(x.category||'misc')}" aria-hidden="true">${escapeHTML(icon)}</span><span class="market-ticker-symbol en" dir="ltr">${escapeHTML(x.symbol)}</span><span class="ticker-last en" dir="ltr" aria-label="السعر">${quote}</span><span class="ticker-change ${trend} en" dir="ltr"><span class="ticker-arrow" aria-hidden="true">${arrow}</span><strong>${pct}</strong></span></span>`;
}
// Local vector insignia/flags: no external logo hotlinks and no proprietary TradingView artwork.
const marketFlagPairs={EURUSD:['eur','usd'],GBPUSD:['gbp','usd'],USDJPY:['usd','jpy'],USDCHF:['usd','chf'],USDCAD:['usd','cad'],AUDUSD:['aud','usd'],NZDUSD:['nzd','usd']};
const marketIconFiles={XAUUSD:'gold',XAGUSD:'silver',NAS100:'nas100',SP500:'sp500',DJ30:'dj30',WTI:'oil',BTCUSD:'btc',ETHUSD:'eth'};
function marketLogo(x){
 const flags=marketFlagPairs[x.symbol];
 if(flags)return `<span class="mover-currency-pair" aria-hidden="true"><img src="market-icons/${flags[0]}.svg" alt=""><img src="market-icons/${flags[1]}.svg" alt=""></span>`;
 const icon=marketIconFiles[x.symbol]||'market';
 return `<span class="mover-icon" aria-hidden="true"><img src="market-icons/${icon}.svg" alt=""></span>`;
}
function tvChartUrl(symbol){return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvMarketSymbols[symbol]||'FX:EURUSD')}`;}
function moverRow(x,highlight){
 const trend=x.change>0?'up':x.change<0?'down':'flat';
 const arrow=trend==='up'?'↗':trend==='down'?'↘':'→';
 const pct=(x.change>0?'+':'')+x.change.toFixed(2)+'%';
 const date=new Date(x.quotedAt||S.moversUpdated);
 const stamp=Number.isFinite(date.getTime())?dateFormat(date.toISOString()):'';
 const delayed=S.moversStatus!=='fresh';
 const quote=delayed?'—':marketQuotePrice(x);
 const priceTitle=quote==='—'?'سعر غير متاح من لقطة حديثة':`السعر الدوري المرجعي ${quote}`;
 return `<a class="pulse-mover-row ${trend}${highlight?' mover-highlight':''}" href="${escapeHTML(tvChartUrl(x.symbol))}" target="_blank" rel="noopener noreferrer" aria-label="فتح شارت ${escapeHTML(x.label)} على TradingView" title="${escapeHTML(priceTitle)}${stamp?' • '+escapeHTML(stamp):''}"><span class="pulse-mover-main">${marketLogo(x)}<span class="pulse-mover-copy"><b class="en" dir="ltr">${escapeHTML(x.symbol)}</b><small class="pulse-mover-source">${escapeHTML(x.label)}</small></span></span><span class="pulse-mover-quote"><b class="en pulse-mover-price" dir="ltr">${quote}</b><span class="pulse-mover-change ${trend} en" dir="ltr"><span aria-hidden="true">${arrow}</span><strong>${pct}</strong></span></span></a>`;
}
function moversBoard(){
 if(!Array.isArray(S.movers)||!S.movers.length)return '';
 const good=S.movers.filter(x=>tvMarketSymbols[x.symbol]&&Number.isFinite(x.change)).slice();
 if(!good.length)return '';
 const rising=good.filter(x=>x.change>0).sort((a,b)=>b.change-a.change).slice(0,3);
 const falling=good.filter(x=>x.change<0).sort((a,b)=>a.change-b.change).slice(0,3);
 if(!rising.length&&!falling.length)return '';
 const when=S.moversUpdated instanceof Date&&Number.isFinite(S.moversUpdated.getTime())?dateFormat(S.moversUpdated.toISOString()):'غير متاح';
 const freshness=S.moversStatus==='fresh'?'لقطة دورية':'بيانات قديمة';
 return `<div class="pulse-movers-board"><div class="pulse-movers-meta"><span class="movers-time-icon" aria-hidden="true">◷</span><span>آخر تحديث: <b>${escapeHTML(when)}</b></span><span class="movers-fresh-state ${S.moversStatus==='fresh'?'':'is-stale'}">${freshness}</span></div><div class="pulse-movers-layout"><div class="pulse-movers-col is-up"><div class="pulse-movers-head"><div class="movers-heading-name"><span class="movers-trend-symbol">↗</span><b>الأكثر صعودًا</b></div><span class="movers-head-en">TOP GAINERS</span></div>${rising.length?rising.map((x,i)=>moverRow(x,i===0&&Math.abs(x.change)>=2)).join(''):`<p class="pulse-movers-empty">لا توجد أصول صاعدة</p>`}</div><div class="pulse-movers-col is-down"><div class="pulse-movers-head"><div class="movers-heading-name"><span class="movers-trend-symbol">↘</span><b>الأكثر هبوطًا</b></div><span class="movers-head-en">TOP LOSERS</span></div>${falling.length?falling.map((x,i)=>moverRow(x,i===0&&Math.abs(x.change)>=2)).join(''):`<p class="pulse-movers-empty">لا توجد أصول هابطة</p>`}</div></div></div>`;
}
// TradingView displays the quotes; snapshot metadata is used ONLY to choose
// the leaders/laggards, never as displayed market prices.
const tvMarketSymbols={
 EURUSD:'FX:EURUSD',GBPUSD:'FX:GBPUSD',USDJPY:'FX:USDJPY',USDCHF:'FX:USDCHF',
 USDCAD:'FX:USDCAD',AUDUSD:'FX:AUDUSD',NZDUSD:'FX:NZDUSD',
 XAUUSD:'OANDA:XAUUSD',XAGUSD:'OANDA:XAGUSD',
 NAS100:'FOREXCOM:NSXUSD',SP500:'FOREXCOM:SPXUSD',DJ30:'FOREXCOM:DJI',
 WTI:'TVC:USOIL',BTCUSD:'BITSTAMP:BTCUSD',ETHUSD:'BITSTAMP:ETHUSD'
};
const tvMarketOrder=['EURUSD','GBPUSD','USDJPY','USDCHF','USDCAD','AUDUSD','NZDUSD','XAUUSD','XAGUSD','NAS100','SP500','DJ30','WTI','BTCUSD','ETHUSD'];
function tvTickerSymbols(list){return list.filter(s=>tvMarketSymbols[s]).map(s=>({proName:tvMarketSymbols[s],title:s}));}
function mountTvTicker(root,symbols,theme,transparent=true){
 if(!root||root.dataset.tvMounted==='yes')return;
 root.dataset.tvMounted='yes';
 const script=document.createElement('script');
 script.async=true;
 script.src='https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
 script.text=JSON.stringify({symbols:tvTickerSymbols(symbols),showSymbolLogo:false,
   isTransparent:transparent,displayMode:'adaptive',colorTheme:theme,locale:'en'});
 root.appendChild(script);
}
function pulseLeaders(){
 // A periodic, dated Yahoo snapshot only chooses which symbols to show.
 // Do not label the ranking live or mix its numerical quotes into the widget.
 if(S.moversStatus!=='fresh'||!Array.isArray(S.movers))return null;
 const good=S.movers.filter(x=>tvMarketSymbols[x.symbol]&&Number.isFinite(x.change));
 const rising=good.filter(x=>x.change>0).sort((a,b)=>b.change-a.change).slice(0,3);
 const falling=good.filter(x=>x.change<0).sort((a,b)=>a.change-b.change).slice(0,3);
 return rising.length&&falling.length?[...rising,...falling].map(x=>x.symbol):null;
}
function marketPulse(){
 const now=Date.now(),leaders=pulseLeaders();
 const board=moversBoard()||`<div class="tv-live-pulse fallback" data-tv-key="EURUSD|XAUUSD|NAS100|BTCUSD|GBPUSD|ETHUSD"><div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div></div></div>`;
 const ticker=`${board}<div class="pulse-key"><span>${moversBoard()?'ترتيب وتغيرات دورية حسب آخر لقطة؛ قد تختلف الأسعار عن عروض TradingView المباشرة. اضغط الأصل لفتح شارت TradingView.':'أسعار TradingView وفق الرمز والمصدر المختارين.'}</span></div>`;
 const marketAlternative='';
 const next=['fresh','stale'].includes(S.liveStatus)?S.liveEvents.find(e=>e.impact===3&&e.dt.getTime()>now&&e.dt.getTime()<now+8*86400000):null;
 const economic=next?`<div class="pulse-news-head"><span class="pulse-currency">${escapeHTML(next.currency)}</span><strong>${escapeHTML(next.title)}</strong><span class="pulse-impact-label">تأثير مرتفع${S.liveStatus==='stale'?' • تحقق من الموعد':''}</span></div><div class="pulse-countdown">${pulseClock(next.dt.getTime(),'pulse-news-clock')}<span class="pulse-countdown-caption">حتى صدور الخبر</span></div><div class="pulse-news-info"><span>الموعد: <b>${escapeHTML(showDate(next.dt,'date'))} — ${escapeHTML(showDate(next.dt))}</b> (${escapeHTML(zoneLabel())})</span><span>السابق: <b class="en" dir="ltr">${escapeHTML(next.previous)}</b></span><span>المتوقع: <b class="en" dir="ltr">${escapeHTML(next.forecast)}</b></span></div>`:`<p class="pulse-unavailable">${S.liveStatus==='fresh'?'لا يوجد خبر مرتفع التأثير قادم في الأجندة المتاحة':'لم تصل بيانات أحداث حديثة بعد؛ راجع أجندة TradingView ضمن صفحة الأجندة'}</p>`;
 const zone=currentIctWindow();
 const session=zone.active?`<div class="pulse-zone-name"><span class="pulse-indicator is-active"></span><strong dir="ltr">${escapeHTML(zone.title)}</strong><span class="pulse-state">نشطة الآن</span></div><p class="pulse-zone-desc">${escapeHTML(zone.description)}</p><div class="pulse-zone-details"><span>بتوقيت نيويورك <strong class="en" dir="ltr">${zone.start} – ${zone.end}</strong></span><span>بتوقيتك <strong class="en" dir="ltr">${escapeHTML(showDate(zone.startDate))} – ${escapeHTML(showDate(zone.endDate))}</strong></span><span>متبقٍ على النهاية ${pulseClock(zone.endDate.getTime(),'pulse-zone-clock')}</span></div>${zone.others?`<small>هناك ${zone.others} نافذة أخرى متزامنة</small>`:''}`:`<div class="pulse-zone-name"><span class="pulse-indicator"></span><strong>${escapeHTML(zone.title)}</strong></div>${zone.next?`<p class="pulse-zone-desc">النافذة القادمة: <strong dir="ltr">${escapeHTML(zone.next.name)}</strong> — ${escapeHTML(zone.next.description)}</p><div class="pulse-zone-details"><span>نيويورك <strong class="en" dir="ltr">${zone.next.start} – ${zone.next.end}</strong></span><span>بداية النافذة بتوقيتك <strong class="en" dir="ltr">${escapeHTML(showDate(zone.next.startDate))}</strong></span><span>تبدأ بعد ${pulseClock(zone.next.startDate.getTime(),'pulse-zone-clock')}</span></div>`:''}`;
 return `<div class="panel-top"><span>MARKET PULSE</span><span class="outline-pill">ملخص التداول</span></div><div class="pulse-block pulse-market"><div class="pulse-heading"><b>الأكثر صعودًا وهبوطًا</b><span class="pulse-quiet-badge">${leaders?'ترتيب دوري':'أسواق مختارة'}</span></div>${ticker}${marketAlternative}<div class="pulse-foot">${leaders?'القائمة مرتبة وفق آخر لقطة سوق متاحة بتاريخ '+escapeHTML(showDate(S.moversUpdated,'date'))+' '+escapeHTML(showDate(S.moversUpdated))+'.':'قائمة أسعار مختارة. يتوفر ترتيب الصعود والهبوط عندما تصل لقطة سوق حديثة.'} قارن كل أصل مع نفس الرمز والمصدر في TradingView للحصول على أفضل تطابق.</div></div><div class="pulse-block pulse-event"><div class="pulse-heading"><b>الخبر الاقتصادي القوي القادم</b><span class="pulse-quiet-badge">HIGH IMPACT</span></div>${economic}</div><div class="pulse-block pulse-session"><div class="pulse-heading"><b>نافذة ICT الحالية</b><span class="pulse-quiet-badge">NEW YORK TIME</span></div>${session}</div>`;
}
function refreshPulse(){
 const node=document.getElementById('market-pulse');if(!node||state.page!=='home')return;
 // Keep the TradingView iframe alive while refreshing the event/session clocks.
 const oldWidget=node.querySelector('.tv-live-pulse');
 const oldKey=oldWidget?.dataset.tvKey;
 node.innerHTML=marketPulse();
 const newWidget=node.querySelector('.tv-live-pulse');
 if(oldWidget&&newWidget&&oldKey===newWidget.dataset.tvKey)newWidget.replaceWith(oldWidget);
 updatePulseClocks();initPulseFallback();
}
function initPulseFallback(){
 const node=document.querySelector('.tv-live-pulse');if(!node)return;
 mountTvTicker(node.querySelector('.tradingview-widget-container'),node.dataset.tvKey.split('|'),'dark');
}
function updatePulseClocks(){document.querySelectorAll('#market-pulse [data-deadline]').forEach(el=>{const deadline=Number(el.dataset.deadline);if(Number.isFinite(deadline))el.textContent=compactCountdown(deadline-Date.now())})}
function news(){const tags=['الكل',...new Set(S.news.map(n=>n.tag).filter(Boolean))],items=state.nf==='الكل'?S.news:S.news.filter(n=>n.tag===state.nf);return `${title('ECONOMIC NEWS','الأخبار الاقتصادية','عناوين اقتصادية عالمية تتجدد تلقائيًا من مصادرها مع روابط القراءة الأصلية.') }<div class="news-feed-top">${newsBadge()}<span>${newsStatusLine()}</span><button type="button" class="chip" id="refresh-news">تحديث الآن ↻</button></div><div class="filter-bar">${tags.map(x=>`<button class="chip ${state.nf===x?'active':''}" data-filter="nf" data-value="${escapeHTML(x)}">${escapeHTML(x)}</button>`).join('')}</div>${newsGrid(items)}`}
function recommendations(){const f=[['all','الكل'],['open','مفتوحة'],['tp','الهدف'],['sl','وقف الخسارة'],['cl','مغلقة']],items=state.rf==='all'?S.recs:S.recs.filter(x=>x.status===state.rf);return `${title('TRADE IDEAS & ANALYSIS','التوصيات والتحليلات','أفكار تداول محددة المستويات، وتحليلات فنية طويلة وقصيرة المدى مصحوبة بالشارت.')}<div class="content-tabs" role="group" aria-label="نوع المحتوى"><button type="button" data-content-tab="signals" class="${state.contentTab==='signals'?'selected':''}" aria-pressed="${state.contentTab==='signals'}">↗ التوصيات <span>${S.recs.filter(x=>!x.sample).length}</span></button><button type="button" data-content-tab="analysis" class="${state.contentTab==='analysis'?'selected':''}" aria-pressed="${state.contentTab==='analysis'}">▥ التحليلات الفنية <span>${S.analyses.length}</span></button></div>${state.contentTab==='analysis'?analysesGrid():`<div class="notice">التوصيات معلومات تعليمية وليست ضمانًا أو نصيحة استثمارية. تحقق من مستويات التنفيذ وإدارة المخاطر.</div><div class="filter-bar">${f.map(([v,n])=>`<button class="chip ${state.rf===v?'active':''}" data-filter="rf" data-value="${v}">${n}</button>`).join('')}</div>${recGrid(items)}`}${notificationCenter('compact')}`}

const countries={ALL:'كل الدول',US:'أمريكا',GB:'بريطانيا',CA:'كندا',AU:'أستراليا',NZ:'نيوزيلندا',CN:'الصين',EU:'منطقة اليورو',JP:'اليابان',CH:'سويسرا'};
const impactLabel={3:'مرتفع',2:'متوسط',1:'منخفض'},impactClass={3:'high',2:'medium',1:'low'};
function eventDate(day,time){return new Date(`${day}T${time.replace('~','')}:00+02:00`)}
// Date/time settings shared between agenda, ICT and header; IANA TZ handles DST automatically.
const timeZones=[['device','توقيت الجهاز (تلقائي)'],['Asia/Gaza','فلسطين — غزة'],['America/New_York','نيويورك'],['Europe/London','لندن'],['Europe/Paris','باريس'],['Europe/Berlin','برلين'],['Europe/Istanbul','إسطنبول'],['Asia/Dubai','دبي'],['Asia/Riyadh','الرياض'],['Africa/Cairo','القاهرة'],['Asia/Tokyo','طوكيو'],['Asia/Singapore','سنغافورة'],['Australia/Sydney','سيدني'],['Etc/UTC','UTC (العالمي)']];
function currentZone(){const stored=localStorage.getItem('ict-timezone')||'device';return stored==='device'?Intl.DateTimeFormat().resolvedOptions().timeZone:stored}
function zoneLabel(){const stored=localStorage.getItem('ict-timezone')||'device';return timeZones.find(x=>x[0]===stored)?.[1]||stored}
function tzPicker(){return `<label class="tz-label" for="tz-selector">المنطقة الزمنية</label><select id="tz-selector" aria-label="اختيار المنطقة الزمنية">${timeZones.map(([val,label])=>`<option value="${val}" ${val===(localStorage.getItem('ict-timezone')||'device')?'selected':''}>${label}</option>`).join('')}</select>`}
function showDate(d,mode='time'){try{const opts={timeZone:currentZone(),hour12:false,numberingSystem:'latn'};if(mode==='time')Object.assign(opts,{hour:'2-digit',minute:'2-digit'});else if(mode==='date')Object.assign(opts,{weekday:'long',day:'numeric',month:'long'});else Object.assign(opts,{year:'numeric',month:'2-digit',day:'2-digit'});return new Intl.DateTimeFormat(mode==='date'?'ar':'en-GB',opts).format(d)}catch{return '—'}}
function eventDayKey(d){return new Intl.DateTimeFormat('en-CA',{timeZone:currentZone(),year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}
function normalizeEvent(e){if(!e||!e.date||!e.title)return null;const dt=new Date(e.date);if(!Number.isFinite(dt.getTime()))return null;const impact=String(e.impact||'').toLowerCase();const rank=impact==='high'?3:impact==='medium'?2:impact==='low'?1:0;return {id:String(e.id||`${dt.toISOString()}-${e.country||''}-${e.title}`),dt,title:String(e.title),currency:String(e.country||e.currency||'').toUpperCase(),impact:rank,forecast:String(e.forecast||'—'),previous:String(e.previous||'—'),actual:String(e.actual||'—')};}
async function fetchLiveCalendar(){let payload=null;try{const r=await fetch('calendar-live.json?t='+Date.now(),{cache:'no-store'});if(r.ok)payload=await r.json()}catch{};
if(!payload||!Array.isArray(payload.events)||!payload.events.length){S.liveStatus='unavailable';S.liveEvents=[];return}
const updated=new Date(payload.updatedAt||'');const fresh=Number.isFinite(updated.getTime())&&Date.now()-updated.getTime()<24*60*60*1000&&Date.now()>=updated.getTime()-5*60*1000;
S.liveEvents=payload.events.map(normalizeEvent).filter(Boolean).sort((a,b)=>a.dt-b.dt);S.liveUpdated=updated;S.liveStatus=fresh?'fresh':'stale';}
function futureAlerts(){if(!alertSettings().news)return;if(localStorage.getItem('ict-alerts')!=='enabled'||Notification.permission!=='granted'||S.liveStatus!=='fresh')return;const windowMin=Number(localStorage.getItem('ict-alert-before')||15);const now=Date.now(),sent=JSON.parse(localStorage.getItem('ict-alert-sent')||'{}');let changed=false;for(const e of S.liveEvents){if(e.impact<2)continue;const gap=e.dt.getTime()-now,limit=windowMin*60*1000;if(gap>=0&&gap<=limit&&!sent[e.id]){new Notification(`خبر اقتصادي ${e.currency} بعد ${Math.max(1,Math.ceil(gap/60000))} دقيقة`,{body:e.title+' • '+showDate(e.dt),icon:'icon-192.png',tag:'ict-news-'+e.id});sent[e.id]=now;changed=true}}if(changed){for(const [k,v] of Object.entries(sent))if(now-v>8*86400000)delete sent[k];localStorage.setItem('ict-alert-sent',JSON.stringify(sent))}}
function calendar(){const events=S.liveEvents,available=S.liveStatus==='fresh'||S.liveStatus==='stale';const filtered=events.filter(e=>(state.country==='ALL'||e.currency===({US:'USD',GB:'GBP',CA:'CAD',AU:'AUD',NZ:'NZD',EU:'EUR',JP:'JPY',CH:'CHF'}[state.country]||state.country))&&(state.impact==='all'||e.impact===+state.impact)&&(!state.search||(e.title+' '+e.currency).toLowerCase().includes(state.search.toLowerCase()))&&(state.day==='all'||eventDayKey(e.dt)===state.day));const groups=Object.groupBy?Object.groupBy(filtered,e=>eventDayKey(e.dt)):filtered.reduce((r,e)=>((r[eventDayKey(e.dt)]??=[]).push(e),r),{});const countHigh=events.filter(e=>e.impact===3).length;const next=events.find(e=>e.dt>new Date()&&e.impact===3);const status=S.liveStatus==='fresh'?'محدثة':S.liveStatus==='stale'?'قديمة — يُرجى التحقق':'غير متاحة';const days=[...new Set(events.map(e=>eventDayKey(e.dt)))];const rows=Object.entries(groups).sort(([a],[b])=>a.localeCompare(b)).map(([day,es])=>`<section class="calendar-day"><h2>${escapeHTML(showDate(es[0].dt,'date'))} <span class="micro en">${day}</span></h2><div class="event-table"><div class="event-head"><span>الوقت</span><span>العملة</span><span>الحدث الاقتصادي</span><span>التأثير</span><span>السابق</span><span>المتوقع</span><span>الفعلي</span></div>${es.map(e=>`<div class="event-row"><time dir="ltr">${showDate(e.dt)}</time><b class="en">${escapeHTML(e.currency)}</b><div class="event-name">${escapeHTML(e.title)}<small>${escapeHTML(showDate(e.dt,'date'))}</small></div><div><span class="impact ${impactClass[e.impact]||''}">${impactLabel[e.impact]||'غير محدد'}</span></div><span class="numeric" dir="ltr">${escapeHTML(e.previous)}</span><span class="numeric" dir="ltr">${escapeHTML(e.forecast)}</span><span class="numeric" dir="ltr">${escapeHTML(e.actual)}</span></div>`).join('')}</div></section>`).join('');
return `${title('ECONOMIC CALENDAR','الأجندة الاقتصادية','الأحداث الاقتصادية المهمة بتوقيتك المختار، مع خيارات البحث والتنبيه.')}
<div class="calendar-stats"><div class="metric"><span>الأحداث</span><strong class="en">${events.length}</strong></div><div class="metric"><span>التأثير المرتفع</span><strong class="en">${countHigh}</strong></div><div class="metric"><span>المصدر</span><strong style="font-size:14px">Forex Factory</strong></div><div class="metric"><span>حالة البيانات</span><strong class="status-text" style="font-size:13px">${status}</strong></div></div>
<div class="card calendar-settings"><div class="settings-grid"><div>${tzPicker()}</div><div><label class="tz-label" for="alert-lead">التنبيه قبل الخبر</label><select id="alert-lead"><option value="5" ${localStorage.getItem('ict-alert-before')==='5'?'selected':''}>5 دقائق</option><option value="15" ${!localStorage.getItem('ict-alert-before')||localStorage.getItem('ict-alert-before')==='15'?'selected':''}>15 دقيقة</option><option value="30" ${localStorage.getItem('ict-alert-before')==='30'?'selected':''}>30 دقيقة</option><option value="60" ${localStorage.getItem('ict-alert-before')==='60'?'selected':''}>60 دقيقة</option></select></div><div><label class="tz-label">إشعارات المتصفح</label><button class="btn btn-small" id="enable-alerts" type="button">${localStorage.getItem('ict-alerts')==='enabled'?'إيقاف التنبيهات':'تفعيل التنبيهات'}</button></div></div><p class="subtle">تنبيهات هذا الخيار تعمل أثناء تصفح الموقع. لتلقي إشعارات عند إغلاقه، فعّل الاشتراك من مركز التنبيهات.</p></div>
<div class="card" style="padding:15px 18px"><div class="agenda-tools"><input id="event-search" aria-label="ابحث في الأحداث" placeholder="بحث باسم الحدث أو العملة" value="${escapeHTML(state.search)}"><select id="country-filter"><option value="ALL">كل العملات</option>${['USD','EUR','GBP','JPY','CHF','CAD','AUD','NZD','CNY'].map(code=>`<option value="${code}" ${state.country===code?'selected':''}>${code}</option>`).join('')}</select><select id="impact-filter"><option value="all">كل التأثيرات</option>${[3,2,1].map(i=>`<option value="${i}" ${state.impact==i?'selected':''}>${impactLabel[i]}</option>`).join('')}</select><select id="day-filter"><option value="all">جميع الأيام</option>${days.map(d=>`<option value="${d}" ${state.day===d?'selected':''}>${d}</option>`).join('')}</select><button class="chip" id="reset-filters">مسح الفلاتر</button><button class="chip" id="refresh-calendar">تحديث ↻</button></div></div>
${S.liveUpdated?`<p class="data-caption">آخر تحديث ${escapeHTML(showDate(S.liveUpdated,'date'))}، ${showDate(S.liveUpdated)} (${escapeHTML(zoneLabel())}) · ${status}</p>`:''}
${S.liveStatus==='stale'?'<div class="notice">تحذير: هذه الأجندة لم تُحدّث مؤخرًا. تحقق من مواعيد الأحداث قبل التداول.</div>':''}
${next?`<div class="notice">الحدث القادم مرتفع التأثير: <b>${escapeHTML(next.title)}</b> — ${escapeHTML(next.currency)} • ${escapeHTML(showDate(next.dt,'date'))} ${showDate(next.dt)}</div>`:''}
${available?(filtered?rows:empty('لا توجد أحداث مطابقة للفلاتر.')):empty('الأجندة غير متاحة حاليًا. يمكنك الاطلاع على التقويم الإضافي أدناه.')}
<section class="section"><div class="section-heading"><h2>أجندة TradingView</h2><span class="subtle">مصدر مرئي إضافي — إعداد توقيتها مستقل عن اختيار الموقع</span></div><div class="tv-calendar"><tv-economic-calendar></tv-economic-calendar></div></section>
<div class="notice">قد تتأخر مواعيد الأحداث أو النتائج عن المصدر. الشرطة (—) تعني عدم توفر القيمة، وليست صفرًا. أوقات الأحداث حسب المنطقة الزمنية المختارة.</div>`;}
function nyClock(){return new Intl.DateTimeFormat('en-GB',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())}
function markets(){return `${title('MARKETS DESK','الأسواق وقوة العملات','خريطة حرارية لعملات الفوركس تعرض التغيرات النسبية من TradingView مع رسوم الأسواق التفاعلية.')}
<div class="notice">بيانات الخريطة مقدمة من TradingView وقد تتأخر حسب المصدر. الألوان تعكس تغيّر الزوج وليست تقييمًا مستقلًا لقوة عملة بعينها. للتبديل بين العرضين استخدم الزرين أدناه.</div>
<div class="market-pills"><button class="chip heat-toggle active" data-heat="heatmap" type="button">خريطة العملات الحرارية</button><button class="chip heat-toggle" data-heat="rates" type="button">جدول أسعار التقاطعات</button><a href="https://www.tradingview.com/markets/currencies/rates-all/" target="_blank" rel="noopener noreferrer">المزيد من العملات ↗</a></div>
<section class="chart-shell"><div class="section-heading"><h2>مركز قوة العملات — Forex Heatmap</h2><span class="subtle">TradingView • تغيّر يومي</span></div><div class="forex-heatmap" id="forex-heatmap"><tv-forex-table displayed-value="dailyChange" heatmap></tv-forex-table></div><p class="subtle">تُعرض التغيرات المتاحة عند الاتصال بالإنترنت؛ وهي ليست مؤشرًا مستقلًا لقوة العملة.</p></section>
<div class="market-pills"><a href="https://www.tradingview.com/symbols/XAUUSD/" target="_blank" rel="noopener noreferrer">الذهب XAUUSD ↗</a><a href="https://www.tradingview.com/symbols/EURUSD/" target="_blank" rel="noopener noreferrer">EURUSD ↗</a><a href="https://www.tradingview.com/symbols/GBPUSD/" target="_blank" rel="noopener noreferrer">GBPUSD ↗</a><a href="https://www.tradingview.com/symbols/TVC-DXY/" target="_blank" rel="noopener noreferrer">DXY ↗</a><a href="https://www.tradingview.com/symbols/NASDAQ-NDX/" target="_blank" rel="noopener noreferrer">NAS100 ↗</a><a href="https://www.tradingview.com/symbols/BTCUSD/" target="_blank" rel="noopener noreferrer">BTCUSD ↗</a></div>
<section class="chart-shell"><div class="section-heading"><h2>الرسم البياني التفاعلي — XAUUSD</h2><span class="subtle">TradingView</span></div><div class="chart-frame"><div class="tradingview-widget-container" style="height:100%;width:100%"><div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div></div></div></section>`}
const ictZones=[['Asian Session','20:00','00:00','نطاق تداول آسيا (مرجع تعليمي شائع)'],['London Kill Zone','02:00','05:00','بداية الجلسة الأوروبية'],['New York Kill Zone','07:00','10:00','افتتاح السوق الأمريكي'],['London Close','10:00','12:00','إغلاق لندن حسب التعريف المستخدم'],['London Silver Bullet','03:00','04:00','نافذة Silver Bullet لندن'],['New York AM Silver Bullet','10:00','11:00','نافذة Silver Bullet نيويورك'],['New York PM Silver Bullet','14:00','15:00','نافذة Silver Bullet المسائية']];
function nyToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function nyLocalToUtc(day,hhmm){const [y,m,d]=day.split('-').map(Number),[h,mm]=hhmm.split(':').map(Number);const desired=Date.UTC(y,m-1,d,h,mm);let guess=desired;for(let k=0;k<3;k++){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(guess)).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));const actual=Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute);guess+=desired-actual}return new Date(guess)}
function convertNyWindow(start,end){const date=nyToday();const a=nyLocalToUtc(date,start),b=nyLocalToUtc(date,end);if(end<=start)b.setTime(b.getTime()+86400000);return `${showDate(a)} – ${showDate(b)} (${zoneLabel()})`}
function ictTools(){const ny=new Date().toLocaleString('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false});const mins=Number(ny.split(':')[0])*60+Number(ny.split(':')[1]);const z=ictZones.map(([name,start,end,desc])=>{const s=+start.slice(0,2)*60+ +start.slice(3),e=+end.slice(0,2)*60+ +end.slice(3),active=s<e?mins>=s&&mins<e:mins>=s||mins<e;return `<article class="zone-row"><div><h3 dir="ltr">${name}</h3><p>${desc}</p></div><div class="zone-side"><strong class="en" dir="ltr">${start} – ${end} NY</strong><small class="local-zone">${convertNyWindow(start,end)}</small><span class="${active?'open-zone':'closed-zone'}">${active?'ضمن النافذة الآن':'خارج النافذة'}</span></div></article>`}).join('');return `${title('ICT TRADING TOOLS','أدوات ICT','مرجع سريع لجلسات التداول والنوافذ الزمنية حسب توقيت نيويورك، مع مراعاة تغير التوقيت الصيفي والشتوي.')}<div class="clock-banner"><div><small>الوقت الحالي في نيويورك</small><strong dir="ltr" class="en">${nyClock()}</strong></div><div><small>المنطقة الزمنية المرجعية</small><strong class="en">America/New_York</strong></div><button type="button" class="chip" id="refresh-clock">تحديث الوقت ↻</button></div><div class="card calendar-settings"><div class="settings-grid"><div>${tzPicker()}</div><div><label class="tz-label">الوقت في منطقتك</label><strong class="en">${showDate(new Date())}</strong></div></div><p class="subtle">المواعيد في الجدول أدناه مرجعية بتوقيت نيويورك. سيظهر التوقيت المحلي لكل نافذة تحت موعد نيويورك.</p></div><div class="section-heading"><h2>الجلسات ونوافذ ICT</h2><span class="subtle">المواعيد وفق التعريفات الشائعة</span></div><div class="zones">${z}</div><div class="notice">هذه النوافذ الزمنية إرشادية وتعتمد على توقيت نيويورك المحلي، وليست توصيات تداول أو ضمانًا لتحقق نمط سعري. قد تختلف التسميات وحدود بعض الجلسات بين المدارس والمراجع.</div>${notificationCenter()}`}
function more(){return `${title('MORE','استكشف المنصة','كل ما تحتاج إليه في مكان واحد.') }<div class="tool-grid"><a class="tool-card" href="#news"><span class="tool-glyph">▤</span><strong>الأخبار الاقتصادية</strong><span>آخر المحتوى المنشور</span></a><a class="tool-card" href="#ict"><span class="tool-glyph">◎</span><strong>أدوات ICT</strong><span>الجلسات والنوافذ الزمنية</span></a><a class="tool-card" href="#links"><span class="tool-glyph">↗</span><strong>تابعنا</strong><span>حساباتنا وروابط التواصل</span></a><a class="tool-card" href="#agenda"><span class="tool-glyph">▦</span><strong>الأجندة</strong><span>الأحداث الاقتصادية</span></a></div>`}
function hydrateMarketChart(){const target=document.querySelector('.chart-frame .tradingview-widget-container');if(!target)return;const script=document.createElement('script');script.src='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';script.async=true;script.text=JSON.stringify({autosize:true,symbol:'OANDA:XAUUSD',interval:'60',timezone:'Etc/UTC',theme:document.documentElement.dataset.theme==='dark'?'dark':'light',style:'1',locale:'en',allow_symbol_change:true,hide_top_toolbar:false,save_image:false,calendar:false,support_host:'https://www.tradingview.com'});target.appendChild(script)}
function social(){return `${title('CONNECT WITH US','تابعنا','ابقَ قريبًا من أخبارنا وتوصياتنا ومحتوانا التعليمي عبر منصات التواصل.')}${linksGrid(S.links)}`}

// Local, opt-in browser reminders. For background delivery a Push server is required.
const alertSettings=()=>({sessions:localStorage.getItem('ict-pref-sessions')!=='0'&&localStorage.getItem('ict-alert-sessions')==='yes',news:localStorage.getItem('ict-pref-news')!=='0'&&localStorage.getItem('ict-alert-news')!=='no',posts:localStorage.getItem('ict-pref-posts')!=='0'&&localStorage.getItem('ict-alert-posts')!=='no'});
function notificationCenter(mode='full'){
 const pref=alertSettings(),enabled=localStorage.getItem('ict-alerts')==='enabled';
 const newsPref=localStorage.getItem('ict-pref-news')!=='0',sessionPref=localStorage.getItem('ict-pref-sessions')!=='0',postsPref=localStorage.getItem('ict-pref-posts')!=='0';
 return `<section class="notification-center notification-public ${mode==='compact'?'notification-compact':''}" aria-label="اشتراك التنبيهات"><div class="card public-notify-card"><div class="public-notify-icon" aria-hidden="true">🔔<span>●</span></div><div class="public-notify-main"><span class="public-notify-eyebrow">ICT ALERTS</span><h2>خليك أول من يعرف</h2><p class="public-notify-intro">تصلك التحليلات والتوصيات الجديدة، والأخبار الاقتصادية المهمة، وتنبيهات جلسات التداول مباشرة على جهازك.</p><div class="public-notify-actions"><button type="button" class="btn public-push-btn" id="ict-push-subscribe">🔔 فعّل الإشعارات</button><span class="public-notify-privacy">بموافقتك فقط • يمكنك إيقافها في أي وقت</span></div><p id="ict-push-status" aria-live="polite" role="status" class="public-notify-status" hidden></p><details class="public-notify-options"><summary>تخصيص تنبيهاتي</summary><div class="public-notify-preferences"><label><input type="checkbox" id="alert-posts-opt" ${postsPref?'checked':''}> التحليلات والتوصيات</label><label><input type="checkbox" id="alert-news-opt" ${newsPref?'checked':''}> الأخبار الاقتصادية المهمة</label><label><input type="checkbox" id="alert-sessions-opt" ${sessionPref?'checked':''}> جلسات التداول وKill Zones</label></div><div class="public-notify-local"><span>تذكيرات إضافية أثناء التصفح</span><button type="button" class="chip" id="enable-alerts">${enabled?'إيقاف التذكيرات':'تفعيل التذكيرات'}</button><label class="alert-time">قبل الخبر <select id="alert-lead"><option value="5" ${localStorage.getItem('ict-alert-before')==='5'?'selected':''}>5 دقائق</option><option value="15" ${!localStorage.getItem('ict-alert-before')||localStorage.getItem('ict-alert-before')==='15'?'selected':''}>15 دقيقة</option><option value="30" ${localStorage.getItem('ict-alert-before')==='30'?'selected':''}>30 دقيقة</option><option value="60" ${localStorage.getItem('ict-alert-before')==='60'?'selected':''}>60 دقيقة</option></select></label></div></details></div></div></section>`;
}
function sendLocalAlert(title,body,tag,url){if(localStorage.getItem('ict-alerts')!=='enabled'||Notification.permission!=='granted')return;try{const note=new Notification(title,{body,tag,icon:'icon-192.png'});note.onclick=()=>{window.focus();if(url)location.hash=url}}catch(err){console.warn('Local notification failed',err)}}
const sessionSentKey='ict-session-sent-v1';
function sessionAlerts(){if(!alertSettings().sessions||localStorage.getItem('ict-alerts')!=='enabled'||Notification.permission!=='granted')return;
 const now=Date.now(),today=nyToday();let sent={};try{sent=JSON.parse(localStorage.getItem(sessionSentKey)||'{}')||{}}catch(_){sent={}}
 const names=new Set();let updated=false;
 // Display and remind only at real NY session boundaries (not rounded local times).
 for(const offset of [-1,0,1]){
  const date=new Date(Date.parse(today+'T12:00:00Z')+offset*86400000).toISOString().slice(0,10);
  for(const [name,start,end] of ictZones){const dt=nyLocalToUtc(date,start);const delta=now-dt.getTime();const key=name+'@'+dt.toISOString();if(delta>=0&&delta<75000&&!sent[key]&&!names.has(key)){
   sendLocalAlert('بدأت '+name,`من ${start} إلى ${end} بتوقيت نيويورك • راقب إعدادك قبل التداول`,'ict-session-'+key,'ict');sent[key]=now;updated=true;names.add(key)
  }}
 }
 if(updated){for(const [key,ts] of Object.entries(sent))if(now-ts>4*86400000)delete sent[key];localStorage.setItem(sessionSentKey,JSON.stringify(sent))}
}
const publicationKey='ict-published-content-v1';let contentPollStarted=false;
function publicationRows(){return [...S.analyses.map(a=>({id:'a:'+a.id,title:a.title||'تحليل جديد',when:Date.parse(a.published_at||0),kind:'تحليل فني'})),...S.recs.filter(r=>!r.sample).map(r=>({id:'r:'+String(r.id||[r.pair,r.date,r.entry,r.dir].join('|')),title:r.title||r.pair||'توصية جديدة',when:Date.parse(r.published_at||r.date||0),kind:'توصية'}))].filter(x=>x.id&&Number.isFinite(x.when))}
function checkPublications(){const current=publicationRows(),ids=current.map(x=>x.id);let previous=null;try{previous=JSON.parse(localStorage.getItem(publicationKey)||'null')}catch(_){previous=null}
 if(Array.isArray(previous)&&alertSettings().posts){const seen=new Set(previous);for(const x of current.filter(x=>!seen.has(x.id)&&Date.now()-x.when<48*3600000).slice(0,3)){sendLocalAlert('نُشر '+x.kind+' على ICT بالعربي',x.title,'ict-publication-'+x.id,'recs')}}
 localStorage.setItem(publicationKey,JSON.stringify(ids.slice(0,300)));
}
async function pollPublishedContent(){const [recs,analyses]=await Promise.all([load('recs.json?t='+Date.now()),load('analyses.json?t='+Date.now())]);if(Array.isArray(recs))S.recs=recs;if(Array.isArray(analyses))S.analyses=analyses;checkPublications();if(state.page==='recs'&&contentPollStarted)render();contentPollStarted=true}
function render(){const p=location.hash.replace('#','')||'home';state.page=Object.hasOwn(navTitle,p)?p:'home';$('app').innerHTML=({home,markets,news,recs:recommendations,agenda:calendar,ict:ictTools,links:social,more})[state.page]();document.querySelectorAll('[data-page]').forEach(a=>{const active=a.dataset.page===state.page||(a.dataset.page==='more'&&['news','ict','links','more'].includes(state.page));a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});document.title=`${navTitle[state.page]} | ICT بالعربي`;if(state.page==='markets')hydrateMarketChart();document.dispatchEvent(new Event('ict-view-rendered'));if(state.page==='home'){initPulseFallback();initHeroSlider()}else if(heroSlideTimer){clearInterval(heroSlideTimer);heroSlideTimer=null}window.scrollTo({top:0,behavior:'instant'})}

function ticker(){
 const host=$('tape');if(!host)return;
 // Do not rebuild and reset the live iframe on every snapshot refresh or theme change.
 if(host.querySelector('#tv-bottom-ticker'))return;
 host.innerHTML=`<div class="bottom-ticker-shell tv-market-bottom glass-bottom-tv">
   <div class="bottom-ticker-label" aria-label="أسعار الأسواق"><span class="bottom-ticker-dot"></span><span class="en">MARKET WATCH</span></div>
   <div class="bottom-ticker-tv" id="tv-bottom-ticker" role="region" aria-label="شريط أسعار TradingView المختصر">
     <tv-ticker-tape class="tv-compact-tape" symbols="${tvMarketOrder.map(s=>tvMarketSymbols[s]).join(',')}" item-size="compact" theme="dark" transparent="true" dir="ltr"></tv-ticker-tape>
   </div>
   <span class="bottom-ticker-status" title="قد تتأخر بيانات بعض الأسواق حسب المصدر والترخيص">TV</span></div>`;
 // TradingView's current Web Component can render its own compact layout.
 // Do not crop or force a shorter iframe than the widget's internal content.
 if(!document.querySelector('script[data-ict-tv-tape]')){
   const script=document.createElement('script');
   script.type='module';
   script.src='https://widgets.tradingview-widget.com/w/en/tv-ticker-tape.js';
   script.dataset.ictTvTape='yes';
   script.onerror=()=>{
     const slot=document.getElementById('tv-bottom-ticker');
     if(slot&&slot.querySelector('tv-ticker-tape')){
       slot.innerHTML='<div class="tv-ticker-fallback" role="status">تعذر تحميل أسعار الأسواق الآن — تحقق من الاتصال.</div>';
     }
   };
   document.head.appendChild(script);
 }
}
document.addEventListener('click',e=>{const tab=e.target.closest('[data-content-tab]');if(tab){state.contentTab=tab.dataset.contentTab;render();return}const heroDot=e.target.closest('[data-hero-index]');if(heroDot){showHeroSlide(Number(heroDot.dataset.heroIndex));return}const heroNav=e.target.closest('[data-hero-move]');if(heroNav){showHeroSlide(heroSlideIndex+Number(heroNav.dataset.heroMove));return}const heroPause=e.target.closest('[data-hero-pause]');if(heroPause){heroSlidePaused=!heroSlidePaused;heroPause.textContent=heroSlidePaused?'▶':'Ⅱ';heroPause.setAttribute('aria-label',heroSlidePaused?'تشغيل التبديل التلقائي':'إيقاف التبديل التلقائي');initHeroSlider();return}const chip=e.target.closest('[data-filter]');if(chip){state[chip.dataset.filter]=chip.dataset.value;render()}if(e.target.closest('#refresh-clock'))render();if(e.target.closest('#refresh-news'))fetchLiveNews();if(e.target.closest('#refresh-calendar')){S.liveStatus='loading';render();fetchLiveCalendar().then(()=>{render();futureAlerts()})}const heat=e.target.closest('[data-heat]');if(heat){document.querySelectorAll('[data-heat]').forEach(b=>b.classList.toggle('active',b===heat));const table=document.querySelector('#forex-heatmap tv-forex-table');if(table){if(heat.dataset.heat==='heatmap')table.setAttribute('heatmap','');else table.removeAttribute('heatmap')}}if(e.target.closest('#enable-alerts')){toggleAlerts()}if(e.target.closest('#reset-filters')){state.country='ALL';state.impact='all';state.day='all';state.search='';render()}});
document.addEventListener('change',e=>{const ids={'country-filter':'country','impact-filter':'impact','day-filter':'day'};if(ids[e.target.id]){state[ids[e.target.id]]=e.target.value;render()}if(e.target.id==='tz-selector'){localStorage.setItem('ict-timezone',e.target.value);render();updateHeaderDate()}if(e.target.id==='analysis-asset'){state.analysisAsset=e.target.value;render()}if(e.target.id==='alert-news-opt')localStorage.setItem('ict-alert-news',e.target.checked?'yes':'no');if(e.target.id==='alert-sessions-opt')localStorage.setItem('ict-alert-sessions',e.target.checked?'yes':'no');if(e.target.id==='alert-posts-opt')localStorage.setItem('ict-alert-posts',e.target.checked?'yes':'no');if(e.target.id==='alert-lead'){localStorage.setItem('ict-alert-before',e.target.value);futureAlerts()}});
document.addEventListener('input',e=>{if(e.target.id==='event-search'){const pos=e.target.selectionStart;state.search=e.target.value;render();const input=$('event-search');input.focus();input.setSelectionRange(pos,pos)}});
function updateHeaderDate(){$('today').textContent=new Intl.DateTimeFormat('ar-u-nu-latn',{timeZone:currentZone(),weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date())}
async function toggleAlerts(){if(localStorage.getItem('ict-alerts')==='enabled'){localStorage.setItem('ict-alerts','disabled');render();return}if(!('Notification' in window)){alert('هذا المتصفح لا يدعم إشعارات سطح المكتب.');return}if(!window.isSecureContext){alert('تحتاج الإشعارات إلى HTTPS.');return}const permission=await Notification.requestPermission();if(permission==='granted'){localStorage.setItem('ict-alerts','enabled');render();futureAlerts()}else alert('لم يتم منح الإذن للإشعارات. يمكن تغييره من إعدادات الموقع في المتصفح.')}
const themeModes=['auto','light','dark'];
function currentTheme(){const mode=localStorage.getItem('ict-theme-mode')||'auto';return mode==='auto'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):mode}
function applyTheme(){const mode=localStorage.getItem('ict-theme-mode')||'auto';document.documentElement.dataset.theme=currentTheme();$('theme-label').textContent=({auto:'تلقائي',light:'فاتح',dark:'داكن'})[mode];$('theme').setAttribute('aria-label','المظهر: '+$('theme-label').textContent+'؛ انقر للتبديل');$('meta-theme').setAttribute('content',currentTheme()==='dark'?'#111715':'#14251f')}
$('theme').addEventListener('click',()=>{const mode=localStorage.getItem('ict-theme-mode')||'auto';localStorage.setItem('ict-theme-mode',themeModes[(themeModes.indexOf(mode)+1)%3]);applyTheme();ticker();if(state.page==='markets')render()});
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if((localStorage.getItem('ict-theme-mode')||'auto')==='auto'){applyTheme();ticker();if(state.page==='markets')render()}});

let deferredInstall;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('install').hidden=false});$('install').addEventListener('click',async()=>{if(deferredInstall){deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$('install').hidden=true}});
window.addEventListener('hashchange',render);
async function boot(){applyTheme();updateHeaderDate();const a=await Promise.all([load('news.json'),load('recs.json'),load('links.json'),load('agenda.json'),load('analyses.json')]);[S.newsArchive,S.recs,S.links,S.agenda,S.analyses]=[a[0]||[],a[1]||[],a[2]||[],a[3]||{days:[]},a[4]||[]];checkPublications();S.news=S.newsArchive;await Promise.all([fetchLiveCalendar(),fetchLiveNews()]);render();refreshPulse();ticker();futureAlerts();sessionAlerts();fetchMovers();setInterval(updatePulseClocks,1000);setInterval(refreshPulse,60000);setInterval(fetchMovers,5*60*1000);setInterval(()=>{futureAlerts();sessionAlerts()},30000);setInterval(pollPublishedContent,120000);setInterval(async()=>{await fetchLiveCalendar();if(state.page==='agenda')render();else refreshPulse();futureAlerts()},10*60*1000);setInterval(updateHeaderDate,60000);setInterval(fetchLiveNews,10*60*1000);if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(console.warn)}boot();
