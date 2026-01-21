import { createFileRoute } from "@tanstack/react-router";
import FlagPageComponent from "@/components/pages/flag-page";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/flags/$flagSlug/"
)({
  component: RouteComponent,
  errorComponent: ({ error }) => {
    return <div>Error {JSON.stringify(error)}</div>;
  },
  beforeLoad: ({ context, params }) => {
    void context.queryClient.prefetchQuery(
      context.trpc.featureFlags.getByKey.queryOptions({
        projectSlug: params.projectSlug,
        organizationSlug: params.organizationSlug,
        key: params.flagSlug,
      })
    );
  },
});

function RouteComponent() {
  return <FlagPageComponent />;
}
