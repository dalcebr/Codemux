/* Codemux - Visão geral do projeto: números reais (arquivos, tarefas, Git), arquivos recentes, atividade e acesso rápido. */
Cmx.mod.overview=(()=>{
const {h,ic,empty}=Cmx.ui,enc=encodeURIComponent;let page,tok=0;const sh=()=>Cmx.shell;
const mount=host=>{page=h('div.page');host.append(page)};
const recent=id=>{try{return JSON.parse(localStorage.getItem('cmx-rc:'+id)||'[]')}catch{return[]}};
async function show(ctx){const p=ctx.project,S=sh(),t=++tok;
  const sk=n=>h('b.sk','…'),tile=(l,v,f)=>h((f?'button':'div')+'.tile2',{type:f?'button':null,onclick:f},v,h('span',l));
  const cFiles=sk(),cPend=sk(),cDone=sk(),cChg=sk(),cCom=sk();
  const rc=recent(p.id).slice(0,6),hist=h('div.list',{'aria-live':'polite'},h('small.mu','Carregando…')),tasks=h('div.list');
  const last=(()=>{try{return JSON.parse(localStorage.getItem('cmx-ps:'+p.id)||'null')}catch{return null}})();
  page.replaceChildren(
   h('div.pg-h',h('h1',p.name),h('div.chips',h('span.chip.ac',p.stack||'Projeto'),h('span.chip','/'+p.path),h('span.chip.git',{hidden:true})),),
   h('div.cta',h('button.pbtn',{type:'button',onclick:()=>S.nav.project(p.id,'work',S.lastTool[p.id]||'editor')},ic('code'),'Continuar trabalhando'+(last&&last.active?' · '+Cmx.base(last.active):'')),
     h('button.sbtn',{type:'button',onclick:()=>S.nav.project(p.id,'work','terminal')},ic('terminal'),'Terminal'),h('button.sbtn',{type:'button',onclick:()=>S.nav.project(p.id,'work','ai')},ic('sparkle'),'IA')),
   h('div.grid',tile('Arquivos',cFiles,()=>S.nav.project(p.id,'files')),tile('Tarefas pendentes',cPend,()=>S.nav.project(p.id,'tasks')),tile('Concluídas',cDone,()=>S.nav.project(p.id,'tasks')),
     Cmx.get('mode')==='advanced'?tile('Alterações no Git',cChg,()=>S.nav.project(p.id,'git')):null,Cmx.get('mode')==='advanced'?tile('Commits',cCom,()=>S.nav.project(p.id,'git')):null),
   h('div.two',
    h('div.card',h('h2','Arquivos recentes'),rc.length?h('div.list',...rc.map(f=>h('button.li',{type:'button',onclick:()=>Ed.openFile(f)},ic('file'),h('span.lt',h('b',Cmx.base(f)),h('small',f.slice(p.path.length+1)))))):h('small.mu','Nenhum arquivo aberto ainda. Abra um arquivo em Trabalho › Editor.')),
    h('div.card',h('h2','Tarefas em aberto',h('span.sp'),h('button.lk',{type:'button',onclick:()=>S.nav.project(p.id,'tasks')},'Ver todas')),tasks)),
   Cmx.get('mode')==='advanced'?h('div.card',h('h2','Atividade recente',h('span.sp'),h('button.lk',{type:'button',onclick:()=>S.nav.project(p.id,'history')},'Ver histórico')),hist):null);
  // números reais do servidor (em paralelo)
  const [st,tk,gs,hi]=await Promise.allSettled([Cmx.cm.get('projects/stats?id='+p.id),Cmx.cm.get('tasks?project='+p.id),Cmx.cm.get('git/summary?path='+enc(p.path)),Cmx.cm.get('history?project='+p.id+'&limit=5')]);
  if(t!==tok)return;
  cFiles.textContent=st.status==='fulfilled'?st.value.files.toLocaleString('pt-BR')+(st.value.truncated?'+':''):'–';
  if(tk.status==='fulfilled'){const a=tk.value.tasks,pend=a.filter(x=>x.status!=='done');cPend.textContent=pend.length;cDone.textContent=a.length-pend.length;
    tasks.replaceChildren(...(pend.length?pend.slice(0,5).map(x=>h('button.li',{type:'button',onclick:()=>S.nav.project(p.id,'tasks')},ic(x.status==='doing'?'rotate':'circle'),h('span.lt',h('b',x.title),h('small',({high:'Prioridade alta',med:'Prioridade média',low:'Prioridade baixa'})[x.priority]+(x.files.length?' · '+Cmx.base(x.files[0]):''))))):[h('small.mu',a.length?'Tudo concluído. 🎉':'Nenhuma tarefa. Crie a primeira em Tarefas.')]))}
  else{cPend.textContent=cDone.textContent='–'}
  const gc=page.querySelector('.chip.git');
  if(gs.status==='fulfilled'&&gs.value.repo){cChg.textContent=gs.value.changes;cCom.textContent=gs.value.commits;gc.hidden=false;gc.replaceChildren(ic('git'),gs.value.branch+(gs.value.changes?' · '+gs.value.changes+' alt.':''))}else{cChg.textContent='–';cCom.textContent='–'}
  if(hi.status==='fulfilled'){const it=hi.value.items;hist.replaceChildren(...(it.length?it.map(e=>h('div.li.ev',h('span.hm',Cmx.hm(e.t)),h('span.lt',h('b',e.text),h('small',Cmx.dayLabel(e.t)+(e.file?' · '+e.file:''))))):[h('small.mu','Sem eventos ainda.')]))}}
return{mount,show,hide(){tok++}}})();
