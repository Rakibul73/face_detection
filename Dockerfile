FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

# Install Node.js 22.12.0
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps flag
RUN npm install --legacy-peer-deps

# Create and set permissions
RUN mkdir -p uploads models && \
    chmod 777 uploads models

# Copy all files
COPY . .

# Environment variables for TensorFlow
ENV LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH
ENV NVIDIA_VISIBLE_DEVICES=all

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

CMD ["npm", "start"]