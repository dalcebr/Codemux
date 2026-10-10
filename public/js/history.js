/* Codemux - Histórico do projeto: linha do tempo por dia (quem fez o quê, em qual arquivo, quando). Paginado. */
Cmx.mod.history=(()=>{
const {h,ic,menu,empty,confirm}=Cmx.ui,enc=encodeURIComponent,sh=()=>Cmx.shell;
const TY={edit:['edit','Edição'],file:['file','Arquivo'],ai:['sparkle','IA'],git:['git','Git'],task:['tasks','Tarefa'],trash:['trash','Lixeira'],project:['folder','Projeto'],system:['info','Sistema']};
const WHO={user:'Você',ai:'IA',git:'Git',system:'Codemux'};
let page,pid,type='',q='',items=[],more=false,body,tok=0;
const mount=host=>{page=h('div.page');host.append(page)};
async function show(ctx){pid=ctx.project.id;items=[];const t=++tok;draw();await next(t)}
function draw(){const inp=h('input.inp',{type:'search',placeholder:'Pesquisar no histórico…','aria-label':'Pesquisar no histórico',value:q,autocomplete:'off',oninput:Cmx.debounce(async e=>{q=e.target.value;items=[];const t=++tok;await next(t)},200)});
  body=h('div.tline',{'aria-live':'polite'});
  page.replaceChildren(h('div.pg-h',h('h1','Histórico'),h('button.sbtn',{type:'button',onclick:()=>Cmx.lazy('aichanges').then(m=>m.list(sh().cur().path)).catch(e=>toast(e.message))},ic('sparkle'),'Alterações da IA'),
    h('button.sbtn',{type:'button','aria-label':'Mais ações',onclick:e=>menu(e.currentTarget,[{l:'Limpar histórico',i:'trash',danger:1,f:async()=>{if(await confirm('Limpar o histórico?','Os eventos deste projeto serão apagados. Seus arquivos não são afetados.','Limpar',true)){await Cmx.cm.post('history/clear',{project:pid});items=[];render()}}}],{title:'Histórico'})},ic('dots'))),
   h('div.pf',h('div.seg.tsf',...[['','Tudo'],['edit','Edições'],['file','Arquivos'],['ai','IA'],['git','Git'],['task','Tarefas']].map(([k,l])=>h('button'+(k===type?'.on':''),{type:'button',onclick:async()=>{type=k;items=[];const t=++tok;draw();await next(t)}},l))),inp),body)}
async function next(t){try{const before=items.length?items[items.length-1].t:0,r=await Cmx.cm.get('history?project='+pid+'&limit=60'+(type?'&type='+type:'')+(q?'&q='+enc(q):'')+(before?'&before='+before:''));if(t!==tok)return;items.push(...r.items);more=r.more;render()}catch(e){body.replaceChildren(h('p.mu',e.message))}}
function render(){body.replaceChildren();const p=sh().cur();
  if(!items.length){body.append(empty('clock','Nada por aqui ainda',q||type?'Nenhum evento com esse filtro.':'Edições, arquivos, alterações da IA, commits e tarefas aparecem aqui conforme você trabalha.'));return}
  let day='';for(const e of items){const d=Cmx.dayLabel(e.t);if(d!==day){day=d;body.append(h('div.sec',d))}
    const [icn,tl]=TY[e.type]||TY.system,full=e.file&&p?p.path+'/'+e.file:'',go=e.type==='ai'?()=>Cmx.lazy('aichanges').then(m=>m.list(p.path)):full&&!/Lixeira/.test(tl)&&e.type!=='trash'?()=>Ed.openFile(full):null;
    body.append(h((go?'button':'div')+'.li.ev',{type:go?'button':null,onclick:go},h('span.hm',Cmx.hm(e.t)),h('span.evi',ic(icn)),h('span.lt',h('b',e.text),h('small',WHO[e.actor]+' · '+tl+(e.file?' · '+e.file:'')))))}
  if(more)body.append(h('button.cmx-more',{type:'button',onclick:()=>next(tok)},'Carregar mais'))}
return{mount,show,hide(){tok++}}})();
