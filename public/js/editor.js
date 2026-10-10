/* ===== Editor de código ===== */
const Ed=(()=>{
const ta=$('#eTa'),hl=$('#eHl'),gut=$('#eGut'),sc=$('#eSc'),fm=$('#fm'),sb=$('#eSb'),box=$('#code'),fb=$('#fBar'),ff=$('#fFind'),fr=$('#fRep');
let tabs=[],cur=null,root='',sel='',exp=new Set(),fs=13,cw=7.8,seen=0,raf=0;
let autoMode='manual',autoT=0;const SESS=new Map(); // SESS: abas/árvore por projeto (interface nova)
const emit=(t,d)=>document.dispatchEvent(new CustomEvent('tide-ed',{detail:{type:t,...d}}));
try{const s=JSON.parse(localStorage.getItem('tide-ed')||'{}');root=s.root||'';fs=s.fs||13}catch{}
sel=root;
const persist=()=>{try{localStorage.setItem('tide-ed',JSON.stringify({root,fs}))}catch{}};
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const dirOf=p=>p.includes('/')?p.slice(0,p.lastIndexOf('/')):'';
const LANG={js:'js',mjs:'js',cjs:'js',jsx:'js',ts:'js',tsx:'js',json:'json',html:'html',htm:'html',vue:'html',xml:'html',svg:'html',css:'css',scss:'css',py:'py',sh:'sh',bash:'sh'};
const LN={js:'JavaScript',json:'JSON',html:'HTML',css:'CSS',py:'Python',sh:'Shell',txt:'Texto'};
const lang=n=>LANG[(n.split('.').pop()||'').toLowerCase()]||'txt';
const KW={js:'async|await|break|case|catch|class|const|continue|default|do|else|export|extends|false|finally|for|from|function|if|import|in|instanceof|interface|let|new|null|of|return|static|super|switch|this|throw|true|try|type|typeof|undefined|var|void|while|yield',
 py:'and|as|async|await|break|class|continue|def|elif|else|except|False|finally|for|from|if|import|in|is|lambda|None|not|or|pass|raise|return|self|True|try|while|with|yield',
 sh:'case|cd|do|done|echo|elif|else|esac|exit|export|fi|for|function|if|in|return|then|while'};
const S1=/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/.source,BT=/`(?:\\.|[^`\\])*`/.source,NU=/\b\d[\d.]*\b/.source,BC=/\/\*[\s\S]*?\*\//.source,TQ=/"""[\s\S]*?"""|'''[\s\S]*?'''/.source;
const mk=(c,s,k)=>new RegExp(`(${c})|(${s})|(${NU})|(\\b(?:${k})\\b)`,'g');
const RX={js:mk(/\/\/.*/.source+'|'+BC,S1+'|'+BT,KW.js),py:mk('#.*',TQ+'|'+S1,KW.py),sh:mk('#.*',S1,KW.sh),
 css:new RegExp(`(${BC})|(${S1})|(#[0-9a-fA-F]{3,8}\\b|\\b\\d+(?:\\.\\d+)?(?:px|r?em|%|vh|vw|ms|s|deg)?)|(@[\\w-]+|[\\w-]+(?=\\s*:))`,'g')};
const CL=['','c','s','n','k'];
function hi(code,l){
 if(code.length>300000||l==='txt')return esc(code);
 let out='',last=0;
 if(l==='html'){
  for(const m of code.matchAll(/(<!--[\s\S]*?-->)|(<\/?[a-zA-Z][^>]*>)/g)){out+=esc(code.slice(last,m.index));last=m.index+m[0].length;
   out+=m[1]?`<span class="c">${esc(m[1])}</span>`:esc(m[2]).replace(/("[^"]*"|'[^']*')/g,'<span class="s">$1</span>').replace(/^(&lt;\/?[\w:-]+)/,'<span class="k">$1</span>')}
  return out+esc(code.slice(last))}
 for(const m of code.matchAll(RX[l==='json'?'js':l])){
  out+=esc(code.slice(last,m.index));last=m.index+m[0].length;
  let g=1;while(g<5&&m[g]===undefined)g++;
  const cls=CL[g]||''; // nunca deixa "undefined" na classe (grupo fora do intervalo)
  out+=cls?`<span class="${cls}">${esc(m[0])}</span>`:esc(m[0])}
 return out+esc(code.slice(last))}
function paint(){raf=0;const t=ta.value;hl.innerHTML=hi(t,cur?lang(cur.name):'txt')+'\n';
 const n=t.split('\n').length;let g='';for(let i=1;i<=n;i++)g+=(i>1?'\n':'')+i;gut.textContent=g}
const sched=()=>{if(!raf)raf=requestAnimationFrame(paint)};
function stat(){if(!cur){$('#sPos').textContent='';$('#sInfo').textContent='';return}
 const p=ta.selectionStart,b=ta.value.slice(0,p),n=ta.selectionEnd-p;
 $('#sPos').textContent=`Ln ${b.split('\n').length}, Col ${p-b.lastIndexOf('\n')}`+(n?` (${n} selec.)`:'');
 const nd=tabs.filter(x=>x.text!==x.saved).length,me=cur.text!==cur.saved;
 $('#sInfo').textContent=`Espaços: 2   UTF-8   ${LN[lang(cur.name)]}   `+(me?'● Não salvo'+(nd>1?` (+${nd-1})`:''):(cur.savedAt&&Date.now()-cur.savedAt<8000?'✓ Salvo agora':'Salvo')+(nd?` · ${nd} não salvo${nd>1?'s':''}`:''))}
function measure(){const c=document.createElement('span');c.textContent='X'.repeat(50);const cs=getComputedStyle(ta);
 c.style.cssText=`position:absolute;visibility:hidden;white-space:pre;font-family:${cs.fontFamily};font-size:${cs.fontSize}`;ta.parentNode.append(c);
 const w=c.getBoundingClientRect().width/50;c.remove();if(w>0)cw=w}
function reveal(){const v=ta.value,p=ta.selectionStart,b=v.slice(0,p),ln=b.split('\n').length-1,col=p-b.lastIndexOf('\n')-1,gw=gut.offsetWidth;
 const x=gw+8+col*cw,y=ln*20+8,vw=sc.clientWidth,vh=sc.clientHeight;
 if(y<sc.scrollTop)sc.scrollTop=Math.max(0,y-8);else if(y+28>sc.scrollTop+vh)sc.scrollTop=y+28-vh;
 if(x<sc.scrollLeft+gw)sc.scrollLeft=Math.max(0,x-gw-24);else if(x+16>sc.scrollLeft+vw)sc.scrollLeft=x+16-vw}
const edEl=box.querySelector('.ed'); // referência estável ao contêiner do editor (define --fs)
function applyFont(){if(edEl)edEl.style.setProperty('--fs',fs+'px')}
function layout(){applyFont();const w=box.clientWidth;if(!w)return;box.classList.toggle('narrow',w<580);
 if(!seen){seen=1;sb.classList.toggle('on',w>=580);$('#eEx').classList.toggle('on',w>=580);tree()}
 measure()}
new ResizeObserver(layout).observe(box);

/* abas */
function renderTabs(){const T=$('#eTabs');T.innerHTML='';
 tabs.forEach(t=>{const e=document.createElement('div');e.className='et'+(t===cur?' on':'')+(t.conflict?' cf':'');e.title=t.path+(t.conflict?' — alterado no disco':'');
  e.innerHTML=`<span style="display:grid">${icon({name:t.name})}</span><span></span><button class="x">${t.text!==t.saved?'<span class="dot"></span>':I('x')}</button>`;
  e.children[1].textContent=t.name;
  e.onclick=ev=>{if(ev.target.closest('.x'))closeTab(t);else if(t!==cur)activate(t)};T.append(e)});
 const a=T.querySelector('.on');if(a)T.scrollLeft=Math.max(0,a.offsetLeft-20);
 const pill=$('#eCur');if(pill){pill.querySelector('.cn').textContent=cur?cur.name:'Nenhum arquivo';pill.classList.toggle('dirty',!!cur&&cur.text!==cur.saved);pill.querySelector('.cc').textContent=tabs.length>1?tabs.length:'';}
 emit('tabs')}
function welcome(){$('#eWel').classList.toggle('on',!cur);ta.disabled=!cur}
function activate(t){
 if(cur){cur.sel=ta.selectionStart;cur.st=sc.scrollTop;cur.sl=sc.scrollLeft}
 cur=t;ta.value=t.text;ta.setSelectionRange(t.sel||0,t.sel||0);welcome();paint();renderTabs();stat();
 sc.scrollTop=t.st||0;sc.scrollLeft=t.sl||0;
 const d=dirOf(t.path);if(root===''||d===root||d.startsWith(root+'/')){sel=d;}
 if(!matchMedia('(pointer:coarse)').matches)ta.focus({preventScroll:true});tree()}
async function openFile(p,o={}){
 openApp('code');document.dispatchEvent(new CustomEvent('tide-open',{detail:{path:p}}));const ex=tabs.find(t=>t.path===p);if(ex){activate(ex);if(o.line)gotoLine(o.line);return}
 try{const {text}=await api('/api/read?path='+encodeURIComponent(p));
  const t={path:p,name:p.split('/').pop(),text,saved:text,sel:0,st:0,sl:0};tabs.push(t);activate(t);if(o.line)gotoLine(o.line);
  if(box.classList.contains('narrow')){sb.classList.remove('on');$('#eEx').classList.remove('on')}}
 catch(e){toast(e.message)}}
async function reloadTab(t){try{const {text}=await api('/api/read?path='+encodeURIComponent(t.path));t.text=t.saved=text;t.conflict=false;
 if(t===cur){const p=Math.min(ta.selectionStart,text.length);ta.value=text;ta.setSelectionRange(p,p);paint()}renderTabs();stat()}catch(e){toast(e.message)}}
// salva uma aba. Em conflito (o arquivo mudou no disco enquanto havia edição local) nunca sobrescreve sem perguntar; o autosave nunca sobrescreve.
async function save(t=cur,o={}){if(!t)return false;const v=t===cur?ta.value:t.text;if(v!==t.text)t.text=v;
 if(t.conflict){if(o.auto)return false;
  const a=await dlg('Arquivo alterado no disco',{text:t.name+' foi modificado (pela IA ou por outro processo) depois que você começou a editar. O que fazer?',buttons:[['Cancelar',null],['Recarregar do disco','r'],['Sobrescrever',1,'danger']]});
  if(a==='r'){await reloadTab(t);return false}if(a!==1)return false}
 try{const r=await fetch('/api/write?path='+encodeURIComponent(t.path),{method:'POST',body:v});if(!r.ok)throw new Error((await r.json()).error||'Erro ao salvar');
  t.saved=v;t.conflict=false;t.savedAt=Date.now();renderTabs();stat();if(!o.auto)toast('Salvo');setTimeout(stat,8200);emit('save',{path:t.path,auto:!!o.auto});document.dispatchEvent(new Event('tide-fs'));return true}
 catch(e){toast(e.message);return false}}
const saveCur=()=>save(cur);
async function saveAll(o={}){let n=0;for(const t of tabs.filter(x=>x.text!==x.saved))if(await save(t,o))n++;return n}
function schedAuto(){clearTimeout(autoT);if(autoMode==='auto'&&cur)autoT=setTimeout(()=>{if(cur&&cur.text!==cur.saved)save(cur,{auto:true})},1500)}
// ao sair da aba/app (comum no celular), grava o que estiver pendente quando o autosave está ligado
document.addEventListener('visibilitychange',()=>{if(document.hidden&&autoMode==='auto')saveAll({auto:true})});
addEventListener('pagehide',()=>{if(autoMode==='auto')saveAll({auto:true})});
async function closeTab(t,force){
 if(!force&&t.text!==t.saved&&!(await dlg('Fechar sem salvar?',{text:t.name,buttons:[['Cancelar',null],['Fechar sem salvar',1,'danger']]})))return;
 const i=tabs.indexOf(t);tabs.splice(i,1);
 if(cur===t){cur=null;const n=tabs[i]||tabs[i-1];if(n)activate(n);else{ta.value='';paint();welcome();renderTabs();stat()}}else renderTabs()}
const dirty=()=>tabs.some(t=>t.text!==t.saved);
addEventListener('beforeunload',e=>{if(dirty()){e.preventDefault();e.returnValue=''}});

/* explorador */
async function fill(host,path,d){
 let items;try{items=(await api('/api/list?path='+encodeURIComponent(path))).items}catch(e){toast(e.message);return}
 for(const i of items){if(i.name==='.git')continue;const p=path?path+'/'+i.name:i.name,open=exp.has(p),r=document.createElement('div');
  r.className='tr'+(cur&&cur.path===p?' sel':'');r.style.paddingLeft=(10+d*14)+'px';
  r.innerHTML=(i.dir?I(open?'chev-d':'chev-r'):'<span style="width:18px;flex:none"></span>')+`<span style="display:grid">${icon(i)}</span><span class="nm2"></span><button class="tmn">${I('dots')}</button>`;
  r.querySelector('.nm2').textContent=i.name;
  r.onclick=e=>{if(e.target.closest('.tmn'))return nodeMenu(i,p,e);
   if(i.dir){sel=p;open?exp.delete(p):exp.add(p);tree()}else openFile(p)};
  host.append(r);if(i.dir&&open)await fill(host,p,d+1)}}
async function tree(){const T=$('#eTree'),top=T.scrollTop,f=document.createElement('div');
 $('#eRoot').textContent=(root?root.split('/').pop():'INÍCIO').toUpperCase();
 await fill(f,root,0);T.replaceChildren(...f.childNodes);T.scrollTop=top}
function nodeMenu(i,p,e){const r=e.target.closest('.tmn').getBoundingClientRect(),it=[];
 if(i.dir)it.push(['Novo arquivo aqui',()=>newItem('file',p)],['Nova pasta aqui',()=>newItem('dir',p)]);
 it.push(['Renomear',()=>ren(i,p)],['Excluir',()=>del(i,p)]);ctxMenu(r.left-190,r.bottom,it)}
async function newItem(kind,dir=sel){const n=await dlg(kind==='dir'?'Nova pasta':'Novo arquivo',{input:''});if(!n)return;
 try{await api(kind==='dir'?'/api/mkdir':'/api/newfile',{dir,name:n});exp.add(dir);await tree();document.dispatchEvent(new Event('tide-fs'));if(kind==='file')openFile((dir?dir+'/':'')+n)}catch(e){toast(e.message)}}
async function ren(i,p){const n=await dlg('Renomear',{input:i.name});if(!n||n===i.name)return;
 try{await api('/api/rename',{path:p,name:n});const np=(dirOf(p)?dirOf(p)+'/':'')+n;
  tabs.forEach(t=>{if(t.path===p||t.path.startsWith(p+'/')){t.path=np+t.path.slice(p.length);t.name=t.path.split('/').pop()}});
  if(exp.delete(p))exp.add(np);if(sel===p)sel=np;renderTabs();stat();tree();document.dispatchEvent(new Event('tide-fs'))}catch(e){toast(e.message)}}
async function del(i,p){if(!(await dlg('Mover para a lixeira?',{text:i.name+(i.dir?' e todo o conteúdo':'')+'\nVocê poderá restaurar depois.',buttons:[['Cancelar',null],['Mover para a lixeira',1,'danger']]})))return;
 try{const r=await api('/api/cm/fs/trash',{items:[p]});if(r.errors&&r.errors.length)throw new Error(r.errors[0]);toast('Movido para a lixeira');const hit=t=>t.path===p||t.path.startsWith(p+'/');const had=cur&&hit(cur);tabs=tabs.filter(t=>!hit(t));
  if(had){cur=null;if(tabs.length)activate(tabs[0]);else{ta.value='';paint();welcome();stat()}}
  exp.delete(p);if(sel===p)sel=root;renderTabs();tree();document.dispatchEvent(new Event('tide-fs'))}catch(e){toast(e.message)}}
function pick(start,label='Abrir esta pasta',title='Abrir pasta'){return new Promise(res=>{const d=document.createElement('dialog');document.body.append(d);let p=start||'';
 const done=v=>{d.onclose=null;d.close();d.remove();res(v)};
 const draw=async()=>{let items=[];try{items=(await api('/api/list?path='+encodeURIComponent(p))).items.filter(i=>i.dir)}catch(e){toast(e.message)}
  d.innerHTML='<h3></h3><p></p><div class="pl"></div><div class="btns"></div>';d.querySelector('h3').textContent=title;d.querySelector('p').textContent='Início'+(p?' / '+p.split('/').join(' / '):'');
  const L=d.querySelector('.pl'),row=(ic,t,f)=>{const r=document.createElement('div');r.className='pr';r.innerHTML=ic+'<span></span>';r.lastChild.textContent=t;r.onclick=f;L.append(r)};
  if(p)row(I('chev-up'),'Voltar',()=>{p=dirOf(p);draw()});
  items.forEach(i=>row(I('folder','c-folder'),i.name,()=>{p=p?p+'/'+i.name:i.name;draw()}));
  if(!items.length)L.insertAdjacentHTML('beforeend','<p style="padding:10px">Nenhuma subpasta</p>');
  const B=d.querySelector('.btns'),b1=document.createElement('button'),b2=document.createElement('button');b1.textContent='Cancelar';b2.textContent=label;
  b1.onclick=()=>done(null);b2.onclick=()=>done(p);B.append(b1,b2)};
 d.onclose=()=>{d.remove();res(null)};d.showModal();draw()})}
async function openFolder(p){if(document.documentElement.dataset.ui==='shell'){document.dispatchEvent(new CustomEvent('tide-openfolder',{detail:{path:p}}));return} // interface por projeto: o shell decide
 root=p;sel=p;exp.clear();persist();openApp('code');sb.classList.add('on');$('#eEx').classList.add('on');tree();document.dispatchEvent(new Event('tide-folder'))}
async function chooseFolder(){const p=await pick(root);if(p!==null)openFolder(p)}

/* edição */
function ins(t){ta.focus({preventScroll:true});if(!document.execCommand('insertText',false,t)){ta.setRangeText(t,ta.selectionStart,ta.selectionEnd,'end');ta.dispatchEvent(new Event('input'))}}
function rep(a,b,t,s,e){ta.focus({preventScroll:true});ta.setSelectionRange(a,b);ins(t);ta.setSelectionRange(s,e)}
function indent(back){const v=ta.value,s=ta.selectionStart,e=ta.selectionEnd;if(s===e&&!back){ins('  ');return}
 const a=v.lastIndexOf('\n',s-1)+1;let b=v.indexOf('\n',e);if(b<0)b=v.length;
 const L=v.slice(a,b).split('\n'),nl=L.map(x=>back?x.replace(/^( {1,2}|\t)/,''):'  '+x).join('\n');
 if(s===e){const c=Math.max(a,s-(b-a-nl.length));rep(a,b,nl,c,c)}else rep(a,b,nl,a,a+nl.length)}
function comment(){if(!cur)return;const pre={js:'// ',py:'# ',sh:'# '}[lang(cur.name)];if(!pre)return;
 const v=ta.value,a=v.lastIndexOf('\n',ta.selectionStart-1)+1;let b=v.indexOf('\n',ta.selectionEnd);if(b<0)b=v.length;
 const m=pre.trim(),L=v.slice(a,b).split('\n'),all=L.every(x=>!x.trim()||x.trimStart().startsWith(m));
 const nl=L.map(x=>!x.trim()?x:all?x.replace(m+' ','').replace(m,''):x.replace(/^(\s*)/,(_,i)=>i+pre)).join('\n');rep(a,b,nl,a,a+nl.length)}
ta.addEventListener('beforeinput',e=>{
 if(e.isComposing||!e.cancelable||!cur)return;const v=ta.value,s=ta.selectionStart,en=ta.selectionEnd,t=e.inputType;
 if(t==='insertLineBreak'||t==='insertParagraph'){e.preventDefault();
  const ls=v.lastIndexOf('\n',s-1)+1,ind=v.slice(ls,s).match(/^\s*/)[0],pb=v[s-1],cl={'{':'}','(':')','[':']'}[pb];
  const extra=(cl||(pb===':'&&lang(cur.name)==='py'))?'  ':'',t1='\n'+ind+extra;
  if(cl&&v[en]===cl){ins(t1+'\n'+ind);ta.setSelectionRange(s+t1.length,s+t1.length)}else ins(t1);reveal();return}
 if(t==='insertText'&&e.data&&e.data.length===1){const ch=e.data,nx=v[en],pr={'(':')','[':']','{':'}','"':'"',"'":"'",'`':'`'};
  if(')]}"\'`'.includes(ch)&&nx===ch&&s===en){e.preventDefault();ta.setSelectionRange(s+1,s+1);return}
  if(pr[ch]){if(s!==en){e.preventDefault();ins(ch+v.slice(s,en)+pr[ch]);ta.setSelectionRange(s+1,en+1);return}
   if((!nx||/[\s)\]}.,;:]/.test(nx))&&!(/["'`]/.test(ch)&&/\w/.test(v[s-1]||''))){e.preventDefault();ins(ch+pr[ch]);ta.setSelectionRange(s+1,s+1)}}return}
 if(t==='deleteContentBackward'&&s===en&&s>0){const o=v[s-1],c=v[s];if(({'(':')','[':']','{':'}','"':'"',"'":"'",'`':'`'})[o]===c){e.preventDefault();ta.setSelectionRange(s-1,s+1);document.execCommand('delete')}}});
ta.addEventListener('input',()=>{if(!cur)return;const was=cur.text!==cur.saved;cur.text=ta.value;fm.style.display='none';sched();stat();if(was!==(cur.text!==cur.saved)){renderTabs();emit('dirty')}schedAuto();reveal()});
ta.addEventListener('keydown',e=>{const c=e.ctrlKey||e.metaKey;
 if(e.key==='Tab'){e.preventDefault();indent(e.shiftKey)}
 else if(c&&e.key==='/'){e.preventDefault();comment()}});
box.addEventListener('keydown',e=>{const c=e.ctrlKey||e.metaKey;
 if(c&&e.key.toLowerCase()==='s'){e.preventDefault();saveCur()}
 else if(c&&e.key.toLowerCase()==='f'){e.preventDefault();findOpen()}
 else if(e.key==='Escape'&&fb.classList.contains('on'))findClose()});
document.addEventListener('selectionchange',()=>{if(document.activeElement===ta)stat()});
sc.addEventListener('scroll',()=>{});

/* buscar / substituir */
const escRe=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function findOpen(){if(!cur)return;fb.classList.add('on');const s=ta.value.slice(ta.selectionStart,ta.selectionEnd);if(s&&!s.includes('\n'))ff.value=s;ff.focus();ff.select();fGo(0)}
function findClose(){fb.classList.remove('on');fm.style.display='none';ta.focus({preventScroll:true})}
function fAll(){const q=ff.value.toLowerCase(),r=[];if(!q)return r;const v=ta.value.toLowerCase();let i=-1;while((i=v.indexOf(q,i+1))>=0)r.push(i);return r}
function fGo(d){const r=fAll();$('#fCnt').textContent=r.length;if(!r.length){fm.style.display='none';return}
 let k;if(d>=0){k=r.findIndex(x=>x>=(d?ta.selectionEnd:ta.selectionStart));if(k<0)k=0}else{k=r.length-1;for(let j=r.length-1;j>=0;j--)if(r[j]<ta.selectionStart){k=j;break}}
 const p=r[k];ta.setSelectionRange(p,p+ff.value.length);const b=ta.value.slice(0,p),ln=b.split('\n').length-1,col=p-b.lastIndexOf('\n')-1;
 Object.assign(fm.style,{display:'block',left:(8+col*cw)+'px',top:(8+ln*20)+'px',width:(ff.value.length*cw)+'px'});reveal()}
ff.addEventListener('input',()=>fGo(0));
ff.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();fGo(e.shiftKey?-1:1)}});
fr.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#fR1').click()}});
$('#fNext').onclick=()=>fGo(1);$('#fPrev').onclick=()=>fGo(-1);$('#fX').onclick=findClose;
$('#fR1').onclick=()=>{if(!cur||!ff.value)return;if(ta.value.slice(ta.selectionStart,ta.selectionEnd).toLowerCase()===ff.value.toLowerCase()){ins(fr.value);fm.style.display='none'}fGo(0)};
$('#fRA').onclick=()=>{if(!cur||!ff.value)return;const n=ta.value.replace(new RegExp(escRe(ff.value),'gi'),()=>fr.value);ta.focus({preventScroll:true});ta.select();ins(n);ta.setSelectionRange(0,0);fGo(0)};

/* botões */
$('#eEx').onclick=()=>{const on=sb.classList.toggle('on');$('#eEx').classList.toggle('on',on)};
$('#eNF').onclick=()=>newItem('file');$('#eND').onclick=()=>newItem('dir');$('#eRf').onclick=tree;
$('#eOpen').onclick=chooseFolder;$('#wOpen').onclick=chooseFolder;$('#wNew').onclick=()=>newItem('file');
$('#eSv').onclick=saveCur;$('#eFd').onclick=findOpen;
$('#eUn').onclick=()=>{ta.focus({preventScroll:true});document.execCommand('undo')};$('#eRe').onclick=()=>{ta.focus({preventScroll:true});document.execCommand('redo')};
const zoom=d=>{fs=Math.max(10,Math.min(24,fs+d));persist();applyFont();measure()};
$('#eFm').onclick=()=>zoom(-1);$('#eFp').onclick=()=>zoom(1);
const xk=$('#eXk');
[['Tab',()=>indent(false)],['←',()=>{const p=Math.max(0,ta.selectionStart-1);ta.setSelectionRange(p,p);stat()}],['→',()=>{const p=Math.min(ta.value.length,ta.selectionEnd+1);ta.setSelectionRange(p,p);stat()}],
 ...[...'{}()[];:"\'`/\\=<>!&|$_-+*#.,'].map(c=>[c,()=>ins(c)])].forEach(([l,f])=>{const b=document.createElement('button');b.textContent=l;
 b.onmousedown=e=>e.preventDefault();b.onclick=()=>{if(cur){ta.focus({preventScroll:true});f()}};xk.append(b)});
/* integração IA (ai.js): contexto do editor e aplicação das mudanças feitas em disco pelo agente */
function ctx(){return{root,active:cur?cur.path:'',dirty:tabs.filter(t=>t.text!==t.saved).map(t=>t.path)}}
async function sync(changes){
 const hit=(t,p)=>t.path===p||t.path.startsWith(p+'/'),reload=new Set();
 for(const c of changes){
  if(c.op==='rename'){tabs.forEach(t=>{if(hit(t,c.from)){t.path=c.to+t.path.slice(c.from.length);t.name=t.path.split('/').pop()}});if(exp.delete(c.from))exp.add(c.to);if(sel===c.from)sel=c.to}
  else if(c.op==='delete'){const gone=tabs.filter(t=>hit(t,c.path)&&t.text===t.saved);
   if(gone.length){const had=cur&&gone.includes(cur);tabs=tabs.filter(t=>!gone.includes(t));
    if(had){cur=null;if(tabs.length)activate(tabs[0]);else{ta.value='';paint();welcome();stat()}}}
   exp.delete(c.path);if(sel===c.path)sel=root}
  else if(c.op==='write'&&tabs.some(t=>t.path===c.path))reload.add(c.path)}
 for(const p of reload){const t=tabs.find(x=>x.path===p);if(!t)continue;
  if(t.text!==t.saved){t.conflict=true;toast(t.name+' foi alterado pela IA, mas você tem edições não salvas aqui');continue}
  try{const {text}=await api('/api/read?path='+encodeURIComponent(p));if(text===t.text)continue;t.text=t.saved=text;
   if(t===cur){const s=Math.min(ta.selectionStart,text.length);ta.value=text;ta.setSelectionRange(s,s);paint();stat()}}catch{}}
 renderTabs();stat();tree();document.dispatchEvent(new Event('tide-fs'))} // tide-fs: atualiza o app Git
/* ===== API para a interface nova (shell) ===== */
const lineStart=n=>{const v=ta.value;let i=0;for(let k=1;k<n;k++){const j=v.indexOf('\n',i);if(j<0)return v.length;i=j+1}return i};
function gotoLine(n,col=1){if(!cur)return;n=Math.max(1,Math.floor(+n)||1);const p=Math.min(ta.value.length,lineStart(n)+Math.max(0,col-1));
 ta.setSelectionRange(p,p);sc.scrollTop=Math.max(0,(n-1)*20-sc.clientHeight/3);stat();if(!matchMedia('(pointer:coarse)').matches)ta.focus({preventScroll:true})}
async function format(){if(!cur)return false;const v=ta.value,l=lang(cur.name);let n=v;
 if(l==='json'){try{n=JSON.stringify(JSON.parse(v),null,2)+'\n'}catch(e){toast('JSON inválido: '+e.message);return false}}
 else{n=v.replace(/^\t+/gm,m=>'  '.repeat(m.length)).replace(/[ \t]+$/gm,'').replace(/\n*$/,'\n')}
 if(n===v){toast('Já está formatado');return true}
 const ln=ta.value.slice(0,ta.selectionStart).split('\n').length;ta.focus({preventScroll:true});ta.select();ins(n);gotoLine(ln);return true}
const selection=()=>{if(!cur||ta.selectionStart===ta.selectionEnd)return null;const a=ta.selectionStart,b=ta.selectionEnd,pre=ta.value.slice(0,a);
 return{path:cur.path,from:pre.split('\n').length,to:ta.value.slice(0,b).split('\n').length,text:ta.value.slice(a,b).slice(0,8000)}};
const tabList=()=>tabs.map(t=>({path:t.path,name:t.name,dirty:t.text!==t.saved,conflict:!!t.conflict,active:t===cur}));
const byPath=p=>tabs.find(t=>t.path===p);
function toggleSidebar(on){const v=on===undefined?!sb.classList.contains('on'):!!on;sb.classList.toggle('on',v);$('#eEx').classList.toggle('on',v);return v}
// troca de projeto SEM navegar: cada projeto mantém suas próprias abas e pasta aberta
function setRoot(p){if(p===root&&seen>1)return;seen=2;SESS.set(root,{tabs,cur,exp,sel});
 if(cur)cur.sel=ta.selectionStart;const s=SESS.get(p);root=p;tabs=s?s.tabs:[];cur=s?s.cur:null;exp=s?s.exp:new Set();sel=s?s.sel:p;persist();
 ta.value=cur?cur.text:'';if(cur)ta.setSelectionRange(cur.sel||0,cur.sel||0);welcome();paint();renderTabs();stat();tree();document.dispatchEvent(new Event('tide-folder'))}
// estado persistente (abas limpas + linha do cursor) para retomar depois de recarregar
function getState(){const t=tabs.filter(x=>x.text===x.saved||!x.dirty).map(x=>{const pre=(x===cur?ta.value.slice(0,ta.selectionStart):x.text.slice(0,x.sel||0));return{path:x.path,line:pre.split('\n').length}});
 return{tabs:t.slice(0,12),active:cur?cur.path:null}}
async function restoreState(st){if(!st||!Array.isArray(st.tabs))return;let first=null;
 for(const x of st.tabs.slice(0,12)){if(tabs.some(t=>t.path===x.path))continue;
  try{const {text}=await api('/api/read?path='+encodeURIComponent(x.path));const t={path:x.path,name:x.path.split('/').pop(),text,saved:text,sel:lineStart2(text,x.line),st:0,sl:0};tabs.push(t);if(x.path===st.active)first=t}catch{}}
 const a=first||byPath(st.active)||tabs[0];if(a){activate(a);const ln=(st.tabs.find(x=>x.path===a.path)||{}).line;if(ln>1)gotoLine(ln)}else renderTabs()}
function lineStart2(t,n){let i=0;for(let k=1;k<(n||1);k++){const j=t.indexOf('\n',i);if(j<0)return t.length;i=j+1}return i}
async function closeOthers(){for(const t of tabs.filter(x=>x!==cur))await closeTab(t)}
async function closeAll(o={}){for(const t of [...tabs])await closeTab(t,!!o.discard)}
function setAutosave(m){autoMode=m==='auto'?'auto':'manual';if(autoMode==='auto'&&cur&&cur.text!==cur.saved)schedAuto()}
function setFont(px){fs=Math.max(10,Math.min(24,+px||13));persist();box.querySelector('.ed').style.setProperty('--fs',fs+'px');measure()}
const getFont=()=>fs,getRoot=()=>root,undo=()=>{ta.focus({preventScroll:true});document.execCommand('undo')},redo=()=>{ta.focus({preventScroll:true});document.execCommand('redo')};
return{openFile,openFolder,dirty,layout,pick,ctx,sync,setRoot,getRoot,tabs:tabList,activate:p=>{const t=byPath(p);if(t)activate(t)},closeTab:(p,o={})=>{const t=byPath(p);return t?closeTab(t,!!o.discard):0},closeOthers,closeAll,
 save:()=>save(cur),saveAll,gotoLine,format,selection,toggleSidebar,getState,restoreState,setAutosave,setFont,getFont,undo,redo,find:findOpen,reloadTab:p=>{const t=byPath(p);return t&&reloadTab(t)},curPath:()=>cur?cur.path:'',focus:()=>{if(cur)ta.focus({preventScroll:true})},tree}})();

