# CampusVerse Backend - Phase 0 Setup

This is the monorepo backend for CampusVerse, built with NestJS, PostgreSQL, Redis, Kafka (Redpanda), OpenSearch, and MinIO.

## Prerequisites
- Node.js (v18+)
- Docker and Docker Compose
- NPM (or Yarn/PNPM)

## Local Infrastructure Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Start the local infrastructure (Postgres, Redis, OpenSearch, Redpanda, MinIO) using Docker Compose:
   ```bash
   cd infra/docker
   docker-compose up -d
   ```
3. Install dependencies in the NestJS application:
   ```bash
   cd apps/api
   npm install
   ```
4. Run the development server:
   ```bash
   npm run start:dev
   ```

## Available Services

- **NestJS API**: `http://localhost:3000`
- **Swagger Docs**: `http://localhost:3000/docs`
- **Health Check**: `http://localhost:3000/health`
- **Postgres DB**: `localhost:5432`
- **pgAdmin**: `http://localhost:5050`
- **Redis**: `localhost:6379`
- **MinIO Console**: `http://localhost:9001`
- **OpenSearch**: `http://localhost:9200`
- **Redpanda (Kafka)**: `localhost:9092`
