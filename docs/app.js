
{
const DEF=[{id:'historias',name:'Historias',kind:'media',ratio:'9/16'},{id:'posteos',name:'Posteos',kind:'media',ratio:'4/5'},{id:'reels',name:'Reels',kind:'media',ratio:'9/16'},{id:'ideas',name:'Ideas',kind:'notes'}];
const ST=[['borrador','Borrador'],['revision','En revisión'],['cambios','Cambios pedidos'],['aprobada','Aprobada'],['publicada','Publicada']];
const RAT=['9/16','4/5','1/1'];
const S={db:null,assets:null,uid:null,canEdit:false,config:{brand:'',handle:'',folders:DEF},items:[],priv:[],loaded:false,confirmed:false,filter:'todas',q:'',mode:'grilla',open:null,urls:[],pending:[]};
try{S.mode=localStorage.getItem('pc-mode')||'grilla'}catch(e){}
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const blob=id=>esc(window.__blobUrl(id));
const pid=id=>'p-'+String(id).replace(/[^A-Za-z0-9_-]/g,'');
const okSt=s=>ST.some(x=>x[0]===s)?s:'borrador';
const stLabel=k=>(ST.find(s=>s[0]===k)||ST[0])[1];
const folders=()=>S.config.folders;
const curMonth=()=>today().slice(0,7);
const shiftMonth=(k,d)=>{const [y,m]=k.split('-').map(Number);const x=new Date(y,m-1+d,1);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')};
const newId=()=>{const c='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';let s='p';for(const b of crypto.getRandomValues(new Uint8Array(15)))s+=c[b%62];return s};
const mk=k=>k||'sin-fecha';
function route(){
  const parts=decodeURIComponent(location.hash.slice(1)).split('--');
  if(parts[0]==='calendario')return {cal:true,month:/^\d{4}-\d{2}$/.test(parts[1]||'')?parts[1]:curMonth()};
  const f=folders().find(x=>x.id===parts[0])||folders()[0];
  let month=null;if(parts[1]==='sin-fecha')month='';else if(/^\d{4}-\d{2}$/.test(parts[1]||''))month=parts[1];
  const post=parts[2]&&parts[2].startsWith('p-')?parts[2].slice(2):null;
  return {f,month,post};
}
const cur=()=>route().f||folders()[0];
const postHref=it=>'#'+it.folder+'--'+mk(monthKey(it))+'--p-'+it.id;
const fmtLong=d=>{if(!d)return'';const x=new Date(d+'T12:00');return isNaN(x)?'':x.toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'})};
const all=()=>S.items.concat(S.priv);
const inFolder=id=>all().filter(i=>i.folder===id).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||(b.created||0)-(a.created||0));
const ratio=f=>RAT.includes(f.ratio)?f.ratio:'4/5';
const cls=f=>({'9/16':'r916','1/1':'r11'})[ratio(f)]||'r45';
const fmt=d=>{if(!d)return'';const x=new Date(d+'T12:00');return isNaN(x)?'':x.toLocaleDateString('es-AR',{day:'numeric',month:'short'})};
const fmtTs=t=>t?new Date(t).toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'numeric'}):'';
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const stOpts=v=>ST.map(([k,l])=>`<option value="${k}"${k===v?' selected':''}>${l}</option>`).join('');
const dbErr=e=>e&&e.code==='quota_exceeded'?'Se llenó el espacio de la app. Borrá contenido viejo para seguir.':e&&e.code==='invalid_argument'?'No tenés permiso para guardar cambios.':'No se pudo guardar. Probá de nuevo.';
const upErr=e=>({too_large:'Uno de los archivos pesa más de 20 MB.',unsupported_type:'Uno de los archivos tiene un formato no compatible.',quota_or_state:'Se llenó el espacio de almacenamiento. Borrá placas viejas para subir nuevas.',rate_limited:'Demasiadas subidas seguidas. Esperá un momento y probá de nuevo.'})[e&&e.code]||'No se pudo subir. Probá de nuevo.';

function render(){renderHeader();renderTabs();renderView()}
function decorate(){if(!S.cm)return;document.querySelectorAll('[data-act=comment]').forEach(b=>{const el=b.dataset.el||pid(b.dataset.id);b.dataset.base=b.dataset.base||b.textContent;const n=S.cm.count(el);b.textContent=b.dataset.base+(n?' ('+n+')':'')})}
function renderHeader(){
  const b=S.config.brand||'Tu marca';
  $('#brandName').textContent=b;
  const av=$('#avatar');av.innerHTML=avatarInner();if(!S.avDrag)applyAv(av,avZoom());
  if(S.canEdit){av.setAttribute('role','button');av.tabIndex=0;av.dataset.act='settings';av.setAttribute('aria-label','Cambiar foto de perfil');av.classList.add('editable')}
  const media=S.items.filter(i=>folders().some(f=>f.id===i.folder&&f.kind==='media'));
  const rev=media.filter(i=>i.status==='revision').length;
  const p=[];if(S.config.handle)p.push(S.config.handle);
  p.push(media.length+(media.length===1?' publicación':' publicaciones'));
  if(rev)p.push(rev+' en revisión');const chg=media.filter(i=>i.status==='cambios').length;if(chg)p.push(chg+(chg===1?' con cambios pedidos':' con cambios pedidos'));
  $('#brandSub').textContent=p.join(' · ');
  $('#ownerActions').hidden=!S.canEdit;
}
function avatarInner(){return S.config.avatar?`<img src="${blob(S.config.avatar)}" alt="">`:esc(((S.config.brand||'Tu marca').trim()[0]||'T').toUpperCase())}
const avZoom=()=>Math.min(300,Math.max(50,+S.config.avatarZoom||100));
function applyAv(el,zm){if(!el)return;el.style.setProperty('--avz',zm/100)}
function avRow(){return `<div class="avatar" id="sAv" style="--avz:${avZoom()/100}">${avatarInner()}</div><div class="form" style="gap:8px;flex:1 1 220px"><div class="row">${S.assets?`<button type="button" data-act="pickav">${S.config.avatar?'Cambiar foto':'Subir foto'}</button>`:''}${S.config.avatar?'<button type="button" class="danger" data-act="rmav">Quitar</button>':''}</div><p class="msg" id="avMsg">Foto de perfil de la marca. Se ve redonda, como en Instagram.</p></div>
${S.config.avatar?`<div class="avctl"><label for="avZoom">Tamaño de la foto <input type="range" id="avZoom" min="50" max="300" step="5" value="${avZoom()}"><output id="avZoomOut">${avZoom()}%</output></label></div>`:''}`}
async function saveConfig(patch){
  const ref=S.db.doc('config/main');
  try{await ref.update(patch)}catch(e){
    if(e&&e.code==='invalid_argument'){const d=await ref.get().catch(()=>null);if(d&&d.exists)throw e;await ref.set({brand:S.config.brand,handle:S.config.handle,folders:S.config.folders,avatar:S.config.avatar||'',avatarZoom:avZoom(),...patch})}else throw e}
  Object.assign(S.config,patch);renderHeader();renderTabs();
}
async function setAvatar(file){
  const m=$('#avMsg');if(!S.assets||!m)return;
  const type=/^image\/(png|jpeg|webp|gif)$/.test(file.type)?file.type:extType(file.name);
  if(!type||!type.startsWith('image/')){m.textContent='Elegí una imagen PNG, JPG, WEBP o GIF.';return}
  if(file.size>20971520){m.textContent='La imagen pesa más de 20 MB.';return}
  m.textContent='Subiendo foto…';let r;
  try{r=await S.assets.upload(file,{type})}catch(e){m.textContent=upErr(e);return}
  const old=S.config.avatar;
  try{await saveConfig({avatar:r.id});S.config.avatar=r.id;if(old)S.assets.delete(old).catch(()=>{});$('#avWrap').innerHTML=avRow();$('#avMsg').textContent='Foto actualizada.';renderHeader()}catch(e){m.textContent=dbErr(e);S.assets.delete(r.id).catch(()=>{})}
}
async function removeAvatar(){
  const old=S.config.avatar;if(!old)return;
  try{await saveConfig({avatar:''});S.config.avatar='';S.assets?.delete(old).catch(()=>{});$('#avWrap').innerHTML=avRow();renderHeader()}catch(e){$('#avMsg').textContent=dbErr(e)}
}
function renderTabs(){
  const r=route();
  $('#tabs').innerHTML=folders().map(f=>{const on=!r.cal&&f.id===r.f.id;return `<a class="tab${on?' on':''}" href="#${esc(f.id)}"${on?' aria-current="page"':''}>${esc(f.name)}<span>${all().filter(i=>i.folder===f.id).length}</span></a>`}).join('')
    +`<a class="tab${r.cal?' on':''}" href="#calendario"${r.cal?' aria-current="page"':''}>Calendario</a>`+(S.canEdit?'<button type="button" class="tab add" data-act="addFolder">+ Carpeta</button>':'');
}
let barKey='';
const noticeHtml=()=>S.err?`<div class="notice">${esc(S.err)}</div>`:S.slow?'<div class="notice">El contenido está tardando en cargar. Puede que lo que ves no esté actualizado.</div>':'';
function renderView(){renderView0();decorate()}
function renderView0(){
  const r=route(),v=$('#view');
  if(S.failed){barKey='';v.innerHTML=`<div class="empty"><div><h2>No se pudo abrir el contenido</h2><p class="msg">No se pudo abrir el contenido. Revisá tu conexión y recargá la página.</p></div></div>`;return}
  if(!r.cal&&r.f.kind==='notes'){
    const f=r.f,key=['notes',f.id,f.name,S.canEdit,!!S.uid].join('|');
    if(key!==barKey){barKey=key;v.innerHTML=`<div class="nbar">${notesBar(f)}</div><div id="notice"></div><div id="grid"></div>`}
    $('#notice').innerHTML=noticeHtml();$('#grid').innerHTML=notesGrid(f);return}
  barKey='';
  v.innerHTML=noticeHtml()+(r.cal?calView(r.month):r.post?postView(r.f,r.post):r.month!==null?monthView(r.f,r.month):monthsView(r.f));
}
function thumb(a){if(!a)return'';return a.video?`<video src="${blob(a.id)}#t=0.1" muted playsinline preload="metadata"></video><span class="play" aria-hidden="true"></span>`:`<img src="${blob(a.id)}" alt="" loading="lazy">`}
const monthKey=i=>{if(i.date&&/^\d{4}-\d{2}/.test(i.date))return i.date.slice(0,7);if(i.created){const d=new Date(i.created);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}return ''};
const monthLabel=k=>{if(!k)return 'Sin fecha';const [y,m]=k.split('-').map(Number);const n=new Date(y,m-1,1).toLocaleDateString('es-AR',{month:'long'});return n[0].toUpperCase()+n.slice(1)+' '+y};
function byMonth(list){const g=new Map();for(const i of list){const k=monthKey(i);if(!g.has(k))g.set(k,[]);g.get(k).push(i)}return [...g.entries()].sort((a,b)=>!a[0]?1:!b[0]?-1:b[0].localeCompare(a[0]))}
const monthHead=(k,n,word)=>`<h2 class="mhead">${monthLabel(k)}<span>${n} ${n===1?word[0]:word[1]}</span></h2>`;
const pubs=n=>n+' '+(n===1?'publicación':'publicaciones'),placas=n=>n+' '+(n===1?'placa':'placas');
function skeleton(f){return `<div class="grid ${cls(f)}">${Array.from({length:6},()=>`<div class="media skel" style="aspect-ratio:${ratio(f)}"></div>`).join('')}</div>`}
const asc=(a,b)=>String(a.date||'').localeCompare(String(b.date||''))||(a.created||0)-(b.created||0);
function crumbs(parts){return `<nav class="crumbs" aria-label="Ubicación">${parts.map((p,i)=>i<parts.length-1?`<a href="${esc(p[1])}">${esc(p[0])}</a><span aria-hidden="true">›</span>`:`<span aria-current="page">${esc(p[0])}</span>`).join('')}</nav>`}
function postCard(i,f,feed){
  const as=Array.isArray(i.assets)?i.assets:[],st=okSt(i.status),n=as.length;
  return `<a class="card${n>1?' multi':''}" id="${pid(i.id)}" data-comment-target href="${esc(postHref(i))}" aria-label="${esc(i.title||'Publicación')}, ${placas(n)} (${stLabel(st)})"><div class="media" style="aspect-ratio:${ratio(f)}">${thumb(as[0])}${n>1?`<span class="badge">${placas(n)}</span>`:''}${feed?`<span class="dot st-${st}" title="${stLabel(st)}"></span>`:''}</div>${feed?'':`<div class="meta"><span class="chip st-${st}">${stLabel(st)}</span><span>${fmt(i.date)}</span></div><div class="ttl">${esc(i.title||(n>1?'Carrusel sin título':'Sin título'))}</div>`}</a>`;
}
function monthsView(f){
  if(!S.loaded)return skeleton(f);
  const groups=byMonth(inFolder(f.id)),ed=S.canEdit&&S.assets,have=new Set(groups.map(g=>g[0]));
  if(S.canEdit)for(const k of [curMonth(),shiftMonth(curMonth(),1)])if(!have.has(k))groups.push([k,[]]);
  groups.sort((a,b)=>!a[0]?1:!b[0]?-1:b[0].localeCompare(a[0]));
  if(!groups.length)return emptyMedia(f);
  return `<div class="bar"><div><h2 class="vtitle">${esc(f.name)}</h2><p class="msg">Elegí un mes para ver lo que se publica.</p></div>${ed?`<button type="button" class="primary" data-act="upload">Subir a ${esc(f.name)}</button>`:''}</div>
  <div class="mgrid">${groups.map(([k,its])=>{const sl=its.reduce((n,i)=>n+(i.assets||[]).length,0),cv=its.slice(0,4).map(i=>(i.assets||[])[0]).filter(Boolean);
    return `<a class="mcard" href="#${esc(f.id)}--${mk(k)}"><div class="mcover n${cv.length}">${cv.length?cv.map(a=>`<div>${thumb(a)}</div>`).join(''):'<div class="mempty">Vacío</div>'}</div><div class="minfo"><h3>${monthLabel(k)}</h3><p class="msg">${its.length?pubs(its.length)+' · '+placas(sl):'Todavía sin publicaciones'}</p></div></a>`}).join('')}</div>`;
}
function filterBar(){
  return `<div class="bar"><div class="chips" role="group" aria-label="Filtrar por estado">${[['todas','Todas'],...ST].map(([k,l])=>`<button type="button" class="fchip${S.filter===k?' on':''}" data-act="filter" data-v="${k}" aria-pressed="${S.filter===k}">${l}</button>`).join('')}</div>
  <div class="seg" role="group" aria-label="Vista">${[['grilla','Grilla'],['feed','Feed']].map(([k,l])=>`<button type="button" class="${S.mode===k?'on':''}" data-act="mode" data-v="${k}" aria-pressed="${S.mode===k}">${l}</button>`).join('')}</div></div>`;
}
function monthView(f,k){
  if(!S.loaded)return skeleton(f);
  let list=inFolder(f.id).filter(i=>monthKey(i)===k).sort(asc);const total=list.length,ed=S.canEdit&&S.assets,feed=S.mode==='feed';
  const head=crumbs([[f.name,'#'+f.id],[monthLabel(k)]])+`<div class="bar"><div><h2 class="vtitle">${monthLabel(k)}</h2><p class="msg">${esc(f.name)}${total?' · '+pubs(total):''}</p></div>${ed?`<button type="button" class="primary" data-act="upload">Subir a ${monthLabel(k)}</button>`:''}</div>`;
  if(!total)return head+`<div class="empty"><div><h2>${ed?'Este mes está vacío':'Todavía no hay publicaciones en este mes'}</h2><p class="msg">${ed?'Subí las placas de este mes. Si subís varias juntas, podés armar un carrusel.':'Cuando haya contenido de este mes, va a aparecer acá.'}</p></div>${ed?'<button type="button" class="primary" data-act="upload">Elegir archivos</button>':''}</div>`;
  if(S.filter!=='todas')list=list.filter(i=>okSt(i.status)===S.filter);
  return head+filterBar()+(list.length?`<div class="grid ${cls(f)}${feed?' feed':''}">${list.map(i=>postCard(i,f,feed)).join('')}</div>`:`<p class="msg">No hay publicaciones en estado “${esc(stLabel(S.filter))}” en este mes.</p>`);
}
function postView(f,id){
  if(!S.loaded)return skeleton(f);
  const it=S.items.find(i=>i.id===id);
  if(!it)return crumbs([[f.name,'#'+f.id],['Publicación']])+`<div class="empty"><div><h2>Esta publicación ya no está</h2><p class="msg">Puede que la hayan borrado.</p></div><a class="btnlink" href="#${esc(f.id)}">Volver a ${esc(f.name)}</a></div>`;
  const pf=folders().find(x=>x.id===it.folder)||f,k=monthKey(it),as=Array.isArray(it.assets)?it.assets:[],st=okSt(it.status),n=as.length,ed=S.canEdit;
  const title=it.title||(n>1?'Carrusel sin título':'Sin título');
  const head=crumbs([[pf.name,'#'+pf.id],[monthLabel(k),'#'+pf.id+'--'+mk(k)],[title]]);
  const info=`<div class="phead" id="${pid(it.id)}" data-comment-target><div class="ptitle"><h2 class="vtitle">${esc(title)}</h2><div class="row"><span class="chip st-${st}">${stLabel(st)}</span>${it.date?`<span class="msg">Se publica el ${fmtLong(it.date)}</span>`:''}<span class="msg">· ${placas(n)}</span></div></div>
  <div class="row">${ed&&S.assets?'<button type="button" class="primary" data-act="addslides">Agregar placas</button>':''}${ed?`<button type="button" data-act="edit" data-id="${esc(it.id)}">Editar datos</button>`:''}${S.comments?`<button type="button" data-act="comment" data-el="${pid(it.id)}">Comentar publicación</button>`:''}${ed?`<button type="button" class="danger" data-act="pdel" data-id="${esc(it.id)}">Eliminar</button>`:''}</div></div>
  <p class="msg" id="postMsg" aria-live="polite">${esc(S.postMsg||'')}</p>${reviewBox(it)}
  ${it.copy?`<div class="pcopy"><div class="row" style="justify-content:space-between"><strong>Copy</strong><button type="button" data-act="copy" data-id="${esc(it.id)}">Copiar texto</button></div><pre class="copy">${esc(it.copy)}</pre></div>`:''}`;
  const slides=n?`<div class="grid ${cls(pf)} slides">${as.map((a,j)=>`<div class="slide" id="s-${pid(it.id)}-${j}" data-comment-target><button type="button" class="card" data-act="open" data-id="${esc(it.id)}" data-s="${j}" aria-label="Ver placa ${j+1} de ${n}"><div class="media" style="aspect-ratio:${ratio(pf)}">${thumb(a)}<span class="num">${j+1}</span></div></button>${ed?`<div class="sl-tools"><button type="button" data-act="mv" data-id="${esc(it.id)}" data-s="${j}" data-d="-1"${j===0?' disabled':''} aria-label="Mover antes">←</button><button type="button" data-act="mv" data-id="${esc(it.id)}" data-s="${j}" data-d="1"${j===n-1?' disabled':''} aria-label="Mover después">→</button><button type="button" class="danger" data-act="rmslide" data-id="${esc(it.id)}" data-s="${j}">Quitar</button></div>`:''}</div>`).join('')}</div>`
    :`<div class="empty"><div><h2>Sin placas todavía</h2><p class="msg">${ed?'Agregá las placas de esta publicación.':'Todavía no hay placas en esta publicación.'}</p></div>${ed&&S.assets?'<button type="button" class="primary" data-act="addslides">Agregar placas</button>':''}</div>`;
  return head+info+slides;
}
function calView(k){
  if(!S.loaded)return '<div class="cal skel" style="height:420px"></div>';
  const media=folders().filter(f=>f.kind==='media'),items=S.items.filter(i=>media.some(f=>f.id===i.folder)),inMonth=items.filter(i=>monthKey(i)===k);
  const [y,m]=k.split('-').map(Number),days=new Date(y,m,0).getDate(),lead=(new Date(y,m-1,1).getDay()+6)%7,t=today(),byDay={};
  for(const i of inMonth)if(i.date&&i.date.startsWith(k)){const d=+i.date.slice(8,10);(byDay[d]=byDay[d]||[]).push(i)}
  const months=[...new Set(items.map(monthKey).filter(Boolean).concat([curMonth()]))].sort().reverse();
  const cells='<div class="day out"></div>'.repeat(lead)+Array.from({length:days},(_,d)=>{d++;const its=byDay[d]||[],iso=k+'-'+String(d).padStart(2,'0');
    const pr=['cambios','revision','borrador','aprobada','publicada'].find(s=>its.some(i=>okSt(i.status)===s))||'borrador';
    return `<div class="day${iso===t?' today':''}${its.length?' has':''}"><span class="dn">${d}</span>${its.length?`<div class="dthumbs">${its.slice(0,3).map(i=>{const f=media.find(x=>x.id===i.folder);return `<a class="b-${okSt(i.status)}" href="${esc(postHref(i))}" title="${esc(f.name+': '+(i.title||'Sin título')+' · '+stLabel(okSt(i.status)))}" style="aspect-ratio:${ratio(f)}">${thumb((i.assets||[])[0])}</a>`}).join('')}${its.length>3?`<button type="button" class="more" data-act="day" data-d="${iso}">+${its.length-3}</button>`:''}</div><button type="button" class="dcount" data-act="day" data-d="${iso}" aria-label="Ver ${pubs(its.length)} del ${d}"><span class="st-${pr}">${its.length}</span></button>`:''}</div>`}).join('');
  const list=inMonth.slice().sort(asc),up=t;
  const sections=list.length?`<section class="month"><h2 class="mhead">Agenda del mes<span>${pubs(list.length)}</span></h2><div class="daylist">${list.map(i=>{const f=media.find(x=>x.id===i.folder),st=okSt(i.status),n=(i.assets||[]).length,past=i.date&&i.date<up&&st!=='publicada';
    return `<a class="drow" href="${esc(postHref(i))}"><div class="media" style="aspect-ratio:${ratio(f)}">${thumb((i.assets||[])[0])}</div><div class="ptitle" style="gap:4px"><span class="msg">${i.date?esc(fmtLong(i.date)):'Sin fecha'} · ${esc(f.name)} · ${placas(n)}</span><strong>${esc(i.title||'Sin título')}</strong><span><span class="chip st-${st}">${stLabel(st)}</span>${past?' <span class="chip st-revision">Fecha pasada</span>':''}</span></div></a>`}).join('')}</div></section>`:'';
  const cnt=s=>inMonth.filter(i=>okSt(i.status)===s).length,legend=ST.map(([k,l])=>`<span class="lg"><i class="dot2 st-${k}"></i>${l}${inMonth.length?' '+cnt(k):''}</span>`).join('');
  return `<div class="calhead"><a class="navb" href="#calendario--${shiftMonth(k,-1)}" aria-label="Mes anterior">‹</a><h2 class="vtitle">${monthLabel(k)}</h2><a class="navb" href="#calendario--${shiftMonth(k,1)}" aria-label="Mes siguiente">›</a>${k!==curMonth()?`<a class="btnlink" href="#calendario--${curMonth()}">Hoy</a>`:''}</div>
  <div class="chips mchips">${months.slice(0,12).map(x=>`<a class="fchip${x===k?' on':''}" href="#calendario--${x}">${monthLabel(x)}</a>`).join('')}</div>
  <div class="legend">${legend}</div><div class="cal"><div class="wk">${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=>`<span>${d}</span>`).join('')}</div><div class="days">${cells}</div></div>
  ${sections||`<p class="msg" style="margin-top:24px">No hay publicaciones en ${monthLabel(k).toLowerCase()}.</p>`}`;
}
function openDay(iso){
  const media=folders().filter(f=>f.kind==='media'),its=S.items.filter(i=>i.date===iso&&media.some(f=>f.id===i.folder)).sort(asc);
  const t=fmtLong(iso);
  openSheet(`<h2>${t[0].toUpperCase()+t.slice(1)}</h2><div class="daylist">${its.map(i=>{const f=media.find(x=>x.id===i.folder),st=okSt(i.status),n=(i.assets||[]).length;
    return `<a class="drow" href="${esc(postHref(i))}"><div class="media" style="aspect-ratio:${ratio(f)}">${thumb((i.assets||[])[0])}</div><div class="ptitle" style="gap:4px"><span class="msg">${esc(f.name)} · ${placas(n)}</span><strong>${esc(i.title||'Sin título')}</strong><span><span class="chip st-${st}">${stLabel(st)}</span></span></div></a>`}).join('')}</div>`,'sm');
}
function emptyMedia(f){
  const n=ratio(f)==='9/16'?4:3,ed=S.canEdit&&S.assets;
  return `<div class="empty"><div class="ghosts">${Array.from({length:n},(_,k)=>`<div class="ghost-tile" style="aspect-ratio:${ratio(f)};opacity:${(1-k*.2).toFixed(2)}"></div>`).join('')}</div>
  <div><h2>${ed?'Subí tus primeras placas':'Todavía no hay placas acá'}</h2><p class="msg">${ed?'Arrastrá imágenes o videos a esta zona, o elegilos desde tu dispositivo. Se ordenan solas por mes según la fecha de publicación.':'Cuando haya contenido nuevo en esta carpeta, va a aparecer acá.'}</p></div>${ed?'<button type="button" class="primary" data-act="upload">Elegir archivos</button>':''}</div>`;
}
function notesBar(f){
  return `${S.canEdit?`<form class="composer" id="composer"><input id="nTitle" placeholder="Título (opcional)" maxlength="120" aria-label="Título"><textarea id="nText" placeholder="Anotá una idea, un copy, una referencia…" aria-label="Idea"></textarea><div class="row" style="justify-content:space-between">${S.uid?'<label class="check"><input type="checkbox" id="nPriv"> Solo para mí (tus clientes no la ven)</label>':'<span></span>'}<button class="primary" type="submit">Guardar idea</button></div><p class="msg" id="nMsg"></p></form>`:''}<input type="search" id="nSearch" placeholder="Buscar en ${esc(f.name.toLowerCase())}…" aria-label="Buscar" value="${esc(S.q)}">`;
}
function notesGrid(f){
  if(!S.loaded)return '<div class="notes">'+'<div class="ncard skel" style="height:140px"></div>'.repeat(3)+'</div>';
  let list=inFolder(f.id);const q=S.q.toLowerCase().trim();
  if(q)list=list.filter(n=>((n.title||'')+' '+(n.text||'')).toLowerCase().includes(q));
  if(!list.length)return `<p class="msg">${q?'Ninguna idea coincide con la búsqueda.':S.canEdit?'Todavía no anotaste ideas. Escribí la primera arriba.':'Todavía no hay ideas compartidas.'}</p>`;
  return byMonth(list).map(([k,items])=>`<section class="month">${monthHead(k,items.length,['idea','ideas'])}<div class="notes">${items.map(n=>{const inner=`${n.title?`<h3>${esc(n.title)}</h3>`:''}<p>${esc(n.text)}</p><div class="nmeta">${fmtTs(n.created)}${n.private?' · Solo vos':''}</div>`;
    return S.canEdit?`<button type="button" class="ncard edit" id="${pid(n.id)}" data-comment-target data-act="note" data-id="${esc(n.id)}" data-p="${n.private?1:0}">${inner}</button>`:`<div class="ncard" id="${pid(n.id)}" data-comment-target>${inner}${S.comments?`<div class="row" style="margin-top:12px"><button type="button" data-act="comment" data-id="${esc(n.id)}">Comentar</button></div>`:''}</div>`}).join('')}</div></section>`).join('');
}

function openSheet(html,size){
  S.open=null;const sh=$('#sheet');sh.className='sheet '+(size||'');
  sh.innerHTML='<button type="button" class="x" data-act="close" aria-label="Cerrar">✕</button>'+html;
  $('#ov').hidden=false;document.body.style.overflow='hidden';sh.focus();decorate();
}
function closeSheet(){$('#ov').hidden=true;$('#sheet').innerHTML='';document.body.style.overflow='';S.open=null;S.cmOpen=null;S.urls.forEach(u=>URL.revokeObjectURL(u));S.urls=[]}

const OK=/^(image\/(png|jpeg|webp|gif)|video\/(mp4|webm))$/;
const extType=n=>({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',mp4:'video/mp4',webm:'video/webm'})[(n.split('.').pop()||'').toLowerCase()];
function openUpload(files){
  const r=route(),f=cur();if(r.cal||f.kind!=='media'||!S.assets||!files.length)return;
  const list=files.map(x=>({file:x,type:OK.test(x.type)?x.type:extType(x.name)}));
  const good=list.filter(x=>x.type&&x.file.size<=20971520),bad=list.length-good.length;
  if(!good.length){openSheet('<h2>No se pueden subir esos archivos</h2><p class="msg">Usá imágenes PNG, JPG, WEBP o GIF, o videos MP4 o WEBM de hasta 20 MB.</p><div class="row end" style="margin-top:18px"><button class="primary" type="button" data-act="close">Entendido</button></div>','sm');return}
  S.pending=good;const urls=good.map(x=>URL.createObjectURL(x.file)),n=good.length;
  const date=r.month&&r.month!==curMonth()?r.month+'-01':today(),car=ratio(f)!=='9/16';
  const mf=folders().filter(x=>x.kind==='media');
  openSheet(`<h2>Subir a ${esc(f.name)}</h2><div class="thumbs">${good.map((x,k)=>x.type.startsWith('video')?`<video src="${urls[k]}" muted></video>`:`<img src="${urls[k]}" alt="">`).join('')}</div>
  ${bad?`<p class="msg err" style="margin-bottom:12px">Se omitieron ${bad} archivo(s): formato no compatible o más de 20 MB.</p>`:''}
  <form id="upForm" class="form">
  ${n>1?`<fieldset class="radios"><legend>¿Cómo las subo?</legend><label class="check"><input type="radio" name="uMode" value="one"${car?' checked':''}> Una sola publicación con ${n} placas (carrusel)</label><label class="check"><input type="radio" name="uMode" value="many"${car?'':' checked'}> ${n} publicaciones separadas</label></fieldset>`:''}
  <label class="f">Título de la publicación <input id="uTitle" maxlength="120" placeholder="Ej.: Carrusel beneficios del corte"></label>
  <div class="two"><label class="f">Fecha de publicación <input type="date" id="uDate" value="${date}"></label><label class="f">Estado <select id="uStatus">${stOpts('revision')}</select></label></div>
  <p class="msg">Se guarda en la carpeta del mes de esta fecha.</p>
  <label class="f">Copy de la publicación <textarea id="uCopy" placeholder="Opcional"></textarea></label>
  <label class="f">Carpeta <select id="uFolder">${mf.map(x=>`<option value="${esc(x.id)}"${x.id===f.id?' selected':''}>${esc(x.name)}</option>`).join('')}</select></label>
  <p class="msg" id="uMsg"></p><div class="row end"><button type="button" data-act="close">Cancelar</button><button class="primary" type="submit" id="uGo">Subir ${n>1?n+' archivos':'archivo'}</button></div></form>`);
  S.urls=urls;
}
async function doUpload(){
  const go=$('#uGo'),msg=$('#uMsg');go.disabled=true;msg.classList.remove('err');
  const base={title:$('#uTitle').value.trim(),date:$('#uDate').value,status:$('#uStatus').value,copy:$('#uCopy').value.trim(),folder:$('#uFolder').value};
  const one=S.pending.length===1||document.querySelector('input[name=uMode]:checked')?.value==='one',up=[];
  try{
    for(let k=0;k<S.pending.length;k++){msg.textContent=`Subiendo ${k+1} de ${S.pending.length}…`;const x=S.pending[k];const r=await S.assets.upload(x.file,{type:x.type});up.push({id:r.id,video:String(r.contentType).startsWith('video')})}
    msg.textContent='Guardando…';const now=Date.now();let first=null;
    if(one){first={...base,assets:up,created:now,id:newId()};const {id,...body}=first;await S.db.doc('items/'+id).set(body)}
    else for(let k=0;k<up.length;k++){const id=newId();await S.db.doc('items/'+id).set({...base,assets:[up[k]],created:now-k})}
    S.filter='todas';closeSheet();
    const target=one?postHref(first):'#'+base.folder+'--'+mk(monthKey({...base,created:now}));
    if(location.hash===target)render();else location.hash=target;
  }catch(e){msg.textContent=up.length===S.pending.length?dbErr(e):upErr(e);msg.classList.add('err');go.disabled=false}
}
async function addSlides(id,files){
  const it=S.items.find(i=>i.id===id);if(!it||!S.assets)return;
  const list=files.map(x=>({file:x,type:OK.test(x.type)?x.type:extType(x.name)})).filter(x=>x.type&&x.file.size<=20971520);
  if(!list.length){S.postMsg='Usá imágenes PNG, JPG, WEBP o GIF, o videos MP4 o WEBM de hasta 20 MB.';renderView();return}
  const up=[];
  try{for(let k=0;k<list.length;k++){S.postMsg=`Subiendo ${k+1} de ${list.length}…`;renderView();const r=await S.assets.upload(list[k].file,{type:list[k].type});up.push({id:r.id,video:String(r.contentType).startsWith('video')})}
    const fresh=S.items.find(i=>i.id===id)||it;await S.db.doc('items/'+id).update({assets:[...(fresh.assets||[]),...up]});S.postMsg=`Listo: se ${up.length===1?'agregó 1 placa':'agregaron '+up.length+' placas'}.`}
  catch(e){S.postMsg=up.length===list.length?dbErr(e):upErr(e)}
  renderView();
}
async function moveSlide(id,j,d){
  const it=S.items.find(i=>i.id===id);if(!it)return;const as=[...(it.assets||[])],k=j+d;if(k<0||k>=as.length)return;
  [as[j],as[k]]=[as[k],as[j]];try{await S.db.doc('items/'+id).update({assets:as});S.postMsg=''}catch(e){S.postMsg=dbErr(e);renderView()}
}
async function removeSlide(id,j){
  const it=S.items.find(i=>i.id===id);if(!it)return;const as=[...(it.assets||[])],[gone]=as.splice(j,1);
  try{await S.db.doc('items/'+id).update({assets:as});if(gone)S.assets?.delete(gone.id).catch(()=>{});S.postMsg='Placa quitada.'}catch(e){S.postMsg=dbErr(e)}renderView();
}
function openDetail(id,slide){
  const it=S.items.find(i=>i.id===id);if(!it)return;
  const f=folders().find(x=>x.id===it.folder)||cur();
  const as=Array.isArray(it.assets)?it.assets:[];slide=Math.max(0,Math.min(slide||0,as.length-1));const a=as[slide];
  const media=a?(a.video?`<video src="${blob(a.id)}" controls playsinline autoplay muted loop></video>`:`<img src="${blob(a.id)}" alt="${esc(it.title||'Placa')}">`):'';
  const nav=as.length>1?`<button type="button" class="nav l" data-act="slide" data-id="${esc(id)}" data-s="${slide-1}"${slide===0?' disabled':''} aria-label="Placa anterior">‹</button><button type="button" class="nav r" data-act="slide" data-id="${esc(id)}" data-s="${slide+1}"${slide===as.length-1?' disabled':''} aria-label="Placa siguiente">›</button><div class="dots">${as.map((_,k)=>`<i class="${k===slide?'on':''}"></i>`).join('')}</div>`:'';
  const el=`s-${pid(id)}-${slide}`;
  const cbtn=S.comments?`<div class="cbox"><button type="button" class="primary" data-act="comment" data-el="${el}">Comentar esta placa</button><p class="msg">${S.canEdit?'Dejá una nota sobre esta placa. Tu cliente también la puede ver.':'Contanos qué te gusta o qué cambiarías. Tu comentario queda pegado a esta placa.'}</p></div>`:'';
  openSheet(`<div class="detail"><div class="viewer" style="aspect-ratio:${ratio(f)}">${media}${nav}</div><div class="side"><p class="msg">Placa ${slide+1} de ${as.length}</p>${viewSide(it,f)}${reviewBox(it)}${cbtn}</div></div>`);
  S.open={id,slide};
}
function reviewBox(it){
  if(S.canEdit||!S.cm)return '';const st=okSt(it.status);
  if(!['revision','aprobada','cambios'].includes(st))return `<p class="msg">${st==='publicada'?'Esta publicación ya fue publicada.':'Todavía no está lista para revisar.'}</p>`;
  const who=it.reviewedBy&&st!=='revision'?' ('+esc(it.reviewedBy)+')':'';
  return `<div class="cbox"><p class="msg">${st==='aprobada'?'Aprobaste esta publicación'+who+'.':st==='cambios'?'Pediste cambios en esta publicación'+who+'.':'¿Está lista para publicar?'}</p><div class="row"><button type="button" class="primary" data-act="approve" data-id="${esc(it.id)}"${st==='aprobada'?' disabled':''}>Aprobar</button><button type="button" data-act="changes" data-id="${esc(it.id)}">Pedir cambios</button></div><p class="msg rvmsg" aria-live="polite"></p></div>`;
}
function viewSide(it,f){const st=okSt(it.status);
  return `<p class="msg">${esc(f.name)}${it.date?' · '+fmt(it.date):''}</p><h2>${esc(it.title||'Sin título')}</h2><div><span class="chip st-${st}">${stLabel(st)}</span></div>${it.copy?`<div><div class="row" style="justify-content:space-between"><strong>Copy</strong><button type="button" data-act="copy" data-id="${esc(it.id)}">Copiar texto</button></div><pre class="copy">${esc(it.copy)}</pre></div>`:''}`;
}
function openEdit(id){
  const it=S.items.find(i=>i.id===id);if(!it)return;const mf=folders().filter(x=>x.kind==='media');
  openSheet(`<h2>Editar publicación</h2><form id="edForm" data-id="${esc(it.id)}" class="form"><label class="f">Título <input id="eTitle" value="${esc(it.title)}" maxlength="120"></label>
  <div class="two"><label class="f">Fecha de publicación <input type="date" id="eDate" value="${esc(it.date)}"></label><label class="f">Estado <select id="eStatus">${stOpts(okSt(it.status))}</select></label></div>
  <p class="msg">Si cambiás la fecha a otro mes, la publicación pasa a la carpeta de ese mes.</p>
  <label class="f">Copy <textarea id="eCopy">${esc(it.copy)}</textarea></label>
  <label class="f">Carpeta <select id="eFolder">${mf.map(x=>`<option value="${esc(x.id)}"${x.id===it.folder?' selected':''}>${esc(x.name)}</option>`).join('')}</select></label>
  <p class="msg" id="eMsg"></p><div class="row end"><button type="button" data-act="close">Cancelar</button><button class="primary" type="submit">Guardar cambios</button></div></form>`,'sm');
}
async function delItem(id){
  const it=S.items.find(i=>i.id===id);if(!it)return;
  try{await S.db.doc('items/'+id).delete();closeSheet();for(const a of (it.assets||[]))S.assets?.delete(a.id).catch(()=>{});
    if(route().post===id)location.hash='#'+it.folder+'--'+mk(monthKey(it));}
  catch(e){const m=$('#eMsg')||$('#postMsg');if(m)m.textContent=dbErr(e)}
}

const noteRef=(id,p)=>p?S.db.collection('data/users/'+S.uid).doc(id):S.db.doc('items/'+id);
function openNote(id,p){
  const n=(p?S.priv:S.items).find(x=>x.id===id);if(!n)return;
  openSheet(`<h2>Editar idea</h2><form id="noteForm" data-id="${esc(id)}" data-p="${p?1:0}" class="form"><label class="f">Título <input id="ntTitle" value="${esc(n.title)}" maxlength="120"></label><label class="f">Idea <textarea id="ntText" rows="8">${esc(n.text)}</textarea></label>${S.uid?`<label class="check"><input type="checkbox" id="ntPriv"${p?' checked':''}> Solo para mí (tus clientes no la ven)</label>`:''}<p class="msg" id="ntMsg"></p><div class="row"><button class="primary" type="submit">Guardar</button><button type="button" class="danger" data-act="ndel">Eliminar</button></div></form>`,'sm');
}

function drawComments(){
  const box=$('#cmList');if(!box||!S.cmOpen)return;const me=S.cm.me(),l=S.cm.list(S.cmOpen);
  box.innerHTML=l.length?l.map(c=>`<div class="ncard" style="margin:0 0 10px"><strong>${esc(c.author_name||'Usuario')}</strong> <span class="msg">${new Date(c.created_at).toLocaleString('es-AR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span><p style="margin-top:6px">${esc(c.body)}</p>${(c.author_id===me||S.canEdit)?`<button type="button" class="danger" data-act="cmdel" data-id="${c.id}" style="min-height:36px;margin-top:8px;font-size:13px">Borrar</button>`:''}</div>`).join(''):'<p class="msg">Todavía no hay comentarios.</p>';
  box.scrollTop=box.scrollHeight;
}
async function openComments({element}){
  if(!element||!S.cm)return;const target=element.id;
  openSheet(`<h2>Comentarios</h2><div id="cmList" style="max-height:45dvh;overflow:auto;margin-bottom:14px"></div><form id="cmForm" class="form"><textarea id="cmText" maxlength="2000" placeholder="Escribí tu comentario…" aria-label="Comentario"></textarea><p class="msg" id="cmMsg"></p><div class="row end"><button type="button" data-act="close">Cerrar</button><button class="primary" type="submit">Enviar</button></div></form>`,'sm');
  S.cmOpen=target;drawComments();
}
const slug=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,24)||'carpeta';
function folderRow(f){const n=all().filter(i=>i.folder===f.id).length;
  return `<div class="frow" data-id="${esc(f.id)}"><input class="fname" value="${esc(f.name)}" aria-label="Nombre de la carpeta" maxlength="40"><span class="msg">${f.kind==='notes'?'Notas':'Placas '+ratio(f).replace('/',':')} · ${n}</span>${n?'<span></span>':'<button type="button" class="danger" data-act="rmf">Quitar</button>'}</div>`}
function openSettings(focusNew){
  openSheet(`<h2>Marca y carpetas</h2><form id="setForm" class="form"><div class="avrow" id="avWrap">${avRow()}</div><div class="two"><label class="f">Nombre de la marca <input id="sBrand" value="${esc(S.config.brand)}" placeholder="Ej.: Café Lumbre" maxlength="60"></label><label class="f">Usuario <input id="sHandle" value="${esc(S.config.handle)}" placeholder="@cafelumbre" maxlength="40"></label></div>
  <h3>Carpetas</h3><div id="fList">${folders().map(folderRow).join('')}</div><p class="msg">Solo se pueden quitar carpetas vacías.</p>
  <h3>Nueva carpeta</h3><div class="three"><label class="f">Nombre <input id="nfName" placeholder="Ej.: Campaña Navidad" maxlength="40"></label><label class="f">Tipo <select id="nfKind"><option value="media">Placas</option><option value="notes">Notas</option></select></label><label class="f">Formato <select id="nfRatio"><option value="4/5">4:5 posteo</option><option value="1/1">1:1 cuadrado</option><option value="9/16">9:16 historia o reel</option></select></label></div>
  <div class="bkwrap"><h3>Copia de seguridad</h3><div class="bk"><button type="button" data-act="bkexp">Exportar todo</button><button type="button" data-act="bkimp">Importar copia</button></div><p class="msg" id="bkMsg">Tus datos viven en este dispositivo. Exportá una copia para guardarla o pasarla a otro equipo.</p></div>
  <p class="msg" id="sMsg"></p><div class="row end"><button type="button" data-act="close">Cancelar</button><button class="primary" type="submit">Guardar</button></div></form>`,'sm');
  if(focusNew)$('#nfName').focus();
}
async function saveSettings(form){
  const old=folders(),fs=[...form.querySelectorAll('.frow')].map(r=>{const o=old.find(x=>x.id===r.dataset.id);return o?{...o,name:r.querySelector('.fname').value.trim()||o.name}:null}).filter(Boolean);
  const nn=$('#nfName').value.trim();
  if(nn){const k=$('#nfKind').value,nf={id:'f-'+slug(nn)+'-'+Math.random().toString(36).slice(2,6),name:nn,kind:k==='notes'?'notes':'media'};if(nf.kind==='media')nf.ratio=$('#nfRatio').value;fs.push(nf)}
  if(!fs.length){$('#sMsg').textContent='Tiene que quedar al menos una carpeta.';return}
  try{await saveConfig({brand:$('#sBrand').value.trim(),handle:$('#sHandle').value.trim(),folders:fs});closeSheet();if(nn)location.hash=fs[fs.length-1].id}catch(e){$('#sMsg').textContent=dbErr(e)}
}

document.addEventListener('click',async e=>{
  if(e.target.id==='ov'){closeSheet();return}
  const t=e.target.closest('[data-act]');if(!t)return;const a=t.dataset.act;
  if(a==='filter'){S.filter=t.dataset.v;renderView()}
  else if(a==='mode'){S.mode=t.dataset.v;try{localStorage.setItem('pc-mode',S.mode)}catch(_){}renderView()}
  else if(a==='upload'){S.addTo=null;$('#file').click()}
  else if(a==='addslides'){S.addTo=route().post;$('#file').click()}
  else if(a==='open')openDetail(t.dataset.id,+t.dataset.s||0);
  else if(a==='edit')openEdit(t.dataset.id);
  else if(a==='day')openDay(t.dataset.d);
  else if(a==='mv')moveSlide(t.dataset.id,+t.dataset.s,+t.dataset.d);
  else if(a==='rmslide'){if(t.dataset.sure)removeSlide(t.dataset.id,+t.dataset.s);else{t.dataset.sure='1';t.textContent='¿Seguro?'}}
  else if(a==='pdel')$('#postMsg').innerHTML=`¿Eliminar esta publicación con todas sus placas? <button type="button" class="danger" data-act="delyes" data-id="${esc(t.dataset.id)}">Sí, eliminar</button> <button type="button" data-act="no">No</button>`;
  else if(a==='slide')openDetail(t.dataset.id,+t.dataset.s);
  else if(a==='note')openNote(t.dataset.id,t.dataset.p==='1');
  else if(a==='close')closeSheet();
  else if(a==='settings'||a==='addFolder')openSettings(a==='addFolder');
  else if(a==='rmf')t.closest('.frow').remove();
  else if(a==='copy'){const it=S.items.find(i=>i.id===t.dataset.id);try{await navigator.clipboard.writeText(it.copy||'');t.textContent='¡Copiado!'}catch(_){t.textContent='No se pudo copiar'}}
  else if(a==='delyes')delItem(t.dataset.id);
  else if(a==='pickav')$('#avFile').click();
  else if(a==='rmav')removeAvatar();
  else if(a==='comment'){const el=document.getElementById(t.dataset.el||pid(t.dataset.id));closeSheet();if(!el||!S.comments)return;
    el.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    try{await S.comments.openComposer({element:el})}catch(err){if(err&&(err.code==='unavailable'||err.code==='not_granted')){S.comments=null;barKey='';renderView()}}}
  else if(a==='ndel')$('#ntMsg').innerHTML='¿Eliminar esta idea? <button type="button" class="danger" data-act="ndelyes">Sí, eliminar</button> <button type="button" data-act="no">No</button>';
  else if(a==='ndelyes'){const fm=$('#noteForm');try{await noteRef(fm.dataset.id,fm.dataset.p==='1').delete();closeSheet()}catch(err){$('#ntMsg').textContent=dbErr(err)}}
  else if(a==='approve'){t.disabled=true;try{await S.cm.review(t.dataset.id,'aprobada');S.postMsg='Listo: aprobaste esta publicación.';closeSheet();renderView()}catch(_){t.disabled=false;document.querySelectorAll('.rvmsg').forEach(m=>m.textContent='No se pudo guardar. Probá de nuevo.')}}
  else if(a==='changes'){closeSheet();openSheet(`<h2>Pedir cambios</h2><form id="chForm" data-id="${esc(t.dataset.id)}" class="form"><label class="f">¿Qué habría que modificar? <textarea id="chText" maxlength="1800" required placeholder="Ej.: cambiar el texto de arriba, usar otro color de fondo…"></textarea></label><p class="msg" id="chMsg"></p><div class="row end"><button type="button" data-act="close">Cancelar</button><button class="primary" type="submit">Enviar</button></div></form>`,'sm')}
  else if(a==='cmdel'){try{await S.cm.remove(+t.dataset.id)}catch(_){}}
  else if(a==='no')t.parentElement.textContent='';
});
document.addEventListener('submit',async e=>{
  e.preventDefault();const fm=e.target,btn=fm.querySelector('button[type=submit]');
  if(fm.id==='upForm')return doUpload();
  if(fm.id==='setForm')return saveSettings(fm);
  if(fm.id==='chForm'){const tx=$('#chText'),b=tx.value.trim(),id=fm.dataset.id;if(!b){tx.focus();return}btn.disabled=true;
    try{await S.cm.add(pid(id),'Cambios pedidos: '+b);await S.cm.review(id,'cambios');S.postMsg='Enviaste tus cambios. Gracias.';closeSheet();renderView()}catch(_){$('#chMsg').textContent='No se pudo enviar. Probá de nuevo.';btn.disabled=false}return}
  if(fm.id==='cmForm'){const tx=$('#cmText'),b=tx.value.trim();if(!b){tx.focus();return}btn.disabled=true;try{await S.cm.add(S.cmOpen,b);tx.value=''}catch(_){$('#cmMsg').textContent='No se pudo enviar. Probá de nuevo.'}btn.disabled=false;return}
  if(fm.id==='composer'){const text=$('#nText').value.trim();if(!text){$('#nText').focus();return}
    btn.disabled=true;const doc={folder:cur().id,title:$('#nTitle').value.trim(),text,created:Date.now()};
    try{await($('#nPriv')?.checked?S.db.collection('data/users/'+S.uid):S.db.collection('items')).add(doc);$('#nText').value='';$('#nTitle').value='';$('#nMsg').textContent=''}catch(err){$('#nMsg').textContent=dbErr(err)}
    btn.disabled=false;return}
  if(fm.id==='edForm'){btn.disabled=true;const id=fm.dataset.id,folder=$('#eFolder').value;
    try{const it=S.items.find(i=>i.id===id)||{};await S.db.doc('items/'+id).update({title:$('#eTitle').value.trim(),date:$('#eDate').value,status:$('#eStatus').value,copy:$('#eCopy').value.trim(),folder});closeSheet();const nh=postHref({...it,id,folder,date:$('#eDate').value});if(route().post===id&&location.hash!==nh)location.replace(nh)}catch(err){$('#eMsg').textContent=dbErr(err);btn.disabled=false}return}
  if(fm.id==='noteForm'){btn.disabled=true;const id=fm.dataset.id,was=fm.dataset.p==='1',now=!!$('#ntPriv')?.checked;
    const old=(was?S.priv:S.items).find(x=>x.id===id)||{};const body={folder:old.folder||cur().id,created:old.created||Date.now(),title:$('#ntTitle').value.trim(),text:$('#ntText').value.trim()};
    try{if(was===now)await noteRef(id,was).update({title:body.title,text:body.text});else{await noteRef(id,now).set(body);await noteRef(id,was).delete()}closeSheet()}catch(err){$('#ntMsg').textContent=dbErr(err);btn.disabled=false}}
});
document.addEventListener('input',e=>{
  if(e.target.id==='avZoom'){S.avDrag=true;const zm=+e.target.value;applyAv($('#sAv'),zm);applyAv($('#avatar'),zm);$('#avZoomOut').textContent=zm+'%';return}if(e.target.id==='nSearch'){S.q=e.target.value;$('#grid').innerHTML=notesGrid(cur())}});
document.addEventListener('keydown',e=>{if($('#ov').hidden)return;
  if(e.key==='Escape')closeSheet();
  else if(S.open&&(e.key==='ArrowLeft'||e.key==='ArrowRight')&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){const it=S.items.find(i=>i.id===S.open.id),n=(it?.assets||[]).length,s=S.open.slide+(e.key==='ArrowRight'?1:-1);if(s>=0&&s<n)openDetail(S.open.id,s)}
});
$('#file').addEventListener('change',e=>{const fs=[...e.target.files];e.target.value='';if(S.addTo){const id=S.addTo;S.addTo=null;addSlides(id,fs)}else openUpload(fs)});
document.addEventListener('change',async e=>{
  if(e.target.id==='sBrand'||e.target.id==='sHandle'){const k=e.target.id==='sBrand'?'brand':'handle',v=e.target.value.trim(),m=$('#sMsg');if(v===(S.config[k]||''))return;
    try{await saveConfig({[k]:v});if(m)m.textContent=k==='brand'?'Nombre guardado.':'Usuario guardado.'}catch(err){if(m)m.textContent=dbErr(err)}return}
  if(e.target.id!=='avZoom')return;
  const zm=+e.target.value,m=$('#avMsg');
  try{await saveConfig({avatarZoom:zm});S.config.avatarZoom=zm;if(m)m.textContent='Tamaño de la foto guardado.'}catch(err){if(m)m.textContent=dbErr(err)}
  S.avDrag=false;renderHeader();
});
$('#avFile').addEventListener('change',e=>{const f=e.target.files[0];e.target.value='';if(f)setAvatar(f)});
$('#avatar').addEventListener('keydown',e=>{if(S.canEdit&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openSettings(false)}});
const view=$('#view');
view.addEventListener('dragover',e=>{if(S.canEdit&&S.assets&&!route().cal&&cur().kind==='media'){e.preventDefault();view.classList.add('dragging')}});
view.addEventListener('dragleave',e=>{if(!view.contains(e.relatedTarget))view.classList.remove('dragging')});
view.addEventListener('drop',e=>{view.classList.remove('dragging');const r=route();if(S.canEdit&&S.assets&&!r.cal&&cur().kind==='media'){e.preventDefault();const fs=[...e.dataTransfer.files];if(r.post)addSlides(r.post,fs);else openUpload(fs)}});
let lastFolder='';window.addEventListener('hashchange',()=>{if(!$('#ov').hidden)closeSheet();const r=route(),fk=r.cal?'cal':r.f.id+(r.month??'');if(fk!==lastFolder){S.filter='todas';S.q=''}lastFolder=fk;S.postMsg='';render();const tb=document.querySelector('.tabs');if(tb&&window.scrollY>tb.offsetTop)window.scrollTo({top:tb.offsetTop})});

async function start(){
  for(let k=0;k<20&&!(window.claude&&typeof window.claude.use==='function');k++)await new Promise(r=>setTimeout(r,150));
  if(!(window.claude&&typeof window.claude.use==='function')){S.failed=true;render();return}
  let db=null,user=null;
  try{[db,user]=await Promise.all([claude.use('db'),claude.use('user')])}catch(_){}
  if(!db){S.failed=true;render();return}
  S.db=db;
  try{S.canEdit=!!(user&&await user.canEdit())}catch(_){}
  if(S.canEdit){try{S.assets=await claude.use('assets')}catch(_){}try{S.uid=await user.id()}catch(_){}}
  
  try{S.cm=await claude.use('comments');S.comments={openComposer:openComments};S.cm.subscribe(()=>{decorate();if(S.cmOpen)drawComments()})}catch(_){}
  render();
  const timer=setTimeout(()=>{if(!S.confirmed){S.slow=true;renderView()}},10000);
  db.doc('config/main').onSnapshot(s=>{const d=s.exists?s.data():null;const fs=Array.isArray(d?.folders)?d.folders.filter(f=>f&&typeof f.id==='string'&&f.name):[];S.config={brand:d?.brand||'',handle:d?.handle||'',avatar:typeof d?.avatar==='string'?d.avatar:'',avatarZoom:+d?.avatarZoom||100,folders:fs.length?fs:DEF};render()},()=>{});
  db.collection('items').onSnapshot(s=>{S.items=s.docs.map(d=>({...d.data(),id:d.id}));S.loaded=true;if(!s.metadata.fromCache){S.confirmed=true;S.slow=false;clearTimeout(timer)}render()},(e)=>{S.loaded=true;S.confirmed=true;clearTimeout(timer);S.err='No se pudo cargar el contenido. Volvé a abrir la página en un rato.'+(e&&(e.message||e.code)?' Detalle: '+(e.message||e.code):'');render()});
  if(S.uid){try{db.collection('data/users/'+S.uid).onSnapshot(s=>{S.priv=s.docs.map(d=>({...d.data(),id:d.id,private:true}));render()},()=>{})}catch(_){}}
}
render();start();
}
