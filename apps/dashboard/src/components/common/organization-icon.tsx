import { cn } from "@gradual/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@gradual/ui/avatar";
import { Card } from "@gradual/ui/card";

interface OrganizationIconProps {
  icon?: string;
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
}

export default function OrganizationIcon({
  icon,
  name,
  size = "md",
}: OrganizationIconProps) {
  return (
    <Card className="flex w-fit shrink-0 items-center justify-center rounded-full p-[2px]">
      <Avatar
        className={cn({
          "size-3": size === "xs",
          "size-4": size === "sm",
          "size-7": size === "md",
          "size-9": size === "lg",
        })}
      >
        <AvatarImage alt="User" src={icon ?? undefined} />
        <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
    </Card>
  );
}
