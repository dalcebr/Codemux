// Registro das alterações feitas pela IA (antes/depois), com revisão e desfazer seguro.
// Cada execução do agente vira um "changeset" em ~/.codemux/projects/<id>/changes/.
const fs=require('fs'),path=require('path');
module.exports=({ROOT,safe,store,history,trash})=>{
  const GLOBAL='global',KEEP=30,CAP=12e6;
  const dir=pid=>store.p('projects',pid,'changes'),idxF=pid=>path.join(dir(pid),'index.json'),dataF=(pid,id)=>path.join(dir(pid),id+'.json');
  const idx=pid=>store.readJSON(idxF(pid),[]);
  let resolve=()=>null;const bind=f=>{resolve=f};
  const projId=root=>{const p=resolve(root);return p?p.id:GLOBAL};
  const homeRel=(root,r)=>(root?root+'/':'')+r;
  const rd=abs=>{try{const b=fs.readFileSync(abs);return b.includes(0)||b.length>1.5e6?undefined:b.toString('utf8')}catch{return null}}; // null=não existe, undefined=binário/grande

  // ---- gravação durante a execução ----
  function begin(root,prompt){
    const rec={id:store.uid(),root,pid:projId(root),prompt:String(prompt||'').slice(0,300),time:Date.now(),status:'pending',ops:[],bytes:0};
    rec.add=op=>{for(const k of['before','after']){if(typeof op[k]==='string'){if(rec.bytes+op[k].length>CAP){delete op[k];op.noText=true}else rec.bytes+=op[k].length}}rec.ops.push(op)};
    return rec}
  // resume as operações por arquivo (antes = primeiro "antes", depois = último "depois")
  function files(ops){
    const m=new Map(),out=[];
    for(const o of ops){
      if(o.op==='rename'){out.push({kind:'rename',path:o.to,from:o.from,undone:!!o.undone});continue}
      if(o.op==='mkdir'){if(!m.has(o.path))m.set(o.path,{kind:'mkdir',path:o.path});continue}
      let f=m.get(o.path);
      if(o.op==='delete'){if(f&&f.kind==='create'){m.delete(o.path);continue}m.set(o.path,{kind:'delete',path:o.path,dir:!!o.dir,undone:!!o.undone});continue}
      if(!f){f={kind:o.created?'create':'modify',path:o.path,before:o.before===undefined?null:o.before,noText:!!o.noText};m.set(o.path,f)}
      f.after=o.after;f.undone=!!o.undone;if(o.noText)f.noText=true}
    return[...out,...m.values()]}
  const meta=rec=>({id:rec.id,time:rec.time,prompt:rec.prompt,status:rec.status,files:files(rec.ops).map(f=>({kind:f.kind,path:f.path,from:f.from,undone:f.undone})),count:rec.ops.length});
  function finish(rec){
    if(!rec.ops.length)return null;
    store.writeJSON(dataF(rec.pid,rec.id),{id:rec.id,root:rec.root,ops:rec.ops});
    const a=idx(rec.pid);a.unshift(meta(rec));
    for(const old of a.splice(KEEP))fs.rmSync(dataF(rec.pid,old.id),{force:true});store.writeJSON(idxF(rec.pid),a);
    const fl=files(rec.ops).filter(f=>f.kind!=='mkdir'),names=fl.slice(0,3).map(f=>path.basename(f.path)).join(', ');
    if(rec.pid!==GLOBAL)history.add(rec.pid,{type:'ai',actor:'ai',text:'IA alterou '+fl.length+(fl.length===1?' arquivo':' arquivos')+(names?': '+names+(fl.length>3?'…':''):''),file:fl[0]?fl[0].path:''});
    return meta(rec)}

  // ---- leitura / revisão ----
  const list=root=>idx(projId(root));
  function get(root,id){const pid=projId(root);store.checkId(id);const d=store.readJSON(dataF(pid,id),null),m=idx(pid).find(x=>x.id===id);if(!d||!m)throw new Error('Alteração não encontrada');
    return{...m,files:files(d.ops).map(f=>({...f,before:f.noText?undefined:f.before,after:f.noText?undefined:f.after}))}}
  function setStatus(pid,id,st){const a=idx(pid),m=a.find(x=>x.id===id);if(m){m.status=st;store.writeJSON(idxF(pid),a)}}
  const keep=(root,id)=>{const pid=projId(root);store.checkId(id);const m=idx(pid).find(x=>x.id===id);if(!m)throw new Error('Alteração não encontrada');if(m.status==='pending')setStatus(pid,id,'kept');return{ok:1}};

  // ---- desfazer ----
  function undo(root,id,only){
    const pid=projId(root),d=store.readJSON(dataF(pid,store.checkId(id)),null);if(!d)throw new Error('Alteração não encontrada');
    const sel=Array.isArray(only)&&only.length?new Set(only.map(String)):null,conflicts=[],changes=[];let n=0;
    const hit=o=>!sel||sel.has(o.path)||sel.has(o.from)||sel.has(o.to);
    for(const o of [...d.ops].reverse()){
      if(o.undone||!hit(o))continue;const rel=o.path,abs=()=>safe(homeRel(root,rel));
      try{
        if(o.op==='write'||o.op==='edit'){
          const cur=rd(abs());
          if(o.noText){conflicts.push({path:rel,reason:'conteúdo grande demais para desfazer'});continue}
          if(o.created){if(cur===null){o.undone=true;continue}
            if(cur!==o.after){conflicts.push({path:rel,reason:'o arquivo foi modificado depois da IA'});continue}
            trash.put(homeRel(root,rel),{project:pid===GLOBAL?null:pid,actor:'user'});changes.push({op:'delete',path:homeRel(root,rel)})}
          else{if(typeof o.before!=='string'){conflicts.push({path:rel,reason:'versão anterior indisponível (binário/grande)'});continue}
            if(cur!==o.after){conflicts.push({path:rel,reason:cur===null?'o arquivo não existe mais':'o arquivo foi modificado depois da IA'});continue}
            fs.writeFileSync(abs(),o.before);changes.push({op:'write',path:homeRel(root,rel)})}}
        else if(o.op==='delete'){
          if(!o.trashId){conflicts.push({path:rel,reason:'sem cópia na lixeira'});continue}
          const r=trash.restore(pid===GLOBAL?null:pid,[o.trashId]);if(!r.length){conflicts.push({path:rel,reason:'não está mais na lixeira'});continue}
          changes.push({op:'write',path:r[0].path})}
        else if(o.op==='rename'){const f=safe(homeRel(root,o.from)),t=safe(homeRel(root,o.to));
          if(!fs.existsSync(t)||fs.existsSync(f)){conflicts.push({path:o.to,reason:'não foi possível voltar o nome'});continue}
          fs.mkdirSync(path.dirname(f),{recursive:true});fs.renameSync(t,f);changes.push({op:'rename',from:homeRel(root,o.to),to:homeRel(root,o.from)})}
        else if(o.op==='mkdir'){const a=abs();try{if(fs.existsSync(a)&&!fs.readdirSync(a).length){fs.rmdirSync(a);changes.push({op:'delete',path:homeRel(root,rel)})}}catch{}}
        o.undone=true;n++}
      catch(e){conflicts.push({path:rel||o.to,reason:e.message})}}
    store.writeJSON(dataF(pid,id),d);
    const all=d.ops.every(o=>o.undone),some=d.ops.some(o=>o.undone);setStatus(pid,id,all?'undone':some?'partial':'pending');
    if(n&&pid!==GLOBAL)history.add(pid,{type:'ai',actor:'user',text:'Você desfez alterações da IA ('+n+(n===1?' operação)':' operações)')});
    return{reverted:n,conflicts,changes,status:all?'undone':some?'partial':'pending'}}
  return{begin,finish,list,get,keep,undo,bind}};
