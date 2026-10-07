FROM node:20-bookworm-slim

WORKDIR /app

# Install system dependencies for PaddleOCR, OpenCV and PDF rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-dev \
    poppler-utils \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy Node dependency specifications
COPY package*.json ./
RUN npm ci --omit=dev

# Copy OCR python requirements and install
COPY ocr/requirements.txt ./ocr/
RUN pip3 install --no-cache-dir --break-system-packages -r ocr/requirements.txt || true

# Copy application code
COPY . .

# Create uploads directory with appropriate permissions
RUN mkdir -p uploads && chown -R node:node /app

USER node

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "server.js"]
