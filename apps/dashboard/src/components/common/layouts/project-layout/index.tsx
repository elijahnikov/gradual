import ProjectSidebar from "../../project-sidebar";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full bg-ui-bg-base">
      <ProjectSidebar />
      <main className="h-full w-full overflow-y-auto md:max-h-[calc(100vh-20px)]">
        {children}
      </main>
    </div>
  );
}
