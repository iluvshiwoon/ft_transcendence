/**
 * Client for /api/profile* and /api/auth/oauth42/* endpoints.
 *
 * All endpoints require auth — the auth_token cookie is sent
 * automatically via `credentials: "include"`. Errors throw
 * `ProfileApiError` with a typed code + the server's message +
 * the HTTP status, mirroring `play-api.ts`'s PlayApiError.
 *
 * Used by the /settings React islands (SettingsProfile,
 * SettingsAppearance, SettingsAccount). The /settings page SSR
 * path uses ~/lib/auth → getCurrentUser for the initial read
 * (no fetch needed when the cookie is already validated).
 */

import type { Title } from "~/lib/auth";

export interface ProfileMe {
  id: number;
  email: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  pawnSkin: string;
  gridSkin: string;
  oauth42Linked: boolean;
  rating: number;
  peakRating: number;
  rank: number;
  title: Title;
}

export interface ProfileUpdate {
  id: number;
  username: string;
  bio: string | null;
  pawnSkin: string;
  gridSkin: string;
}

export type ProfileErrorCode =
  | "INVALID_BODY"
  | "INVALID_USERNAME"
  | "USERNAME_TAKEN"
  | "BIO_TOO_LONG"
  | "INVALID_SKIN"
  | "INVALID_FILE"
  | "FILE_TOO_LARGE"
  | "WRONG_PASSWORD"
  | "EMAIL_IN_USE"
  | "PASSWORD_REQUIRED"
  | "OAUTH_NOT_LINKED"
  | "OAUTH_UNLINK_BLOCKED"
  | "NOT_AUTHED"
  | "INTERNAL"
  | "NETWORK";

export class ProfileApiError extends Error {
  constructor(
    public readonly code: ProfileErrorCode,
    message: string,
    public readonly httpStatus?: number,
  ) {
    super(message);
    this.name = "ProfileApiError";
  }
}

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

async function requestJson<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  let res: Response;
  try {
    const headers: Record<string, string> = {
      ...JSON_HEADERS,
      ...(init.headers as Record<string, string> | undefined),
    };
    res = await fetch(url, { ...init, credentials: "include", headers });
  } catch (e) {
    throw new ProfileApiError(
      "NETWORK",
      e instanceof Error ? e.message : "Network error",
    );
  }
  return parseJson<T>(res);
}

async function parseJson<T>(res: Response): Promise<T> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const b = body as { error?: string; message?: string } | null;
    throw new ProfileApiError(
      (b?.error as ProfileErrorCode) ?? "INTERNAL",
      b?.message ?? `Request failed with status ${res.status}`,
      res.status,
    );
  }
  return body as T;
}

// ─── Read ─────────────────────────────────────────────────────────────

export function fetchMyProfile(): Promise<ProfileMe> {
  return requestJson<ProfileMe>("/api/profile", { method: "GET" });
}

// ─── Update (username, bio, skins) ────────────────────────────────────

export function updateProfile(
  patch: Partial<{
    username: string;
    bio: string;
    pawnSkin: string;
    gridSkin: string;
  }>,
): Promise<ProfileUpdate> {
  return requestJson<ProfileUpdate>("/api/profile", {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

// ─── Email + password (re-auth) ──────────────────────────────────────

export function updateEmail(args: {
  currentPassword: string;
  newEmail: string;
}): Promise<{ email: string }> {
  return requestJson<{ email: string }>("/api/profile/email", {
    method: "PUT",
    body: JSON.stringify(args),
  });
}

export function updatePassword(args: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ message: string }> {
  return requestJson<{ message: string }>("/api/profile/password", {
    method: "PUT",
    body: JSON.stringify(args),
  });
}

// ─── Avatar (multipart) ──────────────────────────────────────────────

export function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const form = new FormData();
  form.append("file", file);
  // Don't set Content-Type — let the browser pick multipart/form-data
  // with the right boundary. Overriding it would break the multipart
  // framing and Fastify would 400.
  return requestJson<{ avatarUrl: string }>("/api/profile/avatar", {
    method: "POST",
    body: form,
  });
}

// ─── Account deletion ────────────────────────────────────────────────

export function deleteAccount(): Promise<{ message: string }> {
  return requestJson<{ message: string }>("/api/profile", { method: "DELETE" });
}

// ─── 42 OAuth link / unlink ──────────────────────────────────────────

/** Start the link flow. The OAuth 42 callback already handles the link
 *  case when the caller is already authed (see auth.ts:303-315 — it sets
 *  oauth42Id on the current user's row and redirects to /profile?linked=true).
 *  No intent param needed: a plain navigation to /api/auth/42 while authed
 *  triggers the link branch via the existingToken check. */
export function startLinkOAuth42(): string {
  return "/api/auth/42";
}

export function unlinkOAuth42(): Promise<{ ok: true }> {
  return requestJson<{ ok: true }>("/api/auth/oauth42/unlink", {
    method: "POST",
  });
}
