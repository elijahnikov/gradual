import { SidebarHeader } from "@gradual/ui/sidebar";
import { TooltipProvider } from "@gradual/ui/tooltip";
import { RiHomeSmileFill, RiSettings5Fill } from "@remixicon/react";
import { Suspense } from "react";
import SidebarLinkItem from "../sidebar-link-item";
import OrganizationDropdown, {
  OrganizationDropdownSkeleton,
} from "./organization-dropdown";

export default function MainSidebarHeader() {
  return (
    <SidebarHeader>
      <div className="flex flex-col items-center gap-y-2">
        <Suspense fallback={<OrganizationDropdownSkeleton />}>
          <OrganizationDropdown />
        </Suspense>
        <div className="relative left-0">
          <TooltipProvider>
            <SidebarLinkItem icon={RiHomeSmileFill} title="Overview" url="/" />
            <SidebarLinkItem
              icon={RiSettings5Fill}
              title="Organization settings"
              url="/"
            />
          </TooltipProvider>
        </div>
      </div>
    </SidebarHeader>
  );
}
