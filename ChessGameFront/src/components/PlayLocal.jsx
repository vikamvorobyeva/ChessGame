import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Chessboard from 'chessboardjsx';
import { Chess } from 'chess.js';

const PlayLocal = () => {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState('start');
  const [squareStyles, setSquareStyles] = useState({});
  const [result, setResult] = useState('');

  const handleMove = ({ sourceSquare, targetSquare }) => {
    if (sourceSquare === targetSquare) return;

    const possibleMoves = game.moves({ square: sourceSquare, verbose: true });
    const isLegal = possibleMoves.some(m => m.to === targetSquare);
    if (!isLegal) return;

    const newGame = new Chess(game.fen());
    const move = newGame.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q'
    });

    if (!move) return;

    setGame(newGame);
    setFen(newGame.fen());
    setSquareStyles({});

    if (newGame.isGameOver()) {
      if (newGame.isCheckmate()) {
        setResult(`Мат. Победили ${newGame.turn() === 'w' ? 'черные' : 'белые'}`);
      } else if (newGame.isDraw()) {
        setResult('Ничья');
      } else {
        setResult('Игра окончена');
      }
    }
  };

  const onMouseOverSquare = square => {
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) return;

    const highlight = {};
    moves.forEach(move => {
      highlight[move.to] = {
        border: '2px solid rgba(0, 255, 0, 0.7)'
      };
    });
    setSquareStyles(highlight);
  };

  const onMouseOutSquare = () => {
    setSquareStyles({});
  };

  const restartGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen('start');
    setResult('');
    setSquareStyles({});
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
      <h1>♟️ Шахматы на одном устройстве</h1>

      {/* 🔙 Кнопка на главную */}
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

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Chessboard
          width={520}
          position={fen}
          onDrop={handleMove}
          onMouseOverSquare={onMouseOverSquare}
          onMouseOutSquare={onMouseOutSquare}
          squareStyles={squareStyles}
          boardStyle={{
            borderRadius: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            margin: 'auto'
          }}
        />
      </div>

      {result && (
        <div style={{
          marginTop: '1rem',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#f44336'
        }}>
          {result}
        </div>
      )}

      <button
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1.5rem',
          fontSize: '1rem',
          borderRadius: '8px',
          backgroundColor: '#4CAF50',
          color: '#fff',
          border: 'none',
          cursor: 'pointer'
        }}
        onClick={restartGame}
      >
        🔄 Начать заново
      </button>
    </div>
  );
};

export default PlayLocal;
