"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Camera,
  Loader2,
  Info,
  Sparkles,
  ChevronRight,
  LogOut,
  UserPlus,
  Languages,
  Phone,
  VenusAndMars,
  Calendar,
  GraduationCap,
  Trash2,
  X,
} from "lucide-react";
import { useBeneficiaryAuth } from "@/lib/beneficiary-auth";
import { useSiteStore } from "@/lib/site-store";
import { LANGUAGES, UI_STRINGS } from "@/lib/languages";
import { BrandMark, Button, Card } from "@/components/ui";

async function fileToAvatarDataUri(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const size = 320;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL("image/jpeg", 0.6);
}

export default function ProfileScreen() {
  const router = useRouter();
  const { language } = useSiteStore();
  const { user, token, logout, updateProfile } = useBeneficiaryAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!language) return null;
  const t = UI_STRINGS[language];
  const langNative = LANGUAGES.find((l) => l.code === language)?.native ?? "";

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setSheetOpen(false);
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const dataUri = await fileToAvatarDataUri(file);
      await updateProfile({ avatarUrl: dataUri });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.authError);
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    setSheetOpen(false);
    setBusy(true);
    setError(null);
    try {
      await updateProfile({ avatarUrl: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.authError);
    } finally {
      setBusy(false);
    }
  }

  const genderLabel: Record<string, string> = {
    male: t.genderMale,
    female: t.genderFemale,
    other: t.genderOther,
  };
  const eduLabel: Record<string, string> = {
    below_10th: t.eduBelow10th,
    "10th": t.edu10th,
    "12th": t.edu12th,
    iti_diploma: t.eduIti,
    undergrad: t.eduUndergrad,
    postgrad: t.eduPostgrad,
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="px-5 pb-2 pt-4">
        <h1 className="text-xl font-bold">{t.profileTitle}</h1>
      </div>

      <div className="flex flex-col gap-4 px-5 pb-8 pt-1">
        <div className="flex flex-col items-center py-2">
          <button
            onClick={() => token && setSheetOpen(true)}
            disabled={!token || busy}
            className="relative flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-3xl bg-brand/10"
          >
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <BrandMark size={34} />
            )}
            {busy ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </span>
            ) : (
              token && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-brand">
                  <Camera className="h-3.5 w-3.5 text-white" />
                </span>
              )
            )}
          </button>
          <h2 className="mt-2.5 text-xl font-bold">
            {user?.name?.trim() || t.guestLabel}
          </h2>
          {user?.phone && <p className="text-foreground-dim">{user.phone}</p>}
        </div>

        {error && <p className="text-center text-sm text-danger">{error}</p>}

        {!token && (
          <Card className="flex items-center gap-2.5">
            <Info className="h-5 w-5 shrink-0 text-warning" />
            <p className="flex-1 text-sm text-foreground-dim">
              {t.guestNotice}
            </p>
          </Card>
        )}

        {token && !user?.onboarded && (
          <button
            onClick={() => router.push("/onboarding")}
            className="w-full text-left"
          >
            <Card className="flex items-center gap-2.5">
              <Sparkles className="h-5 w-5 shrink-0 text-brand" />
              <p className="flex-1 text-sm text-foreground-dim">
                {t.onboardIntroBody}
              </p>
              <ChevronRight className="h-[18px] w-[18px] text-brand" />
            </Card>
          </button>
        )}

        <Card className="!p-0">
          <Row
            icon={<Languages className="h-[18px] w-[18px]" />}
            label={t.languageLabel}
            value={langNative}
            onPress={() => router.push("/language")}
          />
          {user?.phone && (
            <Row
              icon={<Phone className="h-[18px] w-[18px]" />}
              label={t.phoneLabel}
              value={user.phone}
            />
          )}
          {user?.gender && (
            <Row
              icon={<VenusAndMars className="h-[18px] w-[18px]" />}
              label={t.genderQuestion}
              value={genderLabel[user.gender] ?? user.gender}
            />
          )}
          {user?.age != null && (
            <Row
              icon={<Calendar className="h-[18px] w-[18px]" />}
              label={t.ageQuestion}
              value={`${user.age} ${t.yearsSuffix}`}
            />
          )}
          {user?.education && (
            <Row
              icon={<GraduationCap className="h-[18px] w-[18px]" />}
              label={t.eduQuestion}
              value={eduLabel[user.education] ?? user.education}
              last
            />
          )}
        </Card>

        {token ? (
          <Button
            label={t.logout}
            variant="danger"
            icon={<LogOut className="h-4 w-4" />}
            onPress={() => {
              logout();
              router.replace("/welcome");
            }}
          />
        ) : (
          <Button
            label={t.createAccount}
            icon={<UserPlus className="h-4 w-4" />}
            href="/auth"
          />
        )}

        <div className="flex flex-wrap justify-center gap-4 pt-2 text-xs text-foreground-faint">
          <Link href="/privacy" className="hover:text-foreground-dim hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground-dim hover:underline">
            Terms of Service
          </Link>
          {token && (
            <Link href="/terms#deletion" className="hover:text-foreground-dim hover:underline">
              Request data deletion
            </Link>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileSelected}
      />

      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setSheetOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-[20px] bg-surface pb-7 pt-3.5"
          >
            <p className="mb-2 text-center text-sm text-foreground-dim">
              {t.photoSheetTitle}
            </p>
            <SheetRow
              icon={<Camera className="h-5 w-5" />}
              label={t.takePhoto}
              onPress={() => fileInputRef.current?.click()}
            />
            <SheetRow
              icon={<Camera className="h-5 w-5" />}
              label={t.chooseFromLibrary}
              onPress={() => fileInputRef.current?.click()}
            />
            {user?.avatarUrl && (
              <SheetRow
                icon={<Trash2 className="h-5 w-5" />}
                label={t.removePhoto}
                tone="danger"
                onPress={removePhoto}
              />
            )}
            <SheetRow
              icon={<X className="h-5 w-5" />}
              label={t.cancel}
              onPress={() => setSheetOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SheetRow({
  icon,
  label,
  tone,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "danger";
  onPress: () => void;
}) {
  return (
    <button
      onClick={onPress}
      className={`flex w-full items-center gap-3.5 border-t border-border px-4 py-4 text-left ${
        tone === "danger" ? "text-danger" : ""
      }`}
    >
      {icon}
      <span className="flex-1 text-base">{label}</span>
    </button>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 px-4 py-3.5 ${last ? "" : "border-b border-border"}`}
    >
      <span className="text-foreground-faint">{icon}</span>
      <span className="flex-1 text-sm text-foreground-dim">{label}</span>
      <span className="text-sm font-medium">{value}</span>
      {onPress && (
        <button onClick={onPress} className="ml-1">
          <ChevronRight className="h-4 w-4 text-foreground-faint" />
        </button>
      )}
    </div>
  );
}
