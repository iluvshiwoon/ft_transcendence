/**
 * Server-side auth check for Astro SSR pages.
 *
 * Reads the `auth_token` cookie from the incoming request and validates it
 * against the backend's /api/auth/me. Returns true if the cookie corresponds
 * to a real, current user; false otherwise (no cookie, expired token,
 * backend unreachable, etc).
 *
 * Used by page-level access gates — see apps/web/src/pages/signup.astro and
 * apps/web/src/pages/play.astro for usage. The actual API endpoints already
 * enforce auth via their own middleware; this helper is just so we can
 * redirect BEFORE rendering instead of letting the user fill in a form
 * that's going to 401 on submit.
 */

interface AstroLike {
  cookies: { get(name: string): { value?: string } | undefined };
}

/** Backend URL — `http://server:3000` inside compose, `localhost:3000` for `make dev`. */
function backendUrl(): string {
  return process.env.BACKEND_URL ?? "http://localhost:3000";
}

export async function isAuthenticated(astro: AstroLike): Promise<boolean> {
  const authToken = astro.cookies.get("auth_token")?.value;
  if (!authToken) return false;

  try {
    const res = await fetch(`${backendUrl()}/api/auth/me`, {
      headers: { Cookie: `auth_token=${authToken}` },
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    // Network error / timeout / backend down — treat as unauthenticated.
    // Worst case: a real user gets briefly redirected to /signup; they can
    // retry. Better than rendering a form that won't work.
    return false;
  }
}
