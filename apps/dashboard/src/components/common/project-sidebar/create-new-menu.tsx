import { Button } from "@gradual/ui/button";
import { Kbd, KbdGroup } from "@gradual/ui/kbd";
import { useCommandPalette } from "../command-pallette";

export default function CreateNewMenu() {
  const { open } = useCommandPalette();

  return (
    <Button
      className="h-7 w-full justify-start bg-ui-bg-subtle text-left dark:bg-ui-button-neutral"
      onClick={open}
      size="small"
      variant="outline"
    >
      <span className="flex-1">Search</span>
      <KbdGroup className="ml-auto">
        <Kbd className="border text-[10px]">⌘</Kbd>
        <Kbd className="border text-[10px]">K</Kbd>
      </KbdGroup>
    </Button>
  );
}
