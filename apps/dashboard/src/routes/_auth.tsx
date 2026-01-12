import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
  component: AuthLayoutComponent,
  beforeLoad: async ({ context }) => {
    const { trpc, queryClient } = context;
    const session = await queryClient.ensureQueryData(
      trpc.auth.getSession.queryOptions()
    );
    if (session?.user) {
      throw redirect({ to: "/" });
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
