"use client";

import { Button } from "@gradual/ui/button";
import { Field, FieldDescription, FieldLabel } from "@gradual/ui/field";
import { useState } from "react";

interface InstallSDKStepProps {
  onComplete: () => void;
  onSkip: () => void;
  isLoading?: boolean;
}

export function InstallSDKStep({
  onComplete,
  onSkip,
  isLoading = false,
}: InstallSDKStepProps) {
  const [copied, setCopied] = useState(false);
  const installCommand = "npm install @gradual/sdk";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const codeExample = `import { Gradual } from '@gradual/flags-sdk';

const gradual = new Gradual({
  apiKey: 'your-api-key',
  environment: 'production'
});

const isEnabled = await gradual.isEnabled('feature-flag-key');

if (isEnabled) {
  console.log('Feature is active!');
}`;

  return (
    <div className="relative h-full w-full space-y-6">
      <div className="space-y-4">
        <Field>
          <FieldLabel>Install the SDK</FieldLabel>
          <FieldDescription>
            Add the Gradual SDK to your project to start using feature flags
          </FieldDescription>
        </Field>

        <div className="relative">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-4 font-mono text-sm">
            <code className="flex-1">{installCommand}</code>
            <Button
              onClick={copyToClipboard}
              size="small"
              type="button"
              variant="outline"
            >
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Field>
          <FieldLabel>Quick Start Example</FieldLabel>
          <FieldDescription>
            Here's a simple example to get you started
          </FieldDescription>
        </Field>

        <div className="relative">
          <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-4 text-xs">
            <code>{codeExample}</code>
          </pre>
          <Button
            className="absolute top-2 right-2"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(codeExample);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch (err) {
                console.error("Failed to copy:", err);
              }
            }}
            size="small"
            type="button"
            variant="outline"
          >
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </div>

      <div className="absolute bottom-0 mt-auto flex w-full gap-2 pt-4">
        <Button onClick={onSkip} type="button" variant="outline">
          Skip
        </Button>
        <Button disabled={isLoading} onClick={onComplete} type="button">
          I've Installed the SDK
        </Button>
      </div>
    </div>
  );
}
