import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import './style.css';
import Registration from "./components/Registration";
import Login from "./components/Login"
import RoomCreate from "./components/RoomCreate";
import PlayWithAI from "./components/PlayWithAI";
import logo from './ChessRabbitLogo.png';
import ChessPuzzles from "./components/ChessPuzzles";
import PlayLocal from "./components/PlayLocal";
import api from "./api";
import ProfileView from "./components/ProfileView";
import ProfileEdit from "./components/ProfileEdit";
import PublicRooms from "./components/PublicRooms";
import RoomView from "./components/RoomView";
import WaitingModal from "./components/WaitingModal";
import ProfileViewUser from "./components/ProfileViewUser";
import ChatView from "./components/ChatView";
import PlayCheckers from "./components/PlayCheckers";
import { useNavigate } from "react-router-dom";
import RoomViewCheckers from "./components/RoomViewCheckers";



const TWITCH_CLIENT_ID = process.env.REACT_APP_TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.REACT_APP_TWITCH_CLIENT_SECRET;

const translations = {
  ru: {
    createGame: "Создать игру",
    playWithAI: "Играть с компьютером",
    chessPuzzles: "Решать задачи",
    switchTheme: "Переключить тему",
    switchLanguage: "Переключить язык",
    chessNews: "Шахматные новости",
    selectGame: "Выберите игру",
    chess: "Шахматы",
    checkers: "Шашки",
    login: "Войти",
    register: "Регистрация",
    quickStart: "Быстрый старт",
    bullet: "Буллет",
    blitz: "Блиц",
    rapid: "Рапид",
    classical: "Классические",
    watchStreamers: "Стримеры",
    events: "Текущие события",
    readMore: "Читать далее",
    loadingNews: "Загрузка новостей...",
    footerDisclaimer: "© 2025 Мой Шахматный Сайт. Все права защищены.",
    twoPlayers: "Два игрока",
    publicRooms: "Публичные комнаты",
    selectedGameLabel: "Вы выбрали",
    logout: "Выйти",
    loadingStreamers: "Загружаем список стримеров...",

  },
  en: {
    createGame: "Create Game",
    playWithAI: "Play with AI",
    chessPuzzles: "Solve puzzles",
    switchTheme: "Switch Theme",
    switchLanguage: "Switch Language",
    chessNews: "Chess News",
    selectGame: "Select Game",
    chess: "Chess",
    checkers: "Checkers",
    login: "Login",
    register: "Register",
    quickStart: "Quick Start",
    bullet: "Bullet",
    blitz: "Blitz",
    rapid: "Rapid",
    classical: "Classical",
    watchStreamers: "Streamers",
    events: "Current Events",
    readMore: "Read more",
    loadingNews: "Loading news...",
    footerDisclaimer: "© 2025 My Chess Site. All rights reserved.",
    twoPlayers: "Two Players",
    publicRooms: "Public Rooms",
    selectedGameLabel: "You selected",
    logout: "Logout",
    loadingStreamers: "Loading streamers list...",
  },
};




function App({ refreshRoomsFlag, setRefreshRoomsFlag }) {
  const navigate = useNavigate();
  const [waitingRoomCode, setWaitingRoomCode] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [language, setLanguage] = useState("ru");
  const [selectedGame, setSelectedGame] = useState("chess");
  const [news, setNews] = useState([]);
  const t = (key) => translations[language][key] || key;
  const [showRegistration, setShowRegistration] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const handleRegistrationClick = () => {
    setShowRegistration(true);
  };

  const handleQuickStart = async (timeControl) => {
    localStorage.removeItem("waiting_time_control");
    localStorage.removeItem("waiting_room_code");

    try {
      const isChess = selectedGame !== "checkers";

      const res = await api.post("/matchmaking/", {
        time_control: timeControl,
        is_chess: isChess,
      });

      const userId = res.data.user_id || res.data.opponent_id || res.data.creator_id;
      localStorage.setItem("my_user_id", userId);

      const roomCode = res.data.room_code;

      const redirectPath = res.data.is_chess
        ? `/room/${roomCode}`
        : `/room-checkers/${roomCode}`;

      if (res.data.status === "matched") {
        window.location.href = redirectPath;
      } else {
        setWaitingRoomCode("waiting");
        localStorage.setItem("waiting_time_control", timeControl);
        localStorage.setItem("waiting_room_code", roomCode);
        localStorage.setItem("is_chess", JSON.stringify(res.data.is_chess)); 

        pollForMatch(roomCode);
      }
    } catch (err) {
      console.error("Ошибка быстрого старта:", err);
      alert("Ошибка поиска матча");
    }
  };




  const pollForMatch = (roomCode) => {
    const isChess = JSON.parse(localStorage.getItem("is_chess"));
    const path = isChess ? `/room/${roomCode}` : `/room-checkers/${roomCode}`;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/rooms/${roomCode}`);
        const { joined } = res.data;

        if (joined) {
          clearInterval(interval);
          window.location.href = path;
        }
      } catch (err) {
        console.error("Ошибка при опросе:", err);
      }
    }, 2000);
  };




  const cancelMatchmaking = async () => {
    const timeControl = localStorage.getItem("waiting_time_control");
    try {
      await api.post("/cancel-matchmaking/", { time_control: timeControl });
    } catch (err) {
      console.error("Ошибка отмены:", err);
    }
    setWaitingRoomCode(null);
    localStorage.removeItem("waiting_time_control");
    localStorage.removeItem("waiting_room_code");

  };




  const closeRegistration = () => {
    setShowRegistration(false);
  };

  const handleLoginClick = () => {
    setShowLogin(true);
  };

  const closeLogin = () => {
    setShowLogin(false);
  };

  const [showCreateRoom, setShowCreateRoom] = useState(false);

  const handleCreateRoomClick = () => {
    setShowCreateRoom(true);
  };

  const closeCreateRoom = () => {
    setShowCreateRoom(false);
  };

  const [user, setUser] = useState(null); 


  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(newTheme);
  };



  const toggleLanguage = () => {
    setLanguage(language === "ru" ? "en" : "ru");
  };



  const GUARDIAN_API_KEY = "66af73b7-0a9d-413b-9a15-beed8e93842a\n";

  const FALLBACK_STREAMERS = [
  "gmhikaru",
  "chess",
  "gothamchess",
  "botezlive",
  "penguingm1",
  ];

  const [streamers, setStreamers] = useState([]);

  useEffect(() => {
    const chessDotComCategoryId = "743";
    const FALLBACK_STREAMERS = ["gmhikaru", "chess", "gothamchess", "botezlive", "penguingm1"];

    async function getTwitchAccessToken() {
      try {
        const response = await fetch("https://id.twitch.tv/oauth2/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: TWITCH_CLIENT_ID,
            client_secret: TWITCH_CLIENT_SECRET,
            grant_type: "client_credentials",
          }),
        });
        console.log("ID:", TWITCH_CLIENT_ID);
        console.log("SECRET:", TWITCH_CLIENT_SECRET);

        const data = await response.json();
        if (data.access_token) {
          return data.access_token;
        } else {
          console.error("❌ Ошибка получения токена:", JSON.stringify(data, null, 2));
          return null;
        }
      } catch (error) {
        console.error("❌ Ошибка запроса токена:", error);
        return null;
      }
    }


    async function fetchStreamers() {
      const token = await getTwitchAccessToken();
      if (!token) return;

      try {
        const res = await fetch(`https://api.twitch.tv/helix/streams?first=5&game_id=${chessDotComCategoryId}`, {
          headers: {
            "Client-ID": TWITCH_CLIENT_ID,
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (data.data && data.data.length > 0) {
          const userIds = data.data.map((s) => s.user_id);
          const userRes = await fetch(
            `https://api.twitch.tv/helix/users?${userIds.map((id) => `id=${id}`).join("&")}`,
            {
              headers: {
                "Client-ID": TWITCH_CLIENT_ID,
                Authorization: `Bearer ${token}`,
              },
            }
          );
          const userData = await userRes.json();

          const streamersInfo = data.data.map((stream) => {
            const user = userData.data.find((u) => u.id === stream.user_id);
            return {
              id: stream.user_id,
              login: user?.login,
              display_name: user?.display_name,
              profile_image_url: user?.profile_image_url || "https://via.placeholder.com/70",
              viewer_count: stream.viewer_count,
              is_live: true,
            };
          });

          setStreamers(streamersInfo);
        } else {
          console.warn("⚠️ Нет активных стримов. Загружаем fallback...");
          fetchFallbackStreamers(token);
        }
      } catch (error) {
        console.error("🚨 Ошибка при загрузке стримов:", error);
        fetchFallbackStreamers(token);
      }
    }

    async function fetchFallbackStreamers(token) {
      try {
        const res = await fetch(
          `https://api.twitch.tv/helix/users?${FALLBACK_STREAMERS.map((login) => `login=${login}`).join("&")}`,
          {
            headers: {
              "Client-ID": TWITCH_CLIENT_ID,
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();

        const streamersInfo = data.data.map((user) => ({
          id: user.id,
          login: user.login,
          display_name: user.display_name,
          profile_image_url: user.profile_image_url || "https://via.placeholder.com/70",
          viewer_count: 0,
          is_live: false,
        }));

        setStreamers(streamersInfo);
      } catch (error) {
        console.error("❌ Ошибка загрузки fallback-стримеров:", error);
        setStreamers([]);
      }
    }

    fetchStreamers();
  }, []);

  useEffect(() => {
    async function fetchChessNews() {
      try {
        console.log("🔍 Загружаем шахматные новости...");

        const url = `https://content.guardianapis.com/search?q=chess&api-key=${GUARDIAN_API_KEY}&show-fields=thumbnail,trailText`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.response.results.length > 0) {
          console.log("✅ Найдено новостей:", data.response.results.length);
          setNews(data.response.results.slice(0, 5));
        } else {
          console.warn("⚠️ Нет свежих шахматных новостей!");
          setNews([]);
        }
      } catch (error) {
        console.error("🚨 Ошибка загрузки шахматных новостей:", error);
      }
    }

    fetchChessNews();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "dark";
    setTheme(saved);
    document.documentElement.classList.add(saved);
  }, []);


  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api.get("/me")
       .then((res) => setUser(res.data))
       .catch(() => localStorage.removeItem("token"));
    }
  }, []);


  const handleGameSelection = (game) => {
    setSelectedGame(game);
  };



  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/upload-photo", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Фото обновлено!");
      window.location.reload(); 
    } catch (err) {
      alert("Ошибка загрузки фото");
      console.error(err);
    }
  };

return (
  <div className="app-container">
    {/* ========== HEADER ========== */}
    <header className="site-header">
      <div className="header-left">
        <Link to="/" className="logo-container">
          <img src={logo} alt="ChessRabbit Logo" className="logo" />
          <span className="site-title">ChessRabbit</span>
        </Link>
        <nav>
          <Link
            to="/create"
            className="header-link"
            onClick={(e) => {
              e.preventDefault();
              handleCreateRoomClick();
            }}
          >
            {t("createGame")}
          </Link>

          <Link to="/ai" className="header-link">
            {t("playWithAI")}
          </Link>

          <Link to="/puzzles" className="header-link">
            {t("chessPuzzles")}
          </Link>

          <Link to="/local" className="header-link">
            {t("twoPlayers")}
          </Link>
          <Link to="/public-rooms" className="header-link">
            {t("publicRooms")}
          </Link>

        </nav>

      </div>

      <div className="header-right">
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div className="user-info" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Link to="/profile">
                  <img
                      src={
                        user.photo_link && user.photo_link.trim() !== ""
                            ? `http://localhost:8000${user.photo_link}`
                            : "https://via.placeholder.com/40"
                      }
                      alt="Avatar"
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        objectFit: "cover"
                      }}
                  />
                </Link>
                <label className="upload-label">
                  <input type="file" onChange={handlePhotoUpload} style={{ display: "none" }} />
                </label>

              </div>

              <button
                className="header-button"
                onClick={async () => {
                  try {
                    await api.post("/logout");
                  } catch (err) {
                    console.error("Ошибка выхода:", err);
                  }
                  localStorage.removeItem("token");
                  setUser(null);
                  alert("Вы вышли из аккаунта");
                }}
              >
                {t("logout")}
              </button>
            </div>
          ) : (
            <>
              <button onClick={handleLoginClick} className="header-button">
                {t("login")}
              </button>
              <button onClick={handleRegistrationClick} className="header-button">
                {t("register")}
              </button>
            </>
          )}
      </div>

    </header> {/* ✅ ВОТ это был пропущенный закрывающий тег */}

    {showRegistration && <Registration onClose={closeRegistration} />}
    {showLogin && <Login onClose={closeLogin} onLoginSuccess={setUser} />}
    {showCreateRoom && (
      <RoomCreate
        onClose={closeCreateRoom}
        onRoomCreated={() => setRefreshRoomsFlag(prev => !prev)}
      />
    )}


      {/* ========== ОСНОВНОЙ КОНТЕЙНЕР ========== */}
      <div className="main-wrapper">
        {/* ========== SIDEBAR ========== */}
        {/* Секция стримеров (для примера) */}
        {/* Секция стримеров (для Twitch) */}
        {/* ========== SIDEBAR ========== */}
        <aside className="streamers-section">
          <h2 className="streamers-header">♟️ {t("watchStreamers")}</h2>
          {streamers.length > 0 ? (
              streamers.map((streamer) => (
                  <a
                      key={streamer.id}
                      href={`https://www.twitch.tv/${streamer.login}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="streamer"
                  >
                    <img
                        src={streamer.profile_image_url}
                        alt={streamer.display_name}
                        className="streamer-avatar"
                    />
                    <div className="streamer-info">
                      <div className="streamer-name">{streamer.display_name}</div>
                      <div className={`streamer-status ${streamer.is_live ? "live" : "offline"}`}>
                        {streamer.is_live
                            ? `🟢 В эфире | ${streamer.viewer_count} зрителей`
                            : `🔴 Оффлайн`}
                      </div>
                    </div>
                  </a>
              ))
          ) : (
              <p className="no-streamers">{t("loadingStreamers")}</p>
          )}
        </aside>

        {/* ========== ОСНОВНОЙ КОНТЕНТ ========== */}
        <main className="content">
          <div className="quick-start-container">
            <div className="quick-start-title">{t("quickStart")}</div>
           <div className="time-controls-grid">
             <button className="time-control-button" onClick={() => handleQuickStart("1+0")}>1+0 {t("bullet")}</button>
             <button className="time-control-button" onClick={() => handleQuickStart("2+1")}>2+1 {t("bullet")}</button>
             <button className="time-control-button" onClick={() => handleQuickStart("3+0")}>3+0 {t("blitz")}</button>
             <button className="time-control-button" onClick={() => handleQuickStart("3+2")}>3+2 {t("blitz")}</button>
             <button className="time-control-button" onClick={() => handleQuickStart("5+0")}>5+0 {t("blitz")}</button>
             <button className="time-control-button" onClick={() => handleQuickStart("5+3")}>5+3 {t("blitz")}</button>
             <button className="time-control-button" onClick={() => handleQuickStart("10+0")}>10+0 {t("rapid")}</button>
             <button className="time-control-button" onClick={() => handleQuickStart("10+5")}>10+5 {t("rapid")}</button>
             <button className="time-control-button" onClick={() => handleQuickStart("15+10")}>15+10 {t("rapid")}</button>
             <button className="time-control-button" onClick={() => handleQuickStart("30+0")}>30+0 {t("classical")}</button>
             <button className="time-control-button" onClick={() => handleQuickStart("30+20")}>30+20 {t("classical")}</button>
           </div>
          </div>

          {/* Блок выбора игры (шахматы/шашки) */}
          <div style={{marginBottom: '2rem'}}>
            <h3>{t("selectGame")}</h3>
            <button
                style={{marginRight: '1rem'}}
                onClick={() => handleGameSelection("chess")}
            >
              {t("chess")}
            </button>
            <button onClick={() => handleGameSelection("checkers")}>
              {t("checkers")}
            </button>
            {selectedGame && (
                <p>
                  {t("selectedGameLabel")}:{" "}
                  {selectedGame === "chess" ? t("chess") : t("checkers")}
                </p>
            )}
          </div>


          <div className="news-block">
            <h2>{t("chessNews")}</h2>
            {news.length > 0 ? (
                news.map((article, index) => (
                    <div className="news-item" key={index}>
                      <img src={article.fields.thumbnail || "https://via.placeholder.com/150"} alt="News"/>
                      <div className="news-content">
                        <div className="news-item-title">{article.webTitle}</div>
                        <div className="news-item-description">{article.fields.trailText}</div>
                        <a href={article.webUrl} target="_blank" rel="noopener noreferrer">
                          {t("readMore")}
                        </a>
                      </div>
                    </div>
                ))
            ) : (
                <p>{t("loadingNews")}</p>
            )}
          </div>


          {/* Кнопки переключения темы и языка (можно разместить где угодно) */}
          <div className="theme-toggle-container">
            <button className="theme-toggle-btn" onClick={toggleTheme}>
              {t("switchTheme")}
            </button>
            <button className="theme-toggle-btn" onClick={toggleLanguage}>
              {t("switchLanguage")}
            </button>
          </div>
        </main>
      </div>

        {waitingRoomCode === "waiting" && <WaitingModal onCancel={cancelMatchmaking} />}
    </div>
  );
}

export default function MainApp() {
  const [refreshRoomsFlag, setRefreshRoomsFlag] = useState(false);

  return (
      <Router>
        <Routes>
          <Route path="/" element={
            <App
              refreshRoomsFlag={refreshRoomsFlag}
              setRefreshRoomsFlag={setRefreshRoomsFlag}
            />
          } />
          <Route path="/create" element={<div>Страница создания игры</div>} />
          <Route path="/join" element={<div>Страница присоединения к игре</div>} />
          <Route path="/ai" element={<PlayWithAI />} />
          <Route path="/local" element={<PlayLocal />} />
          <Route path="/puzzles" element={<ChessPuzzles />} />
          <Route path="/profile" element={<ProfileView />} />
          <Route path="/profile/edit" element={<ProfileEdit />} />
          <Route path="/public-rooms" element={<PublicRooms refreshFlag={refreshRoomsFlag} />} />
          <Route path="/room/:roomCode" element={<RoomView />} />
          <Route path="/user/:userId" element={<ProfileViewUser />} />
          <Route path="/chat/:userId" element={<ChatView />} />
          <Route path="/checkers" element={<PlayCheckers />} />
          <Route path="/room-checkers/:roomCode" element={<RoomViewCheckers />} />
        </Routes>
      </Router>
  );
}

