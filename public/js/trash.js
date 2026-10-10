/* Codemux - Lixeira de arquivos: restaurar, excluir definitivamente, esvaziar. (project = id do projeto ou null = global) */
Cmx.mod.trash=(()=>{
const {h,ic,sheet,empty,confirm}=Cmx.ui;
async function open(project){let items=[],sel=new Set(),sp,list=h('div.list.tl');
  const q=()=>project?'?project='+project:'';
  async function load(){try{items=(await Cmx.cm.get('trash'+q())).items}catch(e){toast(e.message)}sel=new Set([...sel].filter(id=>items.some(i=>i.id===id)));draw()}
  const after=async()=>{await load();try{Files.refresh()}catch{}document.dispatchEvent(new Event('tide-fs'))};
  function draw(){list.replaceChildren();if(!items.length){list.append(empty('trash','Lixeira vazia','Arquivos excluídos aparecem aqui e podem ser restaurados.'));upd();return}
    items.forEach(i=>{const on=sel.has(i.id);list.append(h('div.li.click'+(on?'.sel':''),{role:'listitem'},h('button.tck'+(on?'.sel':''),{type:'button','aria-label':(on?'Desmarcar ':'Marcar ')+i.name,'aria-pressed':String(on),onclick:()=>{on?sel.delete(i.id):sel.add(i.id);draw()}},on?ic('check'):null),ic(i.dir?'folder':'file'),
      h('span.lt',h('b',i.name),h('small','/'+i.orig+' · excluído em '+Cmx.dt(i.at)+(i.size?' · '+fmt(i.size):''))),h('small.mu',i.actor==='ai'?'IA':'')))});upd()}
  function upd(){if(!sp)return;const [e,r,d]=[...sp.foot.querySelectorAll('button')].slice(1);e.disabled=!items.length;r.disabled=d.disabled=!sel.size;r.textContent=sel.size?'Restaurar ('+sel.size+')':'Restaurar';}
  sp=sheet({title:'Lixeira',wide:true,body:[list],actions:[{l:'Fechar'},{l:'Esvaziar',danger:true,keep:true,f:async()=>{if(await confirm('Esvaziar a lixeira?','Os itens serão apagados definitivamente.','Esvaziar',true)){await Cmx.cm.post('trash/empty',{project:project||null});await after()}return false}},
    {l:'Restaurar',keep:true,pri:true,f:async()=>{const r=await Cmx.cm.post('trash/restore',{project:project||null,ids:[...sel]});toast(r.restored.length+' item(ns) restaurado(s)');sel.clear();await after();return false}},
    {l:'Excluir definitivamente',danger:true,keep:true,f:async()=>{if(await confirm('Excluir definitivamente?',sel.size+' item(ns). Não dá para desfazer.','Excluir',true)){await Cmx.cm.post('trash/purge',{project:project||null,ids:[...sel]});sel.clear();await after()}return false}}]});
  await load()}
return{open}})();
