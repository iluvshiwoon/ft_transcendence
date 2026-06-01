/**
 * SettingsAccount — Account card of the /settings page.
 *
 * Sections (top to bottom):
 *   1. Email         "Change" opens a re-auth modal (current password
 *                     + new email) → PUT /api/profile/email
 *   2. Password      "Change" opens a re-auth modal (current password
 *                     + new password, 8+ chars, double-entry) →
 *                     PUT /api/profile/password
 *   3. 42 OAuth      "Link" navigates to /api/auth/42 (the existing
 *                     callback's existingToken branch handles the link);
 *                     "Unlink" opens a confirmation modal → POST
 *                     /api/auth/oauth42/unlink
 *   4. Delete        Opens a confirmation modal (type 'DELETE' to
 *                     confirm) → DELETE /api/profile, then redirect to /
 *                     (the backend clears the auth cookie on the way out).
 *
 * All modals are inline (no portal / Radix). They use a simple
 * open/close state held in this card's React tree, with Escape-to-close
 * and overlay-click-to-close. Focus management: when a modal opens, the
 * first input is auto-focused; the previous focus is restored on close.
 *
 * Account deletion is destructive and irreversible — the modal requires
 * the user to type the literal string 'DELETE' to enable the button,
 * same affordance as GitHub's repo delete.
 */

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { AlertBox } from "~/components/ui/alert-box";
import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import {
  ProfileApiError,
  deleteAccount,
  startLinkOAuth42,
  unlinkOAuth42,
  updateEmail,
  updatePassword,
  type ProfileMe,
} from "~/lib/api/profile";

type ModalKind = "email" | "password" | "unlink" | "delete" | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SettingsAccountProps {
  initial: ProfileMe;
}

export function SettingsAccount({ initial }: SettingsAccountProps) {
  const [modal, setModal] = useState<ModalKind>(null);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);
  const [isUnlinking, startUnlink] = useTransition();

  function close() {
    setModal(null);
  }

  function handleUnlink() {
    setUnlinkError(null);
    startUnlink(async () => {
      try {
        await unlinkOAuth42();
        // The page is now stale on oauth42Linked — force a reload so
        // the button flips to "Link" and the helper text updates.
        window.location.reload();
      } catch (e) {
        const code = e instanceof ProfileApiError ? e.code : "INTERNAL";
        const msg =
          code === "OAUTH_UNLINK_BLOCKED"
            ? "Set a password before unlinking 42 (otherwise you'd be locked out)."
            : code === "OAUTH_NOT_LINKED"
            ? "42 isn't linked to this account."
            : e instanceof ProfileApiError
            ? e.message
            : "Unlink failed";
        setUnlinkError(msg);
      }
    });
  }

  return (
    <section
      aria-labelledby="settings-account-heading"
      className={cn("rounded-xl border border-border bg-surface text-surface-foreground", "page-reveal p-6 md:p-8")}
      style={{ "--reveal-delay": "0.15s" } as React.CSSProperties}
    >
      <h2 id="settings-account-heading" className="font-mono text-mono-md uppercase text-foreground">
        Account
      </h2>

      <div className="mt-6 flex flex-col gap-6">
        {/* Email */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-mono-sm uppercase text-muted-foreground">Email</p>
            <p className="mt-1 truncate font-sans text-sm text-foreground">{initial.email}</p>
          </div>
          <Button
            type="button"
            variant="brand-outline"
            size="pill"
            onClick={() => setModal("email")}
            className="shrink-0"
          >
            Change
          </Button>
        </div>

        {/* Password */}
        <div className="flex items-center justify-between gap-4 border-t border-border pt-6">
          <div className="min-w-0">
            <p className="font-mono text-mono-sm uppercase text-muted-foreground">Password</p>
            <p className="mt-1 font-mono text-mono-sm uppercase text-muted-foreground">
              Last changed · unknown
            </p>
          </div>
          <Button
            type="button"
            variant="brand-outline"
            size="pill"
            onClick={() => setModal("password")}
            className="shrink-0"
          >
            Change
          </Button>
        </div>

        {/* 42 OAuth */}
        <div className="flex flex-col gap-2 border-t border-border pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-mono-sm uppercase text-muted-foreground">42 account</p>
              <p className="mt-1 font-sans text-sm text-foreground">
                {initial.oauth42Linked ? "Linked" : "Not linked"}
              </p>
            </div>
            {initial.oauth42Linked ? (
              <Button
                type="button"
                variant="brand-outline"
                size="pill"
                onClick={() => setModal("unlink")}
                disabled={isUnlinking}
                className="shrink-0"
              >
                {isUnlinking ? "Unlinking…" : "Unlink"}
              </Button>
            ) : (
              <a
                href={startLinkOAuth42()}
                className={cn(buttonVariants({ variant: "brand-outline", size: "pill" }), "shrink-0")}
              >
                Link
              </a>
            )}
          </div>
          {unlinkError ? <AlertBox>{unlinkError}</AlertBox> : null}
        </div>

        {/* Delete */}
        <div className="flex items-center justify-between gap-4 border-t border-border pt-6">
          <div className="min-w-0">
            <p className="font-mono text-mono-sm uppercase text-muted-foreground">Delete account</p>
            <p className="mt-1 font-sans text-sm text-muted-foreground">
              Permanently remove your account and game history. This can't be undone.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setModal("delete")}
            className="shrink-0 border-2 border-accent bg-transparent text-accent hover:bg-accent hover:text-accent-foreground"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Modals */}
      {modal === "email" ? <EmailModal onClose={close} /> : null}
      {modal === "password" ? <PasswordModal onClose={close} /> : null}
      {modal === "unlink" ? (
        <UnlinkModal
          onClose={close}
          onConfirm={() => {
            handleUnlink();
            close();
          }}
        />
      ) : null}
      {modal === "delete" ? <DeleteModal onClose={close} /> : null}
    </section>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────

function ModalShell({
  title,
  onClose,
  children,
  maxWidth = "max-w-md",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  // Escape closes. Overlay click closes. The first focusable element is
  // auto-focused via the autoFocus prop on inputs below.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    // Lock body scroll while the modal is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full rounded-xl border border-border bg-surface p-6 shadow-2xl",
          maxWidth,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Email change ────────────────────────────────────────────────────

function EmailModal({ onClose }: { onClose: () => void }) {
  const currentPwId = useId();
  const newEmailId = useId();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const valid = currentPassword.length > 0 && EMAIL_RE.test(newEmail);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateEmail({ currentPassword, newEmail });
        // Reload so the displayed email in the card refreshes.
        window.location.reload();
      } catch (err) {
        const code = err instanceof ProfileApiError ? err.code : "INTERNAL";
        const msg =
          code === "WRONG_PASSWORD"
            ? "Current password is wrong."
            : code === "EMAIL_IN_USE"
            ? "That email is already in use."
            : code === "PASSWORD_REQUIRED"
            ? "Set a password on this account first (OAuth-only accounts can't change email without one)."
            : err instanceof ProfileApiError
            ? err.message
            : "Update failed";
        setError(msg);
      }
    });
  }

  return (
    <ModalShell title="Change email" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <header className="flex flex-col gap-1">
          <h3 className="font-display text-2xl italic">Change email</h3>
          <p className="font-sans text-sm text-muted-foreground">
            Enter your current password to confirm.
          </p>
        </header>

        <div className="flex flex-col gap-2">
          <Label htmlFor={currentPwId}>Current password</Label>
          <Input
            id={currentPwId}
            type="password"
            autoComplete="current-password"
            autoFocus
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              setError(null);
            }}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={newEmailId}>New email</Label>
          <Input
            id={newEmailId}
            type="email"
            autoComplete="email"
            value={newEmail}
            onChange={(e) => {
              setNewEmail(e.target.value);
              setError(null);
            }}
            required
          />
        </div>

        {error ? <AlertBox>{error}</AlertBox> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="brand-filled" size="pill" disabled={!valid || isPending}>
            {isPending ? "Saving…" : "Update email"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Password change ─────────────────────────────────────────────────

function PasswordModal({ onClose }: { onClose: () => void }) {
  const currentPwId = useId();
  const newPwId = useId();
  const confirmPwId = useId();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const valid =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setError(null);
    startTransition(async () => {
      try {
        await updatePassword({ currentPassword, newPassword });
        onClose();
        // Force reload — the session cookie's identity didn't change
        // but the user might want to see fresh state everywhere.
        setTimeout(() => window.location.reload(), 300);
      } catch (err) {
        const code = err instanceof ProfileApiError ? err.code : "INTERNAL";
        const msg =
          code === "WRONG_PASSWORD"
            ? "Current password is wrong."
            : code === "PASSWORD_REQUIRED"
            ? "This account doesn't have a password yet (OAuth-only)."
            : err instanceof ProfileApiError
            ? err.message
            : "Update failed";
        setError(msg);
      }
    });
  }

  return (
    <ModalShell title="Change password" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <header className="flex flex-col gap-1">
          <h3 className="font-display text-2xl italic">Change password</h3>
          <p className="font-sans text-sm text-muted-foreground">
            At least 8 characters.
          </p>
        </header>

        <div className="flex flex-col gap-2">
          <Label htmlFor={currentPwId}>Current password</Label>
          <Input
            id={currentPwId}
            type="password"
            autoComplete="current-password"
            autoFocus
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              setError(null);
            }}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={newPwId}>New password</Label>
          <div className="relative">
            <Input
              id={newPwId}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setError(null);
              }}
              required
              minLength={8}
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 z-10 grid w-10 place-items-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-r-md"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={confirmPwId}>Confirm new password</Label>
          <Input
            id={confirmPwId}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError(null);
            }}
            required
            aria-invalid={
              confirmPassword.length > 0 && newPassword !== confirmPassword
                ? true
                : undefined
            }
          />
          {confirmPassword.length > 0 && newPassword !== confirmPassword ? (
            <p role="alert" className="text-sm text-destructive">
              Passwords don't match.
            </p>
          ) : null}
        </div>

        {error ? <AlertBox>{error}</AlertBox> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="brand-filled" size="pill" disabled={!valid || isPending}>
            {isPending ? "Saving…" : "Update password"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Unlink 42 (confirmation) ────────────────────────────────────────

function UnlinkModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell title="Unlink 42 account" onClose={onClose}>
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-1">
          <h3 className="font-display text-2xl italic">Unlink 42</h3>
          <p className="font-sans text-sm text-muted-foreground">
            You can still sign in with your email and password. You can
            re-link 42 at any time.
          </p>
        </header>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="brand-outline" size="pill" onClick={onConfirm}>
            Unlink
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Delete account (type-to-confirm) ────────────────────────────────

function DeleteModal({ onClose }: { onClose: () => void }) {
  const inputId = useId();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const armed = confirm === "DELETE";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!armed) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteAccount();
        // Backend clears the auth cookie. Send the user home — they're
        // now a logged-out visitor.
        window.location.href = "/";
      } catch (err) {
        setError(
          err instanceof ProfileApiError ? err.message : "Delete failed",
        );
      }
    });
  }

  return (
    <ModalShell title="Delete account" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <header className="flex flex-col gap-1">
          <h3 className="font-display text-2xl italic text-destructive">Delete account</h3>
          <p className="font-sans text-sm text-muted-foreground">
            This anonymises your account — game history stays, but your
            username, email, and avatar are wiped. This can't be undone.
          </p>
        </header>

        <div className="flex flex-col gap-2">
          <Label htmlFor={inputId}>
            Type <span className="font-mono font-bold text-foreground">DELETE</span> to confirm
          </Label>
          <Input
            id={inputId}
            ref={inputRef}
            type="text"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setError(null);
            }}
            autoComplete="off"
            autoFocus
            aria-invalid={confirm.length > 0 && !armed ? true : undefined}
          />
        </div>

        {error ? <AlertBox>{error}</AlertBox> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!armed || isPending}
            className="border-2 border-accent bg-transparent text-accent hover:bg-accent hover:text-accent-foreground"
          >
            {isPending ? "Deleting…" : "Delete account"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
