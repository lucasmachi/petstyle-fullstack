import json
import logging
import time
import uuid
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from .config import get_settings
from .db import engine
from .routes import auth, customer, admin

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("petstyle")
settings = get_settings()
app = FastAPI(
    title="Pet Style API",
    version="1.0.0",
    description="Uma agenda de cuidados para pets. Acesse /api/auth/login, copie csrf_token e use X-CSRF-Token nas operações autenticadas de escrita.",
)


@app.middleware("http")
async def boundary(request: Request, call_next):
    request_id = str(uuid.uuid4())
    started = time.perf_counter()
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        origin = request.headers.get("origin")
        if origin and origin.rstrip("/") not in settings.origins:
            return JSONResponse({"detail": "Origem não permitida."}, status_code=403)
        # O serviço não recebe uploads: limitar JSON reduz consumo indevido.
        body = await request.body()
        if len(body) > 65536:
            return JSONResponse({"detail": "Solicitação muito grande."}, status_code=413)
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    logger.info(
        json.dumps(
            {
                "event": "request",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "ms": round((time.perf_counter() - started) * 1000),
            }
        )
    )
    return response


@app.get("/api/health", tags=["Operação"])
def health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse({"status": "unavailable"}, status_code=503)
    return {"status": "ok", "version": "1.0.0"}


app.include_router(auth.router, prefix="/api")
app.include_router(customer.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
