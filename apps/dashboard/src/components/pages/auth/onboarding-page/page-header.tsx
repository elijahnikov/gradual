import { Avatar, AvatarFallback, AvatarImage } from "@gradual/ui/avatar";
import { Button } from "@gradual/ui/button";
import { Text } from "@gradual/ui/text";
import { RiLogoutBoxLine } from "@remixicon/react";
import { useNavigate } from "@tanstack/react-router";
import { authClient } from "@/auth/client";

interface PageHeaderProps {
  email: string | undefined;
  image: string | undefined;
}

export function PageHeader({ email, image }: PageHeaderProps) {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="absolute top-0 flex h-12 w-full items-center justify-between px-2">
      <div />
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <Avatar className="size-6 shadow-borders-base">
            <AvatarImage src={image} />
            <AvatarFallback>
              {email?.charAt(0).toUpperCase() ?? ""}
            </AvatarFallback>
          </Avatar>
          {email && <Text className="text-ui-fg-muted">{email}</Text>}
        </div>
        <Button
          className="pl-1.5 text-[13px]"
          onClick={handleSignOut}
          size="small"
          variant="ghost"
        >
          <RiLogoutBoxLine className="size-3" /> Sign out
        </Button>
      </div>
    </header>
  );
}
