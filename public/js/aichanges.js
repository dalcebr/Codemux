/* Codemux - controle das alterações da IA: cartão (Revisar / Manter / Desfazer), revisão com diff, aprovação antes de gravar. */
Cmx.mod.aichanges=(()=>{
const {h,ic,sheet,menu,confirm}=Cmx.ui;
const KIND={create:['Criado','file-plus','ok'],modify:['Modificado','code2','ac'],delete:['Excluído (na lixeira)','trash','rd'],rename:['Movido','arrow','warn'],mkdir:['Pasta criada','folder-plus','']};
const ST={pending:['Aguardando decisão','warn'],kept:['Mantido','ok'],undone:['Desfeito','rd'],partial:['Parcialmente desfeito','warn']};
const post=(u,b)=>api('/api/ai/changes/'+u,b);
async function afterUndo(r){try{await Ed.sync(r.changes||[])}catch{}try{if(typeof load==='function')load()}catch{}document.dispatchEvent(new Event('tide-fs'))}
const label=f=>f.kind==='rename'?f.from+' → '+f.path:f.path;

// cartão dentro da conversa
function card(meta){const root=meta.root,fl=meta.files.filter(f=>f.kind!=='mkdir'),extra=fl.length-6;let box,state=meta.status;
  const acts=h('div.cha'),list=h('div.chl',...fl.slice(0,6).map(f=>h('div.chf2',ic(KIND[f.kind][1]),h('span.n',label(f)),h('small.'+KIND[f.kind][2],KIND[f.kind][0].split(' ')[0]))),extra>0?h('small.mu','+ '+extra+' outros'):null);
  const status=h('div.chs');
  function draw(){acts.replaceChildren();const pend=state==='pending'||state==='partial';
    status.textContent=state==='pending'?'':ST[state][0];status.hidden=state==='pending';
    acts.append(h('button.chb',{type:'button',onclick:()=>review(root,meta.id,{onChange:s=>{state=s;draw()}})},ic('diff'),'Revisar alterações'));
    if(state==='pending')acts.append(h('button.chb.ok',{type:'button',onclick:async()=>{await post('keep',{root,id:meta.id});state='kept';draw();toast('Alterações mantidas')}},ic('check'),'Manter'));
    if(pend)acts.append(h('button.chb.rd',{type:'button',onclick:()=>undoAll(root,meta,s=>{state=s;draw()})},ic('undo'),'Desfazer'))}
  box=h('div.chcard',{role:'group','aria-label':'Alterações feitas pela IA'},h('div.chh',ic('sparkle'),h('b','IA alterou '+fl.length+(fl.length===1?' arquivo':' arquivos'))),list,status,acts);draw();return box}
async function undoAll(root,meta,done,paths){
  if(!(await confirm(paths?'Desfazer este arquivo?':'Desfazer todas as alterações?',paths?paths[0]:'Os arquivos voltam ao estado anterior. Arquivos criados pela IA vão para a lixeira; se você editou algo depois, esse arquivo é preservado e avisado.','Desfazer',true)))return null;
  try{const r=await post('undo',{root,id:meta.id,paths});await afterUndo(r);
    if(r.conflicts.length)Cmx.ui.sheet({title:'Alguns arquivos foram preservados',body:[h('p.mu','Estes arquivos mudaram depois da IA, então não foram revertidos para não perder o seu trabalho:'),h('div.list',...r.conflicts.map(c=>h('div.li',ic('alert'),h('span.lt',h('b',c.path),h('small',c.reason)))))],actions:[{l:'Entendi',pri:true}]});
    else toast(r.reverted?'Alterações desfeitas':'Nada para desfazer');
    done&&done(r.status);return r}catch(e){toast(e.message);return null}}

// revisão com diff por arquivo
async function review(root,id,o={}){const D=await Cmx.lazy('diff'),{change}=await api('/api/ai/changes/get',{root,id});let sel=0,sp,status=change.status;
  const files=change.files,dv=h('div'),chips=h('div.chfl',{role:'tablist'});
  function body(f){if(f.kind==='rename')return h('div.dfe','Movido de '+f.from+' para '+f.path);if(f.kind==='mkdir')return h('div.dfe','Pasta criada: '+f.path);
    if(f.kind==='delete')return h('div.dfe','Movido para a lixeira. Use “Desfazer este arquivo” para restaurar.');
    if(f.before===undefined&&f.after===undefined)return D.binaryNote();return D.view(f.before||'',f.after||'')}
  function draw(){chips.replaceChildren(...files.map((f,i)=>h('button.chip2'+(i===sel?'.on':'')+(f.undone?'.und':''),{type:'button',role:'tab','aria-selected':String(i===sel),onclick:()=>{sel=i;draw()}},ic(KIND[f.kind][1]),h('span',Cmx.base(f.path)))));
    const f=files[sel];dv.replaceChildren(h('div.chips',h('span.chip',label(f)),h('span.chip.'+KIND[f.kind][2],KIND[f.kind][0]),f.undone?h('span.chip.rd','Desfeito'):null,h('span.chip.'+ST[status][1],ST[status][0])),body(f))}
  draw();
  sp=sheet({title:'Revisar alterações da IA',wide:true,label:'Revisão das alterações',body:[change.prompt?h('p.mu','Pedido: “'+change.prompt+'”'):null,chips,dv],
    actions:[{l:'Fechar'},{l:'Desfazer este arquivo',danger:true,keep:true,off:false,f:async()=>{const f=files[sel];const r=await undoAll(root,change,s=>{status=s;o.onChange&&o.onChange(s)},[f.kind==='rename'?f.path:f.path]);if(r){f.undone=r.conflicts.every(c=>c.path!==f.path);draw()}return false}},
      {l:'Manter tudo',pri:true,f:async()=>{await post('keep',{root,id});o.onChange&&o.onChange('kept');toast('Alterações mantidas')}}]})}

// aprovação (modo cuidadoso): devolve true | false | 'all'
async function approve(ev){const D=await Cmx.lazy('diff');return new Promise(res=>{let v=false;
  const kind=ev.op==='create'?'Criar':ev.op==='rename'?'Mover':'Modificar',content=ev.op==='rename'?h('div.dfe',ev.from+' → '+ev.path):D.view(ev.before||'',ev.after||'');
  const sp=sheet({title:'Aprovar alteração da IA',wide:true,label:'Aprovar alteração',body:[h('div.chips',h('span.chip.ac',kind),h('span.chip',ev.path)),content,ev.cut?h('p.mu','Prévia truncada: arquivo grande.'):null],
   actions:[{l:'Pular',f:()=>{v=false}},{l:'Aplicar todas as restantes',f:()=>{v='all'}},{l:'Aplicar',pri:true,f:()=>{v=true}}],onClose:()=>res(v)})})}

// lista de alterações recentes do projeto
async function list(root){if(!root)return toast('Abra um projeto primeiro');const {items}=await api('/api/ai/changes/list',{root});
  const sp=sheet({title:'Alterações da IA',wide:true,body:[items.length?h('div.list',...items.map(m=>h('button.li',{type:'button',onclick:()=>{sp.close();review(root,m.id)}},ic('sparkle'),
    h('span.lt',h('b',m.prompt||'(sem descrição)'),h('small',Cmx.dt(m.time)+' · '+m.files.filter(f=>f.kind!=='mkdir').length+' arquivo(s)')),h('span.chip.'+ST[m.status][1],ST[m.status][0])))):Cmx.ui.empty('sparkle','Nenhuma alteração ainda','Quando a IA criar ou editar arquivos, você poderá revisar e desfazer aqui.')],actions:[{l:'Fechar',pri:true}]})}
return{card,review,approve,list}})();
