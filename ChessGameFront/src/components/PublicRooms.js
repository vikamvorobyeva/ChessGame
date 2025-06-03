import "./PublicRooms.css";
import React, { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

const PublicRooms = ({ refreshFlag }) => {
  const [rooms, setRooms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchRooms() {
      try {
        const res = await api.get("/rooms/");
        const all = [...res.data.chess, ...res.data.draughts];
        const publicRooms = all.filter((r) => r.is_public);
        setRooms(publicRooms);
      } catch (err) {
        console.error("Ошибка загрузки комнат:", err);
      }
    }

    fetchRooms();
  }, [refreshFlag]);

  const joinRoom = async (code) => {
    try {
      await api.post("/rooms/join/", {
        room_code: code,
        room_password: "",
      });

      const res = await api.get(`/rooms/${code}`);
      const isChess = res.data.is_chess;

      sessionStorage.setItem(`player-color-${code}`, res.data.your_color);
      localStorage.setItem("my_user_id", res.data.creator_id || res.data.opponent_id);

      navigate(isChess ? `/room/${code}` : `/room-checkers/${code}`);


    } catch (err) {
      alert("Ошибка входа в комнату");
    }
  };



  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-white mb-6 text-center">
        ✨ Публичные комнаты
      </h2>
      <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
        {rooms.length === 0 ? (
          <p className="text-gray-400 col-span-full text-center">
            Нет доступных комнат
          </p>
        ) : (
          rooms.map((room) => (
            <div
              key={room.room_code}
              className="room-card text-white"
            >
              <h3 className="text-lg font-semibold mb-2">
                Комната <span className="text-indigo-400">{room.room_code}</span>
              </h3>
              <div className="info">
                <p>
                  <strong>Игра:</strong> {room.is_chess ? "Шахматы" : "Шашки"}
                </p>
                <p>
                  <strong>Цвет:</strong> {room.color}
                </p>
                <p>
                  <strong>Контроль:</strong> {room.time_control || "—"}
                </p>
              </div>
              <button
                className="join-btn mt-4 w-full"
                onClick={() => joinRoom(room.room_code)}
              >
                Присоединиться
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PublicRooms;
