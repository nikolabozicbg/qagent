# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy backend package files only
COPY apps/backend/package*.json ./

# Install dependencies
RUN npm install

# Copy backend source code
COPY apps/backend/src ./src
COPY apps/backend/tsconfig*.json ./
COPY apps/backend/nest-cli.json ./

# Build
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY apps/backend/package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy built app from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3001

# Start the app
CMD ["node", "dist/main"]
