import { Card } from "@gradual/ui/card";
import { SidebarHeader } from "@gradual/ui/sidebar";
import { Suspense } from "react";
import OrganizationDropdown, {
  OrganizationDropdownSkeleton,
} from "./organization-dropdown";
import UserMenu, { UserMenuSkeleton } from "./user-menu";

export default function MainSidebarHeader() {
  return (
    <SidebarHeader>
      <div className="flex items-center gap-x-2">
        <Card className="relative flex w-max flex-col gap-1.5 rounded-full bg-ui-bg-base p-1">
          <div className="flex flex-col items-center gap-2">
            <Suspense fallback={<UserMenuSkeleton />}>
              <UserMenu />
            </Suspense>
          </div>
        </Card>
        <Suspense fallback={<OrganizationDropdownSkeleton />}>
          <OrganizationDropdown />
        </Suspense>
      </div>
    </SidebarHeader>
  );
}
