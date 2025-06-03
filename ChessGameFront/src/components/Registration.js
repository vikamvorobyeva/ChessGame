import React, { useState } from "react";
import api from "../api";

export default function Registration({ onClose }) {
  const [formData, setFormData] = useState({
    user_name: "",
    user_login: "",
    user_password: "",
  });

  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setAvatar(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    if (file) {
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

  const data = {
    user_name: formData.user_name,
    user_login: formData.user_login,
    user_password: formData.user_password,
  };


    try {
      const response = await api.post("/register/", data);
      console.log("Успешная регистрация:", response.data);
      alert("Регистрация прошла успешно!");
      onClose();
    } catch (err) {
      console.error("Ошибка при регистрации:", err);
      setError(err.response?.data?.detail || [{ msg: "Что-то пошло не так" }]);
    }
  };

  return (
    <div className="registration-overlay">
      <div className="registration-modal">
        <button className="close-btn" onClick={onClose}>✖</button>
        <h2>Создать аккаунт</h2>

        <div className="avatar-upload">
          <label htmlFor="avatar-input">
            <div className="avatar-preview">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Аватар" />
              ) : (
                <span>+</span>
              )}
            </div>
          </label>
          <input
            id="avatar-input"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="user_name">Имя пользователя:</label>
            <input
              type="text"
              id="user_name"
              name="user_name"
              value={formData.user_name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="user_login">Логин (email):</label>
            <input
              type="email"
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

          {error && (
            <div className="error-message">
              {Array.isArray(error)
              ? error.map((errItem, i) => <div key={i}>{errItem.msg}</div>)
              : error}
            </div>
          )}


          <button type="submit" className="register-btn">Зарегистрироваться</button>
        </form>
      </div>
    </div>
  );
}
