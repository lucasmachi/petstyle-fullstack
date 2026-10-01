from .db import aware


def user_dict(user):
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}


def pet_dict(p):
    return {"id": p.id, "name": p.name, "species": p.species, "size": p.size, "notes": p.notes, "active": p.active}


def service_dict(s):
    return {"id": s.id, "name": s.name, "description": s.description, "price_cents": s.price_cents, "duration_minutes": s.duration_minutes, "active": s.active}


def slot_dict(s):
    return {"id": s.id, "starts_at": aware(s.starts_at).isoformat(), "active": s.active, "reserved": s.reserved}


def booking_dict(b):
    return {
        "id": b.id,
        "pet": pet_dict(b.pet),
        "service": service_dict(b.service),
        "slot": slot_dict(b.slot),
        "status": b.status,
        "price_cents": b.price_cents,
        "owner": {"name": b.owner.name, "email": b.owner.email},
        "created_at": aware(b.created_at).isoformat(),
    }
