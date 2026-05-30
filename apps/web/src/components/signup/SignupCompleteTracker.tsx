/**
 * SignupCompleteTracker — fire-and-forget React island that marks the
 * authenticated user's signup flow as complete.
 *
 * Mounted in Step4Welcome. As soon as the welcome screen renders we POST
 * /api/auth/signup-complete (idempotent — backend only sets the column if
 * currently null). The user sees the welcome message immediately; the API
 * call runs in the background.
 *
 * Failure handling: if the request fails (network, server down, 401 because
 * the cookie expired between page load and mount), we swallow it. The user
 * can still play; the gate will simply not lock them out next time.
 *
 * Returns null — no visual rendering.
 */

import { useEffect } from "react";

export function SignupCompleteTracker() {
  useEffect(() => {
    fetch("/api/auth/signup-complete", {
      method: "POST",
      credentials: "include",
    }).catch(() => {
      /* swallow — see file header */
    });
  }, []);

  return null;
}
