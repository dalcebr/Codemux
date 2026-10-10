/* Codemux - Configurações. Globais (tema, interface, comportamento, atalhos) e do projeto (nome, terminal, editor, IA, Git, risco).
   Em seções curtas, sem uma tela gigante. */
Cmx.mod.settings=(()=>{
const {h,ic,menu,sheet,confirm}=Cmx.ui,sh=()=>Cmx.shell;const pages={};let installEvt=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;Cmx.emit('installable')});
addEventListener('appinstalled',()=>{installEvt=null;toast('Codemux instalado')});
const seg=(opts,val,on,label)=>h('div.seg',{role:'radiogroup','aria-label':label},...opts.map(([k,l,i])=>h('button'+(k===val?'.on':''),{type:'button',role:'radio','aria-checked':String(k===val),onclick:()=>on(k)},i?ic(i):null,l)));
const row=(t,d,ctl)=>h('div.srow',h('div.st',h('b',t),d?h('small',d):null),ctl);
function mount(host,{name}){pages[name]={page:h('div.page')};host.append(pages[name].page)}
function show(ctx){(ctx.name==='psettings'?project:global)(pages[ctx.name].page,ctx)}

// ---------------- globais ----------------
function global(page){const re=()=>global(page);const C=Cmx.cfg();
  const fs=h('div.stepper',h('button.sbtn',{type:'button','aria-label':'Diminuir fonte',onclick:()=>{Cmx.set('fs',Math.max(10,C.fs-1));Ed.setFont(Cmx.get('fs'));re()}},ic('minus')),h('b',Cmx.get('fs')+' px'),h('button.sbtn',{type:'button','aria-label':'Aumentar fonte',onclick:()=>{Cmx.set('fs',Math.min(24,C.fs+1));Ed.setFont(Cmx.get('fs'));re()}},ic('plus')));
  page.replaceChildren(h('div.pg-h',h('h1','Configurações'),h('div.sub','Preferências do Codemux neste navegador.')),
   h('div.card',h('h2','Aparência'),row('Tema','Claro, escuro ou o do sistema',seg([['light','Claro','sun'],['dark','Escuro','moon'],['system','Sistema','monitor']],C.theme,v=>{Cmx.set('theme',v);re()},'Tema')),row('Fonte do editor',null,fs)),
   h('div.card',h('h2','Comportamento'),row('Salvamento','Automático grava ~1,5 s depois de parar de digitar (nunca sobrescreve arquivos alterados em disco)',seg([['auto','Automático'],['manual','Manual']],C.autosave,v=>{Cmx.set('autosave',v);re()},'Salvamento')),
    row('Modo da interface','Simples mostra só o essencial; Avançado inclui Git, Histórico e Portas',seg([['simple','Simples'],['advanced','Avançado']],C.mode,v=>{Cmx.set('mode',v);re()},'Modo'))),
   h('div.card',h('h2','Inteligência artificial'),row('DeepSeek','Chave da API, modelo, modo cuidadoso (aprovar cada alteração) e exclusão',h('button.sbtn',{type:'button',onclick:()=>window.AIUI&&AIUI.openCfg()},ic('sliders'),'Configurar IA'))),
   h('div.card',h('h2','Interface'),row('Estilo','Nova: por projeto, com navegação simplificada. Clássica: janelas flutuantes (o visual original).',seg([['shell','Nova'],['classic','Clássica']],C.ui,v=>{if(v!==C.ui){Cmx.set('ui',v);location.hash='';location.reload()}},'Interface')),
    installEvt?row('Instalar aplicativo','Abre o Codemux em tela cheia, como um app',h('button.pbtn',{type:'button',onclick:async()=>{installEvt.prompt();await installEvt.userChoice;installEvt=null;re()}},ic('download'),'Instalar')):null),
   h('div.card',h('h2','Atalhos de teclado'),h('div.keys',...[['Ctrl + K  ou  Ctrl + Shift + P','Pesquisar e comandos'],['Ctrl + P','Abrir arquivo'],['Ctrl + S','Salvar'],['Ctrl + F','Buscar e substituir'],['Ctrl + G','Ir para a linha'],['Ctrl + `','Mostrar/ocultar terminal'],['Esc','Fechar menus e janelas']].map(([k,d])=>h('div.kr',h('kbd',k),h('span',d))))),
   h('div.card',h('h2','Primeiros passos'),row('Boas-vindas','Mostrar a tela de boas-vindas de novo',h('button.sbtn',{type:'button',onclick:()=>{Cmx.set('onboarded',false);toast('Será exibida quando não houver projetos')}},'Reativar'))))}

// ---------------- projeto ----------------
function project(page,ctx){const p=ctx.project,S=sh(),st=p.settings||{};const re=()=>project(page,{...ctx,project:S.cur()});
  const nm=h('input.inp',{value:p.name,'aria-label':'Nome do projeto',maxlength:'80'}),ds=h('input.inp',{value:p.desc||'',placeholder:'Descrição curta (opcional)','aria-label':'Descrição',maxlength:'500'}),
   sc=h('input.inp',{value:st.startCmd||'',placeholder:'ex.: npm run dev','aria-label':'Comando inicial do terminal',autocapitalize:'off',autocomplete:'off',spellcheck:'false'}),
   ai=h('textarea.inp',{rows:'4',placeholder:'Ex.: Use TypeScript. Responda em português. Siga o padrão de pastas atual.','aria-label':'Instruções para a IA',value:st.aiInstructions||''});
  const saveF=async(patch,msg)=>{const r=await S.setProj(p.id,patch);if(r)toast(msg||'Salvo')};
  nm.onchange=()=>{if(nm.value.trim())saveF({name:nm.value.trim()},'Nome salvo');else nm.value=p.name};ds.onchange=()=>saveF({desc:ds.value},'Descrição salva');sc.onchange=()=>saveF({settings:{startCmd:sc.value}},'Comando salvo');ai.onchange=()=>saveF({settings:{aiInstructions:ai.value}},'Instruções salvas');
  const auto=st.autosave||'inherit';
  page.replaceChildren(h('div.pg-h',h('h1','Configurações do projeto'),h('div.sub',p.name)),
   h('div.card',h('h2','Geral'),h('label.fl','Nome',nm),h('label.fl','Descrição',ds),
    row('Diretório','/'+p.path,h('button.sbtn',{type:'button',onclick:()=>Cmx.copy(p.path).then(()=>toast('Caminho copiado'))},ic('copy'),'Copiar')),
    row('Tecnologias',p.stack||'Não identificadas',h('button.sbtn',{type:'button',onclick:async()=>{await Cmx.cm.post('projects/refresh',{id:p.id});await S.loadProjects();re();toast('Atualizado')}},ic('refresh'),'Detectar de novo'))),
   h('div.card',h('h2','Editor'),row('Salvamento deste projeto','Herdar usa a configuração global ('+(Cmx.get('autosave')==='auto'?'automático':'manual')+')',seg([['inherit','Herdar'],['auto','Automático'],['manual','Manual']],auto,v=>saveF({settings:{autosave:v}}).then(re),'Salvamento do projeto'))),
   h('div.card',h('h2','Terminal'),h('label.fl','Comando ao abrir o primeiro terminal do projeto',sc),h('small.mu','Executado automaticamente uma vez por sessão quando o terminal é criado. Deixe vazio para não executar nada.')),
   h('div.card',h('h2','IA'),h('label.fl','Instruções para a IA neste projeto',ai),h('small.mu','A IA recebe este texto sempre, junto com tarefas abertas e alterações do Git. Funciona como um “manual” do projeto.')),
   h('div.card',h('h2','Git'),row('Repositório','Branch, commits e envio',h('button.sbtn',{type:'button',onclick:()=>S.nav.project(p.id,'git')},ic('git'),'Abrir Git'))),
   h('div.card',h('h2','Zona de risco'),row('Arquivar','Esconde o projeto da lista sem apagar nada',h('button.sbtn',{type:'button',onclick:async()=>{await S.setProj(p.id,{archived:true});toast('Arquivado');S.nav.projects()}},ic('archive'),'Arquivar')),
    row('Lixeira de arquivos','Restaurar arquivos excluídos',h('button.sbtn',{type:'button',onclick:()=>Cmx.lazy('trash').then(m=>m.open(p.id))},ic('trash'),'Abrir')),
    row('Mover projeto para a lixeira','Os arquivos continuam no disco',h('button.sbtn.danger',{type:'button',onclick:async()=>{if(await confirm('Mover para a lixeira?',p.name,'Mover',true)){await S.setProj(p.id,{trashed:true});S.nav.projects('trash')}}},ic('trash'),'Mover'))))}
return{mount,show}})();
