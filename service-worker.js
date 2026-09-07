/* Cache offline do aplicativo. */
const CACHE_NAME='imnvlab-v21';
const APP_FILES=['./','./index.html','./styles.css','./dashboard.js','./manifest.json?v=21','./marca-ceti.jpeg?v=21'];
const scopeUrl=new URL(self.registration.scope);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
 // Desfaz a inscrição antiga durante a atualização, sem cadastrar novos dispositivos.
 try{const previous=await self.registration.pushManager?.getSubscription();if(previous)await previous.unsubscribe();}catch{}
 try{for(const item of await self.registration.getNotifications())item.close();}catch{}
 await Promise.all((await caches.keys()).filter(key=>key.startsWith('imnvlab-')&&key!==CACHE_NAME).map(key=>caches.delete(key)));
 await self.clients.claim();
})());});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== scopeUrl.origin || !APP_FILES.some(file => new URL(file, scopeUrl).pathname === url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try { const response = await fetch(event.request); if (response.ok) await cache.put(event.request, response.clone()); return response; }
    catch { return await cache.match(event.request) || Response.error(); }
  })());
});
