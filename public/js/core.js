/* Codemux - núcleo compartilhado (interface clássica e nova): configuração, eventos, API, formatação, carregamento sob demanda. */
const Cmx=(()=>{
  const KEY='cmx-cfg',def={theme:'system',mode:'advanced',autosave:'manual',ui:'shell',fs:13,onboarded:false};
  let cfg={...def};try{Object.assign(cfg,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{}
  const subs={};
  const on=(e,f)=>{(subs[e]||(subs[e]=[])).push(f);return()=>off(e,f)};
  const off=(e,f)=>{subs[e]=(subs[e]||[]).filter(x=>x!==f)};
  const emit=(e,d)=>(subs[e]||[]).slice().forEach(f=>{try{f(d)}catch(err){console.error(err)}});
  const get=k=>cfg[k];
  function set(k,v){cfg[k]=v;try{localStorage.setItem(KEY,JSON.stringify(cfg))}catch{}if(k==='theme')applyTheme();emit('cfg',{k,v})}
  const light=matchMedia('(prefers-color-scheme: light)');
  function applyTheme(){const t=cfg.theme==='system'?(light.matches?'light':'dark'):cfg.theme;document.documentElement.dataset.theme=t;
    const m=document.querySelector('meta[name=theme-color]');if(m)m.content=t==='light'?'#ffffff':'#0d1117'}
  light.addEventListener('change',()=>{if(cfg.theme==='system')applyTheme()});
  // API do servidor (/api/cm/...)
  const cm={get:u=>api('/api/cm/'+u),post:(u,b)=>api('/api/cm/'+u,b||{})};
  // módulos carregados só quando necessários (reduz o carregamento inicial)
  const loaded={};
  const lazy=n=>loaded[n]||(loaded[n]=new Promise((ok,no)=>{const s=document.createElement('script');s.src='js/'+n+'.js';s.onload=()=>ok(Cmx.mod[n]);s.onerror=()=>{delete loaded[n];no(new Error('Falha ao carregar o módulo '+n))};document.head.append(s)}));
  // formatação
  const pad=n=>String(n).padStart(2,'0');
  const dt=t=>{if(!t)return '';const d=new Date(t);return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`};
  const hm=t=>{const d=new Date(t);return `${pad(d.getHours())}:${pad(d.getMinutes())}`};
  const dayKey=t=>{const d=new Date(t);return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()};
  function dayLabel(t){const k=dayKey(t),n=new Date(),y=new Date(Date.now()-864e5);if(k===dayKey(n))return 'Hoje';if(k===dayKey(y))return 'Ontem';const d=new Date(t);return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`}
  function ago(t){if(!t)return '';const s=Math.max(0,(Date.now()-t)/1000);if(s<45)return 'agora';if(s<3600)return Math.round(s/60)+' min';if(s<86400)return Math.round(s/3600)+' h';if(s<604800)return Math.round(s/86400)+' d';return dt(t).slice(0,10)}
  const debounce=(f,ms=200)=>{let t;const g=(...a)=>{clearTimeout(t);t=setTimeout(()=>f(...a),ms)};g.now=(...a)=>{clearTimeout(t);f(...a)};return g};
  // copiar para a área de transferência (funciona também sem HTTPS, onde navigator.clipboard não existe)
  async function copy(text){try{if(navigator.clipboard&&isSecureContext){await navigator.clipboard.writeText(text);return true}}catch{}
    const t=document.createElement('textarea');t.value=text;t.style.cssText='position:fixed;opacity:0;top:0;left:0';document.body.append(t);t.focus();t.select();let ok=false;try{ok=document.execCommand('copy')}catch{}t.remove();return ok}
  const base=p=>String(p||'').split('/').pop();
  const dir=p=>{p=String(p||'');return p.includes('/')?p.slice(0,p.lastIndexOf('/')):''};
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  applyTheme();
  return{cfg:()=>({...cfg}),get,set,on,off,emit,cm,lazy,mod:{},dt,hm,dayLabel,dayKey,ago,debounce,copy,base,dir,norm,applyTheme}})();
