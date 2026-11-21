/* ICT بالعربي 6.8.6 - relocate only shared toolbar. No data or trading logic touched. */
(function(){
 'use strict';
 const app=document.getElementById('app');
 if(!app)return;
 let processing=false;
 let retainedHub=null;
 function locate(){
  if(processing)return;
  const hub=retainedHub||document.querySelector('.ict54-hub');
  if(!hub)return;
  retainedHub=hub;
  const headings=app.querySelectorAll('.section-title');
  let target=null;
  for(const heading of headings){
   const title=heading.querySelector('h2');
   if(title && title.textContent.trim()==='مركز التداول' && heading.nextElementSibling?.classList.contains('tool-grid')){target=heading;break;}
  }
  const header=document.querySelector('header');
  processing=true;
  try{
   if(target){
    if(hub.nextElementSibling!==target || hub.parentElement!==app)target.insertAdjacentElement('beforebegin',hub);
    hub.classList.add('ict68-hub-near-center');
   } else {
    if(header && header.nextElementSibling!==hub)header.insertAdjacentElement('afterend',hub);
    hub.classList.remove('ict68-hub-near-center');
   }
  }finally{processing=false;}
 }
 const observer=new MutationObserver(()=>locate());
 observer.observe(app,{childList:true});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',locate,{once:true});
 else locate();
 addEventListener('hashchange',()=>queueMicrotask(locate));
})();
