import { createFileRoute } from "@tanstack/react-router";
import FlagPageComponent from "@/components/pages/flag-page";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/flags/$flagSlug/"
)({
  component: RouteComponent,
  errorComponent: ({ error }) => {
    return <div>Error {JSON.stringify(error)}</div>;
  },
  loader: async ({ context, params }) => {
    const { queryClient, trpc } = context;
    const { projectSlug, organizationSlug, flagSlug } = params;
    const [flag] = await Promise.all([
      queryClient.fetchQuery(
        trpc.featureFlags.getByKey.queryOptions({
          projectSlug,
          organizationSlug,
          key: flagSlug,
        })
      ),
      queryClient.prefetchQuery(
        trpc.attributes.list.queryOptions({
          projectSlug,
          organizationSlug,
        })
      ),
      queryClient.prefetchQuery(
        trpc.attributes.listContexts.queryOptions({
          projectSlug,
          organizationSlug,
        })
      ),
      queryClient.prefetchQuery(
        trpc.segments.list.queryOptions({
          projectSlug,
          organizationSlug,
        })
      ),
    ]);

    const firstEnv = flag.environments[0];
    if (firstEnv) {
      void queryClient.prefetchQuery(
        trpc.featureFlags.getTargetingRules.queryOptions({
          flagId: flag.flag.id,
          environmentSlug: firstEnv.environment.slug,
          organizationSlug,
          projectSlug,
        })
      );
    }
  },
});

function RouteComponent() {
  return <FlagPageComponent />;
}
