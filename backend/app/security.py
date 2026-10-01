import hashlib
import secrets
import time
from collections import defaultdict, deque
from threading import Lock
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session as DBSession
from .db import get_db, utcnow, aware
from .models import Session

hasher = PasswordHasher()
COOKIE = "petstyle_session"
DUMMY_HASH = hasher.hash("not-a-real-user-password")


def hash_token(raw):
    return hashlib.sha256(raw.encode()).hexdigest()


def verify_password(password, hashed):
    try:
        return hasher.verify(hashed, password)
    except VerificationError:
        return False


def get_session(request: Request, db: DBSession = Depends(get_db)):
    raw = request.cookies.get(COOKIE, "")
    session = db.get(Session, hash_token(raw)) if raw else None
    if not session or aware(session.expires_at) <= utcnow():
        raise HTTPException(401, "Entre na sua conta para continuar.")
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        if not secrets.compare_digest(request.headers.get("X-CSRF-Token", ""), session.csrf_token):
            raise HTTPException(403, "Sua sessão precisa ser atualizada. Recarregue a página.")
    return session


def current_user(session: Session = Depends(get_session)):
    return session.user


def staff_user(user=Depends(current_user)):
    if user.role != "staff":
        raise HTTPException(403, "Esta área é exclusiva da equipe.")
    return user


_local_attempts = defaultdict(deque)
_lock = Lock()


def limit_auth(request: Request):
    """Redis compartilhado quando disponível; limite por processo no modo local."""
    key = "petstyle:auth:" + (request.client.host if request.client else "unknown")
    from .cache import redis_client

    client = redis_client()
    if client:
        try:
            bucket = f"{key}:{int(time.time() // 60)}"
            pipe = client.pipeline()
            pipe.incr(bucket)
            pipe.expire(bucket, 65)
            count, _ = pipe.execute()
            if count > 20:
                raise HTTPException(429, "Muitas tentativas. Aguarde um minuto.")
            return
        except HTTPException:
            raise
        except Exception:
            pass
    with _lock:
        now = time.monotonic()
        # Descarta chaves antigas para limitar o consumo de memória.
        if len(_local_attempts) > 5000:
            for old in list(_local_attempts):
                if not _local_attempts[old] or _local_attempts[old][-1] < now - 60:
                    del _local_attempts[old]
        attempts = _local_attempts[key]
        while attempts and attempts[0] < now - 60:
            attempts.popleft()
        if len(attempts) >= 20:
            raise HTTPException(429, "Muitas tentativas. Aguarde um minuto.")
        attempts.append(now)
