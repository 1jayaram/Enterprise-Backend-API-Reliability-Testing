
from app.db.base import Base
from app.db.session import engine

# Import models so they register with Base.metadata.
from app.models import User, Job  # noqa: F401


def initialize_database():
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    initialize_database()
    print("Database tables initialized successfully.")
