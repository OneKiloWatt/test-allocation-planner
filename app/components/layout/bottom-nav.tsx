import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { isBottomNavItemActive } from "./routes";
import type { BottomNavItem } from "./types";

type BottomNavProps = {
  items: readonly BottomNavItem[];
  pathname: string;
  className?: string;
};

export function BottomNav({ items, pathname, className }: BottomNavProps) {
  return (
    <nav
      aria-label="ボトムナビゲーション"
      className={cn(
        "flex h-bottom-nav w-full items-stretch gap-card-gap",
        className,
      )}
    >
      {items.map((item) => {
        const active = isBottomNavItemActive(item, pathname);

        return (
          <Link
            key={item.section}
            href={item.href}
            aria-current={active ? "page" : undefined}
            data-active={active ? "true" : undefined}
            className={cn(
              "flex flex-1 items-center justify-center rounded-xl border border-transparent px-card py-card text-sm font-medium transition-colors",
              active
                ? "border-primary/20 bg-primary/10 text-active-tab"
                : "text-inactive-tab hover:bg-muted hover:text-text",
            )}
          >
            <span className="flex min-w-0 flex-col items-center gap-1 text-center">
              {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
              <span className="truncate">{item.label}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

type BottomNavShellProps = {
  children: ReactNode;
  className?: string;
};

export function BottomNavShell({ children, className }: BottomNavShellProps) {
  return (
    <div className={cn("border-t border-border bg-surface/95 backdrop-blur", className)}>
      <div className="mx-auto flex w-full max-w-content items-stretch px-screen pb-safe-area-bottom">
        {children}
      </div>
    </div>
  );
}
