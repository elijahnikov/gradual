import { lazy, Suspense } from "react";
import CommandPalette from "../../command-pallette";
import ProjectSidebar, { MobileProjectSidebar } from "../../project-sidebar";
import { ProjectBreadcrumbsSkeleton } from "./project-breadcrumbs";

const ProjectBreadcrumbs = lazy(() => import("./project-breadcrumbs"));

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CommandPalette>
      <div className="flex h-full flex-col bg-ui-bg-base sm:flex-row">
        <MobileProjectSidebar />
        <ProjectSidebar />
        <main className="flex h-full w-full flex-col md:max-h-[calc(100vh-20px)]">
          <Suspense fallback={<ProjectBreadcrumbsSkeleton />}>
            <ProjectBreadcrumbs />
          </Suspense>
          <div className="min-h-0 flex-1">{children}</div>
        </main>
      </div>
    </CommandPalette>
  );
}
