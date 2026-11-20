/* ICT بالعربي 6.8.2 | Splash appears on PWA launch and ?splash=1 */
(function(){
 'use strict';
 const splash=document.getElementById('ict-launch-splash');
 if(!splash)return;
 const standalone=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||
  (window.matchMedia&&window.matchMedia('(display-mode: fullscreen)').matches)||
  navigator.standalone===true||document.referrer.startsWith('android-app://');
 const params=new URLSearchParams(location.search);
 const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const show=!reduced&&(params.get('splash')==='1'||(standalone&&params.get('splash')!=='0'));
 if(!show){splash.remove();return;}
 splash.classList.add('ict-splash-active');
 let done=false;
 const start=performance.now();
 function finish(){
  if(done)return;done=true;
  splash.classList.add('ict-splash-leaving');
  setTimeout(()=>splash.remove(),460);
 }
 function release(){setTimeout(finish,Math.max(0,2850-(performance.now()-start)));}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',release,{once:true});
 else release();
 setTimeout(finish,5000);
})();
