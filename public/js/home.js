/* Codemux - Início: continuar de onde parou, favoritos, recentes e (no primeiro acesso) um onboarding curto e opcional. */
Cmx.mod.home=(()=>{
const {h,ic,empty}=Cmx.ui;let page;const sh=()=>Cmx.shell;
const lastFile=id=>{try{const s=JSON.parse(localStorage.getItem('cmx-ps:'+id)||'null');return s&&s.active?Cmx.base(s.active):''}catch{return''}};
const mount=host=>{page=h('div.page');host.append(page)};
async function show(){const S=sh(),act=S.state.projects.filter(p=>!p.trashed&&!p.archived);
  if(!Cmx.get('onboarded')&&!act.length)return onboarding();
  const rec=[...act].sort((a,b)=>(b.openedAt||0)-(a.openedAt||0)),last=rec[0],P=await Cmx.lazy('projects'),favs=act.filter(p=>p.favorite);
  const big=(i,t,f)=>h('button.tile2.act',{type:'button',onclick:f},ic(i),h('span',t));
  page.replaceChildren(h('div.pg-h',h('h1','Bem-vindo de volta'),h('div.sub','Seu ambiente de desenvolvimento, no computador ou no celular.')),
   last?h('div.card.cont',h('h2','Continuar de onde parou'),h('div.contr',h('span.pi',ic('folder')),h('div.pt',h('b',last.name),h('small',(last.stack||'Projeto')+(lastFile(last.id)?' · '+lastFile(last.id):'')),h('small.pm2','aberto '+Cmx.ago(last.openedAt))),
     h('button.pbtn',{type:'button',onclick:()=>S.nav.project(last.id,'work','editor')},ic('code'),'Continuar'))):null,
   h('div.grid.qa',big('plus','Novo projeto',()=>S.newProject()),big('download','Importar projeto',()=>S.importProject()),big('list','Todos os projetos',()=>S.nav.projects()),big('search','Pesquisar',()=>S.openPalette())),
   favs.length?h('div.card',h('h2','★ Favoritos'),h('div.plist',{role:'list'},...favs.map(p=>P.card(p,{refresh:show})))):null,
   rec.length?h('div.card',h('h2','Recentes'),h('div.plist',{role:'list'},...rec.filter(p=>!p.favorite).slice(0,5).map(p=>P.card(p,{refresh:show})))):empty('folder','Nenhum projeto ainda','Crie um projeto ou importe uma pasta.','Novo projeto',()=>S.newProject()))}
async function onboarding(){const S=sh();let found=[];try{found=(await Cmx.cm.get('projects/discover')).items}catch{}
  const finish=()=>{Cmx.set('onboarded',true)},btn=(i,t,d,f,pri)=>h('button.imp'+(pri?'.ob':''),{type:'button',onclick:f},ic(i),h('span',h('b',t),h('small',d)));
  page.replaceChildren(h('div.welcome2',h('span.lg.big','</>'),h('h1','Bem-vindo ao Codemux'),h('p','O que você deseja fazer?'),
   h('div.obs',btn('plus','Criar projeto','Começar do zero, com um modelo pronto',()=>{finish();S.newProject()},1),btn('folder','Abrir projeto','Usar uma pasta que você já tem',async()=>{finish();const P=await Cmx.lazy('projects');P.importDialog()}),
    btn('download','Importar projeto','GitHub, ZIP ou pasta',async()=>{finish();const P=await Cmx.lazy('projects');P.importDialog()})),
   found.length?h('div.card.fnd',h('h2','Encontramos pastas que parecem projetos'),h('div.list',...found.slice(0,8).map(f=>h('div.li',ic(f.git?'git':'folder'),h('span.lt',h('b',f.name),h('small',f.stack||'Pasta')),h('button.sbtn',{type:'button',onclick:async e=>{e.currentTarget.disabled=true;try{const r=await Cmx.cm.post('projects/import',{path:f.path});finish();await S.loadProjects();S.nav.project(r.project.id)}catch(err){toast(err.message)}}},'Adicionar'))))):null,
   h('button.skip',{type:'button',onclick:()=>{finish();S.nav.projects()}},'Pular por enquanto')))}
return{mount,show}})();
