from sqlalchemy.orm import Session
from . import models, schemas

def create_user(db: Session, user: schemas.UserCreate):
    db_user = models.User(
        user_name=user.user_name,
        user_login=user.user_login,
        user_password=user.user_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
