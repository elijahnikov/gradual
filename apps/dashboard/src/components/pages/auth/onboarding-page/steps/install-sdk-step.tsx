import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import CopyButton from "@gradual/ui/copy-button";
import { Field, FieldDescription, FieldLabel } from "@gradual/ui/field";
import { Skeleton } from "@gradual/ui/skeleton";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@gradual/ui/tabs";
import { Text } from "@gradual/ui/text";
import { RiEyeLine, RiEyeOffLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { useTRPC } from "@/lib/trpc";

interface InstallSDKStepProps {
  onComplete: () => void;
  onSkip: () => void;
  isLoading?: boolean;
}

const installCommands = {
  npm: "npm install @gradual/flags-sdk",
  pnpm: "pnpm install @gradual/flags-sdk",
  yarn: "yarn add @gradual/flags-sdk",
  bun: "bun install @gradual/flags-sdk",
};
const packageManagers = Object.keys(
  installCommands
) as (keyof typeof installCommands)[];

export function InstallSDKStep({
  onComplete,
  onSkip,
  isLoading = false,
}: InstallSDKStepProps) {
  const trpc = useTRPC();
  const { createdOrganizationId, createdProjectId } = useOnboardingStore();
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [selectedPackageManager, setSelectedPackageManager] =
    useState<keyof typeof installCommands>("npm");

  const { data, isLoading: isLoadingApiKey } = useQuery({
    ...trpc.apiKey.getByOrganizationIdAndProjectId.queryOptions({
      organizationId: createdOrganizationId ?? "",
      projectId: createdProjectId ?? "",
    }),
    enabled: !!createdOrganizationId && !!createdProjectId,
  });

  const selectedInstallCommand = useMemo(
    () => installCommands[selectedPackageManager],
    [selectedPackageManager]
  );

  const codeExample = useMemo(() => {
    return `import { Gradual } from '@gradual/flags-sdk';

const gradual = new Gradual({
  apiKey: env.GRADUAL_API_KEY,
  environment: 'production'
});

const isEnabled = await gradual.isEnabled('feature-flag-key');

if (isEnabled) {
    console.log('Feature is active!');
}`;
  }, []);

  const codeLines = codeExample.split("\n");
  const lineCount = codeLines.length;

  return (
    <div className="h-full w-full space-y-6">
      <div className="space-y-4">
        <Field className="-space-y-2">
          <FieldLabel>Install the SDK</FieldLabel>
          <FieldDescription>
            Add the Gradual SDK to your project to start using feature flags
          </FieldDescription>
        </Field>

        <div className="relative rounded-lg bg-muted">
          <Tabs
            defaultValue={selectedPackageManager}
            onValueChange={setSelectedPackageManager}
          >
            <TabsList className="-mb-2 w-full bg-muted">
              {packageManagers.map((packageManager) => (
                <TabsTab key={packageManager} value={packageManager}>
                  {packageManager}
                </TabsTab>
              ))}
            </TabsList>
            {packageManagers.map((packageManager) => (
              <TabsPanel key={packageManager} value={packageManager}>
                <Card className="flex items-center gap-2 rounded-lg bg-ui-bg-base px-3 py-2 font-mono text-sm">
                  <Text
                    className="flex-1 font-medium font-mono text-ui-fg-base text-xs"
                    weight={"plus"}
                  >
                    {selectedInstallCommand}
                  </Text>
                  <CopyButton text={selectedInstallCommand} />
                </Card>
              </TabsPanel>
            ))}
          </Tabs>
        </div>
      </div>
      <div>
        <Field className="-space-y-2">
          <FieldLabel>API Key</FieldLabel>
          <FieldDescription>
            Your API key is used to authenticate your requests to the Gradual
            SDK.
          </FieldDescription>
        </Field>
        <Card className="relative mt-1 flex min-h-12 items-center gap-2 rounded-lg bg-ui-bg-base px-3 py-2 font-mono text-sm">
          {isLoadingApiKey && !data ? (
            <Skeleton className="h-4 w-full" />
          ) : (
            <div>
              <Text className="font-medium font-mono text-ui-fg-base text-xs">
                GRADUAL_API_KEY=
                {showApiKey
                  ? data?.key
                  : data?.keyPrefix +
                    ".".repeat(
                      (data?.key?.length ?? 0) - (data?.keyPrefix?.length ?? 0)
                    )}
              </Text>
            </div>
          )}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <Button
              aria-label="Show API key"
              className="size-6 disabled:opacity-100"
              onClick={() => setShowApiKey(!showApiKey)}
              size="small"
              variant="outline"
            >
              {showApiKey ? (
                <RiEyeLine className="size-4 shrink-0" />
              ) : (
                <RiEyeOffLine className="size-4 shrink-0" />
              )}
            </Button>
            <CopyButton text={`GRADUAL_API_KEY=${data?.key ?? ""}`} />
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        <Field className="-space-y-2">
          <FieldLabel>Quick Start Example</FieldLabel>
          <FieldDescription>
            Here's a simple example to get you started
          </FieldDescription>
        </Field>

        <div className="relative">
          <Card className="overflow-x-auto rounded-lg bg-ui-bg-base p-4 text-xs">
            <div className="flex gap-4 font-mono">
              <div className="select-none pr-4 text-right text-ui-fg-muted">
                {Array.from({ length: lineCount }, (_, i) => (
                  <div className="leading-normal" key={i}>
                    {i + 1}
                  </div>
                ))}
              </div>
              <code className="flex-1 font-medium text-ui-fg-base text-xs">
                {codeLines.map((line, i) => (
                  <div className="whitespace-pre leading-normal" key={i}>
                    {line || "\u00A0"}
                  </div>
                ))}
              </code>
            </div>
          </Card>
          <CopyButton className="absolute top-3 right-3" text={codeExample} />
        </div>
      </div>

      <div className="absolute bottom-16 left-0 mt-auto flex w-1/2 translate-x-1/2 items-center justify-center gap-2 pt-4">
        <div className="flex w-[400px] gap-2">
          <Button onClick={onSkip} type="button" variant="outline">
            Skip
          </Button>
          <Button
            className="w-full text-[13px]"
            disabled={isLoading}
            onClick={onComplete}
            type="button"
            variant="gradual"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
