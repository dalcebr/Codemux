// Lixeira: itens apagados vão para ~/.codemux/trash/<projeto>/<id>/ e podem ser restaurados.
const fs=require('fs'),path=require('path');
module.exports=({ROOT,safe,store,history})=>{
  const gid=p=>p||'_global',dirOf=p=>store.p('trash',gid(p)),idx=p=>path.join(dirOf(p),'index.json');
  const load=p=>store.readJSON(idx(p),[]),save=(p,a)=>store.writeJSON(idx(p),a);
  const rel=a=>path.relative(ROOT,a).split(path.sep).join('/');
  function size(abs,cap=2e5){let t=0,c=0;(function w(d){let es;try{es=fs.readdirSync(d,{withFileTypes:true})}catch{return}for(const e of es){if(++c>cap)return;const f=path.join(d,e.name);try{if(e.isDirectory())w(f);else t+=fs.lstatSync(f).size}catch{}}})(abs);return t}
  function guard(abs){if(abs===ROOT||abs===store.BASE||abs.startsWith(store.BASE+path.sep))throw new Error('Este item não pode ser movido para a lixeira')}
  // move um item (caminho relativo ao Início) para a lixeira do projeto
  function put(relPath,{project=null,actor='user'}={}){
    const abs=safe(relPath);guard(abs);const st=fs.lstatSync(abs),id=store.uid();
    const dst=path.join(dirOf(project),id,path.basename(abs));
    const meta={id,name:path.basename(abs),orig:rel(abs),dir:st.isDirectory(),size:st.isDirectory()?size(abs):st.size,at:Date.now(),actor};
    store.move(abs,dst);const a=load(project);a.push(meta);save(project,a);
    history.add(project,{type:'trash',actor,text:'Movido para a lixeira: '+meta.name,file:meta.orig});return meta}
  const list=project=>load(project).sort((a,b)=>b.at-a.at);
  function restore(project,ids,{actor='user'}={}){
    const a=load(project),out=[];
    for(const id of ids){const m=a.find(x=>x.id===id);if(!m)continue;
      const src=path.join(dirOf(project),m.id,m.name);if(!fs.existsSync(src)){a.splice(a.indexOf(m),1);continue}
      let dst=safe(m.orig);const parent=path.dirname(dst);fs.mkdirSync(parent,{recursive:true});
      if(fs.existsSync(dst)){const ext=path.extname(m.name),b=path.basename(m.name,ext);let i=1,c;do{c=path.join(parent,b+' (restaurado'+(i>1?' '+i:'')+')'+ext);i++}while(fs.existsSync(c));dst=c}
      store.move(src,dst);fs.rmSync(path.join(dirOf(project),m.id),{recursive:true,force:true});a.splice(a.indexOf(m),1);
      out.push({id,path:rel(dst),name:m.name});history.add(project,{type:'trash',actor,text:'Restaurado da lixeira: '+m.name,file:rel(dst)})}
    save(project,a);return out}
  function purge(project,ids){
    const a=load(project);let n=0;
    for(const id of ids){const m=a.find(x=>x.id===id);if(!m)continue;fs.rmSync(path.join(dirOf(project),m.id),{recursive:true,force:true});a.splice(a.indexOf(m),1);n++}
    save(project,a);return n}
  const empty=project=>purge(project,load(project).map(m=>m.id));
  return{put,list,restore,purge,empty}};
