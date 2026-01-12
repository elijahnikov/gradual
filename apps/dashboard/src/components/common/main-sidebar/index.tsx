import { Sidebar } from "@gradual/ui/sidebar";
import { TooltipProvider } from "@gradual/ui/tooltip";
import MainSidebarHeader from "./header";

export default function MainSidebar() {
  return (
    <TooltipProvider>
      <Sidebar className="z-50" collapsible="icon" variant="inset">
        <MainSidebarHeader />
        {/* <MainSidebarHeader />
        <MainSidebarContent />
        <MainSidebarFooter /> */}
      </Sidebar>
    </TooltipProvider>
  );
}
