import {
  RiBankCardFill,
  RiFolder3Fill,
  RiGroup3Fill,
  RiPlugFill,
  RiSettings3Fill,
  RiWebhookLine,
} from "@remixicon/react";
import { parseAsStringLiteral } from "nuqs";
import type React from "react";

export const orgSettingsTabOptions = [
  "general",
  "projects",
  "members",
  "webhooks",
  "integrations",
  "billing",
] as const;

export type OrgSettingsTab = (typeof orgSettingsTabOptions)[number];

export const orgSettingsTabList: {
  tab: OrgSettingsTab;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  hotkey?: string;
}[] = [
  {
    tab: "general",
    icon: RiSettings3Fill,
    description: "Organization name and settings",
    hotkey: "1",
  },
  {
    tab: "projects",
    icon: RiFolder3Fill,
    description: "Manage organization projects",
    hotkey: "2",
  },
  {
    tab: "members",
    icon: RiGroup3Fill,
    description: "Manage organization members and roles",
    hotkey: "3",
  },
  {
    tab: "webhooks",
    icon: RiWebhookLine,
    description: "Manage webhook endpoints and deliveries",
    hotkey: "4",
  },
  {
    tab: "integrations",
    icon: RiPlugFill,
    description: "Third-party integrations and connections",
    hotkey: "5",
  },
  {
    tab: "billing",
    icon: RiBankCardFill,
    description: "Billing and subscription management",
    hotkey: "6",
  },
];

export const orgSettingsSearchParams = {
  tab: parseAsStringLiteral(orgSettingsTabOptions).withDefault("general"),
};
