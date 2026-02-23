# Stage 1: Build the frontend
FROM node:20-slim AS builder

WORKDIR /app

# Install client dependencies and build
COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npm run build

# Stage 2: Production server
FROM node:20-slim

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install server dependencies
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm ci --omit=dev

# Copy server code
COPY server/ ./server/

# Copy built frontend from stage 1
COPY --from=builder /app/client/dist ./client/dist

# Copy root files
COPY API_DOCS.md ./
COPY .gitignore ./

# Create uploads directory
RUN mkdir -p uploads

# Cloud Run sets PORT env var (default 8080)
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "server/index.js"]
