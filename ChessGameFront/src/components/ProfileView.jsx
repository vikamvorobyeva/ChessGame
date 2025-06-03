import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import "./ProfileView.css";

const ProfileView = () => {
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    api.get("/me")
      .then((res) => setUser(res.data))
      .catch((err) => {
        console.error("Ошибка загрузки профиля:", err);
        setUser(null);
      });

    api.get("/friends")
      .then((res) => setFriends(res.data))
      .catch(() => setFriends([]));
  }, []);

  if (!user) {
    return <div className="profile-container">Профиль не найден</div>;
  }

  return (
    <div className="profile-container">
      <h2>👤 Профиль игрока</h2>
      <img
        src={
          user.photo_link
            ? `http://localhost:8000${user.photo_link}`
            : "https://via.placeholder.com/100"
        }
        alt="Аватар"
        className="profile-avatar"
      />
      <p><strong>Имя:</strong> {user.user_name}</p>
      <p><strong>Логин:</strong> {user.user_login}</p>
      <p><strong>Шахматный рейтинг:</strong> {user.chess_rate}</p>
      <p><strong>Шашечный рейтинг:</strong> {user.checkers_rate}</p>
      <p><strong>Побед:</strong> {user.win_count}</p>
      <p><strong>Всего игр:</strong> {user.game_count}</p>
      <p><strong>Онлайн:</strong> {user.is_online ? "🟢 Онлайн" : "🔴 Оффлайн"}</p>
      <p><strong>О себе:</strong> {user.about?.trim() ? user.about : "—"}</p>

      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-2">👥 Мои друзья:</h3>
        {friends.length === 0 ? (
          <p>У вас пока нет друзей</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {friends.map(friend => (
              <Link
                key={friend.user_id}
                to={`/user/${friend.user_id}`}
                className="flex items-center gap-3 p-2 bg-gray-800 rounded hover:bg-gray-700"
              >
                <img
                  src={friend.photo_link ? `http://localhost:8000${friend.photo_link}` : "https://via.placeholder.com/40"}
                  alt="Аватар"
                  className="rounded-full"
                  style={{ width: "40px", height: "40px" }}
                />
                <span className="text-blue-300 underline">{friend.user_name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
        <Link
          to="/"
          style={{
            fontSize: "1rem",
            backgroundColor: "#2196F3",
            color: "white",
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            textDecoration: "none"
          }}
        >
          🏠 На главную
        </Link>

        <Link
          to="/profile/edit"
          style={{
            fontSize: "1rem",
            backgroundColor: "#4CAF50",
            color: "white",
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            textDecoration: "none"
          }}
        >
          ✏️ Редактировать профиль
        </Link>
      </div>
    </div>
  );
};

export default ProfileView;
