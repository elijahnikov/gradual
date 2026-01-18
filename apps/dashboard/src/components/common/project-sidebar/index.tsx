import { cn } from "@gradual/ui";
import { Button } from "@gradual/ui/button";
import { Text } from "@gradual/ui/text";
import { TooltipProvider } from "@gradual/ui/tooltip";
import {
  RiBookmark2Fill,
  RiFolder2Fill,
  RiHome2Fill,
  RiKey2Fill,
  RiLineChartFill,
  RiSettings5Fill,
  RiTimer2Fill,
} from "@remixicon/react";
import { Link, useLocation, useParams } from "@tanstack/react-router";
import { useMemo } from "react";

export default function ProjectSidebar() {
  const params = useParams({ strict: false });
  const pathname = useLocation({ select: (location) => location.pathname });

  const navigationItems = useMemo(() => {
    if (!(params?.organizationSlug && params?.projectSlug)) {
      return [];
    }

    const projectPath = `/${params.organizationSlug}/${params.projectSlug}`;

    return [
      {
        icon: RiHome2Fill,
        title: "Home",
        url: `${projectPath}/`,
        isActive: pathname === projectPath,
      },
      {
        icon: RiTimer2Fill,
        title: "Flags",
        url: `${projectPath}/flags`,
        isActive: pathname === `${projectPath}/flags`,
      },
      {
        icon: RiFolder2Fill,
        title: "Audiences",
        url: `${projectPath}/audiences`,
        isActive:
          pathname === `${projectPath}/audiences` ||
          pathname.startsWith(`${projectPath}/audience/`),
      },
      {
        icon: RiBookmark2Fill,
        title: "Environments",
        url: `${projectPath}/environments`,
        isActive: pathname === `${projectPath}/environments`,
      },
      {
        icon: RiLineChartFill,
        title: "Analytics",
        url: `${projectPath}/analytics`,
        isActive: pathname === `${projectPath}/analytics`,
      },
      {
        icon: RiKey2Fill,
        title: "API Keys",
        url: `${projectPath}/api`,
        isActive: pathname === `${projectPath}/api`,
      },
      {
        icon: RiSettings5Fill,
        title: "Settings",
        url: `${projectPath}/settings`,
        isActive: pathname === `${projectPath}/settings`,
      },
    ];
  }, [pathname, params?.organizationSlug, params?.projectSlug]);

  return (
    <TooltipProvider>
      <div className="z-50 flex h-full w-52 flex-col items-center border-r p-2">
        <div className="flex w-full flex-col gap-y-1">
          {navigationItems.slice(0, navigationItems.length - 2).map((item) => (
            <Link key={item.title} to={item.url}>
              <Button
                className={cn(
                  "group/menu flex h-8 w-full items-center justify-start self-start text-left font-sans text-[13px]",
                  item.isActive
                    ? "text-ui-fg-base"
                    : "text-ui-fg-muted transition-colors duration-200 hover:bg-[rgba(0,0,0,0.070)] hover:text-ui-fg-base dark:hover:bg-[rgba(255,255,255,0.070)]"
                )}
                key={item.title}
                size="small"
                variant={item.isActive ? "secondary" : "ghost"}
              >
                <item.icon className={cn("h-4 w-4")} />
                <Text size="small" weight="plus">
                  {item.title}
                </Text>
              </Button>
            </Link>
          ))}
        </div>
        <div className="mt-auto flex w-full flex-col gap-y-1">
          {navigationItems
            .slice(navigationItems.length - 2, navigationItems.length)
            .map((item) => (
              <Link key={item.title} to={item.url}>
                <Button
                  className={cn(
                    "group/menu flex h-8 w-full items-center justify-start self-start text-left font-sans text-[13px]",
                    item.isActive
                      ? "text-ui-fg-base"
                      : "text-ui-fg-muted transition-colors duration-200 hover:bg-[rgba(0,0,0,0.070)] hover:text-ui-fg-base dark:hover:bg-[rgba(255,255,255,0.070)]"
                  )}
                  key={item.title}
                  size="small"
                  variant={item.isActive ? "secondary" : "ghost"}
                >
                  <item.icon className={cn("h-4 w-4")} />
                  <Text size="small" weight="plus">
                    {item.title}
                  </Text>
                </Button>
              </Link>
            ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
