# ------------------------------
# ✅ Backend Dockerfile (Django)
# ------------------------------
FROM python:3.10-slim

# Set work directory
WORKDIR /app/my-first-app/CliffINDUS

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev gcc && \
    apt-get clean

# Copy requirements and install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Expose Django port
EXPOSE 8000

# Default command
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
