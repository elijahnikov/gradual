import { cn } from "@gradual/ui";
import { Button } from "@gradual/ui/button";
import Dither from "@gradual/ui/dither";
import { Text } from "@gradual/ui/text";
import { RiArrowLeftLine } from "@remixicon/react";

export default function AnimatedSection() {
  return (
    <div className="hidden h-full w-full items-center justify-center p-2 lg:flex">
      <div
        className={cn(
          "relative flex h-full w-full flex-1 flex-col overflow-hidden bg-ui-bg-base dark:bg-ui-bg-base/50",
          "rounded-lg border"
        )}
      >
        <div className="relative">
          <div
            className="relative grayscale not-dark:invert"
            style={{
              width: "1080px",
              position: "relative",
              opacity: 0.5,
              height: "calc(100vh - 1.25rem)",
            }}
          >
            <Dither
              colorNum={4}
              disableAnimation={false}
              enableMouseInteraction={false}
              mouseRadius={1}
              pixelSize={2}
              waveAmplitude={0.3}
              waveColor={[
                0.368_627_450_980_392_2, 0.290_196_078_431_372_6,
                0.690_196_078_431_372_5,
              ]}
              waveFrequency={3}
              waveSpeed={0.05}
            />
          </div>
          <div className="absolute top-3 left-4">
            <a href="https://www.gradual.so" rel="noopener" target="_blank">
              <Button className="pl-0.5" size="small" variant="ghost">
                <RiArrowLeftLine className="size-4 shrink-0" />
                Back
              </Button>
            </a>
          </div>
          <div className="absolute bottom-6 left-6">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Text className="font-medium text-3xl text-ui-fg-subtle">
                  Ship confidently with{" "}
                </Text>
                <img
                  alt="Gradual"
                  className="relative size-10 rounded-lg shadow-elevation-card-rest"
                  height={40}
                  src="/gradual-logo-500x500.png"
                  width={40}
                />
                <Text className="ml-1 font-medium text-3xl text-black underline underline-offset-4 dark:text-white">
                  Gradual
                </Text>
              </div>
            </div>
            <Text className="mt-1 text-sm" weight="plus">
              Feature flags, gradual rollouts, and controlled releases
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}
