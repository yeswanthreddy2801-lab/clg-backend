# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig*.json ./
COPY apps/api/package*.json ./apps/api/
COPY prisma.config.ts ./

RUN npm install

COPY . .

RUN npm run build --workspace=apps/api

# Stage 2: Production Image
FROM node:20-alpine

# Use non-root user
USER node

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./
COPY --chown=node:node apps/api/package*.json ./apps/api/

# Only install production dependencies
RUN npm install --omit=dev

# Copy compiled artifacts from builder
COPY --chown=node:node --from=builder /usr/src/app/apps/api/dist ./apps/api/dist

EXPOSE 3000
CMD ["node", "apps/api/dist/main"]
