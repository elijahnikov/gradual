import { createFileRoute } from "@tanstack/react-router";
import FlagPageComponent from "@/components/pages/flag-page";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/flags/$flagSlug/"
)({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    const { queryClient, trpc } = context;
    const { projectSlug, organizationSlug, flagSlug } = params;

    try {
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
    } catch (error) {
      // CancelledError (silent: true) from TanStack Query happens when
      // preload-on-intent navigation supersedes an in-flight fetch.
      // The component's useSuspenseQuery will handle fetching the data.
      if (error && typeof error === "object" && "silent" in error) {
        return;
      }
      throw error;
    }
  },
});

function RouteComponent() {
  return <FlagPageComponent />;
}
