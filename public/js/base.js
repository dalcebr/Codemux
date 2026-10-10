/* Utilitários compartilhados: DOM, API, toast, diálogos, formatação, ícones de arquivo. */
const $=s=>document.querySelector(s);let cwd='',hidden=false,editing=null;
const join=(a,b)=>a?a+'/'+b:b;
async function api(u,b){const r=await fetch(u,b===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});const j=await r.json();if(!r.ok)throw new Error(j.error||'Erro');return j}
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2600)}
const run=async f=>{try{await f()}catch(e){toast(''+e.message)}};
function dlg(title,o={}){return new Promise(res=>{const d=document.createElement('dialog');document.body.append(d);const h=document.createElement('h3');h.textContent=title;d.append(h);let inp;
 if(o.text){const p=document.createElement('p');p.textContent=o.text;d.append(p)}
 if(o.input!==undefined){inp=document.createElement('input');inp.value=o.input;d.append(inp)}
 const row=document.createElement('div');row.className='btns';
 (o.buttons||[['Cancelar',null],['OK',1]]).forEach(([l,v,c])=>{const b=document.createElement('button');b.textContent=l;if(c)b.className=c;b.onclick=()=>{d.onclose=null;d.close();d.remove();res(inp&&v===1?inp.value.trim():v)};row.append(b)});
 d.append(row);d.onclose=()=>{d.remove();res(null)};d.showModal();if(inp){inp.focus();inp.select();inp.onkeydown=e=>{if(e.key==='Enter')row.lastChild.click()}}})}
const fmt=n=>n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(1)+' MB';
const isArc=n=>/\.(zip|tar|tar\.gz|tgz|tar\.bz2|tar\.xz)$/i.test(n);
function icon(i){if(i.dir)return I('folder','c-folder');const n=(i.name||'').toLowerCase();
 if(isArc(n))return I('archive','c-arc');if(/\.(png|jpe?g|gif|webp|svg|ico)$/.test(n))return I('image','c-img');
 if(/\.(js|mjs|ts|jsx|tsx|py|sh|json|html|css|md|java|c|cpp|go|rs|php|vue|yml|yaml)$/.test(n))return I('code2','c-code');return I('file','c-file')}

/* Menu de contexto genérico (usado por todos os módulos) */
function ctxMenu(x,y,items){closeCtx();const m=document.createElement('div');m.id='ctx';
 items.forEach(([l,f])=>{const b=document.createElement('button');b.textContent=l;b.onclick=()=>{closeCtx();f()};m.append(b)});document.body.append(m);
 const r=m.getBoundingClientRect();m.style.left=Math.max(6,Math.min(x,innerWidth-r.width-6))+'px';m.style.top=Math.max(6,Math.min(y,innerHeight-r.height-6))+'px'}
const closeCtx=()=>{const m=document.getElementById('ctx');if(m)m.remove()};
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#ctx'))closeCtx()},true);
