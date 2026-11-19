"use strict";
// ICT Arabic OneSignal subscription diagnostics. No secrets in client files.
(()=>{
  const appId=String(window.ICT_PUSH_APP_ID||'').trim();
  const base=new URL('./',document.baseURI).pathname;
  let sdkReady=false, sdkError='', oneSignal=null, initPromise=null;
  const validId=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(appId);
  const status=(message,failed=false)=>{
    document.querySelectorAll('#ict-push-status').forEach(el=>{
      el.textContent=message;el.style.color=failed?'var(--red, #c94d56)':'var(--muted, #78817b)';
      el.setAttribute('role','status');
    });
  };
  const usefulError=err=>{
    const message=String(err?.message||err||'خطأ غير معروف');
    if(/service.worker|serviceworker|scope|registration/i.test(message))return 'تعذر تسجيل Service Worker الخاص بـOneSignal. راجع مسار الملف وإعداد Scope. ('+message+')';
    if(/network|fetch|failed to load|load failed/i.test(message))return 'تعذر الاتصال بخدمة OneSignal. تحقق من الإنترنت ومن عدم حظر خدمة OneSignal. ('+message+')';
    return 'فشل تهيئة OneSignal: '+message;
  };
  if(!validId){
    sdkError='لم يتعرف الموقع على App ID صالح. تأكد من قيمة push-config.js المنشورة وأنها تخص تطبيق Web Push.';
  } else if(!window.isSecureContext){
    sdkError='تحتاج إشعارات الخلفية إلى موقع HTTPS.';
  } else if(!('serviceWorker' in navigator) || !('Notification' in window)){
    sdkError='هذا المتصفح لا يدعم إشعارات Web Push المطلوبة.';
  } else {
    window.OneSignalDeferred=window.OneSignalDeferred||[];
    initPromise=new Promise((resolve,reject)=>{
      const sdk=document.createElement('script');
      sdk.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      sdk.async=true;
      sdk.onerror=()=>{
        sdkError='تعذر تحميل مكتبة OneSignal. افحص الاتصال أو مانع الإعلانات.';
        reject(new Error(sdkError));
      };
      window.OneSignalDeferred.push(async OneSignal=>{
        try{
          await OneSignal.init({
            appId,
            serviceWorkerPath:base+'push/onesignal/OneSignalSDKWorker.js',
            serviceWorkerParam:{scope:base+'push/onesignal/'},
            notifyButton:{enable:false}
          });
          oneSignal=OneSignal;sdkReady=true;
          window.ICTOneSignal=OneSignal;
          resolve(OneSignal);
          document.dispatchEvent(new Event('ict-push-ready'));
        }catch(err){sdkError=usefulError(err);reject(new Error(sdkError));}
      });
      document.head.appendChild(sdk);
    });
    initPromise.catch(err=>{console.warn('ICT OneSignal:',err);status(sdkError||usefulError(err),true)});
  }
  async function subscribe(){
    if(sdkError)throw new Error(sdkError);
    if(!initPromise)throw new Error('لم يتم بدء تهيئة OneSignal.');
    const OneSignal=await Promise.race([initPromise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('انتهت مهلة تحميل OneSignal. تحقق من الإنترنت وإعدادات الموقع.')),18000))]);
    if(!OneSignal.Notifications.isPushSupported())throw new Error('المتصفح أو نظام الجهاز لا يدعم Push.');
    if(Notification.permission==='denied')throw new Error('المتصفح يحظر الإشعارات. افتح إعدادات الموقع وغيّر الإذن إلى السماح.');
    await OneSignal.Notifications.requestPermission();
    if(!OneSignal.Notifications.permission)throw new Error('لم يحصل الموقع على إذن الإشعارات.');
    if(!OneSignal.User.PushSubscription.optedIn)await OneSignal.User.PushSubscription.optIn();
    await Promise.resolve(OneSignal.User.addTags({
      ict_posts:localStorage.getItem('ict-pref-posts')==='0'?'0':'1',
      ict_sessions:localStorage.getItem('ict-pref-sessions')==='0'?'0':'1',
      ict_news:localStorage.getItem('ict-pref-news')==='0'?'0':'1'
    }));
    const id=OneSignal.User.PushSubscription.id;
    if(!OneSignal.User.PushSubscription.optedIn||!id)throw new Error('تم السماح بالإشعارات لكن لم يكتمل تسجيل الجهاز بعد. افحص Audience → Subscriptions في OneSignal أو حاول ثانية.');
    return true;
  }
  window.ICTSubscribe=subscribe;
  document.addEventListener('click',async e=>{
    const button=e.target.closest('#ict-push-subscribe');
    if(!button)return;
    button.disabled=true;
    status('جارٍ الاتصال بـOneSignal والتحقق من الاشتراك…');
    try{
      await subscribe();
      status('تم الاشتراك بنجاح في إشعارات الخلفية. تحقق من ظهور جهازك داخل OneSignal → Audience → Subscriptions.');
    }catch(err){status(err?.message||'تعذر الاشتراك. تحقق من إعداد OneSignal.',true);}
    finally{button.disabled=false;}
  });
  document.addEventListener('change',async e=>{
    const mapping={'alert-posts-opt':'ict_posts','alert-sessions-opt':'ict_sessions','alert-news-opt':'ict_news'};
    const tag=mapping[e.target.id];if(!tag)return;
    localStorage.setItem('ict-pref-'+tag.replace('ict_',''),e.target.checked?'1':'0');
    if(sdkReady&&oneSignal){try{await Promise.resolve(oneSignal.User.addTag(tag,e.target.checked?'1':'0'));}catch(err){console.warn('Could not update notification preference:',err);}}
  });
})();
