import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const Rooms = () => {
  const [chessRooms, setChessRooms] = useState([]);
  const [draughtsRooms, setDraughtsRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/rooms/");
      setChessRooms(response.data.chess);
      setDraughtsRooms(response.data.draughts);
    } catch (error) {
      console.error("Ошибка при загрузке комнат:", error.response?.data || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleJoin = (roomCode) => {
    navigate(`/room/${roomCode}`);
  };

  const RoomCard = ({ room }) => (
    <div className="bg-gray-700 p-4 rounded mb-3">
      <div><strong>Код комнаты:</strong> {room.room_code}</div>
      <div><strong>Цвет:</strong> {room.color}</div>
      <div><strong>Контроль времени:</strong> {room.time_control || "не указан"}</div>
      <button
        className="mt-2 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
        onClick={() => handleJoin(room.room_code)}
      >
        Присоединиться
      </button>
    </div>
  );

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">🔓 Публичные комнаты</h2>

      <div className="text-center mb-6">
        <button
          onClick={fetchRooms}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          disabled={isLoading}
        >
          {isLoading ? "Обновление..." : "🔄 Обновить список"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-xl font-semibold text-purple-400 mb-3">♟️ Шахматы</h3>
          {chessRooms.length > 0 ? (
            chessRooms.map((room) => <RoomCard key={room.id} room={room} />)
          ) : (
            <p className="text-gray-400">Нет доступных комнат</p>
          )}
        </div>

        <div>
          <h3 className="text-xl font-semibold text-orange-400 mb-3">⚪ Шашки</h3>
          {draughtsRooms.length > 0 ? (
            draughtsRooms.map((room) => <RoomCard key={room.id} room={room} />)
          ) : (
            <p className="text-gray-400">Нет доступных комнат</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Rooms;
