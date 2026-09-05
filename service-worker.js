/* Cache and push receiver; click handler must precede Firebase. */
const CACHE_NAME = 'imnvlab-v17', RECEIPTS = 'imnvlab-push-receipts';
const DIAGNOSTICS = 'imnvlab-push-diagnostics';
const APP_FILES = ['./', './index.html', './styles.css', './dashboard.js', './manifest.json', './marca-ceti.jpeg', './icon-192.png', './icon-512.png'];
const scopeUrl = new URL(self.registration.scope);
function safeTarget(value) {
  try { const url = new URL(value || 'index.html#alertas', scopeUrl); if (url.origin === scopeUrl.origin && url.pathname.startsWith(scopeUrl.pathname)) return url.href; } catch {}
  return new URL('index.html#alertas', scopeUrl).href;
}
self.addEventListener('notificationclick', event => {
  event.notification.close(); event.stopImmediatePropagation();
  const target = safeTarget(event.notification.data?.url);
  event.waitUntil((async () => {
    for (const client of await clients.matchAll({ type: 'window', includeUncontrolled: true })) {
      const url = new URL(client.url);
      if (url.origin === scopeUrl.origin && url.pathname.startsWith(scopeUrl.pathname)) { await client.navigate(target); return client.focus(); }
    }
    return clients.openWindow(target);
  })());
});
let displayQueue = Promise.resolve();
async function saveDiagnostic(record){
 try{const cache=await caches.open(DIAGNOSTICS);await cache.put(new URL('__push_diagnostics/'+record.key,scopeUrl).href,new Response(JSON.stringify(record)));const keys=await cache.keys();await Promise.all(keys.slice(0,Math.max(0,keys.length-30)).map(key=>cache.delete(key)));}catch{}
}
function displayPush(payload, source='push') {
 const receivedAt=Date.now(), data=payload.data||{};
 const record={key:receivedAt+'-'+Math.random().toString(36).slice(2),version:CACHE_NAME,source,receivedAt,sentAt:Number(data.sentAt)||null,state:'received'};
 const context=clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{record.windows=windows.length;record.visible=windows.filter(w=>w.visibilityState==='visible').length;}).catch(()=>{});
 const receivedLog=context.then(()=>saveDiagnostic(record));
 displayQueue=displayQueue.catch(()=>{}).then(async()=>{
  const receipt=data.id?new URL('__push_receipts/'+encodeURIComponent(data.id),scopeUrl).href:null;
  let cache;
  try{cache=await caches.open(RECEIPTS);if(receipt&&await cache.match(receipt)){await receivedLog;record.state='duplicate';await saveDiagnostic(record);return;}}catch{record.receiptCacheError=true;}
  try{
   await self.registration.showNotification(data.title||payload.notification?.title||'IMNVLab · Alerta',{
    body:data.body||payload.notification?.body||'Nova condição ambiental detectada.',icon:new URL('marca-ceti.jpeg',scopeUrl).href,
    tag:data.tag||'imnvlab-weather',data:{url:safeTarget(data.url)}
   });
   const displayedAt=Date.now();await receivedLog;record.displayedAt=displayedAt;record.state='display-accepted';await saveDiagnostic(record);
   // A cache failure must never block the notification itself.
   if(receipt&&cache)try{await cache.put(receipt,new Response('seen'));const keys=await cache.keys();await Promise.all(keys.slice(0,Math.max(0,keys.length-100)).map(key=>cache.delete(key)));}catch{}
  }catch(error){await receivedLog;record.state='display-error';record.error=error.name||'Error';await saveDiagnostic(record);}
 });return displayQueue;
}
self.addEventListener('message',event=>{
 if(event.data?.type==='IMNV_PUSH')event.waitUntil(displayPush(event.data.payload||{},'page-forward'));
 if(event.data?.type==='IMNV_PUSH_DIAGNOSTICS'&&event.ports[0])event.waitUntil((async()=>{
  let records=[];
  try{const cache=await caches.open(DIAGNOSTICS);const keys=await cache.keys();records=await Promise.all(keys.map(async key=>(await cache.match(key)).json()));}catch{}
  const subscription=await self.registration.pushManager.getSubscription().catch(()=>null);
  event.ports[0].postMessage({version:CACHE_NAME,scope:self.registration.scope,subscribed:!!subscription,records:records.sort((a,b)=>b.receivedAt-a.receivedAt)});
 })());
});
self.addEventListener('push',event=>{
 if(!event.data)return;
 let payload;try{payload=event.data.json();}catch{event.waitUntil(saveDiagnostic({key:Date.now()+'-invalid',version:CACHE_NAME,source:'push',receivedAt:Date.now(),state:'invalid-payload'}));return;}
 event.waitUntil(displayPush(payload));
});
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES))); self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter(key => key.startsWith('imnvlab-') && key !== CACHE_NAME && key !== RECEIPTS && key !== DIAGNOSTICS).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
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
