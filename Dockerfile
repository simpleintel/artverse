FROM node:20

WORKDIR /app

# Copy and install server dependencies (includes native better-sqlite3)
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm ci --omit=dev && node -e "require('better-sqlite3'); console.log('✓ better-sqlite3 OK')"

# Copy and install client dependencies, then build
COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build && rm -rf node_modules

# Copy server source and other files
COPY server/ ./server/
COPY API_DOCS.md ./

RUN mkdir -p uploads

ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "server/index.js"]
