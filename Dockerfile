# Multi-stage build for production
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN npm run install-all

# Copy source code
COPY . .

# Build client
WORKDIR /app/client
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy server package files
COPY server/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy server source code
COPY server/ .

# Copy built client from builder stage
COPY --from=builder /app/client/build ./public

# Create uploads directory
RUN mkdir -p uploads/questions

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]
