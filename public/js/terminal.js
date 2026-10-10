/* Terminal (sessões bash via SSE) + detecção de portas. Várias sessões; no modo projeto só aparecem as do projeto aberto. */
const Term=(()=>{
const {h,ic,menu}=Cmx.ui;const T=$('#term');
const strip=t=>t.replace(/\x1b\][^\x07]*\x07/g,'').replace(/\x1b\[[0-9;?]*[A-Za-z]/g,'').replace(/\r/g,'');
let all=[],sess=[],cur=null,es=null,scope=null,startCmd='',hist=[],hi=-1;try{hist=JSON.parse(localStorage.getItem('cmx-thist')||'[]')}catch{}
const out=h('pre#out',{tabindex:'0',role:'log','aria-label':'Saída do terminal'}),bTabs=h('div.stabs#stabs',{role:'tablist'}),
 cmd=h('input#cmd',{placeholder:'comando…','aria-label':'Comando',autocomplete:'off',autocapitalize:'off',autocorrect:'off',spellcheck:'false',enterkeyhint:'send'}),
 bInt=h('button.g#bInt',{type:'button',title:'Interromper (Ctrl+C)','aria-label':'Interromper'},ic('stop')),bSend=h('button#bSend',{type:'button',title:'Enviar','aria-label':'Enviar'},ic('send')),
 bMore=h('button.g.tmore',{type:'button',title:'Mais ações','aria-label':'Mais ações do terminal',onclick:e=>moreMenu(e.currentTarget)},ic('dots')),
 empt=h('div.tempty',{hidden:true},h('p','Nenhum terminal aberto neste projeto.'),h('button.pri',{type:'button',onclick:()=>newTerm(scope||cwd)},ic('plus'),'Novo terminal'));
T.replaceChildren(h('div.th',bTabs,bMore),out,empt,h('div.in',bInt,cmd,bSend));
const inScope=s=>scope===null||s.cwd===scope||s.cwd.startsWith(scope+'/');
async function loadSess(){await run(async()=>{all=(await api('/api/sessions')).list;sess=all.filter(inScope);
 if(!sess.find(x=>x.id===cur))cur=sess[0]?sess[0].id:null;tabsUI();connect()})}
function tabsUI(){bTabs.replaceChildren();sess.forEach((x,i)=>{const b=h('button'+(x.id===cur?'.on':''),{type:'button',role:'tab','aria-selected':x.id===cur?'true':'false',
  onclick:()=>{cur=x.id;tabsUI();connect();cmd.focus()}},`${i+1} · ${x.name}`);bTabs.append(b)});
 bTabs.append(h('button.tplus',{type:'button',title:'Novo terminal','aria-label':'Novo terminal',onclick:()=>newTerm(scope||cwd)},ic('plus')));
 empt.hidden=!!sess.length;out.hidden=!sess.length;cmd.disabled=bSend.disabled=bInt.disabled=!sess.length}
function connect(){if(es){es.close();es=null}out.textContent='';if(!cur)return;es=new EventSource('/api/term?id='+cur);
 es.onmessage=e=>{const n=out.scrollHeight-out.scrollTop-out.clientHeight<60;out.textContent=(out.textContent+strip(JSON.parse(e.data))).slice(-40000);if(n)out.scrollTop=out.scrollHeight}}
async function newTerm(p){await run(async()=>{cur=(await api('/api/term/new',{path:p})).id;await loadSess()})}
const send=d=>run(()=>api('/api/term/input',{id:cur,data:d}));
function sendCmd(){const v=cmd.value;cmd.value='';if(v.trim()&&hist[hist.length-1]!==v){hist.push(v);hist=hist.slice(-60);try{localStorage.setItem('cmx-thist',JSON.stringify(hist))}catch{}}hi=-1;send(v+'\n')}
cmd.onkeydown=e=>{if(e.key==='Enter')sendCmd();else if(e.key==='ArrowUp'&&hist.length){e.preventDefault();hi=hi<0?hist.length-1:Math.max(0,hi-1);cmd.value=hist[hi]}
 else if(e.key==='ArrowDown'&&hi>=0){e.preventDefault();hi++;if(hi>=hist.length){hi=-1;cmd.value=''}else cmd.value=hist[hi]}};
bSend.onclick=sendCmd;bInt.onclick=()=>run(()=>api('/api/term/int',{id:cur}));
const restart=()=>{out.textContent='';run(()=>api('/api/term/restart',{id:cur}))};
const close=()=>run(async()=>{if(es)es.close();await api('/api/term/close',{id:cur});cur=null;await loadSess()});
async function copyOut(){const s=String(getSelection()||'');const ok=await Cmx.copy(s&&out.contains(getSelection().anchorNode)?s:out.textContent);toast(ok?'Copiado':'Não foi possível copiar')}
function moreMenu(a){menu(a,[{l:'Novo terminal',i:'plus',f:()=>newTerm(scope||cwd)},{sep:1},{l:'Limpar tela',i:'x',f:()=>{out.textContent=''}},{l:'Copiar saída',i:'copy',off:!cur,f:copyOut},
 {l:'Reiniciar terminal',i:'refresh',off:!cur,f:restart},{l:'Fechar este terminal',i:'trash',danger:1,off:!cur,f:close}],{title:'Terminal'})}
// ---- API usada pelo shell / arquivos ----
// escopo: só mostra terminais cujo diretório inicial está dentro do projeto
async function setScope(p,cmdStart=''){scope=p===null?null:p;startCmd=cmdStart||'';await loadSess()}
async function ensure(){if(!sess.length&&scope!==null){await newTerm(scope);if(startCmd)setTimeout(()=>send(startCmd+'\n'),500)}}
async function here(p){await newTerm(p);openApp('term');setTimeout(()=>cmd.focus(),80)}
const focus=()=>{if(!cmd.disabled)cmd.focus()};
// ---- servidores rodando (portas detectadas) ----
let lastPorts=[];
async function ports(){try{const {ports}=await api('/api/ports');lastPorts=ports;const P=$('#ports');if(P){P.innerHTML='';P.classList.toggle('on',ports.length>0);
 if(ports.length){const m=document.createElement('small');m.textContent='Rodando:';P.append(m)}
 ports.forEach(n=>{const a=document.createElement('a');a.href=`http://${location.hostname}:${n}`;a.target='_blank';a.textContent=':'+n;P.append(a)})}
 Cmx.emit('ports',ports)}catch{}}
return{loadSess,setScope,ensure,here,focus,ports,list:()=>sess.slice(),getPorts:()=>lastPorts}})();
function tab(n){openApp(n===1?'files':'term');if(n===2)setTimeout(()=>Term.focus(),60)}
const loadSess=()=>Term.loadSess(),ports=()=>Term.ports();
