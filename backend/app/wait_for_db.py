"""Readiness retries for Docker and older Podman Compose implementations."""

import argparse
import time
from sqlalchemy import inspect, text
from .db import engine


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--schema", action="store_true")
    args = parser.parse_args()
    for attempt in range(60):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
                if args.schema and not inspect(connection).has_table("notifications"):
                    raise RuntimeError("Migrations not ready")
            return
        except Exception:
            if attempt == 59:
                raise RuntimeError("Database not ready after 120 seconds. Check database logs.") from None
            time.sleep(2)


if __name__ == "__main__":
    main()
