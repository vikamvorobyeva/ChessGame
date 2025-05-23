from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = '"User_authorization"'

    user_id = Column(String, primary_key=True, index=True)  # Уникальный идентификатор
    user_name = Column(String, unique=True, index=True, nullable=False)  # Уникальное имя пользователя
    user_login = Column(String, unique=True, index=True, nullable=False)  # Логин пользователя
    user_password = Column(String, nullable=False)  # Пароль пользователя
    is_online = Column(Boolean, default=False)  # По умолчанию пользователь не в сети
    win_count = Column(Integer, default=0)  # Количество побед
    game_count = Column(Integer, default=0)  # Количество игр
    created_at = Column(DateTime, nullable=False)  # Время создания пользователя
    user_rate = Column(Integer, default=0)  # Рейтинг пользователя


class Rooms(Base):
    __tablename__ = "Rooms"  # Название таблицы в БД

    id = Column(Integer, primary_key=True, index=True)  # Уникальный идентификатор
    is_chess = Column(Boolean, nullable=False)  # Логическое значение (шахматы или шашки)
    color = Column(String, nullable=False)  # Цвет (например, "черный" или "белый")
    room_code = Column(String, unique=True, nullable=False)  # Уникальный код комнаты
    room_password = Column(String, nullable=True)  # Пароль комнаты (может быть NULL)


#
# class GameSession(Base):
#     __tablename__ = "game_sessions"
#
#     id = Column(Integer, primary_key=True, index=True)
#     moves = Column(Text, default="")  # Здесь будут храниться ходы (например, PGN или просто последовательность ходов)
#     created_at = Column(DateTime, default=datetime.utcnow)
