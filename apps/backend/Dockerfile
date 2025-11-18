# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY turbo.json ./

# Copy backend package files
COPY apps/backend/package*.json ./apps/backend/

# Install dependencies
RUN npm install

# Copy backend source
COPY apps/backend ./apps/backend

# Build backend
WORKDIR /app/apps/backend
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY apps/backend/package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy built app from builder
COPY --from=builder /app/apps/backend/dist ./dist

# Expose port
EXPOSE 3001

# Start the app
CMD ["node", "dist/main"]
