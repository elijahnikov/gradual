import { Button } from "@gradual/ui/button";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@gradual/ui/dialog";
import { Text } from "@gradual/ui/text";
import { useTargetingStore } from "./targeting-store";

export function ReviewChangesModal() {
  const isOpen = useTargetingStore((s) => s.isReviewModalOpen);
  const closeModal = useTargetingStore((s) => s.closeReviewModal);
  const targets = useTargetingStore((s) => s.targets);

  return (
    <Dialog onOpenChange={(open) => !open && closeModal()} open={isOpen}>
      <DialogPopup className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Changes</DialogTitle>
        </DialogHeader>
        <DialogPanel>
          <div className="flex flex-col gap-4 py-4">
            <Text className="text-ui-fg-subtle" size="small">
              Review your targeting rule changes before saving.
            </Text>

            <div className="flex flex-col gap-2 rounded-md border bg-ui-bg-subtle p-4">
              <Text size="small" weight="plus">
                Summary
              </Text>
              <Text className="text-ui-fg-muted" size="small">
                {targets.length === 0
                  ? "No targeting rules configured"
                  : `${targets.length} targeting rule${targets.length === 1 ? "" : "s"} configured`}
              </Text>
            </div>

            {/* TODO: Add diff view here */}
            <div className="rounded-md border border-ui-border-base border-dashed bg-ui-bg-base p-8 text-center">
              <Text className="text-ui-fg-muted" size="small">
                Diff view coming soon
              </Text>
            </div>
          </div>
        </DialogPanel>
        <DialogFooter>
          <Button onClick={closeModal} variant="secondary">
            Cancel
          </Button>
          <Button disabled variant="gradual">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
