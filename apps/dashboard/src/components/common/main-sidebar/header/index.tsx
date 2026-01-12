"use client";

import { Card } from "@gradual/ui/card";
import { SidebarHeader } from "@gradual/ui/sidebar";
import { Suspense } from "react";
// import EvermindMenu from "../evermind-menu";
import UserMenu, { UserMenuSkeleton } from "./user-menu";
// import WorkspaceSwitcher, {
//   WorkspaceSwitcherSkeleton,
// } from "./workspace-switcher";

export default function MainSidebarHeader() {
  return (
    <SidebarHeader>
      <Card className="relative flex w-max flex-col gap-1.5 rounded-full bg-ui-bg-base p-1">
        <div className="flex flex-col items-center gap-2">
          <Suspense fallback={<UserMenuSkeleton />}>
            <UserMenu />
          </Suspense>
        </div>
      </Card>
      {/* <Suspense fallback={<WorkspaceSwitcherSkeleton />}>
            <WorkspaceSwitcher />
            </Suspense>
            <EvermindMenu /> */}
    </SidebarHeader>
  );
}
