import { useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

export default function RoomPage() {
  const { roomId } = useParams();
  const socket = useRef(null);
  const [log, setLog] = useState([]);

  useEffect(() => {
    socket.current = new WebSocket(`ws://localhost:8000/ws/${roomId}`);

    socket.current.onmessage = (e) => {
      const data = e.data;
      setLog(prev => [...prev, data]);
    };

    return () => socket.current?.close();
  }, [roomId]);

  const sendMove = () => {
    socket.current.send("e2 -> e4");
  };

  return (
    <div>
      <h2>Комната: {roomId}</h2>
      <button onClick={sendMove}>Отправить ход</button>
      <ul>
        {log.map((msg, i) => (
          <li key={i}>{msg}</li>
        ))}
      </ul>
    </div>
  );
}
