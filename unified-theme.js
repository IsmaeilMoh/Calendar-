/* ICT بالعربي 6.8.31 — one theme controller for all public pages. */
(()=>{'use strict';
 if(window.ICTTheme && window.ICTTheme.version==='6.8.31')return;
 const root=document.documentElement,key='ict-theme-mode',modes=['auto','light','dark'];
 const media=window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : {matches:false};
 const filename=location.pathname.split('/').pop()||'index.html';
 const page=({'index.html':'home','workspace.html':'workspace','intelligence.html':'intelligence','research.html':'research','smart-desk.html':'smart-desk'})[filename];
 if(page)root.dataset.ictPage=page;
 function chosen(){try{const m=localStorage.getItem(key);return modes.includes(m)?m:'auto'}catch(_){return 'auto'}}
 function resolved(){const m=chosen();return m==='auto'?(media.matches?'dark':'light'):m}
 function apply(){const current=resolved();root.dataset.theme=current;root.style.colorScheme=current;
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=current==='dark'?'#0c141b':'#f4eee2';
  const names={auto:'تلقائي',light:'فاتح',dark:'داكن'},label=names[chosen()];
  document.querySelectorAll('.ict-unity-theme-text').forEach(el=>{if(el.textContent!==label)el.textContent=label});
  document.querySelectorAll('.ict-unity-theme').forEach(el=>el.setAttribute('aria-label','تغيير المظهر، الوضع الحالي: '+label));
  root.dispatchEvent(new CustomEvent('ict:themechange',{detail:{mode:chosen(),theme:current}}));
  return current;
 }
 function setMode(mode){if(!modes.includes(mode))return;try{localStorage.setItem(key,mode)}catch(_){}apply()}
 function cycle(){setMode(modes[(modes.indexOf(chosen())+1)%modes.length])}
 const api=Object.freeze({version:'6.8.31',chosen,resolved,apply,setMode,cycle});window.ICTTheme=api;
 apply();
 if(media.addEventListener)media.addEventListener('change',()=>{if(chosen()==='auto')apply()});
 else if(media.addListener)media.addListener(()=>{if(chosen()==='auto')apply()});
 window.addEventListener('storage',event=>{if(event.key===key)apply()});
})();
