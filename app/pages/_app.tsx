import "@/styles/globals.css";
import { useEffect } from "react";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";

import { routePaths } from "@/components/layout";
import { getRouteAccess } from "@/components/layout/routes";
import { supabase } from "@/lib/supabase";
import { useExamStore } from "@/stores";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const authUser = useExamStore((state) => state.authUser);
  const isAuthLoading = useExamStore((state) => state.isAuthLoading);
  const setAuthUser = useExamStore((state) => state.setAuthUser);
  const setAuthLoading = useExamStore((state) => state.setAuthLoading);
  const clearActiveExam = useExamStore((state) => state.clearActiveExam);

  useEffect(() => {
    if (supabase == null) {
      setAuthUser(null);
      setAuthLoading(false);
      return;
    }

    let isMounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      if (event === "SIGNED_OUT") {
        setAuthUser(null);
        clearActiveExam();
        setAuthLoading(false);
        return;
      }

      setAuthUser(session?.user ?? null);
      setAuthLoading(false);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setAuthUser(data.session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [clearActiveExam, setAuthLoading, setAuthUser]);

  useEffect(() => {
    if (isAuthLoading || authUser == null) {
      return;
    }

    const access = getRouteAccess(router.pathname);
    if (access === "guestOnly") {
      void router.replace(routePaths.home());
    }
  }, [authUser, isAuthLoading, router]);

  const access = getRouteAccess(router.pathname);
  if (isAuthLoading && access !== "public" && supabase != null) {
    return null;
  }

  return <Component {...pageProps} />;
}
