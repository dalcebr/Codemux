// Tarefas por projeto (~/.codemux/projects/<id>/tasks.json)
module.exports=({store,history})=>{
  const file=pid=>store.p('projects',store.checkId(pid),'tasks.json');
  const load=pid=>store.readJSON(file(pid),{tasks:[]}).tasks||[],save=(pid,a)=>store.writeJSON(file(pid),{tasks:a});
  const ST=['todo','doing','done'],PR=['low','med','high'],MAX=5000;
  function clean(t,old){
    const o={...old};
    if('title' in t){const v=String(t.title||'').trim().slice(0,200);if(!v)throw new Error('Informe o título da tarefa');o.title=v}
    if('notes' in t)o.notes=String(t.notes||'').slice(0,5000);
    if('status' in t){if(!ST.includes(t.status))throw new Error('Status inválido');o.status=t.status}
    if('priority' in t){if(!PR.includes(t.priority))throw new Error('Prioridade inválida');o.priority=t.priority}
    if('files' in t){if(!Array.isArray(t.files))throw new Error('Arquivos inválidos');o.files=[...new Set(t.files.map(f=>String(f).replace(/^\/+/,'').slice(0,500)).filter(Boolean))].slice(0,20)}
    return o}
  const list=pid=>load(pid);
  function save1(pid,t){
    const a=load(pid),now=Date.now();let old=t.id?a.find(x=>x.id===t.id):null;
    if(t.id&&!old)throw new Error('Tarefa não encontrada');
    if(!old){if(a.length>=MAX)throw new Error('Limite de tarefas atingido');
      old={id:store.uid(),title:'',notes:'',status:'todo',priority:'med',files:[],createdAt:now,updatedAt:now,doneAt:null};
      const n=clean(t,old);if(!n.title)throw new Error('Informe o título da tarefa');if(n.status==='done')n.doneAt=now;a.unshift(n);save(pid,a);
      history.add(pid,{type:'task',actor:'user',text:'Tarefa criada: '+n.title});return n}
    const prev=old.status,n=clean(t,old);n.updatedAt=now;
    if(n.status==='done'&&prev!=='done')n.doneAt=now;if(n.status!=='done')n.doneAt=null;
    a[a.indexOf(old)]=n;save(pid,a);
    if(n.status==='done'&&prev!=='done')history.add(pid,{type:'task',actor:'user',text:'Tarefa concluída: '+n.title});
    else if(prev==='done'&&n.status!=='done')history.add(pid,{type:'task',actor:'user',text:'Tarefa reaberta: '+n.title});
    return n}
  // ações em lote: done | reopen | delete | set (patch com status/priority)
  function bulk(pid,ids,action,patch={}){
    const set=new Set((ids||[]).map(String)),a=load(pid),now=Date.now();let n=0,rest=a;
    if(action==='delete'){rest=a.filter(t=>!set.has(t.id));n=a.length-rest.length;save(pid,rest);if(n)history.add(pid,{type:'task',actor:'user',text:n+(n>1?' tarefas excluídas':' tarefa excluída')});return n}
    for(const t of a){if(!set.has(t.id))continue;
      if(action==='done'&&t.status!=='done'){t.status='done';t.doneAt=now;t.updatedAt=now;n++}
      else if(action==='reopen'&&t.status==='done'){t.status='todo';t.doneAt=null;t.updatedAt=now;n++}
      else if(action==='set'){const c=clean({status:patch.status??t.status,priority:patch.priority??t.priority},t);Object.assign(t,c);if(t.status==='done'&&!t.doneAt)t.doneAt=now;if(t.status!=='done')t.doneAt=null;t.updatedAt=now;n++}}
    save(pid,a);if(n&&(action==='done'||action==='reopen'))history.add(pid,{type:'task',actor:'user',text:n+(action==='done'?' tarefa(s) concluída(s)':' tarefa(s) reaberta(s)')});return n}
  function clear(pid,scope){const a=load(pid),rest=scope==='done'?a.filter(t=>t.status!=='done'):[];save(pid,rest);const n=a.length-rest.length;
    if(n)history.add(pid,{type:'task',actor:'user',text:scope==='done'?n+' tarefa(s) concluída(s) removida(s)':'Todas as tarefas excluídas ('+n+')'});return n}
  const counts=pid=>{const a=load(pid);return{total:a.length,done:a.filter(t=>t.status==='done').length,pending:a.filter(t=>t.status!=='done').length}};
  return{list,save:save1,bulk,clear,counts}};
