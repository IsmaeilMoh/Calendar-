/* ICT بالعربي | 6.8.3 shared theme controller. Independent of trading logic. */
(function(){
 'use strict';
 const path=location.pathname.split('/').pop()||'index.html';
 const page=({'index.html':'home','workspace.html':'workspace','intelligence.html':'intelligence','research.html':'research','smart-desk.html':'smart-desk'})[path];
 if(!page)return;
 const root=document.documentElement;
 root.setAttribute('data-ict-page',page);
 const key='ict-theme-mode';
 let media=null;
 try{media=matchMedia('(prefers-color-scheme: dark)')}catch(_){}
 function mode(){let x;try{x=localStorage.getItem(key)}catch(_){}return ['auto','light','dark'].includes(x)?x:'auto'}
 function theme(){const m=mode();return m==='auto'?(media&&media.matches?'dark':'light'):m}
 function apply(){root.setAttribute('data-theme',theme());const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=theme()==='dark'?'#0c141b':'#f4eee2';const control=document.getElementById('ict68-theme-control');if(control){const name={'auto':'تلقائي','light':'فاتح','dark':'داكن'}[mode()];control.textContent='◐ المظهر: '+name;control.setAttribute('aria-label','تغيير المظهر، الوضع الحالي: '+name)}}
 apply();
 function init(){
  if(page==='home')return; // keep the main app's native theme switch, shared storage.
  if(document.getElementById('ict68-theme-control'))return;
  const btn=document.createElement('button');btn.id='ict68-theme-control';btn.className='ict68-theme-control';btn.type='button';
  btn.addEventListener('click',()=>{const all=['auto','light','dark'],index=all.indexOf(mode());try{localStorage.setItem(key,all[(index+1)%all.length])}catch(_){}apply()});
  document.body.append(btn);apply();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 if(media)try{media.addEventListener('change',()=>{if(mode()==='auto')apply()})}catch(_){}
 addEventListener('storage',e=>{if(e.key===key)apply()});
})();
