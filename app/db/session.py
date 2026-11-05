
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings


# Create the SQLAlchemy engine.
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800,
    echo=False
)


# Create a reusable session factory.
SessionLocal = sessionmaker(
    bind=engine,
    class_=Session,
    autoflush=False,
    expire_on_commit=False
)


# FastAPI dependency for database sessions.
def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
