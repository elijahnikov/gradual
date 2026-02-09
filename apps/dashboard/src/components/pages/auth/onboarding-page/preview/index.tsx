import { Avatar, AvatarFallback } from "@gradual/ui/avatar";
import { Badge } from "@gradual/ui/badge";
import { Card } from "@gradual/ui/card";
import { Text } from "@gradual/ui/text";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useOnboardingPreviewStore } from "@/lib/stores/onboarding-preview-store";
import type { OnboardingStep } from "@/lib/stores/onboarding-store";
import { MiniOrganizationSidebar } from "./mini-organization-sidebar";
import { MiniProjectSidebar } from "./mini-project-sidebar";

interface DashboardPreviewProps {
  currentStep: OnboardingStep;
}

const stepZoomConfig: Record<number, { scale: number; x: string; y: string }> =
  {
    // Bottom-left: user avatar (~5% from left, ~92% from top)
    0: { scale: 2, x: "0%", y: "-110%" },
    // Top-left: org icon + dropdown + content
    1: { scale: 1.5, x: "0%", y: "4%" },
    // Full view
    2: { scale: 1, x: "0%", y: "0%" },
    // Full view
    3: { scale: 1, x: "0%", y: "0%" },
  };

function PlaceholderContent() {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-center justify-between" />

      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-3 border-b pb-2">
          <div className="h-2 w-24 rounded bg-ui-bg-subtle-hover" />
          <div className="h-2 w-16 rounded bg-ui-bg-subtle-hover" />
          <div className="h-2 w-20 rounded bg-ui-bg-subtle-hover" />
          <div className="ml-auto h-2 w-12 rounded bg-ui-bg-subtle-hover" />
        </div>

        {Array.from({ length: 5 }, (_, i) => (
          <div className="flex items-center gap-3 py-1.5" key={i}>
            <div
              className="h-2 rounded bg-ui-bg-subtle-hover"
              style={{ width: `${80 + Math.sin(i * 2) * 30}px` }}
            />
            <div className="h-2 w-14 rounded bg-ui-bg-subtle-hover" />
            <div
              className="h-2 rounded bg-ui-bg-subtle-hover"
              style={{ width: `${50 + Math.cos(i) * 20}px` }}
            />
            <div className="ml-auto h-5 w-8 rounded-full bg-ui-bg-subtle-hover" />
          </div>
        ))}
      </div>

      <div className="mt-6">
        <div className="mb-3 h-2 w-16 rounded bg-ui-bg-subtle-hover" />
        <Card className="flex h-28 items-end gap-1 p-3">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              className="flex-1 rounded-t bg-ui-bg-subtle-hover"
              key={i}
              style={{ height: `${20 + Math.sin(i * 0.8) * 40 + 30}%` }}
            />
          ))}
        </Card>
      </div>
    </div>
  );
}

function TeamMembersOverlay() {
  const teamMembers = useOnboardingPreviewStore((s) => s.teamMembers);

  if (teamMembers.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-x-0 bottom-0 p-4">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-3">
          <Text className="mb-2 text-[10px] text-ui-fg-muted" weight="plus">
            Team Members
          </Text>
          <div className="space-y-1.5">
            <AnimatePresence>
              {teamMembers.map((member) => (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between rounded-md px-2 py-1"
                  exit={{ opacity: 0, y: -5 }}
                  initial={{ opacity: 0, y: 8 }}
                  key={member.email}
                  layout
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="size-5">
                      <AvatarFallback className="text-[8px]">
                        {member.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Text
                      className="max-w-[140px] truncate text-[11px]"
                      weight="plus"
                    >
                      {member.email}
                    </Text>
                  </div>
                  <Badge size="sm" variant="secondary">
                    {member.role}
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

const MOCK_VARIATIONS = [
  { name: "Enabled", color: "#10b981", value: "true" },
  { name: "Disabled", color: "#ef4444", value: "false" },
  { name: "Dark", color: "#8b5cf6", value: '"dark"' },
  { name: "Light", color: "#f59e0b", value: '"light"' },
  { name: "Beta", color: "#3b82f6", value: "true" },
  { name: "Control", color: "#6b7280", value: "false" },
  { name: "V2", color: "#06b6d4", value: "true" },
  { name: "Premium", color: "#ec4899", value: '"premium"' },
  { name: "Rollout 50%", color: "#f97316", value: "true" },
  { name: "Compact", color: "#14b8a6", value: '"compact"' },
];

const MOCK_REASONS: {
  label: string;
  variant: "success" | "info" | "outline" | "secondary";
}[] = [
  { label: "Target match", variant: "success" },
  { label: "Default rollout", variant: "info" },
  { label: "Default", variant: "outline" },
  { label: "Disabled", variant: "secondary" },
  { label: "Target match", variant: "success" },
  { label: "Default rollout", variant: "info" },
];

interface MockEvent {
  id: number;
  variation: (typeof MOCK_VARIATIONS)[number];
  reason: (typeof MOCK_REASONS)[number];
  duration: string;
}

function createMockEvent(id: number): MockEvent {
  const variation =
    MOCK_VARIATIONS[Math.floor(Math.random() * MOCK_VARIATIONS.length)];
  const reason = MOCK_REASONS[Math.floor(Math.random() * MOCK_REASONS.length)];
  if (!(variation && reason)) {
    return {
      id,
      // biome-ignore lint/style/noNonNullAssertion: <>
      reason: MOCK_REASONS[0]!,
      // biome-ignore lint/style/noNonNullAssertion: <>
      variation: MOCK_VARIATIONS[0]!,
      duration: `${(Math.random() * 3 + 0.1).toFixed(2)}ms`,
    };
  }
  return {
    id,
    variation,
    reason,
    duration: `${(Math.random() * 3 + 0.1).toFixed(2)}ms`,
  };
}

function MockEventsTable() {
  const nextIdRef = useRef(25);
  const [events, setEvents] = useState<MockEvent[]>(() =>
    Array.from({ length: 25 }, (_, i) => createMockEvent(i))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const id = nextIdRef.current;
      nextIdRef.current += 1;
      setEvents((prev) => [createMockEvent(id), ...prev.slice(0, 24)]);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-ui-bg-subtle">
      <div className="flex h-7 shrink-0 items-center border-b bg-ui-bg-base px-2.5">
        <div className="flex items-center gap-1 text-[10px]">
          <span className="rounded-[4px] px-0.5 text-ui-fg-muted">
            My Project
          </span>
          <span className="text-ui-fg-muted">/</span>
          <span className="rounded-[4px] px-0.5 text-ui-fg-muted">Flags</span>
          <span className="text-ui-fg-muted">/</span>
          <span className="font-medium text-ui-fg-base">new-feature</span>
        </div>
      </div>

      <div className="flex h-8 shrink-0 items-center justify-between border-b bg-ui-bg-subtle px-2">
        <div className="flex items-center rounded-md bg-ui-bg-base shadow-elevation-card-rest">
          <span className="rounded-md px-1.5 py-1 text-[10px] text-ui-fg-muted">
            Overview
          </span>
          <span className="rounded-md bg-ui-bg-base-hover px-1.5 py-1 font-medium text-[10px] text-ui-fg-base">
            Events
          </span>
          <span className="rounded-md px-1.5 py-1 text-[10px] text-ui-fg-muted">
            Metrics
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border bg-ui-bg-base px-1.5 py-0.5">
          <span className="size-2.5 rounded-full bg-emerald-500" />
          <span className="text-[10px]">Production</span>
        </div>
      </div>

      {/* Events table */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex w-full items-center border-ui-border-base/50 border-b px-3 py-1.5 text-[10px] text-ui-fg-muted">
          <span className="flex-3">Variation</span>
          <span className="flex-2">Value</span>
          <span className="flex-3">Reason</span>
          <span className="flex-2 text-right">Duration</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <AnimatePresence initial={false}>
            {events.map((event) => (
              <motion.div
                animate={{
                  opacity: 1,
                  y: 0,
                  backgroundColor: "rgba(59, 130, 246, 0)",
                }}
                className="border-ui-border-base/30 border-b"
                exit={{ opacity: 0 }}
                initial={{
                  opacity: 0,
                  y: -10,
                  backgroundColor: "rgba(59, 130, 246, 0.12)",
                }}
                key={event.id}
                layout
                transition={{
                  duration: 0.35,
                  ease: [0.25, 0.1, 0.25, 1],
                  backgroundColor: { duration: 1.5 },
                  layout: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
                }}
              >
                <div className="flex w-full items-center px-3">
                  <div className="flex flex-3 items-center gap-1.5 py-1.5">
                    <span
                      className="size-2 shrink-0 rounded-[3px]"
                      style={{ backgroundColor: event.variation.color }}
                    />
                    <span className="truncate font-mono text-[10px]">
                      {event.variation.name}
                    </span>
                  </div>
                  <span className="flex-2 font-mono text-[10px] text-ui-fg-muted">
                    {event.variation.value}
                  </span>
                  <div className="flex-3">
                    <Badge
                      className="px-1! py-0! text-[9px]!"
                      size="sm"
                      variant={event.reason.variant}
                    >
                      {event.reason.label}
                    </Badge>
                  </div>
                  <span className="flex-2 text-right font-mono text-[10px] text-ui-fg-muted">
                    {event.duration}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export function DashboardPreview({ currentStep }: DashboardPreviewProps) {
  const zoom = useMemo(
    () => stepZoomConfig[currentStep] ?? stepZoomConfig[2],
    [currentStep]
  );

  return (
    <div className="h-full w-full translate-x-12">
      <motion.div
        animate={{ scale: zoom?.scale, x: zoom?.x, y: zoom?.y }}
        className="flex h-full w-full overflow-hidden rounded-lg bg-ui-bg-subtle p-1 shadow-elevation-card-rest"
        style={{ transformOrigin: "0% 0%" }}
        transition={{
          duration: 0.8,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <MiniOrganizationSidebar currentStep={currentStep} />
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border bg-ui-bg-base dark:bg-ui-bg-base/50">
          <div className="flex h-full w-full">
            <MiniProjectSidebar />
            <div className="relative flex-1 overflow-hidden bg-ui-bg-subtle">
              <PlaceholderContent />
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <motion.div
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    className="absolute inset-0"
                    exit={{ opacity: 0, x: -40, filter: "blur(4px)" }}
                    initial={{ opacity: 0, x: 40, filter: "blur(4px)" }}
                    key="team-overlay"
                    transition={{
                      duration: 0.5,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <TeamMembersOverlay />
                  </motion.div>
                )}
                {(currentStep === 2 || currentStep === 3) && (
                  <motion.div
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    className="absolute inset-0"
                    exit={{ opacity: 0, x: -40, filter: "blur(4px)" }}
                    initial={{ opacity: 0, x: 40, filter: "blur(4px)" }}
                    key="events-overlay"
                    transition={{
                      duration: 0.5,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <MockEventsTable />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
