import os

class Settings:
    SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")  # Можно загрузить из переменных окружения
    SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")

settings = Settings()
