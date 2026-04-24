import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PageLoadingStateProps = {
  title?: string;
  message?: string;
};

export function PageLoadingState({
  title = "読み込み中",
  message = "画面を準備しています。しばらくお待ちください。",
}: PageLoadingStateProps) {
  return (
    <Card className="border-primary/20 bg-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <span
            className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            {message}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
