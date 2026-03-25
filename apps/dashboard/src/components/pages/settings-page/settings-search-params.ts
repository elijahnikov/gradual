import {
  RiFileTextLine,
  RiNotification3Fill,
  RiSettings3Fill,
} from "@remixicon/react";
import { parseAsStringLiteral } from "nuqs";
import type React from "react";

export const settingsTabOptions = [
  "general",
  "templates",
  "notifications",
] as const;

export type SettingsTab = (typeof settingsTabOptions)[number];

export const settingsTabList: {
  tab: SettingsTab;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  hotkey?: string;
}[] = [
  {
    tab: "general",
    icon: RiSettings3Fill,
    description: "Project name, description, and danger zone",
    hotkey: "1",
  },
  {
    tab: "templates",
    icon: RiFileTextLine,
    description: "Flag templates for quick flag creation",
    hotkey: "2",
  },
  {
    tab: "notifications",
    icon: RiNotification3Fill,
    description: "Notification preferences and channels",
    hotkey: "3",
  },
];

export const settingsSearchParams = {
  tab: parseAsStringLiteral(settingsTabOptions).withDefault("general"),
};
