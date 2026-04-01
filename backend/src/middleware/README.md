# src/middleware/

Express middleware applied to incoming HTTP requests. Middleware runs in registration order — the order in `src/app.ts` matters.

## Execution Order

```
Request
   │
   ▼
correlationIdMiddleware   ← assigns X-Correlation-ID to every request
   │
   ▼
rateLimitMiddleware       ← rejects if client exceeds 30 req/min
   │
   ▼
authMiddleware            ← rejects if JWT is missing or invalid
   │
   ▼
Route handler             ← your business logic
   │
   ▼
errorMiddleware           ← catches thrown errors, formats JSON response
```

## Files

### `auth.middleware.ts`
Validates the `Authorization: Bearer <token>` header using Supabase's `auth.getUser()`. On success, attaches `req.user = { id, email }` for downstream handlers. On failure, responds with 401.

**Does not** check ownership, permissions, or make any database queries beyond token verification.

- **Do not modify** to add authorization logic (e.g., "can this user access this resource?"). That belongs in the route handler or a dedicated authorization layer.
- **Modify when**: the authentication mechanism changes (e.g., switching from Supabase Auth to a custom JWT).

### `error.middleware.ts`
Central error formatter. Catches all errors thrown by route handlers and services, maps them to HTTP status codes, and returns a consistent `{ error, message, status }` JSON shape.

Uses `AppError` for intentional errors with a specific status code:
```ts
throw new AppError("Video not found", 404);
```

Unknown errors default to 500. 4xx errors are logged as warnings; 5xx errors are logged as errors.

**Must be registered last** in `app.ts`. Express identifies error middleware by its 4-parameter signature `(err, req, res, next)`.

- **Do not modify** the response shape — clients depend on `{ error, message, status }`.
- **Modify when**: you need to add new error types or change logging behavior.

### `rateLimit.middleware.ts`
In-memory sliding window rate limiter. Limits each IP to 30 requests per minute. Sets standard `X-RateLimit-*` response headers.

**Limitation**: the in-memory store resets on server restart and does not work across multiple server instances. For multi-instance deployments, replace with a Redis-backed rate limiter (e.g., `rate-limit-redis`).

- **Modify when**: you need to change the rate limit window, max requests, or switch to a distributed store.
- **Do not modify** to add per-user or per-route limits without careful consideration of the in-memory store's limitations.

### `correlationId.middleware.ts`
Assigns a unique correlation ID to every request. Reads from `X-Correlation-ID` or `X-Request-ID` headers if present (useful for tracing across services), otherwise generates a new UUID. Attaches the ID to `req.correlationId` and echoes it back in the `X-Correlation-ID` response header.

- **Modify when**: you need to change the header name or ID generation strategy.
- **Do not modify** to add business logic.
