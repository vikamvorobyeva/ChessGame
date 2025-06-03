from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_code: str):
        await websocket.accept()
        if room_code not in self.rooms:
            self.rooms[room_code] = []
        self.rooms[room_code].append(websocket)

    def disconnect(self, websocket: WebSocket, room_code: str):
        if room_code in self.rooms:
            self.rooms[room_code].remove(websocket)
            if not self.rooms[room_code]:
                del self.rooms[room_code]

    async def broadcast(self, room_code: str, message: str, sender: WebSocket):
        if room_code in self.rooms:
            for connection in self.rooms[room_code]:
                if connection != sender:
                    await connection.send_text(message)

manager = ConnectionManager()
