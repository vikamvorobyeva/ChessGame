import React, { useEffect, useState, useRef } from "react";
import "./Checkers.css";

export default function PlayCheckers() {
  const boardSize = 8;
  const [currentPlayer, setCurrentPlayer] = useState("black");
  const [timeWhite, setTimeWhite] = useState(5 * 60);
  const [timeBlack, setTimeBlack] = useState(5 * 60);
  const intervalRef = useRef(null);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    if (gameOver) return;

    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (currentPlayer === "white") {
        setTimeWhite(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setGameOver(true);
            return 0;
          }
          return prev - 1;
        });
      } else {
        setTimeBlack(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setGameOver(true);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [currentPlayer, gameOver]);

  const switchPlayer = () => {
    if (gameOver) return;
    setCurrentPlayer(prev => (prev === "white" ? "black" : "white"));
  };

  const formatTime = (seconds) => {
    const min = String(Math.floor(seconds / 60)).padStart(2, '0');
    const sec = String(seconds % 60).padStart(2, '0');
    return `${min}:${sec}`;
  };

  const board = [];

  for (let row = 0; row < boardSize; row++) {
    const cells = [];
    for (let col = 0; col < boardSize; col++) {
      const isDark = (row + col) % 2 === 1;
      const hasPiece = row < 3 && isDark ? "black" : row > 4 && isDark ? "white" : null;

      cells.push(
        <div
          key={col}
          className={`cell ${isDark ? "dark" : "light"}`}
          onClick={switchPlayer}
        >
          {hasPiece && <div className={`piece ${hasPiece}`} />}
        </div>
      );
    }
    board.push(
      <div key={row} className="row">
        {cells}
      </div>
    );
  }

  return (
    <div className="checkers-container">
      <h2>🎯 Игра в шашки</h2>
      <div className="timers" style={{ marginBottom: "1rem", textAlign: "center" }}>
        <div>⏱️ Белые: {formatTime(timeWhite)}</div>
        <div>⏱️ Чёрные: {formatTime(timeBlack)}</div>
      </div>
      {gameOver && <h3 style={{ color: "red" }}>⛔ Время вышло! Победа {currentPlayer === "white" ? "чёрных" : "белых"}</h3>}
      <div className="checkers-board">{board}</div>
    </div>
  );
}
