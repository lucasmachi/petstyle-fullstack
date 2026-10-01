from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from ..cache import cached_services, save_services
from ..config import get_settings
from ..db import aware, get_db, utcnow
from ..domain import create_booking, change_status
from ..models import Booking, Pet, Service, Slot
from ..schemas import BookingInput, BookingStatus, PetInput
from ..security import current_user
from ..serializers import booking_dict, pet_dict, service_dict, slot_dict

router = APIRouter(tags=["Agenda e pets"])


@router.get("/config")
def config():
    s = get_settings()
    return {"demo_mode": s.demo_mode, "timezone": s.timezone, "cancellation_hours": s.cancellation_hours, "slot_minutes": 60}


@router.get("/services")
def services(db=Depends(get_db)):
    cached = cached_services()
    if cached is not None:
        return cached
    data = [service_dict(s) for s in db.scalars(select(Service).where(Service.active.is_(True)).order_by(Service.price_cents))]
    save_services(data)
    return data


@router.get("/slots")
def available_slots(day: date, db=Depends(get_db)):
    tz = ZoneInfo(get_settings().timezone)
    start = aware(datetime.combine(day, time.min, tzinfo=tz))
    end = start + timedelta(days=1)
    return [
        slot_dict(s)
        for s in db.scalars(
            select(Slot)
            .where(Slot.starts_at >= start, Slot.starts_at < end, Slot.starts_at > utcnow(), Slot.active.is_(True), Slot.reserved.is_(False))
            .order_by(Slot.starts_at)
        )
    ]


@router.get("/pets")
def pets(user=Depends(current_user), db=Depends(get_db)):
    return [pet_dict(p) for p in db.scalars(select(Pet).where(Pet.owner_id == user.id, Pet.active.is_(True)).order_by(Pet.id))]


@router.post("/pets", status_code=201)
def add_pet(data: PetInput, user=Depends(current_user), db=Depends(get_db)):
    pet = Pet(owner_id=user.id, **data.model_dump())
    db.add(pet)
    db.commit()
    return pet_dict(pet)


def owned_pet(db, pet_id, user):
    pet = db.get(Pet, pet_id)
    if not pet or pet.owner_id != user.id or not pet.active:
        raise HTTPException(404, "Pet não encontrado.")
    return pet


@router.put("/pets/{pet_id}")
def edit_pet(pet_id: int, data: PetInput, user=Depends(current_user), db=Depends(get_db)):
    pet = owned_pet(db, pet_id, user)
    for key, value in data.model_dump().items():
        setattr(pet, key, value)
    db.commit()
    return pet_dict(pet)


@router.delete("/pets/{pet_id}", status_code=204)
def archive_pet(pet_id: int, user=Depends(current_user), db=Depends(get_db)):
    pet = owned_pet(db, pet_id, user)
    active = db.scalar(select(Booking.id).where(Booking.pet_id == pet.id, Booking.status == "confirmed"))
    if active:
        raise HTTPException(409, "Cancele ou conclua os agendamentos deste pet antes de arquivá-lo.")
    pet.active = False
    db.commit()


@router.get("/bookings")
def bookings(user=Depends(current_user), db=Depends(get_db), limit: int = Query(100, ge=1, le=200)):
    rows = db.scalars(select(Booking).where(Booking.owner_id == user.id).order_by(Booking.created_at.desc()).limit(limit))
    return [booking_dict(b) for b in rows]


@router.post("/bookings", status_code=201)
def book(data: BookingInput, user=Depends(current_user), db=Depends(get_db)):
    return booking_dict(create_booking(db, user, data))


@router.patch("/bookings/{booking_id}")
def update_booking(booking_id: int, data: BookingStatus, user=Depends(current_user), db=Depends(get_db)):
    booking = db.get(Booking, booking_id)
    if not booking or booking.owner_id != user.id:
        raise HTTPException(404, "Agendamento não encontrado.")
    return booking_dict(change_status(db, booking, data.status, user))
