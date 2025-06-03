import React from "react";
import "./WaitingModal.css";

export default function WaitingModal({ onCancel }) {
  return (
    <div className="waiting-modal-overlay">
      <div className="waiting-modal">
        <h2>⏳ Ожидание соперника...</h2>
        <p>Игра начнётся, как только подключится другой игрок.</p>
        <button className="cancel-button" onClick={onCancel}>❌ Отменить поиск</button>
      </div>
    </div>
  );
}
