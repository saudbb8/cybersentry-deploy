FROM python:3.11-slim

WORKDIR /app

COPY api/requirements.txt ./requirements.txt

RUN pip3 install --no-cache-dir -r requirements.txt

COPY api/ ./

ENV PORT=8080

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
