
import sys
from pathlib import Path

# Add project root to Python import path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import inspect, text

from app.db.session import engine


def verify_database():
    print("Checking PostgreSQL connection...")

    with engine.connect() as connection:
        result = connection.execute(text("SELECT version()"))

        print(result.scalar())

    inspector = inspect(engine)

    tables = inspector.get_table_names()

    print("\nTables detected:")

    for table in tables:
        print(f"- {table}")

    required_tables = {"users", "jobs", "alembic_version"}

    missing_tables = required_tables - set(tables)

    if missing_tables:
        raise RuntimeError(
            f"Missing tables: {missing_tables}. "
            "Run 'alembic upgrade head'."
        )

    print("\nDatabase verification successful.")


if __name__ == "__main__":
    verify_database()
