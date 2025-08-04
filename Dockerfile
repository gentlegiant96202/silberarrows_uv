# Use Python 3.9 slim image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install IOPaint
RUN pip install --no-cache-dir iopaint

# Create directories for models and uploads
RUN mkdir -p /app/models /app/uploads

# Expose port
EXPOSE 8080

# Set environment variables
ENV IOPAINT_MODEL=lama
ENV IOPAINT_DEVICE=cpu
ENV IOPAINT_PORT=8080
ENV IOPAINT_HOST=0.0.0.0

# Start IOPaint
CMD ["sh", "-c", "iopaint start --model=${IOPAINT_MODEL} --device=${IOPAINT_DEVICE} --port=${PORT:-8080} --host=${IOPAINT_HOST}"] 