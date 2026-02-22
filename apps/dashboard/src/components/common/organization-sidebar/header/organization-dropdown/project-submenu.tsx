import type { RouterOutputs } from "@gradual/api";
import {
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  MenuItem,
} from "@gradual/ui/dropdown-menu";
import { RiAddLine } from "@remixicon/react";
import { Link } from "@tanstack/react-router";

export default function ProjectSubmenu({
  children,
  organizationSlug,
  projects,
  onCreateProject,
}: {
  children: React.ReactNode;
  organizationSlug: string;
  projects: RouterOutputs["organization"]["getAllByUserId"][number]["projects"];
  onCreateProject: () => void;
}) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>{children}</DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-ui-fg-muted">
            Projects
          </DropdownMenuLabel>
          {projects.length > 0 ? (
            <div>
              {projects.map((project) => (
                <Link
                  key={project.id}
                  params={{
                    organizationSlug,
                    projectSlug: project.slug,
                  }}
                  preload="intent"
                  search={{}}
                  to={"/$organizationSlug/$projectSlug"}
                >
                  <MenuItem className="font-medium" key={project.id}>
                    {project.name}
                  </MenuItem>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-2 py-1.5 text-sm text-ui-fg-muted">
              No projects
            </div>
          )}
          <DropdownMenuSeparator />
          <MenuItem
            className="font-medium"
            onClick={(e) => {
              e.stopPropagation();
              onCreateProject();
            }}
          >
            <RiAddLine className="size-4" />
            Create new project
          </MenuItem>
        </DropdownMenuGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
