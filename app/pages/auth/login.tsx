import Link from "next/link";
import { useRouter } from "next/router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { BackHeader, Layout, routePaths } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

const authEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("メールアドレスの形式で入力してください").max(254, "254文字以内で入力してください"));

const authPasswordSchema = z
  .string()
  .min(8, "8文字以上で入力してください")
  .max(128, "128文字以内で入力してください")
  .refine((value) => value.trim().length > 0, "空白のみのパスワードは使えません");

const loginSchema = z.object({
  email: authEmailSchema,
  password: authPasswordSchema,
});

type LoginFormInput = z.input<typeof loginSchema>;
type LoginFormValues = z.output<typeof loginSchema>;

const genericLoginError = "メールアドレスまたはパスワードを確認してください";

export default function LoginPage() {
  const router = useRouter();
  const form = useForm<LoginFormInput, undefined, LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setError,
  } = form;

  const onSubmit = async (values: LoginFormValues) => {
    if (supabase == null) {
      setError("root", {
        message: "認証設定が未完了です。環境変数を確認してください",
      });
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setError("root", { message: genericLoginError });
      return;
    }

    void router.replace(routePaths.home());
  };

  return (
    <Layout
      variant="form"
      header={<BackHeader title="ログイン" fallbackHref={routePaths.top()} />}
      contentClassName="items-center"
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>ログイン</CardTitle>
          <CardDescription>メールアドレスとパスワードを入力してください。</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>メールアドレス</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        autoComplete="email"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>パスワード</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        autoComplete="current-password"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {errors.root?.message ? (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {errors.root.message}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "ログイン中..." : "ログイン"}
              </Button>
              <Link
                href={routePaths.authSignup()}
                className="block text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                アカウントがない方はこちら
              </Link>
            </form>
          </Form>
        </CardContent>
      </Card>
    </Layout>
  );
}
