/* ICT بالعربي 5.4 — shared navigator; no personal data collection or third-party calls. */
(()=>{
'use strict';
const routes=[
  {file:'index.html',label:'الرئيسية',href:'./#home'},
  {file:'workspace.html',label:'مساحتي',href:'workspace.html'},
  {file:'intelligence.html',label:'ذكاء الأسواق',href:'intelligence.html'},
  {file:'research.html',label:'مختبر الأبحاث',href:'research.html'},
  {file:'smart-desk.html',label:'غرفة المتداول',href:'smart-desk.html'},
  {file:'index.html#recs',label:'التوصيات',href:'./#recs'},
  {file:'index.html#agenda',label:'الأجندة',href:'./#agenda'}
];
const page=location.pathname.split('/').pop()||'index.html';
if(page==='admin.html')return;
const host=document.createElement('nav');host.className='ict54-hub';host.setAttribute('aria-label','روابط أدوات ICT بالعربي');
const inner=document.createElement('div');inner.className='ict54-hub-inner';
const title=document.createElement('span');title.className='ict54-hub-title';title.textContent='أدوات المتداول';inner.append(title);
const links=document.createElement('div');links.className='ict54-hub-links';
for(const route of routes){const a=document.createElement('a');a.href=route.href;a.textContent=route.label;if(route.file===page||(page==='index.html'&&route.href==='./#home'&&!location.hash))a.setAttribute('aria-current','page');links.append(a)}
inner.append(links);
const status=document.createElement('span');status.className='ict54-current';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
function updateStatus(){status.replaceChildren();const dot=document.createElement('span');dot.className='ict54-dot'+(navigator.onLine?'':' offline');dot.setAttribute('aria-hidden','true');status.append(dot,document.createTextNode(navigator.onLine?'متصل':'دون اتصال'))}
updateStatus();window.addEventListener('online',updateStatus);window.addEventListener('offline',updateStatus);inner.append(status);host.append(inner);
const header=document.querySelector('header');
function relocateHub(){
 const app=document.getElementById('app');
 const isHome=(location.hash===''||location.hash==='#home');
 const heading=isHome&&app?[...app.querySelectorAll('.section-title')].find(node=>node.querySelector('h2')?.textContent.trim()==='مركز التداول'):null;
 const grid=heading?.nextElementSibling;
 // Never attach to an unrelated section or page: use the exact heading and tool grid pair.
 if(heading&&grid?.classList.contains('tool-grid')){
   heading.before(host);
   host.classList.add('ict54-hub-in-center');
   grid.classList.add('ict54-tools-compact');
 }else{
   host.classList.remove('ict54-hub-in-center');
   if(header)header.insertAdjacentElement('afterend',host);
   else document.body.prepend(host);
 }
}
relocateHub();
document.addEventListener('ict-view-rendered',relocateHub);

function updateActive(){
  if(page!=='index.html')return;
  const hash=location.hash||'#home';
  for(const a of links.querySelectorAll('a')){
    a.removeAttribute('aria-current');
    if(a.getAttribute('href')==='./'+hash)a.setAttribute('aria-current','page');
  }
}
window.addEventListener('hashchange',updateActive);
updateActive();
})();
