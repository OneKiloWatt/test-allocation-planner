import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ClipboardList, PlusCircle } from "lucide-react";

import { BottomNav, Layout, LayoutStack, AppHeader, routePaths, createDefaultBottomNavItems } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasValidGuestSession } from "@/lib/guest-session";
import { useExamStore } from "@/stores";

const homeOnlyBottomNavItems = [
  {
    label: "ホーム",
    href: routePaths.home(),
    section: "home" as const,
    description: "ホームに戻ります",
  },
];

export default function HomePage() {
  const router = useRouter();
  const activeExamId = useExamStore((state) => state.activeExamId);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!hasValidGuestSession()) {
      void router.replace(routePaths.top());
      return;
    }

    setIsAuthorized(true);
  }, [router]);

  const bottomNavItems =
    activeExamId != null ? createDefaultBottomNavItems(activeExamId) : homeOnlyBottomNavItems;

  const handleCreateTest = () => {
    void router.push(routePaths.testCreate());
  };

  if (!isAuthorized) {
    return null;
  }

  return (
    <Layout
      variant="app"
      header={<AppHeader title="ホーム" subtitle="ゲスト利用中" />}
      bottomNav={<BottomNav items={bottomNavItems} pathname={routePaths.home()} />}
    >
      <LayoutStack className="pt-section-gap">
        <section className="rounded-3xl border border-border bg-surface px-card py-section-gap shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-text">
            <ClipboardList className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>まだテストはありません</span>
          </div>
          <div className="mt-4 space-y-3">
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-text">
              まずはテストを1つ作成しましょう。
            </h1>
            <p className="text-sm leading-6 text-muted-text">
              テスト名と日程を入れると、次の目標点数設定へ進めます。
            </p>
          </div>
          <div className="mt-6">
            <Button type="button" onClick={handleCreateTest} size="lg" className="w-full sm:w-auto">
              テストを作成する
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">この画面でできること</CardTitle>
            <CardDescription>
              Phase 4 では空状態のみを用意しています。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-text">
            <p>・テスト作成に進む</p>
            <p>・以降の配分や記録は、テスト作成後に続けて使えます</p>
          </CardContent>
        </Card>
      </LayoutStack>
    </Layout>
  );
}
