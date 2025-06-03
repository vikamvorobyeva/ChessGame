from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Body, WebSocket
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from starlette.websockets import WebSocketDisconnect
from . import models, auth, schemas
from .database import engine, Base, get_db
from fastapi.security import OAuth2PasswordBearer, HTTPAuthorizationCredentials, HTTPBearer
from .schemas import UserCreate, UserResponse, RoomCreate, RoomResponse, FinishGameRequest
from datetime import datetime, timedelta
from uuid import uuid4
import shutil
import os
from fastapi.middleware.cors import CORSMiddleware
from .websocket import manager
from pydantic import BaseModel
from typing import Optional
from fastapi import status
import logging
from fastapi import Request
import random


matchmaking_queues = {}

class MatchRequest(BaseModel):
    time_control: str
    is_chess: Optional[bool] = True

Base.metadata.create_all(bind=engine)

logging.basicConfig(level=logging.DEBUG)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://192.168.1.10:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")
security = HTTPBearer(auto_error=False)

def get_optional_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return credentials.credentials if credentials else None

@app.post("/matchmaking/")
def find_match(
    req: MatchRequest,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(get_optional_token)
):
    user_login = auth.decode_token(token) if token else None
    user = db.query(models.User).filter(models.User.user_login == user_login).first() if user_login else None
    user_id = user.user_id if user else f"anon_{str(uuid4())[:8]}"

    expiration_time = datetime.utcnow() - timedelta(minutes=5)
    old_rooms = db.query(models.Room).filter(
        models.Room.created_at < expiration_time,
        models.Room.joined == False
    ).all()
    for room in old_rooms:
        db.delete(room)
    db.commit()

    room = db.query(models.Room).filter(
        models.Room.time_control == req.time_control,
        models.Room.joined == False,
        models.Room.opponent_id == None,
        models.Room.is_chess == req.is_chess
    ).first()

    if room:
        room.opponent_id = user_id
        room.joined = True
        db.commit()
        db.refresh(room)

        if str(user_id) == str(room.creator_id):
            your_color = room.color
        else:
            your_color = "black" if room.color == "white" else "white"

        return {
            "room_code": room.room_code,
            "status": "matched",
            "creator_id": room.creator_id,
            "opponent_id": user_id,
            "your_color": your_color,
            "opponent_color": "black" if your_color == "white" else "white",
            "is_chess": req.is_chess 
        }

    room_code = str(uuid4())[:8]
    chosen_color = random.choice(["white", "black"])
    fen = f"checkers|{chosen_color}" if not req.is_chess else "start"

    new_room = models.Room(
        is_chess=req.is_chess,
        color=chosen_color,
        room_code=room_code,
        time_control=req.time_control,
        is_public=False,
        joined=False,
        fen=fen,
        created_at=datetime.utcnow(),
        creator_id=user_id,
        opponent_id=None
    )

    db.add(new_room)
    db.commit()

    return {
        "status": "waiting",
        "user_id": user_id,
        "room_code": room_code,
        "color": chosen_color,
        "is_chess": req.is_chess
    }

@app.post("/cancel-matchmaking/")
def cancel_matchmaking(req: MatchRequest, token: Optional[str] = Depends(get_optional_token)):
    user_id = auth.decode_token(token) if token else f"anon_{str(uuid4())[:8]}"
    queue = matchmaking_queues.get(req.time_control, [])

    updated_queue = [entry for entry in queue if entry[0] != user_id]
    matchmaking_queues[req.time_control] = updated_queue
    return {"status": "cancelled"}

@app.post("/logout")
def logout(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_login = auth.decode_token(token)
    if not user_login:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(models.User).filter(models.User.user_login == user_login).first()
    if user:
        user.is_online = False
        db.commit()
    return {"message": "Logged out"}

@app.post("/register/")
def register(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.user_name == user.user_name).first():
        raise HTTPException(status_code=400, detail="User name already exists")
    if db.query(models.User).filter(models.User.user_login == user.user_login).first():
        raise HTTPException(status_code=400, detail="User login already exists")

    new_user = models.User(
        user_id=str(uuid4()),
        user_name=user.user_name,
        user_login=user.user_login,
        user_password=auth.get_password_hash(user.user_password),
        created_at=datetime.utcnow(),
        is_online=False,
        win_count=0,
        game_count=0,
        chess_rate=1000,
        checkers_rate=1000,
        photo_link=""
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user_id": new_user.user_id,
        "created_at": new_user.created_at
    }

@app.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.user_login == user.user_login).first()
    if not db_user or not auth.verify_password(user.user_password, db_user.user_password):
        raise HTTPException(status_code=401, detail="Incorrect login or password")

    db_user.is_online = True
    db.commit()

    token = auth.create_access_token({"sub": db_user.user_login})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/me", response_model=UserResponse)
def get_me(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_login = auth.decode_token(token)
    if not user_login:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(models.User).filter(models.User.user_login == user_login).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/user/photo")
def update_photo(photo_url: str = Body(...), token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_login = auth.decode_token(token)
    if not user_login:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(models.User).filter(models.User.user_login == user_login).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.photo_link = photo_url
    db.commit()
    return JSONResponse(content={"message": "Photo updated successfully"})

@app.put("/me")
def update_me(data: dict = Body(...), token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_login = auth.decode_token(token)
    user = db.query(models.User).filter(models.User.user_login == user_login).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.about = data.get("about", "")
    db.commit()
    return {"message": "Profile updated"}

@app.post("/upload-photo")
def upload_photo(file: UploadFile = File(...), token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_login = auth.decode_token(token)
    if not user_login:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(models.User).filter(models.User.user_login == user_login).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    filename = f"{user.user_id}_{file.filename}"
    file_path = os.path.join("uploads", filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    user.photo_link = f"/uploads/{filename}"
    db.commit()
    return {"photo_url": user.photo_link}

@app.get("/user/{user_id}", summary="Получение данных пользователя")
def get_user_by_id(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/rooms/")
def get_rooms(db: Session = Depends(get_db)):
    expiration_time = datetime.utcnow() - timedelta(minutes=5)
    old_rooms = db.query(models.Room).filter(models.Room.created_at < expiration_time).all()
    for room in old_rooms:
        db.delete(room)
    db.commit()

    chess_rooms = db.query(models.Room).filter(models.Room.is_chess == True, models.Room.is_public == True).all()
    draughts_rooms = db.query(models.Room).filter(models.Room.is_chess == False, models.Room.is_public == True).all()

    def serialize(rooms):
        return [
            {
                "id": r.id,
                "is_chess": r.is_chess,
                "color": r.color,
                "room_code": r.room_code,
                "time_control": r.time_control,
                "is_public": r.is_public
            }
            for r in rooms
        ]

    return JSONResponse(content={
        "chess": serialize(chess_rooms),
        "draughts": serialize(draughts_rooms)
    })

@app.post("/rooms/create/", response_model=RoomResponse)
def create_room(room: RoomCreate, db: Session = Depends(get_db), token: Optional[str] = Depends(get_optional_token)):
    user_login = auth.decode_token(token) if token else None
    user = db.query(models.User).filter(models.User.user_login == user_login).first() if user_login else None
    creator_id = user.user_id if user else f"anon_{str(uuid4())[:8]}"

    room_code = str(uuid4())[:8]
    final_color = random.choice(["white", "black"]) if room.color == "random" else room.color
    fen = f"checkers|{final_color}" if not room.is_chess else "start"

    new_room = models.Room(
        is_chess=room.is_chess,
        color=final_color,
        room_code=room_code,
        room_password=room.room_password,
        time_control=room.time_control,
        is_public=room.is_public,
        created_at=datetime.utcnow(),
        fen=fen,
        creator_id=creator_id
    )
    db.add(new_room)
    db.commit()
    db.refresh(new_room)
    return new_room



class RoomJoinRequest(BaseModel):
    room_code: str
    room_password: str

@app.post("/rooms/join/")
def join_room(data: RoomJoinRequest, request: Request, db: Session = Depends(get_db), token: Optional[str] = Depends(get_optional_token)):
    room = db.query(models.Room).filter(models.Room.room_code == data.room_code).first()
    if not room or (room.room_password and room.room_password != data.room_password):
        raise HTTPException(status_code=400, detail="Invalid room code or password")

    user_login = auth.decode_token(token) if token else None
    user = db.query(models.User).filter(models.User.user_login == user_login).first() if user_login else None
    user_id = user.user_id if user else request.headers.get("x-anon-id") or f"anon_{str(uuid4())[:8]}"

    if not room.joined:
        room.opponent_id = user_id
        room.joined = True
        db.commit()
        db.refresh(room)

    if room:
        room.opponent_id = user_id
        room.joined = True
        db.commit()
        db.refresh(room)

        creator_color = room.color
        opponent_color = "black" if creator_color == "white" else "white"

        if str(user_id) == str(room.creator_id):
            your_color = creator_color
        else:
            your_color = opponent_color

        return {
            "room_code": room.room_code,
            "status": "matched",
            "creator_id": room.creator_id,
            "opponent_id": user_id,
            "your_color": your_color,
            "opponent_color": opponent_color,
        }


@app.put("/user/update")
def update_user_profile(name: str = Body(...), db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    user_login = auth.decode_token(token)
    user = db.query(models.User).filter(models.User.user_login == user_login).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.user_name = name
    db.commit()
    return {"message": "User updated"}

@app.delete("/rooms/{room_code}")
def delete_room(room_code: str, db: Session = Depends(get_db)):
    room = db.query(models.Room).filter(models.Room.room_code == room_code).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    db.delete(room)
    db.commit()

    return {"message": "Room deleted"}

from fastapi import Request

@app.get("/rooms/{room_code}")
def get_room(room_code: str, request: Request, db: Session = Depends(get_db), token: Optional[str] = Depends(get_optional_token)):
    room = db.query(models.Room).filter(models.Room.room_code == room_code).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if room.fen == "start":
        room.fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

    user_login = auth.decode_token(token) if token else None
    user = db.query(models.User).filter(models.User.user_login == user_login).first() if user_login else None
    user_id = user.user_id if user else request.headers.get("x-anon-id")

    creator_color = room.color
    opponent_color = "black" if creator_color == "white" else "white"

    if str(user_id) == str(room.creator_id):
        your_color = creator_color
    elif str(user_id) == str(room.opponent_id):
        your_color = opponent_color
    else:
        your_color = "white"

    turn = "white"
    if not room.is_chess and "|" in room.fen:
        try:
            _, turn = room.fen.split("|")
        except ValueError:
            pass

    return {
        "id": room.id,
        "is_chess": room.is_chess,
        "color": room.color,
        "room_code": room.room_code,
        "time_control": room.time_control,
        "is_public": room.is_public,
        "joined": room.joined,
        "fen": room.fen,
        "creator_id": room.creator_id,
        "opponent_id": room.opponent_id,
        "your_color": your_color,
        "turn": turn,
        "user_id": user_id
    }


@app.websocket("/ws/room/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str):
    await manager.connect(websocket, room_code)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(room_code, data, sender=websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_code)

@app.post("/rooms/{room_code}/fen")
def update_room_fen(room_code: str, fen: str = Body(...), db: Session = Depends(get_db)):
    room = db.query(models.Room).filter(models.Room.room_code == room_code).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    room.fen = fen
    db.commit()
    return {"message": "FEN updated"}

@app.post("/rooms/{room_code}/finish")
def finish_game(room_code: str, data: FinishGameRequest, db: Session = Depends(get_db)):
    if data.winner not in ["white", "black", "draw"]:
        raise HTTPException(status_code=400, detail="Invalid winner value")

    room = db.query(models.Room).filter(models.Room.room_code == room_code).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    creator = db.query(models.User).filter(models.User.user_id == room.creator_id).first()
    opponent = db.query(models.User).filter(models.User.user_id == room.opponent_id).first()

    if creator:
        creator.game_count += 1
    if opponent:
        opponent.game_count += 1

    def update_rating(user, win: bool, is_draw: bool, is_chess: bool):
        if not user:
            return
        rate_attr = 'chess_rate' if is_chess else 'checkers_rate'
        if is_draw:
            setattr(user, rate_attr, getattr(user, rate_attr) + 5)
        elif win:
            setattr(user, rate_attr, getattr(user, rate_attr) + 10)
            user.win_count += 1
        else:
            setattr(user, rate_attr, getattr(user, rate_attr) - 10)

    if data.winner == "draw":
        update_rating(creator, False, True, room.is_chess)
        update_rating(opponent, False, True, room.is_chess)
    else:
        creator_color = room.color
        opponent_color = "black" if creator_color == "white" else "white"

        creator_wins = data.winner == creator_color
        update_rating(creator, creator_wins, False, room.is_chess)
        update_rating(opponent, not creator_wins, False, room.is_chess)

    db.delete(room)
    db.commit()

    return {"message": "Game finished and ratings updated for both players"}



@app.post("/friends/add")
def add_friend(data: dict = Body(...), db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    user_login = auth.decode_token(token)
    user = db.query(models.User).filter(models.User.user_login == user_login).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    friend_id = data.get("friend_id")
    if not friend_id or friend_id == str(user.user_id):
        raise HTTPException(status_code=400, detail="Invalid friend ID")

    existing = db.query(models.Friend).filter_by(user_id=str(user.user_id), friend_id=friend_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already added")

    new_friend = models.Friend(user_id=str(user.user_id), friend_id=friend_id)
    db.add(new_friend)
    db.commit()
    return {"message": "Friend added"}

@app.get("/friends")
def get_friends(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_login = auth.decode_token(token)
    user = db.query(models.User).filter(models.User.user_login == user_login).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    friend_links = db.query(models.Friend).filter_by(user_id=str(user.user_id)).all()
    friend_ids = [f.friend_id for f in friend_links]
    friends = db.query(models.User).filter(models.User.user_id.in_(friend_ids)).all()

    return [
        {
            "user_id": f.user_id,
            "user_name": f.user_name,
            "photo_link": f.photo_link
        }
        for f in friends
    ]


@app.get("/user/{user_id}/friends")
def get_user_friends(user_id: str, db: Session = Depends(get_db)):
    links = db.query(models.Friend).filter_by(user_id=user_id).all()
    friend_ids = [f.friend_id for f in links]

    friends = db.query(models.User).filter(models.User.user_id.in_(friend_ids)).all()

    return [
        {
            "user_id": friend.user_id,
            "user_name": friend.user_name,
            "photo_link": friend.photo_link,
        }
        for friend in friends
    ]

@app.post("/friends/remove")
def remove_friend(data: dict = Body(...), db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    user_login = auth.decode_token(token)
    user = db.query(models.User).filter(models.User.user_login == user_login).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    friend_id = data.get("friend_id")
    link = db.query(models.Friend).filter_by(user_id=str(user.user_id), friend_id=friend_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Friend not found")

    db.delete(link)
    db.commit()
    return {"message": "Friend removed"}

@app.get("/friends/ids")
def get_friend_ids(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user_login = auth.decode_token(token)
    user = db.query(models.User).filter(models.User.user_login == user_login).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    friend_links = db.query(models.Friend).filter_by(user_id=str(user.user_id)).all()
    friend_ids = [f.friend_id for f in friend_links]
    return {"friend_ids": friend_ids}

@app.get("/chat/{user_id}")
def get_chat(user_id: str, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    current_user_login = auth.decode_token(token)
    current_user = db.query(models.User).filter(models.User.user_login == current_user_login).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")

    current_id = str(current_user.user_id)
    friend_id = str(user_id)

    messages = db.query(models.Message).filter(
        ((models.Message.sender_id == current_id) & (models.Message.receiver_id == friend_id)) |
        ((models.Message.sender_id == friend_id) & (models.Message.receiver_id == current_id))
    ).order_by(models.Message.timestamp.asc()).all()

    return [{
        "id": m.id,
        "sender_id": m.sender_id,
        "receiver_id": m.receiver_id,
        "content": m.content,
        "timestamp": m.timestamp.isoformat()
    } for m in messages]

    return [{
        "id": m.id,
        "sender_id": m.sender_id,
        "receiver_id": m.receiver_id,
        "content": m.content,
        "timestamp": m.timestamp.isoformat()
    } for m in messages]

class MessageCreate(BaseModel):
    receiver_id: str
    content: str

@app.post("/chat/send")
def send_message(data: MessageCreate, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    current_user_login = auth.decode_token(token)
    current_user = db.query(models.User).filter(models.User.user_login == current_user_login).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")

    new_message = models.Message(
        sender_id=current_user.user_id,
        receiver_id=data.receiver_id,
        content=data.content
    )

    db.add(new_message)
    db.commit()
    return {"message": "Message sent"}

@app.post("/chat/clear")
def clear_chat(data: dict = Body(...), db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    current_login = auth.decode_token(token)
    user = db.query(models.User).filter(models.User.user_login == current_login).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    receiver_id = data.get("receiver_id")
    if not receiver_id:
        raise HTTPException(status_code=400, detail="Receiver ID required")

    db.query(models.Message).filter(
        ((models.Message.sender_id == str(user.user_id)) & (models.Message.receiver_id == receiver_id)) |
        ((models.Message.sender_id == receiver_id) & (models.Message.receiver_id == str(user.user_id)))
    ).delete(synchronize_session=False)

    db.commit()
    return {"message": "Chat cleared"}
