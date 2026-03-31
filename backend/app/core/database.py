from contextlib import contextmanager
from typing import Any, Iterable

import pymysql
from pymysql.cursors import DictCursor

from .config import settings


def get_connection() -> pymysql.connections.Connection:
    return pymysql.connect(
        host=settings.db_host,
        port=settings.db_port,
        user=settings.db_user,
        password=settings.db_password,
        database=settings.db_name,
        cursorclass=DictCursor,
        autocommit=False,
        charset="utf8mb4",
    )


@contextmanager
def db_cursor():
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            yield conn, cursor
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def fetch_all(sql: str, params: Iterable[Any] | None = None) -> list[dict[str, Any]]:
    with db_cursor() as (_conn, cursor):
        cursor.execute(sql, params or ())
        return list(cursor.fetchall())


def fetch_one(sql: str, params: Iterable[Any] | None = None) -> dict[str, Any] | None:
    with db_cursor() as (_conn, cursor):
        cursor.execute(sql, params or ())
        return cursor.fetchone()