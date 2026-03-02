import { createFileRoute, redirect } from "@tanstack/react-router";
import AcceptInvitationPage from "@/components/pages/auth/accept-invitation-page";

export const Route = createFileRoute("/invite/$invitationId")({
  component: RouteComponent,
  head: () => ({ meta: [{ title: "Accept Invitation · Gradual" }] }),
  beforeLoad: async ({ context, params }) => {
    const { trpc, queryClient } = context;
    const session = await queryClient.ensureQueryData(
      trpc.auth.getSession.queryOptions()
    );
    if (!session?.user) {
      throw redirect({
        to: "/login",
        search: { redirect: `/invite/${params.invitationId}` },
      });
    }
  },
});

function RouteComponent() {
  const { invitationId } = Route.useParams();
  return <AcceptInvitationPage invitationId={invitationId} />;
}
