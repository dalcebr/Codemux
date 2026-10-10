// Extras de Git para o Codemux (resumo do repositório e diff de um arquivo). Reutiliza a função git() do servidor.
const fs=require('fs'),path=require('path');
module.exports=({safe,git})=>{
  async function summary(r){
    const cwd=safe(r||'');if(!fs.existsSync(cwd))throw new Error('Pasta não encontrada');
    const top=await git(cwd,['rev-parse','--show-toplevel']);
    if(top.missing)return{missing:true};if(top.code)return{repo:false};
    const [st,cnt,rm]=await Promise.all([git(cwd,['status','--porcelain=v1','-b','-z']),git(cwd,['rev-list','--count','HEAD']),git(cwd,['remote','get-url','origin'])]);
    const ent=st.out.split('\0'),h=(ent.shift()||'').slice(3),m=h.match(/^(?:No commits yet on |Initial commit on )?(.+?)(?:\.\.\.(\S+))?(?: \[(.*)\])?$/)||[];
    let changes=0;for(let i=0;i<ent.length;i++){if(!ent[i])continue;changes++;if(/^[RC]/.test(ent[i]))i++}
    return{repo:true,branch:m[1]||'',changes,commits:cnt.code?0:+cnt.out.trim()||0,ahead:+((m[3]||'').match(/ahead (\d+)/)||[0,0])[1],behind:+((m[3]||'').match(/behind (\d+)/)||[0,0])[1],remote:rm.code?'':rm.out.trim()}}
  // lista curta de arquivos alterados (para o contexto da IA)
  async function status(r){const cwd=safe(r||'');if(!fs.existsSync(cwd))return[];const st=await git(cwd,['status','--porcelain=v1','-z']);if(st.code)return[];
    const ent=st.out.split('\0'),out=[];for(let i=0;i<ent.length&&out.length<50;i++){const e=ent[i];if(!e)continue;out.push(e.slice(0,2).trim()+' '+e.slice(3));if(/^[RC]/.test(e))i++}return out}
  const text=buf=>{if(buf.length>1.5e6)return{big:true};if(buf.includes(0))return{binary:true};return{text:buf.toString('utf8')}};
  // antes = versão do último commit; depois = arquivo no disco. O cliente calcula o diff.
  async function diff(repo,file){
    const cwd=safe(repo||'');file=String(file||'').replace(/\/$/,'');if(!file||file.startsWith('-')||file.includes('\0'))throw new Error('Arquivo inválido');
    const abs=path.resolve(cwd,file);if(abs!==cwd&&!abs.startsWith(cwd+path.sep))throw new Error('Arquivo fora do repositório');
    const top=await git(cwd,['rev-parse','--show-toplevel']);if(top.code)throw new Error('Não é um repositório Git');
    const o={file,before:null,after:null};
    const b=await new Promise(ok=>require('child_process').execFile('git',['show','HEAD:'+file],{cwd,maxBuffer:5e6,encoding:'buffer'},(e,so)=>ok(e?null:so)));
    if(b){const t=text(b);if(t.text!==undefined)o.before=t.text;else Object.assign(o,{binary:t.binary,big:t.big})}
    try{const st=fs.statSync(abs);if(st.isFile()){const t=text(fs.readFileSync(abs));if(t.text!==undefined)o.after=t.text;else Object.assign(o,{binary:t.binary,big:t.big})}}catch{}
    return o}
  return{summary,diff,status}};
