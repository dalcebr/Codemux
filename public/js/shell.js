/* Codemux - interface por projeto ("shell").
   Navegação (hash → botão voltar funciona), chrome desktop/mobile, projeto ativo e adaptador para os componentes legados
   (Editor, Arquivos, Terminal, Git, IA), que são reaproveitados dentro das seções em vez de duplicados. */
(()=>{
const {h,ic,menu,sheet,confirm}=Cmx.ui,enc=encodeURIComponent;
document.body.classList.add('shell');
const S={projects:[],pid:null,route:{view:'home'},git:null,pending:0,ports:[],drawer:false,tok:0};
const mobile=()=>matchMedia('(max-width:899px)').matches;
const proj=id=>S.projects.find(p=>p.id===id),cur=()=>proj(S.pid);
const SECT={overview:['Visão geral','home'],work:['Trabalho','layout'],files:['Arquivos','folder'],tasks:['Tarefas','tasks'],git:['Git','git'],history:['Histórico','clock'],ports:['Portas','plug'],settings:['Configurações do projeto','sliders']};
const TOOL={editor:['Editor','code'],terminal:['Terminal','terminal'],ai:['IA','sparkle']};
const adv=()=>Cmx.get('mode')==='advanced';
const lastTool={};try{Object.assign(lastTool,JSON.parse(localStorage.getItem('cmx-tool')||'{}'))}catch{}

// ---------- rotas ----------
const hashOf={home:()=>'#/home',projects:t=>'#/projects'+(t&&t!=='active'?'/'+t:''),settings:()=>'#/settings',
  project:(id,s,t)=>'#/p/'+id+(s&&s!=='overview'?'/'+s+(s==='work'&&t?'/'+t:''):'')};
function parse(hs){const p=(hs||'').replace(/^#\/?/,'').split('/').filter(Boolean);
  if(!p.length||p[0]==='home')return{view:'home'};if(p[0]==='projects')return{view:'projects',tab:['archived','trash'].includes(p[1])?p[1]:'active'};
  if(p[0]==='settings')return{view:'settings'};
  if(p[0]==='p'&&p[1])return{view:'project',pid:p[1],section:SECT[p[2]]?p[2]:'overview',tool:TOOL[p[3]]?p[3]:null};return{view:'home'}}
const goHash=h=>{if(location.hash===h)render();else location.hash=h};
const nav={home:()=>goHash(hashOf.home()),projects:t=>goHash(hashOf.projects(t)),settings:()=>goHash(hashOf.settings()),
  project:(id,s,t)=>goHash(hashOf.project(id||S.pid,s,t)),open:(id,s,t)=>nav.project(id,s,t)};

// ---------- estrutura ----------
const $side=h('aside#cmxSide',{'aria-label':'Navegação principal'}),$top=h('header#cmxTop'),$views=h('main#cmxViews',{tabindex:'-1'}),$stat=h('footer#cmxStatus',{'aria-label':'Status do projeto'}),
 $tabs=h('nav#cmxTabs',{'aria-label':'Navegação'}),$dbg=h('div#cmxDbg',{hidden:true,onclick:()=>drawer(false)}),$drw=h('aside#cmxDrawer',{'aria-label':'Menu',hidden:true});
document.body.append(h('div#cmx',$side,h('div#cmxMain',$top,$views,$stat),$tabs),$dbg,$drw);
const hosts={};
function host(name){if(!hosts[name]){hosts[name]=h('section.cview',{'data-v':name,hidden:true});$views.append(hosts[name])}return hosts[name]}

// ---------- projetos ----------
async function loadProjects(){try{S.projects=(await Cmx.cm.get('projects')).projects}catch(e){toast(e.message)}Cmx.emit('projects',S.projects);return S.projects}
let activating=null;
async function activate(p){S.pid=p.id;
  Cmx.cm.post('projects/update',{id:p.id,patch:{openedAt:1}}).then(r=>{const i=S.projects.findIndex(x=>x.id===p.id);if(i>=0)S.projects[i]={...S.projects[i],openedAt:r.project.openedAt}}).catch(()=>{});
  Ed.setRoot(p.path);Ed.setAutosave((p.settings&&p.settings.autosave&&p.settings.autosave!=='inherit')?p.settings.autosave:Cmx.get('autosave'));
  Files.setRoot(p.path,{label:p.name,project:p.id});Term.setScope(p.path,(p.settings&&p.settings.startCmd)||'');
  Cmx.emit('project',p);refreshStatus();
  // retoma onde parou (abas e linha), se ainda não houver abas abertas
  if(!Ed.tabs().length){try{const st=JSON.parse(localStorage.getItem('cmx-ps:'+p.id)||'null');if(st)await Ed.restoreState(st)}catch{}}}
const saveState=Cmx.debounce(()=>{const p=cur();if(!p)return;try{localStorage.setItem('cmx-ps:'+p.id,JSON.stringify(Ed.getState()))}catch{}},800);
document.addEventListener('tide-ed',e=>{saveState();if(['dirty','save','tabs'].includes(e.detail.type))renderStatus()});

// ---------- legado: adaptador "openApp" ----------
window.openApp=id=>{const p=cur();if(!p){toast('Abra um projeto primeiro');return nav.projects()}
  const target={code:['work','editor'],term:['work','terminal'],files:['files'],git:['git']}[id];if(!target)return;
  const [sec,tool]=target;
  if(S.route.view==='project'&&S.route.section===sec&&(!tool||S.route.tool===tool)){
    // já estamos na seção: garante que o host está visível e o módulo montado, sem re-renderizar tudo
    const name=viewName(S.route),el=host(name);el.hidden=false;
    const m=Cmx.mod[MOD[name]];
    if(m&&m.show)m.show({shell:shellApi,project:p,route:S.route,name});
    else if(!el.dataset.m)render(); // módulo ainda não montado: deixa o render montar
    return}
  nav.project(p.id,sec,tool)};
Object.defineProperty(W,'git',{get:()=>S.route.view==='project'&&S.route.section==='git',configurable:true});
// "Abrir no editor" / clonar: o shell decide (abrir projeto existente ou adicionar a pasta como projeto)
document.addEventListener('tide-openfolder',async e=>{const path=e.detail.path;if(!path)return;
  let p=S.projects.find(x=>!x.trashed&&(path===x.path||path.startsWith(x.path+'/')));
  if(!p){try{p=(await Cmx.cm.post('projects/import',{path})).project;await loadProjects();toast('Adicionado como projeto: '+p.name)}catch(err){return toast(err.message)}}
  else if(p.id===S.pid&&S.route.view==='project'&&S.route.section==='work'&&S.route.tool==='editor'){
    const el=host('work');el.hidden=false;const m=Cmx.mod.work;if(m&&m.show)m.show({shell:shellApi,project:p,route:S.route,name:'work'});return} // já é o projeto atual: só garante o editor aberto
  nav.project(p.id,'work','editor')});

// ---------- render ----------
const VIEW={home:'home',projects:'projects',settings:'settings'};
function viewName(r){if(VIEW[r.view])return VIEW[r.view];return r.section==='settings'?'psettings':r.section}
const MOD={home:'home',projects:'projects',settings:'settings',psettings:'settings',overview:'overview',work:'work',tasks:'tasks',history:'history',ports:'ports'};
async function render(){const tok=++S.tok;let r=parse(location.hash);
  if(r.view==='project'){const p=proj(r.pid);if(!p||p.trashed){toast('Projeto não encontrado');S.pid=null;return nav.projects()}
    if(S.pid!==p.id)await activate(p);if(tok!==S.tok)return;
    if(r.section==='work'&&!r.tool){r.tool=lastTool[p.id]||'editor'}if(r.section==='work')lastTool[p.id]=r.tool,localStorage.setItem('cmx-tool',JSON.stringify(lastTool))}
  S.route=r;const name=viewName(r);
  for(const [k,el] of Object.entries(hosts)){if(k!==name&&!el.hidden){el.hidden=true;const m=Cmx.mod[MOD[k]];m&&m.hide&&m.hide(k)}}
  const el=host(name);el.hidden=false;chrome();drawer(false);
  try{
    if(name==='files'){if(!el.firstChild)el.append($('#files'));Files.refresh()}
    else if(name==='git'){if(!el.firstChild)el.append($('#git'));Git.show(cur().path)}
    else{const m=await Cmx.lazy(MOD[name]);if(tok!==S.tok)return;if(!el.dataset.m){el.dataset.m=1;await m.mount(el,{shell:shellApi,name})}await m.show({shell:shellApi,project:cur(),route:r,name})}
  }catch(e){console.error(e);el.replaceChildren(Cmx.ui.empty('alert','Não foi possível abrir esta seção',e.message,'Tentar de novo',()=>render()))}
  if(r.view==='project')Cmx.emit('section',r);
  try{localStorage.setItem('cmx-last',location.hash)}catch{}
  $views.scrollTop=0}
addEventListener('hashchange',render);

// ---------- barra superior ----------
function crumbs(){const r=S.route,p=cur(),out=[{l:'Codemux',f:nav.home,cls:'bc-root'}];
  if(r.view==='home'){out.push({l:'Início'})}else if(r.view==='projects'){out.push({l:'Projetos',f:r.tab!=='active'?()=>nav.projects():null});if(r.tab!=='active')out.push({l:r.tab==='archived'?'Arquivados':'Lixeira'})}
  else if(r.view==='settings')out.push({l:'Configurações'});
  else if(p){out.push({l:p.name,f:()=>nav.project(p.id),sw:true,cls:'bc-proj'});const s=SECT[r.section];
    if(r.section!=='overview')out.push({l:s[0],f:r.section==='work'?null:null,cls:'bc-sec'});if(r.section==='work')out.push({l:TOOL[r.tool][0],cls:'bc-tool'})}
  return out}
function renderTop(){const items=crumbs(),last=items.length-1;
  $top.replaceChildren(
   h('button.tb-i.menu-btn',{type:'button','aria-label':'Abrir menu',onclick:()=>mobile()?drawer(true):toggleSide()},ic('menu')),
   h('nav.bc',{'aria-label':'Você está em'},...items.flatMap((c,i)=>[i?h('i.sep','›'):null,
     c.f?h('button.bc-i'+(i===last?'.cur':'')+(c.cls?'.'+c.cls:''),{type:'button',onclick:c.sw?e=>switcher(e.currentTarget):c.f,'aria-current':i===last?'page':null},c.l,c.sw?ic('chev-d','sw'):null):h('span.bc-i.cur'+(c.cls?'.'+c.cls:''),{'aria-current':'page'},c.l)])),
   h('div.tb-r',h('button.tb-i',{type:'button',title:'Pesquisar e comandos (Ctrl+K)','aria-label':'Pesquisar e comandos',onclick:()=>openPalette()},ic('search')),
     h('button.tb-i',{type:'button',title:'Mais ações','aria-label':'Mais ações',onclick:e=>topMenu(e.currentTarget)},ic('dots'))))}
function switcher(a){const rec=[...S.projects].filter(p=>!p.trashed&&!p.archived).sort((x,y)=>(y.openedAt||0)-(x.openedAt||0)).slice(0,8);
  menu(a,[...rec.map(p=>({l:p.name,i:p.favorite?'star-fill':'folder',check:p.id===S.pid,f:()=>nav.project(p.id,S.route.section==='settings'?'overview':S.route.section,S.route.tool)})),{sep:1},{l:'Todos os projetos',i:'list',f:()=>nav.projects()},{l:'Novo projeto',i:'plus',f:()=>newProject()}],{title:'Trocar de projeto',align:'left'})}
function topMenu(a){const p=cur(),r=S.route,it=[];
  if(r.view==='project'&&p){it.push({l:p.favorite?'Remover dos favoritos':'Favoritar',i:p.favorite?'star':'star-fill',f:()=>setProj(p.id,{favorite:!p.favorite})},
    {l:'Renomear projeto',i:'edit',f:()=>renameProj(p)},{l:'Arquivar projeto',i:'archive',f:()=>setProj(p.id,{archived:true}).then(()=>nav.projects())},
    {l:'Lixeira de arquivos',i:'trash',f:()=>Cmx.lazy('trash').then(m=>m.open(p.id))},{sep:1})}
  else if(r.view==='projects'||r.view==='home')it.push({l:'Novo projeto',i:'plus',f:()=>newProject()},{l:'Importar projeto',i:'download',f:()=>importProject()},{sep:1});
  it.push({l:'Pesquisar / comandos',i:'search',hint:'Ctrl+K',f:()=>openPalette()},{l:'Configurações do Codemux',i:'gear',f:nav.settings});menu(a,it,{title:'Ações'})}
async function setProj(id,patch){try{const r=await Cmx.cm.post('projects/update',{id,patch});const i=S.projects.findIndex(x=>x.id===id);if(i>=0)S.projects[i]={...S.projects[i],...r.project};Cmx.emit('projects',S.projects);chrome();return r.project}catch(e){toast(e.message)}}
async function renameProj(p){const n=await dlg('Renomear projeto',{input:p.name});if(n&&n!==p.name){await setProj(p.id,{name:n});toast('Renomeado')}}
const newProject=()=>Cmx.lazy('projects').then(m=>m.create()).catch(e=>toast(e.message)),importProject=()=>Cmx.lazy('projects').then(m=>m.importDialog()).catch(e=>toast(e.message));
const openPalette=o=>Cmx.lazy('palette').then(m=>m.open(o)).catch(e=>toast(e.message));

// ---------- navegação (sidebar / drawer / abas) ----------
function sections(){const p=cur();return[{id:'overview',l:'Visão geral',i:'home'},{id:'work',l:'Trabalho',i:'layout',sub:true},{id:'files',l:'Arquivos',i:'folder'},{id:'tasks',l:'Tarefas',i:'tasks',badge:S.pending||0},
  adv()&&{id:'git',l:'Git',i:'git',badge:S.git&&S.git.changes||0},adv()&&{id:'history',l:'Histórico',i:'clock'},adv()&&{id:'ports',l:'Portas',i:'plug',badge:S.ports.length},{id:'settings',l:'Configurações do projeto',i:'sliders'}].filter(Boolean)}
function navList(into,{close}={}){const r=S.route,p=cur(),go=f=>()=>{f();if(close)drawer(false)};
  const item=(i,l,on,f,badge,extra)=>h('button.ni'+(on?'.on':''),{type:'button',onclick:go(f),'aria-current':on?'page':null},ic(i),h('span.nl',l),badge?h('span.nb',String(badge>99?'99+':badge)):null,extra);
  const L=[item('home','Início',r.view==='home',nav.home),item('list','Projetos',r.view==='projects',()=>nav.projects())];
  if(p){L.push(h('div.ng',h('span',{title:p.name},p.name),h('button.ngb',{type:'button','aria-label':'Trocar de projeto',onclick:e=>switcher(e.currentTarget)},ic('chev-d'))));
    for(const s of sections()){const on=r.view==='project'&&r.section===s.id;L.push(item(s.i,s.l,on&&!s.sub,()=>nav.project(p.id,s.id,s.id==='work'?lastTool[p.id]:null),s.badge));
      if(s.sub)for(const [t,[tl,ti]] of Object.entries(TOOL)){const tOn=on&&r.tool===t;L.push(h('button.ni.sub'+(tOn?'.on':''),{type:'button',onclick:go(()=>nav.project(p.id,'work',t)),'aria-current':tOn?'page':null},ic(ti),h('span.nl',tl),t==='editor'&&dirtyN()?h('span.nb.warn',String(dirtyN())):null))}}}
  L.push(h('div.ngsp'),item('gear','Configurações',r.view==='settings',nav.settings));into.replaceChildren(...L)}
const dirtyN=()=>Ed.tabs().filter(t=>t.dirty).length;
function renderSide(){const col=Cmx.get('sideCollapsed')&&!mobile();$('#cmx').classList.toggle('side-col',!!col);
  $side.replaceChildren(h('button.logo',{type:'button',onclick:nav.home,title:'Início'},h('span.lg','</>'),h('b','Codemux')),h('nav.nl-wrap',{'aria-label':'Seções'}));navList($side.querySelector('.nl-wrap'));
  $side.append(h('button.ni.colbtn',{type:'button','aria-label':col?'Expandir menu':'Recolher menu',onclick:toggleSide},ic(col?'chev-r':'chev-l'),h('span.nl','Recolher')))}
const toggleSide=()=>{Cmx.set('sideCollapsed',!Cmx.get('sideCollapsed'));renderSide();setTimeout(()=>Ed.layout(),220)};
function drawer(on){S.drawer=on;$drw.hidden=!on;$dbg.hidden=!on;document.body.classList.toggle('drawer-open',on);if(on){$drw.replaceChildren(h('div.dh',h('button.logo',{type:'button',onclick:()=>{nav.home();drawer(false)}},h('span.lg','</>'),h('b','Codemux')),h('button.tb-i',{type:'button','aria-label':'Fechar menu',onclick:()=>drawer(false)},ic('x'))),h('div.nl-wrap'));navList($drw.querySelector('.nl-wrap'),{close:true});const b=$drw.querySelector('.ni.on')||$drw.querySelector('.ni');b&&b.focus()}}
function renderTabs(){const r=S.route,p=cur(),b=(i,l,on,f,badge)=>h('button.tab'+(on?'.on':''),{type:'button',onclick:f,'aria-current':on?'page':null},h('span.ti2',ic(i),badge?h('span.nb',String(badge>99?'99+':badge)):null),h('span',l));
  if(p&&r.view==='project'){const more=['git','history','ports','settings'].includes(r.section);
    $tabs.replaceChildren(b('home','Projeto',r.section==='overview',()=>nav.project(p.id)),b('layout','Trabalho',r.section==='work',()=>nav.project(p.id,'work',lastTool[p.id]),dirtyN()),b('folder','Arquivos',r.section==='files',()=>nav.project(p.id,'files')),
     b('tasks','Tarefas',r.section==='tasks',()=>nav.project(p.id,'tasks'),S.pending),b('dots','Mais',more,e=>moreSheet(),(S.git&&S.git.changes&&adv())?'•':0))}
  else $tabs.replaceChildren(b('home','Início',r.view==='home',nav.home),b('list','Projetos',r.view==='projects',()=>nav.projects()),b('gear','Configurações',r.view==='settings',nav.settings))}
function moreSheet(){const p=cur();menu(document.querySelector('#cmxTabs .tab:last-child'),[
  adv()&&{l:'Git',i:'git',hint:S.git&&S.git.changes?S.git.changes+' alt.':'',f:()=>nav.project(p.id,'git')},adv()&&{l:'Histórico',i:'clock',f:()=>nav.project(p.id,'history')},adv()&&{l:'Portas',i:'plug',hint:S.ports.length?String(S.ports.length):'',f:()=>nav.project(p.id,'ports')},
  {l:'Lixeira de arquivos',i:'trash',f:()=>Cmx.lazy('trash').then(m=>m.open(p.id))},{l:'Configurações do projeto',i:'sliders',f:()=>nav.project(p.id,'settings')},{sep:1},
  {l:'Trocar de projeto',i:'list',f:()=>nav.projects()},{l:'Configurações do Codemux',i:'gear',f:nav.settings}].filter(Boolean),{title:p.name,sheet:true})}

// ---------- barra de status ----------
function renderStatus(){const p=cur();$stat.hidden=!p||S.route.view!=='project';if($stat.hidden)return;const g=S.git,u=dirtyN(),mode=(p.settings&&p.settings.autosave&&p.settings.autosave!=='inherit')?p.settings.autosave:Cmx.get('autosave');
  const chip=(i,t,f,cls)=>h('button.sc'+(cls?'.'+cls:''),{type:'button',onclick:f},ic(i),t);
  $stat.replaceChildren(g&&g.repo?chip('git',g.branch+(g.changes?` · ${g.changes} alteraç${g.changes>1?'ões':'ão'}`:' · limpo'),()=>nav.project(p.id,'git'),g.changes?'warn':''):chip('git','Sem Git',()=>nav.project(p.id,'git')),
    chip('tasks',S.pending?`${S.pending} pendente${S.pending>1?'s':''}`:'Sem pendências',()=>nav.project(p.id,'tasks')),
    chip('save',u?`${u} não salvo${u>1?'s':''}`:'Tudo salvo',()=>nav.project(p.id,'work','editor'),u?'warn':''),
    h('span.sp'),chip('rotate','Salvamento: '+(mode==='auto'?'automático':'manual'),()=>nav.project(p.id,'settings')))}
const refreshStatus=Cmx.debounce(async()=>{const p=cur();if(!p)return;
  const [g,t]=await Promise.allSettled([Cmx.cm.get('git/summary?path='+enc(p.path)),Cmx.cm.get('tasks?project='+p.id)]);
  S.git=g.status==='fulfilled'?g.value:null;S.pending=t.status==='fulfilled'?t.value.tasks.filter(x=>x.status!=='done').length:0;chrome(false)},500);
document.addEventListener('tide-fs',refreshStatus);Cmx.on('tasks',refreshStatus);Cmx.on('ports',p=>{S.ports=p;renderSide();renderTabs()});
setInterval(()=>{if(!document.hidden&&cur())refreshStatus()},30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&cur())refreshStatus()});

function chrome(force=true){renderTop();renderTabs();if(force||!$side.contains(document.activeElement))renderSide();renderStatus();document.title=(cur()&&S.route.view==='project'?cur().name+' · ':'')+'Codemux';document.body.dataset.view=S.route.view==='project'?S.route.section:S.route.view}

// ---------- teclado: atalhos globais e teclado virtual ----------
addEventListener('keydown',e=>{const c=e.ctrlKey||e.metaKey;
  if(c&&(e.key.toLowerCase()==='k'||(e.shiftKey&&e.key.toLowerCase()==='p'))){e.preventDefault();openPalette()}
  else if(c&&!e.shiftKey&&e.key.toLowerCase()==='p'){e.preventDefault();openPalette({mode:'files'})}
  else if(c&&e.key.toLowerCase()==='g'&&S.route.section==='work'&&S.route.tool==='editor'){e.preventDefault();Cmx.lazy('work').then(m=>m.gotoLineDialog())}},true);
if(window.visualViewport){const vv=visualViewport,chk=()=>document.body.classList.toggle('kb',mobile()&&innerHeight-vv.height>140);vv.addEventListener('resize',chk);vv.addEventListener('scroll',chk)}
matchMedia('(max-width:899px)').addEventListener('change',()=>{chrome();Cmx.emit('layout');setTimeout(()=>Ed.layout(),50)});
Cmx.on('cfg',e=>{if(['mode','autosave'].includes(e.k)){const p=cur();if(p)Ed.setAutosave((p.settings&&p.settings.autosave&&p.settings.autosave!=='inherit')?p.settings.autosave:Cmx.get('autosave'));chrome()}});

// arquivos recentes por projeto (para Visão geral e paleta)
document.addEventListener('tide-open',e=>{const p=cur(),f=e.detail.path;if(!p||!f.startsWith(p.path+'/'))return;const k='cmx-rc:'+p.id;let a=[];try{a=JSON.parse(localStorage.getItem(k)||'[]')}catch{}
  try{localStorage.setItem(k,JSON.stringify([f,...a.filter(x=>x!==f)].slice(0,20)))}catch{}});
Cmx.recent=id=>{try{return JSON.parse(localStorage.getItem('cmx-rc:'+id)||'[]')}catch{return[]}};
// ---------- API pública ----------
const shellApi={nav,state:S,cur,proj,mobile,loadProjects,setProj,renameProj,newProject,importProject,openPalette,refreshStatus,chrome,drawer,tools:TOOL,sections:SECT,lastTool,host,parse};
Cmx.shell=shellApi;
// ---------- início ----------
(async()=>{await loadProjects();
  if(!location.hash||location.hash==='#'||location.hash==='#/'){let last='';try{last=localStorage.getItem('cmx-last')||''}catch{}
    const r=parse(last);if(last&&(r.view!=='project'||proj(r.pid)))history.replaceState(null,'',last)} // volta para onde o usuário estava
  render()
})();
})();
