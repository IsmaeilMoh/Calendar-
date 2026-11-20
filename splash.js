/* ICT بالعربي 6.8 splash patch */
(function(){
  'use strict';
  const splash=document.getElementById('ict-launch-splash');
  if(!splash)return;
  const standalone=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||
    (window.matchMedia&&window.matchMedia('(display-mode: fullscreen)').matches)||
    window.navigator.standalone===true||document.referrer.startsWith('android-app://');
  const params=new URLSearchParams(window.location.search);
  const show=params.get('splash')==='1'||(standalone&&params.get('splash')!=='0');
  if(!show||window.matchMedia('(prefers-reduced-motion: reduce)').matches){splash.remove();return;}
  splash.classList.add('ict-splash-active');
  let finished=false;
  const started=performance.now();
  function finish(){
    if(finished)return; finished=true;
    splash.classList.add('ict-splash-leaving');
    setTimeout(()=>splash.remove(),430);
  }
  function release(){setTimeout(finish,Math.max(0,3200-(performance.now()-started)));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',release,{once:true});
  else release();
  setTimeout(finish,4700);
})();
