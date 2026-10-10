/* Codemux - service worker: abre o app mesmo sem rede para a "casca" (HTML/CSS/JS). Nunca guarda /api (dados e terminal ficam sempre ao vivo). */
const V='codemux-v2',CORE=['/','/css/theme.css','/css/app.css','/css/ui.css','/css/components.css','/css/shell.css','/css/ai.css','/manifest.webmanifest','/icons/icon-192.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api/'))return;
  // rede primeiro (sempre código atualizado); cai no cache quando offline
  e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c))}return res}).catch(()=>caches.match(r).then(m=>m||caches.match('/'))))});
