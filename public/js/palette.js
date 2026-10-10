/* Codemux - paleta de comandos e busca global: comandos, arquivos, pastas, conteúdo, símbolos, tarefas e projetos. */
Cmx.mod.palette=(()=>{
const {h,ic,sheet}=Cmx.ui,enc=encodeURIComponent,S=()=>Cmx.shell;
const MODES=[['commands','Comandos','list'],['files','Arquivos','file'],['search','Pesquisar','search']];
let sp,inp,listEl,mode='commands',items=[],idx=0,tok=0;

// ---- comandos (montados a cada abertura, conforme o contexto) ----
function commands(){const s=S(),p=s.cur(),inP=!!p&&s.state.route.view==='project',adv=Cmx.get('mode')==='advanced',out=[];
  const add=(g,l,i,f,o={})=>{if(o.when===false)return;out.push({g,l,i,f,k:o.k||''})};
  add('Navegação','Ir para o Início','home',s.nav.home);add('Navegação','Ir para Projetos','list',()=>s.nav.projects());add('Navegação','Configurações do Codemux','gear',s.nav.settings);
  for(const [id,[l,i]] of Object.entries(s.sections)){if(id==='work'||(!adv&&['git','history','ports'].includes(id)))continue;add('Projeto: '+(p?p.name:''),(id==='overview'?'Ir para ':'Abrir ')+l,i,()=>s.nav.project(p.id,id),{when:inP,k:id})}
  add('Projeto','Abrir Editor','code',()=>s.nav.project(p.id,'work','editor'),{when:inP});add('Projeto','Abrir Terminal','terminal',()=>s.nav.project(p.id,'work','terminal'),{when:inP});add('Projeto','Abrir IA','sparkle',()=>s.nav.project(p.id,'work','ai'),{when:inP});
  add('Criar','Criar arquivo','file-plus',()=>{s.nav.project(p.id,'files');setTimeout(()=>Files.newItem('file'),250)},{when:inP});add('Criar','Criar pasta','folder-plus',()=>{s.nav.project(p.id,'files');setTimeout(()=>Files.newItem('dir'),250)},{when:inP});
  add('Criar','Criar tarefa','tasks',async()=>{s.nav.project(p.id,'tasks');const m=await Cmx.lazy('tasks');setTimeout(()=>m.newTask(),350)},{when:inP});
  add('Criar','Novo projeto','plus',()=>s.newProject());add('Criar','Importar projeto','download',()=>s.importProject());add('Criar','Novo terminal','terminal',()=>{s.nav.project(p.id,'work','terminal');setTimeout(()=>Term.here(p.path),200)},{when:inP});
  const hasF=!!Ed.curPath();
  add('Editor','Salvar tudo','save',()=>Ed.saveAll().then(n=>toast(n?n+' arquivo(s) salvo(s)':'Nada para salvar')),{when:inP});
  add('Editor','Ir para a linha…','arrow',()=>Cmx.lazy('work').then(m=>m.gotoLineDialog()),{when:inP&&hasF});add('Editor','Formatar documento','code2',()=>Ed.format(),{when:inP&&hasF});add('Editor','Buscar e substituir no arquivo','search',()=>{s.nav.project(p.id,'work','editor');setTimeout(()=>Ed.find(),250)},{when:inP&&hasF});
  add('IA','Perguntar à IA sobre o arquivo atual','sparkle',()=>Cmx.lazy('work').then(m=>m.askAboutFile(Ed.curPath())),{when:inP&&hasF});add('IA','Alterações da IA (revisar / desfazer)','diff',()=>Cmx.lazy('aichanges').then(m=>m.list(p.path)),{when:inP});add('IA','Configurar IA (chave, modelo, modo cuidadoso)','sliders',()=>window.AIUI&&AIUI.openCfg());
  add('Arquivos','Lixeira de arquivos','trash',()=>Cmx.lazy('trash').then(m=>m.open(p.id)),{when:inP});
  add('Preferências','Tema: Claro','sun',()=>Cmx.set('theme','light'));add('Preferências','Tema: Escuro','moon',()=>Cmx.set('theme','dark'));add('Preferências','Tema: Sistema','monitor',()=>Cmx.set('theme','system'));
  add('Preferências','Salvamento: '+(Cmx.get('autosave')==='auto'?'mudar para manual':'mudar para automático'),'rotate',()=>Cmx.set('autosave',Cmx.get('autosave')==='auto'?'manual':'auto'));
  add('Preferências','Modo: '+(adv?'mudar para Simples':'mudar para Avançado'),'layout',()=>Cmx.set('mode',adv?'simple':'advanced'));add('Preferências','Usar interface clássica (janelas)','monitor',()=>{Cmx.set('ui','classic');location.hash='';location.reload()});
  for(const pr of s.state.projects.filter(x=>!x.trashed&&x.id!==(p&&p.id)).slice(0,60))add('Projetos','Abrir projeto: '+pr.name,pr.favorite?'star-fill':'folder',()=>s.nav.project(pr.id),{k:pr.stack});
  return out}

// ---- fontes de resultado ----
function fuzzy(txt,q){txt=Cmx.norm(txt);if(!q)return 1;if(txt.includes(q))return 3;let i=0;for(const c of txt){if(c===q[i])i++;if(i===q.length)return 1}return 0}
async function gather(q){const my=++tok,p=S().cur(),nq=Cmx.norm(q.trim());let r=[];
  if(mode==='commands'){r=commands().map(c=>({...c,s:fuzzy(c.g+' '+c.l+' '+c.k,nq)})).filter(c=>c.s).sort((a,b)=>b.s-a.s).slice(0,80).map(c=>({g:c.g,t:c.l,i:c.i,run:c.f}))}
  else if(!p||S().state.route.view!=='project'){r=[]}
  else if(mode==='files'){const open=Ed.tabs().map(t=>t.path),rec=Cmx.recent(p.id);
    if(!nq){const seen=new Set();for(const f of [...open,...rec]){if(seen.has(f)||!f.startsWith(p.path+'/'))continue;seen.add(f);r.push({g:open.includes(f)?'Abertos':'Recentes',t:Cmx.base(f),sub:f.slice(p.path.length+1),i:'file',run:()=>Ed.openFile(f)})}}
    else{const d=await Cmx.cm.get('search?root='+enc(p.path)+'&q='+enc(q.trim())+'&mode=files&limit=60');if(my!==tok)return null;r=d.files.map(f=>({g:'Arquivos',t:f.name,sub:f.path,i:f.dir?'folder':'file',run:()=>f.dir?goDir(p,f.path):Ed.openFile(p.path+'/'+f.path)}))}}
  else if(nq){const d=await Cmx.cm.get('search?root='+enc(p.path)+'&q='+enc(q.trim())+'&mode=all&limit=40');if(my!==tok)return null;
    r.push(...d.files.slice(0,15).map(f=>({g:'Arquivos e pastas',t:f.name,sub:f.path,i:f.dir?'folder':'file',run:()=>f.dir?goDir(p,f.path):Ed.openFile(p.path+'/'+f.path)})));
    r.push(...d.symbols.map(x=>({g:'Símbolos',t:x.name,sub:x.kind+' · '+x.path+':'+x.line,i:'code2',run:()=>Ed.openFile(p.path+'/'+x.path,{line:x.line})})));
    r.push(...d.content.map(x=>({g:'Conteúdo',t:x.text||'(linha vazia)',sub:x.path+':'+x.line,i:'search',run:()=>Ed.openFile(p.path+'/'+x.path,{line:x.line})})));
    try{const tk=(await Cmx.cm.get('tasks?project='+p.id)).tasks.filter(t=>Cmx.norm(t.title+' '+t.notes).includes(nq)).slice(0,8);if(my!==tok)return null;r.push(...tk.map(t=>({g:'Tarefas',t:t.title,sub:t.status==='done'?'Concluída':'Pendente',i:'tasks',run:()=>S().nav.project(p.id,'tasks')})))}catch{}
    if(d.truncated)r.push({g:'Aviso',t:'Projeto grande: a busca foi limitada',i:'info',run:()=>{}})}
  if(mode==='search'&&nq){r.push(...S().state.projects.filter(x=>!x.trashed&&Cmx.norm(x.name+' '+x.stack).includes(nq)).slice(0,6).map(x=>({g:'Projetos',t:x.name,sub:x.stack||'Projeto',i:'folder',run:()=>S().nav.project(x.id)})))}
  return r}
function goDir(p,rel){S().nav.project(p.id,'files');setTimeout(()=>Files.go(p.path+'/'+rel),250)}

// ---- interface ----
function draw(){listEl.replaceChildren();inp.removeAttribute('aria-activedescendant');
  if(!items.length){const p=S().cur(),needP=mode!=='commands'&&(!p||S().state.route.view!=='project');listEl.append(h('div.pe',needP?'Abra um projeto para pesquisar arquivos e conteúdo.':inp.value.trim()||mode==='files'?'Nada encontrado.':(mode==='search'?'Digite para pesquisar em arquivos, conteúdo, símbolos, tarefas e projetos.':'Nenhum comando.')));return}
  let g='';items.forEach((it,i)=>{if(it.g!==g){g=it.g;listEl.append(h('div.pg',g))}
    listEl.append(h('button.pi2'+(i===idx?'.on':''),{type:'button',role:'option',id:'pal'+i,'aria-selected':String(i===idx),onclick:()=>run(i),onmousemove:()=>{if(idx!==i){idx=i;mark()}}},ic(it.i),h('span.lt',h('b',it.t),it.sub?h('small',it.sub):null)))});
  inp.setAttribute('aria-activedescendant','pal'+idx)}
function mark(){listEl.querySelectorAll('.pi2').forEach((b,i)=>{const on=i===idx;b.classList.toggle('on',on);b.setAttribute('aria-selected',String(on))});const c=listEl.querySelector('.pi2.on');if(c){c.scrollIntoView({block:'nearest'});inp.setAttribute('aria-activedescendant',c.id)}}
async function refresh(){const r=await gather(inp.value);if(r===null)return;items=r;idx=0;draw()}
function run(i){const it=items[i];if(!it)return;sp.close();setTimeout(()=>{try{it.run()}catch(e){toast(e.message)}},60)}
function setMode(m){mode=m;sp.body.querySelectorAll('.pmode button').forEach(b=>{const on=b.dataset.m===m;b.classList.toggle('on',on);b.setAttribute('aria-selected',String(on))});inp.placeholder=({commands:'O que você deseja fazer?',files:'Nome do arquivo…',search:'Pesquisar no projeto…'})[m];refresh();inp.focus()}
function open(o={}){mode=o.mode||'commands';const mob=S().mobile();
  inp=h('input.inp.pin',{type:'text',role:'combobox','aria-expanded':'true','aria-controls':'palList','aria-label':'Pesquisar e comandos',autocomplete:'off',autocapitalize:'off',autocorrect:'off',spellcheck:'false',enterkeyhint:'go',value:o.q||''});
  listEl=h('div.plist2#palList',{role:'listbox','aria-label':'Resultados'});
  const modes=h('div.pmode',{role:'tablist'},...MODES.map(([m,l,i])=>h('button'+(m===mode?'.on':''),{type:'button',role:'tab','data-m':m,'aria-selected':String(m===mode),onclick:()=>setMode(m)},ic(i),l)));
  sp=sheet({title:'Pesquisar e comandos',full:mob,label:'Paleta de comandos',body:[inp,modes,listEl],actions:null});
  sp.el.classList.add('pal');
  inp.oninput=Cmx.debounce(refresh,130);
  inp.onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();idx=Math.min(items.length-1,idx+1);mark()}else if(e.key==='ArrowUp'){e.preventDefault();idx=Math.max(0,idx-1);mark()}
    else if(e.key==='Enter'){e.preventDefault();run(idx)}else if(e.key==='Tab'){e.preventDefault();const i=MODES.findIndex(m=>m[0]===mode);setMode(MODES[(i+(e.shiftKey?2:1))%3][0])}};
  setMode(mode);setTimeout(()=>{inp.focus();inp.select()},50)}
return{open}})();
