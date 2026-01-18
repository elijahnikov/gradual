import { SidebarHeader } from "@gradual/ui/sidebar";
import { Suspense } from "react";
import OrganizationDropdown, {
  OrganizationDropdownSkeleton,
} from "./organization-dropdown";

export default function MainSidebarHeader() {
  return (
    <SidebarHeader>
      <div className="flex items-center gap-x-2">
        <Suspense fallback={<OrganizationDropdownSkeleton />}>
          <OrganizationDropdown />
        </Suspense>
      </div>
    </SidebarHeader>
  );
}
