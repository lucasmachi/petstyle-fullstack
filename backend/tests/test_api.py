from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from app.main import app
from app.db import SessionLocal, utcnow
from app.models import Booking, Notification, Service, Session, Slot, User
from app.security import hash_token
from conftest import payload, register


def test_session_cookie_csrf_and_logout(client):
    user, email = register(client)
    raw = client.cookies.get("petstyle_session")
    with SessionLocal() as db:
        assert db.get(Session, hash_token(raw)) is not None
        assert db.get(User, user["id"]).password_hash.startswith("$argon2")
    client.headers.pop("X-CSRF-Token")
    assert client.post("/api/pets", json={"name": "Pet", "species": "cat", "size": "small"}).status_code == 403
    token = client.get("/api/auth/me").json()["csrf_token"]
    client.headers["X-CSRF-Token"] = token
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 401
    r = client.post("/api/auth/login", json={"email": email, "password": "PetStyle123!"})
    assert r.status_code == 200
    assert "HttpOnly" in r.headers["set-cookie"] and "SameSite=lax" in r.headers["set-cookie"]
    assert raw != client.cookies.get("petstyle_session")


def test_role_cannot_be_self_assigned_and_origin_checked(client):
    body = {"name": "Tutor", "email": "hello@example.com", "password": "PetStyle123!", "role": "staff"}
    assert client.post("/api/auth/register", json=body).status_code == 422
    body.pop("role")
    assert client.post("/api/auth/register", json=body, headers={"Origin": "https://evil.example"}).status_code == 403
    assert client.get("/api/pets").status_code == 401


def test_customer_cannot_access_staff(customer):
    assert customer.get("/api/admin/metrics").status_code == 403
    assert customer.get("/api/admin/report.csv").status_code == 403


def test_expired_session_denied(customer):
    with SessionLocal() as db:
        session = db.scalar(select(Session))
        session.expires_at = utcnow() - timedelta(seconds=1)
        db.commit()
    assert customer.get("/api/auth/me").status_code == 401


def test_owner_isolation(customer, catalog):
    data = payload(customer, catalog)
    booking = customer.post("/api/bookings", json=data).json()
    with TestClient(app) as other:
        register(other)
        assert other.get("/api/pets").json() == []
        assert other.get("/api/bookings").json() == []
        assert other.put(f"/api/pets/{data['pet_id']}", json={"name": "Stolen", "species": "cat", "size": "small"}).status_code == 404
        assert other.delete(f"/api/pets/{data['pet_id']}").status_code == 404
        assert other.patch(f"/api/bookings/{booking['id']}", json={"status": "cancelled"}).status_code == 404
        data["request_id"] = str(uuid4())
        assert other.post("/api/bookings", json=data).status_code == 404


def test_booking_idempotency_price_snapshot_and_outbox(customer, catalog):
    data = payload(customer, catalog)
    first = customer.post("/api/bookings", json=data)
    assert first.status_code == 201, first.text
    assert customer.post("/api/bookings", json=data).json()["id"] == first.json()["id"]
    with SessionLocal() as db:
        db.get(Service, catalog["service_id"]).price_cents = 9900
        db.commit()
        assert db.scalar(select(func.count()).select_from(Booking)) == 1
        assert db.scalar(select(func.count()).select_from(Notification)) == 2
    assert customer.get("/api/bookings").json()[0]["price_cents"] == 7000
    data["slot_id"] = catalog["other_slot_id"]
    assert customer.post("/api/bookings", json=data).status_code == 409


def test_competing_requests_reserve_exactly_once(customer, catalog):
    data = payload(customer, catalog)
    cookies = dict(customer.cookies)
    csrf = customer.headers["X-CSRF-Token"]
    barrier = Barrier(2)

    def reserve():
        with TestClient(app, cookies=cookies, headers={"X-CSRF-Token": csrf}) as c:
            barrier.wait(timeout=10)
            return c.post("/api/bookings", json={**data, "request_id": str(uuid4())}).status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: reserve(), range(2)))
    assert sorted(results) == [201, 409]
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(Booking)) == 1


def test_cancel_releases_slot_and_preserves_history(customer, catalog):
    data = payload(customer, catalog)
    booking = customer.post("/api/bookings", json=data).json()
    assert customer.delete(f"/api/pets/{data['pet_id']}").status_code == 409
    r = customer.patch(f"/api/bookings/{booking['id']}", json={"status": "cancelled"})
    assert r.status_code == 200, r.text
    data["request_id"] = str(uuid4())
    assert customer.post("/api/bookings", json=data).status_code == 201
    assert len(customer.get("/api/bookings").json()) == 2
    assert customer.patch(f"/api/bookings/{booking['id']}", json={"status": "cancelled"}).status_code == 409


def test_cutoff_and_completion_rules(customer, catalog):
    data = payload(customer, catalog)
    booking = customer.post("/api/bookings", json=data).json()
    assert customer.patch(f"/api/bookings/{booking['id']}", json={"status": "completed"}).status_code == 403
    with SessionLocal() as db:
        db.get(Slot, catalog["slot_id"]).starts_at = utcnow() + timedelta(hours=1)
        db.commit()
    assert customer.patch(f"/api/bookings/{booking['id']}", json={"status": "cancelled"}).status_code == 400
    with TestClient(app) as staff:
        register(staff, "staff")
        assert staff.patch(f"/api/admin/slots/{catalog['slot_id']}", json={"active": False}).status_code == 409
        assert staff.patch(f"/api/admin/bookings/{booking['id']}", json={"status": "completed"}).status_code == 400
        with SessionLocal() as db:
            db.get(Slot, catalog["slot_id"]).starts_at = utcnow() - timedelta(hours=2)
            db.commit()
        assert staff.patch(f"/api/admin/bookings/{booking['id']}", json={"status": "completed"}).status_code == 200
        assert staff.get("/api/admin/metrics").json()["revenue_cents"] == 7000


def test_blocked_or_inactive_cannot_be_booked(customer, catalog):
    data = payload(customer, catalog)
    with SessionLocal() as db:
        db.get(Slot, catalog["slot_id"]).active = False
        db.commit()
    assert customer.post("/api/bookings", json=data).status_code == 409
    with SessionLocal() as db:
        db.get(Slot, catalog["slot_id"]).active = True
        db.get(Service, catalog["service_id"]).active = False
        db.commit()
    assert customer.post("/api/bookings", json=data).status_code == 404


def test_staff_service_update_and_csv(staff, catalog):
    data = payload(staff, catalog)
    with SessionLocal() as db:
        from app.models import Pet

        db.get(Pet, data["pet_id"]).name = "=1+1"
        db.commit()
    assert staff.post("/api/bookings", json=data).status_code == 201
    body = {"name": "Banho novo", "description": "Banho completo com cuidado.", "price_cents": 7500, "active": True}
    assert staff.put(f"/api/admin/services/{catalog['service_id']}", json=body).status_code == 200
    assert staff.get("/api/services").json()[0]["price_cents"] == 7500
    r = staff.get("/api/admin/report.csv")
    assert r.status_code == 200 and "'=1+1" in r.text
    assert r.headers["cache-control"] == "no-store"


def test_slots_generation_is_repeatable_and_skips_sunday(staff):
    from zoneinfo import ZoneInfo

    day = (utcnow() + timedelta(days=5)).date()
    body = {"start_date": str(day), "days": 7}
    assert staff.post("/api/admin/slots/generate", json=body).json()["created"] == 42
    assert staff.post("/api/admin/slots/generate", json=body).json()["created"] == 0
    with SessionLocal() as db:
        assert all(
            s.starts_at.replace(tzinfo=s.starts_at.tzinfo or __import__("datetime").timezone.utc).astimezone(ZoneInfo("America/Sao_Paulo")).weekday() != 6
            for s in db.scalars(select(Slot))
        )


@pytest.mark.parametrize("field,value", [("species", "bird"), ("size", "giant"), ("name", "")])
def test_pet_validation(customer, field, value):
    body = {"name": "Pipoca", "species": "dog", "size": "small", field: value}
    assert customer.post("/api/pets", json=body).status_code == 422
