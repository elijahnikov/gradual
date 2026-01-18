import { Card } from "@gradual/ui/card";
import { SidebarFooter } from "@gradual/ui/sidebar";
import { Suspense } from "react";
import UserMenu, { UserMenuSkeleton } from "./user-menu";

export default function MainSidebarFooter() {
  return (
    <SidebarFooter className="mt-auto pb-2">
      <div className="flex items-center gap-x-2">
        <Card className="relative flex w-max flex-col gap-1.5 rounded-full bg-ui-bg-base p-1">
          <div className="flex flex-col items-center gap-2">
            <Suspense fallback={<UserMenuSkeleton />}>
              <UserMenu />
            </Suspense>
          </div>
        </Card>
      </div>
    </SidebarFooter>
  );
}
