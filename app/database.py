from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

# Загружаем переменные окружения из .env
load_dotenv()

# Получаем строку подключения из .env
DATABASE_URL = os.getenv("DATABASE_URL")

# Создаем подключение к базе данных
engine = create_engine(DATABASE_URL, connect_args={"client_encoding": "UTF8"})

# Создаем базовый класс для моделей
Base = declarative_base()

# Создаем сессию для взаимодействия с базой данных
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Функция для получения сессии в FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
