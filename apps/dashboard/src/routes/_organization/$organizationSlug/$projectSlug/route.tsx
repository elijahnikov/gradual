import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/$projectSlug"
)({
  component: RouteComponent,
  loader: async ({ params, context }) => {
    const { trpc, queryClient } = context;
    try {
      const organization = await queryClient.ensureQueryData(
        trpc.project.getBySlug.queryOptions({
          organizationSlug: params.organizationSlug as string,
          slug: params.projectSlug as string,
        })
      );
      return { organization };
    } catch (error) {
      console.error("Error loading organization", error);
      throw redirect({ to: "/" });
    }
  },
});

function RouteComponent() {
  return <Outlet />;
}
