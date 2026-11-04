#!/usr/bin/env python3
"""Calculate Stockfish evaluations for every published game's starting position and move."""
import json
import os
import shutil
import sys
from pathlib import Path

import chess
import chess.engine
import chess.pgn

ROOT = Path(__file__).resolve().parents[1]
GAMES = json.loads((ROOT / "data/games.json").read_text(encoding="utf-8"))
OUT = ROOT / "data/evaluations.json"

def find_engine():
    for candidate in [os.environ.get("STOCKFISH_EXECUTABLE"), shutil.which("stockfish"), "/usr/games/stockfish", "/usr/bin/stockfish"]:
        if candidate and Path(candidate).is_file():
            return candidate
    raise RuntimeError("Stockfish is missing; cannot publish factual evaluation values.")

def score_position(engine, board):
    if board.is_checkmate():
        return {"mate": -1 if board.turn == chess.WHITE else 1}
    if board.is_stalemate() or board.is_insufficient_material():
        return {"cp": 0}
    info = engine.analyse(board, chess.engine.Limit(time=0.15))
    score = info["score"].white()
    mate = score.mate()
    if mate is not None:
        return {"mate": mate}
    cp = score.score()
    if cp is None:
        raise RuntimeError("Engine returned no numeric evaluation.")
    return {"cp": cp}

def main():
    results = {}
    with chess.engine.SimpleEngine.popen_uci(find_engine()) as engine:
        engine.configure({"Threads": 2, "Hash": 32})
        for meta in GAMES:
            game_id = meta["id"]
            pgn_path = ROOT / meta["pgn"]
            with pgn_path.open(encoding="utf-8-sig") as file:
                game = chess.pgn.read_game(file)
            if game is None or game.errors:
                raise ValueError(f"{game_id}: invalid PGN: {game.errors if game else 'empty'}")
            board = game.board()
            scores = [score_position(engine, board)]
            move_count = 0
            for node in game.mainline():
                move_count += 1
                if not node.comment.strip():
                    raise ValueError(f"{game_id}: missing commentary at halfmove {move_count}")
                if node.move not in board.legal_moves:
                    raise ValueError(f"{game_id}: illegal move at {move_count}")
                board.push(node.move)
                scores.append(score_position(engine, board))
            if len(scores) != move_count + 1:
                raise AssertionError(f"{game_id}: inconsistent score count")
            results[game_id] = {"halfMoves": move_count, "scores": scores}
            print(f"{game_id}: {move_count} halfmoves, {len(scores)} Stockfish evaluations", flush=True)
    OUT.write_text(json.dumps(results, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote {OUT}")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Evaluation generation failed: {exc}", file=sys.stderr)
        raise
