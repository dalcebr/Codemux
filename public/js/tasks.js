/* Codemux - Tarefas do projeto: criar, editar, concluir, reabrir, excluir, seleção múltipla, filtros, ordenação, prioridade,
   status, datas e vínculo com arquivos (toque abre no editor). Dados em ~/.codemux (por projeto). */
Cmx.mod.tasks=(()=>{
const {h,ic,menu,sheet,empty,chunk,confirm}=Cmx.ui,enc=encodeURIComponent,sh=()=>Cmx.shell;
const PR={high:['Alta','rd'],med:['Média','warn'],low:['Baixa','']},ST={todo:['A fazer','circle'],doing:['Em andamento','rotate'],done:['Concluída','check-c']};
let page,pid=null,tasks=[],sel=new Set(),selMode=false,q='',fStatus='open',fPrio='',sort='recent',host,listEl,barEl,statEl,tok=0;

const ord={recent:(a,b)=>b.createdAt-a.createdAt,priority:(a,b)=>({high:0,med:1,low:2})[a.priority]-({high:0,med:1,low:2})[b.priority]||b.createdAt-a.createdAt,
 title:(a,b)=>a.title.localeCompare(b.title,undefined,{sensitivity:'base'}),status:(a,b)=>({doing:0,todo:1,done:2})[a.status]-({doing:0,todo:1,done:2})[b.status]||b.createdAt-a.createdAt};
function visible(){const nq=Cmx.norm(q);return tasks.filter(t=>(fStatus==='all'||(fStatus==='open'?t.status!=='done':t.status===fStatus))&&(!fPrio||t.priority===fPrio)&&(!nq||Cmx.norm(t.title+' '+t.notes+' '+t.files.join(' ')).includes(nq))).sort(ord[sort])}
const when=t=>t.status==='done'&&t.doneAt?'Concluída em '+Cmx.dt(t.doneAt).replace(' ',' às '):'Criada em '+Cmx.dt(t.createdAt).replace(' ',' às ');
const api2=(u,b)=>Cmx.cm.post('tasks/'+u,{project:pid,...b});
const changed=()=>{Cmx.emit('tasks')};

function mount(el){host=el;page=h('div.page');host.append(page)}
async function show(ctx){pid=ctx.project.id;const t=++tok;sel.clear();selMode=false;draw();await load();if(t===tok)render()}
async function load(){try{tasks=(await Cmx.cm.get('tasks?project='+pid)).tasks}catch(e){toast(e.message)}}
async function reload(){await load();render();changed()}

function draw(){
  const search=h('input.inp',{type:'search',placeholder:'Pesquisar tarefas…','aria-label':'Pesquisar tarefas',value:q,autocomplete:'off',oninput:Cmx.debounce(e=>{q=e.target.value;render()},120)});
  const segs=[['open','Pendentes'],['doing','Em andamento'],['done','Concluídas'],['all','Todas']];
  statEl=h('div.seg.tsf',{role:'tablist'},...segs.map(([k,l])=>h('button'+(k===fStatus?'.on':''),{type:'button',role:'tab','aria-selected':String(k===fStatus),'data-k':k,onclick:()=>{fStatus=k;render()}},l)));
  barEl=h('div.fsel.tbar',{hidden:true});listEl=h('div.list.tl',{role:'list','aria-label':'Tarefas'});
  page.replaceChildren(h('div.pg-h',h('h1','Tarefas'),h('button.sbtn',{type:'button','aria-label':'Mais ações',onclick:e=>topMenu(e.currentTarget)},ic('dots')),h('button.pbtn',{type:'button',onclick:()=>edit()},ic('plus'),'Nova tarefa')),
   h('div.pf',statEl,search,h('button.sbtn',{type:'button',onclick:e=>filterMenu(e.currentTarget)},ic('filter'),h('span.hm',(fPrio?PR[fPrio][0]:'Filtro'))),h('button.sbtn',{type:'button',onclick:e=>sortMenu(e.currentTarget)},ic('sort'),h('span.hm','Ordenar'))),
   barEl,listEl)}
function render(){statEl.querySelectorAll('button').forEach(b=>{const on=b.dataset.k===fStatus;b.classList.toggle('on',on);b.setAttribute('aria-selected',String(on))});
  const v=visible(),n=tasks.filter(t=>t.status!=='done').length;listEl.replaceChildren();
  if(!tasks.length)listEl.append(empty('tasks','Nenhuma tarefa ainda','Anote o que falta fazer neste projeto e vincule aos arquivos relacionados.','Criar a primeira tarefa',()=>edit()));
  else if(!v.length)listEl.append(empty('search','Nenhuma tarefa aqui','Ajuste a busca ou os filtros.'));
  else chunk(listEl,v,row,60);
  bar();document.dispatchEvent(new Event('tide-tasks'))}
function row(t){const on=sel.has(t.id),done=t.status==='done';
  const chk=h('button.tck'+(done?'.done':'')+(on?'.sel':''),{type:'button','aria-label':selMode?(on?'Desmarcar':'Marcar'):(done?'Reabrir tarefa':'Concluir tarefa'),'aria-pressed':String(selMode?on:done),
   onclick:e=>{e.stopPropagation();if(selMode||sel.size)toggleSel(t.id);else setStatus([t.id],done?'todo':'done')}},selMode||sel.size?(on?ic('check'):null):(done?ic('check'):null));
  const el=h('div.trow'+(done?'.dn':'')+(on?'.sel':''),{role:'listitem',tabindex:'0','data-id':t.id},chk,
   h('div.tm',h('b'+(done?'.strike':''),t.title),h('small',when(t)),
    h('div.chips',h('span.chip.'+PR[t.priority][1],PR[t.priority][0]),t.status==='doing'?h('span.chip.ac',ic('rotate'),'Em andamento'):null,...t.files.slice(0,3).map(f=>h('button.chip.fl',{type:'button',title:f,onclick:e=>{e.stopPropagation();openFile(f)}},ic('file'),Cmx.base(f))),t.files.length>3?h('span.chip','+'+(t.files.length-3)):null),
    t.notes?h('p.nt',t.notes):null),
   h('button.pm',{type:'button','aria-label':'Ações da tarefa',onclick:e=>{e.stopPropagation();rowMenu(t,e.currentTarget)}},ic('dots')));
  el.onclick=()=>{if(selMode||sel.size)toggleSel(t.id);else edit(t)};
  el.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();el.onclick()}else if(e.key===' '){e.preventDefault();toggleSel(t.id,true)}else if(e.key==='Delete')del([t.id])};
  let lp=0;el.onpointerdown=e=>{if(e.pointerType==='mouse'||e.target.closest('button'))return;clearTimeout(lp);lp=setTimeout(()=>{selMode=true;el._lp=1;toggleSel(t.id,true)},480)};el.onpointerup=el.onpointermove=el.onpointercancel=()=>clearTimeout(lp);
  return el}
function toggleSel(id,force){if(force||!sel.has(id))sel.add(id);else sel.delete(id);if(!sel.size)selMode=false;render()}
function bar(){const n=sel.size,on=selMode||n>0;barEl.hidden=!on;if(!on)return;const v=visible();
  barEl.replaceChildren(h('b',n?(n===1?'1 selecionada':n+' selecionadas'):'Toque nas tarefas'),
   h('div.sa',h('button',{type:'button',disabled:!n,onclick:()=>setStatus([...sel],'done')},ic('check'),h('span','Concluir')),h('button',{type:'button',disabled:!n,onclick:()=>setStatus([...sel],'todo')},ic('rotate'),h('span','Reabrir')),
    h('button.danger',{type:'button',disabled:!n,onclick:()=>del([...sel])},ic('trash'),h('span','Excluir')),
    h('button',{type:'button',onclick:()=>{if(sel.size===v.length)sel.clear();else v.forEach(t=>sel.add(t.id));selMode=true;render()}},ic('select'),h('span',sel.size===v.length&&n?'Nenhuma':'Todas')),
    h('button',{type:'button','aria-label':'Cancelar seleção',onclick:()=>{sel.clear();selMode=false;render()}},ic('x'))))}

// ---- ações ----
async function setStatus(ids,status){try{await api2('bulk',{ids,action:status==='done'?'done':status==='todo'?'reopen':'set',patch:{status}});sel.clear();selMode=false;await reload()}catch(e){toast(e.message)}}
async function del(ids){if(!(await confirm(ids.length>1?'Excluir '+ids.length+' tarefas?':'Excluir tarefa?',ids.length>1?'Esta ação não pode ser desfeita.':tasks.find(t=>t.id===ids[0]).title,'Excluir',true)))return;
  try{await api2('bulk',{ids,action:'delete'});sel.clear();selMode=false;await reload();toast('Excluída'+(ids.length>1?'s':''))}catch(e){toast(e.message)}}
function openFile(f){Ed.openFile(f)}
function rowMenu(t,a){const done=t.status==='done';menu(a,[{l:'Editar',i:'edit',f:()=>edit(t)},{l:done?'Reabrir':'Concluir',i:done?'rotate':'check',f:()=>setStatus([t.id],done?'todo':'done')},
  !done&&t.status!=='doing'&&{l:'Marcar em andamento',i:'rotate',f:()=>setStatus([t.id],'doing')},...t.files.map(f=>({l:'Abrir '+Cmx.base(f),i:'file',f:()=>openFile(f)})),{l:'Selecionar',i:'select',f:()=>{selMode=true;toggleSel(t.id,true)}},{sep:1},{l:'Excluir',i:'trash',danger:1,f:()=>del([t.id])}].filter(Boolean),{title:t.title})}
function filterMenu(a){menu(a,[{l:'Qualquer prioridade',check:!fPrio,f:()=>{fPrio='';draw();render()}},...Object.entries(PR).map(([k,[l]])=>({l:'Prioridade '+l.toLowerCase(),check:fPrio===k,f:()=>{fPrio=k;draw();render()}}))],{title:'Filtrar'})}
function sortMenu(a){menu(a,[['recent','Mais recentes'],['priority','Prioridade'],['status','Status'],['title','Título (A–Z)']].map(([k,l])=>({l,check:sort===k,f:()=>{sort=k;render()}})),{title:'Ordenar por'})}
function topMenu(a){menu(a,[{l:'Selecionar tarefas',i:'select',f:()=>{selMode=true;render()}},{sep:1},{l:'Excluir concluídas',i:'trash',off:!tasks.some(t=>t.status==='done'),f:async()=>{if(await confirm('Excluir tarefas concluídas?',tasks.filter(t=>t.status==='done').length+' tarefa(s).','Excluir',true)){await api2('clear',{scope:'done'});await reload()}}},
  {l:'Excluir todas',i:'trash',danger:1,off:!tasks.length,f:async()=>{if(await confirm('Excluir TODAS as tarefas?','São '+tasks.length+' tarefa(s). Esta ação não pode ser desfeita.','Excluir tudo',true)){await api2('clear',{scope:'all'});await reload()}}}],{title:'Tarefas'})}

// ---- criar / editar ----
async function pickFile(){const p=sh().cur();return new Promise(res=>{let v=null;const inp=h('input.inp',{placeholder:'Nome do arquivo…',autocomplete:'off','aria-label':'Pesquisar arquivo'}),out=h('div.list');
  const sp=sheet({title:'Vincular arquivo',body:[inp,out],actions:[{l:'Cancelar'}],onClose:()=>res(v)});
  const go=Cmx.debounce(async()=>{const s=inp.value.trim();if(!s){out.replaceChildren(h('small.mu','Digite para pesquisar nos arquivos do projeto.'));return}
    try{const r=await Cmx.cm.get('search?root='+enc(p.path)+'&q='+enc(s)+'&mode=files&limit=30');out.replaceChildren(...(r.files.filter(f=>!f.dir).map(f=>h('button.li',{type:'button',onclick:()=>{v=f.path;sp.close()}},ic('file'),h('span.lt',h('b',f.name),h('small',f.path))))));if(!out.children.length)out.append(h('small.mu','Nenhum arquivo.'))}catch(e){out.replaceChildren(h('small.mu',e.message))}},150);
  inp.oninput=go;go();setTimeout(()=>inp.focus(),50)})}
function edit(t){const n=!t,d={title:t?t.title:'',notes:t?t.notes:'',priority:t?t.priority:'med',status:t?t.status:'todo',files:t?[...t.files]:[]};const p=sh().cur();
  const ti=h('input.inp',{value:d.title,placeholder:'O que precisa ser feito?','aria-label':'Título',maxlength:'200',autocomplete:'off'}),no=h('textarea.inp',{rows:'3',placeholder:'Detalhes (opcional)','aria-label':'Detalhes',value:d.notes}),
   prSeg=h('div.seg',{role:'radiogroup','aria-label':'Prioridade'}),stSeg=h('div.seg',{role:'radiogroup','aria-label':'Status'}),fl=h('div.chips');
  const dSeg=()=>{prSeg.replaceChildren(...Object.entries(PR).map(([k,[l]])=>h('button'+(d.priority===k?'.on':''),{type:'button',role:'radio','aria-checked':String(d.priority===k),onclick:()=>{d.priority=k;dSeg()}},l)));
   stSeg.replaceChildren(...Object.entries(ST).map(([k,[l]])=>h('button'+(d.status===k?'.on':''),{type:'button',role:'radio','aria-checked':String(d.status===k),onclick:()=>{d.status=k;dSeg()}},l)))};
  const dF=()=>{fl.replaceChildren(...d.files.map(f=>h('span.chip.fl',ic('file'),Cmx.base(f),h('button.cx',{type:'button','aria-label':'Remover '+f,onclick:()=>{d.files=d.files.filter(x=>x!==f);dF()}},ic('x')))),h('button.sbtn.sm',{type:'button',onclick:async()=>{const f=await pickFile();if(f){const full=p.path+'/'+f;if(!d.files.includes(full))d.files.push(full);dF()}}},ic('plus'),'Vincular arquivo'))};dSeg();dF();
  const sp=sheet({title:n?'Nova tarefa':'Editar tarefa',body:[h('label.fl','Título',ti),h('label.fl','Detalhes',no),h('div.fl','Prioridade',prSeg),h('div.fl','Status',stSeg),h('div.fl','Arquivos relacionados',fl),t?h('small.mu',when(t)+(t.updatedAt!==t.createdAt?' · atualizada em '+Cmx.dt(t.updatedAt):'')):null],
   actions:[t?{l:'Excluir',danger:true,f:()=>{del([t.id]);return true}}:null,{l:'Cancelar'},{l:n?'Criar':'Salvar',pri:true,keep:true,f:async()=>{const title=ti.value.trim();if(!title){toast('Informe o título');ti.focus();return false}
    try{await api2('save',{task:{...(t?{id:t.id}:{}),title,notes:no.value,priority:d.priority,status:d.status,files:d.files}});sp.close();await reload();toast(n?'Tarefa criada':'Tarefa salva')}catch(e){toast(e.message);return false}}}].filter(Boolean)});
  setTimeout(()=>ti.focus(),50);ti.onkeydown=e=>{if(e.key==='Enter')sp.foot.querySelector('.pri').click()}}
return{mount,show,hide(){tok++},create:()=>{if(!pid)return;edit()},newTask:()=>edit()}})();
