from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel

class RoomJoinRequest(BaseModel):
    room_code: str
    room_password: str = ""

class UserCreate(BaseModel):
    user_name: str
    user_login: str
    user_password: str

    class Config:
        orm_mode = True

class UserLogin(BaseModel):
    user_login: str
    user_password: str

    class Config:
        orm_mode = True

class UserResponse(BaseModel):
    user_id: UUID
    user_name: str
    about: str
    user_login: str
    is_online: bool
    win_count: int
    game_count: int
    created_at: datetime
    photo_link: str
    chess_rate: int
    checkers_rate: int

    class Config:
        orm_mode = True

class RoomCreate(BaseModel):
    is_chess: bool
    color: str
    room_password: Optional[str] = None

    class Config:
        orm_mode = True

class RoomResponse(BaseModel):
    id: int
    is_chess: bool
    color: str
    room_code: str
    time_control: Optional[str] = None

    class Config:
        orm_mode = True

class RoomCreate(BaseModel):
    is_chess: bool
    color: str
    room_password: str | None = None
    time_control: str | None = None
    is_public: bool = True

class FinishGameRequest(BaseModel):
    winner: str
