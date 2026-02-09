import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_organization/$organizationSlug")({
  component: RouteComponent,
  beforeLoad: async ({ params, context }) => {
    const { organizationSlug } = params;
    const { trpc, queryClient } = context;
    try {
      const [organization, currentMember] = await Promise.all([
        queryClient.ensureQueryData(
          trpc.organization.getBySlug.queryOptions({
            organizationSlug: organizationSlug as string,
          })
        ),
        queryClient.ensureQueryData(
          trpc.organizationMember.getCurrentMember.queryOptions({
            organizationSlug: organizationSlug as string,
          })
        ),
      ]);
      return { organization, currentMember };
    } catch (error) {
      console.error("Error loading organization", error);
      throw redirect({ to: "/" });
    }
  },
});

function RouteComponent() {
  return <Outlet />;
}
