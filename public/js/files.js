/* Gerenciador de arquivos. Um único componente: janela "Arquivos" (interface clássica) e seção Arquivos do projeto (interface nova).
   Seleção múltipla, copiar/mover/colar, informações, lixeira, filtro, ordenação, upload e arrastar-e-soltar. */
const Files=(()=>{
const {h,ic,menu,sheet,empty,chunk,confirm}=Cmx.ui;
const F=$('#files');let root='',label='Início',project=null,items=[],sel=new Set(),selMode=false,clip=null,q='',showHidden=false,gen=0;
let sortBy='name',sortDir=1;try{[sortBy,sortDir]=JSON.parse(localStorage.getItem('cmx-fsort')||'["name",1]')}catch{}
const enc=encodeURIComponent,coarse=()=>matchMedia('(pointer:coarse)').matches;
const rel=p=>root&&p.startsWith(root+'/')?p.slice(root.length+1):p===root?'':p;
const projRel=p=>rel(p)||'.';

// ---- estrutura ----
const bCr=h('div.crumbs#crumbs'),bList=h('div#list',{role:'list','aria-label':'Arquivos'}),
 bSel=h('div.fsel',{hidden:true}),bClip=h('div.fclip',{hidden:true}),bFilter=h('div.fsrch',{hidden:true}),
 qIn=h('input#fQ',{placeholder:'Filtrar nesta pasta…','aria-label':'Filtrar nesta pasta',autocomplete:'off',autocapitalize:'off',spellcheck:'false'});
const btnSearch=h('button.fb',{type:'button',title:'Filtrar',onclick:()=>toggleFilter()},ic('search')),
 btnNew=h('button.fb.pri',{type:'button',onclick:e=>newMenu(e.currentTarget)},ic('plus'),h('span','Novo')),
 btnMore=h('button.fb',{type:'button',title:'Mais ações','aria-label':'Mais ações',onclick:e=>moreMenu(e.currentTarget)},ic('dots'));
bFilter.append(qIn,h('button.fb',{type:'button','aria-label':'Limpar filtro',onclick:()=>toggleFilter(false)},ic('x')));
const fi=h('input#fi',{type:'file',multiple:true,hidden:true,onchange:e=>{upload([...e.target.files]);e.target.value=''}}),
 fiDir=h('input#fiDir',{type:'file',webkitdirectory:true,hidden:true,onchange:e=>{upload([...e.target.files]);e.target.value=''}});
F.replaceChildren(h('div.fh',bCr,h('div.fa',btnSearch,btnNew,btnMore)),bFilter,bClip,bSel,bList,fi,fiDir);
qIn.oninput=Cmx.debounce(()=>{q=qIn.value;draw()},120);

// ---- navegação ----
const inRoot=p=>!root||p===root||p.startsWith(root+'/');
async function go(p=cwd){await run(async()=>{if(!inRoot(p))p=root;const n=++gen,r=await api('/api/list?path='+enc(p));if(n!==gen)return;
  cwd=p;items=r.items;sel.clear();selMode=false;crumbs();draw();document.dispatchEvent(new CustomEvent('tide-cwd',{detail:{path:p}}))})}
function crumbs(){bCr.innerHTML='';const parts=rel(cwd)?rel(cwd).split('/'):[];
 const add=(l,p,last)=>{const b=h('button',{type:'button',onclick:()=>go(p),'aria-current':last?'page':null},l);bCr.append(b)};
 add(label,root,!parts.length);let acc=root;parts.forEach((s,i)=>{bCr.append(h('i','›'));acc=join(acc,s);add(s,acc,i===parts.length-1)});bCr.scrollLeft=1e5}
function setRoot(r,o={}){root=r||'';label=o.label||(root?root.split('/').pop():'Início');project=o.project||null;
 if(!inRoot(cwd)||cwd===''&&root)cwd=root;clip=clip&&clip.project===project?clip:null;return go(cwd)}

// ---- listagem ----
function visible(){const nq=Cmx.norm(q);let v=items.filter(i=>(showHidden||!i.name.startsWith('.'))&&(!nq||Cmx.norm(i.name).includes(nq)));
 const cmp={name:(a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'}),mtime:(a,b)=>a.mtime-b.mtime,size:(a,b)=>a.size-b.size}[sortBy];
 return v.sort((a,b)=>(b.dir-a.dir)||cmp(a,b)*sortDir)}
function meta(i){const a=[];if(!i.dir&&!isNaN(i.size))a.push(fmt(i.size));if(i.mtime)a.push(Cmx.ago(i.mtime));return a.join(' · ')}
function draw(){const v=visible();bList.replaceChildren();bList.classList.toggle('selecting',selMode||sel.size>0);
 if(!v.length){bList.append(q?empty('search','Nada encontrado','Nenhum item com “'+q+'” nesta pasta.','Buscar em todo o projeto',()=>searchAll()):empty('folder','Pasta vazia','Use “Novo” para criar ou enviar arquivos, ou arraste arquivos para cá.'))}
 else chunk(bList,v,row,120);
 bSelUI();bClipUI()}
let lpT=0,lpDone=false;
function row(i){const on=sel.has(i.name),p=join(cwd,i.name);
 const r=h('div.row'+(on?'.sel':''),{role:'listitem',tabindex:'0','aria-selected':on?'true':'false','data-name':i.name},
  h('button.ckb'+(on?'.on':''),{type:'button','aria-label':(on?'Desmarcar ':'Marcar ')+i.name,onclick:e=>{e.stopPropagation();toggle(i.name)}},on?ic('check'):null),
  h('span.ic',{html:icon(i)}),h('span.nm',h('span.n',i.name),h('small',meta(i))),
  h('button.mn',{type:'button','aria-label':'Ações de '+i.name,onclick:e=>{e.stopPropagation();rowMenu(i,e.currentTarget)}},ic('dots')));
 r.onclick=()=>{if(lpDone){lpDone=false;return}if(selMode||sel.size)toggle(i.name);else open(i)};
 r.oncontextmenu=e=>{e.preventDefault();rowMenu(i,{x:e.clientX,y:e.clientY})};
 r.onkeydown=e=>{const rs=[...bList.querySelectorAll('.row')],k=rs.indexOf(r);
  if(e.key==='Enter'){e.preventDefault();sel.size?toggle(i.name):open(i)}else if(e.key===' '){e.preventDefault();toggle(i.name)}
  else if(e.key==='ArrowDown'&&rs[k+1]){e.preventDefault();rs[k+1].focus()}else if(e.key==='ArrowUp'&&rs[k-1]){e.preventDefault();rs[k-1].focus()}
  else if(e.key==='Delete'){e.preventDefault();sel.size?delSel():delItems([i.name])}else if(e.key==='F2'){e.preventDefault();rename(i)}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'){e.preventDefault();selectAll()}else if(e.key==='Escape'&&(sel.size||selMode)){cancelSel()}};
 // toque longo = entrar no modo de seleção
 r.onpointerdown=e=>{if(e.pointerType==='mouse'||e.target.closest('button'))return;const x=e.clientX,y=e.clientY;clearTimeout(lpT);lpDone=false;
  lpT=setTimeout(()=>{lpDone=true;selMode=true;if(navigator.vibrate)navigator.vibrate(12);toggle(i.name,true)},480);
  const mv=ev=>{if(Math.abs(ev.clientX-x)>8||Math.abs(ev.clientY-y)>8)clearTimeout(lpT)};r.addEventListener('pointermove',mv,{once:true})};
 r.onpointerup=r.onpointercancel=()=>clearTimeout(lpT);
 return r}
function open(i){if(i.dir)return go(join(cwd,i.name));if(isArc(i.name))return rowMenu(i,null);Ed.openFile(join(cwd,i.name))}

// ---- seleção ----
function toggle(n,force){if(force===true||!sel.has(n))sel.add(n);else sel.delete(n);if(!sel.size&&!force)selMode=false;draw()}
const selectAll=()=>{visible().forEach(i=>sel.add(i.name));selMode=true;draw()};
const cancelSel=()=>{sel.clear();selMode=false;draw()};
function bSelUI(){const n=sel.size,on=n>0||selMode;bSel.hidden=!on;if(!on)return;bSel.replaceChildren(
 h('b',n?(n===1?'1 selecionado':n+' selecionados'):'Toque nos itens'),
 h('div.sa',h('button',{type:'button',onclick:()=>setClip('copy')},ic('copy'),h('span','Copiar')),h('button',{type:'button',onclick:()=>setClip('move')},ic('scissors'),h('span','Mover')),
  h('button.danger',{type:'button',onclick:delSel},ic('trash'),h('span','Excluir')),
  h('button',{type:'button',onclick:()=>(sel.size===visible().length?cancelSel():selectAll())},ic('select'),h('span',sel.size===visible().length&&n?'Nenhum':'Todos')),
  h('button',{type:'button','aria-label':'Cancelar seleção',onclick:cancelSel},ic('x'))));
 bSel.querySelectorAll('.sa>button:not(:last-child):not(:nth-last-child(2))').forEach(b=>{b.disabled=!n})}

// ---- copiar / mover / colar ----
function setClip(mode,names=[...sel]){if(!names.length)return;clip={mode,items:names.map(n=>join(cwd,n)),project};sel.clear();selMode=false;draw();toast((mode==='copy'?'Copiar':'Mover')+': '+names.length+' item(ns). Vá à pasta de destino e toque em “Colar aqui”.')}
function bClipUI(){bClip.hidden=!clip;if(!clip)return;const n=clip.items.length;
 bClip.replaceChildren(h('span.ct',ic(clip.mode==='copy'?'copy':'scissors'),(clip.mode==='copy'?'Copiar ':'Mover ')+n+(n>1?' itens':' item')),
  h('button.pri',{type:'button',onclick:paste},ic('paste'),'Colar aqui'),h('button',{type:'button','aria-label':'Cancelar',onclick:()=>{clip=null;bClipUI()}},ic('x')))}
async function paste(){if(!clip)return;const c=clip;await run(async()=>{
 if(c.mode==='copy'){await api('/api/cm/fs/copy',{items:c.items,dest:cwd});toast('Copiado')}
 else{const r=await api('/api/cm/fs/move',{items:c.items,dest:cwd});await Ed.sync(r.moved.filter(m=>m.from!==m.to).map(m=>({op:'rename',from:m.from,to:m.to})));toast('Movido');clip=null}
 await go(cwd);document.dispatchEvent(new Event('tide-fs'))})}
async function moveTo(names){const dest=await Ed.pick(cwd,'Mover para esta pasta','Mover para…');if(dest===null)return;if(!inRoot(dest))return toast('Escolha uma pasta dentro do projeto');
 await run(async()=>{const r=await api('/api/cm/fs/move',{items:names.map(n=>join(cwd,n)),dest});await Ed.sync(r.moved.filter(m=>m.from!==m.to).map(m=>({op:'rename',from:m.from,to:m.to})));toast('Movido');await go(cwd);document.dispatchEvent(new Event('tide-fs'))})}

// ---- operações ----
async function rename(i){const n=await dlg('Renomear',{input:i.name});if(!n||n===i.name)return;const p=join(cwd,i.name);
 run(async()=>{await api('/api/rename',{path:p,name:n});await Ed.sync([{op:'rename',from:p,to:join(cwd,n)}]);await go(cwd);document.dispatchEvent(new Event('tide-fs'))})}
async function delItems(names){if(!names.length)return;const one=names.length===1;
 if(!(await confirm('Mover para a lixeira?',(one?names[0]:names.length+' itens')+'\nVocê poderá restaurar depois.','Mover para a lixeira',true)))return;
 run(async()=>{const paths=names.map(n=>join(cwd,n)),r=await api('/api/cm/fs/trash',{items:paths});
  await Ed.sync(r.trashed.map(t=>({op:'delete',path:t.path})));toast(r.errors.length?r.errors[0]:(r.trashed.length>1?r.trashed.length+' itens movidos para a lixeira':'Movido para a lixeira'));
  await go(cwd);document.dispatchEvent(new Event('tide-fs'))})}
const delSel=()=>delItems([...sel]);
async function info(i){const p=join(cwd,i.name);await run(async()=>{const d=await api('/api/cm/fs/info?path='+enc(p));
 const row=(k,v)=>v?h('div.irow',h('span',k),h('b',v)):null;
 sheet({title:d.name,label:'Informações',body:[h('div.info',row('Tipo',d.type),row('Tamanho',d.dir?fmt(d.totalSize||0)+(d.truncated?'+':'')+' ('+d.items+' item'+(d.items===1?'':'s')+' na raiz)':fmt(d.size)+' ('+d.size.toLocaleString('pt-BR')+' bytes)'),
  row('Criado',d.createdAt?Cmx.dt(d.createdAt):'Não disponível neste sistema de arquivos'),row('Modificado',Cmx.dt(d.modifiedAt)),row('Local','/'+projRel(d.path).replace(/^\.$/,'')),row('Permissões',d.mode))],
  actions:[{l:'Copiar caminho',f:async()=>{toast(await Cmx.copy(projRel(d.path))?'Caminho copiado':'Não foi possível copiar');return false}},{l:'Fechar',pri:true}]})})}
async function copyPath(i){toast(await Cmx.copy(projRel(join(cwd,i.name)))?'Caminho copiado':'Não foi possível copiar')}
async function dup(i){await run(async()=>{await api('/api/cm/fs/copy',{items:[join(cwd,i.name)],dest:cwd});toast('Duplicado');await go(cwd);document.dispatchEvent(new Event('tide-fs'))})}
async function newItem(kind){const n=await dlg(kind==='dir'?'Nova pasta':'Novo arquivo',{input:''});if(!n)return;
 run(async()=>{await api(kind==='dir'?'/api/mkdir':'/api/newfile',{dir:cwd,name:n});await go(cwd);document.dispatchEvent(new Event('tide-fs'));if(kind==='file')Ed.openFile(join(cwd,n))})}
function searchAll(){const m=Cmx.mod.palette;(m?Promise.resolve(m):Cmx.lazy('palette')).then(m=>m.open({q,mode:'search'})).catch(e=>toast(e.message))}
function toggleFilter(on){const v=on===undefined?bFilter.hidden:on;bFilter.hidden=!v;if(v)qIn.focus();else{qIn.value='';q='';draw()}}

// ---- menus ----
function rowMenu(i,anchor){const p=join(cwd,i.name),isF=!i.dir,shell=document.documentElement.dataset.ui==='shell';
 menu(anchor||{x:innerWidth/2,y:innerHeight/2},[
  {l:i.dir?'Abrir':(isArc(i.name)?'Extrair aqui':'Abrir no editor'),i:i.dir?'folder':(isArc(i.name)?'archive':'code2'),f:()=>isArc(i.name)?run(async()=>{toast('Extraindo…');await api('/api/extract',{path:p});toast('Extraído');go(cwd)}):open(i)},
  !shell&&i.dir&&{l:'Abrir no editor',i:'code',f:()=>Ed.openFolder(p)},!shell&&i.dir&&{l:'Abrir no Git',i:'git',f:()=>Git.open(p)},
  shell&&i.dir&&{l:'Abrir como projeto',i:'code',f:()=>Ed.openFolder(p)},
  isF&&!isArc(i.name)&&document.documentElement.dataset.ui==='shell'&&{l:'Perguntar à IA',i:'sparkle',f:()=>Cmx.lazy('work').then(()=>Cmx.mod.work.askAboutFile(p))},
  {sep:1},{l:'Renomear',i:'edit',hint:'F2',f:()=>rename(i)},{l:'Copiar',i:'copy',f:()=>setClip('copy',[i.name])},{l:'Mover',i:'scissors',f:()=>setClip('move',[i.name])},{l:'Mover para…',i:'folder',f:()=>moveTo([i.name])},
  isF&&{l:'Duplicar',i:'files',f:()=>dup(i)},{l:'Copiar caminho',i:'paste',f:()=>copyPath(i)},{l:'Informações',i:'info',f:()=>info(i)},
  {l:'Selecionar',i:'select',f:()=>{selMode=true;toggle(i.name,true)}},{sep:1},{l:'Mover para a lixeira',i:'trash',danger:1,hint:'Del',f:()=>delItems([i.name])}].filter(Boolean),{title:i.name})}
function newMenu(a){menu(a,[{l:'Novo arquivo',i:'file-plus',f:()=>newItem('file')},{l:'Nova pasta',i:'folder-plus',f:()=>newItem('dir')},{sep:1},
 {l:'Enviar arquivos',i:'upload',f:()=>fi.click()},{l:'Enviar pasta inteira',i:'folder',f:()=>fiDir.click()},clip&&{sep:1},clip&&{l:'Colar aqui',i:'paste',f:paste}].filter(Boolean),{title:'Novo'})}
function moreMenu(a){const so=(k,t)=>({l:t,check:sortBy===k,f:()=>{if(sortBy===k)sortDir=-sortDir;else{sortBy=k;sortDir=k==='name'?1:-1}try{localStorage.setItem('cmx-fsort',JSON.stringify([sortBy,sortDir]))}catch{}draw()}});
 menu(a,[{l:'Selecionar itens',i:'select',f:()=>{selMode=true;draw()}},{l:'Mostrar arquivos ocultos',i:'eye',check:showHidden,f:()=>{showHidden=hidden=!showHidden;draw()}},{sep:1},
  so('name','Ordenar por nome'),so('mtime','Ordenar por data'),so('size','Ordenar por tamanho'),{sep:1},
  {l:'Terminal aqui',i:'terminal',f:()=>Term.here(cwd)},{l:'Lixeira',i:'trash',f:()=>Cmx.lazy('trash').then(m=>m.open(project)).catch(e=>toast(e.message))},{l:'Atualizar',i:'refresh',f:()=>go(cwd)}],{title:'Arquivos'})}

// ---- upload e arrastar-e-soltar (comportamento original preservado) ----
function upload(fs){const dir=cwd,rp=f=>f._rel||f.webkitRelativePath||f.name,tot=fs.length;fs=fs.filter(f=>!/(^|\/)node_modules\//.test(rp(f)));if(tot>fs.length)toast('node_modules ignorada ('+(tot-fs.length)+' arquivos)');if(!fs.length)return;let i=0;const next=()=>{if(i>=fs.length){toast('Upload concluído');go(cwd);document.dispatchEvent(new Event('tide-fs'));return}
 const f=fs[i++],nm=rp(f),x=new XMLHttpRequest();x.open('POST','/api/upload?dir='+enc(dir)+'&name='+enc(nm)+(nm.includes('/')?'&rel=1':''));
 x.upload.onprogress=e=>toast(`${f.name} ${Math.round(e.loaded/e.total*100)}% (${i}/${fs.length})`);
 x.onload=()=>{if(x.status!==200)toast('Falha: '+f.name);next()};x.onerror=()=>{toast('Falha: '+f.name);next()};x.send(f)};next()}
['dragenter','dragover'].forEach(v=>F.addEventListener(v,e=>{e.preventDefault();F.classList.add('drag')}));
['dragleave','drop'].forEach(v=>F.addEventListener(v,e=>{e.preventDefault();F.classList.remove('drag')}));
F.addEventListener('drop',async e=>{const its=[...(e.dataTransfer.items||[])].map(i=>i.webkitGetAsEntry&&i.webkitGetAsEntry()).filter(Boolean);
 if(!its.length)return upload([...e.dataTransfer.files]);const all=[];
 const walk=async(en,pre)=>{if(en.isFile){const f=await new Promise(r=>en.file(r,()=>r(null)));if(f){f._rel=pre+en.name;all.push(f)}}
  else{const rd=en.createReader();let b;do{b=await new Promise(r=>rd.readEntries(r,()=>r([])));for(const c of b)await walk(c,pre+en.name+'/')}while(b.length)}};
 for(const en of its)await walk(en,'');upload(all)});
F.addEventListener('keydown',e=>{if(e.key==='Escape'&&(sel.size||selMode)&&!e.target.closest('input'))cancelSel()});
return{go,setRoot,refresh:()=>go(cwd),getRoot:()=>root,newItem,upload,paste,cancelSel,hasClip:()=>!!clip,filter:toggleFilter}})();
// compatibilidade com o restante do código (ai.js, boot etc.)
async function load(p=cwd){return Files.go(p)}
