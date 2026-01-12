import { Button } from "@gradual/ui/button";
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
  return (
    <div className="w-full space-y-3">
      {socials.map((social) => (
        <Button
          className="w-full gap-x-2"
          key={social.id}
          onClick={async () => {
            await authClient.signIn.social({
              provider: social.id,
              callbackURL: "/",
            });
          }}
          variant={"outline"}
        >
          {social.icon}
          <p>Continue with {social.label}</p>
        </Button>
      ))}
    </div>
  );
}
