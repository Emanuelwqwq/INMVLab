// Firebase exibe os payloads notification quando o site está em segundo plano.
self.addEventListener('notificationclick',event=>{if(!event.notification.data?.siteLink)return;event.stopImmediatePropagation();event.notification.close();event.waitUntil((async()=>{const url=new URL('./index.html#alertas',self.registration.scope).href;const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const target=windows.find(w=>new URL(w.url).origin===new URL(url).origin);if(target){await target.navigate(url);await target.focus();}else await self.clients.openWindow(url);})());});
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
firebase.initializeApp({ apiKey: "AIzaSyBWDcTMNN4aUYywXhgUw_gJzlkB45F1foM", authDomain: "climat-7c7f7.firebaseapp.com", projectId: "climat-7c7f7", messagingSenderId: "267164246485", storageBucket: "climat-7c7f7.firebasestorage.app", appId: "1:267164246485:web:a72b776b880ba5b8b71d5c" });firebase.messaging();
let queue=Promise.resolve();
self.addEventListener('message',event=>{if(event.data?.type!=='SITE_NOTICE')return;const payload=event.data.payload;event.waitUntil(queue=queue.catch(()=>{}).then(async()=>{const cache=await caches.open('imnvlab-notice-seen');const key=new URL('__notice/'+encodeURIComponent(payload.data?.id||payload.messageId),self.registration.scope).href;if(await cache.match(key))return;await self.registration.showNotification(payload.notification?.title||'IMNVLab',{body:payload.notification?.body||'',icon:new URL('./marca-ceti.jpeg?v=33',self.registration.scope).href,tag:payload.data?.id||payload.messageId,data:{siteLink:true}});await cache.put(key,new Response('1'));const keys=await cache.keys();await Promise.all(keys.slice(0,Math.max(0,keys.length-50)).map(k=>cache.delete(k)));}));});
/* Cache offline do aplicativo. */
const CACHE_NAME='imnvlab-v33';
const APP_FILES=['./','./index.html','./styles.css','./dashboard.js','./explorer.js','./lumi.png','./assets/escola-fachada.jpeg','./assets/lumi-acenando.png','./manifest.json?v=33','./marca-ceti.jpeg?v=33'];
const GALLERY_FILES=['entrada','biblioteca','sala','informatica','xadrez'].map(name=>'./assets/escola-'+name+'.jpeg');
const scopeUrl=new URL(self.registration.scope);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
 await Promise.all((await caches.keys()).filter(key=>key.startsWith('imnvlab-')&&key!==CACHE_NAME&&key!=='imnvlab-notice-seen').map(key=>caches.delete(key)));
 await self.clients.claim();
})());});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== scopeUrl.origin || ![...APP_FILES,...GALLERY_FILES].some(file => new URL(file, scopeUrl).pathname === url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try { const response = await fetch(event.request); if (response.ok) await cache.put(event.request, response.clone()); return response; }
    catch { return await cache.match(event.request) || Response.error(); }
  })());
});
