import React, { useState, useEffect } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function RoomCreate({ onClose, onRoomCreated }) {
  const [gameType, setGameType] = useState("chess");
  const [color, setColor] = useState("random");
  const [roomPassword, setRoomPassword] = useState("");
  const [timeControl, setTimeControl] = useState("5+3");
  const [isPublic, setIsPublic] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState(null);

  const navigate = useNavigate();

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      const response = await api.post("/rooms/create/", {
        is_chess: gameType === "chess",
        color,
        room_password: roomPassword || null,
        time_control: timeControl,
        is_public: isPublic,
      });

      const newRoomCode = response.data.room_code;
      setCreatedRoomCode(newRoomCode);

      if (onRoomCreated) {
        onRoomCreated(newRoomCode);
      }
    } catch (error) {
      alert("Ошибка создания комнаты");
      console.error(error.response?.data || error.message);
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (createdRoomCode) {
      try {
        await api.delete(`/rooms/${createdRoomCode}`);
      } catch (err) {
        console.warn("Ошибка удаления комнаты:", err.message);
      }
    }
    setIsLoading(false);
    setCreatedRoomCode(null);
    onClose();
  };

  useEffect(() => {
    if (!createdRoomCode) return;

    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/rooms/${createdRoomCode}`);
        if (response.data.joined) {
          clearInterval(interval);
          navigate(`/room/${createdRoomCode}`);
        }
      } catch (err) {
        console.error("Ошибка проверки подключения:", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [createdRoomCode, navigate]);

  return (
    <div className="room-create-overlay">
      {isLoading && createdRoomCode ? (
        <div className="loading-overlay">
          <div className="spinner-box">
            <div className="spinner">Ожидание подключения второго игрока...</div>
            <button className="cancel-btn mt-4" onClick={handleCancel}>
              Отменить
            </button>
          </div>
        </div>
      ) : (
        <div className="room-create-modal">
          <button className="close-btn" onClick={onClose} disabled={isLoading}>
            ×
          </button>
          <h2>Создать новую комнату</h2>

          <div className="input-group">
            <label>Тип игры</label>
            <select value={gameType} onChange={(e) => setGameType(e.target.value)} disabled={isLoading}>
              <option value="chess">Шахматы</option>
              <option value="checkers">Шашки</option>
            </select>
          </div>

          <div className="input-group">
            <label>Цвет</label>
            <select value={color} onChange={(e) => setColor(e.target.value)} disabled={isLoading}>
              <option value="random">Случайный</option>
              <option value="white">Белые</option>
              <option value="black">Чёрные</option>
            </select>
          </div>

          <div className="input-group">
            <label>Контроль времени</label>
            <select value={timeControl} onChange={(e) => setTimeControl(e.target.value)} disabled={isLoading}>
              <option value="1+0">1+0</option>
              <option value="3+2">3+2</option>
              <option value="5+3">5+3</option>
              <option value="10+0">10+0</option>
            </select>
          </div>


          <div className="buttons-container">
            <button className="create-btn" onClick={handleCreate} disabled={isLoading}>
              Создать
            </button>
            <button className="cancel-btn" onClick={onClose} disabled={isLoading}>
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
