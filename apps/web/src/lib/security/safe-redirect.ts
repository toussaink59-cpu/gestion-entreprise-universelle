const SAFE_BASE_URL = "https://safe-redirect.invalid";

export function getSafeRedirectPath(
  candidate: string | null,
  fallback = "/dashboard",
): string {
  if (!candidate || !candidate.startsWith("/")) {
    return fallback;
  }

  try {
    const target = new URL(candidate, SAFE_BASE_URL);

    if (target.origin !== SAFE_BASE_URL) {
      return fallback;
    }

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}