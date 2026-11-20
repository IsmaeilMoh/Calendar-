/* ICT بالعربي 6.4: consent-gated traffic analytics. No user/trading data is sent. */
(()=>{'use strict';
 const c=window.ICT_ANALYTICS_CONFIG||{};
 const CONSENT='ict-analytics-consent-v1';
 const domain=String(c.siteDomain||'').trim();
 const scriptUrl=String(c.scriptUrl||'').trim();
 // Restrict configuration to the known analytics provider. No API keys are required.
 const ready=c.enabled===true&&c.provider==='plausible'&&/^https:\/\/plausible\.io\/js\/pa-[a-zA-Z0-9_-]+\.js$/.test(scriptUrl)&&/^[a-z0-9.-]+$/i.test(domain);
 if(!ready||/\badmin\.html$/i.test(location.pathname))return;
 if(navigator.globalPrivacyControl===true||navigator.doNotTrack==='1')return;
 let started=false,readyScript=false;
 const allowedSections=new Set(['home','markets','news','recs','agenda','ict','more','academy','calculators','intelligence','links']);
 const allowedTools=new Set(['workspace.html','intelligence.html','research.html','smart-desk.html','workflow.html','assets.html','trust.html','analytics.html']);
 const allowedAssets=new Set(['XAUUSD','XAGUSD','EURUSD','GBPUSD','USDJPY','USDCHF','USDCAD','AUDUSD','NZDUSD','NAS100','SP500','DJ30','WTI','BTCUSD','ETHUSD']);
 const event=(name)=>{if(started&&readyScript&&typeof window.plausible==='function')window.plausible(name)};
 function start(){
  if(started)return;
  started=true;
  // Plausible's official queue/initializer interface; actual URL must come from the site dashboard.
  window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)};
  window.plausible.init=window.plausible.init||function(opts){window.plausible.o=opts||{}};
  window.plausible.init({hashBasedRouting:true});
  const script=document.createElement('script');script.async=true;script.src=scriptUrl;
  script.onload=()=>{readyScript=true};
  script.onerror=()=>{readyScript=false;document.dispatchEvent(new Event('ict-analytics-script-error'))};
  document.head.append(script);
 }
 function setConsent(choice){
  try{localStorage.setItem(CONSENT,choice)}catch(e){}
  const panel=document.getElementById('ict-analytics-consent');if(panel)panel.remove();
  if(choice==='yes')start();
  // Decline takes effect without network calls. Previously loaded trackers require page reload to stop.
 }
 function showConsent(){
  if(document.getElementById('ict-analytics-consent'))return;
  const panel=document.createElement('section');panel.id='ict-analytics-consent';panel.className='ict-analytics-consent';
  panel.setAttribute('aria-label','خصوصية إحصاءات الموقع');
  const heading=document.createElement('strong');heading.textContent='إحصاءات لتحسين ICT بالعربي';
  const desc=document.createElement('p');desc.textContent='نقيس زيارات الصفحات واستخدام الأدوات بصورة إجمالية عبر Plausible، دون إرسال مبالغ صفقاتك أو بيانات سجل التداول. تستطيع الرفض ومتابعة الموقع بشكل طبيعي.';
  const controls=document.createElement('div');controls.className='ict-analytics-consent-actions';
  const accept=document.createElement('button');accept.type='button';accept.textContent='السماح بالإحصاءات';accept.addEventListener('click',()=>setConsent('yes'));
  const decline=document.createElement('button');decline.type='button';decline.textContent='عدم السماح';decline.className='outline';decline.addEventListener('click',()=>setConsent('no'));
  controls.append(accept,decline);panel.append(heading,desc,controls);document.body.append(panel);
 }
 const previous=(()=>{try{return localStorage.getItem(CONSENT)}catch{return null}})();
 if(previous==='yes')start();else if(previous!== 'no'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',showConsent,{once:true});else showConsent();
 }
 document.addEventListener('click',e=>{
  const target=e.target.closest?.('a[href]');if(!target||!started)return;
  let url;try{url=new URL(target.href,location.href)}catch{return}
  if(url.origin!==location.origin)return;
  const leaf=url.pathname.split('/').pop()||'index.html';
  if(url.pathname.includes('/assets/')&&/^[A-Z0-9]+\.html$/.test(leaf)){
    const symbol=leaf.slice(0,-5);if(allowedAssets.has(symbol))event('Asset Open');
  }else if(allowedTools.has(leaf)){event('Tool Open')}
  else if(leaf==='index.html'&&allowedSections.has(url.hash.slice(1))){event('Section Open')}
 },{passive:true});
 // Analytics must NEVER inspect trade forms, localStorage trade keys, user identifiers, or workflow input.
})();
