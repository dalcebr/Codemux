// Registro de projetos: cada projeto = pasta dentro do Início + metadados em ~/.codemux/projects.json
const fs=require('fs'),path=require('path');
module.exports=({ROOT,safe,store,history})=>{
  const FILE=store.p('projects.json');
  const load=()=>store.readJSON(FILE,{projects:[]}).projects||[],save=a=>store.writeJSON(FILE,{projects:a});
  const rel=a=>path.relative(ROOT,a).split(path.sep).join('/');
  const IGN=new Set(['node_modules','.git','.cache','__pycache__','.venv','venv','.codemux','.next','dist','build','coverage','.gradle']);
  const MARK=['.git','package.json','index.html','requirements.txt','pyproject.toml','go.mod','Cargo.toml','pom.xml','composer.json','Gemfile'];

  // ---- stack: rótulo curto lido dos arquivos reais ("React + Node", "Python + Flask"...) ----
  function stackOf(abs){
    const has=f=>fs.existsSync(path.join(abs,f)),tags=[];let pkg=null;
    try{pkg=JSON.parse(fs.readFileSync(path.join(abs,'package.json'),'utf8'))}catch{}
    if(pkg){const d={...pkg.dependencies,...pkg.devDependencies},add=t=>{if(!tags.includes(t))tags.push(t)};
      if(d.next)add('Next.js');else if(d.react)add('React');else if(d.vue)add('Vue');else if(d.svelte)add('Svelte');else if(d['@angular/core'])add('Angular');
      if(d.express||d.fastify||d.koa||d.nestjs||d['@nestjs/core']||!tags.length)add('Node');
      if(d.mongoose||d.mongodb)add('MongoDB');else if(d.pg||d.prisma||d.sequelize||d.mysql2)add('SQL');
      if(d.typescript)add('TypeScript')}
    const py=['requirements.txt','pyproject.toml','Pipfile'].find(has);
    if(py){let t='';try{t=fs.readFileSync(path.join(abs,py),'utf8').toLowerCase()}catch{}tags.push('Python');for(const f of['django','flask','fastapi'])if(t.includes(f)){tags.push(f[0].toUpperCase()+f.slice(1).replace('api','API'));break}}
    if(has('go.mod'))tags.push('Go');if(has('Cargo.toml'))tags.push('Rust');if(has('pom.xml')||has('build.gradle'))tags.push('Java');if(has('composer.json'))tags.push('PHP');if(has('Gemfile'))tags.push('Ruby');
    if(!tags.length&&has('index.html')){tags.push('HTML');let css=false;try{css=fs.readdirSync(abs).some(f=>f.endsWith('.css'))}catch{}if(css)tags.push('CSS');try{if(fs.readdirSync(abs).some(f=>f.endsWith('.js')))tags.push('JS')}catch{}}
    if(!tags.length){ // sem arquivos de projeto: deduz pela extensão dos arquivos da raiz
      let ex=new Set();try{ex=new Set(fs.readdirSync(abs).map(f=>path.extname(f).slice(1).toLowerCase()))}catch{}
      for(const [e,t] of [['py','Python'],['go','Go'],['rs','Rust'],['java','Java'],['php','PHP'],['rb','Ruby'],['cpp','C++'],['c','C'],['sh','Shell'],['ts','TypeScript'],['js','JS']])if(ex.has(e)){tags.push(t);break}}
    return tags.slice(0,3).join(' + ')}

  // ---- templates (arquivos reais) ----
  const TPL={
    vazio:n=>({'README.md':`# ${n}\n`}),
    web:n=>({'index.html':`<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width,initial-scale=1">\n  <title>${n.replace(/</g,'&lt;')}</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>${n.replace(/</g,'&lt;')}</h1>\n  <script src="script.js"></script>\n</body>\n</html>\n`,
      'style.css':`body{font-family:system-ui,sans-serif;margin:2rem;line-height:1.5}\n`,'script.js':`console.log('Olá!');\n`,'README.md':`# ${n}\n\nSite estático. Abra o index.html ou rode \`npx serve\`.\n`}),
    node:n=>({'package.json':JSON.stringify({name:n.toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||'app',version:'1.0.0',private:true,scripts:{start:'node index.js'}},null,2)+'\n',
      'index.js':`const http=require('http');\nconst PORT=process.env.PORT||3000;\n\nhttp.createServer((req,res)=>{\n  res.setHeader('Content-Type','text/plain; charset=utf-8');\n  res.end('Olá do ${n.replace(/['\\`$]/g,'')}!');\n}).listen(PORT,()=>console.log('http://localhost:'+PORT));\n`,
      '.gitignore':'node_modules\n.env\n','README.md':`# ${n}\n\n\`npm start\` para rodar.\n`}),
    python:n=>({'main.py':`def main():\n    print("Olá!")\n\n\nif __name__ == "__main__":\n    main()\n`,'.gitignore':'__pycache__/\n.venv/\n.env\n','README.md':`# ${n}\n\n\`python main.py\` para rodar.\n`})};

  const slug=n=>String(n).normalize('NFC').replace(/[\\/:*?"<>|\x00-\x1f]/g,'').trim().replace(/\s+/g,'-').replace(/^\.+/,'').slice(0,60);
  const cleanName=n=>{n=String(n||'').replace(/[\x00-\x1f]/g,'').trim().slice(0,80);if(!n)throw new Error('Informe um nome para o projeto');return n};
  const pub=p=>p; // registro já é seguro de expor (caminhos relativos ao Início)
  const get=id=>{const p=load().find(x=>x.id===store.checkId(id));if(!p)throw new Error('Projeto não encontrado');return p};
  const list=()=>load();
  const byPath=r=>load().find(p=>p.path===r&&!p.trashed);
  // projeto dono de um caminho (prefixo mais longo)
  function projectOf(r){r=String(r||'').replace(/^\/+|\/+$/g,'');let best=null;for(const p of load()){if(p.trashed)continue;if(r===p.path||r.startsWith(p.path+'/')){if(!best||p.path.length>best.path.length)best=p}}return best}
  function register(abs,name){
    const r=rel(abs);const ex=load().find(p=>p.path===r);
    if(ex){if(ex.trashed||ex.archived){ex.trashed=false;ex.archived=false;ex.updatedAt=Date.now();save(load().map(p=>p.id===ex.id?ex:p))}return ex}
    const now=Date.now(),p={id:store.uid(),name:name||path.basename(abs),path:r,desc:'',favorite:false,archived:false,trashed:false,stack:stackOf(abs),createdAt:now,updatedAt:now,openedAt:now,settings:{}};
    const a=load();a.push(p);save(a);history.add(p.id,{type:'project',actor:'system',text:'Projeto adicionado ao Codemux'});return p}
  function create({name,template='vazio',dir=''}){
    name=cleanName(name);const parent=safe(dir||'');if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory())throw new Error('Pasta de destino não existe');
    const base=slug(name);if(!base)throw new Error('Nome inválido');let folder=base,i=2;while(fs.existsSync(path.join(parent,folder)))folder=base+'-'+(i++);
    const abs=path.join(parent,folder);if(!TPL[template])throw new Error('Template desconhecido');
    fs.mkdirSync(abs);try{for(const [f,c] of Object.entries(TPL[template](name)))fs.writeFileSync(path.join(abs,f),c)}catch(e){fs.rmSync(abs,{recursive:true,force:true});throw e}
    const p=register(abs,name);history.add(p.id,{type:'project',actor:'user',text:'Projeto criado'+(template!=='vazio'?' (modelo '+template+')':'')});return p}
  function importPath(r){
    const abs=safe(r||'');if(abs===ROOT)throw new Error('Escolha uma pasta dentro do Início, não o Início inteiro');
    if(abs===store.BASE||abs.startsWith(store.BASE+path.sep))throw new Error('Pasta reservada do Codemux');
    if(!fs.existsSync(abs)||!fs.statSync(abs).isDirectory())throw new Error('Pasta não encontrada');return register(abs)}
  const PATCH={name:v=>cleanName(v),desc:v=>String(v||'').slice(0,500),favorite:v=>!!v,archived:v=>!!v,trashed:v=>!!v,
    settings:v=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Configuração inválida');const o={};
      if(['inherit','auto','manual'].includes(v.autosave))o.autosave=v.autosave;if(typeof v.aiInstructions==='string')o.aiInstructions=v.aiInstructions.slice(0,4000);
      if(typeof v.startCmd==='string')o.startCmd=v.startCmd.replace(/[\r\n]/g,' ').slice(0,300);return o},
    openedAt:()=>Date.now()};
  function update(id,patch){
    const a=load(),p=a.find(x=>x.id===store.checkId(id));if(!p)throw new Error('Projeto não encontrado');
    for(const k of Object.keys(patch||{})){if(!PATCH[k])continue;const v=PATCH[k](patch[k]);if(k==='settings')p.settings={...p.settings,...v};else p[k]=v}
    p.updatedAt=Date.now();if('archived' in patch&&patch.archived)p.trashed=false;if('trashed' in patch&&patch.trashed)p.archived=false;save(a);
    if('name' in patch)history.add(p.id,{type:'project',actor:'user',text:'Projeto renomeado para '+p.name});
    if('archived' in patch)history.add(p.id,{type:'project',actor:'user',text:patch.archived?'Projeto arquivado':'Projeto restaurado'});
    if('trashed' in patch)history.add(p.id,{type:'project',actor:'user',text:patch.trashed?'Projeto movido para a lixeira':'Projeto restaurado da lixeira'});
    return p}
  function refreshStack(id){const a=load(),p=a.find(x=>x.id===id);if(!p)return null;const s=stackOf(safe(p.path));if(s!==p.stack){p.stack=s;save(a)}return p}
  function remove(id){const a=load(),i=a.findIndex(x=>x.id===store.checkId(id));if(i<0)throw new Error('Projeto não encontrado');const [p]=a.splice(i,1);save(a);
    fs.rmSync(store.p('projects',p.id),{recursive:true,force:true});return p}
  // contagem de arquivos (com limites para pastas gigantes)
  function stats(id){const p=get(id),root=safe(p.path);let files=0,dirs=0,bytes=0,seen=0,trunc=false;const t0=Date.now();
    (function w(d){let es;try{es=fs.readdirSync(d,{withFileTypes:true})}catch{return}
      for(const e of es){if(trunc)return;if(++seen>40000||Date.now()-t0>2500){trunc=true;return}
        if(e.isDirectory()){if(IGN.has(e.name))continue;dirs++;w(path.join(d,e.name))}else if(e.isFile()){files++;try{bytes+=fs.statSync(path.join(d,e.name)).size}catch{}}}})(root);
    return{files,dirs,bytes,truncated:trunc}}
  // pastas do Início que parecem projetos e ainda não foram adicionadas
  function discover(){const known=new Set(load().filter(p=>!p.trashed).map(p=>p.path)),out=[];
    let es=[];try{es=fs.readdirSync(ROOT,{withFileTypes:true})}catch{}
    for(const e of es){if(out.length>=40)break;if(!e.isDirectory()||e.name.startsWith('.')||['storage','node_modules'].includes(e.name)||known.has(e.name))continue;
      const abs=path.join(ROOT,e.name);if(MARK.some(m=>fs.existsSync(path.join(abs,m))))out.push({name:e.name,path:e.name,stack:stackOf(abs),git:fs.existsSync(path.join(abs,'.git'))})}
    return out}
  return{list,get,create,importPath,update,remove,stats,discover,projectOf,byPath,refreshStack,stackOf,register}};
