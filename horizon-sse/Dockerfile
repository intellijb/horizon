# Multi-stage Dockerfile for Node.js SSE Battle Testing

# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY tsconfig.json ./
RUN npm install
COPY src/ ./src/
RUN npm run build

# Deep Server
FROM node:18-alpine AS deep-server
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 10091
CMD ["node", "dist/deep-server/index_clean.js"]

# Proxy Server
FROM node:18-alpine AS proxy-server
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 10090
CMD ["node", "dist/proxy-server/index.js"]

# Load Test Client
FROM node:18-alpine AS loadtest
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/loadtest/index.js"]