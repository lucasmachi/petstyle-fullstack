import logging
import smtplib
from datetime import timedelta
from email.message import EmailMessage
from zoneinfo import ZoneInfo
from celery import Celery
from sqlalchemy import select
from .config import get_settings
from .db import SessionLocal, aware, utcnow
from .models import Notification

settings = get_settings()
celery = Celery("petstyle", broker=settings.redis_url)
celery.conf.update(
    timezone="UTC",
    enable_utc=True,
    broker_connection_retry_on_startup=True,
    task_serializer="json",
    accept_content=["json"],
    beat_schedule={"outbox-every-30-seconds": {"task": "petstyle.deliver_notifications", "schedule": 30.0}},
)
logger = logging.getLogger("petstyle")


def send_email(notification):
    b = notification.booking
    subject = {"confirmation": "Agendamento confirmado", "reminder": "Seu pet tem um encontro marcado", "cancellation": "Agendamento cancelado"}[
        notification.kind
    ]
    when = aware(b.slot.starts_at).astimezone(ZoneInfo(settings.timezone)).strftime("%d/%m/%Y às %H:%M")
    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = b.owner.email
    msg["Subject"] = f"Pet Style • {subject}"
    msg["Message-ID"] = f"<petstyle-notification-{notification.id}@petstyle.example>"
    msg.set_content(
        f"Olá, {b.owner.name}!\n\n{subject}.\nPet: {b.pet.name}\nServiço: {b.service.name}\nHorário: {when} ({settings.timezone})\nValor: R$ {b.price_cents / 100:.2f}\nReserva #{b.id}\n\nConsulte o site para acompanhar sua agenda.\nEquipe Pet Style"
    )
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        if settings.smtp_starttls:
            smtp.starttls()
        if settings.smtp_username:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(msg)


def process_due(limit=50):
    delivered = 0
    for _ in range(limit):
        with SessionLocal() as db:
            # PostgreSQL: workers concorrentes pulam registros já bloqueados.
            notice = db.scalar(
                select(Notification)
                .where(Notification.state == "pending", Notification.due_at <= utcnow())
                .order_by(Notification.due_at)
                .with_for_update(skip_locked=True)
                .limit(1)
            )
            if not notice:
                break
            expected = "cancelled" if notice.kind == "cancellation" else "confirmed"
            if notice.booking.status != expected:
                notice.state = "skipped"
                db.commit()
                continue
            try:
                send_email(notice)
                notice.state = "sent"
                notice.last_error = ""
                delivered += 1
            except Exception as exc:
                notice.attempts += 1
                notice.state = "failed" if notice.attempts >= 5 else "pending"
                notice.last_error = type(exc).__name__
                notice.due_at = utcnow() + timedelta(minutes=5)
                logger.warning("notification_delivery_failed id=%s", notice.id)
            db.commit()
    return delivered


@celery.task(name="petstyle.deliver_notifications")
def deliver_notifications():
    return process_due()
