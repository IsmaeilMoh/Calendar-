/* 6.4: public content summary only. There are NO visitor counts in these local JSON files. */
(()=>{'use strict';
 const $=s=>document.getElementById(s);
 const config=window.ICT_ANALYTICS_CONFIG||{};
 const consentKey='ict-analytics-consent-v1';
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const names={pending:'بانتظار التفعيل',open:'نشطة',tp:'حقق الهدف',sl:'وقف الخسارة',cl:'مغلقة',cancelled:'ملغاة'};
 function renderStatus(){
  const active=config.enabled===true&&/^https:\/\/plausible\.io\/js\/pa-[a-zA-Z0-9_-]+\.js$/.test(String(config.scriptUrl||''));
  $('mode').textContent=active?'التكامل مهيأ':'لم يتم التفعيل';
  $('traffic-status').textContent=active?'تمت إضافة إعدادات Plausible. تظهر إحصاءات الزوار الفعلية في لوحة حسابك لدى Plausible بعد وصول الزيارات والموافقة عليها. هذه الصفحة لا تقرأ قاعدة إحصاءات الجمهور ولا تدّعي ذلك.':'لم يتم ربط خدمة قياس الزوار بعد. فعّل Plausible بإعداد الموقع ورابط شيفرته، وستُجمع زيارات من يوافقون على القياس فقط. لا توجد أرقام جمهور قبل ذلك.';
  let consent='لم تختر بعد';try{const c=localStorage.getItem(consentKey);consent=c==='yes'?'موافقة محفوظة':c==='no'?'رفض محفوظ':'لم تختر بعد'}catch{}
  $('consent-status').textContent='خيارك على هذا المتصفح: '+consent;
 }
 const valid=(payload,file)=>{
   if(file==='news-live.json')return Array.isArray(payload?.items)?payload.items:[];
   return Array.isArray(payload)?payload:Array.isArray(payload?.items)?payload.items:[];
 };
 async function load(file){
  try{const r=await fetch(file+'?analytics='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();return {ok:true,records:valid(j,file)}}catch(e){return {ok:false,records:[]}}
 }
 const count=(values)=>{const counts=new Map();for(const value of values){const key=String(value||'غير محدد').slice(0,90);counts.set(key,(counts.get(key)||0)+1)}return [...counts].sort((a,b)=>b[1]-a[1])};
 const showBars=(target,items)=>{
  const root=$(target);root.replaceChildren();if(!items.length){root.textContent='لا توجد منشورات متاحة لهذا التصنيف.';return}
  const max=Math.max(1,...items.map(([,v])=>v));
  for(const [name,n] of items.slice(0,9)){
   const row=document.createElement('div');row.className='bar-row';
   const label=document.createElement('span');label.className='bar-label';label.textContent=name;label.title=name;
   const track=document.createElement('div');track.className='bar-track';
   const fill=document.createElement('div');fill.className='bar-fill';fill.style.width=Math.max(2,n/max*100)+'%';track.append(fill);
   const num=document.createElement('b');num.className='bar-num';num.textContent=String(n);
   row.append(label,track,num);root.append(row);
  }
 };
 function metric(label,n,description){const article=document.createElement('article');const sm=document.createElement('small');sm.textContent=label;const val=document.createElement('b');val.textContent=n===null?'غير متاح':n.toLocaleString('en-US');const d=document.createElement('span');d.textContent=description;article.append(sm,val,d);return article}
 async function refresh(){
  $('content-time').textContent='جارٍ تحديث المنشورات…';
  const [rec,analyses,news]=await Promise.all([load('recs.json'),load('analyses.json'),load('news-live.json')]);
  const recs=rec.records.filter(x=>x&&typeof x==='object'&&!x.sample);
  const analysis=analyses.records.filter(x=>x&&typeof x==='object');
  const articles=news.records.filter(x=>x&&typeof x==='object'&&x.title);
  const stats=$('content-stats');stats.replaceChildren(metric('التوصيات',rec.ok?recs.length:null,rec.ok?'من ملف recs.json':'تعذر قراءة الملف'),metric('التحليلات',analyses.ok?analysis.length:null,analyses.ok?'من ملف analyses.json':'تعذر قراءة الملف'),metric('الأخبار المتاحة',news.ok?articles.length:null,news.ok?'من news-live.json':'تعذر قراءة الملف'),metric('نتائج موثقة',rec.ok?recs.filter(x=>['tp','sl'].includes(x.status)).length:null,'توصيات تحقق هدف/وقف فقط'));
  showBars('recs-chart',rec.ok?count(recs.map(x=>names[x.status||'open']||'غير محدد')):[]);
  showBars('assets-chart',rec.ok||analyses.ok?count([...(rec.ok?recs:[]).map(x=>x.pair||x.asset),...(analyses.ok?analysis:[]).map(x=>x.asset)]):[]);
  showBars('analyses-chart',analyses.ok?count(analysis.map(x=>x.asset)):[]);
  showBars('news-chart',news.ok?count(articles.map(x=>x.tag||'اقتصاد')):[]);
  $('content-time').textContent='آخر محاولة قراءة: '+new Intl.DateTimeFormat('ar',{dateStyle:'medium',timeStyle:'short'}).format(new Date())+' • البيانات المنشورة فقط';
 }
 $('refresh').addEventListener('click',refresh);
 $('reset-consent').addEventListener('click',()=>{try{localStorage.removeItem(consentKey)}catch{}renderStatus();alert('تمت إعادة تعيين القرار المحلي. افتح صفحة أخرى أو أعد تحميل الموقع لتظهر خيارات الموافقة من جديد. إذا كانت أداة القياس قد بدأت في هذه الصفحة، أعد التحميل لإيقافها.');});
 renderStatus();refresh();
})();
