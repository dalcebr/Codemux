// Operações de arquivo (info, copiar, mover) e busca global dentro de um projeto.
const fs=require('fs'),path=require('path');
module.exports=({ROOT,safe,store})=>{
  const rel=a=>path.relative(ROOT,a).split(path.sep).join('/');
  const TYPES={js:'JavaScript',mjs:'JavaScript',cjs:'JavaScript',jsx:'React (JSX)',ts:'TypeScript',tsx:'React (TSX)',json:'JSON',html:'HTML',htm:'HTML',css:'CSS',scss:'SCSS',md:'Markdown',txt:'Texto',py:'Python',sh:'Shell',yml:'YAML',yaml:'YAML',xml:'XML',svg:'Imagem SVG',png:'Imagem PNG',jpg:'Imagem JPEG',jpeg:'Imagem JPEG',gif:'Imagem GIF',webp:'Imagem WebP',zip:'Arquivo ZIP',gz:'Arquivo compactado',tar:'Arquivo TAR',pdf:'PDF',go:'Go',rs:'Rust',java:'Java',php:'PHP',rb:'Ruby',c:'C',cpp:'C++',h:'Cabeçalho C',vue:'Vue',sql:'SQL',env:'Variáveis de ambiente',lock:'Lockfile'};
  const protectedPath=a=>a===ROOT||a===store.BASE||a.startsWith(store.BASE+path.sep);

  function info(r){
    const abs=safe(r),st=fs.lstatSync(abs),dir=st.isDirectory(),ext=path.extname(abs).slice(1).toLowerCase();
    const o={name:path.basename(abs)||'Início',path:rel(abs),dir,link:st.isSymbolicLink(),size:st.size,type:dir?'Pasta':(TYPES[ext]||(ext?ext.toUpperCase()+' (arquivo)':'Arquivo')),
      modifiedAt:st.mtimeMs,createdAt:st.birthtimeMs>0?st.birthtimeMs:null,mode:(st.mode&0o777).toString(8)};
    if(dir){let n=0,t=0,c=0;try{for(const e of fs.readdirSync(abs,{withFileTypes:true}))n++}catch{}
      (function w(d){let es;try{es=fs.readdirSync(d,{withFileTypes:true})}catch{return}for(const e of es){if(++c>20000)return;const f=path.join(d,e.name);try{if(e.isDirectory())w(f);else t+=fs.lstatSync(f).size}catch{}}})(abs);
      o.items=n;o.totalSize=t;o.truncated=c>20000}
    return o}

  // nome livre: "a.txt" -> "a (cópia).txt" -> "a (cópia 2).txt"
  function freeName(dir,name,tag){const ext=path.extname(name),b=path.basename(name,ext);let c=path.join(dir,name),i=1;
    while(fs.existsSync(c)){c=path.join(dir,b+' ('+tag+(i>1?' '+i:'')+')'+ext);i++}return c}
  function targets(items,dest){
    const d=safe(dest||'');if(!fs.existsSync(d)||!fs.statSync(d).isDirectory())throw new Error('Pasta de destino não existe');
    if(!Array.isArray(items)||!items.length)throw new Error('Nada selecionado');if(items.length>2000)throw new Error('Itens demais');
    return{d,srcs:items.map(i=>{const a=safe(i);if(protectedPath(a))throw new Error('Item protegido');if(!fs.existsSync(a)&&!fs.lstatSync(a,{throwIfNoEntry:false}))throw new Error('Não existe: '+i);
      if(d===a||d.startsWith(a+path.sep))throw new Error('Não dá para colocar uma pasta dentro dela mesma');return a})}}
  function copy(items,dest){const {d,srcs}=targets(items,dest),out=[];
    for(const s of srcs){const t=freeName(d,path.basename(s),'cópia');fs.cpSync(s,t,{recursive:true,errorOnExist:true,verbatimSymlinks:true});out.push(rel(t))}return out}
  function move(items,dest){const {d,srcs}=targets(items,dest),out=[];
    for(const s of srcs){if(path.dirname(s)===d){out.push({from:rel(s),to:rel(s)});continue}
      const t=freeName(d,path.basename(s),'2');store.move(s,t);out.push({from:rel(s),to:rel(t)})}return out}

  // ---------------- busca ----------------
  const SKIP=new Set(['node_modules','.git','.cache','__pycache__','.venv','venv','.codemux','.next','dist','build','coverage','.gradle','.idea','.vscode']);
  const BIN=/\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|tgz|tar|bz2|xz|7z|rar|mp3|mp4|mov|avi|woff2?|ttf|otf|eot|so|bin|exe|class|jar|apk|db|sqlite|lock)$/i;
  const cache=new Map(); // lista de arquivos por raiz (TTL curto) para digitação rápida
  function walk(rootAbs,{maxFiles=40000,ms=3000}={}){
    const c=cache.get(rootAbs);if(c&&Date.now()-c.t<8000)return c;
    const files=[],dirs=[],t0=Date.now();let trunc=false;const q=[rootAbs];
    while(q.length){const d=q.shift();let es;try{es=fs.readdirSync(d,{withFileTypes:true})}catch{continue}
      for(const e of es){if(files.length>=maxFiles||Date.now()-t0>ms){trunc=true;q.length=0;break}
        const f=path.join(d,e.name);if(e.isDirectory()){if(SKIP.has(e.name))continue;dirs.push(f);q.push(f)}else if(e.isFile()||e.isSymbolicLink())files.push(f)}}
    const r={files,dirs,trunc,t:Date.now()};cache.set(rootAbs,r);if(cache.size>6)cache.delete(cache.keys().next().value);return r}
  const score=(base,full,q)=>{const b=base.toLowerCase();if(b===q)return 100;if(b.startsWith(q))return 80;if(b.includes(q))return 60;if(full.toLowerCase().includes(q))return 40;
    let i=0;for(const ch of b){if(ch===q[i])i++;if(i===q.length)return 20}return 0};
  const SYM=[
    [/\.(m?[jt]sx?|cjs)$/i,[[/^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\*?\s+([A-Za-z_$][\w$]*)/,'função'],[/^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/,'classe'],
      [/^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/,'função'],[/^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?function/,'função'],
      [/^\s*(?:export\s+)?(?:interface|type|enum)\s+([A-Za-z_$][\w$]*)/,'tipo']]],
    [/\.py$/i,[[/^\s*(?:async\s+)?def\s+(\w+)/,'função'],[/^\s*class\s+(\w+)/,'classe']]],
    [/\.go$/i,[[/^func\s+(?:\([^)]*\)\s*)?(\w+)/,'função'],[/^type\s+(\w+)/,'tipo']]],
    [/\.(sh|bash)$/i,[[/^\s*(?:function\s+)?(\w+)\s*\(\)\s*\{/,'função']]],
    [/\.(java|kt|cs|php|rb|rs)$/i,[[/^\s*(?:public|private|protected|static|final|abstract|pub|fn|def)\b[^=(]*?\b(?:class|interface|struct|enum|fn|def|function)\s+(\w+)/,'símbolo'],[/^\s*(?:class|module|struct|enum|trait|impl)\s+(\w+)/,'símbolo']]]];
  const symRules=f=>{for(const [re,r] of SYM)if(re.test(f))return r;return null};

  function search(root,q,{mode='all',limit=60}={}){
    q=String(q||'').trim().toLowerCase();if(!q)return{files:[],content:[],symbols:[],truncated:false};
    limit=Math.max(1,Math.min(300,+limit||60));const rootAbs=safe(root||''),w=walk(rootAbs),res={files:[],content:[],symbols:[],truncated:w.trunc};
    const wantF=mode==='all'||mode==='files',wantC=mode==='all'||mode==='content',wantS=mode==='all'||mode==='symbols';
    if(wantF){const hit=[];
      for(const f of w.files){const r=path.relative(rootAbs,f).split(path.sep).join('/'),s=score(path.basename(f),r,q);if(s)hit.push({path:r,name:path.basename(f),dir:false,s})}
      for(const d of w.dirs){const r=path.relative(rootAbs,d).split(path.sep).join('/'),s=score(path.basename(d),r,q);if(s)hit.push({path:r,name:path.basename(d),dir:true,s:s-5})}
      hit.sort((a,b)=>b.s-a.s||a.path.length-b.path.length);res.files=hit.slice(0,limit).map(({s,...x})=>x)}
    if(wantC||wantS){const t0=Date.now();let cc=0,sc=0;
      for(const f of w.files){if(Date.now()-t0>2500){res.truncated=true;break}if((!wantC||cc>=limit)&&(!wantS||sc>=limit))break;
        if(BIN.test(f))continue;let st;try{st=fs.statSync(f)}catch{continue}if(!st.isFile()||st.size>600000)continue;
        let txt;try{const b=fs.readFileSync(f);if(b.includes(0))continue;txt=b.toString('utf8')}catch{continue}
        const rp=path.relative(rootAbs,f).split(path.sep).join('/');
        if(wantC&&cc<limit&&txt.toLowerCase().includes(q)){const lines=txt.split('\n');let n=0;
          for(let i=0;i<lines.length&&n<3;i++){const L=lines[i];if(L.length<2000&&L.toLowerCase().includes(q)){res.content.push({path:rp,line:i+1,text:L.trim().slice(0,160)});n++;cc++}}}
        if(wantS&&sc<limit){const rules=symRules(f);if(rules&&txt.toLowerCase().includes(q)){const lines=txt.split('\n');
          for(let i=0;i<lines.length&&sc<limit;i++){const L=lines[i];if(L.length>400)continue;for(const [re,kind] of rules){const m=re.exec(L);if(m&&m[1].toLowerCase().includes(q)){res.symbols.push({name:m[1],kind,path:rp,line:i+1});sc++;break}}}}}}}
    return res}
  return{info,copy,move,search,walk}};
