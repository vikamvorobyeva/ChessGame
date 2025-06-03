import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";
import "./ProfileView.css";

export default function ProfileViewUser() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingFriend, setAddingFriend] = useState(false);
  const [friendIds, setFriendIds] = useState([]);
  const [userFriends, setUserFriends] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    api.get(`/user/${userId}`)
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    api.get("/me")
      .then(res => {
        setCurrentUserId(res.data.user_id);
        return api.get("/friends/ids");
      })
      .then(res => setFriendIds(res.data.friend_ids))
      .catch(() => setFriendIds([]));

    api.get(`/user/${userId}/friends`)
      .then(res => setUserFriends(res.data))
      .catch(() => setUserFriends([]));
  }, [userId]);

  const handleAddFriend = async () => {
    setAddingFriend(true);
    try {
      await api.post("/friends/add", { friend_id: userId });
      alert("🎉 Пользователь добавлен в друзья!");
      setFriendIds([...friendIds, userId]);
    } catch (err) {
      alert(err.response?.data?.detail || "Ошибка при добавлении");
    } finally {
      setAddingFriend(false);
    }
  };

  const handleRemoveFriend = async () => {
    try {
      await api.post("/friends/remove", { friend_id: userId });
      alert("Пользователь удалён из друзей");
      setFriendIds(friendIds.filter(id => id !== userId));
    } catch (err) {
      alert("Ошибка при удалении");
    }
  };

  if (loading) return <p className="profile-container">Загрузка профиля...</p>;
  if (!user) return <div className="profile-container">Пользователь не найден</div>;

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
      <p><strong>О себе:</strong> {user.about?.trim() || "—"}</p>

      {currentUserId !== userId && (
        <>
          {friendIds.includes(userId) ? (
            <button
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 mt-4"
              onClick={handleRemoveFriend}
            >
              ❌ Удалить из друзей
            </button>
          ) : (
            <button
              onClick={handleAddFriend}
              disabled={addingFriend}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 mt-4"
            >
              ➕ Добавить в друзья
            </button>
          )}

          <Link
            to={`/chat/${userId}`}
            className="block mt-3 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-center"
          >
            💬 Написать сообщение
          </Link>
        </>
      )}

      <div style={{ marginTop: "2rem" }}>
        <h3 className="text-xl font-semibold mb-2">👥 Друзья:</h3>
        {userFriends.length === 0 ? (
          <p>Нет друзей</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {userFriends.map(friend => (
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

      <div style={{ marginTop: "1.5rem" }}>
        <Link
          to="/"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          ⬅️ Назад
        </Link>
      </div>
    </div>
  );
}
