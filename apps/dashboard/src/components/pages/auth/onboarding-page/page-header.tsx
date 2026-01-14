import { cn } from "@gradual/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@gradual/ui/avatar";
import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import { Text } from "@gradual/ui/text";
import { RiLogoutBoxLine } from "@remixicon/react";
import { useNavigate } from "@tanstack/react-router";
import { authClient } from "@/auth/client";

export default function PageHeader({
  email,
  image,
}: {
  email: string | undefined;
  image: string | undefined;
}) {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="absolute top-0 flex h-12 w-full items-center justify-between px-2 text-center">
      <Card
        className={cn(
          "relative flex w-max shrink-0 items-center justify-center overflow-hidden rounded-full bg-black p-0.5"
        )}
      >
        <img
          alt="Gradual"
          height={24}
          src="/gradual-logo-500x500.png"
          width={24}
        />
      </Card>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <Avatar className="size-6 shadow-borders-base">
            <AvatarImage src={image} />
            <AvatarFallback>
              {email ? email.charAt(0).toUpperCase() : ""}
            </AvatarFallback>
          </Avatar>
          {email && <Text className="text-ui-fg-muted">{email}</Text>}
        </div>
        <Button
          className="pl-1 text-[13px]"
          onClick={handleSignOut}
          size="small"
          variant="ghost"
        >
          <RiLogoutBoxLine className="size-3" /> Sign out
        </Button>
      </div>
    </div>
  );
}
