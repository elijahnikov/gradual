import { Badge } from "@gradual/ui/badge";
import { Button } from "@gradual/ui/button";
import { toastManager } from "@gradual/ui/toast";
import { useNavigate } from "@tanstack/react-router";
import { authClient } from "@/auth/client";
import { SOCIAL_LOGIN_ICONS } from "@/lib/misc/social-login-icons";

type Socials = "google" | "github" | "linear";

const socials: { id: Socials; icon: React.ReactNode; label: string }[] = [
  {
    id: "google",
    icon: SOCIAL_LOGIN_ICONS.GOOGLE,
    label: "Google",
  },
  {
    id: "github",
    icon: SOCIAL_LOGIN_ICONS.GITHUB,
    label: "GitHub",
  },
  {
    id: "linear",
    icon: SOCIAL_LOGIN_ICONS.LINEAR,
    label: "Linear",
  },
];

export default function LoginButtons() {
  const navigate = useNavigate();
  const lastLoginMethod = authClient.getLastUsedLoginMethod();

  return (
    <div className="w-full space-y-3">
      {socials.map((social) => (
        <Button
          className="relative w-full gap-x-2"
          key={social.id}
          onClick={async () => {
            const { data, error } = await authClient.signIn.social({
              provider: social.id,
              callbackURL: "/",
            });
            if (error) {
              toastManager.add({
                type: "error",
                title: error.message,
              });
            }
            if (data) {
              throw navigate({ to: data.url });
            }
          }}
          variant={"outline"}
        >
          {social.icon}
          <p>Continue with {social.label}</p>
          {lastLoginMethod === social.id && (
            <div className="absolute -top-1.5 -right-4">
              <Badge>Last used</Badge>
            </div>
          )}
        </Button>
      ))}
    </div>
  );
}
