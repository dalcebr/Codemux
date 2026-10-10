/* Codemux - Projetos: lista (ativos / arquivados / lixeira), favoritos, busca, criar e importar (pasta, GitHub, ZIP). */
Cmx.mod.projects=(()=>{
const {h,ic,menu,sheet,empty,chunk,confirm}=Cmx.ui,enc=encodeURIComponent;
let page,list,q='';const sh=()=>Cmx.shell;
const TPL=[['vazio','Vazio','file','Só um README'],['web','Site','globe','HTML + CSS + JS'],['node','Node.js','terminal','Servidor simples'],['python','Python','code2','main.py']];

const tabOf=p=>p.trashed?'trash':p.archived?'archived':'active';
function filtered(tab){const nq=Cmx.norm(q);return sh().state.projects.filter(p=>tabOf(p)===tab&&(!nq||Cmx.norm(p.name+' '+p.stack+' '+p.path+' '+(p.desc||'')).includes(nq)))
  .sort((a,b)=>(b.favorite-a.favorite)||((b.openedAt||0)-(a.openedAt||0)))}

// ---- cartão de projeto (reutilizado no Início) ----
function card(p,o={}){const tab=tabOf(p),open=()=>tab==='trash'?projMenu(p,btnM):sh().nav.project(p.id);
  const btnM=h('button.pm',{type:'button','aria-label':'Ações de '+p.name,onclick:e=>{e.stopPropagation();projMenu(p,e.currentTarget)}},ic('dots'));
  const star=tab==='active'?h('button.pm'+(p.favorite?'.on':''),{type:'button','aria-label':p.favorite?'Remover dos favoritos':'Favoritar '+p.name,'aria-pressed':String(!!p.favorite),onclick:async e=>{e.stopPropagation();await sh().setProj(p.id,{favorite:!p.favorite});o.refresh&&o.refresh()}},ic(p.favorite?'star-fill':'star')):null;
  return h('div.pcard',{role:'listitem'},
   h('button.pmain',{type:'button',onclick:open},h('span.pi',ic('folder')),h('span.pt',h('b',p.name),h('small',(p.stack||'Projeto')+(p.desc?' · '+p.desc:'')),
     h('small.pm2',[p.tasks?p.tasks+(p.tasks>1?' tarefas':' tarefa'):null,p.openedAt?'aberto '+Cmx.ago(p.openedAt):null,p.path].filter(Boolean).join(' · ')))),star,btnM)}

function projMenu(p,a){const tab=tabOf(p),S=sh(),it=[];
  if(tab!=='trash')it.push({l:'Abrir',i:'folder',f:()=>S.nav.project(p.id)});
  if(tab==='active')it.push({l:p.favorite?'Remover dos favoritos':'Favoritar',i:p.favorite?'star':'star-fill',f:()=>S.setProj(p.id,{favorite:!p.favorite}).then(refresh)});
  if(tab!=='trash')it.push({l:'Renomear',i:'edit',f:()=>S.renameProj(p).then(refresh)});
  if(tab==='active')it.push({l:'Arquivar',i:'archive',f:()=>S.setProj(p.id,{archived:true}).then(()=>{toast('Arquivado');refresh()})});
  if(tab==='archived')it.push({l:'Restaurar (ativar)',i:'restore',f:()=>S.setProj(p.id,{archived:false}).then(()=>{toast('Restaurado');refresh()})});
  if(tab==='trash')it.push({l:'Restaurar',i:'restore',f:()=>S.setProj(p.id,{trashed:false}).then(()=>{toast('Projeto restaurado');refresh()})},{sep:1},{l:'Excluir definitivamente…',i:'trash',danger:1,f:()=>purge(p)});
  else it.push({sep:1},{l:'Mover para a lixeira',i:'trash',danger:1,f:async()=>{if(await confirm('Mover para a lixeira?',p.name+'\nOs arquivos continuam no disco; você pode restaurar o projeto depois.','Mover',true)){await S.setProj(p.id,{trashed:true});refresh()}}});
  menu(a,it,{title:p.name})}
async function purge(p){const v=await dlg('Excluir “'+p.name+'”?',{text:'Escolha o que remover. Tarefas e histórico deste projeto serão apagados.',buttons:[['Cancelar',null],['Só do Codemux (mantém a pasta)','keep'],['Também a pasta (vai p/ lixeira)','all','danger']]});
  if(!v)return;try{const r=await Cmx.cm.post('projects/delete',{id:p.id,deleteFiles:v==='all'});toast(v==='all'?'Projeto removido; a pasta está na lixeira':'Projeto removido do Codemux');await sh().loadProjects();refresh()}catch(e){toast(e.message)}}

// ---- página ----
function mount(host){page=h('div.page');host.append(page)}
function refresh(){return sh().loadProjects().then(()=>render(sh().state.route))}
function show(ctx){render(ctx.route)}
function render(r){const S=sh(),tab=r.tab||'active',all=S.state.projects,cnt=t=>all.filter(p=>tabOf(p)===t).length;
  const inp=h('input.inp',{type:'search',placeholder:'Pesquisar projetos…','aria-label':'Pesquisar projetos',value:q,autocomplete:'off',oninput:Cmx.debounce(e=>{q=e.target.value;fill(tab)},120)});
  list=h('div.plist',{role:'list'});
  page.replaceChildren(h('div.pg-h',h('h1','Meus projetos'),h('button.sbtn',{type:'button',onclick:importDialog},ic('download'),'Importar'),h('button.pbtn',{type:'button',onclick:create},ic('plus'),'Novo projeto')),
   h('div.pf',h('div.seg',{role:'tablist'},...[['active','Ativos'],['archived','Arquivados'],['trash','Lixeira']].map(([t,l])=>h('button'+(t===tab?'.on':''),{type:'button',role:'tab','aria-selected':String(t===tab),onclick:()=>S.nav.projects(t)},l+(cnt(t)?' ('+cnt(t)+')':'')))),inp),list);
  fill(tab)}
function fill(tab){list.replaceChildren();const v=filtered(tab);
  if(!v.length){const all=sh().state.projects.filter(p=>tabOf(p)===tab);list.append(q?empty('search','Nenhum projeto encontrado','Tente outro termo.'):tab==='active'?empty('folder','Nenhum projeto ainda','Crie um projeto novo ou importe uma pasta que você já tem.','Novo projeto',create):empty(tab==='trash'?'trash':'archive',tab==='trash'?'Lixeira vazia':'Nada arquivado',tab==='trash'?'Projetos movidos para a lixeira aparecem aqui.':'Arquive projetos que você não usa mais, sem excluí-los.'));return}
  const favs=tab==='active'?v.filter(p=>p.favorite):[],rest=tab==='active'?v.filter(p=>!p.favorite):v;
  if(favs.length){list.append(h('div.sec','★ Favoritos'));favs.forEach(p=>list.append(card(p,{refresh})));if(rest.length)list.append(h('div.sec','Outros'))}
  chunk(list,rest,p=>card(p,{refresh}),60)}

// ---- criar ----
async function create(){let tpl='vazio',dir='';
  const name=h('input.inp',{placeholder:'Ex.: Loja Online','aria-label':'Nome do projeto',maxlength:'80',autocomplete:'off'}),
   place=h('span.pl','Início'),chips=h('div.tplg',{role:'radiogroup','aria-label':'Modelo'});
  const drawT=()=>chips.replaceChildren(...TPL.map(([id,l,i,d])=>h('button.tpl'+(id===tpl?'.on':''),{type:'button',role:'radio','aria-checked':String(id===tpl),onclick:()=>{tpl=id;drawT()}},ic(i),h('b',l),h('small',d))));drawT();
  const sp=sheet({title:'Novo projeto',body:[h('label.fl','Nome',name),h('div.fl','Modelo',chips),h('div.fl','Local',h('div.where',place,h('button.sbtn',{type:'button',onclick:async()=>{const p=await Ed.pick(dir,'Criar aqui','Onde criar o projeto');if(p!==null){dir=p;place.textContent='Início'+(p?' / '+p.split('/').join(' / '):'')}}},'Alterar')))],
   actions:[{l:'Cancelar'},{l:'Criar projeto',pri:true,keep:true,f:async()=>{const n=name.value.trim();if(!n){toast('Informe o nome');name.focus();return false}
    try{const r=await Cmx.cm.post('projects/create',{name:n,template:tpl,dir});await sh().loadProjects();sp.close();toast('Projeto criado');sh().nav.project(r.project.id)}catch(e){toast(e.message);return false}}}]});
  setTimeout(()=>name.focus(),50);name.onkeydown=e=>{if(e.key==='Enter')sp.foot.querySelector('.pri').click()}}

// ---- importar ----
async function addPath(path){const r=await Cmx.cm.post('projects/import',{path});await sh().loadProjects();toast('Projeto adicionado');sh().nav.project(r.project.id);return r.project}
function importDialog(){const opt=(i,t,d,f)=>h('button.imp',{type:'button',onclick:()=>{sp.close();f()}},ic(i),h('span',h('b',t),h('small',d)));
  const sp=sheet({title:'Importar projeto',body:[opt('folder','Pasta que já existe','Escolha uma pasta do seu aparelho',fromFolder),opt('git','Clonar do GitHub','Baixa um repositório pela URL',fromGit),opt('archive','Enviar um ZIP','Envia e extrai um .zip ou .tar.gz',fromZip)],actions:[{l:'Fechar'}]})}
async function fromFolder(){const p=await Ed.pick('','Usar esta pasta como projeto','Escolher pasta do projeto');if(p===null)return;if(!p)return toast('Escolha uma subpasta, não o Início inteiro');try{await addPath(p)}catch(e){toast(e.message)}}
async function fromGit(){const url=await dlg('Clonar do GitHub',{text:'Cole a URL (https://github.com/usuario/repo.git). Para repositórios privados, configure a conta GitHub antes.',input:''});if(!url)return;
  const dir=await Ed.pick('','Clonar aqui','Pasta de destino');if(dir===null)return;toast('Clonando… pode demorar');
  try{const r=await api('/api/git/clone',{url,dir});await addPath(r.path)}catch(e){toast(e.message)}}
async function fromZip(){const inp=h('input',{type:'file',accept:'.zip,.tar,.tar.gz,.tgz,.tar.bz2,.tar.xz',hidden:true});document.body.append(inp);
  inp.onchange=async()=>{const f=inp.files[0];inp.remove();if(!f)return;
   try{const names=new Set((await api('/api/list?path=')).items.map(i=>i.name));let n=f.name.replace(/[^\w.\-+() ]/g,'_'),k=1;const m=n.match(/^(.*?)(\.zip|\.tar\.gz|\.tgz|\.tar\.bz2|\.tar\.xz|\.tar)$/i);if(!m)return toast('Formato não suportado');
    while(names.has(n)||names.has(m[1]+(k>1?'_'+k:''))){k++;n=m[1]+'_'+k+m[2]}
    toast('Enviando '+f.name+'…');const r=await fetch('/api/upload?dir=&name='+enc(n),{method:'POST',body:f});if(!r.ok)throw new Error('Falha no envio');
    toast('Extraindo…');await api('/api/extract',{path:n});const folder=n.replace(/(\.zip|\.tar\.gz|\.tgz|\.tar\.bz2|\.tar\.xz|\.tar)$/i,'');
    let dest=folder; // /api/extract cria a pasta com o nome do arquivo
    await api('/api/delete',{path:n}); // remove o arquivo compactado que acabamos de enviar
    const inner=(await api('/api/list?path='+enc(dest))).items;if(inner.length===1&&inner[0].dir)dest=dest+'/'+inner[0].name; // zip com uma única pasta dentro
    await addPath(dest)}catch(e){toast(e.message)}};inp.click()}

return{mount,show,create,importDialog,card,projMenu,addPath,refresh}})();
