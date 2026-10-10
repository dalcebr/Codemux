// Codemux (ex-Termux IDE) - sem dependências npm. Uso: node server.js
const http=require('http'),fs=require('fs'),net=require('net'),os=require('os'),path=require('path'),{spawn,execFile}=require('child_process');
const ROOT=process.env.HOME||require('os').homedir();
const PORT=+process.env.IDE_PORT||9000, HOST=process.env.IDE_HOST||'0.0.0.0';
const PASS=process.env.IDE_PASSWORD||'';
const PUB=path.join(__dirname,'public');
const MIME={'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.ico':'image/x-icon'};

const safe=(rel='')=>{const p=path.resolve(ROOT,'.'+path.sep+rel);if(p!==ROOT&&!p.startsWith(ROOT+path.sep))throw new Error('Caminho inválido');return p};
const clean=n=>{if(!n||/[\/\\]/.test(n)||n==='.'||n==='..')throw new Error('Nome inválido');return n};
const body=req=>new Promise((ok,no)=>{let s='';req.on('data',c=>s+=c);req.on('end',()=>{try{ok(s?JSON.parse(s):{})}catch(e){no(e)}});req.on('error',no)});
const CM=require('./cm')({ROOT,safe,git}); // projetos, tarefas, histórico, lixeira, busca - ver cm/
const AI=require('./ai')({ROOT,safe,CM}); // módulo de IA (DeepSeek) - ver ai.js

// ---- terminais (várias sessões) ----
const sessions=new Map();let nid=1;
const cand=new Set(),PORTRE=/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1?\]|(?:\d{1,3}\.){3}\d{1,3}):(\d{2,5})/g;
const scan=t=>{for(const m of t.matchAll(PORTRE)){const n=+m[1];if(n>=1024&&n<65536&&n!==PORT)cand.add(n)}};
const S=id=>{const s=sessions.get(+id);if(!s)throw new Error('Sessão não existe');return s};
const killGrp=(s,sig)=>{try{process.kill(-s.proc.pid,sig)}catch{}};
function start(s){
  const env={...process.env,TERM:'dumb',PS1:'\\w $ ',HOST:'0.0.0.0'};delete env.PORT; // PORT livre p/ seus projetos
  const p=spawn('bash',['-i'],{cwd:s.cwd,env,detached:true});s.proc=p;s.dead=false;
  const emit=t=>{s.hist=(s.hist+t).slice(-30000);scan(t);s.clients.forEach(r=>r.write('data: '+JSON.stringify(t)+'\n\n'))};
  s.emit=emit;p.stdin.on('error',()=>{});p.stdout.on('data',d=>emit(d.toString()));p.stderr.on('data',d=>{const x=d.toString().replace(/bash: (cannot set terminal process group[^\n]*|no job control in this shell)\n?/g,'');if(x)emit(x)});
  p.on('exit',()=>{if(s.proc===p){s.dead=true;emit('\n[encerrado - digite algo para reiniciar]\n')}});
}
function newSession(cwd){const s={id:nid++,cwd,name:path.basename(cwd)||'~',hist:'',clients:new Set(),dead:false};sessions.set(s.id,s);start(s);return s}
function procPorts(){const r=new Set();for(const f of['/proc/net/tcp','/proc/net/tcp6']){try{fs.readFileSync(f,'utf8').split('\n').slice(1).forEach(l=>{const c=l.trim().split(/\s+/);if(c[3]==='0A')r.add(parseInt(c[1].split(':')[1],16))})}catch{}}return r}
const alive=n=>new Promise(ok=>{const c=net.connect({port:n,host:'localhost'});const f=v=>{c.destroy();ok(v)};c.setTimeout(500,()=>f(false));c.on('connect',()=>f(true));c.on('error',()=>f(false))});
async function livePorts(){const all=new Set([...cand,...procPorts()]);const out=[];
  await Promise.all([...all].filter(n=>n>=1024&&n!==PORT).map(async n=>{if(await alive(n))out.push(n);else cand.delete(n)}));return out.sort((a,b)=>a-b)}

// ---- Git ----
const GURL=/^(https:\/\/[^\s]+|git@[\w.-]+:[^\s]+|ssh:\/\/[^\s]+)$/;
const scrub=s=>String(s||'').replace(/(:\/\/)[^@\/\s]+@/g,'$1***@');
function git(cwd,args,{input='',timeout=60000}={}){return new Promise(ok=>{
  const c=execFile('git',args,{cwd,env:{...process.env,GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0'},timeout,maxBuffer:1e8},(err,so,se)=>
    ok({code:err?(typeof err.code==='number'?err.code:1):0,missing:!!err&&err.code==='ENOENT',out:scrub(so),err:scrub(se||(err?(err.killed?'Tempo esgotado':err.message):''))}));
  if(c.stdin){c.stdin.on('error',()=>{});c.stdin.end(input)}})}
async function gitInfo(rel){
  const t=await git(safe(rel),['rev-parse','--show-toplevel','--show-prefix']);
  if(t.missing)return{missing:true};if(t.code)return{repo:false};
  const drop=(t.out.split('\n')[1]||'').split('/').filter(Boolean).length,seg=rel.split('/').filter(Boolean);
  const rp=seg.slice(0,seg.length-drop).join('/'),c=safe(rp);
  const [st,br,lg,rm]=await Promise.all([git(c,['status','--porcelain=v1','-b','-z']),git(c,['branch','--format=%(refname:short)']),
    git(c,['log','-n','15','--pretty=format:%h%x1f%s%x1f%an%x1f%ar']),git(c,['remote','get-url','origin'])]);
  const ent=st.out.split('\0'),h=(ent.shift()||'').slice(3);
  const m=h.match(/^(?:No commits yet on |Initial commit on )?(.+?)(?:\.\.\.(\S+))?(?: \[(.*)\])?$/)||[];
  const files=[];for(let i=0;i<ent.length;i++){const e=ent[i];if(!e)continue;files.push({xy:e.slice(0,2),path:e.slice(3)});if(/^[RC]/.test(e))i++}
  return{repo:true,path:rp,branch:m[1]||'',upstream:m[2]||'',ahead:+((m[3]||'').match(/ahead (\d+)/)||[0,0])[1],behind:+((m[3]||'').match(/behind (\d+)/)||[0,0])[1],
    files,branches:br.out.split('\n').filter(Boolean),remote:rm.code?'':rm.out.trim(),
    log:lg.code?[]:lg.out.split('\n').filter(Boolean).map(l=>{const a=l.split('\x1f');return{h:a[0],s:a[1],a:a[2],t:a[3]}})}}

function serve(p,res){
  const f=path.join(PUB,p==='/'?'index.html':p);
  if(!f.startsWith(PUB)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('404')}
  res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'});fs.createReadStream(f).pipe(res);
}

http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://x'),q=u.searchParams,k=req.method+' '+u.pathname;
  const send=(c,o)=>{res.writeHead(c,{'Content-Type':'application/json'});res.end(JSON.stringify(o))};
  if(PASS){const a=(req.headers.authorization||'').split(' ');
    const ok=a[0]==='Basic'&&Buffer.from(a[1]||'','base64').toString().split(':').slice(1).join(':')===PASS;
    if(!ok){res.writeHead(401,{'WWW-Authenticate':'Basic realm="Codemux"'});return res.end('Senha necessária')}}
  try{
    if(!u.pathname.startsWith('/api/'))return serve(u.pathname,res);
    if(k==='GET /api/term'){
      const t=S(q.get('id'));
      res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'});
      res.write('data: '+JSON.stringify(t.hist)+'\n\n');t.clients.add(res);req.on('close',()=>t.clients.delete(res));return;
    }
    if(k==='POST /api/upload'||k==='POST /api/write'){
      let target;
      if(k.endsWith('upload')){const base=safe(q.get('dir')||'');
        if(q.get('rel')){const seg=String(q.get('name')).split('/').map(clean);target=path.join(base,...seg);fs.mkdirSync(path.dirname(target),{recursive:true})}
        else target=path.join(base,clean(q.get('name')))}
      else target=safe(q.get('path'));
      const ws=fs.createWriteStream(target);req.pipe(ws);
      ws.on('finish',()=>{send(200,{ok:1});const r=path.relative(ROOT,target).split(path.sep).join('/');k.endsWith('upload')?CM.onUpload(r):CM.onWrite(r)});ws.on('error',e=>send(400,{error:e.message}));return;
    }
    const b=await body(req);
    if(u.pathname.startsWith('/api/ai/'))return AI.handle(k,b,res,send);
    if(u.pathname.startsWith('/api/cm/'))return await CM.handle(k,b,q,send); // await: erros viram resposta 400 em vez de derrubar o processo
    switch(k){
      case 'GET /api/list':{
        const dir=safe(q.get('path')||'');
        const items=fs.readdirSync(dir,{withFileTypes:true}).map(d=>{
          let st;try{st=fs.statSync(path.join(dir,d.name))}catch{st=null}
          return{name:d.name,dir:st?st.isDirectory():d.isDirectory(),size:st?st.size:0,mtime:st?st.mtimeMs:0}});
        items.sort((a,b)=>b.dir-a.dir||a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
        return send(200,{items});}
      case 'GET /api/read':{
        const f=safe(q.get('path'));if(fs.statSync(f).size>2e6)throw new Error('Arquivo muito grande (>2MB)');
        const buf=fs.readFileSync(f);if(buf.includes(0))throw new Error('Arquivo binário, não dá para editar');
        return send(200,{text:buf.toString('utf8')});}
      case 'POST /api/mkdir':{const d=path.join(safe(b.dir),clean(b.name));fs.mkdirSync(d);CM.onFs('mkdir',path.relative(ROOT,d).split(path.sep).join('/'));return send(200,{ok:1});}
      case 'POST /api/newfile':{const d=path.join(safe(b.dir),clean(b.name));fs.writeFileSync(d,'',{flag:'wx'});CM.onFs('newfile',path.relative(ROOT,d).split(path.sep).join('/'));return send(200,{ok:1});}
      case 'POST /api/rename':{
        const f=safe(b.path),t=path.join(path.dirname(f),clean(b.name));
        if(fs.existsSync(t))throw new Error('Já existe um item com esse nome');
        fs.renameSync(f,t);CM.onFs('rename',path.relative(ROOT,t).split(path.sep).join('/'),path.basename(t));return send(200,{ok:1});}
      case 'POST /api/delete':{
        const f=safe(b.path);if(f===ROOT)throw new Error('Não permitido');
        fs.rmSync(f,{recursive:true,force:true});return send(200,{ok:1});}
      case 'POST /api/extract':{
        const f=safe(b.path),n=path.basename(f);
        const m=n.match(/^(.*?)(\.zip|\.tar\.gz|\.tgz|\.tar\.bz2|\.tar\.xz|\.tar)$/i);
        if(!m)throw new Error('Formato não suportado');
        let dest=path.join(path.dirname(f),m[1]||'extraido'),i=1,base=dest;
        while(fs.existsSync(dest))dest=base+'_'+(i++);
        fs.mkdirSync(dest);
        const [cmd,args]=/\.zip$/i.test(n)?['unzip',['-o',f,'-d',dest]]:['tar',['-xf',f,'-C',dest]];
        return execFile(cmd,args,{maxBuffer:1e8},err=>{
          if(err){fs.rmSync(dest,{recursive:true,force:true});return send(400,{error:err.code==='ENOENT'?`Instale: pkg install ${cmd}`:'Falha ao extrair'})}
          send(200,{ok:1})});}
      case 'GET /api/sessions':if(!sessions.size)newSession(ROOT);return send(200,{list:[...sessions.values()].map(x=>({id:x.id,name:x.name,cwd:path.relative(ROOT,x.cwd).split(path.sep).join('/')}))});
      case 'GET /api/ports':return send(200,{ports:await livePorts()});
      case 'POST /api/term/new':return send(200,{id:newSession(safe(b.path||'')).id});
      case 'POST /api/term/input':{const t=S(b.id);if(t.dead)start(t);t.proc.stdin.write(b.data);return send(200,{ok:1});}
      case 'POST /api/term/int':killGrp(S(b.id),'SIGINT');return send(200,{ok:1});
      case 'POST /api/term/restart':{const t=S(b.id);killGrp(t,'SIGKILL');t.hist='';start(t);t.emit('[reiniciado]\n');return send(200,{ok:1});}
      case 'POST /api/term/close':{const t=S(b.id);killGrp(t,'SIGKILL');t.clients.forEach(r=>r.end());sessions.delete(t.id);return send(200,{ok:1});}
      case 'GET /api/git/info':return send(200,await gitInfo(q.get('path')||''));
      case 'GET /api/git/config':{const g=async k=>(await git(ROOT,['config','--global',k])).out.trim();let user='',tok=false;
        try{const m=fs.readFileSync(path.join(ROOT,'.git-credentials'),'utf8').match(/https:\/\/([^:\n]+):[^@\n]+@github\.com/);if(m){user=decodeURIComponent(m[1]);tok=true}}catch{}
        return send(200,{name:await g('user.name'),email:await g('user.email'),user,token:tok});}
      case 'POST /api/git/config':{
        for(const v of [b.name,b.email,b.user,b.token])if(/[\r\n]/.test(String(v||'')))throw new Error('Valor inválido');
        if(b.name)await git(ROOT,['config','--global','user.name',String(b.name)]);
        if(b.email)await git(ROOT,['config','--global','user.email',String(b.email)]);
        await git(ROOT,['config','--global','credential.helper','store']);
        if(b.user&&b.token){await git(ROOT,['credential','reject'],{input:'protocol=https\nhost=github.com\n\n'});
          const r=await git(ROOT,['credential','approve'],{input:`protocol=https\nhost=github.com\nusername=${b.user}\npassword=${b.token}\n\n`});
          if(r.code)throw new Error(r.err||'Falha ao salvar o token')}
        return send(200,{ok:1});}
      case 'POST /api/git/clone':{const u=String(b.url||'').trim();if(!GURL.test(u))throw new Error('URL inválida. Use https://github.com/usuario/repo.git');
        const nm=clean(u.replace(/\/+$/,'').split(/[\/:]/).pop().replace(/\.git$/,'')),dest=path.join(safe(b.dir||''),nm);
        if(fs.existsSync(dest))throw new Error('Já existe uma pasta chamada '+nm);
        const r=await git(path.dirname(dest),['clone','--',u,dest],{timeout:900000});
        if(r.missing)throw new Error('Git não instalado. Rode: pkg install git');
        if(r.code){fs.rmSync(dest,{recursive:true,force:true});throw new Error((r.err||'Falha ao clonar').trim())}
        return send(200,{path:path.relative(ROOT,dest).split(path.sep).join('/')});}
      case 'POST /api/git/run':{const cwd=safe(b.path||''),A=(a,o)=>git(cwd,a,o);let r;
        switch(b.op){
          case 'init':r=await A(['init','-b','main']);if(r.code&&!r.missing)r=await A(['init']);break;
          case 'remote':{const u=String(b.url||'').trim();if(!GURL.test(u))throw new Error('URL inválida. Use https://github.com/usuario/repo.git');
            const has=await A(['remote','get-url','origin']);r=await A(['remote',has.code?'add':'set-url','origin',u]);break;}
          case 'commit':{const msg=String(b.message||'').trim();if(!msg)throw new Error('Escreva uma mensagem de commit');
            if(!(await A(['config','user.email'])).out.trim())throw new Error('Configure seu nome e e-mail em "Conta" antes do commit');
            await A(['add','-A']);r=await A(['commit','-m',msg]);break;}
          case 'push':r=await A(['push','-u','origin','HEAD'],{timeout:300000});break;
          case 'pull':r=await A(['pull','--no-rebase','--no-edit'],{timeout:300000});break;
          case 'checkout':{const n=String(b.branch||'');if(!/^\w[\w.\/-]*$/.test(n))throw new Error('Nome de branch inválido');r=await A(['checkout',...(b.create?['-b']:[]),n]);break;}
          case 'discard':{const f=String(b.file||''),xy=String(b.xy||'');if(!f||f.startsWith('-'))throw new Error('Arquivo inválido');
            if(xy[0]==='?')r=await A(['clean','-fd','--',f]);
            else if(xy[0]==='A'){await A(['reset','-q','--',f]);r=await A(['clean','-fd','--',f])}
            else r=await A(['restore','--source=HEAD','--staged','--worktree','--',f]);break;}
          default:throw new Error('Operação desconhecida');}
        CM.onGit(b.path||'',b.op,!r.code,b.op==='commit'?b.message:b.op==='checkout'?b.branch:'');
        return send(200,{ok:!r.code,missing:r.missing,out:(r.out+r.err).trim()});}
      default:return send(404,{error:'Rota não encontrada'});
    }
  }catch(e){send(400,{error:e.code==='ENOENT'?'Não encontrado':e.message})}
}).listen(PORT,HOST,()=>{
  console.log(`\n  Codemux rodando${PASS?' (protegido por senha)':''}\n  Neste aparelho: http://localhost:${PORT}`);
  try{for(const l of Object.values(os.networkInterfaces()))for(const i of l||[])if(i.family==='IPv4'&&!i.internal)console.log(`  Outros aparelhos: http://${i.address}:${PORT}`)}catch{}
  console.log('');
});
