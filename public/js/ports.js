/* Codemux - Portas: servidores em execução detectados no aparelho (ex.: npm start). */
Cmx.mod.ports=(()=>{
const {h,ic,empty}=Cmx.ui;let page,off;
const mount=host=>{page=h('div.page');host.append(page)};
function show(){draw(Term.getPorts());off&&off();off=Cmx.on('ports',draw);Term.ports()}
function hide(){off&&off();off=null}
function draw(ports){page.replaceChildren(h('div.pg-h',h('h1','Portas'),h('div.sub','Servidores detectados neste aparelho. A lista é do sistema todo, não só deste projeto.'),h('button.sbtn',{type:'button',onclick:()=>Term.ports()},ic('refresh'),'Atualizar')),
  ports.length?h('div.card',h('div.list',...ports.map(n=>{const url=`http://${location.hostname}:${n}`;return h('div.li',ic('globe'),h('span.lt',h('b',':'+n),h('small',url)),
    h('button.sbtn',{type:'button',onclick:()=>Cmx.copy(url).then(()=>toast('URL copiada'))},ic('copy'),'Copiar'),h('a.pbtn',{href:url,target:'_blank',rel:'noopener'},ic('external'),'Abrir'))}))):
  empty('plug','Nenhum servidor rodando','Inicie um servidor no Terminal (por exemplo npm start) e ele aparece aqui.','Abrir terminal',()=>Cmx.shell.nav.project(null,'work','terminal')))}
return{mount,show,hide}})();
