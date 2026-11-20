/* ICT بالعربي 5.6: displays the approved animation on PWA document launch.
   The Android OS splash is native and cannot be animated by website JavaScript. */
(function(){
 'use strict';
 const splash=document.getElementById('ict-launch-splash');
 if(!splash)return;
 const standalone=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||
    (window.matchMedia&&window.matchMedia('(display-mode: fullscreen)').matches)||
    window.navigator.standalone===true||document.referrer.startsWith('android-app://');
 const params=new URLSearchParams(window.location.search);
 // ?splash=1 is a safe browser-only test; ?splash=0 disables it if troubleshooting.
 const show=params.get('splash')==='1'||(standalone&&params.get('splash')!=='0');
 if(!show||window.matchMedia('(prefers-reduced-motion: reduce)').matches){splash.remove();return;}
 splash.classList.add('ict-splash-active');
 splash.setAttribute('aria-hidden','true');
 let finished=false;
 const started=performance.now();
 const finish=function(){
   if(finished)return;finished=true;
   splash.classList.add('ict-splash-leaving');
   splash.addEventListener('animationend',event=>{if(event.target===splash)splash.remove();},{once:true});
   setTimeout(()=>splash.remove(),720);
 };
 // Do not hold the visitor up because news/third-party widgets are loading slowly.
 function release(){setTimeout(finish,Math.max(0,2550-(performance.now()-started)));}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',release,{once:true});
 else release();
 // Hard safety fallback for unexpectedly stalled parsing.
 setTimeout(finish,4700);
})();
