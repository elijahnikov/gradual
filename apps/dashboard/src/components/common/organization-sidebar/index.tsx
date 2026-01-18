import { Sidebar } from "@gradual/ui/sidebar";
import { TooltipProvider } from "@gradual/ui/tooltip";
import MainSidebarFooter from "./footer";
import MainSidebarHeader from "./header";

export default function MainSidebar() {
  return (
    <TooltipProvider>
      <Sidebar
        className="z-50 flex flex-col items-center"
        collapsible="icon"
        variant="inset"
      >
        <MainSidebarHeader />
        <MainSidebarFooter />
      </Sidebar>
    </TooltipProvider>
  );
}
