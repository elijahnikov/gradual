import {
  Command,
  CommandCollection,
  CommandDialog,
  CommandDialogPopup,
  CommandEmpty,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPanel,
  CommandSeparator,
} from "@gradual/ui/command";
import {
  RiBookmark2Fill,
  RiEarthFill,
  RiFlagLine,
  RiFolder2Fill,
  RiHistoryFill,
  RiHome2Fill,
  RiKey2Fill,
  RiLineChartFill,
  RiSettings5Fill,
  RiTimer2Fill,
} from "@remixicon/react";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePermissions } from "@/lib/hooks/use-permissions";
import CreateEnvironmentDialog from "../dialogs/create-environment-dialog";
import CreateFlagDialog from "../dialogs/create-flag-dialog";
import CreateSegmentDialog from "../dialogs/create-segment-dialog";

interface CommandPaletteContextValue {
  open: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null
);

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error("useCommandPalette must be used within CommandPalette");
  }
  return ctx;
}

interface Item {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: () => void;
}

interface Group {
  value: string;
  items: Item[];
}

export default function CommandPalette({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [createFlagOpen, setCreateFlagOpen] = useState(false);
  const [createEnvOpen, setCreateEnvOpen] = useState(false);
  const [createSegmentOpen, setCreateSegmentOpen] = useState(false);
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const {
    canViewAuditLog,
    canReadApiKeys,
    canViewSettings,
    canCreateFlags,
    canCreateSegments,
    canCreateEnvironments,
  } = usePermissions();

  const projectPath =
    params?.organizationSlug && params?.projectSlug
      ? `/${params.organizationSlug}/${params.projectSlug}`
      : null;

  const goTo = useCallback(
    (path: string) => {
      navigate({ to: path, search: {} });
      setOpen(false);
    },
    [navigate]
  );

  const navigationItems: Item[] = projectPath
    ? [
        {
          value: "go-home",
          label: "Home",
          icon: RiHome2Fill,
          action: () => goTo(`${projectPath}/`),
        },
        {
          value: "go-flags",
          label: "Flags",
          icon: RiTimer2Fill,
          action: () => goTo(`${projectPath}/flags`),
        },
        {
          value: "go-segments",
          label: "Segments",
          icon: RiFolder2Fill,
          action: () => goTo(`${projectPath}/segments`),
        },
        {
          value: "go-environments",
          label: "Environments",
          icon: RiBookmark2Fill,
          action: () => goTo(`${projectPath}/environments`),
        },
        {
          value: "go-analytics",
          label: "Analytics",
          icon: RiLineChartFill,
          action: () => goTo(`${projectPath}/analytics`),
        },
        ...(canViewAuditLog
          ? [
              {
                value: "go-audit-log",
                label: "Audit Log",
                icon: RiHistoryFill,
                action: () => goTo(`${projectPath}/audit-log`),
              },
            ]
          : []),
        ...(canReadApiKeys
          ? [
              {
                value: "go-api-keys",
                label: "API Keys",
                icon: RiKey2Fill,
                action: () => goTo(`${projectPath}/api`),
              },
            ]
          : []),
        ...(canViewSettings
          ? [
              {
                value: "go-settings",
                label: "Settings",
                icon: RiSettings5Fill,
                action: () => goTo(`${projectPath}/settings`),
              },
            ]
          : []),
      ]
    : [];

  const actionItems: Item[] = projectPath
    ? [
        ...(canCreateFlags
          ? [
              {
                value: "create-flag",
                label: "Create feature flag",
                icon: RiFlagLine,
                action: () => setCreateFlagOpen(true),
              },
            ]
          : []),
        ...(canCreateSegments
          ? [
              {
                value: "create-segment",
                label: "Create segment",
                icon: RiFolder2Fill,
                action: () => setCreateSegmentOpen(true),
              },
            ]
          : []),
        ...(canCreateEnvironments
          ? [
              {
                value: "create-environment",
                label: "Create environment",
                icon: RiEarthFill,
                action: () => setCreateEnvOpen(true),
              },
            ]
          : []),
      ]
    : [];

  const groupedItems: Group[] = [
    ...(navigationItems.length > 0
      ? [{ value: "Navigation", items: navigationItems }]
      : []),
    ...(actionItems.length > 0
      ? [{ value: "Actions", items: actionItems }]
      : []),
  ];

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const contextValue = useMemo(() => ({ open: () => setOpen(true) }), []);

  function handleItemClick(item: Item) {
    item.action?.();
    setOpen(false);
  }

  return (
    <CommandPaletteContext.Provider value={contextValue}>
      {children}
      <CreateFlagDialog
        onOpenChange={setCreateFlagOpen}
        open={createFlagOpen}
      />
      <CreateEnvironmentDialog
        onOpenChange={setCreateEnvOpen}
        open={createEnvOpen}
      />
      <CreateSegmentDialog
        onOpenChange={setCreateSegmentOpen}
        open={createSegmentOpen}
      />
      <CommandDialog onOpenChange={setOpen} open={open}>
        <CommandDialogPopup className="relative top-24">
          <Command items={groupedItems}>
            <CommandInput placeholder="Search pages and actions..." />
            <CommandPanel>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandList className="mb-2 overflow-x-hidden p-0!">
                {(group: Group) => (
                  <Fragment key={group.value}>
                    <CommandGroup className="px-2" items={group.items}>
                      <CommandGroupLabel>{group.value}</CommandGroupLabel>
                      <CommandCollection>
                        {(item: Item) => {
                          const Icon = item.icon;
                          return (
                            <CommandItem
                              className="flex items-center gap-x-2"
                              key={item.value}
                              onClick={() => handleItemClick(item)}
                              value={item.value}
                            >
                              {Icon && (
                                <Icon className="size-4 text-ui-fg-muted" />
                              )}
                              <span className="flex-1 text-[13px]">
                                {item.label}
                              </span>
                            </CommandItem>
                          );
                        }}
                      </CommandCollection>
                    </CommandGroup>
                    <CommandSeparator className="-mx-1" />
                  </Fragment>
                )}
              </CommandList>
            </CommandPanel>
          </Command>
        </CommandDialogPopup>
      </CommandDialog>
    </CommandPaletteContext.Provider>
  );
}
