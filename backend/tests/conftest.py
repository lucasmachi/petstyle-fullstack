import os
import tempfile
from pathlib import Path
from uuid import uuid4

# TEST_DATABASE_URL must point to a disposable database: tables are recreated.
_test_dir = tempfile.TemporaryDirectory(prefix="petstyle-tests-")
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", f"sqlite:///{Path(_test_dir.name) / 'test.db'}")
os.environ["REDIS_ENABLED"] = "false"
os.environ["APP_ENV"] = "development"
os.environ["COOKIE_SECURE"] = "false"
os.environ["DEMO_MODE"] = "false"

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db import Base, SessionLocal, engine, utcnow
from app.models import Service, Slot, User
from app.security import _local_attempts
from datetime import timedelta


@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    _local_attempts.clear()
    yield
    engine.dispose()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def register(c, role="customer"):
    email = f"{uuid4().hex}@example.com"
    r = c.post("/api/auth/register", json={"name": "Tutor Teste", "email": email, "password": "PetStyle123!"})
    assert r.status_code == 201, r.text
    c.headers["X-CSRF-Token"] = r.json()["csrf_token"]
    if role == "staff":
        with SessionLocal() as db:
            db.get(User, r.json()["user"]["id"]).role = "staff"
            db.commit()
    return r.json()["user"], email


@pytest.fixture
def customer(client):
    register(client)
    return client


@pytest.fixture
def staff(client):
    register(client, "staff")
    return client


@pytest.fixture
def catalog():
    with SessionLocal() as db:
        service = Service(name="Banho de carinho", description="Banho e secagem com cuidado.", price_cents=7000)
        slot = Slot(starts_at=utcnow() + timedelta(days=3))
        other = Slot(starts_at=utcnow() + timedelta(days=3, hours=1))
        db.add_all([service, slot, other])
        db.commit()
        return {"service_id": service.id, "slot_id": slot.id, "other_slot_id": other.id}


def pet(c, name="Pipoca"):
    r = c.post("/api/pets", json={"name": name, "species": "dog", "size": "small", "notes": "Gosta de carinho."})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def payload(c, catalog):
    return {"pet_id": pet(c), "service_id": catalog["service_id"], "slot_id": catalog["slot_id"], "request_id": str(uuid4())}
