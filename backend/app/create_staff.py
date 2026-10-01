"""Cria um funcionário sem colocar a senha no histórico do terminal."""

import getpass
from sqlalchemy import select
from .db import SessionLocal
from .models import User
from .schemas import Register
from .security import hasher

if __name__ == "__main__":
    data = Register(name=input("Nome: "), email=input("E-mail: "), password=getpass.getpass("Senha (mínimo 8 caracteres): "))
    with SessionLocal() as db:
        if db.scalar(select(User.id).where(User.email == str(data.email).lower())):
            raise SystemExit("E-mail já cadastrado. Use outro e-mail.")
        db.add(User(name=data.name, email=str(data.email).lower(), password_hash=hasher.hash(data.password), role="staff"))
        db.commit()
    print("Funcionário criado.")
