import React, { useState } from "react";
import api from "../api";

export default function Login({ onClose, onLoginSuccess }) {
  const [formData, setFormData] = useState({
    user_login: "",
    user_password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    localStorage.removeItem("token");

    try {
      const response = await api.post("/login", formData);

      if (response.data && response.data.access_token) {
        localStorage.setItem("token", response.data.access_token);

        const userResponse = await api.get("/me");

        onLoginSuccess(userResponse.data);

        alert("Вы успешно вошли!");
        onClose();
      } else {
        alert("Не удалось получить токен.");
      }
    } catch (err) {
      alert("Ошибка авторизации: " + (err.response?.data?.detail || "Что-то пошло не так"));
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-modal">
        <button className="close-btn" onClick={onClose}>✖</button>
        <h2>Войти в аккаунт</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="user_login">Логин:</label>
            <input
              type="text"
              id="user_login"
              name="user_login"
              value={formData.user_login}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="user_password">Пароль:</label>
            <input
              type="password"
              id="user_password"
              name="user_password"
              value={formData.user_password}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="login-btn">Войти</button>
        </form>
      </div>
    </div>
  );
}
