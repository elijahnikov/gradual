import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_organization/$organizationSlug")({
  component: RouteComponent,
  beforeLoad: async ({ params, context }) => {
    const { organizationSlug } = params;
    const { trpc, queryClient } = context;
    try {
      const organization = await queryClient.ensureQueryData(
        trpc.organization.getBySlug.queryOptions({
          organizationSlug: organizationSlug as string,
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
  return <div>Hello "/_organization/$organizationSlug"!</div>;
}
