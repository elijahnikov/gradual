import { cn } from "@gradual/ui";
import { Text } from "@gradual/ui/text";
import {
  RiBookmark2Fill,
  RiFolder2Fill,
  RiHistoryFill,
  RiHome2Fill,
  RiKey2Fill,
  RiLineChartFill,
  RiSettings5Fill,
  RiTimer2Fill,
} from "@remixicon/react";

const topItems = [
  { icon: RiHome2Fill, title: "Home", active: false },
  { icon: RiTimer2Fill, title: "Flags", active: true },
  { icon: RiFolder2Fill, title: "Audiences", active: false },
  { icon: RiBookmark2Fill, title: "Environments", active: false },
  { icon: RiLineChartFill, title: "Analytics", active: false },
];

const bottomItems = [
  { icon: RiHistoryFill, title: "Audit Log", active: false },
  { icon: RiKey2Fill, title: "API Keys", active: false },
  { icon: RiSettings5Fill, title: "Settings", active: false },
];

function MiniNavItem({
  icon: Icon,
  title,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-7 w-full items-center gap-2 rounded-md px-2 text-[11px]",
        active ? "bg-ui-bg-base-hover text-ui-fg-base" : "text-ui-fg-muted"
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      <Text className="truncate text-[11px]" weight="plus">
        {title}
      </Text>
    </div>
  );
}

export function MiniProjectSidebar() {
  return (
    <div className="flex h-full w-40 min-w-40 flex-col border-r p-2">
      <div className="flex flex-col gap-0.5">
        {topItems.map((item) => (
          <MiniNavItem
            active={item.active}
            icon={item.icon}
            key={item.title}
            title={item.title}
          />
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-0.5">
        {bottomItems.map((item) => (
          <MiniNavItem
            active={item.active}
            icon={item.icon}
            key={item.title}
            title={item.title}
          />
        ))}
      </div>
    </div>
  );
}
