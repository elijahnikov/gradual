import { Button } from "@gradual/ui/button";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/auth/client";

export const Route = createFileRoute("/device")({
  validateSearch: (search: Record<string, unknown>) => ({
    user_code: (search.user_code as string) ?? "",
  }),
  beforeLoad: async ({ context }) => {
    const { trpc, queryClient } = context;
    const session = await queryClient.fetchQuery({
      ...trpc.auth.getSession.queryOptions(),
      staleTime: 0,
    });
    if (!session?.user) {
      throw redirect({
        to: "/login",
      });
    }
  },
  component: DeviceVerifyPage,
});

function DeviceVerifyPage() {
  const { user_code } = Route.useSearch();
  const [status, setStatus] = useState<
    "pending" | "approved" | "denied" | "error"
  >("pending");
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    setLoading(true);
    try {
      await authClient.device.approve({
        userCode: user_code,
      });
      setStatus("approved");
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeny() {
    setLoading(true);
    try {
      await authClient.device.deny({
        userCode: user_code,
      });
      setStatus("denied");
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ui-bg-subtle">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-ui-border-base bg-ui-bg-base p-8 shadow-sm">
        {status === "pending" && (
          <>
            <div className="space-y-2 text-center">
              <h1 className="font-semibold text-lg text-ui-fg-base">
                Device Authorization
              </h1>
              <p className="text-sm text-ui-fg-subtle">
                A CLI is requesting access to your account. Confirm the code
                below to authorize.
              </p>
            </div>

            <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle p-4 text-center">
              <p className="text-sm text-ui-fg-subtle">Authorization code</p>
              <p className="mt-1 font-bold font-mono text-2xl text-ui-fg-base tracking-widest">
                {user_code || "—"}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1"
                disabled={loading || !user_code}
                onClick={handleDeny}
                variant="secondary"
              >
                Deny
              </Button>
              <Button
                className="flex-1"
                disabled={loading || !user_code}
                onClick={handleApprove}
                variant="gradual"
              >
                {loading ? "Authorizing..." : "Approve"}
              </Button>
            </div>
          </>
        )}

        {status === "approved" && (
          <div className="space-y-2 text-center">
            <h1 className="font-semibold text-lg text-ui-fg-base">
              Device Authorized
            </h1>
            <p className="text-sm text-ui-fg-subtle">
              You can close this window and return to your terminal.
            </p>
          </div>
        )}

        {status === "denied" && (
          <div className="space-y-2 text-center">
            <h1 className="font-semibold text-lg text-ui-fg-base">
              Authorization Denied
            </h1>
            <p className="text-sm text-ui-fg-subtle">
              The device request was denied. You can close this window.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-2 text-center">
            <h1 className="font-semibold text-lg text-ui-fg-base">
              Something went wrong
            </h1>
            <p className="text-sm text-ui-fg-subtle">
              The authorization request failed. The code may have expired.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
