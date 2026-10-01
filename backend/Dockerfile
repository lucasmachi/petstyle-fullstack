FROM docker.io/library/python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY requirements.lock.txt .
RUN pip install -r requirements.lock.txt && useradd --create-home --uid 10001 petstyle
COPY --chown=petstyle:petstyle . .
USER petstyle
EXPOSE 8000
CMD ["sh", "start.sh"]
