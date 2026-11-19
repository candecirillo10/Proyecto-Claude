const V='crown-v7',SHELL=['./','index.html','app.css','app.js','local.js','cloud.js','config.js','vendor-supabase.js','manifest.webmanifest','bg-crown.jpg','cover-crown.jpg','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
// Red primero (siempre la versión más nueva); si no hay conexión, usa la copia guardada.
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;
  const same=new URL(r.url).origin===location.origin,fonts=/fonts\.(googleapis|gstatic)\.com/.test(r.url);
  if(!same&&!fonts)return;
  e.respondWith(fetch(r,same?{cache:'no-cache'}:undefined).then(res=>{if(res.ok)caches.open(V).then(c=>c.put(r,res.clone()));return res}).catch(()=>caches.match(r)))});
