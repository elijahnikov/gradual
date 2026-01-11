import {
  Sidebar,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
} from "@gradual/ui/sidebar";

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
      <Sidebar className="z-50" collapsible="icon" variant="inset">
        <SidebarHeader>ORg</SidebarHeader>
      </Sidebar>
      <SidebarInset>
        <main className="h-full overflow-y-auto md:max-h-[calc(100vh-18px)]">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
