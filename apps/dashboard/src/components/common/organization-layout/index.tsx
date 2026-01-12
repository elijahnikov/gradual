import { SidebarInset, SidebarProvider } from "@gradual/ui/sidebar";
import MainSidebar from "../main-sidebar";

export default function GlobalOrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider
      className="h-full bg-ui-bg-base"
      defaultOpen={true}
      open={true}
    >
      <MainSidebar />
      <SidebarInset>
        <main className="h-full overflow-y-auto md:max-h-[calc(100vh-18px)]">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
