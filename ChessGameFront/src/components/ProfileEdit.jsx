import React, { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

const ProfileEdit = () => {
  const [about, setAbout] = useState("");
  const [photo, setPhoto] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/me")
      .then(res => setAbout(res.data.about || ""))
      .catch(() => alert("Ошибка загрузки профиля"));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put("/me", { about });

      if (photo) {
        const formData = new FormData();
        formData.append("file", photo);
        await api.post("/upload-photo", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }

      alert("Профиль обновлён");
      navigate("/profile");
    } catch (err) {
      alert("Ошибка обновления профиля");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>✏️ Редактировать профиль</h2>
      <form onSubmit={handleSubmit}>
        <label>О себе:</label><br />
        <textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          rows={5}
          style={{ width: "100%", maxWidth: "400px" }}
        /><br /><br />

        <label>Загрузить фото:</label><br />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files[0])}
        /><br /><br />

        <button type="submit">💾 Сохранить</button>
      </form>
    </div>
  );
};

export default ProfileEdit;
