"use client";

const STORAGE_KEY = "discount_hub_visitor_id";

let cachedVisitorId: string | null = null;
let inFlight: Promise<string | null> | null = null;

/**
 * Returns the FingerprintJS visitorId for this browser, lazy-loading the
 * library on first call and caching the result in localStorage. Subsequent
 * calls within the same tab resolve from in-memory cache.
 *
 * Returns null on the server or when the library fails to initialise.
 */
export function getVisitorId(): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (cachedVisitorId) return Promise.resolve(cachedVisitorId);

  if (!inFlight) {
    inFlight = (async () => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored && /^[A-Za-z0-9_-]{6,128}$/.test(stored)) {
          cachedVisitorId = stored;
          return stored;
        }

        const FingerprintJS = await import("@fingerprintjs/fingerprintjs");
        const agent = await FingerprintJS.load();
        const result = await agent.get();
        const id = result.visitorId;
        if (id) {
          cachedVisitorId = id;
          try {
            window.localStorage.setItem(STORAGE_KEY, id);
          } catch {
            // localStorage might be unavailable (private mode, etc.) — fine
          }
        }
        return id ?? null;
      } catch (err) {
        console.warn("[fingerprint] init failed:", err);
        return null;
      }
    })();
  }
  return inFlight;
}

export function getCachedVisitorId(): string | null {
  if (cachedVisitorId) return cachedVisitorId;
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && /^[A-Za-z0-9_-]{6,128}$/.test(stored)) {
    cachedVisitorId = stored;
    return stored;
  }
  return null;
}
