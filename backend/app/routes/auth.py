import secrets
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from ..db import get_db, utcnow
from ..config import get_settings
from ..models import User, Session
from ..schemas import Register, Login
from ..security import COOKIE, DUMMY_HASH, get_session, hash_token, hasher, limit_auth, verify_password
from ..serializers import user_dict

router = APIRouter(prefix="/auth", tags=["Acesso"])


def start_session(db, user, response):
    raw = secrets.token_urlsafe(32)
    csrf = secrets.token_urlsafe(32)
    settings = get_settings()
    db.execute(delete(Session).where(Session.expires_at < utcnow()))
    db.add(Session(token_hash=hash_token(raw), user_id=user.id, csrf_token=csrf, expires_at=utcnow() + timedelta(hours=settings.session_hours)))
    db.commit()
    response.set_cookie(COOKIE, raw, max_age=settings.session_hours * 3600, httponly=True, secure=settings.cookie_secure, samesite="lax", path="/api")
    return {"user": user_dict(user), "csrf_token": csrf}


@router.post("/register", status_code=201)
def register(data: Register, request: Request, response: Response, db=Depends(get_db)):
    limit_auth(request)
    user = User(name=data.name, email=str(data.email).lower(), password_hash=hasher.hash(data.password), role="customer")
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Este e-mail já está cadastrado.")
    return start_session(db, user, response)


@router.post("/login")
def login(data: Login, request: Request, response: Response, db=Depends(get_db)):
    limit_auth(request)
    user = db.scalar(select(User).where(User.email == str(data.email).lower()))
    if not verify_password(data.password, user.password_hash if user else DUMMY_HASH) or not user:
        raise HTTPException(401, "E-mail ou senha incorretos.")
    old = request.cookies.get(COOKIE)
    if old:
        db.execute(delete(Session).where(Session.token_hash == hash_token(old)))
    return start_session(db, user, response)


@router.get("/me")
def me(session=Depends(get_session)):
    return {"user": user_dict(session.user), "csrf_token": session.csrf_token}


@router.post("/logout", status_code=204)
def logout(response: Response, session=Depends(get_session), db=Depends(get_db)):
    db.delete(session)
    db.commit()
    response.delete_cookie(COOKIE, path="/api")
