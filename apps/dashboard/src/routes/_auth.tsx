import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
  component: AuthLayoutComponent,
  beforeLoad: async ({ context, location }) => {
    const { trpc, queryClient } = context;

    await queryClient.invalidateQueries(trpc.auth.getSession.pathFilter());
    const session = await queryClient.fetchQuery({
      ...trpc.auth.getSession.queryOptions(),
      staleTime: 0,
    });
    if (session?.user) {
      if (!session.user.hasOnboarded && location.pathname === "/login") {
        throw redirect({ to: "/onboarding" });
      }
      if (session.user.hasOnboarded && location.pathname === "/onboarding") {
        throw redirect({ to: "/" });
      }
      if (session.user.hasOnboarded && location.pathname === "/login") {
        throw redirect({ to: "/" });
      }
    }
  },
});

function AuthLayoutComponent() {
  return (
    <div className="grid min-h-screen min-w-screen place-items-center bg-ui-bg-subtle">
      <Outlet />
    </div>
  );
}
