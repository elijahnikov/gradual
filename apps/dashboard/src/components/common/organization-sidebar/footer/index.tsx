import { Card } from "@gradual/ui/card";
import { SidebarFooter } from "@gradual/ui/sidebar";
import { TooltipProvider } from "@gradual/ui/tooltip";
import { RiQuestionFill } from "@remixicon/react";
import { Suspense } from "react";
import SidebarLinkItem from "../sidebar-link-item";
import UserMenu, { UserMenuSkeleton } from "./user-menu";

export default function MainSidebarFooter() {
  return (
    <TooltipProvider>
      <SidebarFooter className="mt-auto pb-2">
        <div className="flex flex-col items-center gap-y-2">
          <div className="relative left-0">
            <SidebarLinkItem
              external
              icon={RiQuestionFill}
              title="Documentation"
              url="https://gradual.so/docs"
            />
          </div>
          <Card className="relative flex w-max flex-col gap-1.5 rounded-full bg-ui-bg-base p-1">
            <div className="flex flex-col items-center gap-2">
              <Suspense fallback={<UserMenuSkeleton />}>
                <UserMenu />
              </Suspense>
            </div>
          </Card>
        </div>
      </SidebarFooter>
    </TooltipProvider>
  );
}
