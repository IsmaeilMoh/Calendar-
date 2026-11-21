/* ICT بالعربي 6.8.27 — common navigation, theme and icon system (public static pages). */
(()=>{'use strict';
const root=document.documentElement;
const storageKey='ict-theme-mode';
const page=location.pathname.split('/').pop()||'index.html';
const nested=location.pathname.split('/').includes('assets');
const base=nested?'../':'./';
const modes=['auto','light','dark'];
const mq=matchMedia('(prefers-color-scheme: dark)');
function chosen(){try{const v=localStorage.getItem(storageKey);return modes.includes(v)?v:'auto'}catch(_){return 'auto'}}
function resolved(){const m=chosen();return m==='auto'?(mq.matches?'dark':'light'):m}
function apply(){const v=resolved();root.dataset.theme=v;root.style.colorScheme=v;const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=v==='dark'?'#0c141b':'#f4eee2';document.querySelectorAll('.ict-unity-theme-text').forEach(e=>e.textContent=({auto:'تلقائي',light:'فاتح',dark:'داكن'})[chosen()]);document.querySelectorAll('.ict-unity-theme').forEach(e=>e.setAttribute('aria-label','تغيير المظهر، الوضع الحالي: '+chosen()));}
window.ICTTheme={apply,chosen,resolved};
apply();
try{mq.addEventListener('change',()=>{if(chosen()==='auto')apply()})}catch(_){}
addEventListener('storage',e=>{if(e.key===storageKey)apply()});
function icon(name,box=false){const inner=(window.ICTSharedIcons&&window.ICTSharedIcons.makeIcon(name))||document.createElement('span');if(box){const outer=document.createElement('span');outer.className='uii-iconbox';outer.append(inner);return outer}return inner;}
const nav=[['home','الرئيسية','#home'],['markets','الأسواق','#markets'],['news','الأخبار','#news'],['recs','التوصيات','#recs'],['agenda','الأجندة','#agenda'],['ict','أدوات ICT','#ict'],['links','تابعنا','#links']];
function link(key,label,path,cls){const a=document.createElement('a');a.href=path;a.dataset.page=key;if(cls)a.className=cls;a.append(icon(key),document.createTextNode(label));return a;}
function makeHeader(){const existing=document.querySelector('body > header');if(!existing||page==='index.html')return;
 const h=document.createElement('header');h.className='ict-unity-header';h.setAttribute('aria-label','ترويسة ICT بالعربي');
 const w=document.createElement('div');w.className='ict-unity-header-inner';
 const logo=document.createElement('a');logo.className='ict-unity-brand';logo.href=base+'#home';logo.setAttribute('aria-label','ICT بالعربي - الرئيسية');
 const img=document.createElement('img');img.src=base+'logo-original.jpeg';img.alt='شعار ICT بالعربي';img.width=46;img.height=46;
 const st=document.createElement('span');const title=document.createElement('b');title.textContent='ICT بالعربي';const subtitle=document.createElement('small');subtitle.textContent='مساحة المتداول العربي';st.append(title,subtitle);logo.append(img,st);
 const menu=document.createElement('nav');menu.className='ict-unity-nav';menu.setAttribute('aria-label','القائمة الرئيسية');
 nav.forEach(([key,label,path])=>menu.append(link(key,label,base+path)));
 const actions=document.createElement('div');actions.className='ict-unity-actions';
 const btn=document.createElement('button');btn.type='button';btn.className='ict-unity-theme';btn.title='تغيير المظهر';btn.append(icon('theme'));const txt=document.createElement('span');txt.className='ict-unity-theme-text';btn.append(txt);
 btn.addEventListener('click',()=>{try{localStorage.setItem(storageKey,modes[(modes.indexOf(chosen())+1)%modes.length])}catch(_){}apply();});actions.append(btn);
 w.append(logo,menu,actions);h.append(w);existing.replaceWith(h);
 // Legacy standalone theme control would otherwise appear as a second switch.
 const legacy=document.getElementById('ict68-theme-control');if(legacy)legacy.remove();
 const observer=new MutationObserver(()=>{const old=document.getElementById('ict68-theme-control');if(old)old.remove();});observer.observe(document.body,{childList:true});
 apply();
}
const quick=[['home','الرئيسية','#home'],['markets','الأسواق','#markets'],['agenda','الأجندة','#agenda'],['recs','التوصيات','#recs']];
function makeDock(){if(page==='index.html'||page==='admin.html')return;document.querySelectorAll('.ict65-dock,.ict65-sheet,.ict65-dim').forEach(node=>node.remove());document.body.classList.remove('ict65-has-dock');
 const dock=document.createElement('nav');dock.className='ict-unity-dock';dock.setAttribute('aria-label','التنقل السريع');
 quick.forEach(([key,label,path])=>{const a=document.createElement('a');a.href=base+path;a.append(icon(key,true));const sp=document.createElement('span');sp.textContent=label;a.append(sp);dock.append(a)});
 const more=document.createElement('button');more.type='button';more.setAttribute('aria-expanded','false');more.setAttribute('aria-controls','ict-unity-sheet');more.append(icon('more',true));const t=document.createElement('span');t.textContent='المزيد';more.append(t);dock.append(more);
 const overlay=document.createElement('div');overlay.className='ict-unity-dim';overlay.hidden=true;
 const sheet=document.createElement('div');sheet.id='ict-unity-sheet';sheet.className='ict-unity-sheet';sheet.hidden=true;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-label','كل أقسام الموقع');sheet.setAttribute('aria-modal','true');
 const close=document.createElement('button');close.type='button';close.className='ict-unity-close';close.textContent='إغلاق';const h=document.createElement('strong');h.textContent='جميع الأقسام';sheet.append(h,close);
 const links=document.createElement('div');links.className='ict-unity-sheet-links';
 const extras=[...nav,['workspace','مساحتي','workspace.html'],['intelligence','ذكاء الأسواق','intelligence.html'],['research','مختبر الأبحاث','research.html'],['smartdesk','غرفة المتداول','smart-desk.html'],['recs','رحلة الصفقة الذكية','workflow.html'],['markets','دليل الأصول','assets.html'],['news','موثوقية البيانات','trust.html'],['markets','تحليلات الجمهور','analytics.html']];
 extras.forEach(([key,label,path])=>links.append(link(key,label,path.startsWith('#')?base+path:base+path)));sheet.append(links);
 function show(v){sheet.hidden=!v;overlay.hidden=!v;more.setAttribute('aria-expanded',String(v));if(v)close.focus();else more.focus()}
 more.addEventListener('click',()=>show(!sheet.hidden));close.addEventListener('click',()=>show(false));overlay.addEventListener('click',()=>show(false));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!sheet.hidden)show(false)});
 document.body.append(overlay,sheet,dock);
 // Avoid a second legacy dock even if an older script creates it later.
 const legacyObserver=new MutationObserver(()=>{if(!document.querySelector('.ict-unity-dock'))return;document.querySelectorAll('.ict65-dock,.ict65-sheet,.ict65-dim').forEach(node=>node.remove());document.body.classList.remove('ict65-has-dock');});
 legacyObserver.observe(document.body,{childList:true});
}
function init(){if(page==='index.html')return;makeHeader();makeDock();apply()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
