import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { z } from "zod/v4";

const authSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/_auth")({
  component: AuthLayoutComponent,
  validateSearch: authSearchSchema,
  beforeLoad: async ({ context, location, search }) => {
    const { trpc, queryClient } = context;

    await queryClient.invalidateQueries(trpc.auth.getSession.pathFilter());
    const session = await queryClient.fetchQuery({
      ...trpc.auth.getSession.queryOptions(),
      staleTime: 0,
    });

    const redirectTo = search.redirect;

    if (session?.user) {
      if (!session.user.hasOnboarded && location.pathname === "/login") {
        throw redirect({
          to: "/onboarding",
          search: redirectTo ? { redirect: redirectTo } : {},
        });
      }
      if (session.user.hasOnboarded && location.pathname === "/onboarding") {
        throw redirect({ to: redirectTo ?? "/" });
      }
      if (session.user.hasOnboarded && location.pathname === "/login") {
        throw redirect({ to: redirectTo ?? "/" });
      }
    }
  },
});

function AuthLayoutComponent() {
  return (
    <div className="min-h-screen min-w-screen bg-ui-bg-subtle">
      <Outlet />
    </div>
  );
}
