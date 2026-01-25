import { useEffect } from "react";

export function useKeyPress(
  key: string,
  callback: (event: KeyboardEvent) => void,
  options?: {
    enabled?: boolean;
    target?: Window | Document | HTMLElement;
  }
) {
  const { enabled = true, target = window } = options ?? {};

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key === key) {
        callback(keyboardEvent);
      }
    };

    target.addEventListener("keydown", handleKeyDown);

    return () => {
      target.removeEventListener("keydown", handleKeyDown);
    };
  }, [key, callback, enabled, target]);
}
