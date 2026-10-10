/* Codemux - kit de UI (compartilhado): h(), menus, sheets, estados vazios, listas em blocos. */
(()=>{
// h('div.card#id',{onclick,class:'x',style:{}},'texto',node,[...]) - texto é sempre escapado (createTextNode)
function h(tag,props,...kids){
  if(props!=null&&(typeof props!=='object'||props.nodeType||Array.isArray(props))){kids.unshift(props);props=null} // props é opcional
  const m=/^([a-z][a-z0-9]*)?((?:[.#][\w-]+)*)$/i.exec(tag||'div')||[],e=document.createElement(m[1]||'div');
  for(const t of (m[2]||'').match(/[.#][\w-]+/g)||[])t[0]==='#'?e.id=t.slice(1):e.classList.add(t.slice(1));
  for(const [k,v] of Object.entries(props||{})){if(v==null||v===false)continue;
    if(k==='class')e.className+=(e.className?' ':'')+v;
    else if(k==='style'){if(typeof v==='string')e.style.cssText=v;else Object.assign(e.style,v)}
    else if(k==='html')e.innerHTML=v;
    else if(k.startsWith('on')&&typeof v==='function')e.addEventListener(k.slice(2).toLowerCase(),v);
    else if(k==='value'||k==='checked'||k==='disabled'||k==='hidden'||k==='selected')e[k]=v;
    else e.setAttribute(k,v===true?'':v)}
  const add=k=>{if(k==null||k===false)return;if(Array.isArray(k))k.forEach(add);else e.append(k.nodeType?k:document.createTextNode(String(k)))};kids.forEach(add);return e}
const ic=(n,c)=>{const t=document.createElement('template');t.innerHTML=I(n,c||'');return t.content.firstChild};

const isNarrow=()=>matchMedia('(max-width:700px)').matches;
let openMenu=null;
function closeMenu(){if(!openMenu)return;const {el,bg,from,off}=openMenu;openMenu=null;off();el.remove();if(bg)bg.remove();if(from&&from.focus&&document.contains(from)&&!matchMedia('(pointer:coarse)').matches)try{from.focus({preventScroll:true})}catch{}}
// items: {l:'Texto',i:'icone',f:fn,danger,off,sep,hint,check}  anchor: Element | {x,y}
function menu(anchor,items,o={}){
  closeMenu();const sheet=isNarrow()||o.sheet;
  const el=h('div.cmx-menu'+(sheet?'.sheeted':''),{role:'menu','aria-label':o.title||'Menu',tabindex:'-1'});
  if(o.title&&sheet)el.append(h('div.mt',o.title));
  let first=null;
  for(const it of items){if(!it)continue;
    if(it.sep){el.append(h('hr'));continue}
    const b=h('button'+(it.danger?'.danger':''),{role:'menuitem',type:'button',disabled:!!it.off,onclick:()=>{closeMenu();it.f&&it.f()}},
      it.i?ic(it.i):h('span.nic'),h('span.ml',it.l),it.check?ic('check','ck'):null,it.hint?h('small.hint',it.hint):null);
    if(!first&&!it.off)first=b;el.append(b)}
  const bg=sheet?h('div.cmx-bg',{onclick:closeMenu}):null;if(bg)document.body.append(bg);document.body.append(el);
  if(!sheet){const a=anchor&&anchor.getBoundingClientRect?anchor.getBoundingClientRect():{left:anchor.x,right:anchor.x,top:anchor.y,bottom:anchor.y,width:0},r=el.getBoundingClientRect();
    let x=o.align==='left'?a.left:a.right-r.width,y=a.bottom+6;if(!anchor.getBoundingClientRect){x=a.left;y=a.top}
    if(y+r.height>innerHeight-8)y=Math.max(8,(a.top||y)-r.height-6);x=Math.max(8,Math.min(x,innerWidth-r.width-8));el.style.left=x+'px';el.style.top=y+'px'}
  const key=e=>{if(e.key==='Escape'){e.preventDefault();closeMenu()}
    else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const bs=[...el.querySelectorAll('button:not(:disabled)')],i=bs.indexOf(document.activeElement);
      bs[e.key==='Home'?0:e.key==='End'?bs.length-1:(i+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length].focus()}};
  const out=e=>{if(!el.contains(e.target))closeMenu()};
  document.addEventListener('keydown',key,true);setTimeout(()=>document.addEventListener('pointerdown',out,true));
  openMenu={el,bg,from:anchor&&anchor.nodeType?anchor:null,off:()=>{document.removeEventListener('keydown',key,true);document.removeEventListener('pointerdown',out,true)}};
  if(first&&!matchMedia('(pointer:coarse)').matches)first.focus({preventScroll:true});else el.focus({preventScroll:true});
  return{close:closeMenu}}
// sheet modal (nativo <dialog>): foco preso, Esc fecha. No celular sobe do rodapé.
function sheet(o={}){
  const d=document.createElement('dialog');d.className='cmx-sheet'+(o.wide?' wide':'')+(o.full?' full':'');
  if(o.label)d.setAttribute('aria-label',o.label);
  const head=h('div.sh',h('b',o.title||''),h('button.x',{type:'button','aria-label':'Fechar',onclick:()=>close()},ic('x')));
  const body=h('div.sb2');[].concat(o.body||[]).forEach(n=>n&&body.append(n.nodeType?n:document.createTextNode(String(n))));
  d.append(head,body);const foot=h('div.sf');if(o.actions&&o.actions.length){o.actions.forEach(a=>foot.append(h('button'+(a.pri?'.pri':'')+(a.danger?'.danger':''),{type:'button',disabled:!!a.off,onclick:async()=>{if(a.f&&(await a.f())===false)return;if(!a.keep)close()}},a.l)));d.append(foot)}
  document.body.append(d);let closed=false;
  function close(v){if(closed)return;closed=true;try{d.close()}catch{}d.remove();o.onClose&&o.onClose(v)}
  d.addEventListener('close',()=>{if(!closed){closed=true;d.remove();o.onClose&&o.onClose()}});
  d.addEventListener('click',e=>{if(e.target===d)close()});d.showModal();
  return{el:d,body,foot,head,close}}
const empty=(icon,title,text,btn,fn)=>h('div.cmx-empty',ic(icon,'big'),h('b',title),text?h('p',text):null,btn?h('button.pri',{type:'button',onclick:fn},btn):null);
// renderiza listas grandes em blocos (evita travar com milhares de itens)
function chunk(host,items,render,n=80){let i=0;const more=h('button.cmx-more',{type:'button',onclick:()=>draw()});
  function draw(){more.remove();const end=Math.min(items.length,i+n);for(;i<end;i++)host.append(render(items[i],i));if(i<items.length){more.textContent='Mostrar mais ('+(items.length-i)+')';host.append(more)}}
  draw();return{all:()=>{i=Math.max(i,0);while(i<items.length)draw()}}}
const confirm=(title,text,ok='Confirmar',danger=false)=>dlg(title,{text,buttons:[['Cancelar',null],[ok,1,danger?'danger':'']]});
// o menu de contexto legado (editor/explorador) passa a usar o mesmo menu moderno
window.ctxMenu=(x,y,items)=>menu({x,y},items.map(([l,f,c])=>({l,f,danger:c==='danger'})));
window.closeCtx=closeMenu;
Cmx.ui={h,ic,menu,closeMenu,sheet,empty,chunk,confirm,isNarrow};
})();
