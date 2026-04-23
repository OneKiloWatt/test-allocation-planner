import type {
  BottomNavItem,
  BottomNavSection,
  HeaderVariant,
  LayoutVariant,
  RouteAccess,
  RouteDefinition,
  RouteKey,
} from "./types";

export const routePatterns = {
  top: "/",
  home: "/home",
  testCreate: "/tests/new",
  targetScore: "/tests/[examId]/targets",
  planMode: "/tests/[examId]/plan-mode",
  dailyPlan: "/tests/[examId]/daily-plan",
  progressLog: "/tests/[examId]/progress",
  resultEntry: "/tests/[examId]/results",
  review: "/tests/[examId]/review",
  authLogin: "/auth/login",
  authSignup: "/auth/signup",
  terms: "/terms",
  privacy: "/privacy",
} as const;

export const routePaths = {
  top: () => routePatterns.top,
  home: () => routePatterns.home,
  testCreate: () => routePatterns.testCreate,
  targetScore: (examId: string) => `/tests/${examId}/targets`,
  planMode: (examId: string) => `/tests/${examId}/plan-mode`,
  dailyPlan: (examId: string) => `/tests/${examId}/daily-plan`,
  progressLog: (examId: string) => `/tests/${examId}/progress`,
  resultEntry: (examId: string) => `/tests/${examId}/results`,
  review: (examId: string) => `/tests/${examId}/review`,
  authLogin: () => routePatterns.authLogin,
  authSignup: () => routePatterns.authSignup,
  terms: () => routePatterns.terms,
  privacy: () => routePatterns.privacy,
} as const;

export const routeDefinitions = [
  {
    key: "TOP",
    path: routePatterns.top,
    access: "public",
    layout: "marketing",
    header: "top",
    title: "テスプラ",
  },
  {
    key: "HOME",
    path: routePatterns.home,
    access: "authenticated",
    layout: "app",
    header: "app",
    bottomNavSection: "home",
    title: "ホーム",
  },
  {
    key: "TEST_CREATE",
    path: routePatterns.testCreate,
    access: "authenticated",
    layout: "form",
    header: "back",
    title: "テスト作成",
  },
  {
    key: "TARGET_SCORE",
    path: routePatterns.targetScore,
    access: "authenticated",
    layout: "form",
    header: "back",
    title: "目標点数",
  },
  {
    key: "PLAN_MODE",
    path: routePatterns.planMode,
    access: "authenticated",
    layout: "form",
    header: "back",
    bottomNavSection: null,
    title: "日程・予定の設定",
  },
  {
    key: "DAILY_PLAN",
    path: routePatterns.dailyPlan,
    access: "authenticated",
    layout: "app",
    header: "app",
    bottomNavSection: "plan",
    title: "学習プラン",
  },
  {
    key: "PROGRESS_LOG",
    path: routePatterns.progressLog,
    access: "authenticated",
    layout: "form",
    header: "back",
    title: "進捗記録",
  },
  {
    key: "RESULT_ENTRY",
    path: routePatterns.resultEntry,
    access: "authenticated",
    layout: "form",
    header: "back",
    title: "結果入力",
  },
  {
    key: "REVIEW",
    path: routePatterns.review,
    access: "authenticated",
    layout: "app",
    header: "app",
    bottomNavSection: "review",
    title: "振り返り",
  },
  {
    key: "AUTH_LOGIN",
    path: routePatterns.authLogin,
    access: "guestOnly",
    layout: "form",
    header: "back",
    title: "ログイン",
  },
  {
    key: "AUTH_SIGNUP",
    path: routePatterns.authSignup,
    access: "guestOnly",
    layout: "form",
    header: "back",
    title: "アカウント作成",
  },
  {
    key: "TERMS",
    path: routePatterns.terms,
    access: "public",
    layout: "legal",
    header: "back",
    title: "利用規約",
  },
  {
    key: "PRIVACY",
    path: routePatterns.privacy,
    access: "public",
    layout: "legal",
    header: "back",
    title: "プライバシーポリシー",
  },
] as const satisfies readonly RouteDefinition[];

export const publicRoutes = routeDefinitions
  .filter((route) => route.access === "public")
  .map((route) => route.path);

export const guestOnlyRoutes = routeDefinitions
  .filter((route) => route.access === "guestOnly")
  .map((route) => route.path);

export const authenticatedRoutes = routeDefinitions
  .filter((route) => route.access === "authenticated")
  .map((route) => route.path);

export const routeDefinitionsByKey = routeDefinitions.reduce(
  (accumulator, route) => {
    accumulator[route.key] = route;
    return accumulator;
  },
  {} as Record<RouteKey, RouteDefinition>,
);

export const bottomNavSections = [
  "home",
  "plan",
  "review",
] as const satisfies readonly BottomNavSection[];

export function normalizePathname(pathname: string) {
  const withoutQuery = pathname.split("?")[0]?.split("#")[0] ?? pathname;

  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
    return withoutQuery.slice(0, -1);
  }

  return withoutQuery || "/";
}

function patternToRegExp(pattern: string) {
  const escaped = normalizePathname(pattern).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  const dynamicSegments = escaped
    .replace(/\\\[\\.\\.\\.(.+?)\\\]/g, ".*")
    .replace(/\\\[([^/]+?)\\\]/g, "[^/]+");

  return new RegExp(`^${dynamicSegments}$`);
}

export function matchesRoutePattern(pathname: string, pattern: string) {
  return patternToRegExp(pattern).test(normalizePathname(pathname));
}

export function getRouteDefinition(pathname: string) {
  const normalized = normalizePathname(pathname);

  return routeDefinitions.find((route) =>
    matchesRoutePattern(normalized, route.path),
  );
}

export function getRouteAccess(pathname: string): RouteAccess | null {
  return getRouteDefinition(pathname)?.access ?? null;
}

export function getLayoutVariant(pathname: string): LayoutVariant | null {
  return getRouteDefinition(pathname)?.layout ?? null;
}

export function getHeaderVariant(pathname: string): HeaderVariant | null {
  return getRouteDefinition(pathname)?.header ?? null;
}

export function getRouteTitle(pathname: string) {
  return getRouteDefinition(pathname)?.title ?? null;
}

export function getBottomNavSection(pathname: string): BottomNavSection | null {
  const route = getRouteDefinition(pathname);

  return route && "bottomNavSection" in route ? route.bottomNavSection ?? null : null;
}

export function shouldShowBottomNav(pathname: string) {
  return getBottomNavSection(pathname) !== null;
}

export function isBottomNavItemActive(
  item: BottomNavItem,
  pathname: string,
) {
  return getBottomNavSection(pathname) === item.section;
}

export function getScreenPreset(pathname: string) {
  const route = getRouteDefinition(pathname);

  if (!route) {
    return null;
  }

  return {
    key: route.key,
    title: route.title,
    access: route.access,
    layout: route.layout,
    header: route.header,
    bottomNavSection:
      "bottomNavSection" in route ? route.bottomNavSection ?? null : null,
    path: route.path,
  };
}

export function createDefaultBottomNavItems(examId: string): BottomNavItem[] {
  return [
    {
      label: "ホーム",
      href: routePaths.home(),
      section: "home",
      description: "ホームへ移動します",
    },
    {
      label: "学習プラン",
      href: routePaths.dailyPlan(examId),
      section: "plan",
      description: "学習プランへ移動します",
    },
    {
      label: "振り返り",
      href: routePaths.review(examId),
      section: "review",
      description: "振り返りへ移動します",
    },
  ];
}
