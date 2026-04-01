# src/notifications/

Handles real-time and offline notification delivery to users when jobs complete or fail.

## Routing Logic

Notifications are routed in priority order:

```
1. WebSocket  →  if user has an active WebSocket connection
2. SSE        →  if user has an active SSE connection (WebSocket fallback)
3. Email      →  if user is offline (no WebSocket or SSE connection)
```

`NotificationService` checks connection status before sending. If a user disconnects between the status check and the send, the system falls back to the next channel automatically.

## Files

### `NotificationService.ts`
The orchestrator. All notification sends go through here — workers and routes should never call `WebSocketServer`, `SSEServer`, or `EmailClient` directly.

Key methods:
- `sendJobNotification(notification)` — routes a single job notification to the right channel
- `sendBatchNotification(notification)` — sends a single summary notification when all jobs in a batch complete
- `registerBatch(sessionId, userId, jobIds)` — registers a set of jobs for batch tracking
- `getUserConnectionStatus(userId)` — returns `true` if the user has any active connection

Batch tracking is in-memory (`Map`). When all jobs in a batch complete or fail, a single batch notification is sent instead of one per job.

- **Modify when**: you need to add a new notification channel or change routing priority.
- **Do not modify** to add channel-specific logic — that belongs in the individual channel files.

### `WebSocketServer.ts`
Manages WebSocket connections at `/ws`.

Features:
- JWT authentication on connection (via Supabase `auth.getUser`)
- Tracks multiple connections per user (a user can have multiple browser tabs open)
- Stores missed notifications for up to 10 minutes and replays them on reconnect
- Cleans up stale connections (no activity for 5 minutes) every 60 seconds
- Responds to `ping` messages with `pong` for heartbeat support

Requires an HTTP server instance to attach to — call `wsServer.initialize(httpServer)` after the Express server is created. The generation worker skips WebSocket initialization since it has no HTTP server.

- **Modify when**: you need to change authentication, add new message types, or change the missed notification window.

### `SSEServer.ts`
Manages Server-Sent Events connections. Used as a fallback for environments where WebSocket connections are blocked (corporate firewalls, some proxies).

SSE connections are established via a GET request with a JWT token. The server sends a heartbeat every 30 seconds to keep connections alive through proxies.

- **Modify when**: you need to change the heartbeat interval or add new SSE event types.

### `EmailClient.ts`
Sends email notifications for job completions and failures.

Supports batching: if a user has `batchNotifications` enabled in their preferences, completions within a 5-minute window are grouped into a single email. The batch is processed every 60 seconds.

Currently uses `console.log` as a placeholder. To integrate a real email provider (SendGrid, AWS SES, Resend), replace the `send()` method body.

- **Modify when**: you need to integrate a real email provider, change email templates, or change the batch window.

### `types.ts`
TypeScript types for the notification system. No logic.

### `index.ts`
Re-exports all notification classes for convenient importing.

## Adding a New Notification Channel

1. Create a new file (e.g., `PushNotificationClient.ts`) with `broadcast(userId, notification)` and `isUserConnected(userId)` methods
2. Add it as a constructor parameter to `NotificationService`
3. Update the routing logic in `sendJobNotification` to check the new channel
4. Update `run-generation-worker.ts` to initialize and inject the new client
