import type { ReactNode } from "react";

export type RouteAccess = "public" | "guestOnly" | "authenticated";

export type LayoutVariant = "marketing" | "app" | "form" | "legal";

export type HeaderVariant = "top" | "app" | "back";

export type BottomNavSection = "home" | "plan" | "review";

export type RouteKey =
  | "TOP"
  | "HOME"
  | "TEST_CREATE"
  | "TARGET_SCORE"
  | "DAILY_PLAN"
  | "PROGRESS_LOG"
  | "RESULT_ENTRY"
  | "REVIEW"
  | "AUTH_LOGIN"
  | "AUTH_SIGNUP"
  | "TERMS"
  | "PRIVACY";

export type RouteDefinition = {
  key: RouteKey;
  path: string;
  access: RouteAccess;
  layout: LayoutVariant;
  header: HeaderVariant;
  bottomNavSection?: BottomNavSection;
  title: string;
};

export type BottomNavItem = {
  label: string;
  href: string;
  section: BottomNavSection;
  description?: string;
  icon?: ReactNode;
};

export type LayoutProps = {
  variant: LayoutVariant;
  header: ReactNode;
  bottomNav?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};
