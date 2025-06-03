import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import "./CheckersBoard.css";
import { Link } from "react-router-dom";


export default function RoomViewCheckers() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [myColor, setMyColor] = useState("white");
  const [currentTurn, setCurrentTurn] = useState("white");
  const [board, setBoard] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [mustContinueCapture, setMustContinueCapture] = useState(false);
  const ws = useRef(null);
  const [myUserId, setMyUserId] = useState(null);
  const [opponentInfo, setOpponentInfo] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [timers, setTimers] = useState({ white: 300, black: 300 });
  const [intervalId, setIntervalId] = useState(null);


  const opponentId = React.useMemo(() => {
    if (!room || !myUserId) return null;
    return myUserId === room.creator_id ? room.opponent_id : room.creator_id;
  }, [room, myUserId]);

  useEffect(() => {
    document.body.classList.add("match-room");
    return () => {
      document.body.classList.remove("match-room");
    };
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const html = document.documentElement;

    if (savedTheme === "light") {
      html.classList.remove("dark");
      html.classList.add("light");
    } else {
      html.classList.remove("light");
      html.classList.add("dark");
    }

    return () => {
      html.classList.remove("light");
      html.classList.remove("dark");
    };
  }, []);

  useEffect(() => {
    let anonId = localStorage.getItem("anon_id");
    if (!anonId) {
      anonId = `anon_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem("anon_id", anonId);
    }

    api.get(`/rooms/${roomCode}`, {
      headers: {
        "x-anon-id": anonId
      }
    }).then((res) => {
      console.log("Комната загружена:", res.data);
      if (res.data.is_chess) {
        alert("Эта комната предназначена для шахмат");
        navigate(`/room/${roomCode}`);
        return;
      }

      setRoom(res.data);
      setMyColor(res.data.your_color);
      setCurrentTurn(res.data.turn);

      const timeControl = res.data.time_control || "5+0";
      const [baseMinutes] = timeControl.split("+").map(Number);
      const initialTime = baseMinutes * 60;

      setTimers({ white: initialTime, black: initialTime });

      const initialBoard = [];
      for (let row = 0; row < 8; row++) {
        const r = [];
        for (let col = 0; col < 8; col++) {
          if ((row + col) % 2 === 1) {
            if (row < 3) r.push("black");
            else if (row > 4) r.push("white");
            else r.push(null);
          } else {
            r.push(null);
          }
        }
        initialBoard.push(r);
      }

      setBoard(initialBoard);
    });

    ws.current = new WebSocket(`ws://localhost:8000/ws/room/${roomCode}`);
    ws.current.onmessage = (event) => {
      const newBoard = JSON.parse(event.data);
      setBoard(newBoard.board);
      setCurrentTurn(newBoard.turn);
      setSelectedCell(null);
      setMustContinueCapture(false);
    };

    return () => ws.current?.close();
  }, [roomCode]);



  useEffect(() => {
    api.get("/me").then((res) => setMyUserId(res.data.user_id)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!myUserId || !room) return;
    const opponentId = myUserId === room.creator_id ? room.opponent_id : room.creator_id;
    if (opponentId) {
      api.get(`/user/${opponentId}`)
        .then((res) => setOpponentInfo(res.data))
        .catch(() => {});
    }
  }, [myUserId, room]);

  const finishGame = (winner, reason = "default") => {
    console.log("🎯 Финишная функция вызвана с winner:", winner);
    let message = winner === myColor ? "Вы победили!" : "Вы проиграли...";
    if (reason === "timeout") {
      message += " Время вышло.";
    } else if (reason === "no_pieces") {
      message += " У соперника закончились шашки.";
    }

    setGameResult({ winner, reason, message });
    api.post(`/rooms/${roomCode}/finish`, winner, {
      headers: {
        "Content-Type": "application/json"
      }
    })
      .then(() => console.log("🏁 Победа отправлена на сервер:", winner))
      .catch((err) => console.error("❌ Ошибка при отправке победы", err));
    clearInterval(intervalId);
  };


  useEffect(() => {
    clearInterval(intervalId);
    const id = setInterval(() => {
      setTimers((prev) => {
        const updated = { ...prev };
        updated[currentTurn] = Math.max(updated[currentTurn] - 1, 0);

        if (updated[currentTurn] === 0) {
          const winner = currentTurn === "white" ? "black" : "white";
          finishGame(winner, "timeout");
        }



        return updated;
      });
    }, 1000);
    setIntervalId(id);
    return () => clearInterval(id);
  }, [currentTurn]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isKing = (piece) => piece?.includes("_king");
  const getColor = (piece) => piece?.split("_")[0];

  const getDiagonalPath = (fromRow, fromCol, toRow, toCol) => {
    const path = [];
    const dRow = toRow > fromRow ? 1 : -1;
    const dCol = toCol > fromCol ? 1 : -1;
    let r = fromRow + dRow;
    let c = fromCol + dCol;
    while (r !== toRow && c !== toCol) {
      if (r < 0 || r >= 8 || c < 0 || c >= 8) break;
      path.push([r, c]);
      r += dRow;
      c += dCol;
    }
    return path;
  };

  const getAvailableCaptures = (row, col, board, piece) => {
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    const captures = [];
    const myColor = getColor(piece);

    for (const [dr, dc] of directions) {
      const enemyRow = row + dr;
      const enemyCol = col + dc;
      const landRow = row + 2 * dr;
      const landCol = col + 2 * dc;

      if (
        enemyRow < 0 || enemyRow >= 8 ||
        enemyCol < 0 || enemyCol >= 8 ||
        landRow < 0 || landRow >= 8 ||
        landCol < 0 || landCol >= 8
      ) continue;

      const middlePiece = board[enemyRow][enemyCol];
      const landing = board[landRow][landCol];

      if (
        middlePiece &&
        getColor(middlePiece) !== myColor &&
        landing === null
      ) {
        captures.push([landRow, landCol]);
      }
    }

    if (isKing(piece)) {
      for (const [dr, dc] of directions) {
        let r = row + dr;
        let c = col + dc;
        let enemyFound = false;

        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
          const current = board[r][c];

          if (!current) {
            if (enemyFound) captures.push([r, c]);
          } else if (getColor(current) !== myColor) {
            if (enemyFound) break;
            enemyFound = true;
          } else {
            break;
          }

          r += dr;
          c += dc;
        }
      }
    }

    return captures;
  };


  const isValidMove = (fromRow, fromCol, toRow, toCol, board, piece) => {
    const path = getDiagonalPath(fromRow, fromCol, toRow, toCol);
    if (board[toRow][toCol] !== null) return false;
    if (!isKing(piece) && path.length === 1) {
      const dr = toRow - fromRow;
      return (piece.startsWith("white") && dr === -1) || (piece.startsWith("black") && dr === 1);
    }
    return path.every(([r, c]) => board[r][c] === null);
  };

  const handleClick = (row, col) => {
    const isSelected = selectedCell?.[0] === row && selectedCell?.[1] === col;


    if (currentTurn !== myColor) return;

    const piece = board[row][col];
    const mustCapture = hasCaptureAnywhere(myColor);

    if (selectedCell) {
      const [fromRow, fromCol] = selectedCell;
      const movingPiece = board[fromRow][fromCol];

      const path = getDiagonalPath(fromRow, fromCol, row, col);
      const middle = path.find(([r, c]) => board[r][c]);
      const captured = middle && getColor(board[middle[0]][middle[1]]) !== getColor(movingPiece);

      if (captured) {
        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = movingPiece;
        newBoard[fromRow][fromCol] = null;
        newBoard[middle[0]][middle[1]] = null;

        if ((row === 0 && myColor === "white") || (row === 7 && myColor === "black")) {
          newBoard[row][col] = getColor(movingPiece) + "_king";
        }

        const more = getAvailableCaptures(row, col, newBoard, newBoard[row][col]);
        setBoard(newBoard);

        const winner = checkGameOver(newBoard);
        if (winner) {
          finishGame(winner, "no_pieces");
          return;
        }


        if (more.length > 0) {
          setSelectedCell([row, col]);
          setMustContinueCapture(true);
        } else {
          const next = myColor === "white" ? "black" : "white";
          setSelectedCell(null);
          setMustContinueCapture(false);
          setCurrentTurn(next);
          ws.current?.send(JSON.stringify({ board: newBoard, turn: next }));
        }
      } else if (!mustContinueCapture && !mustCapture && isValidMove(fromRow, fromCol, row, col, board, movingPiece)) {
        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = movingPiece;
        newBoard[fromRow][fromCol] = null;

        if ((row === 0 && myColor === "white") || (row === 7 && myColor === "black")) {
          newBoard[row][col] = getColor(movingPiece) + "_king";
        }

        const next = myColor === "white" ? "black" : "white";
        setBoard(newBoard);
        const winner = checkGameOver(newBoard);
        if (winner) {
          finishGame(winner);
          return;
        }
        setSelectedCell(null);
        setCurrentTurn(next);
        ws.current?.send(JSON.stringify({ board: newBoard, turn: next }));
      } else {
        setSelectedCell(null);
      }
    } else if (piece && getColor(piece) === myColor) {
      const captures = getAvailableCaptures(row, col, board, piece);
      if (mustCapture && captures.length === 0) return;
      setSelectedCell([row, col]);
    }
  };


  const hasCaptureAnywhere = (color) => {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && getColor(piece) === color) {
          const captures = getAvailableCaptures(r, c, board, piece);
          if (captures.length > 0) return true;
        }
      }
    }
    return false;
  };

  const checkGameOver = (newBoard) => {
    const pieces = { white: 0, black: 0 };

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = newBoard[row][col];
        if (piece) {
          const color = getColor(piece);
          pieces[color]++;
        }
      }
    }

    if (pieces.white === 0) return "black";
    if (pieces.black === 0) return "white";
    return null;
  };



  if (!room) return <div>Загрузка...</div>;

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>Шашки: комната {roomCode}</h2>
      <div className="info-panel">
        <p><strong>Тип:</strong> Шашки</p>
        <p><strong>Цвет:</strong> {myColor}</p>
        <p><strong>Ход:</strong> {currentTurn}</p>
        <p><strong>Контроль времени:</strong> {room.time_control}</p>
      </div>

      {gameResult && (
        <div className="mt-4 text-xl font-bold text-green-700">
          {gameResult.message}
        </div>
      )}

      {opponentInfo && opponentId && (
        <Link to={`/user/${opponentId}`} className="opponent-card">
          <img
            src={
              opponentInfo.photo_link
                ? `http://localhost:8000${opponentInfo.photo_link}`
                : "https://via.placeholder.com/50"
            }
            alt="Аватар"
            className="opponent-avatar"
          />
          <div className="opponent-name">👤 {opponentInfo.user_name}</div>
          <div style={{ fontSize: "0.9rem", marginTop: "0.2rem" }}>
            <p>♟️ <strong>Шахматный рейтинг:</strong> {opponentInfo.chess_rate}</p>
            <p>🟫 <strong>Шашечный рейтинг:</strong> {opponentInfo.checkers_rate}</p>
          </div>
        </Link>
      )}


      <p>Вы играете за: <strong>{myColor}</strong></p>
      <p>Ход: <strong>{currentTurn}</strong></p>
      <p>⏱️ Таймер: Белые — {formatTime(timers.white)} | Черные — {formatTime(timers.black)}</p>

      <div className="checkers-board">
        {(myColor === "black" ? [...board].slice().reverse() : board).map((rowArray, rowIndex) => {
          return (myColor === "black" ? [...rowArray].slice().reverse() : rowArray).map((piece, colIndex) => {
            const realRow = myColor === "black" ? 7 - rowIndex : rowIndex;
            const realCol = myColor === "black" ? 7 - colIndex : colIndex;

            const isSelected = selectedCell?.[0] === realRow && selectedCell?.[1] === realCol;
            const isDark = (rowIndex + colIndex) % 2 === 1;

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`cell ${isDark ? "dark" : "light"} ${isSelected ? "selected" : ""}`}
                onClick={() => handleClick(realRow, realCol)}
              >
                {board[realRow][realCol] && (
                  <div
                    className={`piece ${getColor(board[realRow][realCol])} ${
                      isKing(board[realRow][realCol]) ? "king" : ""
                    }`}
                  />
                )}
              </div>
            );
          });
        })}
      </div>



      <button
        onClick={async () => {
          try {
            await api.delete(`/rooms/${roomCode}`);
          } catch (err) {
            if (err.response?.status !== 404) {
              alert("Ошибка при выходе из комнаты");
              return;
            }
          }
          navigate("/");
        }}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
      >
        Выйти
      </button>
    </div>
  );
}
