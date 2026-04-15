FROM python:3.11-slim

WORKDIR /app

# Copy requirements first
COPY api/requirements.txt ./requirements.txt

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all api files
COPY api/main.py ./main.py
COPY api/database.py ./database.py
COPY api/auth_utils.py ./auth_utils.py
COPY api/email_service.py ./email_service.py
COPY api/routers ./routers

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
