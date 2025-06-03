import React from "react";
import ReactDOM from "react-dom/client";
import MainApp from "./App";
import "./style.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('❌ Root element с id "root" не найден в index.html!');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <MainApp />
  </React.StrictMode>
);

console.log("✅ Приложение успешно запущено!");
