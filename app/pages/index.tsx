import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout, LayoutStack, TopHeader } from "@/components/layout";
import { routePaths } from "@/components/layout";
import { startGuestSession } from "@/lib/guest-session";

export default function TopPage() {
  const router = useRouter();

  const handleStartGuest = () => {
    const session = startGuestSession();
    if (session == null) {
      return;
    }

    void router.push(routePaths.home());
  };

  return (
    <Layout
      variant="marketing"
      header={<TopHeader />}
      contentClassName="pb-section-gap"
    >
      <LayoutStack className="pt-section-gap">
        <section className="rounded-3xl border border-border bg-surface px-card py-section-gap shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-text">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>匿名でそのまま試せます</span>
          </div>
          <div className="mt-4 space-y-4">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-text">
              テスト勉強の予定を、最初の1分で作る。
            </h1>
            <p className="text-sm leading-6 text-muted-text">
              テスト作成から目標点数、学習配分、進捗記録までをまとめて管理します。
              まずはゲストで触ってみてください。
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-card-gap sm:flex-row">
            <Button
              type="button"
              onClick={handleStartGuest}
              size="lg"
              className="w-full sm:w-auto"
            >
              すぐ試す
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Link
              href={routePaths.authLogin()}
              className="inline-flex h-12 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-text transition-colors hover:bg-muted"
            >
              ログイン
            </Link>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">こんな流れで使います</CardTitle>
            <CardDescription>
              1画面1目的で、迷わず次の行動に進めるようにしています。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-text">
            <p>1. テストを作成する</p>
            <p>2. 目標点数を入れる</p>
            <p>3. 勉強時間を配分して、毎日の記録へ進む</p>
          </CardContent>
        </Card>
      </LayoutStack>
    </Layout>
  );
}
