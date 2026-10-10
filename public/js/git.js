/* ===== Git / GitHub ===== */
const Git=(()=>{
let repo='',has=false,info=null,msg='',out='',busy=false,tm=0;
try{const s=localStorage.getItem('tide-git');if(s!==null){repo=s;has=true}}catch{}
const body=$('#gBody'),enc=encodeURIComponent;
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e};
const btn=(l,f,c='gbt',ic)=>{const b=el('button',c);if(ic)b.innerHTML=I(ic);b.append(l);b.onclick=f;b.disabled=busy;return b};
const card=(t,...k)=>{const c=el('div','gc');if(t)c.append(el('h4','',t));c.append(...k);body.append(c);return c};
const full=f=>repo?repo+'/'+f:f;
const saveRepo=()=>{try{localStorage.setItem('tide-git',repo)}catch{}};
const kind=xy=>{if(xy==='??')return['Novo','n'];if(/^(DD|AU|UD|UA|DU|AA|UU)$/.test(xy))return['Conflito','c'];
 const x=xy[0]!==' '?xy[0]:xy[1];return({M:['Modificado','m'],A:['Novo','n'],D:['Apagado','d'],R:['Renomeado','r'],C:['Novo','n']})[x]||['Alterado','m']};

async function refresh(){
 if(!has){render();return}
 try{const r=await api('/api/git/info?path='+enc(repo));info=r;if(r.repo&&r.path!==repo){repo=r.path;saveRepo()}}catch(e){info={error:e.message}}
 render()}
async function call(op,extra={}){
 try{const r=await api('/api/git/run',{path:repo,op,...extra});out=r.out||'';if(r.missing)info={missing:true};return r}
 catch(e){out=e.message;return{ok:false}}}
async function act(op,extra,okMsg){
 if(busy)return false;busy=true;render();const r=await call(op,extra);busy=false;
 toast(r.ok?(okMsg||'Concluído'):'Falhou — veja a saída abaixo');if(r.ok&&op==='commit')msg='';await refresh();return r.ok}
async function sendAll(){
 if(busy)return;const n=info.files.length;if(n&&!msg.trim())return toast('Escreva a mensagem do commit');
 busy=true;render();let ok=true;
 if(n){ok=(await call('commit',{message:msg})).ok;if(ok)msg='';else toast('Commit falhou — veja a saída')}
 if(ok){ok=(await call('push')).ok;toast(ok?'Enviado ao GitHub':'Push falhou — veja a saída')}
 busy=false;await refresh()}

function render(){
 $('#gRepo').textContent=has?(repo?repo.split('/').pop():'Início'):'Git';
 const br=$('#gBr');br.textContent=info&&info.branch||'';br.style.display=info&&info.branch?'':'none';
 body.innerHTML='';
 if(!has)return card('Git e GitHub',el('p','','Clone um repositório do GitHub, edite no editor, apague ou adicione arquivos e pastas e envie tudo de volta com commit e push.'),
   (()=>{const r=el('div','grow');r.append(btn('Clonar do GitHub',clone,'gbt pri','download'),btn('Abrir repositório',choose,'gbt','folder'),btn('Conta GitHub',account,'gbt','user'));return r})());
 if(!info)return card('',el('p','','Carregando…'));
 if(info.missing)return card('Git não instalado',el('p','','No Termux, rode: pkg install git'));
 if(info.error)return card('Erro',el('p','',info.error));
 if(info.repo===false)return card('Esta pasta não é um repositório',el('p','','Você pode iniciar um repositório aqui e depois conectar a um repositório do GitHub (botão Remoto).'),btn('Iniciar repositório aqui',()=>act('init',{},'Repositório criado'),'gbt pri','git'));
 // repositório
 const rem=info.remote?info.remote.replace(/^https:\/\//,''):'sem remoto';
 const r1=el('div','grow');
 if(info.ahead)r1.append(el('span','gchipx','↑ '+info.ahead+' a enviar'));if(info.behind)r1.append(el('span','gchipx','↓ '+info.behind+' a baixar'));
 const sel=el('select','gsel');info.branches.forEach(b=>{const o=el('option','',b);o.value=b;sel.append(o)});sel.value=info.branch;sel.disabled=busy||!info.branches.length;
 sel.onchange=()=>act('checkout',{branch:sel.value},'Branch alterada');
 const r2=el('div','grow');r2.append(sel,btn('Nova branch',newBranch,'gbt'),btn('Remoto',remote,'gbt'));
 const r3=el('div','grow');r3.append(btn('Pull',()=>act('pull',{},'Atualizado'),'gbt','arrow-down'),btn('Push',()=>act('push',{},'Enviado ao GitHub'),'gbt','arrow-up'),btn('Abrir no editor',()=>Ed.openFolder(repo),'gbt','code'));
 card('Repositório',el('p','',rem),...(r1.children.length?[r1]:[]),r2,r3);
 // alterações
 const c=card('Alterações ('+info.files.length+')');
 if(!info.files.length)c.append(el('p','','Nenhuma alteração. Edite, apague ou envie arquivos/pastas para o repositório e elas aparecem aqui.'));
 info.files.slice(0,200).forEach(f=>{const [lb,cl]=kind(f.xy),row=el('div','gf'),dir=f.path.endsWith('/');
  row.append(el('span','gs '+cl,lb),el('span','p',f.path));const m=el('button','gx');m.innerHTML=I('dots');row.append(m);
  const items=[];if(cl!=='d')items.push([dir?'Ver pasta no editor':'Abrir no editor',()=>dir?Ed.openFolder(full(f.path.slice(0,-1))):Ed.openFile(full(f.path))]);
  if(!dir&&cl!=='c')items.push(['Ver diferenças',()=>Cmx.lazy('diff').then(m=>m.showGit(repo,f.path)).catch(e=>toast(e.message))]);
  items.push(['Descartar alterações',async()=>{if(await dlg('Descartar alterações?',{text:f.path+(cl==='n'?' será apagado.':' voltará ao último commit.'),buttons:[['Cancelar',null],['Descartar',1,'danger']]}))act('discard',{file:f.path,xy:f.xy},'Descartado')}]);
  m.onclick=e=>{e.stopPropagation();const b=m.getBoundingClientRect();ctxMenu(b.left-190,b.bottom,items)};
  row.onclick=()=>{if(cl!=='d')items[0][1]()};c.append(row)});
 if(info.files.length>200)c.append(el('p','','… e mais '+(info.files.length-200)+' itens'));
 const inp=el('input','gin');inp.placeholder='Mensagem do commit';inp.value=msg;inp.oninput=()=>msg=inp.value;inp.disabled=busy;
 inp.onkeydown=e=>{if(e.key==='Enter')sendAll()};
 const r4=el('div','grow');r4.append(btn(busy?'Trabalhando…':'Commit e enviar',sendAll,'gbt pri','arrow-up'),
   btn('Só commit',()=>{if(!msg.trim())return toast('Escreva a mensagem do commit');act('commit',{message:msg},'Commit criado')},'gbt','check'));
 if(info.files.length||info.ahead)card('Enviar ao GitHub',inp,r4);
 if(out){const pre=el('pre','gout',out);card('Saída do Git',pre)}
 if(info.log.length){const h=card('Histórico');info.log.forEach(l=>{const r=el('div','gl');r.append(el('code','',l.h));const s=el('span','',l.s);s.append(el('small','','  '+l.a+' · '+l.t));r.append(s);h.append(r)})}}

async function choose(){const p=await Ed.pick(repo,'Usar esta pasta','Escolher repositório');if(p!==null)open(p)}
function open(p){repo=p;has=true;info=null;out='';saveRepo();openApp('git');render();refresh()}
// carrega um repositório sem navegar (interface por projeto)
function show(p){if(p!==repo||!has||!info){repo=p;has=true;info=null;out='';saveRepo();render()}refresh()}
async function newBranch(){const n=await dlg('Nova branch',{input:''});if(n)act('checkout',{branch:n,create:true},'Branch criada')}
async function remote(){const u=await dlg('Remoto (origin)',{text:'URL do repositório no GitHub',input:info.remote||'https://github.com/usuario/repo.git'});if(u)act('remote',{url:u},'Remoto salvo')}
async function clone(){
 const url=await dlg('Clonar repositório',{text:'Cole a URL do GitHub (https://github.com/usuario/repo.git). Para repositórios privados, configure a Conta antes.',input:''});if(!url)return;
 const dir=await Ed.pick('','Clonar aqui','Escolher pasta de destino');if(dir===null)return;
 busy=true;has=false;render();body.append(el('p','gm','Clonando… pode demorar um pouco.'));
 try{const r=await api('/api/git/clone',{url,dir});repo=r.path;has=true;out='';saveRepo();toast('Repositório clonado');Ed.openFolder(r.path)}
 catch(e){out=e.message;toast('Falha ao clonar');has=false}
 busy=false;info=null;await refresh();if(!has){render();if(out)card('Erro ao clonar',el('pre','gout',out))}}
async function account(){
 let c={};try{c=await api('/api/git/config')}catch{}
 const d=document.createElement('dialog');document.body.append(d);
 d.innerHTML='<h3>Conta GitHub</h3><p>Token: GitHub → Settings → Developer settings → Personal access tokens (permissão "repo", ou Contents: leitura e escrita). Fica salvo só neste aparelho.</p>';
 const f=[['Nome','name',c.name],['E-mail','email',c.email],['Usuário do GitHub','user',c.user],['Token de acesso','token','']].map(([l,k,v])=>{
  const i=el('input');i.placeholder=l+(k==='token'&&c.token?' (já salvo — vazio mantém)':'');i.value=v||'';i.autocomplete='off';i.autocapitalize='off';if(k==='token')i.type='password';d.append(i);return[k,i]});
 const B=el('div','btns'),x=()=>{d.close();d.remove()};
 const b1=el('button','','Cancelar'),b2=el('button','','Salvar');b1.onclick=x;
 b2.onclick=async()=>{const o={};f.forEach(([k,i])=>{if(i.value.trim())o[k]=i.value.trim()});
  if(o.token&&!o.user)return toast('Informe o usuário do GitHub');
  try{await api('/api/git/config',o);toast('Conta salva');x();refresh()}catch(e){toast(e.message)}};
 B.append(b1,b2);d.append(B);d.showModal()}

$('#gOpen').onclick=choose;$('#gClone').onclick=clone;$('#gAcc').onclick=account;$('#gRef').onclick=refresh;
document.addEventListener('tide-fs',()=>{clearTimeout(tm);tm=setTimeout(()=>{if(W.git&&has)refresh()},700)});
render();
return{open,refresh,show,repo:()=>repo,info:()=>info}})();

