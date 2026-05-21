/**
 * Step3Profile — avatar / bio / skin pickers. Every field skippable.
 *
 * - Avatar: click or drag image (image/jpeg, image/png, image/webp, ≤ 2 MB).
 *   Local preview before submit. POST /api/profile/avatar (multipart).
 * - Bio: textarea, soft 160-char limit + counter.
 * - Skins: placeholder picker — 4 pawn options, 3 grid options (real skin
 *   definitions TBD per CLAUDE.md). Submitted as `pawnSkin` / `gridSkin`
 *   strings to PUT /api/profile.
 *
 * Skip-for-now link bypasses to step 4 with no API calls.
 */

import { useId, useRef, useState, useTransition } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

const BIO_MAX = 160;
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface SkinOption {
  id: string;
  label: string;
  /** Tailwind class applied to the swatch. Placeholders for now. */
  swatchClass: string;
}

const PAWN_SKINS: SkinOption[] = [
  { id: "default", label: "Classic", swatchClass: "pawn-red" },
  { id: "wine", label: "Wine", swatchClass: "bg-[oklch(35%_0.14_15)]" },
  { id: "coral", label: "Coral", swatchClass: "bg-[oklch(58%_0.18_30)]" },
  { id: "brick", label: "Brick", swatchClass: "bg-[oklch(45%_0.12_40)]" },
];

const GRID_SKINS: SkinOption[] = [
  { id: "default", label: "Linen", swatchClass: "bg-board" },
  { id: "ink", label: "Ink", swatchClass: "bg-[oklch(28%_0.03_250)]" },
  { id: "slate", label: "Slate", swatchClass: "bg-[oklch(48%_0.04_240)]" },
];

export function Step3Profile() {
  const bioId = useId();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [bio, setBio] = useState("");
  const [pawnSkin, setPawnSkin] = useState<string>("default");
  const [gridSkin, setGridSkin] = useState<string>("default");

  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function pickAvatar(file: File) {
    setAvatarError(null);
    if (!AVATAR_TYPES.includes(file.type)) {
      setAvatarError("Use JPG, PNG, or WebP.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError("Up to 2 MB please.");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function clearAvatar() {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null);
    setAvatarPreview(null);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    startTransition(async () => {
      try {
        // PUT /api/profile — bio + skins
        const profileRes = await fetch("/api/profile", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bio: bio || undefined, pawnSkin, gridSkin }),
        });
        if (!profileRes.ok) {
          setFormError("Couldn't save your profile. Try again.");
          return;
        }

        // POST /api/profile/avatar — only if a file was picked
        if (avatarFile) {
          const fd = new FormData();
          fd.append("avatar", avatarFile);
          const avatarRes = await fetch("/api/profile/avatar", {
            method: "POST",
            credentials: "include",
            body: fd,
          });
          if (!avatarRes.ok) {
            setFormError("Profile saved, but the avatar didn't go through.");
            return;
          }
        }

        window.location.href = "/signup?step=4";
      } catch {
        setFormError("Network error. Try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-display italic font-light tracking-wide text-3xl text-foreground leading-none">
          Make it yours
        </h1>
        <p className="text-base text-muted-foreground">
          Optional — every field has a default. Skip if you'd rather get to the game.
        </p>
      </header>

      {/* Avatar */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-avatar">Avatar</Label>
        <div
          className="flex items-center gap-4 rounded-lg border border-dashed border-border p-3"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) pickAvatar(file);
          }}
        >
          {avatarPreview ? (
            <div className="relative size-16 shrink-0">
              <img
                src={avatarPreview}
                alt=""
                className="size-16 rounded-full object-cover"
              />
              <button
                type="button"
                onClick={clearAvatar}
                aria-label="Remove avatar"
                className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-foreground text-background shadow-sm"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <div className="grid size-16 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
              <Upload className="size-5" />
            </div>
          )}
          <div className="flex flex-1 flex-col gap-1">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="self-start text-sm font-medium text-foreground underline decoration-transparent underline-offset-4 transition-colors hover:decoration-accent hover:text-accent"
            >
              {avatarPreview ? "Replace image" : "Drop an image or click to upload"}
            </button>
            <p className="text-sm text-muted-foreground">JPG, PNG, WebP. Up to 2 MB.</p>
          </div>
          <input
            ref={avatarInputRef}
            id="signup-avatar"
            type="file"
            accept={AVATAR_TYPES.join(",")}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) pickAvatar(file);
            }}
          />
        </div>
        {avatarError ? (
          <p role="alert" className="text-sm text-destructive">{avatarError}</p>
        ) : null}
      </div>

      {/* Bio */}
      <div className="flex flex-col gap-2">
        <Label htmlFor={bioId}>Bio</Label>
        <textarea
          id={bioId}
          rows={3}
          maxLength={BIO_MAX}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell other players who you are."
          className={cn(
            "min-h-[80px] w-full resize-none rounded-md border border-border bg-input px-3 py-2",
            "text-base text-foreground placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        />
        <p className="self-end font-mono text-mono-sm text-muted-foreground tabular-nums">
          {bio.length}/{BIO_MAX}
        </p>
      </div>

      {/* Pawn skin */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium leading-none text-foreground">Your pawn</legend>
        <div className="flex gap-3 pt-2">
          {PAWN_SKINS.map((skin) => (
            <SkinSwatch
              key={skin.id}
              skin={skin}
              groupName="pawn-skin"
              selected={pawnSkin === skin.id}
              onSelect={() => setPawnSkin(skin.id)}
              shape="circle"
            />
          ))}
        </div>
      </fieldset>

      {/* Grid skin */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium leading-none text-foreground">Your grid</legend>
        <div className="flex gap-3 pt-2">
          {GRID_SKINS.map((skin) => (
            <SkinSwatch
              key={skin.id}
              skin={skin}
              groupName="grid-skin"
              selected={gridSkin === skin.id}
              onSelect={() => setGridSkin(skin.id)}
              shape="rect"
            />
          ))}
        </div>
      </fieldset>

      {formError ? (
        <p role="alert" className="text-sm text-destructive">{formError}</p>
      ) : null}

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <a
          href="/signup?step=4"
          className="font-mono text-mono-sm uppercase text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip for now
        </a>
        <Button type="submit" variant="brand-filled" size="pill" disabled={isPending}>
          {isPending ? "Saving…" : "Continue →"}
        </Button>
      </div>
    </form>
  );
}

function SkinSwatch({
  skin,
  groupName,
  selected,
  onSelect,
  shape,
}: {
  skin: SkinOption;
  groupName: string;
  selected: boolean;
  onSelect: () => void;
  shape: "circle" | "rect";
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "group flex cursor-pointer flex-col items-center gap-1.5 rounded-md p-1 transition-colors",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
      )}
    >
      <input
        id={id}
        type="radio"
        name={groupName}
        value={skin.id}
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "size-9",
          shape === "circle" ? "rounded-full" : "rounded-md",
          skin.swatchClass,
          selected
            ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
            : "ring-1 ring-border ring-offset-2 ring-offset-background opacity-80 group-hover:opacity-100",
        )}
      />
      <span className="font-mono text-mono-sm uppercase text-muted-foreground">{skin.label}</span>
    </label>
  );
}
