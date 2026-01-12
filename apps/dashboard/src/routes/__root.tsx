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
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";
import type * as React from "react";
import appCss from "@/styles.css?url";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  trpc: TRPCOptionsProxy<AppRouter>;
}>()({
  head: () => ({
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  beforeLoad: async ({ context, location }) => {
    const { trpc, queryClient } = context;
    const session = await queryClient.ensureQueryData(
      trpc.auth.getSession.queryOptions()
    );
    if (!session?.user && location.pathname !== "/login") {
      throw redirect({ to: "/login" });
    }
  },
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <HeadContent />
        </head>
        <body
          className={cn(
            "min-h-screen bg-ui-bg-base font-sans text-ui-fg-base antialiased"
          )}
        >
          <ToastProvider>
            <AnchoredToastProvider>{children}</AnchoredToastProvider>
          </ToastProvider>
          <TanStackRouterDevtools position="bottom-right" />
          <Scripts />
        </body>
      </html>
    </ThemeProvider>
  );
}
