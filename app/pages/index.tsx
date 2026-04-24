import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
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
      <LayoutStack className="pt-card-gap">
        <section className="rounded-[28px] border border-border bg-surface px-6 py-8 shadow-[var(--shadow)]">
          <div className="space-y-4">
            <h1 className="text-[30px] font-bold leading-[1.35] tracking-[-0.01em] text-text">
              テスト勉強、
              <br />
              何から始めるか
              <br />
              <span className="text-primary">迷わなくなる。</span>
            </h1>
            <p className="text-sm leading-7 text-muted-text">
              科目と日数を入れるだけで、
              <br />
              何をどれだけやればいいか見えてくる。
            </p>
          </div>
          <div className="mt-7 rounded-[20px] border border-border bg-card p-5 shadow-[var(--shadow-sm)]">
            <p className="text-sm font-medium text-muted-text">3ステップで始まります</p>
            <div className="mt-4 space-y-3">
              {[
                ["1", "テストを作る", "日程と科目を入れるだけ"],
                ["2", "学習プランを作る", "自動で組む・手動で組むを選べる"],
                ["3", "記録して次に活かす", "やったことが次のテストで使える"],
              ].map(([step, title, sub], index) => (
                <div key={title}>
                  {index > 0 ? <div className="mb-3 ml-11 h-px bg-border" /> : null}
                  <div className="flex items-center gap-3.5">
                    <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-[hsl(22_55%_86%)] bg-primary/10 text-sm font-bold text-[hsl(22_45%_28%)] [font-family:var(--font-num)]">
                      {step}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-text">{title}</span>
                      <span className="mt-0.5 block text-xs text-muted-text">{sub}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-7 flex flex-col gap-card-gap sm:flex-row">
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
              ログインする
            </Link>
          </div>
          <p className="mt-4 text-center text-xs leading-5 text-muted-text">
            登録なしで、今すぐ使えます。（ログインは後でもOK）
          </p>
        </section>
      </LayoutStack>
    </Layout>
  );
}
