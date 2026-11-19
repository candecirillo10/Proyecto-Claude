/* Capa de datos en la nube (Supabase): cuentas, sincronización, comentarios y archivos privados.
   Misma interfaz que local.js. Solo se activa si config.js tiene supabaseUrl. */
(()=>{
const C=window.APP_CONFIG;if(!C||!C.supabaseUrl||!window.supabase)return;
const needPw=/type=(invite|recovery)/.test(location.hash);  // llegó desde un correo de invitación o de recuperación
document.documentElement.dataset.mode='cloud';
const sb=supabase.createClient(C.supabaseUrl,C.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}});
const err=code=>Object.assign(new Error(code),{code});
const subs=new Set();let t;const notify=()=>{clearTimeout(t);t=setTimeout(()=>subs.forEach(f=>f()),60)};
const urls=new Map();let session=null,owner=false;
window.__blobUrl=id=>(urls.get(id)||{}).url||'';
const ids=v=>{const o=[];if(v&&typeof v==='object'){if(typeof v.avatar==='string'&&v.avatar)o.push(v.avatar);if(Array.isArray(v.assets))v.assets.forEach(a=>a&&a.id&&o.push(a.id))}return o};
async function ensure(list){
  const need=[...new Set(list)].filter(id=>{const u=urls.get(id);return !u||u.exp<Date.now()+3600e3});
  if(!need.length)return;
  const {data}=await sb.storage.from('media').createSignedUrls(need,86400);
  (data||[]).forEach(r=>{if(r.signedUrl)urls.set(r.path,{url:r.signedUrl,exp:Date.now()+86400e3})});
}
const snapDoc=(p,v)=>({exists:v!==undefined,data:()=>v,id:p.split('/').pop(),metadata:{fromCache:false}});
const jc=v=>JSON.parse(JSON.stringify(v));
const get=async p=>{const {data,error}=await sb.from('docs').select('data').eq('path',p).maybeSingle();if(error)throw error;return data?data.data:undefined};
const put=async(p,v)=>{const {error}=await sb.from('docs').upsert({path:p,data:v,updated_at:new Date().toISOString()});if(error)throw error;notify()};
const docRef=p=>({
  get:async()=>snapDoc(p,await get(p)),
  set:async v=>put(p,jc(v)),
  update:async v=>{const o=await get(p);if(o===undefined)throw err('invalid_argument');await put(p,{...o,...jc(v)})},
  delete:async()=>{const {error}=await sb.from('docs').delete().eq('path',p);if(error)throw error;notify()},
  onSnapshot(cb,eh){const run=async()=>{try{const v=await get(p);await ensure(ids(v));cb(snapDoc(p,v))}catch(e){eh&&eh(e)}};subs.add(run);run();return()=>subs.delete(run)}
});
const colRef=c=>({
  doc:id=>docRef(c+'/'+id),
  add:async v=>{const id='p'+crypto.randomUUID().replace(/-/g,'').slice(0,15);await put(c+'/'+id,jc(v));return docRef(c+'/'+id)},
  onSnapshot(cb,eh){const run=async()=>{try{
    const {data,error}=await sb.from('docs').select('path,data').like('path',c+'/%');if(error)throw error;
    const rows=data.filter(r=>!r.path.slice(c.length+1).includes('/'));
    await ensure(rows.flatMap(r=>ids(r.data)));
    cb({docs:rows.map(r=>({id:r.path.split('/').pop(),data:()=>r.data})),metadata:{fromCache:false}})}catch(e){eh&&eh(e)}};
    subs.add(run);run();return()=>subs.delete(run)}
});
const db={doc:docRef,collection:colRef};
const assets={
  async upload(file,{type}={}){
    if(file.size>52428800)throw err('too_large');
    const id=crypto.randomUUID().replace(/-/g,'');const ct=type||file.type;
    const {error}=await sb.storage.from('media').upload(id,file,{contentType:ct});
    if(error)throw err(/quota|limit|size/i.test(error.message)?'quota_or_state':'upload');
    await ensure([id]);return {id,contentType:ct}},
  async delete(id){await sb.storage.from('media').remove([id]);urls.delete(id)}
};
/* Comentarios */
let rows=[];const cmSubs=new Set();
async function loadComments(){const {data}=await sb.from('comments').select('*').order('created_at');rows=data||[];cmSubs.forEach(f=>f())}
const comments={
  list:t=>rows.filter(r=>r.target===t),count:t=>rows.reduce((n,r)=>n+(r.target===t),0),
  me:()=>session.user.id,
  subscribe(f){cmSubs.add(f);return()=>cmSubs.delete(f)},
  async add(target,body){const name=(session.user.user_metadata||{}).name||session.user.email.split('@')[0];
    const {error}=await sb.from('comments').insert({target,body,author_name:name});if(error)throw error;await loadComments()},
  async review(id,decision){const {error}=await sb.rpc('review_item',{item_id:id,decision});if(error)throw error;notify()},
  async remove(id){const {error}=await sb.from('comments').delete().eq('id',id);if(error)throw error;await loadComments()}
};
/* Acceso */
function loginUI(){return new Promise(res=>{
  let signup=false;const el=document.createElement('div');el.className='ov';el.style.zIndex=50;
  const draw=()=>{el.innerHTML=`<div class="sheet sm"><h2>${signup?'Crear cuenta':'Ingresar'}</h2><form class="form" id="lf">
  ${signup?'<label class="f">Tu nombre <input id="ln" maxlength="60" autocomplete="name" required></label>':''}
  <label class="f">Email <input id="le" type="email" autocomplete="email" required></label>
  <label class="f">Contraseña <input id="lp" type="password" minlength="6" autocomplete="${signup?'new-password':'current-password'}" required></label>
  <p class="msg" id="lm" aria-live="polite"></p>
  <button class="primary" type="submit">${signup?'Crear cuenta':'Ingresar'}</button>
  <div class="row">${C.allowSignup!==false?`<button type="button" id="ls">${signup?'Ya tengo cuenta':'Crear cuenta'}</button>`:''}${signup?'':'<button type="button" id="lr">Olvidé mi contraseña</button>'}</div></form></div>`;
    const m=el.querySelector('#lm'),$=s=>el.querySelector(s);
    $('#ls')&&($('#ls').onclick=()=>{signup=!signup;draw()});
    $('#lr')&&($('#lr').onclick=async()=>{const e=$('#le').value.trim();if(!e){m.textContent='Escribí tu email arriba.';return}
      const {error}=await sb.auth.resetPasswordForEmail(e);m.textContent=error?'No se pudo enviar el correo.':'Te enviamos un correo para cambiar la contraseña.'});
    $('#lf').onsubmit=async ev=>{ev.preventDefault();m.textContent='Un momento…';const email=$('#le').value.trim(),password=$('#lp').value;
      const r=signup?await sb.auth.signUp({email,password,options:{data:{name:$('#ln').value.trim()}}}):await sb.auth.signInWithPassword({email,password});
      if(r.error){m.textContent=/invalid login/i.test(r.error.message)?'Email o contraseña incorrectos.':/registered/i.test(r.error.message)?'Ese email ya tiene cuenta.':'No se pudo ingresar: '+r.error.message;return}
      if(!r.data.session){m.textContent='Revisá tu correo para confirmar la cuenta y después ingresá.';signup=false;return}
      session=r.data.session;el.remove();res()}};
  draw();document.body.append(el)})}
function passwordUI(){return new Promise(res=>{
  const el=document.createElement('div');el.className='ov';el.style.zIndex=50;
  el.innerHTML=`<div class="sheet sm"><h2>Elegí tu contraseña</h2><form class="form" id="pf"><p class="msg">Con esta contraseña vas a entrar la próxima vez.</p><label class="f">Contraseña nueva <input id="pp" type="password" minlength="6" autocomplete="new-password" required></label><p class="msg" id="pm" aria-live="polite"></p><button class="primary" type="submit">Guardar y entrar</button></form></div>`;
  el.querySelector('#pf').onsubmit=async ev=>{ev.preventDefault();const m=el.querySelector('#pm');m.textContent='Un momento…';
    const {error}=await sb.auth.updateUser({password:el.querySelector('#pp').value});
    if(error){m.textContent='No se pudo guardar: '+error.message;return}el.remove();res()};
  document.body.append(el)})}
async function boot(){
  const {data}=await sb.auth.getSession();session=data.session;
  if(!session)await loginUI();
  else if(needPw)await passwordUI();
  try{const r=await sb.rpc('is_owner');owner=r.data===true}catch(_){owner=false}
  await loadComments();
  sb.channel('live').on('postgres_changes',{event:'*',schema:'public',table:'docs'},notify)
    .on('postgres_changes',{event:'*',schema:'public',table:'comments'},loadComments).subscribe();
  const lo=document.getElementById('logout');if(lo){lo.hidden=false;lo.onclick=async()=>{await sb.auth.signOut();location.reload()}}
}
let booted;
const user={canEdit:async()=>owner,id:async()=>session.user.id};
window.claude={async use(n){
  await (booted||(booted=boot()));
  if(n==='db')return db;if(n==='user')return user;if(n==='assets'){if(!owner)throw err('not_granted');return assets}
  if(n==='comments')return comments;throw err('unavailable')}};
})();
