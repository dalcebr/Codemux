/* Interface clássica: janelas flutuantes, barra de tarefas, gaveta de programas. */
/* ===== Área de trabalho / janelas ===== */
const APPS={
 files:{name:'Arquivos',ic:'folder',col:'#e3b341',el:'#files',w:400,h:540,x:24,y:16},
 term:{name:'Terminal',ic:'terminal',col:'#3fb950',el:'#term',w:620,h:430,x:440,y:70},
 code:{name:'Código',ic:'code',col:'#58a6ff',el:'#code',w:880,h:580,x:70,y:24},
 git:{name:'Git',ic:'git',col:'#f05133',el:'#git',w:470,h:620,x:300,y:20}};
let ST={pin:['files','term','code'],desk:['files','term','code']};
try{Object.assign(ST,JSON.parse(localStorage.getItem('tide')||'{}'))}catch{}
if(!(ST.v>=2)){for(const k of ['pin','desk'])if(!ST[k].includes('git'))ST[k].push('git');ST.v=2}
const saveST=()=>{try{localStorage.setItem('tide',JSON.stringify(ST))}catch{}};
const W={};let zc=10,focused=null;
const desk=document.getElementById('desk'),mob=()=>innerWidth<760;
const vis=()=>Object.values(W).filter(x=>!x.el.classList.contains('min')).sort((a,b)=>a.el.style.zIndex-b.el.style.zIndex);

function mkWin(id){
 const a=APPS[id],el=document.createElement('div'),n=Object.keys(W).length;el.className='win';
 el.innerHTML=`<div class="wt"><span class="wi" style="color:${a.col}">${I(a.ic)}</span><b>${a.name}</b><span class="wb"><button data-a="min" title="Minimizar">${I('minus')}</button><button data-a="max" title="Maximizar">${I('square')}</button><button data-a="x" title="Fechar">${I('x')}</button></span></div><div class="wc"></div><div class="rz"></div>`;
 const dw=desk.clientWidth,dh=desk.clientHeight,w0=Math.min(a.w,dw-12),h0=Math.min(a.h,dh-12);
 Object.assign(el.style,{width:w0+'px',height:h0+'px',left:Math.max(0,Math.min(a.x+n*28,dw-w0))+'px',top:Math.max(0,Math.min(a.y+n*28,dh-h0))+'px'});
 el.querySelector('.wc').append(document.querySelector(a.el));desk.append(el);
 const w=W[id]={el,id};
 el.addEventListener('pointerdown',()=>focusWin(id),true);
 el.querySelector('.wb').onclick=e=>{const b=e.target.closest('button');if(!b)return;({min:minWin,max:toggleMax,x:closeWin})[b.dataset.a](id)};
 const wt=el.querySelector('.wt');
 wt.ondblclick=e=>{if(!e.target.closest('button')&&!mob())toggleMax(id)};
 wt.onpointerdown=e=>{if(e.target.closest('button')||mob()||el.classList.contains('max'))return;
  const sx=e.clientX,sy=e.clientY,ox=el.offsetLeft,oy=el.offsetTop;wt.setPointerCapture(e.pointerId);
  wt.onpointermove=m=>{el.style.left=Math.max(80-el.offsetWidth,Math.min(desk.clientWidth-80,ox+m.clientX-sx))+'px';el.style.top=Math.max(0,Math.min(desk.clientHeight-40,oy+m.clientY-sy))+'px'};
  wt.onpointerup=()=>{wt.onpointermove=wt.onpointerup=null}};
 const rz=el.querySelector('.rz');
 rz.onpointerdown=e=>{e.preventDefault();rz.setPointerCapture(e.pointerId);const sx=e.clientX,sy=e.clientY,w1=el.offsetWidth,h1=el.offsetHeight;
  rz.onpointermove=m=>{el.style.width=Math.max(300,w1+m.clientX-sx)+'px';el.style.height=Math.max(220,h1+m.clientY-sy)+'px'};
  rz.onpointerup=()=>{rz.onpointermove=rz.onpointerup=null}};
 return w}
function openApp(id){
 if(!W[id])mkWin(id);W[id].el.classList.remove('min');focusWin(id);
 document.getElementById('launcher').classList.remove('on');
 if(id==='code')Ed.layout();
 if(id==='term')setTimeout(()=>{const o=document.getElementById('out');o.scrollTop=o.scrollHeight},30)}
function focusWin(id){const w=W[id];if(!w)return;const chg=focused!==id;w.el.style.zIndex=++zc;focused=id;if(chg&&id==='git')setTimeout(()=>Git.refresh(),0);for(const k in W)W[k].el.classList.toggle('act',k===id);renderTb()}
function minWin(id){W[id].el.classList.add('min');if(focused===id){focused=null;const v=vis().pop();if(v){focusWin(v.id);return}}for(const k in W)W[k].el.classList.toggle('act',k===focused);renderTb()}
function toggleMax(id){const el=W[id].el,m=el.classList.toggle('max');el.querySelector('[data-a=max]').innerHTML=I(m?'restore':'square')}
function closeWin(id){const w=W[id];document.getElementById('store').append(document.querySelector(APPS[id].el));w.el.remove();delete W[id];
 if(focused===id){focused=null;const v=vis().pop();if(v){focusWin(v.id);return}}renderTb()}

/* ===== Barra de tarefas, gaveta e ícones ===== */
function renderTb(){const t=document.getElementById('apps');t.innerHTML='';
 [...new Set([...ST.pin,...Object.keys(W)])].forEach(id=>{const a=APPS[id];if(!a)return;const w=W[id],b=document.createElement('button');
  b.className='tbi'+(w?' run':'')+(w&&focused===id&&!w.el.classList.contains('min')?' act':'');b.title=a.name;
  b.innerHTML=`<span style="color:${a.col};display:grid">${I(a.ic)}</span>`;
  b.onclick=()=>{if(!w||w.el.classList.contains('min'))openApp(id);else if(focused===id)minWin(id);else focusWin(id)};
  b.oncontextmenu=e=>{e.preventDefault();appMenu(id,e.clientX,e.clientY)};t.append(b)})}
function renderLauncher(){const L=document.getElementById('launcher');L.innerHTML='<div class="lh">Programas</div><div class="lg"></div>';const g=L.querySelector('.lg');
 Object.entries(APPS).forEach(([id,a])=>{const t=document.createElement('div');t.className='tile';
  t.innerHTML=`<div class="ti" style="background:${a.col}22;color:${a.col}">${I(a.ic)}</div><span>${a.name}</span><button class="tm" title="Opções">${I('dots')}</button>`;
  t.onclick=e=>{const m=e.target.closest('.tm');if(m){const r=m.getBoundingClientRect();return appMenu(id,r.left,r.bottom)}openApp(id)};
  t.oncontextmenu=e=>{e.preventDefault();appMenu(id,e.clientX,e.clientY)};g.append(t)})}
function renderIcons(){const c=document.getElementById('icons');c.innerHTML='';
 ST.desk.forEach(id=>{const a=APPS[id];if(!a)return;const d=document.createElement('div');d.className='dic';
  d.innerHTML=`<div class="ti" style="background:${a.col}22;color:${a.col}">${I(a.ic)}</div><span>${a.name}</span>`;
  d.ondblclick=()=>openApp(id);d.onclick=()=>{if(matchMedia('(pointer:coarse)').matches||mob())openApp(id)};
  d.oncontextmenu=e=>{e.preventDefault();appMenu(id,e.clientX,e.clientY)};c.append(d)})}
function toggleList(k,id){const a=ST[k],i=a.indexOf(id);i<0?a.push(id):a.splice(i,1);saveST();renderTb();renderIcons()}
function appMenu(id,x,y){const pin=ST.pin.includes(id),dk=ST.desk.includes(id);
 ctxMenu(x,y,[['Abrir',()=>openApp(id)],[pin?'Desafixar da barra de tarefas':'Fixar na barra de tarefas',()=>toggleList('pin',id)],[dk?'Remover da área de trabalho':'Adicionar à área de trabalho',()=>toggleList('desk',id)],...(W[id]?[['Fechar',()=>closeWin(id)]]:[])])}
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#launcher,#start'))document.getElementById('launcher').classList.remove('on')},true);
document.getElementById('start').onclick=()=>document.getElementById('launcher').classList.toggle('on');
const clk=()=>{document.getElementById('clk').textContent=new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})};

