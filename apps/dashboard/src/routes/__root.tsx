/// <reference types="vite/client" />

import type { AppRouter } from "@gradual/api";
import { cn } from "@gradual/ui";
import { ThemeProvider } from "@gradual/ui/theme";
import { AnchoredToastProvider, ToastProvider } from "@gradual/ui/toast";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  redirect,
  Scripts,
} from "@tanstack/react-router";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { domAnimation, LazyMotion } from "motion/react";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import type * as React from "react";
import appCss from "@/styles.css?url";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  trpc: TRPCOptionsProxy<AppRouter>;
}>()({
  head: () => ({
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  beforeLoad: async ({ context, location }) => {
    const { trpc, queryClient } = context;
    const session = await queryClient.ensureQueryData(
      trpc.auth.getSession.queryOptions()
    );
    if (
      !session?.user &&
      location.pathname !== "/login" &&
      !location.pathname.startsWith("/device")
    ) {
      throw redirect({ to: "/login" });
    }
    if (
      session?.user &&
      !session.user.hasOnboarded &&
      location.pathname !== "/onboarding"
    ) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <LazyMotion features={domAnimation}>
        <ThemeProvider>
          <NuqsAdapter>
            <ToastProvider>
              <AnchoredToastProvider>
                <Outlet />
              </AnchoredToastProvider>
            </ToastProvider>
          </NuqsAdapter>
        </ThemeProvider>
      </LazyMotion>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html className="light" lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body
        className={cn(
          "isolate min-h-screen bg-ui-bg-base font-sans text-ui-fg-base antialiased"
        )}
      >
        {children}
        {/* <TanStackRouterDevtools position="bottom-right" /> */}
        <Scripts />
      </body>
    </html>
  );
}
