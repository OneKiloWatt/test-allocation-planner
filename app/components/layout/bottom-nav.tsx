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
        "grid min-h-[60px] w-full items-stretch gap-2",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
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
              "flex min-h-11 items-center justify-center rounded-[14px] border border-transparent px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary/15 bg-primary/10 text-active-tab"
                : "text-inactive-tab hover:bg-muted/70 hover:text-text",
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
    <div className={cn("pointer-events-none mx-auto w-full max-w-content px-[10px] pb-[calc(env(safe-area-inset-bottom)+10px)]", className)}>
      <div className="pointer-events-auto rounded-[18px] border border-border bg-[rgba(250,246,240,0.9)] p-2 shadow-[var(--shadow)] [backdrop-filter:blur(14px)_saturate(160%)] [-webkit-backdrop-filter:blur(14px)_saturate(160%)]">
        {children}
      </div>
    </div>
  );
}
