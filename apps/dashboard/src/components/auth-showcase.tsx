import { Button } from "@gradual/ui/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { authClient } from "~/auth/client";
import { useTRPC } from "~/lib/trpc";

export function AuthShowcase() {
  const trpc = useTRPC();
  const { data: session } = useSuspenseQuery(
    trpc.auth.getSession.queryOptions()
  );
  const navigate = useNavigate();

  if (!session) {
    return (
      <>
        <Button
          onClick={async () => {
            const res = await authClient.signIn.social({
              provider: "github",
              callbackURL: "/",
            });
            if (!res.data?.url) {
              throw new Error("No URL returned from signInSocial");
            }
            await navigate({ href: res.data.url, replace: true });
          }}
          size="default"
          variant="gradual"
        >
          Sign in with GitHub
        </Button>
        <Button
          onClick={async () => {
            const res = await authClient.signIn.social({
              provider: "google",
              callbackURL: "/",
            });
            if (!res.data?.url) {
              throw new Error("No URL returned from signInSocial");
            }
            await navigate({ href: res.data.url, replace: true });
          }}
          size="default"
          variant="gradual"
        >
          Sign in with Google
        </Button>
        <Button
          onClick={async () => {
            const res = await authClient.signIn.social({
              provider: "linear",
            });
            if (!res.data?.url) {
              throw new Error("No URL returned from signInSocial");
            }
            await navigate({ href: res.data.url, replace: true });
          }}
          size="default"
          variant="gradual"
        >
          Sign in with Linear
        </Button>
      </>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl">
        <span>Logged in as {session.user.name}</span>
      </p>

      <Button
        onClick={async () => {
          await authClient.signOut();
          await navigate({ href: "/", replace: true });
        }}
        size="lg"
        variant="gradual"
      >
        Sign out
      </Button>
    </div>
  );
}
