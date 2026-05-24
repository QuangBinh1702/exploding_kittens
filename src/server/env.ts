const redisEnvKeys = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"] as const;
const pusherEnvKeys = [
  "PUSHER_APP_ID",
  "PUSHER_SECRET",
  "NEXT_PUBLIC_PUSHER_KEY",
  "NEXT_PUBLIC_PUSHER_CLUSTER",
] as const;

const warned = new Set<string>();

export function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

function missing(keys: readonly string[]) {
  return keys.filter((key) => !process.env[key]);
}

function warnOnce(key: string, message: string) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(message);
}

export function getRedisEnv() {
  const missingKeys = missing(redisEnvKeys);
  if (missingKeys.length > 0) {
    if (isProductionRuntime()) {
      throw new Error(`Missing required Redis environment variables: ${missingKeys.join(", ")}`);
    }
    warnOnce("redis-fallback", "Redis environment variables are missing. Using in-memory storage for local development only.");
    return undefined;
  }
  return {
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  };
}

export function getPusherEnv() {
  const missingKeys = missing(pusherEnvKeys);
  if (missingKeys.length > 0) {
    if (isProductionRuntime()) {
      throw new Error(`Missing required Pusher environment variables: ${missingKeys.join(", ")}`);
    }
    warnOnce("pusher-disabled", "Pusher environment variables are missing. Realtime updates are disabled; polling remains active in development.");
    return undefined;
  }
  return {
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  };
}
