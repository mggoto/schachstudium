'use strict';
const $id = id => document.getElementById(id);
const weekdays=['MO','DI','MI','DO','FR','SA','SO'];
const months=['Jan.','Feb.','März','Apr.','Mai','Juni','Juli','Aug.','Sep.','Okt.','Nov.','Dez.'];
const state={games:[],selected:null,board:null,history:[],index:0,evaluations:null};
/* Board corner-resize control. Width is persisted in this browser. */
const detailGrid=document.querySelector('.detailgrid');
const resizeGrip=$id('resizeBoard');
let boardWidthPreference=null;
let resizeFrame=0;
try { const saved=Number(localStorage.getItem('schachstudium.boardWidth')); if(Number.isFinite(saved)&&saved>=240)boardWidthPreference=saved; }catch(_){}
function boardLimits(){
  const mobile=window.matchMedia('(max-width:780px)').matches;
  const narrow=window.matchMedia('(max-width:1100px)').matches;
  const available=detailGrid.clientWidth || document.documentElement.clientWidth-30;
  const reserved=mobile?0:(narrow?302:442);
  return {min:Math.min(260,Math.max(190,available-reserved)),max:Math.max(190,Math.min(950,available-reserved))};
}
function setBoardWidth(pixels,persist=false){
  const limits=boardLimits();
  const width=Math.round(Math.min(limits.max,Math.max(limits.min,pixels)));
  detailGrid.style.setProperty('--board-width',width+'px');
  if(persist){boardWidthPreference=width;try{localStorage.setItem('schachstudium.boardWidth',String(width));}catch(_){}}
  cancelAnimationFrame(resizeFrame);
  resizeFrame=requestAnimationFrame(()=>state.board?.resize());
}
if(boardWidthPreference!==null)requestAnimationFrame(()=>setBoardWidth(boardWidthPreference));
resizeGrip.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  e.preventDefault();
  const pointer=e.pointerId,startX=e.clientX,startWidth=document.querySelector('.boardcol').getBoundingClientRect().width;
  resizeGrip.setPointerCapture(pointer);
  resizeGrip.classList.add('dragging');detailGrid.classList.add('resizing');
  const move=ev=>{if(ev.pointerId===pointer)setBoardWidth(startWidth+ev.clientX-startX,true);};
  const end=ev=>{
    if(ev.pointerId!==pointer)return;
    resizeGrip.removeEventListener('pointermove',move);
    resizeGrip.removeEventListener('pointerup',end);
    resizeGrip.removeEventListener('pointercancel',end);
    resizeGrip.classList.remove('dragging');detailGrid.classList.remove('resizing');
    if(resizeGrip.hasPointerCapture(pointer))resizeGrip.releasePointerCapture(pointer);
  };
  resizeGrip.addEventListener('pointermove',move);
  resizeGrip.addEventListener('pointerup',end);
  resizeGrip.addEventListener('pointercancel',end);
});
resizeGrip.addEventListener('dblclick',()=>{boardWidthPreference=null;try{localStorage.removeItem('schachstudium.boardWidth');}catch(_){}detailGrid.style.removeProperty('--board-width');requestAnimationFrame(()=>state.board?.resize());});

const calendarDate = () => {
  const parts = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Zurich',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
};
const iso = date => date.toISOString().slice(0,10);
const utc = s => new Date(s+'T12:00:00Z');
const addDays=(day,num)=>{const d=utc(day);d.setUTCDate(d.getUTCDate()+num);return iso(d);};
const weekStart = day => {const d=utc(day); const weekday=(d.getUTCDay()+6)%7;return addDays(day,-weekday);};
const niceDate=day=>{const d=utc(day);return `${d.getUTCDate()}. ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function show(page){
  const detail=page==='detail', own=page==='own';
  $id('home').hidden=detail||own;$id('detail').hidden=!detail;$id('own').hidden=!own;
  $id('homeBtn').classList.toggle('active',!detail&&!own);
  $id('detailBtn').classList.toggle('active',detail);
  $id('ownBtn').classList.toggle('active',own);
  if(detail)requestAnimationFrame(()=>state.board?.resize());
  if(own)requestAnimationFrame(()=>window.ownChessResize?.());
  window.scrollTo({top:0,behavior:'instant'});
}
const learningKey='kidsgambit.lab.learning.v1';
let learning={};
try { const stored=JSON.parse(localStorage.getItem(learningKey)||'{}');if(stored&&typeof stored==='object'&&!Array.isArray(stored))learning=stored; }catch(_){}
const studyStatus=id=>['new','working','learned'].includes(learning[id])?learning[id]:'new';
function saveStudyStatus(id,value){
 if(!['new','working','learned'].includes(value))return;
 if(value==='new')delete learning[id];else learning[id]=value;
 try{localStorage.setItem(learningKey,JSON.stringify(learning));}catch(_){}
 if(state.selected?.id===id)$id('detailLearnStatus').value=value;
 drawArchive();
}
function drawArchive(){
 const games=[...state.games].sort((a,b)=>Number(b.year)-Number(a.year));
 const done=games.filter(g=>studyStatus(g.id)==='learned').length;
 $id('total').textContent=String(games.length);
 $id('learnedCount').textContent=done+' von '+games.length+' gelernt';
 const pct=games.length?Math.round(100*done/games.length):0;
 $id('progressFill').style.width=pct+'%';
 $id('progressTrack').setAttribute('aria-valuenow',String(pct));
 const query=$id('librarySearch').value.trim().toLocaleLowerCase('de-CH');
 const filter=$id('libraryFilter').value;
 const filtered=games.filter(g=>(filter==='all'||studyStatus(g.id)===filter)&&[g.white,g.black,g.opening,g.focus,g.year,g.context].join(' ').toLocaleLowerCase('de-CH').includes(query));
 const statusText={new:'Noch nicht gelernt',working:'In Bearbeitung',learned:'Gelernt ✓'};
 $id('weeks').innerHTML=filtered.map(g=>{
  const status=studyStatus(g.id);
  return `<article class="library-card ${status}" data-id="${esc(g.id)}">
   <div class="library-card-top"><span class="library-year">${esc(g.year)}</span><span class="library-status ${status}">${statusText[status]}</span></div>
   <h2>${esc(g.white)} <span>gegen</span> ${esc(g.black)}</h2>
   <p class="library-opening">${esc(g.opening)} · ${esc(g.eco)}</p>
   <p class="library-focus">${esc(g.focus)}</p>
   <div class="library-card-bottom"><span>${esc(g.result)} · Lernniveau ~${esc(g.level)}</span><button type="button" class="library-open" data-game="${esc(g.id)}">Partie studieren →</button></div>
  </article>`;
 }).join('')||'<p class="library-empty">Keine passenden Partien gefunden. Ändere den Suchbegriff oder den Filter.</p>';
 document.querySelectorAll('[data-game]').forEach(el=>el.addEventListener('click',()=>openGame(el.dataset.game)));
}
$id('librarySearch').addEventListener('input',drawArchive);
$id('libraryFilter').addEventListener('change',drawArchive);
$id('detailLearnStatus').addEventListener('change',e=>{if(state.selected)saveStudyStatus(state.selected.id,e.target.value);});
function parseAnnotatedPgn(pgn){
  const body=pgn.replace(/^\s*\[[^\n]*\]\s*$/gm,' ');
  const tokens=body.match(/\{[^}]*\}|[^\s{}]+/g)||[];
  const game=new Chess();const moves=[],fens=[game.fen()];
  for(let tok of tokens){
    if(tok.startsWith('{')){if(!moves.length||moves.at(-1).comment)throw Error('Kommentarzuordnung in PGN fehlerhaft');moves.at(-1).comment=tok.slice(1,-1).trim();continue;}
    tok=tok.replace(/^\d+\.(?:\.\.)?/,'');
    if(!tok||/^\.{2,3}$/.test(tok)||/^(1-0|0-1|1\/2-1\/2|\*)$/.test(tok)||tok.startsWith('$'))continue;
    const move=game.move(tok,{sloppy:true});
    if(!move)throw Error(`Illegaler PGN-Zug: ${tok}`);
    moves.push({san:move.san,from:move.from,to:move.to,comment:'',fen:game.fen()});fens.push(game.fen());
  }
  if(!moves.length||moves.some(m=>!m.comment))throw Error('Mindestens ein Halbzug hat keinen Kommentar.');
  return {moves,fens};
}
async function openGame(id){
  const game=state.games.find(g=>g.id===id);if(!game)return;
  state.selected=game;
  $id('detailBtn').disabled=false;
  $id('detailTitle').textContent=`${game.white} – ${game.black} · ${game.year}`;
  $id('detailDate').textContent='Historische Partie · '+game.result;
  $id('detailLearnStatus').value=studyStatus(game.id);
  $id('detailMeta').textContent=`${game.opening} (${game.eco}) · Lernniveau ca. ${game.level}`;
  $id('openingName').textContent=game.opening;$id('openingCode').textContent=`ECO ${game.eco} · ${game.year}`;
  $id('openingFocus').textContent='Lernschwerpunkt: '+game.focus;
  $id('pgnLink').href=game.pgn;
  $id('pgnLink').download=game.pgn.split('/').pop();
  $id('pgnCopyBtn').textContent='PGN kopieren';
  $id('pgnCopyBtn').disabled=false;
  show('detail');
  $id('commentTitle').textContent='Partie wird geladen';$id('commentText').textContent=game.context;
  try{
    if(typeof Chess==='undefined'||typeof Chessboard==='undefined')throw Error('Die Schachbibliotheken konnten nicht geladen werden. Internetverbindung prüfen.');
    const res=await fetch(game.pgn);
    if(!res.ok)throw Error('PGN konnte nicht geladen werden (HTTP '+res.status+').');
    const parsed=parseAnnotatedPgn(await res.text());
    if(state.evaluations===null){
      try{
        const evaluationResponse=await fetch('data/evaluations.json',{cache:'no-store'});
        state.evaluations=evaluationResponse.ok?await evaluationResponse.json():{};
      }catch(_){state.evaluations={};}
    }
    state.history=parsed.moves;state.fens=parsed.fens;state.index=0;
    if(state.board){state.board.destroy();state.board=null;}
    state.board=Chessboard('board',{position:'start',orientation:'white',showNotation:true,draggable:false,pieceTheme:'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'});
    $id('error').hidden=true;
    $id('moves').innerHTML=Array.from({length:Math.ceil(parsed.moves.length/2)},(_,i)=>{
      const w=parsed.moves[i*2],b=parsed.moves[i*2+1];
      return `<span class="n">${i+1}.</span><button data-ply="${i*2+1}">${esc(w.san)}</button>${b?`<button data-ply="${i*2+2}">${esc(b.san)}</button>`:'<span></span>'}`;
    }).join('');
    document.querySelectorAll('[data-ply]').forEach(el=>el.addEventListener('click',()=>jump(Number(el.dataset.ply))));
    $id('moveCount').textContent=parsed.moves.length+' Halbzüge';
    renderMove();setTimeout(()=>state.board?.resize(),80);
  }catch(error){$id('error').textContent=error.message;$id('error').hidden=false;$id('commentTitle').textContent='Partie nicht verfügbar';$id('commentText').textContent='Die angeforderte PGN-Datei konnte nicht verarbeitet werden.';}
}
// Precomputed Stockfish assessments: white advantage positive, black advantage negative.
function updatePositionBar(){
 const entry=state.evaluations?.[state.selected?.id];
 const scores=entry?.scores;
 const score=entry?.halfMoves===state.history.length && Array.isArray(scores) && scores.length===state.history.length+1 ? scores[state.index] : null;
 const note=$id('evalNote');
 const text=$id('evalScore');
 if(!score || (typeof score.cp!=='number' && typeof score.mate!=='number')){
   $id('evalWhite').style.height='50%';$id('evalBlack').style.height='50%';
   text.textContent='—';
   const label='Keine Engine-Bewertung verfügbar';
   $id('evalBar').setAttribute('aria-label',label);text.title=label;
   note.textContent='Stockfish-Bewertung nicht verfügbar';return;
 }
 const isMate=typeof score.mate==='number';
 const cp=isMate?(score.mate>=0?10000:-10000):score.cp;
 // Nonlinear display so small advantages remain visible and decisive advantages saturate.
 const whitePercent=isMate?(cp>0?96:4):50+46*Math.tanh(cp/350);
 $id('evalWhite').style.height=whitePercent.toFixed(2)+'%';
 $id('evalBlack').style.height=(100-whitePercent).toFixed(2)+'%';
 const display=isMate?('M'+(score.mate>0?'+':'')+score.mate):(cp>=0?'+':'')+(cp/100).toFixed(1);
 text.textContent=display;
 const who=isMate?(score.mate>0?'Weiss':'Schwarz'):(cp>0?'Weiss':cp<0?'Schwarz':'Keine Seite');
 const label=isMate?who+' kann in '+Math.abs(score.mate)+' Zügen mattsetzen':'Stockfish: '+who+(cp===0?' hat keinen messbaren Vorteil':' ist im Vorteil')+', Bewertung '+display+' aus weisser Sicht';
 $id('evalBar').setAttribute('aria-label',label);text.title=label;
 note.textContent='Stockfish-Stellungsbewertung (aus Sicht von Weiss)';
}
function jump(n){if(!state.history.length)return;state.index=Math.max(0,Math.min(state.history.length,n));renderMove();}
function renderMove(){
 const i=state.index,one=state.history[i-1];
 state.board?.position(state.fens[i],false);
 document.querySelectorAll('#board .kidsgambit-lastmove').forEach(el=>el.classList.remove('kidsgambit-lastmove'));
 if(one){for(const sq of [one.from,one.to]){const el=document.querySelector('#board .square-'+sq);el?.classList.add('kidsgambit-lastmove');}}
 updatePositionBar();
 $id('commentTitle').textContent=i?`${Math.ceil(i/2)}${i%2?'.':'…'} ${one.san}`:'Startstellung';
 $id('commentText').textContent=i?one.comment:state.selected.context;
 $id('moveProgress').textContent=`${i} / ${state.history.length}`;
 for(const id of ['prev','first'])$id(id).disabled=i===0;
 for(const id of ['next','last'])$id(id).disabled=i===state.history.length;
 document.querySelectorAll('[data-ply]').forEach(el=>el.classList.toggle('active',Number(el.dataset.ply)===i));
 const active=document.querySelector('[data-ply].active');
 if(active){const panel=$id('moves');const top=active.offsetTop-panel.offsetTop;if(top<panel.scrollTop||top>panel.scrollTop+panel.clientHeight-40) panel.scrollTop=Math.max(0,top-100);}
}
$id('pgnCopyBtn').addEventListener('click',async()=>{
  const btn=$id('pgnCopyBtn');
  const selected=state.selected;
  if(!selected||btn.disabled)return;
  btn.disabled=true;
  try{
    const res=await fetch(selected.pgn,{cache:'no-store'});
    if(!res.ok)throw Error('PGN konnte nicht geladen werden.');
    const content=await res.text();
    if(!content.trim())throw Error('PGN ist leer.');
    if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(content);
    else{
      const textarea=document.createElement('textarea');
      textarea.value=content;textarea.style.position='fixed';textarea.style.opacity='0';
      document.body.appendChild(textarea);textarea.select();
      const ok=document.execCommand('copy');textarea.remove();
      if(!ok)throw Error('Kopieren nicht unterstützt.');
    }
    btn.textContent='PGN kopiert ✓';
  }catch(err){
    btn.textContent='Kopieren fehlgeschlagen';
    btn.title=err.message;
  }finally{
    btn.disabled=false;
  }
});
$id('homeBtn').onclick=()=>show('home');$id('ownBtn').onclick=()=>show('own');$id('detailBtn').onclick=()=>show('detail');$id('backBtn').onclick=()=>show('home');$id('logo').onclick=e=>{e.preventDefault();show('home');};
$id('first').onclick=()=>jump(0);$id('prev').onclick=()=>jump(state.index-1);$id('next').onclick=()=>jump(state.index+1);$id('last').onclick=()=>jump(state.history.length);
$id('flip').onclick=()=>state.board?.flip();
document.addEventListener('keydown',e=>{if($id('detail').hidden||e.target.closest('input,textarea,button'))return;if(e.key==='ArrowLeft'){e.preventDefault();jump(state.index-1);}if(e.key==='ArrowRight'){e.preventDefault();jump(state.index+1);}});
window.addEventListener('resize',()=>{if(boardWidthPreference!==null)setBoardWidth(boardWidthPreference);else state.board?.resize();});
(async()=>{try{const r=await fetch('data/games.json',{cache:'no-store'});if(!r.ok)throw Error('Katalog nicht verfügbar');state.games=await r.json();drawArchive();}catch(err){$id('weeks').textContent='Partiensammlung konnte nicht geladen werden. Bitte die Seite über einen Webserver öffnen (nicht als lokale file://-Datei). '+err.message;}})();
