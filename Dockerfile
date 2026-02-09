# Multi-stage build for PubNub Internal Admin Framework
#
# SECURITY WARNING: This image can only run on machines with VPN access to internal-admin.pubnub.com
# DO NOT deploy to public cloud infrastructure or publish to public Docker registries

# ==============================================================================
# Stage 1: Build Frontend
# ==============================================================================
FROM node:18-alpine AS frontend-build

WORKDIR /app

# Copy frontend package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --ignore-scripts

# Copy frontend source code
COPY src ./src
COPY public ./public
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Build frontend (output to /app/dist)
RUN npm run build

# ==============================================================================
# Stage 2: Prepare Backend
# ==============================================================================
FROM node:18-alpine AS backend-prepare

WORKDIR /app/server

# Copy backend package files
COPY server/package*.json ./

# Install production dependencies only
RUN npm ci --only=production --ignore-scripts

# Copy backend source code
COPY server ./

# ==============================================================================
# Stage 3: Production Image
# ==============================================================================
FROM node:18-alpine

# Install serve globally for hosting frontend
RUN npm install -g serve

WORKDIR /app

# Copy backend from build stage
COPY --from=backend-prepare /app/server ./server

# Copy frontend build artifacts from build stage
COPY --from=frontend-build /app/dist ./dist

# Expose ports
# - 3000: Frontend (served via 'serve')
# - 5050: Backend API (Express)
EXPOSE 3000 5050

# Create startup script to run both frontend and backend
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Display security warnings' >> /app/start.sh && \
    echo 'echo ""' >> /app/start.sh && \
    echo 'echo "================================================================================"' >> /app/start.sh && \
    echo 'echo "⚠️  PubNub Internal Admin Framework"' >> /app/start.sh && \
    echo 'echo "🔒 VPN REQUIRED - This container requires access to internal-admin.pubnub.com"' >> /app/start.sh && \
    echo 'echo "🚫 INTERNAL USE ONLY - Do not deploy to public infrastructure"' >> /app/start.sh && \
    echo 'echo "================================================================================"' >> /app/start.sh && \
    echo 'echo ""' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start backend API server in background' >> /app/start.sh && \
    echo 'cd /app/server && node index.js &' >> /app/start.sh && \
    echo 'BACKEND_PID=$!' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Give backend time to start' >> /app/start.sh && \
    echo 'sleep 2' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start frontend server in foreground' >> /app/start.sh && \
    echo 'cd /app' >> /app/start.sh && \
    echo 'echo ""' >> /app/start.sh && \
    echo 'echo "Frontend: http://localhost:3000"' >> /app/start.sh && \
    echo 'echo "Backend API: http://localhost:5050"' >> /app/start.sh && \
    echo 'echo ""' >> /app/start.sh && \
    echo 'serve -s dist -l 3000' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# If serve exits, kill backend process' >> /app/start.sh && \
    echo 'kill $BACKEND_PID 2>/dev/null || true' >> /app/start.sh && \
    chmod +x /app/start.sh

# Health check - verify frontend is responding
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5050
ENV INTERNAL_ADMIN_URL=https://internal-admin.pubnub.com

# Add labels for documentation
LABEL maintainer="PubNub DevOps Team"
LABEL description="PubNub Internal Admin Framework - Requires VPN access"
LABEL version="1.0"
LABEL security.vpn-required="true"
LABEL security.internal-only="true"

# Run the startup script
CMD ["/app/start.sh"]
