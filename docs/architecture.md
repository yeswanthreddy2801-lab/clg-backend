# Architecture Document

## System Topology
The system is composed of the following services:
- **API Instances**: Stateless Node.js (NestJS) microservices serving REST APIs and WebSockets. Deployed as multiple replicas behind a load balancer.
- **Load Balancer**: HAProxy or Nginx proxying traffic to API instances.
- **PostgreSQL**: The primary relational database used for durable storage of users, posts, messages, and colleges.
- **Redis**: An in-memory data store used for:
  - Global Rate Limiting
  - Socket.io Adapter (multi-instance pub/sub)
  - Caching (Cache-aside pattern for hot reads)
  - Job Queues (BullMQ)
- **Kafka / Zookeeper**: Event streaming backbone used for decoupling services (e.g., Notification Consumer).
- **OpenSearch**: Used for full-text search and indexing of posts, users, and media.

## Scaling Levers
As we target 10M+ users and 1000+ colleges, the architecture is designed to scale horizontally using the following strategies:

### 1. Database Scaling (Read Replicas & Sharding)
- **Read Replicas**: The Prisma configuration uses a read-replica extension to route all non-transactional read queries (like feed browsing and viewing profiles) to Postgres read replicas, relieving the primary node. Writes explicitly hit the primary database.
- **Logical Sharding (Future-Proofing)**: Given our tenant model, **Logical Sharding by `collegeId`** is the natural fit.
  - Users generally interact within their own college's silo.
  - Data such as Posts, Stories, Projects, and Marketplace listings can be partitioned by hashing the `collegeId`.
  - Global endpoints (like inter-college search or super admin tools) would run scatter-gather queries across shards.

### 2. Caching Strategy
- **Cache-Aside Pattern**: Hot read paths (e.g., College Metadata, Trending Feeds) are cached in Redis with a Time-To-Live (TTL).
- **Invalidation**: Write operations (like updating college metadata) include an explicit cache-invalidation hook to maintain data freshness.

### 3. Application Layer
- **Stateless API**: Authentication uses JWTs, and Socket.io uses a Redis adapter, making API nodes completely stateless and horizontally scalable.
- **Rate Limiting**: Global Redis-backed rate limiting protects the platform from DDoS and abuse at the network edge.

## Failure Modes & Disaster Recovery (DR)
- **Cache Node Failure (Redis)**: If Redis fails, rate limiting will degrade gracefully or block depending on configuration. Caching will fall back to the primary database, increasing latency but keeping the system online.
- **Database Failure (Postgres)**:
  - **Backups**: Automated `pg_dump` backups are scheduled daily (via `scripts/backup-db.sh`), with WAL archiving enabled for Point-In-Time-Recovery (PITR).
  - **Failover**: If the primary node dies, a read replica must be manually or automatically promoted to primary.

### Basic DR Runbook
1. **Identify Outage**: Check OpenTelemetry tracing and Prometheus metrics `/metrics`.
2. **Database Restore**: If DB is corrupted, pull the latest snapshot from S3. Restore using `pg_restore`. Apply WAL logs up to the point of failure.
3. **Application Restart**: Roll out a restart to all API pods to clear any stale connections.

## Media & CDN Delivery
- **Signed URLs**: All media (images, videos) is served directly from an S3-compatible blob storage using short-lived pre-signed URLs (from Phase 5). The API never proxies media bytes.
- **CDN Cache Invalidation**: For updated assets (like avatar changes), we append a query parameter `?v=<timestamp>` to the signed URL to explicitly bust the CDN cache at the client level without needing to issue slow purge commands to the CDN edge nodes.
