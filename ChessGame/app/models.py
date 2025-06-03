from sqlalchemy import Column, String, Boolean, Integer, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
from .database import Base
from datetime import datetime
from sqlalchemy import Boolean
from sqlalchemy import ForeignKey


class User(Base):
    __tablename__ = 'users'


    about = Column(String, default="")
    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)  # UUID
    user_name = Column(String(100), nullable=False)  # длина 100 символов
    user_login = Column(String(100), unique=True, nullable=False)  # длина 100 символов
    user_password = Column(String(255), nullable=False)  # Хэш пароля
    is_online = Column(Boolean, default=False)
    win_count = Column(Integer, default=0)
    game_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    photo_link = Column(String)
    checkers_rate = Column(Integer, default=1000)
    chess_rate = Column(Integer, default=1000)


class Room(Base):
    __tablename__ = "rooms"
    joined = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    id = Column(Integer, primary_key=True)
    is_chess = Column(Boolean, nullable=False)
    color = Column(String(50), nullable=False)  # длина 50 символов
    room_code = Column(String(100), unique=True, nullable=False)  # длина 100 символов
    room_password = Column(String(255), nullable=True)  # длина 255 символов для пароля
    time_control = Column(String, nullable=True)  # ⬅️ Добавить это поле
    is_public = Column(Boolean, default=True)
    fen = Column(Text, default="start")
    creator_id = Column(String)
    opponent_id = Column(String)
    opponent_color = Column(String(50), nullable=True)

class Movement(Base):
    __tablename__ = "movements"

    move_id = Column(Integer, primary_key=True)
    is_chess = Column(Boolean, nullable=False)
    user_name = Column(String(100), nullable=False)
    move_count_user = Column(Integer, nullable=False)
    is_white = Column(Boolean, nullable=False)
    name_opponent = Column(String(100), nullable=False)
    move_count_opponent = Column(Integer, nullable=False)
    is_win = Column(Boolean)
    moves_user = Column(Text)
    moves_opponent = Column(Text)

class Friend(Base):
    __tablename__ = "friends"

    id = Column(Integer, primary_key=True)
    user_id = Column(String, nullable=False)
    friend_id = Column(String, nullable=False)


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True)
    sender_id = Column(String, nullable=False)
    receiver_id = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
