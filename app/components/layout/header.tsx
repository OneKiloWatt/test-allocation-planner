import Link from "next/link";
import { useRouter } from "next/router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
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
          className="inline-flex items-center rounded-full text-sm font-semibold tracking-wide text-text"
        >
          {brandLabel}
        </Link>
      </div>
    </HeaderShell>
  );
}

type AppHeaderProps = {
  className?: string;
  title: string;
  subtitle?: string;
  accountHref?: string;
  accountLabel?: string;
  rightSlot?: ReactNode;
};

export function AppHeader({
  className,
  title,
  subtitle,
  accountHref = routePaths.authLogin(),
  accountLabel = "アカウント",
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
        <Link
          href={accountHref}
          className="inline-flex items-center rounded-full border border-border bg-surface px-card py-card text-sm font-medium text-text transition-colors hover:bg-muted"
        >
          {accountLabel}
        </Link>
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
