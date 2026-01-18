"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@gradual/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@gradual/ui/dropdown-menu";
import { Skeleton } from "@gradual/ui/skeleton";
import { useTheme } from "@gradual/ui/theme";
import { useSuspenseQuery } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import {
  CreditCardIcon,
  LogOutIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  UserIcon,
} from "lucide-react";
import { authClient } from "@/auth/client";
import { useTRPC } from "@/lib/trpc";

export default function UserMenu() {
  const trpc = useTRPC();
  const { data: user } = useSuspenseQuery(trpc.auth.getSession.queryOptions());

  const { resolvedTheme, setTheme } = useTheme();

  const handleSignOut = () => {
    authClient.signOut();
    throw redirect({ to: "/login" });
  };

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center justify-center">
        <Avatar className="size-6">
          <AvatarImage alt="User" src={user.user.image ?? undefined} />
          <AvatarFallback>
            {user.user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <UserIcon />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CreditCardIcon />
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem>
            <SettingsIcon />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            {resolvedTheme !== "dark" ? <MoonIcon /> : <SunIcon />}
            {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="text-ui-fg-error [&_svg]:text-ui-fg-error"
            onSelect={() => {
              handleSignOut();
            }}
          >
            <LogOutIcon />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const UserMenuSkeleton = () => (
  <Skeleton className="min-h-7 min-w-7 rounded-full" />
);
