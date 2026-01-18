import {
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  MenuItem,
} from "@gradual/ui/dropdown-menu";
import { Skeleton } from "@gradual/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTRPC } from "@/lib/trpc";

export default function ProjectSubmenu({
  children,
  organizationId,
  organizationSlug,
}: {
  children: React.ReactNode;
  organizationId: string;
  organizationSlug: string;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const trpc = useTRPC();
  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    ...trpc.project.getAllByOrganizationId.queryOptions({
      organizationId,
    }),
    enabled: isOpen,
  });
  return (
    <DropdownMenuSub onOpenChange={setIsOpen} open={isOpen}>
      <DropdownMenuSubTrigger>{children}</DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-ui-fg-muted">
            Projects
          </DropdownMenuLabel>
          {isLoadingProjects ? (
            <div className="p-1">
              <Skeleton className="h-7 w-full" />
            </div>
          ) : (
            <div>
              {projects?.map((project) => (
                <Link
                  key={project.id}
                  params={{
                    organizationSlug,
                    projectSlug: project.slug,
                  }}
                  preload="intent"
                  to={"/$organizationSlug/$projectSlug"}
                >
                  <MenuItem className="font-medium" key={project.id}>
                    {project.name}
                  </MenuItem>
                </Link>
              ))}
            </div>
          )}
        </DropdownMenuGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
