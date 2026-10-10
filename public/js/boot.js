/* Boot da interface nova (por projeto). A clássica (janelas) inicia em boot-classic.js. */
(()=>{
if(document.documentElement.dataset.ui==='classic')return;
Cmx.lazy('shell').catch(e=>{console.error(e);document.body.insertAdjacentHTML('afterbegin','<p style="padding:20px">Falha ao iniciar a interface: '+e.message+'. <a href="?ui=classic">Abrir interface clássica</a></p>')});
})();
