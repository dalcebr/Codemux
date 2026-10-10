/* Codemux - Trabalho: Editor + Terminal + IA.
   Desktop: painéis lado a lado (terminal embaixo, IA à direita), redimensionáveis. Celular: uma ferramenta por vez.
   Reaproveita os componentes existentes (#code, #term, painel de IA) e acrescenta o chrome (menus, abas, atalhos). */
Cmx.mod.work=(()=>{
const {h,ic,menu,sheet,empty}=Cmx.ui,sh=()=>Cmx.shell;
let wk,bar,seg,tglT,tglA,sv,shz,chip,mounted=false,tool='editor',tmSeen=new Set(),sbInit=false;
const KEY='cmx-wk',def={tm:true,ai:innerWidth>=1280,tmH:250,aiW:380};let L={...def};try{Object.assign(L,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(L))}catch{}};
const mobile=()=>sh().mobile(),rel=p=>{const pr=sh().cur();return pr&&p.startsWith(pr.path+'/')?p.slice(pr.path.length+1):p};

function mount(host){
  const ed=$('#code'),tm=$('#term'),ai=window.AIUI&&AIUI.el;
  seg=h('div.seg',{role:'tablist','aria-label':'Ferramenta'},...Object.entries(sh().tools).map(([t,[l,i]])=>h('button',{type:'button',role:'tab','data-t':t,onclick:()=>sh().nav.project(null,'work',t)},ic(i),l,t==='editor'?h('span.nb.warn',{hidden:true}):null)));
  tglT=h('button.tgl',{type:'button','aria-pressed':'true',title:'Mostrar/ocultar terminal (Ctrl+`)',onclick:()=>toggle('tm')},ic('terminal'),'Terminal');
  tglA=h('button.tgl',{type:'button','aria-pressed':'false',title:'Mostrar/ocultar IA',onclick:()=>toggle('ai')},ic('sparkle'),'IA');
  bar=h('div.wk-bar',seg,h('span.sp'),tglT,tglA);
  shz=h('div.wk-sh',{role:'separator','aria-orientation':'horizontal','aria-label':'Redimensionar terminal',tabindex:'0'});sv=h('div.wk-sv',{role:'separator','aria-orientation':'vertical','aria-label':'Redimensionar IA',tabindex:'0'});
  const pEd=h('div.wk-ed',ed),pTm=h('div.wk-tm',tm),pAi=h('div.wk-ai',ai||h('div'));
  wk=h('div.wk',h('div.wk-main',pEd,shz,pTm),sv,pAi);host.append(bar,wk);
  split(shz,'tmH',-1,'y',120,0.7);split(sv,'aiW',-1,'x',280,0.7);
  new ResizeObserver(Cmx.debounce(()=>Ed.layout(),30)).observe(ed);
  wireEditor(ed);mounted=true;apply();
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='`'&&!mobile()&&sh().state.route.section==='work'){e.preventDefault();toggle('tm',true)}});
  document.addEventListener('tide-ed',()=>{const n=Ed.tabs().filter(t=>t.dirty).length,b=seg.querySelector('.nb');b.hidden=!n;b.textContent=n});
  Cmx.on('layout',apply)}

// ---- layout ----
function apply(){if(!mounted)return;wk.dataset.tool=tool;wk.classList.toggle('no-tm',!L.tm);wk.classList.toggle('no-ai',!L.ai);
  wk.style.setProperty('--tm-h',L.tmH+'px');wk.style.setProperty('--ai-w',L.aiW+'px');
  tglT.classList.toggle('on',L.tm);tglT.setAttribute('aria-pressed',String(L.tm));tglA.classList.toggle('on',L.ai);tglA.setAttribute('aria-pressed',String(L.ai));
  seg.querySelectorAll('button').forEach(b=>{const on=b.dataset.t===tool;b.classList.toggle('on',on);b.setAttribute('aria-selected',String(on))});
  requestAnimationFrame(()=>Ed.layout())}
function toggle(k,focus){L[k]=!L[k];save();apply();if(L[k]&&focus)focusTool(k==='tm'?'terminal':'ai');
  if(k==='tm'&&L.tm)ensureTerm();if(k==='ai'&&L.ai)window.AIUI&&AIUI.show()}
function split(el,key,sign,axis,min,maxFrac){
  el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);el.classList.add('drag');const r=wk.getBoundingClientRect(),start=axis==='y'?e.clientY:e.clientX,v0=L[key];
    const mv=ev=>{const d=((axis==='y'?ev.clientY:ev.clientX)-start)*sign,max=(axis==='y'?r.height:r.width)*maxFrac;L[key]=Math.round(Math.max(min,Math.min(max,v0+d)));apply()};
    const up=()=>{el.classList.remove('drag');el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up);save()};el.addEventListener('pointermove',mv);el.addEventListener('pointerup',up)});
  el.addEventListener('keydown',e=>{const k=axis==='y'?{ArrowUp:20,ArrowDown:-20}:{ArrowLeft:20,ArrowRight:-20};if(k[e.key]){e.preventDefault();L[key]=Math.max(min,L[key]+k[e.key]);apply();save()}})}
const ensureTerm=()=>{const p=sh().cur();if(p&&!tmSeen.has(p.id)){tmSeen.add(p.id);Term.ensure()}};
function focusTool(t){setTimeout(()=>{if(t==='terminal')Term.focus();else if(t==='ai'){window.AIUI&&AIUI.focus()}else Ed.focus()},60)}

function show(ctx){const t=ctx.route.tool||'editor';tool=t;
  if(!mobile()){if(t==='terminal'&&!L.tm){L.tm=true;save()}if(t==='ai'&&!L.ai){L.ai=true;save()}}
  apply();if(t==='terminal'||(!mobile()&&L.tm))ensureTerm();
  if(t==='ai'||(!mobile()&&L.ai))window.AIUI&&AIUI.show();
  if(!mobile()&&!sbInit){sbInit=true;Ed.toggleSidebar(true)} // explorador de arquivos aberto no desktop na primeira vez
  if(t!=='editor')focusTool(t);setTimeout(()=>{Ed.layout();if(t==='editor'&&!mobile())Ed.focus()},80)}

// ---- chrome do editor ----
function wireEditor(ed){
  $('#eFl').onclick=()=>Ed.toggleSidebar();
  $('#eCur').onclick=()=>tabsSheet();$('#eMore').onclick=e=>editorMenu(e.currentTarget);
  $('#eTabs').addEventListener('contextmenu',e=>{const tb=e.target.closest('.et');if(!tb)return;e.preventDefault();const i=[...$('#eTabs').children].indexOf(tb),t=Ed.tabs()[i];t&&tabMenu(t,{x:e.clientX,y:e.clientY})});
  chip=h('button.ask-chip',{type:'button',onpointerdown:e=>e.preventDefault(),onclick:()=>askAboutSelection()},ic('sparkle'),'Perguntar à IA');ed.querySelector('.em').append(chip);
  document.addEventListener('selectionchange',()=>{const ta=$('#eTa');chip.classList.toggle('on',document.activeElement===ta&&ta.selectionEnd-ta.selectionStart>2)})}
function tabMenu(t,a){menu(a,[{l:'Salvar',i:'save',off:!t.dirty,f:()=>{Ed.activate(t.path);Ed.save()}},{l:'Perguntar à IA sobre este arquivo',i:'sparkle',f:()=>askAboutFile(t.path)},{l:'Copiar caminho',i:'paste',f:()=>Cmx.copy(rel(t.path)).then(()=>toast('Caminho copiado'))},{sep:1},
  {l:'Fechar',i:'x',f:()=>Ed.closeTab(t.path)},{l:'Fechar outras',i:'x',off:Ed.tabs().length<2,f:()=>{Ed.activate(t.path);Ed.closeOthers()}},{l:'Fechar todas',i:'x',f:()=>Ed.closeAll()}],{title:t.name})}
function editorMenu(a){const cur=Ed.curPath(),has=!!cur,tabs=Ed.tabs(),nd=tabs.filter(t=>t.dirty).length;const mode=Cmx.get('autosave');
  menu(a,[{l:'Salvar',i:'save',hint:'Ctrl+S',off:!has,f:()=>Ed.save()},{l:'Salvar tudo'+(nd?' ('+nd+')':''),i:'save',off:!nd,f:()=>Ed.saveAll().then(n=>toast(n+' arquivo(s) salvo(s)'))},{sep:1},
   {l:'Buscar e substituir',i:'search',hint:'Ctrl+F',off:!has,f:()=>Ed.find()},{l:'Ir para a linha…',i:'arrow',hint:'Ctrl+G',off:!has,f:gotoLineDialog},{l:'Formatar documento',i:'code2',off:!has,f:()=>Ed.format()},
   {l:'Desfazer',i:'undo',off:!has,f:()=>Ed.undo()},{l:'Refazer',i:'redo',off:!has,f:()=>Ed.redo()},{sep:1},
   {l:'Perguntar à IA sobre o arquivo',i:'sparkle',off:!has,f:()=>askAboutFile(cur)},{l:'Copiar caminho',i:'paste',off:!has,f:()=>Cmx.copy(rel(cur)).then(()=>toast('Caminho copiado'))},{sep:1},
   {l:'Aumentar fonte',i:'plus',f:()=>{Ed.setFont(Ed.getFont()+1);Cmx.set('fs',Ed.getFont())}},{l:'Diminuir fonte',i:'minus',f:()=>{Ed.setFont(Ed.getFont()-1);Cmx.set('fs',Ed.getFont())}},
   {l:'Salvamento automático',i:'rotate',check:mode==='auto',f:()=>{Cmx.set('autosave',mode==='auto'?'manual':'auto');toast('Salvamento '+(mode==='auto'?'manual':'automático'))}},{sep:1},
   {l:'Fechar arquivo',i:'x',off:!has,f:()=>Ed.closeTab(cur)},{l:'Fechar todos',i:'x',off:!tabs.length,f:()=>Ed.closeAll()}],{title:'Editor'})}
async function gotoLineDialog(){if(!Ed.curPath())return toast('Abra um arquivo primeiro');const v=await dlg('Ir para a linha',{input:''});const n=parseInt(v,10);if(n>0)Ed.gotoLine(n);else if(v)toast('Número de linha inválido')}
// lista de arquivos abertos (celular) + recentes
function tabsSheet(){const p=sh().cur(),tabs=Ed.tabs(),nd=tabs.filter(t=>t.dirty).length,open=new Set(tabs.map(t=>t.path));
  const recents=Cmx.recent(p.id).filter(f=>!open.has(f)).slice(0,6);let sp;
  const row=t=>h('div.tabrow'+(t.active?'.on':''),h('button.tr-main',{type:'button',onclick:()=>{Ed.activate(t.path);sp.close()}},h('span.dot'+(t.dirty?'.d':t.conflict?'.c':''),t.dirty?'●':t.active?'›':''),h('span.lt',h('b',t.name),h('small',rel(t.path)))),
    h('button.pm',{type:'button','aria-label':'Fechar '+t.name,onclick:async e=>{e.stopPropagation();await Ed.closeTab(t.path);sp.close();if(Ed.tabs().length)tabsSheet()}},ic('x')));
  sp=sheet({title:'Arquivos abertos'+(tabs.length?' ('+tabs.length+')':''),body:[tabs.length?h('div.list',...tabs.map(row)):h('p.mu','Nenhum arquivo aberto.'),
    recents.length?h('div.sec','Recentes'):null,recents.length?h('div.list',...recents.map(f=>h('button.li',{type:'button',onclick:()=>{sp.close();Ed.openFile(f)}},ic('clock'),h('span.lt',h('b',Cmx.base(f)),h('small',rel(f)))))):null],
    actions:[{l:'Fechar todos',off:!tabs.length,f:()=>Ed.closeAll()},{l:'Fechar sem salvar'+(nd?' ('+nd+')':''),danger:true,off:!nd,f:async()=>{if(!(await Cmx.ui.confirm('Descartar alterações?','As alterações não salvas de '+nd+' arquivo(s) serão perdidas.','Descartar',true)))return false;Ed.closeAll({discard:true})}},{l:'Salvar tudo',pri:true,off:!nd,f:()=>Ed.saveAll()}]})}

// ---- IA a partir do editor ----
function openAI(){sh().nav.project(null,'work','ai')}
function askAboutSelection(){const s=Ed.selection();if(!s)return toast('Selecione um trecho de código');openAI();setTimeout(()=>AIUI.ask({selection:{...s,rel:rel(s.path)}}),120)}
function askAboutFile(path){openAI();setTimeout(()=>AIUI.ask({file:path,rel:rel(path)}),120)}
function closeAI(){L.ai=false;save();apply();if(mobile())sh().nav.project(null,'work','editor')}
return{mount,show,hide(){},closeAI,askAboutFile,askAboutSelection,gotoLineDialog,tabsSheet,editorMenu,openAI}})();
