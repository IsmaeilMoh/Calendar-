"use strict";
// Public push subscription helper; REST credentials exist only as GitHub Actions secrets.
(function(){
 const appId=String(window.ICT_PUSH_APP_ID||'').trim();if(!/^[a-f0-9-]{36}$/i.test(appId))return;
 const base=new URL('./',document.baseURI).pathname;
 const sdk=document.createElement('script');sdk.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';sdk.defer=true;document.head.appendChild(sdk);
 window.OneSignalDeferred=window.OneSignalDeferred||[];
 window.OneSignalDeferred.push(async OneSignal=>{
  try{
   await OneSignal.init({appId,serviceWorkerPath:base+'push/onesignal/OneSignalSDKWorker.js',serviceWorkerParam:{scope:base+'push/onesignal/'},notifyButton:{enable:false},allowLocalhostAsSecureOrigin:false});
   window.ICTOneSignal=OneSignal;
   window.ICTSubscribe=async()=>{
    if(!OneSignal.Notifications.isPushSupported())throw Error('جهازك أو متصفحك لا يدعم Push.');
    await OneSignal.Notifications.requestPermission();
    if(!OneSignal.Notifications.permission)throw Error('لم يتم منح إذن الإشعارات.');
    await OneSignal.User.addTags({ict_posts:localStorage.getItem('ict-pref-posts')==='0'?'0':'1',ict_sessions:localStorage.getItem('ict-pref-sessions')==='0'?'0':'1',ict_news:localStorage.getItem('ict-pref-news')==='0'?'0':'1'});
    return true;
   };
   document.dispatchEvent(new Event('ict-push-ready'));
  }catch(err){console.warn('Push setup not active:',err);}
 });
 document.addEventListener('click',async e=>{
  if(!e.target.closest('#ict-push-subscribe'))return;
  const status=document.getElementById('ict-push-status');
  if(!window.ICTSubscribe){if(status)status.textContent='خدمة OneSignal لم تكتمل تهيئتها بعد.';return;}
  try{await window.ICTSubscribe();if(status)status.textContent='تم طلب الاشتراك في إشعارات الخلفية. يمكنك ضبط أنواع التنبيهات من الخيارات أعلاه.';}catch(err){if(status)status.textContent=err.message;}
 });
 document.addEventListener('change',async e=>{
  const mapping={'alert-posts-opt':'ict_posts','alert-sessions-opt':'ict_sessions','alert-news-opt':'ict_news'};const k=mapping[e.target.id];if(!k)return;localStorage.setItem('ict-pref-'+k.replace('ict_',''),e.target.checked?'1':'0');if(window.ICTOneSignal){try{await window.ICTOneSignal.User.addTag(k,e.target.checked?'1':'0');}catch{}}
 });
})();
