# Security Architecture

This document summarizes the security posture, authentication model, and tenant isolation guarantees of the CampusVerse backend.

## 1. Authentication Model (JWT & RBAC)
- **Transport**: All authenticated endpoints require a Bearer token in the `Authorization` header.
- **JWT**: Tokens are signed using a robust secret (`JWT_SECRET`) and are short-lived. They contain the user's `id`, `collegeId`, and `role`.
- **Role-Based Access Control (RBAC)**: Endpoints are protected by `JwtAuthGuard` and `RolesGuard`. For instance, `/admin/*` routes are strictly limited to users with the `admin` or `super_admin` role.
- **Data Serialization**: The global `ClassSerializerInterceptor` ensures that fields decorated with `@Exclude()` (like `passwordHash` in the User entity) are strictly stripped from all outgoing HTTP responses.

## 2. Tenant Isolation
- **College Scoping**: CampusVerse is a multi-tenant application where the "tenant" is the College.
- **Data Boundaries**: Every query in the Feed, Search, Projects, and Marketplace modules explicitly includes a `where: { collegeId: user.collegeId }` clause. 
- **Validation**: Cross-college interactions are forbidden at the database query level, preventing any horizontal privilege escalation (IDOR). The `collegeId` is extracted securely from the verified JWT, never from user input.

## 3. Rate Limiting and DDoS Protection
- **Global Rate Limiting**: We utilize `@nestjs/throttler` backed by Redis (`ThrottlerStorageRedisService`) as a global guard across all endpoints.
- **Endpoint Specific Limits**: High-risk routes (like `/auth/login` and password reset) have custom, much stricter limits configured via controller-level `@Throttle()` decorators to prevent brute-force attacks.

## 4. Moderation Pipeline & Media
- **AI Moderation**: All user-generated text and images pass through our AI Moderation pipeline (via `ContentModerationProvider`) during creation. Content matching spam/hate heuristics or explicit imagery is immediately flagged to the Super Admin queue.
- **Secure Media Delivery**: Files uploaded to S3 are never served publicly. The backend generates short-lived pre-signed URLs. 
- **CSRF**: Because the architecture relies on Authorization headers for mobile and SPA clients (rather than session cookies), CSRF is naturally mitigated.
