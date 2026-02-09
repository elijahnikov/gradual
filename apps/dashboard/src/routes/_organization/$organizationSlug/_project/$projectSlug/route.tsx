import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug"
)({
  component: RouteComponent,
  beforeLoad: ({ context, params }) => {
    const { queryClient, trpc } = context;
    void queryClient.prefetchQuery(
      trpc.project.getBreadcrumbs.queryOptions({
        organizationSlug: params.organizationSlug as string,
        projectSlug: params.projectSlug as string,
      })
    );
    void queryClient.prefetchQuery(
      trpc.project.getBySlug.queryOptions({
        organizationSlug: params.organizationSlug as string,
        slug: params.projectSlug as string,
      })
    );
  },
});

function RouteComponent() {
  return <Outlet />;
}
