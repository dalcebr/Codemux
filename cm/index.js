// Codemux - API /api/cm/*: projetos, tarefas, histórico, lixeira, busca, info/cópia/mover, extras de Git.
const path=require('path');
module.exports=({ROOT,safe,git})=>{
  const store=require('./store')({ROOT}),history=require('./history')({store}),trash=require('./trash')({ROOT,safe,store,history}),
    projects=require('./projects')({ROOT,safe,store,history}),tasks=require('./tasks')({store,history}),fsops=require('./fsops')({ROOT,safe,store}),gitx=require('./gitx')({safe,git});
  const aichanges=require('./aichanges')({ROOT,safe,store,history,trash});aichanges.bind(r=>projects.projectOf(r));
  const pr=r=>projects.projectOf(r);
  const relIn=(p,r)=>r===p.path?'':r.slice(p.path.length+1);
  // registra um evento no histórico do projeto dono do caminho (se houver)
  function log(r,evt){try{const p=pr(r);if(p)history.add(p.id,{...evt,file:evt.file===undefined?relIn(p,r):evt.file})}catch{}}
  const base=r=>String(r).split('/').pop();
  const hooks={
    log,store,history,trash,projects,tasks,aichanges,gitx,
    onWrite:r=>log(r,{type:'edit',actor:'user',text:'Você editou '+base(r)}),
    onUpload:r=>log(r,{type:'file',actor:'user',text:'Arquivo enviado: '+base(r)}),
    onFs:(kind,r,extra)=>log(r,{type:'file',actor:'user',text:({mkdir:'Pasta criada: ',newfile:'Arquivo criado: ',rename:'Renomeado para '})[kind]+(extra||base(r))}),
    onGit(r,op,ok,msg){if(!ok)return;const t={commit:'Commit: '+String(msg||'').slice(0,120),push:'Push enviado',pull:'Pull realizado',checkout:'Branch alterada: '+(msg||''),init:'Repositório Git criado',remote:'Remoto configurado'}[op];
      if(t)log(r,{type:'git',actor:'git',text:t,file:''})}};

  const need=(b,k)=>{if(b[k]===undefined||b[k]===null||b[k]==='')throw new Error('Parâmetro ausente: '+k);return b[k]};
  async function handle(k,b,q,send){
    const Q=n=>q.get(n)||'',P=()=>store.checkId(Q('project'));
    switch(k){
      // ---- projetos ----
      case 'GET /api/cm/projects':return send(200,{projects:projects.list().map(p=>({...p,tasks:p.trashed?null:tasks.counts(p.id).pending}))});
      case 'POST /api/cm/projects/create':return send(200,{project:projects.create(b)});
      case 'POST /api/cm/projects/import':return send(200,{project:projects.importPath(b.path)});
      case 'POST /api/cm/projects/update':return send(200,{project:projects.update(need(b,'id'),b.patch||{})});
      case 'POST /api/cm/projects/delete':{const p=projects.get(need(b,'id'));let moved=null;
        if(b.deleteFiles){try{moved=trash.put(p.path,{project:null})}catch(e){throw new Error('Não foi possível mover a pasta: '+e.message)}}
        projects.remove(p.id);require('fs').rmSync(store.p('trash',p.id),{recursive:true,force:true});return send(200,{ok:1,movedToTrash:!!moved})}
      case 'GET /api/cm/projects/stats':return send(200,projects.stats(Q('id')));
      case 'GET /api/cm/projects/discover':return send(200,{items:projects.discover()});
      case 'POST /api/cm/projects/refresh':return send(200,{project:projects.refreshStack(store.checkId(need(b,'id')))});
      // ---- arquivos ----
      case 'GET /api/cm/fs/info':return send(200,fsops.info(Q('path')));
      case 'POST /api/cm/fs/copy':{const out=fsops.copy(b.items,b.dest);out.forEach(r=>log(r,{type:'file',actor:'user',text:'Arquivo copiado: '+base(r)}));return send(200,{created:out})}
      case 'POST /api/cm/fs/move':{const out=fsops.move(b.items,b.dest);out.forEach(m=>{if(m.from!==m.to)log(m.to,{type:'file',actor:'user',text:'Movido: '+base(m.to)})});return send(200,{moved:out})}
      case 'POST /api/cm/fs/trash':{const items=Array.isArray(b.items)?b.items:[];if(!items.length)throw new Error('Nada selecionado');if(items.length>2000)throw new Error('Itens demais');
        const out=[],err=[];for(const r of items){try{const p=pr(String(r));out.push(trash.put(String(r),{project:p?p.id:null}))}catch(e){err.push(base(r)+': '+e.message)}}
        return send(200,{trashed:out.map(m=>({id:m.id,name:m.name,path:m.orig})),errors:err})}
      case 'GET /api/cm/trash':return send(200,{items:trash.list(Q('project')||null)});
      case 'POST /api/cm/trash/restore':return send(200,{restored:trash.restore(b.project||null,(b.ids||[]).map(String))});
      case 'POST /api/cm/trash/purge':return send(200,{purged:trash.purge(b.project||null,(b.ids||[]).map(String))});
      case 'POST /api/cm/trash/empty':return send(200,{purged:trash.empty(b.project||null)});
      case 'GET /api/cm/search':return send(200,fsops.search(Q('root'),Q('q'),{mode:Q('mode')||'all',limit:Q('limit')}));
      // ---- tarefas ----
      case 'GET /api/cm/tasks':return send(200,{tasks:tasks.list(P())});
      case 'POST /api/cm/tasks/save':return send(200,{task:tasks.save(store.checkId(b.project),b.task||{})});
      case 'POST /api/cm/tasks/bulk':return send(200,{n:tasks.bulk(store.checkId(b.project),b.ids,String(b.action),b.patch||{})});
      case 'POST /api/cm/tasks/clear':return send(200,{n:tasks.clear(store.checkId(b.project),b.scope==='done'?'done':'all')});
      // ---- histórico ----
      case 'GET /api/cm/history':return send(200,history.list(P(),{before:Q('before'),limit:Q('limit'),type:Q('type'),q:Q('q')}));
      case 'POST /api/cm/history/clear':history.clear(store.checkId(need(b,'project')));return send(200,{ok:1});
      // ---- git ----
      case 'GET /api/cm/git/summary':return send(200,await gitx.summary(Q('path')));
      case 'GET /api/cm/git/diff':return send(200,await gitx.diff(Q('path'),Q('file')));
      default:return send(404,{error:'Rota não encontrada'})}}
  return{...hooks,handle}};
