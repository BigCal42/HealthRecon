# Reliability and Testing

This document describes HealthRecon's observability infrastructure, error reporting, and testing practices.

## Logging

### Overview

HealthRecon uses a centralized, structured logging system located in `lib/logger.ts`. All logs are JSON-formatted and include contextual metadata for easier debugging and analysis.

### Log Levels

- **`debug`**: Detailed diagnostic information (only in development)
- **`info`**: General informational messages about application flow
- **`warn`**: Warning messages for potentially problematic situations
- **`error`**: Error messages for failures and exceptions

### Usage

#### Basic Logging

```typescript
import { log } from "@/lib/logger";

log("info", "User logged in", { userId: "user123" });
log("error", "Failed to process payment", { orderId: "order456", error });
```

#### Request-Level Logging

For API routes, use the request context helper from `lib/apiLogging.ts`:

```typescript
import { createRequestContext } from "@/lib/apiLogging";

export async function POST(request: Request) {
  const ctx = createRequestContext("/api/example");
  ctx.logInfo("Request received");
  
  try {
    // ... handler logic ...
    ctx.logInfo("Request completed", { itemsProcessed: 10 });
    return apiSuccess(result);
  } catch (error) {
    ctx.logError(error, "Request failed");
    return apiError(500, "error_code", "Error message");
  }
}
```

The request context automatically:
- Generates a unique `requestId` for each request
- Attaches route information to all logs
- Provides consistent `logInfo` and `logError` helpers
- Integrates with error reporting (see below)

### Context Fields

Common context fields include:
- `requestId`: Unique identifier for the request
- `route`: API route path
- `systemSlug`: System identifier
- `systemId`: System UUID
- `userId`: User identifier (when applicable)

### Security

The logger automatically sanitizes sensitive data:
- Passwords, secrets, tokens, API keys
- Full request bodies
- Authorization headers

Never log:
- Environment variables
- API keys or secrets
- Full user input (only metadata)
- Sensitive personal information

## Error Reporting

### Sentry Integration

HealthRecon includes optional Sentry integration for production error tracking. Sentry is **completely optional** and gracefully degrades to logging-only if not configured.

### Enabling Sentry

1. Install the Sentry SDK (optional):
   ```bash
   npm install @sentry/nextjs
   ```

2. Set the `SENTRY_DSN` environment variable:
   ```bash
   SENTRY_DSN=https://your-dsn@sentry.io/project-id
   ```

3. Initialize Sentry early in your app lifecycle (e.g., in `middleware.ts` or root layout):
   ```typescript
   import { initSentry } from "@/lib/sentry";
   
   initSentry();
   ```

### Using Error Reporting

Errors are automatically captured when using the request context:

```typescript
const ctx = createRequestContext("/api/example");
ctx.logError(error, "Operation failed", { additionalContext });
```

Or manually:

```typescript
import { captureError } from "@/lib/sentry";

try {
  // ... code ...
} catch (error) {
  captureError(error, { route: "/api/example", userId: "user123" });
}
```

### Graceful Degradation

If Sentry is not configured (no DSN or SDK not installed):
- Errors are still logged via the structured logger
- No runtime errors occur
- Application continues to function normally

## Tests

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch
```

### Test Structure

Tests are co-located with source files using the `.test.ts` suffix:
- `lib/getTodayFocus.ts` → `lib/getTodayFocus.test.ts`
- `app/api/worklist/route.ts` → `app/api/worklist/route.test.ts`

### Test Coverage

Current test coverage includes:

#### Core Library Functions
- **`getTodayFocus`**: Tests filtering, sorting, and health band attachment
- **`getSystemTimeline`**: Tests merging, sorting, and mapping of timeline items
- **`getSystemInsights`**: Tests metric computation (signals, opportunities, work items, interactions)

#### API Routes
- **`/api/worklist`**: Tests GET/POST handlers, validation, rate limiting, error handling

### Writing Tests

#### Unit Tests for Library Functions

```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "./myFunction";

describe("myFunction", () => {
  it("handles basic case", () => {
    const result = myFunction(input);
    expect(result).toEqual(expected);
  });
});
```

#### Mocking Supabase

For functions that use Supabase, create a mock client:

```typescript
function createMockSupabase(overrides = {}) {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          returns: () => Promise.resolve({ data: mockData, error: null }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}
```

#### API Route Tests

For API routes, mock dependencies:

```typescript
import { vi } from "vitest";

vi.mock("@/lib/worklist", () => ({
  getWorkItems: vi.fn(),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn(),
}));
```

### Test Best Practices

1. **Test behavior, not implementation**: Focus on what the function does, not how it does it
2. **Use descriptive test names**: `"filters items by status"` not `"test1"`
3. **Test edge cases**: Empty inputs, null values, error conditions
4. **Keep tests isolated**: Each test should be independent
5. **Mock external dependencies**: Don't hit real databases or APIs in tests

## Reliability Checklist

Before deploying to production, ensure:

### Pre-Deployment Checks

```bash
# Lint code
npm run lint

# Type check
npm run type-check

# Run tests
npm test

# Build application
npm run build
```

### Environment Variables

Confirm the following environment variables are set:

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `FIRECRAWL_API_KEY`

**Optional:**
- `SENTRY_DSN` (for error tracking)

### Log Review

Before deploying, review logs for:
- Any noisy debug logs that should be removed
- Sensitive information being logged (should be sanitized)
- Appropriate log levels (info vs warn vs error)

### Monitoring

In production:
- Monitor structured logs via your platform's log aggregation (Vercel logs, etc.)
- Review Sentry dashboard for error trends (if enabled)
- Set up alerts for error rate spikes
- Track request-level metrics via `requestId` correlation

## Adding New Observability

### Adding Logging to a New Route

1. Import `createRequestContext`:
   ```typescript
   import { createRequestContext } from "@/lib/apiLogging";
   ```

2. Create context at start of handler:
   ```typescript
   const ctx = createRequestContext("/api/my-route");
   ctx.logInfo("Request received");
   ```

3. Use context for all logging:
   ```typescript
   ctx.logInfo("Operation completed", { count: 10 });
   ctx.logError(error, "Operation failed");
   ```

### Adding Tests for New Functions

1. Create `myFunction.test.ts` next to `myFunction.ts`
2. Write test cases covering:
   - Happy path
   - Edge cases
   - Error conditions
3. Mock external dependencies (Supabase, APIs, etc.)
4. Run tests: `npm test`

## Troubleshooting

### Logs Not Appearing

- Check `NODE_ENV` (debug logs only in development)
- Verify logger is imported correctly
- Check console output (logs go to stdout/stderr)

### Sentry Not Capturing Errors

- Verify `SENTRY_DSN` is set
- Check that `initSentry()` was called
- Review Sentry dashboard for initialization errors
- Remember: Sentry is optional, errors are still logged

### Tests Failing

- Run `npm run type-check` to catch type errors
- Check that mocks match actual function signatures
- Verify test data matches expected schema
- Review test output for specific assertion failures

