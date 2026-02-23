# Stage 1: Build the frontend
FROM node:20 AS frontend

WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build native modules for server
FROM node:20 AS server-deps

WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev
# Force rebuild better-sqlite3 for this exact platform
RUN npx --yes prebuild-install --runtime napi --target 9 -d better-sqlite3 2>/dev/null || npm rebuild better-sqlite3 --build-from-source
# Verify it loads
RUN node -e "require('better-sqlite3'); console.log('better-sqlite3 OK')"

# Stage 3: Final production image
FROM node:20-slim

WORKDIR /app

# Copy pre-built server deps (with native modules)
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server/package.json ./server/

# Copy server source
COPY server/ ./server/

# Copy built frontend
COPY --from=frontend /app/client/dist ./client/dist

# Copy root files
COPY API_DOCS.md ./

# Writable directories
RUN mkdir -p uploads

ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Verify it still works in the final image, then start
CMD ["node", "server/index.js"]
