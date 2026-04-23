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

const signupSchema = z.object({
  email: authEmailSchema,
  password: authPasswordSchema,
  acceptedTerms: z.boolean().refine((v) => v, { message: "利用規約への同意が必要です" }),
});

type SignupFormInput = z.input<typeof signupSchema>;
type SignupFormValues = z.output<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const form = useForm<SignupFormInput, undefined, SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      acceptedTerms: false,
    },
  });
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setError,
  } = form;

  const onSubmit = async (values: SignupFormValues) => {
    if (supabase == null) {
      setError("root", {
        message: "認証設定が未完了です。環境変数を確認してください",
      });
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setError("root", {
        message: "アカウントを作成できませんでした。入力内容を確認してください",
      });
      return;
    }

    void router.replace(routePaths.home());
  };

  return (
    <Layout
      variant="form"
      header={<BackHeader title="アカウント作成" fallbackHref={routePaths.top()} />}
      contentClassName="items-center"
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>アカウント作成</CardTitle>
          <CardDescription>学習データを保存するためのアカウントを作成します。</CardDescription>
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
                        autoComplete="new-password"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="acceptedTerms"
                render={({ field }) => (
                  <FormItem>
                    <label className="flex items-start gap-3 text-sm text-text">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          disabled={isSubmitting}
                          className="mt-0.5 h-4 w-4 rounded border-border accent-primary disabled:opacity-50"
                        />
                      </FormControl>
                      <span>利用規約に同意します</span>
                    </label>
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
                {isSubmitting ? "作成中..." : "アカウントを作成する"}
              </Button>
              <Link
                href={routePaths.authLogin()}
                className="block text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                すでにアカウントがある方はこちら
              </Link>
            </form>
          </Form>
        </CardContent>
      </Card>
    </Layout>
  );
}
