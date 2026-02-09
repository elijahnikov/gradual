import { Button } from "@gradual/ui/button";
import { Text } from "@gradual/ui/text";
import { RiLogoutBoxLine } from "@remixicon/react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { authClient } from "@/auth/client";

interface CurrentStepHeaderProps {
  title: string;
  description: string;
  currentStep: number;
}

export function CurrentStepHeader({
  title,
  description,
  currentStep,
}: CurrentStepHeaderProps) {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="sticky top-0 z-10 flex h-16 w-full items-center border-b bg-ui-bg-base px-4">
      <AnimatePresence mode="wait">
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
          exit={{ opacity: 0, x: 10 }}
          initial={{ opacity: 0, x: -10 }}
          key={currentStep}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex flex-col">
            <Text className="font-medium text-sm" weight="plus">
              {title}
            </Text>
            <Text className="text-ui-fg-muted text-xs">{description}</Text>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="ml-auto flex items-center gap-2">
        <Button
          className="pl-1.5 text-xs"
          onClick={handleSignOut}
          size="small"
          variant="outline"
        >
          <RiLogoutBoxLine className="size-3" /> Sign out
        </Button>
      </div>
    </div>
  );
}
