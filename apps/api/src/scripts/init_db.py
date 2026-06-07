from __future__ import annotations

from src.infrastructure.db import create_db_and_tables


def main() -> None:
    create_db_and_tables()
    print("Database tables are ready.")


if __name__ == "__main__":
    main()
