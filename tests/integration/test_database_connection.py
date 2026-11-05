
from sqlalchemy import text

from app.db.session import engine, SessionLocal


def test_database_connection_is_available():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))

        assert result.scalar() == 1


def test_database_session_can_be_created():
    db = SessionLocal()

    try:
        assert db.is_active

    finally:
        db.close()


def test_database_transaction_commits():
    with SessionLocal() as db:
        with db.begin():
            result = db.execute(text("SELECT 100"))

            assert result.scalar() == 100
