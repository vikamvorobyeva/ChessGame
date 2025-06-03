from __future__ import with_statement
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine
from sqlalchemy import pool
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from ChessGame.app.database import Base  # Импортируйте Base вашего проекта
from ChessGame.app.models import *  # Импортируйте все модели

# Это для того, чтобы включить ваши модели в контекст Alembic
target_metadata = Base.metadata  # Указываем, что метаданные - это ваши модели

# Получаем конфигурацию логирования
fileConfig(context.config.config_file_name)

# Строка подключения к базе данных из конфигурации alembic.ini
config = context.config
sqlalchemy_url = config.get_main_option("sqlalchemy.url")

# Создаем движок подключения
engine = create_engine(sqlalchemy_url, poolclass=pool.NullPool)

# Если нужно для Alembic - добавьте обработку сессий
def run_migrations_online():
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
