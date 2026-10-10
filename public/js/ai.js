/* ===== IA (DeepSeek) no app Código =====
   Usa só o que o index.html já expõe: $, I, P, api, dlg, toast, Ed, load.
   O servidor (ai.js) roda o agente; aqui ficam a interface e a sincronização com o editor. */
(()=>{
P.sparkle='<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15v4M17 17h4"/>';
P.sliders='<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>';
P.arrow='<path d="M5 12h14M13 6l6 6-6 6"/>';

const ed=$('#code .ed'),box=$('#code'),ab=ed.querySelector('.ab'),sb=$('#eSb');
const SHELL=document.documentElement.dataset.ui==='shell'; // interface nova: o painel é montado pelo módulo Trabalho
const OPT_KEY='tide-ai-opt',HK='tide-ai:';
let opt={autoDelete:false,review:false};try{Object.assign(opt,JSON.parse(localStorage.getItem(OPT_KEY)||'{}'))}catch{}
const saveOpt=()=>{try{localStorage.setItem(OPT_KEY,JSON.stringify(opt))}catch{}};
let cfg={hasKey:false,hint:'',model:'deepseek-flash',fromEnv:false},hist=[],curRoot=null,busy=false,ctrl=null;

// ---------- DOM ----------
const btn=document.createElement('button');btn.id='eAi';btn.title='Assistente de IA';btn.innerHTML=I('sparkle');if(!SHELL)ab.append(btn);
const P_=document.createElement('div');P_.className='aip';P_.id='aiP';
P_.innerHTML=`<div class="aih"><b>${I('sparkle')}IA</b><span class="ars" id="aiRoot"></span><div>
<button id="aiCh" title="Alterações da IA" aria-label="Alterações da IA">${I('diff')}</button><button id="aiNew" title="Nova conversa" aria-label="Nova conversa">${I('plus')}</button><button id="aiCfg" title="Configurações" aria-label="Configurações da IA">${I('sliders')}</button><button id="aiX" title="Fechar" aria-label="Fechar painel">${I('x')}</button></div></div>
<div class="aim" id="aiMsgs"></div>
<div class="aichips" id="aiChips"></div>
<div class="aif"><textarea id="aiIn" rows="1" placeholder="Peça algo para a IA…" aria-label="Mensagem para a IA" autocomplete="off" autocapitalize="sentences"></textarea><button id="aiGo" title="Enviar" aria-label="Enviar">${I('send')}</button></div>`;
if(!SHELL)ed.append(P_);else P_.classList.add('on');
const msgs=P_.querySelector('#aiMsgs'),inp=P_.querySelector('#aiIn'),go=P_.querySelector('#aiGo');
const narrow=()=>!SHELL&&box.classList.contains('narrow'),isOpen=()=>SHELL||P_.classList.contains('on');
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// ---------- markdown leve (escapa tudo antes) ----------
const inl=t=>esc(t).replace(/`([^`\n]+)`/g,'<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g,'<b>$1</b>');
function md(s){let o='',last=0,m;const re=/```[^\n]*\n?([\s\S]*?)(```|$)/g;
  while((m=re.exec(s))){o+=inl(s.slice(last,m.index).replace(/\n+$/,''))+'<pre class="aic">'+esc(m[1])+'</pre>';last=m.index+m[0].length}
  return o+inl(s.slice(last).replace(/^\n+/,o?'':'\n'))}

// ---------- histórico por projeto ----------
const hkey=r=>HK+r;
function loadHist(r){try{const h=JSON.parse(localStorage.getItem(hkey(r))||'[]');return Array.isArray(h)?h.filter(m=>m&&typeof m.content==='string'):[]}catch{return[]}}
function saveHist(r,h){try{let tot=0;h=h.slice(-30);while(h.length>2&&(tot=h.reduce((a,m)=>a+m.content.length,0))>150000)h.shift();localStorage.setItem(hkey(r),JSON.stringify(h))}catch{}}
const ACT='\n\n[Ações realizadas:';
const splitAct=c=>{const i=c.indexOf(ACT);return i<0?[c,'']:[c.slice(0,i),c.slice(i+ACT.length).replace(/\]\s*$/,'').trim()]};

// ---------- render ----------
const near=()=>msgs.scrollHeight-msgs.scrollTop-msgs.clientHeight<80;
const stick=f=>{const n=near();f();if(n)msgs.scrollTop=msgs.scrollHeight};
function addUser(t){const d=document.createElement('div');d.className='aib u';d.textContent=t;msgs.append(d);msgs.scrollTop=msgs.scrollHeight;return d}
function addAsst(text='',act=''){const d=document.createElement('div');d.className='aib a';msgs.append(d);
  if(text){const x=document.createElement('div');x.className='at';x.innerHTML=md(text);d.append(x)}
  if(act){const x=document.createElement('div');x.className='aiact';x.textContent='✓ '+act;d.append(x)}return d}
function showErr(m){stick(()=>{const d=document.createElement('div');d.className='aierr';d.textContent=m;msgs.append(d)})}
function empty(){msgs.innerHTML='';const c=Ed.ctx(),d=document.createElement('div');d.className='aiempty';
  const add=(t,f,cls)=>{const b=document.createElement('button');b.textContent=t;if(cls)b.className=cls;b.onclick=f;d.append(b)};
  d.insertAdjacentHTML('afterbegin',I('sparkle','big'));
  const p=document.createElement('div');d.append(p);
  if(!c.root){p.textContent='A IA trabalha dentro de uma pasta de projeto. Abra (ou crie pelo Explorador) a pasta onde ela deve criar os arquivos.';add('Abrir pasta',()=>$('#eOpen').click())}
  else if(!cfg.hasKey){p.textContent='Configure sua chave da API do DeepSeek para começar.';add('Configurar chave',openCfg)}
  else{const pr=window.Cmx&&Cmx.shell&&Cmx.shell.cur&&Cmx.shell.cur(),nm=pr?pr.name:c.root.split('/').pop();
    p.innerHTML='<b></b><br>Como posso ajudar?';p.querySelector('b').textContent='Projeto: '+nm;
    const cur=c.active?c.active.split('/').pop():'';
    const fire=(t,send)=>()=>{inp.value=t;fit();inp.focus();if(send)setTimeout(()=>go.click(),0)};
    add('Explicar meu projeto',fire('Explique a estrutura e o funcionamento deste projeto, em tópicos curtos.',true),'ch');
    add('Encontrar erros',fire(cur?'Procure erros e problemas no arquivo '+cur+' e no restante do projeto, e liste o que encontrar. Não altere nada ainda.':'Procure erros e problemas no projeto e liste o que encontrar. Não altere nada ainda.',true),'ch');
    add('Criar funcionalidade',fire('Quero criar uma funcionalidade: ',false),'ch');
    add('Refatorar arquivo',fire(cur?'Refatore o arquivo '+cur+' para ficar mais limpo e legível, sem mudar o comportamento.':'Refatore o arquivo atual para ficar mais limpo e legível, sem mudar o comportamento.',false),'ch')}
  msgs.append(d)}
function renderAll(){const r=curRoot;msgs.innerHTML='';P_.querySelector('#aiRoot').textContent=r?r.split('/').pop():'';
  if(!hist.length){empty();return}
  hist.forEach(m=>{if(m.role==='user')addUser(m.content);else{const [t,a]=splitAct(m.content);addAsst(t,a)}});msgs.scrollTop=msgs.scrollHeight}
function syncRoot(){if(busy)return;const r=Ed.ctx().root;if(r===curRoot&&msgs.childElementCount)return;curRoot=r;hist=r?loadHist(r):[];renderAll()}

// ---------- ferramentas: rótulos ----------
const RUN={write_file:'Escrevendo arquivo…',edit_file:'Editando arquivo…',read_file:'Lendo arquivo…',list_files:'Listando arquivos…',create_folder:'Criando pasta…',rename_path:'Movendo…',delete_path:'Excluindo…'};
const ERR={write_file:'escrever',edit_file:'editar',read_file:'ler',list_files:'listar',create_folder:'criar pasta',rename_path:'mover',delete_path:'excluir'};
function describe(ev){const i=ev.info||{},p=i.path||'.';
  if(!ev.ok&&!ev.refused){const q=ev.name==='rename_path'?(i.from||'?')+' → '+(i.to||'?'):(i.path||'');return['x','Não foi possível '+(ERR[ev.name]||ev.name)+(q?' '+q:'')]}
  switch(ev.name){
    case 'write_file':return[i.created?'file-plus':'code2',(i.created?'Criou ':'Atualizou ')+p,p];
    case 'edit_file':return['code2','Editou '+p,p];
    case 'read_file':return['file','Leu '+p,p];
    case 'list_files':return['folder','Listou '+(p==='.'?'o projeto':p)];
    case 'create_folder':return['folder-plus','Criou pasta '+p+'/'];
    case 'rename_path':return['arrow','Moveu '+i.from+' → '+i.to];
    case 'delete_path':return['x',(ev.refused?'Exclusão recusada: ':'Excluiu ')+p];
    default:return['file',ev.name]}}
function actNote(ev){const i=ev.info||{},p=i.path;
  switch(ev.name){case 'write_file':return(i.created?'criou ':'atualizou ')+p;case 'edit_file':return'editou '+p;case 'create_folder':return'criou pasta '+p;
    case 'rename_path':return'moveu '+i.from+' → '+i.to;case 'delete_path':return'excluiu '+p}return''}

// ---------- sincronização com o editor (em lote) ----------
let q=[],tm=0,chain=Promise.resolve();
const flush=()=>{tm=0;const c=q.splice(0);if(!c.length)return chain;chain=chain.then(()=>Ed.sync(c)).catch(()=>{});return chain};
const queue=ch=>{q.push(...ch);if(!tm)tm=setTimeout(flush,450)};

// ---------- contexto anexado (seleção do editor / arquivo) ----------
let chips=[];
function drawChips(){const box2=P_.querySelector('#aiChips');box2.replaceChildren();chips.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.className='aichip';b.title='Remover do contexto';
  b.innerHTML=I(c.kind==='sel'?'code2':'file')+'<span></span>'+I('x');b.querySelector('span').textContent=c.kind==='sel'?(c.rel.split('/').pop()+' · linhas '+c.from+'–'+c.to):c.rel.split('/').pop();b.onclick=()=>{chips.splice(i,1);drawChips()};box2.append(b)})}
// ---------- envio ----------
function fit(){inp.style.height='auto';inp.style.height=Math.min(inp.scrollHeight,140)+'px'}
function setBusy(b){busy=b;go.innerHTML=I(b?'stop':'send');go.classList.toggle('stop',b);go.title=b?'Parar':'Enviar';P_.querySelector('#aiNew').disabled=b}
async function send(){
  if(busy){if(ctrl)ctrl.abort();return}
  const text=inp.value.trim();if(!text)return;
  syncRoot();const c=Ed.ctx();
  if(!c.root){toast('Abra uma pasta de projeto primeiro');empty();return}
  if(!cfg.hasKey){toast('Configure a chave do DeepSeek');openCfg();return}
  inp.value='';fit();chips=[];drawChips();
  if(!hist.length)msgs.innerHTML='';
  const ub=addUser(text),bub=addAsst();bub.classList.add('busy');
  setBusy(true);ctrl=new AbortController();
  const runRoot=c.root;let blk=null,raw='',gotAny=false,fail=false;const acts=[],rows={},parts=[];
  const newBlk=()=>{blk=document.createElement('div');blk.className='at';raw='';parts.push('');bub.append(blk)};
  try{
    const r=await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:ctrl.signal,
      body:JSON.stringify({root:runRoot,message:text,history:hist.slice(-30),ctx:{active:c.active,dirty:c.dirty,selection:(chips.find(x=>x.kind==='sel')||{}).sel,focus:chips.filter(x=>x.kind==='file').map(x=>x.path)},autoDelete:opt.autoDelete,review:opt.review})});
    if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.error||'Erro '+r.status)}
    const rd=r.body.getReader(),dec=new TextDecoder();let buf='';
    const on=async ev=>{
      if(ev.t==='text'){gotAny=true;if(!blk)newBlk();raw+=ev.d;parts[parts.length-1]=raw;stick(()=>{blk.innerHTML=md(raw)})}
      else if(ev.t==='tool_start'){gotAny=true;blk=null;const row=document.createElement('div');row.className='aitool run';
        row.innerHTML=I('file')+'<span class="ait"></span><span class="ais"></span>';row.querySelector('.ait').textContent=RUN[ev.name]||ev.name;rows[ev.id]=row;stick(()=>bub.append(row))}
      else if(ev.t==='result'){const row=rows[ev.id]||bub.appendChild(document.createElement('div')),[ic,label,file]=describe(ev);
        row.className='aitool '+(ev.refused?'ref':ev.ok?'ok':'err');row.innerHTML=I(ic)+'<span class="ait"></span><span class="ais"></span>';
        const t=row.querySelector('.ait');t.textContent=label;if(!ev.ok&&!ev.refused&&ev.msg){const s=document.createElement('small');s.textContent=ev.msg.replace(/^Erro:\s*/,'');t.append(s)}
        if(ev.ok&&file&&ev.name!=='list_files'){row.classList.add('go');row.setAttribute('role','button');row.tabIndex=0;row.onclick=()=>{Ed.openFile(runRoot+'/'+file);if(narrow())setOpen(false)};row.onkeydown=e=>{if(e.key==='Enter')row.onclick()}}
        if(ev.ok){const n=actNote(ev);if(n)acts.push(n)}
        if(ev.changes&&ev.changes.length)queue(ev.changes);stick(()=>{})}
      else if(ev.t==='confirm'&&ev.kind==='change'){let v=false;try{v=await (await Cmx.lazy('aichanges')).approve(ev)}catch{}try{await api('/api/ai/confirm',{id:ev.id,ok:v})}catch{}}
      else if(ev.t==='changes'){try{const m=await Cmx.lazy('aichanges');stick(()=>bub.append(m.card(ev)))}catch{}}
      else if(ev.t==='confirm'){const yes=await dlg(ev.dir?'Excluir pasta?':'Excluir arquivo?',{text:ev.path+(ev.dir?' e todo o conteúdo':'')+'\n\nPedido pela IA.',buttons:[['Recusar',null],['Excluir',1,'danger']]});
        try{await api('/api/ai/confirm',{id:ev.id,ok:!!yes})}catch{}}
      else if(ev.t==='error'){fail=true;showErr(ev.message)}};
    for(;;){const {done,value}=await rd.read();if(done)break;buf+=dec.decode(value,{stream:true});let i;
      while((i=buf.indexOf('\n'))>=0){const l=buf.slice(0,i).trim();buf=buf.slice(i+1);if(l){let ev;try{ev=JSON.parse(l)}catch{continue}await on(ev)}}}
  }catch(e){if(e.name!=='AbortError'){fail=true;showErr(e.message)}else{stick(()=>{const s=document.createElement('div');s.className='aiact';s.textContent='■ Interrompido';bub.append(s)})}}
  bub.classList.remove('busy');setBusy(false);ctrl=null;
  if(gotAny){const txt=parts.join('\n\n').trim();
    hist.push({role:'user',content:text},{role:'assistant',content:(txt||'(sem texto)')+(acts.length?ACT+' '+acts.join('; ')+']':'')});saveHist(runRoot,hist)}
  else if(fail){bub.remove();ub.remove();inp.value=text;fit();if(!hist.length)empty()}
  await flush();if(typeof load==='function')load();syncRoot()}

// ---------- configurações ----------
async function loadCfg(){try{cfg=await api('/api/ai/config')}catch{}}
function openCfg(){return new Promise(res=>{const d=document.createElement('dialog');document.body.append(d);
  d.innerHTML=`<h3>IA · DeepSeek</h3><p>Chave da API (platform.deepseek.com)</p>
<input id="cK" type="password" autocomplete="off" autocapitalize="off" spellcheck="false">
<small class="ahelp"></small><p>Modelo</p><input id="cM" list="cML" autocomplete="off" autocapitalize="off" spellcheck="false">
<datalist id="cML"><option value="deepseek-flash"><option value="deepseek-v4-pro"></datalist>
<small class="ahelp">deepseek-flash: rápido e barato. deepseek-v4-pro: mais capaz para projetos grandes.</small>
<label class="aipt"><input type="checkbox" id="cR" class="aick"><span>Modo cuidadoso: aprovar cada alteração (com diff) antes de gravar</span></label>
<label class="aipt"><input type="checkbox" id="cD" class="aick"><span>Excluir sem pedir confirmação (vai para a lixeira)</span></label><div class="btns"></div>`;
  const K=d.querySelector('#cK'),M=d.querySelector('#cM'),D=d.querySelector('#cD'),R=d.querySelector('#cR'),B=d.querySelector('.btns'),h=d.querySelector('.ahelp');
  K.placeholder=cfg.hasKey?'Chave atual: '+cfg.hint+' (deixe vazio para manter)':'sk-…';
  h.textContent=cfg.fromEnv?'Usando a chave da variável de ambiente DEEPSEEK_API_KEY.':'A chave fica guardada só no servidor (~/.termux-ide-ai.json) e nunca volta para o navegador.';
  M.value=cfg.model;D.checked=!!opt.autoDelete;R.checked=!!opt.review;
  const close=v=>{d.onclose=null;d.close();d.remove();res(v)};
  const mk=(l,f,c)=>{const b=document.createElement('button');b.textContent=l;if(c)b.className=c;b.onclick=f;B.append(b)};
  mk('Cancelar',()=>close(null));
  if(cfg.hasKey&&!cfg.fromEnv)mk('Remover chave',()=>run(async()=>{await api('/api/ai/config',{clearKey:true});await loadCfg();close(1);syncRoot2()}),'danger');
  mk('Salvar',()=>run(async()=>{const o={model:M.value.trim()};if(K.value.trim())o.key=K.value.trim();
    await api('/api/ai/config',o);opt.autoDelete=D.checked;opt.review=R.checked;saveOpt();await loadCfg();toast('Configurações salvas');close(1);syncRoot2()}));
  d.onclose=()=>{d.remove();res(null)};d.showModal();K.focus()})}
const syncRoot2=()=>{if(!busy&&!hist.length)empty()};

// ---------- abrir/fechar painel ----------
function setOpen(on){if(SHELL)return;P_.classList.toggle('on',on);btn.classList.toggle('on',on);
  if(on){if(narrow()||box.clientWidth<920){sb.classList.remove('on');$('#eEx').classList.remove('on')}
    loadCfg().then(()=>{syncRoot();if(!hist.length&&!busy)empty()});
    if(!matchMedia('(pointer:coarse)').matches)setTimeout(()=>inp.focus(),30);Ed.layout()}}
btn.onclick=()=>setOpen(!isOpen());P_.querySelector('#aiX').onclick=SHELL?()=>Cmx.lazy('work').then(m=>m.closeAI()):()=>setOpen(false);
if(!SHELL)$('#eEx').addEventListener('click',()=>{if(narrow()&&isOpen())setOpen(false)},true);
P_.querySelector('#aiCh').onclick=()=>Cmx.lazy('aichanges').then(m=>m.list(Ed.ctx().root)).catch(e=>toast(e.message));
P_.querySelector('#aiCfg').onclick=openCfg;
P_.querySelector('#aiNew').onclick=async()=>{if(busy||!curRoot)return;if(hist.length&&!(await dlg('Nova conversa?',{text:'O histórico desta conversa será apagado (os arquivos não são afetados).',buttons:[['Cancelar',null],['Apagar',1,'danger']]})))return;
  hist=[];try{localStorage.removeItem(hkey(curRoot))}catch{}renderAll()};
go.onclick=send;
inp.addEventListener('input',fit);
inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!matchMedia('(pointer:coarse)').matches){e.preventDefault();send()}
  else if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();send()}});
document.addEventListener('tide-folder',()=>{if(isOpen())syncRoot();else curRoot=null});
addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue=''}});
// API usada pela interface nova (Trabalho › IA, "Perguntar à IA" no editor)
window.AIUI={el:P_,openCfg,isBusy:()=>busy,focus:()=>inp.focus(),
  show(){loadCfg().then(()=>{syncRoot();if(!hist.length&&!busy)empty()})},
  ask(o={}){syncRoot();if(o.selection&&o.selection.text){chips=chips.filter(c=>c.kind!=='sel');chips.push({kind:'sel',rel:o.selection.rel||o.selection.path,from:o.selection.from,to:o.selection.to,sel:{path:o.selection.path,from:o.selection.from,to:o.selection.to,text:o.selection.text}})}
    if(o.file){chips=chips.filter(c=>!(c.kind==='file'&&c.path===o.file));chips.push({kind:'file',path:o.file,rel:o.rel||o.file});if(!inp.value)inp.value='Sobre o arquivo '+(o.rel||o.file).split('/').pop()+': '}
    if(o.text)inp.value=o.text;drawChips();fit();inp.focus();if(o.send)send()}};
})();
