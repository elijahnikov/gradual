import { SidebarHeader } from "@gradual/ui/sidebar";
import { TooltipProvider } from "@gradual/ui/tooltip";
import { RiHomeSmileFill, RiSettings5Fill } from "@remixicon/react";
import { useMatchRoute, useParams } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import SidebarLinkItem from "../sidebar-link-item";
import { OrganizationDropdownSkeleton } from "./organization-dropdown";

const OrganizationDropdown = lazy(() => import("./organization-dropdown"));

export default function MainSidebarHeader() {
  const matchRoute = useMatchRoute();
  const { organizationSlug } = useParams({ strict: false });

  const isOverviewActive = !!matchRoute({
    to: "/$organizationSlug",
    params: { organizationSlug: organizationSlug as string },
    fuzzy: false,
  });

  const isSettingsActive = !!matchRoute({
    to: "/$organizationSlug/settings",
    params: { organizationSlug: organizationSlug as string },
    fuzzy: true,
  });

  return (
    <SidebarHeader>
      <div className="flex flex-col items-center gap-y-2">
        <Suspense fallback={<OrganizationDropdownSkeleton />}>
          <OrganizationDropdown />
        </Suspense>
        <div className="relative left-0 space-y-1">
          <TooltipProvider>
            <SidebarLinkItem
              icon={RiHomeSmileFill}
              isActive={isOverviewActive}
              title="Overview"
              url="/$organizationSlug/"
            />
            <SidebarLinkItem
              icon={RiSettings5Fill}
              isActive={isSettingsActive}
              title="Organization settings"
              url="/$organizationSlug/settings"
            />
          </TooltipProvider>
        </div>
      </div>
    </SidebarHeader>
  );
}
