from pydantic import BaseModel
from datetime import datetime
from typing import Optional



class UserCreate(BaseModel):
    user_name: str  # Имя пользователя
    user_login: str  # Логин пользователя
    user_password: str  # Пароль пользователя

    class Config:
        orm_mode = True



class UserResponse(BaseModel):
    user_id: str
    user_name: str
    user_login: str
    is_online: bool
    win_count: int
    game_count: int
    created_at: datetime  # Дата и время создания пользователя в формате UTC
    photo_link: str  # Поле с фото, обязательно (может быть пустой строкой)
    user_rate: int

    class Config:
        orm_mode = True  # Позволяет работать с SQLAlchemy объектами


# Схема для создания комнаты
class RoomCreate(BaseModel):
    is_chess: bool
    color: str
    room_password: Optional[str] = None
    class Config:
        orm_mode = True  # Позволяет работать с SQLAlchemy объектами

# Схема для отображения комнаты

class RoomResponse(BaseModel):
    id: int
    is_chess: bool
    color: str
    room_code: str

    class Config:
        orm_mode = True  # Позволяет работать с SQLAlchemy объектами
