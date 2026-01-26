import { cn } from "@gradual/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@gradual/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@gradual/ui/sidebar";
import { Skeleton } from "@gradual/ui/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import OrganizationIcon from "@/components/common/organization-icon";
import { useTRPC } from "@/lib/trpc";
import ProjectSubmenu from "./project-submenu";

export default function OrganizationDropdown() {
  const organizationParams = useParams({
    strict: false,
  });

  const trpc = useTRPC();

  const [isOpen, setIsOpen] = useState(false);
  const [_openSubmenuId, _setOpenSubmenuIdd] = useState<string | null>(null);

  const { data: organization } = useSuspenseQuery(
    trpc.organization.getBySlug.queryOptions({
      organizationSlug: organizationParams.organizationSlug as string,
    })
  );

  const { data: organizations } = useSuspenseQuery(
    trpc.organization.getAllByUserId.queryOptions()
  );

  return (
    <div className="flex w-full items-center gap-2">
      <SidebarGroup className="p-0">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu
                modal={false}
                onOpenChange={setIsOpen}
                open={isOpen}
              >
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      className={cn([
                        "after:button-neutral-gradient flex items-center justify-center rounded-full border bg-ui-button-neutral px-0.5 text-ui-fg-base",
                        "hover:after:button-neutral-hover-gradient hover:bg-ui-button-neutral-hover",
                        "active:after:button-neutral-pressed-gradient active:bg-ui-button-neutral-pressed",
                        "items-centers z-50 h-8 ring-0 focus-visible:shadow-buttons-neutral-focus",
                      ])}
                      size="lg"
                    />
                  }
                >
                  <OrganizationIcon
                    icon={organization.logo ?? undefined}
                    name={organization.name}
                    size="md"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="z-50 w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side={"right"}
                  sideOffset={4}
                  style={{ zIndex: 100 }}
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-ui-fg-muted">
                      My organizations
                    </DropdownMenuLabel>
                    {organizations?.map((organization) => (
                      <Link
                        key={organization.organization.id}
                        params={{
                          organizationSlug: organization.organization.slug,
                        }}
                        preload="intent"
                        search={{}}
                        to={"/$organizationSlug"}
                      >
                        <ProjectSubmenu
                          organizationSlug={organization.organization.slug}
                          projects={organization.projects}
                        >
                          <div
                            className={cn(
                              "flex items-center gap-x-2 py-0.5",
                              organizationParams.organizationSlug ===
                                organization.organization.slug
                                ? "text-ui-fg-base! [&_svg]:text-ui-fg-base!"
                                : ""
                            )}
                          >
                            <OrganizationIcon
                              icon={organization.organization.logo ?? undefined}
                              name={organization.organization.name}
                              size="sm"
                            />
                          </div>
                          <span className="truncate font-medium">
                            {organization.organization.name}
                          </span>
                        </ProjectSubmenu>
                      </Link>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  );
}

export const OrganizationDropdownSkeleton = () => (
  <div className="flex w-full flex-col gap-2">
    <Skeleton className="h-8 w-full" />
  </div>
);
