import { cn } from "@gradual/ui";
import { Avatar, AvatarFallback } from "@gradual/ui/avatar";
import { Card } from "@gradual/ui/card";
import { Text } from "@gradual/ui/text";
import {
  RiHomeSmileFill,
  RiQuestionFill,
  RiSettings5Fill,
} from "@remixicon/react";
import { AnimatePresence, motion } from "motion/react";
import { useOnboardingPreviewStore } from "@/lib/stores/onboarding-preview-store";
import type { OnboardingStep } from "@/lib/stores/onboarding-store";

function NavIcon({
  icon: Icon,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex size-8 items-center justify-center rounded-full",
        active
          ? "bg-ui-bg-base-hover text-ui-fg-base shadow-borders-base"
          : "text-ui-fg-muted"
      )}
    >
      <Icon className="size-4" />
    </div>
  );
}

function FakeOrgDropdown({
  orgName,
  orgLogoPreviewUrl,
}: {
  orgName: string;
  orgLogoPreviewUrl?: string;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className="absolute top-0 left-[calc(100%+4px)] z-50 w-48 rounded-lg bg-ui-bg-base p-1 shadow-elevation-card-rest"
      exit={{ opacity: 0, scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Text
        className={cn(
          "px-2 text-[11px] text-muted-foreground data-inset:ps-9 sm:data-inset:ps-8"
        )}
      >
        My organizations
      </Text>
      <div className="flex h-8 min-h-8 items-center gap-2 rounded-md bg-ui-bg-base-hover px-2 py-1">
        <Card className="flex w-fit shrink-0 items-center justify-center rounded-full p-px">
          {orgLogoPreviewUrl ? (
            <img
              alt={orgName || "Organization"}
              className="size-4 rounded-full object-cover"
              height={16}
              src={orgLogoPreviewUrl}
              width={16}
            />
          ) : (
            <Avatar className="size-4">
              <AvatarFallback className="text-[7px]">
                {orgName ? orgName.charAt(0).toUpperCase() : null}
              </AvatarFallback>
            </Avatar>
          )}
        </Card>
        <Text className="truncate text-[10px]" weight="plus">
          {orgName}
        </Text>
      </div>
    </motion.div>
  );
}

interface MiniOrganizationSidebarProps {
  currentStep: OnboardingStep;
}

export function MiniOrganizationSidebar({
  currentStep,
}: MiniOrganizationSidebarProps) {
  const orgName = useOnboardingPreviewStore((s) => s.orgName);
  const orgLogoPreviewUrl = useOnboardingPreviewStore(
    (s) => s.orgLogoPreviewUrl
  );
  const displayName = useOnboardingPreviewStore((s) => s.displayName);
  const avatarPreviewUrl = useOnboardingPreviewStore((s) => s.avatarPreviewUrl);

  return (
    <div className="flex h-full w-14 min-w-14 flex-col items-center bg-ui-bg-subtle py-3">
      <div className="relative flex items-center justify-center">
        <AnimatePresence>
          <motion.div
            animate={{ scale: 2.2, opacity: 0 }}
            className="pointer-events-none absolute inset-0 rounded-full bg-blue-400/30"
            initial={{ scale: 0.8, opacity: 0.6 }}
            key={`org-flash-${!!orgLogoPreviewUrl}-${orgName?.charAt(0) ?? ""}`}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.div
            animate={{ scale: 1 }}
            initial={{ scale: 0.8 }}
            key={`org-${!!orgLogoPreviewUrl}-${orgName?.charAt(0) ?? ""}`}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 15,
            }}
          >
            <div
              className={cn(
                "after:button-neutral-gradient flex size-8 items-center justify-center rounded-full border bg-ui-button-neutral",
                "ring-0"
              )}
            >
              <Card className="flex w-fit shrink-0 items-center justify-center rounded-full p-[2px]">
                {orgLogoPreviewUrl ? (
                  <img
                    alt={orgName || "Organization"}
                    className="size-7 shrink-0 rounded-full object-cover"
                    height={28}
                    src={orgLogoPreviewUrl}
                    width={28}
                  />
                ) : (
                  <Avatar className="size-7">
                    <AvatarFallback>
                      {orgName ? orgName.charAt(0).toUpperCase() : null}
                    </AvatarFallback>
                  </Avatar>
                )}
              </Card>
            </div>
          </motion.div>
        </AnimatePresence>
        <AnimatePresence>
          {currentStep === 1 && (
            <FakeOrgDropdown
              orgLogoPreviewUrl={orgLogoPreviewUrl}
              orgName={orgName}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 flex flex-col items-center gap-1">
        <NavIcon icon={RiHomeSmileFill} />
        <NavIcon icon={RiSettings5Fill} />
      </div>

      <div className="mt-auto flex flex-col items-center gap-2">
        <NavIcon icon={RiQuestionFill} />
        <div className="relative flex items-center justify-center">
          <AnimatePresence>
            <motion.div
              animate={{ scale: 2.2, opacity: 0 }}
              className="pointer-events-none absolute inset-0 rounded-full bg-blue-400/30"
              initial={{ scale: 0.8, opacity: 0.6 }}
              key={`user-flash-${!!avatarPreviewUrl}-${displayName?.charAt(0) ?? ""}`}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.div
              animate={{ scale: 1 }}
              initial={{ scale: 0.8 }}
              key={`user-${!!avatarPreviewUrl}-${displayName?.charAt(0) ?? ""}`}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 15,
              }}
            >
              <Card className="flex items-center justify-center rounded-full p-1">
                {avatarPreviewUrl ? (
                  <img
                    alt={displayName || "User"}
                    className="size-6 rounded-full object-cover"
                    height={24}
                    src={avatarPreviewUrl}
                    width={24}
                  />
                ) : (
                  <Avatar className="size-6">
                    <AvatarFallback className="text-[9px]">
                      {displayName ? displayName.charAt(0).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                )}
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
