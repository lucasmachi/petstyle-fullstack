"""Dados de demonstração explícitos: python -m app.seed --demo."""

import argparse
from zoneinfo import ZoneInfo
from sqlalchemy import select
from .config import get_settings
from .db import SessionLocal, utcnow
from .domain import generate_slots
from .models import Pet, Service, User
from .security import hasher


def seed(demo=False):
    with SessionLocal() as db:
        if not db.scalar(select(Service.id).limit(1)):
            db.add_all(
                [
                    Service(
                        name="Banho & carinho", description="Banho com produtos adequados, secagem cuidadosa e aquele cheirinho de abraço.", price_cents=7000
                    ),
                    Service(
                        name="Banho + tosa",
                        description="Um cuidado completo: banho, secagem e tosa para deixar seu melhor amigo confortável.",
                        price_cents=11000,
                    ),
                    Service(
                        name="Cuidado felino",
                        description="Um horário tranquilo e exclusivo para o seu gato, com manejo gentil e atenção individual.",
                        price_cents=9000,
                    ),
                ]
            )
            db.commit()
        if demo:
            if get_settings().app_env == "production":
                raise RuntimeError("Dados demo não são permitidos em produção.")
            for name, email, role in [("Lucas Demo", "tutor@petstyle.example.com", "customer"), ("Equipe Pet Style", "equipe@petstyle.example.com", "staff")]:
                if not db.scalar(select(User).where(User.email == email)):
                    db.add(User(name=name, email=email, role=role, password_hash=hasher.hash("PetStyle123!")))
            db.commit()
            owner = db.scalar(select(User).where(User.email == "tutor@petstyle.example.com"))
            if not db.scalar(select(Pet.id).where(Pet.owner_id == owner.id)):
                db.add_all(
                    [
                        Pet(owner_id=owner.id, name="Pipoca", species="dog", size="small", notes="Adora carinho atrás da orelha."),
                        Pet(owner_id=owner.id, name="Amora", species="cat", size="small", notes="Prefere um ambiente tranquilo."),
                    ]
                )
                db.commit()
        today = utcnow().astimezone(ZoneInfo(get_settings().timezone)).date()
        generate_slots(db, today, 30)
    print("Serviços e horários preparados." + (" Contas demo: tutor@petstyle.example.com / equipe@petstyle.example.com; senha PetStyle123!" if demo else ""))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--demo", action="store_true")
    seed(parser.parse_args().demo)
