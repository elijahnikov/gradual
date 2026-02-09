import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import CopyButton from "@gradual/ui/copy-button";
import { Field, FieldDescription, FieldLabel } from "@gradual/ui/field";
import { Skeleton } from "@gradual/ui/skeleton";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@gradual/ui/tabs";
import { Text } from "@gradual/ui/text";
import { RiEyeLine, RiEyeOffLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { codeToHtml } from "shiki";
import { useOnboardingPreviewStore } from "@/lib/stores/onboarding-preview-store";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { useTRPC } from "@/lib/trpc";

function HighlightedCode({ html }: { html: string }) {
  // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is from shiki (trusted source)
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

const installCommands = {
  npm: "npm install @gradual-so/sdk",
  pnpm: "pnpm install @gradual-so/sdk",
  yarn: "yarn add @gradual-so/sdk",
  bun: "bun add @gradual-so/sdk",
};
const packageManagers = Object.keys(
  installCommands
) as (keyof typeof installCommands)[];

export function InstallSDKStep() {
  const trpc = useTRPC();
  const { createdOrganizationId, createdProjectId } = useOnboardingStore();
  const previewStore = useOnboardingPreviewStore;

  useEffect(() => {
    previewStore.getState().setStepCanContinue(true);
    previewStore.getState().setStepIsSubmitting(false);
  }, [previewStore]);

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
    return `import { createGradual } from '@gradual-so/sdk';

const gradual = createGradual({
  apiKey: process.env.GRADUAL_API_KEY,
  environment: 'production'
});

// Boolean flags
const enabled = await gradual.isEnabled('new-feature');

// Typed values (inferred from fallback)
const theme = await gradual.get('theme', { fallback: 'dark' });

// With user context
gradual.identify({ user: { id: '123', plan: 'pro' } });`;
  }, []);

  const [highlightedHtml, setHighlightedHtml] = useState<string>("");
  const [highlightedApiKey, setHighlightedApiKey] = useState<string>("");
  const [highlightedInstall, setHighlightedInstall] = useState<string>("");

  const apiKeyDisplay = useMemo(() => {
    if (!data) {
      return "";
    }
    const value = showApiKey
      ? data.key
      : `${data.keyPrefix}${"•".repeat((data.key?.length ?? 0) - (data.keyPrefix?.length ?? 0))}`;
    return `GRADUAL_API_KEY=${value}`;
  }, [data, showApiKey]);

  useEffect(() => {
    codeToHtml(codeExample, {
      lang: "typescript",
      themes: {
        light: "github-light-default",
        dark: "github-dark-default",
      },
    }).then(setHighlightedHtml);
  }, [codeExample]);

  useEffect(() => {
    if (!apiKeyDisplay) {
      return;
    }
    codeToHtml(apiKeyDisplay, {
      lang: "shell",
      themes: {
        light: "github-light-default",
        dark: "github-dark-default",
      },
    }).then(setHighlightedApiKey);
  }, [apiKeyDisplay]);

  useEffect(() => {
    codeToHtml(selectedInstallCommand, {
      lang: "shell",
      themes: {
        light: "github-light-default",
        dark: "github-dark-default",
      },
    }).then(setHighlightedInstall);
  }, [selectedInstallCommand]);

  const handlePackageManagerChange = (pm: string) => {
    setSelectedPackageManager(pm as keyof typeof installCommands);
    previewStore.getState().setSelectedPackageManager(pm);
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-[480px] flex-col space-y-6">
      <div className="space-y-4">
        <Field className="-space-y-2">
          <FieldLabel>Install the SDK</FieldLabel>
          <FieldDescription>
            Add the Gradual SDK to your project to start using feature flags
          </FieldDescription>
        </Field>

        <div className="relative rounded-lg border bg-muted">
          <Tabs
            defaultValue={selectedPackageManager}
            onValueChange={handlePackageManagerChange}
          >
            <TabsList className="-mb-2 h-8 px-2 shadow-elevation-card-rest">
              {packageManagers.map((packageManager) => (
                <TabsTab
                  className="h-5! px-2 text-[12px]! sm:max-h-5!"
                  key={packageManager}
                  value={packageManager}
                >
                  {packageManager}
                </TabsTab>
              ))}
            </TabsList>
            {packageManagers.map((packageManager) => (
              <TabsPanel key={packageManager} value={packageManager}>
                <Card className="relative flex items-center gap-2 rounded-lg bg-ui-bg-base px-3 py-2 text-xs [&_code]:text-xs [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:p-0">
                  {highlightedInstall ? (
                    <div className="flex-1">
                      <HighlightedCode html={highlightedInstall} />
                    </div>
                  ) : (
                    <Text
                      className="flex-1 font-medium font-mono text-ui-fg-base text-xs"
                      weight="plus"
                    >
                      {selectedInstallCommand}
                    </Text>
                  )}
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
        <Card className="relative mt-1 flex min-h-12 items-center gap-2 rounded-lg bg-ui-bg-base text-xs [&_code]:text-xs [&_pre]:bg-transparent!">
          {isLoadingApiKey && !data ? (
            <Skeleton className="mx-3 h-4 w-full" />
          ) : highlightedApiKey ? (
            <HighlightedCode html={highlightedApiKey} />
          ) : (
            <Text className="px-3 font-medium font-mono text-ui-fg-base text-xs">
              {apiKeyDisplay}
            </Text>
          )}
          <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-2">
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
          <Card className="overflow-x-auto rounded-lg bg-ui-bg-base text-xs [&_code]:text-xs [&_pre]:bg-transparent! [&_pre]:p-0">
            {highlightedHtml ? (
              <HighlightedCode html={highlightedHtml} />
            ) : (
              <pre className="p-4">
                <code className="font-mono text-ui-fg-base text-xs">
                  {codeExample}
                </code>
              </pre>
            )}
          </Card>
          <CopyButton className="absolute top-3 right-3" text={codeExample} />
        </div>
      </div>
    </div>
  );
}
