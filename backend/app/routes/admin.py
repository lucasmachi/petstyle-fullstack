import csv
import io
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from ..cache import invalidate_services
from ..config import get_settings
from ..db import aware, get_db, utcnow
from ..domain import change_status, generate_slots
from ..models import Booking, Notification, Service, Slot
from ..schemas import ActiveInput, BookingStatus, GenerateSlots, ServiceInput
from ..security import staff_user
from ..serializers import booking_dict, service_dict, slot_dict

router = APIRouter(prefix="/admin", tags=["Equipe"], dependencies=[Depends(staff_user)])


def day_bounds(day):
    start = aware(datetime.combine(day, time.min, tzinfo=ZoneInfo(get_settings().timezone)))
    return start, start + timedelta(days=1)


@router.get("/bookings")
def bookings(day: date | None = None, status: str | None = Query(None, pattern="^(confirmed|cancelled|completed)$"), db=Depends(get_db)):
    stmt = select(Booking).join(Slot)
    if day:
        start, end = day_bounds(day)
        stmt = stmt.where(Slot.starts_at >= start, Slot.starts_at < end)
    if status:
        stmt = stmt.where(Booking.status == status)
    return [booking_dict(b) for b in db.scalars(stmt.order_by(Slot.starts_at.desc()).limit(200))]


@router.patch("/bookings/{booking_id}")
def update_booking(booking_id: int, data: BookingStatus, user=Depends(staff_user), db=Depends(get_db)):
    b = db.get(Booking, booking_id)
    if not b:
        raise HTTPException(404, "Agendamento não encontrado.")
    return booking_dict(change_status(db, b, data.status, user))


@router.get("/services")
def services(db=Depends(get_db)):
    return [service_dict(s) for s in db.scalars(select(Service).order_by(Service.id))]


@router.post("/services", status_code=201)
def create_service(data: ServiceInput, db=Depends(get_db)):
    service = Service(**data.model_dump(), duration_minutes=60)
    db.add(service)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Já existe um serviço com este nome.")
    invalidate_services()
    return service_dict(service)


@router.put("/services/{service_id}")
def update_service(service_id: int, data: ServiceInput, db=Depends(get_db)):
    service = db.get(Service, service_id)
    if not service:
        raise HTTPException(404, "Serviço não encontrado.")
    for key, value in data.model_dump().items():
        setattr(service, key, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Já existe um serviço com este nome.")
    invalidate_services()
    return service_dict(service)


@router.get("/slots")
def slots(day: date, db=Depends(get_db)):
    start, end = day_bounds(day)
    return [slot_dict(s) for s in db.scalars(select(Slot).where(Slot.starts_at >= start, Slot.starts_at < end).order_by(Slot.starts_at))]


@router.post("/slots/generate")
def generate(data: GenerateSlots, db=Depends(get_db)):
    today = utcnow().astimezone(ZoneInfo(get_settings().timezone)).date()
    if data.start_date < today or data.start_date > today + timedelta(days=90):
        raise HTTPException(400, "Escolha uma data entre hoje e os próximos 90 dias.")
    return {"created": generate_slots(db, data.start_date, data.days)}


@router.patch("/slots/{slot_id}")
def toggle_slot(slot_id: int, data: ActiveInput, db=Depends(get_db)):
    result = db.execute(update(Slot).where(Slot.id == slot_id, Slot.reserved.is_(False), Slot.starts_at > utcnow()).values(active=data.active))
    if not result.rowcount:
        db.rollback()
        raise HTTPException(409, "Horário ocupado, passado ou inexistente.")
    db.commit()
    return slot_dict(db.get(Slot, slot_id))


@router.get("/metrics")
def metrics(db=Depends(get_db)):
    counts = dict(db.execute(select(Booking.status, func.count()).group_by(Booking.status)).all())
    revenue = db.scalar(select(func.coalesce(func.sum(Booking.price_cents), 0)).where(Booking.status == "completed"))
    notices = dict(db.execute(select(Notification.state, func.count()).group_by(Notification.state)).all())
    return {
        "confirmed": counts.get("confirmed", 0),
        "completed": counts.get("completed", 0),
        "cancelled": counts.get("cancelled", 0),
        "revenue_cents": revenue,
        "notifications": notices,
    }


def csv_safe(value):
    value = str(value)
    return "'" + value if value.startswith(("=", "+", "-", "@", "\t", "\r", "\n")) else value


@router.get("/report.csv")
def report(db=Depends(get_db)):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["agendamento", "pet", "servico", "inicio_utc", "status", "valor_reais"])
    for b in db.scalars(select(Booking).order_by(Booking.id).limit(10000)):
        writer.writerow([b.id, csv_safe(b.pet.name), csv_safe(b.service.name), aware(b.slot.starts_at).isoformat(), b.status, f"{b.price_cents / 100:.2f}"])
    return Response(
        "\ufeff" + output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=petstyle-agendamentos.csv", "Cache-Control": "no-store"},
    )
