import { cn } from "@gradual/ui";
import { Button } from "@gradual/ui/button";
import { Sheet, SheetClose, SheetPopup, SheetTrigger } from "@gradual/ui/sheet";
import { Text } from "@gradual/ui/text";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gradual/ui/tooltip";
import {
  RiBookmark2Fill,
  RiCloseLine,
  RiFolder2Fill,
  RiHistoryFill,
  RiHome2Fill,
  RiKey2Fill,
  RiLineChartFill,
  RiMenuLine,
  RiSettings5Fill,
  RiTimer2Fill,
} from "@remixicon/react";
import { useHotkeySequence } from "@tanstack/react-hotkeys";
import {
  Link,
  type LinkProps,
  useLocation,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import CreateNewMenu from "./create-new-menu";

function useNavigationItems() {
  const params = useParams({ strict: false });
  const pathname = useLocation({ select: (location) => location.pathname });

  return useMemo(() => {
    if (!(params?.organizationSlug && params?.projectSlug)) {
      return { topItems: [], bottomItems: [] };
    }

    const projectPath = `/${params.organizationSlug}/${params.projectSlug}`;

    const items: NavigationItemProps[] = [
      {
        icon: RiHome2Fill,
        title: "Home",
        url: `${projectPath}/`,
        isActive: pathname === projectPath,
        shortcutKeys: ["G", "H"],
      },
      {
        icon: RiTimer2Fill,
        title: "Flags",
        url: `${projectPath}/flags`,
        isActive:
          pathname === `${projectPath}/flags` ||
          pathname.startsWith(`${projectPath}/flags/`),
        shortcutKeys: ["G", "F"],
      },
      {
        icon: RiFolder2Fill,
        title: "Audiences",
        url: `${projectPath}/audiences`,
        isActive:
          pathname === `${projectPath}/audiences` ||
          pathname.startsWith(`${projectPath}/audience/`),
        shortcutKeys: ["G", "A"],
      },
      {
        icon: RiBookmark2Fill,
        title: "Environments",
        url: `${projectPath}/environments`,
        isActive: pathname === `${projectPath}/environments`,
        shortcutKeys: ["G", "E"],
      },
      {
        icon: RiLineChartFill,
        title: "Analytics",
        url: `${projectPath}/analytics`,
        isActive: pathname === `${projectPath}/analytics`,
        shortcutKeys: ["G", "N"],
      },
      {
        icon: RiHistoryFill,
        title: "Audit Log",
        url: `${projectPath}/audit-log`,
        isActive: pathname === `${projectPath}/audit-log`,
        shortcutKeys: ["G", "L"],
      },
      {
        icon: RiKey2Fill,
        title: "API Keys",
        url: `${projectPath}/api`,
        isActive: pathname === `${projectPath}/api`,
        shortcutKeys: ["G", "K"],
      },
      {
        icon: RiSettings5Fill,
        title: "Settings",
        url: `${projectPath}/settings`,
        isActive: pathname === `${projectPath}/settings`,
        shortcutKeys: ["G", "S"],
      },
    ];

    return {
      topItems: items.slice(0, items.length - 3),
      bottomItems: items.slice(items.length - 3),
    };
  }, [pathname, params?.organizationSlug, params?.projectSlug]);
}

interface NavigationItemProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  url: string;
  isActive: boolean;
  shortcutKeys?: string[];
  preload?: LinkProps["preload"];
  onClick?: () => void;
}

function NavigationItem({
  icon,
  title,
  url,
  isActive,
  shortcutKeys,
  preload = "viewport",
  onClick,
}: NavigationItemProps) {
  const Icon = icon;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            className={cn(
              "group/menu flex h-8 w-full items-center justify-start self-start text-left font-sans text-[13px] focus-visible:bg-transparent! focus-visible:shadow-borders-interactive-with-active!",
              isActive
                ? "text-ui-fg-base"
                : "text-ui-fg-muted transition-colors duration-200 hover:bg-[rgba(0,0,0,0.070)] hover:text-ui-fg-base dark:hover:bg-[rgba(255,255,255,0.070)]"
            )}
            render={
              <Link onClick={onClick} preload={preload} search={{}} to={url} />
            }
            size="small"
            variant={isActive ? "secondary" : "ghost"}
          />
        }
      >
        <Icon className="h-4 w-4" />
        <Text size="small" weight="plus">
          {title}
        </Text>
      </TooltipTrigger>
      {shortcutKeys && (
        <TooltipContent className="flex items-center gap-0" side="right">
          <div className="flex items-center gap-1">
            {title}
            <div className="flex items-center gap-0.5">
              {shortcutKeys.map((key) => (
                <kbd
                  className="rounded border border-ui-border-base bg-ui-bg-base px-1 py-0.5 font-mono text-[10px] text-ui-fg-base"
                  key={key}
                >
                  {key}
                </kbd>
              ))}
            </div>
          </div>
        </TooltipContent>
      )}
    </Tooltip>
  );
}

function useNavigationHotkeys() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const projectPath = `/${params?.organizationSlug}/${params?.projectSlug}`;

  const goTo = useCallback(
    (path: string) => navigate({ to: path, search: {} }),
    [navigate]
  );

  useHotkeySequence(["G", "H"], () => goTo(`${projectPath}/`));
  useHotkeySequence(["G", "F"], () => goTo(`${projectPath}/flags`));
  useHotkeySequence(["G", "A"], () => goTo(`${projectPath}/audiences`));
  useHotkeySequence(["G", "E"], () => goTo(`${projectPath}/environments`));
  useHotkeySequence(["G", "N"], () => goTo(`${projectPath}/analytics`));
  useHotkeySequence(["G", "L"], () => goTo(`${projectPath}/audit-log`));
  useHotkeySequence(["G", "K"], () => goTo(`${projectPath}/api`));
  useHotkeySequence(["G", "S"], () => goTo(`${projectPath}/settings`));
}

export default function ProjectSidebar() {
  const { topItems, bottomItems } = useNavigationItems();
  useNavigationHotkeys();

  return (
    <TooltipProvider>
      <div className="z-50 hidden h-full w-52 min-w-52 flex-col items-center border-r p-2 sm:flex">
        <div className="flex w-full flex-col gap-y-1">
          {topItems.map((item) => (
            <NavigationItem {...item} key={item.title} />
          ))}
          <CreateNewMenu />
        </div>
        <div className="mt-auto flex w-full flex-col gap-y-1">
          {bottomItems.map((item) => (
            <NavigationItem {...item} key={item.title} />
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

export function MobileProjectSidebar() {
  const [open, setOpen] = useState(false);
  const { topItems, bottomItems } = useNavigationItems();

  const handleNavClick = () => {
    setOpen(false);
  };

  return (
    <div className="flex items-center border-b px-3 py-2 sm:hidden">
      <Sheet onOpenChange={setOpen} open={open}>
        <SheetTrigger render={<Button size="small" variant="ghost" />}>
          <RiMenuLine className="size-5" />
        </SheetTrigger>
        <SheetPopup
          className="w-56 max-w-56"
          showCloseButton={false}
          side="left"
        >
          <div className="flex h-full flex-col p-2">
            <div className="mb-2 flex items-center justify-between">
              <SheetClose
                render={
                  <Button className="size-6" size="small" variant="ghost" />
                }
              >
                <RiCloseLine className="size-4 shrink-0" />
              </SheetClose>
            </div>
            <div className="flex w-full flex-col gap-y-1">
              {topItems.map((item) => (
                <NavigationItem
                  {...item}
                  key={item.title}
                  onClick={handleNavClick}
                />
              ))}
              <CreateNewMenu />
            </div>
            <div className="mt-auto flex w-full flex-col gap-y-1">
              {bottomItems.map((item) => (
                <NavigationItem
                  {...item}
                  key={item.title}
                  onClick={handleNavClick}
                />
              ))}
            </div>
          </div>
        </SheetPopup>
      </Sheet>
    </div>
  );
}
