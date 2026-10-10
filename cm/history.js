// Histórico de eventos por projeto (JSONL, mais novo no fim). Rotaciona para não crescer sem limite.
module.exports=({store})=>{
  const file=pid=>store.p('projects',store.checkId(pid),'history.jsonl');
  const MAX=6000,KEEP=4000,lastEdit=new Map();let n=0;
  const TYPES=new Set(['project','file','edit','ai','git','task','trash','system']);
  // evt: {type, actor:'user'|'ai'|'git'|'system', text, file?}
  function add(pid,evt){
    if(!pid)return;const e={t:Date.now(),type:TYPES.has(evt.type)?evt.type:'system',actor:evt.actor||'user',text:String(evt.text||'').slice(0,300)};
    if(evt.file)e.file=String(evt.file).slice(0,500);
    if(e.type==='edit'&&e.file){const k=pid+'|'+e.actor+'|'+e.file;if(Date.now()-(lastEdit.get(k)||0)<120000)return;lastEdit.set(k,e.t);if(lastEdit.size>2000)lastEdit.clear()} // agrupa salvamentos seguidos
    try{store.appendLine(file(pid),e);if(++n%200===0){const all=store.readLines(file(pid));if(all.length>MAX)store.rewriteLines(file(pid),all.slice(-KEEP))}}catch{}}
  function list(pid,{before=0,limit=50,type='',q=''}={}){
    limit=Math.max(1,Math.min(200,+limit||50));q=String(q||'').toLowerCase();
    let all=store.readLines(file(pid));if(type)all=all.filter(e=>e.type===type);if(q)all=all.filter(e=>(e.text+' '+(e.file||'')).toLowerCase().includes(q));
    all.reverse();if(+before)all=all.filter(e=>e.t<+before);const items=all.slice(0,limit);
    return{items,more:all.length>limit,total:all.length}}
  function clear(pid){try{require('fs').rmSync(file(pid),{force:true})}catch{}}
  return{add,list,clear}};
