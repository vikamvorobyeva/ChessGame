import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api";

export default function ChatView() {
  const { userId } = useParams();
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [opponent, setOpponent] = useState(null);

  useEffect(() => {
    let polling;

    const init = async () => {
      await loadMessages();
      api.get("/me").then(res => setCurrentUser(res.data)).catch(() => {});
      api.get(`/user/${userId}`).then(res => setOpponent(res.data)).catch(() => {});

      polling = setInterval(loadMessages, 1000);
    };

    init();

    return () => clearInterval(polling);
  }, [userId]);


  const loadMessages = async () => {
    try {
      const res = await api.get(`/chat/${userId}`);
      setMessages(res.data);
    } catch (err) {
      console.error("Ошибка загрузки сообщений:", err);
    }
  };

  const handleSend = async () => {
    if (!content.trim()) return;

    await api.post("/chat/send", {
      receiver_id: userId,
      content,
    });

    setContent("");
    await loadMessages();
  };

  const handleClearChat = async () => {
    if (!window.confirm("Вы уверены, что хотите удалить весь чат?")) return;

    try {
      await api.post(`/chat/clear`, { receiver_id: userId });
      setMessages([]);
    } catch (err) {
      alert("Ошибка при удалении чата");
    }
  };

  const renderMessage = (msg) => {
    const isMine = msg.sender_id === currentUser?.user_id;
    const senderName = isMine ? currentUser.user_name : opponent?.user_name;

    return (
      <div
        key={msg.id}
        style={{
          display: "flex",
          justifyContent: isMine ? "flex-end" : "flex-start",
          marginBottom: "0.5rem",
        }}
      >
        <div
          style={{
            background: isMine ? "#4CAF50" : "#333",
            color: "white",
            padding: "0.6rem 1rem",
            borderRadius: "1rem",
            maxWidth: "70%",
          }}
        >
          <strong>{senderName || "..."}</strong>
          <div style={{ marginTop: "0.3rem" }}>{msg.content}</div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: "1rem", maxWidth: "700px", margin: "0 auto" }}>
      <h2>💬 Чат с {opponent?.user_name || "игроком"}</h2>

      <div
        style={{
          margin: "1rem 0",
          minHeight: "250px",
          backgroundColor: "#1f1f1f",
          borderRadius: "10px",
          padding: "1rem",
          maxHeight: "400px",
          overflowY: "auto",
        }}
      >
        {messages.map(renderMessage)}
      </div>

      <textarea
        rows="3"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="Напишите сообщение..."
        style={{
          width: "100%",
          marginBottom: "0.5rem",
          padding: "0.5rem",
          borderRadius: "6px",
        }}
      />


      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button onClick={handleSend} className="bg-blue-600 text-white px-4 py-2 rounded">
          📤 Отправить
        </button>
        <button onClick={handleClearChat} className="bg-red-600 text-white px-4 py-2 rounded">
          🧹 Очистить чат
        </button>
        <Link
          to={`/user/${userId}`}
          className="bg-gray-600 text-white px-4 py-2 rounded text-center"
        >
          ⬅️ Назад к профилю
        </Link>
      </div>
    </div>
  );
}
