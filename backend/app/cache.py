import json
import logging
from functools import lru_cache
from redis import Redis
from .config import get_settings

logger = logging.getLogger("petstyle")
KEY = "petstyle:services:v1"


@lru_cache
def redis_client():
    s = get_settings()
    if not s.redis_enabled:
        return None
    return Redis.from_url(s.redis_url, decode_responses=True, socket_timeout=0.5, socket_connect_timeout=0.5)


def cached_services():
    client = redis_client()
    if client:
        try:
            raw = client.get(KEY)
            return json.loads(raw) if raw else None
        except Exception:
            logger.warning("services_cache_unavailable")
    return None


def save_services(data):
    client = redis_client()
    if client:
        try:
            client.setex(KEY, 60, json.dumps(data))
        except Exception:
            logger.warning("services_cache_write_failed")


def invalidate_services():
    client = redis_client()
    if client:
        try:
            client.delete(KEY)
        except Exception:
            logger.warning("services_cache_invalidation_failed")
