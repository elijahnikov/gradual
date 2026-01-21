import { Suspense } from "react";
import ProjectSidebar from "../../project-sidebar";
import ProjectBreadcrumbs, {
  ProjectBreadcrumbsSkeleton,
} from "./project-breadcrumbs";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full bg-ui-bg-base">
      <ProjectSidebar />
      <main className="h-full w-full overflow-y-auto md:max-h-[calc(100vh-20px)]">
        <Suspense fallback={<ProjectBreadcrumbsSkeleton />}>
          <ProjectBreadcrumbs />
        </Suspense>
        {children}
      </main>
    </div>
  );
}
