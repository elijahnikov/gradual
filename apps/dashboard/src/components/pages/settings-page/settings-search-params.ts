import {
  RiNotification3Fill,
  RiPlugLine,
  RiSettings3Fill,
  RiWebhookLine,
} from "@remixicon/react";
import { parseAsStringLiteral } from "nuqs";
import type React from "react";

export const settingsTabOptions = [
  "general",
  "webhooks",
  "integrations",
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
    tab: "webhooks",
    icon: RiWebhookLine,
    description: "Manage webhook endpoints and deliveries",
    hotkey: "2",
  },
  {
    tab: "integrations",
    icon: RiPlugLine,
    description: "Third-party integrations and connections",
    hotkey: "3",
  },
  {
    tab: "notifications",
    icon: RiNotification3Fill,
    description: "Notification preferences and channels",
    hotkey: "4",
  },
];

export const settingsSearchParams = {
  tab: parseAsStringLiteral(settingsTabOptions).withDefault("general"),
};
