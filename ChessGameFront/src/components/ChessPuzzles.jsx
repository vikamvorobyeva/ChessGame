import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import Chessboard from "chessboardjsx";
import { Chess } from "chess.js";

const ChessPuzzles = () => {
  const [puzzles, setPuzzles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(
    parseInt(localStorage.getItem("puzzleIndex")) || 0
  );
  const [game, setGame] = useState(null);
  const [fen, setFen] = useState("");
  const [showSolution, setShowSolution] = useState(false);
  const [isSolved, setIsSolved] = useState(false);

  useEffect(() => {
    fetch("/lichess_db_puzzle.csv")
      .then((res) => res.text())
      .then((csv) => {
        Papa.parse(csv, {
          header: false,
          skipEmptyLines: true,
          complete: (result) => {
            const filtered = result.data.filter((row) => row.length >= 3);
            setPuzzles(filtered);
          },
        });
      })
      .catch((err) => console.error("Ошибка загрузки CSV:", err));
  }, []);

  useEffect(() => {
    if (puzzles.length > 0) {
      const puzzle = puzzles[currentIndex];
      const initialFen = puzzle[1];
      const newGame = new Chess(initialFen);
      setGame(newGame);
      setFen(initialFen);
      setShowSolution(false);
      setIsSolved(false);
    }
  }, [puzzles, currentIndex]);

  const handleMove = ({ sourceSquare, targetSquare }) => {
    if (!game || !puzzles[currentIndex] || isSolved) return;

    const solutionMoves = puzzles[currentIndex][2]?.split(" ");
    const moveIndex = game.history().length;

    const expectedMove = solutionMoves[moveIndex];
    const userMove = sourceSquare + targetSquare;

    if (userMove !== expectedMove) {
      const reset = new Chess(puzzles[currentIndex][1]);
      setGame(reset);
      setFen(reset.fen());
      return;
    }

    game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q"
    });

    const replyMove = solutionMoves[moveIndex + 1];
    if (replyMove && replyMove.length === 4) {
      game.move({
        from: replyMove.slice(0, 2),
        to: replyMove.slice(2, 4),
        promotion: "q"
      });
    }

    setFen(game.fen());

    if (game.history().length >= solutionMoves.length) {
      setIsSolved(true);
    }
  };

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % puzzles.length;
    setCurrentIndex(nextIndex);
    localStorage.setItem("puzzleIndex", nextIndex.toString());
  };

  const current = puzzles[currentIndex];
  const isWhiteTurn = current && current[1]?.split(" ")[1] === "w";

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h1>♟ Шахматная задача #{currentIndex + 1}</h1>

      {game ? (
        <>
          <Chessboard
            position={fen}
            onDrop={handleMove}
            width={500}
            boardStyle={{
              borderRadius: "10px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              margin: "auto",
            }}
            draggable={!isSolved}
          />
          <p>Рейтинг: {current[4] || "неизвестен"}</p>
          <p>Найдите ход за: <strong>{isWhiteTurn ? "белых" : "черных"}</strong></p>
          {/*<p>*/}
          {/*  Ссылка:{" "}*/}
          {/*  <a href={current[10]} target="_blank" rel="noopener noreferrer">*/}
          {/*    {current[10]}*/}
          {/*  </a>*/}
          {/*</p>*/}

          {isSolved && (
            <p style={{ color: "green", fontWeight: "bold" }}>
              ✅ Задача решена! Отличная работа!
            </p>
          )}

          {showSolution && (
            <p>
              🧠 <strong>Решение:</strong> {current[2]?.replace(/\s+/g, " → ")}
            </p>
          )}

          <div style={{ marginTop: "1rem" }}>
            {!isSolved && (
              <button
                onClick={() => setShowSolution(true)}
                style={{
                  marginRight: "0.5rem",
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  cursor: "pointer",
                  backgroundColor: "#2196f3",
                  color: "white",
                }}
              >
                👁 Показать решение
              </button>
            )}

            <button
              onClick={handleNext}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                fontSize: "1rem",
                cursor: "pointer",
                backgroundColor: "#4CAF50",
                color: "white",
              }}
            >
              ▶️ Следующая задача
            </button>
          </div>
        </>
      ) : (
        <p>⏳ Загрузка...</p>
      )}
    </div>
  );
};

export default ChessPuzzles;
