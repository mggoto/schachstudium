'use strict';
/* Personal chess-study workspace: PGN import is entirely client-side. */
(() => {
  const el=id=>document.getElementById(id);
  const own={chess:null,board:null,moves:[],fens:[],ply:0,comments:[],summary:null,raw:'',busy:false};
  const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const setStatus=(id,message,isError=false)=>{el(id).textContent=message;el(id).classList.toggle('failed',isError)};
  function draw(){
    if(!own.board||!own.moves.length)return;
    own.board.position(own.fens[own.ply],false);
    document.querySelectorAll('#ownBoard .kidsgambit-lastmove').forEach(x=>x.classList.remove('kidsgambit-lastmove'));
    const move=own.moves[own.ply-1];
    if(move)for(const s of [move.from,move.to])document.querySelector('#ownBoard .square-'+s)?.classList.add('kidsgambit-lastmove');
    el('ownCommentTitle').textContent=move?Math.ceil(own.ply/2)+(own.ply%2?'. ':'... ')+move.san:'Startstellung';
    el('ownCommentText').textContent=move?(own.comments[own.ply-1]||'Für diesen Halbzug ist noch kein KI-Kommentar vorhanden.'):'Wähle einen Zug oder starte die KI-Auswertung.';
    el('ownProgress').textContent=own.ply+' / '+own.moves.length;
    for(const id of ['ownFirst','ownPrev'])el(id).disabled=own.ply===0;
    for(const id of ['ownLast','ownNext'])el(id).disabled=own.ply===own.moves.length;
    document.querySelectorAll('#ownMoves [data-own-ply]').forEach(x=>x.classList.toggle('active',Number(x.dataset.ownPly)===own.ply));
    const active=document.querySelector('#ownMoves [data-own-ply].active');
    active?.scrollIntoView?.({block:'nearest',inline:'nearest'});
  }
  function jump(p){if(!own.board)return;own.ply=Math.max(0,Math.min(own.moves.length,p));draw();}
  const readHeader=(text,key)=>{
    const match=text.match(new RegExp('^\\['+key+'\\s+"((?:[^"\\\\]|\\\\.)*)"\\]','im'));
    return match?match[1].replace(/\\"/g,'"'):null;
  };
  function importPgn(text){
    if(typeof Chess==='undefined'||typeof Chessboard==='undefined')throw Error('Schachbibliothek konnte nicht geladen werden. Bitte die Seite neu laden.');
    if(!text||text.length>100000)throw Error('Bitte eine PGN mit maximal 100 KB einfügen.');
    const game=new Chess();
    if(!game.load_pgn(text,{sloppy:true}))throw Error('Die PGN ist ungültig oder enthält illegale Züge. Bitte die komplette PGN überprüfen.');
    const history=game.history({verbose:true});
    if(!history.length)throw Error('Die PGN enthält keine gespielten Züge.');
    if(history.length>300)throw Error('Maximal 300 Halbzüge pro Partie werden unterstützt.');
    const replay=new Chess();
    const fens=[replay.fen()];
    for(const m of history){if(!replay.move(m.san))throw Error('Ungültiger Zug: '+m.san);fens.push(replay.fen());}
    own.chess=game;own.moves=history;own.fens=fens;own.ply=0;own.comments=history.map(()=>'');
    own.raw=text;own.summary=null;
    const white=readHeader(text,'White')||'Weiss',black=readHeader(text,'Black')||'Schwarz',result=readHeader(text,'Result')||game.header().Result||'*';
    el('ownTitle').textContent=white+' – '+black;
    el('ownMeta').textContent=history.length+' Halbzüge · '+result;
    el('ownWorkspace').hidden=false;
    el('ownSummary').hidden=true;
    el('ownMoveCount').textContent=history.length+' Halbzüge';
    if(own.board){own.board.destroy();own.board=null;}
    own.board=Chessboard('ownBoard',{position:'start',orientation:'white',showNotation:true,draggable:false,pieceTheme:'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'});
    el('ownMoves').innerHTML=Array.from({length:Math.ceil(history.length/2)},(_,i)=>{
      const w=history[i*2],b=history[i*2+1];
      return '<span class="n">'+(i+1)+'.</span><button type="button" data-own-ply="'+(i*2+1)+'">'+html(w.san)+'</button>'+
        (b?'<button type="button" data-own-ply="'+(i*2+2)+'">'+html(b.san)+'</button>':'<span></span>');
    }).join('');
    el('ownMoves').querySelectorAll('[data-own-ply]').forEach(b=>b.addEventListener('click',()=>jump(Number(b.dataset.ownPly))));
    setStatus('ownStatus','PGN erfolgreich geladen. Alle '+history.length+' Halbzüge wurden auf Legalität geprüft.');
    setStatus('ownAiStatus','Für eine KI-Analyse den geschützten Analysedienst verbinden.');
    draw();
    requestAnimationFrame(()=>own.board?.resize());
  }
  el('ownImport').addEventListener('click',()=>{try{importPgn(el('ownPgn').value);}catch(e){setStatus('ownStatus',e.message,true);}});
  el('ownFile').addEventListener('change',async e=>{
    const f=e.target.files?.[0];if(!f)return;
    try{
      if(f.size>100000)throw Error('Datei zu gross (max. 100 KB).');
      const contents=await f.text();el('ownPgn').value=contents;importPgn(contents);
    }catch(ex){setStatus('ownStatus',ex.message,true);}
    e.target.value='';
  });
  el('ownFirst').onclick=()=>jump(0);el('ownPrev').onclick=()=>jump(own.ply-1);
  el('ownNext').onclick=()=>jump(own.ply+1);el('ownLast').onclick=()=>jump(own.moves.length);
  el('ownFlip').onclick=()=>own.board?.flip();
  window.ownChessResize=()=>own.board?.resize();
  window.addEventListener('resize',()=>{if(!el('own').hidden)own.board?.resize();});
  document.addEventListener('keydown',e=>{
    if(el('own').hidden||e.target.closest('input,textarea,button'))return;
    if(e.key==='ArrowLeft'){e.preventDefault();jump(own.ply-1);}
    if(e.key==='ArrowRight'){e.preventDefault();jump(own.ply+1);}
  });
  try{
    const endpoint=localStorage.getItem('schachstudium.aiEndpoint');if(endpoint)el('aiEndpoint').value=endpoint;
  }catch(_){}
  function renderSummary(summary){
    if(!summary)return;
    const list=(title,items)=>'<section><h3>'+html(title)+'</h3><ul>'+items.map(item=>'<li>'+html(item)+'</li>').join('')+'</ul></section>';
    el('ownSummaryContent').innerHTML='<p>'+html(summary.overview||'')+'</p>'+
      list('Was gut war',summary.strengths||[])+list('Verbesserungspotenzial',summary.weaknesses||[])+list('Nächste Trainingsschritte',summary.priorities||[]);
    el('ownSummary').hidden=false;
  }
  el('ownAnalyze').addEventListener('click',async()=>{
    if(own.busy)return;
    if(!own.moves.length){setStatus('ownAiStatus','Bitte zuerst eine Partie importieren.',true);return;}
    const endpoint=el('aiEndpoint').value.trim(),token=el('aiToken').value.trim();
    if(!/^https:\/\//i.test(endpoint)||!token){setStatus('ownAiStatus','Bitte HTTPS-Adresse des KI-Dienstes und deinen privaten Zugriffscode eingeben.',true);return;}
    try{localStorage.setItem('schachstudium.aiEndpoint',endpoint);}catch(_){}
    own.busy=true;el('ownAnalyze').disabled=true;
    setStatus('ownAiStatus','Die KI analysiert die Partie. Der Server prüft jeden Zug.');
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
        body:JSON.stringify({pgn:own.chess.pgn(),focus:'Schachverständnis Rapid Elo 1200',color:'both'})});
      if(!response.ok){let detail='HTTP '+response.status;try{const e=await response.json();detail=e.error||detail;}catch(_){}throw Error('KI-Dienst: '+detail);}
      const data=await response.json();
      if(!Array.isArray(data.comments)||data.comments.length!==own.moves.length||data.comments.some(x=>typeof x!=='string'||!x.trim()))throw Error('Die KI hat nicht für jeden Halbzug eine Erklärung geliefert.');
      const sm=data.summary||{};
      for(const field of ['strengths','weaknesses','priorities'])if(!Array.isArray(sm[field]))throw Error('Die Zusammenfassung ist unvollständig.');
      own.comments=data.comments;own.summary=sm;
      renderSummary(sm);draw();
      setStatus('ownAiStatus','KI-Auswertung fertig: '+own.moves.length+' Zugkommentare und Zusammenfassung.');
    }catch(ex){setStatus('ownAiStatus',ex.message,true);}
    finally{own.busy=false;el('ownAnalyze').disabled=false;}
  });
  el('ownDownload').addEventListener('click',()=>{
    if(!own.moves.length)return;
    if(!own.comments.every(c=>c.trim())){setStatus('ownAiStatus','Noch keine vollständigen Kommentare vorhanden. Bitte zuerst die KI-Auswertung durchführen.',true);return;}
    const annotated=new Chess();
    const lines=[];
    for(let i=0;i<own.moves.length;i++){
      const move=own.moves[i];const out=annotated.move(move.san);
      if(!out)return;
      lines.push((i%2===0?Math.floor(i/2)+1+'. ':'')+out.san+' {'+own.comments[i].replace(/[{}]/g,'(').replace(/\s+/g,' ').trim()+'}');
    }
    const raw=own.chess.header(),header=['Event','Site','Date','White','Black','Result'].map(key=>'['+key+' "'+String(raw[key]|| (key==='Result'?'*':'?')).replace(/"/g,'')+'"]').join('\n');
    const blob=new Blob([header+'\n\n'+lines.join(' ')+' '+(raw.Result||'*')+'\n'],{type:'application/x-chess-pgn'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='eigene_partie_kommentiert.pgn';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
})();