import Link from "next/link";
import { useRouter } from "next/router";
import { ChevronLeft, UserCircle } from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { clearGuestSessionStorage, hasValidGuestSession } from "@/lib/guest-session";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useExamStore } from "@/stores";
import { routePaths } from "./routes";

type HeaderShellProps = {
  className?: string;
  children: ReactNode;
};

function HeaderShell({ className, children }: HeaderShellProps) {
  return (
    <header
      className={cn(
        "flex h-header-mobile items-center justify-between gap-card-gap",
        className,
      )}
    >
      {children}
    </header>
  );
}

type TopHeaderProps = {
  className?: string;
  brandLabel?: string;
  brandHref?: string;
  eyebrow?: string;
};

export function TopHeader({
  className,
  brandLabel = "テスプラ",
  brandHref = routePaths.top(),
  eyebrow,
}: TopHeaderProps) {
  return (
    <HeaderShell className={className}>
      <div className="flex flex-col">
        {eyebrow ? (
          <span className="text-xs font-medium text-muted-text">{eyebrow}</span>
        ) : null}
        <Link
          href={brandHref}
          aria-label={`${brandLabel} ホーム`}
          className="inline-flex items-center rounded-full text-sm font-semibold tracking-wide text-text"
        >
          <img src="/logo.svg" alt="" className="block h-auto w-[210px]" />
        </Link>
      </div>
    </HeaderShell>
  );
}

type AppHeaderProps = {
  className?: string;
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
};

type DeleteStep = "idle" | "suggest_logout" | "reauth" | "confirm";

function AccountMenu() {
  const router = useRouter();
  const user = useExamStore((state) => state.authUser);
  const clearActiveExam = useExamStore((state) => state.clearActiveExam);
  const isGuest = user == null && hasValidGuestSession();
  const [deleteStep, setDeleteStep] = useState<DeleteStep>("idle");
  const [isDeleting, setIsDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const [deleteAccessToken, setDeleteAccessToken] = useState<string | null>(null);
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [isReauthenticating, setIsReauthenticating] = useState(false);

  const resetDeleteDialogState = () => {
    setDeleteStep("idle");
    setPassword("");
    setDeleteAccessToken(null);
    setReauthError(null);
    setIsReauthenticating(false);
  };

  const handleSignOut = async () => {
    if (supabase != null) {
      await supabase.auth.signOut({ scope: "global" });
    }
    clearActiveExam();
    void router.replace(routePaths.top());
  };

  const handleDeleteAccount = async (accessToken: string | null) => {
    if (supabase == null || accessToken == null) {
      setDeleteStep("reauth");
      setReauthError("本人確認の有効期限が切れました。もう一度パスワードを入力してください。");
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        let errorCode: string | null = null;

        try {
          const payload = (await response.json()) as { error?: { code?: string } };
          errorCode = payload.error?.code ?? null;
        } catch {
          errorCode = null;
        }

        if (response.status === 401 && errorCode === "reauth_required") {
          setDeleteAccessToken(null);
          setPassword("");
          setDeleteStep("reauth");
          setReauthError("確認の有効期限が切れました。もう一度パスワードを入力してください。");
          setIsDeleting(false);
          return;
        }

        setReauthError("アカウントを削除できませんでした。時間をおいてもう一度お試しください。");
        setIsDeleting(false);
        return;
      }
    } catch {
      setReauthError("通信に失敗しました。接続を確認して、もう一度お試しください。");
      setIsDeleting(false);
      return;
    }

    await supabase.auth.signOut({ scope: "global" });
    clearActiveExam();
    setIsDeleting(false);
    resetDeleteDialogState();
    void router.replace(routePaths.top());
  };

  const handleDeleteGuestData = () => {
    clearGuestSessionStorage();
    clearActiveExam();
    void router.replace(routePaths.top());
  };

  const handleReauthenticate = async () => {
    if (supabase == null || user?.email == null) {
      setReauthError("再認証に必要なメールアドレスを確認できませんでした");
      return;
    }

    if (password.length === 0) {
      setReauthError("パスワードを入力してください");
      return;
    }

    setIsReauthenticating(true);
    setReauthError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });

    if (error != null) {
      setReauthError("パスワードを確認のうえ、もう一度お試しください。");
      setIsReauthenticating(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token == null) {
      setReauthError("再認証後のセッション取得に失敗しました");
      setIsReauthenticating(false);
      return;
    }

    setIsReauthenticating(false);
    setDeleteAccessToken(session.access_token);
    setReauthError(null);
    setPassword("");
    setDeleteStep("confirm");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="アカウントメニュー"
            className="inline-flex items-center justify-center rounded-full border border-border bg-surface p-1.5 text-text transition-colors hover:bg-muted"
          >
            <UserCircle className="h-5 w-5" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>アカウント</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {user != null ? (
            <>
              <DropdownMenuItem onSelect={handleSignOut}>
                ログアウトする
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={routePaths.terms()}>利用規約</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={routePaths.privacy()}>プライバシーポリシー</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setDeleteStep("suggest_logout")}
              >
                アカウントを削除する
              </DropdownMenuItem>
            </>
          ) : isGuest ? (
            <>
              <DropdownMenuItem disabled className="text-muted-foreground">
                ゲストで利用中
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={routePaths.authSignup()}>アカウントを作成する</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={routePaths.terms()}>利用規約</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={routePaths.privacy()}>プライバシーポリシー</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setDeleteStep("confirm")}
              >
                この端末のデータを消す
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem asChild>
                <Link href={routePaths.authLogin()}>ログインする</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={routePaths.terms()}>利用規約</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={routePaths.privacy()}>プライバシーポリシー</Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Step 1: Suggest logout before deletion */}
      <AlertDialog
        open={deleteStep === "suggest_logout"}
        onOpenChange={(open) => {
          if (!open) resetDeleteDialogState();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>アカウントを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              アカウントを消さなくても、この端末ではそのまま使えます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSignOut}>ログアウトする</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setPassword("");
                setReauthError(null);
                setDeleteStep("reauth");
              }}
            >
              それでも削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteStep === "reauth"}
        onOpenChange={(open) => {
          if (!open) resetDeleteDialogState();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本人確認</AlertDialogTitle>
            <AlertDialogDescription>
              アカウント削除の前に、パスワードを入力してください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleReauthenticate();
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="delete-account-password">
                パスワード
              </label>
              <Input
                id="delete-account-password"
                type="password"
                autoComplete="current-password"
                disabled={isReauthenticating}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (reauthError != null) {
                    setReauthError(null);
                  }
                }}
              />
              {reauthError ? (
                <p className="text-sm text-destructive">{reauthError}</p>
              ) : null}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">キャンセル</AlertDialogCancel>
              <Button
                type="submit"
                variant="destructive"
                disabled={isReauthenticating || password.length === 0}
              >
                {isReauthenticating ? "確認中..." : "確認する"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Step 3: Final confirmation */}
      <AlertDialog
        open={deleteStep === "confirm"}
        onOpenChange={(open) => {
          if (!open) resetDeleteDialogState();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {user != null ? "アカウントを削除しますか？" : "この端末のデータを削除しますか？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {user != null
                ? "アカウントを削除すると、学習記録と計画は元に戻せません。"
                : "この端末に保存されている学習記録が削除されます。元に戻せません。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {user != null && reauthError ? (
            <p className="text-sm text-destructive">{reauthError}</p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>{user != null ? "アカウントを残す" : "残す"}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={user != null ? () => void handleDeleteAccount(deleteAccessToken) : handleDeleteGuestData}
            >
              {isDeleting ? "削除中..." : "削除する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function AppHeader({
  className,
  title,
  subtitle,
  rightSlot,
}: AppHeaderProps) {
  return (
    <HeaderShell className={className}>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-lg font-semibold text-text">{title}</span>
        {subtitle ? (
          <span className="truncate text-sm text-muted-text">{subtitle}</span>
        ) : null}
      </div>
      <div className="flex items-center gap-card-gap">
        {rightSlot}
        <AccountMenu />
      </div>
    </HeaderShell>
  );
}

type BackHeaderProps = {
  className?: string;
  title?: string;
  subtitle?: string;
  backHref?: string;
  fallbackHref?: string;
  backLabel?: string;
  onBack?: () => void;
  rightSlot?: ReactNode;
};

export function BackHeader({
  className,
  title,
  subtitle,
  backHref,
  fallbackHref = routePaths.top(),
  backLabel = "戻る",
  onBack,
  rightSlot,
}: BackHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    void router.push(backHref ?? fallbackHref ?? routePaths.top());
  };

  return (
    <HeaderShell className={className}>
      <div className="flex min-w-0 items-center gap-card-gap">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-card py-card text-sm font-medium text-text transition-colors hover:bg-muted"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          <span>{backLabel}</span>
        </button>
        {title ? (
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-lg font-semibold text-text">
              {title}
            </span>
            {subtitle ? (
              <span className="truncate text-sm text-muted-text">
                {subtitle}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {rightSlot ? <div className="flex items-center gap-card-gap">{rightSlot}</div> : null}
    </HeaderShell>
  );
}
