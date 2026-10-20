const SHELL='zonenta-pwa-v35-original-splash';
const ASSETS=['/','/index.html','/styles.css','/radar-dark.css','/radar-light.css','/zonenta-theme.css','/splash.css','/splash.js','/assets/zonenta-opening.svg','/icons/zonenta-lockup.svg','/icons/zonenta-brand-icon.svg','/icons/zonenta-icon.svg','/favicon.ico','/icons/zonenta-z-16.png','/icons/zonenta-z-32.png','/icons/zonenta-z-180.png','/icons/zonenta-z-192.png','/icons/zonenta-z-512.png','/icons/zonenta-z-maskable-512.png','/icons/zonenta-wordmark.svg','/icons/zonenta-192.png','/icons/zonenta-512.png','/icons/zonenta-maskable-512.png','/icons/icon-192.png','/icons/icon-512.png','/app.js','/radar-ui.js','/mobile-sheet-fix.css','/mobile-sheet-fix.js','/config.js','/supabase-api.js','/manifest.webmanifest','/icons.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(SHELL).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==SHELL).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',event=>{
  const req=event.request;
  const url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/auth/'))return;
  event.respondWith(fetch(req).then(resp=>{if(resp.ok){const c=resp.clone();caches.open(SHELL).then(cache=>cache.put(req,c));}return resp;}).catch(()=>caches.match(req).then(hit=>hit||caches.match('/index.html'))));
});