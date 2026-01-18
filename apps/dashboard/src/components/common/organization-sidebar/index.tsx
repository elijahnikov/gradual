import { Sidebar } from "@gradual/ui/sidebar";
import MainSidebarFooter from "./footer";
import MainSidebarHeader from "./header";

export default function OrganizationSidebar() {
  return (
    <Sidebar
      className="z-50 flex flex-col items-center"
      collapsible="icon"
      variant="inset"
    >
      <MainSidebarHeader />
      <MainSidebarFooter />
    </Sidebar>
  );
}
