from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from .config import get_settings
from .db import aware, utcnow
from .models import Booking, Notification, Pet, Service, Slot


def generate_slots(db, start, days):
    """Segunda a sábado; 9–12h e 13–17h; uma estação e duração fixa de 60 min."""
    tz = ZoneInfo(get_settings().timezone)
    added = 0
    for day in (start + timedelta(days=i) for i in range(days)):
        if day.weekday() == 6:
            continue
        for hour in (9, 10, 11, 13, 14, 15, 16):
            instant = aware(datetime.combine(day, time(hour), tzinfo=tz))
            if instant <= utcnow() or db.scalar(select(Slot.id).where(Slot.starts_at == instant)):
                continue
            try:
                with db.begin_nested():
                    db.add(Slot(starts_at=instant, active=True, reserved=False))
                    db.flush()
                added += 1
            except IntegrityError:
                pass  # Outro processo já gerou este mesmo horário.
    db.commit()
    return added


def create_booking(db, user, data):
    request_id = str(data.request_id)
    existing = db.scalar(select(Booking).where(Booking.owner_id == user.id, Booking.request_id == request_id))
    if existing:
        if (existing.pet_id, existing.service_id, existing.slot_id) != (data.pet_id, data.service_id, data.slot_id):
            raise HTTPException(409, "Identificador de solicitação já usado para outra reserva.")
        return existing
    pet = db.get(Pet, data.pet_id)
    if not pet or pet.owner_id != user.id or not pet.active:
        raise HTTPException(404, "Pet não encontrado.")
    service = db.get(Service, data.service_id)
    if not service or not service.active:
        raise HTTPException(404, "Serviço indisponível.")
    # O UPDATE condicional é atômico: duas requisições não reservam o mesmo slot.
    result = db.execute(
        update(Slot).where(Slot.id == data.slot_id, Slot.active.is_(True), Slot.reserved.is_(False), Slot.starts_at > utcnow()).values(reserved=True)
    )
    if result.rowcount != 1:
        db.rollback()
        existing = db.scalar(select(Booking).where(Booking.owner_id == user.id, Booking.request_id == request_id))
        if existing and (existing.pet_id, existing.service_id, existing.slot_id) == (data.pet_id, data.service_id, data.slot_id):
            return existing
        raise HTTPException(409, "Este horário não está mais disponível. Escolha outro.")
    slot = db.get(Slot, data.slot_id)
    booking = Booking(
        owner_id=user.id, pet_id=pet.id, service_id=service.id, slot_id=slot.id, request_id=request_id, price_cents=service.price_cents, status="confirmed"
    )
    try:
        db.add(booking)
        db.flush()
        now = utcnow()
        db.add(Notification(booking_id=booking.id, kind="confirmation", due_at=now))
        reminder_at = aware(slot.starts_at) - timedelta(hours=24)
        # Reservas feitas com menos de 24h recebem apenas a confirmação.
        if reminder_at > now:
            db.add(Notification(booking_id=booking.id, kind="reminder", due_at=reminder_at))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Não foi possível reservar. Atualize os horários.")
    return booking


def change_status(db, booking, status, actor):
    if actor.role != "staff":
        if booking.owner_id != actor.id:
            raise HTTPException(404, "Agendamento não encontrado.")
        if status != "cancelled":
            raise HTTPException(403, "Apenas a equipe pode concluir atendimentos.")
        cutoff = aware(booking.slot.starts_at) - timedelta(hours=get_settings().cancellation_hours)
        if utcnow() >= cutoff:
            raise HTTPException(400, "Cancelamentos precisam de pelo menos 2 horas de antecedência. Fale com a equipe.")
    if status == "completed" and aware(booking.slot.starts_at) > utcnow():
        raise HTTPException(400, "O atendimento ainda não começou.")
    result = db.execute(update(Booking).where(Booking.id == booking.id, Booking.status == "confirmed").values(status=status))
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(409, "Este agendamento já foi atualizado.")
    if status == "cancelled":
        db.execute(update(Slot).where(Slot.id == booking.slot_id).values(reserved=False))
        db.add(Notification(booking_id=booking.id, kind="cancellation", due_at=utcnow()))
    db.commit()
    db.expire_all()
    return db.get(Booking, booking.id)
