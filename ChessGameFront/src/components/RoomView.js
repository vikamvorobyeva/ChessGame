import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import "./RoomView.css";

export default function RoomView() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [loading, setLoading] = useState(true);
  const [orientation, setOrientation] = useState("white");
  const [whiteTime, setWhiteTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);
  const [currentTurn, setCurrentTurn] = useState("white");
  const [game, setGame] = useState(new Chess());
  const [position, setPosition] = useState("start");
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [opponentInfo, setOpponentInfo] = useState(null);
  const ws = useRef(null);

  const [boardColors, setBoardColors] = useState({
    lightSquareStyle: { backgroundColor: "#f0d9b5" },
    darkSquareStyle: { backgroundColor: "#b58863" },
  });

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "dark";
    setTheme(saved);

    document.documentElement.classList.remove("light", "dark");
    document.body.classList.remove("light", "dark");

    document.documentElement.classList.add(saved);
    document.body.classList.add(saved);
    document.body.classList.add("match-room");
  }, []);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await api.get(`/rooms/${roomCode}`);
        setRoom(res.data);
        const userId = res.data.user_id;
        localStorage.setItem("my_user_id", userId);
        setMyUserId(userId);

        const [base] = res.data.time_control.split("+").map(Number);
        setWhiteTime(base * 60);
        setBlackTime(base * 60);

        setOrientation(res.data.your_color);
        sessionStorage.setItem(`player-color-${roomCode}`, res.data.your_color);

        if (res.data.fen && res.data.joined) {
          const newGame = new Chess(res.data.fen);
          setGame(newGame);
          setPosition(newGame.fen());
          setCurrentTurn(newGame.turn() === "w" ? "white" : "black");
        }

        setLoading(false);
      } catch (err) {
        console.error("Ошибка запроса:", err);
        setLoading(false);
      }
    };

    fetchRoom();

    ws.current = new WebSocket(`ws://localhost:8000/ws/room/${roomCode}`);
    ws.current.onmessage = (event) => {
      const fen = event.data;
      const newGame = new Chess(fen);
      setGame(newGame);
      setPosition(fen);
      setCurrentTurn(newGame.turn() === "w" ? "white" : "black");

      if (newGame.isGameOver()) {
        setGameOver(true);
        if (newGame.isCheckmate()) {
          const winner = newGame.turn() === "w" ? "Black" : "White";
          setGameResult(`${winner} wins by checkmate`);
        } else {
          setGameResult("Draw");
        }
      }
    };

    return () => ws.current?.close();
  }, [roomCode]);


  useEffect(() => {
    if (!room || !room.joined || gameOver) return;
    const timer = setInterval(() => {
      setWhiteTime((tWhite) => {
        if (currentTurn === "white" && tWhite > 0) {
          const newTime = tWhite - 1;
          if (newTime === 0 && !gameOver) {
            setGameOver(true);
            setGameResult("Black wins by timeout");
            finishGame("black");
          }
          return newTime;
        }
        return tWhite;
      });

      setBlackTime((tBlack) => {
        if (currentTurn === "black" && tBlack > 0) {
          const newTime = tBlack - 1;
          if (newTime === 0 && !gameOver) {
            setGameOver(true);
            setGameResult("White wins by timeout");
            finishGame("white");
          }
          return newTime;
        }
        return tBlack;
      });
    }, 1000);
     return () => clearInterval(timer);
  }, [room, currentTurn, gameOver]);

  useEffect(() => {
    if (!myUserId || !room) return;
    const opponentId = myUserId === room.creator_id ? room.opponent_id : room.creator_id;
    if (opponentId) {
      api.get(`/user/${opponentId}`).then((res) => setOpponentInfo(res.data)).catch(() => {});
    }
  }, [myUserId, room]);

  useEffect(() => {
    const lightColor = getComputedStyle(document.documentElement).getPropertyValue('--light-square') || "#f0d9b5";
    const darkColor = getComputedStyle(document.documentElement).getPropertyValue('--dark-square') || "#b58863";

    setBoardColors({
      lightSquareStyle: { backgroundColor: lightColor.trim() },
      darkSquareStyle: { backgroundColor: darkColor.trim() },
    });
  }, [theme]);


  const finishGame = async (winner) => {
    try {
      await api.post(`/rooms/${roomCode}/finish`, { winner });
      console.log("Результат отправлен на сервер:", winner);
    } catch (err) {
      console.error("Ошибка при отправке результата:", err);
      console.error("Ошибка при отправке результата:", err);
    }
  };


  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleDrop = async (source, target) => {
    const playerColor = sessionStorage.getItem(`player-color-${roomCode}`);
    const piece = game.get(source);

    if (!piece ||
        (playerColor === "white" && piece.color !== "w") ||
        (playerColor === "black" && piece.color !== "b") ||
        (playerColor === "white" && game.turn() !== "w") ||
        (playerColor === "black" && game.turn() !== "b")) {
      return false;
    }

    let move;
    try {
      move = game.move({ from: source, to: target, promotion: "q" });
    } catch (e) {
      return false;
    }

    if (move) {
      const newFen = game.fen();
      setGame(new Chess(newFen));
      setPosition(newFen);
      setCurrentTurn(game.turn() === "w" ? "white" : "black");

      try {
        await api.post(`/rooms/${roomCode}/fen`, newFen);
        ws.current?.send(newFen);
      } catch (err) {
        console.error("Ошибка при отправке FEN:", err);
      }
        if (game.isGameOver()) {
    setGameOver(true);

        if (game.isCheckmate()) {
          const winner = game.turn() === "w" ? "black" : "white";
          setGameResult(`${winner === "white" ? "White" : "Black"} wins by checkmate`);
          await finishGame(winner);
        } else {
          setGameResult("Draw");
          await finishGame("draw");
        }
      }

      return true;
    }
  };

  const handleExit = async () => {
    try {
      await api.delete(`/rooms/${roomCode}`);
    } catch (err) {
      console.error("Ошибка удаления комнаты:", err);
    }
    navigate("/");
  };

  if (loading) return <p className="text-white text-center">Загрузка комнаты...</p>;
  if (!room) return <p className="text-white text-center">Комната не найдена</p>;

  if (!room.joined) {
    return (
      <div className="room-view-container text-white text-center mt-10">
        <h2 className="text-2xl font-bold">Комната: {roomCode}</h2>
        <p className="mt-4 text-lg animate-pulse">⏳ Ожидание второго игрока...</p>
      </div>
    );
  }

  const opponentId = myUserId === room.creator_id ? room.opponent_id : room.creator_id;


  return (
    <div className="room-view-container text-white text-center mt-10">
      <div className="flex flex-col items-center mb-4">
        <h2 className="text-2xl font-bold">Комната: {roomCode}</h2>
        <div className="info-panel my-2">
          <p><strong>Тип:</strong> {room.is_chess ? "Шахматы" : "Шашки"}</p>
          <p><strong>Цвет:</strong> {room.color}</p>
          <p><strong>Контроль времени:</strong> {room.time_control}</p>
        </div>
        {opponentInfo && (
          <Link to={`/user/${opponentId}`} className="opponent-card">
            <img
              src={
                opponentInfo.photo_link
                  ? `http://localhost:8000${opponentInfo.photo_link}`
                  : "https://via.placeholder.com/50"
              }
              alt="Аватар соперника"
              className="opponent-avatar"
            />
            <div className="opponent-name">👤 {opponentInfo.user_name}</div>
            <div style={{ fontSize: "0.9rem", marginTop: "0.2rem" }}>
              <p>♟️ <strong>Шахматный рейтинг:</strong> {opponentInfo.chess_rate}</p>
              <p>🟫 <strong>Шашечный рейтинг:</strong> {opponentInfo.checkers_rate}</p>
            </div>
          </Link>
        )}
      </div>

      {gameOver && (
        <div className="mb-4 p-4 bg-green-800 rounded-lg">
          <h3 className="text-xl font-semibold">🎉 Игра завершена!</h3>
          <p className="text-lg">Результат: {gameResult}</p>
          {opponentId && (
            <div className="mt-3">
              <Link to={`/user/${opponentId}`} className="text-blue-300 underline">
                Профиль соперника
              </Link>
              <button
                onClick={async () => {
                  try {
                    await api.post("/friends/add", { friend_id: opponentId });
                    alert("Добавлено в друзья!");
                  } catch (err) {
                    alert(err.response?.data?.detail || "Ошибка добавления");
                  }
                }}
                className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                ➕ Добавить в друзья
              </button>
            </div>
          )}
          <button
            onClick={handleExit}
            className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
          >
            Выйти
          </button>
        </div>
      )}

      <div className="chess-container">
        <div className="timer">{formatTime(whiteTime)} ⬅️ Белые</div>
        <div className="chessboard-wrapper">
          <Chessboard
            boardOrientation={orientation}
            boardWidth={360}
            position={position}
            onPieceDrop={handleDrop}
            arePiecesDraggable={!gameOver}
            isDraggablePiece={({ piece }) => {
              const playerColor = sessionStorage.getItem(`player-color-${roomCode}`);
              return !gameOver && ((playerColor === "white" && piece.startsWith("w")) ||
                                    (playerColor === "black" && piece.startsWith("b")));
            }}
            lightSquareStyle={boardColors.lightSquareStyle}
            darkSquareStyle={boardColors.darkSquareStyle}
          />
        </div>
        <div className="timer">Чёрные ➡️ {formatTime(blackTime)}</div>
      </div>
      <button
        onClick={handleExit}
        className="mt-6 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
      >
        🚪 Выйти из комнаты
      </button>
    </div>
  );
}
