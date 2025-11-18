const buckets = new Map<string, { tokens: number; last: number }>();

export function rateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string; // identifier (IP or slug)
  limit: number; // allowed requests per window
  windowMs: number; // window in ms
}): boolean {
  const now = Date.now();
  if (!buckets.has(key)) {
    buckets.set(key, { tokens: limit, last: now });
  }

  const bucket = buckets.get(key)!;
  const elapsed = now - bucket.last;

  if (elapsed > windowMs) {
    bucket.tokens = limit;
    bucket.last = now;
  }

  if (bucket.tokens <= 0) {
    return false;
  }

  bucket.tokens -= 1;
  return true;
}

