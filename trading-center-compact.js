/* ICT بالعربي 6.8.10 | Group ONLY existing home trading-center links. */
(function(){
 'use strict';
 const app=document.getElementById('app');
 if(!app)return;
 const groups=[
  {title:'الأسواق والأخبار',icon:'▥',hint:'4 أدوات',hrefs:['assets.html','#markets','#agenda','#intelligence']},
  {title:'المختبرات الذكية',icon:'◈',hint:'3 أدوات',hrefs:['intelligence.html','research.html','smart-desk.html']},
  {title:'إدارة التداول',icon:'✦',hint:'3 أدوات',hrefs:['workflow.html','workspace.html','#calculators']},
  {title:'التعليم والمتابعة',icon:'◎',hint:'3 أدوات',hrefs:['#academy','#ict','#recs']}
 ];
 const stored='ict-center-group-open';
 let busy=false;
 function locateGrid(){
   for(const heading of app.querySelectorAll('.section-title')){
    if(heading.querySelector('h2')?.textContent.trim()!=='مركز التداول')continue;
    const grid=heading.nextElementSibling;
    if(grid?.classList.contains('tool-grid'))return grid;
   }
   return null;
 }
 function transform(){
  if(busy)return;
  const grid=locateGrid();
  if(!grid||grid.classList.contains('ict-center-groups'))return;
  const links=Array.from(grid.children).filter(e=>e.matches('a.tool-card[href]'));
  if(links.length<4)return;
  busy=true;
  try{
   grid.classList.add('ict-center-groups');
   const used=new Set();
   const orderedGroups=groups.map((config,index)=>{
    const details=document.createElement('details');details.className='ict-center-group';
    const summary=document.createElement('summary');
    const icon=document.createElement('span');icon.className='ict-center-icon';icon.setAttribute('aria-hidden','true');icon.textContent=config.icon;
    const copy=document.createElement('span');copy.className='ict-center-summary-copy';
    const title=document.createElement('strong');title.textContent=config.title;
    const hint=document.createElement('small');hint.textContent=config.hint;
    copy.append(title,hint);
    const arrow=document.createElement('span');arrow.className='ict-center-chevron';arrow.setAttribute('aria-hidden','true');arrow.textContent='⌄';
    summary.append(icon,copy,arrow);details.append(summary);
    const panel=document.createElement('div');panel.className='ict-center-items';
    for(const href of config.hrefs){
      const link=links.find(a=>a.getAttribute('href')===href&&!used.has(a));
      if(link){used.add(link);panel.append(link);}
    }
    hint.textContent=panel.children.length+' أدوات';
    details.append(panel);
    try{details.open=sessionStorage.getItem(stored)===String(index)}catch(e){}
    details.addEventListener('toggle',()=>{
      if(!details.open)return;
      for(const other of grid.querySelectorAll('.ict-center-group'))if(other!==details)other.open=false;
      try{sessionStorage.setItem(stored,String(index))}catch(e){}
    });
    return details;
   });
   // Preserve any new links added in future updates instead of silently losing them.
   const remaining=links.filter(a=>!used.has(a));
   if(remaining.length){
     const extra=document.createElement('details');extra.className='ict-center-group';
     const summary=document.createElement('summary');summary.textContent='أدوات إضافية ('+remaining.length+')';
     const panel=document.createElement('div');panel.className='ict-center-items';panel.append(...remaining);
     extra.append(summary,panel);orderedGroups.push(extra);
   }
   grid.replaceChildren(...orderedGroups);
  }finally{busy=false;}
 }
 const observer=new MutationObserver(transform);
 observer.observe(app,{childList:true});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',transform,{once:true});else transform();
 addEventListener('hashchange',()=>queueMicrotask(transform));
})();
