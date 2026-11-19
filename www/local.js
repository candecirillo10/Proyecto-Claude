/* Capa de datos local: reemplaza db/assets/user de Claude con IndexedDB.
   Misma interfaz (doc/collection/onSnapshot, assets.upload/delete) para no tocar la UI.
   Para sincronizar con clientes en la nube, reimplementá estas funciones con Firebase/Supabase. */
(()=>{
const DB='crown-portal',DOCS='docs',BLOBS='blobs';
let idb;const subs=new Set();const urls=new Map();
const open=()=>new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore(DOCS);d.createObjectStore(BLOBS)};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const tx=(st,mode,fn)=>new Promise((res,rej)=>{const t=idb.transaction(st,mode);const out=fn(t);t.oncomplete=()=>res(out&&'result'in out?out.result:out);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)});
const all=st=>new Promise((res,rej)=>{const t=idb.transaction(st);const s=t.objectStore(st),keys=s.getAllKeys(),vals=s.getAll();t.oncomplete=()=>res(keys.result.map((k,i)=>[k,vals.result[i]]));t.onerror=()=>rej(t.error)});
const notify=()=>subs.forEach(f=>f());
const snapDoc=(path,v)=>({exists:v!==undefined,data:()=>v,id:path.split('/').pop(),metadata:{fromCache:false}});
const rid=()=>{const c='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';let s='p';for(const b of crypto.getRandomValues(new Uint8Array(15)))s+=c[b%62];return s};
const get=p=>new Promise((res,rej)=>{const r=idb.transaction(DOCS).objectStore(DOCS).get(p);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const put=(p,v)=>tx(DOCS,'readwrite',t=>t.objectStore(DOCS).put(v,p)).then(notify);
const docRef=p=>({
  get:async()=>snapDoc(p,await get(p)),
  set:async v=>put(p,JSON.parse(JSON.stringify(v))),
  update:async v=>{const o=await get(p);if(o===undefined){const e=new Error('not found');e.code='not_found';throw e}await put(p,{...o,...JSON.parse(JSON.stringify(v))})},
  delete:async()=>{await tx(DOCS,'readwrite',t=>t.objectStore(DOCS).delete(p));notify()},
  onSnapshot(cb,err){const run=async()=>{try{cb(snapDoc(p,await get(p)))}catch(e){err&&err(e)}};subs.add(run);run();return()=>subs.delete(run)}
});
const colRef=c=>({
  doc:id=>docRef(c+'/'+id),
  add:async v=>{const id=rid();await put(c+'/'+id,JSON.parse(JSON.stringify(v)));return docRef(c+'/'+id)},
  onSnapshot(cb,err){const run=async()=>{try{const rows=(await all(DOCS)).filter(([k])=>k.startsWith(c+'/')&&!k.slice(c.length+1).includes('/'));cb({docs:rows.map(([k,v])=>({id:k.split('/').pop(),data:()=>v})),metadata:{fromCache:false}})}catch(e){err&&err(e)}};subs.add(run);run();return()=>subs.delete(run)}
});
const db={doc:docRef,collection:colRef};
const err=(code)=>Object.assign(new Error(code),{code});
const assets={
  async upload(file,{type}={}){if(file.size>20971520)throw err('too_large');const id=rid().slice(1)+rid().slice(1,8);const ct=type||file.type;
    try{await tx(BLOBS,'readwrite',t=>t.objectStore(BLOBS).put({blob:file,type:ct},id))}catch(e){throw err('quota_or_state')}
    urls.set(id,URL.createObjectURL(new Blob([file],{type:ct})));return {id,contentType:ct}},
  async delete(id){await tx(BLOBS,'readwrite',t=>t.objectStore(BLOBS).delete(id));const u=urls.get(id);if(u){URL.revokeObjectURL(u);urls.delete(id)}}
};
window.__blobUrl=id=>urls.get(id)||'';
async function preload(){for(const [id,v] of await all(BLOBS))if(!urls.has(id))urls.set(id,URL.createObjectURL(v.blob))}
// Antes de pintar, asegura que los blobs nuevos tengan URL
subs.add(()=>{});
const user={canEdit:async()=>true,id:async()=>null};
const b64=b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b)});
async function exportAll(){
  const docs=Object.fromEntries(await all(DOCS)),blobs={};
  for(const [id,v] of await all(BLOBS))blobs[id]=await b64(v.blob);
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({v:1,docs,blobs})],{type:'application/json'}));
  a.download='crown-portal-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();
}
async function importAll(file){
  const d=JSON.parse(await file.text());if(!d||d.v!==1||!d.docs)throw new Error('formato');
  for(const [id,u] of Object.entries(d.blobs||{})){const b=await (await fetch(u)).blob();await tx(BLOBS,'readwrite',t=>t.objectStore(BLOBS).put({blob:b,type:b.type},id))}
  for(const [k,v] of Object.entries(d.docs))await tx(DOCS,'readwrite',t=>t.objectStore(DOCS).put(v,k));
  await preload();notify();
}
const inp=document.createElement('input');inp.type='file';inp.accept='application/json,.json';inp.hidden=true;document.addEventListener('DOMContentLoaded',()=>document.body.append(inp));
inp.addEventListener('change',async()=>{const f=inp.files[0];inp.value='';const m=document.getElementById('bkMsg');if(!f)return;
  try{if(m)m.textContent='Importando…';await importAll(f);if(m)m.textContent='Copia importada.'}catch(e){if(m)m.textContent='El archivo no es una copia válida.'}});
document.addEventListener('click',async e=>{const t=e.target.closest('[data-act]');if(!t)return;const m=document.getElementById('bkMsg');
  if(t.dataset.act==='bkexp'){try{if(m)m.textContent='Preparando copia…';await exportAll();if(m)m.textContent='Copia descargada.'}catch(_){if(m)m.textContent='No se pudo exportar.'}}
  else if(t.dataset.act==='bkimp')inp.click()});
// Instalación PWA
let deferred;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;const b=document.getElementById('install');if(b)b.hidden=false});
document.addEventListener('click',async e=>{if(e.target.id==='install'&&deferred){deferred.prompt();await deferred.userChoice;deferred=null;e.target.hidden=true}});
window.claude={async use(n){
  if(!idb){idb=await open();await preload();try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(_){}}
  if(n==='db')return db;if(n==='user')return user;if(n==='assets')return assets;throw err('unavailable')}};
})();
