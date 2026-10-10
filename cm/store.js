// Codemux - armazenamento em disco (JSON/JSONL) em ~/.codemux (ou $CODEMUX_HOME). Sem dependências.
// Nada é gravado dentro das pastas dos projetos.
const fs=require('fs'),path=require('path');
module.exports=({ROOT})=>{
  const BASE=process.env.CODEMUX_HOME?path.resolve(process.env.CODEMUX_HOME):path.join(ROOT,'.codemux');
  const ID=/^[a-z0-9]{4,32}$/;
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const checkId=id=>{if(!ID.test(String(id||'')))throw new Error('Identificador inválido');return String(id)};
  const p=(...a)=>path.join(BASE,...a);
  const ensure=d=>{fs.mkdirSync(d,{recursive:true});return d};
  function readJSON(f,def){try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return def}}
  function writeJSON(f,o){ensure(path.dirname(f));const t=f+'.'+process.pid+'.tmp';fs.writeFileSync(t,JSON.stringify(o));fs.renameSync(t,f)} // atômico
  function appendLine(f,o){ensure(path.dirname(f));fs.appendFileSync(f,JSON.stringify(o)+'\n')}
  function readLines(f){try{return fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean)}catch{return[]}}
  function rewriteLines(f,arr){ensure(path.dirname(f));const t=f+'.tmp';fs.writeFileSync(t,arr.map(x=>JSON.stringify(x)).join('\n')+(arr.length?'\n':''));fs.renameSync(t,f)}
  // mover com fallback entre sistemas de arquivos (EXDEV)
  function move(src,dst){ensure(path.dirname(dst));try{fs.renameSync(src,dst)}catch(e){if(e.code!=='EXDEV')throw e;fs.cpSync(src,dst,{recursive:true,verbatimSymlinks:true});fs.rmSync(src,{recursive:true,force:true})}}
  return{BASE,p,ensure,uid,checkId,readJSON,writeJSON,appendLine,readLines,rewriteLines,move}};
