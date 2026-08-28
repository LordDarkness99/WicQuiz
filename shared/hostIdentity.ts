const HOST_ID_KEY = "qt_host_id";
const LEGACY_KEY = "quiztime_host_id";

/** Get or create a persistent host ID from localStorage. */
export function getHostId(): string {
  if (typeof window === "undefined") return "";

  // Check new key first, then legacy key
  let hostId = localStorage.getItem(HOST_ID_KEY);
  if (!hostId) {
    hostId = localStorage.getItem(LEGACY_KEY);
    if (hostId) {
      // Migrate to new key
      localStorage.setItem(HOST_ID_KEY, hostId);
    }
  }
  if (!hostId) {
    hostId = crypto.randomUUID();
    localStorage.setItem(HOST_ID_KEY, hostId);
  }
  return hostId;
}

/** Check if a host ID exists (user has hosted before). */
export function hasHostId(): boolean {
  if (typeof window === "undefined") return false;
  return !!(localStorage.getItem(HOST_ID_KEY) || localStorage.getItem(LEGACY_KEY));
}
