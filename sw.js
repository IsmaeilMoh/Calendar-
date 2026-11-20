/* ICT بالعربي 6.0 — resilient offline shell. The OneSignal worker is separate. */
const CACHE='ict-shell-v62-workflow-20261120';
const PREFIX='ict-shell-';
const CORE=['./','./index.html','./style.css','./app.js','./platform.css','./platform.js','./workspace.html','./workspace.css','./workspace.js','./intelligence.html','./intelligence.css','./intelligence.js','./research.html','./research.css','./research.js','./smart-desk.html','./smart-desk.css','./smart-desk.js','./assets.html','./asset.css','./asset.js','./asset-config.js','./assets/XAUUSD.html','./manifest.json','./logo-original.jpeg','./icon-192.png','./icon-512.png','./workflow.html','./workflow.css','./workflow.js'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 // A single unavailable optional file must not prevent future site updates.
 await Promise.allSettled(CORE.map(async path=>{const url=new URL(path,self.registration.scope).href;const response=await fetch(url,{cache:'reload'});if(response.ok)await cache.put(url,response)}));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET')return;
 const url=new URL(request.url),scope=new URL(self.registration.scope);
 if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 if(url.pathname.includes('/push/')||/\/(admin\.html|admin\.js|admin\.css)$/.test(url.pathname))return;
 const name=url.pathname.split('/').pop()||'index.html';
 if(name==='news-live.json'||name==='calendar-live.json'||name==='market-movers.json'){
  // Live public data must be requested from the network, never presented as fresh from the shell cache.
  event.respondWith(fetch(request,{cache:'no-store'}).catch(()=>new Response('{}',{status:503,headers:{'Content-Type':'application/json'}})));
  return;
 }
 const isJson=name.endsWith('.json');
 const isCode=/\.(?:html|css|js)$/.test(name)||request.mode==='navigate';
 const storageKey=isJson?new Request(new URL(url.pathname,scope.origin).href):request;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const response=await fetch(request,{cache:isCode?'no-cache':'default'});
   if(response.ok && response.type==='basic')event.waitUntil(cache.put(storageKey,response.clone()));
   return response;
  }catch(error){
   const saved=await cache.match(storageKey);
   if(saved)return saved;
   if(request.mode==='navigate'){const shell=await cache.match(new URL('index.html',scope.href).href);return shell||new Response('غير متصل بالإنترنت',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
   throw error;
  }
 })());
});
