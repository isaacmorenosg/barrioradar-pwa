const SHELL='barrioradar-comunidad-v12-sectores-reducidos';
const ASSETS=['/','/index.html','/styles.css','/app.js','/config.js','/supabase-api.js','/manifest.webmanifest','/icons.svg','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(SHELL).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==SHELL).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',event=>{
  const req=event.request;
  const url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/auth/'))return;
  event.respondWith(fetch(req).then(resp=>{if(resp.ok){const c=resp.clone();caches.open(SHELL).then(cache=>cache.put(req,c));}return resp;}).catch(()=>caches.match(req).then(hit=>hit||caches.match('/index.html'))));
});