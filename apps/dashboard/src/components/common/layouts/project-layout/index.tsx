import ProjectSidebar from "../../project-sidebar";
import ProjectBreadcrumbs from "./project-breadcrumbs";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full bg-ui-bg-base">
      <ProjectSidebar />
      <main className="h-full w-full overflow-y-auto md:max-h-[calc(100vh-20px)]">
        <ProjectBreadcrumbs />
        {children}
      </main>
    </div>
  );
}
