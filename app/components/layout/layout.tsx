import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { LayoutProps } from "./types";
import { BottomNavShell } from "./bottom-nav";

export function Layout({
  variant,
  header,
  bottomNav,
  children,
  className,
  contentClassName,
}: LayoutProps) {
  const shellPaddingClass =
    variant === "marketing" ? "pt-section-gap" : "pt-card-gap";
  const contentPaddingClass =
    variant === "legal" ? "pt-card-gap" : "pt-0";
  const bottomPaddingClass = bottomNav ? "pb-bottom-nav-safe" : "pb-section-gap";

  return (
    <div className={cn("min-h-dvh bg-background text-text", className)}>
      <div className="mx-auto flex min-h-dvh w-full max-w-content flex-col px-screen">
        <div className={shellPaddingClass}>{header}</div>
        <main
          className={cn(
            "flex flex-1 flex-col",
            contentPaddingClass,
            bottomPaddingClass,
            contentClassName,
          )}
        >
          {children}
        </main>
      </div>
      {bottomNav ? (
        <div className="fixed inset-x-0 bottom-0 z-20">
          <BottomNavShell>{bottomNav}</BottomNavShell>
        </div>
      ) : null}
    </div>
  );
}

type LayoutStackProps = {
  className?: string;
  children: ReactNode;
};

export function LayoutStack({ className, children }: LayoutStackProps) {
  return <div className={cn("flex flex-col gap-section-gap", className)}>{children}</div>;
}
