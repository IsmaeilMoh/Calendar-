/* ICT بالعربي 6.6.1 — Fix tool-menu leakage on desktop.
 * Small, backward-compatible replacement for mobile.js 6.5.
 * No analytics, tokens, content data, push workers or user storage touched.
 */
(()=>{
'use strict';
const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
if(page==='index.html'||page==='admin.html'||page==='')return;
if(document.getElementById('ict65-sheet')||document.querySelector('.ict65-dock'))return;
const assetPage=location.pathname.split('/').includes('assets');
const root=assetPage?'../':'./';

/* Important: prior mobile.css declared .ict65-sheet {display:none} only inside
   @media(max-width:760px). That made the sheet's plain links and text visible
   on desktop. This baseline guarantee applies across ALL viewport widths.
   Mobile open state is governed by the existing, more-specific media CSS. */
if(!document.getElementById('ict661-menu-baseline')){
 const style=document.createElement('style');
 style.id='ict661-menu-baseline';
 style.textContent='.ict65-sheet,.ict65-dim{display:none} @media (min-width:761px){.ict65-sheet,.ict65-dim,.ict65-dock{display:none!important}}';
 document.head.append(style);
}
const dockItems=[
 {label:'الرئيسية',short:'الرئيسية',icon:'⌂',href:root+'#home'},
 {label:'الأصول',short:'الأصول',icon:'◈',href:root+'assets.html'},
 {label:'التوصيات',short:'التوصيات',icon:'↗',href:root+'#recs'},
 {label:'مساحتي',short:'مساحتي',icon:'▣',href:root+'workspace.html'}
];
const shortcuts=[
 ['⌂','الرئيسية',root+'#home'],['◈','الأصول المالية',root+'assets.html'],
 ['↗','التوصيات والتحليلات',root+'#recs'],['▤','الأخبار',root+'#news'],
 ['▦','الأجندة الاقتصادية',root+'#agenda'],['◉','ذكاء الأسواق',root+'intelligence.html'],
 ['▣','مختبر الأبحاث',root+'research.html'],['✦','غرفة المتداول',root+'smart-desk.html'],
 ['◇','رحلة الصفقة',root+'workflow.html'],['☷','أدوات ICT',root+'#ict']
];
const dock=document.createElement('nav');dock.className='ict65-dock';dock.setAttribute('aria-label','التنقل السريع للموبايل');
for(const item of dockItems){
 const a=document.createElement('a');a.href=item.href;a.setAttribute('aria-label',item.label);
 const glyph=document.createElement('span');glyph.className='ict65-symbol';glyph.setAttribute('aria-hidden','true');glyph.textContent=item.icon;
 const caption=document.createElement('span');caption.className='ict65-caption';caption.textContent=item.short;
 a.append(glyph,caption);
 if(((page==='assets.html'||assetPage)&&item.label==='الأصول')||(page==='workspace.html'&&item.label==='مساحتي'))a.setAttribute('aria-current','page');
 dock.append(a);
}
const more=document.createElement('button');more.type='button';more.setAttribute('aria-label','عرض جميع الأدوات');more.setAttribute('aria-expanded','false');more.setAttribute('aria-controls','ict65-sheet');
const icon=document.createElement('span');icon.className='ict65-symbol';icon.setAttribute('aria-hidden','true');icon.textContent='☷';
const caption=document.createElement('span');caption.className='ict65-caption';caption.textContent='المزيد';more.append(icon,caption);dock.append(more);
const sheet=document.createElement('div');sheet.className='ict65-sheet';sheet.id='ict65-sheet';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label','الوصول السريع إلى أدوات المنصة');sheet.setAttribute('aria-hidden','true');
const head=document.createElement('div');head.className='ict65-sheet-header';
const title=document.createElement('b');title.textContent='مركز أدوات ICT بالعربي';
const close=document.createElement('button');close.className='ict65-sheet-close';close.type='button';close.textContent='إغلاق';head.append(title,close);
const grid=document.createElement('div');grid.className='ict65-sheet-grid';
for(const [glyph,label,href] of shortcuts){const a=document.createElement('a');a.href=href;const symbol=document.createElement('span');symbol.setAttribute('aria-hidden','true');symbol.textContent=glyph;a.append(symbol,document.createTextNode(label));grid.append(a)}
const note=document.createElement('p');note.className='ict65-sheet-note';note.textContent='اختصارات للانتقال بين الأقسام، دون حفظ أو مشاركة أي بيانات شخصية.';
sheet.append(head,grid,note);
const dim=document.createElement('div');dim.className='ict65-dim';dim.setAttribute('aria-hidden','true');
function setOpen(open,restoreFocus=false){
 open=Boolean(open)&&window.matchMedia('(max-width:760px)').matches;
 sheet.setAttribute('aria-hidden',String(!open));more.setAttribute('aria-expanded',String(open));dim.dataset.open=String(open);
 if(open)close.focus();else if(restoreFocus&&window.matchMedia('(max-width:760px)').matches)more.focus();
}
more.addEventListener('click',()=>setOpen(more.getAttribute('aria-expanded')!=='true'));
close.addEventListener('click',()=>setOpen(false,true));dim.addEventListener('click',()=>setOpen(false,true));
document.addEventListener('keydown',e=>{
 if(sheet.getAttribute('aria-hidden')!=='false')return;
 if(e.key==='Escape'){e.preventDefault();setOpen(false,true);return}
 if(e.key==='Tab'){
  const focusable=[close,...grid.querySelectorAll('a')];const first=focusable[0],last=focusable[focusable.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }
});
window.addEventListener('resize',()=>{if(window.innerWidth>760&&sheet.getAttribute('aria-hidden')==='false')setOpen(false)});
document.body.append(dim,sheet,dock);document.body.classList.add('ict65-has-dock');
})();
