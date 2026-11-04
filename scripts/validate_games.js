// Run with `npm ci && npm run validate` before publishing.
const fs = require('fs');
const { Chess } = require('chess.js');
const games = JSON.parse(fs.readFileSync('data/games.json', 'utf8'));
const dates = new Set(), ids = new Set();
for (const entry of games) {
  if (ids.has(entry.id)) throw Error('Duplicate id: '+entry.id);
  if (dates.has(entry.date)) throw Error('Multiple games on date: '+entry.date);
  ids.add(entry.id); dates.add(entry.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || !Number.isFinite(Date.parse(entry.date+'T00:00:00Z'))) throw Error('Bad date');
  const pgn = fs.readFileSync(entry.pgn,'utf8');
  const chess = new Chess();
  try { chess.loadPgn(pgn); } catch(e) { throw Error(entry.id+': cannot parse legal PGN: '+e.message); }
  const hist = chess.history({verbose: true});
  if (!hist.length) throw Error(entry.id+': empty game');
  const comments = chess.getComments();
  if (comments.length !== hist.length) throw Error(entry.id+': expected '+hist.length+' move comments, got '+comments.length);
  const resultMatch = pgn.match(/^\[Result "([^"]+)"\]/m);
  if (resultMatch?.[1] !== entry.result) throw Error(entry.id+': result mismatch');
  console.log(entry.id+': '+hist.length+' legal halfmoves, '+comments.length+' comments');
}
console.log('Validated '+games.length+' games.');
