from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from . import models, auth, schemas
from .database import engine, Base, get_db
import uvicorn
from datetime import datetime
import uuid
from datetime import datetime

from .schemas import UserCreate, RoomCreate, RoomResponse



# Создание таблиц в базе данных
Base.metadata.create_all(bind=engine)

# Инициализация приложения
app = FastAPI(
    title="Chess Game API",
    description="API для онлайн-игры в шахматы",
    version="1.0.0",
)


# Регистрация нового пользователя
@app.post("/register/")
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Проверка на существование пользователя с таким же именем
    existing_user_name = db.query(models.User).filter(models.User.user_name == user.user_name).first()
    if existing_user_name:
        raise HTTPException(status_code=400, detail="User name already exists")

    # Проверка на существование пользователя с таким же логином
    existing_user_login = db.query(models.User).filter(models.User.user_login == user.user_login).first()
    if existing_user_login:
        raise HTTPException(status_code=400, detail="User login already exists")

    # Генерация уникального user_id
    unique_user_id = str(uuid.uuid4())

    # Получение текущей даты и времени в UTC
    created_at = datetime.utcnow()

    # Создание новой строки пользователя с остальными полями, установленными в 0
    new_user = models.User(
        user_id=unique_user_id,  # Уникальный идентификатор
        user_name=user.user_name,
        user_login=user.user_login,
        user_password=auth.get_password_hash(user.user_password),  # Хеширование пароля
        created_at=created_at,  # Дата регистрации
        is_online=False,
        win_count=0,
        game_count=0,
        user_rate=0
    )

    # Добавляем пользователя в базу данных
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user_id": new_user.user_id,
        "created_at": new_user.created_at
    }


@app.get(
    "/user/{user_id}",
    summary="Получение данных пользователя",
    description="Находит пользователя по user_id и возвращает все данные о нем."
)
def get_user_by_id(user_id: str, db: Session = Depends(get_db)):
    # Ищем пользователя по user_id в базе данных
    user = db.query(models.User).filter(models.User.user_id == user_id).first()

    # Если пользователь не найден, возвращаем ошибку
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Возвращаем все поля пользователя
    return {
        "user_id": user.user_id,
        "user_name": user.user_name,
        "user_login": user.user_login,
        "is_online": user.is_online,
        "win_count": user.win_count,
        "game_count": user.game_count,
        "created_at": user.created_at,
        "photo_link": user.photo_link,
        "user_rate": user.user_rate,
    }



@app.get("/rooms/", response_model=dict)
def get_rooms(db: Session = Depends(get_db)):
    chess_rooms = db.query(models.Rooms).filter(models.Rooms.is_chess == True).all()
    draughts_rooms = db.query(models.Rooms).filter(models.Rooms.is_chess == False).all()
    return {
        "chess": chess_rooms,
        "draughts": draughts_rooms
    }


@app.post("/rooms/create/", response_model=schemas.RoomResponse)
def create_room(room: schemas.RoomCreate, db: Session = Depends(get_db)):
    room_code = str(uuid.uuid4())[:8]  # Генерируем уникальный код комнаты
    new_room = models.Rooms(
        is_chess=room.is_chess,
        color=room.color,
        room_code=room_code
    )
    db.add(new_room)
    db.commit()
    db.refresh(new_room)
    return new_room




@app.post("/rooms/join/")
def join_room(room_code: str, room_password: str, db: Session = Depends(get_db)):
    room = db.query(models.Rooms).filter(models.Rooms.room_code == room_code).first()
    if not room or (room.room_password and room.room_password != room_password):
        raise HTTPException(status_code=400, detail="Invalid room code or password")
    return {"message": "Successfully joined the room"}


# Запуск приложения
if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
