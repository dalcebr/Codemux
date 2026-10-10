/* Codemux - diferenças (diff) linha a linha: algoritmo de Myers + visualização unificada com contexto recolhível. */
Cmx.mod.diff=(()=>{
const {h,ic,sheet}=Cmx.ui;
// Myers O(ND). Retorna lista de {t:'=',a,b,l}|{t:'-',a,l}|{t:'+',b,l} (índices 1-based de linha)
function diff(A,B){let s=0;const n=A.length,m=B.length;while(s<n&&s<m&&A[s]===B[s])s++;let e=0;while(e<n-s&&e<m-s&&A[n-1-e]===B[m-1-e])e++;
  const a=A.slice(s,n-e),b=B.slice(s,m-e),N=a.length,M=b.length,out=[];
  for(let i=0;i<s;i++)out.push({t:'=',a:i+1,b:i+1,l:A[i]});
  if(N+M>0){
    let ops=null;const MAX=N+M;
    if(N===0)ops=b.map((l,i)=>['+',i]);else if(M===0)ops=a.map((l,i)=>['-',i]);
    else if(N*M>4e6&&MAX>6000){ops=[...a.map((l,i)=>['-',i]),...b.map((l,i)=>['+',i])]} // enorme: troca bloco inteiro
    else{const off=MAX+1,V=new Int32Array(2*MAX+3),trace=[];let found=false;
      for(let d=0;d<=MAX&&!found;d++){trace.push(V.slice());
        for(let k=-d;k<=d;k+=2){let x=(k===-d||(k!==d&&V[off+k-1]<V[off+k+1]))?V[off+k+1]:V[off+k-1]+1,y=x-k;while(x<N&&y<M&&a[x]===b[y]){x++;y++}V[off+k]=x;if(x>=N&&y>=M){found=true;break}}}
      ops=[];let x=N,y=M;for(let d=trace.length-1;d>=0;d--){const Vd=trace[d],k=x-y;let pk=(k===-d||(k!==d&&Vd[off+k-1]<Vd[off+k+1]))?k+1:k-1;const px=Vd[off+pk],py=px-pk;
        while(x>px&&y>py){ops.push(['=',x-1,y-1]);x--;y--}if(d>0){if(x===px)ops.push(['+',y-1]);else ops.push(['-',x-1]);}x=px;y=py}
      ops.reverse()}
    for(const o of ops){if(o[0]==='=')out.push({t:'=',a:s+o[1]+1,b:s+o[2]+1,l:a[o[1]]});else if(o[0]==='-')out.push({t:'-',a:s+o[1]+1,l:a[o[1]]});else out.push({t:'+',b:s+o[1]+1,l:b[o[1]]})}}
  for(let i=0;i<e;i++)out.push({t:'=',a:n-e+i+1,b:m-e+i+1,l:A[n-e+i]});return out}
const lines=t=>t===''||t==null?[]:t.replace(/\n$/,'').split('\n');
// monta o DOM: hunks com 3 linhas de contexto; trechos iguais longos ficam recolhidos
function view(before,after,{ctx=3}={}){const ops=diff(lines(before),lines(after)),add=ops.filter(o=>o.t==='+').length,del=ops.filter(o=>o.t==='-').length;
  const box=h('div.df'),head=h('div.dfh',h('span.da','+'+add),h('span.dd','−'+del));box.append(head);
  if(!add&&!del){box.append(h('div.dfe','Sem diferenças.'));return box}
  const keep=new Array(ops.length).fill(false);ops.forEach((o,i)=>{if(o.t!=='='){for(let k=Math.max(0,i-ctx);k<=Math.min(ops.length-1,i+ctx);k++)keep[k]=true}});
  const body=h('div.dfb',{role:'table','aria-label':'Diferenças'});let i=0;
  const line=o=>h('div.dl.'+({'=':'eq','+':'ad','-':'dl'})[o.t],{role:'row'},h('span.ln',o.t==='+'?'':o.a),h('span.ln',o.t==='-'?'':o.b),h('span.sg',o.t==='='?'':o.t==='+'?'+':'−'),h('code',o.l||' '));
  while(i<ops.length){if(keep[i]){body.append(line(ops[i]));i++;continue}let j=i;while(j<ops.length&&!keep[j])j++;const hidden=ops.slice(i,j);
    const btn=h('button.dgap',{type:'button',onclick:()=>{const fr=document.createDocumentFragment();hidden.forEach(o=>fr.append(line(o)));btn.replaceWith(fr)}},ic('chev-d'),hidden.length+' linhas inalteradas');body.append(btn);i=j}
  box.append(body);return box}
function binaryNote(){return h('div.dfe','Arquivo binário ou grande demais para mostrar diferenças.')}
// diff de um arquivo alterado no Git (antes = HEAD, depois = disco)
async function showGit(repo,file){const d=await Cmx.cm.get('git/diff?path='+encodeURIComponent(repo)+'&file='+encodeURIComponent(file));
  const kind=d.before===null?'Novo arquivo':d.after===null?'Arquivo apagado':'Modificado';
  sheet({title:file.split('/').pop(),wide:true,label:'Diferenças de '+file,body:[h('div.chips',h('span.chip',file),h('span.chip.ac',kind)),(d.binary||d.big)?binaryNote():view(d.before,d.after)],actions:[{l:'Fechar',pri:true}]})}
return{diff,view,showGit,lines,binaryNote}})();
