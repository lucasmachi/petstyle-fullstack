from sqlalchemy import select
from app import tasks
from app.db import SessionLocal, utcnow
from app.models import Notification
from conftest import payload


def test_notifications_sent_once_in_normal_processing(customer, catalog, monkeypatch):
    customer.post("/api/bookings", json=payload(customer, catalog))
    sent = []
    monkeypatch.setattr(tasks, "send_email", lambda n: sent.append(n.kind))
    assert tasks.process_due() == 1
    assert tasks.process_due() == 0
    assert sent == ["confirmation"]


def test_cancel_skips_confirmation_and_reminder(customer, catalog, monkeypatch):
    booking = customer.post("/api/bookings", json=payload(customer, catalog)).json()
    customer.patch(f"/api/bookings/{booking['id']}", json={"status": "cancelled"})
    with SessionLocal() as db:
        for n in db.scalars(select(Notification)):
            n.due_at = utcnow()
        db.commit()
    sent = []
    monkeypatch.setattr(tasks, "send_email", lambda n: sent.append(n.kind))
    assert tasks.process_due() == 1 and sent == ["cancellation"]
    with SessionLocal() as db:
        assert sorted(n.state for n in db.scalars(select(Notification))) == ["sent", "skipped", "skipped"]


def test_failure_retries_then_stops(customer, catalog, monkeypatch):
    customer.post("/api/bookings", json=payload(customer, catalog))

    def fail(n):
        raise ConnectionError("smtp unavailable")

    monkeypatch.setattr(tasks, "send_email", fail)
    for attempt in range(1, 6):
        with SessionLocal() as db:
            n = db.scalar(select(Notification).where(Notification.kind == "confirmation"))
            n.due_at = utcnow()
            db.commit()
        assert tasks.process_due() == 0
        with SessionLocal() as db:
            n = db.scalar(select(Notification).where(Notification.kind == "confirmation"))
            assert n.attempts == attempt
            assert n.state == ("failed" if attempt == 5 else "pending")
            assert n.last_error == "ConnectionError"
