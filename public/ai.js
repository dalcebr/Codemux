/* ===== IA (DeepSeek) no app Código =====
   Usa só o que o index.html já expõe: $, I, P, api, dlg, toast, Ed, load.
   O servidor (ai.js) roda o agente; aqui ficam a interface e a sincronização com o editor. */
(()=>{
P.sparkle='<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15v4M17 17h4"/>';
P.sliders='<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>';
P.arrow='<path d="M5 12h14M13 6l6 6-6 6"/>';

const ed=$('#code .ed'),box=$('#code'),ab=ed.querySelector('.ab'),sb=$('#eSb');
const OPT_KEY='tide-ai-opt',HK='tide-ai:';
let opt={autoDelete:false};try{Object.assign(opt,JSON.parse(localStorage.getItem(OPT_KEY)||'{}'))}catch{}
const saveOpt=()=>{try{localStorage.setItem(OPT_KEY,JSON.stringify(opt))}catch{}};
let cfg={hasKey:false,hint:'',model:'deepseek-flash',fromEnv:false},hist=[],curRoot=null,busy=false,ctrl=null;

// ---------- DOM ----------
const btn=document.createElement('button');btn.id='eAi';btn.title='Assistente de IA';btn.innerHTML=I('sparkle');ab.append(btn);
const P_=document.createElement('div');P_.className='aip';P_.id='aiP';
P_.innerHTML=`<div class="aih"><b>${I('sparkle')}IA</b><span class="ars" id="aiRoot"></span><div>
<button id="aiNew" title="Nova conversa">${I('plus')}</button><button id="aiCfg" title="Configurações">${I('sliders')}</button><button id="aiX" title="Fechar">${I('x')}</button></div></div>
<div class="aim" id="aiMsgs"></div>
<div class="aif"><textarea id="aiIn" rows="1" placeholder="Peça algo para a IA…" autocomplete="off" autocapitalize="sentences"></textarea><button id="aiGo" title="Enviar">${I('send')}</button></div>`;
ed.append(P_);
const msgs=$('#aiMsgs'),inp=$('#aiIn'),go=$('#aiGo');
const narrow=()=>box.classList.contains('narrow'),isOpen=()=>P_.classList.contains('on');
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
  else{p.textContent='Peça para criar, editar, renomear ou excluir arquivos em “'+c.root.split('/').pop()+'”.';
    ['Crie um site simples com HTML, CSS e JS','Gere uma API Node.js com Express e rotas de exemplo','Explique a estrutura deste projeto'].forEach(t=>add(t,()=>{inp.value=t;fit();inp.focus()},'ch'))}
  msgs.append(d)}
function renderAll(){const r=curRoot;msgs.innerHTML='';$('#aiRoot').textContent=r?r.split('/').pop():'';
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

// ---------- envio ----------
function fit(){inp.style.height='auto';inp.style.height=Math.min(inp.scrollHeight,140)+'px'}
function setBusy(b){busy=b;go.innerHTML=I(b?'stop':'send');go.classList.toggle('stop',b);go.title=b?'Parar':'Enviar';$('#aiNew').disabled=b}
async function send(){
  if(busy){if(ctrl)ctrl.abort();return}
  const text=inp.value.trim();if(!text)return;
  syncRoot();const c=Ed.ctx();
  if(!c.root){toast('Abra uma pasta de projeto primeiro');empty();return}
  if(!cfg.hasKey){toast('Configure a chave do DeepSeek');openCfg();return}
  inp.value='';fit();
  if(!hist.length)msgs.innerHTML='';
  const ub=addUser(text),bub=addAsst();bub.classList.add('busy');
  setBusy(true);ctrl=new AbortController();
  const runRoot=c.root;let blk=null,raw='',gotAny=false,fail=false;const acts=[],rows={},parts=[];
  const newBlk=()=>{blk=document.createElement('div');blk.className='at';raw='';parts.push('');bub.append(blk)};
  try{
    const r=await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:ctrl.signal,
      body:JSON.stringify({root:runRoot,message:text,history:hist.slice(-30),ctx:{active:c.active,dirty:c.dirty},autoDelete:opt.autoDelete})});
    if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.error||'Erro '+r.status)}
    const rd=r.body.getReader(),dec=new TextDecoder();let buf='';
    const on=async ev=>{
      if(ev.t==='text'){gotAny=true;if(!blk)newBlk();raw+=ev.d;parts[parts.length-1]=raw;stick(()=>{blk.innerHTML=md(raw)})}
      else if(ev.t==='tool_start'){gotAny=true;blk=null;const row=document.createElement('div');row.className='aitool run';
        row.innerHTML=I('file')+'<span class="ait"></span><span class="ais"></span>';row.querySelector('.ait').textContent=RUN[ev.name]||ev.name;rows[ev.id]=row;stick(()=>bub.append(row))}
      else if(ev.t==='result'){const row=rows[ev.id]||bub.appendChild(document.createElement('div')),[ic,label,file]=describe(ev);
        row.className='aitool '+(ev.refused?'ref':ev.ok?'ok':'err');row.innerHTML=I(ic)+'<span class="ait"></span><span class="ais"></span>';
        const t=row.querySelector('.ait');t.textContent=label;if(!ev.ok&&!ev.refused&&ev.msg){const s=document.createElement('small');s.textContent=ev.msg.replace(/^Erro:\s*/,'');t.append(s)}
        if(ev.ok&&file&&ev.name!=='list_files'){row.classList.add('go');row.onclick=()=>{Ed.openFile(runRoot+'/'+file);if(narrow())setOpen(false)}}
        if(ev.ok){const n=actNote(ev);if(n)acts.push(n)}
        if(ev.changes&&ev.changes.length)queue(ev.changes);stick(()=>{})}
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
<label class="aipt"><input type="checkbox" id="cD" class="aick"><span>Excluir sem pedir confirmação (a IA apaga direto)</span></label><div class="btns"></div>`;
  const K=d.querySelector('#cK'),M=d.querySelector('#cM'),D=d.querySelector('#cD'),B=d.querySelector('.btns'),h=d.querySelector('.ahelp');
  K.placeholder=cfg.hasKey?'Chave atual: '+cfg.hint+' (deixe vazio para manter)':'sk-…';
  h.textContent=cfg.fromEnv?'Usando a chave da variável de ambiente DEEPSEEK_API_KEY.':'A chave fica guardada só no servidor (~/.termux-ide-ai.json) e nunca volta para o navegador.';
  M.value=cfg.model;D.checked=!!opt.autoDelete;
  const close=v=>{d.onclose=null;d.close();d.remove();res(v)};
  const mk=(l,f,c)=>{const b=document.createElement('button');b.textContent=l;if(c)b.className=c;b.onclick=f;B.append(b)};
  mk('Cancelar',()=>close(null));
  if(cfg.hasKey&&!cfg.fromEnv)mk('Remover chave',()=>run(async()=>{await api('/api/ai/config',{clearKey:true});await loadCfg();close(1);syncRoot2()}),'danger');
  mk('Salvar',()=>run(async()=>{const o={model:M.value.trim()};if(K.value.trim())o.key=K.value.trim();
    await api('/api/ai/config',o);opt.autoDelete=D.checked;saveOpt();await loadCfg();toast('Configurações salvas');close(1);syncRoot2()}));
  d.onclose=()=>{d.remove();res(null)};d.showModal();K.focus()})}
const syncRoot2=()=>{if(!busy&&!hist.length)empty()};

// ---------- abrir/fechar painel ----------
function setOpen(on){P_.classList.toggle('on',on);btn.classList.toggle('on',on);
  if(on){if(narrow()||box.clientWidth<920){sb.classList.remove('on');$('#eEx').classList.remove('on')}
    loadCfg().then(()=>{syncRoot();if(!hist.length&&!busy)empty()});
    if(!matchMedia('(pointer:coarse)').matches)setTimeout(()=>inp.focus(),30);Ed.layout()}}
btn.onclick=()=>setOpen(!isOpen());$('#aiX').onclick=()=>setOpen(false);
$('#eEx').addEventListener('click',()=>{if(narrow()&&isOpen())setOpen(false)},true);
$('#aiCfg').onclick=openCfg;
$('#aiNew').onclick=async()=>{if(busy||!curRoot)return;if(hist.length&&!(await dlg('Nova conversa?',{text:'O histórico desta conversa será apagado (os arquivos não são afetados).',buttons:[['Cancelar',null],['Apagar',1,'danger']]})))return;
  hist=[];try{localStorage.removeItem(hkey(curRoot))}catch{}renderAll()};
go.onclick=send;
inp.addEventListener('input',fit);
inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!matchMedia('(pointer:coarse)').matches){e.preventDefault();send()}
  else if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();send()}});
document.addEventListener('tide-folder',()=>{if(isOpen())syncRoot();else curRoot=null});
addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue=''}});
})();
