import React, { useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Link } from "react-router-dom";

export default function PlayWithAI() {
  const [game, setGame] = useState(new Chess());

  const makeMove = (sourceSquare, targetSquare) => {
    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });

    if (move === null) return false;
    setGame(new Chess(game.fen()));
    return true;
  };

  const makeAIMove = () => {
    const moves = game.moves();
    if (moves.length > 0) {
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      game.move(randomMove);
      setGame(new Chess(game.fen()));
    }
  };

  const onDrop = (sourceSquare, targetSquare) => {
    const move = makeMove(sourceSquare, targetSquare);
    if (move) {
      setTimeout(makeAIMove, 500);
    }
  };

  const resetGame = () => {
    setGame(new Chess());
  };

  return (
    <div className="play-with-ai-container">
      <h1>Играть с компьютером</h1>

      <Link to="/" style={{ marginBottom: '1rem' }}>
        <button
          style={{
            backgroundColor: '#555',
            color: '#fff',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          ⬅️ На главную
        </button>
      </Link>

      <div className="chessboard-wrapper">
        <Chessboard
          position={game.fen()}
          onPieceDrop={onDrop}
          boardWidth={400}
        />
      </div>

      <button onClick={resetGame} className="reset-button" style={{
        marginTop: '1rem',
        padding: '0.5rem 1.5rem',
        fontSize: '1rem',
        borderRadius: '8px',
        backgroundColor: '#4CAF50',
        color: '#fff',
        border: 'none',
        cursor: 'pointer'
      }}>
        🔄 Сбросить игру
      </button>
    </div>
  );
}
